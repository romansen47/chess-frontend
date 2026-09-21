import type { MoveResult, MoveRow } from "../types";

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


export function appendMoveResultToRows(
  current: MoveRow[],
  result: MoveResult,
): MoveRow[] {
  const san = result.san?.trim() || `${result.from}-${result.to}`;
  const position = result.position ?? undefined;
  const uci = result.uci?.trim() || `${result.from}${result.to}`;
  const ply =
    typeof result.ply === "number"
    && Number.isInteger(result.ply)
    && result.ply > 0
      ? result.ply
      : null;

  const copy = current.map((row) => ({ ...row }));

  if (ply != null) {
    const moveNumber = Math.ceil(ply / 2);
    let row = copy.find((candidate) => candidate.moveNumber === moveNumber);
    if (!row) {
      row = { moveNumber };
      copy.push(row);
    }
    if (ply % 2 === 1) {
      Object.assign(row, {
        white: san,
        whiteUci: uci,
        whitePosition: position,
      });
    } else {
      Object.assign(row, {
        black: san,
        blackUci: uci,
        blackPosition: position,
      });
    }
    return copy.sort((left, right) => left.moveNumber - right.moveNumber);
  }

  const moverSide =
    result.sideToMove === "white"
      ? "black"
      : result.sideToMove === "black"
        ? "white"
        : null;
  const last = copy[copy.length - 1];

  if (moverSide === "white") {
    copy.push({
      moveNumber: last ? last.moveNumber + 1 : 1,
      white: san,
      whiteUci: uci,
      whitePosition: position,
    });
  } else if (moverSide === "black" && last?.white && !last.black) {
    Object.assign(last, {
      black: san,
      blackUci: uci,
      blackPosition: position,
    });
  } else if (moverSide === "black") {
    copy.push({
      moveNumber: last ? last.moveNumber + 1 : 1,
      black: san,
      blackUci: uci,
      blackPosition: position,
    });
  } else if (!last || last.black) {
    copy.push({
      moveNumber: last ? last.moveNumber + 1 : 1,
      white: san,
      whiteUci: uci,
      whitePosition: position,
    });
  } else {
    Object.assign(last, {
      black: san,
      blackUci: uci,
      blackPosition: position,
    });
  }

  return copy;
}
