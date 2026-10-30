// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchBoard, submitMove } from "../api/boardApi";
import { fetchGameSnapshot } from "../api/gameApi";
import type { MoveResult } from "../types";
import type { ChessBoardState } from "./useChessBoardState";
import type { ChessEngineState } from "./useChessEngineState";
import type { ChessGameState } from "./useChessGameState";
import { useChessMoveFlow } from "./useChessMoveFlow";

vi.mock("../../i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("../api/boardApi", () => ({
  fetchBoard: vi.fn(),
  fetchPossibleMoves: vi.fn(),
  submitMove: vi.fn(),
}));
vi.mock("../api/gameApi", () => ({ fetchGameSnapshot: vi.fn() }));
vi.mock("../api/analysisApi", () => ({ fetchAnalysisPossibleMoves: vi.fn() }));

function checkmateMove(): MoveResult {
  return {
    success: true,
    message: null,
    from: "d8",
    to: "d1",
    san: "Qd1#",
    sideToMove: "white",
    position: null,
    gameState: "CHECKMATE_BLACK_WINS",
    ply: 60,
    uci: "d8d1",
  };
}

describe("useChessMoveFlow lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchGameSnapshot).mockResolvedValue({
      importedAnalysisGame: true,
      game: {} as never,
    });
    vi.mocked(fetchBoard).mockResolvedValue({ pieces: [] });
  });

  it("ends live evaluation before any further engine move after checkmate", async () => {
    vi.mocked(submitMove).mockResolvedValue({
      ok: true,
      status: 200,
      data: checkmateMove(),
    });
    const updatePosition = vi.fn();
    const stopLiveEvaluation = vi.fn().mockResolvedValue(undefined);
    const requestComputerMoveIfEnabled = vi.fn().mockResolvedValue(undefined);
    const board = {
      uciAnalysisLoadedRef: { current: false },
      liveEvaluationPositionRef: { current: { uciMoves: [] } },
      latestMovePlyRef: { current: 0 },
      moveListReconcilePromiseRef: { current: null },
      setIsLoadingMoves: vi.fn(),
      setLoadError: vi.fn(),
      setPieces: vi.fn(),
      setLastMove: vi.fn(),
      setMoves: vi.fn(),
    } as unknown as ChessBoardState;
    const engine = {
      engineAutoUpdateRef: { current: true },
      liveEvaluationControllerRef: { current: { updatePosition } },
      setEngineAutoUpdate: vi.fn((value: boolean) => {
        engine.engineAutoUpdateRef.current = value;
      }),
      setLiveEvaluationBar: vi.fn(),
      setEvalError: vi.fn(),
      setIsLoadingEval: vi.fn(),
    } as unknown as ChessEngineState;
    const game = {
      gameEndStateRef: { current: null },
      setGameEndState: vi.fn((value: string | null) => {
        game.gameEndStateRef.current = value;
      }),
      setClock: vi.fn(),
      setShowGameEndDialog: vi.fn(),
      playGameSound: vi.fn().mockResolvedValue(undefined),
    } as unknown as ChessGameState;
    const loadClock = vi.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useChessMoveFlow({
      board,
      engine,
      game,
      analysis: {
        replayActiveRef: { current: false },
        replayFinished: false,
        selectedPosition: null,
        variationMovesRef: { current: [] },
        performVariationMove: vi.fn(),
        restoreAnnotations: vi.fn(),
      },
      requestComputerMoveIfEnabled,
      loadClock,
      setSelectedSquare: vi.fn(),
      updatePossibleTargets: vi.fn(),
      stopLiveEvaluation,
    }));

    await act(async () => { await result.current.performMove("d8", "d1"); });

    expect(game.setGameEndState).toHaveBeenCalledWith("CHECKMATE_BLACK_WINS");
    expect(engine.setEngineAutoUpdate).toHaveBeenCalledWith(false);
    expect(engine.setEvalError).toHaveBeenCalledWith(null);
    expect(stopLiveEvaluation).toHaveBeenCalledOnce();
    expect(game.setShowGameEndDialog).toHaveBeenCalledWith(true);
    expect(requestComputerMoveIfEnabled).not.toHaveBeenCalled();
    expect(updatePosition).not.toHaveBeenCalled();
  });
});
