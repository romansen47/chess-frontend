import AnnotationPanel from "./AnnotationPanel";
import { getAnalysisMoveSelectionForPly } from "./analysisSelectionUtils";
import type { AnalysisReplayContentActions, AnalysisReplayContentState } from "./analysisReplayViewTypes";

interface Props { state: AnalysisReplayContentState; actions: AnalysisReplayContentActions; }

export default function AnalysisAnnotationDetails({ state, actions }: Props) {
  const { analysisSelectedPosition, analysisProfile, moves, analysisEvaluationEnabled, analysisVariationMoves,
    analysisEvaluation, gameAnnotations, moveAnnotations, annotationsDirty, annotationsSaving, annotationSaveError } = state;
  const ply = analysisSelectedPosition?.ply ?? null;
  const selectedPoint = ply == null ? null : analysisProfile.find((point) => point.ply === ply) ?? null;
  const previousPoint = ply == null ? null : analysisProfile.find((point) => point.ply === Math.max(0, ply - 1)) ?? null;
  const selection = ply == null ? null : getAnalysisMoveSelectionForPly(moves, ply);
  const currentEvaluation = analysisEvaluationEnabled && analysisVariationMoves.length === 0 && analysisEvaluation
    ? analysisEvaluation.eval
    : selectedPoint?.evaluation ?? null;

  return <div className="analysis-annotation-container">
    <AnnotationPanel selectedPly={ply} selectedSan={selection?.san ?? selectedPoint?.san ?? null}
      annotation={ply == null ? null : gameAnnotations[ply] ?? null}
      catAnnotation={ply == null ? null : moveAnnotations[ply] ?? null}
      currentEvaluation={currentEvaluation} alternatives={previousPoint?.lines ?? []}
      dirty={annotationsDirty} saving={annotationsSaving} error={annotationSaveError}
      onChange={actions.updateGameAnnotation} onSave={() => void actions.persistGameAnnotations()} />
  </div>;
}
