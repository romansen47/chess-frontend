import { describe, expect, it } from "vitest";
import {
  ANALYSIS_PROFILE_MAX_MAX_ABS_EVAL,
  ANALYSIS_PROFILE_MIN_MAX_ABS_EVAL,
  adjustAnalysisProfileScale,
} from "./analysisProfileScale";

describe("analysis profile vertical scale", () => {
  it("zooms in toward ten points on wheel-up", () => {
    expect(adjustAnalysisProfileScale(40, -1)).toBe(30);
    expect(adjustAnalysisProfileScale(10, -1))
      .toBe(ANALYSIS_PROFILE_MIN_MAX_ABS_EVAL);
  });

  it("zooms out toward one hundred points on wheel-down", () => {
    expect(adjustAnalysisProfileScale(40, 1)).toBe(50);
    expect(adjustAnalysisProfileScale(100, 1))
      .toBe(ANALYSIS_PROFILE_MAX_MAX_ABS_EVAL);
  });

  it("keeps the scale on ten-point steps", () => {
    expect(adjustAnalysisProfileScale(34, 0)).toBe(30);
  });
});
