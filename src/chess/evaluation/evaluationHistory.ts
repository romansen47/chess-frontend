import type { EngineEvaluation } from "../types";

export interface EvaluationHistoryPoint {
  ply: number;
  evaluation: number;
  depth?: number | null;
  label?: string | null;
}

export function recordEvaluationHistoryPoint(
  current: readonly EvaluationHistoryPoint[],
  ply: number,
  evaluation: EngineEvaluation,
): EvaluationHistoryPoint[] {
  if (!Number.isInteger(ply) || ply < 0 || !Number.isFinite(evaluation.eval)) {
    return [...current];
  }

  const nextPoint: EvaluationHistoryPoint = {
    ply,
    evaluation: evaluation.eval,
    depth: evaluation.lines[0]?.depth ?? null,
  };
  const withoutCurrentPly = current.filter((point) => point.ply !== ply);
  return [...withoutCurrentPly, nextPoint]
    .sort((left, right) => left.ply - right.ply);
}

export function resetEvaluationHistoryForPly(
  current: readonly EvaluationHistoryPoint[],
  currentPly: number,
): EvaluationHistoryPoint[] {
  if (!Number.isInteger(currentPly) || currentPly < 0) return [];
  const latestRecordedPly = current[current.length - 1]?.ply ?? -1;
  if (latestRecordedPly <= currentPly) return [...current];
  return current.filter((point) => point.ply <= currentPly);
}
