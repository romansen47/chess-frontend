import { useI18n } from "../../i18n/I18nProvider";
import { submitAnalysisVariationMove } from "../api/analysisApi";
import { mapPositionStringToLocalPieces } from "../board/positionUtils";
import { latestPlyFromMoveRows } from "../game/moveListUtils";
import type { AnalysisVariationRequest, PieceType } from "../types";
import { analysisEvaluationKey } from "./analysisUtils";
import { getAnalysisMoveSelectionForPly } from "./analysisSelectionUtils";
import type { UseAnalysisControllerOptions } from "./analysisControllerTypes";
import type { AnalysisState } from "./useAnalysisState";

export function useAnalysisVariation(state: AnalysisState, options: UseAnalysisControllerOptions) {
  const { t } = useI18n();

  function resetAnalysisVariation() {
    state.setAnalysisVariationAnchorPly(null);
    state.setAnalysisVariationMoves([]);
    state.setAnalysisVariationGameState(null);
    options.resetBoardInteraction();
  }

  function startImportedGameContinuation() {
    if (!state.analysisContinuationAvailable) return;

    const anchorPly = latestPlyFromMoveRows(options.moves);
    const selection = getAnalysisMoveSelectionForPly(options.moves, anchorPly);
    if (!selection?.position || selection.position.length !== 64) return;

    state.setShowAnalysisSettingsDialog(false);
    state.setAnalysisReplayActive(true);
    state.setAnalysisReplayFinished(true);
    state.setIsAnalysisReplayRunning(false);
    state.setAnalysisReplayError(null);
    state.setAnalysisReplayStatus(null);
    state.setAnalysisTotalPlies(anchorPly);
    state.analysisSelectedPlyRef.current = anchorPly;
    state.setAnalysisSelectedPosition({
      position: selection.position,
      label: `Ply ${anchorPly}${selection.san ? ` · ${selection.san}` : ""}`,
      ply: anchorPly,
    });
    state.setAnalysisVariationAnchorPly(anchorPly);
    state.setAnalysisVariationMoves([]);
    state.setAnalysisVariationGameState(null);
    state.setAnalysisSelectedLineIndex(null);
    state.setAnalysisLineAnimationIndex(0);
    state.setAnalysisDetailsTab("engine");
    state.setAnalysisEngineView("live");
    state.setAnalysisEvaluation(null);
    state.setAnalysisEvaluationError(null);
    state.analysisEvaluationPlyRef.current = anchorPly;
    state.analysisEvaluationKeyRef.current = `ply:${anchorPly}`;

    options.setEngineAutoUpdate(false);
    options.setLiveEvaluationBar(null);
    options.resetBoardInteraction();
    options.setHoverPreview(null);
    options.setPieces(mapPositionStringToLocalPieces(selection.position));
    options.setLastMove(
      selection.uci && selection.uci.length >= 4
        ? { from: selection.uci.substring(0, 2), to: selection.uci.substring(2, 4) }
        : null,
    );
  }

  async function performAnalysisVariationMove(from: string, to: string, promotion?: PieceType) {
    if (!state.analysisSelectedPosition) return;
    const anchorPly = state.analysisVariationAnchorPly ?? state.analysisSelectedPosition.ply;
    const previousMoves = state.analysisVariationMovesRef.current.map((move) => ({ ...move }));
    const request: AnalysisVariationRequest = {
      anchorPly,
      moves: previousMoves.map((move) => move.uci),
      from,
      to,
      promotion: promotion ?? null,
    };
    try {
      options.setIsLoadingMoves(true);
      options.setLoadError(null);
      const result = await submitAnalysisVariationMove(request);
      const data = result.data;
      if (!result.ok || !data.success || !data.uci || !data.position) {
        options.setLoadError(data.message || `HTTP ${result.status}`);
        return;
      }
      const nextMoves = [
        ...previousMoves,
        {
          uci: data.uci,
          san: data.san?.trim() || data.uci,
        },
      ];
      if (state.analysisVariationAnchorPly == null) {
        state.setAnalysisVariationAnchorPly(anchorPly);
      }
      state.setAnalysisVariationMoves(nextMoves);
      state.setAnalysisVariationGameState(data.gameState ?? null);
      options.animateMoveLocally(from, to, promotion, data.position);
      options.setLastMove({ from, to });
      options.setSelectedSquare(null);
      options.updatePossibleTargets([]);
      state.setAnalysisSelectedLineIndex(null);
      state.setAnalysisLineAnimationIndex(0);
      state.setAnalysisEngineView("live");
      state.setAnalysisEvaluationError(null);
      state.analysisEvaluationKeyRef.current = analysisEvaluationKey(
        anchorPly,
        nextMoves.map((move) => move.uci),
      );
      void options.playGameSound(data.gameState ? "notify" : "move");
    } catch (error) {
      console.error("[performAnalysisVariationMove] failed", error);
      options.setLoadError(t("analysis.variationMoveFailed"));
    } finally {
      options.setIsLoadingMoves(false);
    }
  }

  return {
    resetAnalysisVariation,
    startImportedGameContinuation,
    performAnalysisVariationMove,
  };
}
