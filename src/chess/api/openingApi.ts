import type { Opening } from "../types";

export interface OpeningCatalogImportResult {
  importedCount: number;
  catalogEntries: number;
  sourceRevision: string;
}

async function errorMessage(response: Response): Promise<string> {
  const message = await response.text();
  return message || `HTTP ${response.status}`;
}

export async function fetchOpenings(): Promise<Opening[]> {
  const response = await fetch("/api/openings");
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as Opening[];
}

export async function importOpenings(content: string, fileName: string): Promise<Opening[]> {
  const params = new URLSearchParams();
  if (fileName.trim()) params.set("fileName", fileName.trim());
  const response = await fetch(`/api/openings/import?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: content,
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as Opening[];
}

export async function importLichessOpeningCatalog(): Promise<OpeningCatalogImportResult> {
  const response = await fetch("/api/openings/catalogs/lichess/import", {
    method: "POST",
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as OpeningCatalogImportResult;
}

export async function renameOpening(id: string, name: string): Promise<Opening> {
  const response = await fetch(`/api/openings/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as Opening;
}

export async function deleteOpening(id: string): Promise<void> {
  const response = await fetch(`/api/openings/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(await errorMessage(response));
}
