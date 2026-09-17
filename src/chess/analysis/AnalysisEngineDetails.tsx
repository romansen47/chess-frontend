import AnalysisDatabasePanel from "../../AnalysisDatabasePanel";
import { useI18n } from "../../i18n/I18nProvider";
import { positionIndexForDisplayCell } from "../board/boardOrientation";
import { getPieceSymbolFromPositionChar, isWhitePositionPiece } from "../board/positionUtils";
import { formatEngineLineScore } from "../engine/engineEvaluationUtils";
import { splitAnalysisMoveText } from "./analysisUtils";
import { getEffectiveAnalysisLineIndex } from "./analysisSelectionUtils";
import type { AnalysisReplayContentActions, AnalysisReplayContentState } from "./analysisReplayViewTypes";

interface Props { state: AnalysisReplayContentState; actions: AnalysisReplayContentActions; }

export default function AnalysisEngineDetails({ state, actions }: Props) {
  const { t } = useI18n();
  const { analysisProfile, analysisSelectedPosition, analysisDetailsTab, analysisSelectedLineIndex,
    analysisLineAnimationIndex, engineEval, boardOrientation } = state;
  const selectedPoint = analysisSelectedPosition
    ? analysisProfile.find((point) => point.ply === analysisSelectedPosition.ply)
    : undefined;

  function animatedPosition(): string | null {
    const lines = selectedPoint?.lines ?? [];
    if (!analysisSelectedPosition) return null;
    if (analysisDetailsTab === "database" || lines.length === 0) return analysisSelectedPosition.position;
    const lineIndex = getEffectiveAnalysisLineIndex(selectedPoint, lines, analysisSelectedLineIndex);
    const positions = lines[lineIndex]?.positions ?? [];
    return positions.length > 0
      ? positions[analysisLineAnimationIndex % positions.length] ?? analysisSelectedPosition.position
      : analysisSelectedPosition.position;
  }

  function renderBoard() {
    const position = animatedPosition();
    if (!position) return <div className="analysis-detail-placeholder">{t("analysis.clickMoveContinuation")}</div>;
    const squares = Array.from({ length: 64 }, (_, index) => {
      const rank = Math.floor(index / 8);
      const file = index % 8;
      const positionIndex = positionIndexForDisplayCell(rank, file, boardOrientation);
      const pieceChar = position.charAt(positionIndex);
      const symbol = getPieceSymbolFromPositionChar(pieceChar);
      return (
        <div key={index} className={["analysis-position-square", (rank + file) % 2 === 0 ? "analysis-position-square-light" : "analysis-position-square-dark"].join(" ")}>
          {symbol && <span className={["analysis-position-piece", isWhitePositionPiece(pieceChar) ? "analysis-position-piece-white" : "analysis-position-piece-black"].join(" ")}>{symbol}</span>}
        </div>
      );
    });
    return <div className="analysis-position-board">{squares}</div>;
  }

  function renderMoves(movesText: string, positions: string[] | undefined, selected: boolean) {
    const moves = splitAnalysisMoveText(movesText);
    if (moves.length === 0) return "—";
    const current = selected && positions && positions.length > 1
      ? (analysisLineAnimationIndex % positions.length) - 1
      : -1;
    return <>{moves.map((move, index) => <span key={`${index}-${move}`} className={index === current ? "analysis-line-move analysis-line-move-current" : "analysis-line-move"}>{move}</span>)}</>;
  }

  function renderLines() {
    if (!analysisSelectedPosition) return <div className="analysis-detail-placeholder">{t("analysis.selectMoveStoredVariations")}</div>;
    if (!selectedPoint) return <div className="analysis-detail-placeholder">{t("analysis.noEvaluationPly")}</div>;
    const lines = selectedPoint.lines ?? [];
    if (lines.length === 0) return <div className="analysis-detail-placeholder">{t("analysis.noEngineVariations")}</div>;
    const selectedIndex = getEffectiveAnalysisLineIndex(selectedPoint, lines, analysisSelectedLineIndex);
    return <>
      <div className="engine-lines-summary"><span>{engineEval?.engineName || t("analysis.analysisEngine")}</span><span>depth {lines[0].depth}</span></div>
      <div className="analysis-lines-list">{lines.map((line, index) => {
        const selected = index === selectedIndex;
        return <button type="button" className={["analysis-line-card", selected ? "analysis-line-card-selected" : ""].filter(Boolean).join(" ")} key={`${index}-${line.moves}`} onClick={() => actions.selectLine(index)}>
          <div className="analysis-line-header"><strong>#{index + 1}</strong><span>{formatEngineLineScore(line)}</span></div>
          <div className="analysis-line-moves">{renderMoves(line.moves, line.positions, selected)}</div>
        </button>;
      })}</div>
    </>;
  }

  const database = analysisDetailsTab === "database";
  return <div className="analysis-detail-row">
    {!database && <div className="analysis-position-panel">
      <div className="analysis-detail-title">{analysisSelectedPosition ? t("analysis.engineContinuationFrom", { label: analysisSelectedPosition.label }) : t("analysis.engineContinuation")}</div>
      {renderBoard()}
    </div>}
    <div className="analysis-lines-panel">
      <div className="analysis-detail-title">{database ? t("analysis.databaseContinuations") : t("analysis.engineVariations")}</div>
      {database ? <AnalysisDatabasePanel ply={analysisSelectedPosition?.ply ?? null} /> : renderLines()}
    </div>
  </div>;
}
