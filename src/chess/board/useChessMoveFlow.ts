import { useI18n } from "../../i18n/I18nProvider";
import { fetchAnalysisPossibleMoves } from "../api/analysisApi";
import { fetchBoard, fetchPossibleMoves, submitMove } from "../api/boardApi";
import { fetchGameSnapshot } from "../api/gameApi";
import { appendCanonicalMoveToLiveEvaluationPosition, createLiveEvaluationPosition } from "../evaluation/liveEvaluationPosition";
import { sameLiveEvaluationPosition } from "../evaluation/liveEvaluationUtils";
import { GAME_SOUND_SOURCES } from "../game/gameSounds";
import { mapImportedUciMovesToRows } from "../game/gameFormatters";
import { applyLocalMoveTransition, reconcilePieceSnapshot } from "./pieceTransitions";
import { mapBackendPiecesToLocalPieces } from "./positionUtils";
import { mergeAuthoritativeMoveRows } from "../game/moveListUtils";
import type { ClockState, MoveResult, PerformMoveOptions, PieceType } from "../types";
import type { ChessBoardState } from "./useChessBoardState";
import type { ChessEngineState } from "./useChessEngineState";
import type { ChessGameState } from "./useChessGameState";

interface AnalysisBridge {
  replayActiveRef: { current: boolean };
  replayFinished: boolean;
  selectedPosition: { ply: number } | null;
  variationMovesRef: { current: string[] };
  performVariationMove: (from: string, to: string, promotion?: PieceType) => Promise<void>;
}

interface Options {
  board: ChessBoardState;
  engine: ChessEngineState;
  game: ChessGameState;
  analysis: AnalysisBridge;
  requestComputerMoveIfEnabled: (sideToMove: string | null | undefined) => Promise<unknown>;
  loadClock: () => Promise<ClockState | null>;
  setSelectedSquare: (value: string | null) => void;
  updatePossibleTargets: (targets: string[]) => void;
  stopLiveEvaluation: () => Promise<void>;
}

