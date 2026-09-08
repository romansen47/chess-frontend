import LanguageSelector from "../../i18n/LanguageSelector";
import { useI18n } from "../../i18n/I18nProvider";
import DataMenu from "./DataMenu";

interface ChessHeaderProps {
  analysisReplayActive: boolean;
  analysisReplayRunning: boolean;
  analysisReplayFinished: boolean;
  gameEnded: boolean;
  uciAnalysisLoaded: boolean;
  terminatingProgram: boolean;
  onCancelAnalysis: () => void;
  onOpenOptions: () => void;
  onOpenAnalysis: () => void;
  onNewGame: () => void;
  onExportCurrentGame: () => void;
  onImportNewGame: () => void;
  onOpenDatabase: () => void;
  onTerminateProgram: () => void;
  onToggleEngineSettings: () => void;
  onOpenEngineManager: () => void;
}

export default function ChessHeader({
  analysisReplayActive,
  analysisReplayRunning,
  analysisReplayFinished,
  gameEnded,
  uciAnalysisLoaded,
  terminatingProgram,
  onCancelAnalysis,
  onOpenOptions,
  onOpenAnalysis,
  onNewGame,
  onExportCurrentGame,
  onImportNewGame,
  onOpenDatabase,
  onTerminateProgram,
  onToggleEngineSettings,
  onOpenEngineManager,
}: ChessHeaderProps) {
  const { t } = useI18n();
  const analysisBusy = analysisReplayActive && !analysisReplayFinished;

  return (
    <header className="app-header">
      <h1 translate="no">ChessAnalysisTool</h1>

      <div className="top-engine-controls">
        {analysisReplayActive && analysisReplayRunning && (
          <button
            className="top-engine-button analysis-repeat"
            onClick={onCancelAnalysis}
            title={t("analysis.cancelRunningTitle")}
          >
            {t("analysis.cancelRunning")}
          </button>
        )}

        {analysisReplayActive && analysisReplayFinished && gameEnded && (
          <button
            className="top-engine-button analysis-repeat"
            onClick={onOpenOptions}
            title={t("analysis.optionsTitle")}
          >
            {t("analysis.options")}
          </button>
        )}

        {analysisReplayActive && analysisReplayFinished && uciAnalysisLoaded && (
          <button
            className="top-engine-button analysis-repeat"
            onClick={onOpenAnalysis}
            title={t("analysis.analyzeAgainTitle")}
          >
            {t("analysis.analyzeAgain")}
          </button>
        )}

        {!analysisReplayActive && uciAnalysisLoaded && (
          <button
            className="top-engine-button analysis-repeat"
            onClick={onOpenAnalysis}
            title={t("analysis.analyzeTitle")}
          >
            {t("analysis.analyze")}
          </button>
        )}

        <DataMenu
          disabled={terminatingProgram}
          actionsDisabled={analysisBusy}
          terminating={terminatingProgram}
          onNewGame={onNewGame}
          onExportCurrentGame={onExportCurrentGame}
          onImportNewGame={onImportNewGame}
          onOpenDatabase={onOpenDatabase}
          onTerminateProgram={onTerminateProgram}
        />

        <button
          className="top-engine-button engine-settings"
          onClick={onToggleEngineSettings}
          title={t("engine.settingsTitle")}
        >
          {t("engine.settings")}
        </button>

        <button
          className="top-engine-button engine-settings"
          onClick={onOpenEngineManager}
          title={t("engine.managerTitle")}
        >
          {t("engine.manager")}
        </button>

        <LanguageSelector />
      </div>
    </header>
  );
}
