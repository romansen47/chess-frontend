import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";

type PieceColor = "white" | "black";
type PieceType = "pawn" | "rook" | "knight" | "bishop" | "queen" | "king";

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

function formatClockTime(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) {
    return "--:--";
  }

  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function formatGameState(gameState: string | null | undefined): string {
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
      return "Die Partie wurde durch Zeitüberschreitung beendet.";
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
    moveTimeSeconds: 5,
    depth: 0,
    threads: 1,
    hashSize: 256,
    multiPV: 1,
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
  const [analysisProfile, setAnalysisProfile] =
    useState<AnalysisProfilePoint[]>([{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }]);
  const analysisReplayCancelledRef = useRef<boolean>(false);

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
    hint: string,
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
                    Number(e.target.value)
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

        <div className="stockfish-config-hint">{hint}</div>
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

  function openAnalysisSettingsDialog() {
    setAnalysisReplayError(null);
    setAnalysisReplayStatus(null);
    setShowGameEndDialog(false);
    setShowAnalysisSettingsDialog(true);
  }

  function updateAnalysisSettingsNumberField(
    key: keyof AnalysisReplaySettings,
    value: number
  ) {
    const safeValue = Number.isFinite(value) ? value : 0;

    setAnalysisSettings((prev) => ({
      ...prev,
      [key]: key === "contempt" ? safeValue : Math.max(0, safeValue),
    }));
  }

  function applyAnalysisReplayStep(step: AnalysisReplayStep) {
    if (step.board?.pieces) {
      setPieces(mapBackendPiecesToLocalPieces(step.board.pieces));
    }

    if (step.from && step.to) {
      setLastMove({ from: step.from, to: step.to });
    }

    setAnalysisProfile(step.profile?.length ? step.profile : [{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }]);

    setEngineEval({
      eval: step.evaluation ?? 0,
      bar: step.bar ?? 0.5,
      lines: [],
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
      setIsAnalysisReplayRunning(true);
      setShowAnalysisSettingsDialog(false);
      setShowGameEndDialog(false);
      setSelectedSquare(null);
      updatePossibleTargets([]);
      setHoverPreview(null);
      setPromotionContext(null);
      disablePlayerEngines();
      setAnalysisReplayActive(true);
      setEngineAutoUpdate(false);
      setAnalysisProfile([{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }]);

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
      setAnalysisReplayActive(false);
      setIsAnalysisReplayRunning(false);
    }
  }

  async function cancelAnalysisReplay() {
    analysisReplayCancelledRef.current = true;
    setIsAnalysisReplayRunning(false);
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

  function animateMoveLocally(from: string, to: string) {
    const targetCoords = getSquareCoords(to);

    if (!targetCoords) {
      return;
    }

    setPieces((prev) => {
      const movingPiece = prev.find((p) => squareName(p.file, p.rank) === from);
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
          ? { ...p, file: targetCoords.file, rank: targetCoords.rank }
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

  function handleGameEndState(gameState: string | null | undefined) {
    if (!gameState) {
      return false;
    }

    setGameEndState(gameState);
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
        animateMoveLocally(data.from, data.to);
        setLastMove({ from: data.from, to: data.to });
        addMoveToMoveList(data);
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
        animateMoveLocally(from, to);
      }
      setLastMove({ from, to });
      setSelectedSquare(null);
      updatePossibleTargets([]);
      addMoveToMoveList(data);

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
    const width = 640;
    const height = 82;
    const paddingX = 12;
    const paddingY = 10;
    const maxAbsEval = 5;
    const points = analysisProfile.length > 0 ? analysisProfile : [{ ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 }];
    const totalPly = Math.max(1, points[points.length - 1]?.ply ?? 1);

    const toX = (ply: number) =>
      paddingX + (Math.max(0, ply) / totalPly) * (width - paddingX * 2);
    const toY = (evaluation: number) => {
      const clamped = Math.max(-maxAbsEval, Math.min(maxAbsEval, evaluation));
      const normalized = (maxAbsEval - clamped) / (maxAbsEval * 2);
      return paddingY + normalized * (height - paddingY * 2);
    };

    const polyline = points
      .map((point) => `${toX(point.ply)},${toY(point.evaluation)}`)
      .join(" ");
    const zeroY = toY(0);
    const latest = points[points.length - 1];

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
          <polyline className="analysis-profile-line" points={polyline} />
          {points.map((point) => (
            <circle
              key={point.ply}
              className="analysis-profile-point"
              cx={toX(point.ply)}
              cy={toY(point.evaluation)}
              r={point.ply === latest?.ply ? 3.2 : 2.1}
            />
          ))}
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
                onClick={() => setEngineAutoUpdate((prev) => !prev)}
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
        </div>
      </header>

      <main className="app-main">
        <div className="board-layout">
          <section className="moves-panel">
            <h2 className="panel-title">Moves</h2>

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
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseEnter={(e) => showMovePreview(e, row.whitePosition)}
                    onMouseMove={moveMovePreview}
                    onMouseLeave={hideMovePreview}
                  >
                    {row.white ?? ""}
                  </span>
                  <span
                    className={[
                      "move-entry",
                      "move-entry-black",
                      row.blackPosition ? "move-entry-previewable" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseEnter={(e) => showMovePreview(e, row.blackPosition)}
                    onMouseMove={moveMovePreview}
                    onMouseLeave={hideMovePreview}
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

            <div className="clock-area">
              {analysisReplayActive ? (
                renderAnalysisProfile()
              ) : (
                <>
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
                </>
              )}
            </div>
          </section>

          <section className="engine-panel">
            <div className="engine-panel-main">
              {engineEval ? (
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
              ) : (
                <div className="engine-bar-wrapper engine-bar-wrapper-empty" />
              )}

              <div className="engine-content-column">
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
                              "Für echte Computerzüge von Weiß. Depth = 0 bedeutet: nutze Move time. MultiPV wird serverseitig auf 1 fixiert.",
                              false
                            )}

                            {renderStockfishSlotSection(
                              "blackPlayer",
                              "Black player engine",
                              stockfishConfig.blackPlayerVersion,
                              "Für echte Computerzüge von Schwarz. Depth = 0 bedeutet: nutze Move time. MultiPV wird serverseitig auf 1 fixiert.",
                              false
                            )}
                          </div>

                          {renderStockfishSlotSection(
                            "evaluation",
                            "Evaluation engine",
                            stockfishConfig.evaluationVersion,
                            "Für die Evaluation. Änderungen hier leeren serverseitig den Evaluation-Cache.",
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

                {engineEval && (
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

                {!engineEval && !isLoadingEval && !evalError && (
                  <div className="engine-placeholder-text">
                    Engine output will appear here.
                  </div>
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
                  Nach jedem Halbzug bewertet die DeepAnalysisUciEngine die neue Stellung.
                </p>

                <div className="analysis-settings-form">
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
                      min={1}
                      max={256}
                      value={analysisSettings.multiPV}
                      onChange={(e) =>
                        updateAnalysisSettingsNumberField("multiPV", Number(e.target.value))
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
                <p>{formatGameState(gameEndState)}</p>

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