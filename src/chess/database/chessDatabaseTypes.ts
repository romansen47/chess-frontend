export interface ChessDatabaseLoadedGame {
  totalPlies: number;
  sideToMove: string | null;
  position: string;
  moves: Array<{
    ply: number;
    uci: string;
    san: string | null;
    position: string;
  }>;
  whitePlayerName: string | null;
  blackPlayerName: string | null;
}

export interface DatabaseStatus {
  available: boolean;
  path: string;
  name: string;
  schemaVersion: number | null;
  gameCount: number;
  sizeBytes: number;
  message: string | null;
}

export type DatabaseImportPhase =
  | "READING_PGN"
  | "FINALIZING_DATABASE"
  | "COMPLETE"
  | "CANCELLED"
  | "FAILED";

export interface DatabaseImportJob {
  id: string;
  fileName: string;
  status: "RUNNING" | "COMPLETE" | "CANCELLED" | "FAILED";
  phase: DatabaseImportPhase;
  totalBytes: number;
  bytesRead: number;
  processedGames: number;
  importedGames: number;
  skippedGames: number;
  totalPlies: number;
  elapsedMillis: number;
  message: string | null;
}

export interface DatabaseGameSummary {
  id: number;
  date: string | null;
  white: string;
  black: string;
  whiteElo: number | null;
  blackElo: number | null;
  result: string | null;
  event: string | null;
  eco: string | null;
  plyCount: number;
}

export type PlayerColorAssignment = "any" | "player1White" | "player1Black";

export interface SearchForm {
  player: string;
  player2: string;
  colorAssignment: PlayerColorAssignment;
  fromYear: string;
  toYear: string;
  result: string;
  minElo: string;
}

export interface DatabaseSearchRequest {
  player: string | null;
  player2: string | null;
  white: string | null;
  black: string | null;
  fromYear: number | null;
  toYear: number | null;
  result: string | null;
  minElo: number | null;
  limit: number;
}

export const EMPTY_DATABASE_SEARCH: SearchForm = {
  player: "",
  player2: "",
  colorAssignment: "any",
  fromYear: "",
  toYear: "",
  result: "",
  minElo: "",
};
