/** Where the continuously updated game evaluation is calculated. */
export type LiveEvaluationSourcePreference = "browser" | "backend";

export const BROWSER_STOCKFISH_NAME = "Stockfish 19 Lite";

/** New browser clients use their own CPU unless they explicitly choose a backend profile. */
export const DEFAULT_LIVE_EVALUATION_SOURCE: LiveEvaluationSourcePreference =
  "browser";

export function isLiveEvaluationSourcePreference(
  value: unknown,
): value is LiveEvaluationSourcePreference {
  return value === "browser" || value === "backend";
}
