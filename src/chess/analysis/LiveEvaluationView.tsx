import { useI18n } from "../../i18n/I18nProvider";
import EngineLineExplorer from "../engine/EngineLineExplorer";
import type { BoardOrientation } from "../board/boardOrientation";
import type { EngineEvaluation } from "../types";
import "./analysisViews.css";

interface LiveEvaluationViewProps {
  evaluation: EngineEvaluation | null;
  evaluationKey: string | null;
  activePly: number | null;
  variationMode: boolean;
  deepAnalysisRunning?: boolean;
  orientation?: BoardOrientation;
  animateVariations?: boolean;
  animationIntervalMs?: number;
}

function formatEngineScore(evaluation: number): string {
  if (Math.abs(evaluation) >= 99) {
    return evaluation > 0 ? "Mate for White" : "Mate for Black";
  }

  return `Eval ${evaluation.toFixed(2)}`;
}

export default function LiveEvaluationView({
  evaluation,
  evaluationKey,
  activePly,
  variationMode,
  deepAnalysisRunning = false,
  orientation = "white",
  animateVariations = true,
  animationIntervalMs = 1000,
}: LiveEvaluationViewProps) {
  const { t } = useI18n();

  const boardTitle = variationMode
    ? activePly
      ? t("analysis.variationFromPly", { ply: activePly })
      : t("analysis.evaluationVariation")
    : activePly
      ? t("analysis.continuationFromPly", { ply: activePly })
      : t("analysis.evaluationContinuation");

  const linesTitle = t("analysis.variationsInfinite");

  if (evaluation && evaluation.lines.length > 0) {
    return (
      <section className="analysis-detail-row analysis-evaluation-panel">
        <EngineLineExplorer
          evaluation={evaluation}
          resetKey={evaluationKey}
          variant="analysis"
          boardTitle={boardTitle}
          linesTitle={linesTitle}
          engineNameFallback={t("analysis.evaluationEngine")}
          depthLabel={(depth) => t("analysis.depthInfinite", { depth })}
          boardUnavailableText={t("analysis.evaluationBoardUnavailable")}
          orientation={orientation}
          animateVariations={animateVariations}
          animationIntervalMs={animationIntervalMs}
        />
      </section>
    );
  }

  return (
    <section className="analysis-detail-row analysis-evaluation-panel">
      <div className="analysis-position-panel analysis-evaluation-position-panel">
        <div className="analysis-detail-title">{boardTitle}</div>
        <div className="analysis-detail-placeholder">
          {evaluation
            ? t("analysis.noBoardPositionsVariation")
            : deepAnalysisRunning && !variationMode
              ? t("analysis.liveEvaluationUnavailableDuringDeepAnalysis")
              : t("analysis.enableEvaluationBar")}
        </div>
      </div>

      <div className="analysis-lines-panel analysis-evaluation-lines-panel">
        <div className="analysis-detail-title">{linesTitle}</div>

        {!evaluation && (
          <div className="analysis-detail-placeholder analysis-evaluation-placeholder">
            {deepAnalysisRunning && !variationMode
              ? t("analysis.liveEvaluationUnavailableDuringDeepAnalysis")
              : variationMode
                ? t("analysis.evaluationCalculating")
                : activePly
                  ? t("analysis.evaluationPlyCalculating", { ply: activePly })
                  : t("analysis.enableSelectedInfinite")}
          </div>
        )}

        {evaluation && evaluation.lines.length === 0 && (
          <div className="analysis-detail-placeholder analysis-evaluation-placeholder">
            {formatEngineScore(evaluation.eval)} · {t("analysis.terminalPosition")}
          </div>
        )}
      </div>
    </section>
  );
}
