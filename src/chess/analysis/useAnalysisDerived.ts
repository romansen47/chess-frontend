import { useMemo } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { buildSelectedBoardAnnotations } from "./analysisBoardAnnotations";
import { buildMoveAnnotations } from "./moveAnnotations";
import { useMoveAnnotationTooltip } from "./useMoveAnnotationTooltip";
import type { UseAnalysisControllerOptions } from "./analysisControllerTypes";
import type { AnalysisState } from "./useAnalysisState";

export function useAnalysisDerived(state: AnalysisState, options: UseAnalysisControllerOptions) {
  const { t } = useI18n();
  const getMoveAnnotationTooltip = useMoveAnnotationTooltip();

  const analysisEngineProfiles = useMemo(
    () => options.engineConfigOverview?.profiles ?? [],
    [options.engineConfigOverview],
  );
  const selectedAnalysisProfile = useMemo(
    () => analysisEngineProfiles.find((profile) => profile.id === state.analysisSettings.engineProfileId) ?? null,
    [analysisEngineProfiles, state.analysisSettings.engineProfileId],
  );
  const selectedAnalysisEngine = useMemo(
    () => (options.engineConfigOverview?.engines ?? []).find(
      (engine) => engine.id === selectedAnalysisProfile?.engineId,
    ) ?? null,
    [options.engineConfigOverview, selectedAnalysisProfile?.engineId],
  );
  const moveAnnotations = useMemo(
    () => buildMoveAnnotations(state.analysisProfile),
    [state.analysisProfile],
  );
  const selectedBoardAnnotations = useMemo(
    () => buildSelectedBoardAnnotations({
      analysisReplayActive: state.analysisReplayActive,
      analysisReplayFinished: state.analysisReplayFinished,
      analysisSelectedPosition: state.analysisSelectedPosition,
      analysisProfile: state.analysisProfile,
      analysisVariationMoves: state.analysisVariationMoves,
      analysisEvaluationEnabled: state.analysisEvaluationEnabled,
      analysisEvaluation: state.analysisEvaluation,
      moveAnnotations,
      gameAnnotations: state.gameAnnotations,
      savedAnnotationLabel: t("annotations.savedAnnotation"),
      getMoveAnnotationTooltip,
    }),
    [
      state.analysisReplayActive,
      state.analysisReplayFinished,
      state.analysisSelectedPosition,
      state.analysisProfile,
      state.analysisVariationMoves,
      state.analysisEvaluationEnabled,
      state.analysisEvaluation,
      moveAnnotations,
      state.gameAnnotations,
      getMoveAnnotationTooltip,
      t,
    ],
  );

  return {
    analysisEngineProfiles,
    selectedAnalysisProfile,
    selectedAnalysisEngine,
    moveAnnotations,
    selectedBoardAnnotations,
  };
}
