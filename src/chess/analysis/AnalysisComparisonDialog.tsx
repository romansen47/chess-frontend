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
  MoveRow,
  StoredAnalysisPosition,
} from "../types";
import type { BoardOrientation } from "../board/boardOrientation";
import AnalysisComparisonChart from "./AnalysisComparisonChart";
import AnalysisStaticBoard from "./AnalysisStaticBoard";
import {
  type AnalysisDifferenceFilter,
  comparisonInitialPosition,
  comparisonMoveDisplay,
  initialComparisonRunSelection,
  isAnalysisDifference,
  principalVariationLabel,
  selectComparisonLeftRun,
} from "./analysisComparison";
import "./AnalysisComparisonDialog.css";

interface AnalysisComparisonDialogProps {
  runs: GameAnalysisRunSummary[];
  onClose: () => void;
  onSelectPly: (ply: number) => void;
  onRunsChanged: () => void;
  moves: MoveRow[];
  boardOrientation: BoardOrientation;
  analysisGameMetadata: Record<string, string>;
  analysisStandardStartingPosition: boolean | null;
}

const FILTER_TRANSLATION_KEYS = {
  all: "analysis.comparisonFilter.all",
  bestMove: "analysis.comparisonFilter.bestMove",
  continuation: "analysis.comparisonFilter.continuation",
  score: "analysis.comparisonFilter.score",
  mate: "analysis.comparisonFilter.mate",
} as const;

function runLabel(run: GameAnalysisRunSummary): string {
  return `${run.profileName} · MultiPV ${run.multiPv} · ${run.createdAt}`;
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
      <dl>
        <div>
          <dt>{t("analysis.comparisonEvaluation")}</dt>
          <dd>{position.evaluation >= 0 ? "+" : ""}{position.evaluation.toFixed(2)}</dd>
        </div>
        <div>
          <dt>{t("analysis.comparisonDepthLabel")}</dt>
          <dd>{position.depth}</dd>
        </div>
        <div>
          <dt>{t("analysis.comparisonNormalizedScoreLabel")}</dt>
          <dd>{position.normalizedScore.toFixed(2)}</dd>
        </div>
        <div>
          <dt>{t("analysis.comparisonBestMoveLabel")}</dt>
          <dd>{best?.uciMoves[0] ?? "—"}</dd>
        </div>
        <div>
          <dt>{t("analysis.comparisonRankOtherLabel")}</dt>
          <dd>{foreignRank ?? t("analysis.comparisonNotStored")}</dd>
        </div>
      </dl>
      <code>{principalVariationLabel(best?.uciMoves)}</code>
    </section>
  );
}

export default function AnalysisComparisonDialog({
  runs,
  onClose,
  onSelectPly,
  onRunsChanged,
  moves,
  boardOrientation,
  analysisGameMetadata,
  analysisStandardStartingPosition,
}: AnalysisComparisonDialogProps) {
  const { t } = useI18n();
  const initialSelection = initialComparisonRunSelection(runs);
  const [leftId, setLeftId] = useState(initialSelection.leftId);
  const [rightId, setRightId] = useState(initialSelection.rightId);
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

  useEffect(() => {
    if (!leftId) return;
    let cancelled = false;
    void activateGameAnalysisRun(leftId)
      .then(() => {
        if (!cancelled) onRunsChanged();
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => { cancelled = true; };
  }, [leftId, onRunsChanged]);

  const differences = useMemo(
    () => comparison?.positions.filter((position) => isAnalysisDifference(position, filter)) ?? [],
    [comparison, filter],
  );
  const selected = comparison?.positions.find((position) => position.ply === selectedPly)
    ?? differences[0]
    ?? null;
  const initialPosition = comparisonInitialPosition(
    analysisGameMetadata,
    analysisStandardStartingPosition,
  );
  const startLabel = t("analysis.comparisonStartPosition");

  function choosePosition(position: AnalysisPositionComparison) {
    setSelectedPly(position.ply);
    onSelectPly(position.ply);
  }

  function chooseLeftRun(nextLeftId: number) {
    const next = selectComparisonLeftRun(runs, nextLeftId, rightId);
    setLeftId(next.leftId);
    setRightId(next.rightId);
  }

  const selectedMove = selected
    ? comparisonMoveDisplay(moves, selected.ply, initialPosition, startLabel)
    : null;

  return (
    <div className="analysis-comparison-dialog" role="dialog" aria-modal="true" aria-labelledby="analysis-comparison-title">
      <div className="analysis-comparison-content">
        <header>
          <h2 id="analysis-comparison-title">{t("analysis.comparisonTitle")}</h2>
          <button type="button" onClick={onClose} aria-label={t("common.close")}>×</button>
        </header>

        <div className="analysis-comparison-selectors">
          <label>
            <span>A <small>{t("analysis.comparisonActive")}</small></span>
            <select value={leftId} onChange={(event) => chooseLeftRun(Number(event.target.value))}>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {runLabel(run)} · {run.requestedDepth > 0
                    ? t("analysis.comparisonDepth", { depth: run.requestedDepth })
                    : t("analysis.comparisonMoveTime", { seconds: run.moveTimeSeconds })}
                </option>
              ))}
            </select>
          </label>
          <label>
            B
            <select value={rightId} onChange={(event) => setRightId(Number(event.target.value))}>
              {runs
                .filter((run) => run.id !== leftId)
                .map((run) => (
                  <option key={run.id} value={run.id}>
                    {runLabel(run)} · {run.requestedDepth > 0
                      ? t("analysis.comparisonDepth", { depth: run.requestedDepth })
                      : t("analysis.comparisonMoveTime", { seconds: run.moveTimeSeconds })}
                  </option>
                ))}
            </select>
          </label>
        </div>

        {comparison && (
          <>
            <div className="analysis-comparison-legend">
              <span className="left">A · {comparison.left.profileName}</span>
              <span className="right">B · {comparison.right.profileName}</span>
            </div>
            <AnalysisComparisonChart
              positions={comparison.positions}
              selectedPly={selected?.ply ?? null}
              labelForPly={(ply) => comparisonMoveDisplay(
                moves,
                ply,
                initialPosition,
                startLabel,
              ).label}
              ariaLabel={t("analysis.comparisonChartAria")}
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
                    <strong>{comparisonMoveDisplay(
                      moves,
                      position.ply,
                      initialPosition,
                      startLabel,
                    ).label}</strong>
                    <span>Δ {position.normalizedScoreGap.toFixed(2)}</span>
                  </button>
                ))}
                {differences.length === 0 && <p>{t("analysis.comparisonNoDifferences")}</p>}
              </div>

              {selected && (
                <div className="analysis-comparison-detail">
                  {selectedMove?.position && (
                    <div className="analysis-comparison-board-wrap">
                      <strong>{selectedMove.label}</strong>
                      <AnalysisStaticBoard
                        position={selectedMove.position}
                        orientation={boardOrientation}
                        highlightedMove={selectedMove.uci && selectedMove.uci.length >= 4
                          ? { from: selectedMove.uci.slice(0, 2), to: selectedMove.uci.slice(2, 4) }
                          : null}
                        className="analysis-comparison-board"
                      />
                    </div>
                  )}
                  <div className="analysis-comparison-sides">
                    <PositionSide title={`A · ${comparison.left.profileName}`} position={selected.left} foreignRank={selected.leftBestMoveRankOnRight} />
                    <PositionSide title={`B · ${comparison.right.profileName}`} position={selected.right} foreignRank={selected.rightBestMoveRankOnLeft} />
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
