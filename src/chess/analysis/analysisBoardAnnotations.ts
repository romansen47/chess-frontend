import type {
  AnalysisPositionSelection,
  AnalysisProfilePoint,
  EngineEvaluation,
  GameAnnotation,
  MoveAnnotation,
} from "../types";
import type { BoardAnnotation } from "../board/Board";
import { isMoveAnnotationVisible } from "./moveAnnotations";

interface BuildSelectedBoardAnnotationsOptions {
  analysisReplayActive: boolean;
  analysisReplayFinished: boolean;
  analysisSelectedPosition: AnalysisPositionSelection | null;
  analysisProfile: AnalysisProfilePoint[];
  analysisVariationMoves: string[];
  analysisEvaluationEnabled: boolean;
  analysisEvaluation: EngineEvaluation | null;
  moveAnnotations: Record<number, MoveAnnotation>;
  gameAnnotations: Record<number, GameAnnotation>;
  savedAnnotationLabel: string;
  getMoveAnnotationTooltip: (annotation: MoveAnnotation) => string;
  debugMode: boolean;
}

export function buildSelectedBoardAnnotations({
  analysisReplayActive,
  analysisReplayFinished,
  analysisSelectedPosition,
  analysisProfile,
  analysisVariationMoves,
  analysisEvaluationEnabled,
  analysisEvaluation,
  moveAnnotations,
  gameAnnotations,
  savedAnnotationLabel,
  getMoveAnnotationTooltip,
  debugMode,
}: BuildSelectedBoardAnnotationsOptions): BoardAnnotation[] {
  if (!analysisReplayActive || !analysisReplayFinished || !analysisSelectedPosition) {
    return [];
  }

  if (analysisVariationMoves.length > 0) {
    if (
      !analysisEvaluationEnabled
      || !analysisEvaluation?.moveAnnotationReady
      || !analysisEvaluation.moveAnnotation
    ) {
      return [];
    }

    if (!isMoveAnnotationVisible(analysisEvaluation.moveAnnotation, debugMode)) {
      return [];
    }

    const latestVariationMove = analysisVariationMoves[analysisVariationMoves.length - 1];
    const destination = latestVariationMove?.substring(2, 4);
    if (!destination || destination.length !== 2) return [];

    return [{
      square: destination,
      symbol: analysisEvaluation.moveAnnotation.symbol,
      kind: analysisEvaluation.moveAnnotation.kind,
      tooltip: getMoveAnnotationTooltip(analysisEvaluation.moveAnnotation),
    }];
  }

  const point = analysisProfile.find(
    (candidate) => candidate.ply === analysisSelectedPosition.ply
  );
  if (!point?.to) return [];

  const annotations: BoardAnnotation[] = [];
  const savedNag = gameAnnotations[analysisSelectedPosition.ply]?.nag;
  if (savedNag) {
    annotations.push({
      square: point.to,
      symbol: savedNag,
      kind: "saved",
      tooltip: `${savedNag} · ${savedAnnotationLabel}`,
    });
  }

  const annotation = moveAnnotations[analysisSelectedPosition.ply];
  if (annotation) {
    annotations.push({
      square: point.to,
      symbol: annotation.symbol,
      kind: annotation.kind,
      tooltip: getMoveAnnotationTooltip(annotation),
    });
  }

  return annotations;
}
