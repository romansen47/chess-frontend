import { useCallback, useEffect, useRef } from "react";
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
  const annotationRevisionRef = useRef(0);
  const failedRevisionRef = useRef<number | null>(null);
  const gameAnnotationsRef = useRef(state.gameAnnotations);
  const annotationsDirtyRef = useRef(state.annotationsDirty);
  const annotationsSavingRef = useRef(state.annotationsSaving);
  const {
    setGameAnnotations,
    setAnnotationsDirty,
    setAnnotationSaveError,
    setAnnotationsSaving,
  } = state;

  gameAnnotationsRef.current = state.gameAnnotations;
  annotationsDirtyRef.current = state.annotationsDirty;
  annotationsSavingRef.current = state.annotationsSaving;

  function resetAnnotations() {
    annotationRevisionRef.current += 1;
    failedRevisionRef.current = null;
    gameAnnotationsRef.current = {};
    annotationsDirtyRef.current = false;
    state.setGameAnnotations({});
    state.setAnnotationsDirty(false);
    state.setAnnotationSaveError(null);
  }

  function updateGameAnnotation(annotation: GameAnnotation) {
    annotationRevisionRef.current += 1;
    failedRevisionRef.current = null;
    annotationsDirtyRef.current = true;
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

  const persistGameAnnotations = useCallback(async () => {
    if (annotationsSavingRef.current || !annotationsDirtyRef.current) return;

    const revision = annotationRevisionRef.current;
    const annotations = (Object.values(gameAnnotationsRef.current) as GameAnnotation[])
      .filter((annotation) => !isEmptyGameAnnotation(annotation))
      .sort((left, right) => left.ply - right.ply);

    annotationsSavingRef.current = true;
    setAnnotationsSaving(true);
    setAnnotationSaveError(null);
    try {
      const saved = await saveGameAnnotations(
        annotations,
        options.whiteComputerEnabled,
        options.blackComputerEnabled,
      );
      if (annotationRevisionRef.current === revision) {
        const savedRecord = gameAnnotationRecord(saved);
        gameAnnotationsRef.current = savedRecord;
        annotationsDirtyRef.current = false;
        setGameAnnotations(savedRecord);
        setAnnotationsDirty(false);
      }
    } catch (error) {
      console.error("[persistGameAnnotations] error", error);
      failedRevisionRef.current = revision;
      setAnnotationSaveError(
        error instanceof Error ? error.message : t("annotations.saveFailed"),
      );
    } finally {
      annotationsSavingRef.current = false;
      setAnnotationsSaving(false);
    }
  }, [
    options.whiteComputerEnabled,
    options.blackComputerEnabled,
    setAnnotationSaveError,
    setAnnotationsDirty,
    setAnnotationsSaving,
    setGameAnnotations,
    t,
  ]);

  useEffect(() => {
    if (
      !state.annotationsDirty
      || state.annotationsSaving
      || failedRevisionRef.current === annotationRevisionRef.current
    ) return;

    const timeout = window.setTimeout(() => {
      void persistGameAnnotations();
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [
    state.annotationsDirty,
    state.annotationsSaving,
    state.gameAnnotations,
    persistGameAnnotations,
  ]);

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
    const restored = gameAnnotationRecord(annotations);
    annotationRevisionRef.current += 1;
    failedRevisionRef.current = null;
    gameAnnotationsRef.current = restored;
    annotationsDirtyRef.current = false;
    state.setGameAnnotations(restored);
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
