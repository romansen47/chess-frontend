import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import EngineManager from "./EngineManager";

type PieceColor = "white" | "black";
type PieceType = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";
type GameSound = "move" | "capture" | "notify";

const DEFAULT_ANALYSIS_ENGINE_PATH = "/usr/games/stockfish";

const GAME_SOUND_SOURCES: Record<GameSound, string[]> = {
  move: [
    "/sounds/move.mp3",
    "/sounds/move.wav",
    "/sounds/move.ogg",
    "/sounds/move-self.mp3",
    "/sounds/move-self.wav",
    "/sounds/move-self.ogg",
  ],
  capture: [
    "/sounds/capture.mp3",
    "/sounds/capture.wav",
    "/sounds/capture.ogg",
  ],
  notify: [
    "/sounds/notify.mp3",
    "/sounds/notify.wav",
    "/sounds/notify.ogg",
    "/sounds/game-end.mp3",
    "/sounds/game-end.wav",
    "/sounds/game-end.ogg",
  ],
};

interface Piece {
  id: string;
  color: PieceColor;
  type: PieceType;
  file: number;
  rank: number;
}

interface MoveRow {
  moveNumber: number;
  white?: string;
  black?: string;
  whitePosition?: string;
  blackPosition?: string;
}

interface LastMove {
  from: string;
  to: string;
}

interface PossibleMovesResponse {
  from: string;
  targets: string[];
}

interface MoveResult {
  success: boolean;
  message: string | null;
  from: string;
  to: string;
  san: string | null;
  sideToMove: string | null;
  position?: string | null;
  gameState?: string | null;
}

interface BackendPiece {
  color: PieceColor;
  type: PieceType;
  square: string;
}

interface BoardResponse {
  pieces: BackendPiece[];
}

interface MoveRequest {
  from: string;
  to: string;
  promotion?: PieceType | null;
}

interface PerformMoveOptions {
  localMoveAlreadyApplied?: boolean;
}

interface PromotionContext {
  from: string;
  to: string;
  color: PieceColor;
}

interface HoverPreview {
  position: string;
  x: number;
  y: number;
}

