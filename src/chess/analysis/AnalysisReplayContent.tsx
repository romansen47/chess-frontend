import { useI18n } from "../../i18n/I18nProvider";
import AnalysisEngineTabs from "./AnalysisEngineTabs";
import LiveEvaluationView from "./LiveEvaluationView";
import AnalysisProfileContent from "./AnalysisProfileContent";
import AnalysisEngineDetails from "./AnalysisEngineDetails";
import AnalysisAnnotationDetails from "./AnalysisAnnotationDetails";
import type { AnalysisReplayContentActions, AnalysisReplayContentState } from "./analysisReplayViewTypes";

export type { AnalysisDetailsTab } from "./analysisReplayViewTypes";

interface Props {
  state: AnalysisReplayContentState;
  actions: AnalysisReplayContentActions;
}

export default function AnalysisReplayContent({ state, actions }: Props) {
  const { t } = useI18n();
  const variationMode = state.analysisVariationMoves.length > 0;
  const liveViewActive = variationMode || state.analysisEngineView === "live";
  const engineTabActive = state.analysisDetailsTab === "engine";
  const databaseTabActive = state.analysisDetailsTab === "database";
  const annotationsTabActive = state.analysisDetailsTab === "annotations";
  const activePrimaryTabId = `analysis-primary-tab-${state.analysisDetailsTab}`;

  const primaryTabs = !variationMode && (
    <div className="analysis-primary-tabs" role="tablist" aria-label={t("analysis.source")}>
      <button
        id="analysis-primary-tab-engine"
        type="button"
        role="tab"
        aria-selected={engineTabActive}
        aria-controls="analysis-primary-tabpanel"
        className={[
          "analysis-primary-tab",
          engineTabActive ? "analysis-primary-tab-active" : "",
        ].filter(Boolean).join(" ")}
        onClick={() => actions.setDetailsTab("engine")}
      >
        {t("analysis.engineSource")}
      </button>
      <button
        id="analysis-primary-tab-database"
        type="button"
        role="tab"
        aria-selected={databaseTabActive}
        aria-controls="analysis-primary-tabpanel"
        className={[
          "analysis-primary-tab",
          databaseTabActive ? "analysis-primary-tab-active" : "",
        ].filter(Boolean).join(" ")}
        onClick={() => actions.setDetailsTab("database")}
      >
        {t("analysis.databaseSource")}
      </button>
      <button
        id="analysis-primary-tab-annotations"
        type="button"
        role="tab"
        aria-selected={annotationsTabActive}
        aria-controls="analysis-primary-tabpanel"
        className={[
          "analysis-primary-tab",
          annotationsTabActive ? "analysis-primary-tab-active" : "",
        ].filter(Boolean).join(" ")}
        onClick={() => actions.setDetailsTab("annotations")}
      >
        {t("annotations.title")}
      </button>
    </div>
  );

  return <div className="analysis-replay-content">
    <AnalysisProfileContent state={state} actions={actions}>
      <div className="analysis-tab-stack">
        {primaryTabs}
        <div
          id="analysis-primary-tabpanel"
          className="analysis-primary-tabpanel"
          role={variationMode ? undefined : "tabpanel"}
          aria-labelledby={variationMode ? undefined : activePrimaryTabId}
        >
          {variationMode ? <>
            <AnalysisEngineTabs activeView="live" showDeepAnalysis={false} onChange={actions.setEngineView} />
            <LiveEvaluationView evaluation={state.analysisEvaluation} evaluationKey={state.evaluationKey}
              activePly={state.analysisSelectedPosition?.ply ?? null} variationMode deepAnalysisRunning={false}
              orientation={state.boardOrientation} />
          </> : state.analysisDetailsTab === "annotations" ? (
            <AnalysisAnnotationDetails state={state} actions={actions} />
          ) : state.analysisDetailsTab === "database" ? (
            <AnalysisEngineDetails state={state} actions={actions} />
          ) : <>
            <AnalysisEngineTabs activeView={state.analysisEngineView} showDeepAnalysis onChange={actions.setEngineView} />
            {liveViewActive ? (
              <LiveEvaluationView evaluation={state.analysisEvaluation} evaluationKey={state.evaluationKey}
                activePly={state.analysisSelectedPosition?.ply ?? null} variationMode={false} deepAnalysisRunning={false}
                orientation={state.boardOrientation} />
            ) : <AnalysisEngineDetails state={state} actions={actions} />}
          </>}
        </div>
      </div>
    </AnalysisProfileContent>
  </div>;
}
