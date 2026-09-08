import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./LiveEvaluationSseBridge.css";

interface EngineLine {
  eval: number;
  depth: number;
  mateDistance?: number | null;
  moves: string;
}

interface EngineEvaluation {
  eval: number;
  bar: number;
  engineName?: string | null;
  lines: EngineLine[];
}

const LIVE_EVALUATION_POSITION_SYNC_MS = 2000;

const EMPTY_EVALUATION: EngineEvaluation = {
  eval: 0,
  bar: 0.5,
  engineName: null,
  lines: [],
};

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.method.toUpperCase();
  }
  return "GET";
}

function getRequestPath(input: RequestInfo | URL): string {
  try {
    return new URL(getRequestUrl(input), window.location.origin).pathname;
  } catch {
    return getRequestUrl(input);
  }
}

function formatEngineScore(evaluation: number): string {
  if (Math.abs(evaluation) >= 99) {
    return evaluation > 0 ? "Mate for White" : "Mate for Black";
  }
  return `Eval ${evaluation.toFixed(2)}`;
}

function formatEngineLineScore(line: EngineLine): string {
  if (line.mateDistance !== undefined && line.mateDistance !== null) {
    const winner = line.eval > 0 ? "White" : "Black";
    const distance = Math.abs(line.mateDistance);
    return distance > 0 ? `Mate für ${winner} in ${distance}` : `Mate für ${winner}`;
  }
  return formatEngineScore(line.eval);
}

function getMainEvaluationBar(): HTMLButtonElement | null {
  if (document.querySelector(".analysis-replay-content")) {
    return null;
  }
  return document.querySelector<HTMLButtonElement>(
    ".engine-panel-main > .engine-bar-wrapper"
  );
}

function applyEvaluationToMainBar(evaluation: EngineEvaluation | null) {
  if (!evaluation) return;
  const bar = getMainEvaluationBar();
  if (!bar || bar.getAttribute("aria-pressed") !== "true") return;

  const white = bar.querySelector<HTMLElement>(".engine-bar-white");
  const black = bar.querySelector<HTMLElement>(".engine-bar-black");
  if (!white || !black) return;

  const whiteHeight = `${evaluation.bar * 100}%`;
  const blackHeight = `${(1 - evaluation.bar) * 100}%`;
  if (white.style.height !== whiteHeight) white.style.height = whiteHeight;
  if (black.style.height !== blackHeight) black.style.height = blackHeight;
}

/**
 * Experimental SSE bridge for normal live evaluation.
 *
 * The existing ChessBoard remains untouched on this test branch. Its historical
 * GET /api/eval polling calls are answered locally from the most recent pushed
 * snapshot, while the visible evaluation output is updated immediately from SSE.
 * A lightweight POST /api/eval/start is kept at the old two-second cadence only
 * to let the backend notice newer board positions during very fast engine games.
 */
