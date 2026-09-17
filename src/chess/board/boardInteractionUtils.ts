import type { PointerEvent } from "react";
import type { Piece } from "../types";
import { getRankFromSquare } from "./boardUtils";

export function isPromotionMove(piece: Piece | undefined, targetSquare: string): boolean {
  if (!piece || piece.type !== "pawn") return false;
  const targetRank = getRankFromSquare(targetSquare);
  return (piece.color === "white" && targetRank === 8)
    || (piece.color === "black" && targetRank === 1);
}

export function createDragState(
  event: PointerEvent<HTMLDivElement>,
  pieceId: string,
  from: string,
  boardRect: DOMRect,
  offsetX: number,
  offsetY: number,
) {
  return {
    pieceId,
    from,
    pointerId: event.pointerId,
    offsetX,
    offsetY,
    boardLeft: boardRect.left,
    boardTop: boardRect.top,
    x: event.clientX - boardRect.left - offsetX,
    y: event.clientY - boardRect.top - offsetY,
    startClientX: event.clientX,
    startClientY: event.clientY,
    hasMoved: false,
  };
}
