import React from "react";
import { Box, Text } from "ink";
import { inkColor } from "../theme.js";
import type { WorkspaceArtifact } from "../types.js";

export function ArtifactsView({
  artifacts,
  colorEnabled,
}: {
  artifacts: WorkspaceArtifact[];
  colorEnabled: boolean;
}) {
  if (artifacts.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color={inkColor("yellow", colorEnabled)}>! No .ghost workspace found.</Text>
        <Text color={inkColor("cyan", colorEnabled)}>Open Analyze and run local analysis.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color={inkColor("blue", colorEnabled)} bold>
        .ghost/
      </Text>
      {artifacts.slice(0, 80).map((artifact) => (
        <Text
          key={artifact.path}
          color={artifact.kind === "directory" ? inkColor("cyan", colorEnabled) : undefined}
        >
          {formatArtifactLine(artifact)}
        </Text>
      ))}
      {artifacts.length > 80 ? (
        <Text color={inkColor("gray", colorEnabled)}>
          ... {artifacts.length - 80} more artifacts
        </Text>
      ) : null}
    </Box>
  );
}

function formatArtifactLine(artifact: WorkspaceArtifact): string {
  const parts = artifact.path.split("/");
  const indent = "  ".repeat(Math.max(0, parts.length - 1));
  const name = parts.at(-1) ?? artifact.path;
  return `${indent}${artifact.kind === "directory" ? "▸" : "-"} ${name}`;
}
