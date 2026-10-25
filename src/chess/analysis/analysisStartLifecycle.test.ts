import { describe, expect, it, vi } from "vitest";
import { stopAnalysisCalculations } from "./analysisStartLifecycle";

describe("analysis start lifecycle", () => {
  it("attempts to stop every active calculation before a new analysis starts", async () => {
    const calls: string[] = [];
    const action = (name: string, error?: Error) => vi.fn(async () => {
      calls.push(name);
      if (error) throw error;
    });

    await stopAnalysisCalculations({
      cancelReplay: action("replay", new Error("already stopping")),
      stopAnalysisEvaluation: action("analysis-evaluation"),
      stopLiveEvaluation: action("live-evaluation"),
      disablePlayerEngines: action("player-engines"),
    });

    expect(calls).toEqual([
      "replay",
      "analysis-evaluation",
      "live-evaluation",
      "player-engines",
    ]);
  });
});
