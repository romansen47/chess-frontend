import type { GameAnnotation } from "../types";

export interface HistoricalClock {
  whiteTime: number | null;
  blackTime: number | null;
  sideToMove: string | null;
  whiteRunning: boolean;
  blackRunning: boolean;
}

/** Clock tags describe the mover's remaining time after that main-line ply. */
export function historicalClock(
  annotations: Record<number, GameAnnotation>,
  selectedPly: number | null,
  variationMoveCount = 0,
): HistoricalClock | null {
  if (!Object.values(annotations).some((annotation) => annotation.clockMillis != null)) return null;

  const ply = selectedPly ?? 0;
  const onMainLine = variationMoveCount === 0;
  const whitePly = ply % 2 === 1 ? ply : ply - 1;
  const blackPly = ply % 2 === 0 ? ply : ply - 1;
  function seconds(atPly: number): number | null {
    if (!onMainLine || atPly <= 0) return null;
    const millis = annotations[atPly]?.clockMillis;
    return millis == null || !Number.isFinite(millis) || millis < 0 ? null : millis / 1000;
  }

  return {
    whiteTime: seconds(whitePly),
    blackTime: seconds(blackPly),
    sideToMove: onMainLine && selectedPly != null ? (ply % 2 === 0 ? "white" : "black") : null,
    whiteRunning: false,
    blackRunning: false,
  };
}
