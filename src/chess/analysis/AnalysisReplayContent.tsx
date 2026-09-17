import AnalysisDatabasePanel from "../../AnalysisDatabasePanel";
import { useI18n } from "../../i18n/I18nProvider";
import type {
  AnalysisPositionSelection,
  AnalysisProfilePoint,
  EngineEvaluation,
  GameAnnotation,
  MoveAnnotation,
  MoveRow,
} from "../types";
import type { BoardOrientation } from "../board/boardOrientation";
import { positionIndexForDisplayCell } from "../board/boardOrientation";
import {
  getPieceSymbolFromPositionChar,
  isWhitePositionPiece,
} from "../board/positionUtils";
import {
  formatEngineLineScore,
  formatEngineScore,
} from "../engine/engineEvaluationUtils";
import {
  splitAnalysisMoveText,
} from "./analysisUtils";
import { getAnalysisMoveSelectionForPly, getEffectiveAnalysisLineIndex } from "./analysisSelectionUtils";
import AnalysisEngineTabs, { type AnalysisEngineView } from "./AnalysisEngineTabs";
import AnnotationPanel from "./AnnotationPanel";
import LiveEvaluationView from "./LiveEvaluationView";

export type AnalysisDetailsTab = "engine" | "database" | "annotations";

interface AnalysisReplayContentState {
  boardOrientation: BoardOrientation;
  analysisProfile: AnalysisProfilePoint[];
  analysisTotalPlies: number;
  analysisSelectedPosition: AnalysisPositionSelection | null;
  analysisReplayStatus: string | null;
  isAnalysisReplayRunning: boolean;
  analysisReplayError: string | null;
  analysisEvaluationError: string | null;
  moves: MoveRow[];
  analysisSelectedLineIndex: number | null;
  analysisLineAnimationIndex: number;
  analysisDetailsTab: AnalysisDetailsTab;
  engineEval: EngineEvaluation | null;
  analysisEvaluation: EngineEvaluation | null;
  analysisEvaluationEnabled: boolean;
  analysisVariationMoves: string[];
  analysisEngineView: AnalysisEngineView;
  evaluationKey: string | null;
  gameAnnotations: Record<number, GameAnnotation>;
  moveAnnotations: Record<number, MoveAnnotation>;
  annotationsDirty: boolean;
  annotationsSaving: boolean;
  annotationSaveError: string | null;
}

interface AnalysisReplayContentActions {
  selectPositionByPly: (ply: number) => void;
  cancelAnalysisReplay: () => void | Promise<void>;
  selectLine: (index: number) => void;
  setDetailsTab: (tab: AnalysisDetailsTab) => void;
  setEngineView: (view: AnalysisEngineView) => void;
  updateGameAnnotation: (annotation: GameAnnotation) => void;
  persistGameAnnotations: () => void | Promise<void>;
}

interface AnalysisReplayContentProps {
  state: AnalysisReplayContentState;
  actions: AnalysisReplayContentActions;
}

