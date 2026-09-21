import { describe, expect, it } from "vitest";
import type { MoveResult } from "../types";
import { appendMoveResultToRows } from "./moveListUtils";

function result(partial: Partial<MoveResult>): MoveResult {
  return {
    success: true,
    message: null,
    from: "e2",
    to: "e4",
    san: "e4",
    sideToMove: "black",
    ...partial,
  };
}

describe("appendMoveResultToRows", () => {
  it("places authoritative odd and even plies into the same move row", () => {
    const afterWhite = appendMoveResultToRows([], result({
      ply: 1,
      uci: "e2e4",
      position: "white-position",
    }));
    const afterBlack = appendMoveResultToRows(afterWhite, result({
      from: "e7",
      to: "e5",
      san: "e5",
      sideToMove: "white",
      ply: 2,
      uci: "e7e5",
      position: "black-position",
    }));

    expect(afterBlack).toEqual([
      {
        moveNumber: 1,
        white: "e4",
        whiteUci: "e2e4",
        whitePosition: "white-position",
        black: "e5",
        blackUci: "e7e5",
        blackPosition: "black-position",
      },
    ]);
  });

  it("falls back to side-to-move when the backend provides no ply", () => {
    const rows = appendMoveResultToRows([], result({
      ply: null,
      sideToMove: "black",
      uci: null,
    }));

    expect(rows).toEqual([
      {
        moveNumber: 1,
        white: "e4",
        whiteUci: "e2e4",
        whitePosition: undefined,
      },
    ]);
  });
});
