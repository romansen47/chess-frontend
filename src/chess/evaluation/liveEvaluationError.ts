/** Returns a live-evaluation error only while the game can still continue. */
export function visibleLiveEvaluationError(
  error: string | null,
  gameState: string | null | undefined,
): string | null {
  return gameState ? null : error;
}
