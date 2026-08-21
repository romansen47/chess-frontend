import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

interface AnalysisEvaluationEventDetail {
  ply: number | null;
  evaluation: EngineEvaluation | null;
  stop?: boolean;
}

const ANALYSIS_EVALUATION_EVENT = "chess-analysis-evaluation-update";

function formatEngineScore(evaluation: number): string {
  if (Math.abs(evaluation) >= 99) {
    return evaluation > 0 ? "Mate für Weiß" : "Mate für Schwarz";
  }

  return `Eval ${evaluation.toFixed(2)}`;
}

function formatEngineLineScore(line: EngineLine): string {
  if (line.mateDistance !== undefined && line.mateDistance !== null) {
    const winner = line.eval > 0 ? "Weiß" : "Schwarz";
    const distance = Math.abs(line.mateDistance);
    return distance > 0 ? `Mate für ${winner} in ${distance}` : `Mate für ${winner}`;
  }

  return formatEngineScore(line.eval);
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function parsePly(url: string): number | null {
  try {
    const parsed = new URL(url, window.location.origin);
    const value = Number(parsed.searchParams.get("ply"));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function dispatchEvaluation(detail: AnalysisEvaluationEventDetail) {
  window.dispatchEvent(
    new CustomEvent<AnalysisEvaluationEventDetail>(ANALYSIS_EVALUATION_EVENT, {
      detail,
    })
  );
}

/**
 * Adds a second engine-output block below the saved DeepAnalysis variants.
 *
 * ChessBoard already polls /api/analysis-eval every two seconds while the
 * analysis evaluation bar is enabled. This component observes those existing
 * responses instead of starting another polling loop, so the displayed output
 * and the evaluation bar always refer to the same infinite engine search.
 */
export default function AnalysisEvaluationOutputPortal() {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const [activePly, setActivePly] = useState<number | null>(null);
  const activePlyRef = useRef<number | null>(null);

  useEffect(() => {
    let createdHost: HTMLElement | null = null;

    const ensurePortalHost = () => {
      const panel = document.querySelector<HTMLElement>(".analysis-lines-panel");

      if (!panel) {
        if (createdHost?.isConnected) {
          createdHost.remove();
        }
        createdHost = null;
        setPortalHost(null);
        return;
      }

      const existing = panel.querySelector<HTMLElement>(
        ":scope > .analysis-evaluation-output-host"
      );

      if (existing) {
        createdHost = existing;
        setPortalHost(existing);
        return;
      }

      const host = document.createElement("div");
      host.className = "analysis-evaluation-output-host";
      panel.appendChild(host);
      createdHost = host;
      setPortalHost(host);
    };

    ensurePortalHost();

    const root = document.getElementById("root");
    const observer = new MutationObserver(ensurePortalHost);
    if (root) {
      observer.observe(root, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      observer.disconnect();
      if (createdHost?.isConnected) {
        createdHost.remove();
      }
    };
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const observedFetch: typeof window.fetch = async (input, init) => {
      const url = getRequestUrl(input);
      const response = await originalFetch(input, init);

      if (url.includes("/api/analysis-eval/stop")) {
        dispatchEvaluation({
          ply: null,
          evaluation: null,
          stop: true,
        });
        return response;
      }

      if (!url.includes("/api/analysis-eval?")) {
        return response;
      }

      const ply = parsePly(url);

      void response
        .clone()
        .json()
        .then((data: EngineEvaluation) => {
          const hasUsableLines = Array.isArray(data.lines) && data.lines.length > 0;
          const isTerminalMate = Math.abs(data.eval ?? 0) >= 99;

          dispatchEvaluation({
            ply,
            evaluation: hasUsableLines || isTerminalMate ? data : null,
          });
        })
        .catch(() => {
          // The actual request is handled by ChessBoard. Failure reporting stays there.
        });

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
    const handleEvaluation = (event: Event) => {
      const detail = (event as CustomEvent<AnalysisEvaluationEventDetail>).detail;

      if (detail.stop) {
        activePlyRef.current = null;
        setActivePly(null);
        setEvaluation(null);
        return;
      }

      if (detail.ply !== activePlyRef.current) {
        activePlyRef.current = detail.ply;
        setActivePly(detail.ply);
        setEvaluation(detail.evaluation);
        return;
      }

      // Just like the normal game-mode evaluation display: a temporary empty
      // parser snapshot must not overwrite the last valid engine result.
      if (detail.evaluation) {
        setEvaluation(detail.evaluation);
      }
    };

    window.addEventListener(ANALYSIS_EVALUATION_EVENT, handleEvaluation);
    return () => {
      window.removeEventListener(ANALYSIS_EVALUATION_EVENT, handleEvaluation);
    };
  }, []);

  if (!portalHost) {
    return null;
  }

  return createPortal(
    <div
      style={{
        marginTop: "12px",
        paddingTop: "10px",
        borderTop: "1px solid #4a4a4a",
      }}
    >
      <div className="analysis-detail-title">EvaluationEngine · infinite</div>

      {!evaluation && (
        <div
          className="engine-placeholder-text"
          style={{ marginTop: "6px" }}
        >
          {activePly
            ? `Evaluation für Halbzug ${activePly} wird berechnet…`
            : "Evaluation-Bar einschalten, um die ausgewählte Stellung infinite zu analysieren."}
        </div>
      )}

      {evaluation && (
        <div className="engine-lines" style={{ marginTop: "6px" }}>
          {evaluation.lines.length > 0 && (
            <div className="engine-lines-summary">
              <span>{evaluation.engineName || "Evaluation engine"}</span>
              <span>depth {evaluation.lines[0].depth} · infinite</span>
            </div>
          )}

          {evaluation.lines.length === 0 && (
            <div className="engine-empty">
              {formatEngineScore(evaluation.eval)} · terminal position
            </div>
          )}

          {evaluation.lines.map((line, index) => (
            <div key={`${index}-${line.depth}-${line.moves}`} className="engine-line">
              <div className="engine-line-header">
                #{index + 1} · {formatEngineLineScore(line)}
              </div>
              <div className="engine-line-moves">{line.moves}</div>
            </div>
          ))}
        </div>
      )}
    </div>,
    portalHost
  );
}
