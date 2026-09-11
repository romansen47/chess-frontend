import type {
  AnalysisDepthCandidate,
  AnalysisDepthSnapshot,
  AnalysisProfilePoint,
  EngineLine,
  MoveRow,
} from "../types";

export type MoveAnnotationSymbol = "!" | "!!" | "?" | "??";

export type MoveAnnotationKind = "onlyMove" | "brilliant" | "mistake" | "blunder";

export interface MoveAnnotation {
  symbol: MoveAnnotationSymbol;
  kind: MoveAnnotationKind;
  loss?: number;
  bestEvaluation: number;
  secondBestEvaluation?: number;
  earlyDepth?: number;
  earlyRank?: number;
  finalDepth?: number;
  finalRank?: number;
}

const ONLY_MOVE_WIN_PERCENT_GAP = 15.0;
const BRILLIANT_MAX_FINAL_RANK = 3;
const BRILLIANT_EARLY_DEPTH_RATIO = 0.60;
const BRILLIANT_LATE_DEPTH_RATIO = 0.75;
const BRILLIANT_WIN_PERCENT_GAIN = 15.0;
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

function rankEngineLines(lines: EngineLine[], ply: number): EngineLine[] {
  return lines
    .filter((line) => (line.positions?.length ?? 0) > 1)
    .slice()
    .sort((left, right) => moverScore(right.eval, ply) - moverScore(left.eval, ply));
}

function rankDepthCandidates(
  snapshot: AnalysisDepthSnapshot,
  ply: number
): AnalysisDepthCandidate[] {
  return snapshot.candidates
    .filter((candidate) => Boolean(candidate.position))
    .slice()
    .sort(
      (left, right) =>
        moverScore(right.evaluation, ply) - moverScore(left.evaluation, ply)
    );
}

interface BrilliantEvidence {
  earlyDepth: number;
  earlyRank?: number;
  finalDepth: number;
  finalRank: number;
}

function findBrilliantEvidence(
  previous: AnalysisProfilePoint,
  finalCandidates: EngineLine[],
  actualPosition: string,
  ply: number
): BrilliantEvidence | null {
  // "!!" is deliberately independent from "!". It represents a strong move
  // that was difficult for the same engine to appreciate at lower depth.
  // For this first draft we require a reliable final Top-3 placement.
  if (finalCandidates.length < BRILLIANT_MAX_FINAL_RANK) {
    return null;
  }

  const finalPlayedIndex = finalCandidates.findIndex(
    (line) => line.positions?.[1] === actualPosition
  );
  if (finalPlayedIndex < 0 || finalPlayedIndex >= BRILLIANT_MAX_FINAL_RANK) {
    return null;
  }

  const snapshots = (previous.depthSnapshots ?? [])
    .filter(
      (snapshot) =>
        snapshot.depth > 0 &&
        snapshot.candidates.length >= BRILLIANT_MAX_FINAL_RANK
    )
    .slice()
    .sort((left, right) => left.depth - right.depth);

  if (snapshots.length < 3) {
    return null;
  }

  const finalDepth = Math.max(
    previous.depth,
    snapshots[snapshots.length - 1]?.depth ?? 0
  );
  if (finalDepth <= 0) {
    return null;
  }

  const earlyDepthLimit = Math.max(
    1,
    Math.floor(finalDepth * BRILLIANT_EARLY_DEPTH_RATIO)
  );
  const earlySnapshot = snapshots
    .filter((snapshot) => snapshot.depth <= earlyDepthLimit)
    .at(-1);
  if (!earlySnapshot) {
    return null;
  }

  const earlyCandidates = rankDepthCandidates(earlySnapshot, ply);
  const earlyPlayedIndex = earlyCandidates.findIndex(
    (candidate) => candidate.position === actualPosition
  );

  const finalPlayed = finalCandidates[finalPlayedIndex];
  const finalPlayedScore = moverScore(finalPlayed.eval, ply);

  const wasOutsideTopThree =
    earlyPlayedIndex < 0 || earlyPlayedIndex >= BRILLIANT_MAX_FINAL_RANK;

  let gainedWinningChance = false;
  if (earlyPlayedIndex >= 0) {
    const earlyPlayedScore = moverScore(
      earlyCandidates[earlyPlayedIndex].evaluation,
      ply
    );
    const winPercentGain =
      winPercentFromMoverScore(finalPlayedScore) -
      winPercentFromMoverScore(earlyPlayedScore);
    gainedWinningChance = winPercentGain >= BRILLIANT_WIN_PERCENT_GAIN;
  }

  if (!wasOutsideTopThree && !gainedWinningChance) {
    return null;
  }

  // Avoid one-depth spikes: the move must remain Top 3 in at least two of
  // the last three sufficiently deep snapshots.
  const lateDepthStart = Math.max(
    1,
    Math.ceil(finalDepth * BRILLIANT_LATE_DEPTH_RATIO)
  );
  const lateSnapshots = snapshots
    .filter((snapshot) => snapshot.depth >= lateDepthStart)
    .slice(-3);

  if (lateSnapshots.length < 2) {
    return null;
  }

  const stableTopThreeCount = lateSnapshots.filter((snapshot) => {
    const ranked = rankDepthCandidates(snapshot, ply);
    const rank = ranked.findIndex(
      (candidate) => candidate.position === actualPosition
    );
    return rank >= 0 && rank < BRILLIANT_MAX_FINAL_RANK;
  }).length;

  if (stableTopThreeCount < 2) {
    return null;
  }

  return {
    earlyDepth: earlySnapshot.depth,
    earlyRank: earlyPlayedIndex >= 0 ? earlyPlayedIndex + 1 : undefined,
    finalDepth,
    finalRank: finalPlayedIndex + 1,
  };
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

    // All annotation logic here is fed exclusively by the finite DeepAnalysis
    // replay profile. Live evaluation does not populate this data.
    if (!previous || !actualPosition || lines.length === 0) continue;

    // Do not trust the engine's MultiPV numbering as a quality ranking.
    // Engines can emit the variants in different orders, so rank them here
    // by the normalized score from the point of view of the player to move.
    const candidates = rankEngineLines(lines, ply);
    if (candidates.length === 0) continue;

    const best = candidates[0];
    const played = candidates.find(
      (line) => line.positions?.[1] === actualPosition
    );
    const bestScore = moverScore(best.eval, ply);
    const playedScore = moverScore(played?.eval ?? current.evaluation, ply);
    const loss = Math.max(0, bestScore - playedScore);

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
        earlyDepth: brilliantEvidence.earlyDepth,
        earlyRank: brilliantEvidence.earlyRank,
        finalDepth: brilliantEvidence.finalDepth,
        finalRank: brilliantEvidence.finalRank,
      };
      continue;
    }

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
