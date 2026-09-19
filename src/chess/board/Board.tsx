import { useEffect, useState, type CSSProperties, type PointerEvent, type RefObject } from "react";
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

const DEFAULT_BOARD_SIZE = 704;
const DEFAULT_SQUARE_SIZE = DEFAULT_BOARD_SIZE / 8;

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
  annotations: BoardAnnotation[];
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
  annotations,
  orientation,
  boardContainerRef,
  onSquareClick,
  onPiecePointerDown,
  onPiecePointerMove,
  onPiecePointerUp,
  onPiecePointerCancel,
}: BoardProps) {
  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD_SIZE);

  useEffect(() => {
    const element = boardContainerRef.current;
    if (!element) return;

    const updateSize = () => {
      const nextSize = element.getBoundingClientRect().width;
      if (!Number.isFinite(nextSize) || nextSize <= 0) return;
      setBoardSize((previous) => Math.abs(previous - nextSize) < 0.5 ? previous : nextSize);
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [boardContainerRef]);

  const squareSize = boardSize > 0 ? boardSize / 8 : DEFAULT_SQUARE_SIZE;
  const targetMarkerSize = Math.max(14, Math.min(30, squareSize * (30 / DEFAULT_SQUARE_SIZE)));
  const annotationSize = Math.max(9, Math.min(14, squareSize * (14 / DEFAULT_SQUARE_SIZE)));
  const annotationGap = Math.max(10, Math.min(16, squareSize * (16 / DEFAULT_SQUARE_SIZE)));
  const boardStyle = {
    "--board-square-size": `${squareSize}px`,
  } as CSSProperties;

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
      squareSize
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

  const renderedPossibleTargets = possibleTargets.map((square) => {
    const targetOffset = squareToBoardOffset(square, orientation, squareSize);
    if (!targetOffset) return null;

    return (
      <div
        key={square}
        className={[
          "possible-target-marker",
          selectedSquare === square ? "possible-target-marker-selected" : "",
        ].filter(Boolean).join(" ")}
        style={{
          width: targetMarkerSize,
          height: targetMarkerSize,
          left: targetOffset.x + (squareSize - targetMarkerSize) / 2,
          top: targetOffset.y + (squareSize - targetMarkerSize) / 2,
        }}
      />
    );
  });

  return (
    <div className="board-container" ref={boardContainerRef} style={boardStyle}>
      <div className="board">{squares}</div>
      <div className="pieces-layer">{renderedPieces}</div>
      <div className="possible-targets-layer">{renderedPossibleTargets}</div>
      {annotations.map((annotation, index) => {
        const annotationCoords = squareToBoardOffset(
          annotation.square,
          orientation,
          squareSize
        );
        if (!annotationCoords) return null;

        return (
          <div
            key={`${annotation.kind}-${annotation.symbol}-${index}`}
            className={`board-move-annotation move-annotation-${annotation.kind}`}
            data-tooltip={annotation.tooltip ?? undefined}
            aria-label={annotation.tooltip ?? undefined}
            style={{
              width: annotationSize,
              height: annotationSize,
              left: annotationCoords.x + squareSize - annotationSize - 3 - index * annotationGap,
              top: annotationCoords.y + Math.max(1, squareSize * 0.02),
            }}
          >
            {annotation.symbol}
          </div>
        );
      })}
    </div>
  );
}
