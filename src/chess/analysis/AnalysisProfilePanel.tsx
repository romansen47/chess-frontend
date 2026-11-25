import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { fetchGameAnalysisRuns } from "../api/analysisApi";
import type { GameAnalysisRunSummary } from "../types";
import EvaluationHistoryChart from "../evaluation/EvaluationHistoryChart";
import AnalysisComparisonDialog from "./AnalysisComparisonDialog";
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
  const [runs, setRuns] = useState<GameAnalysisRunSummary[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const {
    analysisProfile,
    analysisTotalPlies,
    analysisSelectedPosition,
    analysisReplayStatus,
    isAnalysisReplayRunning,
    analysisReplayError,
    analysisEvaluationError,
    moves,
    engineEval,
    analysisReplayFinished,
  } = state;

  const refreshRuns = useCallback(() => {
    void fetchGameAnalysisRuns()
      .then(setRuns)
      .catch(() => setRuns([]));
  }, []);

  useEffect(() => {
    if (!isAnalysisReplayRunning) refreshRuns();
  }, [analysisReplayFinished, isAnalysisReplayRunning, refreshRuns]);

  const points = analysisProfile.map((point) => ({
    ply: point.ply,
    evaluation: point.evaluation,
    depth: point.depth,
    label: point.san,
  }));

  return (
    <>
      <EvaluationHistoryChart
      title={t("analysis.history")}
      subtitle={engineEval?.engineName ?? undefined}
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
        : runs.length >= 2
          ? (
              <button
                className="analysis-cancel-button"
                onClick={() => setShowComparison(true)}
              >
                {t("analysis.compareRuns")}
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
      {showComparison && (
        <AnalysisComparisonDialog
          runs={runs}
          onClose={() => setShowComparison(false)}
          onSelectPly={actions.selectPositionByPly}
          onRunsChanged={refreshRuns}
        />
      )}
    </>
  );
}
