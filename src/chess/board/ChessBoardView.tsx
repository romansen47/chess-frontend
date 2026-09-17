import type { ChangeEvent, ComponentProps, ReactNode, RefObject } from "react";
import ChessDatabaseDialog from "../../ChessDatabaseDialog";
import EngineConfigManager from "../../EngineConfigManager";
import EngineManager from "../../EngineManager";
import type { EngineConfigOverview } from "../../engineConfig";
import { useI18n } from "../../i18n/I18nProvider";
import type {
  AnalysisPositionSelection,
  AnalysisReplaySettings,
  ClockState,
  EngineEvaluation,
  GameSettings,
  HoverPreview,
  PieceType,
  PromotionContext,
} from "../types";
import AnalysisSettingsDialog from "../analysis/AnalysisSettingsDialog";
import { formatEngineLineScore } from "../engine/engineEvaluationUtils";
import NewGameDialog from "../game/NewGameDialog";
import MovePanel from "../game/MovePanel";
import { formatClockTime } from "../game/gameFormatters";
import ChessHeader from "../header/ChessHeader";
import Board from "./Board";
import type { BoardOrientation } from "./boardOrientation";
import HoverBoard from "./HoverBoard";

interface EnginePanelState {
  showEngineConfig: boolean;
  engineConfigOverview: EngineConfigOverview | null;
  engineConfigLoadError: string | null;
  analysisReplayActive: boolean;
  analysisReplayFinished: boolean;
  uciAnalysisLoaded: boolean;
  engineAutoUpdate: boolean;
  liveEvaluationBar: number | null;
  analysisEvaluationEnabled: boolean;
  analysisSelectedPosition: AnalysisPositionSelection | null;
  analysisVariationMoves: string[];
  analysisEvaluation: EngineEvaluation | null;
  engineEval: EngineEvaluation | null;
  evalError: string | null;
  isLoadingEval: boolean;
  boardOrientation: BoardOrientation;
  clock: ClockState | null;
  analysisContent: ReactNode;
}

interface EnginePanelActions {
  toggleEngineAutoUpdate: () => void;
  toggleAnalysisEvaluation: () => void;
  onEngineConfigOverviewChange: (data: EngineConfigOverview) => void;
  closeEngineConfig: () => void;
}

interface DialogState {
  promotionContext: PromotionContext | null;
  showGameSettingsDialog: boolean;
  gameSettings: GameSettings;
  gameSettingsError: string | null;
  isStartingNewGame: boolean;
  showAnalysisSettingsDialog: boolean;
  analysisSettings: AnalysisReplaySettings;
  analysisEngineProfiles: ComponentProps<typeof AnalysisSettingsDialog>["profiles"];
  selectedAnalysisProfile: ComponentProps<typeof AnalysisSettingsDialog>["selectedProfile"];
  selectedAnalysisEngine: ComponentProps<typeof AnalysisSettingsDialog>["selectedEngine"];
  analysisReplayError: string | null;
  isAnalysisReplayRunning: boolean;
  showGameEndDialog: boolean;
  gameEndState: string | null;
  clock: ClockState | null;
}

interface DialogActions {
  clearPromotion: () => void;
  performPromotion: (from: string, to: string, pieceType: PieceType) => Promise<void>;
  setGameSettings: ComponentProps<typeof NewGameDialog>["onSettingsChange"];
  closeGameSettings: () => void;
  startNewGame: ComponentProps<typeof NewGameDialog>["onStart"];
  setAnalysisSettings: ComponentProps<typeof AnalysisSettingsDialog>["onSettingsChange"];
  closeAnalysisSettings: () => void;
  startAnalysisReplay: () => void | Promise<void>;
  saveUciGame: () => void | Promise<void>;
  openUciFilePicker: () => void;
  openGameSettingsDialog: () => void;
  openAnalysisSettingsDialog: () => void;
}

interface ChessBoardViewProps {
  headerProps: ComponentProps<typeof ChessHeader>;
  movePanelProps: ComponentProps<typeof MovePanel>;
  boardProps: ComponentProps<typeof Board>;
  showEngineManager: boolean;
  closeEngineManager: () => void;
  showChessDatabaseDialog: boolean;
  closeChessDatabaseDialog: () => void;
  onDatabaseGameLoaded: ComponentProps<typeof ChessDatabaseDialog>["onGameLoaded"];
  uciFileInputRef: RefObject<HTMLInputElement | null>;
  onUciFileSelected: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  analysisReplayActive: boolean;
  uciAnalysisLoaded: boolean;
  clock: ClockState | null;
  clockError: string | null;
  whiteComputerEnabled: boolean;
  blackComputerEnabled: boolean;
  toggleWhiteComputer: () => void;
  toggleBlackComputer: () => void;
  engine: EnginePanelState;
  engineActions: EnginePanelActions;
  hoverPreview: HoverPreview | null;
  hoverAnnotationText: string | null;
  dialogs: DialogState;
  dialogActions: DialogActions;
}

