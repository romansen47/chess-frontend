import { describe, expect, it } from "vitest";
import { buildEvaluationAreaPath } from "./evaluationHistoryGeometry";

describe("evaluation history geometry", () => {
  it("connects neighboring evaluations as one continuous area", () => {
    expect(buildEvaluationAreaPath(
      [{ x: 10, y: 20 }, { x: 20, y: 10 }],
      30,
      5,
      25,
    )).toBe(
      "M 5 30 L 5 20 L 10 20 L 20 10 L 25 10 L 25 30 Z",
    );
  });

  it("does not create an area without evaluation points", () => {
    expect(buildEvaluationAreaPath([], 30, 5, 25)).toBeNull();
  });
});
