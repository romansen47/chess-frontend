import type { MoveRow } from "../types";

export function mergeAuthoritativeMoveRows(
  current: MoveRow[],
  authoritative: MoveRow[]
): MoveRow[] {
  const merged = new Map<number, MoveRow>();

  for (const row of current) {
    merged.set(row.moveNumber, { ...row });
  }

  for (const row of authoritative) {
    const existing = merged.get(row.moveNumber);
    merged.set(
      row.moveNumber,
      existing ? { ...existing, ...row } : { ...row }
    );
  }

  return Array.from(merged.values()).sort(
    (left, right) => left.moveNumber - right.moveNumber
  );
}
