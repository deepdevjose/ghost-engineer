export type ThemeColor = "blue" | "green" | "yellow" | "red" | "cyan" | "gray";

export interface ThemeOptions {
  color?: boolean;
  stream?: NodeJS.WriteStream;
  env?: Record<string, string | undefined>;
}

export function shouldUseColor(options: ThemeOptions = {}): boolean {
  const env = options.env ?? process.env;
  const stream = options.stream ?? process.stdout;
  return (
    options.color ??
    Boolean(stream.isTTY && !env.NO_COLOR && env.TERM !== "dumb")
  );
}

export function inkColor(color: ThemeColor, enabled: boolean): string | undefined {
  if (!enabled) {
    return undefined;
  }

  switch (color) {
    case "blue":
      return "blue";
    case "green":
      return "green";
    case "yellow":
      return "yellow";
    case "red":
      return "red";
    case "cyan":
      return "cyan";
    case "gray":
      return "gray";
  }
}
