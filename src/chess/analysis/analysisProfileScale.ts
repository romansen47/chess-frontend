export const ANALYSIS_PROFILE_MIN_MAX_ABS_EVAL = 10;
export const ANALYSIS_PROFILE_MAX_MAX_ABS_EVAL = 100;
export const ANALYSIS_PROFILE_SCALE_STEP = 10;

export function adjustAnalysisProfileScale(
  currentMaxAbsEval: number,
  wheelDeltaY: number,
): number {
  const normalizedCurrent = Math.max(
    ANALYSIS_PROFILE_MIN_MAX_ABS_EVAL,
    Math.min(
      ANALYSIS_PROFILE_MAX_MAX_ABS_EVAL,
      Math.round(currentMaxAbsEval / ANALYSIS_PROFILE_SCALE_STEP)
        * ANALYSIS_PROFILE_SCALE_STEP,
    ),
  );

  if (!Number.isFinite(wheelDeltaY) || wheelDeltaY === 0) {
    return normalizedCurrent;
  }

  const next = normalizedCurrent
    + (wheelDeltaY < 0 ? -ANALYSIS_PROFILE_SCALE_STEP : ANALYSIS_PROFILE_SCALE_STEP);

  return Math.max(
    ANALYSIS_PROFILE_MIN_MAX_ABS_EVAL,
    Math.min(ANALYSIS_PROFILE_MAX_MAX_ABS_EVAL, next),
  );
}
