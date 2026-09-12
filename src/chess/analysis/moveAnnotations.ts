import type { AnalysisProfilePoint, MoveAnnotation } from "../types";

export type {
  BrilliantReason,
  MoveAnnotation,
  MaterialSacrificeType,
  MoveAnnotationKind,
  MoveAnnotationSymbol,
} from "../types";

/**
 * Indexes annotations already calculated by the chess core.
 *
 * The frontend deliberately contains no move-quality heuristics.
 */
export function buildMoveAnnotations(
  profile: AnalysisProfilePoint[]
): Record<number, MoveAnnotation> {
  const result: Record<number, MoveAnnotation> = {};

  for (const point of profile) {
    if (point.ply > 0 && point.annotation) {
      result[point.ply] = point.annotation;
    }
  }

  return result;
}
