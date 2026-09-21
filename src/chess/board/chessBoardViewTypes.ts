import type { ChangeEvent, ComponentProps, ReactNode, RefObject } from "react";
import type ChessDatabaseDialog from "../../ChessDatabaseDialog";
import type { EngineConfigOverview } from "../../engineConfig";
import type {
  AnalysisPositionSelection,
  AnalysisReplaySettings,
  ClockState,
  EngineEvaluation,
  GameSettings,
  HoverPreview,
  PieceType,
  PromotionContext,
} from "../types";
import type AnalysisSettingsDialog from "../analysis/AnalysisSettingsDialog";
import type NewGameDialog from "../game/NewGameDialog";
import type MovePanel from "../game/MovePanel";
import type ChessHeader from "../header/ChessHeader";
import type Board from "./Board";
import type { BoardOrientation } from "./boardOrientation";

export interface EnginePanelState {
  showSettings: boolean;
  engineConfigOverview: EngineConfigOverview | null;
  engineConfigLoadError: string | null;
  analysisReplayActive: boolean;
  analysisReplayFinished: boolean;
  uciAnalysisLoaded: boolean;
  engineAutoUpdate: boolean;
  liveEvaluationBar: number | null;
  analysisEvaluationEnabled: boolean;
  analysisSelectedPosition: AnalysisPositionSelection | null;
  analysisVariationMoves: string[];
  analysisEvaluation: EngineEvaluation | null;
  engineEval: EngineEvaluation | null;
  evalError: string | null;
  isLoadingEval: boolean;
  boardOrientation: BoardOrientation;
  clock: ClockState | null;
  analysisContent: ReactNode;
}

export interface EnginePanelActions {
  toggleEngineAutoUpdate: () => void;
  toggleAnalysisEvaluation: () => void;
  onEngineConfigOverviewChange: (data: EngineConfigOverview) => void;
  closeSettings: () => void;
}

export interface DialogState {
  promotionContext: PromotionContext | null;
  showGameSettingsDialog: boolean;
  gameSettings: GameSettings;
  gameSettingsError: string | null;
  isStartingNewGame: boolean;
  showAnalysisSettingsDialog: boolean;
  analysisSettings: AnalysisReplaySettings;
  analysisEngineProfiles: ComponentProps<typeof AnalysisSettingsDialog>["profiles"];
  analysisEngines: ComponentProps<typeof AnalysisSettingsDialog>["engines"];
  selectedAnalysisProfile: ComponentProps<typeof AnalysisSettingsDialog>["selectedProfile"];
  selectedAnalysisEngine: ComponentProps<typeof AnalysisSettingsDialog>["selectedEngine"];
  analysisReplayError: string | null;
  isAnalysisReplayRunning: boolean;
  showGameEndDialog: boolean;
  gameEndState: string | null;
  clock: ClockState | null;
}

export interface DialogActions {
  clearPromotion: () => void;
  performPromotion: (from: string, to: string, pieceType: PieceType) => Promise<void>;
  setGameSettings: ComponentProps<typeof NewGameDialog>["onSettingsChange"];
  closeGameSettings: () => void;
  startNewGame: ComponentProps<typeof NewGameDialog>["onStart"];
  setAnalysisSettings: ComponentProps<typeof AnalysisSettingsDialog>["onSettingsChange"];
  closeAnalysisSettings: () => void;
  startAnalysisReplay: () => void | Promise<void>;
  saveUciGame: () => void | Promise<void>;
  openUciFilePicker: () => void;
  openGameSettingsDialog: () => void;
  openAnalysisSettingsDialog: () => void;
}

export interface ChessBoardViewProps {
  headerProps: ComponentProps<typeof ChessHeader>;
  movePanelProps: ComponentProps<typeof MovePanel>;
  boardProps: ComponentProps<typeof Board>;
  showChessDatabaseDialog: boolean;
  closeChessDatabaseDialog: () => void;
  onDatabaseGameLoaded: ComponentProps<typeof ChessDatabaseDialog>["onGameLoaded"];
  uciFileInputRef: RefObject<HTMLInputElement | null>;
  onUciFileSelected: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  analysisReplayActive: boolean;
  uciAnalysisLoaded: boolean;
  clock: ClockState | null;
  clockError: string | null;
  whiteComputerEnabled: boolean;
  blackComputerEnabled: boolean;
  toggleWhiteComputer: () => void;
  toggleBlackComputer: () => void;
  engine: EnginePanelState;
  engineActions: EnginePanelActions;
  mobileDeepAnalysisContent: ReactNode;
  mobileEvalEngineContent: ReactNode;
  hoverPreview: HoverPreview | null;
  hoverAnnotationText: string | null;
  dialogs: DialogState;
  dialogActions: DialogActions;
}
