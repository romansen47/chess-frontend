import { describe, expect, it } from "vitest";

import {
  DEFAULT_UI_PREFERENCES,
  normalizeUiPreferences,
} from "./useUiPreferences";

describe("normalizeUiPreferences", () => {
  it("uses local browser Stockfish for new and legacy preference records", () => {
    expect(normalizeUiPreferences(null).liveEvaluationSource).toBe("browser");
    expect(normalizeUiPreferences({ showBoardCoordinates: false })).toMatchObject({
      liveEvaluationSource: "browser",
      showBoardCoordinates: false,
    });
  });

  it("preserves an explicit backend choice", () => {
    expect(normalizeUiPreferences({ liveEvaluationSource: "backend" }))
      .toMatchObject({ liveEvaluationSource: "backend" });
  });

  it("rejects unknown source values without losing other valid settings", () => {
    expect(normalizeUiPreferences({
      liveEvaluationSource: "remote",
      showAnalysisEvaluationArrows: false,
    })).toMatchObject({
      liveEvaluationSource: DEFAULT_UI_PREFERENCES.liveEvaluationSource,
      showAnalysisEvaluationArrows: false,
    });
  });
});
