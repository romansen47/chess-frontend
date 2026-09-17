import { useEffect } from "react";
import { mapPositionStringToLocalPieces } from "../board/positionUtils";
import { piecesMatchPosition, transitionBoardPosition } from "../board/pieceTransitions";
import { getAnalysisMoveSelectionForPly } from "./analysisSelectionUtils";
import type { UseAnalysisControllerOptions } from "./analysisControllerTypes";
import type { AnalysisState } from "./useAnalysisState";

interface NavigationDependencies {
  resetAnalysisVariation: () => void;
  stopAnalysisEvaluation: () => Promise<void>;
}

export function useAnalysisNavigation(
  state: AnalysisState,
  options: UseAnalysisControllerOptions,
  dependencies: NavigationDependencies,
) {
  function selectAnalysisPosition(
    position: string | undefined,
    san: string | undefined,
    ply: number,
    selectOptions?: { updateBoard?: boolean },
  ) {
    if (!state.analysisReplayActiveRef.current || !position || position.length !== 64) return;
    const hadVariation = state.analysisVariationMovesRef.current.length > 0;
    if (hadVariation) void dependencies.stopAnalysisEvaluation();
    dependencies.resetAnalysisVariation();
    const moveLabel = san ? ` · ${san}` : "";
    state.analysisEvaluationPlyRef.current = ply;
    state.analysisEvaluationKeyRef.current = `ply:${ply}`;
    state.setAnalysisEvaluation(null);
    state.setAnalysisEvaluationError(null);
    state.analysisSelectedPlyRef.current = ply;
    state.setAnalysisSelectedPosition({ position, label: `Ply ${ply}${moveLabel}`, ply });
    state.setAnalysisSelectedLineIndex(null);
    state.setAnalysisLineAnimationIndex(0);
    if (selectOptions?.updateBoard !== false) {
      options.setPieces(mapPositionStringToLocalPieces(position));
    }
    options.setLastMove(null);
  }

  function selectAnalysisPositionByPly(ply: number) {
    const selection = getAnalysisMoveSelectionForPly(options.moves, ply);
    if (selection) {
      selectAnalysisPosition(selection.position, selection.san, selection.ply);
    }
  }

  function animateAnalysisNavigationMove(
    moveFrom: string,
    moveTo: string,
    sourcePosition: string,
    targetPosition: string,
    reverse: boolean,
  ) {
    options.setPieces((previousPieces) => {
      if (!piecesMatchPosition(previousPieces, sourcePosition)) {
        console.warn("[analysis-navigation] board/source mismatch; snapping to target position", {
          currentPly: state.analysisSelectedPlyRef.current,
          moveFrom,
          moveTo,
          reverse,
        });
      }
      return transitionBoardPosition(previousPieces, {
        moveFrom,
        moveTo,
        sourcePosition,
        targetPosition,
        reverse,
      });
    });
  }

  function navigateAnalysisPositionByKeyboard(targetPly: number) {
    const currentPly = state.analysisSelectedPlyRef.current;
    if (
      currentPly == null
      || Math.abs(targetPly - currentPly) !== 1
      || state.analysisVariationMovesRef.current.length > 0
    ) {
      selectAnalysisPositionByPly(targetPly);
      return;
    }

    const sourceSelection = getAnalysisMoveSelectionForPly(options.moves, currentPly);
    const targetSelection = getAnalysisMoveSelectionForPly(options.moves, targetPly);
    if (
      !sourceSelection?.position
      || sourceSelection.position.length !== 64
      || !targetSelection?.position
      || targetSelection.position.length !== 64
    ) {
      selectAnalysisPositionByPly(targetPly);
      return;
    }

    const reverse = targetPly < currentPly;
    const moveSelection = reverse ? sourceSelection : targetSelection;
    const uci = moveSelection.uci;
    if (!uci || uci.length < 4) {
      console.warn(
        "[navigateAnalysisPositionByKeyboard] missing UCI move for ply",
        reverse ? currentPly : targetPly,
      );
      selectAnalysisPosition(targetSelection.position, targetSelection.san, targetSelection.ply);
      return;
    }

    animateAnalysisNavigationMove(
      uci.substring(0, 2),
      uci.substring(2, 4),
      sourceSelection.position,
      targetSelection.position,
      reverse,
    );
    selectAnalysisPosition(
      targetSelection.position,
      targetSelection.san,
      targetSelection.ply,
      { updateBoard: false },
    );
  }

  useEffect(() => {
    function handleAnalysisArrowNavigation(event: KeyboardEvent) {
      if (
        !state.analysisReplayActive
        || !state.analysisReplayFinished
        || state.analysisTotalPlies <= 0
        || state.showAnalysisSettingsDialog
        || options.showGameSettingsDialog
        || options.showEngineConfig
        || options.showEngineManager
        || options.showChessDatabaseDialog
        || options.promotionContext
      ) return;
      if ((event.key !== "ArrowLeft" && event.key !== "ArrowRight") || event.repeat) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable)
      ) return;

      const currentPly = state.analysisSelectedPlyRef.current
        ?? (event.key === "ArrowRight" ? 0 : state.analysisTotalPlies + 1);
      const nextPly = currentPly + (event.key === "ArrowRight" ? 1 : -1);
      if (nextPly < 1 || nextPly > state.analysisTotalPlies) return;
      event.preventDefault();
      navigateAnalysisPositionByKeyboard(nextPly);
    }

    window.addEventListener("keydown", handleAnalysisArrowNavigation);
    return () => window.removeEventListener("keydown", handleAnalysisArrowNavigation);
  }, [
    state.analysisReplayActive,
    state.analysisReplayFinished,
    state.analysisSelectedPosition?.ply,
    state.analysisTotalPlies,
    state.showAnalysisSettingsDialog,
    options.showGameSettingsDialog,
    options.showEngineConfig,
    options.showEngineManager,
    options.showChessDatabaseDialog,
    options.promotionContext,
    options.moves,
  ]);

  return { selectAnalysisPosition, selectAnalysisPositionByPly };
}
