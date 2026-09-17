import EngineConfigManager from "../../EngineConfigManager";
import { useI18n } from "../../i18n/I18nProvider";
import { formatEngineLineScore } from "../engine/engineEvaluationUtils";
import type { EnginePanelActions, EnginePanelState } from "./chessBoardViewTypes";

interface EnginePanelProps {
  engine: EnginePanelState;
  actions: EnginePanelActions;
}

export default function EnginePanel({ engine, actions }: EnginePanelProps) {
  const { t } = useI18n();

  return (
    <section className="engine-panel">
      <div className="engine-panel-main">
        {!engine.analysisReplayActive && !engine.uciAnalysisLoaded && (
          <button
            type="button"
            className={[
              "engine-bar-wrapper",
              engine.engineAutoUpdate ? "engine-bar-enabled" : "engine-bar-disabled",
              engine.boardOrientation === "black" ? "engine-bar-black-bottom" : "",
            ].filter(Boolean).join(" ")}
            onClick={actions.toggleEngineAutoUpdate}
            aria-pressed={engine.engineAutoUpdate}
            aria-label={engine.engineAutoUpdate
              ? t("game.disableEvaluationEngine")
              : t("game.enableEvaluationEngine")}
            title={engine.engineAutoUpdate
              ? t("game.disableEvaluationEngine")
              : `${t("game.enableEvaluationEngine")} · 0.0`}
          >
            <div className="engine-bar-white" style={{
              height: `${(engine.engineAutoUpdate && engine.liveEvaluationBar != null
                ? engine.liveEvaluationBar : 0.5) * 100}%`,
            }} />
            <div className="engine-bar-black" style={{
              height: `${(1 - (engine.engineAutoUpdate && engine.liveEvaluationBar != null
                ? engine.liveEvaluationBar : 0.5)) * 100}%`,
            }} />
          </button>
        )}

        {engine.analysisReplayActive && engine.analysisReplayFinished && (
          <button
            type="button"
            className={[
              "engine-bar-wrapper",
              engine.analysisEvaluationEnabled ? "engine-bar-enabled" : "engine-bar-disabled",
              engine.boardOrientation === "black" ? "engine-bar-black-bottom" : "",
            ].filter(Boolean).join(" ")}
            onClick={actions.toggleAnalysisEvaluation}
            aria-pressed={engine.analysisEvaluationEnabled}
            disabled={!engine.analysisSelectedPosition}
            aria-label={engine.analysisEvaluationEnabled
              ? t("game.disableAnalysisEvaluation")
              : t("game.enableAnalysisEvaluation")}
            title={!engine.analysisSelectedPosition
              ? t("game.selectMoveEvaluation")
              : engine.analysisEvaluationEnabled
                ? t("game.disableEvaluationEngine")
                : engine.analysisVariationMoves.length > 0
                  ? t("game.enableEvaluationVariation")
                  : t("game.enableEvaluationSelectedMove")}
          >
            <div className="engine-bar-white" style={{
              height: `${(engine.analysisEvaluationEnabled && engine.analysisEvaluation
                ? engine.analysisEvaluation.bar : 0.5) * 100}%`,
            }} />
            <div className="engine-bar-black" style={{
              height: `${(1 - (engine.analysisEvaluationEnabled && engine.analysisEvaluation
                ? engine.analysisEvaluation.bar : 0.5)) * 100}%`,
            }} />
          </button>
        )}

        <div className="engine-content-column">
          {engine.showEngineConfig && <>
            <EngineConfigManager overview={engine.engineConfigOverview}
              onOverviewChange={actions.onEngineConfigOverviewChange}
              onClose={actions.closeEngineConfig} />
            {engine.engineConfigLoadError && <div className="engine-error">{engine.engineConfigLoadError}</div>}
          </>}

          {engine.analysisReplayActive ? engine.analysisContent
            : engine.uciAnalysisLoaded ? <div className="engine-placeholder-text">{t("analysis.analyzeTitle")}</div>
              : <>
                {engine.evalError && <div className="engine-error">{t("common.error")}: {engine.evalError}</div>}
                {engine.engineAutoUpdate && engine.engineEval && !engine.clock?.gameState && (
                  <div className="engine-lines">
                    {engine.engineEval.lines.length > 0 && <div className="engine-lines-summary">
                      <span>{engine.engineEval.engineName || t("analysis.evaluationEngine")}</span>
                      <span>{t("analysis.searchDepth", { depth: engine.engineEval.lines[0].depth })}</span>
                    </div>}
                    {engine.engineEval.lines.length === 0 && <div className="engine-empty">{t("analysis.noEngineLines")}</div>}
                    {engine.engineEval.lines.map((line, index) => <div key={index} className="engine-line">
                      <div className="engine-line-header">#{index + 1} · {formatEngineLineScore(line)}</div>
                      <div className="engine-line-moves">{line.moves}</div>
                    </div>)}
                  </div>
                )}
                {engine.engineAutoUpdate && !engine.engineEval && !engine.isLoadingEval && !engine.evalError && !engine.clock?.gameState && (
                  <div className="engine-placeholder-text">{t("analysis.engineOutputPlaceholder")}</div>
                )}
              </>}
        </div>
      </div>
    </section>
  );
}
