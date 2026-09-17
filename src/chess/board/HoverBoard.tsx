import type { HoverPreview } from "../types";
import type { BoardOrientation } from "./boardOrientation";
import { positionIndexForDisplayCell } from "./boardOrientation";
import {
  getPieceSymbolFromPositionChar,
  isWhitePositionPiece,
} from "./positionUtils";

interface HoverBoardProps {
  preview: HoverPreview | null;
  annotationText: string | null;
  orientation: BoardOrientation;
}

const PREVIEW_SIZE = 240;
const OFFSET = 18;
const TOOLTIP_GAP = 8;
const TOOLTIP_RESERVE_HEIGHT = 72;

export default function HoverBoard({
  preview,
  annotationText,
  orientation,
}: HoverBoardProps) {
  if (!preview) return null;

  const combinedHeight = PREVIEW_SIZE
    + (annotationText ? TOOLTIP_GAP + TOOLTIP_RESERVE_HEIGHT : 0);
  const left = Math.max(
    OFFSET,
    Math.min(preview.x + OFFSET, window.innerWidth - PREVIEW_SIZE - OFFSET)
  );
  const top = Math.max(
    OFFSET,
    Math.min(preview.y + OFFSET, window.innerHeight - combinedHeight - OFFSET)
  );

  const squares = Array.from({ length: 64 }, (_, index) => {
    const rankFromTop = Math.floor(index / 8);
    const fileFromLeft = index % 8;
    const positionIndex = positionIndexForDisplayCell(
      rankFromTop,
      fileFromLeft,
      orientation
    );
    const pieceChar = preview.position.charAt(positionIndex);
    const pieceSymbol = getPieceSymbolFromPositionChar(pieceChar);
    const isLight = (rankFromTop + fileFromLeft) % 2 === 0;

    return (
      <div
        key={index}
        className={[
          "hover-board-square",
          isLight ? "hover-board-square-light" : "hover-board-square-dark",
        ].join(" ")}
      >
        {pieceSymbol && (
          <span
            className={[
              "hover-board-piece",
              isWhitePositionPiece(pieceChar)
                ? "hover-board-piece-white"
                : "hover-board-piece-black",
            ].join(" ")}
          >
            {pieceSymbol}
          </span>
        )}
      </div>
    );
  });

  return (
    <>
      <div className="hover-board" style={{ left, top }}>{squares}</div>
      {annotationText && (
        <div
          className="hover-annotation-tooltip"
          style={{ left, top: top + PREVIEW_SIZE + TOOLTIP_GAP }}
        >
          {annotationText}
        </div>
      )}
    </>
  );
}
