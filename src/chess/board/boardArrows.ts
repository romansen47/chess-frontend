import type { BoardArrowMove } from "../types";

export interface BoardArrowSpec extends BoardArrowMove {
  color: string;
  opacity: number;
  strokeWidth?: number;
}

const MOVE_ARROW_COLOR = "#555555";
const EVALUATION_ARROW_COLOR = "#a40000";
const EVALUATION_OPACITIES = [0.9, 0.58, 0.34] as const;

export function createMoveArrow(
  move: BoardArrowMove | null | undefined,
): BoardArrowSpec | null {
  if (!move?.from || !move?.to || move.from === move.to) return null;
  return {
    from: move.from,
    to: move.to,
    color: MOVE_ARROW_COLOR,
    opacity: 0.5,
    strokeWidth: 0.11,
  };
}

export function createEvaluationArrow(
  move: BoardArrowMove | null | undefined,
  rank: number,
): BoardArrowSpec | null {
  if (!move?.from || !move?.to || move.from === move.to) return null;
  const opacity = EVALUATION_OPACITIES[rank];
  if (opacity == null) return null;
  return {
    from: move.from,
    to: move.to,
    color: EVALUATION_ARROW_COLOR,
    opacity,
    strokeWidth: rank === 0 ? 0.135 : rank === 1 ? 0.12 : 0.105,
  };
}
