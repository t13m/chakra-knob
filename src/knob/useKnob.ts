import {
  useBoolean,
  useCallbackRef,
  useControllableState,
  useLatestRef,
  usePanGesture,
  useUpdateEffect,
} from "@chakra-ui/hooks";

import {
  EventKeyMap,
  mergeRefs,
  PropGetter,
} from "@chakra-ui/react-utils";
import {
  PanEventInfo,
  AnyPointerEvent,
  ariaAttr,
  callAllHandlers,
  clampValue,
  dataAttr,
  focus,
  normalizeEventKey,
  percentToValue,
  roundValueToStep,
  valueToPercent,
} from "@chakra-ui/utils";

import { useCallback, useMemo, useRef, useState } from "react";

export interface UseKnobProps {
  size?: string | number;
  trackColor?: string;
  trackWidth?: string | number;
  innerTrackColor?: string;
  innerTrackWidth?: string | number;
  indicatorColor?: string;
  indicatorWidth?: string | number;
  middleMarker?: number;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onChangeStart?(value: number): void;
  onChangeEnd?(value: number): void;
  onChange?(value: number): void;
  id?: string;
  name?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  getAriaValueText?(value: number): string;
  "aria-valuetext"?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function useKnob(props: UseKnobProps) {
  const {
    size = 64,
    trackColor = "black",
    trackWidth = 1,
    innerTrackColor = "brown",
    innerTrackWidth = 3,
    indicatorColor = "brown",
    indicatorWidth = 1,
    min = 0,
    max = 100,
    onChange,
    value: valueProp,
    defaultValue,
    id: idProp,
    isDisabled,
    isReadOnly,
    onChangeStart: onChangeStartProp,
    onChangeEnd: onChangeEndProp,
    step = 1,
    getAriaValueText: getAriaValueTextProp,
    "aria-valuetext": ariaValueText,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    name,
    ...restProps
  } = props;
  const { middleMarker = min, ...htmlProps } = restProps;
  const middleMarkerPercent = valueToPercent(middleMarker, min, max);

  const resolvedSize = clampValue(Number(size), 10, 1000);
  const onChangeStart = useCallbackRef(onChangeStartProp);
  const onChangeEnd = useCallbackRef(onChangeEndProp);
  const getAriaValueText = useCallbackRef(getAriaValueTextProp);
  /**
   * Enable the slider handle controlled and uncontrolled scenarios
   */
  const [computedValue, setValue] = useControllableState({
    value: valueProp,
    defaultValue: defaultValue ?? getDefaultValue(min, max),
    onChange,
  });
  const [isDragging, setDragging] = useBoolean();

  const [isFocused, setFocused] = useBoolean();
  const eventSourceRef = useRef<"pointer" | "keyboard" | null>(null);

  const isInteractive = !(isDisabled || isReadOnly);

  /**
   * Constrain the value because it can't be less than min
   * or greater than max
   */
  const value = clampValue(computedValue, min, max);
  const valueRef = useLatestRef(value);

  const prevRef = useRef(valueRef.current);

  const trackValue = value;
  const thumbPercent = valueToPercent(trackValue, min, max);

  const rootRef = useRef<any>(null);

  const tenSteps = (max - min) / 10;
  const oneStep = step || (max - min) / 100;

  const constrain = useCallback(
    (value: number) => {
      if (!isInteractive) return;
      value = parseFloat(roundValueToStep(value, min, oneStep));
      value = clampValue(value, min, max);
      setValue(value);
    },
    [oneStep, max, min, setValue, isInteractive]
  );
  const actions = useMemo(
    () => ({
      stepUp: (step = oneStep) => {
        const next = value + step;
        constrain(next);
      },
      stepDown: (step = oneStep) => {
        const next = value - step;
        constrain(next);
      },
      reset: () => constrain(defaultValue || 0),
      stepTo: (value: number) => constrain(value),
    }),
    [constrain, value, oneStep, defaultValue]
  );

  /**
   * Keyboard interaction to ensure users can operate
   * the slider using only their keyboard.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const eventKey = normalizeEventKey(event);
      const keyMap: EventKeyMap = {
        ArrowRight: () => actions.stepUp(),
        ArrowUp: () => actions.stepUp(),
        ArrowLeft: () => actions.stepDown(),
        ArrowDown: () => actions.stepDown(),
        PageUp: () => actions.stepUp(tenSteps),
        PageDown: () => actions.stepDown(tenSteps),
        Home: () => constrain(min),
        End: () => constrain(max),
      };

      const action = keyMap[eventKey];

      if (action) {
        event.preventDefault();
        event.stopPropagation();
        action(event);
        eventSourceRef.current = "keyboard";
      }
    },
    [actions, constrain, max, min, tenSteps]
  );

  /**
   * ARIA (Optional): To define a human-readable representation of the value,
   * we allow users pass aria-valuetext.
   */
  const valueText = getAriaValueText?.(value) ?? ariaValueText;

  const focusRoot = useCallback(() => {
    if (rootRef.current) {
      setTimeout(() => focus(rootRef.current));
    }
  }, []);

  useUpdateEffect(() => {
    if (eventSourceRef.current === "keyboard") {
      onChangeEnd?.(valueRef.current);
    }
  }, [value, onChangeEnd]);

  const [baseValue, setBaseValue] = useState(value);

  const getValueFromPointer = useCallback(
    (event: AnyPointerEvent, info: PanEventInfo) => {
      const offsetPx = -info.offset.y;
      const offsetPercent = offsetPx / 400;
      const basePercent = (baseValue - min) / (max - min);
      const targetPercent = offsetPercent + basePercent;
      let nextValue = percentToValue(targetPercent, min, max);
      if (step) {
        nextValue = parseFloat(roundValueToStep(nextValue, min, step));
      }
      nextValue = clampValue(nextValue, min, max);
      return nextValue;
    },
    [min, max, step, baseValue]
  );

  const setValueFromPointer = (event: AnyPointerEvent, info: PanEventInfo) => {
    const nextValue = getValueFromPointer(event, info);
    if (nextValue != null && nextValue !== valueRef.current) {
      setValue(nextValue);
    }
  };

  usePanGesture(rootRef, {
    onPanSessionStart(event) {
      if (!isInteractive) return;
      setDragging.on();
      setBaseValue(value);
      focusRoot();
      // setValueFromPointer(event)
      onChangeStart?.(valueRef.current);
    },
    onPanSessionEnd() {
      if (!isInteractive) return;
      setDragging.off();
      onChangeEnd?.(valueRef.current);
      prevRef.current = valueRef.current;
    },
    onPan(event, info) {
      if (!isInteractive) return;
      setValueFromPointer(event, info);
    },
  });

  const getInputProps: PropGetter<HTMLInputElement> = useCallback(
    (props = {}, ref = null) => ({
      ...props,
      ref,
      type: "hidden",
      value,
      name,
    }),
    [name, value]
  );
  const rootStyle = {};
  const getRootProps: PropGetter = useCallback(
    (props = {}, ref = null) => ({
      ...props,
      ...htmlProps,
      ref: mergeRefs(ref, rootRef),
      tabIndex: -1,
      "aria-disabled": ariaAttr(isDisabled),
      "data-focused": dataAttr(isFocused),
      onKeyDown: callAllHandlers(props.onKeyDown, onKeyDown),
      onFocus: callAllHandlers(props.onFocus, setFocused.on),
      onBlur: callAllHandlers(props.onBlur, setFocused.off),
      style: {
        ...props.style,
        ...rootStyle,
      },
    }),
    [htmlProps, isDisabled, isFocused, rootStyle]
  );

  const getSVGProps = useCallback(
    (props = {}, ref = null) => ({
      ...props,
      ref: mergeRefs(ref),
      width: resolvedSize as number,
      height: resolvedSize as number,
      viewBox: `0 0 ${resolvedSize} ${resolvedSize}`,
    }),
    [resolvedSize]
  );

  const getTrackProps = useCallback(
    (props = {}, ref = null) => {
      const cx = Math.floor(resolvedSize / 2);
      const r1 = Math.floor(cx * 0.84);
      const c1 = Math.PI * 2 * r1;
      return {
        ...props,
        ref: mergeRefs(ref),
        cx: `${cx}`,
        cy: `${cx}`,
        r: `${r1}`,
        stroke: trackColor,
        strokeWidth: trackWidth,
        fill: "transparent",
        transform: `rotate(120, ${cx}, ${cx})`,
        strokeDasharray: `${(300 / 360) * c1} ${c1}`,
      };
    },
    [resolvedSize, trackColor, trackWidth]
  );

  const getInnerTrackProps = useCallback(
    (props = {}, ref = null) => {
      const cx = Math.floor(resolvedSize / 2);
      const r2 = Math.floor(cx * 0.9);
      const c2 = Math.PI * 2 * r2;
      const effectiveC = c2 * 300 / 360;
      const dashLength = Math.abs(thumbPercent - middleMarkerPercent) / 100 * effectiveC;
      const rest1Length = Math.min(thumbPercent, middleMarkerPercent) / 100 * effectiveC;
      // const rest2Length = Math.max(thumbPercent, middleMarkerPercent) / 100 * effectiveC;

      return {
        ...props,
        ref: mergeRefs(ref),
        cx: `${cx}`,
        cy: `${cx}`,
        r: `${r2}`,
        stroke: innerTrackColor,
        strokeWidth: innerTrackWidth,
        fill: "transparent",
        transform: `rotate(120, ${cx}, ${cx})`,
        strokeDasharray: `0 ${rest1Length} ${dashLength} ${c2}`,
      };
    },
    [resolvedSize, thumbPercent, innerTrackColor, innerTrackWidth, middleMarkerPercent]
  );

  const getIndicatorProps = useCallback(
    (props = {}, ref = null) => {
      const cx = Math.floor(resolvedSize / 2);
      const r3 = Math.floor(cx * 0.89);

      return {
        ...props,
        ref: mergeRefs(ref),
        x1: `${cx}`,
        y1: `${cx}`,
        x2: `${r3 + r3}`,
        y2: `${cx}`,
        stroke: indicatorColor,
        strokeWidth: indicatorWidth,
        transform: `rotate(${120 + thumbPercent / 100 * 300}, ${cx}, ${cx})`,
      };
    },
    [resolvedSize, thumbPercent, indicatorColor, indicatorWidth]
  );

  return {
    state: {
      value,
      isFocused,
      isDragging,
    },
    actions,
    getInputProps,
    getRootProps,
    getSVGProps,
    getTrackProps,
    getInnerTrackProps,
    getIndicatorProps
  };
}
export type UseKnobReturn = ReturnType<typeof useKnob>;

function getDefaultValue(min: number, max: number) {
  return max < min ? min : min + (max - min) / 2;
}
