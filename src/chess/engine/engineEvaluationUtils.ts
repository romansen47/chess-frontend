import type { EngineLine } from "../types";

export function formatEngineScore(evaluation: number): string {
  if (Math.abs(evaluation) >= 99) {
    return evaluation > 0 ? "Mate for White" : "Mate for Black";
  }

  return `Eval ${evaluation.toFixed(2)}`;
}

export function formatEngineLineScore(line: EngineLine): string {
  if (line.mateDistance !== undefined && line.mateDistance !== null) {
    const winner = line.eval > 0 ? "White" : "Black";
    const distance = Math.abs(line.mateDistance);
    return distance > 0
      ? `Mate for ${winner} in ${distance}`
      : `Mate for ${winner}`;
  }

  return formatEngineScore(line.eval);
}
