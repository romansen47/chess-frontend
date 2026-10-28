import type { MoveResult, PieceColor } from "../types";
import { requestJsonResponse } from "./httpClient";

export interface ComputerMoveApiResponse {
  ok: boolean;
  status: number;
  data: MoveResult;
}

export interface CancelComputerMoveApiResponse {
  ok: boolean;
  status: number;
}

export function requestComputerMove(): Promise<ComputerMoveApiResponse> {
  return requestJsonResponse<MoveResult>("/api/computer-move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export async function cancelComputerMove(side: PieceColor): Promise<CancelComputerMoveApiResponse> {
  const response = await fetch(`/api/computer-move/cancel?side=${encodeURIComponent(side)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return { ok: response.ok, status: response.status };
}
