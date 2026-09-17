import { describe, expect, it } from "vitest";

import type { Piece } from "../types";
import { createInitialPieces, decodeChess960BackRank, getCastlingSquares } from "./boardUtils";

function piece(partial: Omit<Piece, "id">): Piece {
  return { id: `${partial.color}-${partial.type}-${partial.file}-${partial.rank}`, ...partial };
}

describe("Chess960 board utilities", () => {
  it("keeps Scharnagl position 518 identical to classical chess", () => {
    expect(decodeChess960BackRank(518)).toEqual([
      "rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook",
    ]);
    const pieces = createInitialPieces(518);
    expect(pieces.find((value) => value.color === "white" && value.type === "king"))
      .toMatchObject({ file: 5, rank: 1 });
  });

  it("decodes position 0 and recognizes a stationary-king castle", () => {
    expect(decodeChess960BackRank(0)).toEqual([
      "bishop", "bishop", "queen", "knight", "knight", "rook", "king", "rook",
    ]);

    const king = piece({ color: "white", type: "king", file: 7, rank: 1 });
    const rook = piece({ color: "white", type: "rook", file: 8, rank: 1 });
    expect(getCastlingSquares(king, "g1", "h1", [king, rook])).toEqual({
      kingTo: "g1",
      rookFrom: "h1",
      rookTo: "f1",
    });
  });
});