export default function AnalysisReplayContent({
  state,
  actions,
}: AnalysisReplayContentProps) {
  const { t } = useI18n();
  const {
    boardOrientation,
    analysisProfile,
    analysisTotalPlies,
    analysisSelectedPosition,
    analysisReplayStatus,
    isAnalysisReplayRunning,
    analysisReplayError,
    analysisEvaluationError,
    moves,
    analysisSelectedLineIndex,
    analysisLineAnimationIndex,
    analysisDetailsTab,
    engineEval,
    analysisEvaluation,
    analysisEvaluationEnabled,
    analysisVariationMoves,
    analysisEngineView,
    evaluationKey,
    gameAnnotations,
    moveAnnotations,
    annotationsDirty,
    annotationsSaving,
    annotationSaveError,
  } = state;

  function getSelectedAnalysisPoint(): AnalysisProfilePoint | undefined {
    if (!analysisSelectedPosition) return undefined;
    return analysisProfile.find(
      (point) => point.ply === analysisSelectedPosition.ply
    );
  }



  function renderAnalysisProfile() {
    const width = 860;
    const height = 560;
    const paddingX = 12;
    const paddingY = 18;
    const maxAbsEval = 5;
    const points = analysisProfile.length > 0
      ? analysisProfile
      : [{
          ply: 0,
          from: null,
          to: null,
          san: "Start",
          evaluation: 0,
          bar: 0.5,
          depth: 0,
        }];
    const analyzedPoints = points.filter((point) => point.ply > 0);
    const analyzedPointMap = new Map<number, AnalysisProfilePoint>(
      analyzedPoints.map((point) => [point.ply, point])
    );
    const totalPly = Math.max(
      1,
      analysisTotalPlies,
      analyzedPoints[analyzedPoints.length - 1]?.ply ?? 0
    );
    const toY = (evaluation: number) => {
      const clamped = Math.max(-maxAbsEval, Math.min(maxAbsEval, evaluation));
      const normalized = (maxAbsEval - clamped) / (maxAbsEval * 2);
      return paddingY + normalized * (height - paddingY * 2);
    };
    const zeroY = toY(0);
    const latest = analyzedPoints[analyzedPoints.length - 1] ?? points[points.length - 1];
    const slotWidth = (width - paddingX * 2) / totalPly;
    const chartPoints = Array.from(
      { length: totalPly },
      (_, index) => analyzedPointMap.get(index + 1) ?? {
        ply: index + 1,
        from: null,
        to: null,
        san: null,
        evaluation: 0,
        bar: 0.5,
        depth: 0,
      }
    );
    const formatEvaluation = (point: AnalysisProfilePoint) => {
      const san = point.san ? `${point.san} · ` : "";
      const depth = point.depth ? ` · depth ${point.depth}` : "";
      return `Ply ${point.ply} · ${san}${formatEngineScore(point.evaluation)}${depth}`;
    };

    return (
      <div className="analysis-profile-panel">
        <div className="analysis-profile-header">
          <strong>{t("analysis.history")}</strong>
          <span>
            {latest?.ply ?? 0} plies · {formatEngineScore(latest?.evaluation ?? 0)}
            {latest?.depth ? ` · depth ${latest.depth}` : ""}
          </span>
        </div>
        <svg
          className="analysis-profile-chart"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Evaluation history of the analyzed game"
        >
          <line
            className="analysis-profile-zero-line"
            x1={paddingX}
            y1={zeroY}
            x2={width - paddingX}
            y2={zeroY}
          />
          {chartPoints.map((point) => {
            const x = paddingX + (point.ply - 1) * slotWidth;
            const y = toY(point.evaluation);
            const top = Math.min(y, zeroY);
            const barHeight = Math.max(1.5, Math.abs(zeroY - y));
            const isPositive = point.evaluation > 0;
            const isLatest = point.ply === latest?.ply;
            const isSelected = point.ply === analysisSelectedPosition?.ply;
            const hasMoveSelection = Boolean(
              getAnalysisMoveSelectionForPly(moves, point.ply)?.position
            );

            return (
              <rect
                key={point.ply}
                className={`analysis-profile-bar ${isPositive ? "analysis-profile-bar-positive" : "analysis-profile-bar-negative"}${isLatest ? " analysis-profile-bar-latest" : ""}${isSelected ? " analysis-profile-bar-selected" : ""}${hasMoveSelection ? " analysis-profile-bar-clickable" : ""}`}
                x={x}
                y={top}
                width={slotWidth}
                height={barHeight}
                rx={0}
                role={hasMoveSelection ? "button" : undefined}
                tabIndex={hasMoveSelection ? 0 : undefined}
                onClick={hasMoveSelection
                  ? () => actions.selectPositionByPly(point.ply)
                  : undefined}
                onKeyDown={hasMoveSelection
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        actions.selectPositionByPly(point.ply);
                      }
                    }
                  : undefined}
              >
                <title>{formatEvaluation(point)}</title>
              </rect>
            );
          })}
        </svg>
        <div className="analysis-profile-footer">
          <span>{analysisReplayStatus ?? t("analysis.mode")}</span>
          {isAnalysisReplayRunning && (
            <button
              className="analysis-cancel-button"
              onClick={() => void actions.cancelAnalysisReplay()}
            >
              Cancel
            </button>
          )}
        </div>
        {analysisReplayError && (
          <div className="analysis-profile-error">{analysisReplayError}</div>
        )}
        {analysisEvaluationError && (
          <div className="analysis-profile-error">{analysisEvaluationError}</div>
        )}
      </div>
    );
  }

  function getHighlightedAnalysisMoveIndex(
    positions: string[] | undefined,
    isSelected: boolean
  ): number {
    if (!isSelected || !positions || positions.length <= 1) return -1;
    const currentPositionIndex = analysisLineAnimationIndex % positions.length;
    return currentPositionIndex > 0 ? currentPositionIndex - 1 : -1;
  }

  function renderAnalysisLineMoves(
    movesText: string,
    positions: string[] | undefined,
    isSelected: boolean
  ) {
    const lineMoves = splitAnalysisMoveText(movesText);
    if (lineMoves.length === 0) return "—";
    const highlightedMoveIndex = getHighlightedAnalysisMoveIndex(
      positions,
      isSelected
    );

    return <>{lineMoves.map((move, moveIndex) => (
      <span
        key={`${moveIndex}-${move}`}
        className={moveIndex === highlightedMoveIndex
          ? "analysis-line-move analysis-line-move-current"
          : "analysis-line-move"}
      >
        {move}
      </span>
    ))}</>;
  }

  function getAnimatedAnalysisPosition(): string | null {
    const selectedPoint = getSelectedAnalysisPoint();
    const lines = selectedPoint?.lines ?? [];
    if (!analysisSelectedPosition) return null;
    if (analysisDetailsTab === "database" || lines.length === 0) {
      return analysisSelectedPosition.position;
    }
    const lineIndex = getEffectiveAnalysisLineIndex(selectedPoint, lines, analysisSelectedLineIndex);
    const positions = lines[lineIndex]?.positions ?? [];
    if (positions.length === 0) return analysisSelectedPosition.position;
    return positions[analysisLineAnimationIndex % positions.length]
      ?? analysisSelectedPosition.position;
  }

  function renderAnalysisPositionBoard() {
    const animatedPosition = getAnimatedAnalysisPosition();
    if (!animatedPosition) {
      return (
        <div className="analysis-detail-placeholder">
          {t("analysis.clickMoveContinuation")}
        </div>
      );
    }

    const squares = Array.from({ length: 64 }, (_, index) => {
      const rankFromTop = Math.floor(index / 8);
      const fileFromLeft = index % 8;
      const positionIndex = positionIndexForDisplayCell(
        rankFromTop,
        fileFromLeft,
        boardOrientation
      );
      const pieceChar = animatedPosition.charAt(positionIndex);
      const pieceSymbol = getPieceSymbolFromPositionChar(pieceChar);
      const isLight = (rankFromTop + fileFromLeft) % 2 === 0;

      return (
        <div
          key={index}
          className={[
            "analysis-position-square",
            isLight ? "analysis-position-square-light" : "analysis-position-square-dark",
          ].join(" ")}
        >
          {pieceSymbol && (
            <span
              className={[
                "analysis-position-piece",
                isWhitePositionPiece(pieceChar)
                  ? "analysis-position-piece-white"
                  : "analysis-position-piece-black",
              ].join(" ")}
            >
              {pieceSymbol}
            </span>
          )}
        </div>
      );
    });

    return <div className="analysis-position-board">{squares}</div>;
  }

  function renderAnalysisLinesForSelection() {
    if (!analysisSelectedPosition) {
      return (
        <div className="analysis-detail-placeholder">
          {t("analysis.selectMoveStoredVariations")}
        </div>
      );
    }

    const selectedPoint = getSelectedAnalysisPoint();
    if (!selectedPoint) {
      return (
        <div className="analysis-detail-placeholder">
          {t("analysis.noEvaluationPly")}
        </div>
      );
    }

    const lines = selectedPoint.lines ?? [];
    if (lines.length === 0) {
      return (
        <div className="analysis-detail-placeholder">
          {t("analysis.noEngineVariations")}
        </div>
      );
    }

    const effectiveLineIndex = getEffectiveAnalysisLineIndex(selectedPoint, lines, analysisSelectedLineIndex);
    return (
      <>
        <div className="engine-lines-summary">
          <span>{engineEval?.engineName || t("analysis.analysisEngine")}</span>
          <span>depth {lines[0].depth}</span>
        </div>
        <div className="analysis-lines-list">
          {lines.map((line, index) => {
            const isSelected = index === effectiveLineIndex;
            return (
              <button
                type="button"
                className={[
                  "analysis-line-card",
                  isSelected ? "analysis-line-card-selected" : "",
                ].filter(Boolean).join(" ")}
                key={`${index}-${line.moves}`}
                onClick={() => actions.selectLine(index)}
              >
                <div className="analysis-line-header">
                  <strong>#{index + 1}</strong>
                  <span>{formatEngineLineScore(line)}</span>
                </div>
                <div className="analysis-line-moves">
                  {renderAnalysisLineMoves(line.moves, line.positions, isSelected)}
                </div>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  function renderAnalysisSourceTabs() {
    const engineTabActive = analysisDetailsTab === "engine";
    const databaseTabActive = analysisDetailsTab === "database";
    const annotationsTabActive = analysisDetailsTab === "annotations";

    return (
      <div
        className="analysis-detail-tabs"
        role="tablist"
        aria-label={t("analysis.source")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={engineTabActive}
          className={[
            "analysis-detail-tab",
            engineTabActive ? "analysis-detail-tab-active" : "",
          ].filter(Boolean).join(" ")}
          onClick={() => actions.setDetailsTab("engine")}
        >
          {t("analysis.engineSource")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={databaseTabActive}
          className={[
            "analysis-detail-tab",
            databaseTabActive ? "analysis-detail-tab-active" : "",
          ].filter(Boolean).join(" ")}
          onClick={() => actions.setDetailsTab("database")}
        >
          {t("analysis.databaseSource")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={annotationsTabActive}
          className={[
            "analysis-detail-tab",
            annotationsTabActive ? "analysis-detail-tab-active" : "",
          ].filter(Boolean).join(" ")}
          onClick={() => actions.setDetailsTab("annotations")}
        >
          {t("annotations.title")}
        </button>
      </div>
    );
  }

  function renderAnalysisDetails() {
    const databaseTabActive = analysisDetailsTab === "database";
    return (
      <div className="analysis-detail-row">
        {!databaseTabActive && (
          <div className="analysis-position-panel">
            <div className="analysis-detail-title">
              {analysisSelectedPosition
                ? t("analysis.engineContinuationFrom", {
                    label: analysisSelectedPosition.label,
                  })
                : t("analysis.engineContinuation")}
            </div>
            {renderAnalysisPositionBoard()}
          </div>
        )}
        <div className="analysis-lines-panel">
          <div className="analysis-detail-title">
            {databaseTabActive
              ? t("analysis.databaseContinuations")
              : t("analysis.engineVariations")}
          </div>
          {databaseTabActive
            ? <AnalysisDatabasePanel ply={analysisSelectedPosition?.ply ?? null} />
            : renderAnalysisLinesForSelection()}
        </div>
      </div>
    );
  }

  function renderAnnotationDetails() {
    const ply = analysisSelectedPosition?.ply ?? null;
    const selectedPoint = ply == null
      ? null
      : analysisProfile.find((point) => point.ply === ply) ?? null;
    const previousPoint = ply == null
      ? null
      : analysisProfile.find((point) => point.ply === Math.max(0, ply - 1)) ?? null;
    const selection = ply == null
      ? null
      : getAnalysisMoveSelectionForPly(moves, ply);
    const currentEvaluation = analysisEvaluationEnabled
      && analysisVariationMoves.length === 0
      && analysisEvaluation
        ? analysisEvaluation.eval
        : selectedPoint?.evaluation ?? null;

    return (
      <div className="analysis-annotation-container">
        <AnnotationPanel
          selectedPly={ply}
          selectedSan={selection?.san ?? selectedPoint?.san ?? null}
          annotation={ply == null ? null : gameAnnotations[ply] ?? null}
          catAnnotation={ply == null ? null : moveAnnotations[ply] ?? null}
          currentEvaluation={currentEvaluation}
          alternatives={previousPoint?.lines ?? []}
          dirty={annotationsDirty}
          saving={annotationsSaving}
          error={annotationSaveError}
          onChange={actions.updateGameAnnotation}
          onSave={() => void actions.persistGameAnnotations()}
        />
      </div>
    );
  }

  const variationMode = analysisVariationMoves.length > 0;
  const liveViewActive = variationMode || analysisEngineView === "live";

  return (
    <div className="analysis-replay-content">
      {renderAnalysisProfile()}
      {!variationMode && renderAnalysisSourceTabs()}
      {variationMode ? (
        <>
          <AnalysisEngineTabs
            activeView="live"
            showDeepAnalysis={false}
            onChange={actions.setEngineView}
          />
          <LiveEvaluationView
            evaluation={analysisEvaluation}
            evaluationKey={evaluationKey}
            activePly={analysisSelectedPosition?.ply ?? null}
            variationMode
            deepAnalysisRunning={isAnalysisReplayRunning}
          />
        </>
      ) : analysisDetailsTab === "annotations" ? (
        renderAnnotationDetails()
      ) : analysisDetailsTab === "database" ? (
        renderAnalysisDetails()
      ) : (
        <>
          <AnalysisEngineTabs
            activeView={analysisEngineView}
            showDeepAnalysis
            onChange={actions.setEngineView}
          />
          {liveViewActive ? (
            <LiveEvaluationView
              evaluation={analysisEvaluation}
              evaluationKey={evaluationKey}
              activePly={analysisSelectedPosition?.ply ?? null}
              variationMode={false}
              deepAnalysisRunning={isAnalysisReplayRunning}
            />
          ) : renderAnalysisDetails()}
        </>
      )}
    </div>
  );
}
