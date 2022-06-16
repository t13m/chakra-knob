import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  VStack,
  Box,
} from "@chakra-ui/react";
import * as React from "react";
import { Knob } from "./knob";

export const Demo: React.FC = () => {
  const [value, setValue] = React.useState(50);

  return (
    <VStack>
      <Box>Value: {value}</Box>

      <Slider
        onChange={(val) => setValue(val)}
        value={value}
        min={-80}
        max={80}
        focusThumbOnChange={false}
      >
        <SliderTrack>
          <SliderFilledTrack />
        </SliderTrack>
        <SliderThumb />
      </Slider>
      <Knob
        middleMarker={0}
        onChange={(val) => setValue(val)}
        value={value}
        min={-80}
        max={80}
      />
      <Knob
        middleMarker={0}
        onChange={(val) => setValue(val)}
        value={value}
        min={-80}
        max={80}
        size={100}
      />
      <Knob
        middleMarker={0}
        onChange={(val) => setValue(val)}
        value={value}
        min={-80}
        max={80}
        size={200}
        innerTrackColor="blue"
        innerTrackWidth={5}
      />
    </VStack>
  );
};
