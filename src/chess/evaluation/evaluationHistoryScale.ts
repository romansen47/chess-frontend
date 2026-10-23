export const EVALUATION_HISTORY_MIN_MAX_ABS_EVAL = 10;
export const EVALUATION_HISTORY_MAX_MAX_ABS_EVAL = 100;
export const EVALUATION_HISTORY_SCALE_STEP = 10;

export function adjustEvaluationHistoryScale(
  currentMaxAbsEval: number,
  wheelDeltaY: number,
): number {
  const normalizedCurrent = Math.max(
    EVALUATION_HISTORY_MIN_MAX_ABS_EVAL,
    Math.min(
      EVALUATION_HISTORY_MAX_MAX_ABS_EVAL,
      Math.round(currentMaxAbsEval / EVALUATION_HISTORY_SCALE_STEP)
        * EVALUATION_HISTORY_SCALE_STEP,
    ),
  );

  if (!Number.isFinite(wheelDeltaY) || wheelDeltaY === 0) {
    return normalizedCurrent;
  }

  const next = normalizedCurrent
    + (wheelDeltaY < 0 ? -EVALUATION_HISTORY_SCALE_STEP : EVALUATION_HISTORY_SCALE_STEP);

  return Math.max(
    EVALUATION_HISTORY_MIN_MAX_ABS_EVAL,
    Math.min(EVALUATION_HISTORY_MAX_MAX_ABS_EVAL, next),
  );
}
