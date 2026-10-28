export const SINGLE_GAME_PGN_INPUT_CLASS = "single-game-pgn-input";

interface FileInputLike {
  type: string;
  classList: {
    contains(token: string): boolean;
  };
}

/**
 * Identifies the one legacy PGN picker whose File.text() call is replaced by
 * the streaming bridge. Other PGN consumers must read their files normally.
 */
export function isSingleGamePgnInput(input: FileInputLike): boolean {
  return input.type === "file" && input.classList.contains(SINGLE_GAME_PGN_INPUT_CLASS);
}
