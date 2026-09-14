import type {
  AnalysisReplaySettings,
  AnalysisReplayStep,
  AnalysisVariationMoveResult,
  AnalysisVariationRequest,
  EngineEvaluation,
  PossibleMovesResponse,
} from "../types";

export interface AnalysisVariationMoveApiResponse {
  ok: boolean;
  status: number;
  data: AnalysisVariationMoveResult;
}

export async function fetchAnalysisPossibleMoves(request: AnalysisVariationRequest): Promise<PossibleMovesResponse> {
  const response = await fetch("/api/analysis-variation/possible-moves", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  return (await response.json()) as PossibleMovesResponse;
}

export async function submitAnalysisVariationMove(request: AnalysisVariationRequest): Promise<AnalysisVariationMoveApiResponse> {
  const response = await fetch("/api/analysis-variation/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = (await response.json()) as AnalysisVariationMoveResult;
  return { ok: response.ok, status: response.status, data };
}

export async function fetchAnalysisEvaluation(ply: number): Promise<EngineEvaluation> {
  const response = await fetch(`/api/analysis-eval?ply=${encodeURIComponent(String(ply))}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  return (await response.json()) as EngineEvaluation;
}

export async function fetchAnalysisVariationEvaluation(ply: number, moves: string[]): Promise<EngineEvaluation> {
  const response = await fetch("/api/analysis-eval/variation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anchorPly: ply, moves } satisfies AnalysisVariationRequest),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  return (await response.json()) as EngineEvaluation;
}

export async function stopAnalysisEvaluationRequest(options?: { keepalive?: boolean }): Promise<void> {
  await fetch("/api/analysis-eval/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: options?.keepalive ?? false,
  });
}

export async function startAnalysisReplayRequest(settings: AnalysisReplaySettings): Promise<AnalysisReplayStep> {
  const response = await fetch("/api/analysis-replay/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  return (await response.json()) as AnalysisReplayStep;
}

export async function fetchNextAnalysisReplayStep(): Promise<AnalysisReplayStep> {
  const response = await fetch("/api/analysis-replay/next", { method: "POST", headers: { "Content-Type": "application/json" } });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  return (await response.json()) as AnalysisReplayStep;
}

export async function cancelAnalysisReplayRequest(): Promise<void> {
  await fetch("/api/analysis-replay/cancel", { method: "POST", headers: { "Content-Type": "application/json" } });
}