export default function LiveEvaluationSseBridge() {
  const [enabled, setEnabled] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const enabledRef = useRef(false);
  const latestEvaluationRef = useRef<EngineEvaluation | null>(null);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) {
      latestEvaluationRef.current = null;
      setEvaluation(null);
    }
  }, [enabled]);

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;

    let createdHost: HTMLElement | null = null;

    const sync = () => {
      const bar = getMainEvaluationBar();
      const contentColumn = document.querySelector<HTMLElement>(
        ".engine-panel-main > .engine-content-column"
      );
      const nextEnabled = Boolean(
        bar && contentColumn && bar.getAttribute("aria-pressed") === "true"
      );

      enabledRef.current = nextEnabled;
      setEnabled(nextEnabled);

      if (!nextEnabled || !contentColumn) {
        if (createdHost?.isConnected) createdHost.remove();
        createdHost = null;
        setPortalHost(null);
        document
          .querySelectorAll<HTMLElement>(".engine-content-column.sse-live-evaluation-active")
          .forEach((element) => element.classList.remove("sse-live-evaluation-active"));
        return;
      }

      contentColumn.classList.add("sse-live-evaluation-active");
      let host = contentColumn.querySelector<HTMLElement>(
        ":scope > .sse-live-evaluation-host"
      );
      if (!host) {
        host = document.createElement("div");
        host.className = "sse-live-evaluation-host";
        contentColumn.appendChild(host);
      }
      createdHost = host;
      setPortalHost(host);
      applyEvaluationToMainBar(latestEvaluationRef.current);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-pressed"],
    });

    return () => {
      observer.disconnect();
      if (createdHost?.isConnected) createdHost.remove();
      document
        .querySelectorAll<HTMLElement>(".engine-content-column.sse-live-evaluation-active")
        .forEach((element) => element.classList.remove("sse-live-evaluation-active"));
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const source = new EventSource("/api/eval/stream");
    const handleEvaluation = (event: Event) => {
      try {
        const data = JSON.parse((event as MessageEvent<string>).data) as EngineEvaluation;
        if (!Array.isArray(data.lines) || data.lines.length === 0) return;
        latestEvaluationRef.current = data;
        setEvaluation(data);
        applyEvaluationToMainBar(data);
      } catch (error) {
        console.warn("[LiveEvaluationSseBridge] invalid SSE evaluation", error);
      }
    };

    source.addEventListener("evaluation", handleEvaluation);
    source.onerror = () => {
      // EventSource reconnects automatically. Keep the last stable evaluation visible.
      console.debug("[LiveEvaluationSseBridge] SSE connection interrupted; waiting for reconnect");
    };

    return () => {
      source.removeEventListener("evaluation", handleEvaluation);
      source.close();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !evaluation) return;
    const root = document.getElementById("root");
    if (!root) return;

    const preserveBar = () => applyEvaluationToMainBar(latestEvaluationRef.current);
    preserveBar();
    const observer = new MutationObserver(preserveBar);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "aria-pressed"],
    });
    return () => observer.disconnect();
  }, [enabled, evaluation]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const startForCurrentPosition = (clearCurrent: boolean) => {
      if (!enabledRef.current) return;
      if (clearCurrent) {
        latestEvaluationRef.current = null;
        setEvaluation(null);
      }
      void originalFetch("/api/eval/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch((error) => {
        console.warn("[LiveEvaluationSseBridge] could not start evaluation", error);
      });
    };

    const observedFetch: typeof window.fetch = async (input, init) => {
      const path = getRequestPath(input);
      const method = getRequestMethod(input, init);

      if (path === "/api/eval" && method === "GET") {
        const payload = latestEvaluationRef.current ?? EMPTY_EVALUATION;
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const response = await originalFetch(input, init);
      if (!response.ok || !enabledRef.current) return response;

      if (path === "/api/board" && method === "GET") {
        queueMicrotask(() => startForCurrentPosition(true));
      } else if (
        path.startsWith("/api/engine-configs")
        && method !== "GET"
      ) {
        queueMicrotask(() => startForCurrentPosition(true));
      }

      return response;
    };

    window.fetch = observedFetch;
    return () => {
      if (window.fetch === observedFetch) {
        window.fetch = originalFetch;
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const intervalId = window.setInterval(() => {
      void fetch("/api/eval/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch((error) => {
        console.warn("[LiveEvaluationSseBridge] position sync failed", error);
      });
    }, LIVE_EVALUATION_POSITION_SYNC_MS);
    return () => window.clearInterval(intervalId);
  }, [enabled]);

  if (!portalHost || !enabled || !evaluation) return null;

  return createPortal(
    <div className="sse-live-evaluation-output">
      <div className="engine-lines">
        <div className="engine-lines-summary">
          <code>{evaluation.engineName || "Evaluation engine"}</code>
          <span>depth {evaluation.lines[0]?.depth ?? 0}</span>
        </div>
        {evaluation.lines.map((line, index) => (
          <div className="engine-line" key={`${line.depth}-${index}-${line.moves}`}>
            <div className="engine-line-header">#{index + 1} · {formatEngineLineScore(line)}</div>
            <div className="engine-line-moves">{line.moves}</div>
          </div>
        ))}
      </div>
    </div>,
    portalHost
  );
}
