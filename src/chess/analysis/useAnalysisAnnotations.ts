import { useEffect } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { saveGameAnnotations } from "../api/gameApi";
import { getAnalysisBlackPlayerName, getAnalysisWhitePlayerName } from "../game/gameFormatters";
import type { GameAnnotation } from "../types";
import type { UseAnalysisControllerOptions } from "./analysisControllerTypes";
import { buildDiagnosticAnalysisPgn } from "./analysisPgnExport";
import { gameAnnotationRecord, isEmptyGameAnnotation } from "./annotationUtils";
import type { AnalysisState } from "./useAnalysisState";

export function useAnalysisAnnotations(state: AnalysisState, options: UseAnalysisControllerOptions) {
  const { t } = useI18n();

  function resetAnnotations() {
    state.setGameAnnotations({});
    state.setAnnotationsDirty(false);
    state.setAnnotationSaveError(null);
  }

  function updateGameAnnotation(annotation: GameAnnotation) {
    state.setGameAnnotations((previous) => {
      const next = { ...previous };
      if (isEmptyGameAnnotation(annotation)) {
        delete next[annotation.ply];
      } else {
        next[annotation.ply] = {
          ...annotation,
          variations: [...(annotation.variations ?? [])],
        };
      }
      return next;
    });
    state.setAnnotationsDirty(true);
    state.setAnnotationSaveError(null);
  }

  async function persistGameAnnotations() {
    if (!state.annotationsDirty || state.annotationsSaving) return;
    state.setAnnotationsSaving(true);
    state.setAnnotationSaveError(null);
    try {
      const annotations = (Object.values(state.gameAnnotations) as GameAnnotation[])
        .filter((annotation) => !isEmptyGameAnnotation(annotation))
        .sort((left, right) => left.ply - right.ply);
      const saved = await saveGameAnnotations(
        annotations,
        options.whiteComputerEnabled,
        options.blackComputerEnabled,
      );
      state.setGameAnnotations(gameAnnotationRecord(saved));
      state.setAnnotationsDirty(false);
    } catch (error) {
      console.error("[persistGameAnnotations] error", error);
      state.setAnnotationSaveError(
        error instanceof Error ? error.message : t("annotations.saveFailed"),
      );
    } finally {
      state.setAnnotationsSaving(false);
    }
  }

  function saveAnalysisPgn() {
    try {
      options.setLoadError(null);
      const diagnosticPgn = buildDiagnosticAnalysisPgn({
        profile: state.analysisProfile,
        whitePlayerName: getAnalysisWhitePlayerName(options.clock, state.analysisWhitePlayerName),
        blackPlayerName: getAnalysisBlackPlayerName(options.clock, state.analysisBlackPlayerName),
        engineName: options.engineEval?.engineName ?? null,
      });
      const blob = new Blob([diagnosticPgn], { type: "application/x-chess-pgn;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "analysis-diagnostic.pgn";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[saveAnalysisPgn] error", error);
      options.setLoadError(t("analysis.exportPgnFailed"));
    }
  }

  function restoreAnnotations(annotations: GameAnnotation[] | null | undefined) {
    state.setGameAnnotations(gameAnnotationRecord(annotations));
    state.setAnnotationsDirty(false);
    state.setAnnotationSaveError(null);
  }

  function setImportedPlayers(
    whitePlayerName: string | null | undefined,
    blackPlayerName: string | null | undefined,
    totalPlies: number,
  ) {
    state.setAnalysisWhitePlayerName(whitePlayerName || "White");
    state.setAnalysisBlackPlayerName(blackPlayerName || "Black");
    state.setAnalysisTotalPlies(Math.max(0, totalPlies));
  }

  useEffect(() => {
    if (
      !state.analysisReplayActive
      || !state.analysisReplayFinished
      || !state.analysisEvaluationEnabled
      || !state.analysisSelectedPosition
      || state.analysisVariationMoves.length > 0
      || !state.analysisEvaluation?.moveAnnotationReady
    ) return;

    const ply = state.analysisSelectedPosition.ply;
    const liveAnnotation = state.analysisEvaluation.moveAnnotation ?? null;
    state.setAnalysisProfile((previous) => {
      let changed = false;
      const next = previous.map((point) => {
        if (point.ply !== ply) return point;
        const current = point.annotation ?? null;
        const sameAnnotation = current === liveAnnotation || (
          current !== null
          && liveAnnotation !== null
          && current.symbol === liveAnnotation.symbol
          && current.kind === liveAnnotation.kind
          && current.winChanceLoss === liveAnnotation.winChanceLoss
          && current.bestEvaluation === liveAnnotation.bestEvaluation
          && current.secondBestEvaluation === liveAnnotation.secondBestEvaluation
          && current.extraordinaryReason === liveAnnotation.extraordinaryReason
          && current.materialInvestment === liveAnnotation.materialInvestment
          && current.sacrificeType === liveAnnotation.sacrificeType
          && current.shortTermMaterialCompensated === liveAnnotation.shortTermMaterialCompensated
          && current.materialCompensationPlies === liveAnnotation.materialCompensationPlies
          && current.forcedMateDistance === liveAnnotation.forcedMateDistance
          && current.earlyDepth === liveAnnotation.earlyDepth
          && current.earlyRank === liveAnnotation.earlyRank
          && current.finalDepth === liveAnnotation.finalDepth
          && current.finalRank === liveAnnotation.finalRank
          && current.givesCheck === liveAnnotation.givesCheck
          && current.earlyRegret === liveAnnotation.earlyRegret
          && current.earlyStrength === liveAnnotation.earlyStrength
          && current.finalStrength === liveAnnotation.finalStrength
        );
        if (sameAnnotation) return point;
        changed = true;
        return { ...point, annotation: liveAnnotation };
      });
      return changed ? next : previous;
    });
  }, [
    state.analysisReplayActive,
    state.analysisReplayFinished,
    state.analysisEvaluationEnabled,
    state.analysisSelectedPosition,
    state.analysisVariationMoves.length,
    state.analysisEvaluation,
  ]);

  return {
    resetAnnotations,
    updateGameAnnotation,
    persistGameAnnotations,
    saveAnalysisPgn,
    restoreAnnotations,
    setImportedPlayers,
  };
}
