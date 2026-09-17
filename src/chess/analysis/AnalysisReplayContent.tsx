import { useI18n } from "../../i18n/I18nProvider";
import AnalysisEngineTabs from "./AnalysisEngineTabs";
import LiveEvaluationView from "./LiveEvaluationView";
import AnalysisProfilePanel from "./AnalysisProfilePanel";
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

  const sourceTabs = !variationMode && (
    <div className="analysis-detail-tabs" role="tablist" aria-label={t("analysis.source")}>
      <button type="button" role="tab" aria-selected={engineTabActive}
        className={["analysis-detail-tab", engineTabActive ? "analysis-detail-tab-active" : ""].filter(Boolean).join(" ")}
        onClick={() => actions.setDetailsTab("engine")}>{t("analysis.engineSource")}</button>
      <button type="button" role="tab" aria-selected={databaseTabActive}
        className={["analysis-detail-tab", databaseTabActive ? "analysis-detail-tab-active" : ""].filter(Boolean).join(" ")}
        onClick={() => actions.setDetailsTab("database")}>{t("analysis.databaseSource")}</button>
      <button type="button" role="tab" aria-selected={annotationsTabActive}
        className={["analysis-detail-tab", annotationsTabActive ? "analysis-detail-tab-active" : ""].filter(Boolean).join(" ")}
        onClick={() => actions.setDetailsTab("annotations")}>{t("annotations.title")}</button>
    </div>
  );

  return <div className="analysis-replay-content">
    <AnalysisProfilePanel state={state} actions={actions} />
    {sourceTabs}
    {variationMode ? <>
      <AnalysisEngineTabs activeView="live" showDeepAnalysis={false} onChange={actions.setEngineView} />
      <LiveEvaluationView evaluation={state.analysisEvaluation} evaluationKey={state.evaluationKey}
        activePly={state.analysisSelectedPosition?.ply ?? null} variationMode deepAnalysisRunning={state.isAnalysisReplayRunning} />
    </> : state.analysisDetailsTab === "annotations" ? (
      <AnalysisAnnotationDetails state={state} actions={actions} />
    ) : state.analysisDetailsTab === "database" ? (
      <AnalysisEngineDetails state={state} actions={actions} />
    ) : <>
      <AnalysisEngineTabs activeView={state.analysisEngineView} showDeepAnalysis onChange={actions.setEngineView} />
      {liveViewActive ? (
        <LiveEvaluationView evaluation={state.analysisEvaluation} evaluationKey={state.evaluationKey}
          activePly={state.analysisSelectedPosition?.ply ?? null} variationMode={false} deepAnalysisRunning={state.isAnalysisReplayRunning} />
      ) : <AnalysisEngineDetails state={state} actions={actions} />}
    </>}
  </div>;
}
