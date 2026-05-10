import React from "react";
import { Box, Text } from "ink";
import { inkColor } from "../theme.js";

export function HelpOverlay({ colorEnabled }: { colorEnabled: boolean }) {
  return (
    <Box flexDirection="column">
      <Text color={inkColor("blue", colorEnabled)} bold>
        Workbench help
      </Text>
      <Text>Ghost Engineer is a repository intelligence workbench for IBM Bob.</Text>
      <Text>It reconstructs local context, organizes artifacts, and hands structured context to Bob.</Text>
      <Text color={inkColor("cyan", colorEnabled)}>Up/Down or j/k  Move in sidebar</Text>
      <Text color={inkColor("cyan", colorEnabled)}>Enter          Open the selected view or run its primary action</Text>
      <Text color={inkColor("cyan", colorEnabled)}>r              Refresh workspace and Bob status</Text>
      <Text color={inkColor("cyan", colorEnabled)}>?              Toggle this help</Text>
      <Text color={inkColor("cyan", colorEnabled)}>q              Quit</Text>
      <Text color={inkColor("gray", colorEnabled)}>
        Command mode remains available for automation: ghost analyze ., ghost report . --bob
      </Text>
    </Box>
  );
}
