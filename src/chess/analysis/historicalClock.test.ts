import { describe, expect, it } from "vitest";
import { historicalClock } from "./historicalClock";
import { gameAnnotationRecord, isEmptyGameAnnotation } from "./annotationUtils";
import type { GameAnnotation } from "../types";

function annotation(ply: number, clockMillis: number | null): GameAnnotation {
  return { ply, clockMillis, elapsedMoveMillis: null, nag: null, comment: null, evaluation: null, variations: [] };
}

const annotations = gameAnnotationRecord([
  annotation(1, 300000), annotation(2, 295000), annotation(3, 280125), annotation(4, 0),
]);

describe("historical clocks", () => {
  it("uses the selected move and the opponent's preceding move when jumping in either direction", () => {
    expect(historicalClock(annotations, 4)).toMatchObject({ whiteTime: 280.125, blackTime: 0, whiteRunning: false, blackRunning: false });
    expect(historicalClock(annotations, 1)).toMatchObject({ whiteTime: 300, blackTime: null });
    expect(historicalClock(annotations, 3)).toMatchObject({ whiteTime: 280.125, blackTime: 295 });
    expect(historicalClock(annotations, 0)).toMatchObject({ whiteTime: null, blackTime: null });
  });

  it("does not substitute an earlier timestamp for missing data or invent variation clocks", () => {
    const gap = { ...annotations, 3: annotation(3, null) };
    expect(historicalClock(gap, 3)).toMatchObject({ whiteTime: null, blackTime: 295 });
    expect(historicalClock(annotations, 3, 1)).toMatchObject({ whiteTime: null, blackTime: null, sideToMove: null });
    expect(historicalClock({}, 3)).toBeNull();
  });

  it("preserves time-only annotations, zero times and introductory comments", () => {
    expect(isEmptyGameAnnotation(annotation(4, 0))).toBe(false);
    expect(isEmptyGameAnnotation({ ...annotation(1, null), elapsedMoveMillis: 0 })).toBe(false);
    expect(isEmptyGameAnnotation(annotation(1, null))).toBe(true);
    const intro = { ...annotation(0, null), comment: "Introduction" };
    expect(gameAnnotationRecord([intro])[0]).toEqual(intro);
  });
});
