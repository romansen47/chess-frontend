import type { PointerEvent, RefObject } from "react";
import type { DragState, LastMove, Piece } from "../types";
import { getPieceSymbol, squareName } from "./boardUtils";

interface BoardProps {
  pieces: Piece[];
  selectedSquare: string | null;
  lastMove: LastMove | null;
  possibleTargets: string[];
  dragState: DragState | null;
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
  boardContainerRef,
  onSquareClick,
  onPiecePointerDown,
  onPiecePointerMove,
  onPiecePointerUp,
  onPiecePointerCancel,
}: BoardProps) {
  const squares = [];
  for (let rank = 8; rank >= 1; rank--) {
    for (let file = 1; file <= 8; file++) {
      const name = squareName(file, rank);
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
    const x = (piece.file - 1) * 80;
    const y = (8 - piece.rank) * 80;
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

  return (
    <div className="board-container" ref={boardContainerRef}>
      <div className="board">{squares}</div>
      <div className="pieces-layer">{renderedPieces}</div>
    </div>
  );
}
