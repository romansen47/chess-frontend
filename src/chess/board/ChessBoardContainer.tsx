import type { MouseEvent } from "react";
import AnalysisReplayContent from "../analysis/AnalysisReplayContent";
import type { AnalysisController } from "../analysis/useAnalysisController";
import {
  getAnalysisBlackPlayerName,
  getAnalysisWhitePlayerName,
  getDisplayedBlackPlayerName,
  getDisplayedWhitePlayerName,
} from "../game/gameFormatters";
import ChessBoardView from "./ChessBoardView";
import type { BoardInteraction } from "./useBoardInteraction";
import type { ChessBoardState } from "./useChessBoardState";
import type { ChessEngineState } from "./useChessEngineState";
import type { ChessGameLifecycle } from "./useChessGameLifecycle";
import type { ChessGameState } from "./useChessGameState";
import type { ChessLiveEvaluation } from "./useChessLiveEvaluation";
import type { ChessMoveFlow } from "./useChessMoveFlow";

interface ComputerState {
  whiteComputerEnabled: boolean;
  blackComputerEnabled: boolean;
  isComputerThinking: boolean;
  updateWhiteComputerEnabled: (value: boolean) => void;
  updateBlackComputerEnabled: (value: boolean) => void;
}

interface Props {
  board: ChessBoardState;
  engine: ChessEngineState;
  game: ChessGameState;
  analysis: AnalysisController;
  interaction: BoardInteraction;
  live: ChessLiveEvaluation;
  move: ChessMoveFlow;
  lifecycle: ChessGameLifecycle;
  computer: ComputerState;
  flipBoardOrientation: () => void;
}

