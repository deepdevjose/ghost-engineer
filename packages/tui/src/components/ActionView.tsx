import React from "react";
import { Box, Text } from "ink";
import { inkColor } from "../theme.js";
import { OutputPreview } from "./AnalyzeView.js";

export function ActionView({
  title,
  description,
  action,
  busy,
  lastOutput,
  colorEnabled,
}: {
  title: string;
  description: string;
  action: string;
  busy?: string;
  lastOutput?: string;
  colorEnabled: boolean;
}) {
  return (
    <Box flexDirection="column">
      <Text color={inkColor("blue", colorEnabled)} bold>
        {title}
      </Text>
      <Text>{description}</Text>
      <Text color={inkColor("cyan", colorEnabled)}>Enter  {action}</Text>
      {busy ? <Text color={inkColor("yellow", colorEnabled)}>! {busy}</Text> : null}
      {lastOutput ? <OutputPreview output={lastOutput} colorEnabled={colorEnabled} /> : null}
    </Box>
  );
}
