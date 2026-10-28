import type {
  AnalysisReplaySettings,
  AnalysisReplayStep,
  AnalysisVariationMoveResult,
  AnalysisVariationRequest,
  EngineEvaluation,
  PossibleMovesResponse,
} from "../types";
import {
  jsonRequest,
  responseErrorMessage,
  requestJson,
  requestJsonResponse,
} from "./httpClient";

export interface AnalysisVariationMoveApiResponse {
  ok: boolean;
  status: number;
  data: AnalysisVariationMoveResult;
}

export function fetchAnalysisPossibleMoves(request: AnalysisVariationRequest): Promise<PossibleMovesResponse> {
  return requestJson<PossibleMovesResponse>(
    "/api/analysis-variation/possible-moves",
    jsonRequest("POST", request),
  );
}

export function submitAnalysisVariationMove(request: AnalysisVariationRequest): Promise<AnalysisVariationMoveApiResponse> {
  return requestJsonResponse<AnalysisVariationMoveResult>(
    "/api/analysis-variation/move",
    jsonRequest("POST", request),
  );
}

export function fetchAnalysisEvaluation(ply: number): Promise<EngineEvaluation> {
  return requestJson<EngineEvaluation>(
    `/api/analysis-eval?ply=${encodeURIComponent(String(ply))}`,
  );
}

export function fetchAnalysisVariationEvaluation(ply: number, moves: string[]): Promise<EngineEvaluation> {
  return requestJson<EngineEvaluation>(
    "/api/analysis-eval/variation",
    jsonRequest(
      "POST",
      { anchorPly: ply, moves } satisfies AnalysisVariationRequest,
    ),
  );
}

export async function stopAnalysisEvaluationRequest(options?: { keepalive?: boolean }): Promise<void> {
  await fetch("/api/analysis-eval/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: options?.keepalive ?? false,
  });
}

export function startAnalysisReplayRequest(settings: AnalysisReplaySettings): Promise<AnalysisReplayStep> {
  return requestJson<AnalysisReplayStep>(
    "/api/analysis-replay/start",
    jsonRequest("POST", settings),
  );
}

export async function fetchAnalysisReplayState(): Promise<AnalysisReplayStep | null> {
  const response = await fetch("/api/analysis-replay/state");
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(await responseErrorMessage(response));
  return (await response.json()) as AnalysisReplayStep;
}

export function fetchNextAnalysisReplayStep(): Promise<AnalysisReplayStep> {
  return requestJson<AnalysisReplayStep>("/api/analysis-replay/next", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

export async function cancelAnalysisReplayRequest(): Promise<void> {
  await fetch("/api/analysis-replay/cancel", { method: "POST", headers: { "Content-Type": "application/json" } });
}
