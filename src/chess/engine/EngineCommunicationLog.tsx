import { useEffect, useRef } from "react";
import type { EngineLogEntry } from "../api/engineLogApi";
import "./EngineCommunicationLog.css";

interface Props {
  entries: EngineLogEntry[];
  emptyText: string;
  followLatest?: boolean;
}

function directionSymbol(direction: string): string {
  if (direction === "COMMAND") return "→";
  if (direction === "RESPONSE") return "←";
  return "•";
}

export default function EngineCommunicationLog({
  entries,
  emptyText,
  followLatest = false,
}: Props) {
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!followLatest || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [entries, followLatest]);

  return (
    <div className="engine-communication-log" ref={logRef}>
      {entries.length === 0 && (
        <div className="engine-communication-empty">{emptyText}</div>
      )}
      {entries.map((entry) => (
        <div
          key={entry.sequence}
          className={`engine-communication-line engine-communication-${entry.direction.toLowerCase()}`}
        >
          <span className="engine-communication-time">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>
          <span className="engine-communication-direction">
            {directionSymbol(entry.direction)}
          </span>
          <span className="engine-communication-message">{entry.message}</span>
        </div>
      ))}
    </div>
  );
}
