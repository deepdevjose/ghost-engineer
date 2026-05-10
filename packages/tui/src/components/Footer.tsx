import React from "react";
import { Box, Text } from "ink";
import { inkColor } from "../theme.js";
import type { WorkbenchView } from "../types.js";

export function Footer({
  activeView,
  colorEnabled,
}: {
  activeView: WorkbenchView;
  colorEnabled: boolean;
}) {
  const extras =
    activeView === "analyze"
      ? "  b Bob analysis"
      : activeView === "bob"
        ? "  i install"
        : "";

  return (
    <Box paddingX={1} marginTop={1}>
      <Text color={inkColor("gray", colorEnabled)}>
        ↑/↓ j/k navigate  Enter open/run  r refresh  ? help  q quit{extras}
      </Text>
    </Box>
  );
}
