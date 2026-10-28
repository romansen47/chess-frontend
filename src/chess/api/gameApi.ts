import type {
  ClockState,
  GameAnnotation,
  GameSettings,
  GameMetadataResponse,
  GameSnapshotResponse,
  UciGameResponse,
} from "../types";
import { jsonRequest, requestBlob, requestJson } from "./httpClient";

export function fetchGameSettings(): Promise<GameSettings> {
  return requestJson<GameSettings>("/api/game-settings");
}

export function fetchGameSnapshot(): Promise<GameSnapshotResponse> {
  return requestJson<GameSnapshotResponse>("/api/game/state");
}

export function fetchClock(): Promise<ClockState> {
  return requestJson<ClockState>("/api/clock");
}

export function createNewGame(settings: GameSettings): Promise<GameSettings> {
  return requestJson<GameSettings>(
    "/api/new-game",
    jsonRequest("POST", settings),
  );
}

export function importPgn(content: string): Promise<UciGameResponse> {
  return requestJson<UciGameResponse>("/api/game/pgn", {
    method: "POST",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: content,
  });
}

export function exportPgn(whiteComputer: boolean, blackComputer: boolean): Promise<Blob> {
  const params = new URLSearchParams({
    whiteComputer: String(whiteComputer),
    blackComputer: String(blackComputer),
  });
  return requestBlob(`/api/game/pgn?${params.toString()}`);
}


export async function saveGameAnnotations(
  annotations: GameAnnotation[],
  whiteComputer: boolean,
  blackComputer: boolean
): Promise<GameAnnotation[]> {
  return requestJson<GameAnnotation[]>(
    "/api/game/annotations",
    jsonRequest("POST", { annotations, whiteComputer, blackComputer }),
  );
}


export async function saveGameMetadata(
  tags: Record<string, string>,
): Promise<GameMetadataResponse> {
  return requestJson<GameMetadataResponse>(
    "/api/game/metadata",
    jsonRequest("POST", { tags }),
  );
}
