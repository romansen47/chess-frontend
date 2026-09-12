import type {
  ClockState,
  GameAnnotation,
  GameSettings,
  GameSnapshotResponse,
  UciGameResponse,
} from "../types";

export async function fetchGameSettings(): Promise<GameSettings> {
  const response = await fetch("/api/game-settings");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as GameSettings;
}

export async function fetchGameSnapshot(): Promise<GameSnapshotResponse> {
  const response = await fetch("/api/game/state");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as GameSnapshotResponse;
}

export async function fetchClock(): Promise<ClockState> {
  const response = await fetch("/api/clock");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as ClockState;
}

export async function createNewGame(settings: GameSettings): Promise<GameSettings> {
  const response = await fetch("/api/new-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as GameSettings;
}

export async function importPgn(content: string): Promise<UciGameResponse> {
  const response = await fetch("/api/game/pgn", {
    method: "POST",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: content,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  return (await response.json()) as UciGameResponse;
}

export async function exportPgn(whiteComputer: boolean, blackComputer: boolean): Promise<Blob> {
  const params = new URLSearchParams({
    whiteComputer: String(whiteComputer),
    blackComputer: String(blackComputer),
  });
  const response = await fetch(`/api/game/pgn?${params.toString()}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  return await response.blob();
}


export async function saveGameAnnotations(
  annotations: GameAnnotation[],
  whiteComputer: boolean,
  blackComputer: boolean
): Promise<GameAnnotation[]> {
  const response = await fetch("/api/game/annotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ annotations, whiteComputer, blackComputer }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  return (await response.json()) as GameAnnotation[];
}
