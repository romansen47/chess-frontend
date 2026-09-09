import type { Piece, PieceType } from "../types";

export function squareName(file: number, rank: number): string {
  const fileChar = String.fromCharCode("a".charCodeAt(0) + file - 1);
  return `${fileChar}${rank}`;
}

export function getPieceSymbol(piece: Piece): string {
  switch (piece.type) {
    case "pawn":
      return "♟";
    case "rook":
      return "♜";
    case "knight":
      return "♞";
    case "bishop":
      return "♝";
    case "queen":
      return "♛";
    case "king":
      return "♚";
    default:
      return "";
  }
}

export function createInitialPieces(): Piece[] {
  const pieces: Piece[] = [];

  for (let file = 1; file <= 8; file++) {
    pieces.push({ id: `wp${file}`, color: "white", type: "pawn", file, rank: 2 });
  }

  for (let file = 1; file <= 8; file++) {
    pieces.push({ id: `bp${file}`, color: "black", type: "pawn", file, rank: 7 });
  }

  const backRankOrder: PieceType[] = [
    "rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook",
  ];

  for (let file = 1; file <= 8; file++) {
    pieces.push({
      id: `w${backRankOrder[file - 1]}${file}`,
      color: "white",
      type: backRankOrder[file - 1],
      file,
      rank: 1,
    });
  }

  for (let file = 1; file <= 8; file++) {
    pieces.push({
      id: `b${backRankOrder[file - 1]}${file}`,
      color: "black",
      type: backRankOrder[file - 1],
      file,
      rank: 8,
    });
  }

  return pieces;
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

export function getCastlingSquares(
  movingPiece: Piece | undefined,
  from: string,
  to: string
): { kingTo: string; rookFrom: string; rookTo: string } | null {
  if (!movingPiece || movingPiece.type !== "king") return null;
  const fromCoords = getSquareCoords(from);
  const toCoords = getSquareCoords(to);
  if (!fromCoords || !toCoords) return null;
  if (fromCoords.file !== 5 || fromCoords.rank !== toCoords.rank) return null;
  if (toCoords.rank !== 1 && toCoords.rank !== 8) return null;

  if (toCoords.file === 7 || toCoords.file === 8) {
    return {
      kingTo: squareName(7, toCoords.rank),
      rookFrom: squareName(8, toCoords.rank),
      rookTo: squareName(6, toCoords.rank),
    };
  }
  if (toCoords.file === 3 || toCoords.file === 1) {
    return {
      kingTo: squareName(3, toCoords.rank),
      rookFrom: squareName(1, toCoords.rank),
      rookTo: squareName(4, toCoords.rank),
    };
  }
  return null;
}
