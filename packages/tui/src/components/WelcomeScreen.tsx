import React from "react";
import { Box, Text } from "ink";
import { GHOST_ASCII, GHOST_ENGINEER_VERSION } from "../welcome.js";
import { inkColor } from "../theme.js";
import type { WorkbenchSnapshot } from "../types.js";
import { StatusBadge } from "./StatusBadge.js";

export function WelcomeScreen({
  snapshot,
  colorEnabled,
}: {
  snapshot: WorkbenchSnapshot;
  colorEnabled: boolean;
}) {
  const bobReady = snapshot.bobStatus.executableAvailable && snapshot.bobStatus.appearsCallable;

  return (
    <Box flexDirection="column" alignItems="center" paddingTop={1}>
      <Text color={inkColor("blue", colorEnabled)}>
        ─────────────── Welcome to ───────────────
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {GHOST_ASCII.map((line, index) => (
          <Text
            key={line}
            bold
            color={index % 2 === 0 ? inkColor("blue", colorEnabled) : inkColor("cyan", colorEnabled)}
          >
            {line}
          </Text>
        ))}
      </Box>
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text bold color={inkColor("cyan", colorEnabled)}>
          GHOST ENGINEER WORKBENCH
        </Text>
        <Text color={inkColor("blue", colorEnabled)}>
          ─────────────── Version {GHOST_ENGINEER_VERSION} ───────────────
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text>Repository intelligence workbench for IBM Bob.</Text>
        <Text color={inkColor("gray", colorEnabled)}>
          Reconstruct local context, organize artifacts, then reason with Bob.
        </Text>
      </Box>
      <Box marginTop={1} gap={1}>
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
        <StatusBadge tone="info" label={`Node ${snapshot.nodeVersion}`} colorEnabled={colorEnabled} />
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={inkColor("gray", colorEnabled)}>Here are the fastest paths:</Text>
        <Text>
          <Text color={inkColor("cyan", colorEnabled)}>Enter</Text>
          {"  Open the full workbench"}
        </Text>
        <Text>
          <Text color={inkColor("cyan", colorEnabled)}>a</Text>
          {"      Run local analysis"}
        </Text>
        <Text>
          <Text color={inkColor("cyan", colorEnabled)}>b</Text>
          {"      Open IBM Bob setup"}
        </Text>
        <Text>
          <Text color={inkColor("cyan", colorEnabled)}>?</Text>
          {"      Help"}
        </Text>
        <Text>
          <Text color={inkColor("cyan", colorEnabled)}>q</Text>
          {"      Quit"}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text color={inkColor("yellow", colorEnabled)}>
          Bob Shell is a separate IBM product and requires IBMid authentication.
        </Text>
        <Text italic color={inkColor("gray", colorEnabled)}>
          Users should independently verify AI-generated content.
        </Text>
      </Box>
    </Box>
  );
}
