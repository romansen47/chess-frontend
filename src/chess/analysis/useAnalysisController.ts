import type { UseAnalysisControllerOptions } from "./analysisControllerTypes";
import { useAnalysisState, EMPTY_ANALYSIS_PROFILE } from "./useAnalysisState";
import { useAnalysisDerived } from "./useAnalysisDerived";
import { useAnalysisEvaluation } from "./useAnalysisEvaluation";
import { useAnalysisVariation } from "./useAnalysisVariation";
import { useAnalysisNavigation } from "./useAnalysisNavigation";
import { useAnalysisReplay } from "./useAnalysisReplay";
import { useAnalysisAnnotations } from "./useAnalysisAnnotations";

export function useAnalysisController(options: UseAnalysisControllerOptions) {
  const state = useAnalysisState();
  const variation = useAnalysisVariation(state, options);
  const evaluation = useAnalysisEvaluation(state);
  const navigation = useAnalysisNavigation(state, options, {
    resetAnalysisVariation: variation.resetAnalysisVariation,
    stopAnalysisEvaluation: evaluation.stopAnalysisEvaluation,
  });
  const replay = useAnalysisReplay(state, options, {
    resetAnalysisVariation: variation.resetAnalysisVariation,
    stopAnalysisEvaluation: evaluation.stopAnalysisEvaluation,
    selectAnalysisPositionByPly: navigation.selectAnalysisPositionByPly,
  });
  const annotations = useAnalysisAnnotations(state, options);
  const derived = useAnalysisDerived(state, options);

  function resetAnalysisState() {
    state.analysisReplayCancelledRef.current = true;
    state.analysisReplayResumeRef.current = null;
    state.setAnalysisReplayActive(false);
    state.setIsAnalysisReplayRunning(false);
    state.setAnalysisReplayStatus(null);
    state.setAnalysisReplayError(null);
    state.setAnalysisReplayFinished(false);
    state.setAnalysisTotalPlies(0);
    state.analysisSelectedPlyRef.current = null;
    state.setAnalysisSelectedPosition(null);
    state.setAnalysisSelectedLineIndex(null);
    state.setAnalysisLineAnimationIndex(0);
    state.setAnalysisEvaluationEnabled(false);
    state.setAnalysisEvaluation(null);
    state.setAnalysisEvaluationError(null);
    state.analysisEvaluationPlyRef.current = null;
    state.analysisEvaluationKeyRef.current = null;
    variation.resetAnalysisVariation();
    state.setAnalysisDetailsTab("engine");
    state.setAnalysisProfile(EMPTY_ANALYSIS_PROFILE);
  }

  return {
    showAnalysisSettingsDialog: state.showAnalysisSettingsDialog,
    setShowAnalysisSettingsDialog: state.setShowAnalysisSettingsDialog,
    analysisSettings: state.analysisSettings,
    setAnalysisSettings: state.setAnalysisSettings,
    analysisReplayActive: state.analysisReplayActive,
    analysisReplayActiveRef: state.analysisReplayActiveRef,
    isAnalysisReplayRunning: state.isAnalysisReplayRunning,
    analysisReplayStatus: state.analysisReplayStatus,
    analysisReplayError: state.analysisReplayError,
    analysisReplayFinished: state.analysisReplayFinished,
    analysisProfile: state.analysisProfile,
    analysisTotalPlies: state.analysisTotalPlies,
    analysisSelectedPosition: state.analysisSelectedPosition,
    analysisDetailsTab: state.analysisDetailsTab,
    setAnalysisDetailsTab: state.setAnalysisDetailsTab,
    gameAnnotations: state.gameAnnotations,
    annotationsDirty: state.annotationsDirty,
    annotationsSaving: state.annotationsSaving,
    annotationSaveError: state.annotationSaveError,
    analysisEngineView: state.analysisEngineView,
    setAnalysisEngineView: state.setAnalysisEngineView,
    analysisSelectedLineIndex: state.analysisSelectedLineIndex,
    setAnalysisSelectedLineIndex: state.setAnalysisSelectedLineIndex,
    analysisLineAnimationIndex: state.analysisLineAnimationIndex,
    setAnalysisLineAnimationIndex: state.setAnalysisLineAnimationIndex,
    analysisWhitePlayerName: state.analysisWhitePlayerName,
    setAnalysisWhitePlayerName: state.setAnalysisWhitePlayerName,
    analysisBlackPlayerName: state.analysisBlackPlayerName,
    setAnalysisBlackPlayerName: state.setAnalysisBlackPlayerName,
    analysisEvaluationEnabled: state.analysisEvaluationEnabled,
    analysisEvaluation: state.analysisEvaluation,
    analysisEvaluationError: state.analysisEvaluationError,
    analysisEvaluationKeyRef: state.analysisEvaluationKeyRef,
    analysisVariationMoves: state.analysisVariationMoves,
    analysisVariationMovesRef: state.analysisVariationMovesRef,
    analysisVariationGameState: state.analysisVariationGameState,
    ...derived,
    resetAnalysisState,
    resetAnnotations: annotations.resetAnnotations,
    stopAnalysisEvaluation: evaluation.stopAnalysisEvaluation,
    toggleAnalysisEvaluation: evaluation.toggleAnalysisEvaluation,
    selectAnalysisPosition: navigation.selectAnalysisPosition,
    selectAnalysisPositionByPly: navigation.selectAnalysisPositionByPly,
    restoreAnalysisReplayAfterReload: replay.restoreAnalysisReplayAfterReload,
    openAnalysisSettingsDialog: replay.openAnalysisSettingsDialog,
    startAnalysisReplay: replay.startAnalysisReplay,
    cancelAnalysisReplay: replay.cancelAnalysisReplay,
    updateGameAnnotation: annotations.updateGameAnnotation,
    persistGameAnnotations: annotations.persistGameAnnotations,
    saveAnalysisPgn: annotations.saveAnalysisPgn,
    performAnalysisVariationMove: variation.performAnalysisVariationMove,
    restoreAnnotations: annotations.restoreAnnotations,
    setImportedPlayers: annotations.setImportedPlayers,
  };
}

export type AnalysisController = ReturnType<typeof useAnalysisController>;
