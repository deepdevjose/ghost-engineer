import React from "react";
import { Box, Text } from "ink";
import { inkColor } from "../theme.js";

export function Panel({
  title,
  children,
  colorEnabled,
}: {
  title: string;
  children: React.ReactNode;
  colorEnabled: boolean;
}) {
  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      <Text bold color={inkColor("blue", colorEnabled)}>
        {title}
      </Text>
      <Text color={inkColor("gray", colorEnabled)}>
        {"─".repeat(72)}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {children}
      </Box>
    </Box>
  );
}
