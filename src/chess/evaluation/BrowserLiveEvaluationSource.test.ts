import { describe, expect, it, vi } from "vitest";

import type {
  BrowserUciAnalysisOptions,
  BrowserUciEvaluationListener,
} from "../engine/browser/BrowserUciEngine";
import {
  BROWSER_LIVE_EVALUATION_MULTIPV,
  BrowserLiveEvaluationSource,
} from "./BrowserLiveEvaluationSource";
import type {
  LiveEvaluationEvent,
  LiveEvaluationPosition,
} from "./LiveEvaluationSource";
import type { EngineLine } from "../types";
import { evaluationToBar } from "./evaluationBar";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w HAha - 0 1";

class FakeBrowserEngine {
  starts: Array<{
    position: LiveEvaluationPosition;
    options: BrowserUciAnalysisOptions;
  }> = [];
  listener: BrowserUciEvaluationListener | null = null;
  stopCount = 0;
  disposeCount = 0;

  async startInfinite(
    position: LiveEvaluationPosition,
    options: BrowserUciAnalysisOptions,
    listener: BrowserUciEvaluationListener,
  ): Promise<void> {
    this.starts.push({
      position: { uciMoves: [...position.uciMoves] },
      options: { ...options },
    });
    this.listener = listener;
  }

  async stop(): Promise<void> {
    this.stopCount++;
  }

  dispose(): void {
    this.disposeCount++;
  }

  emit(evalValue: number, depth = 15): void {
    this.listener?.({
      engineName: "Stockfish 19 Lite",
      lines: [
        { eval: evalValue, depth, mateDistance: null, moves: "e2e4 e7e5" },
        { eval: evalValue - 0.1, depth, mateDistance: null, moves: "d2d4 d7d5" },
        { eval: evalValue - 0.2, depth, mateDistance: null, moves: "g1f3 g8f6" },
      ],
    });
  }
}

describe("BrowserLiveEvaluationSource", () => {
  it("creates Stockfish lazily and emits CAT evaluation semantics", async () => {
    const engine = new FakeBrowserEngine();
    const createEngine = vi.fn(() => engine);
    const events: LiveEvaluationEvent[] = [];
    const source = new BrowserLiveEvaluationSource(createEngine);
    source.subscribe((event) => events.push(event));

    expect(createEngine).not.toHaveBeenCalled();
    await source.start({ uciMoves: ["e2e4", "e7e5"] });

    expect(createEngine).toHaveBeenCalledTimes(1);
    expect(engine.starts[0]).toEqual({
      position: { uciMoves: ["e2e4", "e7e5"] },
      options: { multiPv: BROWSER_LIVE_EVALUATION_MULTIPV },
    });

    engine.emit(0.75, 18);
    const bar = evaluationToBar(0.75);

    expect(events).toContainEqual({ type: "bar", bar });
    expect(events).toContainEqual({
      type: "evaluation",
      evaluation: {
        eval: 0.75,
        bar,
        engineName: "Stockfish 19 Lite (Browser)",
        lines: [
          { eval: 0.75, depth: 18, mateDistance: null, moves: "e2e4 e7e5", positions: undefined, moveArrows: undefined },
          { eval: 0.65, depth: 18, mateDistance: null, moves: "d2d4 d7d5", positions: undefined, moveArrows: undefined },
          { eval: 0.55, depth: 18, mateDistance: null, moves: "g1f3 g8f6", positions: undefined, moveArrows: undefined },
        ],
      },
    });
  });

  it("restarts with the updated authoritative position", async () => {
    const engine = new FakeBrowserEngine();
    const source = new BrowserLiveEvaluationSource(() => engine);

    await source.start({ uciMoves: ["e2e4"] });
    await source.updatePosition({ uciMoves: ["e2e4", "e7e5"] });

    expect(engine.starts).toHaveLength(2);
    expect(engine.starts[1].position).toEqual({
      uciMoves: ["e2e4", "e7e5"],
    });
  });

  it("ignores stale updates after suspension", async () => {
    const engine = new FakeBrowserEngine();
    const events: LiveEvaluationEvent[] = [];
    const source = new BrowserLiveEvaluationSource(() => engine);
    source.subscribe((event) => events.push(event));

    await source.start({ uciMoves: [] });
    source.suspend();
    const count = events.length;
    engine.emit(1.2);

    expect(events).toHaveLength(count);
    expect(engine.stopCount).toBe(1);
  });

  it("stops and disposes on explicit stop, then recreates on restart", async () => {
    const first = new FakeBrowserEngine();
    const second = new FakeBrowserEngine();
    const createEngine = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const source = new BrowserLiveEvaluationSource(createEngine);

    await source.start({ uciMoves: [] });
    await source.stop();
    await source.start({ uciMoves: ["d2d4"] });

    expect(first.stopCount).toBe(1);
    expect(first.disposeCount).toBe(1);
    expect(createEngine).toHaveBeenCalledTimes(2);
    expect(second.starts[0].position).toEqual({ uciMoves: ["d2d4"] });
  });

  it("adds SAN, board positions and arrows without replacing newer scores", async () => {
    const engine = new FakeBrowserEngine();
    let finishHydration!: (value: EngineLine[]) => void;
    const hydrate = vi.fn(() => new Promise<EngineLine[]>(
      (resolve) => { finishHydration = resolve; },
    ));
    const events: LiveEvaluationEvent[] = [];
    const source = new BrowserLiveEvaluationSource(() => engine, 3, hydrate, 0);
    source.subscribe((event) => events.push(event));
    await source.start({ initialFen: INITIAL_FEN, uciMoves: [] });

    engine.emit(0.5, 12);
    engine.emit(0.8, 14);
    finishHydration([
      {
        eval: 0.5,
        depth: 12,
        moves: "e4 e5",
        positions: ["start", "after-e4", "after-e5"],
        moveArrows: [{ from: "e2", to: "e4" }, { from: "e7", to: "e5" }],
      },
      { eval: 0.4, depth: 12, moves: "d4 d5", positions: ["start"], moveArrows: [] },
      { eval: 0.3, depth: 12, moves: "♘f3 ♞f6", positions: ["start"], moveArrows: [] },
    ]);
    await vi.waitFor(() => {
      const evaluations = events.filter((event) => event.type === "evaluation");
      expect(evaluations).toHaveLength(3);
    });

    const evaluationEvent = events.filter((event) => event.type === "evaluation").at(-1);
    expect(evaluationEvent?.type).toBe("evaluation");
    if (evaluationEvent?.type !== "evaluation") throw new Error("Missing evaluation");
    expect(evaluationEvent.evaluation.eval).toBe(0.8);
    expect(evaluationEvent.evaluation.lines[0]).toMatchObject({
      eval: 0.8,
      depth: 14,
      moves: "e4 e5",
      positions: ["start", "after-e4", "after-e5"],
      moveArrows: [{ from: "e2", to: "e4" }, { from: "e7", to: "e5" }],
    });
  });
});
