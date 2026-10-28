import { getPieceSymbol, squareName } from "./boardUtils";
import { mapPositionStringToLocalPieces } from "./positionUtils";
import type { Piece } from "../types";

interface Props {
  position: string | null | undefined;
  classPrefix: string;
  fallbackPieces?: Piece[];
  labelSquares?: boolean;
}

/** Shared square-preserving preview used by opening and start-position views. */
export default function PositionPreviewBoard({
  position,
  classPrefix,
  fallbackPieces = [],
  labelSquares = false,
}: Props) {
  const pieces = position?.length === 64
    ? mapPositionStringToLocalPieces(position)
    : fallbackPieces;
  const piecesBySquare = new Map(
    pieces.map((piece) => [squareName(piece.file, piece.rank), piece]),
  );

  return (
    <div className={`${classPrefix}-board`}>
      {Array.from({ length: 64 }, (_, index) => {
        const rank = 8 - Math.floor(index / 8);
        const file = (index % 8) + 1;
        const square = squareName(file, rank);
        const piece = piecesBySquare.get(square);
        const color = (file + rank) % 2 !== 0 ? "light" : "dark";
        return (
          <div
            key={square}
            className={`${classPrefix}-square ${classPrefix}-square-${color}`}
            aria-label={labelSquares ? square : undefined}
          >
            {piece && (
              <span
                className={`${classPrefix}-piece ${classPrefix}-piece-${piece.color}`}
                aria-hidden="true"
              >
                {getPieceSymbol(piece)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
