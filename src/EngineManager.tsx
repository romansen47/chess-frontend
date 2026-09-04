import { useEffect, useMemo, useState } from "react";
import "./EngineManager.css";

interface EngineProcessInfo {
  id: string;
  label: string;
  engineType: string;
  enginePath: string;
  pid: number | null;
  processAlive: boolean;
  state: "RUNNING" | "STOPPED" | "CLOSED" | string;
  createdAt: string;
  processStartedAt: string | null;
  lastActivityAt: string;
  exitCode: number | null;
  logEntryCount: number;
}

interface EngineLogEntry {
  sequence: number;
  timestamp: string;
  direction: "COMMAND" | "RESPONSE" | "SYSTEM" | string;
  message: string;
}

interface EngineManagerProps {
  onClose: () => void;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "–";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function EngineManager({ onClose }: EngineManagerProps) {
  const [instances, setInstances] = useState<EngineProcessInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historySelectedId, setHistorySelectedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [logEntries, setLogEntries] = useState<EngineLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  const currentInstances = useMemo(
    () => instances.filter((instance) => instance.state !== "CLOSED"),
    [instances]
  );

  const historyInstances = useMemo(
    () => instances.filter((instance) => instance.state === "CLOSED"),
    [instances]
  );

  const selected = useMemo(
    () => currentInstances.find((instance) => instance.id === selectedId) ?? null,
    [currentInstances, selectedId]
  );

  const historySelected = useMemo(
    () => historyInstances.find((instance) => instance.id === historySelectedId) ?? null,
    [historyInstances, historySelectedId]
  );

  const displayedSelectedId = showHistory ? historySelectedId : selectedId;

  async function loadInstances() {
    try {
      const response = await fetch("/api/engine-processes");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as EngineProcessInfo[];
      const currentData = data.filter((instance) => instance.state !== "CLOSED");
      const historyData = data.filter((instance) => instance.state === "CLOSED");

      setInstances(data);
      setError(null);
      setSelectedId((current) => {
        if (current && currentData.some((instance) => instance.id === current)) {
          return current;
        }
        return currentData.find((instance) => instance.processAlive)?.id ?? currentData[0]?.id ?? null;
      });
      setHistorySelectedId((current) => {
        if (current && historyData.some((instance) => instance.id === current)) {
          return current;
        }
        return historyData[0]?.id ?? null;
      });
    } catch (e) {
      setError(`Could not load engine list: ${String(e)}`);
    }
  }

  async function loadLog(id: string) {
    try {
      const response = await fetch(`/api/engine-processes/${encodeURIComponent(id)}/log`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setLogEntries((await response.json()) as EngineLogEntry[]);
    } catch (e) {
      setError(`Could not load engine log: ${String(e)}`);
    }
  }

  async function terminate(instance: EngineProcessInfo) {
    if (!instance.processAlive) {
      return;
    }

    const confirmed = window.confirm(
      `Engine-Prozess ${instance.pid ?? "?"} (${instance.label}) wirklich beenden?`
    );
    if (!confirmed) {
      return;
    }

    setTerminatingId(instance.id);
    try {
      const response = await fetch(
        `/api/engine-processes/${encodeURIComponent(instance.id)}/terminate`,
        { method: "POST" }
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      await loadInstances();
      await loadLog(instance.id);
    } catch (e) {
      setError(`Could not terminate engine process: ${String(e)}`);
    } finally {
      setTerminatingId(null);
    }
  }

  useEffect(() => {
    void loadInstances();
    const intervalId = window.setInterval(() => void loadInstances(), 1500);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!displayedSelectedId) {
      setLogEntries([]);
      return;
    }

    void loadLog(displayedSelectedId);
    const intervalId = window.setInterval(() => void loadLog(displayedSelectedId), 1500);
    return () => window.clearInterval(intervalId);
  }, [displayedSelectedId]);

  function renderInstanceList(
    list: EngineProcessInfo[],
    activeId: string | null,
    onSelect: (id: string) => void,
    emptyText: string
  ) {
    return (
      <div className="engine-manager-instance-list">
        {list.length === 0 && <div className="engine-manager-empty">{emptyText}</div>}

        {list.map((instance) => (
          <button
            type="button"
            key={instance.id}
            className={`engine-manager-instance${
              activeId === instance.id ? " engine-manager-instance-selected" : ""
            }`}
            onClick={() => onSelect(instance.id)}
          >
            <span className="engine-manager-instance-title">
              <span
                className={`engine-manager-status-dot${
                  instance.processAlive ? " engine-manager-status-running" : ""
                }`}
              />
              {instance.label}
            </span>
            <span className="engine-manager-instance-meta">
              {instance.engineType} · PID {instance.pid ?? "–"} · {instance.state}
            </span>
            <span className="engine-manager-instance-path">{instance.enginePath}</span>
          </button>
        ))}
      </div>
    );
  }

  function renderDetails(instance: EngineProcessInfo | null, allowTerminate: boolean) {
    return (
      <div className="engine-manager-details">
        {!instance && (
          <div className="engine-manager-empty">Select an engine instance.</div>
        )}

        {instance && (
          <>
            <div className="engine-manager-details-header">
              <div>
                <strong>{instance.label}</strong>
                <div className="engine-manager-instance-id">Instanz {instance.id}</div>
              </div>
              {allowTerminate && (
                <button
                  type="button"
                  className="engine-manager-terminate"
                  disabled={!instance.processAlive || terminatingId === instance.id}
                  onClick={() => void terminate(instance)}
                >
                  {terminatingId === instance.id ? "Terminating…" : "Terminate process"}
                </button>
              )}
            </div>

            <dl className="engine-manager-facts">
              <div><dt>PID</dt><dd>{instance.pid ?? "–"}</dd></div>
              <div><dt>Status</dt><dd>{instance.state}</dd></div>
              <div><dt>Typ</dt><dd>{instance.engineType}</dd></div>
              <div><dt>Exit code</dt><dd>{instance.exitCode ?? "–"}</dd></div>
              <div><dt>Instanz seit</dt><dd>{formatTimestamp(instance.createdAt)}</dd></div>
              <div><dt>Prozess seit</dt><dd>{formatTimestamp(instance.processStartedAt)}</dd></div>
              <div><dt>Last activity</dt><dd>{formatTimestamp(instance.lastActivityAt)}</dd></div>
              <div><dt>Log entries</dt><dd>{instance.logEntryCount}</dd></div>
            </dl>

            <div className="engine-manager-path-row">
              <span>Executable</span>
              <code>{instance.enginePath}</code>
            </div>

            <div className="engine-manager-log-header">
              <strong>UCI-Protokoll</strong>
              <span>up to 2000 most recent entries per instance</span>
            </div>
            <div className="engine-manager-log">
              {logEntries.length === 0 && (
                <div className="engine-manager-empty">No communication has been logged yet.</div>
              )}
              {logEntries.map((entry) => (
                <div
                  key={entry.sequence}
                  className={`engine-manager-log-line engine-manager-log-${entry.direction.toLowerCase()}`}
                >
                  <span className="engine-manager-log-time">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="engine-manager-log-direction">
                    {entry.direction === "COMMAND"
                      ? "→"
                      : entry.direction === "RESPONSE"
                        ? "←"
                        : "•"}
                  </span>
                  <span className="engine-manager-log-message">{entry.message}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="engine-manager-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="engine-manager-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Engine Manager"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="engine-manager-header">
          <div>
            <h2>Engine Manager</h2>
            <div className="engine-manager-subtitle">
              Aktuelle UCI-Instanzen, Prozesse und Kommunikation
            </div>
          </div>
          <div className="engine-manager-header-actions">
            <button type="button" onClick={() => setShowHistory(true)}>
              Historie ({historyInstances.length})
            </button>
            <button type="button" onClick={() => void loadInstances()}>
              Aktualisieren
            </button>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </header>

        {error && <div className="engine-manager-error">{error}</div>}

        <div className="engine-manager-body">
          {renderInstanceList(
            currentInstances,
            selectedId,
            setSelectedId,
            "No active engine instance is registered."
          )}
          {renderDetails(selected, true)}
        </div>
      </section>

      {showHistory && (
        <div
          className="engine-manager-history-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            event.stopPropagation();
            setShowHistory(false);
          }}
        >
          <section
            className="engine-manager-dialog engine-manager-history-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Engine-Historie"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="engine-manager-header">
              <div>
                <h2>Engine-Historie</h2>
                <div className="engine-manager-subtitle">
                  Gracefully closed UCI instances and their logs
                </div>
              </div>
              <div className="engine-manager-header-actions">
                <button type="button" onClick={() => void loadInstances()}>
                  Aktualisieren
                </button>
                <button type="button" onClick={() => setShowHistory(false)}>
                  Close
                </button>
              </div>
            </header>

            {error && <div className="engine-manager-error">{error}</div>}

            <div className="engine-manager-body">
              {renderInstanceList(
                historyInstances,
                historySelectedId,
                setHistorySelectedId,
                "No closed engine instance is available yet."
              )}
              {renderDetails(historySelected, false)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
