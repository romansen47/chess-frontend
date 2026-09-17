import type { Piece, PieceType } from "../types";
import { createPieceId } from "./pieceIdentity";

const STANDARD_CHESS960_POSITION_ID = 518;
const LIGHT_SQUARE_FILES = [2, 4, 6, 8] as const;
const DARK_SQUARE_FILES = [1, 3, 5, 7] as const;
const KNIGHT_COMBINATIONS = [
  [0, 1], [0, 2], [0, 3], [0, 4], [1, 2],
  [1, 3], [1, 4], [2, 3], [2, 4], [3, 4],
] as const;

export function squareName(file: number, rank: number): string {
  const fileChar = String.fromCharCode("a".charCodeAt(0) + file - 1);
  return `${fileChar}${rank}`;
}

export function getPieceSymbol(piece: Piece): string {
  switch (piece.type) {
    case "pawn": return "♟";
    case "rook": return "♜";
    case "knight": return "♞";
    case "bishop": return "♝";
    case "queen": return "♛";
    case "king": return "♚";
    default: return "";
  }
}

/** Creates any Chess960 initial setup; position 518 is classical chess. */
export function createInitialPieces(
  startingPositionId: number = STANDARD_CHESS960_POSITION_ID,
): Piece[] {
  const pieces: Piece[] = [];
  const backRankOrder = decodeChess960BackRank(startingPositionId);

  for (let file = 1; file <= 8; file++) {
    pieces.push({ id: createPieceId(), color: "white", type: "pawn", file, rank: 2 });
    pieces.push({ id: createPieceId(), color: "black", type: "pawn", file, rank: 7 });
  }

  for (let file = 1; file <= 8; file++) {
    const type = backRankOrder[file - 1];
    pieces.push({ id: createPieceId(), color: "white", type, file, rank: 1 });
    pieces.push({ id: createPieceId(), color: "black", type, file, rank: 8 });
  }

  return pieces;
}

export function decodeChess960BackRank(positionId: number): PieceType[] {
  if (!Number.isInteger(positionId) || positionId < 0 || positionId > 959) {
    throw new Error(`Chess960 position id must be between 0 and 959: ${positionId}`);
  }

  const rank: Array<PieceType | null> = Array(8).fill(null);
  let n = positionId;

  const lightFile = LIGHT_SQUARE_FILES[n % 4];
  n = Math.floor(n / 4);
  const darkFile = DARK_SQUARE_FILES[n % 4];
  n = Math.floor(n / 4);
  rank[lightFile - 1] = "bishop";
  rank[darkFile - 1] = "bishop";

  let remaining = remainingFiles(rank);
  const queenIndex = n % 6;
  n = Math.floor(n / 6);
  rank[remaining[queenIndex] - 1] = "queen";

  remaining = remainingFiles(rank);
  const [firstKnight, secondKnight] = KNIGHT_COMBINATIONS[n];
  rank[remaining[firstKnight] - 1] = "knight";
  rank[remaining[secondKnight] - 1] = "knight";

  remaining = remainingFiles(rank);
  rank[remaining[0] - 1] = "rook";
  rank[remaining[1] - 1] = "king";
  rank[remaining[2] - 1] = "rook";

  return rank as PieceType[];
}

function remainingFiles(rank: Array<PieceType | null>): number[] {
  const files: number[] = [];
  for (let file = 1; file <= 8; file++) {
    if (rank[file - 1] === null) files.push(file);
  }
  return files;
}

export function getRankFromSquare(square: string): number {
  if (!square || square.length < 2) return -1;
  const rank = parseInt(square.charAt(1), 10);
  return Number.isNaN(rank) ? -1 : rank;
}

export function getFileFromSquare(square: string): number {
  if (!square || square.length < 2) return -1;
  const file = square.charAt(0).toLowerCase().charCodeAt(0) - "a".charCodeAt(0) + 1;
  return file >= 1 && file <= 8 ? file : -1;
}

export function getSquareCoords(square: string): { file: number; rank: number } | null {
  const file = getFileFromSquare(square);
  const rank = getRankFromSquare(square);
  if (file < 1 || file > 8 || rank < 1 || rank > 8) return null;
  return { file, rank };
}

/**
 * Resolves both classical UCI castling (king -> c/g) and Chess960 UCI
 * castling (king -> original rook square). The optional piece snapshot makes
 * Chess960 detection unambiguous.
 */
export function getCastlingSquares(
  movingPiece: Piece | undefined,
  from: string,
  to: string,
  pieces?: readonly Piece[],
): { kingTo: string; rookFrom: string; rookTo: string } | null {
  if (!movingPiece || movingPiece.type !== "king") return null;
  const fromCoords = getSquareCoords(from);
  const toCoords = getSquareCoords(to);
  if (!fromCoords || !toCoords || fromCoords.rank !== toCoords.rank) return null;
  if (toCoords.rank !== 1 && toCoords.rank !== 8) return null;

  const targetPiece = pieces?.find(
    (piece) => squareName(piece.file, piece.rank) === to,
  );
  if (
    targetPiece
    && targetPiece.type === "rook"
    && targetPiece.color === movingPiece.color
    && targetPiece.rank === movingPiece.rank
  ) {
    const kingSide = toCoords.file > fromCoords.file;
    return {
      kingTo: squareName(kingSide ? 7 : 3, toCoords.rank),
      rookFrom: to,
      rookTo: squareName(kingSide ? 6 : 4, toCoords.rank),
    };
  }

  // Classical UCI notation remains supported for position 518 and imported games.
  if (fromCoords.file === 5 && (toCoords.file === 7 || toCoords.file === 3)) {
    const kingSide = toCoords.file === 7;
    return {
      kingTo: squareName(kingSide ? 7 : 3, toCoords.rank),
      rookFrom: squareName(kingSide ? 8 : 1, toCoords.rank),
      rookTo: squareName(kingSide ? 6 : 4, toCoords.rank),
    };
  }

  return null;
}