interface DragState {
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

interface EngineLine {
  eval: number;
  depth: number;
  moves: string;
  positions?: string[];
}

interface EngineEvaluation {
  eval: number;
  bar: number;
  lines: EngineLine[];
}

interface UciEngineSettings {
  depth: number;
  threads: number;
  hashSize: number;
  multiPV: number;
  contempt: number;
  moveOverhead: number;
  uciElo: number;
}

interface UciEngineSlotSettings {
  displayName: string;
  enginePath: string;
  settings: UciEngineSettings;
}

type EngineSlotRole = "whitePlayer" | "blackPlayer" | "evaluation";

interface StockfishSettings {
  whitePlayer: UciEngineSlotSettings;
  blackPlayer: UciEngineSlotSettings;
  evaluation: UciEngineSlotSettings;
  version: number;
  whitePlayerVersion: number;
  blackPlayerVersion: number;
  evaluationVersion: number;
}

interface ClockState {
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

interface GameSettings {
  timeForEachPlayerSeconds: number;
  incrementForWhiteSeconds: number;
  incrementForBlackSeconds: number;
  additionalTimeAfter40MovesSeconds: number;
  startingColor: string;
  version: number;
}

interface AnalysisReplaySettings {
  enginePath: string;
  moveTimeSeconds: number;
  depth: number;
  threads: number;
  hashSize: number;
  multiPV: number;
  contempt: number;
  uciElo: number;
}

interface AnalysisProfilePoint {
  ply: number;
  from: string | null;
  to: string | null;
  san: string | null;
  evaluation: number;
  bar: number;
  depth: number;
  lines?: EngineLine[];
}

interface AnalysisPositionSelection {
  position: string;
  label: string;
  ply: number;
}

interface AnalysisReplayStep {
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
  board: BoardResponse | null;
  profile: AnalysisProfilePoint[];
  message: string | null;
}

function squareName(file: number, rank: number): string {
  const fileChar = String.fromCharCode("a".charCodeAt(0) + file - 1);
  return `${fileChar}${rank}`;
}

function getPieceSymbol(piece: Piece): string {
  switch (piece.type) {
    case "pawn":
      return "♟";
    case "rook":
      return "♜";
    case "knight":
      return "♞";
    case "bishop":
      return "♝";
    case "queen":
      return "♛";
    case "king":
      return "♚";
    default:
      return "";
  }
}

function getPieceSymbolFromPositionChar(pieceChar: string): string {
  switch (pieceChar) {
    case "P":
      return "♙";
    case "N":
      return "♘";
    case "B":
      return "♗";
    case "R":
      return "♖";
    case "Q":
      return "♕";
    case "K":
      return "♔";
    case "p":
      return "♟";
    case "n":
      return "♞";
    case "b":
      return "♝";
    case "r":
      return "♜";
    case "q":
      return "♛";
    case "k":
      return "♚";
    default:
      return "";
  }
}

function isWhitePositionPiece(pieceChar: string): boolean {
  return pieceChar >= "A" && pieceChar <= "Z";
}


function createInitialPieces(): Piece[] {
  const pieces: Piece[] = [];

  for (let file = 1; file <= 8; file++) {
    pieces.push({
      id: `wp${file}`,
      color: "white",
      type: "pawn",
      file,
      rank: 2,
    });
  }

  for (let file = 1; file <= 8; file++) {
    pieces.push({
      id: `bp${file}`,
      color: "black",
      type: "pawn",
      file,
      rank: 7,
    });
  }

  const backRankOrder: PieceType[] = [
    "rook",
    "knight",
    "bishop",
    "queen",
    "king",
    "bishop",
    "knight",
    "rook",
  ];

  for (let file = 1; file <= 8; file++) {
    pieces.push({
      id: `w${backRankOrder[file - 1]}${file}`,
      color: "white",
      type: backRankOrder[file - 1],
      file,
      rank: 1,
    });
  }

  for (let file = 1; file <= 8; file++) {
    pieces.push({
      id: `b${backRankOrder[file - 1]}${file}`,
      color: "black",
      type: backRankOrder[file - 1],
      file,
      rank: 8,
    });
  }

  return pieces;
}

function getRankFromSquare(square: string): number {
  if (!square || square.length < 2) {
    return -1;
  }

  const rankChar = square.charAt(1);
  const rank = parseInt(rankChar, 10);

  return Number.isNaN(rank) ? -1 : rank;
}


function getFileFromSquare(square: string): number {
  if (!square || square.length < 2) {
    return -1;
  }

  const fileChar = square.charAt(0).toLowerCase();
  const file = fileChar.charCodeAt(0) - "a".charCodeAt(0) + 1;

  return file >= 1 && file <= 8 ? file : -1;
}

function getSquareCoords(square: string): { file: number; rank: number } | null {
  const file = getFileFromSquare(square);
  const rank = getRankFromSquare(square);

  if (file < 1 || file > 8 || rank < 1 || rank > 8) {
    return null;
  }

  return { file, rank };
}

function getCastlingSquares(
  movingPiece: Piece | undefined,
  from: string,
  to: string
): { kingTo: string; rookFrom: string; rookTo: string } | null {
  if (!movingPiece || movingPiece.type !== "king") {
    return null;
  }

  const fromCoords = getSquareCoords(from);
  const toCoords = getSquareCoords(to);

  if (!fromCoords || !toCoords) {
    return null;
  }

  if (fromCoords.file !== 5 || fromCoords.rank !== toCoords.rank) {
    return null;
  }

  if (toCoords.rank !== 1 && toCoords.rank !== 8) {
    return null;
  }

  if (toCoords.file === 7 || toCoords.file === 8) {
    return {
      kingTo: squareName(7, toCoords.rank),
      rookFrom: squareName(8, toCoords.rank),
      rookTo: squareName(6, toCoords.rank),
    };
  }

  if (toCoords.file === 3 || toCoords.file === 1) {
    return {
      kingTo: squareName(3, toCoords.rank),
      rookFrom: squareName(1, toCoords.rank),
      rookTo: squareName(4, toCoords.rank),
    };
  }

  return null;
}

function mapBackendPiecesToLocalPieces(backendPieces: BackendPiece[]): Piece[] {
  return backendPieces.map((bp) => {
    const fileChar = bp.square.charAt(0).toLowerCase();
    const rankChar = bp.square.charAt(1);

    const file = fileChar.charCodeAt(0) - "a".charCodeAt(0) + 1;
    const rank = parseInt(rankChar, 10);

    return {
      id: `${bp.color}_${bp.type}_${bp.square.toLowerCase()}`,
      color: bp.color,
      type: bp.type,
      file,
      rank,
    };
  });
}

function pieceTypeFromPositionChar(pieceChar: string): PieceType | null {
  switch (pieceChar.toLowerCase()) {
    case "p":
      return "pawn";
    case "r":
      return "rook";
    case "n":
      return "knight";
    case "b":
      return "bishop";
    case "q":
      return "queen";
    case "k":
      return "king";
    default:
      return null;
  }
}

function mapPositionStringToLocalPieces(position: string): Piece[] {
  if (!position || position.length !== 64) {
    return [];
  }

  const result: Piece[] = [];

  for (let index = 0; index < 64; index++) {
    const pieceChar = position.charAt(index);
    const type = pieceTypeFromPositionChar(pieceChar);

    if (!type) {
      continue;
    }

    const file = (index % 8) + 1;
    const rank = 8 - Math.floor(index / 8);
    const color: PieceColor = isWhitePositionPiece(pieceChar) ? "white" : "black";
    const square = squareName(file, rank);

    result.push({
      id: `${color}_${type}_${square}_${index}`,
      color,
      type,
      file,
      rank,
    });
  }

  return result;
}

function getPieceTypeAtSquareFromPosition(
  position: string | null | undefined,
  square: string
): PieceType | null {
  if (!position || position.length !== 64) {
    return null;
  }

  const coords = getSquareCoords(square);

  if (!coords) {
    return null;
  }

  const index = (8 - coords.rank) * 8 + (coords.file - 1);
  return pieceTypeFromPositionChar(position.charAt(index));
}

function getPromotionTypeForLocalMove(
  movingPiece: Piece | undefined,
  to: string,
  requestedPromotion: PieceType | null | undefined,
  resultingPosition: string | null | undefined
): PieceType | null {
  if (!movingPiece || movingPiece.type !== "pawn") {
    return null;
  }

  const targetCoords = getSquareCoords(to);

  if (!targetCoords) {
    return null;
  }

  const reachesPromotionRank =
    (movingPiece.color === "white" && targetCoords.rank === 8) ||
    (movingPiece.color === "black" && targetCoords.rank === 1);

  if (!reachesPromotionRank) {
    return null;
  }

  if (requestedPromotion && requestedPromotion !== "pawn") {
    return requestedPromotion;
  }

  const promotedType = getPieceTypeAtSquareFromPosition(resultingPosition, to);

  return promotedType && promotedType !== "pawn" ? promotedType : null;
}


function formatPlayerDisplayName(
  name: string | null | undefined,
  fallback: string
): string {
  const trimmed = name?.trim();

  if (!trimmed || trimmed === "ChessGame" || trimmed === "Simulation") {
    return fallback;
  }

  return trimmed;
}

function getDisplayedWhitePlayerName(
  clock: ClockState | null,
  whiteComputerEnabled: boolean
): string {
  return whiteComputerEnabled
    ? formatPlayerDisplayName(clock?.whitePlayerEngineName, "White Engine")
    : formatPlayerDisplayName(clock?.whitePlayerName, "White");
}

function getDisplayedBlackPlayerName(
  clock: ClockState | null,
  blackComputerEnabled: boolean
): string {
  return blackComputerEnabled
    ? formatPlayerDisplayName(clock?.blackPlayerEngineName, "Black Engine")
    : formatPlayerDisplayName(clock?.blackPlayerName, "Black");
}

function getAnalysisWhitePlayerName(
  clock: ClockState | null,
  storedAnalysisName: string | null
): string {
  return (
    storedAnalysisName
    || formatPlayerDisplayName(clock?.whitePlayerEngineName, "")
    || formatPlayerDisplayName(clock?.whitePlayerName, "White")
  );
}

function getAnalysisBlackPlayerName(
  clock: ClockState | null,
  storedAnalysisName: string | null
): string {
  return (
    storedAnalysisName
    || formatPlayerDisplayName(clock?.blackPlayerEngineName, "")
    || formatPlayerDisplayName(clock?.blackPlayerName, "Black")
  );
}

function formatClockTime(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) {
    return "--:--";
  }

  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function formatLostOnTime(clock: ClockState | null | undefined): string {
  if (clock?.whiteTime === 0 && clock.blackTime > 0) {
    return "Schwarz gewinnt durch Zeitüberschreitung von Weiß.";
  }

  if (clock?.blackTime === 0 && clock.whiteTime > 0) {
    return "Weiß gewinnt durch Zeitüberschreitung von Schwarz.";
  }

  if (clock?.sideToMove === "white") {
    return "Schwarz gewinnt durch Zeitüberschreitung von Weiß.";
  }

  if (clock?.sideToMove === "black") {
    return "Weiß gewinnt durch Zeitüberschreitung von Schwarz.";
  }

  return "Partie durch Zeitüberschreitung beendet.";
}

function formatGameState(
  gameState: string | null | undefined,
  clock?: ClockState | null
): string {
  switch (gameState) {
    case "WHITE_MATED":
      return "Schwarz gewinnt durch Matt.";
    case "BLACK_MATED":
      return "Weiß gewinnt durch Matt.";
    case "STALEMATE":
      return "Remis durch Patt.";
    case "WHITE_RESIGNED":
      return "Schwarz gewinnt durch Aufgabe von Weiß.";
    case "BLACK_RESIGNED":
      return "Weiß gewinnt durch Aufgabe von Schwarz.";
    case "LOST_ON_TIME":
      return formatLostOnTime(clock);
    case "DRAW_BY_50_MOVES_RULE":
      return "Remis durch die 50-Züge-Regel.";
    case "DRAW_BY_THREEFOLD_REPETITION":
      return "Remis durch dreifache Stellungswiederholung.";
    default:
      return gameState ? `Partie beendet: ${gameState}` : "Die Partie ist beendet.";
  }
}

function createDefaultGameSettings(): GameSettings {
  return {
    timeForEachPlayerSeconds: 45 * 60,
    incrementForWhiteSeconds: 0,
    incrementForBlackSeconds: 0,
    additionalTimeAfter40MovesSeconds: 0,
    startingColor: "WHITE",
    version: 0,
  };
}

function createDefaultAnalysisReplaySettings(): AnalysisReplaySettings {
  return {
    enginePath: DEFAULT_ANALYSIS_ENGINE_PATH,
    moveTimeSeconds: 5,
    depth: 0,
    threads: 1,
    hashSize: 256,
    multiPV: 3,
    contempt: 0,
    uciElo: 0,
  };
}

function formatTimeControlFromSettings(settings: GameSettings): string {
  const base =
    settings.timeForEachPlayerSeconds % 60 === 0
      ? `${settings.timeForEachPlayerSeconds / 60}`
      : `${settings.timeForEachPlayerSeconds}s`;

  if (settings.incrementForWhiteSeconds === settings.incrementForBlackSeconds) {
    return `${base}+${settings.incrementForWhiteSeconds}`;
  }

  return `${base}+${settings.incrementForWhiteSeconds}/${settings.incrementForBlackSeconds}`;
}

export const ChessBoard: React.FC = () => {
  const [pieces, setPieces] = useState<Piece[]>(() => createInitialPieces());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const possibleTargetsRef = useRef<string[]>([]);

  const [possibleTargets, setPossibleTargets] = useState<string[]>([]);
  const [isLoadingMoves, setIsLoadingMoves] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [promotionContext, setPromotionContext] =
    useState<PromotionContext | null>(null);

  function updatePossibleTargets(targets: string[]) {
    possibleTargetsRef.current = targets;
    setPossibleTargets(targets);
  }

  const [engineEval, setEngineEval] = useState<EngineEvaluation | null>(null);
  const [isLoadingEval, setIsLoadingEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [engineAutoUpdate, setEngineAutoUpdateState] = useState<boolean>(true);
  const engineAutoUpdateRef = useRef<boolean>(true);
  const [whiteComputerEnabled, setWhiteComputerEnabled] = useState<boolean>(false);
  const [blackComputerEnabled, setBlackComputerEnabled] = useState<boolean>(false);
  const whiteComputerEnabledRef = useRef<boolean>(false);
  const blackComputerEnabledRef = useRef<boolean>(false);
  const isComputerThinkingRef = useRef<boolean>(false);
  const activeComputerMoveSideRef = useRef<PieceColor | null>(null);
  const computerMoveSequenceIdRef = useRef<number>(0);
  const [isComputerThinking, setIsComputerThinkingState] =
    useState<boolean>(false);

  const [showStockfishConfig, setShowStockfishConfig] =
    useState<boolean>(false);
  const [showEngineManager, setShowEngineManager] = useState<boolean>(false);
  const [stockfishConfig, setStockfishConfig] =
    useState<StockfishSettings | null>(null);
  const [isSavingStockfishConfig, setIsSavingStockfishConfig] =
    useState<boolean>(false);
  const [stockfishConfigMessage, setStockfishConfigMessage] =
    useState<string | null>(null);
  const [stockfishConfigError, setStockfishConfigError] =
    useState<string | null>(null);

  const [clock, setClock] = useState<ClockState | null>(null);
  const [clockError, setClockError] = useState<string | null>(null);
  const [showGameEndDialog, setShowGameEndDialog] = useState<boolean>(false);
  const [gameEndState, setGameEndStateState] = useState<string | null>(null);
  const gameEndStateRef = useRef<string | null>(null);
  const [showGameSettingsDialog, setShowGameSettingsDialog] =
    useState<boolean>(true);
  const [gameSettings, setGameSettings] = useState<GameSettings>(() =>
    createDefaultGameSettings()
  );
  const [isStartingNewGame, setIsStartingNewGame] = useState<boolean>(false);
  const [gameSettingsError, setGameSettingsError] = useState<string | null>(
    null
  );


  const [showAnalysisSettingsDialog, setShowAnalysisSettingsDialog] =
    useState<boolean>(false);
  const [analysisSettings, setAnalysisSettings] =
    useState<AnalysisReplaySettings>(() => createDefaultAnalysisReplaySettings());
  const [analysisReplayActive, setAnalysisReplayActiveState] =
    useState<boolean>(false);
  const analysisReplayActiveRef = useRef<boolean>(false);
  const [isAnalysisReplayRunning, setIsAnalysisReplayRunning] =
    useState<boolean>(false);
  const [analysisReplayStatus, setAnalysisReplayStatus] =
    useState<string | null>(null);
  const [analysisReplayError, setAnalysisReplayError] =
    useState<string | null>(null);
  const [analysisReplayFinished, setAnalysisReplayFinished] =
    useState<boolean>(false);
  const [analysisProfile, setAnalysisProfile] =
    useState<AnalysisProfilePoint[]>([{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }]);
  const [analysisTotalPlies, setAnalysisTotalPlies] = useState<number>(0);
  const [analysisSelectedPosition, setAnalysisSelectedPosition] =
    useState<AnalysisPositionSelection | null>(null);
  const [analysisSelectedLineIndex, setAnalysisSelectedLineIndex] =
    useState<number | null>(null);
  const [analysisLineAnimationIndex, setAnalysisLineAnimationIndex] =
    useState<number>(0);
  const [analysisWhitePlayerName, setAnalysisWhitePlayerName] =
    useState<string | null>(null);
  const [analysisBlackPlayerName, setAnalysisBlackPlayerName] =
    useState<string | null>(null);
  const analysisReplayCancelledRef = useRef<boolean>(false);
  const soundCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const squareToPieceMap = useMemo(() => {
    const map = new Map<string, Piece>();

    for (const p of pieces) {
      map.set(squareName(p.file, p.rank), p);
    }

    return map;
  }, [pieces]);

  function setComputerThinking(value: boolean) {
    isComputerThinkingRef.current = value;
    setIsComputerThinkingState(value);

    if (!value) {
      activeComputerMoveSideRef.current = null;
    }
  }

  function setComputerThinkingForSide(side: PieceColor | null, value: boolean) {
    activeComputerMoveSideRef.current = value ? side : null;
    setComputerThinking(value);
  }

  async function playGameSound(sound: GameSound) {
    const sources = GAME_SOUND_SOURCES[sound] ?? [];

    for (const source of sources) {
      let audio = soundCacheRef.current.get(source);

      if (!audio) {
        audio = new Audio(source);
        audio.preload = "auto";
        soundCacheRef.current.set(source, audio);
      }

      try {
        audio.pause();
        audio.currentTime = 0;
        await audio.play();
        return;
      } catch (error) {
        console.warn(`[playGameSound] could not play ${source}`, error);
      }
    }
  }

  function playMoveResultSound(result: MoveResult) {
    const san = result.san ?? "";
    const sound: GameSound = san.includes("x") ? "capture" : "move";

    void playGameSound(sound);

    if (result.gameState) {
      window.setTimeout(() => {
        void playGameSound("notify");
      }, 160);
    }
  }

  function invalidateComputerMoveSequences() {
    computerMoveSequenceIdRef.current += 1;
  }

  function isComputerMoveSequenceCurrent(sequenceId: number) {
    return computerMoveSequenceIdRef.current === sequenceId;
  }

  function setEngineAutoUpdate(value: boolean | ((previous: boolean) => boolean)) {
    const nextValue =
      typeof value === "function" ? value(engineAutoUpdateRef.current) : value;

    engineAutoUpdateRef.current = nextValue;
    setEngineAutoUpdateState(nextValue);
  }

  function setGameEndState(value: string | null) {
    gameEndStateRef.current = value;
    setGameEndStateState(value);
  }


  function setAnalysisReplayActive(value: boolean) {
    analysisReplayActiveRef.current = value;
    setAnalysisReplayActiveState(value);
  }

  function normalizeSide(side: string | null | undefined): PieceColor | null {
    if (!side) {
      return null;
    }

    const normalized = side.toLowerCase();

    if (normalized === "white" || normalized === "black") {
      return normalized;
    }

    return null;
  }

  function isSideComputerControlled(side: string | null | undefined): boolean {
    const normalizedSide = normalizeSide(side);

    if (normalizedSide === "white") {
      return whiteComputerEnabledRef.current;
    }

    if (normalizedSide === "black") {
      return blackComputerEnabledRef.current;
    }

    return false;
  }

  function isPieceComputerControlled(piece: Piece | null | undefined): boolean {
    return !!piece && isSideComputerControlled(piece.color);
  }

  async function cancelPlayerEngine(side: PieceColor) {
    invalidateComputerMoveSequences();

    if (activeComputerMoveSideRef.current === side) {
      setComputerThinkingForSide(null, false);
    }

    try {
      const response = await fetch(
        `/api/computer-move/cancel?side=${encodeURIComponent(side)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.warn(
          `[cancelPlayerEngine] backend returned HTTP ${response.status} for ${side}`
        );
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

    if (normalizeSide(clock?.sideToMove) === "white") {
      runComputerMoveSequence("white");
    }
  }

  function updateBlackComputerEnabled(enabled: boolean) {
    blackComputerEnabledRef.current = enabled;
    setBlackComputerEnabled(enabled);

    if (!enabled) {
      void cancelPlayerEngine("black");
      return;
    }

    if (normalizeSide(clock?.sideToMove) === "black") {
      runComputerMoveSequence("black");
    }
  }

  function disablePlayerEngines() {
    whiteComputerEnabledRef.current = false;
    blackComputerEnabledRef.current = false;
    setWhiteComputerEnabled(false);
    setBlackComputerEnabled(false);
    void cancelPlayerEngine("white");
    void cancelPlayerEngine("black");
  }

  async function loadBoardFromBackend() {
    try {
      console.log("[loadBoardFromBackend] start");

      const response = await fetch("/api/board");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: BoardResponse = await response.json();
      console.log("[loadBoardFromBackend] got board", data);

      const mapped = mapBackendPiecesToLocalPieces(data.pieces ?? []);
      setPieces(mapped);
    } catch (e) {
      console.error("[loadBoardFromBackend] error:", e);
      setLoadError("Konnte Brett vom Server nicht laden.");
    }
  }

  async function loadGameSettings() {
    try {
      const response = await fetch("/api/game-settings");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: GameSettings = await response.json();
      setGameSettings(data);
      setGameSettingsError(null);
    } catch (e) {
      console.error("[loadGameSettings] error", e);
      setGameSettingsError("Game settings could not be loaded.");
    }
  }

  async function loadClock(): Promise<ClockState | null> {
    try {
      const response = await fetch("/api/clock");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ClockState = await response.json();

      setClock(data);
      if (data.gameState) {
        setGameEndState(data.gameState);
        if (!analysisReplayActiveRef.current) {
          setShowGameEndDialog(true);
        }
      } else {
        setGameEndState(null);
      }
      setClockError(null);
      return data;
    } catch (e) {
      console.error("[loadClock] error", e);
      setClockError("Uhr konnte nicht geladen werden.");
      return null;
    }
  }

  useEffect(() => {
    loadStockfishConfig();
    loadGameSettings();
    loadClock();

    loadBoardFromBackend().then(() => {
      if (engineAutoUpdate) {
        loadEvaluation();
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadClock();
    }, 500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  async function loadPossibleMoves(from: string): Promise<string[]> {
    console.log("[loadPossibleMoves] for", from);

    try {
      setIsLoadingMoves(true);
      setLoadError(null);

      const url = `/api/possible-moves?from=${encodeURIComponent(from)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: PossibleMovesResponse = await response.json();
      console.log("[loadPossibleMoves] response", data);

      const targets = data.targets ?? [];
      updatePossibleTargets(targets);
      return targets;
    } catch (e) {
      console.error(
        "[loadPossibleMoves] Fehler beim Laden der möglichen Züge:",
        e
      );
      setLoadError("Fehler beim Laden der möglichen Züge.");
      updatePossibleTargets([]);
      return [];
    } finally {
      setIsLoadingMoves(false);
    }
  }

  async function loadEvaluation() {
    try {
      console.log("[loadEvaluation] start");

      setIsLoadingEval(true);
      setEvalError(null);

      const response = await fetch("/api/eval");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: EngineEvaluation = await response.json();
      console.log("[loadEvaluation] response", data);

      if (data.lines && data.lines.length > 0) {
        setEngineEval(data);
      }
    } catch (e) {
      console.error("[loadEvaluation] error", e);
      setEvalError("Fehler beim Laden der Engine-Evaluation.");
    } finally {
      setIsLoadingEval(false);
    }
  }

  async function stopLiveEvaluation() {
    try {
      await fetch("/api/eval/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (e) {
      console.warn("[stopLiveEvaluation] backend stop failed", e);
    }
  }

  function toggleEngineAutoUpdate() {
    const nextValue = !engineAutoUpdateRef.current;
    setEngineAutoUpdate(nextValue);

    if (!nextValue) {
      setEngineEval(null);
      setEvalError(null);
      setIsLoadingEval(false);
      void stopLiveEvaluation();
      return;
    }

    void loadEvaluation();
  }

  async function loadStockfishConfig() {
    try {
      console.log("[loadStockfishConfig] start");

      setStockfishConfigError(null);

      const response = await fetch("/api/stockfish/settings");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: StockfishSettings = await response.json();
      console.log("[loadStockfishConfig] response", data);

      setStockfishConfig(data);

      const evaluationEnginePath = data.evaluation?.enginePath;
      if (evaluationEnginePath) {
        setAnalysisSettings((prev) =>
          prev.enginePath === DEFAULT_ANALYSIS_ENGINE_PATH
            ? { ...prev, enginePath: evaluationEnginePath }
            : prev
        );
      }
    } catch (e) {
      console.error("[loadStockfishConfig] error", e);
      setStockfishConfigError(
        "Stockfish-Konfiguration konnte nicht geladen werden."
      );
    }
  }

  function updateStockfishEnginePath(role: EngineSlotRole, enginePath: string) {
    setStockfishConfig((prev) =>
      prev
        ? {
            ...prev,
            [role]: {
              ...prev[role],
              enginePath,
            },
          }
        : prev
    );
  }

  function updateStockfishConfigField<K extends keyof UciEngineSettings>(
    role: EngineSlotRole,
    key: K,
    value: UciEngineSettings[K]
  ) {
    setStockfishConfig((prev) =>
      prev
        ? {
            ...prev,
            [role]: {
              ...prev[role],
              settings: {
                ...prev[role].settings,
                [key]: value,
              },
            },
          }
        : prev
    );
  }

  async function saveStockfishConfig() {
    if (!stockfishConfig) {
      return;
    }

    try {
      console.log("[saveStockfishConfig] start", stockfishConfig);

      setIsSavingStockfishConfig(true);
      setStockfishConfigMessage(null);
      setStockfishConfigError(null);

      const response = await fetch("/api/stockfish/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stockfishConfig),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: StockfishSettings = await response.json();
      console.log("[saveStockfishConfig] response", data);

      setStockfishConfig(data);
      setStockfishConfigMessage("Engine settings saved.");
      setEngineEval(null);

      await loadEvaluation();
    } catch (e) {
      console.error("[saveStockfishConfig] error", e);
      setStockfishConfigError(
        "Stockfish-Konfiguration konnte nicht gespeichert werden."
      );
    } finally {
      setIsSavingStockfishConfig(false);
    }
  }

  function renderStockfishSlotSection(
    role: EngineSlotRole,
    title: string,
    version: number,
    allowMultiPV: boolean
  ) {
    if (!stockfishConfig) {
      return null;
    }

    const slot = stockfishConfig[role];
    const settings = slot.settings;

    const sectionClassName = allowMultiPV
      ? "stockfish-config-section stockfish-config-section-evaluation"
      : "stockfish-config-section stockfish-config-section-player";

    return (
      <div className={sectionClassName}>
        <div className="stockfish-config-section-title">
          {title} · version {version}
        </div>

        <label className="stockfish-config-field stockfish-config-field-wide">
          <span>Engine path</span>
          <input
            value={slot.enginePath}
            onChange={(e) => updateStockfishEnginePath(role, e.target.value)}
          />
        </label>

        <div className="stockfish-config-grid">
          <label className="stockfish-config-field">
            <span>Depth</span>
            <input
              type="number"
              min={0}
              max={64}
              value={settings.depth}
              onChange={(e) =>
                updateStockfishConfigField(role, "depth", Number(e.target.value))
              }
            />
          </label>

          {allowMultiPV ? (
            <label className="stockfish-config-field">
              <span>MultiPV</span>
              <input
                type="number"
                min={1}
                max={256}
                value={settings.multiPV}
                onChange={(e) =>
                  updateStockfishConfigField(role, "multiPV", Number(e.target.value))
                }
              />
            </label>
          ) : (
            <label className="stockfish-config-field">
              <span>Move time s</span>
              <input
                type="number"
                min={0}
                max={3600}
                value={settings.moveOverhead}
                onChange={(e) =>
                  updateStockfishConfigField(
                    role,
                    "moveOverhead",
                    Math.max(0, Number(e.target.value))
                  )
                }
              />
            </label>
          )}

          <label className="stockfish-config-field">
            <span>Threads</span>
            <input
              type="number"
              min={allowMultiPV ? 1 : 0}
              max={256}
              value={settings.threads}
              onChange={(e) =>
                updateStockfishConfigField(role, "threads", Number(e.target.value))
              }
            />
          </label>

          <label className="stockfish-config-field">
            <span>Hash MB</span>
            <input
              type="number"
              min={1}
              max={262144}
              value={settings.hashSize}
              onChange={(e) =>
                updateStockfishConfigField(role, "hashSize", Number(e.target.value))
              }
            />
          </label>

          <label className="stockfish-config-field">
            <span>Contempt</span>
            <input
              type="number"
              min={-1000}
              max={1000}
              value={settings.contempt}
              onChange={(e) =>
                updateStockfishConfigField(role, "contempt", Number(e.target.value))
              }
            />
          </label>

          {allowMultiPV && (
            <label className="stockfish-config-field">
              <span>Move time s</span>
              <input
                type="number"
                min={0}
                max={3600}
                value={settings.moveOverhead}
                onChange={(e) =>
                  updateStockfishConfigField(
                    role,
                    "moveOverhead",
                    Number(e.target.value)
                  )
                }
              />
            </label>
          )}

          <label className="stockfish-config-field">
            <span>UCI Elo</span>
            <input
              type="number"
              min={0}
              max={4000}
              value={settings.uciElo}
              onChange={(e) =>
                updateStockfishConfigField(role, "uciElo", Number(e.target.value))
              }
            />
          </label>
        </div>

      </div>
    );
  }

  useEffect(() => {
    if (!engineAutoUpdate || clock?.gameState) {
      return;
    }

    console.log("[EnginePolling] auto-update enabled, starting interval");

    const intervalId = window.setInterval(() => {
      loadEvaluation();
    }, 2000);

    return () => {
      console.log("[EnginePolling] cleaning up interval");
      window.clearInterval(intervalId);
    };
  }, [engineAutoUpdate, clock?.gameState]);

  useEffect(() => {
    setAnalysisLineAnimationIndex(0);
  }, [analysisSelectedPosition?.ply, analysisSelectedLineIndex]);

  useEffect(() => {
    if (!analysisReplayActive || !analysisSelectedPosition) {
      return;
    }

    const selectedPoint = analysisProfile.find(
      (point) => point.ply === analysisSelectedPosition.ply
    );
    const lines = selectedPoint?.lines ?? [];

    if (lines.length === 0) {
      return;
    }

    const lineIndex = getEffectiveAnalysisLineIndex(selectedPoint, lines);
    const positions = lines[lineIndex]?.positions ?? [];

    if (positions.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setAnalysisLineAnimationIndex((prev) => (prev + 1) % positions.length);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [analysisReplayActive, analysisSelectedPosition?.ply, analysisSelectedLineIndex, analysisProfile]);

  function openAnalysisSettingsDialog() {
    setAnalysisReplayError(null);
    setAnalysisReplayStatus(null);
    setShowGameEndDialog(false);
    setShowAnalysisSettingsDialog(true);
  }

  function reopenGameEndDialog() {
    if (!gameEndStateRef.current) {
      return;
    }

    setAnalysisReplayError(null);
    setShowAnalysisSettingsDialog(false);
    setShowGameEndDialog(true);
  }

  function updateAnalysisSettingsNumberField(
    key: Exclude<keyof AnalysisReplaySettings, "enginePath">,
    value: number
  ) {
    const safeValue = Number.isFinite(value) ? value : 0;

    setAnalysisSettings((prev) => ({
      ...prev,
      [key]: key === "contempt" ? safeValue : Math.max(0, safeValue),
    }));
  }

  function updateAnalysisSettingsTextField(
    key: Extract<keyof AnalysisReplaySettings, "enginePath">,
    value: string
  ) {
    setAnalysisSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function applyAnalysisReplayStep(step: AnalysisReplayStep) {
    if (step.board?.pieces && !analysisReplayActiveRef.current) {
      setPieces(mapBackendPiecesToLocalPieces(step.board.pieces));
    }

    if (step.from && step.to && !analysisReplayActiveRef.current) {
      setLastMove({ from: step.from, to: step.to });
    }

    setAnalysisTotalPlies(Math.max(0, step.totalPlies ?? 0));
    setAnalysisProfile(step.profile?.length ? step.profile : [{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }]);

    const latestProfilePoint = step.profile?.[step.profile.length - 1];

    setEngineEval({
      eval: step.evaluation ?? 0,
      bar: step.bar ?? 0.5,
      lines: latestProfilePoint?.lines ?? [],
    });
  }

  async function runAnalysisReplayLoop() {
    setIsAnalysisReplayRunning(true);
    analysisReplayCancelledRef.current = false;

    try {
      while (!analysisReplayCancelledRef.current) {
        const response = await fetch("/api/analysis-replay/next", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }

        const step: AnalysisReplayStep = await response.json();
        applyAnalysisReplayStep(step);

        const progressText = `${step.currentPly} / ${step.totalPlies}`;
        setAnalysisReplayStatus(step.done ? `Analyse fertig (${progressText}).` : `Analysiere ${progressText}…`);

        if (step.done) {
          setAnalysisReplayFinished(true);
          break;
        }
      }
    } catch (error) {
      console.error("[runAnalysisReplayLoop] error", error);
      setAnalysisReplayError("Analyse-Replay ist fehlgeschlagen.");
    } finally {
      setIsAnalysisReplayRunning(false);
    }
  }

  async function startAnalysisReplay() {
    try {
      setAnalysisReplayError(null);
      setAnalysisReplayStatus("Analyse wird vorbereitet…");
      setAnalysisReplayFinished(false);
      setIsAnalysisReplayRunning(true);
      setShowAnalysisSettingsDialog(false);
      setShowGameEndDialog(false);
      setShowStockfishConfig(false);
      setSelectedSquare(null);
      updatePossibleTargets([]);
      setHoverPreview(null);
      setPromotionContext(null);
      setAnalysisWhitePlayerName(getDisplayedWhitePlayerName(clock, whiteComputerEnabledRef.current));
      setAnalysisBlackPlayerName(getDisplayedBlackPlayerName(clock, blackComputerEnabledRef.current));
      setAnalysisReplayActive(true);
      await stopLiveEvaluation();
      disablePlayerEngines();
      setShowGameEndDialog(false);
      setEngineAutoUpdate(false);
      setAnalysisTotalPlies(0);
      setAnalysisSelectedPosition(null);
      setAnalysisSelectedLineIndex(null);
      setAnalysisLineAnimationIndex(0);
      setAnalysisProfile([{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }]);
      selectFirstAnalysisPosition();

      const response = await fetch("/api/analysis-replay/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(analysisSettings),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }

      const step: AnalysisReplayStep = await response.json();
      applyAnalysisReplayStep(step);
      setAnalysisReplayStatus(`Analysiere 0 / ${step.totalPlies}…`);
      setIsAnalysisReplayRunning(false);

      await runAnalysisReplayLoop();
    } catch (error) {
      console.error("[startAnalysisReplay] error", error);
      setAnalysisReplayError("Analyse-Replay konnte nicht gestartet werden.");
      setAnalysisReplayFinished(false);
      setAnalysisReplayActive(false);
      setIsAnalysisReplayRunning(false);
    }
  }

  async function cancelAnalysisReplay() {
    analysisReplayCancelledRef.current = true;
    setIsAnalysisReplayRunning(false);
    setAnalysisReplayFinished(true);
    setAnalysisReplayStatus("Analyse abgebrochen.");

    try {
      await fetch("/api/analysis-replay/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.warn("[cancelAnalysisReplay] backend cancel failed", error);
    }
  }

  function openGameSettingsDialog() {
    setGameSettingsError(null);
    setShowGameEndDialog(false);
    setShowGameSettingsDialog(true);
  }

  function updateGameSettingsNumberField(
    key:
      | "timeForEachPlayerSeconds"
      | "incrementForWhiteSeconds"
      | "incrementForBlackSeconds"
      | "additionalTimeAfter40MovesSeconds",
    value: number
  ) {
    const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;

    setGameSettings((prev) => ({
      ...prev,
      [key]: safeValue,
    }));
  }

  async function startNewGame(settings: GameSettings) {
    console.log("[startNewGame] starting new game", settings);

    try {
      setIsLoadingMoves(true);
      setIsStartingNewGame(true);
      setLoadError(null);
      setGameSettingsError(null);
      disablePlayerEngines();
      analysisReplayCancelledRef.current = true;
      setAnalysisReplayActive(false);
      setIsAnalysisReplayRunning(false);
      setAnalysisReplayStatus(null);
      setAnalysisReplayError(null);
      setAnalysisReplayFinished(false);
      setAnalysisTotalPlies(0);
      setAnalysisSelectedPosition(null);
      setAnalysisSelectedLineIndex(null);
      setAnalysisLineAnimationIndex(0);
      setAnalysisWhitePlayerName(null);
      setAnalysisBlackPlayerName(null);
      setAnalysisProfile([{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }]);

      const response = await fetch("/api/new-game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const appliedSettings: GameSettings = await response.json();
      setGameSettings(appliedSettings);

      setPieces(createInitialPieces());
      setMoves([]);
      setLastMove(null);
      setSelectedSquare(null);
      updatePossibleTargets([]);
      setPromotionContext(null);
      setHoverPreview(null);
      setShowGameEndDialog(false);
      setGameEndState(null);
      setShowGameSettingsDialog(false);
      setEngineEval(null);
      setClock({
        whiteTime: appliedSettings.timeForEachPlayerSeconds,
        blackTime: appliedSettings.timeForEachPlayerSeconds,
        sideToMove: "white",
        whiteRunning: false,
        blackRunning: false,
        gameState: null,
        timeControl: formatTimeControlFromSettings(appliedSettings),
      });

      await requestComputerMoveIfEnabled("white");
      await synchronizeAfterMoveSequence();
    } catch (e) {
      console.error("[startNewGame] error", e);
      setGameSettingsError("Fehler beim Starten einer neuen Partie.");
    } finally {
      setIsStartingNewGame(false);
      setIsLoadingMoves(false);
    }
  }

  function animateMoveLocally(
    from: string,
    to: string,
    requestedPromotion?: PieceType | null,
    resultingPosition?: string | null
  ) {
    const targetCoords = getSquareCoords(to);

    if (!targetCoords) {
      return;
    }

    setPieces((prev) => {
      const movingPiece = prev.find((p) => squareName(p.file, p.rank) === from);
      const promotionType = getPromotionTypeForLocalMove(
        movingPiece,
        to,
        requestedPromotion,
        resultingPosition
      );
      const castlingSquares = getCastlingSquares(movingPiece, from, to);

      if (castlingSquares) {
        const kingToCoords = getSquareCoords(castlingSquares.kingTo);
        const rookToCoords = getSquareCoords(castlingSquares.rookTo);

        if (!kingToCoords || !rookToCoords) {
          return prev;
        }

        return prev.map((p) => {
          const currentSquare = squareName(p.file, p.rank);

          if (currentSquare === from) {
            return { ...p, file: kingToCoords.file, rank: kingToCoords.rank };
          }

          if (currentSquare === castlingSquares.rookFrom) {
            return { ...p, file: rookToCoords.file, rank: rookToCoords.rank };
          }

          return p;
        });
      }

      const withoutCaptured = prev.filter(
        (p) => squareName(p.file, p.rank) !== to
      );

      return withoutCaptured.map((p) =>
        squareName(p.file, p.rank) === from
          ? {
              ...p,
              type: promotionType ?? p.type,
              file: targetCoords.file,
              rank: targetCoords.rank,
            }
          : p
      );
    });
  }

  function addMoveToMoveList(result: MoveResult) {
    const from = result.from;
    const to = result.to;

    const sanText =
      result.san && result.san.trim().length > 0
        ? result.san
        : `${from}-${to}`;

    const position = result.position ?? undefined;

    setMoves((prev) => {
      if (prev.length === 0 || prev[prev.length - 1].black) {
        return [
          ...prev,
          {
            moveNumber: prev.length + 1,
            white: sanText,
            whitePosition: position,
          },
        ];
      }

      const copy = [...prev];

      copy[copy.length - 1] = {
        ...copy[copy.length - 1],
        black: sanText,
        blackPosition: position,
      };

      return copy;
    });
  }

  function showMovePreview(
    event: React.MouseEvent<HTMLElement>,
    position: string | undefined
  ) {
    if (!position || position.length !== 64) {
      return;
    }

    setHoverPreview({
      position,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function moveMovePreview(event: React.MouseEvent<HTMLElement>) {
    setHoverPreview((prev) =>
      prev
        ? {
            ...prev,
            x: event.clientX,
            y: event.clientY,
          }
        : prev
    );
  }

  function hideMovePreview() {
    setHoverPreview(null);
  }

  function selectAnalysisPosition(
    position: string | undefined,
    san: string | undefined,
    ply: number
  ) {
    if (!analysisReplayActiveRef.current || !position || position.length !== 64) {
      return;
    }

    const moveLabel = san ? ` · ${san}` : "";
    setAnalysisSelectedPosition({
      position,
      label: `${ply}. Halbzug${moveLabel}`,
      ply,
    });
    setAnalysisSelectedLineIndex(null);
    setAnalysisLineAnimationIndex(0);
    setPieces(mapPositionStringToLocalPieces(position));
    setLastMove(null);
  }

  function getAnalysisMoveSelectionForPly(ply: number): { position: string | undefined; san: string | undefined; ply: number } | null {
    if (ply <= 0) {
      return null;
    }

    const moveNumber = Math.ceil(ply / 2);
    const row = moves.find((candidate) => candidate.moveNumber === moveNumber);

    if (!row) {
      return null;
    }

    return ply % 2 === 1
      ? { position: row.whitePosition, san: row.white, ply }
      : { position: row.blackPosition, san: row.black, ply };
  }

  function selectAnalysisPositionByPly(ply: number) {
    const selection = getAnalysisMoveSelectionForPly(ply);

    if (!selection) {
      return;
    }

    selectAnalysisPosition(selection.position, selection.san, selection.ply);
  }

  function selectFirstAnalysisPosition() {
    const firstRow = moves.find((row) => row.whitePosition || row.blackPosition);

    if (!firstRow) {
      return;
    }

    if (firstRow.whitePosition) {
      selectAnalysisPosition(
        firstRow.whitePosition,
        firstRow.white,
        (firstRow.moveNumber - 1) * 2 + 1
      );
      return;
    }

    if (firstRow.blackPosition) {
      selectAnalysisPosition(
        firstRow.blackPosition,
        firstRow.black,
        firstRow.moveNumber * 2
      );
    }
  }

  function handleGameEndState(gameState: string | null | undefined) {
    if (!gameState) {
      return false;
    }

    setGameEndState(gameState);
    setEngineAutoUpdate(false);
    void stopLiveEvaluation();
    setClock((prev) =>
      prev
        ? {
            ...prev,
            gameState,
            whiteRunning: false,
            blackRunning: false,
          }
        : prev
    );
    setShowGameEndDialog(true);
    return true;
  }

  async function requestComputerMove(
    sequenceId: number,
    requestedSide: PieceColor | null
  ): Promise<{
    gameEnded: boolean;
    sideToMove: string | null;
    success: boolean;
  }> {
    console.log("[requestComputerMove] start");

    try {
      setComputerThinkingForSide(requestedSide, true);
      setLoadError(null);

      const response = await fetch("/api/computer-move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data: MoveResult = await response.json();
      console.log("[requestComputerMove] response", response.status, data);

      if (!isComputerMoveSequenceCurrent(sequenceId)) {
        return {
          gameEnded: false,
          sideToMove: data.sideToMove ?? null,
          success: false,
        };
      }

      if (!response.ok || !data.success) {
        if (handleGameEndState(data.gameState)) {
          await loadClock();
          return {
            gameEnded: true,
            sideToMove: data.sideToMove ?? null,
            success: false,
          };
        }

        const message = data.message || `HTTP ${response.status}`;

        if (message !== "Computer move was cancelled") {
          setLoadError(message);
        }

        return {
          gameEnded: false,
          sideToMove: data.sideToMove ?? null,
          success: false,
        };
      }

      if (data.from && data.to) {
        animateMoveLocally(data.from, data.to, null, data.position);
        setLastMove({ from: data.from, to: data.to });
        addMoveToMoveList(data);
        playMoveResultSound(data);
      }

      if (handleGameEndState(data.gameState)) {
        return {
          gameEnded: true,
          sideToMove: data.sideToMove ?? null,
          success: true,
        };
      }

      return {
        gameEnded: false,
        sideToMove: data.sideToMove ?? null,
        success: true,
      };
    } catch (e) {
      console.error("[requestComputerMove] Fehler beim Engine-Zug:", e);
      setLoadError("Fehler beim Ausführen des Engine-Zugs.");
      return {
        gameEnded: false,
        sideToMove: null,
        success: false,
      };
    } finally {
      if (isComputerMoveSequenceCurrent(sequenceId)) {
        setComputerThinkingForSide(null, false);
      }
    }
  }

  async function requestComputerMoveIfEnabled(
    initialSideToMove: string | null | undefined,
    sequenceId: number = computerMoveSequenceIdRef.current
  ): Promise<{ gameEnded: boolean; sideToMove: string | null; moved: boolean }> {
    let nextSide = normalizeSide(initialSideToMove);
    let moved = false;
    let guard = 0;

    while (
      nextSide &&
      isSideComputerControlled(nextSide) &&
      !isComputerThinkingRef.current &&
      isComputerMoveSequenceCurrent(sequenceId) &&
      guard < 200
    ) {
      guard++;

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

    return {
      gameEnded: false,
      sideToMove: nextSide,
      moved,
    };
  }

  async function synchronizeAfterMoveSequence() {
    await loadBoardFromBackend();
    await loadClock();

    if (engineAutoUpdateRef.current && !gameEndStateRef.current) {
      loadEvaluation();
    }
  }

  function runComputerMoveSequence(initialSideToMove: string | null | undefined) {
    const sequenceId = computerMoveSequenceIdRef.current + 1;
    computerMoveSequenceIdRef.current = sequenceId;

    requestComputerMoveIfEnabled(initialSideToMove, sequenceId)
      .then(() => {
        if (isComputerMoveSequenceCurrent(sequenceId)) {
          return synchronizeAfterMoveSequence();
        }
        return undefined;
      })
      .catch(async (error) => {
        if (!isComputerMoveSequenceCurrent(sequenceId)) {
          return;
        }

        console.error("[runComputerMoveSequence] error", error);
        setLoadError("Fehler beim Ausführen des Engine-Zugs.");
        await loadBoardFromBackend();
        await loadClock();
      });
  }

  async function performMove(
    from: string,
    to: string,
    promotion?: PieceType,
    options?: PerformMoveOptions
  ) {
    console.log(
      "[performMove] sending move",
      from,
      "->",
      to,
      "promotion:",
      promotion
    );

    try {
      setIsLoadingMoves(true);
      setLoadError(null);

      const body: MoveRequest = {
        from,
        to,
        promotion: promotion ?? null,
      };

      const response = await fetch("/api/move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data: MoveResult = await response.json();
      console.log("[performMove] response", response.status, data);

      if (!response.ok || !data.success) {
        if (handleGameEndState(data.gameState)) {
          await loadClock();
          return;
        }

        const message = data.message || `HTTP ${response.status}`;
        setLoadError(message);
        return;
      }

      if (!options?.localMoveAlreadyApplied) {
        animateMoveLocally(from, to, promotion, data.position);
      }
      setLastMove({ from, to });
      setSelectedSquare(null);
      updatePossibleTargets([]);
      addMoveToMoveList(data);
      playMoveResultSound(data);

      if (handleGameEndState(data.gameState)) {
        await synchronizeAfterMoveSequence();
        return;
      }

      await requestComputerMoveIfEnabled(data.sideToMove);
      setIsLoadingMoves(false);
      await synchronizeAfterMoveSequence();
    } catch (e) {
      console.error("[performMove] Fehler beim Ausführen des Zugs:", e);
      setLoadError("Fehler beim Ausführen des Zugs.");
    } finally {
      setIsLoadingMoves(false);
    }
  }

  function getSquareFromClientPoint(clientX: number, clientY: number): string | null {
    const boardRect = boardContainerRef.current?.getBoundingClientRect();

    if (!boardRect) {
      return null;
    }

    const x = clientX - boardRect.left;
    const y = clientY - boardRect.top;

    if (x < 0 || y < 0 || x >= boardRect.width || y >= boardRect.height) {
      return null;
    }

    const file = Math.floor(x / 80) + 1;
    const rank = 8 - Math.floor(y / 80);

    if (file < 1 || file > 8 || rank < 1 || rank > 8) {
      return null;
    }

    return squareName(file, rank);
  }

  async function handlePiecePointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    piece: Piece
  ) {
    if (event.button !== 0) {
      return;
    }

    if (analysisReplayActive || isLoadingMoves || isComputerThinking || promotionContext || clock?.gameState) {
      return;
    }

    const from = squareName(piece.file, piece.rank);

    if (isPieceComputerControlled(piece)) {
      return;
    }

    if (
      selectedSquare &&
      selectedSquare !== from &&
      possibleTargets.includes(from)
    ) {
      event.preventDefault();

      const movingPiece = squareToPieceMap.get(selectedSquare);
      const targetRank = getRankFromSquare(from);
      const isPromotionMove =
        movingPiece &&
        movingPiece.type === "pawn" &&
        ((movingPiece.color === "white" && targetRank === 8) ||
          (movingPiece.color === "black" && targetRank === 1));

      if (isPromotionMove && movingPiece) {
        setPromotionContext({
          from: selectedSquare,
          to: from,
          color: movingPiece.color,
        });
        setSelectedSquare(null);
        updatePossibleTargets([]);
        return;
      }

      const sourceSquare = selectedSquare;
      setSelectedSquare(null);
      updatePossibleTargets([]);
      await performMove(sourceSquare, from);
      return;
    }

    const boardRect = boardContainerRef.current?.getBoundingClientRect();
    const pieceRect = event.currentTarget.getBoundingClientRect();

    if (!boardRect) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const offsetX = event.clientX - pieceRect.left;
    const offsetY = event.clientY - pieceRect.top;

    setSelectedSquare(from);
    updatePossibleTargets([]);
    setDragState({
      pieceId: piece.id,
      from,
      pointerId: event.pointerId,
      offsetX,
      offsetY,
      boardLeft: boardRect.left,
      boardTop: boardRect.top,
      x: event.clientX - boardRect.left - offsetX,
      y: event.clientY - boardRect.top - offsetY,
      startClientX: event.clientX,
      startClientY: event.clientY,
      hasMoved: false,
    });

    await loadPossibleMoves(from);
  }

  function handlePiecePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;
    const hasMoved =
      dragState.hasMoved || Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 4;

    setDragState((prev) =>
      prev && prev.pointerId === event.pointerId
        ? {
            ...prev,
            x: event.clientX - prev.boardLeft - prev.offsetX,
            y: event.clientY - prev.boardTop - prev.offsetY,
            hasMoved,
          }
        : prev
    );
  }

  async function handlePiecePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }

    const finishedDrag = {
      ...dragState,
      x: event.clientX - dragState.boardLeft - dragState.offsetX,
      y: event.clientY - dragState.boardTop - dragState.offsetY,
    };

    if (!finishedDrag.hasMoved) {
      setDragState(null);
      return;
    }

    const targetSquare = getSquareFromClientPoint(event.clientX, event.clientY);

    if (!targetSquare || targetSquare === finishedDrag.from) {
      setDragState(null);
      setSelectedSquare(null);
      updatePossibleTargets([]);
      return;
    }

    if (!possibleTargetsRef.current.includes(targetSquare)) {
      setDragState(null);
      setSelectedSquare(null);
      updatePossibleTargets([]);
      return;
    }

    const movingPiece = squareToPieceMap.get(finishedDrag.from);
    const targetRank = getRankFromSquare(targetSquare);

    const isPromotionMove =
      movingPiece &&
      movingPiece.type === "pawn" &&
      ((movingPiece.color === "white" && targetRank === 8) ||
        (movingPiece.color === "black" && targetRank === 1));

    if (isPromotionMove && movingPiece) {
      setDragState(null);
      setPromotionContext({
        from: finishedDrag.from,
        to: targetSquare,
        color: movingPiece.color,
      });

      setSelectedSquare(null);
      updatePossibleTargets([]);
      return;
    }

    setSelectedSquare(null);
    updatePossibleTargets([]);
    setDragState(finishedDrag);

    window.requestAnimationFrame(() => {
      animateMoveLocally(finishedDrag.from, targetSquare);
      setDragState(null);

      performMove(finishedDrag.from, targetSquare, undefined, {
        localMoveAlreadyApplied: true,
      }).catch(async (error) => {
        console.error(
          "[handlePiecePointerUp] Fehler beim optimistischen Drag-Drop-Zug:",
          error
        );
        await loadBoardFromBackend();
      });
    });
  }

  function handlePiecePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    setDragState(null);
    setSelectedSquare(null);
    updatePossibleTargets([]);
  }

  const handleSquareClick = async (square: string) => {
    console.log("[handleSquareClick] clicked", square);

    if (analysisReplayActive || isLoadingMoves || isComputerThinking) {
      console.log(
        "[handleSquareClick] move currently in progress, ignoring click"
      );
      return;
    }

    if (promotionContext) {
      console.log("[handleSquareClick] promotion dialog open, ignoring click");
      return;
    }

    if (clock?.gameState) {
      console.log("[handleSquareClick] game already ended, ignoring click");
      return;
    }

    const clickedPiece = squareToPieceMap.get(square);

    console.log(
      "[handleSquareClick] clickedPiece",
      clickedPiece ? `${clickedPiece.color} ${clickedPiece.type}` : "none"
    );

    if (!selectedSquare) {
      if (clickedPiece && !isPieceComputerControlled(clickedPiece)) {
        console.log("[handleSquareClick] select square", square);
        setSelectedSquare(square);
        await loadPossibleMoves(square);
      }

      return;
    }

    if (selectedSquare === square) {
      console.log(
        "[handleSquareClick] clicked selected square again, reset selection"
      );
      setSelectedSquare(null);
      updatePossibleTargets([]);

      return;
    }

    const isPossibleTarget = possibleTargets.includes(square);

    if (isPossibleTarget && selectedSquare) {
      const from = selectedSquare;
      const to = square;

      console.log(
        "[handleSquareClick] square is possible target",
        from,
        "->",
        to
      );

      const movingPiece = squareToPieceMap.get(from);
      const targetRank = getRankFromSquare(to);

      const isPromotionMove =
        movingPiece &&
        movingPiece.type === "pawn" &&
        ((movingPiece.color === "white" && targetRank === 8) ||
          (movingPiece.color === "black" && targetRank === 1));

      if (isPromotionMove && movingPiece) {
        console.log("[handleSquareClick] detected potential promotion move");

        setPromotionContext({
          from,
          to,
          color: movingPiece.color,
        });

        updatePossibleTargets([]);

        return;
      }

      console.log("[handleSquareClick] performing normal move", from, "->", to);

      await performMove(from, to);

      return;
    }

    if (clickedPiece && !isPieceComputerControlled(clickedPiece)) {
      console.log(
        "[handleSquareClick] clicked another piece, change selection to",
        square
      );

      setSelectedSquare(square);
      await loadPossibleMoves(square);

      return;
    }

    console.log(
      "[handleSquareClick] clicked invalid empty square, reset selection"
    );

    setSelectedSquare(null);
    updatePossibleTargets([]);
  };

  const renderBoardSquares = () => {
    const squares: ReactElement[] = [];

    for (let rank = 8; rank >= 1; rank--) {
      for (let file = 1; file <= 8; file++) {
        const name = squareName(file, rank);
        const isLight = (file + rank) % 2 !== 0;
        const isSelected = selectedSquare === name;
        const isLast =
          lastMove && (lastMove.from === name || lastMove.to === name);
        const isPossible = possibleTargets.includes(name);

        const squareClasses = [
          "square",
          isLight ? "square-light" : "square-dark",
          isSelected ? "square-selected" : "",
          isLast ? "square-last-move" : "",
          isPossible ? "square-possible" : "",
        ]
          .filter(Boolean)
          .join(" ");

        squares.push(
          <div
            key={name}
            className={squareClasses}
            onClick={() => handleSquareClick(name)}
          >
            <span className="square-label">{name}</span>
          </div>
        );
      }
    }

    return squares;
  };

  const renderHoverBoard = () => {
    if (!hoverPreview) {
      return null;
    }

    const previewSize = 240;
    const offset = 18;
    const left = Math.max(
      offset,
      Math.min(hoverPreview.x + offset, window.innerWidth - previewSize - offset)
    );
    const top = Math.max(
      offset,
      Math.min(hoverPreview.y + offset, window.innerHeight - previewSize - offset)
    );

    const squares: ReactElement[] = [];

    for (let i = 0; i < 64; i++) {
      const rankFromTop = Math.floor(i / 8);
      const fileFromLeft = i % 8;
      const pieceChar = hoverPreview.position.charAt(i);
      const pieceSymbol = getPieceSymbolFromPositionChar(pieceChar);
      const isLight = (rankFromTop + fileFromLeft) % 2 === 0;

      squares.push(
        <div
          key={i}
          className={[
            "hover-board-square",
            isLight ? "hover-board-square-light" : "hover-board-square-dark",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {pieceSymbol && (
            <span
              className={[
                "hover-board-piece",
                isWhitePositionPiece(pieceChar)
                  ? "hover-board-piece-white"
                  : "hover-board-piece-black",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {pieceSymbol}
            </span>
          )}
        </div>
      );
    }

    return (
      <div
        className="hover-board"
        style={{
          left,
          top,
        }}
      >
        {squares}
      </div>
    );
  };

  const renderAnalysisProfile = () => {
    const width = 860;
    const height = 560;
    const paddingX = 12;
    const paddingY = 18;
    const maxAbsEval = 5;
    const points = analysisProfile.length > 0 ? analysisProfile : [{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }];
    const analyzedPoints = points.filter((point) => point.ply > 0);
    const analyzedPointMap = new Map<number, AnalysisProfilePoint>(
      analyzedPoints.map((point) => [point.ply, point])
    );
    const totalPly = Math.max(1, analysisTotalPlies, analyzedPoints[analyzedPoints.length - 1]?.ply ?? 0);

    const toY = (evaluation: number) => {
      const clamped = Math.max(-maxAbsEval, Math.min(maxAbsEval, evaluation));
      const normalized = (maxAbsEval - clamped) / (maxAbsEval * 2);
      return paddingY + normalized * (height - paddingY * 2);
    };

    const zeroY = toY(0);
    const latest = analyzedPoints[analyzedPoints.length - 1] ?? points[points.length - 1];
    const availableWidth = width - paddingX * 2;
    const slotWidth = availableWidth / totalPly;
    const barWidth = slotWidth;
    const chartPoints = Array.from({ length: totalPly }, (_, index) => {
      const ply = index + 1;
      return (
        analyzedPointMap.get(ply) ?? {
          ply,
          from: null,
          to: null,
          san: null,
          evaluation: 0,
          bar: 0.5,
          depth: 0,
        }
      );
    });
    const formatEvaluation = (point: AnalysisProfilePoint) => {
      const san = point.san ? `${point.san} · ` : "";
      const depth = point.depth ? ` · depth ${point.depth}` : "";
      return `${point.ply}. Halbzug · ${san}Eval ${point.evaluation.toFixed(2)}${depth}`;
    };

    return (
      <div className="analysis-profile-panel">
        <div className="analysis-profile-header">
          <strong>Analyseverlauf</strong>
          <span>
            {latest?.ply ?? 0} Halbzüge · Eval {(latest?.evaluation ?? 0).toFixed(2)}
            {latest?.depth ? ` · depth ${latest.depth}` : ""}
          </span>
        </div>

        <svg
          className="analysis-profile-chart"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Bewertungsverlauf der analysierten Partie"
        >
          <line
            className="analysis-profile-zero-line"
            x1={paddingX}
            y1={zeroY}
            x2={width - paddingX}
            y2={zeroY}
          />
          {chartPoints.map((point) => {
            const x = paddingX + (point.ply - 1) * slotWidth;
            const y = toY(point.evaluation);
            const top = Math.min(y, zeroY);
            const barHeight = Math.max(1.5, Math.abs(zeroY - y));
            const isPositive = point.evaluation > 0;
            const isLatest = point.ply === latest?.ply;
            const isSelected = point.ply === analysisSelectedPosition?.ply;
            const hasMoveSelection = !!getAnalysisMoveSelectionForPly(point.ply)?.position;

            return (
              <rect
                key={point.ply}
                className={`analysis-profile-bar ${
                  isPositive ? "analysis-profile-bar-positive" : "analysis-profile-bar-negative"
                }${isLatest ? " analysis-profile-bar-latest" : ""}${isSelected ? " analysis-profile-bar-selected" : ""}${hasMoveSelection ? " analysis-profile-bar-clickable" : ""}`}
                x={x}
                y={top}
                width={barWidth}
                height={barHeight}
                rx={0}
                role={hasMoveSelection ? "button" : undefined}
                tabIndex={hasMoveSelection ? 0 : undefined}
                onClick={hasMoveSelection ? () => selectAnalysisPositionByPly(point.ply) : undefined}
                onKeyDown={
                  hasMoveSelection
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectAnalysisPositionByPly(point.ply);
                        }
                      }
                    : undefined
                }
              >
                <title>{formatEvaluation(point)}</title>
              </rect>
            );
          })}
        </svg>

        <div className="analysis-profile-footer">
          <span>{analysisReplayStatus ?? "Analysemodus"}</span>
          {isAnalysisReplayRunning && (
            <button className="analysis-cancel-button" onClick={cancelAnalysisReplay}>
              Cancel
            </button>
          )}
        </div>

        {analysisReplayError && (
          <div className="analysis-profile-error">{analysisReplayError}</div>
        )}
      </div>
    );
  };

  function getDefaultAnalysisLineIndex(point: AnalysisProfilePoint | undefined, lines: EngineLine[]): number {
    if (!point || lines.length === 0) {
      return 0;
    }

    const whiteToMove = point.ply % 2 === 0;
    let bestIndex = 0;
    let bestEval = lines[0]?.eval ?? 0;

    for (let index = 1; index < lines.length; index++) {
      const lineEval = lines[index]?.eval ?? 0;

      if (whiteToMove ? lineEval > bestEval : lineEval < bestEval) {
        bestEval = lineEval;
        bestIndex = index;
      }
    }

    return bestIndex;
  }

  function getEffectiveAnalysisLineIndex(
    point: AnalysisProfilePoint | undefined,
    lines: EngineLine[]
  ): number {
    if (lines.length === 0) {
      return 0;
    }

    if (analysisSelectedLineIndex != null
        && analysisSelectedLineIndex >= 0
        && analysisSelectedLineIndex < lines.length) {
      return analysisSelectedLineIndex;
    }

    return getDefaultAnalysisLineIndex(point, lines);
  }

  function getSelectedAnalysisPoint(): AnalysisProfilePoint | undefined {
    if (!analysisSelectedPosition) {
      return undefined;
    }

    return analysisProfile.find((point) => point.ply === analysisSelectedPosition.ply);
  }

  function splitAnalysisMoveText(moves: string): string[] {
    if (!moves || !moves.trim()) {
      return [];
    }

    const tokens = moves.trim().split(/\s+/);
    const result: string[] = [];

    for (const token of tokens) {
      if (token === "e.p." && result.length > 0) {
        result[result.length - 1] = `${result[result.length - 1]} ${token}`;
      } else {
        result.push(token);
      }
    }

    return result;
  }

  function getHighlightedAnalysisMoveIndex(line: EngineLine, isSelected: boolean): number {
    if (!isSelected) {
      return -1;
    }

    const positions = line.positions ?? [];
    if (positions.length <= 1) {
      return -1;
    }

    const currentPositionIndex = analysisLineAnimationIndex % positions.length;
    return currentPositionIndex > 0 ? currentPositionIndex - 1 : -1;
  }

  function renderAnalysisLineMoves(line: EngineLine, isSelected: boolean): ReactElement | string {
    const moves = splitAnalysisMoveText(line.moves);
    if (moves.length === 0) {
      return "—";
    }

    const highlightedMoveIndex = getHighlightedAnalysisMoveIndex(line, isSelected);

    return (
      <>
        {moves.map((move, moveIndex) => (
          <span
            key={`${moveIndex}-${move}`}
            className={
              moveIndex === highlightedMoveIndex
                ? "analysis-line-move analysis-line-move-current"
                : "analysis-line-move"
            }
          >
            {move}
          </span>
        ))}
      </>
    );
  }

  function getAnimatedAnalysisPosition(): string | null {
    const selectedPoint = getSelectedAnalysisPoint();
    const lines = selectedPoint?.lines ?? [];

    if (!analysisSelectedPosition) {
      return null;
    }

    if (lines.length === 0) {
      return analysisSelectedPosition.position;
    }

    const lineIndex = getEffectiveAnalysisLineIndex(selectedPoint, lines);
    const positions = lines[lineIndex]?.positions ?? [];

    if (positions.length === 0) {
      return analysisSelectedPosition.position;
    }

    return positions[analysisLineAnimationIndex % positions.length] ?? analysisSelectedPosition.position;
  }

  const renderAnalysisPositionBoard = () => {
    const animatedPosition = getAnimatedAnalysisPosition();

    if (!animatedPosition) {
      return (
        <div className="analysis-detail-placeholder">
          Zug in der MoveList anklicken, um eine Engine-Fortsetzung abzuspielen.
        </div>
      );
    }

    const squares: ReactElement[] = [];

    for (let i = 0; i < 64; i++) {
      const rankFromTop = Math.floor(i / 8);
      const fileFromLeft = i % 8;
      const pieceChar = animatedPosition.charAt(i);
      const pieceSymbol = getPieceSymbolFromPositionChar(pieceChar);
      const isLight = (rankFromTop + fileFromLeft) % 2 === 0;

      squares.push(
        <div
          key={i}
          className={[
            "analysis-position-square",
            isLight ? "analysis-position-square-light" : "analysis-position-square-dark",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {pieceSymbol && (
            <span
              className={[
                "analysis-position-piece",
                isWhitePositionPiece(pieceChar)
                  ? "analysis-position-piece-white"
                  : "analysis-position-piece-black",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {pieceSymbol}
            </span>
          )}
        </div>
      );
    }

    return <div className="analysis-position-board">{squares}</div>;
  };

  const renderAnalysisLinesForSelection = () => {
    if (!analysisSelectedPosition) {
      return (
        <div className="analysis-detail-placeholder">
          Nach Auswahl eines Zuges erscheinen hier die gespeicherten Engine-Varianten.
        </div>
      );
    }

    const selectedPoint = getSelectedAnalysisPoint();

    if (!selectedPoint) {
      return (
        <div className="analysis-detail-placeholder">
          Für diesen Halbzug liegt noch keine Bewertung vor.
        </div>
      );
    }

    const lines = selectedPoint.lines ?? [];

    if (lines.length === 0) {
      return (
        <div className="analysis-detail-placeholder">
          Für diese Stellung wurden keine Engine-Varianten geliefert.
        </div>
      );
    }

    const effectiveLineIndex = getEffectiveAnalysisLineIndex(selectedPoint, lines);

    return (
      <div className="analysis-lines-list">
        {lines.map((line, index) => {
          const isSelected = index === effectiveLineIndex;

          return (
            <button
              type="button"
              className={[
                "analysis-line-card",
                isSelected ? "analysis-line-card-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={`${index}-${line.moves}`}
              onClick={() => {
                setAnalysisSelectedLineIndex(index);
                setAnalysisLineAnimationIndex(0);
              }}
            >
              <div className="analysis-line-header">
                <strong>#{index + 1}</strong>
                <span>Eval {line.eval.toFixed(2)}</span>
                <span>depth {line.depth}</span>
              </div>
              <div className="analysis-line-moves">
                {renderAnalysisLineMoves(line, isSelected)}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderAnalysisDetails = () => {
    return (
      <div className="analysis-detail-row">
        <div className="analysis-position-panel">
          <div className="analysis-detail-title">
            {analysisSelectedPosition ? `Engine-Fortsetzung ab ${analysisSelectedPosition.label}` : "Engine-Fortsetzung"}
          </div>
          {renderAnalysisPositionBoard()}
        </div>

        <div className="analysis-lines-panel">
          <div className="analysis-detail-title">Engine-Varianten</div>
          {renderAnalysisLinesForSelection()}
        </div>
      </div>
    );
  };

  const renderAnalysisReplayContent = () => {
    return (
      <div className="analysis-replay-content">
        {renderAnalysisProfile()}
        {renderAnalysisDetails()}
      </div>
    );
  };

  const renderPieces = () => {
    return pieces.map((piece) => {
      const x = (piece.file - 1) * 80;
      const y = (8 - piece.rank) * 80;
      const isDragging = dragState?.pieceId === piece.id;
      const renderX = isDragging ? dragState.x : x;
      const renderY = isDragging ? dragState.y : y;

      const classes = [
        "piece",
        piece.color === "white" ? "piece-white" : "piece-black",
        isDragging ? "piece-dragging" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <div
          key={piece.id}
          className={classes}
          style={{
            transform: `translate(${renderX}px, ${renderY}px)`,
          }}
          onPointerDown={(event) => handlePiecePointerDown(event, piece)}
          onPointerMove={handlePiecePointerMove}
          onPointerUp={handlePiecePointerUp}
          onPointerCancel={handlePiecePointerCancel}
        >
          {getPieceSymbol(piece)}
        </div>
      );
    });
  };

  return (
    <>
      <header className="app-header">
        <h1>Chess Frontend</h1>

        <div className="top-engine-controls">
          {!analysisReplayActive && (
            <>
              <button
                className={[
                  "top-engine-button",
                  "auto-toggle",
                  engineAutoUpdate ? "top-engine-button-pressed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={toggleEngineAutoUpdate}
                aria-pressed={engineAutoUpdate}
                title="Automatische Engine-Auswertung ein-/ausschalten"
              >
                Evaluation
              </button>

              <button
                className={[
                  "top-engine-button",
                  "computer-toggle",
                  whiteComputerEnabled ? "top-engine-button-pressed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => updateWhiteComputerEnabled(!whiteComputerEnabledRef.current)}
                aria-pressed={whiteComputerEnabled}
                title="Computer spielt Weiß ein-/ausschalten"
              >
                White CPU
              </button>

              <button
                className={[
                  "top-engine-button",
                  "computer-toggle",
                  blackComputerEnabled ? "top-engine-button-pressed" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => updateBlackComputerEnabled(!blackComputerEnabledRef.current)}
                aria-pressed={blackComputerEnabled}
                title="Computer spielt Schwarz ein-/ausschalten"
              >
                Black CPU
              </button>
            </>
          )}

          {analysisReplayActive && isAnalysisReplayRunning && (
            <button
              className="top-engine-button analysis-repeat"
              onClick={cancelAnalysisReplay}
              title="Laufende Analyse abbrechen"
            >
              Analyse abbrechen
            </button>
          )}

          {analysisReplayActive && analysisReplayFinished && gameEndState && (
            <button
              className="top-engine-button analysis-repeat"
              onClick={reopenGameEndDialog}
              title="Optionen nach der abgeschlossenen Analyse öffnen"
            >
              Optionen
            </button>
          )}

          {!analysisReplayActive && (
            <>
              <button
                className="top-engine-button new-game"
                onClick={openGameSettingsDialog}
                title="Neue Partie konfigurieren"
              >
                New Game
              </button>

              <button
                className="top-engine-button engine-settings"
                onClick={() => setShowStockfishConfig((prev) => !prev)}
                title="Engine-Einstellungen anzeigen"
              >
                Engine Settings
              </button>

              <button
                className="top-engine-button engine-settings"
                onClick={() => setShowEngineManager(true)}
                title="Engine-Prozesse und UCI-Protokoll anzeigen"
              >
                Engine Manager
              </button>
            </>
          )}
        </div>
      </header>

      {showEngineManager && (
        <EngineManager onClose={() => setShowEngineManager(false)} />
      )}

      <main className="app-main">
        <div className="board-layout">
          <section className="moves-panel">
            <h2 className="panel-title">Moves</h2>

            <div className="player-names-panel">
              <div
                className={[
                  "player-name-row",
                  "player-name-row-white",
                  clock?.sideToMove === "white" ? "player-name-row-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                title={analysisReplayActive ? getAnalysisWhitePlayerName(clock, analysisWhitePlayerName) : getDisplayedWhitePlayerName(clock, whiteComputerEnabled)}
              >
                <span className="player-name-color">White</span>
                <span className="player-name-value">
                  {analysisReplayActive ? getAnalysisWhitePlayerName(clock, analysisWhitePlayerName) : getDisplayedWhitePlayerName(clock, whiteComputerEnabled)}
                </span>
              </div>

              <div
                className={[
                  "player-name-row",
                  "player-name-row-black",
                  clock?.sideToMove === "black" ? "player-name-row-active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                title={analysisReplayActive ? getAnalysisBlackPlayerName(clock, analysisBlackPlayerName) : getDisplayedBlackPlayerName(clock, blackComputerEnabled)}
              >
                <span className="player-name-color">Black</span>
                <span className="player-name-value">
                  {analysisReplayActive ? getAnalysisBlackPlayerName(clock, analysisBlackPlayerName) : getDisplayedBlackPlayerName(clock, blackComputerEnabled)}
                </span>
              </div>
            </div>

            <div className="moves-list">
              {moves.length === 0 && (
                <div className="moves-empty">No moves yet</div>
              )}

              {moves.map((row) => (
                <div key={row.moveNumber} className="move-row">
                  <span className="move-number">{row.moveNumber}.</span>
                  <span
                    className={[
                      "move-entry",
                      "move-entry-white",
                      row.whitePosition ? "move-entry-previewable" : "",
                      analysisSelectedPosition?.ply === (row.moveNumber - 1) * 2 + 1
                        ? "move-entry-analysis-selected"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseEnter={(e) => showMovePreview(e, row.whitePosition)}
                    onMouseMove={moveMovePreview}
                    onMouseLeave={hideMovePreview}
                    onClick={() =>
                      selectAnalysisPosition(
                        row.whitePosition,
                        row.white,
                        (row.moveNumber - 1) * 2 + 1
                      )
                    }
                  >
                    {row.white ?? ""}
                  </span>
                  <span
                    className={[
                      "move-entry",
                      "move-entry-black",
                      row.blackPosition ? "move-entry-previewable" : "",
                      analysisSelectedPosition?.ply === row.moveNumber * 2
                        ? "move-entry-analysis-selected"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseEnter={(e) => showMovePreview(e, row.blackPosition)}
                    onMouseMove={moveMovePreview}
                    onMouseLeave={hideMovePreview}
                    onClick={() =>
                      selectAnalysisPosition(
                        row.blackPosition,
                        row.black,
                        row.moveNumber * 2
                      )
                    }
                  >
                    {row.black ?? ""}
                  </span>
                </div>
              ))}

              {(isLoadingMoves || isComputerThinking) && (
                <div className="moves-empty">
                  {isComputerThinking
                    ? "Computer is thinking…"
                    : "Loading / applying moves…"}
                </div>
              )}

              {loadError && <div className="moves-empty">Error: {loadError}</div>}
            </div>
          </section>

          <section className="board-column">
            <div className="board-wrapper">
              <div className="board-container" ref={boardContainerRef}>
                <div className="board">{renderBoardSquares()}</div>
                <div className="pieces-layer">{renderPieces()}</div>
              </div>
            </div>

            {!analysisReplayActive && (
              <div className="clock-area">
                <div
                  className={[
                    "clock-box",
                    clock?.sideToMove === "white" ? "clock-active" : "",
                    clock?.whiteRunning ? "clock-running" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="clock-time">
                    {formatClockTime(clock?.whiteTime)}
                  </div>
                </div>

                <div
                  className={[
                    "clock-box",
                    clock?.sideToMove === "black" ? "clock-active" : "",
                    clock?.blackRunning ? "clock-running" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="clock-time">
                    {formatClockTime(clock?.blackTime)}
                  </div>
                </div>

                {clockError && <div className="clock-error">{clockError}</div>}
              </div>
            )}
          </section>

          <section className="engine-panel">
            <div className="engine-panel-main">
              {engineAutoUpdate && engineEval && !clock?.gameState && (
                <div className="engine-bar-wrapper">
                  <div
                    className="engine-bar-white"
                    style={{ height: `${engineEval.bar * 100}%` }}
                  />
                  <div
                    className="engine-bar-black"
                    style={{ height: `${(1 - engineEval.bar) * 100}%` }}
                  />
                </div>
              )}

              <div className="engine-content-column">
                {analysisReplayActive ? (
                  renderAnalysisReplayContent()
                ) : (
                  <>
                    {showStockfishConfig && (
                      <div className="stockfish-config-panel">
                        <div className="stockfish-config-header">
                          <strong>Engine configuration</strong>

                          {stockfishConfig && (
                            <span className="stockfish-config-version">
                              version {stockfishConfig.version}
                            </span>
                          )}
                        </div>

                        {stockfishConfig ? (
                          <>
                            <div className="stockfish-config-sections">
                              <div className="stockfish-player-config-sections">
                                {renderStockfishSlotSection(
                                  "whitePlayer",
                                  "White player engine",
                                  stockfishConfig.whitePlayerVersion,
                                  false
                                )}

                                {renderStockfishSlotSection(
                                  "blackPlayer",
                                  "Black player engine",
                                  stockfishConfig.blackPlayerVersion,
                                  false
                                )}
                              </div>

                              {renderStockfishSlotSection(
                                "evaluation",
                                "Evaluation engine",
                                stockfishConfig.evaluationVersion,
                                true
                              )}
                            </div>

                            <button
                              className="stockfish-save-button"
                              onClick={saveStockfishConfig}
                              disabled={isSavingStockfishConfig}
                            >
                              {isSavingStockfishConfig
                                ? "Saving..."
                                : "Save engine settings"}
                            </button>
                          </>
                        ) : (
                          <div className="engine-empty">
                            Engine settings are loading…
                          </div>
                        )}

                        {stockfishConfigMessage && (
                          <div className="stockfish-config-message">
                            {stockfishConfigMessage}
                          </div>
                        )}

                        {stockfishConfigError && (
                          <div className="engine-error">
                            {stockfishConfigError}
                          </div>
                        )}
                      </div>
                    )}

                    {evalError && (
                      <div className="engine-error">Error: {evalError}</div>
                    )}

                    {engineAutoUpdate && engineEval && !clock?.gameState && (
                      <div className="engine-lines">
                        {engineEval.lines.length === 0 && (
                          <div className="engine-empty">No engine lines.</div>
                        )}

                        {engineEval.lines.map((line, idx) => (
                          <div key={idx} className="engine-line">
                            <div className="engine-line-header">
                              #{idx + 1} · {line.eval.toFixed(2)} · depth{" "}
                              {line.depth}
                            </div>
                            <div className="engine-line-moves">{line.moves}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {engineAutoUpdate && !engineEval && !isLoadingEval && !evalError && !clock?.gameState && (
                      <div className="engine-placeholder-text">
                        Engine output will appear here.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          {renderHoverBoard()}

          {promotionContext && (
            <div className="promotion-dialog">
              <div className="promotion-dialog-content">
                <p>
                  Promotion für{" "}
                  {promotionContext.color === "white" ? "weißen" : "schwarzen"}{" "}
                  Bauern ({promotionContext.from} → {promotionContext.to}):
                </p>

                <div className="promotion-options">
                  {(["queen", "rook", "bishop", "knight"] as PieceType[]).map(
                    (ptype) => (
                      <button
                        key={ptype}
                        className="promotion-button"
                        onClick={async () => {
                          const ctx = promotionContext;

                          if (!ctx) {
                            return;
                          }

                          setPromotionContext(null);
                          await performMove(ctx.from, ctx.to, ptype);
                        }}
                      >
                        {ptype.toUpperCase()}
                      </button>
                    )
                  )}
                </div>

                <button
                  className="promotion-cancel-button"
                  onClick={() => setPromotionContext(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {showGameSettingsDialog && (
            <div className="game-settings-dialog">
              <div className="game-settings-dialog-content">
                <h2>New Game</h2>

                <div className="game-settings-form">
                  <label className="game-settings-field">
                    <span>Time for each player (minutes)</span>
                    <input
                      type="number"
                      min={1}
                      value={Math.max(
                        1,
                        Math.floor(gameSettings.timeForEachPlayerSeconds / 60)
                      )}
                      onChange={(e) =>
                        updateGameSettingsNumberField(
                          "timeForEachPlayerSeconds",
                          Number(e.target.value) * 60
                        )
                      }
                    />
                  </label>

                  <label className="game-settings-field">
                    <span>Increment for white (seconds)</span>
                    <input
                      type="number"
                      min={0}
                      value={gameSettings.incrementForWhiteSeconds}
                      onChange={(e) =>
                        updateGameSettingsNumberField(
                          "incrementForWhiteSeconds",
                          Number(e.target.value)
                        )
                      }
                    />
                  </label>

                  <label className="game-settings-field">
                    <span>Increment for black (seconds)</span>
                    <input
                      type="number"
                      min={0}
                      value={gameSettings.incrementForBlackSeconds}
                      onChange={(e) =>
                        updateGameSettingsNumberField(
                          "incrementForBlackSeconds",
                          Number(e.target.value)
                        )
                      }
                    />
                  </label>

                </div>

                {gameSettingsError && (
                  <div className="game-settings-error">{gameSettingsError}</div>
                )}

                <div className="game-settings-dialog-actions">
                  <button
                    className="game-settings-dialog-button"
                    onClick={() => startNewGame(gameSettings)}
                    disabled={isStartingNewGame}
                  >
                    {isStartingNewGame ? "Starting..." : "Start Game"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAnalysisSettingsDialog && (
            <div className="analysis-settings-dialog">
              <div className="analysis-settings-dialog-content">
                <h2>Analyse</h2>
                <p className="analysis-settings-description">
                  Die beendete Partie wird von der Ausgangsstellung aus nachgespielt.
                  Nach jedem Halbzug bewertet die gewählte Analyse-Engine die neue Stellung.
                </p>

                <div className="analysis-settings-form">
                  <label className="analysis-settings-field analysis-settings-field-wide">
                    <span>Engine path</span>
                    <input
                      type="text"
                      value={analysisSettings.enginePath}
                      onChange={(e) =>
                        updateAnalysisSettingsTextField("enginePath", e.target.value)
                      }
                    />
                  </label>
                  <label className="analysis-settings-field">
                    <span>Time per move (seconds)</span>
                    <input
                      type="number"
                      min={1}
                      max={3600}
                      value={analysisSettings.moveTimeSeconds}
                      onChange={(e) =>
                        updateAnalysisSettingsNumberField(
                          "moveTimeSeconds",
                          Number(e.target.value)
                        )
                      }
                    />
                  </label>

                  <label className="analysis-settings-field">
                    <span>Depth</span>
                    <input
                      type="number"
                      min={0}
                      max={64}
                      value={analysisSettings.depth}
                      onChange={(e) =>
                        updateAnalysisSettingsNumberField("depth", Number(e.target.value))
                      }
                    />
                  </label>

                  <label className="analysis-settings-field">
                    <span>Threads</span>
                    <input
                      type="number"
                      min={1}
                      max={256}
                      value={analysisSettings.threads}
                      onChange={(e) =>
                        updateAnalysisSettingsNumberField("threads", Number(e.target.value))
                      }
                    />
                  </label>

                  <label className="analysis-settings-field">
                    <span>Hash MB</span>
                    <input
                      type="number"
                      min={1}
                      max={262144}
                      value={analysisSettings.hashSize}
                      onChange={(e) =>
                        updateAnalysisSettingsNumberField("hashSize", Number(e.target.value))
                      }
                    />
                  </label>

                  <label className="analysis-settings-field">
                    <span>MultiPV</span>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={analysisSettings.multiPV}
                      onChange={(e) =>
                        updateAnalysisSettingsNumberField("multiPV", Number(e.target.value))
                      }
                    />
                  </label>

                  <label className="analysis-settings-field">
                    <span>Contempt</span>
                    <input
                      type="number"
                      min={-100}
                      max={100}
                      value={analysisSettings.contempt}
                      onChange={(e) =>
                        updateAnalysisSettingsNumberField("contempt", Number(e.target.value))
                      }
                    />
                  </label>

                  <label className="analysis-settings-field">
                    <span>UCI Elo</span>
                    <input
                      type="number"
                      min={0}
                      max={4000}
                      value={analysisSettings.uciElo}
                      onChange={(e) =>
                        updateAnalysisSettingsNumberField("uciElo", Number(e.target.value))
                      }
                    />
                  </label>

                </div>

                {analysisReplayError && (
                  <div className="analysis-settings-error">{analysisReplayError}</div>
                )}

                <div className="analysis-settings-dialog-actions">
                  <button
                    className="analysis-settings-dialog-button"
                    onClick={() => setShowAnalysisSettingsDialog(false)}
                    disabled={isAnalysisReplayRunning}
                  >
                    Cancel
                  </button>
                  <button
                    className="analysis-settings-dialog-button"
                    onClick={startAnalysisReplay}
                    disabled={isAnalysisReplayRunning}
                  >
                    {isAnalysisReplayRunning ? "Starting..." : "OK"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showGameEndDialog && gameEndState && (
            <div className="game-end-dialog">
              <div className="game-end-dialog-content">
                <h2>Game Over</h2>
                <p>{formatGameState(gameEndState, clock)}</p>

                <div className="game-end-dialog-actions">
                  <button
                    className="game-end-dialog-button"
                    onClick={openGameSettingsDialog}
                  >
                    New Game
                  </button>

                  <button
                    className="game-end-dialog-button"
                    onClick={openAnalysisSettingsDialog}
                  >
                    Analyse
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
};