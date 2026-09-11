import type { AnalysisProfilePoint, MoveRow } from "../types";

export type MoveAnnotationSymbol = "!" | "?" | "??";

export type MoveAnnotationKind = "onlyMove" | "mistake" | "blunder";

export interface MoveAnnotation {
  symbol: MoveAnnotationSymbol;
  kind: MoveAnnotationKind;
  loss?: number;
  bestEvaluation: number;
  secondBestEvaluation?: number;
}

const ONLY_MOVE_WIN_PERCENT_GAP = 15.0;
const MISTAKE_LOSS = 1.0;
const BLUNDER_LOSS = 3.0;

function moverScore(evaluation: number, ply: number): number {
  return ply % 2 === 1 ? evaluation : -evaluation;
}

// Lichess-style mapping from centipawn evaluation to practical winning chances.
// Engine evaluations in CAT are stored in pawns, so convert to centipawns first.
function winPercentFromMoverScore(score: number): number {
  const centipawns = score * 100;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * centipawns)) - 1);
}

function movePositionAtPly(moves: MoveRow[], ply: number): string | undefined {
  if (ply <= 0) return undefined;
  const moveNumber = Math.ceil(ply / 2);
  const row = moves.find((candidate) => candidate.moveNumber === moveNumber);
  if (!row) return undefined;
  return ply % 2 === 1 ? row.whitePosition : row.blackPosition;
}

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

    // A classification needs engine data from the position before the move.
    // With time-based analysis a MultiPV search may still return only one line;
    // in that case positive "only move" annotations are deliberately omitted.
    if (!previous || !actualPosition || lines.length === 0) continue;

    // Do not trust the engine's MultiPV numbering as a quality ranking.
    // Engines can emit the variants in different orders, so rank them here
    // by the normalized score from the point of view of the player to move.
    const candidates = lines
      .filter((line) => (line.positions?.length ?? 0) > 1)
      .slice()
      .sort((left, right) => moverScore(right.eval, ply) - moverScore(left.eval, ply));

    if (candidates.length === 0) continue;

    const best = candidates[0];
    const played = candidates.find((line) => line.positions?.[1] === actualPosition);
    const bestScore = moverScore(best.eval, ply);
    const playedScore = moverScore(played?.eval ?? current.evaluation, ply);
    const loss = Math.max(0, bestScore - playedScore);

    if (loss >= BLUNDER_LOSS) {
      result[ply] = {
        symbol: "??",
        kind: "blunder",
        loss,
        bestEvaluation: best.eval,
      };
      continue;
    }

    if (loss >= MISTAKE_LOSS) {
      result[ply] = {
        symbol: "?",
        kind: "mistake",
        loss,
        bestEvaluation: best.eval,
      };
      continue;
    }

    if (played && played.positions?.[1] === best.positions?.[1] && candidates.length > 1) {
      const secondBest = candidates[1];
      const secondBestScore = moverScore(secondBest.eval, ply);
      const winPercentGap =
        winPercentFromMoverScore(bestScore) - winPercentFromMoverScore(secondBestScore);

      if (winPercentGap >= ONLY_MOVE_WIN_PERCENT_GAP) {
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
