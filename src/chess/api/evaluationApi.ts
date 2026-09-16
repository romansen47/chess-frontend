import type { EngineEvaluation } from "../types";
import { throwEngineAwareApiError } from "./engineErrors";

export async function fetchEvaluation(): Promise<EngineEvaluation> {
  const response = await fetch("/api/eval");
  if (!response.ok) await throwEngineAwareApiError(response);
  return (await response.json()) as EngineEvaluation;
}

export function openEvaluationStream(): EventSource {
  return new EventSource("/api/eval/stream");
}

export async function stopEvaluation(): Promise<void> {
  await fetch("/api/eval/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}
