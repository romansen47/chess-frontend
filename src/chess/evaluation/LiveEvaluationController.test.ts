import { describe, expect, it, vi } from "vitest";

import type { EngineCapabilities } from "../api/engineContracts";
import { EngineUnavailableApiError } from "../api/engineErrors";
import type {
  LiveEvaluationEvent,
  LiveEvaluationListener,
  LiveEvaluationPosition,
  LiveEvaluationSource,
} from "./LiveEvaluationSource";
import { LiveEvaluationController } from "./LiveEvaluationController";

const position: LiveEvaluationPosition = {
  uciMoves: ["e2e4", "e7e5"],
};

const availableCapabilities: EngineCapabilities = {
  whitePlayer: { configured: false, available: false, reason: "NOT_CONFIGURED" },
  blackPlayer: { configured: false, available: false, reason: "NOT_CONFIGURED" },
  evaluation: { configured: true, available: true, reason: "AVAILABLE" },
  deepAnalysis: { configured: false, available: false, reason: "NOT_CONFIGURED" },
};

const unavailableCapabilities: EngineCapabilities = {
  ...availableCapabilities,
  evaluation: {
    configured: false,
    available: false,
    reason: "NOT_CONFIGURED",
  },
};

class FakeSource implements LiveEvaluationSource {
  readonly starts: LiveEvaluationPosition[] = [];
  readonly updates: LiveEvaluationPosition[] = [];
  readonly listeners = new Set<LiveEvaluationListener>();
  refreshCount = 0;
  suspendCount = 0;
  stopCount = 0;
  disposeCount = 0;

  subscribe(listener: LiveEvaluationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(value: LiveEvaluationPosition): void {
    this.starts.push(value);
  }

  updatePosition(value: LiveEvaluationPosition): void {
    this.updates.push(value);
  }

  refresh(): void {
    this.refreshCount++;
  }

  suspend(): void {
    this.suspendCount++;
  }

  async stop(): Promise<void> {
    this.stopCount++;
  }

  dispose(): void {
    this.disposeCount++;
    this.listeners.clear();
  }

  emit(event: LiveEvaluationEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

describe("LiveEvaluationController", () => {
  it("selects the backend source when evaluation is available", async () => {
    const backend = new FakeSource();
    const browser = new FakeSource();
    const createBrowserSource = vi.fn(() => browser);
    const controller = new LiveEvaluationController({
      backendSource: backend,
      createBrowserSource,
      fetchCapabilities: vi.fn().mockResolvedValue(availableCapabilities),
    });

    await controller.start(position);

    expect(backend.starts).toEqual([position]);
    expect(createBrowserSource).not.toHaveBeenCalled();
  });

  it("selects the browser source when backend evaluation is unavailable", async () => {
    const backend = new FakeSource();
    const browser = new FakeSource();
    const createBrowserSource = vi.fn(() => browser);
    const controller = new LiveEvaluationController({
      backendSource: backend,
      createBrowserSource,
      fetchCapabilities: vi.fn().mockResolvedValue(unavailableCapabilities),
    });

    await controller.start(position);

    expect(backend.starts).toHaveLength(0);
    expect(createBrowserSource).toHaveBeenCalledTimes(1);
    expect(browser.starts).toEqual([position]);
  });

  it("falls back to browser only for EVALUATION ENGINE_UNAVAILABLE", async () => {
    const backend = new FakeSource();
    const browser = new FakeSource();
    const controller = new LiveEvaluationController({
      backendSource: backend,
      createBrowserSource: () => browser,
      fetchCapabilities: vi.fn().mockResolvedValue(availableCapabilities),
    });

    await controller.start(position);

    backend.emit({
      type: "error",
      error: new EngineUnavailableApiError(
        "EVALUATION",
        "Native evaluation engine unavailable",
      ),
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(backend.stopCount).toBe(1);
    expect(browser.starts).toEqual([position]);
  });

  it("does not fall back for unrelated backend errors", async () => {
    const backend = new FakeSource();
    const browser = new FakeSource();
    const createBrowserSource = vi.fn(() => browser);
    const events: LiveEvaluationEvent[] = [];
    const controller = new LiveEvaluationController({
      backendSource: backend,
      createBrowserSource,
      fetchCapabilities: vi.fn().mockResolvedValue(availableCapabilities),
    });
    controller.subscribe((event) => events.push(event));

    await controller.start(position);
    const failure = new Error("HTTP 500");
    backend.emit({ type: "error", error: failure });

    expect(createBrowserSource).not.toHaveBeenCalled();
    expect(events).toContainEqual({ type: "error", error: failure });
  });

  it("cancels an in-flight capability selection when suspended", async () => {
    const backend = new FakeSource();
    const browser = new FakeSource();
    const capabilities = deferred<EngineCapabilities>();
    const controller = new LiveEvaluationController({
      backendSource: backend,
      createBrowserSource: () => browser,
      fetchCapabilities: () => capabilities.promise,
    });

    const startPromise = controller.start(position);
    controller.suspend();
    capabilities.resolve(availableCapabilities);
    await startPromise;

    expect(backend.starts).toHaveLength(0);
    expect(browser.starts).toHaveLength(0);
  });

  it("reselects the source after an engine configuration change", async () => {
    const backend = new FakeSource();
    const browser = new FakeSource();
    const fetchCapabilities = vi.fn()
      .mockResolvedValueOnce(availableCapabilities)
      .mockResolvedValueOnce(unavailableCapabilities);
    const controller = new LiveEvaluationController({
      backendSource: backend,
      createBrowserSource: () => browser,
      fetchCapabilities,
    });

    await controller.start(position);
    await controller.reselect({ uciMoves: [...position.uciMoves, "g1f3"] });

    expect(backend.stopCount).toBe(1);
    expect(browser.starts).toEqual([
      { uciMoves: ["e2e4", "e7e5", "g1f3"] },
    ]);
  });
});
