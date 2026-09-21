import type {
  ChessDatabaseLoadedGame,
  DatabaseGameSummary,
  DatabaseImportJob,
  DatabaseSearchRequest,
  DatabaseStatus,
} from "../database/chessDatabaseTypes";

async function errorMessage(response: Response): Promise<string> {
  const message = await response.text();
  return message || `HTTP ${response.status}`;
}

async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  return (await response.json()) as T;
}

export function fetchChessDatabaseStatus(): Promise<DatabaseStatus> {
  return requestJson<DatabaseStatus>("/api/chess-database/status");
}

export function fetchDatabaseImportJob(
  importId: string,
): Promise<DatabaseImportJob> {
  return requestJson<DatabaseImportJob>(
    `/api/chess-database/imports/${encodeURIComponent(importId)}`,
  );
}

export function startDatabaseImport(file: File): Promise<DatabaseImportJob> {
  const formData = new FormData();
  formData.append("file", file, file.name);
  return requestJson<DatabaseImportJob>("/api/chess-database/import", {
    method: "POST",
    body: formData,
  });
}

export function cancelDatabaseImport(
  importId: string,
): Promise<DatabaseImportJob> {
  return requestJson<DatabaseImportJob>(
    `/api/chess-database/imports/${encodeURIComponent(importId)}/cancel`,
    { method: "POST" },
  );
}

export function searchDatabaseGames(
  criteria: DatabaseSearchRequest,
): Promise<DatabaseGameSummary[]> {
  return requestJson<DatabaseGameSummary[]>("/api/chess-database/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(criteria),
  });
}

export function loadDatabaseGame(
  gameId: number,
): Promise<ChessDatabaseLoadedGame> {
  return requestJson<ChessDatabaseLoadedGame>(
    `/api/chess-database/games/${gameId}/load`,
    { method: "POST" },
  );
}
