import EngineConfigManager from "../../EngineConfigManager";
import { useI18n } from "../../i18n/I18nProvider";
import EngineLineExplorer from "../engine/EngineLineExplorer";
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
                  engine.engineEval.lines.length > 0
                    ? <EngineLineExplorer
                        evaluation={engine.engineEval}
                        resetKey={engine.engineEval.lines[0]?.positions?.[0] ?? null}
                        variant="game"
                        orientation={engine.boardOrientation}
                        boardTitle={t("analysis.evaluationContinuation")}
                        linesTitle={t("analysis.variationsInfinite")}
                        engineNameFallback={t("analysis.evaluationEngine")}
                        depthLabel={(depth) => t("analysis.searchDepth", { depth })}
                        boardUnavailableText={t("analysis.evaluationBoardUnavailable")}
                      />
                    : <div className="engine-empty">{t("analysis.noEngineLines")}</div>
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
