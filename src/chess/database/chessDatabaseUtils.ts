import type {
  DatabaseImportJob,
  DatabaseSearchRequest,
  SearchForm,
} from "./chessDatabaseTypes";

export function formatDatabaseBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDatabaseElapsed(value: number): string {
  const totalSeconds = Math.max(0, Math.floor(value / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createDatabaseSearchRequest(
  searchForm: SearchForm,
): DatabaseSearchRequest {
  const player1 = searchForm.player.trim() || null;
  const player2 = searchForm.player2.trim() || null;

  const players =
    searchForm.colorAssignment === "player1White"
      ? { player: null, player2: null, white: player1, black: player2 }
      : searchForm.colorAssignment === "player1Black"
        ? { player: null, player2: null, white: player2, black: player1 }
        : { player: player1, player2, white: null, black: null };

  return {
    ...players,
    fromYear: optionalNumber(searchForm.fromYear),
    toYear: optionalNumber(searchForm.toYear),
    result: searchForm.result || null,
    minElo: optionalNumber(searchForm.minElo),
    limit: 200,
  };
}

export function databaseImportProgressPercent(
  job: DatabaseImportJob | null,
): number {
  if (!job || job.totalBytes <= 0) {
    return job?.status === "COMPLETE" ? 100 : 0;
  }

  return Math.max(0, Math.min(100, (job.bytesRead / job.totalBytes) * 100));
}

export function databaseImportStatusLabel(job: DatabaseImportJob): string {
  switch (job.phase) {
    case "READING_PGN":
      return "Reading PGN";
    case "FINALIZING_DATABASE":
      return "Finalizing";
    case "COMPLETE":
      return "Complete";
    case "CANCELLED":
      return "Cancelled";
    case "FAILED":
      return "Failed";
    default:
      return job.status;
  }
}

export function databaseImportOperationLabel(job: DatabaseImportJob): string {
  switch (job.phase) {
    case "READING_PGN":
      return "Parsing games and staging position statistics";
    case "FINALIZING_DATABASE":
      return "Merging position statistics and publishing staged games";
    case "COMPLETE":
      return "Database import complete";
    case "CANCELLED":
      return "Import cancelled";
    case "FAILED":
      return "Import failed";
    default:
      return job.status;
  }
}
