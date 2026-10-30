/** Where the continuously updated game evaluation is calculated. */
export type LiveEvaluationSourcePreference = "browser" | "backend";

/** Stable UI-only id; it is never sent to the backend as a profile id. */
export const BROWSER_STOCKFISH_SELECTION_ID = "browser-stockfish-19-lite";
export const BROWSER_STOCKFISH_NAME = "Stockfish 19 Lite";

/** New browser clients use their own CPU unless they explicitly choose a backend profile. */
export const DEFAULT_LIVE_EVALUATION_SOURCE: LiveEvaluationSourcePreference =
  "browser";

export function isLiveEvaluationSourcePreference(
  value: unknown,
): value is LiveEvaluationSourcePreference {
  return value === "browser" || value === "backend";
}

export function liveEvaluationSelectionValue(
  source: LiveEvaluationSourcePreference,
  backendProfileId: string | null | undefined,
): string {
  return source === "browser"
    ? BROWSER_STOCKFISH_SELECTION_ID
    : backendProfileId ?? "";
}

export function resolveLiveEvaluationSelection(value: string): {
  source: LiveEvaluationSourcePreference;
  backendProfileId?: string;
} {
  return value === BROWSER_STOCKFISH_SELECTION_ID
    ? { source: "browser" }
    : { source: "backend", backendProfileId: value };
}
