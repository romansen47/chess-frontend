import "./analysisViews.css";

export type AnalysisEngineView = "deep" | "live";

interface AnalysisEngineTabsProps {
  activeView: AnalysisEngineView;
  showDeepAnalysis: boolean;
  onChange: (view: AnalysisEngineView) => void;
}

export default function AnalysisEngineTabs({
  activeView,
  showDeepAnalysis,
  onChange,
}: AnalysisEngineTabsProps) {
  return (
    <div
      className="analysis-engine-view-tabs"
      role="tablist"
      aria-label="Analysis engine lines"
    >
      {showDeepAnalysis && (
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "deep"}
          className={[
            "analysis-engine-view-tab",
            activeView === "deep" ? "analysis-engine-view-tab-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onChange("deep")}
        >
          Deep Analysis
        </button>
      )}
      <button
        type="button"
        role="tab"
        aria-selected={activeView === "live"}
        className={[
          "analysis-engine-view-tab",
          activeView === "live" ? "analysis-engine-view-tab-active" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => onChange("live")}
      >
        Live Evaluation
      </button>
    </div>
  );
}
