import type { EngineLine } from "../types";

export function normalizeEngineLineForPgn(moves: string): string {
  return moves
    .replace(/[♔♚]/g, "K")
    .replace(/[♕♛]/g, "Q")
    .replace(/[♖♜]/g, "R")
    .replace(/[♗♝]/g, "B")
    .replace(/[♘♞]/g, "N")
    .replace(/0-0-0/g, "O-O-O")
    .replace(/0-0/g, "O-O")
    .trim();
}

export function variationFromLine(
  line: EngineLine,
  ply: number,
): string {
  const moves = normalizeEngineLineForPgn(line.moves);
  if (!moves) return "";

  const moveNumber = Math.ceil(ply / 2);
  return ply % 2 === 1
    ? `${moveNumber}. ${moves}`
    : `${moveNumber}... ${moves}`;
}

export function isPlayedLine(
  line: EngineLine,
  selectedSan: string | null,
): boolean {
  if (!selectedSan) return false;

  const firstMove =
    normalizeEngineLineForPgn(line.moves).split(/\s+/)[0] ?? "";
  return firstMove === normalizeEngineLineForPgn(selectedSan);
}
