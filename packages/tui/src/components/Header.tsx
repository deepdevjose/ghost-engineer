import React from "react";
import { Box, Text } from "ink";
import { inkColor } from "../theme.js";
import type { WorkbenchSnapshot } from "../types.js";
import { StatusBadge } from "./StatusBadge.js";

export function Header({
  snapshot,
  colorEnabled,
}: {
  snapshot: WorkbenchSnapshot;
  colorEnabled: boolean;
}) {
  const bobReady = snapshot.bobStatus.executableAvailable && snapshot.bobStatus.appearsCallable;

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Box gap={1}>
        <Text bold color={inkColor("blue", colorEnabled)}>
          Ghost Engineer Workbench
        </Text>
        <Text color={inkColor("gray", colorEnabled)}>Repository intelligence for IBM Bob</Text>
      </Box>
      <Box gap={1}>
        <StatusBadge
          tone={snapshot.workspaceExists ? "success" : "warning"}
          label={snapshot.workspaceExists ? ".ghost ready" : ".ghost missing"}
          colorEnabled={colorEnabled}
        />
        <StatusBadge
          tone={bobReady ? "success" : "warning"}
          label={bobReady ? "Bob ready" : "Bob setup"}
          colorEnabled={colorEnabled}
        />
      </Box>
    </Box>
  );
}
