import AnnotationPanel from "./AnnotationPanel";
import AnalysisMoveAlternatives from "./AnalysisMoveAlternatives";
import { getAnalysisMoveSelectionForPly } from "./analysisSelectionUtils";
import type { EngineLine, GameAnnotation } from "../types";
import type { AnalysisReplayContentActions, AnalysisReplayContentState } from "./analysisReplayViewTypes";
import { variationFromLine } from "./engineVariationUtils";

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

  const catAnnotation = ply == null ? null : moveAnnotations[ply] ?? null;
  const selectedSan = selection?.san ?? selectedPoint?.san ?? null;
  const alternatives = previousPoint?.lines ?? [];
  const savedVariations = ply == null
    ? []
    : gameAnnotations[ply]?.variations ?? [];

  function addEngineVariation(line: EngineLine) {
    if (ply == null) return;

    const variation = variationFromLine(line, ply);
    if (!variation || savedVariations.includes(variation)) return;

    const current: GameAnnotation = gameAnnotations[ply] ?? {
      ply,
      nag: null,
      comment: null,
      evaluation: null,
      variations: [],
    };

    actions.updateGameAnnotation({
      ...current,
      variations: [...current.variations, variation],
    });
  }

  return <div className="analysis-annotation-container">
    {ply != null && (
      <AnalysisMoveAlternatives
        playedSan={selectedSan}
        playedMoveUci={selection?.uci ?? null}
        playedPosition={analysisSelectedPosition?.position ?? null}
        alternatives={alternatives}
        savedVariations={savedVariations}
        orientation={state.boardOrientation}
        onAddVariation={addEngineVariation}
      />
    )}
    <AnnotationPanel selectedPly={ply} selectedSan={selectedSan}
      annotation={ply == null ? null : gameAnnotations[ply] ?? null}
      catAnnotation={catAnnotation}
      currentEvaluation={currentEvaluation} alternatives={alternatives}
      dirty={annotationsDirty} saving={annotationsSaving} error={annotationSaveError}
      onAddEngineVariation={addEngineVariation}
      onChange={actions.updateGameAnnotation} />
  </div>;
}
