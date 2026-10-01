import type { AnalysisProfilePoint, MoveAnnotation } from "../types";

export type {
  ExtraordinaryReason,
  MoveAnnotation,
  MaterialSacrificeType,
  MoveAnnotationKind,
  MoveAnnotationSymbol,
} from "../types";

/**
 * Debug-only CAT annotations stay in the analysis data, but are hidden from
 * normal UI consumers. Saved PGN NAGs are handled separately and are not
 * affected by this filter.
 */
export function isMoveAnnotationVisible(
  annotation: MoveAnnotation,
  debugMode: boolean,
): boolean {
  return annotation.kind !== "extraordinary" || debugMode;
}

/**
 * Indexes annotations already calculated by the chess core.
 *
 * The frontend deliberately contains no move-quality heuristics.
 */
export function buildMoveAnnotations(
  profile: AnalysisProfilePoint[],
  debugMode: boolean = false,
): Record<number, MoveAnnotation> {
  const result: Record<number, MoveAnnotation> = {};

  for (const point of profile) {
    if (
      point.ply > 0
      && point.annotation
      && isMoveAnnotationVisible(point.annotation, debugMode)
    ) {
      result[point.ply] = point.annotation;
    }
  }

  return result;
}
