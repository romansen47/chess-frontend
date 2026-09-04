import "./App.css";
import AnalysisEvaluationLifecycleGuard from "./AnalysisEvaluationLifecycleGuard";
import AnalysisEvaluationOutputPortal from "./AnalysisEvaluationOutputPortal";
import { ChessBoard } from "./ChessBoard";

function App() {
  return (
    <div className="app">
      <ChessBoard />
      <AnalysisEvaluationLifecycleGuard />
      <AnalysisEvaluationOutputPortal />
    </div>
  );
}

export default App;
