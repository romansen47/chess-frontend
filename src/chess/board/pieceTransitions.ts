import type { Piece, PieceType } from "../types";
import { getCastlingSquares, getSquareCoords, squareName } from "./boardUtils";
import {
  getPromotionTypeForLocalMove,
  mapPositionStringToLocalPieces,
} from "./positionUtils";

export function reconcilePieceSnapshot(
  previousPieces: Piece[],
  targetPieces: Piece[]
): Piece[] {
  const availablePieces = [...previousPieces];

  return targetPieces.map((targetPiece) => {
    const targetSquare = squareName(targetPiece.file, targetPiece.rank);
    const existingIndex = availablePieces.findIndex(
      (piece) =>
        piece.color === targetPiece.color
        && piece.type === targetPiece.type
        && squareName(piece.file, piece.rank) === targetSquare
    );

    if (existingIndex >= 0) {
      const [existingPiece] = availablePieces.splice(existingIndex, 1);
      return existingPiece;
    }

    return targetPiece;
  });
}

export interface BoardPositionTransition {
  moveFrom: string;
  moveTo: string;
  targetPosition: string;
  reverse: boolean;
}

export function transitionBoardPosition(
  previousPieces: Piece[],
  transition: BoardPositionTransition
): Piece[] {
  const {
    moveFrom,
    moveTo,
    targetPosition,
    reverse,
  } = transition;

  const targetPieces = mapPositionStringToLocalPieces(targetPosition);
  const sourceSquare = reverse ? moveTo : moveFrom;
  const destinationSquare = reverse ? moveFrom : moveTo;
  const destinationCoords = getSquareCoords(destinationSquare);

  if (!destinationCoords) {
    return reconcilePieceSnapshot(previousPieces, targetPieces);
  }

  const movingPiece = previousPieces.find(
    (piece) => squareName(piece.file, piece.rank) === sourceSquare
  );
  if (!movingPiece) {
    return reconcilePieceSnapshot(previousPieces, targetPieces);
  }

  const originalCastling = getCastlingSquares(movingPiece, moveFrom, moveTo);
  let animatedPieces: Piece[];

  if (originalCastling) {
    const kingDestination = getSquareCoords(
      reverse ? moveFrom : originalCastling.kingTo
    );
    const rookSource = reverse
      ? originalCastling.rookTo
      : originalCastling.rookFrom;
    const rookDestination = getSquareCoords(
      reverse ? originalCastling.rookFrom : originalCastling.rookTo
    );

    if (!kingDestination || !rookDestination) {
      return reconcilePieceSnapshot(previousPieces, targetPieces);
    }

    animatedPieces = previousPieces.map((piece) => {
      const square = squareName(piece.file, piece.rank);
      if (piece.id === movingPiece.id) {
        return {
          ...piece,
          file: kingDestination.file,
          rank: kingDestination.rank,
        };
      }
      if (square === rookSource) {
        return {
          ...piece,
          file: rookDestination.file,
          rank: rookDestination.rank,
        };
      }
      return piece;
    });
  } else {
    const targetMovingPiece = targetPieces.find(
      (piece) =>
        piece.color === movingPiece.color
        && squareName(piece.file, piece.rank) === destinationSquare
    );

    animatedPieces = previousPieces.map((piece) =>
      piece.id === movingPiece.id
        ? {
            ...piece,
            type: targetMovingPiece?.type ?? piece.type,
            file: destinationCoords.file,
            rank: destinationCoords.rank,
          }
        : piece
    );
  }

  return reconcilePieceSnapshot(animatedPieces, targetPieces);
}

export function applyLocalMoveTransition(
  previousPieces: Piece[],
  from: string,
  to: string,
  requestedPromotion?: PieceType | null,
  resultingPosition?: string | null
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
    (piece) => squareName(piece.file, piece.rank) === from
  );
  const promotionType = getPromotionTypeForLocalMove(
    movingPiece,
    to,
    requestedPromotion,
    resultingPosition
  );
  const castlingSquares = getCastlingSquares(movingPiece, from, to);

  if (castlingSquares) {
    const kingToCoords = getSquareCoords(castlingSquares.kingTo);
    const rookToCoords = getSquareCoords(castlingSquares.rookTo);
    if (!kingToCoords || !rookToCoords) return previousPieces;

    return previousPieces.map((piece) => {
      const currentSquare = squareName(piece.file, piece.rank);
      if (currentSquare === from) {
        return { ...piece, file: kingToCoords.file, rank: kingToCoords.rank };
      }
      if (currentSquare === castlingSquares.rookFrom) {
        return { ...piece, file: rookToCoords.file, rank: rookToCoords.rank };
      }
      return piece;
    });
  }

  const withoutCaptured = previousPieces.filter(
    (piece) => squareName(piece.file, piece.rank) !== to
  );

  return withoutCaptured.map((piece) =>
    squareName(piece.file, piece.rank) === from
      ? {
          ...piece,
          type: promotionType ?? piece.type,
          file: targetCoords.file,
          rank: targetCoords.rank,
        }
      : piece
  );
}
