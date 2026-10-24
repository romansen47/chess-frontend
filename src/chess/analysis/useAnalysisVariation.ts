import { useI18n } from "../../i18n/I18nProvider";
import { submitAnalysisVariationMove } from "../api/analysisApi";
import type { AnalysisVariationRequest, PieceType } from "../types";
import { analysisEvaluationKey } from "./analysisUtils";
import type { UseAnalysisControllerOptions } from "./analysisControllerTypes";
import type { AnalysisState } from "./useAnalysisState";

export function useAnalysisVariation(state: AnalysisState, options: UseAnalysisControllerOptions) {
  const { t } = useI18n();

  function resetAnalysisVariation() {
    state.setAnalysisVariationMoves([]);
    state.setAnalysisVariationGameState(null);
    options.resetBoardInteraction();
  }

  async function performAnalysisVariationMove(from: string, to: string, promotion?: PieceType) {
    if (!state.analysisSelectedPosition) return;
    const previousMoves = [...state.analysisVariationMovesRef.current];
    const request: AnalysisVariationRequest = {
      anchorPly: state.analysisSelectedPosition.ply,
      moves: previousMoves,
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
      const nextMoves = [...previousMoves, data.uci];
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
        state.analysisSelectedPosition.ply,
        nextMoves,
      );
      void options.playGameSound(data.gameState ? "notify" : "move");
    } catch (error) {
      console.error("[performAnalysisVariationMove] failed", error);
      options.setLoadError(t("analysis.variationMoveFailed"));
    } finally {
      options.setIsLoadingMoves(false);
    }
  }

  return { resetAnalysisVariation, performAnalysisVariationMove };
}
