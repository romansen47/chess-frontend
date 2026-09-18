import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BrowserUciEngine,
  type BrowserUciEvaluation,
  type BrowserUciWorker,
} from "./BrowserUciEngine";

const POSITION_518_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w HAha - 0 1";

function position518(uciMoves: string[]) {
  return { uciMoves, initialFen: POSITION_518_FEN, chess960: true };
}

class FakeWorker implements BrowserUciWorker {
  readonly commands: string[] = [];
  readonly listeners = new Set<(event: MessageEvent<string>) => void>();
  terminated = false;
  autoHandshake = true;

  postMessage(command: string): void {
    this.commands.push(command);
    if (!this.autoHandshake) return;
    if (command === "uci") {
      this.emit("id name Stockfish Browser Test\nuciok");
    } else if (command === "isready") {
      this.emit("readyok");
    } else if (command === "stop") {
      this.emit("bestmove 0000");
    }
  }

  addEventListener(type: "message", listener: (event: MessageEvent<string>) => void): void {
    if (type === "message") this.listeners.add(listener);
  }

  removeEventListener(type: "message", listener: (event: MessageEvent<string>) => void): void {
    if (type === "message") this.listeners.delete(listener);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(data: string): void {
    const event = { data } as MessageEvent<string>;
    for (const listener of this.listeners) listener(event);
  }
}

describe("BrowserUciEngine", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("performs UCI handshake lazily and starts position-518 infinite analysis", async () => {
    const worker = new FakeWorker();
    const engine = new BrowserUciEngine(() => worker);
    const updates: BrowserUciEvaluation[] = [];

    await engine.startInfinite(
      position518(["e2e4", "e7e5", "g1f3"]),
      { multiPv: 2 },
      (evaluation) => updates.push(evaluation),
    );

    expect(engine.name).toBe("Stockfish Browser Test");
    expect(worker.commands).toEqual([
      "uci",
      "isready",
      "setoption name MultiPV value 2",
      "setoption name UCI_Chess960 value true",
      "isready",
      `position fen ${POSITION_518_FEN} moves e2e4 e7e5 g1f3`,
      "go infinite",
    ]);

    worker.emit("info depth 14 multipv 1 score cp 45 pv g8f6 f1b5");
    worker.emit("info depth 14 multipv 2 score cp 20 pv b8c6 f1b5");

    expect(updates).toEqual([{
      engineName: "Stockfish Browser Test",
      lines: [
        { eval: -0.45, depth: 14, mateDistance: null, moves: "g8f6 f1b5" },
        { eval: -0.2, depth: 14, mateDistance: null, moves: "b8c6 f1b5" },
      ],
    }]);
  });

  it("uses FEN and UCI_Chess960 for a Chess960 position", async () => {
    const worker = new FakeWorker();
    const engine = new BrowserUciEngine(() => worker);
    const fen = "bbqnnrkr/pppppppp/8/8/8/8/PPPPPPPP/BBQNNRKR w HFhf - 0 1";

    await engine.startInfinite(
      { uciMoves: ["a2a4"], initialFen: fen, chess960: true },
      { multiPv: 1 },
      () => undefined,
    );

    expect(worker.commands).toContain("setoption name UCI_Chess960 value true");
    expect(worker.commands).toContain(`position fen ${fen} moves a2a4`);
  });

  it("requires an explicit FEN for every browser evaluation", async () => {
    const engine = new BrowserUciEngine(() => new FakeWorker());
    await expect(engine.startInfinite(
      { uciMoves: [], chess960: true },
      { multiPv: 1 },
      () => undefined,
    )).rejects.toThrow("Browser evaluation requires the explicit initial FEN");
  });

  it("uses explicit FEN without moves for a new position-518 game", async () => {
    const worker = new FakeWorker();
    const engine = new BrowserUciEngine(() => worker);
    await engine.startInfinite(position518([]), { multiPv: 1 }, () => undefined);
    expect(worker.commands).toContain(`position fen ${POSITION_518_FEN}`);
    expect(worker.commands).not.toContain("position startpos");
  });

  it("ignores stale info after stop", async () => {
    const worker = new FakeWorker();
    const engine = new BrowserUciEngine(() => worker);
    const listener = vi.fn();
    await engine.startInfinite(position518(["e2e4"]), { multiPv: 1 }, listener);
    await engine.stop();
    worker.emit("info depth 12 score cp 80 pv e7e5");
    expect(worker.commands.at(-1)).toBe("stop");
    expect(listener).not.toHaveBeenCalled();
  });

  it("stops the previous search before starting a replacement", async () => {
    const worker = new FakeWorker();
    const engine = new BrowserUciEngine(() => worker);
    await engine.startInfinite(position518(["e2e4"]), { multiPv: 1 }, () => undefined);
    await engine.startInfinite(position518(["d2d4"]), { multiPv: 1 }, () => undefined);
    const secondPositionIndex = worker.commands.lastIndexOf(
      `position fen ${POSITION_518_FEN} moves d2d4`,
    );
    expect(secondPositionIndex).toBeGreaterThan(0);
    expect(worker.commands.slice(0, secondPositionIndex)).toContain("stop");
  });

  it("serializes rapid replacement searches", async () => {
    const worker = new FakeWorker();
    const engine = new BrowserUciEngine(() => worker);
    await engine.startInfinite(position518(["e2e4"]), { multiPv: 1 }, () => undefined);
    const second = engine.startInfinite(position518(["d2d4"]), { multiPv: 1 }, () => undefined);
    const third = engine.startInfinite(position518(["c2c4"]), { multiPv: 1 }, () => undefined);
    await Promise.all([second, third]);
    expect(worker.commands).not.toContain(
      `position fen ${POSITION_518_FEN} moves d2d4`,
    );
    expect(worker.commands.at(-2)).toBe(
      `position fen ${POSITION_518_FEN} moves c2c4`,
    );
    expect(worker.commands.at(-1)).toBe("go infinite");
  });

  it("terminates the worker and rejects use after dispose", async () => {
    const worker = new FakeWorker();
    const engine = new BrowserUciEngine(() => worker);
    await engine.initialize();
    engine.dispose();
    expect(worker.commands.at(-1)).toBe("quit");
    expect(worker.terminated).toBe(true);
    await expect(engine.startInfinite(
      { uciMoves: [] },
      { multiPv: 1 },
      () => undefined,
    )).rejects.toThrow("BrowserUciEngine is disposed");
  });

  it("fails initialization when the UCI handshake times out", async () => {
    vi.useFakeTimers();
    const worker = new FakeWorker();
    worker.autoHandshake = false;
    const engine = new BrowserUciEngine(() => worker, { handshakeTimeoutMs: 100 });
    const initialization = engine.initialize();
    const expectation = expect(initialization).rejects.toThrow("Timed out waiting for UCI uciok");
    await vi.advanceTimersByTimeAsync(100);
    await expectation;
    expect(worker.terminated).toBe(true);
  });
});
