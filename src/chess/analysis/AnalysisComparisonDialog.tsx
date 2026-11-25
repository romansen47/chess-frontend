import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  activateGameAnalysisRun,
  compareGameAnalysisRuns,
} from "../api/analysisApi";
import { hydrateBrowserEngineLines } from "../api/browserLineDisplayApi";
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
  comparisonInitialFen,
  comparisonInitialPosition,
  comparisonMoveDisplay,
  comparisonMoveSan,
  comparisonUciHistory,
  engineEvaluationLabel,
  groupComparisonMoves,
  initialComparisonRunSelection,
  isAnalysisDifference,
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

function PositionSuggestions({
  label,
  profileName,
  position,
  moveLabels,
}: {
  label: string;
  profileName: string;
  position: StoredAnalysisPosition;
  moveLabels: readonly string[];
}) {
  const { t } = useI18n();
  const suggestions = position.lines.slice(0, 3);
  return (
    <section className="analysis-comparison-side">
      <header>
        <h3>{label} · {profileName}</h3>
        <span>{t("analysis.comparisonDepth", { depth: position.depth })}</span>
      </header>
      <div className="analysis-comparison-suggestion-head" aria-hidden="true">
        <span>{t("analysis.comparisonMove")}</span>
        <span>{t("analysis.comparisonEvaluation")}</span>
      </div>
      <ol className="analysis-comparison-suggestions" aria-label={t("analysis.comparisonSuggestions")}>
        {suggestions.map((suggestion, index) => (
          <li key={suggestion.rank}>
            <span className="analysis-comparison-suggestion-rank">{suggestion.rank}.</span>
            <span className="analysis-comparison-suggestion-move">
              {moveLabels[index] ?? "…"}
            </span>
            <strong>{engineEvaluationLabel(
              suggestion.evaluation,
              suggestion.mateDistance,
            )}</strong>
          </li>
        ))}
      </ol>
      {suggestions.length === 0 && (
        <p className="analysis-comparison-no-suggestions">
          {t("analysis.comparisonNoSuggestions")}
        </p>
      )}
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
  const startPosition = differences.find((position) => position.ply === 0);
  const movePairs = useMemo(() => groupComparisonMoves(differences), [differences]);
  const selected = comparison?.positions.find((position) => position.ply === selectedPly)
    ?? differences[0]
    ?? null;
  const initialPosition = comparisonInitialPosition(
    analysisGameMetadata,
    analysisStandardStartingPosition,
  );
  const startLabel = t("analysis.comparisonStartPosition");
  const [suggestionMoveLabels, setSuggestionMoveLabels] = useState<{
    left: string[];
    right: string[];
  }>({ left: [], right: [] });

  useEffect(() => {
    if (!selected) {
      setSuggestionMoveLabels({ left: [], right: [] });
      return;
    }
    let cancelled = false;
    const leftLines = selected.left.lines.slice(0, 3);
    const rightLines = selected.right.lines.slice(0, 3);
    const sourceLines = [...leftLines, ...rightLines];
    setSuggestionMoveLabels({ left: [], right: [] });
    void hydrateBrowserEngineLines(
      {
        initialFen: comparisonInitialFen(
          analysisGameMetadata,
          analysisStandardStartingPosition,
        ),
        uciMoves: comparisonUciHistory(moves, selected.ply),
      },
      sourceLines.map((line) => ({
        eval: line.evaluation,
        depth: line.depth,
        mateDistance: line.mateDistance,
        moves: line.uciMoves.join(" "),
      })),
    ).then((hydrated) => {
      if (cancelled) return;
      const labels = hydrated.map((line) => line.moves.trim().split(/\s+/, 1)[0] || "—");
      setSuggestionMoveLabels({
        left: labels.slice(0, leftLines.length),
        right: labels.slice(leftLines.length),
      });
    }).catch(() => {
      if (!cancelled) {
        setSuggestionMoveLabels({
          left: leftLines.map(() => "—"),
          right: rightLines.map(() => "—"),
        });
      }
    });
    return () => { cancelled = true; };
  }, [
    selected,
    moves,
    analysisGameMetadata,
    analysisStandardStartingPosition,
  ]);

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
  const selectedBoardPosition = selected?.ply === 0
    ? initialPosition
    : selectedMove?.position ?? null;
  const selectedUci = selectedMove?.uci ?? null;

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
                {startPosition && (
                  <button
                    type="button"
                    className={selected?.ply === 0 ? "analysis-comparison-start selected" : "analysis-comparison-start"}
                    onClick={() => choosePosition(startPosition)}
                  >
                    {startLabel}
                  </button>
                )}
                {movePairs.map((pair) => (
                  <div className="analysis-comparison-move-row" key={pair.moveNumber}>
                    <span className="analysis-comparison-move-number">{pair.moveNumber}.</span>
                    {[pair.white, pair.black].map((position, index) => position ? (
                      <button
                        type="button"
                        key={position.ply}
                        className={position.ply === selected?.ply ? "selected" : ""}
                        onClick={() => choosePosition(position)}
                      >
                        {comparisonMoveSan(moves, position.ply)}
                      </button>
                    ) : (
                      <span key={index} className="analysis-comparison-move-empty" />
                    ))}
                  </div>
                ))}
                {differences.length === 0 && <p>{t("analysis.comparisonNoDifferences")}</p>}
              </div>

              {selected && (
                <div className="analysis-comparison-detail">
                  {selectedBoardPosition && (
                    <div className="analysis-comparison-board-wrap">
                      <strong>{selectedMove?.label ?? startLabel}</strong>
                      <AnalysisStaticBoard
                        position={selectedBoardPosition}
                        orientation={boardOrientation}
                        highlightedMove={selectedUci && selectedUci.length >= 4
                          ? { from: selectedUci.slice(0, 2), to: selectedUci.slice(2, 4) }
                          : null}
                        className="analysis-comparison-board"
                      />
                    </div>
                  )}
                  <div className="analysis-comparison-sides">
                    <PositionSuggestions
                      label="A"
                      profileName={comparison.left.profileName}
                      position={selected.left}
                      moveLabels={suggestionMoveLabels.left}
                    />
                    <PositionSuggestions
                      label="B"
                      profileName={comparison.right.profileName}
                      position={selected.right}
                      moveLabels={suggestionMoveLabels.right}
                    />
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
