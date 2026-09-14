import type { BackendPiece, Piece, PieceColor, PieceType } from "../types";
import { getSquareCoords } from "./boardUtils";
import { createPieceId } from "./pieceIdentity";

export interface PositionPiece {
  color: PieceColor;
  type: PieceType;
  file: number;
  rank: number;
}

function toLocalPiece(piece: PositionPiece): Piece {
  return {
    id: createPieceId(),
    color: piece.color,
    type: piece.type,
    file: piece.file,
    rank: piece.rank,
  };
}

export function getPieceSymbolFromPositionChar(pieceChar: string): string {
  switch (pieceChar) {
    case "P":
      return "♙";
    case "N":
      return "♘";
    case "B":
      return "♗";
    case "R":
      return "♖";
    case "Q":
      return "♕";
    case "K":
      return "♔";
    case "p":
      return "♟";
    case "n":
      return "♞";
    case "b":
      return "♝";
    case "r":
      return "♜";
    case "q":
      return "♛";
    case "k":
      return "♚";
    default:
      return "";
  }
}

export function isWhitePositionPiece(pieceChar: string): boolean {
  return pieceChar >= "A" && pieceChar <= "Z";
}

export function mapBackendPiecesToLocalPieces(backendPieces: BackendPiece[]): Piece[] {
  return backendPieces.map((piece) =>
    toLocalPiece({
      color: piece.color,
      type: piece.type,
      file: piece.square.charAt(0).toLowerCase().charCodeAt(0) - "a".charCodeAt(0) + 1,
      rank: parseInt(piece.square.charAt(1), 10),
    })
  );
}

export function pieceTypeFromPositionChar(pieceChar: string): PieceType | null {
  switch (pieceChar.toLowerCase()) {
    case "p": return "pawn";
    case "r": return "rook";
    case "n": return "knight";
    case "b": return "bishop";
    case "q": return "queen";
    case "k": return "king";
    default: return null;
  }
}

export function parsePositionString(position: string): PositionPiece[] {
  if (!position || position.length !== 64) return [];

  const result: PositionPiece[] = [];
  for (let index = 0; index < 64; index++) {
    const pieceChar = position.charAt(index);
    const type = pieceTypeFromPositionChar(pieceChar);
    if (!type) continue;

    result.push({
      color: isWhitePositionPiece(pieceChar) ? "white" : "black",
      type,
      file: (index % 8) + 1,
      rank: 8 - Math.floor(index / 8),
    });
  }
  return result;
}

export function mapPositionStringToLocalPieces(position: string): Piece[] {
  return parsePositionString(position).map(toLocalPiece);
}

export function getPieceTypeAtSquareFromPosition(
  position: string | null | undefined,
  square: string
): PieceType | null {
  if (!position || position.length !== 64) return null;
  const coords = getSquareCoords(square);
  if (!coords) return null;
  const index = (8 - coords.rank) * 8 + (coords.file - 1);
  return pieceTypeFromPositionChar(position.charAt(index));
}

export function getPromotionTypeForLocalMove(
  movingPiece: Piece | undefined,
  to: string,
  requestedPromotion: PieceType | null | undefined,
  resultingPosition: string | null | undefined
): PieceType | null {
  if (!movingPiece || movingPiece.type !== "pawn") return null;
  const targetCoords = getSquareCoords(to);
  if (!targetCoords) return null;
  const reachesPromotionRank =
    (movingPiece.color === "white" && targetCoords.rank === 8) ||
    (movingPiece.color === "black" && targetCoords.rank === 1);
  if (!reachesPromotionRank) return null;
  if (requestedPromotion && requestedPromotion !== "pawn") return requestedPromotion;
  const promotedType = getPieceTypeAtSquareFromPosition(resultingPosition, to);
  return promotedType && promotedType !== "pawn" ? promotedType : null;
}
