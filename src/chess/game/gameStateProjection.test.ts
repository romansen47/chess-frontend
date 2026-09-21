import { describe, expect, it } from "vitest";
import type { UciGameMove } from "../types";
import { projectGameState } from "./gameStateProjection";

function move(
  ply: number,
  uci: string,
  san: string,
  position = "",
): UciGameMove {
  return { ply, uci, san, position };
}

describe("projectGameState", () => {
  it("projects authoritative move history into board and move-list state", () => {
    const result = projectGameState({
      moves: [
        move(1, "e2e4", "e4"),
        move(2, "e7e5", "e5"),
      ],
      startingPositionId: 518,
    });

    expect(result.latestPly).toBe(2);
    expect(result.lastMove).toEqual({ from: "e7", to: "e5" });
    expect(result.moveRows).toEqual([
      {
        moveNumber: 1,
        white: "e4",
        whiteUci: "e2e4",
        whitePosition: "",
        black: "e5",
        blackUci: "e7e5",
        blackPosition: "",
      },
    ]);
    expect(result.liveEvaluationPosition.uciMoves).toEqual(["e2e4", "e7e5"]);
  });

  it("uses Chess960 position 518 as fallback for a game without metadata", () => {
    const result = projectGameState({ moves: [] });

    expect(result.startingPositionId).toBe(518);
    expect(result.latestPly).toBe(0);
    expect(result.lastMove).toBeNull();
    expect(result.pieces).toHaveLength(32);
    expect(result.liveEvaluationPosition.chess960).toBe(true);
  });

  it("uses an authoritative 64-character board position when supplied", () => {
    const position =
      "rnbqkbnr" +
      "pppppppp" +
      "        " +
      "        " +
      "        " +
      "        " +
      "PPPPPPPP" +
      "RNBQKBNR";

    const result = projectGameState({ moves: [], position });

    expect(result.pieces).toHaveLength(32);
    expect(result.pieces.some((piece) =>
      piece.color === "white" && piece.type === "king" && piece.file === 5 && piece.rank === 1
    )).toBe(true);
  });
});
