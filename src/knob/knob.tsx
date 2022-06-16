import { createContext } from "@chakra-ui/react-utils";
import {
  chakra,
  createStylesContext,
  forwardRef,
  HTMLChakraProps,
  omitThemingProps,
  ThemingProps,
  useMultiStyleConfig,
  useTheme,
} from "@chakra-ui/system";
import { cx, __DEV__ } from "@chakra-ui/utils";
import * as React from "react";
import { useKnob, UseKnobProps, UseKnobReturn } from "./useKnob";

interface KnobContext
  extends Omit<
    UseKnobReturn,
    | "getInputProps"
    | "getRootProps"
    | "getSVGProps"
    | "getTrackProps"
    | "getInnerTrackProps"
    | "getIndicatorProps"
  > {}

const [KnobProvider, useKnobContext] = createContext<KnobContext>({
  name: "KnobContext",
  errorMessage:
    "useKnobContext: `context` is undefined. Seems you forgot to wrap all knob components within <Knob />",
});

const [StylesProvider, useStyles] = createStylesContext("Knob");

export { KnobProvider, useKnobContext };

// export interface KnobProps
//   extends UseKnobProps,
//     ThemingProps<"Knob">,
//     Omit<HTMLChakraProps<"div">, keyof UseKnobProps> {}

export interface KnobProps
  extends UseKnobProps,
    Omit<HTMLChakraProps<"div">, keyof UseKnobProps> {}

// 300 degrees in total

export const Knob = forwardRef<KnobProps, "div">((props, ref) => {
  const styles = useMultiStyleConfig("Knob", props);
  const ownProps = omitThemingProps(props);
  const {
    getInputProps,
    getRootProps,
    getSVGProps,
    getTrackProps,
    getInnerTrackProps,
    getIndicatorProps,
    ...context
  } = useKnob(props);
  const rootProps = getRootProps();
  const inputProps = getInputProps({}, ref);
  const svgProps = getSVGProps();
  const trackProps = getTrackProps();
  const innerTrackProps = getInnerTrackProps();
  const indicatorProps = getIndicatorProps();

  return (
    <KnobProvider value={context}>
      <StylesProvider value={styles}>
        <chakra.div
          {...rootProps}
          className={cx("chakra-knob", props.className)}
          __css={styles.container}
        >
          <svg {...svgProps}>
            <circle {...trackProps} />
            <circle {...innerTrackProps} />
            <line {...indicatorProps} />
          </svg>
          <input {...inputProps} />
        </chakra.div>
      </StylesProvider>
    </KnobProvider>
  );
});
