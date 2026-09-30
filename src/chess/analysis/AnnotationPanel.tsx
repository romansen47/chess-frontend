import { useMemo } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type {
  EngineLine,
  GameAnnotation,
  MoveAnnotation,
  PgnNagSymbol,
} from "../types";
import "./annotationPanel.css";
import AnnotationComment from "./AnnotationComment";
import AnnotationTiming from "./AnnotationTiming";
import AnnotationNagPicker from "./AnnotationNagPicker";

interface AnnotationPanelProps {
  selectedPly: number | null;
  selectedSan: string | null;
  annotation: GameAnnotation | null;
  catAnnotation: MoveAnnotation | null;
  currentEvaluation: number | null;
  alternatives: EngineLine[];
  dirty: boolean;
  saving: boolean;
  error: string | null;
  onChange: (annotation: GameAnnotation) => void;
}

function emptyAnnotation(
  ply: number,
  nag: PgnNagSymbol | null = null
): GameAnnotation {
  return {
    ply,
    nag,
    comment: null,
    evaluation: null,
    variations: [],
  };
}

function normalizeEngineLineForPgn(moves: string): string {
  return moves
    .replace(/[♔♚]/g, "K")
    .replace(/[♕♛]/g, "Q")
    .replace(/[♖♜]/g, "R")
    .replace(/[♗♝]/g, "B")
    .replace(/[♘♞]/g, "N")
    .replace(/0-0-0/g, "O-O-O")
    .replace(/0-0/g, "O-O")
    .trim();
}

function variationFromLine(line: EngineLine, ply: number): string {
  const moves = normalizeEngineLineForPgn(line.moves);
  if (!moves) return "";
  const moveNumber = Math.ceil(ply / 2);
  return ply % 2 === 1
    ? `${moveNumber}. ${moves}`
    : `${moveNumber}... ${moves}`;
}

function evaluationText(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(2);
}

function engineLineEvaluationText(line: EngineLine): string {
  if (line.mateDistance !== undefined && line.mateDistance !== null) {
    const sign = line.eval < 0 ? "-" : "";
    const distance = Math.abs(line.mateDistance);
    return distance > 0 ? `${sign}M${distance}` : `${sign}M`;
  }

  if (!Number.isFinite(line.eval)) return "—";
  return line.eval > 0 ? `+${line.eval.toFixed(2)}` : line.eval.toFixed(2);
}

function isPlayedLine(line: EngineLine, selectedSan: string | null): boolean {
  if (!selectedSan) return false;
  const firstMove = normalizeEngineLineForPgn(line.moves).split(/\s+/)[0] ?? "";
  return firstMove === normalizeEngineLineForPgn(selectedSan);
}

export default function AnnotationPanel({
  selectedPly,
  selectedSan,
  annotation,
  catAnnotation,
  currentEvaluation,
  alternatives,
  dirty,
  saving,
  error,
  onChange,
}: AnnotationPanelProps) {
  const { t } = useI18n();

  const value = useMemo(() => {
    if (selectedPly == null) return null;
    return annotation ?? emptyAnnotation(selectedPly);
  }, [annotation, selectedPly]);

  if (selectedPly == null || value == null) {
    return (
      <div className="annotation-panel-placeholder">
        {t("annotations.selectMove")}
      </div>
    );
  }

  function update(patch: Partial<GameAnnotation>) {
    onChange({ ...value!, ...patch, ply: selectedPly! });
  }

  function addVariation(line: EngineLine) {
    const variation = variationFromLine(line, selectedPly!);
    if (!variation || value!.variations.includes(variation)) return;
    update({ variations: [...value!.variations, variation] });
  }

  return (
    <div className="annotation-panel">
      <div className="annotation-panel-heading">
        <div>
          <strong>{t("annotations.title")}</strong>
          <span>{selectedSan ? `${selectedPly}. ${selectedSan}` : `Ply ${selectedPly}`}</span>
        </div>
        {saving
          ? <span className="annotation-dirty">{t("annotations.saving")}</span>
          : dirty && <span className="annotation-dirty">{t("annotations.unsaved")}</span>}
      </div>

      <section className="annotation-section annotation-comment-editor">
        <div className="annotation-comment-editor-header">
          <span className="annotation-section-title">{t("annotations.comment")}</span>
          <AnnotationNagPicker
            value={value.nag}
            catAnnotation={catAnnotation}
            onChange={(nag) => update({ nag })}
          />
        </div>
        <AnnotationComment
          comment={value.comment}
          hideTitle
          onChange={(comment) => update({ comment })}
        />
        <div className="annotation-evaluation-inline">
          <span className="annotation-evaluation-label">{t("annotations.evaluation")}</span>
          <output
            className={[
              "annotation-evaluation-value",
              value.evaluation ? "" : "annotation-evaluation-value-empty",
            ].filter(Boolean).join(" ")}
          >
            {value.evaluation ?? "—"}
          </output>
          <button
            type="button"
            className="annotation-evaluation-action"
            disabled={currentEvaluation == null}
            onClick={() => currentEvaluation != null
              && update({ evaluation: evaluationText(currentEvaluation) })}
          >
            {t("annotations.useCurrentEvaluation")}
          </button>
          {value.evaluation && (
            <button
              type="button"
              className="annotation-icon-button annotation-evaluation-clear"
              aria-label={t("common.delete")}
              title={t("common.delete")}
              onClick={() => update({ evaluation: null })}
            >
              ×
            </button>
          )}
        </div>
      </section>
      <AnnotationTiming annotation={value} />

      <section className="annotation-section">
        <div className="annotation-section-title">{t("annotations.savedVariations")}</div>
        {value.variations.length === 0 && (
          <div className="annotation-muted">{t("annotations.noVariations")}</div>
        )}
        <div className="annotation-variation-list">
          {value.variations.map((variation, index) => (
            <div className="annotation-variation-row" key={`${index}-${variation}`}>
              <span className="annotation-variation-index">{index + 1}.</span>
              <code>{variation}</code>
              <button
                type="button"
                className="annotation-icon-button"
                aria-label={t("common.delete")}
                title={t("common.delete")}
                onClick={() => update({
                  variations: value.variations.filter((_, candidate) => candidate !== index),
                })}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="annotation-section">
        <div className="annotation-section-title">{t("annotations.engineAlternatives")}</div>
        {alternatives.length === 0 && (
          <div className="annotation-muted">{t("annotations.noEngineAlternatives")}</div>
        )}
        <div className="annotation-engine-list">
          {alternatives.map((line, index) => {
            const variation = variationFromLine(line, selectedPly);
            const alreadyStored = variation !== "" && value.variations.includes(variation);
            const played = isPlayedLine(line, selectedSan);
            const evaluation = engineLineEvaluationText(line);
            return (
              <div className="annotation-engine-row" key={`${index}-${line.depth}-${line.moves}`}>
                <strong>#{index + 1}</strong>
                <span className="annotation-engine-moves">{line.moves || "—"}</span>
                <span className="annotation-engine-meta">
                  {t("annotations.engineLineMeta", { evaluation, depth: line.depth })}
                </span>
                {played ? (
                  <span className="annotation-engine-played">{t("annotations.played")}</span>
                ) : (
                  <button
                    type="button"
                    className="annotation-icon-button"
                    disabled={!variation || alreadyStored}
                    aria-label={alreadyStored ? t("annotations.added") : t("annotations.addVariation")}
                    title={alreadyStored ? t("annotations.added") : t("annotations.addVariation")}
                    onClick={() => addVariation(line)}
                  >
                    {alreadyStored ? "✓" : "+"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {error && <div className="annotation-error">{error}</div>}


    </div>
  );
}
