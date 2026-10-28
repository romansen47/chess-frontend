import { useState } from "react";
import ChessDatabaseDialog from "../../ChessDatabaseDialog";
import { useI18n } from "../../i18n/I18nProvider";
import { SINGLE_GAME_PGN_INPUT_CLASS } from "../../i18n/singleGamePgnFileBridge";
import { boardThemeCssVariables } from "../settings/boardThemes";
import ChessHeader from "../header/ChessHeader";
import MovePanel from "../game/MovePanel";
import Board from "./Board";
import HoverBoard from "./HoverBoard";
import ClockPanel from "./ClockPanel";
import EnginePanel from "./EnginePanel";
import ChessBoardDialogs from "./ChessBoardDialogs";
import type { ChessBoardViewProps } from "./chessBoardViewTypes";
import "./ResponsiveWorkspace.css";

type MobileWorkspaceTab = "moves" | "engine";

export default function ChessBoardView(props: ChessBoardViewProps) {
  const { t } = useI18n();
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<MobileWorkspaceTab>("moves");

  const {
    headerProps, movePanelProps, boardProps,
    showChessDatabaseDialog, closeChessDatabaseDialog, onDatabaseGameLoaded,
    uciFileInputRef, onUciFileSelected,
    analysisReplayActive, uciAnalysisLoaded, clock, clockError, historicalClock,
    boardTheme,
    whiteComputerEnabled, blackComputerEnabled, toggleWhiteComputer, toggleBlackComputer,
    engine, engineActions,
    hoverBoardProps, dialogs, dialogActions,
  } = props;

  return <>
    <ChessHeader {...headerProps} />
    {showChessDatabaseDialog && <ChessDatabaseDialog onClose={closeChessDatabaseDialog} onGameLoaded={onDatabaseGameLoaded} />}
    <input ref={uciFileInputRef} className={SINGLE_GAME_PGN_INPUT_CLASS} type="file"
      accept=".pgn,.txt,application/x-chess-pgn,text/plain" style={{ display: "none" }}
      onChange={(event) => void onUciFileSelected(event)} />

    <main className="app-main" style={boardThemeCssVariables(boardTheme)}>
      <div
        className={`board-layout${analysisReplayActive ? " board-layout-analysis" : ""}`}
        data-mobile-workspace-tab={mobileWorkspaceTab}
      >
        <MovePanel {...movePanelProps} />
        <section className="board-column">
          <div className="board-wrapper"><Board {...boardProps} /></div>
          {(analysisReplayActive || uciAnalysisLoaded) && historicalClock && (
            <ClockPanel clock={historicalClock} readOnly />
          )}
          {!analysisReplayActive && !uciAnalysisLoaded && (
            <ClockPanel clock={clock} clockError={clockError}
              whiteComputerEnabled={whiteComputerEnabled} blackComputerEnabled={blackComputerEnabled}
              toggleWhiteComputer={toggleWhiteComputer} toggleBlackComputer={toggleBlackComputer} />
          )}
        </section>
        <EnginePanel engine={engine} actions={engineActions} />

        <div className="mobile-workspace-tabs" role="tablist" aria-label={t("analysis.dialogTitle")}>
          <button
            id="mobile-workspace-tab-moves"
            type="button"
            role="tab"
            aria-selected={mobileWorkspaceTab === "moves"}
            className={mobileWorkspaceTab === "moves" ? "active" : ""}
            onClick={() => setMobileWorkspaceTab("moves")}
          >
            {t("moves.title")}
          </button>
          <button
            id="mobile-workspace-tab-engine"
            type="button"
            role="tab"
            aria-selected={mobileWorkspaceTab === "engine"}
            className={mobileWorkspaceTab === "engine" ? "active" : ""}
            onClick={() => setMobileWorkspaceTab("engine")}
          >
            {analysisReplayActive
              ? t("analysis.dialogTitle")
              : t("analysis.evaluationEngine")}
          </button>
        </div>

        <HoverBoard {...hoverBoardProps} />
        <ChessBoardDialogs dialogs={dialogs} actions={dialogActions} />
      </div>
    </main>
  </>;
}
