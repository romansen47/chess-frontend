import type { Opening } from "../types";
import { jsonRequest, requestJson, requestVoid } from "./httpClient";

export async function fetchOpenings(): Promise<Opening[]> {
  return requestJson<Opening[]>("/api/openings");
}

export async function renameOpening(id: string, name: string): Promise<Opening> {
  return requestJson<Opening>(
    `/api/openings/${encodeURIComponent(id)}`,
    jsonRequest("PUT", { name }),
  );
}

export async function deleteOpening(id: string): Promise<void> {
  await requestVoid(`/api/openings/${encodeURIComponent(id)}`, { method: "DELETE" });
}
