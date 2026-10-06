import { describe, expect, it } from "vitest";
import {
  BOARD_THEMES,
  DEFAULT_BOARD_THEME_ID,
  getBoardTheme,
  isBoardThemeId,
} from "./boardThemes";

describe("board color themes", () => {
  it("provides the three selectable profiles", () => {
    expect(BOARD_THEMES.map((theme) => theme.id)).toEqual([
      "green",
      "brown",
      "slate",
    ]);
    expect(DEFAULT_BOARD_THEME_ID).toBe("green");
  });

  it("validates persisted theme ids and resolves their colors", () => {
    expect(isBoardThemeId("brown")).toBe(true);
    expect(isBoardThemeId("unknown")).toBe(false);
    expect(getBoardTheme("slate")).toMatchObject({
      lightSquare: "#d7dade",
      darkSquare: "#68737d",
    });
  });
});
