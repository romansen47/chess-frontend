import type {
  AnalysisDepthCandidate,
  AnalysisDepthSnapshot,
  EngineLine,
  MoveRow,
} from "../types";

const MATERIAL_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export function moverScore(evaluation: number, ply: number): number {
  return ply % 2 === 1 ? evaluation : -evaluation;
}

// Lichess-style mapping from centipawn evaluation to practical winning chances.
// Engine evaluations in CAT are stored in pawns, so convert to centipawns first.
export function winPercentFromMoverScore(score: number): number {
  const centipawns = score * 100;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * centipawns)) - 1);
}

export function movePositionAtPly(
  moves: MoveRow[],
  ply: number
): string | undefined {
  if (ply <= 0) return undefined;
  const moveNumber = Math.ceil(ply / 2);
  const row = moves.find((candidate) => candidate.moveNumber === moveNumber);
  if (!row) return undefined;
  return ply % 2 === 1 ? row.whitePosition : row.blackPosition;
}

export function rankEngineLines(
  lines: EngineLine[],
  ply: number
): EngineLine[] {
  return lines
    .filter((line) => (line.positions?.length ?? 0) > 1)
    .slice()
    .sort(
      (left, right) =>
        moverScore(right.eval, ply) - moverScore(left.eval, ply)
    );
}

export function rankDepthCandidates(
  snapshot: AnalysisDepthSnapshot,
  ply: number
): AnalysisDepthCandidate[] {
  return snapshot.candidates
    .filter((candidate) => Boolean(candidate.position))
    .slice()
    .sort(
      (left, right) =>
        moverScore(right.evaluation, ply) -
        moverScore(left.evaluation, ply)
    );
}

function whiteMaterialBalance(position: string): number {
  let balance = 0;

  for (const piece of position) {
    const value = MATERIAL_VALUES[piece.toLowerCase()];
    if (value == null) continue;

    balance += piece === piece.toUpperCase() ? value : -value;
  }

  return balance;
}

export function materialBalanceForMover(
  position: string,
  ply: number
): number {
  const whiteBalance = whiteMaterialBalance(position);
  return ply % 2 === 1 ? whiteBalance : -whiteBalance;
}

/**
 * Returns the largest material drawdown, measured from the root position,
 * during the first maxPlies of one final engine PV.
 *
 * Example: a queen sacrifice may first capture a pawn and only be recaptured
 * on the opponent's reply. Looking along the PV catches that temporary
 * investment whereas looking only at the board directly after the move would
 * miss it.
 */
export function materialInvestmentAlongLine(
  line: EngineLine,
  ply: number,
  maxPlies: number
): number {
  const positions = line.positions ?? [];
  if (positions.length < 2 || maxPlies <= 0) {
    return 0;
  }

  const rootBalance = materialBalanceForMover(positions[0], ply);
  let lowestBalance = rootBalance;
  const lastIndex = Math.min(positions.length - 1, maxPlies);

  for (let index = 1; index <= lastIndex; index += 1) {
    lowestBalance = Math.min(
      lowestBalance,
      materialBalanceForMover(positions[index], ply)
    );
  }

  return Math.max(0, rootBalance - lowestBalance);
}
