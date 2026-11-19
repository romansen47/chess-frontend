export const EVALUATION_HISTORY_MIN_MAX_ABS_EVAL = 5;
export const EVALUATION_HISTORY_MAX_MAX_ABS_EVAL = 100;
export const EVALUATION_HISTORY_SCALE_STEP = 10;

const EVALUATION_HISTORY_SCALE_LEVELS = [
  EVALUATION_HISTORY_MIN_MAX_ABS_EVAL,
  ...Array.from(
    { length: EVALUATION_HISTORY_MAX_MAX_ABS_EVAL / EVALUATION_HISTORY_SCALE_STEP },
    (_, index) => (index + 1) * EVALUATION_HISTORY_SCALE_STEP,
  ),
];

export function adjustEvaluationHistoryScale(
  currentMaxAbsEval: number,
  wheelDeltaY: number,
): number {
  const normalizedCurrent = EVALUATION_HISTORY_SCALE_LEVELS.reduce(
    (nearest, candidate) => (
      Math.abs(candidate - currentMaxAbsEval) < Math.abs(nearest - currentMaxAbsEval)
        ? candidate
        : nearest
    ),
  );

  if (!Number.isFinite(wheelDeltaY) || wheelDeltaY === 0) {
    return normalizedCurrent;
  }

  const currentIndex = EVALUATION_HISTORY_SCALE_LEVELS.indexOf(normalizedCurrent);
  const nextIndex = currentIndex + (wheelDeltaY < 0 ? -1 : 1);

  return EVALUATION_HISTORY_SCALE_LEVELS[
    Math.max(0, Math.min(EVALUATION_HISTORY_SCALE_LEVELS.length - 1, nextIndex))
  ];
}
