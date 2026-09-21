import { useEffect } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  cancelAnalysisReplayRequest,
  fetchAnalysisReplayState,
  fetchNextAnalysisReplayStep,
  startAnalysisReplayRequest,
} from "../api/analysisApi";
import { mapBackendPiecesToLocalPieces, mapPositionStringToLocalPieces } from "../board/positionUtils";
import { getDisplayedBlackPlayerName, getDisplayedWhitePlayerName } from "../game/gameFormatters";
import type { AnalysisReplayStep, UciGameResponse } from "../types";
import type { UseAnalysisControllerOptions } from "./analysisControllerTypes";
import { EMPTY_ANALYSIS_PROFILE, type AnalysisState } from "./useAnalysisState";

interface ReplayDependencies {
  resetAnalysisVariation: () => void;
  stopAnalysisEvaluation: () => Promise<void>;
  selectAnalysisPositionByPly: (ply: number) => void;
}

export function useAnalysisReplay(
  state: AnalysisState,
  options: UseAnalysisControllerOptions,
  dependencies: ReplayDependencies,
) {
  const { t } = useI18n();

  function applyAnalysisReplayStep(step: AnalysisReplayStep) {
    if (step.board?.pieces && !state.analysisReplayActiveRef.current) {
      options.setPieces(mapBackendPiecesToLocalPieces(step.board.pieces));
    }
    if (step.from && step.to && !state.analysisReplayActiveRef.current) {
      options.setLastMove({ from: step.from, to: step.to });
    }
    state.setAnalysisTotalPlies(Math.max(0, step.totalPlies ?? 0));
    state.setAnalysisProfile(step.profile?.length ? step.profile : EMPTY_ANALYSIS_PROFILE);
    const latestProfilePoint = step.profile?.[step.profile.length - 1];
    options.setEngineEval({
      eval: step.evaluation ?? 0,
      bar: step.bar ?? 0.5,
      engineName: step.engineName ?? null,
      lines: latestProfilePoint?.lines ?? [],
    });
  }

  async function runAnalysisReplayLoop(initialStep: AnalysisReplayStep) {
    state.setIsAnalysisReplayRunning(true);
    state.analysisReplayCancelledRef.current = false;
    let currentStep = initialStep;
    try {
      while (!state.analysisReplayCancelledRef.current) {
        if (currentStep.currentPly < currentStep.totalPlies) {
          const activePly = currentStep.currentPly + 1;
          dependencies.selectAnalysisPositionByPly(activePly);
          state.setAnalysisReplayStatus(`Analyzing ${activePly} / ${currentStep.totalPlies}…`);
        }
        const step = await fetchNextAnalysisReplayStep();
        applyAnalysisReplayStep(step);
        currentStep = step;
        const progressText = `${step.currentPly} / ${step.totalPlies}`;
        if (step.done) {
          state.setAnalysisReplayStatus(`Analysis complete (${progressText}).`);
          state.setAnalysisReplayFinished(true);
          break;
        }
      }
    } catch (error) {
      console.error("[runAnalysisReplayLoop] error", error);
      state.setAnalysisReplayError(t("analysis.failed"));
    } finally {
      state.setIsAnalysisReplayRunning(false);
    }
  }

  async function restoreAnalysisReplayAfterReload(restoredMoves: UciGameResponse["moves"]) {
    const replayState = await fetchAnalysisReplayState();
    if (!replayState) return;
    const hasReplayState = replayState.active
      || replayState.totalPlies > 0
      || (replayState.profile?.length ?? 0) > 1;
    if (!hasReplayState) return;

    state.setAnalysisReplayActive(true);
    state.setAnalysisReplayFinished(Boolean(replayState.done));
    state.setIsAnalysisReplayRunning(false);
    state.setAnalysisReplayError(null);
    state.setAnalysisEvaluationEnabled(false);
    state.setAnalysisEvaluation(null);
    state.setAnalysisEvaluationError(null);
    state.analysisEvaluationPlyRef.current = null;
    state.analysisEvaluationKeyRef.current = null;
    dependencies.resetAnalysisVariation();
    state.setAnalysisDetailsTab("engine");
    options.setEngineAutoUpdate(false);
    options.setLiveEvaluationBar(null);
    applyAnalysisReplayStep(replayState);

    const currentPly = Math.max(0, Math.min(replayState.currentPly ?? 0, restoredMoves.length));
    const selectedMove = currentPly > 0
      ? restoredMoves.find((move) => move.ply === currentPly) ?? restoredMoves[currentPly - 1]
      : null;
    if (selectedMove?.position && selectedMove.position.length === 64) {
      const moveLabel = selectedMove.san ? ` · ${selectedMove.san}` : "";
      state.analysisSelectedPlyRef.current = currentPly;
      state.setAnalysisSelectedPosition({
        position: selectedMove.position,
        label: `Ply ${currentPly}${moveLabel}`,
        ply: currentPly,
      });
      options.setPieces(mapPositionStringToLocalPieces(selectedMove.position));
      options.setLastMove(
        selectedMove.uci && selectedMove.uci.length >= 4
          ? { from: selectedMove.uci.substring(0, 2), to: selectedMove.uci.substring(2, 4) }
          : null,
      );
    } else if (replayState.board?.pieces) {
      state.analysisSelectedPlyRef.current = null;
      state.setAnalysisSelectedPosition(null);
      options.setPieces(mapBackendPiecesToLocalPieces(replayState.board.pieces));
      options.setLastMove(null);
    }

    const progressText = `${replayState.currentPly} / ${replayState.totalPlies}`;
    state.setAnalysisReplayStatus(
      replayState.done ? `Analysis complete (${progressText}).` : `Analyzing ${progressText}…`,
    );
    state.analysisReplayResumeRef.current = replayState.active && !replayState.done ? replayState : null;
  }

  function openAnalysisSettingsDialog() {
    state.setAnalysisReplayError(null);
    state.setAnalysisReplayStatus(null);
    if (options.engineConfigOverview?.defaults.deepAnalysisProfileId) {
      state.setAnalysisSettings((previous) => ({
        ...previous,
        engineProfileId: options.engineConfigOverview?.defaults.deepAnalysisProfileId ?? null,
      }));
    }
    options.setShowGameEndDialog(false);
    state.setShowAnalysisSettingsDialog(true);
  }

  async function startAnalysisReplay() {
    try {
      if (!state.analysisSettings.engineProfileId) throw new Error(t("analysis.noDeepProfile"));
      state.analysisReplayResumeRef.current = null;
      state.setAnalysisReplayError(null);
      state.setAnalysisReplayStatus(t("analysis.preparing"));
      state.setAnalysisReplayFinished(false);
      state.setIsAnalysisReplayRunning(true);
      state.setShowAnalysisSettingsDialog(false);
      options.setShowGameEndDialog(false);
      options.setShowSettings(false);
      options.setSelectedSquare(null);
      options.updatePossibleTargets([]);
      options.setHoverPreview(null);
      options.setPromotionContext(null);
      state.setAnalysisWhitePlayerName(
        options.uciAnalysisLoaded
          ? state.analysisWhitePlayerName || "White"
          : getDisplayedWhitePlayerName(
              options.clock,
              options.whiteComputerEnabled,
              options.engineConfigOverview,
              options.engineRuntimeAssignments,
            ),
      );
      state.setAnalysisBlackPlayerName(
        options.uciAnalysisLoaded
          ? state.analysisBlackPlayerName || "Black"
          : getDisplayedBlackPlayerName(
              options.clock,
              options.blackComputerEnabled,
              options.engineConfigOverview,
              options.engineRuntimeAssignments,
            ),
      );
      state.setAnalysisReplayActive(true);
      state.setAnalysisEvaluationEnabled(false);
      state.setAnalysisEvaluation(null);
      state.setAnalysisEvaluationError(null);
      state.analysisEvaluationPlyRef.current = null;
      state.analysisEvaluationKeyRef.current = null;
      dependencies.resetAnalysisVariation();
      await dependencies.stopAnalysisEvaluation();
      await options.stopLiveEvaluation();
      await options.disablePlayerEngines();
      options.setShowGameEndDialog(false);
      options.setEngineAutoUpdate(false);
      options.setLiveEvaluationBar(null);
      state.setAnalysisTotalPlies(0);
      state.analysisSelectedPlyRef.current = null;
      state.setAnalysisSelectedPosition(null);
      state.setAnalysisSelectedLineIndex(null);
      state.setAnalysisLineAnimationIndex(0);
      state.setAnalysisProfile(EMPTY_ANALYSIS_PROFILE);
      const step = await startAnalysisReplayRequest(state.analysisSettings);
      applyAnalysisReplayStep(step);
      state.setAnalysisReplayStatus(`Analyzing 0 / ${step.totalPlies}…`);
      await runAnalysisReplayLoop(step);
    } catch (error) {
      console.error("[startAnalysisReplay] error", error);
      state.setAnalysisReplayError(t("analysis.startFailed"));
      state.setAnalysisReplayFinished(false);
      state.setAnalysisReplayActive(false);
      state.setIsAnalysisReplayRunning(false);
    }
  }

  async function cancelAnalysisReplay() {
    state.analysisReplayCancelledRef.current = true;
    state.setIsAnalysisReplayRunning(false);
    state.setAnalysisReplayFinished(true);
    state.setAnalysisReplayStatus(t("analysis.cancelled"));
    try {
      await cancelAnalysisReplayRequest();
    } catch (error) {
      console.warn("[cancelAnalysisReplay] backend cancel failed", error);
    }
  }

  useEffect(() => {
    if (!options.engineConfigOverview) return;
    state.setAnalysisSettings((previous) => {
      if (options.engineConfigOverview?.profiles.some((profile) => profile.id === previous.engineProfileId)) return previous;
      const preferred = options.engineConfigOverview?.profiles.find(
        (profile) => profile.id === options.engineConfigOverview?.defaults.deepAnalysisProfileId,
      );
      return {
        ...previous,
        engineProfileId: preferred?.id ?? options.engineConfigOverview?.profiles[0]?.id ?? null,
      };
    });
  }, [options.engineConfigOverview]);

  useEffect(() => {
    const replayState = state.analysisReplayResumeRef.current;
    if (!replayState || !state.analysisReplayActive || options.moves.length === 0) return;
    state.analysisReplayResumeRef.current = null;
    void runAnalysisReplayLoop(replayState);
  }, [state.analysisReplayActive, options.moves.length]);

  return {
    restoreAnalysisReplayAfterReload,
    openAnalysisSettingsDialog,
    startAnalysisReplay,
    cancelAnalysisReplay,
  };
}
