import { requestJson, requestVoid } from "./httpClient";

export interface ProgramFeatures {
  debugMode: boolean;
}

export function fetchProgramFeatures(): Promise<ProgramFeatures> {
  return requestJson<ProgramFeatures>("/api/program/features");
}

export function terminateBackend(): Promise<void> {
  return requestVoid("/api/program/terminate", {
    method: "POST",
    headers: { "X-Chess-Terminate": "terminate" },
  });
}

export async function terminateDevelopmentFrontend(): Promise<void> {
  await fetch("/__chess/terminate", {
    method: "POST",
    headers: { "X-Chess-Terminate": "terminate" },
  });
}
