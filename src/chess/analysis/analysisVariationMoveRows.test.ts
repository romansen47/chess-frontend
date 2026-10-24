import { describe, expect, it } from "vitest";

import type { AnalysisVariationMove } from "../types";
import { buildAnalysisVariationMoveRows } from "./analysisVariationMoveRows";

function move(uci: string, san: string): AnalysisVariationMove {
  return { uci, san };
}

describe("analysis variation move rows", () => {
  it("continues with White after an even anchor ply", () => {
    expect(buildAnalysisVariationMoveRows(4, [
      move("g1f3", "Nf3"),
      move("b8c6", "Nc6"),
      move("f1b5", "Bb5"),
    ])).toEqual([
      { moveNumber: 3, white: "Nf3", black: "Nc6" },
      { moveNumber: 4, white: "Bb5" },
    ]);
  });

  it("continues with Black after an odd anchor ply", () => {
    expect(buildAnalysisVariationMoveRows(5, [
      move("c7c5", "c5"),
      move("g1f3", "Nf3"),
    ])).toEqual([
      { moveNumber: 3, black: "c5" },
      { moveNumber: 4, white: "Nf3" },
    ]);
  });
});
