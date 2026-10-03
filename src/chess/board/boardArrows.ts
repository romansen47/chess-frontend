import type { BoardArrowMove } from "../types";

export interface BoardArrowSpec extends BoardArrowMove {
  color: string;
  shaftWidth: number;
  headWidth: number;
  headLength: number;
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
    headWidth: rank === 0 ? 0.27 : rank === 1 ? 0.24 : 0.21,
    headLength: rank === 0 ? 0.25 : rank === 1 ? 0.23 : 0.21,
    startInset: 0.24,
    endInset: 0.27,
  };
}
