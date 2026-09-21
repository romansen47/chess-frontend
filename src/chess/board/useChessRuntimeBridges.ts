import { useRef } from "react";
import type { AnalysisInteractionContext } from "./boardInteractionTypes";
import type { ChessGameLifecycle } from "./useChessGameLifecycle";
import type { ChessLiveEvaluation } from "./useChessLiveEvaluation";
import type { ChessMoveFlow } from "./useChessMoveFlow";

type MoveRuntime = Pick<
  ChessMoveFlow,
  | "playGameSound"
  | "animateMoveLocally"
  | "loadBoardFromBackend"
  | "loadPossibleMoves"
  | "handleGameEndState"
  | "handleComputerMove"
  | "synchronizeAfterMoveSequence"
  | "performMove"
  | "performBoardMove"
>;

type LiveRuntime = Pick<ChessLiveEvaluation, "stopLiveEvaluation">;
type LifecycleRuntime = Pick<ChessGameLifecycle, "loadClock">;

const EMPTY_MOVE_RUNTIME: MoveRuntime = {
  playGameSound: async () => undefined,
  animateMoveLocally: () => undefined,
  loadBoardFromBackend: async () => undefined,
  loadPossibleMoves: async () => [],
  handleGameEndState: () => false,
  handleComputerMove: async () => undefined,
  synchronizeAfterMoveSequence: async () => undefined,
  performMove: async () => undefined,
  performBoardMove: async () => undefined,
};

const EMPTY_ANALYSIS_INTERACTION: AnalysisInteractionContext = {
  replayActive: false,
  replayActiveCurrent: false,
  replayFinished: false,
  selectedPosition: null,
  variationMoveCount: 0,
  variationGameState: null,
  replayRunning: false,
};

export function useChessRuntimeBridges() {
  const moveRuntimeRef = useRef<MoveRuntime>(EMPTY_MOVE_RUNTIME);
  const liveRuntimeRef = useRef<LiveRuntime>({
    stopLiveEvaluation: async () => undefined,
  });
  const lifecycleRuntimeRef = useRef<LifecycleRuntime>({
    loadClock: async () => null,
  });
  const analysisInteractionRef = useRef<AnalysisInteractionContext>(
    EMPTY_ANALYSIS_INTERACTION,
  );

  return {
    moveRuntimeRef,
    liveRuntimeRef,
    lifecycleRuntimeRef,
    analysisInteractionRef,
  };
}
