interface TerminalOptions {
  color?: boolean;
  stream?: NodeJS.WriteStream;
}

type ColorName = "blue" | "green" | "yellow" | "red" | "cyan" | "dim";

const COLORS: Record<ColorName, [number, number]> = {
  blue: [34, 39],
  green: [32, 39],
  yellow: [33, 39],
  red: [31, 39],
  cyan: [36, 39],
  dim: [2, 22],
};

export class TerminalFormatter {
  readonly colorEnabled: boolean;

  constructor(options: TerminalOptions = {}) {
    const stream = options.stream ?? process.stdout;
    this.colorEnabled =
      options.color ??
      Boolean(stream.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb");
  }

  color(value: string, color: ColorName): string {
    if (!this.colorEnabled || value.length === 0) {
      return value;
    }

    const [open, close] = COLORS[color];
    return `\u001b[${open}m${value}\u001b[${close}m`;
  }

  success(value: string): string {
    return `${this.color("✓", "green")} ${this.color(value, "green")}`;
  }

  warning(value: string): string {
    return `${this.color("!", "yellow")} ${this.color(value, "yellow")}`;
  }

  failure(value: string): string {
    return `${this.color("✗", "red")} ${this.color(value, "red")}`;
  }

  section(value: string): string {
    return this.color(value, "blue");
  }

  command(value: string): string {
    return this.color(value, "cyan");
  }

  dim(value: string): string {
    return this.color(value, "dim");
  }

  renderOutput(output: string): string {
    return output.split("\n").map((line) => this.renderLine(line)).join("\n");
  }

  renderError(message: string): string {
    return this.renderOutput(message)
      .split("\n")
      .map((line, index) => {
        if (index === 0) {
          return line.startsWith("ghost:")
            ? `ghost: ${this.failure(line.replace(/^ghost:\s*/, ""))}`
            : this.failure(line);
        }

        return line;
      })
      .join("\n");
  }

  renderAnalysisSummary(output: string): string {
    const lines = output.split("\n");
    const firstLine = lines[0] ?? "";
    if (!firstLine.startsWith("Ghost Engineer analyzed ")) {
      return this.renderOutput(output);
    }

    const groups = {
      repository: new Map<string, string>(),
      artifacts: new Map<string, string>(),
      rest: [] as string[],
    };

    for (const line of lines.slice(1)) {
      if (line.trim() === "") {
        continue;
      }

      const [rawLabel, ...rawValue] = line.split(":");
      const value = rawValue.join(":").trim();
      switch (rawLabel) {
        case "Type":
        case "Package manager":
        case "Files":
        case "Languages":
        case "Risk findings":
          groups.repository.set(rawLabel, value);
          break;
        case "Workspace":
        case "Project summary":
        case "Initial analysis":
        case "Report":
          groups.artifacts.set(rawLabel, value);
          break;
        default:
          groups.rest.push(line);
      }
    }

    const rendered = [
      this.success(firstLine),
      "",
      this.section("Repository"),
      ...formatAligned(groups.repository, this),
      "",
      this.section("Artifacts"),
      ...formatAligned(groups.artifacts, this),
    ];

    if (groups.rest.length > 0) {
      rendered.push("", ...groups.rest.map((line) => this.renderLine(line)));
    }

    return collapseBlankLines(rendered).join("\n");
  }

  private renderLine(line: string): string {
    if (line.trim() === "") {
      return line;
    }

    if (line.startsWith("Ghost Engineer analyzed ")) {
      return this.success(line);
    }

    if (line.startsWith("IBM Bob detected.") || line.includes("installer completed")) {
      return this.success(line);
    }

    if (
      line.startsWith("IBM Bob not detected") ||
      line.startsWith("IBM Bob was not found") ||
      line.includes("not user-writable") ||
      line.includes("not on PATH") ||
      line.includes("not callable")
    ) {
      return this.warning(line);
    }

    if (
      line.startsWith("IBM Bob is required") ||
      line.includes("failed") ||
      line.includes("did not complete") ||
      line.includes("could not write")
    ) {
      return this.failure(line);
    }

    if (isSectionLine(line)) {
      return this.section(line);
    }

    if (isCommandLine(line)) {
      return this.command(line);
    }

    if (isMetadataLine(line)) {
      return this.dim(line);
    }

    return line;
  }
}

function collapseBlankLines(lines: string[]): string[] {
  return lines.filter((line, index, all) => !(line === "" && all[index - 1] === ""));
}

function formatAligned(
  values: Map<string, string>,
  terminal: TerminalFormatter,
): string[] {
  const maxLabel = Math.max(...Array.from(values.keys()).map((label) => label.length), 0);
  return Array.from(values.entries()).map(([label, value]) => {
    const padded = `${label.padEnd(maxLabel)}  `;
    return `  ${terminal.dim(padded)}${value}`;
  });
}

function isCommandLine(line: string): boolean {
  return /^\s*(curl|ghost|bob|npm|npm_config_prefix=|mkdir|export|source|fish_add_path)\b/.test(
    line,
  );
}

function isSectionLine(line: string): boolean {
  return /^(Bob setup|Ghost Engineer uses IBM Bob for|Install Bob Shell|After installation|Next steps|Recovery|Requirement|Status|Checked command|Command source|Command|Path|Node\.js|For bash|For zsh|For fish|For your shell)/.test(
    line,
  );
}

function isMetadataLine(line: string): boolean {
  return /^(IBM Bob is a separate IBM product|Ghost Engineer will not install external software|Ghost Engineer already wrote|This avoids sudo|npm global prefix|Checked command|Command source|Status:|Exit code:|Prompt:|Response:)/.test(
    line,
  );
}