export default function ChessBoardView({
  headerProps,
  movePanelProps,
  boardProps,
  showEngineManager,
  closeEngineManager,
  showChessDatabaseDialog,
  closeChessDatabaseDialog,
  onDatabaseGameLoaded,
  uciFileInputRef,
  onUciFileSelected,
  analysisReplayActive,
  uciAnalysisLoaded,
  clock,
  clockError,
  whiteComputerEnabled,
  blackComputerEnabled,
  toggleWhiteComputer,
  toggleBlackComputer,
  engine,
  engineActions,
  hoverPreview,
  hoverAnnotationText,
  dialogs,
  dialogActions,
}: ChessBoardViewProps) {
  const { t } = useI18n();

  function localizedGameState(
    gameState: string | null | undefined,
    currentClock?: ClockState | null
  ): string {
    if (gameState === "LOST_ON_TIME") {
      if (currentClock?.whiteTime === 0 && currentClock.blackTime > 0) return t("game.blackWinsWhiteTime");
      if (currentClock?.blackTime === 0 && currentClock.whiteTime > 0) return t("game.whiteWinsBlackTime");
      if (currentClock?.sideToMove === "white") return t("game.blackWinsWhiteTime");
      if (currentClock?.sideToMove === "black") return t("game.whiteWinsBlackTime");
      return t("game.endedOnTime");
    }

    switch (gameState) {
      case "WHITE_MATED": return t("game.blackWinsCheckmate");
      case "BLACK_MATED": return t("game.whiteWinsCheckmate");
      case "STALEMATE": return t("game.stalemate");
      case "WHITE_RESIGNED": return t("game.blackWinsWhiteResigned");
      case "BLACK_RESIGNED": return t("game.whiteWinsBlackResigned");
      case "DRAW_BY_50_MOVES_RULE": return t("game.drawFifty");
      case "DRAW_BY_THREEFOLD_REPETITION": return t("game.drawThreefold");
      case "DRAW_BY_INSUFFICIENT_MATERIAL": return t("game.drawInsufficient");
      default: return gameState ? t("game.endedState", { state: gameState }) : t("game.ended");
    }
  }

  return (
    <>
      <ChessHeader {...headerProps} />

      {showEngineManager && <EngineManager onClose={closeEngineManager} />}
      {showChessDatabaseDialog && (
        <ChessDatabaseDialog
          onClose={closeChessDatabaseDialog}
          onGameLoaded={onDatabaseGameLoaded}
        />
      )}
      <input
        ref={uciFileInputRef}
        type="file"
        accept=".pgn,.txt,application/x-chess-pgn,text/plain"
        style={{ display: "none" }}
        onChange={(event) => void onUciFileSelected(event)}
      />

      <main className="app-main">
        <div className="board-layout">
          <MovePanel {...movePanelProps} />

          <section className="board-column">
            <div className="board-wrapper">
              <Board {...boardProps} />
            </div>
            {!analysisReplayActive && !uciAnalysisLoaded && (
              <div className="clock-area">
                <button
                  type="button"
                  className={[
                    "clock-box",
                    clock?.sideToMove === "white" ? "clock-active" : "",
                    clock?.whiteRunning ? "clock-running" : "",
                    whiteComputerEnabled ? "clock-computer-enabled" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={toggleWhiteComputer}
                  aria-pressed={whiteComputerEnabled}
                  title={whiteComputerEnabled
                    ? t("game.disableWhiteEngine")
                    : t("game.enableWhiteEngine")}
                >
                  <div className="clock-time">{formatClockTime(clock?.whiteTime)}</div>
                </button>
                <button
                  type="button"
                  className={[
                    "clock-box",
                    clock?.sideToMove === "black" ? "clock-active" : "",
                    clock?.blackRunning ? "clock-running" : "",
                    blackComputerEnabled ? "clock-computer-enabled" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={toggleBlackComputer}
                  aria-pressed={blackComputerEnabled}
                  title={blackComputerEnabled
                    ? t("game.disableBlackEngine")
                    : t("game.enableBlackEngine")}
                >
                  <div className="clock-time">{formatClockTime(clock?.blackTime)}</div>
                </button>
                {clockError && <div className="clock-error">{clockError}</div>}
              </div>
            )}
          </section>

          <section className="engine-panel">
            <div className="engine-panel-main">
              {!engine.analysisReplayActive && !engine.uciAnalysisLoaded && (
                <button
                  type="button"
                  className={[
                    "engine-bar-wrapper",
                    engine.engineAutoUpdate
                      ? "engine-bar-enabled"
                      : "engine-bar-disabled",
                    engine.boardOrientation === "black"
                      ? "engine-bar-black-bottom"
                      : "",
                  ].filter(Boolean).join(" ")}
                  onClick={engineActions.toggleEngineAutoUpdate}
                  aria-pressed={engine.engineAutoUpdate}
                  aria-label={engine.engineAutoUpdate
                    ? t("game.disableEvaluationEngine")
                    : t("game.enableEvaluationEngine")}
                  title={engine.engineAutoUpdate
                    ? t("game.disableEvaluationEngine")
                    : `${t("game.enableEvaluationEngine")} · 0.0`}
                >
                  <div
                    className="engine-bar-white"
                    style={{
                      height: `${(engine.engineAutoUpdate && engine.liveEvaluationBar != null
                        ? engine.liveEvaluationBar
                        : 0.5) * 100}%`,
                    }}
                  />
                  <div
                    className="engine-bar-black"
                    style={{
                      height: `${(1 - (engine.engineAutoUpdate && engine.liveEvaluationBar != null
                        ? engine.liveEvaluationBar
                        : 0.5)) * 100}%`,
                    }}
                  />
                </button>
              )}

              {engine.analysisReplayActive && engine.analysisReplayFinished && (
                <button
                  type="button"
                  className={[
                    "engine-bar-wrapper",
                    engine.analysisEvaluationEnabled
                      ? "engine-bar-enabled"
                      : "engine-bar-disabled",
                    engine.boardOrientation === "black"
                      ? "engine-bar-black-bottom"
                      : "",
                  ].filter(Boolean).join(" ")}
                  onClick={engineActions.toggleAnalysisEvaluation}
                  aria-pressed={engine.analysisEvaluationEnabled}
                  disabled={!engine.analysisSelectedPosition}
                  aria-label={engine.analysisEvaluationEnabled
                    ? t("game.disableAnalysisEvaluation")
                    : t("game.enableAnalysisEvaluation")}
                  title={!engine.analysisSelectedPosition
                    ? t("game.selectMoveEvaluation")
                    : engine.analysisEvaluationEnabled
                      ? t("game.disableEvaluationEngine")
                      : engine.analysisVariationMoves.length > 0
                        ? t("game.enableEvaluationVariation")
                        : t("game.enableEvaluationSelectedMove")}
                >
                  <div
                    className="engine-bar-white"
                    style={{
                      height: `${(engine.analysisEvaluationEnabled && engine.analysisEvaluation
                        ? engine.analysisEvaluation.bar
                        : 0.5) * 100}%`,
                    }}
                  />
                  <div
                    className="engine-bar-black"
                    style={{
                      height: `${(1 - (engine.analysisEvaluationEnabled && engine.analysisEvaluation
                        ? engine.analysisEvaluation.bar
                        : 0.5)) * 100}%`,
                    }}
                  />
                </button>
              )}

              <div className="engine-content-column">
                {engine.showEngineConfig && (
                  <>
                    <EngineConfigManager
                      overview={engine.engineConfigOverview}
                      onOverviewChange={engineActions.onEngineConfigOverviewChange}
                      onClose={engineActions.closeEngineConfig}
                    />
                    {engine.engineConfigLoadError && (
                      <div className="engine-error">{engine.engineConfigLoadError}</div>
                    )}
                  </>
                )}

                {engine.analysisReplayActive ? engine.analysisContent
                  : engine.uciAnalysisLoaded ? (
                    <div className="engine-placeholder-text">
                      {t("analysis.analyzeTitle")}
                    </div>
                  ) : (
                    <>
                      {engine.evalError && (
                        <div className="engine-error">
                          {t("common.error")}: {engine.evalError}
                        </div>
                      )}
                      {engine.engineAutoUpdate && engine.engineEval && !engine.clock?.gameState && (
                        <div className="engine-lines">
                          {engine.engineEval.lines.length > 0 && (
                            <div className="engine-lines-summary">
                              <span>
                                {engine.engineEval.engineName || t("analysis.evaluationEngine")}
                              </span>
                              <span>
                                {t("analysis.searchDepth", {
                                  depth: engine.engineEval.lines[0].depth,
                                })}
                              </span>
                            </div>
                          )}
                          {engine.engineEval.lines.length === 0 && (
                            <div className="engine-empty">{t("analysis.noEngineLines")}</div>
                          )}
                          {engine.engineEval.lines.map((line, index) => (
                            <div key={index} className="engine-line">
                              <div className="engine-line-header">
                                #{index + 1} · {formatEngineLineScore(line)}
                              </div>
                              <div className="engine-line-moves">{line.moves}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {engine.engineAutoUpdate
                        && !engine.engineEval
                        && !engine.isLoadingEval
                        && !engine.evalError
                        && !engine.clock?.gameState && (
                          <div className="engine-placeholder-text">
                            {t("analysis.engineOutputPlaceholder")}
                          </div>
                        )}
                    </>
                  )}
              </div>
            </div>
          </section>

          <HoverBoard
            preview={hoverPreview}
            annotationText={hoverAnnotationText}
            orientation={engine.boardOrientation}
          />

          {dialogs.promotionContext && (
            <div className="promotion-dialog">
              <div className="promotion-dialog-content">
                <p>
                  {t("game.promotionPrompt", {
                    color: dialogs.promotionContext.color === "white"
                      ? t("common.white")
                      : t("common.black"),
                    from: dialogs.promotionContext.from,
                    to: dialogs.promotionContext.to,
                  })}
                </p>
                <div className="promotion-options">
                  {(["queen", "rook", "bishop", "knight"] as PieceType[]).map((pieceType) => {
                    const pieceLabel = {
                      queen: t("game.pieceQueen"),
                      rook: t("game.pieceRook"),
                      bishop: t("game.pieceBishop"),
                      knight: t("game.pieceKnight"),
                    }[pieceType];
                    return (
                      <button
                        key={pieceType}
                        className={`promotion-button promotion-button-${dialogs.promotionContext?.color}`}
                        onClick={async () => {
                          const context = dialogs.promotionContext;
                          if (!context) return;
                          dialogActions.clearPromotion();
                          await dialogActions.performPromotion(
                            context.from,
                            context.to,
                            pieceType
                          );
                        }}
                      >
                        {pieceLabel}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="promotion-cancel-button"
                  onClick={dialogActions.clearPromotion}
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          )}

          {dialogs.showGameSettingsDialog && (
            <NewGameDialog
              settings={dialogs.gameSettings}
              error={dialogs.gameSettingsError}
              starting={dialogs.isStartingNewGame}
              onSettingsChange={dialogActions.setGameSettings}
              onCancel={dialogActions.closeGameSettings}
              onStart={dialogActions.startNewGame}
            />
          )}

          {dialogs.showAnalysisSettingsDialog && (
            <AnalysisSettingsDialog
              settings={dialogs.analysisSettings}
              profiles={dialogs.analysisEngineProfiles}
              selectedProfile={dialogs.selectedAnalysisProfile}
              selectedEngine={dialogs.selectedAnalysisEngine}
              error={dialogs.analysisReplayError}
              running={dialogs.isAnalysisReplayRunning}
              onSettingsChange={dialogActions.setAnalysisSettings}
              onCancel={dialogActions.closeAnalysisSettings}
              onStart={() => void dialogActions.startAnalysisReplay()}
            />
          )}

          {dialogs.showGameEndDialog && dialogs.gameEndState && (
            <div className="game-end-dialog">
              <div className="game-end-dialog-content">
                <h2>{t("game.gameOver")}</h2>
                <p>{localizedGameState(dialogs.gameEndState, dialogs.clock)}</p>
                <div className="game-end-dialog-actions">
                  <button
                    className="game-end-dialog-button"
                    onClick={() => void dialogActions.saveUciGame()}
                  >
                    {t("game.savePgn")}
                  </button>
                  <button
                    className="game-end-dialog-button"
                    onClick={dialogActions.openUciFilePicker}
                  >
                    {t("game.loadPgn")}
                  </button>
                  <button
                    className="game-end-dialog-button"
                    onClick={dialogActions.openGameSettingsDialog}
                  >
                    {t("game.newGame")}
                  </button>
                  <button
                    className="game-end-dialog-button"
                    onClick={dialogActions.openAnalysisSettingsDialog}
                  >
                    {t("analysis.analyze")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
