import { useEffect, useRef, useState } from "react";
import "./ChessDatabaseDialog.css";

export interface ChessDatabaseLoadedGame {
  totalPlies: number;
  sideToMove: string | null;
  position: string;
  moves: Array<{
    ply: number;
    uci: string;
    san: string | null;
    position: string;
  }>;
  whitePlayerName: string | null;
  blackPlayerName: string | null;
}

interface DatabaseStatus {
  available: boolean;
  path: string;
  name: string;
  schemaVersion: number | null;
  gameCount: number;
  sizeBytes: number;
  message: string | null;
}

interface DatabaseImportJob {
  id: string;
  fileName: string;
  status: "RUNNING" | "COMPLETE" | "CANCELLED" | "FAILED";
  totalBytes: number;
  bytesRead: number;
  processedGames: number;
  importedGames: number;
  skippedGames: number;
  totalPlies: number;
  elapsedMillis: number;
  message: string | null;
}

interface DatabaseGameSummary {
  id: number;
  date: string | null;
  white: string;
  black: string;
  whiteElo: number | null;
  blackElo: number | null;
  result: string | null;
  event: string | null;
  eco: string | null;
  plyCount: number;
}

interface SearchForm {
  player: string;
  white: string;
  black: string;
  fromYear: string;
  toYear: string;
  result: string;
  minElo: string;
}

interface ChessDatabaseDialogProps {
  onClose: () => void;
  onGameLoaded: (game: ChessDatabaseLoadedGame) => void | Promise<void>;
}

type DialogView = "overview" | "search" | "import";

const EMPTY_SEARCH: SearchForm = {
  player: "",
  white: "",
  black: "",
  fromYear: "",
  toYear: "",
  result: "",
  minElo: "",
};

