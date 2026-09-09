import type { ClockState, GameSettings, MoveRow, UciGameMove } from "../types";

export function mapImportedUciMovesToRows(importedMoves: UciGameMove[]): MoveRow[] {
  const rows: MoveRow[] = [];
  for (const move of importedMoves ?? []) {
    const ply = Math.max(1, move.ply);
    const moveNumber = Math.ceil(ply / 2);
    let row = rows.find((candidate) => candidate.moveNumber === moveNumber);
    if (!row) {
      row = { moveNumber };
      rows.push(row);
    }
    const displayMove = move.san && move.san.trim().length > 0 ? move.san : move.uci;
    if (ply % 2 === 1) {
      row.white = displayMove;
      row.whitePosition = move.position;
    } else {
      row.black = displayMove;
      row.blackPosition = move.position;
    }
  }
  return rows.sort((a, b) => a.moveNumber - b.moveNumber);
}

export function formatPlayerDisplayName(name: string | null | undefined, fallback: string): string {
  const trimmed = name?.trim();
  if (!trimmed || trimmed === "ChessGame" || trimmed === "Simulation") return fallback;
  return trimmed;
}

export function getDisplayedWhitePlayerName(clock: ClockState | null, whiteComputerEnabled: boolean): string {
  return whiteComputerEnabled
    ? formatPlayerDisplayName(clock?.whitePlayerEngineName, "White Engine")
    : formatPlayerDisplayName(clock?.whitePlayerName, "White");
}

export function getDisplayedBlackPlayerName(clock: ClockState | null, blackComputerEnabled: boolean): string {
  return blackComputerEnabled
    ? formatPlayerDisplayName(clock?.blackPlayerEngineName, "Black Engine")
    : formatPlayerDisplayName(clock?.blackPlayerName, "Black");
}

export function getAnalysisWhitePlayerName(clock: ClockState | null, storedAnalysisName: string | null): string {
  return storedAnalysisName
    || formatPlayerDisplayName(clock?.whitePlayerEngineName, "")
    || formatPlayerDisplayName(clock?.whitePlayerName, "White");
}

export function getAnalysisBlackPlayerName(clock: ClockState | null, storedAnalysisName: string | null): string {
  return storedAnalysisName
    || formatPlayerDisplayName(clock?.blackPlayerEngineName, "")
    || formatPlayerDisplayName(clock?.blackPlayerName, "Black");
}

export function formatClockTime(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) return "--:--";
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

export function formatLostOnTime(clock: ClockState | null | undefined): string {
  if (clock?.whiteTime === 0 && clock.blackTime > 0) return "Black wins because White ran out of time.";
  if (clock?.blackTime === 0 && clock.whiteTime > 0) return "White wins because Black ran out of time.";
  if (clock?.sideToMove === "white") return "Black wins because White ran out of time.";
  if (clock?.sideToMove === "black") return "White wins because Black ran out of time.";
  return "Game ended on time.";
}

export function formatGameState(gameState: string | null | undefined, clock?: ClockState | null): string {
  switch (gameState) {
    case "WHITE_MATED": return "Black wins by checkmate.";
    case "BLACK_MATED": return "White wins by checkmate.";
    case "STALEMATE": return "Remis durch Patt.";
    case "WHITE_RESIGNED": return "Black wins because White resigned.";
    case "BLACK_RESIGNED": return "White wins because Black resigned.";
    case "LOST_ON_TIME": return formatLostOnTime(clock);
    case "DRAW_BY_50_MOVES_RULE": return "Draw by the fifty-move rule.";
    case "DRAW_BY_THREEFOLD_REPETITION": return "Draw by threefold repetition.";
    default: return gameState ? `Game ended: ${gameState}` : "The game has ended.";
  }
}

export function formatTimeControlFromSettings(settings: GameSettings): string {
  const base = settings.timeForEachPlayerSeconds % 60 === 0
    ? `${settings.timeForEachPlayerSeconds / 60}`
    : `${settings.timeForEachPlayerSeconds}s`;
  if (settings.incrementForWhiteSeconds === settings.incrementForBlackSeconds) {
    return `${base}+${settings.incrementForWhiteSeconds}`;
  }
  return `${base}+${settings.incrementForWhiteSeconds}/${settings.incrementForBlackSeconds}`;
}
