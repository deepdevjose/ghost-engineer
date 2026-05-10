import React from "react";
import { Box, Text } from "ink";
import { NAVIGATION_ITEMS } from "../navigation.js";
import { inkColor } from "../theme.js";
import type { WorkbenchView } from "../types.js";

export function Sidebar({
  selectedIndex,
  activeView,
  colorEnabled,
}: {
  selectedIndex: number;
  activeView: WorkbenchView;
  colorEnabled: boolean;
}) {
  return (
    <Box width={18} flexDirection="column" paddingX={1}>
      <Text bold color={inkColor("blue", colorEnabled)}>
        Workbench
      </Text>
      <Text color={inkColor("gray", colorEnabled)}>──────────────</Text>
      {NAVIGATION_ITEMS.map((item, index) => {
        const selected = selectedIndex === index;
        const active = activeView === item.view;
        const marker = selected ? "›" : " ";
        const suffix = active ? " •" : "";
        return (
          <Text
            key={item.view}
            color={selected ? inkColor("cyan", colorEnabled) : undefined}
            bold={selected}
          >
            {marker} {item.label}
            {suffix}
          </Text>
        );
      })}
    </Box>
  );
}
