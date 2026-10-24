import type { AnalysisVariationMove } from "../types";

export interface AnalysisVariationMoveRow {
  moveNumber: number;
  white?: string;
  black?: string;
}

export function buildAnalysisVariationMoveRows(
  anchorPly: number,
  moves: readonly AnalysisVariationMove[],
): AnalysisVariationMoveRow[] {
  const rows = new Map<number, AnalysisVariationMoveRow>();

  moves.forEach((move, index) => {
    const ply = Math.max(0, anchorPly) + index + 1;
    const moveNumber = Math.ceil(ply / 2);
    const row = rows.get(moveNumber) ?? { moveNumber };
    if (ply % 2 === 1) {
      row.white = move.san;
    } else {
      row.black = move.san;
    }
    rows.set(moveNumber, row);
  });

  return Array.from(rows.values());
}
