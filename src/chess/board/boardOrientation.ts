import { getSquareCoords, squareName } from "./boardUtils";

export type BoardOrientation = "white" | "black";

export const BOARD_ORIENTATION_STORAGE_KEY = "chess.boardOrientation";

export function normalizeBoardOrientation(
  value: string | null | undefined
): BoardOrientation {
  return value === "black" ? "black" : "white";
}

export function displayCellToSquare(
  rowFromTop: number,
  columnFromLeft: number,
  orientation: BoardOrientation
): string {
  const file = orientation === "white"
    ? columnFromLeft + 1
    : 8 - columnFromLeft;
  const rank = orientation === "white"
    ? 8 - rowFromTop
    : rowFromTop + 1;
  return squareName(file, rank);
}

export function squareToBoardOffset(
  square: string,
  orientation: BoardOrientation,
  squareSize: number
): { x: number; y: number } | null {
  const coords = getSquareCoords(square);
  if (!coords) return null;

  const displayFile = orientation === "white"
    ? coords.file - 1
    : 8 - coords.file;
  const displayRank = orientation === "white"
    ? 8 - coords.rank
    : coords.rank - 1;

  return {
    x: displayFile * squareSize,
    y: displayRank * squareSize,
  };
}

export function boardPointToSquare(
  x: number,
  y: number,
  width: number,
  height: number,
  orientation: BoardOrientation
): string | null {
  if (x < 0 || y < 0 || x >= width || y >= height) return null;

  const column = Math.min(7, Math.floor(x / (width / 8)));
  const row = Math.min(7, Math.floor(y / (height / 8)));
  return displayCellToSquare(row, column, orientation);
}

export function positionIndexForDisplayCell(
  rowFromTop: number,
  columnFromLeft: number,
  orientation: BoardOrientation
): number {
  const square = displayCellToSquare(
    rowFromTop,
    columnFromLeft,
    orientation
  );
  const coords = getSquareCoords(square);
  if (!coords) return -1;

  return (8 - coords.rank) * 8 + (coords.file - 1);
}
