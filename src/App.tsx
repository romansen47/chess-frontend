import { useEffect } from "react";
import "./App.css";
import { ChessBoard } from "./ChessBoard";
import EngineProfileContextMenu from "./EngineProfileContextMenu";
import { stopAnalysisEvaluationRequest } from "./chess/api/analysisApi";
import BrowserLocaleBridge from "./i18n/BrowserLocaleBridge";
import { I18nProvider } from "./i18n/I18nProvider";

function App() {
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
        <ChessBoard />
        <EngineProfileContextMenu />
      </div>
    </I18nProvider>
  );
}

export default App;
