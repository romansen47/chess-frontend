import type { CSSProperties } from "react";

export type BoardThemeId = "green" | "brown" | "slate";

export interface BoardTheme {
  id: BoardThemeId;
  lightSquare: string;
  darkSquare: string;
}

export const BOARD_THEMES: readonly BoardTheme[] = [
  {
    id: "green",
    lightSquare: "#f0d9b5",
    darkSquare: "#769656",
  },
  {
    id: "brown",
    lightSquare: "#f0d9b5",
    darkSquare: "#b58863",
  },
  {
    id: "slate",
    lightSquare: "#d7dade",
    darkSquare: "#68737d",
  },
];

export const DEFAULT_BOARD_THEME_ID: BoardThemeId = "green";

export function isBoardThemeId(value: unknown): value is BoardThemeId {
  return BOARD_THEMES.some((theme) => theme.id === value);
}

export function getBoardTheme(themeId: BoardThemeId): BoardTheme {
  return BOARD_THEMES.find((theme) => theme.id === themeId)
    ?? BOARD_THEMES[0];
}

export function boardThemeCssVariables(
  themeId: BoardThemeId,
): CSSProperties {
  const theme = getBoardTheme(themeId);
  return {
    "--board-light-square": theme.lightSquare,
    "--board-dark-square": theme.darkSquare,
  } as CSSProperties;
}
