import type { AnalysisProfilePoint, EngineLine, MoveRow, PieceColor } from "../types";
import { getDefaultAnalysisLineIndex } from "./analysisUtils";

export interface AnalysisMoveSelection {
  position: string | undefined;
  san: string | undefined;
  uci: string | undefined;
  ply: number;
}

export function getAnalysisMoveSelectionForPly(
  moves: MoveRow[],
  ply: number
): AnalysisMoveSelection | null {
  if (ply <= 0) return null;

  const moveNumber = Math.ceil(ply / 2);
  const row = moves.find((candidate) => candidate.moveNumber === moveNumber);
  if (!row) return null;

  return ply % 2 === 1
    ? {
        position: row.whitePosition,
        san: row.white,
        uci: row.whiteUci,
        ply,
      }
    : {
        position: row.blackPosition,
        san: row.black,
        uci: row.blackUci,
        ply,
      };
}

export function getAnalysisSideToMove(
  selectedPly: number | null | undefined,
  variationMoveCount: number
): PieceColor | null {
  if (selectedPly == null) return null;
  return (selectedPly + variationMoveCount) % 2 === 0 ? "white" : "black";
}

export function getEffectiveAnalysisLineIndex(
  point: AnalysisProfilePoint | undefined,
  lines: EngineLine[],
  selectedLineIndex: number | null
): number {
  if (lines.length === 0) return 0;
  if (
    selectedLineIndex != null
    && selectedLineIndex >= 0
    && selectedLineIndex < lines.length
  ) {
    return selectedLineIndex;
  }
  return getDefaultAnalysisLineIndex(point, lines);
}
