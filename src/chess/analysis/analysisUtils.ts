import type {
  AnalysisProfilePoint,
  AnalysisReplaySettings,
  EngineLine,
} from "../types";

export function createDefaultAnalysisReplaySettings(): AnalysisReplaySettings {
  return { engineProfileId: null, depth: 0, moveTimeSeconds: 5 };
}

export function analysisEvaluationKey(
  ply: number,
  variationMoves: string[]
): string {
  return variationMoves.length > 0
    ? `variation:${ply}:${variationMoves.join(" ")}`
    : `ply:${ply}`;
}

export function getDefaultAnalysisLineIndex(
  point: AnalysisProfilePoint | undefined,
  lines: EngineLine[]
): number {
  if (!point || lines.length === 0) return 0;

  const whiteToMove = point.ply % 2 === 0;
  let bestIndex = 0;
  let bestEval = lines[0]?.eval ?? 0;

  for (let index = 1; index < lines.length; index++) {
    const lineEval = lines[index]?.eval ?? 0;
    if (whiteToMove ? lineEval > bestEval : lineEval < bestEval) {
      bestEval = lineEval;
      bestIndex = index;
    }
  }

  return bestIndex;
}

export function splitAnalysisMoveText(movesText: string): string[] {
  if (!movesText || !movesText.trim()) return [];

  const tokens = movesText.trim().split(/\s+/);
  const result: string[] = [];

  for (const token of tokens) {
    if (token === "e.p." && result.length > 0) {
      result[result.length - 1] = `${result[result.length - 1]} ${token}`;
    } else {
      result.push(token);
    }
  }

  return result;
}
