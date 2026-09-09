import type { MoveResult, PieceColor } from "../types";

export interface ComputerMoveApiResponse {
  ok: boolean;
  status: number;
  data: MoveResult;
}

export interface CancelComputerMoveApiResponse {
  ok: boolean;
  status: number;
}

export async function requestComputerMove(): Promise<ComputerMoveApiResponse> {
  const response = await fetch("/api/computer-move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const data = (await response.json()) as MoveResult;
  return { ok: response.ok, status: response.status, data };
}

export async function cancelComputerMove(side: PieceColor): Promise<CancelComputerMoveApiResponse> {
  const response = await fetch(`/api/computer-move/cancel?side=${encodeURIComponent(side)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return { ok: response.ok, status: response.status };
}
