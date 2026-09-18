import type { Dispatch, SetStateAction } from "react";
import type { EngineConfigOverview } from "../../engineConfig";
import type {
  ClockState,
  EngineEvaluation,
  GameSound,
  HoverPreview,
  LastMove,
  MoveRow,
  Piece,
  PieceType,
  PromotionContext,
} from "../types";

export interface UseAnalysisControllerOptions {
  engineConfigOverview: EngineConfigOverview | null;
  engineEval: EngineEvaluation | null;
  setEngineEval: Dispatch<SetStateAction<EngineEvaluation | null>>;
  setPieces: Dispatch<SetStateAction<Piece[]>>;
  setLastMove: Dispatch<SetStateAction<LastMove | null>>;
  moves: MoveRow[];
  clock: ClockState | null;
  uciAnalysisLoaded: boolean;
  whiteComputerEnabled: boolean;
  blackComputerEnabled: boolean;
  disablePlayerEngines: () => Promise<void>;
  stopLiveEvaluation: () => Promise<void>;
  setEngineAutoUpdate: (value: boolean | ((previous: boolean) => boolean)) => void;
  setLiveEvaluationBar: Dispatch<SetStateAction<number | null>>;
  setShowGameEndDialog: Dispatch<SetStateAction<boolean>>;
  setShowSettings: Dispatch<SetStateAction<boolean>>;
  showGameSettingsDialog: boolean;
  showSettings: boolean;
  showChessDatabaseDialog: boolean;
  setSelectedSquare: Dispatch<SetStateAction<string | null>>;
  updatePossibleTargets: (targets: string[]) => void;
  resetBoardInteraction: () => void;
  setHoverPreview: Dispatch<SetStateAction<HoverPreview | null>>;
  setPromotionContext: Dispatch<SetStateAction<PromotionContext | null>>;
  promotionContext: PromotionContext | null;
  setIsLoadingMoves: Dispatch<SetStateAction<boolean>>;
  setLoadError: Dispatch<SetStateAction<string | null>>;
  animateMoveLocally: (
    from: string,
    to: string,
    requestedPromotion?: PieceType | null,
    resultingPosition?: string | null,
  ) => void;
  playGameSound: (sound: GameSound) => Promise<void>;
}
