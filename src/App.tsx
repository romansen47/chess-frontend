import "./App.css";
import AnalysisEvaluationLifecycleGuard from "./AnalysisEvaluationLifecycleGuard";
import AnalysisEvaluationOutputPortal from "./AnalysisEvaluationOutputPortal";
import { ChessBoard } from "./ChessBoard";
import EngineProfileContextMenu from "./EngineProfileContextMenu";
import LiveEvaluationSseBridge from "./LiveEvaluationSseBridge";
import BrowserLocaleBridge from "./i18n/BrowserLocaleBridge";
import { I18nProvider } from "./i18n/I18nProvider";

function App() {
  return (
    <I18nProvider>
      <BrowserLocaleBridge />
      <div className="app">
        <ChessBoard />
        <AnalysisEvaluationLifecycleGuard />
        <AnalysisEvaluationOutputPortal />
        <EngineProfileContextMenu />
        <LiveEvaluationSseBridge />
      </div>
    </I18nProvider>
  );
}

export default App;
