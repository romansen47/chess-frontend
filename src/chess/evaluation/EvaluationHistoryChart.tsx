import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  type WheelEvent,
} from "react";
import { formatEngineScore } from "../engine/engineEvaluationUtils";
import {
  ANALYSIS_PROFILE_MIN_MAX_ABS_EVAL,
  adjustAnalysisProfileScale,
} from "../analysis/analysisProfileScale";

export interface EvaluationHistoryPoint {
  ply: number;
  evaluation: number;
  depth?: number | null;
  label?: string | null;
}

interface EvaluationHistoryChartProps {
  title: ReactNode;
  points: readonly EvaluationHistoryPoint[];
  totalPlies: number;
  minimumVisiblePlies?: number;
  selectedPly?: number | null;
  fillMissingWithZero?: boolean;
  resetScale?: boolean;
  isPlySelectable?: (ply: number) => boolean;
  onSelectPly?: (ply: number) => void;
  status?: ReactNode;
  action?: ReactNode;
  errors?: ReactNode;
  ariaLabel: string;
  className?: string;
}

const WIDTH = 860;
const HEIGHT = 560;
const PADDING_X = 12;
const PADDING_Y = 18;

export default function EvaluationHistoryChart({
  title,
  points,
  totalPlies,
  minimumVisiblePlies = 1,
  selectedPly = null,
  fillMissingWithZero = false,
  resetScale = false,
  isPlySelectable,
  onSelectPly,
  status,
  action,
  errors,
  ariaLabel,
  className,
}: EvaluationHistoryChartProps) {
  const [maxAbsEval, setMaxAbsEval] = useState(
    ANALYSIS_PROFILE_MIN_MAX_ABS_EVAL,
  );

  useEffect(() => {
    if (resetScale) {
      setMaxAbsEval(ANALYSIS_PROFILE_MIN_MAX_ABS_EVAL);
    }
  }, [resetScale]);

  const positivePlyPoints = useMemo(
    () => points
      .filter((point) => point.ply > 0)
      .sort((left, right) => left.ply - right.ply),
    [points],
  );
  const latest = points.length > 0
    ? [...points].sort((left, right) => left.ply - right.ply).at(-1) ?? null
    : null;
  const lastRecordedPly =
    positivePlyPoints[positivePlyPoints.length - 1]?.ply ?? 0;
  const visiblePlies = Math.max(
    1,
    minimumVisiblePlies,
    totalPlies,
    lastRecordedPly,
  );
  const pointMap = new Map(
    positivePlyPoints.map((point) => [point.ply, point]),
  );
  const visiblePoints = fillMissingWithZero
    ? Array.from({ length: visiblePlies }, (_, index) =>
        pointMap.get(index + 1) ?? {
          ply: index + 1,
          evaluation: 0,
          depth: 0,
          label: null,
        })
    : positivePlyPoints;

  const toY = (evaluation: number) => {
    const clamped = Math.max(-maxAbsEval, Math.min(maxAbsEval, evaluation));
    const normalized = (maxAbsEval - clamped) / (maxAbsEval * 2);
    return PADDING_Y + normalized * (HEIGHT - PADDING_Y * 2);
  };
  const zeroY = toY(0);
  const slotWidth = (WIDTH - PADDING_X * 2) / visiblePlies;

  function handleVerticalZoom(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    setMaxAbsEval((current) =>
      adjustAnalysisProfileScale(current, event.deltaY)
    );
  }

  function handleKeyDown(
    event: KeyboardEvent<SVGRectElement>,
    ply: number,
  ) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelectPly?.(ply);
  }

  return (
    <div className={[
      "analysis-profile-panel",
      className ?? "",
    ].filter(Boolean).join(" ")}>
      <div className="analysis-profile-header">
        <strong>{title}</strong>
        <span>
          {latest
            ? <>
                {latest.ply} plies · {formatEngineScore(latest.evaluation)}
                {latest.depth ? ` · depth ${latest.depth}` : ""}
              </>
            : <>0 plies · {formatEngineScore(0)}</>}
          {` · ±${maxAbsEval}`}
        </span>
      </div>

      <svg
        className="analysis-profile-chart"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${ariaLabel}, vertical scale ±${maxAbsEval}`}
        onWheel={handleVerticalZoom}
      >
        <line
          className="analysis-profile-zero-line"
          x1={PADDING_X}
          y1={zeroY}
          x2={WIDTH - PADDING_X}
          y2={zeroY}
        />
        {visiblePoints.map((point) => {
          const x = PADDING_X + (point.ply - 1) * slotWidth;
          const y = toY(point.evaluation);
          const top = Math.min(y, zeroY);
          const barHeight = Math.max(1.5, Math.abs(zeroY - y));
          const selectable = Boolean(
            onSelectPly && (isPlySelectable?.(point.ply) ?? true),
          );

          return (
            <rect
              key={point.ply}
              className={[
                "analysis-profile-bar",
                point.evaluation > 0
                  ? "analysis-profile-bar-positive"
                  : "analysis-profile-bar-negative",
                point.ply === latest?.ply
                  ? "analysis-profile-bar-latest"
                  : "",
                point.ply === selectedPly
                  ? "analysis-profile-bar-selected"
                  : "",
                selectable
                  ? "analysis-profile-bar-clickable"
                  : "",
              ].filter(Boolean).join(" ")}
              x={x}
              y={top}
              width={slotWidth}
              height={barHeight}
              rx={0}
              role={selectable ? "button" : undefined}
              tabIndex={selectable ? 0 : undefined}
              onClick={selectable
                ? () => onSelectPly?.(point.ply)
                : undefined}
              onKeyDown={selectable
                ? (event) => handleKeyDown(event, point.ply)
                : undefined}
            >
              <title>
                {point.label
                  ? `Ply ${point.ply} · ${point.label} · ${formatEngineScore(point.evaluation)}${point.depth ? ` · depth ${point.depth}` : ""}`
                  : `Ply ${point.ply} · ${formatEngineScore(point.evaluation)}${point.depth ? ` · depth ${point.depth}` : ""}`}
              </title>
            </rect>
          );
        })}
      </svg>

      {(status !== undefined || action !== undefined) && (
        <div className="analysis-profile-footer">
          <span>{status}</span>
          {action}
        </div>
      )}
      {errors}
    </div>
  );
}
