import { useI18n } from "../../i18n/I18nProvider";
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
  const { t } = useI18n();

  return (
    <div
      className="analysis-engine-view-tabs"
      role="tablist"
      aria-label={t("analysis.engineLinesAria")}
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
          {t("settings.deepAnalysis")}
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
        {t("settings.liveEvaluation")}
      </button>
    </div>
  );
}
