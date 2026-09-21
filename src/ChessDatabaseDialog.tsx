import { useRef, useState, type ChangeEvent } from "react";
import ChessDatabaseImportView from "./chess/database/ChessDatabaseImportView";
import ChessDatabaseOverviewView from "./chess/database/ChessDatabaseOverviewView";
import ChessDatabaseSearchView from "./chess/database/ChessDatabaseSearchView";
import type { ChessDatabaseLoadedGame } from "./chess/database/chessDatabaseTypes";
import { useChessDatabaseImport } from "./chess/database/useChessDatabaseImport";
import { useChessDatabaseSearch } from "./chess/database/useChessDatabaseSearch";
import { useChessDatabaseStatus } from "./chess/database/useChessDatabaseStatus";
import "./ChessDatabaseDialog.css";

export type { ChessDatabaseLoadedGame };

interface ChessDatabaseDialogProps {
  onClose: () => void;
  onGameLoaded: (game: ChessDatabaseLoadedGame) => void | Promise<void>;
}

type DialogView = "overview" | "search" | "import";

export default function ChessDatabaseDialog({
  onClose,
  onGameLoaded,
}: ChessDatabaseDialogProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [view, setView] = useState<DialogView>("overview");

  const statusController = useChessDatabaseStatus();
  const importController = useChessDatabaseImport({
    refreshStatus: statusController.loadStatus,
  });
  const searchController = useChessDatabaseSearch({
    onGameLoaded,
    onClose,
  });

  function chooseImportFile() {
    fileInputRef.current?.click();
  }

  async function handleImportFileSelected(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setView("import");
    await importController.startImport(file);
  }

  function closeImportResult() {
    if (importController.resetImport()) {
      setView("overview");
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        className="chess-database-hidden-input"
        type="file"
        accept=".pgn,.txt,application/x-chess-pgn,text/plain"
        onChange={(event) => void handleImportFileSelected(event)}
      />

      {view === "overview" && (
        <ChessDatabaseOverviewView
          controller={statusController}
          onImport={chooseImportFile}
          onSearch={() => setView("search")}
          onClose={onClose}
        />
      )}

      {view === "import" && (
        <ChessDatabaseImportView
          controller={importController}
          onCloseResult={closeImportResult}
        />
      )}

      {view === "search" && (
        <ChessDatabaseSearchView
          controller={searchController}
          onBack={() => setView("overview")}
          onClose={onClose}
        />
      )}
    </>
  );
}
