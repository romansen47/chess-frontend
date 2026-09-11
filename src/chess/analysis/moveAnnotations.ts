import type { AnalysisProfilePoint, MoveRow } from "../types";
import { findBrilliantEvidence } from "./brilliantMoveDetection";
import type { MoveAnnotation } from "./moveAnnotationModel";
import { MOVE_ANNOTATION_POLICY } from "./moveAnnotationPolicy";
import {
  movePositionAtPly,
  moverScore,
  rankEngineLines,
  winPercentFromMoverScore,
} from "./moveAnnotationScoring";
import { isTrivialOnlyMove } from "./onlyMoveDetection";

export type {
  BrilliantReason,
  MoveAnnotation,
  MoveAnnotationKind,
  MoveAnnotationSymbol,
} from "./moveAnnotationModel";

export function buildMoveAnnotations(
  profile: AnalysisProfilePoint[],
  moves: MoveRow[]
): Record<number, MoveAnnotation> {
  const result: Record<number, MoveAnnotation> = {};
  const pointsByPly = new Map(profile.map((point) => [point.ply, point]));

  for (const current of profile) {
    const ply = current.ply;
    if (ply <= 0) continue;

    const previous = pointsByPly.get(ply - 1);
    const actualPosition = movePositionAtPly(moves, ply);
    const lines = previous?.lines ?? [];

    // All annotation logic is fed exclusively by finite DeepAnalysis replay
    // data. Live/infinite evaluation never populates these annotations.
    if (!previous || !actualPosition || lines.length === 0) continue;

    // Never trust engine MultiPV numbering as a quality ranking. Engines may
    // emit variants in different orders, so sort by mover-centric score.
    const candidates = rankEngineLines(lines, ply);
    if (candidates.length === 0) continue;

    const best = candidates[0];
    const played = candidates.find(
      (line) => line.positions?.[1] === actualPosition
    );
    const bestScore = moverScore(best.eval, ply);
    const playedScore = moverScore(
      played?.eval ?? current.evaluation,
      ply
    );
    const loss = Math.max(0, bestScore - playedScore);

    // "!!" intentionally has priority over normal loss labels. A brilliant
    // human move may be materially speculative or even evaluate below another
    // engine line while still meeting one of our brilliance criteria.
    const brilliantEvidence = findBrilliantEvidence(
      previous,
      candidates,
      actualPosition,
      ply
    );
    if (brilliantEvidence) {
      result[ply] = {
        symbol: "!!",
        kind: "brilliant",
        bestEvaluation: best.eval,
        brilliantReason: brilliantEvidence.reason,
        materialInvestment: brilliantEvidence.materialInvestment,
        earlyDepth: brilliantEvidence.earlyDepth,
        earlyRank: brilliantEvidence.earlyRank,
        finalDepth: brilliantEvidence.finalDepth,
        finalRank: brilliantEvidence.finalRank,
      };
      continue;
    }

    if (loss >= MOVE_ANNOTATION_POLICY.blunder.pawnLoss) {
      result[ply] = {
        symbol: "??",
        kind: "blunder",
        loss,
        bestEvaluation: best.eval,
      };
      continue;
    }

    if (loss >= MOVE_ANNOTATION_POLICY.mistake.pawnLoss) {
      result[ply] = {
        symbol: "?",
        kind: "mistake",
        loss,
        bestEvaluation: best.eval,
      };
      continue;
    }

    if (
      played &&
      played.positions?.[1] === best.positions?.[1] &&
      candidates.length > 1
    ) {
      const secondBest = candidates[1];
      const secondBestScore = moverScore(secondBest.eval, ply);
      const winPercentGap =
        winPercentFromMoverScore(bestScore) -
        winPercentFromMoverScore(secondBestScore);

      if (
        winPercentGap >=
          MOVE_ANNOTATION_POLICY.onlyMove.finalWinPercentGap &&
        !isTrivialOnlyMove(previous, actualPosition, ply)
      ) {
        result[ply] = {
          symbol: "!",
          kind: "onlyMove",
          bestEvaluation: best.eval,
          secondBestEvaluation: secondBest.eval,
        };
      }
    }
  }

  return result;
}
