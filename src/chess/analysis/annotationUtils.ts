import type { GameAnnotation } from "../types";

export function gameAnnotationRecord(
  annotations: GameAnnotation[] | null | undefined
): Record<number, GameAnnotation> {
  const result: Record<number, GameAnnotation> = {};

  for (const annotation of annotations ?? []) {
    if (
      !annotation
      || !Number.isFinite(annotation.ply)
      || annotation.ply <= 0
    ) {
      continue;
    }

    result[annotation.ply] = {
      ...annotation,
      variations: [...(annotation.variations ?? [])],
    };
  }

  return result;
}

export function isEmptyGameAnnotation(annotation: GameAnnotation): boolean {
  return !annotation.nag
    && !annotation.comment?.trim()
    && !annotation.evaluation?.trim()
    && (annotation.variations?.length ?? 0) === 0;
}
