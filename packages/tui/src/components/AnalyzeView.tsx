import React from "react";
import { Box, Text } from "ink";
import { inkColor } from "../theme.js";
import type { WorkbenchSnapshot } from "../types.js";
import { Rows } from "./OverviewView.js";

export function AnalyzeView({
  snapshot,
  busy,
  lastOutput,
  colorEnabled,
}: {
  snapshot: WorkbenchSnapshot;
  busy?: string;
  lastOutput?: string;
  colorEnabled: boolean;
}) {
  const project = snapshot.project;

  return (
    <Box flexDirection="column">
      <Text color={inkColor("blue", colorEnabled)} bold>
        Actions
      </Text>
      <Text color={inkColor("cyan", colorEnabled)}>Enter  Run local analysis</Text>
      <Text color={inkColor("cyan", colorEnabled)}>b      Run full Bob-powered analysis</Text>
      <Text color={inkColor("gray", colorEnabled)}>
        Local analysis reconstructs repository intelligence before any Bob step.
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Rows
          colorEnabled={colorEnabled}
          rows={[
            ["Files scanned", project?.files?.toString() ?? "Not analyzed yet"],
            ["Project type", project?.projectType ?? "Unknown"],
            ["Risk count", project?.riskCount?.toString() ?? "Unknown"],
            ["Workspace", snapshot.workspaceExists ? ".ghost ready" : ".ghost missing"],
          ]}
        />
      </Box>
      {busy ? <Text color={inkColor("yellow", colorEnabled)}>! {busy}</Text> : null}
      {lastOutput ? <OutputPreview output={lastOutput} colorEnabled={colorEnabled} /> : null}
    </Box>
  );
}

export function OutputPreview({
  output,
  colorEnabled,
}: {
  output: string;
  colorEnabled: boolean;
}) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={inkColor("blue", colorEnabled)} bold>
        Last result
      </Text>
      {output
        .split("\n")
        .filter(Boolean)
        .slice(0, 8)
        .map((line, index) => (
          <Text key={`${line}-${index}`} color={index === 0 ? inkColor("green", colorEnabled) : undefined}>
            {line}
          </Text>
        ))}
    </Box>
  );
}
