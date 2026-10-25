export interface AnalysisStartInterruption {
  cancelReplay: () => Promise<void>;
  stopAnalysisEvaluation: () => Promise<void>;
  stopLiveEvaluation: () => Promise<void>;
  disablePlayerEngines: () => Promise<void>;
}

/**
 * Stops every engine-backed calculation that can conflict with starting a new
 * deep analysis. All stop operations are attempted even when one of them fails.
 */
export async function stopAnalysisCalculations(
  interruption: AnalysisStartInterruption,
): Promise<void> {
  await Promise.allSettled([
    interruption.cancelReplay(),
    interruption.stopAnalysisEvaluation(),
    interruption.stopLiveEvaluation(),
    interruption.disablePlayerEngines(),
  ]);
}
