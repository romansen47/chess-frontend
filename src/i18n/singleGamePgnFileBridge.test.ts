import { describe, expect, it } from "vitest";
import {
  isSingleGamePgnInput,
  SINGLE_GAME_PGN_INPUT_CLASS,
} from "./singleGamePgnFileBridge";

function input(classes: string[], type = "file") {
  return {
    type,
    classList: {
      contains: (token: string) => classes.includes(token),
    },
  };
}

describe("single-game PGN file bridge", () => {
  it("accepts only the explicitly marked single-game PGN picker", () => {
    expect(isSingleGamePgnInput(input([SINGLE_GAME_PGN_INPUT_CLASS]))).toBe(true);
    expect(isSingleGamePgnInput(input(["opening-library-hidden-input"]))).toBe(false);
    expect(isSingleGamePgnInput(input(["chess-database-hidden-input"]))).toBe(false);
  });

  it("does not intercept non-file controls even when marked", () => {
    expect(isSingleGamePgnInput(input([SINGLE_GAME_PGN_INPUT_CLASS], "text"))).toBe(false);
  });
});
