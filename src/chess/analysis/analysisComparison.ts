import type { AnalysisPositionComparison } from "../types";

export type AnalysisDifferenceFilter = "all" | "bestMove" | "continuation" | "score" | "mate";

export const SIGNIFICANT_NORMALIZED_SCORE_GAP = 8;

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
