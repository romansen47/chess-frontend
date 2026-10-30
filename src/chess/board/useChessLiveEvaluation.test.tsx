// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveEvaluationListener } from "../evaluation/LiveEvaluationSource";
import type { ChessBoardState } from "./useChessBoardState";
import type { ChessEngineState } from "./useChessEngineState";
import type { ChessGameState } from "./useChessGameState";
import { useChessLiveEvaluation } from "./useChessLiveEvaluation";

vi.mock("../../i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

describe("useChessLiveEvaluation lifecycle", () => {
  let listener: LiveEvaluationListener | null;
  let controller: {
    subscribe: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    reselect: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    suspend: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    listener = null;
    controller = {
      subscribe: vi.fn((next: LiveEvaluationListener) => {
        listener = next;
        return vi.fn();
      }),
      start: vi.fn().mockResolvedValue(undefined),
      reselect: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      suspend: vi.fn(),
      dispose: vi.fn(),
    };
  });

  function createOptions(gameState: string | null = null) {
    const board = {
      liveEvaluationPositionRef: { current: { uciMoves: ["e2e4"] } },
      latestMovePlyRef: { current: 1 },
      uciAnalysisLoaded: false,
      uciAnalysisLoadedRef: { current: false },
    } as unknown as ChessBoardState;
    const engine = {
      liveEvaluationControllerRef: { current: controller },
      engineAutoUpdate: false,
      engineAutoUpdateRef: { current: false },
      setEngineAutoUpdate: vi.fn(),
      setEngineEval: vi.fn(),
      setEngineEvaluationPly: vi.fn(),
      resetEngineEvaluationHistory: vi.fn(),
      setLiveEvaluationBar: vi.fn(),
      setIsLoadingEval: vi.fn(),
      setEvalError: vi.fn(),
      recordEngineEvaluation: vi.fn(),
      setEngineConfigOverview: vi.fn(),
      setEngineConfigLoadError: vi.fn(),
      setEngineRuntimeAssignments: vi.fn(),
    } as unknown as ChessEngineState;
    const game = {
      clock: gameState ? { gameState } : null,
      gameEndStateRef: { current: gameState },
    } as unknown as ChessGameState;
    return {
      board,
      engine,
      game,
      analysisReplayActive: false,
      analysisReplayActiveRef: { current: false },
      setAnalysisSettings: vi.fn(),
    };
  }

  it("suppresses an evaluation error arriving after the game ended", () => {
    const options = createOptions("CHECKMATE");
    renderHook(() => useChessLiveEvaluation(options));
    vi.mocked(options.engine.setEvalError).mockClear();

    act(() => listener?.({ type: "error", error: new Error("late worker error") }));

    expect(options.engine.setEvalError).toHaveBeenCalledOnce();
    expect(options.engine.setEvalError).toHaveBeenCalledWith(null);
  });

  it("suspends evaluation and clears transient state when game end becomes visible", () => {
    const initial = createOptions(null);
    const { rerender } = renderHook(
      ({ gameState }: { gameState: string | null }) => {
        initial.game.clock = gameState ? { gameState } as never : null;
        initial.game.gameEndStateRef.current = gameState;
        return useChessLiveEvaluation(initial);
      },
      { initialProps: { gameState: null as string | null } },
    );
    controller.suspend.mockClear();
    vi.mocked(initial.engine.setEvalError).mockClear();
    vi.mocked(initial.engine.setIsLoadingEval).mockClear();

    rerender({ gameState: "CHECKMATE" });

    expect(controller.suspend).toHaveBeenCalled();
    expect(initial.engine.setEvalError).toHaveBeenCalledWith(null);
    expect(initial.engine.setIsLoadingEval).toHaveBeenCalledWith(false);
  });
});
