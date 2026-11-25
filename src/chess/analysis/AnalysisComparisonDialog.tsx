import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  activateGameAnalysisRun,
  compareGameAnalysisRuns,
} from "../api/analysisApi";
import type {
  AnalysisPositionComparison,
  GameAnalysisComparison,
  GameAnalysisRunSummary,
  StoredAnalysisPosition,
} from "../types";
import AnalysisComparisonChart from "./AnalysisComparisonChart";
import {
  type AnalysisDifferenceFilter,
  isAnalysisDifference,
  principalVariationLabel,
} from "./analysisComparison";
import "./AnalysisComparisonDialog.css";

interface AnalysisComparisonDialogProps {
  runs: GameAnalysisRunSummary[];
  onClose: () => void;
  onSelectPly: (ply: number) => void;
  onRunsChanged: () => void;
}

const FILTER_TRANSLATION_KEYS = {
  all: "analysis.comparisonFilter.all",
  bestMove: "analysis.comparisonFilter.bestMove",
  continuation: "analysis.comparisonFilter.continuation",
  score: "analysis.comparisonFilter.score",
  mate: "analysis.comparisonFilter.mate",
} as const;

function runLabel(run: GameAnalysisRunSummary): string {
  const limit = run.requestedDepth > 0
    ? `depth ${run.requestedDepth}`
    : `${run.moveTimeSeconds}s`;
  return `${run.active ? "✓ " : ""}${run.engineName} · ${limit} · MultiPV ${run.multiPv} · ${run.createdAt}`;
}

function PositionSide({
  title,
  position,
  foreignRank,
}: {
  title: string;
  position: StoredAnalysisPosition;
  foreignRank: number | null;
}) {
  const { t } = useI18n();
  const best = position.lines[0];
  return (
    <section className="analysis-comparison-side">
      <h3>{title}</h3>
      <div>{position.evaluation >= 0 ? "+" : ""}{position.evaluation.toFixed(2)} · {t("analysis.comparisonDepth", { depth: position.depth })}</div>
      <div>{t("analysis.comparisonNormalizedScore", { score: position.normalizedScore.toFixed(2) })}</div>
      <div>{t("analysis.comparisonBestMove", { move: best?.uciMoves[0] ?? "—" })}</div>
      <div>{t("analysis.comparisonRankOther", {
        rank: foreignRank ?? t("analysis.comparisonNotStored"),
      })}</div>
      <code>{principalVariationLabel(best?.uciMoves)}</code>
    </section>
  );
}

export default function AnalysisComparisonDialog({
  runs,
  onClose,
  onSelectPly,
  onRunsChanged,
}: AnalysisComparisonDialogProps) {
  const { t } = useI18n();
  const [leftId, setLeftId] = useState(runs[0]?.id ?? 0);
  const [rightId, setRightId] = useState(runs[1]?.id ?? 0);
  const [comparison, setComparison] = useState<GameAnalysisComparison | null>(null);
  const [selectedPly, setSelectedPly] = useState<number | null>(null);
  const [filter, setFilter] = useState<AnalysisDifferenceFilter>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leftId || !rightId || leftId === rightId) {
      setComparison(null);
      return;
    }
    let cancelled = false;
    setError(null);
    void compareGameAnalysisRuns(leftId, rightId)
      .then((result) => {
        if (cancelled) return;
        setComparison(result);
        setSelectedPly(result.positions[0]?.ply ?? null);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => { cancelled = true; };
  }, [leftId, rightId]);

  const differences = useMemo(
    () => comparison?.positions.filter((position) => isAnalysisDifference(position, filter)) ?? [],
    [comparison, filter],
  );
  const selected = comparison?.positions.find((position) => position.ply === selectedPly)
    ?? differences[0]
    ?? null;

  function choosePosition(position: AnalysisPositionComparison) {
    setSelectedPly(position.ply);
    onSelectPly(position.ply);
  }

  async function activate(runId: number) {
    try {
      await activateGameAnalysisRun(runId);
      onRunsChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  return (
    <div className="analysis-comparison-dialog" role="dialog" aria-modal="true" aria-labelledby="analysis-comparison-title">
      <div className="analysis-comparison-content">
        <header>
          <h2 id="analysis-comparison-title">{t("analysis.comparisonTitle")}</h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")}>×</button>
        </header>

        <div className="analysis-comparison-selectors">
          <label>
            A
            <select value={leftId} onChange={(event) => setLeftId(Number(event.target.value))}>
              {runs.map((run) => <option key={run.id} value={run.id}>{runLabel(run)}</option>)}
            </select>
            <button type="button" onClick={() => void activate(leftId)}>{t("analysis.useRun")}</button>
          </label>
          <label>
            B
            <select value={rightId} onChange={(event) => setRightId(Number(event.target.value))}>
              {runs.map((run) => <option key={run.id} value={run.id}>{runLabel(run)}</option>)}
            </select>
            <button type="button" onClick={() => void activate(rightId)}>{t("analysis.useRun")}</button>
          </label>
        </div>

        {comparison && (
          <>
            <div className="analysis-comparison-legend">
              <span className="left">A · {comparison.left.engineName}</span>
              <span className="right">B · {comparison.right.engineName}</span>
            </div>
            <AnalysisComparisonChart
              positions={comparison.positions}
              selectedPly={selected?.ply ?? null}
              onSelectPly={(ply) => {
                const position = comparison.positions.find((candidate) => candidate.ply === ply);
                if (position) choosePosition(position);
              }}
            />

            <div className="analysis-comparison-filters" role="group" aria-label={t("analysis.comparisonDifferences")}>
              {(["all", "bestMove", "continuation", "score", "mate"] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  className={filter === value ? "active" : ""}
                  onClick={() => setFilter(value)}
                >
                  {t(FILTER_TRANSLATION_KEYS[value])}
                </button>
              ))}
            </div>

            <div className="analysis-comparison-body">
              <div className="analysis-comparison-list">
                {differences.map((position) => (
                  <button
                    type="button"
                    key={position.ply}
                    className={position.ply === selected?.ply ? "selected" : ""}
                    onClick={() => choosePosition(position)}
                  >
                    <strong>{t("analysis.comparisonPly", { ply: position.ply })}</strong>
                    <span>Δ {position.normalizedScoreGap.toFixed(2)}</span>
                  </button>
                ))}
                {differences.length === 0 && <p>{t("analysis.comparisonNoDifferences")}</p>}
              </div>

              {selected && (
                <div className="analysis-comparison-detail">
                  <div className="analysis-comparison-sides">
                    <PositionSide title="A" position={selected.left} foreignRank={selected.leftBestMoveRankOnRight} />
                    <PositionSide title="B" position={selected.right} foreignRank={selected.rightBestMoveRankOnLeft} />
                  </div>
                  <p>
                    {t("analysis.comparisonCommonPrefix", { count: selected.commonPrefixLength })}
                    {selected.differentBestMove ? ` · ${t("analysis.comparisonDifferentBestMove")}` : ""}
                    {selected.mateDisagreement ? ` · ${t("analysis.comparisonMateDisagreement")}` : ""}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        {error && <div className="analysis-profile-error">{error}</div>}
      </div>
    </div>
  );
}
