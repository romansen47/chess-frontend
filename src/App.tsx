import "./App.css";
import AnalysisEvaluationLifecycleGuard from "./AnalysisEvaluationLifecycleGuard";
import AnalysisEvaluationOutputPortal from "./AnalysisEvaluationOutputPortal";
import { ChessBoard } from "./ChessBoard";
import { I18nProvider } from "./i18n/I18nProvider";
import LanguageSelector from "./i18n/LanguageSelector";

function App() {
  return (
    <I18nProvider>
      <div className="app">
        <LanguageSelector />
        <ChessBoard />
        <AnalysisEvaluationLifecycleGuard />
        <AnalysisEvaluationOutputPortal />
      </div>
    </I18nProvider>
  );
}

export default App;
