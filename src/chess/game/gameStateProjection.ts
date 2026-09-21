import type { LiveEvaluationPosition } from "../evaluation/LiveEvaluationSource";
import { createLiveEvaluationPosition } from "../evaluation/liveEvaluationPosition";
import type { LastMove, MoveRow, Piece, UciGameMove } from "../types";
import { createInitialPieces } from "../board/boardUtils";
import { mapPositionStringToLocalPieces } from "../board/positionUtils";
import { mapImportedUciMovesToRows } from "./gameFormatters";

const STANDARD_STARTING_POSITION_ID = 518;

export interface GameStateProjectionSource {
  moves?: readonly UciGameMove[] | null;
  position?: string | null;
  startingPositionId?: number | null;
  initialFen?: string | null;
}

export interface GameStateProjection {
  startingPositionId: number;
  moves: UciGameMove[];
  moveRows: MoveRow[];
  pieces: Piece[];
  lastMove: LastMove | null;
  latestPly: number;
  liveEvaluationPosition: LiveEvaluationPosition;
}

export function projectGameState(
  source: GameStateProjectionSource,
): GameStateProjection {
  const moves = [...(source.moves ?? [])];
  const startingPositionId =
    typeof source.startingPositionId === "number"
      ? source.startingPositionId
      : STANDARD_STARTING_POSITION_ID;

  const latestPly = moves.reduce(
    (maxPly, move) =>
      Math.max(maxPly, Number.isFinite(move.ply) ? move.ply : 0),
    0,
  );
  const lastMoveData = moves[moves.length - 1];
  const lastMove = lastMoveData?.uci?.length >= 4
    ? {
        from: lastMoveData.uci.substring(0, 2),
        to: lastMoveData.uci.substring(2, 4),
      }
    : null;

  return {
    startingPositionId,
    moves,
    moveRows: mapImportedUciMovesToRows(moves),
    pieces: source.position?.length === 64
      ? mapPositionStringToLocalPieces(source.position)
      : createInitialPieces(startingPositionId),
    lastMove,
    latestPly,
    liveEvaluationPosition: createLiveEvaluationPosition(
      moves,
      source.initialFen,
      startingPositionId,
    ),
  };
}
