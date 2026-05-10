export const CLEAR_SCREEN = "\u001b[2J\u001b[3J\u001b[H";
export const ENTER_ALTERNATE_SCREEN = "\u001b[?1049h";
export const EXIT_ALTERNATE_SCREEN = "\u001b[?1049l";
export const HIDE_CURSOR = "\u001b[?25l";
export const SHOW_CURSOR = "\u001b[?25h";

interface WritableTerminal {
  write: (value: string) => unknown;
}

export function clearInteractiveScreen(stdout: WritableTerminal): void {
  stdout.write(CLEAR_SCREEN);
}

export function enterInteractiveScreen(stdout: WritableTerminal): () => void {
  stdout.write(`${ENTER_ALTERNATE_SCREEN}${CLEAR_SCREEN}${HIDE_CURSOR}`);

  let restored = false;
  return () => {
    if (restored) {
      return;
    }

    restored = true;
    stdout.write(`${SHOW_CURSOR}${CLEAR_SCREEN}${EXIT_ALTERNATE_SCREEN}`);
  };
}
