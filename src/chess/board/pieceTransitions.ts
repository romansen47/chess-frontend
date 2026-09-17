import type { Piece, PieceType } from "../types";
import { getCastlingSquares, getSquareCoords, squareName } from "./boardUtils";
import {
  getPromotionTypeForLocalMove,
  mapPositionStringToLocalPieces,
  parsePositionString,
} from "./positionUtils";

type PositionedPiece = Pick<Piece, "color" | "type" | "file" | "rank">;

function piecePositionKey(piece: PositionedPiece): string {
  return `${piece.color}:${piece.type}:${squareName(piece.file, piece.rank)}`;
}

function samePiecePosition(left: PositionedPiece, right: PositionedPiece): boolean {
  return (
    left.color === right.color
    && left.type === right.type
    && left.file === right.file
    && left.rank === right.rank
  );
}

export function piecesMatchPosition(pieces: Piece[], position: string): boolean {
  const expectedPieces = parsePositionString(position);
  if (pieces.length !== expectedPieces.length) return false;
  const actual = pieces.map(piecePositionKey).sort();
  const expected = expectedPieces.map(piecePositionKey).sort();
  return actual.every((value, index) => value === expected[index]);
}

export function reconcilePieceSnapshot(previousPieces: Piece[], targetPieces: Piece[]): Piece[] {
  const unmatchedTargets = [...targetPieces];
  const reconciled: Piece[] = [];

  for (const existingPiece of previousPieces) {
    const targetIndex = unmatchedTargets.findIndex(
      (targetPiece) => samePiecePosition(existingPiece, targetPiece),
    );
    if (targetIndex < 0) continue;
    reconciled.push(existingPiece);
    unmatchedTargets.splice(targetIndex, 1);
  }

  reconciled.push(...unmatchedTargets);
  return reconciled;
}

export interface BoardPositionTransition {
  moveFrom: string;
  moveTo: string;
  targetPosition: string;
  reverse: boolean;
  sourcePosition?: string;
}

export function transitionBoardPosition(
  previousPieces: Piece[],
  transition: BoardPositionTransition,
): Piece[] {
  const { moveFrom, moveTo, targetPosition, reverse, sourcePosition } = transition;
  const targetPieces = mapPositionStringToLocalPieces(targetPosition);

  if (sourcePosition && !piecesMatchPosition(previousPieces, sourcePosition)) {
    return targetPieces;
  }

  // For reverse Chess960 playback the UCI target is the original rook square,
  // which is empty after castling. Detect the castle from the authoritative
  // pre-castling snapshot (targetPieces) before looking for the moving king.
  const castlingReferencePieces = reverse ? targetPieces : previousPieces;
  const referenceKing = castlingReferencePieces.find(
    (piece) => piece.type === "king" && squareName(piece.file, piece.rank) === moveFrom,
  );
  const originalCastling = getCastlingSquares(
    referenceKing,
    moveFrom,
    moveTo,
    castlingReferencePieces,
  );

  if (originalCastling) {
    const kingCurrentSquare = reverse ? originalCastling.kingTo : moveFrom;
    const rookCurrentSquare = reverse ? originalCastling.rookTo : originalCastling.rookFrom;
    const kingDestinationSquare = reverse ? moveFrom : originalCastling.kingTo;
    const rookDestinationSquare = reverse ? originalCastling.rookFrom : originalCastling.rookTo;
    const kingDestination = getSquareCoords(kingDestinationSquare);
    const rookDestination = getSquareCoords(rookDestinationSquare);
    if (!kingDestination || !rookDestination) return targetPieces;

    const currentKing = previousPieces.find(
      (piece) => piece.type === "king" && squareName(piece.file, piece.rank) === kingCurrentSquare,
    );
    const currentRook = previousPieces.find(
      (piece) => piece.type === "rook"
        && piece.color === referenceKing?.color
        && squareName(piece.file, piece.rank) === rookCurrentSquare,
    );
    if (!currentKing || !currentRook) return targetPieces;

    const animatedPieces = previousPieces.map((piece) => {
      if (piece.id === currentKing.id) {
        return { ...piece, file: kingDestination.file, rank: kingDestination.rank };
      }
      if (piece.id === currentRook.id) {
        return { ...piece, file: rookDestination.file, rank: rookDestination.rank };
      }
      return piece;
    });
    return reconcilePieceSnapshot(animatedPieces, targetPieces);
  }

  const sourceSquare = reverse ? moveTo : moveFrom;
  const destinationSquare = reverse ? moveFrom : moveTo;
  const destinationCoords = getSquareCoords(destinationSquare);
  if (!destinationCoords) return targetPieces;

  const movingPiece = previousPieces.find(
    (piece) => squareName(piece.file, piece.rank) === sourceSquare,
  );
  if (!movingPiece) return targetPieces;

  const targetMovingPiece = targetPieces.find(
    (piece) => piece.color === movingPiece.color
      && squareName(piece.file, piece.rank) === destinationSquare,
  );
  const animatedPieces = previousPieces.map((piece) =>
    piece.id === movingPiece.id
      ? {
          ...piece,
          type: targetMovingPiece?.type ?? piece.type,
          file: destinationCoords.file,
          rank: destinationCoords.rank,
        }
      : piece,
  );
  return reconcilePieceSnapshot(animatedPieces, targetPieces);
}

