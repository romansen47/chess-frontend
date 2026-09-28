import type { MouseEvent } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { useMoveAnnotationTooltip } from "../analysis/useMoveAnnotationTooltip";
import type { GameAnnotation, MoveAnnotation, MoveRow } from "../types";
import PgnImportProblemDialog, { isPgnImportProblem } from "./PgnImportProblemDialog";
import "./MovePanel.css";
import "../analysis/annotationPanel.css";
import AnnotationComment from "../analysis/AnnotationComment";
import AnnotationTiming from "../analysis/AnnotationTiming";
import { getAnalysisMoveSelectionForPly } from "../analysis/analysisSelectionUtils";

interface MovePanelState {
  moves: MoveRow[];
  whitePlayerName: string;
  blackPlayerName: string;
  whiteActive: boolean;
  blackActive: boolean;
  selectedPly: number | null;
  loadingMoves: boolean;
  computerThinking: boolean;
  error: string | null;
  annotations: Record<number, MoveAnnotation>;
  storedAnnotations: Record<number, GameAnnotation>;
}

interface MovePanelActions {
  showPreview: (event: MouseEvent<HTMLElement>, position: string | undefined) => void;
  movePreview: (event: MouseEvent<HTMLElement>) => void;
  hidePreview: () => void;
  showAnnotationTooltip: (text: string) => void;
  hideAnnotationTooltip: () => void;
  flipBoard: () => void;
  selectPosition: (
    position: string | undefined,
    san: string | undefined,
    ply: number
  ) => void;
}

interface MovePanelProps {
  state: MovePanelState;
  actions: MovePanelActions;
}

export default function MovePanel({ state, actions }: MovePanelProps) {
  const { t } = useI18n();
  const getAnnotationTitle = useMoveAnnotationTooltip();
  const pgnImportProblem = isPgnImportProblem(state.error);
  const selected = state.selectedPly == null ? null : getAnalysisMoveSelectionForPly(state.moves, state.selectedPly);
  const stored = state.selectedPly == null ? null : state.storedAnnotations[state.selectedPly];

  function renderAnnotations(ply: number) {
    const stored = state.storedAnnotations[ply];
    const automatic = state.annotations[ply];

    if (!automatic && !stored?.nag) return null;

    return (
      <span className="move-annotation-group">
        {automatic && (
          <span
            className={`move-annotation move-annotation-${automatic.kind}`}
            aria-label={getAnnotationTitle(automatic)}
            onMouseEnter={() => actions.showAnnotationTooltip(getAnnotationTitle(automatic))}
            onMouseLeave={actions.hideAnnotationTooltip}
          >
            {automatic.symbol}
          </span>
        )}
        {stored?.nag && (
          <span
            className="move-annotation move-annotation-saved"
            aria-label={`${stored.nag} · ${t("annotations.savedAnnotation")}`}
            onMouseEnter={() => actions.showAnnotationTooltip(
              `${stored.nag} · ${t("annotations.savedAnnotation")}`
            )}
            onMouseLeave={actions.hideAnnotationTooltip}
          >
            {stored.nag}
          </span>
        )}
      </span>
    );
  }

  function renderStoredIndicators(ply: number) {
    const stored = state.storedAnnotations[ply];
    if (!stored) return null;
    const hasComment = Boolean(stored.comment?.trim());
    const variationCount = stored.variations?.length ?? 0;
    if (!hasComment && variationCount === 0) return null;

    return (
      <span className="move-stored-indicators" aria-hidden="true">
        {hasComment && <span title={t("annotations.comment")}>C</span>}
        {variationCount > 0 && (
          <span title={t("annotations.savedVariations")}>V{variationCount}</span>
        )}
      </span>
    );
  }

  return (
    <section className="moves-panel">
      <div className="moves-panel-header">
        <h2 className="panel-title">{t("moves.title")}</h2>
        <button
          type="button"
          className="moves-board-flip-button"
          onClick={actions.flipBoard}
          title={t("board.flip")}
          aria-label={t("board.flip")}
        >
          ↻
        </button>
      </div>

      <div className="player-names-panel">
        <div
          className={[
            "player-name-row",
            "player-name-row-white",
            state.whiteActive ? "player-name-row-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          title={state.whitePlayerName}
        >
          <span className="player-name-color">{t("common.white")}</span>
          <span className="player-name-value">{state.whitePlayerName}</span>
        </div>

        <div
          className={[
            "player-name-row",
            "player-name-row-black",
            state.blackActive ? "player-name-row-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          title={state.blackPlayerName}
        >
          <span className="player-name-color">{t("common.black")}</span>
          <span className="player-name-value">{state.blackPlayerName}</span>
        </div>
      </div>

      {state.error && !pgnImportProblem && (
        <div className="moves-error-banner" role="alert">
          {t("moves.error", { message: state.error })}
        </div>
      )}

      {state.error && pgnImportProblem && (
        <PgnImportProblemDialog key={state.error} error={state.error} />
      )}

      <div className="moves-list">
        {state.moves.length === 0 && (
          <div className="moves-empty">{t("moves.empty")}</div>
        )}

        {state.moves.map((row) => (
          <div key={row.moveNumber} className="move-row">
            <span className="move-number">{row.moveNumber}.</span>
            <span
              className={[
                "move-entry",
                "move-entry-white",
                row.whitePosition ? "move-entry-previewable" : "",
                state.selectedPly === (row.moveNumber - 1) * 2 + 1
                  ? "move-entry-analysis-selected"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={(event) => actions.showPreview(event, row.whitePosition)}
              onMouseMove={actions.movePreview}
              onMouseLeave={actions.hidePreview}
              onClick={() =>
                actions.selectPosition(
                  row.whitePosition,
                  row.white,
                  (row.moveNumber - 1) * 2 + 1
                )
              }
            >
              {row.white ?? ""}{renderAnnotations((row.moveNumber - 1) * 2 + 1)}
              {renderStoredIndicators((row.moveNumber - 1) * 2 + 1)}
            </span>
            <span
              className={[
                "move-entry",
                "move-entry-black",
                row.blackPosition ? "move-entry-previewable" : "",
                state.selectedPly === row.moveNumber * 2
                  ? "move-entry-analysis-selected"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={(event) => actions.showPreview(event, row.blackPosition)}
              onMouseMove={actions.movePreview}
              onMouseLeave={actions.hidePreview}
              onClick={() =>
                actions.selectPosition(
                  row.blackPosition,
                  row.black,
                  row.moveNumber * 2
                )
              }
            >
              {row.black ?? ""}{renderAnnotations(row.moveNumber * 2)}
              {renderStoredIndicators(row.moveNumber * 2)}
            </span>
          </div>
        ))}

        {(state.loadingMoves || state.computerThinking) && (
          <div className="moves-empty">
            {state.computerThinking ? t("moves.computerThinking") : t("moves.loading")}
          </div>
        )}
      </div>
      <div className="mobile-move-comment">
        {state.selectedPly == null ? <p>{t("annotations.selectMove")}</p> : <>
          <div className="annotation-selected-move">
            {state.selectedPly === 0 ? t("annotations.introduction")
              : `${Math.ceil(state.selectedPly / 2)}${state.selectedPly % 2 ? "." : "..."} ${selected?.san ?? ""}`}
          </div>
          <AnnotationComment comment={stored?.comment} />
          <AnnotationTiming annotation={stored} />
        </>}
      </div>
    </section>
  );
}
