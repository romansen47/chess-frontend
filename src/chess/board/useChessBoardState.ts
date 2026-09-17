import { useEffect, useRef, useState } from "react";
import type { HoverPreview, LastMove, MoveRow, Piece } from "../types";
import type { LiveEvaluationPosition } from "../evaluation/LiveEvaluationSource";
import { createInitialPieces } from "./boardUtils";
import { BOARD_ORIENTATION_STORAGE_KEY, normalizeBoardOrientation, type BoardOrientation } from "./boardOrientation";

export function useChessBoardState() {
  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>(() => {
    if (typeof window === "undefined") return "white";
    return normalizeBoardOrientation(window.localStorage.getItem(BOARD_ORIENTATION_STORAGE_KEY));
  });
  const [pieces, setPieces] = useState<Piece[]>(() => createInitialPieces());
  const [moves, setMoves] = useState<MoveRow[]>([]);
  const latestMovePlyRef = useRef(0);
  const moveListReconcilePromiseRef = useRef<Promise<LiveEvaluationPosition | null> | null>(null);
  const liveEvaluationPositionRef = useRef<LiveEvaluationPosition | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null);
  const [hoverAnnotationText, setHoverAnnotationText] = useState<string | null>(null);
  const [isLoadingMoves, setIsLoadingMoves] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uciAnalysisLoaded, setUciAnalysisLoadedState] = useState(false);
  const uciAnalysisLoadedRef = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(BOARD_ORIENTATION_STORAGE_KEY, boardOrientation);
  }, [boardOrientation]);

  function setUciAnalysisLoaded(value: boolean) {
    uciAnalysisLoadedRef.current = value;
    setUciAnalysisLoadedState(value);
  }

  return {
    boardOrientation, setBoardOrientation,
    pieces, setPieces,
    moves, setMoves,
    latestMovePlyRef, moveListReconcilePromiseRef, liveEvaluationPositionRef,
    lastMove, setLastMove,
    hoverPreview, setHoverPreview,
    hoverAnnotationText, setHoverAnnotationText,
    isLoadingMoves, setIsLoadingMoves,
    loadError, setLoadError,
    uciAnalysisLoaded, setUciAnalysisLoaded, uciAnalysisLoadedRef,
  };
}

export type ChessBoardState = ReturnType<typeof useChessBoardState>;
