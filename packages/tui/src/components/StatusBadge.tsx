import React from "react";
import { Text } from "ink";
import { inkColor } from "../theme.js";

export function StatusBadge({
  tone,
  label,
  colorEnabled,
}: {
  tone: "success" | "warning" | "error" | "info";
  label: string;
  colorEnabled: boolean;
}) {
  const color =
    tone === "success"
      ? "green"
      : tone === "warning"
        ? "yellow"
        : tone === "error"
          ? "red"
          : "blue";

  return <Text color={inkColor(color, colorEnabled)}>[{label}]</Text>;
}
