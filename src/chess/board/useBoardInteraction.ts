import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { DragState, Piece, PieceColor } from "../types";
import { squareName } from "./boardUtils";
import { boardPointToSquare } from "./boardOrientation";
import { getAnalysisSideToMove } from "../analysis/analysisSelectionUtils";
import type { UseBoardInteractionOptions } from "./boardInteractionTypes";
import { createDragState, isPromotionMove } from "./boardInteractionUtils";

export type { AnalysisInteractionContext } from "./boardInteractionTypes";

export function useBoardInteraction({
  pieces,
  boardOrientation,
  clock,
  uciAnalysisLoaded,
  isLoadingMoves,
  isComputerThinking,
  isSideComputerControlled,
  getAnalysisContext,
  loadPossibleMoves,
  performBoardMove,
  performMove,
  animateMoveLocally,
  loadBoardFromBackend,
}: UseBoardInteractionOptions) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const possibleTargetsRef = useRef<string[]>([]);
  const [possibleTargets, setPossibleTargets] = useState<string[]>([]);
  const [promotionContext, setPromotionContext] = useState<{
    from: string;
    to: string;
    color: PieceColor;
  } | null>(null);

  const squareToPieceMap = useMemo(() => {
    const map = new Map<string, Piece>();
    for (const piece of pieces) map.set(squareName(piece.file, piece.rank), piece);
    return map;
  }, [pieces]);

  function updatePossibleTargets(targets: string[]) {
    possibleTargetsRef.current = targets;
    setPossibleTargets(targets);
  }

  function resetBoardInteraction() {
    setDragState(null);
    setSelectedSquare(null);
    updatePossibleTargets([]);
    setPromotionContext(null);
  }

  function analysisBoardInteractive(): boolean {
    const analysis = getAnalysisContext();
    return Boolean(
      analysis.replayActiveCurrent
      && analysis.replayFinished
      && analysis.selectedPosition
      && !analysis.replayRunning
      && !analysis.variationGameState
    );
  }

  function selectablePiece(piece: Piece, analysisInteractive: boolean): boolean {
    const analysis = getAnalysisContext();
    const sideToMove = analysisInteractive
      ? getAnalysisSideToMove(analysis.selectedPosition?.ply, analysis.variationMoveCount)
      : clock?.sideToMove === "white" || clock?.sideToMove === "black"
        ? clock.sideToMove
        : null;
    if (sideToMove && piece.color !== sideToMove) return false;
    return analysisInteractive || !isSideComputerControlled(piece.color);
  }

  function getSquareFromClientPoint(clientX: number, clientY: number): string | null {
    const boardRect = boardContainerRef.current?.getBoundingClientRect();
    if (!boardRect) return null;
    return boardPointToSquare(
      clientX - boardRect.left,
      clientY - boardRect.top,
      boardRect.width,
      boardRect.height,
      boardOrientation,
    );
  }

  async function handlePiecePointerDown(event: PointerEvent<HTMLDivElement>, piece: Piece) {
    if (event.button !== 0) return;
    const analysis = getAnalysisContext();
    const analysisInteractive = analysisBoardInteractive();
    if (
      (!analysisInteractive && (analysis.replayActive || uciAnalysisLoaded))
      || isLoadingMoves
      || isComputerThinking
      || promotionContext
      || (!analysisInteractive && clock?.gameState)
    ) return;
    const from = squareName(piece.file, piece.rank);

    if (selectedSquare && selectedSquare !== from && possibleTargets.includes(from)) {
      event.preventDefault();
      const movingPiece = squareToPieceMap.get(selectedSquare);
      if (isPromotionMove(movingPiece, from)) {
        setPromotionContext({ from: selectedSquare, to: from, color: movingPiece!.color });
        setSelectedSquare(null);
        updatePossibleTargets([]);
        return;
      }
      const sourceSquare = selectedSquare;
      setSelectedSquare(null);
      updatePossibleTargets([]);
      await performBoardMove(sourceSquare, from);
      return;
    }

    if (!selectablePiece(piece, analysisInteractive)) return;
    const boardRect = boardContainerRef.current?.getBoundingClientRect();
    const pieceRect = event.currentTarget.getBoundingClientRect();
    if (!boardRect) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const offsetX = event.clientX - pieceRect.left;
    const offsetY = event.clientY - pieceRect.top;
    setSelectedSquare(from);
    updatePossibleTargets([]);
    setDragState(createDragState(event, piece.id, from, boardRect, offsetX, offsetY));
    await loadPossibleMoves(from);
  }

  function handlePiecePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    const deltaX = event.clientX - dragState.startClientX;
    const deltaY = event.clientY - dragState.startClientY;
    const hasMoved = dragState.hasMoved || Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 4;
    setDragState((previous) => previous && previous.pointerId === event.pointerId
      ? {
          ...previous,
          x: event.clientX - previous.boardLeft - previous.offsetX,
          y: event.clientY - previous.boardTop - previous.offsetY,
          hasMoved,
        }
      : previous);
  }

  async function handlePiecePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    const finishedDrag = {
      ...dragState,
      x: event.clientX - dragState.boardLeft - dragState.offsetX,
      y: event.clientY - dragState.boardTop - dragState.offsetY,
    };
    if (!finishedDrag.hasMoved) {
      setDragState(null);
      return;
    }
    const targetSquare = getSquareFromClientPoint(event.clientX, event.clientY);
    if (
      !targetSquare
      || targetSquare === finishedDrag.from
      || !possibleTargetsRef.current.includes(targetSquare)
    ) {
      resetBoardInteraction();
      return;
    }
    const movingPiece = squareToPieceMap.get(finishedDrag.from);
    if (isPromotionMove(movingPiece, targetSquare)) {
      setDragState(null);
      setPromotionContext({ from: finishedDrag.from, to: targetSquare, color: movingPiece!.color });
      setSelectedSquare(null);
      updatePossibleTargets([]);
      return;
    }
    setSelectedSquare(null);
    updatePossibleTargets([]);

    const analysis = getAnalysisContext();
    if (analysis.replayActiveCurrent && analysis.replayFinished && analysis.selectedPosition) {
      setDragState(null);
      await performBoardMove(finishedDrag.from, targetSquare);
      return;
    }

    setDragState(finishedDrag);
    window.requestAnimationFrame(() => {
      animateMoveLocally(finishedDrag.from, targetSquare);
      setDragState(null);
      performMove(finishedDrag.from, targetSquare, undefined, {
        localMoveAlreadyApplied: true,
      }).catch(async (error) => {
        console.error("[handlePiecePointerUp] optimistic drag-and-drop move failed:", error);
        await loadBoardFromBackend();
      });
    });
  }

  function handlePiecePointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    resetBoardInteraction();
  }

  async function handleSquareClick(square: string) {
    const analysis = getAnalysisContext();
    const analysisInteractive = analysisBoardInteractive();
    if (
      (!analysisInteractive && (analysis.replayActive || uciAnalysisLoaded))
      || isLoadingMoves
      || isComputerThinking
    ) return;
    if (promotionContext || (!analysisInteractive && clock?.gameState)) return;
    const clickedPiece = squareToPieceMap.get(square);
    if (!selectedSquare) {
      if (clickedPiece && selectablePiece(clickedPiece, analysisInteractive)) {
        setSelectedSquare(square);
        await loadPossibleMoves(square);
      }
      return;
    }
    if (selectedSquare === square) {
      setSelectedSquare(null);
      updatePossibleTargets([]);
      return;
    }
    if (possibleTargets.includes(square)) {
      const from = selectedSquare;
      const movingPiece = squareToPieceMap.get(from);
      if (isPromotionMove(movingPiece, square)) {
        setPromotionContext({ from, to: square, color: movingPiece!.color });
        updatePossibleTargets([]);
        return;
      }
      await performBoardMove(from, square);
      return;
    }
    if (clickedPiece && selectablePiece(clickedPiece, analysisInteractive)) {
      setSelectedSquare(square);
      await loadPossibleMoves(square);
      return;
    }
    setSelectedSquare(null);
    updatePossibleTargets([]);
  }

  return {
    selectedSquare,
    setSelectedSquare,
    dragState,
    setDragState,
    boardContainerRef,
    possibleTargets,
    updatePossibleTargets,
    promotionContext,
    setPromotionContext,
    resetBoardInteraction,
    handlePiecePointerDown,
    handlePiecePointerMove,
    handlePiecePointerUp,
    handlePiecePointerCancel,
    handleSquareClick,
  };
}

export type BoardInteraction = ReturnType<typeof useBoardInteraction>;
