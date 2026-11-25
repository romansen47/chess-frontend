import type { AnalysisPositionComparison } from "../types";

interface AnalysisComparisonChartProps {
  positions: readonly AnalysisPositionComparison[];
  selectedPly: number | null;
  onSelectPly: (ply: number) => void;
}

const WIDTH = 900;
const HEIGHT = 210;
const PAD = 14;

export default function AnalysisComparisonChart({
  positions,
  selectedPly,
  onSelectPly,
}: AnalysisComparisonChartProps) {
  const maxPly = Math.max(1, ...positions.map((position) => position.ply));
  const evaluations = positions.flatMap((position) => [
    Math.abs(position.left.evaluation),
    Math.abs(position.right.evaluation),
  ]).filter((value) => value < 99);
  const maxAbs = Math.max(5, Math.min(100, ...evaluations));
  const x = (ply: number) => PAD + (ply / maxPly) * (WIDTH - PAD * 2);
  const y = (evaluation: number) => {
    const clamped = Math.max(-maxAbs, Math.min(maxAbs, evaluation));
    return PAD + ((maxAbs - clamped) / (maxAbs * 2)) * (HEIGHT - PAD * 2);
  };
  const path = (side: "left" | "right") => positions
    .map((position, index) => `${index === 0 ? "M" : "L"}${x(position.ply)},${y(position[side].evaluation)}`)
    .join(" ");

  return (
    <svg
      className="analysis-comparison-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-label="Compared evaluation histories"
    >
      <line className="analysis-comparison-zero" x1={PAD} x2={WIDTH - PAD} y1={y(0)} y2={y(0)} />
      <path className="analysis-comparison-line analysis-comparison-line-left" d={path("left")} />
      <path className="analysis-comparison-line analysis-comparison-line-right" d={path("right")} />
      {positions.map((position) => (
        <circle
          key={position.ply}
          className={position.ply === selectedPly ? "analysis-comparison-marker selected" : "analysis-comparison-marker"}
          cx={x(position.ply)}
          cy={y(position.left.evaluation)}
          r={position.ply === selectedPly ? 5 : 3}
          onClick={() => onSelectPly(position.ply)}
        >
          <title>{`Ply ${position.ply}`}</title>
        </circle>
      ))}
    </svg>
  );
}