export function applyLocalMoveTransition(
  previousPieces: Piece[],
  from: string,
  to: string,
  requestedPromotion?: PieceType | null,
  resultingPosition?: string | null,
): Piece[] {
  if (resultingPosition && resultingPosition.length === 64) {
    return transitionBoardPosition(previousPieces, {
      moveFrom: from,
      moveTo: to,
      targetPosition: resultingPosition,
      reverse: false,
    });
  }

  const targetCoords = getSquareCoords(to);
  if (!targetCoords) return previousPieces;
  const movingPiece = previousPieces.find(
    (piece) => squareName(piece.file, piece.rank) === from,
  );
  if (!movingPiece) return previousPieces;

  const promotionType = getPromotionTypeForLocalMove(
    movingPiece,
    to,
    requestedPromotion,
    resultingPosition,
  );
  const castlingSquares = getCastlingSquares(movingPiece, from, to, previousPieces);

  if (castlingSquares) {
    const kingToCoords = getSquareCoords(castlingSquares.kingTo);
    const rookToCoords = getSquareCoords(castlingSquares.rookTo);
    if (!kingToCoords || !rookToCoords) return previousPieces;

    return previousPieces.map((piece) => {
      const currentSquare = squareName(piece.file, piece.rank);
      if (piece.id === movingPiece.id) {
        return { ...piece, file: kingToCoords.file, rank: kingToCoords.rank };
      }
      if (currentSquare === castlingSquares.rookFrom) {
        return { ...piece, file: rookToCoords.file, rank: rookToCoords.rank };
      }
      return piece;
    });
  }

  const targetOccupied = previousPieces.some(
    (piece) => squareName(piece.file, piece.rank) === to,
  );
  const enPassant = movingPiece.type === "pawn"
    && movingPiece.file !== targetCoords.file
    && !targetOccupied;
  const capturedSquare = enPassant
    ? squareName(targetCoords.file, movingPiece.rank)
    : to;

  const withoutCaptured = previousPieces.filter((piece) => {
    if (piece.id === movingPiece.id) return true;
    return !(
      piece.color !== movingPiece.color
      && squareName(piece.file, piece.rank) === capturedSquare
    );
  });

  return withoutCaptured.map((piece) =>
    piece.id === movingPiece.id
      ? {
          ...piece,
          type: promotionType ?? piece.type,
          file: targetCoords.file,
          rank: targetCoords.rank,
        }
      : piece,
  );
}
