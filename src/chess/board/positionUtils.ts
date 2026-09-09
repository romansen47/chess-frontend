import type { BackendPiece, Piece, PieceColor, PieceType } from "../types";
import { getSquareCoords, squareName } from "./boardUtils";

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
  return backendPieces.map((bp) => ({
    id: `${bp.color}_${bp.type}_${bp.square.toLowerCase()}`,
    color: bp.color,
    type: bp.type,
    file: bp.square.charAt(0).toLowerCase().charCodeAt(0) - "a".charCodeAt(0) + 1,
    rank: parseInt(bp.square.charAt(1), 10),
  }));
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

export function mapPositionStringToLocalPieces(position: string): Piece[] {
  if (!position || position.length !== 64) return [];
  const result: Piece[] = [];
  for (let index = 0; index < 64; index++) {
    const pieceChar = position.charAt(index);
    const type = pieceTypeFromPositionChar(pieceChar);
    if (!type) continue;
    const file = (index % 8) + 1;
    const rank = 8 - Math.floor(index / 8);
    const color: PieceColor = isWhitePositionPiece(pieceChar) ? "white" : "black";
    const square = squareName(file, rank);
    result.push({ id: `${color}_${type}_${square}_${index}`, color, type, file, rank });
  }
  return result;
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
