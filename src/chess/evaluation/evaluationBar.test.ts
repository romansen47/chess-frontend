import { describe, expect, it } from "vitest";

import { evaluationToBar } from "./evaluationBar";

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
