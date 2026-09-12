import type { MouseEvent } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { MoveAnnotation, MoveRow } from "../types";
import PgnImportProblemDialog, { isPgnImportProblem } from "./PgnImportProblemDialog";

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
}

interface MovePanelActions {
  showPreview: (event: MouseEvent<HTMLElement>, position: string | undefined) => void;
  movePreview: (event: MouseEvent<HTMLElement>) => void;
  hidePreview: () => void;
  showAnnotationTooltip: (text: string) => void;
  hideAnnotationTooltip: () => void;
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
  const { t, locale } = useI18n();
  const pgnImportProblem = isPgnImportProblem(state.error);

  function formatAnnotationNumber(value: number): string {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatAnnotationEvaluation(value: number): string {
    const formatted = formatAnnotationNumber(Math.abs(value));
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
  }

  function getAnnotationTitle(annotation: MoveAnnotation): string {
    if (annotation.kind === "extraordinary") {
      const values = {
        earlyDepth: annotation.earlyDepth ?? 0,
        finalDepth: annotation.finalDepth ?? 0,
        material: formatAnnotationNumber(annotation.materialInvestment ?? 0),
        earlyStrength: formatAnnotationNumber(annotation.earlyStrength ?? 0),
        finalStrength: formatAnnotationNumber(annotation.finalStrength ?? 0),
      };

      if (
        annotation.extraordinaryReason ===
          "deepDiscoveryAndMaterialSacrifice"
      ) {
        return `${annotation.symbol} · ${t(
          "analysis.moveAnnotationExtraordinaryCombined",
          values
        )}`;
      }

      if (annotation.extraordinaryReason === "materialSacrifice") {
        const key =
          annotation.sacrificeType === "activeInvestment"
            ? "analysis.moveAnnotationExtraordinaryActiveSacrifice"
            : annotation.sacrificeType === "newMaterialOffer"
              ? "analysis.moveAnnotationExtraordinaryMaterialOffer"
              : "analysis.moveAnnotationExtraordinaryDeclinedSave";

        return `${annotation.symbol} · ${t(key, values)}`;
      }

      if (annotation.extraordinaryReason === "deepDiscovery") {
        return `${annotation.symbol} · ${t(
          "analysis.moveAnnotationExtraordinaryDiscovery",
          values
        )}`;
      }
    }

    if (annotation.kind === "onlyMove" && annotation.secondBestEvaluation != null) {
      return `${annotation.symbol} · ${t("analysis.moveAnnotationOnlyMove", {
        best: formatAnnotationEvaluation(annotation.bestEvaluation),
        second: formatAnnotationEvaluation(annotation.secondBestEvaluation),
      })}`;
    }

    return `${annotation.symbol} · ${t("analysis.moveAnnotationLoss", {
      loss: formatAnnotationNumber(annotation.winChanceLoss ?? 0),
      best: formatAnnotationEvaluation(annotation.bestEvaluation),
    })}`;
  }

  function renderAnnotation(ply: number) {
    const annotation = state.annotations[ply];
    if (!annotation) return null;
    return (
      <span
        className={`move-annotation move-annotation-${annotation.kind}`}
        aria-label={getAnnotationTitle(annotation)}
        onMouseEnter={() => actions.showAnnotationTooltip(getAnnotationTitle(annotation))}
        onMouseLeave={actions.hideAnnotationTooltip}
      >
        {annotation.symbol}
      </span>
    );
  }

  return (
    <section className="moves-panel">
      <h2 className="panel-title">{t("moves.title")}</h2>

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
              {row.white ?? ""}{renderAnnotation((row.moveNumber - 1) * 2 + 1)}
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
              {row.black ?? ""}{renderAnnotation(row.moveNumber * 2)}
            </span>
          </div>
        ))}

        {(state.loadingMoves || state.computerThinking) && (
          <div className="moves-empty">
            {state.computerThinking ? t("moves.computerThinking") : t("moves.loading")}
          </div>
        )}
      </div>
    </section>
  );
}
