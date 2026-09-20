import ChessDatabaseDialog from "../../ChessDatabaseDialog";
import ChessHeader from "../header/ChessHeader";
import MovePanel from "../game/MovePanel";
import Board from "./Board";
import HoverBoard from "./HoverBoard";
import ClockPanel from "./ClockPanel";
import EnginePanel from "./EnginePanel";
import ChessBoardDialogs from "./ChessBoardDialogs";
import type { ChessBoardViewProps } from "./chessBoardViewTypes";

export default function ChessBoardView(props: ChessBoardViewProps) {
  const {
    headerProps, movePanelProps, boardProps,
    showChessDatabaseDialog, closeChessDatabaseDialog, onDatabaseGameLoaded,
    uciFileInputRef, onUciFileSelected,
    analysisReplayActive, uciAnalysisLoaded, clock, clockError,
    whiteComputerEnabled, blackComputerEnabled, toggleWhiteComputer, toggleBlackComputer,
    engine, engineActions, mobileAnalysisProfileContent,
    hoverPreview, hoverAnnotationText, dialogs, dialogActions,
  } = props;

  return <>
    <ChessHeader {...headerProps} />
    {showChessDatabaseDialog && <ChessDatabaseDialog onClose={closeChessDatabaseDialog} onGameLoaded={onDatabaseGameLoaded} />}
    <input ref={uciFileInputRef} type="file" accept=".pgn,.txt,application/x-chess-pgn,text/plain"
      style={{ display: "none" }} onChange={(event) => void onUciFileSelected(event)} />

    <main className="app-main">
      <div className="board-layout">
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
        {mobileAnalysisProfileContent && (
          <section className="mobile-analysis-profile">
            {mobileAnalysisProfileContent}
          </section>
        )}
        <HoverBoard preview={hoverPreview} annotationText={hoverAnnotationText} orientation={engine.boardOrientation} />
        <ChessBoardDialogs dialogs={dialogs} actions={dialogActions} />
      </div>
    </main>
  </>;
}
