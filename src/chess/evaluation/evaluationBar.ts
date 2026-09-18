const MATE_EVALUATION_THRESHOLD = 99;

export function evaluationToBar(evaluation: number): number {
  if (!Number.isFinite(evaluation)) {
    throw new Error("Evaluation must be finite");
  }
  if (evaluation >= MATE_EVALUATION_THRESHOLD) return 1;
  if (evaluation <= -MATE_EVALUATION_THRESHOLD) return 0;

  const result =
    0.5 + Math.atan(Math.tan(Math.PI / 10) * evaluation) / Math.PI;
  return Math.max(0, Math.min(1, result));
}


/**
 * Returns a visible evaluation-bar value only after an enabled evaluation
 * source has produced a usable result. A missing result is deliberately
 * represented as null rather than as a synthetic 0.50 evaluation.
 */
export function activeEvaluationBarValue(
  enabled: boolean,
  value: number | null | undefined,
): number | null {
  if (!enabled || value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}
