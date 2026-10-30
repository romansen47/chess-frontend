import { requestJson } from "./httpClient";

export interface EngineLogEntry {
  sequence: number;
  timestamp: string;
  direction: "COMMAND" | "RESPONSE" | "SYSTEM" | "LIFECYCLE" | string;
  message: string;
}

export function fetchEngineProcessLog(id: string): Promise<EngineLogEntry[]> {
  return requestJson<EngineLogEntry[]>(
    `/api/engine-processes/${encodeURIComponent(id)}/log`,
  );
}

export function fetchActiveAnalysisEngineLog(): Promise<EngineLogEntry[]> {
  return requestJson<EngineLogEntry[]>("/api/analysis-replay/engine-log");
}
