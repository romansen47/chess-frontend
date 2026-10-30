import { describe, expect, it } from "vitest";

import { visibleLiveEvaluationError } from "./liveEvaluationError";

describe("visibleLiveEvaluationError", () => {
  it("keeps evaluation failures visible during an active game", () => {
    expect(visibleLiveEvaluationError("engine failed", null)).toBe("engine failed");
  });

  it.each(["WHITE_MATED", "BLACK_MATED", "STALEMATE", "LOST_ON_TIME"])(
    "hides evaluation failures after terminal state %s",
    (gameState) => {
      expect(visibleLiveEvaluationError("engine failed", gameState)).toBeNull();
    },
  );
});
