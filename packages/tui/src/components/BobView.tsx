import React from "react";
import { Box, Text } from "ink";
import { BOB_SHELL_INSTALL_COMMAND } from "@ghost-engineer/core";
import { inkColor } from "../theme.js";
import type { WorkbenchSnapshot } from "../types.js";
import { OutputPreview } from "./AnalyzeView.js";
import { Rows } from "./OverviewView.js";
import { StatusBadge } from "./StatusBadge.js";

export function BobView({
  snapshot,
  busy,
  lastOutput,
  installConfirmation,
  colorEnabled,
}: {
  snapshot: WorkbenchSnapshot;
  busy?: string;
  lastOutput?: string;
  installConfirmation: boolean;
  colorEnabled: boolean;
}) {
  const status = snapshot.bobStatus;
  const bobReady = status.executableAvailable && status.appearsCallable;

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text>IBM Bob</Text>
        <StatusBadge
          tone={bobReady ? "success" : "warning"}
          label={bobReady ? "detected" : "setup needed"}
          colorEnabled={colorEnabled}
        />
      </Box>
      <Rows
        colorEnabled={colorEnabled}
        rows={[
          ["Command", status.command],
          ["Path", status.executablePath ?? "Not found"],
          ["Node.js", `${status.nodeVersion} / requires ${status.minimumNodeVersion}+`],
          ["Callable", status.appearsCallable ? "yes" : "no"],
        ]}
      />
      <Box marginTop={1} flexDirection="column">
        <Text color={inkColor("blue", colorEnabled)} bold>
          Bob unlocks
        </Text>
        <Text>- repository-wide reasoning</Text>
        <Text>- documentation and test planning</Text>
        <Text>- refactor guidance and engineering reports</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={inkColor("cyan", colorEnabled)}>Enter  Show guided setup</Text>
        <Text color={inkColor("cyan", colorEnabled)}>
          i      {installConfirmation ? "Confirm official Bob installer" : "Prepare Bob installer"}
        </Text>
        <Text color={inkColor("gray", colorEnabled)}>
          Installer: {BOB_SHELL_INSTALL_COMMAND}
        </Text>
        <Text color={inkColor("gray", colorEnabled)}>
          Bob is a separate IBM product and requires IBMid authentication.
        </Text>
      </Box>
      {installConfirmation ? (
        <Text color={inkColor("yellow", colorEnabled)}>
          ! Press i again to run the official installer. Any navigation key cancels.
        </Text>
      ) : null}
      {busy ? <Text color={inkColor("yellow", colorEnabled)}>! {busy}</Text> : null}
      {lastOutput ? <OutputPreview output={lastOutput} colorEnabled={colorEnabled} /> : null}
    </Box>
  );
}
