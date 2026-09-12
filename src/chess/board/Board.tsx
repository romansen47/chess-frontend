import type { PointerEvent, RefObject } from "react";
import type {
  DragState,
  LastMove,
  MoveAnnotationKind,
  MoveAnnotationSymbol,
  PgnNagSymbol,
  Piece,
} from "../types";
import { getPieceSymbol, squareName } from "./boardUtils";
import {
  displayCellToSquare,
  squareToBoardOffset,
  type BoardOrientation,
} from "./boardOrientation";

export interface BoardAnnotation {
  square: string;
  symbol: MoveAnnotationSymbol | PgnNagSymbol;
  kind: MoveAnnotationKind | "saved";
  tooltip: string | null;
}

interface BoardProps {
  pieces: Piece[];
  selectedSquare: string | null;
  lastMove: LastMove | null;
  possibleTargets: string[];
  dragState: DragState | null;
  annotation: BoardAnnotation | null;
  orientation: BoardOrientation;
  boardContainerRef: RefObject<HTMLDivElement | null>;
  onSquareClick: (square: string) => void | Promise<void>;
  onPiecePointerDown: (event: PointerEvent<HTMLDivElement>, piece: Piece) => void | Promise<void>;
  onPiecePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPiecePointerUp: (event: PointerEvent<HTMLDivElement>) => void | Promise<void>;
  onPiecePointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
}

export default function Board({
  pieces,
  selectedSquare,
  lastMove,
  possibleTargets,
  dragState,
  annotation,
  orientation,
  boardContainerRef,
  onSquareClick,
  onPiecePointerDown,
  onPiecePointerMove,
  onPiecePointerUp,
  onPiecePointerCancel,
}: BoardProps) {
  const squares = [];
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 8; column++) {
      const name = displayCellToSquare(row, column, orientation);
      const file = name.charCodeAt(0) - "a".charCodeAt(0) + 1;
      const rank = Number(name.substring(1));
      const squareClasses = [
        "square",
        (file + rank) % 2 !== 0 ? "square-light" : "square-dark",
        selectedSquare === name ? "square-selected" : "",
        lastMove && (lastMove.from === name || lastMove.to === name) ? "square-last-move" : "",
        possibleTargets.includes(name) ? "square-possible" : "",
      ].filter(Boolean).join(" ");
      squares.push(
        <div key={name} className={squareClasses} onClick={() => onSquareClick(name)}>
          <span className="square-label">{name}</span>
        </div>
      );
    }
  }

  const renderedPieces = pieces.map((piece) => {
    const pieceOffset = squareToBoardOffset(
      squareName(piece.file, piece.rank),
      orientation,
      80
    );
    const x = pieceOffset?.x ?? 0;
    const y = pieceOffset?.y ?? 0;
    const isDragging = dragState?.pieceId === piece.id;
    const renderX = isDragging ? dragState.x : x;
    const renderY = isDragging ? dragState.y : y;
    const classes = [
      "piece",
      piece.color === "white" ? "piece-white" : "piece-black",
      isDragging ? "piece-dragging" : "",
    ].filter(Boolean).join(" ");

    return (
      <div
        key={piece.id}
        className={classes}
        style={{ transform: `translate(${renderX}px, ${renderY}px)` }}
        onPointerDown={(event) => onPiecePointerDown(event, piece)}
        onPointerMove={onPiecePointerMove}
        onPointerUp={onPiecePointerUp}
        onPointerCancel={onPiecePointerCancel}
      >
        {getPieceSymbol(piece)}
      </div>
    );
  });

  const annotationCoords = annotation
    ? squareToBoardOffset(annotation.square, orientation, 80)
    : null;

  return (
    <div className="board-container" ref={boardContainerRef}>
      <div className="board">{squares}</div>
      <div className="pieces-layer">{renderedPieces}</div>
      {annotation && annotationCoords && (
        <div
          className={`board-move-annotation move-annotation-${annotation.kind}`}
          data-tooltip={annotation.tooltip ?? undefined}
          title={annotation.tooltip ?? undefined}
          aria-label={annotation.tooltip ?? undefined}
          style={{
            left: annotationCoords.x + 56,
            top: annotationCoords.y + 4,
          }}
        >
          {annotation.symbol}
        </div>
      )}
    </div>
  );
}
