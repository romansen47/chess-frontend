export type PieceColor = "white" | "black";
export type PieceType = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";
export type GameSound = "move" | "capture" | "notify";

export interface Piece {
  id: string;
  color: PieceColor;
  type: PieceType;
  file: number;
  rank: number;
}

export interface MoveRow {
  moveNumber: number;
  white?: string;
  black?: string;
  whitePosition?: string;
  blackPosition?: string;
}

export interface LastMove {
  from: string;
  to: string;
}

export interface PossibleMovesResponse {
  from: string;
  targets: string[];
}

export interface MoveResult {
  success: boolean;
  message: string | null;
  from: string;
  to: string;
  san: string | null;
  sideToMove: string | null;
  position?: string | null;
  gameState?: string | null;
}

export interface AnalysisVariationRequest {
  anchorPly: number;
  moves: string[];
  from?: string | null;
  to?: string | null;
  promotion?: PieceType | null;
}

export interface AnalysisVariationMoveResult {
  success: boolean;
  message: string | null;
  from: string | null;
  to: string | null;
  uci: string | null;
  sideToMove: string | null;
  position: string | null;
  gameState: string | null;
}

export interface UciGameMove {
  ply: number;
  uci: string;
  san: string | null;
  position: string;
}

export interface UciGameResponse {
  totalPlies: number;
  sideToMove: string | null;
  position: string;
  moves: UciGameMove[];
  whitePlayerName: string | null;
  blackPlayerName: string | null;
}

export interface BackendPiece {
  color: PieceColor;
  type: PieceType;
  square: string;
}

export interface BoardResponse {
  pieces: BackendPiece[];
}

export interface MoveRequest {
  from: string;
  to: string;
  promotion?: PieceType | null;
}

export interface PerformMoveOptions {
  localMoveAlreadyApplied?: boolean;
}

export interface PromotionContext {
  from: string;
  to: string;
  color: PieceColor;
}

export interface HoverPreview {
  position: string;
  x: number;
  y: number;
}

export interface DragState {
  pieceId: string;
  from: string;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  boardLeft: number;
  boardTop: number;
  x: number;
  y: number;
  startClientX: number;
  startClientY: number;
  hasMoved: boolean;
}

export interface EngineLine {
  eval: number;
  depth: number;
  mateDistance?: number | null;
  moves: string;
  positions?: string[];
}

export interface EngineEvaluation {
  eval: number;
  bar: number;
  engineName?: string | null;
  lines: EngineLine[];
}

export interface ClockState {
  whiteTime: number;
  blackTime: number;
  sideToMove: string | null;
  whiteRunning: boolean;
  blackRunning: boolean;
  gameState: string | null;
  timeControl: string | null;
  whitePlayerName: string | null;
  blackPlayerName: string | null;
  whitePlayerEngineName: string | null;
  blackPlayerEngineName: string | null;
}

export interface GameSettings {
  timeForEachPlayerSeconds: number;
  incrementForWhiteSeconds: number;
  incrementForBlackSeconds: number;
  additionalTimeAfter40MovesSeconds: number;
  startingColor: string;
  version: number;
}

export interface AnalysisReplaySettings {
  engineProfileId: string | null;
  depth: number;
  moveTimeSeconds: number;
}

export interface AnalysisProfilePoint {
  ply: number;
  from: string | null;
  to: string | null;
  san: string | null;
  evaluation: number;
  bar: number;
  depth: number;
  lines?: EngineLine[];
}

export interface AnalysisPositionSelection {
  position: string;
  label: string;
  ply: number;
}

export interface AnalysisReplayStep {
  active: boolean;
  done: boolean;
  totalPlies: number;
  currentPly: number;
  from: string | null;
  to: string | null;
  san: string | null;
  evaluation: number;
  bar: number;
  depth: number;
  engineName?: string | null;
  board: BoardResponse | null;
  profile: AnalysisProfilePoint[];
  message: string | null;
}
