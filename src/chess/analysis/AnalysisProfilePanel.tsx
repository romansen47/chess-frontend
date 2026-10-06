import { useI18n } from "../../i18n/I18nProvider";
import EvaluationHistoryChart from "../evaluation/EvaluationHistoryChart";
import { getAnalysisMoveSelectionForPly } from "./analysisSelectionUtils";
import type {
  AnalysisReplayContentActions,
  AnalysisReplayContentState,
} from "./analysisReplayViewTypes";

interface AnalysisProfilePanelProps {
  state: AnalysisReplayContentState;
  actions: AnalysisReplayContentActions;
}

export default function AnalysisProfilePanel({
  state,
  actions,
}: AnalysisProfilePanelProps) {
  const { t } = useI18n();
  const {
    analysisProfile,
    analysisTotalPlies,
    analysisSelectedPosition,
    analysisReplayStatus,
    isAnalysisReplayRunning,
    analysisReplayError,
    analysisEvaluationError,
    moves,
  } = state;

  const points = analysisProfile.map((point) => ({
    ply: point.ply,
    evaluation: point.evaluation,
    depth: point.depth,
    label: point.san,
  }));

  return (
    <EvaluationHistoryChart
      title={t("analysis.history")}
      points={points}
      totalPlies={analysisTotalPlies}
      selectedPly={analysisSelectedPosition?.ply ?? null}
      fillMissingWithZero
      resetScale={isAnalysisReplayRunning}
      isPlySelectable={(ply) =>
        Boolean(getAnalysisMoveSelectionForPly(moves, ply)?.position)}
      onSelectPly={actions.selectPositionByPly}
      status={analysisReplayStatus ?? t("analysis.mode")}
      action={isAnalysisReplayRunning
        ? (
            <button
              className="analysis-cancel-button"
              onClick={() => void actions.cancelAnalysisReplay()}
            >
              Cancel
            </button>
          )
        : undefined}
      errors={
        <>
          {analysisReplayError && (
            <div className="analysis-profile-error">
              {analysisReplayError}
            </div>
          )}
          {analysisEvaluationError && (
            <div className="analysis-profile-error">
              {analysisEvaluationError}
            </div>
          )}
        </>
      }
      ariaLabel="Evaluation history of the analyzed game"
    />
  );
}
