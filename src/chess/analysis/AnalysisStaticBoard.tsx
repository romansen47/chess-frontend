import type { BoardOrientation } from "../board/boardOrientation";
import {
  displayCellToSquare,
  positionIndexForDisplayCell,
} from "../board/boardOrientation";
import {
  getPieceSymbolFromPositionChar,
  isWhitePositionPiece,
} from "../board/positionUtils";
import type { BoardArrowMove } from "../types";

interface Props {
  position: string;
  orientation: BoardOrientation;
  highlightedMove?: BoardArrowMove | null;
  className?: string;
}

/**
 * Small read-only board used for analysis comparisons.
 *
 * <p>The component deliberately reuses the normal analysis-board CSS so board
 * themes remain consistent with the other engine boards.</p>
 */
export default function AnalysisStaticBoard({
  position,
  orientation,
  highlightedMove = null,
  className,
}: Props) {
  if (!position || position.length !== 64) {
    return null;
  }

  return (
    <div
      className={[
        "analysis-position-board",
        className ?? "",
      ].filter(Boolean).join(" ")}
    >
      {Array.from({ length: 64 }, (_, index) => {
        const rankFromTop = Math.floor(index / 8);
        const fileFromLeft = index % 8;
        const square = displayCellToSquare(
          rankFromTop,
          fileFromLeft,
          orientation,
        );
        const positionIndex = positionIndexForDisplayCell(
          rankFromTop,
          fileFromLeft,
          orientation,
        );
        const pieceChar = position.charAt(positionIndex);
        const pieceSymbol = getPieceSymbolFromPositionChar(pieceChar);
        const isMoveSquare = highlightedMove != null
          && (highlightedMove.from === square || highlightedMove.to === square);

        return (
          <div
            key={index}
            className={[
              "analysis-position-square",
              (rankFromTop + fileFromLeft) % 2 === 0
                ? "analysis-position-square-light"
                : "analysis-position-square-dark",
              isMoveSquare ? "analysis-position-square-move" : "",
            ].filter(Boolean).join(" ")}
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
}
