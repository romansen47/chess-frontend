import type { LiveEvaluationPosition } from "./LiveEvaluationSource";

export function sameLiveEvaluationPosition(
  left: LiveEvaluationPosition | null,
  right: LiveEvaluationPosition | null,
): boolean {
  if (left === right) return true;
  if (left === null || right === null) return false;
  if (left.uciMoves.length !== right.uciMoves.length) return false;
  return left.uciMoves.every((move, index) => move === right.uciMoves[index]);
}
