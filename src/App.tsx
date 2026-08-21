import "./App.css";
import AnalysisEvaluationOutputPortal from "./AnalysisEvaluationOutputPortal";
import { ChessBoard } from "./ChessBoard";

function App() {
  return (
    <div className="app">
      <ChessBoard />
      <AnalysisEvaluationOutputPortal />
    </div>
  );
}

export default App;
