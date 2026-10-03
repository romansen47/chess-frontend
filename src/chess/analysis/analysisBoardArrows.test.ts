import { describe, expect, it } from "vitest";
import type { AnalysisProfilePoint, EngineEvaluation } from "../types";
import { buildAnalysisBoardArrows } from "./analysisBoardArrows";

const deepPoint: AnalysisProfilePoint = {
  ply: 7,
  from: "g1",
  to: "f3",
  san: "Nf3",
  evaluation: 0.4,
  bar: 0.55,
  depth: 20,
  lines: [
    { eval: 0.4, depth: 20, moves: "d5", moveArrows: [{ from: "d7", to: "d5" }] },
    { eval: 0.2, depth: 20, moves: "Nf6", moveArrows: [{ from: "g8", to: "f6" }] },
    { eval: 0.1, depth: 20, moves: "c5", moveArrows: [{ from: "c7", to: "c5" }] },
  ],
};

describe("buildAnalysisBoardArrows", () => {
  it("shows the played move and the top three deep-analysis moves", () => {
    const arrows = buildAnalysisBoardArrows({
      analysisReplayActive: true,
      selectedPly: 7,
      analysisProfile: [deepPoint],
      variationMoveCount: 0,
      lastMove: null,
      liveEvaluationEnabled: false,
      liveEvaluation: null,
    });

    expect(arrows.map(({ from, to }) => [from, to])).toEqual([
      ["g1", "f3"],
      ["d7", "d5"],
      ["g8", "f6"],
      ["c7", "c5"],
    ]);
    expect(arrows[0]?.opacity).toBe(0.5);
    expect(arrows[1]?.opacity).toBeGreaterThan(arrows[2]?.opacity ?? 0);
    expect(arrows[2]?.opacity).toBeGreaterThan(arrows[3]?.opacity ?? 0);
  });

  it("prefers live-evaluation lines over stored deep-analysis lines", () => {
    const liveEvaluation: EngineEvaluation = {
      eval: 0.7,
      bar: 0.6,
      lines: [
        { eval: 0.7, depth: 18, moves: "e5", moveArrows: [{ from: "e7", to: "e5" }] },
        { eval: 0.5, depth: 18, moves: "c5", moveArrows: [{ from: "c7", to: "c5" }] },
      ],
    };

    const arrows = buildAnalysisBoardArrows({
      analysisReplayActive: true,
      selectedPly: 7,
      analysisProfile: [deepPoint],
      variationMoveCount: 0,
      lastMove: null,
      liveEvaluationEnabled: true,
      liveEvaluation,
    });

    expect(arrows.slice(1).map(({ from, to }) => [from, to])).toEqual([
      ["e7", "e5"],
      ["c7", "c5"],
    ]);
  });

  it("does not reuse deep-analysis arrows inside a temporary variation", () => {
    const arrows = buildAnalysisBoardArrows({
      analysisReplayActive: true,
      selectedPly: 7,
      analysisProfile: [deepPoint],
      variationMoveCount: 1,
      lastMove: { from: "e2", to: "e4" },
      liveEvaluationEnabled: false,
      liveEvaluation: null,
    });

    expect(arrows).toHaveLength(1);
    expect(arrows[0]).toMatchObject({ from: "e2", to: "e4" });
  });
});
