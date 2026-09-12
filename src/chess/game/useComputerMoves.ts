import { useRef, useState } from "react";
import {
  cancelComputerMove,
  requestComputerMove as requestComputerMoveApi,
} from "../api/computerMoveApi";
import type { MoveResult, PieceColor } from "../types";

interface UseComputerMovesOptions {
  currentSideToMove: string | null | undefined;
  onMove: (move: MoveResult) => void;
  onGameEnd: (gameState: string | null | undefined) => boolean;
  onRefreshClock: () => Promise<unknown>;
  onSynchronize: () => Promise<void>;
  onError: (message: string | null) => void;
  onRecoverAfterSequenceError: () => Promise<void>;
}

interface ComputerMoveResult {
  gameEnded: boolean;
  sideToMove: string | null;
  success: boolean;
}

export interface ComputerMoveSequenceResult {
  gameEnded: boolean;
  sideToMove: PieceColor | null;
  moved: boolean;
}

export function useComputerMoves({
  currentSideToMove,
  onMove,
  onGameEnd,
  onRefreshClock,
  onSynchronize,
  onError,
  onRecoverAfterSequenceError,
}: UseComputerMovesOptions) {
  const [whiteComputerEnabled, setWhiteComputerEnabled] = useState(false);
  const [blackComputerEnabled, setBlackComputerEnabled] = useState(false);
  const [isComputerThinking, setIsComputerThinkingState] = useState(false);

  const whiteComputerEnabledRef = useRef(false);
  const blackComputerEnabledRef = useRef(false);
  const isComputerThinkingRef = useRef(false);
  const activeComputerMoveSideRef = useRef<PieceColor | null>(null);
  const computerMoveSequenceIdRef = useRef(0);

  function normalizeSide(side: string | null | undefined): PieceColor | null {
    if (!side) return null;
    const normalized = side.toLowerCase();
    return normalized === "white" || normalized === "black" ? normalized : null;
  }

  function isSideComputerControlled(side: string | null | undefined): boolean {
    const normalizedSide = normalizeSide(side);
    if (normalizedSide === "white") return whiteComputerEnabledRef.current;
    if (normalizedSide === "black") return blackComputerEnabledRef.current;
    return false;
  }

  function setComputerThinking(value: boolean) {
    isComputerThinkingRef.current = value;
    setIsComputerThinkingState(value);
    if (!value) activeComputerMoveSideRef.current = null;
  }

  function setComputerThinkingForSide(side: PieceColor | null, value: boolean) {
    activeComputerMoveSideRef.current = value ? side : null;
    setComputerThinking(value);
  }

  function invalidateComputerMoveSequences() {
    computerMoveSequenceIdRef.current += 1;
  }

  function isComputerMoveSequenceCurrent(sequenceId: number) {
    return computerMoveSequenceIdRef.current === sequenceId;
  }

  async function cancelPlayerEngine(side: PieceColor) {
    if (activeComputerMoveSideRef.current === side) {
      invalidateComputerMoveSequences();
      setComputerThinkingForSide(null, false);
    }
    try {
      const result = await cancelComputerMove(side);
      if (!result.ok) {
        console.warn(`[cancelPlayerEngine] backend returned HTTP ${result.status} for ${side}`);
      }
    } catch (error) {
      console.warn(`[cancelPlayerEngine] could not cancel ${side} engine`, error);
    }
  }

  function updateWhiteComputerEnabled(enabled: boolean) {
    whiteComputerEnabledRef.current = enabled;
    setWhiteComputerEnabled(enabled);
    if (!enabled) {
      void cancelPlayerEngine("white");
      return;
    }
    if (normalizeSide(currentSideToMove) === "white") runComputerMoveSequence("white");
  }

  function updateBlackComputerEnabled(enabled: boolean) {
    blackComputerEnabledRef.current = enabled;
    setBlackComputerEnabled(enabled);
    if (!enabled) {
      void cancelPlayerEngine("black");
      return;
    }
    if (normalizeSide(currentSideToMove) === "black") runComputerMoveSequence("black");
  }

  async function disablePlayerEngines() {
    whiteComputerEnabledRef.current = false;
    blackComputerEnabledRef.current = false;
    setWhiteComputerEnabled(false);
    setBlackComputerEnabled(false);
    await Promise.all([cancelPlayerEngine("white"), cancelPlayerEngine("black")]);
  }

  async function requestComputerMove(
    sequenceId: number,
    requestedSide: PieceColor | null,
  ): Promise<ComputerMoveResult> {
    try {
      setComputerThinkingForSide(requestedSide, true);
      onError(null);
      const result = await requestComputerMoveApi();
      const data = result.data;
      const sequenceCurrent = isComputerMoveSequenceCurrent(sequenceId);

      if (!result.ok || !data.success) {
        if (!sequenceCurrent) {
          return { gameEnded: false, sideToMove: data.sideToMove ?? null, success: false };
        }
        if (onGameEnd(data.gameState)) {
          await onRefreshClock();
          return { gameEnded: true, sideToMove: data.sideToMove ?? null, success: false };
        }
        const message = data.message || `HTTP ${result.status}`;
        if (message !== "Computer move was cancelled") onError(message);
        return { gameEnded: false, sideToMove: data.sideToMove ?? null, success: false };
      }

      // A successful stale response may already have changed the backend game.
      // Do not replay it blindly into the UI because a new game may have started
      // meanwhile. Reconcile from the authoritative snapshot instead.
      if (!sequenceCurrent) {
        await onSynchronize();
        return {
          gameEnded: Boolean(data.gameState),
          sideToMove: data.sideToMove ?? null,
          success: false,
        };
      }

      if (data.from && data.to) onMove(data);
      const gameEnded = onGameEnd(data.gameState);
      if (gameEnded) {
        return { gameEnded: true, sideToMove: data.sideToMove ?? null, success: true };
      }
      return { gameEnded: false, sideToMove: data.sideToMove ?? null, success: true };
    } catch (error) {
      console.error("[requestComputerMove] engine move failed:", error);
      onError("Failed to execute the engine move.");
      return { gameEnded: false, sideToMove: null, success: false };
    } finally {
      if (isComputerMoveSequenceCurrent(sequenceId)) setComputerThinkingForSide(null, false);
    }
  }

  async function requestComputerMoveIfEnabled(
    initialSideToMove: string | null | undefined,
    sequenceId: number = computerMoveSequenceIdRef.current,
  ): Promise<ComputerMoveSequenceResult> {
    let nextSide = normalizeSide(initialSideToMove);
    let moved = false;
    while (
      nextSide
      && isSideComputerControlled(nextSide)
      && !isComputerThinkingRef.current
      && isComputerMoveSequenceCurrent(sequenceId)
    ) {
      const result = await requestComputerMove(sequenceId, nextSide);
      if (!result.success || result.gameEnded) {
        return {
          gameEnded: result.gameEnded,
          sideToMove: normalizeSide(result.sideToMove),
          moved,
        };
      }
      moved = true;
      nextSide = normalizeSide(result.sideToMove);
    }
    return { gameEnded: false, sideToMove: nextSide, moved };
  }

  function runComputerMoveSequence(initialSideToMove: string | null | undefined) {
    // Enabling the other engine while one side is already thinking must not
    // invalidate the active sequence. The running loop will observe the updated
    // enabled-side refs before requesting the next move.
    if (isComputerThinkingRef.current) return;

    const sequenceId = computerMoveSequenceIdRef.current + 1;
    computerMoveSequenceIdRef.current = sequenceId;
    requestComputerMoveIfEnabled(initialSideToMove, sequenceId)
      .then(() => (isComputerMoveSequenceCurrent(sequenceId) ? onSynchronize() : undefined))
      .catch(async (error) => {
        if (!isComputerMoveSequenceCurrent(sequenceId)) return;
        console.error("[runComputerMoveSequence] error", error);
        onError("Failed to execute the engine move.");
        await onRecoverAfterSequenceError();
      });
  }

  return {
    whiteComputerEnabled,
    blackComputerEnabled,
    isComputerThinking,
    isSideComputerControlled,
    updateWhiteComputerEnabled,
    updateBlackComputerEnabled,
    disablePlayerEngines,
    requestComputerMoveIfEnabled,
    runComputerMoveSequence,
  };
}
