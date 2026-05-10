import React from "react";
import { Box, Text } from "ink";
import { inkColor } from "../theme.js";
import type { ActivityEvent } from "../types.js";

export function ActivityView({
  activity,
  colorEnabled,
}: {
  activity: ActivityEvent[];
  colorEnabled: boolean;
}) {
  if (activity.length === 0) {
    return <Text color={inkColor("gray", colorEnabled)}>No activity yet.</Text>;
  }

  return (
    <Box flexDirection="column">
      {activity.slice(-16).map((event) => (
        <Text key={event.id} color={colorFor(event.level, colorEnabled)}>
          {markerFor(event.level)} {event.createdAt} {event.message}
        </Text>
      ))}
    </Box>
  );
}

function markerFor(level: ActivityEvent["level"]): string {
  switch (level) {
    case "success":
      return "✓";
    case "warning":
      return "!";
    case "error":
      return "✗";
    case "info":
      return "-";
  }
}

function colorFor(level: ActivityEvent["level"], enabled: boolean): string | undefined {
  switch (level) {
    case "success":
      return inkColor("green", enabled);
    case "warning":
      return inkColor("yellow", enabled);
    case "error":
      return inkColor("red", enabled);
    case "info":
      return inkColor("gray", enabled);
  }
}
