import { describe, expect, it } from "vitest";
import type {
  AnalysisPositionComparison,
  GameAnalysisRunSummary,
} from "../types";
import {
  comparisonInitialFen,
  comparisonInitialPosition,
  comparisonMoveDisplay,
  comparisonMoveSan,
  comparisonUciHistory,
  engineEvaluationLabel,
  groupComparisonMoves,
  initialComparisonRunSelection,
  isAnalysisDifference,
  principalVariationLabel,
  positionStringFromFen,
  selectComparisonLeftRun,
} from "./analysisComparison";

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
  it("uses the active run as A and keeps B distinct", () => {
    const runs = [run(1, false), run(2, true), run(3, false)];

    expect(initialComparisonRunSelection(runs)).toEqual({ leftId: 2, rightId: 1 });
    expect(selectComparisonLeftRun(runs, 1, 1)).toEqual({ leftId: 1, rightId: 2 });
  });

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

  it("shows original engine evaluations, including mate scores", () => {
    expect(engineEvaluationLabel(0.38, null)).toBe("+0.38");
    expect(engineEvaluationLabel(-1.25, null)).toBe("-1.25");
    expect(engineEvaluationLabel(99, 3)).toBe("#3");
    expect(engineEvaluationLabel(-99, -2)).toBe("#−2");
  });

  it("formats plies as ordinary move notation and provides the board position", () => {
    const rows = [{
      moveNumber: 7,
      white: "Be7",
      black: "Qxd4",
      whiteUci: "f8e7",
      blackUci: "d8d4",
      whitePosition: "w".repeat(64),
      blackPosition: "b".repeat(64),
    }];
    expect(comparisonMoveDisplay(rows, 13)).toEqual({
      label: "7. Be7",
      position: "w".repeat(64),
      uci: "f8e7",
    });
    expect(comparisonMoveDisplay(rows, 14).label).toBe("7... Qxd4");
    expect(comparisonMoveSan(rows, 13)).toBe("Be7");
    expect(comparisonMoveSan(rows, 14)).toBe("Qxd4");
  });

  it("groups white and black half-moves into familiar move-list rows", () => {
    const white = { ...base, ply: 1 };
    const black = { ...base, ply: 2 };
    const nextWhite = { ...base, ply: 3 };

    expect(groupComparisonMoves([white, black, nextWhite])).toEqual([
      { moveNumber: 1, white, black },
      { moveNumber: 2, white: nextWhite },
    ]);
  });

  it("builds the canonical UCI history up to the selected ply", () => {
    const rows = [
      { moveNumber: 1, whiteUci: "e2e4", blackUci: "e7e5" },
      { moveNumber: 2, whiteUci: "g1f3", blackUci: "b8c6" },
    ];

    expect(comparisonUciHistory(rows, 0)).toEqual([]);
    expect(comparisonUciHistory(rows, 3)).toEqual(["e2e4", "e7e5", "g1f3"]);
  });

  it("renders the actual starting position, including a custom FEN", () => {
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b HAha - 0 1";
    const expected = "rnbqkbnrpppppppp....................P...........PPPP.PPPRNBQKBNR";

    expect(positionStringFromFen(fen)).toBe(expected);
    expect(comparisonInitialPosition({ FEN: fen }, false)).toBe(expected);
    expect(comparisonInitialFen({ FEN: fen }, false)).toBe(fen);
    expect(comparisonMoveDisplay([], 0, expected, "Startposition")).toEqual({
      label: "Startposition",
      position: expected,
      uci: null,
    });
  });

  it("falls back to the classical board for standard and invalid FEN games", () => {
    expect(comparisonInitialPosition({ FEN: "invalid" }, false)).toHaveLength(64);
    expect(comparisonInitialPosition({ FEN: "invalid" }, true)).toContain("rnbqkbnr");
    expect(comparisonInitialFen({}, true)).toContain("rnbqkbnr/pppppppp");
  });
});

function run(id: number, active: boolean): GameAnalysisRunSummary {
  return {
    id,
    engineName: "Engine",
    engineProfileId: `profile-${id}`,
    profileName: `Profile ${id}`,
    requestedDepth: 20,
    moveTimeSeconds: 0,
    multiPv: 3,
    positionCount: 10,
    maximumDepth: 20,
    createdAt: "now",
    active,
  };
}