export default function ChessBoardContainer({
  board, engine, game, analysis, interaction, live, move, lifecycle, computer, flipBoardOrientation,
}: Props) {
  const analysisContent = <AnalysisReplayContent
    state={{
      boardOrientation: board.boardOrientation,
      analysisProfile: analysis.analysisProfile,
      analysisTotalPlies: analysis.analysisTotalPlies,
      analysisSelectedPosition: analysis.analysisSelectedPosition,
      analysisReplayStatus: analysis.analysisReplayStatus,
      isAnalysisReplayRunning: analysis.isAnalysisReplayRunning,
      analysisReplayError: analysis.analysisReplayError,
      analysisEvaluationError: analysis.analysisEvaluationError,
      moves: board.moves,
      analysisSelectedLineIndex: analysis.analysisSelectedLineIndex,
      analysisLineAnimationIndex: analysis.analysisLineAnimationIndex,
      analysisDetailsTab: analysis.analysisDetailsTab,
      engineEval: engine.engineEval,
      analysisEvaluation: analysis.analysisEvaluation,
      analysisEvaluationEnabled: analysis.analysisEvaluationEnabled,
      analysisVariationMoves: analysis.analysisVariationMoves,
      analysisEngineView: analysis.analysisEngineView,
      evaluationKey: analysis.analysisEvaluationKeyRef.current,
      gameAnnotations: analysis.gameAnnotations,
      moveAnnotations: analysis.moveAnnotations,
      annotationsDirty: analysis.annotationsDirty,
      annotationsSaving: analysis.annotationsSaving,
      annotationSaveError: analysis.annotationSaveError,
    }}
    actions={{
      selectPositionByPly: analysis.selectAnalysisPositionByPly,
      cancelAnalysisReplay: analysis.cancelAnalysisReplay,
      selectLine: (index) => {
        analysis.setAnalysisSelectedLineIndex(index);
        analysis.setAnalysisLineAnimationIndex(0);
      },
      setDetailsTab: analysis.setAnalysisDetailsTab,
      setEngineView: analysis.setAnalysisEngineView,
      updateGameAnnotation: analysis.updateGameAnnotation,
      persistGameAnnotations: analysis.persistGameAnnotations,
    }}
  />;

  function showMovePreview(event: MouseEvent<HTMLElement>, position: string | undefined) {
    if (position?.length === 64) board.setHoverPreview({ position, x: event.clientX, y: event.clientY });
  }

  return <ChessBoardView
    headerProps={{
      analysisReplayActive: analysis.analysisReplayActive,
      analysisReplayRunning: analysis.isAnalysisReplayRunning,
      analysisReplayFinished: analysis.analysisReplayFinished,
      debugMode: engine.debugMode,
      uciAnalysisLoaded: board.uciAnalysisLoaded,
      terminatingProgram: engine.isTerminatingProgram,
      onCancelAnalysis: () => void analysis.cancelAnalysisReplay(),
      onOpenAnalysis: analysis.openAnalysisSettingsDialog,
      onExportAnalysisPgn: analysis.saveAnalysisPgn,
      onNewGame: lifecycle.openGameSettingsDialog,
      onExportCurrentGame: () => void lifecycle.saveUciGame(),
      onImportNewGame: lifecycle.openUciFilePicker,
      onOpenDatabase: () => engine.setShowChessDatabaseDialog(true),
      onTerminateProgram: () => void lifecycle.terminateProgram(),
      onToggleEngineSettings: () => engine.setShowEngineConfig((previous) => !previous),
      onOpenEngineManager: () => engine.setShowEngineManager(true),
    }}
    movePanelProps={{
      state: {
        moves: board.moves,
        whitePlayerName: analysis.analysisReplayActive
          ? getAnalysisWhitePlayerName(game.clock, analysis.analysisWhitePlayerName)
          : board.uciAnalysisLoaded ? analysis.analysisWhitePlayerName || "White"
            : getDisplayedWhitePlayerName(game.clock, computer.whiteComputerEnabled),
        blackPlayerName: analysis.analysisReplayActive
          ? getAnalysisBlackPlayerName(game.clock, analysis.analysisBlackPlayerName)
          : board.uciAnalysisLoaded ? analysis.analysisBlackPlayerName || "Black"
            : getDisplayedBlackPlayerName(game.clock, computer.blackComputerEnabled),
        whiteActive: !board.uciAnalysisLoaded && game.clock?.sideToMove === "white",
        blackActive: !board.uciAnalysisLoaded && game.clock?.sideToMove === "black",
        selectedPly: analysis.analysisSelectedPosition?.ply ?? null,
        loadingMoves: board.isLoadingMoves,
        computerThinking: computer.isComputerThinking,
        error: board.loadError,
        annotations: analysis.analysisReplayActive ? analysis.moveAnnotations : {},
        storedAnnotations: analysis.gameAnnotations,
      },
      actions: {
        showPreview: showMovePreview,
        movePreview: (event) => board.setHoverPreview((previous) => previous ? { ...previous, x: event.clientX, y: event.clientY } : previous),
        hidePreview: () => { board.setHoverPreview(null); board.setHoverAnnotationText(null); },
        showAnnotationTooltip: board.setHoverAnnotationText,
        hideAnnotationTooltip: () => board.setHoverAnnotationText(null),
        flipBoard: flipBoardOrientation,
        selectPosition: analysis.selectAnalysisPosition,
      },
    }}
    boardProps={{
      pieces: board.pieces, selectedSquare: interaction.selectedSquare, lastMove: board.lastMove,
      possibleTargets: interaction.possibleTargets, dragState: interaction.dragState,
      annotations: analysis.selectedBoardAnnotations, orientation: board.boardOrientation,
      boardContainerRef: interaction.boardContainerRef, onSquareClick: interaction.handleSquareClick,
      onPiecePointerDown: interaction.handlePiecePointerDown, onPiecePointerMove: interaction.handlePiecePointerMove,
      onPiecePointerUp: interaction.handlePiecePointerUp, onPiecePointerCancel: interaction.handlePiecePointerCancel,
    }}
    showEngineManager={engine.showEngineManager} closeEngineManager={() => engine.setShowEngineManager(false)}
    showChessDatabaseDialog={engine.showChessDatabaseDialog} closeChessDatabaseDialog={() => engine.setShowChessDatabaseDialog(false)}
    onDatabaseGameLoaded={lifecycle.applyImportedGame}
    uciFileInputRef={game.uciFileInputRef} onUciFileSelected={lifecycle.handleUciFileSelected}
    analysisReplayActive={analysis.analysisReplayActive} uciAnalysisLoaded={board.uciAnalysisLoaded}
    clock={game.clock} clockError={game.clockError}
    whiteComputerEnabled={computer.whiteComputerEnabled} blackComputerEnabled={computer.blackComputerEnabled}
    toggleWhiteComputer={() => computer.updateWhiteComputerEnabled(!computer.whiteComputerEnabled)}
    toggleBlackComputer={() => computer.updateBlackComputerEnabled(!computer.blackComputerEnabled)}
    engine={{
      showEngineConfig: engine.showEngineConfig, engineConfigOverview: engine.engineConfigOverview,
      engineConfigLoadError: engine.engineConfigLoadError, analysisReplayActive: analysis.analysisReplayActive,
      analysisReplayFinished: analysis.analysisReplayFinished, uciAnalysisLoaded: board.uciAnalysisLoaded,
      engineAutoUpdate: engine.engineAutoUpdate, liveEvaluationBar: engine.liveEvaluationBar,
      analysisEvaluationEnabled: analysis.analysisEvaluationEnabled,
      analysisSelectedPosition: analysis.analysisSelectedPosition, analysisVariationMoves: analysis.analysisVariationMoves,
      analysisEvaluation: analysis.analysisEvaluation, engineEval: engine.engineEval, evalError: engine.evalError,
      isLoadingEval: engine.isLoadingEval, boardOrientation: board.boardOrientation, clock: game.clock, analysisContent,
    }}
    engineActions={{ toggleEngineAutoUpdate: live.toggleEngineAutoUpdate,
      toggleAnalysisEvaluation: analysis.toggleAnalysisEvaluation,
      onEngineConfigOverviewChange: live.handleEngineConfigOverviewChange,
      closeEngineConfig: () => engine.setShowEngineConfig(false) }}
    hoverPreview={board.hoverPreview} hoverAnnotationText={board.hoverAnnotationText}
    dialogs={{
      promotionContext: interaction.promotionContext, showGameSettingsDialog: game.showGameSettingsDialog,
      gameSettings: game.gameSettings, gameSettingsError: game.gameSettingsError,
      isStartingNewGame: game.isStartingNewGame,
      showAnalysisSettingsDialog: analysis.showAnalysisSettingsDialog, analysisSettings: analysis.analysisSettings,
      analysisEngineProfiles: analysis.analysisEngineProfiles, selectedAnalysisProfile: analysis.selectedAnalysisProfile,
      selectedAnalysisEngine: analysis.selectedAnalysisEngine, analysisReplayError: analysis.analysisReplayError,
      isAnalysisReplayRunning: analysis.isAnalysisReplayRunning, showGameEndDialog: game.showGameEndDialog,
      gameEndState: game.gameEndState, clock: game.clock,
    }}
    dialogActions={{
      clearPromotion: () => interaction.setPromotionContext(null), performPromotion: move.performBoardMove,
      setGameSettings: game.setGameSettings, closeGameSettings: () => game.setShowGameSettingsDialog(false),
      startNewGame: lifecycle.startNewGame, setAnalysisSettings: analysis.setAnalysisSettings,
      closeAnalysisSettings: () => analysis.setShowAnalysisSettingsDialog(false),
      startAnalysisReplay: analysis.startAnalysisReplay, saveUciGame: lifecycle.saveUciGame,
      openUciFilePicker: lifecycle.openUciFilePicker, openGameSettingsDialog: lifecycle.openGameSettingsDialog,
      openAnalysisSettingsDialog: analysis.openAnalysisSettingsDialog,
    }}
  />;
}
