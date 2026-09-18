import { useEffect, useState } from "react";
import LanguageSelector from "../../i18n/LanguageSelector";
import { useI18n } from "../../i18n/I18nProvider";
import { fetchEngineCapabilities } from "../api/engineCapabilitiesApi";
import DataMenu from "./DataMenu";

interface ChessHeaderProps {
  analysisReplayActive: boolean;
  analysisReplayRunning: boolean;
  analysisReplayFinished: boolean;
  debugMode: boolean;
  uciAnalysisLoaded: boolean;
  terminatingProgram: boolean;
  onCancelAnalysis: () => void;
  onOpenAnalysis: () => void;
  onExportAnalysisPgn: () => void;
  onNewGame: () => void;
  onExportCurrentGame: () => void;
  onImportNewGame: () => void;
  onOpenDatabase: () => void;
  onTerminateProgram: () => void;
  onToggleSettings: () => void;
}

export default function ChessHeader({
  analysisReplayActive,
  analysisReplayRunning,
  analysisReplayFinished,
  debugMode,
  uciAnalysisLoaded,
  terminatingProgram,
  onCancelAnalysis,
  onOpenAnalysis,
  onExportAnalysisPgn,
  onNewGame,
  onExportCurrentGame,
  onImportNewGame,
  onOpenDatabase,
  onTerminateProgram,
  onToggleSettings,
}: ChessHeaderProps) {
  const { language, t } = useI18n();
  const analysisBusy = analysisReplayActive && !analysisReplayFinished;
  const [deepAnalysisAvailable, setDeepAnalysisAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.title = "ChessAnalysisTool";
    });
    return () => window.cancelAnimationFrame(frame);
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const capabilities = await fetchEngineCapabilities();
        if (!cancelled) setDeepAnalysisAvailable(capabilities.deepAnalysis.available);
      } catch {
        if (!cancelled) setDeepAnalysisAvailable(false);
      }
    };
    void refresh();
    const intervalId = window.setInterval(() => { void refresh(); }, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const analysisDisabled = deepAnalysisAvailable === false;
  const analysisUnavailableTitle = "Keine funktionsbereite native Engine für die Analyse verfügbar.";

  return (
    <header className="app-header">
      <h1 className="app-title" translate="no" aria-label="ChessAnalysisTool">
        <img className="app-title-logo" src="/favicon.png" alt="" aria-hidden="true" />
        <span className="app-title-name" aria-hidden="true">
          <span className="app-title-initial">C</span><span className="app-title-rest">hess</span>
          <span className="app-title-initial">A</span><span className="app-title-rest">nalysis</span>
          <span className="app-title-initial">T</span><span className="app-title-rest">ool</span>
        </span>
      </h1>

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

        {analysisReplayActive && analysisReplayFinished && (
          <>
            <button
              className="top-engine-button analysis-repeat"
              onClick={onOpenAnalysis}
              title={analysisDisabled ? analysisUnavailableTitle : t("analysis.analyzeAgainTitle")}
              disabled={analysisDisabled}
            >
              {t("analysis.analyzeAgain")}
            </button>
            {debugMode && (
              <button
                className="top-engine-button analysis-export"
                onClick={onExportAnalysisPgn}
                title={t("analysis.exportPgnTitle")}
              >
                {t("analysis.exportPgn")}
              </button>
            )}
          </>
        )}

        {!analysisReplayActive && uciAnalysisLoaded && (
          <button
            className="top-engine-button analysis-repeat"
            onClick={onOpenAnalysis}
            title={analysisDisabled ? analysisUnavailableTitle : t("analysis.analyzeTitle")}
            disabled={analysisDisabled}
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

        <button className="top-engine-button engine-settings" onClick={onToggleSettings} title={t("settings.title")}>
          {t("settings.title")}
        </button>

        <LanguageSelector />
      </div>
    </header>
  );
}
