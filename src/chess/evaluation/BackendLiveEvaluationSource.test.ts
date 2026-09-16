import { afterEach, describe, expect, it, vi } from "vitest";

import type { EngineEvaluation } from "../types";
import {
  BackendLiveEvaluationSource,
  type BackendLiveEvaluationEvent,
} from "./BackendLiveEvaluationSource";

class FakeEventSource {
  readonly listeners = new Map<string, Set<(event: Event) => void>>();
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  addEventListener(type: string, listener: (event: Event) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: Event) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, event: Event = new Event(type)) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

const evaluation: EngineEvaluation = {
  eval: 0.35,
  bar: 0.54,
  engineName: "Stockfish",
  lines: [{ eval: 0.35, depth: 18, moves: "e2e4 e7e5" }],
};

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("BackendLiveEvaluationSource", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts backend polling and emits evaluation plus clamped SSE bars", async () => {
    vi.useFakeTimers();
    const eventSource = new FakeEventSource();
    const fetchEvaluation = vi.fn().mockResolvedValue(evaluation);
    const events: BackendLiveEvaluationEvent[] = [];

    const source = new BackendLiveEvaluationSource({
      fetchEvaluation,
      openEvaluationStream: () => eventSource as unknown as EventSource,
      stopEvaluation: vi.fn().mockResolvedValue(undefined),
    });
    source.subscribe((event) => events.push(event));

    source.start();
    await flushAsyncWork();

    expect(fetchEvaluation).toHaveBeenCalledTimes(1);
    expect(events).toContainEqual({
      type: "evaluation",
      evaluation,
    });

    eventSource.emit(
      "bar",
      new MessageEvent("bar", { data: JSON.stringify({ bar: 1.25 }) }),
    );
    expect(events).toContainEqual({ type: "bar", bar: 1 });

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchEvaluation).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchEvaluation).toHaveBeenCalledTimes(2);

    source.dispose();
  });

  it("keeps fast polling until usable engine lines arrive", async () => {
    vi.useFakeTimers();
    const eventSource = new FakeEventSource();
    const fetchEvaluation = vi.fn()
      .mockResolvedValueOnce({ ...evaluation, lines: [] })
      .mockResolvedValue(evaluation);

    const source = new BackendLiveEvaluationSource({
      fetchEvaluation,
      openEvaluationStream: () => eventSource as unknown as EventSource,
      stopEvaluation: vi.fn().mockResolvedValue(undefined),
    });

    source.start();
    await flushAsyncWork();
    expect(fetchEvaluation).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(250);
    expect(fetchEvaluation).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchEvaluation).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchEvaluation).toHaveBeenCalledTimes(3);

    source.dispose();
  });

  it("suspends transport without stopping the backend and stop does both", async () => {
    vi.useFakeTimers();
    const eventSource = new FakeEventSource();
    const stopEvaluation = vi.fn().mockResolvedValue(undefined);

    const source = new BackendLiveEvaluationSource({
      fetchEvaluation: vi.fn().mockResolvedValue(evaluation),
      openEvaluationStream: () => eventSource as unknown as EventSource,
      stopEvaluation,
    });

    source.start();
    await flushAsyncWork();
    source.suspend();

    expect(eventSource.closed).toBe(true);
    expect(stopEvaluation).not.toHaveBeenCalled();

    await source.stop();
    expect(stopEvaluation).toHaveBeenCalledTimes(1);
  });
});
