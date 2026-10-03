import { useEffect } from "react";
import type { AnalysisProfilePoint } from "../types";
import { getEffectiveAnalysisLineIndex } from "./analysisSelectionUtils";

interface AnalysisLineAnimationOptions {
  replayActive: boolean;
  selectedPly: number | null | undefined;
  selectedLineIndex: number | null;
  profile: AnalysisProfilePoint[];
  variationMoveCount: number;
  enabled: boolean;
  intervalMs: number;
  setAnimationIndex: (value: number | ((previous: number) => number)) => void;
}

/**
 * Owns the purely visual animation of stored deep-analysis variations.
 *
 * Evaluation fetching deliberately lives elsewhere; this hook only advances
 * through already available position snapshots.
 */
export function useAnalysisLineAnimation({
  replayActive,
  selectedPly,
  selectedLineIndex,
  profile,
  variationMoveCount,
  enabled,
  intervalMs,
  setAnimationIndex,
}: AnalysisLineAnimationOptions) {
  useEffect(() => {
    setAnimationIndex(0);
  }, [selectedPly, selectedLineIndex, enabled, setAnimationIndex]);

  useEffect(() => {
    if (!replayActive || !enabled || variationMoveCount > 0 || selectedPly == null) {
      return;
    }

    const selectedPoint = profile.find((point) => point.ply === selectedPly);
    const lines = selectedPoint?.lines ?? [];
    if (lines.length === 0) return;

    const lineIndex = getEffectiveAnalysisLineIndex(
      selectedPoint,
      lines,
      selectedLineIndex,
    );
    const positions = lines[lineIndex]?.positions ?? [];
    if (positions.length <= 1) return;

    const delay = Math.max(100, intervalMs);
    const intervalId = window.setInterval(() => {
      setAnimationIndex((previous) => (previous + 1) % positions.length);
    }, delay);
    return () => window.clearInterval(intervalId);
  }, [
    replayActive,
    selectedPly,
    selectedLineIndex,
    profile,
    variationMoveCount,
    enabled,
    intervalMs,
    setAnimationIndex,
  ]);
}
