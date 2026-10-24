export interface OpeningMoveRow {
  moveNumber: number;
  white: string | null;
  black: string | null;
}

export function openingMoveRows(sanMoves: readonly string[]): OpeningMoveRow[] {
  const rows: OpeningMoveRow[] = [];
  for (let index = 0; index < sanMoves.length; index += 2) {
    rows.push({
      moveNumber: index / 2 + 1,
      white: sanMoves[index] ?? null,
      black: sanMoves[index + 1] ?? null,
    });
  }
  return rows;
}
