import { useI18n } from "../../i18n/I18nProvider";
import AnalysisSettingsDialog from "../analysis/AnalysisSettingsDialog";
import NewGameDialog from "../game/NewGameDialog";
import type { ClockState } from "../types";
import type { DialogActions, DialogState } from "./chessBoardViewTypes";

const PROMOTION_TYPES = ["queen", "rook", "bishop", "knight"] as const;

interface Props { dialogs: DialogState; actions: DialogActions; }

export default function ChessBoardDialogs({ dialogs, actions }: Props) {
  const { t } = useI18n();

  function localizedGameState(gameState: string | null | undefined, currentClock?: ClockState | null): string {
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

  return <>
    {dialogs.promotionContext && <div className="promotion-dialog">
      <div className="promotion-dialog-content">
        <p>{t("game.promotionPrompt", {
          color: dialogs.promotionContext.color === "white" ? t("common.white") : t("common.black"),
          from: dialogs.promotionContext.from,
          to: dialogs.promotionContext.to,
        })}</p>
        <div className="promotion-options">
          {PROMOTION_TYPES.map((pieceType) => {
            const pieceLabel = {
              queen: t("game.pieceQueen"), rook: t("game.pieceRook"),
              bishop: t("game.pieceBishop"), knight: t("game.pieceKnight"),
            }[pieceType];
            return <button key={pieceType}
              className={`promotion-button promotion-button-${dialogs.promotionContext?.color}`}
              onClick={async () => {
                const context = dialogs.promotionContext;
                if (!context) return;
                actions.clearPromotion();
                await actions.performPromotion(context.from, context.to, pieceType);
              }}>{pieceLabel}</button>;
          })}
        </div>
        <button className="promotion-cancel-button" onClick={actions.clearPromotion}>{t("common.cancel")}</button>
      </div>
    </div>}

    {dialogs.showGameSettingsDialog && <NewGameDialog
      settings={dialogs.gameSettings} error={dialogs.gameSettingsError} starting={dialogs.isStartingNewGame}
      onSettingsChange={actions.setGameSettings} onCancel={actions.closeGameSettings} onStart={actions.startNewGame} />}

    {dialogs.showAnalysisSettingsDialog && <AnalysisSettingsDialog
      settings={dialogs.analysisSettings} profiles={dialogs.analysisEngineProfiles}
      selectedProfile={dialogs.selectedAnalysisProfile} selectedEngine={dialogs.selectedAnalysisEngine}
      error={dialogs.analysisReplayError} running={dialogs.isAnalysisReplayRunning}
      onSettingsChange={actions.setAnalysisSettings} onCancel={actions.closeAnalysisSettings}
      onStart={() => void actions.startAnalysisReplay()} />}

    {dialogs.showGameEndDialog && dialogs.gameEndState && <div className="game-end-dialog">
      <div className="game-end-dialog-content">
        <h2>{t("game.gameOver")}</h2>
        <p>{localizedGameState(dialogs.gameEndState, dialogs.clock)}</p>
        <div className="game-end-dialog-actions">
          <button className="game-end-dialog-button" onClick={() => void actions.saveUciGame()}>{t("game.savePgn")}</button>
          <button className="game-end-dialog-button" onClick={actions.openUciFilePicker}>{t("game.loadPgn")}</button>
          <button className="game-end-dialog-button" onClick={actions.openGameSettingsDialog}>{t("game.newGame")}</button>
          <button className="game-end-dialog-button" onClick={actions.openAnalysisSettingsDialog}>{t("analysis.analyze")}</button>
        </div>
      </div>
    </div>}
  </>;
}
