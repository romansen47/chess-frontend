import type { BoardArrowMove } from "../types";

export interface BoardArrowSpec extends BoardArrowMove {
  color: string;
  shaftWidth: number;
  headWidth: number;
  headLength: number;
  opacity: number;
  startInset: number;
  endInset: number;
}

const EVALUATION_COLORS = [
  "#a5161a",
  "#c34b4f",
  "#d98789",
] as const;

export function createEvaluationArrow(
  move: BoardArrowMove | null | undefined,
  rank: number,
): BoardArrowSpec | null {
  if (!move?.from || !move?.to || move.from === move.to) return null;
  const color = EVALUATION_COLORS[rank];
  if (!color) return null;

  return {
    from: move.from,
    to: move.to,
    color,
    shaftWidth: rank === 0 ? 0.08 : rank === 1 ? 0.07 : 0.06,
    headWidth: rank === 0 ? 0.25 : rank === 1 ? 0.225 : 0.20,
    headLength: rank === 0 ? 0.22 : rank === 1 ? 0.20 : 0.18,
    opacity: rank === 0 ? 0.72 : rank === 1 ? 0.60 : 0.50,
    startInset: 0.30,
    endInset: 0.32,
  };
}
