import { describe, expect, it } from "vitest";
import type { AnalysisProfilePoint, EngineEvaluation } from "../types";
import {
  buildAnalysisBoardArrows,
  buildAnalysisMoveHighlightSquares,
} from "./analysisBoardArrows";

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

const baseOptions = {
  analysisReplayActive: true,
  selectedPly: 7,
  analysisProfile: [deepPoint],
  variationMoveCount: 0,
  lastMove: null,
  liveEvaluationEnabled: false,
  liveEvaluation: null,
  showEvaluationArrows: true,
  maxEvaluationArrows: 3,
};

describe("analysis board decorations", () => {
  it("highlights the source and target squares of the played move", () => {
    expect(buildAnalysisMoveHighlightSquares(baseOptions)).toEqual(["g1", "f3"]);
  });

  it("shows the top three deep-analysis moves as distinct red arrows", () => {
    const arrows = buildAnalysisBoardArrows(baseOptions);

    expect(arrows.map(({ from, to }) => [from, to])).toEqual([
      ["d7", "d5"],
      ["g8", "f6"],
      ["c7", "c5"],
    ]);
    expect(new Set(arrows.map((arrow) => arrow.color)).size).toBe(3);
    expect(arrows[0]?.shaftWidth).toBeGreaterThan(arrows[1]?.shaftWidth ?? 0);
    expect(arrows[1]?.shaftWidth).toBeGreaterThan(arrows[2]?.shaftWidth ?? 0);
    expect(arrows[0]?.opacity).toBeGreaterThan(arrows[1]?.opacity ?? 0);
    expect(arrows[1]?.opacity).toBeGreaterThan(arrows[2]?.opacity ?? 0);
    expect(arrows.every((arrow) => arrow.opacity < 1)).toBe(true);
  });

  it("limits the number of displayed evaluation arrows", () => {
    const arrows = buildAnalysisBoardArrows({
      ...baseOptions,
      maxEvaluationArrows: 2,
    });

    expect(arrows.map(({ from, to }) => [from, to])).toEqual([
      ["d7", "d5"],
      ["g8", "f6"],
    ]);
  });

  it("can disable evaluation arrows without disabling played-move highlights", () => {
    const options = {
      ...baseOptions,
      showEvaluationArrows: false,
    };

    expect(buildAnalysisBoardArrows(options)).toEqual([]);
    expect(buildAnalysisMoveHighlightSquares(options)).toEqual(["g1", "f3"]);
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
      ...baseOptions,
      liveEvaluationEnabled: true,
      liveEvaluation,
    });

    expect(arrows.map(({ from, to }) => [from, to])).toEqual([
      ["e7", "e5"],
      ["c7", "c5"],
    ]);
  });

  it("keeps only the played-move highlight inside a variation without live evaluation", () => {
    const options = {
      ...baseOptions,
      variationMoveCount: 1,
      lastMove: { from: "e2", to: "e4" },
    };

    expect(buildAnalysisBoardArrows(options)).toEqual([]);
    expect(buildAnalysisMoveHighlightSquares(options)).toEqual(["e2", "e4"]);
  });
});
