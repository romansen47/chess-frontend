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

/**
 * Returns the explicit initial FEN for any Scharnagl position.
 *
 * <p>All 960 positions use file-based Shredder-FEN castling rights, including
 * position 518. This mirrors the backend's unified Chess960 representation.</p>
 */
export function createChess960InitialFen(positionId: number): string {
  const backRank = decodeChess960BackRank(positionId);
  const whiteBackRank = backRank.map((type) => pieceFenLetter(type).toUpperCase()).join("");
  const blackBackRank = whiteBackRank.toLowerCase();
  const kingFile = backRank.findIndex((type) => type === "king") + 1;
  const rookFiles = backRank
    .map((type, index) => type === "rook" ? index + 1 : -1)
    .filter((file) => file > 0);
  const queenSideRookFile = Math.max(...rookFiles.filter((file) => file < kingFile));
  const kingSideRookFile = Math.min(...rookFiles.filter((file) => file > kingFile));
  const castlingRights =
    fileLetter(kingSideRookFile, true)
    + fileLetter(queenSideRookFile, true)
    + fileLetter(kingSideRookFile, false)
    + fileLetter(queenSideRookFile, false);

  return `${blackBackRank}/pppppppp/8/8/8/8/PPPPPPPP/${whiteBackRank} w ${castlingRights} - 0 1`;
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

function pieceFenLetter(type: PieceType): string {
  switch (type) {
    case "rook": return "r";
    case "knight": return "n";
    case "bishop": return "b";
    case "queen": return "q";
    case "king": return "k";
    case "pawn": return "p";
  }
}

function fileLetter(file: number, white: boolean): string {
  const lower = String.fromCharCode("a".charCodeAt(0) + file - 1);
  return white ? lower.toUpperCase() : lower;
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
 * Resolves unified Chess960 UCI castling (king -> original rook square).
 *
 * <p>Position 518 follows the same representation as every other Scharnagl
 * position, so there is deliberately no king-to-c/g compatibility branch.</p>
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

  return null;
}
