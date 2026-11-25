import type {
  AnalysisPositionComparison,
  GameAnalysisRunSummary,
  MoveRow,
} from "../types";
import { createChess960InitialFen } from "../board/boardUtils";

export type AnalysisDifferenceFilter = "all" | "bestMove" | "continuation" | "score" | "mate";

export const SIGNIFICANT_NORMALIZED_SCORE_GAP = 8;

export interface ComparisonRunSelection {
  leftId: number;
  rightId: number;
}

export interface ComparisonMovePair {
  moveNumber: number;
  white?: AnalysisPositionComparison;
  black?: AnalysisPositionComparison;
}

export const STANDARD_INITIAL_POSITION =
  "rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR";

/** Keeps A tied to the active run and always chooses a different B. */
export function initialComparisonRunSelection(
  runs: readonly GameAnalysisRunSummary[],
): ComparisonRunSelection {
  const left = runs.find((run) => run.active) ?? runs[0];
  return {
    leftId: left?.id ?? 0,
    rightId: runs.find((run) => run.id !== left?.id)?.id ?? 0,
  };
}

/** Changes A and repairs B when both selectors would otherwise reference one run. */
export function selectComparisonLeftRun(
  runs: readonly GameAnalysisRunSummary[],
  nextLeftId: number,
  currentRightId: number,
): ComparisonRunSelection {
  return {
    leftId: nextLeftId,
    rightId: currentRightId === nextLeftId
      ? runs.find((run) => run.id !== nextLeftId)?.id ?? 0
      : currentRightId,
  };
}

export function isAnalysisDifference(
  position: AnalysisPositionComparison,
  filter: AnalysisDifferenceFilter,
): boolean {
  switch (filter) {
    case "bestMove": return position.differentBestMove;
    case "continuation": return position.differentContinuation;
    case "score": return position.normalizedScoreGap >= SIGNIFICANT_NORMALIZED_SCORE_GAP;
    case "mate": return position.mateDisagreement;
    default:
      return position.differentBestMove
        || position.differentContinuation
        || position.mateDisagreement
        || position.normalizedScoreGap >= SIGNIFICANT_NORMALIZED_SCORE_GAP;
  }
}

export function principalVariationLabel(moves: readonly string[] | undefined): string {
  return moves?.length ? moves.join(" ") : "—";
}

/** Formats the engine's original evaluation without normalized-score conversion. */
export function engineEvaluationLabel(
  evaluation: number,
  mateDistance: number | null,
): string {
  if (mateDistance != null) {
    return mateDistance > 0 ? `#${mateDistance}` : `#−${Math.abs(mateDistance)}`;
  }
  return `${evaluation >= 0 ? "+" : ""}${evaluation.toFixed(2)}`;
}

export interface ComparisonMoveDisplay {
  label: string;
  position: string | null;
  uci: string | null;
}

/** Expands the board portion of a FEN into the 64-character UI position. */
export function positionStringFromFen(fen: string | null | undefined): string | null {
  const board = fen?.trim().split(/\s+/, 1)[0];
  if (!board) return null;

  const ranks = board.split("/");
  if (ranks.length !== 8) return null;

  let position = "";
  for (const rank of ranks) {
    let expandedRank = "";
    for (const character of rank) {
      if (character >= "1" && character <= "8") {
        expandedRank += ".".repeat(Number(character));
      } else if (/^[prnbqkPRNBQK]$/.test(character)) {
        expandedRank += character;
      } else {
        return null;
      }
    }
    if (expandedRank.length !== 8) return null;
    position += expandedRank;
  }
  return position.length === 64 ? position : null;
}

/** Resolves the actual game start, including Chess960 and custom FEN games. */
export function comparisonInitialPosition(
  metadata: Readonly<Record<string, string>>,
  standardStartingPosition: boolean | null,
): string {
  if (standardStartingPosition !== true) {
    const fenPosition = positionStringFromFen(metadata.FEN);
    if (fenPosition) return fenPosition;
  }
  return STANDARD_INITIAL_POSITION;
}

/** Resolves the FEN required to translate stored UCI engine lines into display notation. */
export function comparisonInitialFen(
  metadata: Readonly<Record<string, string>>,
  standardStartingPosition: boolean | null,
): string {
  if (standardStartingPosition !== true && metadata.FEN?.trim()) {
    return metadata.FEN.trim();
  }
  return createChess960InitialFen(518);
}

/** Returns the canonical game history leading to one analysed position. */
export function comparisonUciHistory(
  moves: readonly MoveRow[],
  ply: number,
): string[] {
  const history: string[] = [];
  for (const row of moves) {
    if (history.length >= ply) break;
    if (row.whiteUci) history.push(row.whiteUci);
    if (history.length >= ply) break;
    if (row.blackUci) history.push(row.blackUci);
  }
  return history;
}

/** Groups filtered half-moves into the familiar white/black move-list rows. */
export function groupComparisonMoves(
  positions: readonly AnalysisPositionComparison[],
): ComparisonMovePair[] {
  const rows = new Map<number, ComparisonMovePair>();
  for (const position of positions) {
    if (position.ply <= 0) continue;
    const moveNumber = Math.ceil(position.ply / 2);
    const row = rows.get(moveNumber) ?? { moveNumber };
    if (position.ply % 2 === 1) row.white = position;
    else row.black = position;
    rows.set(moveNumber, row);
  }
  return [...rows.values()].sort((left, right) => left.moveNumber - right.moveNumber);
}

/** Returns SAN only, without the move number already displayed by the row. */
export function comparisonMoveSan(moves: readonly MoveRow[], ply: number): string {
  const moveNumber = Math.ceil(ply / 2);
  const row = moves.find((candidate) => candidate.moveNumber === moveNumber);
  return (ply % 2 === 1 ? row?.white : row?.black) ?? "?";
}

/** Resolves one ply to familiar chess notation and its resulting board. */
export function comparisonMoveDisplay(
  moves: readonly MoveRow[],
  ply: number,
  initialPosition: string = STANDARD_INITIAL_POSITION,
  startLabel: string = "Start",
): ComparisonMoveDisplay {
  if (ply <= 0) {
    return { label: startLabel, position: initialPosition, uci: null };
  }
  const moveNumber = Math.ceil(ply / 2);
  const row = moves.find((candidate) => candidate.moveNumber === moveNumber);
  const whiteMove = ply % 2 === 1;
  const san = whiteMove ? row?.white : row?.black;
  return {
    label: `${moveNumber}${whiteMove ? "." : "..."} ${san ?? "?"}`,
    position: (whiteMove ? row?.whitePosition : row?.blackPosition) ?? null,
    uci: (whiteMove ? row?.whiteUci : row?.blackUci) ?? null,
  };
}
