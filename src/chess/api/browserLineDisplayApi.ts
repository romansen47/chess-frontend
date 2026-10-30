import type { EngineLine } from "../types";
import type { LiveEvaluationPosition } from "../evaluation/LiveEvaluationSource";
import { jsonRequest, requestJson } from "./httpClient";

export type BrowserLineDisplayHydration = (
  position: LiveEvaluationPosition,
  lines: readonly EngineLine[],
) => Promise<EngineLine[]>;

/** Adds display notation and board states to locally calculated UCI lines. */
export async function hydrateBrowserEngineLines(
  position: LiveEvaluationPosition,
  lines: readonly EngineLine[],
): Promise<EngineLine[]> {
  if (!position.initialFen?.trim()) {
    throw new Error("Browser engine line display requires an initial FEN");
  }
  return requestJson<EngineLine[]>(
    "/api/eval/browser-lines",
    jsonRequest("POST", {
      initialFen: position.initialFen,
      positionMoves: [...position.uciMoves],
      lines: lines.map(({ eval: value, depth, mateDistance, moves }) => ({
        eval: value,
        depth,
        mateDistance,
        moves,
      })),
    }),
  );
}
