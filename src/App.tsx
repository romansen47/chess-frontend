import { useEffect } from "react";
import "./App.css";
import { ChessBoard } from "./ChessBoard";
import EngineProfileContextMenu from "./EngineProfileContextMenu";
import { stopAnalysisEvaluationRequest } from "./chess/api/analysisApi";
import BrowserLocaleBridge from "./i18n/BrowserLocaleBridge";
import { I18nProvider } from "./i18n/I18nProvider";
import { useUiPreferences } from "./chess/settings/useUiPreferences";

function App() {
  const uiPreferences = useUiPreferences();

  useEffect(() => {
    void stopAnalysisEvaluationRequest().catch((error) => {
      console.warn("[analysisEvaluationLifecycle] initial stop failed", error);
    });

    const stopForPageLifecycle = () => {
      void stopAnalysisEvaluationRequest({ keepalive: true }).catch((error) => {
        console.warn("[analysisEvaluationLifecycle] keepalive stop failed", error);
      });
    };

    window.addEventListener("pagehide", stopForPageLifecycle);
    return () => {
      window.removeEventListener("pagehide", stopForPageLifecycle);
      stopForPageLifecycle();
    };
  }, []);

  return (
    <I18nProvider>
      <BrowserLocaleBridge />
      <div className="app">
        <ChessBoard uiPreferences={uiPreferences} />
        <EngineProfileContextMenu
          liveEvaluationSource={uiPreferences.preferences.liveEvaluationSource}
          onLiveEvaluationSourceChange={(source) =>
            uiPreferences.updatePreferences({ liveEvaluationSource: source })}
        />
      </div>
    </I18nProvider>
  );
}

export default App;
