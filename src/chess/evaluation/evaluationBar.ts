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