export function useChessMoveFlow(options: Options) {
  const { board, engine, game, analysis } = options;
  const { t } = useI18n();

  async function playGameSound(sound: keyof typeof GAME_SOUND_SOURCES) {
    await game.playGameSound(sound, GAME_SOUND_SOURCES[sound] ?? []);
  }

  function playMoveResultSound(result: MoveResult) {
    const sound = /[x+#]/.test(result.san ?? "") ? "capture" : "move";
    void playGameSound(sound);
    if (result.gameState) window.setTimeout(() => { void playGameSound("notify"); }, 160);
  }

  function animateMoveLocally(from: string, to: string, promotion?: PieceType | null, position?: string | null) {
    board.setPieces((previous) => applyLocalMoveTransition(previous, from, to, promotion, position));
  }

  async function loadBoardFromBackend() {
    try {
      const data = await fetchBoard();
      const targetPieces = mapBackendPiecesToLocalPieces(data.pieces ?? []);
      board.setPieces((previous) => reconcilePieceSnapshot(previous, targetPieces));
    } catch (error) {
      console.error("[loadBoardFromBackend] error:", error);
      board.setLoadError(t("game.boardLoadFailed"));
    }
  }

  async function loadPossibleMoves(from: string): Promise<string[]> {
    try {
      board.setIsLoadingMoves(true);
      board.setLoadError(null);
      const data = analysis.replayActiveRef.current && analysis.replayFinished && analysis.selectedPosition
        ? await fetchAnalysisPossibleMoves({ anchorPly: analysis.selectedPosition.ply, moves: [...analysis.variationMovesRef.current], from })
        : await fetchPossibleMoves(from);
      const targets = data.targets ?? [];
      options.updatePossibleTargets(targets);
      return targets;
    } catch (error) {
      console.error("[loadPossibleMoves] failed to load possible moves:", error);
      board.setLoadError(t("game.possibleMovesFailed"));
      options.updatePossibleTargets([]);
      return [];
    } finally {
      board.setIsLoadingMoves(false);
    }
  }

  function reconcileMoveListFromBackend() {
    if (board.uciAnalysisLoadedRef.current) return Promise.resolve(board.liveEvaluationPositionRef.current);
    if (board.moveListReconcilePromiseRef.current) return board.moveListReconcilePromiseRef.current;
    const reconciliation = (async () => {
      try {
        const snapshot = await fetchGameSnapshot();
        if (snapshot.importedAnalysisGame) return null;
        const authoritativeMoves = snapshot.game.moves ?? [];
        const position = createLiveEvaluationPosition(authoritativeMoves);
        board.liveEvaluationPositionRef.current = position;
        const authoritativeRows = mapImportedUciMovesToRows(authoritativeMoves);
        const authoritativePly = authoritativeMoves.reduce(
          (maxPly, move) => Math.max(maxPly, Number.isFinite(move.ply) ? move.ply : 0), 0,
        );
        board.latestMovePlyRef.current = Math.max(board.latestMovePlyRef.current, authoritativePly);
        board.setMoves((current) => mergeAuthoritativeMoveRows(current, authoritativeRows));
        return position;
      } catch (error) {
        console.warn("[reconcileMoveListFromBackend] could not refresh move list", error);
        return null;
      }
    })().finally(() => {
      if (board.moveListReconcilePromiseRef.current === reconciliation) board.moveListReconcilePromiseRef.current = null;
    });
    board.moveListReconcilePromiseRef.current = reconciliation;
    return reconciliation;
  }

  async function synchronizeLiveEvaluationAfterCommittedMove(result: MoveResult) {
    let position = appendCanonicalMoveToLiveEvaluationPosition(
      board.liveEvaluationPositionRef.current, result.ply, result.uci,
    );
    if (position === null) position = await reconcileMoveListFromBackend();
    else board.liveEvaluationPositionRef.current = position;
    if (!position || !engine.engineAutoUpdateRef.current || game.gameEndStateRef.current || result.gameState) return;
    try {
      await engine.liveEvaluationControllerRef.current?.updatePosition(position);
    } catch (error) {
      console.warn("[synchronizeLiveEvaluationAfterCommittedMove] evaluation update failed", error);
      engine.setEvalError(t("evaluation.failed"));
    }
  }

  function addMoveToMoveList(result: MoveResult) {
    const san = result.san?.trim() || `${result.from}-${result.to}`;
    const position = result.position ?? undefined;
    const ply = typeof result.ply === "number" && Number.isInteger(result.ply) && result.ply > 0 ? result.ply : null;
    if (ply != null) {
      const previousPly = board.latestMovePlyRef.current;
      board.latestMovePlyRef.current = Math.max(previousPly, ply);
      const moveNumber = Math.ceil(ply / 2);
      board.setMoves((current) => {
        const copy = current.map((row) => ({ ...row }));
        let row = copy.find((candidate) => candidate.moveNumber === moveNumber);
        if (!row) { row = { moveNumber }; copy.push(row); }
        const uci = result.uci?.trim() || `${result.from}${result.to}`;
        if (ply % 2 === 1) Object.assign(row, { white: san, whiteUci: uci, whitePosition: position });
        else Object.assign(row, { black: san, blackUci: uci, blackPosition: position });
        return copy.sort((left, right) => left.moveNumber - right.moveNumber);
      });
      return;
    }
    const moverSide = result.sideToMove === "white" ? "black" : result.sideToMove === "black" ? "white" : null;
    board.setMoves((current) => {
      const copy = current.map((row) => ({ ...row }));
      const last = copy[copy.length - 1];
      const uci = result.uci?.trim() || `${result.from}${result.to}`;
      if (moverSide === "white") copy.push({ moveNumber: last ? last.moveNumber + 1 : 1, white: san, whiteUci: uci, whitePosition: position });
      else if (moverSide === "black" && last?.white && !last.black) Object.assign(last, { black: san, blackUci: uci, blackPosition: position });
      else if (moverSide === "black") copy.push({ moveNumber: last ? last.moveNumber + 1 : 1, black: san, blackUci: uci, blackPosition: position });
      else if (!last || last.black) copy.push({ moveNumber: last ? last.moveNumber + 1 : 1, white: san, whiteUci: uci, whitePosition: position });
      else Object.assign(last, { black: san, blackUci: uci, blackPosition: position });
      return copy;
    });
  }

  function handleGameEndState(gameState: string | null | undefined) {
    if (!gameState) return false;
    game.setGameEndState(gameState);
    engine.setEngineAutoUpdate(false);
    engine.setLiveEvaluationBar(null);
    void options.stopLiveEvaluation();
    game.setClock((previous) => previous ? { ...previous, gameState, whiteRunning: false, blackRunning: false } : previous);
    game.setShowGameEndDialog(true);
    return true;
  }

  async function handleComputerMove(data: MoveResult) {
    if (!data.from || !data.to) return;
    animateMoveLocally(data.from, data.to, null, data.position);
    board.setLastMove({ from: data.from, to: data.to });
    addMoveToMoveList(data);
    playMoveResultSound(data);
    await synchronizeLiveEvaluationAfterCommittedMove(data);
  }

  async function synchronizeAfterMoveSequence() {
    const previousPosition = board.liveEvaluationPositionRef.current;
    const position = await reconcileMoveListFromBackend();
    await loadBoardFromBackend();
    await options.loadClock();
    if (position && engine.engineAutoUpdateRef.current && !game.gameEndStateRef.current
      && !sameLiveEvaluationPosition(previousPosition, position)) {
      await engine.liveEvaluationControllerRef.current?.updatePosition(position);
    }
  }

  async function performMove(from: string, to: string, promotion?: PieceType, performOptions?: PerformMoveOptions) {
    try {
      board.setIsLoadingMoves(true);
      board.setLoadError(null);
      const result = await submitMove({ from, to, promotion: promotion ?? null });
      const data = result.data;
      if (!result.ok || !data.success) {
        if (handleGameEndState(data.gameState)) { await options.loadClock(); return; }
        board.setLoadError(data.message || `HTTP ${result.status}`);
        return;
      }
      if (!performOptions?.localMoveAlreadyApplied) animateMoveLocally(from, to, promotion, data.position);
      board.setLastMove({ from, to });
      options.setSelectedSquare(null);
      options.updatePossibleTargets([]);
      addMoveToMoveList(data);
      playMoveResultSound(data);
      await synchronizeLiveEvaluationAfterCommittedMove(data);
      if (handleGameEndState(data.gameState)) { await synchronizeAfterMoveSequence(); return; }
      await options.requestComputerMoveIfEnabled(data.sideToMove);
      board.setIsLoadingMoves(false);
      await synchronizeAfterMoveSequence();
    } catch (error) {
      console.error("[performMove] move execution failed:", error);
      board.setLoadError(t("game.moveFailed"));
    } finally {
      board.setIsLoadingMoves(false);
    }
  }

  async function performBoardMove(from: string, to: string, promotion?: PieceType) {
    if (analysis.replayActiveRef.current && analysis.replayFinished && analysis.selectedPosition) {
      await analysis.performVariationMove(from, to, promotion);
    } else {
      await performMove(from, to, promotion);
    }
  }

  return {
    playGameSound, animateMoveLocally, loadBoardFromBackend, loadPossibleMoves,
    handleGameEndState, handleComputerMove, synchronizeAfterMoveSequence,
    performMove, performBoardMove,
  };
}

export type ChessMoveFlow = ReturnType<typeof useChessMoveFlow>;
