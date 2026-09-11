import type { AnalysisProfilePoint, MoveRow } from "../types";

export type MoveAnnotationSymbol = "!" | "?" | "??";

export interface MoveAnnotation {
  symbol: MoveAnnotationSymbol;
  title: string;
}

const ONLY_MOVE_GAP = 1.5;
const ONLY_MOVE_SECOND_BEST_MAX = 0.75;
const MISTAKE_LOSS = 1.0;
const BLUNDER_LOSS = 3.0;

function moverScore(evaluation: number, ply: number): number {
  return ply % 2 === 1 ? evaluation : -evaluation;
}

function movePositionAtPly(moves: MoveRow[], ply: number): string | undefined {
  if (ply <= 0) return undefined;
  const moveNumber = Math.ceil(ply / 2);
  const row = moves.find((candidate) => candidate.moveNumber === moveNumber);
  if (!row) return undefined;
  return ply % 2 === 1 ? row.whitePosition : row.blackPosition;
}

function formatEvaluation(value: number): string {
  return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
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
        title: `?? · Δ ${loss.toFixed(2)} · best ${formatEvaluation(best.eval)}`,
      };
      continue;
    }

    if (loss >= MISTAKE_LOSS) {
      result[ply] = {
        symbol: "?",
        title: `? · Δ ${loss.toFixed(2)} · best ${formatEvaluation(best.eval)}`,
      };
      continue;
    }

    if (played && played.positions?.[1] === best.positions?.[1] && candidates.length > 1) {
      const secondBest = candidates[1];
      const secondBestScore = moverScore(secondBest.eval, ply);
      const gap = bestScore - secondBestScore;

      if (gap >= ONLY_MOVE_GAP && secondBestScore <= ONLY_MOVE_SECOND_BEST_MAX) {
        result[ply] = {
          symbol: "!",
          title: `! · PV1 ${formatEvaluation(best.eval)} · PV2 ${formatEvaluation(secondBest.eval)}`,
        };
      }
    }
  }

  return result;
}
