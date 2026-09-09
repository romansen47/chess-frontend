import type { BoardResponse, MoveRequest, MoveResult, PossibleMovesResponse } from "../types";

export interface MoveApiResponse {
  ok: boolean;
  status: number;
  data: MoveResult;
}

export async function fetchBoard(): Promise<BoardResponse> {
  const response = await fetch("/api/board");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as BoardResponse;
}

export async function fetchPossibleMoves(from: string): Promise<PossibleMovesResponse> {
  const response = await fetch(`/api/possible-moves?from=${encodeURIComponent(from)}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  return (await response.json()) as PossibleMovesResponse;
}

export async function submitMove(request: MoveRequest): Promise<MoveApiResponse> {
  const response = await fetch("/api/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = (await response.json()) as MoveResult;
  return { ok: response.ok, status: response.status, data };
}
