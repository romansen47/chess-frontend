import { describe, expect, it } from "vitest";

import { activeEvaluationBarValue, evaluationToBar } from "./evaluationBar";

describe("evaluationToBar", () => {
  it("matches the backend neutral and mate limits", () => {
    expect(evaluationToBar(0)).toBe(0.5);
    expect(evaluationToBar(99)).toBe(1);
    expect(evaluationToBar(120)).toBe(1);
    expect(evaluationToBar(-99)).toBe(0);
    expect(evaluationToBar(-120)).toBe(0);
  });

  it("maps ordinary evaluations symmetrically", () => {
    const white = evaluationToBar(1);
    const black = evaluationToBar(-1);

    expect(white).toBeGreaterThan(0.5);
    expect(black).toBeLessThan(0.5);
    expect(white + black).toBeCloseTo(1, 12);
  });

  it("rejects non-finite values", () => {
    expect(() => evaluationToBar(Number.NaN)).toThrow(
      "Evaluation must be finite",
    );
  });
});


describe("activeEvaluationBarValue", () => {
  it("keeps the bar inactive until an enabled engine has a result", () => {
    expect(activeEvaluationBarValue(false, 0.75)).toBeNull();
    expect(activeEvaluationBarValue(true, null)).toBeNull();
    expect(activeEvaluationBarValue(true, undefined)).toBeNull();
    expect(activeEvaluationBarValue(true, Number.NaN)).toBeNull();
  });

  it("preserves neutral and non-neutral engine results", () => {
    expect(activeEvaluationBarValue(true, 0.5)).toBe(0.5);
    expect(activeEvaluationBarValue(true, 0.73)).toBe(0.73);
    expect(activeEvaluationBarValue(true, 0)).toBe(0);
    expect(activeEvaluationBarValue(true, 1)).toBe(1);
  });
});
