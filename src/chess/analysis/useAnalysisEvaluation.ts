import { useEffect } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  fetchAnalysisEvaluation as fetchAnalysisEvaluationRequest,
  fetchAnalysisVariationEvaluation,
  stopAnalysisEvaluationRequest,
} from "../api/analysisApi";
import { analysisEvaluationKey } from "./analysisUtils";
import { getEffectiveAnalysisLineIndex } from "./analysisSelectionUtils";
import type { AnalysisState } from "./useAnalysisState";

export function useAnalysisEvaluation(state: AnalysisState) {
  const { t } = useI18n();

  async function stopAnalysisEvaluation() {
    try {
      await stopAnalysisEvaluationRequest();
    } catch (error) {
      console.warn("[stopAnalysisEvaluation] backend stop failed", error);
    }
  }

  async function loadAnalysisEvaluation(
    ply: number,
    variationMoves: string[] = state.analysisVariationMovesRef.current,
  ) {
    const key = analysisEvaluationKey(ply, variationMoves);
    if (!state.analysisEvaluationEnabledRef.current || state.analysisEvaluationKeyRef.current !== key) return;

    try {
      state.setAnalysisEvaluationError(null);
      const data = variationMoves.length > 0
        ? await fetchAnalysisVariationEvaluation(ply, variationMoves)
        : await fetchAnalysisEvaluationRequest(ply);
      const hasUsableLines = Boolean(data.lines && data.lines.length > 0);
      const isTerminalPosition = Math.abs(data.eval ?? 0) >= 99
        || (variationMoves.length > 0 && Boolean(state.analysisVariationGameState));
      if (
        state.analysisEvaluationEnabledRef.current
        && state.analysisEvaluationKeyRef.current === key
        && (hasUsableLines || isTerminalPosition)
      ) {
        state.setAnalysisEvaluation(data);
      }
    } catch (error) {
      console.error("[loadAnalysisEvaluation] error", error);
      if (state.analysisEvaluationKeyRef.current === key) {
        state.setAnalysisEvaluationError(t("evaluation.analysisFailed"));
      }
    }
  }

  function toggleAnalysisEvaluation() {
    if (!state.analysisReplayFinished || !state.analysisSelectedPosition) return;
    const nextValue = !state.analysisEvaluationEnabledRef.current;
    state.setAnalysisEvaluationEnabled(nextValue);
    state.setAnalysisEvaluation(null);
    state.setAnalysisEvaluationError(null);
    if (!nextValue) {
      state.analysisEvaluationKeyRef.current = null;
      void stopAnalysisEvaluation();
    }
  }

  useEffect(() => {
    state.setAnalysisLineAnimationIndex(0);
  }, [state.analysisSelectedPosition?.ply, state.analysisSelectedLineIndex]);

  useEffect(() => {
    if (!state.analysisReplayActive || !state.analysisSelectedPosition || state.analysisVariationMoves.length > 0) return;
    const selectedPoint = state.analysisProfile.find(
      (point) => point.ply === state.analysisSelectedPosition?.ply,
    );
    const lines = selectedPoint?.lines ?? [];
    if (lines.length === 0) return;
    const lineIndex = getEffectiveAnalysisLineIndex(
      selectedPoint,
      lines,
      state.analysisSelectedLineIndex,
    );
    const positions = lines[lineIndex]?.positions ?? [];
    if (positions.length <= 1) return;
    const intervalId = window.setInterval(() => {
      state.setAnalysisLineAnimationIndex((previous) => (previous + 1) % positions.length);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [
    state.analysisReplayActive,
    state.analysisSelectedPosition?.ply,
    state.analysisSelectedLineIndex,
    state.analysisProfile,
    state.analysisVariationMoves.length,
  ]);

  useEffect(() => {
    if (
      !state.analysisReplayActive
      || !state.analysisReplayFinished
      || !state.analysisEvaluationEnabled
      || !state.analysisSelectedPosition
    ) return;
    const ply = state.analysisSelectedPosition.ply;
    const variationSnapshot = [...state.analysisVariationMoves];
    const key = analysisEvaluationKey(ply, variationSnapshot);
    state.analysisEvaluationPlyRef.current = ply;
    state.analysisEvaluationKeyRef.current = key;
    state.setAnalysisEvaluation(null);
    state.setAnalysisEvaluationError(null);
    void loadAnalysisEvaluation(ply, variationSnapshot);
    const intervalId = window.setInterval(() => {
      void loadAnalysisEvaluation(ply, variationSnapshot);
    }, 2000);
    return () => window.clearInterval(intervalId);
  }, [
    state.analysisReplayActive,
    state.analysisReplayFinished,
    state.analysisEvaluationEnabled,
    state.analysisSelectedPosition?.ply,
    state.analysisVariationMoves,
  ]);

  return { stopAnalysisEvaluation, toggleAnalysisEvaluation };
}
