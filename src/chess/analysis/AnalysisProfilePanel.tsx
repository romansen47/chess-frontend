import { useI18n } from "../../i18n/I18nProvider";
import type { AnalysisProfilePoint } from "../types";
import { formatEngineScore } from "../engine/engineEvaluationUtils";
import { getAnalysisMoveSelectionForPly } from "./analysisSelectionUtils";
import type { AnalysisReplayContentActions, AnalysisReplayContentState } from "./analysisReplayViewTypes";

interface AnalysisProfilePanelProps {
  state: AnalysisReplayContentState;
  actions: AnalysisReplayContentActions;
}

export default function AnalysisProfilePanel({ state, actions }: AnalysisProfilePanelProps) {
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

  const width = 860;
  const height = 560;
  const paddingX = 12;
  const paddingY = 18;
  const maxAbsEval = 5;
  const points = analysisProfile.length > 0
    ? analysisProfile
    : [{
        ply: 0,
        from: null,
        to: null,
        san: "Start",
        evaluation: 0,
        bar: 0.5,
        depth: 0,
      }];
  const analyzedPoints = points.filter((point) => point.ply > 0);
  const analyzedPointMap = new Map<number, AnalysisProfilePoint>(
    analyzedPoints.map((point) => [point.ply, point]),
  );
  const totalPly = Math.max(
    1,
    analysisTotalPlies,
    analyzedPoints[analyzedPoints.length - 1]?.ply ?? 0,
  );
  const toY = (evaluation: number) => {
    const clamped = Math.max(-maxAbsEval, Math.min(maxAbsEval, evaluation));
    const normalized = (maxAbsEval - clamped) / (maxAbsEval * 2);
    return paddingY + normalized * (height - paddingY * 2);
  };
  const zeroY = toY(0);
  const latest = analyzedPoints[analyzedPoints.length - 1] ?? points[points.length - 1];
  const slotWidth = (width - paddingX * 2) / totalPly;
  const chartPoints = Array.from(
    { length: totalPly },
    (_, index) => analyzedPointMap.get(index + 1) ?? {
      ply: index + 1,
      from: null,
      to: null,
      san: null,
      evaluation: 0,
      bar: 0.5,
      depth: 0,
    },
  );
  const formatEvaluation = (point: AnalysisProfilePoint) => {
    const san = point.san ? `${point.san} · ` : "";
    const depth = point.depth ? ` · depth ${point.depth}` : "";
    return `Ply ${point.ply} · ${san}${formatEngineScore(point.evaluation)}${depth}`;
  };

  return (
    <div className="analysis-profile-panel">
      <div className="analysis-profile-header">
        <strong>{t("analysis.history")}</strong>
        <span>
          {latest?.ply ?? 0} plies · {formatEngineScore(latest?.evaluation ?? 0)}
          {latest?.depth ? ` · depth ${latest.depth}` : ""}
        </span>
      </div>
      <svg
        className="analysis-profile-chart"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Evaluation history of the analyzed game"
      >
        <line className="analysis-profile-zero-line" x1={paddingX} y1={zeroY} x2={width - paddingX} y2={zeroY} />
        {chartPoints.map((point) => {
          const x = paddingX + (point.ply - 1) * slotWidth;
          const y = toY(point.evaluation);
          const top = Math.min(y, zeroY);
          const barHeight = Math.max(1.5, Math.abs(zeroY - y));
          const isPositive = point.evaluation > 0;
          const isLatest = point.ply === latest?.ply;
          const isSelected = point.ply === analysisSelectedPosition?.ply;
          const hasMoveSelection = Boolean(getAnalysisMoveSelectionForPly(moves, point.ply)?.position);

          return (
            <rect
              key={point.ply}
              className={`analysis-profile-bar ${isPositive ? "analysis-profile-bar-positive" : "analysis-profile-bar-negative"}${isLatest ? " analysis-profile-bar-latest" : ""}${isSelected ? " analysis-profile-bar-selected" : ""}${hasMoveSelection ? " analysis-profile-bar-clickable" : ""}`}
              x={x}
              y={top}
              width={slotWidth}
              height={barHeight}
              rx={0}
              role={hasMoveSelection ? "button" : undefined}
              tabIndex={hasMoveSelection ? 0 : undefined}
              onClick={hasMoveSelection ? () => actions.selectPositionByPly(point.ply) : undefined}
              onKeyDown={hasMoveSelection ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  actions.selectPositionByPly(point.ply);
                }
              } : undefined}
            >
              <title>{formatEvaluation(point)}</title>
            </rect>
          );
        })}
      </svg>
      <div className="analysis-profile-footer">
        <span>{analysisReplayStatus ?? t("analysis.mode")}</span>
        {isAnalysisReplayRunning && (
          <button className="analysis-cancel-button" onClick={() => void actions.cancelAnalysisReplay()}>
            Cancel
          </button>
        )}
      </div>
      {analysisReplayError && <div className="analysis-profile-error">{analysisReplayError}</div>}
      {analysisEvaluationError && <div className="analysis-profile-error">{analysisEvaluationError}</div>}
    </div>
  );
}
