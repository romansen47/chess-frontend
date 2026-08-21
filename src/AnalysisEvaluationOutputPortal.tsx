import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./AnalysisEvaluationOutputPortal.css";

interface EngineLine {
  eval: number;
  depth: number;
  mateDistance?: number | null;
  moves: string;
  positions?: string[];
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

function getPieceSymbolFromPositionChar(pieceChar: string): string {
  switch (pieceChar) {
    case "P":
      return "♙";
    case "N":
      return "♘";
    case "B":
      return "♗";
    case "R":
      return "♖";
    case "Q":
      return "♕";
    case "K":
      return "♔";
    case "p":
      return "♟";
    case "n":
      return "♞";
    case "b":
      return "♝";
    case "r":
      return "♜";
    case "q":
      return "♛";
    case "k":
      return "♚";
    default:
      return "";
  }
}

function isWhitePositionPiece(pieceChar: string): boolean {
  return pieceChar >= "A" && pieceChar <= "Z";
}

function splitMoveText(moves: string): string[] {
  if (!moves || !moves.trim()) {
    return [];
  }

  const tokens = moves.trim().split(/\s+/);
  const result: string[] = [];

  for (const token of tokens) {
    if (token === "e.p." && result.length > 0) {
      result[result.length - 1] = `${result[result.length - 1]} ${token}`;
    } else {
      result.push(token);
    }
  }

  return result;
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
 * Adds the EvaluationEngine as the third analysis view. ChessBoard remains the
 * owner of polling and of the evaluation bar; this component observes exactly
 * those responses and renders them in the same board + variants form used by
 * the saved DeepAnalysis result.
 */
export default function AnalysisEvaluationOutputPortal() {
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const [activePly, setActivePly] = useState<number | null>(null);
  const [selectedLineIndex, setSelectedLineIndex] = useState(0);
  const [animationIndex, setAnimationIndex] = useState(0);
  const activePlyRef = useRef<number | null>(null);

  useEffect(() => {
    let createdHost: HTMLElement | null = null;

    const ensurePortalHost = () => {
      const analysisContent = document.querySelector<HTMLElement>(
        ".analysis-replay-content"
      );

      if (!analysisContent) {
        if (createdHost?.isConnected) {
          createdHost.remove();
        }
        createdHost = null;
        setPortalHost(null);
        return;
      }

      const existing = analysisContent.querySelector<HTMLElement>(
        ":scope > .analysis-evaluation-output-host"
      );

      if (existing) {
        createdHost = existing;
        setPortalHost(existing);
        return;
      }

      const host = document.createElement("div");
      host.className = "analysis-evaluation-output-host";
      analysisContent.appendChild(host);
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
          // ChessBoard owns error handling for the actual request.
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
        setSelectedLineIndex(0);
        setAnimationIndex(0);
        return;
      }

      if (detail.ply !== activePlyRef.current) {
        activePlyRef.current = detail.ply;
        setActivePly(detail.ply);
        setEvaluation(detail.evaluation);
        setSelectedLineIndex(0);
        setAnimationIndex(0);
        return;
      }

      // Temporary empty parser snapshots must not overwrite the most recent
      // valid result for the currently selected ply.
      if (detail.evaluation) {
        setEvaluation(detail.evaluation);
      }
    };

    window.addEventListener(ANALYSIS_EVALUATION_EVENT, handleEvaluation);
    return () => {
      window.removeEventListener(ANALYSIS_EVALUATION_EVENT, handleEvaluation);
    };
  }, []);

  const selectedLine = useMemo(() => {
    const lines = evaluation?.lines ?? [];
    if (lines.length === 0) {
      return null;
    }

    return lines[Math.min(selectedLineIndex, lines.length - 1)] ?? lines[0];
  }, [evaluation, selectedLineIndex]);

  const selectedPositions = selectedLine?.positions ?? [];

  useEffect(() => {
    if (!evaluation || evaluation.lines.length === 0) {
      setSelectedLineIndex(0);
      return;
    }

    setSelectedLineIndex((previous) =>
      Math.min(previous, evaluation.lines.length - 1)
    );
  }, [evaluation]);

  useEffect(() => {
    setAnimationIndex(0);
  }, [activePly, selectedLineIndex]);

  useEffect(() => {
    if (selectedPositions.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setAnimationIndex((previous) =>
        (previous + 1) % selectedPositions.length
      );
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedPositions.length]);

  const renderEvaluationBoard = () => {
    if (!selectedLine || selectedPositions.length === 0) {
      return (
        <div className="analysis-detail-placeholder">
          {evaluation
            ? "Für diese Variante wurden noch keine Brettstellungen geliefert."
            : "Evaluation-Bar einschalten, um die Stellung zu analysieren."}
        </div>
      );
    }

    const position =
      selectedPositions[animationIndex % selectedPositions.length]
      ?? selectedPositions[0];

    if (!position || position.length !== 64) {
      return (
        <div className="analysis-detail-placeholder">
          Brettstellung der EvaluationEngine ist nicht verfügbar.
        </div>
      );
    }

    return (
      <div className="analysis-position-board">
        {Array.from({ length: 64 }, (_, index) => {
          const rankFromTop = Math.floor(index / 8);
          const fileFromLeft = index % 8;
          const pieceChar = position.charAt(index);
          const pieceSymbol = getPieceSymbolFromPositionChar(pieceChar);
          const isLight = (rankFromTop + fileFromLeft) % 2 === 0;

          return (
            <div
              key={index}
              className={[
                "analysis-position-square",
                isLight
                  ? "analysis-position-square-light"
                  : "analysis-position-square-dark",
              ].join(" ")}
            >
              {pieceSymbol && (
                <span
                  className={[
                    "analysis-position-piece",
                    isWhitePositionPiece(pieceChar)
                      ? "analysis-position-piece-white"
                      : "analysis-position-piece-black",
                  ].join(" ")}
                >
                  {pieceSymbol}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderLineMoves = (line: EngineLine, isSelected: boolean) => {
    const moves = splitMoveText(line.moves);
    if (moves.length === 0) {
      return "—";
    }

    const highlightedMoveIndex =
      isSelected && selectedPositions.length > 1 && animationIndex > 0
        ? (animationIndex % selectedPositions.length) - 1
        : -1;

    return (
      <>
        {moves.map((move, moveIndex) => (
          <span
            key={`${moveIndex}-${move}`}
            className={
              moveIndex === highlightedMoveIndex
                ? "analysis-line-move analysis-line-move-current"
                : "analysis-line-move"
            }
          >
            {move}
          </span>
        ))}
      </>
    );
  };

  if (!portalHost) {
    return null;
  }

  return createPortal(
    <section className="analysis-detail-row analysis-evaluation-panel">
      <div className="analysis-position-panel analysis-evaluation-position-panel">
        <div className="analysis-detail-title">
          {activePly
            ? `EvaluationEngine-Fortsetzung ab ${activePly}. Halbzug`
            : "EvaluationEngine-Fortsetzung"}
        </div>
        {renderEvaluationBoard()}
      </div>

      <div className="analysis-lines-panel analysis-evaluation-lines-panel">
        <div className="analysis-detail-title">
          EvaluationEngine-Varianten · infinite
        </div>

        {!evaluation && (
          <div className="analysis-detail-placeholder analysis-evaluation-placeholder">
            {activePly
              ? `Evaluation für Halbzug ${activePly} wird berechnet…`
              : "Evaluation-Bar einschalten, um die ausgewählte Stellung infinite zu analysieren."}
          </div>
        )}

        {evaluation && evaluation.lines.length === 0 && (
          <div className="analysis-detail-placeholder analysis-evaluation-placeholder">
            {formatEngineScore(evaluation.eval)} · terminal position
          </div>
        )}

        {evaluation && evaluation.lines.length > 0 && (
          <>
            <div className="engine-lines-summary analysis-evaluation-summary">
              <span>{evaluation.engineName || "Evaluation engine"}</span>
              <span>depth {evaluation.lines[0].depth} · infinite</span>
            </div>

            <div className="analysis-lines-list analysis-evaluation-lines-list">
              {evaluation.lines.map((line, index) => {
                const effectiveIndex = Math.min(
                  selectedLineIndex,
                  evaluation.lines.length - 1
                );
                const isSelected = index === effectiveIndex;

                return (
                  <button
                    type="button"
                    className={[
                      "analysis-line-card",
                      isSelected ? "analysis-line-card-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={`${index}-${line.depth}-${line.moves}`}
                    onClick={() => {
                      setSelectedLineIndex(index);
                      setAnimationIndex(0);
                    }}
                  >
                    <div className="analysis-line-header">
                      <strong>#{index + 1}</strong>
                      <span>{formatEngineLineScore(line)}</span>
                    </div>
                    <div className="analysis-line-moves">
                      {renderLineMoves(line, isSelected)}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>,
    portalHost
  );
}
