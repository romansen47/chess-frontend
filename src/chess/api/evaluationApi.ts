import type { EngineEvaluation } from "../types";

export async function fetchCurrentEvaluation(): Promise<EngineEvaluation | null> {
  const response = await fetch("/api/eval");
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as EngineEvaluation;
}

export async function startEvaluation(): Promise<EngineEvaluation> {
  const response = await fetch("/api/eval/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
