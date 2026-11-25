import type {
  AnalysisPositionComparison,
  GameAnalysisRunSummary,
  MoveRow,
} from "../types";

export type AnalysisDifferenceFilter = "all" | "bestMove" | "continuation" | "score" | "mate";

export const SIGNIFICANT_NORMALIZED_SCORE_GAP = 8;

export interface ComparisonRunSelection {
  leftId: number;
  rightId: number;
}

/** Keeps A tied to the active run and always chooses a different B. */
export function initialComparisonRunSelection(
  runs: readonly GameAnalysisRunSummary[],
): ComparisonRunSelection {
  const left = runs.find((run) => run.active) ?? runs[0];
  return {
    leftId: left?.id ?? 0,
    rightId: runs.find((run) => run.id !== left?.id)?.id ?? 0,
  };
}

/** Changes A and repairs B when both selectors would otherwise reference one run. */
export function selectComparisonLeftRun(
  runs: readonly GameAnalysisRunSummary[],
  nextLeftId: number,
  currentRightId: number,
): ComparisonRunSelection {
  return {
    leftId: nextLeftId,
    rightId: currentRightId === nextLeftId
      ? runs.find((run) => run.id !== nextLeftId)?.id ?? 0
      : currentRightId,
  };
}

export function isAnalysisDifference(
  position: AnalysisPositionComparison,
  filter: AnalysisDifferenceFilter,
): boolean {
  switch (filter) {
    case "bestMove": return position.differentBestMove;
    case "continuation": return position.differentContinuation;
    case "score": return position.normalizedScoreGap >= SIGNIFICANT_NORMALIZED_SCORE_GAP;
    case "mate": return position.mateDisagreement;
    default:
      return position.differentBestMove
        || position.differentContinuation
        || position.mateDisagreement
        || position.normalizedScoreGap >= SIGNIFICANT_NORMALIZED_SCORE_GAP;
  }
}

export function principalVariationLabel(moves: readonly string[] | undefined): string {
  return moves?.length ? moves.join(" ") : "—";
}

export interface ComparisonMoveDisplay {
  label: string;
  position: string | null;
  uci: string | null;
}

/** Resolves one ply to familiar chess notation and its resulting board. */
export function comparisonMoveDisplay(
  moves: readonly MoveRow[],
  ply: number,
): ComparisonMoveDisplay {
  if (ply <= 0) return { label: "Start", position: null, uci: null };
  const moveNumber = Math.ceil(ply / 2);
  const row = moves.find((candidate) => candidate.moveNumber === moveNumber);
  const whiteMove = ply % 2 === 1;
  const san = whiteMove ? row?.white : row?.black;
  return {
    label: `${moveNumber}${whiteMove ? "." : "..."} ${san ?? "?"}`,
    position: (whiteMove ? row?.whitePosition : row?.blackPosition) ?? null,
    uci: (whiteMove ? row?.whiteUci : row?.blackUci) ?? null,
  };
}
