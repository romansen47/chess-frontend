import type { UciGameMove } from "../types";
import type { LiveEvaluationPosition } from "./LiveEvaluationSource";

const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const STANDARD_POSITION_ID = 518;

export function createLiveEvaluationPosition(
  moves: readonly UciGameMove[],
  initialFen?: string | null,
  startingPositionId: number = STANDARD_POSITION_ID,
): LiveEvaluationPosition {
  const uciMoves = moves.map((move, index) => {
    const expectedPly = index + 1;
    if (!Number.isInteger(move.ply) || move.ply !== expectedPly) {
      throw new Error(
        `Invalid authoritative move history: expected ply ${expectedPly}, got ${move.ply}`,
      );
    }
    if (!UCI_MOVE_PATTERN.test(move.uci)) {
      throw new Error(
        `Invalid authoritative UCI move at ply ${move.ply}: ${move.uci}`,
      );
    }
    return move.uci;
  });

  const chess960 = startingPositionId !== STANDARD_POSITION_ID;
  return {
    uciMoves: Object.freeze(uciMoves),
    chess960,
    initialFen: chess960 ? initialFen ?? null : null,
  };
}

export function appendCanonicalMoveToLiveEvaluationPosition(
  position: LiveEvaluationPosition | null,
  ply: number | null | undefined,
  uci: string | null | undefined,
): LiveEvaluationPosition | null {
  if (position === null) return null;
  if (!Number.isInteger(ply) || ply !== position.uciMoves.length + 1) return null;
  if (typeof uci !== "string" || !UCI_MOVE_PATTERN.test(uci)) return null;
  return {
    ...position,
    uciMoves: Object.freeze([...position.uciMoves, uci]),
  };
}
