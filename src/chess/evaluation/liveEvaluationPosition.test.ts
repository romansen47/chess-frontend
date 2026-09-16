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
  it("creates the start position from an empty authoritative history", () => {
    expect(createLiveEvaluationPosition([])).toEqual({ uciMoves: [] });
  });

  it("preserves canonical UCI moves including promotion suffixes", () => {
    const result = createLiveEvaluationPosition([
      move(1, "a2a4"),
      move(2, "h7h5"),
      move(3, "a4a5"),
      move(4, "h5h4"),
      move(5, "a5a6"),
      move(6, "h4h3"),
      move(7, "a6b7"),
      move(8, "h3g2"),
      move(9, "b7a8q"),
      move(10, "g2h1n"),
    ]);

    expect(result.uciMoves).toEqual([
      "a2a4",
      "h7h5",
      "a4a5",
      "h5h4",
      "a5a6",
      "h4h3",
      "a6b7",
      "h3g2",
      "b7a8q",
      "g2h1n",
    ]);
  });

  it("appends a canonical move only for the next authoritative ply", () => {
    const position = createLiveEvaluationPosition([
      move(1, "e2e4"),
      move(2, "e7e5"),
    ]);

    expect(appendCanonicalMoveToLiveEvaluationPosition(
      position,
      3,
      "g1f3",
    )).toEqual({
      uciMoves: ["e2e4", "e7e5", "g1f3"],
    });

    expect(appendCanonicalMoveToLiveEvaluationPosition(
      position,
      4,
      "g1f3",
    )).toBeNull();
  });

  it("preserves promotion suffixes and rejects non-canonical move text", () => {
    const position = createLiveEvaluationPosition([]);

    expect(appendCanonicalMoveToLiveEvaluationPosition(
      position,
      1,
      "e7e8q",
    )).toEqual({
      uciMoves: ["e7e8q"],
    });

    expect(appendCanonicalMoveToLiveEvaluationPosition(
      position,
      1,
      "e7e8",
    )).toEqual({
      uciMoves: ["e7e8"],
    });

    expect(appendCanonicalMoveToLiveEvaluationPosition(
      position,
      1,
      "e7-e8q",
    )).toBeNull();
  });

  it("rejects malformed UCI moves", () => {
    expect(() => createLiveEvaluationPosition([
      move(1, "e2-e4"),
    ])).toThrow("Invalid authoritative UCI move at ply 1");
  });

  it("rejects non-contiguous authoritative plies", () => {
    expect(() => createLiveEvaluationPosition([
      move(1, "e2e4"),
      move(3, "g1f3"),
    ])).toThrow("expected ply 2, got 3");
  });
});
