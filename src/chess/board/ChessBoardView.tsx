import { useEffect, useState } from "react";
import ChessDatabaseDialog from "../../ChessDatabaseDialog";
import { useI18n } from "../../i18n/I18nProvider";
import ChessHeader from "../header/ChessHeader";
import MovePanel from "../game/MovePanel";
import Board from "./Board";
import HoverBoard from "./HoverBoard";
import ClockPanel from "./ClockPanel";
import EnginePanel from "./EnginePanel";
import ChessBoardDialogs from "./ChessBoardDialogs";
import type { ChessBoardViewProps } from "./chessBoardViewTypes";

type MobileAnalysisTab = "moves" | "deep" | "eval";

export default function ChessBoardView(props: ChessBoardViewProps) {
  const { t } = useI18n();
  const [mobileAnalysisTab, setMobileAnalysisTab] = useState<MobileAnalysisTab>("moves");

  const {
    headerProps, movePanelProps, boardProps,
    showChessDatabaseDialog, closeChessDatabaseDialog, onDatabaseGameLoaded,
    uciFileInputRef, onUciFileSelected,
    analysisReplayActive, uciAnalysisLoaded, clock, clockError,
    whiteComputerEnabled, blackComputerEnabled, toggleWhiteComputer, toggleBlackComputer,
    engine, engineActions, mobileDeepAnalysisContent, mobileEvalEngineContent,
    hoverPreview, hoverAnnotationText, dialogs, dialogActions,
  } = props;

  useEffect(() => {
    if (!analysisReplayActive) {
      setMobileAnalysisTab("moves");
    }
  }, [analysisReplayActive]);

  return <>
    <ChessHeader {...headerProps} />
    {showChessDatabaseDialog && <ChessDatabaseDialog onClose={closeChessDatabaseDialog} onGameLoaded={onDatabaseGameLoaded} />}
    <input ref={uciFileInputRef} type="file" accept=".pgn,.txt,application/x-chess-pgn,text/plain"
      style={{ display: "none" }} onChange={(event) => void onUciFileSelected(event)} />

    <main className="app-main">
      <div
        className={`board-layout${analysisReplayActive ? " board-layout-analysis" : ""}`}
        data-mobile-analysis-tab={analysisReplayActive ? mobileAnalysisTab : undefined}
      >
        <MovePanel {...movePanelProps} />
        <section className="board-column">
          <div className="board-wrapper"><Board {...boardProps} /></div>
          {!analysisReplayActive && !uciAnalysisLoaded && (
            <ClockPanel clock={clock} clockError={clockError}
              whiteComputerEnabled={whiteComputerEnabled} blackComputerEnabled={blackComputerEnabled}
              toggleWhiteComputer={toggleWhiteComputer} toggleBlackComputer={toggleBlackComputer} />
          )}
        </section>
        <EnginePanel engine={engine} actions={engineActions} />

        {analysisReplayActive && (
          <>
            <div className="mobile-analysis-tabs" role="tablist" aria-label={t("analysis.dialogTitle")}>
              <button
                type="button"
                role="tab"
                aria-selected={mobileAnalysisTab === "moves"}
                className={mobileAnalysisTab === "moves" ? "active" : ""}
                onClick={() => setMobileAnalysisTab("moves")}
              >
                {t("moves.title")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileAnalysisTab === "deep"}
                className={mobileAnalysisTab === "deep" ? "active" : ""}
                onClick={() => setMobileAnalysisTab("deep")}
              >
                {t("settings.deepAnalysis")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mobileAnalysisTab === "eval"}
                className={mobileAnalysisTab === "eval" ? "active" : ""}
                onClick={() => setMobileAnalysisTab("eval")}
              >
                {t("analysis.evaluationEngine")}
              </button>
            </div>

            <section className="mobile-analysis-pane mobile-analysis-deep">
              {mobileDeepAnalysisContent}
            </section>
            <section className="mobile-analysis-pane mobile-analysis-eval">
              {mobileEvalEngineContent}
            </section>
          </>
        )}

        <HoverBoard preview={hoverPreview} annotationText={hoverAnnotationText} orientation={engine.boardOrientation} />
        <ChessBoardDialogs dialogs={dialogs} actions={dialogActions} />
      </div>
    </main>
  </>;
}
