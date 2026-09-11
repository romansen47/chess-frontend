import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { EngineEvaluation, EngineLine } from "../types";
import {
  getPieceSymbolFromPositionChar,
  isWhitePositionPiece,
} from "../board/positionUtils";
import "./analysisViews.css";

interface LiveEvaluationViewProps {
  evaluation: EngineEvaluation | null;
  evaluationKey: string | null;
  activePly: number | null;
  variationMode: boolean;
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

function splitMoveText(moves: string): string[] {
  if (!moves || !moves.trim()) return [];

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

export default function LiveEvaluationView({
  evaluation,
  evaluationKey,
  activePly,
  variationMode,
}: LiveEvaluationViewProps) {
  const { t } = useI18n();
  const [selectedLineIndex, setSelectedLineIndex] = useState(0);
  const [animationIndex, setAnimationIndex] = useState(0);

  const selectedLine = useMemo(() => {
    const lines = evaluation?.lines ?? [];
    if (lines.length === 0) return null;
    return lines[Math.min(selectedLineIndex, lines.length - 1)] ?? lines[0];
  }, [evaluation, selectedLineIndex]);

  const selectedPositions = selectedLine?.positions ?? [];

  useEffect(() => {
    setSelectedLineIndex(0);
    setAnimationIndex(0);
  }, [evaluationKey]);

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
  }, [selectedLineIndex]);

  useEffect(() => {
    if (selectedPositions.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setAnimationIndex((previous) =>
        (previous + 1) % selectedPositions.length
      );
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [selectedPositions.length]);

  const renderEvaluationBoard = () => {
    if (!selectedLine || selectedPositions.length === 0) {
      return (
        <div className="analysis-detail-placeholder">
          {evaluation
            ? t("analysis.noBoardPositionsVariation")
            : t("analysis.enableEvaluationBar")}
        </div>
      );
    }

    const position =
      selectedPositions[animationIndex % selectedPositions.length]
      ?? selectedPositions[0];

    if (!position || position.length !== 64) {
      return (
        <div className="analysis-detail-placeholder">
          {t("analysis.evaluationBoardUnavailable")}
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
    if (moves.length === 0) return "—";

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

  return (
    <section className="analysis-detail-row analysis-evaluation-panel">
      <div className="analysis-position-panel analysis-evaluation-position-panel">
        <div className="analysis-detail-title">
          {variationMode
            ? activePly
              ? t("analysis.variationFromPly", { ply: activePly })
              : t("analysis.evaluationVariation")
            : activePly
              ? t("analysis.continuationFromPly", { ply: activePly })
              : t("analysis.evaluationContinuation")}
        </div>
        {renderEvaluationBoard()}
      </div>

      <div className="analysis-lines-panel analysis-evaluation-lines-panel">
        <div className="analysis-detail-title">
          {t("analysis.variationsInfinite")}
        </div>

        {!evaluation && (
          <div className="analysis-detail-placeholder analysis-evaluation-placeholder">
            {variationMode
              ? t("analysis.evaluationCalculating")
              : activePly
                ? t("analysis.evaluationPlyCalculating", { ply: activePly })
                : t("analysis.enableSelectedInfinite")}
          </div>
        )}

        {evaluation && evaluation.lines.length === 0 && (
          <div className="analysis-detail-placeholder analysis-evaluation-placeholder">
            {formatEngineScore(evaluation.eval)} · {t("analysis.terminalPosition")}
          </div>
        )}

        {evaluation && evaluation.lines.length > 0 && (
          <>
            <div className="engine-lines-summary analysis-evaluation-summary">
              <span>{evaluation.engineName || t("analysis.evaluationEngine")}</span>
              <span>{t("analysis.depthInfinite", { depth: evaluation.lines[0].depth })}</span>
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
    </section>
  );
}
