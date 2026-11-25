import { describe, expect, it } from "vitest";
import type { AnalysisPositionComparison } from "../types";
import { isAnalysisDifference, principalVariationLabel } from "./analysisComparison";

const base: AnalysisPositionComparison = {
  ply: 12,
  left: { ply: 12, evaluation: 0.2, normalizedScore: 52, depth: 18, mateDistance: null, lines: [] },
  right: { ply: 12, evaluation: 0.4, normalizedScore: 54, depth: 20, mateDistance: null, lines: [] },
  differentBestMove: false,
  differentContinuation: false,
  mateDisagreement: false,
  normalizedScoreGap: 2,
  commonPrefixLength: 2,
  leftBestMoveRankOnRight: 1,
  rightBestMoveRankOnLeft: 1,
};

describe("analysis comparison", () => {
  it("distinguishes a different root move from a different continuation", () => {
    expect(isAnalysisDifference({ ...base, differentBestMove: true }, "bestMove")).toBe(true);
    expect(isAnalysisDifference({ ...base, differentContinuation: true }, "bestMove")).toBe(false);
    expect(isAnalysisDifference({ ...base, differentContinuation: true }, "continuation")).toBe(true);
  });

  it("uses the documented normalized score threshold", () => {
    expect(isAnalysisDifference({ ...base, normalizedScoreGap: 7.99 }, "score")).toBe(false);
    expect(isAnalysisDifference({ ...base, normalizedScoreGap: 8 }, "score")).toBe(true);
  });

  it("formats canonical variants without inventing notation", () => {
    expect(principalVariationLabel(["e2e4", "e7e5"])).toBe("e2e4 e7e5");
    expect(principalVariationLabel([])).toBe("—");
  });
});
