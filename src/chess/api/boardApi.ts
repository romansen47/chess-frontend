import type { BoardResponse, MoveRequest, MoveResult, PossibleMovesResponse } from "../types";
import { jsonRequest, requestJson, requestJsonResponse } from "./httpClient";

export interface MoveApiResponse {
  ok: boolean;
  status: number;
  data: MoveResult;
}

export function fetchBoard(): Promise<BoardResponse> {
  return requestJson<BoardResponse>("/api/board");
}

export function fetchPossibleMoves(from: string): Promise<PossibleMovesResponse> {
  return requestJson<PossibleMovesResponse>(
    `/api/possible-moves?from=${encodeURIComponent(from)}`,
  );
}

export function submitMove(request: MoveRequest): Promise<MoveApiResponse> {
  return requestJsonResponse<MoveResult>(
    "/api/move",
    jsonRequest("POST", request),
  );
}
