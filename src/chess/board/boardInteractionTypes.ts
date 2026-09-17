import type { ClockState, Piece, PieceColor, PieceType, PerformMoveOptions, AnalysisPositionSelection } from "../types";
import type { BoardOrientation } from "./boardOrientation";

export interface AnalysisInteractionContext {
  replayActive: boolean;
  replayActiveCurrent: boolean;
  replayFinished: boolean;
  selectedPosition: AnalysisPositionSelection | null;
  variationMoveCount: number;
  variationGameState: string | null;
  replayRunning: boolean;
}

export interface UseBoardInteractionOptions {
  pieces: Piece[];
  boardOrientation: BoardOrientation;
  clock: ClockState | null;
  uciAnalysisLoaded: boolean;
  isLoadingMoves: boolean;
  isComputerThinking: boolean;
  isSideComputerControlled: (color: PieceColor) => boolean;
  getAnalysisContext: () => AnalysisInteractionContext;
  loadPossibleMoves: (from: string) => Promise<string[]>;
  performBoardMove: (from: string, to: string, promotion?: PieceType) => Promise<void>;
  performMove: (
    from: string,
    to: string,
    promotion?: PieceType,
    options?: PerformMoveOptions,
  ) => Promise<void>;
  animateMoveLocally: (
    from: string,
    to: string,
    requestedPromotion?: PieceType | null,
    resultingPosition?: string | null,
  ) => void;
  loadBoardFromBackend: () => Promise<void>;
}
