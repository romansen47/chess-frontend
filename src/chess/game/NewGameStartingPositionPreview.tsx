import { createInitialPieces, getPieceSymbol, squareName } from "../board/boardUtils";
import { mapPositionStringToLocalPieces } from "../board/positionUtils";
import type { Piece } from "../types";

interface Props {
  positionId: number;
  title: string;
  position?: string | null;
}

/** Square-preserving board preview for the new-game dialog. */
export default function NewGameStartingPositionPreview({
  positionId,
  title,
  position,
}: Props) {
  const pieces = position?.length === 64
    ? mapPositionStringToLocalPieces(position)
    : createInitialPieces(positionId);
  const piecesBySquare = new Map<string, Piece>(
    pieces.map((piece) => [squareName(piece.file, piece.rank), piece]),
  );
  const squares = [];

  for (let rank = 8; rank >= 1; rank--) {
    for (let file = 1; file <= 8; file++) {
      const square = squareName(file, rank);
      const piece = piecesBySquare.get(square);
      const light = (file + rank) % 2 !== 0;
      squares.push(
        <div
          key={square}
          className={`new-game-preview-square ${
            light ? "new-game-preview-square-light" : "new-game-preview-square-dark"
          }`}
          aria-label={square}
        >
          {piece && (
            <span
              className={`new-game-preview-piece new-game-preview-piece-${piece.color}`}
              aria-hidden="true"
            >
              {getPieceSymbol(piece)}
            </span>
          )}
        </div>,
      );
    }
  }

  return (
    <section className="new-game-preview" aria-label={title}>
      <div className="new-game-preview-title">{title}</div>
      <div className="new-game-preview-id">#{positionId}</div>
      <div className="new-game-preview-board">{squares}</div>
    </section>
  );
}
