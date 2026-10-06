import { describe, expect, it } from "vitest";
import {
  recordEvaluationHistoryPoint,
  resetEvaluationHistoryForPly,
} from "./evaluationHistory";
import type { EngineEvaluation } from "../types";

function evaluation(
  value: number,
  depth: number,
): EngineEvaluation {
  return {
    eval: value,
    bar: 0.5,
    lines: [{
      eval: value,
      depth,
      moves: "",
      positions: [],
    }],
  };
}

describe("live evaluation history", () => {
  it("updates the current ply while preserving earlier plies", () => {
    let history = recordEvaluationHistoryPoint([], 1, evaluation(0.2, 10));
    history = recordEvaluationHistoryPoint(history, 1, evaluation(0.35, 14));
    history = recordEvaluationHistoryPoint(history, 2, evaluation(-0.1, 11));

    expect(history).toEqual([
      { ply: 1, evaluation: 0.35, depth: 14 },
      { ply: 2, evaluation: -0.1, depth: 11 },
    ]);
  });

  it("can discard evaluations beyond the authoritative current ply", () => {
    const history = [
      { ply: 1, evaluation: 0.2, depth: 10 },
      { ply: 2, evaluation: 0.1, depth: 12 },
      { ply: 3, evaluation: -0.1, depth: 13 },
    ];

    expect(resetEvaluationHistoryForPly(history, 2)).toEqual(history.slice(0, 2));
  });
});
