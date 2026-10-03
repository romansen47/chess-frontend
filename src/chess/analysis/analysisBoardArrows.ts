import type {
  AnalysisProfilePoint,
  EngineEvaluation,
  LastMove,
} from "../types";
import {
  createEvaluationArrow,
  createMoveArrow,
  type BoardArrowSpec,
} from "../board/boardArrows";

interface AnalysisBoardArrowOptions {
  analysisReplayActive: boolean;
  selectedPly: number | null | undefined;
  analysisProfile: AnalysisProfilePoint[];
  variationMoveCount: number;
  lastMove: LastMove | null;
  liveEvaluationEnabled: boolean;
  liveEvaluation: EngineEvaluation | null;
}

export function buildAnalysisBoardArrows({
  analysisReplayActive,
  selectedPly,
  analysisProfile,
  variationMoveCount,
  lastMove,
  liveEvaluationEnabled,
  liveEvaluation,
}: AnalysisBoardArrowOptions): BoardArrowSpec[] {
  if (!analysisReplayActive) return [];

  const selectedPoint = selectedPly == null
    ? null
    : analysisProfile.find((point) => point.ply === selectedPly) ?? null;

  const playedMove = variationMoveCount > 0
    ? lastMove
    : selectedPoint?.from && selectedPoint?.to
      ? { from: selectedPoint.from, to: selectedPoint.to }
      : null;

  const result: BoardArrowSpec[] = [];
  const moveArrow = createMoveArrow(playedMove);
  if (moveArrow) result.push(moveArrow);

  const liveLines = liveEvaluationEnabled
    && (liveEvaluation?.lines.length ?? 0) > 0
      ? liveEvaluation?.lines ?? []
      : null;

  /*
   * Deep-analysis lines only describe the original selected position. Once
   * the user enters a temporary variation, showing those arrows would point
   * to moves from the wrong position, so only live lines are valid there.
   */
  const deepLines = variationMoveCount === 0
    ? selectedPoint?.lines ?? []
    : [];

  const engineLines = liveLines ?? deepLines;
  engineLines.slice(0, 3).forEach((line, rank) => {
    const arrow = createEvaluationArrow(line.moveArrows?.[0], rank);
    if (arrow) result.push(arrow);
  });

  return result;
}
