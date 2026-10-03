import {
  buildAnalysisBoardArrows,
  buildAnalysisMoveHighlightSquares,
} from "../analysis/analysisBoardArrows";
import { historicalClock } from "../analysis/historicalClock";
import type { MouseEvent } from "react";
import AnalysisEngineDetails from "../analysis/AnalysisEngineDetails";
import AnalysisProfileContent from "../analysis/AnalysisProfileContent";
import AnalysisReplayContent from "../analysis/AnalysisReplayContent";
import LiveEvaluationView from "../analysis/LiveEvaluationView";
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
import type { UiPreferencesController } from "../settings/useUiPreferences";

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
  uiPreferences: UiPreferencesController;
  flipBoardOrientation: () => void;
}

export default function ChessBoardContainer({
  board, engine, game, analysis, interaction, live, move, lifecycle, computer, uiPreferences, flipBoardOrientation,
}: Props) {
  const analysisViewState = {
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
  };

  const analysisViewActions = {
    selectPositionByPly: analysis.selectAnalysisPositionByPly,
    cancelAnalysisReplay: analysis.cancelAnalysisReplay,
    selectLine: (index: number) => {
      analysis.setAnalysisSelectedLineIndex(index);
      analysis.setAnalysisLineAnimationIndex(0);
    },
    setDetailsTab: analysis.setAnalysisDetailsTab,
    setEngineView: analysis.setAnalysisEngineView,
    updateGameAnnotation: analysis.updateGameAnnotation,
    persistGameAnnotations: analysis.persistGameAnnotations,
  };

  const analysisBoardDecorationOptions = {
    analysisReplayActive: analysis.analysisReplayActive,
    selectedPly: analysis.analysisSelectedPosition?.ply,
    analysisProfile: analysis.analysisProfile,
    variationMoveCount: analysis.analysisVariationMoves.length,
    lastMove: board.lastMove,
    liveEvaluationEnabled: analysis.analysisEvaluationEnabled,
    liveEvaluation: analysis.analysisEvaluation,
    showEvaluationArrows: uiPreferences.preferences.showAnalysisEvaluationArrows,
    maxEvaluationArrows: uiPreferences.preferences.analysisEvaluationArrowCount,
  };
  const mainBoardArrows = buildAnalysisBoardArrows(analysisBoardDecorationOptions);
  const mainBoardMoveHighlights = buildAnalysisMoveHighlightSquares(
    analysisBoardDecorationOptions,
  );

  const analysisContent = (
    <AnalysisReplayContent
      state={analysisViewState}
      actions={analysisViewActions}
    />
  );

  const mobileDeepAnalysisState = {
    ...analysisViewState,
    analysisDetailsTab: "engine" as const,
  };

  const mobileDeepAnalysisContent = analysis.analysisReplayActive
    ? (
        <AnalysisProfileContent
          state={analysisViewState}
          actions={analysisViewActions}
        >
          <AnalysisEngineDetails
            state={mobileDeepAnalysisState}
            actions={analysisViewActions}
          />
        </AnalysisProfileContent>
      )
    : null;

  const mobileEvalEngineContent = analysis.analysisReplayActive
    ? (
        <LiveEvaluationView
          evaluation={analysis.analysisEvaluationEnabled ? analysis.analysisEvaluation : null}
          evaluationKey={analysis.analysisEvaluationKeyRef.current}
          activePly={analysis.analysisSelectedPosition?.ply ?? null}
          variationMode={analysis.analysisVariationMoves.length > 0}
          deepAnalysisRunning={analysis.isAnalysisReplayRunning}
          orientation={board.boardOrientation}
        />
      )
    : null;

  function showMovePreview(
    event: MouseEvent<HTMLElement>,
    position: string | undefined,
    ply: number,
    san: string | undefined,
  ) {
    if (position?.length !== 64) return;
    board.setHoverPreview((previous) => previous?.pinned ? previous : {
      position,
      x: event.clientX,
      y: event.clientY,
      ply,
      san: san ?? null,
      pinned: false,
    });
  }

  function pinMovePreview(
    event: MouseEvent<HTMLElement>,
    position: string | undefined,
    ply: number,
    san: string | undefined,
  ) {
    if (
      position?.length !== 64
      || window.matchMedia("(max-width: 820px)").matches
    ) return;
    board.setHoverPreview({
      position,
      x: event.clientX,
      y: event.clientY,
      ply,
      san: san ?? null,
      pinned: true,
    });
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
      onToggleSettings: () => engine.setShowSettings((previous) => !previous),
    }}
    movePanelProps={{
      state: {
        moves: board.moves,
        whitePlayerName: analysis.analysisReplayActive
          ? getAnalysisWhitePlayerName(game.clock, analysis.analysisWhitePlayerName)
          : board.uciAnalysisLoaded ? analysis.analysisWhitePlayerName || "White"
            : getDisplayedWhitePlayerName(
                game.clock,
                computer.whiteComputerEnabled,
                engine.engineConfigOverview,
                engine.engineRuntimeAssignments,
              ),
        blackPlayerName: analysis.analysisReplayActive
          ? getAnalysisBlackPlayerName(game.clock, analysis.analysisBlackPlayerName)
          : board.uciAnalysisLoaded ? analysis.analysisBlackPlayerName || "Black"
            : getDisplayedBlackPlayerName(
                game.clock,
                computer.blackComputerEnabled,
                engine.engineConfigOverview,
                engine.engineRuntimeAssignments,
              ),
        whiteActive: !board.uciAnalysisLoaded && game.clock?.sideToMove === "white",
        blackActive: !board.uciAnalysisLoaded && game.clock?.sideToMove === "black",
        selectedPly: analysis.analysisSelectedPosition?.ply ?? null,
        loadingMoves: board.isLoadingMoves,
        computerThinking: computer.isComputerThinking,
        error: board.loadError,
        debugMode: engine.debugMode,
        annotations: analysis.analysisReplayActive ? analysis.moveAnnotations : {},
        storedAnnotations: analysis.gameAnnotations,
        annotationsDirty: analysis.annotationsDirty,
        annotationsSaving: analysis.annotationsSaving,
        annotationSaveError: analysis.annotationSaveError,
        annotationEditingEnabled: analysis.analysisReplayActive,
      },
      actions: {
        showPreview: showMovePreview,
        pinPreview: pinMovePreview,
        movePreview: (event) => board.setHoverPreview((previous) =>
          previous && !previous.pinned
            ? { ...previous, x: event.clientX, y: event.clientY }
            : previous),
        hidePreview: () => {
          board.setHoverPreview((previous) => previous?.pinned ? previous : null);
          board.setHoverAnnotationText(null);
        },
        showAnnotationTooltip: board.setHoverAnnotationText,
        hideAnnotationTooltip: () => board.setHoverAnnotationText(null),
        flipBoard: flipBoardOrientation,
        selectPosition: analysis.selectAnalysisPosition,
        updateGameAnnotation: analysis.updateGameAnnotation,
        persistGameAnnotations: analysis.persistGameAnnotations,
      },
    }}
    boardProps={{
      pieces: board.pieces, selectedSquare: interaction.selectedSquare, lastMove: board.lastMove,
      possibleTargets: interaction.possibleTargets, dragState: interaction.dragState,
      annotations: uiPreferences.preferences.showMoveAnnotationsOnBoard
        ? analysis.selectedBoardAnnotations
        : [],
      arrows: mainBoardArrows,
      moveHighlightSquares: mainBoardMoveHighlights,
      showCoordinates: uiPreferences.preferences.showBoardCoordinates,
      orientation: board.boardOrientation,
      boardContainerRef: interaction.boardContainerRef, onSquareClick: interaction.handleSquareClick,
      onPiecePointerDown: interaction.handlePiecePointerDown, onPiecePointerMove: interaction.handlePiecePointerMove,
      onPiecePointerUp: interaction.handlePiecePointerUp, onPiecePointerCancel: interaction.handlePiecePointerCancel,
    }}
    showChessDatabaseDialog={engine.showChessDatabaseDialog} closeChessDatabaseDialog={() => engine.setShowChessDatabaseDialog(false)}
    onDatabaseGameLoaded={lifecycle.applyImportedGame}
    uciFileInputRef={game.uciFileInputRef} onUciFileSelected={lifecycle.handleUciFileSelected}
    analysisReplayActive={analysis.analysisReplayActive} uciAnalysisLoaded={board.uciAnalysisLoaded}
    clock={game.clock} clockError={game.clockError}
    historicalClock={historicalClock(analysis.gameAnnotations,
      analysis.analysisSelectedPosition?.ply ?? null, analysis.analysisVariationMoves.length)}
    whiteComputerEnabled={computer.whiteComputerEnabled} blackComputerEnabled={computer.blackComputerEnabled}
    toggleWhiteComputer={() => computer.updateWhiteComputerEnabled(!computer.whiteComputerEnabled)}
    toggleBlackComputer={() => computer.updateBlackComputerEnabled(!computer.blackComputerEnabled)}
    engine={{
      showSettings: engine.showSettings, engineConfigOverview: engine.engineConfigOverview,
      engineConfigLoadError: engine.engineConfigLoadError, analysisReplayActive: analysis.analysisReplayActive,
      analysisReplayFinished: analysis.analysisReplayFinished, uciAnalysisLoaded: board.uciAnalysisLoaded,
      engineAutoUpdate: engine.engineAutoUpdate, liveEvaluationBar: engine.liveEvaluationBar,
      analysisEvaluationEnabled: analysis.analysisEvaluationEnabled,
      analysisSelectedPosition: analysis.analysisSelectedPosition, analysisVariationMoves: analysis.analysisVariationMoves,
      analysisEvaluation: analysis.analysisEvaluation, engineEval: engine.engineEval, evalError: engine.evalError,
      isLoadingEval: engine.isLoadingEval, boardOrientation: board.boardOrientation, clock: game.clock, analysisContent,
      uiPreferences: uiPreferences.preferences,
    }}
    engineActions={{ toggleEngineAutoUpdate: live.toggleEngineAutoUpdate,
      toggleAnalysisEvaluation: analysis.toggleAnalysisEvaluation,
      onEngineConfigOverviewChange: live.handleEngineConfigOverviewChange,
      updateUiPreferences: uiPreferences.updatePreferences,
      closeSettings: () => engine.setShowSettings(false) }}
    mobileDeepAnalysisContent={mobileDeepAnalysisContent}
    mobileEvalEngineContent={mobileEvalEngineContent}
    hoverBoardProps={{
      preview: board.hoverPreview,
      annotationText: board.hoverAnnotationText,
      orientation: board.boardOrientation,
      storedAnnotations: analysis.gameAnnotations,
      catAnnotations: analysis.moveAnnotations,
      dirty: analysis.annotationsDirty,
      saving: analysis.annotationsSaving,
      error: analysis.annotationSaveError,
      editingEnabled: analysis.analysisReplayActive,
      onChange: analysis.updateGameAnnotation,
      onClose: () => {
        board.setHoverPreview(null);
        board.setHoverAnnotationText(null);
      },
    }}
    dialogs={{
      promotionContext: interaction.promotionContext, showGameSettingsDialog: game.showGameSettingsDialog,
      gameSettings: game.gameSettings, gameSettingsError: game.gameSettingsError,
      isStartingNewGame: game.isStartingNewGame,
      showAnalysisSettingsDialog: analysis.showAnalysisSettingsDialog, analysisSettings: analysis.analysisSettings,
      analysisEngineProfiles: analysis.analysisEngineProfiles,
      analysisEngines: engine.engineConfigOverview?.engines ?? [],
      selectedAnalysisProfile: analysis.selectedAnalysisProfile,
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
