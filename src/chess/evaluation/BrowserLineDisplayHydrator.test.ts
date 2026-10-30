import { afterEach, describe, expect, it, vi } from "vitest";

import type { EngineLine } from "../types";
import { BrowserLineDisplayHydrator } from "./BrowserLineDisplayHydrator";

const line = (moves: string): EngineLine => ({ eval: 0, depth: 10, moves });
const position = { initialFen: "fen", uciMoves: [] };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => { resolve = accept; });
  return { promise, resolve };
}

describe("BrowserLineDisplayHydrator", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces queued updates while a request is running", async () => {
    const first = deferred<EngineLine[]>();
    const second = deferred<EngineLine[]>();
    const hydrate = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const onSuccess = vi.fn();
    const hydrator = new BrowserLineDisplayHydrator(hydrate, 0);

    hydrator.submit(position, [line("a2a3")], onSuccess);
    hydrator.submit(position, [line("b2b3")], onSuccess);
    hydrator.submit(position, [line("c2c3")], onSuccess);
    expect(hydrate).toHaveBeenCalledTimes(1);

    first.resolve([line("a3")]);
    await vi.waitFor(() => expect(hydrate).toHaveBeenCalledTimes(2));
    expect(hydrate.mock.calls[1][1]).toEqual([line("c2c3")]);

    second.resolve([line("c3")]);
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(2));
    hydrator.dispose();
  });

  it("ignores an in-flight response after cancellation", async () => {
    const result = deferred<EngineLine[]>();
    const onSuccess = vi.fn();
    const hydrator = new BrowserLineDisplayHydrator(() => result.promise, 0);

    hydrator.submit(position, [line("a2a3")], onSuccess);
    hydrator.cancel();
    result.resolve([line("a3")]);
    await Promise.resolve();
    await Promise.resolve();

    expect(onSuccess).not.toHaveBeenCalled();
    hydrator.dispose();
  });

  it("starts at most one request per configured interval", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const hydrate = vi.fn(async (_position, lines: readonly EngineLine[]) => [...lines]);
    const hydrator = new BrowserLineDisplayHydrator(hydrate, 500);

    hydrator.submit(position, [line("a2a3")], vi.fn());
    await vi.runAllTicks();
    hydrator.submit(position, [line("b2b3")], vi.fn());
    await vi.advanceTimersByTimeAsync(499);
    expect(hydrate).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(hydrate).toHaveBeenCalledTimes(2);
    hydrator.dispose();
  });
});
