import type { UciGameMove } from "../types";
import type { LiveEvaluationPosition } from "./LiveEvaluationSource";

const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export function createLiveEvaluationPosition(
  moves: readonly UciGameMove[],
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

  return { uciMoves: Object.freeze(uciMoves) };
}
