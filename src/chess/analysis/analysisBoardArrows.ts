import type {
  AnalysisProfilePoint,
  BoardArrowMove,
  EngineEvaluation,
  LastMove,
} from "../types";
import {
  createEvaluationArrow,
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
  showEvaluationArrows: boolean;
}

function resolvePlayedMove({
  analysisReplayActive,
  selectedPly,
  analysisProfile,
  variationMoveCount,
  lastMove,
}: AnalysisBoardArrowOptions): BoardArrowMove | null {
  if (!analysisReplayActive) return null;

  if (variationMoveCount > 0) {
    return lastMove?.from && lastMove?.to
      ? { from: lastMove.from, to: lastMove.to }
      : null;
  }

  if (selectedPly == null) return null;
  const selectedPoint = analysisProfile.find((point) => point.ply === selectedPly);
  return selectedPoint?.from && selectedPoint?.to
    ? { from: selectedPoint.from, to: selectedPoint.to }
    : null;
}

export function buildAnalysisMoveHighlightSquares(
  options: AnalysisBoardArrowOptions,
): string[] {
  const move = resolvePlayedMove(options);
  return move ? [move.from, move.to] : [];
}

export function buildAnalysisBoardArrows(
  options: AnalysisBoardArrowOptions,
): BoardArrowSpec[] {
  if (!options.analysisReplayActive || !options.showEvaluationArrows) return [];

  const selectedPoint = options.selectedPly == null
    ? null
    : options.analysisProfile.find((point) => point.ply === options.selectedPly) ?? null;

  const liveLines = options.liveEvaluationEnabled
    && (options.liveEvaluation?.lines.length ?? 0) > 0
      ? options.liveEvaluation?.lines ?? []
      : null;

  const deepLines = options.variationMoveCount === 0
    ? selectedPoint?.lines ?? []
    : [];

  const result: BoardArrowSpec[] = [];
  const engineLines = liveLines ?? deepLines;
  engineLines.slice(0, 3).forEach((line, rank) => {
    const arrow = createEvaluationArrow(line.moveArrows?.[0], rank);
    if (arrow) result.push(arrow);
  });
  return result;
}
