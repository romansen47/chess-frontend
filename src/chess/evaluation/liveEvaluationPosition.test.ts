import { describe, expect, it } from "vitest";

import type { UciGameMove } from "../types";
import {
  appendCanonicalMoveToLiveEvaluationPosition,
  createLiveEvaluationPosition,
} from "./liveEvaluationPosition";

function move(ply: number, uci: string): UciGameMove {
  return { ply, uci, san: null, position: "" };
}

describe("createLiveEvaluationPosition", () => {
  it("creates the classical start position from an empty authoritative history", () => {
    expect(createLiveEvaluationPosition([])).toEqual({
      uciMoves: [],
      chess960: false,
      initialFen: null,
    });
  });

  it("carries Chess960 FEN metadata", () => {
    const fen = "bbqnnrkr/pppppppp/8/8/8/8/PPPPPPPP/BBQNNRKR w HFhf - 0 1";
    expect(createLiveEvaluationPosition([], fen, 0)).toEqual({
      uciMoves: [],
      chess960: true,
      initialFen: fen,
    });
  });

  it("preserves canonical UCI moves including promotion suffixes", () => {
    const result = createLiveEvaluationPosition([
      move(1, "a2a4"), move(2, "h7h5"), move(3, "a4a5"), move(4, "h5h4"),
      move(5, "a5a6"), move(6, "h4h3"), move(7, "a6b7"), move(8, "h3g2"),
      move(9, "b7a8q"), move(10, "g2h1n"),
    ]);

    expect(result.uciMoves).toEqual([
      "a2a4", "h7h5", "a4a5", "h5h4", "a5a6", "h4h3", "a6b7", "h3g2", "b7a8q", "g2h1n",
    ]);
  });

  it("appends a canonical move only for the next authoritative ply and keeps metadata", () => {
    const fen = "bbqnnrkr/pppppppp/8/8/8/8/PPPPPPPP/BBQNNRKR w HFhf - 0 1";
    const position = createLiveEvaluationPosition([move(1, "a2a4")], fen, 0);

    expect(appendCanonicalMoveToLiveEvaluationPosition(position, 2, "a7a5")).toEqual({
      uciMoves: ["a2a4", "a7a5"],
      chess960: true,
      initialFen: fen,
    });
    expect(appendCanonicalMoveToLiveEvaluationPosition(position, 3, "a7a5")).toBeNull();
  });

  it("rejects malformed UCI moves and non-contiguous plies", () => {
    expect(() => createLiveEvaluationPosition([move(1, "e2-e4")]))
      .toThrow("Invalid authoritative UCI move at ply 1");
    expect(() => createLiveEvaluationPosition([move(1, "e2e4"), move(3, "g1f3")]))
      .toThrow("expected ply 2, got 3");
  });
});
