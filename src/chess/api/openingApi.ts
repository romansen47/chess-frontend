import type { Opening } from "../types";
import { jsonRequest, requestJson, requestVoid } from "./httpClient";

export interface OpeningCatalogImportResult {
  importedCount: number;
  catalogEntries: number;
  sourceRevision: string;
}

export async function fetchOpenings(): Promise<Opening[]> {
  return requestJson<Opening[]>("/api/openings");
}

export async function importOpenings(content: string, fileName: string): Promise<Opening[]> {
  const params = new URLSearchParams();
  if (fileName.trim()) params.set("fileName", fileName.trim());
  return requestJson<Opening[]>(`/api/openings/import?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: content,
  });
}

export async function importLichessOpeningCatalog(): Promise<OpeningCatalogImportResult> {
  return requestJson<OpeningCatalogImportResult>("/api/openings/catalogs/lichess/import", {
    method: "POST",
  });
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
