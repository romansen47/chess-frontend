// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelComputerMove,
  requestComputerMove,
} from "../api/computerMoveApi";
import type { MoveResult } from "../types";
import { useComputerMoves } from "./useComputerMoves";

vi.mock("../api/computerMoveApi", () => ({
  cancelComputerMove: vi.fn(),
  requestComputerMove: vi.fn(),
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function successfulMove(): MoveResult {
  return {
    success: true,
    message: null,
    from: "e2",
    to: "e4",
    san: "e4",
    sideToMove: "black",
    gameState: null,
    ply: 1,
    uci: "e2e4",
  };
}

describe("useComputerMoves lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cancelComputerMove).mockResolvedValue({ ok: true, status: 200 });
  });

  it("reconciles but never applies a stale engine response after engines were disabled", async () => {
    const pendingMove = deferred<Awaited<ReturnType<typeof requestComputerMove>>>();
    vi.mocked(requestComputerMove).mockReturnValue(pendingMove.promise);
    const onMove = vi.fn();
    const onSynchronize = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useComputerMoves({
      currentSideToMove: "white",
      onMove,
      onGameEnd: vi.fn(() => false),
      onRefreshClock: vi.fn().mockResolvedValue(undefined),
      onSynchronize,
      onError: vi.fn(),
      onRecoverAfterSequenceError: vi.fn().mockResolvedValue(undefined),
    }));

    act(() => result.current.updateWhiteComputerEnabled(true));
    await waitFor(() => expect(requestComputerMove).toHaveBeenCalledOnce());

    await act(async () => { await result.current.disablePlayerEngines(); });
    await act(async () => {
      pendingMove.resolve({ ok: true, status: 200, data: successfulMove() });
      await pendingMove.promise;
    });

    await waitFor(() => expect(onSynchronize).toHaveBeenCalledOnce());
    expect(onMove).not.toHaveBeenCalled();
    expect(result.current.isComputerThinking).toBe(false);
  });
});
