import { describe, expect, it } from "vitest";
import {
  EVALUATION_HISTORY_MAX_MAX_ABS_EVAL,
  EVALUATION_HISTORY_MIN_MAX_ABS_EVAL,
  adjustEvaluationHistoryScale,
} from "./evaluationHistoryScale";

describe("evaluation history vertical scale", () => {
  it("zooms in toward ten points on wheel-up", () => {
    expect(adjustEvaluationHistoryScale(40, -1)).toBe(30);
    expect(adjustEvaluationHistoryScale(10, -1))
      .toBe(EVALUATION_HISTORY_MIN_MAX_ABS_EVAL);
  });

  it("zooms out toward one hundred points on wheel-down", () => {
    expect(adjustEvaluationHistoryScale(40, 1)).toBe(50);
    expect(adjustEvaluationHistoryScale(100, 1))
      .toBe(EVALUATION_HISTORY_MAX_MAX_ABS_EVAL);
  });

  it("keeps the scale on ten-point steps", () => {
    expect(adjustEvaluationHistoryScale(34, 0)).toBe(30);
  });
});
