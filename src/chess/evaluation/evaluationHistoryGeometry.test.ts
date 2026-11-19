import { describe, expect, it } from "vitest";
import {
  buildEvaluationAreaPath,
  buildMonotoneCurveSegments,
} from "./evaluationHistoryGeometry";

describe("evaluation history geometry", () => {
  it("rounds local extrema with a horizontal tangent", () => {
    const segments = buildMonotoneCurveSegments([
      { x: 10, y: 20 },
      { x: 20, y: 10 },
      { x: 30, y: 20 },
    ]);

    expect(segments[0].control2.y).toBe(10);
    expect(segments[1].control1.y).toBe(10);
  });

  it("keeps control points within neighboring evaluation values", () => {
    const segments = buildMonotoneCurveSegments([
      { x: 0, y: 0 },
      { x: 10, y: 100 },
      { x: 20, y: 110 },
      { x: 30, y: 200 },
    ]);

    for (const [index, segment] of segments.entries()) {
      const startY = [0, 100, 110][index];
      const minimum = Math.min(startY, segment.end.y);
      const maximum = Math.max(startY, segment.end.y);
      expect(segment.control1.y).toBeGreaterThanOrEqual(minimum);
      expect(segment.control1.y).toBeLessThanOrEqual(maximum);
      expect(segment.control2.y).toBeGreaterThanOrEqual(minimum);
      expect(segment.control2.y).toBeLessThanOrEqual(maximum);
    }
  });

  it("builds the area edge from cubic curve segments", () => {
    const path = buildEvaluationAreaPath(
      [{ x: 10, y: 20 }, { x: 20, y: 10 }],
      30,
      5,
      25,
    );

    expect(path).toContain("C");
    expect(path).toContain("20 10");
  });

  it("does not create an area without evaluation points", () => {
    expect(buildEvaluationAreaPath([], 30, 5, 25)).toBeNull();
  });
});
