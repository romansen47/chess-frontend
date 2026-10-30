import { describe, expect, it } from "vitest";

import {
  BROWSER_STOCKFISH_SELECTION_ID,
  liveEvaluationSelectionValue,
  resolveLiveEvaluationSelection,
} from "./liveEvaluationEngine";

describe("live evaluation engine selection", () => {
  it("represents browser Stockfish with a UI-only id", () => {
    expect(liveEvaluationSelectionValue("browser", "backend-profile"))
      .toBe(BROWSER_STOCKFISH_SELECTION_ID);
    expect(resolveLiveEvaluationSelection(BROWSER_STOCKFISH_SELECTION_ID))
      .toEqual({ source: "browser" });
  });

  it("keeps a backend profile id separate from the browser choice", () => {
    expect(liveEvaluationSelectionValue("backend", "integral-eval"))
      .toBe("integral-eval");
    expect(resolveLiveEvaluationSelection("integral-eval")).toEqual({
      source: "backend",
      backendProfileId: "integral-eval",
    });
  });
});