function formatBytes(value: number): string {
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

function optionalNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function importProgressPercent(job: DatabaseImportJob | null): number {
  if (!job || job.totalBytes <= 0) {
    return job?.status === "COMPLETE" ? 100 : 0;
  }

  const calculated = Math.max(0, Math.min(100, (job.bytesRead / job.totalBytes) * 100));
  if (job.status === "RUNNING") {
    return Math.min(99.9, calculated);
  }
  if (job.status === "COMPLETE") {
    return 100;
  }
  return calculated;
}

export default function ChessDatabaseDialog({
  onClose,
  onGameLoaded,
}: ChessDatabaseDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [view, setView] = useState<DialogView>("overview");
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  const [importFileName, setImportFileName] = useState<string>("");
  const [isImportStarting, setIsImportStarting] = useState(false);
  const [importJob, setImportJob] = useState<DatabaseImportJob | null>(null);
  const [importStartError, setImportStartError] = useState<string | null>(null);
  const [cancelRequested, setCancelRequested] = useState(false);

  const [searchForm, setSearchForm] = useState<SearchForm>(EMPTY_SEARCH);
  const [searchResults, setSearchResults] = useState<DatabaseGameSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingGameId, setLoadingGameId] = useState<number | null>(null);

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    const importId = importJob?.id;
    if (!importId || importJob?.status !== "RUNNING") {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshImportJob(importId);
    }, 400);

    return () => window.clearInterval(timer);
  }, [importJob?.id, importJob?.status]);

  async function loadStatus() {
    setIsStatusLoading(true);
    setStatusError(null);
    try {
      const response = await fetch("/api/chess-database/status");
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      const nextStatus: DatabaseStatus = await response.json();
      setStatus(nextStatus);
      if (!nextStatus.available && nextStatus.message) {
        setStatusError(nextStatus.message);
      }
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Could not read chess database status.");
    } finally {
      setIsStatusLoading(false);
    }
  }

  async function refreshImportJob(importId: string) {
    try {
      const response = await fetch(`/api/chess-database/imports/${encodeURIComponent(importId)}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      const nextJob: DatabaseImportJob = await response.json();
      setImportJob(nextJob);
      if (nextJob.status !== "RUNNING") {
        setCancelRequested(false);
        await loadStatus();
      }
    } catch (error) {
      setImportStartError(error instanceof Error ? error.message : "Could not read import progress.");
    }
  }

  function chooseImportFile() {
    fileInputRef.current?.click();
  }

  async function handleImportFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setView("import");
    setImportFileName(file.name);
    setImportJob(null);
    setImportStartError(null);
    setCancelRequested(false);
    setIsImportStarting(true);

    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      const response = await fetch("/api/chess-database/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }

      const job: DatabaseImportJob = await response.json();
      setImportJob(job);
      if (job.status !== "RUNNING") {
        await loadStatus();
      }
    } catch (error) {
      setImportStartError(error instanceof Error ? error.message : "Could not start PGN database import.");
    } finally {
      setIsImportStarting(false);
    }
  }

  async function cancelImport() {
    if (!importJob || importJob.status !== "RUNNING") {
      return;
    }

    setCancelRequested(true);
    try {
      const response = await fetch(
        `/api/chess-database/imports/${encodeURIComponent(importJob.id)}/cancel`,
        { method: "POST" },
      );
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      const nextJob: DatabaseImportJob = await response.json();
      setImportJob(nextJob);
    } catch (error) {
      setCancelRequested(false);
      setImportStartError(error instanceof Error ? error.message : "Could not cancel database import.");
    }
  }

  function closeImportResult() {
    if (isImportStarting || importJob?.status === "RUNNING") {
      return;
    }
    setView("overview");
    setImportJob(null);
    setImportStartError(null);
    setCancelRequested(false);
  }

  function updateSearchField(key: keyof SearchForm, value: string) {
    setSearchForm((previous) => ({ ...previous, [key]: value }));
  }

  async function searchGames() {
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch("/api/chess-database/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player: searchForm.player.trim() || null,
          white: searchForm.white.trim() || null,
          black: searchForm.black.trim() || null,
          fromYear: optionalNumber(searchForm.fromYear),
          toYear: optionalNumber(searchForm.toYear),
          result: searchForm.result || null,
          minElo: optionalNumber(searchForm.minElo),
          limit: 200,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }

      const result: DatabaseGameSummary[] = await response.json();
      setSearchResults(result);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Chess database search failed.");
    } finally {
      setIsSearching(false);
    }
  }

  async function loadGame(gameId: number) {
    setLoadingGameId(gameId);
    setSearchError(null);
    try {
      const response = await fetch(`/api/chess-database/games/${gameId}/load`, {
        method: "POST",
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }

      const game: ChessDatabaseLoadedGame = await response.json();
      await onGameLoaded(game);
      onClose();
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Could not load database game.");
    } finally {
      setLoadingGameId(null);
    }
  }

  const progressPercent = importProgressPercent(importJob);
  const importRunning = isImportStarting || importJob?.status === "RUNNING";
  const importCanClose = !importRunning && (importJob !== null || importStartError !== null);

  return (
    <>
      <input
        ref={fileInputRef}
        className="chess-database-hidden-input"
        type="file"
        accept=".pgn,.txt,application/x-chess-pgn,text/plain"
        onChange={handleImportFileSelected}
      />

      {view === "overview" && (
        <div className="chess-database-overlay" role="presentation">
          <section className="chess-database-dialog" role="dialog" aria-modal="true" aria-labelledby="chess-database-title">
            <h2 id="chess-database-title">Chess Database</h2>

            <div className="chess-database-status-card">
              {isStatusLoading && <div className="chess-database-muted">Loading database status…</div>}
              {!isStatusLoading && status && (
                <>
                  <div className="chess-database-status-row">
                    <span>Database</span>
                    <strong>{status.name || "Chess Database"}</strong>
                  </div>
                  <div className="chess-database-status-row">
                    <span>File</span>
                    <strong className="chess-database-path" title={status.path}>{status.path}</strong>
                  </div>
                  <div className="chess-database-status-row">
                    <span>Games</span>
                    <strong>{status.gameCount.toLocaleString()}</strong>
                  </div>
                  <div className="chess-database-status-row">
                    <span>Size</span>
                    <strong>{formatBytes(status.sizeBytes)}</strong>
                  </div>
                </>
              )}
              {statusError && <div className="chess-database-error">{statusError}</div>}
            </div>

            <div className="chess-database-actions">
              <button type="button" onClick={chooseImportFile}>Import PGN…</button>
              <button type="button" onClick={() => setView("search")}>Search Games…</button>
            </div>

            <div className="chess-database-footer">
              <button type="button" onClick={onClose}>Close</button>
            </div>
          </section>
        </div>
      )}

      {view === "import" && (
        <div className="chess-database-overlay" role="presentation">
          <section className="chess-database-dialog chess-database-import-dialog" role="dialog" aria-modal="true" aria-labelledby="chess-database-import-title">
            <h2 id="chess-database-import-title">Import PGN Database</h2>
            <div className="chess-database-import-file" title={importJob?.fileName || importFileName}>
              {importJob?.fileName || importFileName}
            </div>

            {isImportStarting && (
              <div className="chess-database-muted">Preparing import…</div>
            )}

            {importJob && (
              <>
                <div
                  className="chess-database-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPercent)}
                >
                  <div
                    className="chess-database-progress-bar"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="chess-database-progress-label">
                  <strong>{progressPercent.toFixed(1)}%</strong>
                  <span>{formatBytes(importJob.bytesRead)} / {formatBytes(importJob.totalBytes)}</span>
                </div>

                <div className="chess-database-import-result">
                  <div><span>Status</span><strong>{importJob.status}</strong></div>
                  <div><span>Games processed</span><strong>{importJob.processedGames.toLocaleString()}</strong></div>
                  <div>
                    <span>{importJob.status === "COMPLETE" ? "Games imported" : "Games staged"}</span>
                    <strong>{importJob.importedGames.toLocaleString()}</strong>
                  </div>
                  <div><span>Games skipped</span><strong>{importJob.skippedGames.toLocaleString()}</strong></div>
                  <div><span>Plies indexed</span><strong>{importJob.totalPlies.toLocaleString()}</strong></div>
                  <div><span>Elapsed</span><strong>{(importJob.elapsedMillis / 1000).toFixed(1)} s</strong></div>
                </div>

                {importJob.message && (
                  <div className={importJob.status === "FAILED" ? "chess-database-error" : "chess-database-import-message"}>
                    {importJob.message}
                  </div>
                )}
              </>
            )}

            {importStartError && <div className="chess-database-error">{importStartError}</div>}

            <div className="chess-database-footer chess-database-import-footer">
              {importJob?.status === "RUNNING" && (
                <button type="button" onClick={() => void cancelImport()} disabled={cancelRequested}>
                  {cancelRequested ? "Cancelling…" : "Cancel"}
                </button>
              )}
              <button type="button" disabled={!importCanClose} onClick={closeImportResult}>
                OK
              </button>
            </div>
          </section>
        </div>
      )}

      {view === "search" && (
        <div className="chess-database-overlay" role="presentation">
          <section className="chess-database-dialog chess-database-search-dialog" role="dialog" aria-modal="true" aria-labelledby="chess-database-search-title">
            <h2 id="chess-database-search-title">Search Chess Database</h2>

            <div className="chess-database-search-grid">
              <label><span>Player</span><input value={searchForm.player} onChange={(event) => updateSearchField("player", event.target.value)} /></label>
              <label><span>White</span><input value={searchForm.white} onChange={(event) => updateSearchField("white", event.target.value)} /></label>
              <label><span>Black</span><input value={searchForm.black} onChange={(event) => updateSearchField("black", event.target.value)} /></label>
              <label><span>From year</span><input type="number" min="1000" max="9999" value={searchForm.fromYear} onChange={(event) => updateSearchField("fromYear", event.target.value)} /></label>
              <label><span>To year</span><input type="number" min="1000" max="9999" value={searchForm.toYear} onChange={(event) => updateSearchField("toYear", event.target.value)} /></label>
              <label>
                <span>Result</span>
                <select value={searchForm.result} onChange={(event) => updateSearchField("result", event.target.value)}>
                  <option value="">Any</option>
                  <option value="1-0">1-0</option>
                  <option value="0-1">0-1</option>
                  <option value="1/2-1/2">½-½</option>
                </select>
              </label>
              <label><span>Minimum Elo</span><input type="number" min="0" value={searchForm.minElo} onChange={(event) => updateSearchField("minElo", event.target.value)} /></label>
            </div>

            <div className="chess-database-search-actions">
              <button type="button" onClick={() => void searchGames()} disabled={isSearching}>
                {isSearching ? "Searching…" : "Search"}
              </button>
            </div>

            {searchError && <div className="chess-database-error">{searchError}</div>}

            <div className="chess-database-results-wrap">
              <table className="chess-database-results">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>White</th>
                    <th>Black</th>
                    <th>Result</th>
                    <th>ECO</th>
                    <th>Event</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {searchResults.length === 0 && (
                    <tr><td colSpan={7} className="chess-database-empty">No search results.</td></tr>
                  )}
                  {searchResults.map((game) => (
                    <tr key={game.id}>
                      <td>{game.date || "?"}</td>
                      <td>{game.white}{game.whiteElo != null ? ` (${game.whiteElo})` : ""}</td>
                      <td>{game.black}{game.blackElo != null ? ` (${game.blackElo})` : ""}</td>
                      <td>{game.result === "1/2-1/2" ? "½-½" : game.result || "*"}</td>
                      <td>{game.eco || "—"}</td>
                      <td title={game.event || ""}>{game.event || "—"}</td>
                      <td>
                        <button type="button" onClick={() => void loadGame(game.id)} disabled={loadingGameId !== null}>
                          {loadingGameId === game.id ? "Loading…" : "Load"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="chess-database-footer chess-database-search-footer">
              <button type="button" onClick={() => setView("overview")} disabled={loadingGameId !== null}>Back</button>
              <button type="button" onClick={onClose} disabled={loadingGameId !== null}>Close</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
