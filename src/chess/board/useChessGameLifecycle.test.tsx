// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createNewGame,
  fetchClock,
  fetchGameSettings,
  fetchGameSnapshot,
} from "../api/gameApi";
import { fetchOpenings } from "../api/openingApi";
import { createDefaultGameSettings } from "../game/gameDefaults";
import type { ChessBoardState } from "./useChessBoardState";
import type { ChessEngineState } from "./useChessEngineState";
import type { ChessGameState } from "./useChessGameState";
import { useChessGameLifecycle } from "./useChessGameLifecycle";

vi.mock("../../i18n/I18nProvider", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("../api/gameApi", () => ({
  createNewGame: vi.fn(),
  exportPgn: vi.fn(),
  fetchClock: vi.fn(),
  fetchGameSettings: vi.fn(),
  fetchGameSnapshot: vi.fn(),
  importPgn: vi.fn(),
}));
vi.mock("../api/openingApi", () => ({ fetchOpenings: vi.fn() }));
vi.mock("../api/programApi", () => ({
  terminateBackend: vi.fn(),
  terminateDevelopmentFrontend: vi.fn(),
}));

const emptySnapshot = {
  importedAnalysisGame: false,
  game: {
    totalPlies: 0,
    sideToMove: "white",
    position: "",
    moves: [],
    whitePlayerName: null,
    blackPlayerName: null,
    startingPositionId: 518,
  },
};

describe("useChessGameLifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchGameSettings).mockResolvedValue(createDefaultGameSettings());
    vi.mocked(fetchOpenings).mockResolvedValue([]);
    vi.mocked(fetchGameSnapshot).mockResolvedValue(emptySnapshot);
    vi.mocked(fetchClock).mockResolvedValue({
      whiteTime: 300,
      blackTime: 300,
      sideToMove: "white",
      whiteRunning: false,
      blackRunning: false,
      gameState: null,
      timeControl: "5+0",
      whitePlayerName: null,
      blackPlayerName: null,
      whitePlayerEngineName: null,
      blackPlayerEngineName: null,
    });
  });

  it("stops every active runtime before replacing the current game", async () => {
    const order: string[] = [];
    const settings = createDefaultGameSettings();
    vi.mocked(createNewGame).mockImplementation(async () => {
      order.push("create-game");
      return settings;
    });
    const board = {
      uciAnalysisLoaded: false,
      uciAnalysisLoadedRef: { current: false },
      liveEvaluationPositionRef: { current: null },
      latestMovePlyRef: { current: 0 },
      setMoves: vi.fn(),
      setPieces: vi.fn(),
      setLastMove: vi.fn(),
      setUciAnalysisLoaded: vi.fn(),
      setIsLoadingMoves: vi.fn(),
      setLoadError: vi.fn(),
      setHoverPreview: vi.fn(),
    } as unknown as ChessBoardState;
    const engine = {
      setEngineAutoUpdate: vi.fn(),
      setEngineEval: vi.fn(),
      resetEngineEvaluationHistory: vi.fn(),
      setLiveEvaluationBar: vi.fn(),
    } as unknown as ChessEngineState;
    const game = {
      setClock: vi.fn(),
      setClockError: vi.fn(),
      setGameEndState: vi.fn(),
      setShowGameEndDialog: vi.fn(),
      setGameSettings: vi.fn(),
      setGameSettingsError: vi.fn(),
      setOpenings: vi.fn(),
      setShowGameSettingsDialog: vi.fn(),
      setIsStartingNewGame: vi.fn(),
      uciFileInputRef: { current: null },
    } as unknown as ChessGameState;
    const analysis = {
      replayActiveRef: { current: false },
      restoreAnnotations: vi.fn(),
      restoreGameMetadata: vi.fn(),
      restoreReplayAfterReload: vi.fn().mockResolvedValue(undefined),
      setImportedPlayers: vi.fn(),
      setShowSettingsDialog: vi.fn(),
      stopEvaluation: vi.fn(async () => { order.push("stop-analysis"); }),
      resetState: vi.fn(() => { order.push("reset-analysis"); }),
      resetAnnotations: vi.fn(),
      setWhitePlayerName: vi.fn(),
      setBlackPlayerName: vi.fn(),
    };
    const options = {
      board,
      engine,
      game,
      analysis,
      whiteComputerEnabled: false,
      blackComputerEnabled: false,
      disablePlayerEngines: vi.fn(async () => { order.push("stop-players"); }),
      stopLiveEvaluation: vi.fn(async () => { order.push("stop-evaluation"); }),
      loadEngineConfigs: vi.fn().mockResolvedValue(undefined),
      requestComputerMoveIfEnabled: vi.fn(async () => { order.push("request-player"); }),
      synchronizeAfterMoveSequence: vi.fn(async () => { order.push("synchronize"); }),
      resetBoardInteraction: vi.fn(),
      loadBoardFromBackend: vi.fn().mockResolvedValue(undefined),
    };
    const { result } = renderHook(() => useChessGameLifecycle(options));
    await waitFor(() => expect(fetchGameSnapshot).toHaveBeenCalled());
    order.length = 0;
    vi.mocked(fetchGameSnapshot).mockClear();

    await act(async () => { await result.current.startNewGame(settings); });

    expect(order).toEqual([
      "stop-players",
      "stop-evaluation",
      "stop-analysis",
      "reset-analysis",
      "create-game",
      "request-player",
      "synchronize",
    ]);
    expect(board.setUciAnalysisLoaded).toHaveBeenCalledWith(false);
    expect(game.setGameEndState).toHaveBeenCalledWith(null);
  });
});
