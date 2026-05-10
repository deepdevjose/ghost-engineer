import React from "react";
import { Box, Text } from "ink";
import { inkColor } from "../theme.js";
import type { WorkbenchSnapshot } from "../types.js";
import { StatusBadge } from "./StatusBadge.js";

export function OverviewView({
  snapshot,
  colorEnabled,
}: {
  snapshot: WorkbenchSnapshot;
  colorEnabled: boolean;
}) {
  const bobReady = snapshot.bobStatus.executableAvailable && snapshot.bobStatus.appearsCallable;
  const project = snapshot.project;

  return (
    <Box flexDirection="column">
      <Rows
        rows={[
          ["Repository", snapshot.cwd],
          ["Project", project?.projectName ?? "Not analyzed yet"],
          ["Type", project?.projectType ?? "Unknown"],
          ["Package", project?.packageManager ?? "Unknown"],
          ["Files", project?.files?.toString() ?? "Unknown"],
          ["Risks", project?.riskCount?.toString() ?? "Unknown"],
          ["Node.js", snapshot.nodeVersion],
        ]}
        colorEnabled={colorEnabled}
      />
      <Box gap={1} marginTop={1}>
        <Text>.ghost</Text>
        <StatusBadge
          tone={snapshot.workspaceExists ? "success" : "warning"}
          label={snapshot.workspaceExists ? "ready" : "missing"}
          colorEnabled={colorEnabled}
        />
        <Text>IBM Bob</Text>
        <StatusBadge
          tone={bobReady ? "success" : "warning"}
          label={bobReady ? "ready" : "setup needed"}
          colorEnabled={colorEnabled}
        />
      </Box>
      <Text color={inkColor("blue", colorEnabled)} bold>
        Recommended next actions
      </Text>
      {snapshot.recommendations.map((recommendation) => (
        <Text key={recommendation} color={inkColor("cyan", colorEnabled)}>
          - {recommendation}
        </Text>
      ))}
    </Box>
  );
}

export function Rows({
  rows,
  colorEnabled,
}: {
  rows: Array<[string, string]>;
  colorEnabled: boolean;
}) {
  const width = Math.max(...rows.map(([label]) => label.length));
  return (
    <Box flexDirection="column">
      {rows.map(([label, value]) => (
        <Text key={label}>
          <Text color={inkColor("gray", colorEnabled)}>{label.padEnd(width)}  </Text>
          {value}
        </Text>
      ))}
    </Box>
  );
}
