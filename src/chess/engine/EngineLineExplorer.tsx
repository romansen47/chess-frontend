import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { BoardOrientation } from "../board/boardOrientation";
import { positionIndexForDisplayCell } from "../board/boardOrientation";
import {
  getPieceSymbolFromPositionChar,
  isWhitePositionPiece,
} from "../board/positionUtils";
import type { EngineEvaluation, EngineLine } from "../types";
import "./EngineLineExplorer.css";

interface EngineLineExplorerProps {
  evaluation: EngineEvaluation;
  resetKey: string | null;
  variant: "analysis" | "game";
  engineNameFallback: string;
  depthLabel: (depth: number) => ReactNode;
  boardUnavailableText: ReactNode;
  boardTitle?: ReactNode;
  linesTitle?: ReactNode;
  orientation?: BoardOrientation;
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
    return distance > 0 ? `Mate for ${winner} in ${distance}` : `Mate for ${winner}`;
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

export default function EngineLineExplorer({
  evaluation,
  resetKey,
  variant,
  engineNameFallback,
  depthLabel,
  boardUnavailableText,
  boardTitle,
  linesTitle,
  orientation = "white",
}: EngineLineExplorerProps) {
  const [selectedLineIndex, setSelectedLineIndex] = useState(0);
  const [animationIndex, setAnimationIndex] = useState(0);

  const selectedLine = useMemo(() => {
    const lines = evaluation.lines ?? [];
    if (lines.length === 0) return null;
    return lines[Math.min(selectedLineIndex, lines.length - 1)] ?? lines[0];
  }, [evaluation, selectedLineIndex]);

  const selectedPositions = selectedLine?.positions ?? [];

  useEffect(() => {
    setSelectedLineIndex(0);
    setAnimationIndex(0);
  }, [resetKey]);

  useEffect(() => {
    if (evaluation.lines.length === 0) {
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

  const renderBoard = () => {
    if (!selectedLine || selectedPositions.length === 0) {
      return (
        <div className="analysis-detail-placeholder">
          {boardUnavailableText}
        </div>
      );
    }

    const position =
      selectedPositions[animationIndex % selectedPositions.length]
      ?? selectedPositions[0];

    if (!position || position.length !== 64) {
      return (
        <div className="analysis-detail-placeholder">
          {boardUnavailableText}
        </div>
      );
    }

    return (
      <div className="analysis-position-board">
        {Array.from({ length: 64 }, (_, index) => {
          const rankFromTop = Math.floor(index / 8);
          const fileFromLeft = index % 8;
          const positionIndex = positionIndexForDisplayCell(
            rankFromTop,
            fileFromLeft,
            orientation
          );
          const pieceChar = position.charAt(positionIndex);
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

  const effectiveIndex = Math.min(
    selectedLineIndex,
    Math.max(0, evaluation.lines.length - 1)
  );

  return (
    <div className={`engine-line-explorer engine-line-explorer-${variant}`}>
      <div
        className={
          variant === "analysis"
            ? "analysis-position-panel analysis-evaluation-position-panel"
            : "game-engine-explorer-board-panel"
        }
      >
        {boardTitle !== undefined && (
          <div className="analysis-detail-title">{boardTitle}</div>
        )}
        {renderBoard()}
      </div>

      <div
        className={
          variant === "analysis"
            ? "analysis-lines-panel analysis-evaluation-lines-panel"
            : "game-engine-explorer-lines-panel"
        }
      >
        {linesTitle !== undefined && (
          <div className="analysis-detail-title">{linesTitle}</div>
        )}
        <div className="engine-lines-summary engine-line-explorer-summary">
          <span>{evaluation.engineName || engineNameFallback}</span>
          <span>{depthLabel(evaluation.lines[0]?.depth ?? 0)}</span>
        </div>

        <div className="analysis-lines-list engine-line-explorer-list">
          {evaluation.lines.map((line, index) => {
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
      </div>
    </div>
  );
}
