import { useMemo } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type {
  EngineLine,
  GameAnnotation,
  MoveAnnotation,
  PgnNagSymbol,
} from "../types";
import "./annotationPanel.css";

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
  onSave: () => void;
}

const NAGS: Array<PgnNagSymbol | null> = ["!!", "!", "!?", "?!", "?", "??", null];

function emptyAnnotation(ply: number): GameAnnotation {
  return {
    ply,
    nag: null,
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
  onSave,
}: AnnotationPanelProps) {
  const { t } = useI18n();

  const value = useMemo(
    () => selectedPly == null ? null : annotation ?? emptyAnnotation(selectedPly),
    [annotation, selectedPly]
  );

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
        {dirty && <span className="annotation-dirty">{t("annotations.unsaved")}</span>}
      </div>

      <section className="annotation-section">
        <div className="annotation-section-title">{t("annotations.catAssessment")}</div>
        <div className="annotation-cat-row">
          <span className="annotation-cat-value">
            {catAnnotation?.symbol ?? t("annotations.none")}
          </span>
          {catAnnotation && value.nag !== catAnnotation.symbol && (
            <button type="button" onClick={() => update({ nag: catAnnotation.symbol })}>
              {t("annotations.addToGame")}
            </button>
          )}
        </div>
      </section>

      <section className="annotation-section">
        <div className="annotation-section-title">{t("annotations.moveAnnotation")}</div>
        <div className="annotation-nag-grid">
          {NAGS.map((nag) => (
            <button
              type="button"
              key={nag ?? "none"}
              className={value.nag === nag ? "annotation-nag-active" : ""}
              onClick={() => update({ nag })}
            >
              {nag ?? "–"}
            </button>
          ))}
        </div>
      </section>

      <section className="annotation-section">
        <label className="annotation-field">
          <span className="annotation-section-title">{t("annotations.comment")}</span>
          <textarea
            value={value.comment ?? ""}
            rows={4}
            placeholder={t("annotations.commentPlaceholder")}
            onChange={(event) => update({ comment: event.target.value || null })}
          />
        </label>
      </section>

      <section className="annotation-section">
        <div className="annotation-section-title">{t("annotations.evaluation")}</div>
        <div className="annotation-evaluation-row">
          <input value={value.evaluation ?? ""} readOnly placeholder="—" />
          <button
            type="button"
            disabled={currentEvaluation == null}
            onClick={() => currentEvaluation != null
              && update({ evaluation: evaluationText(currentEvaluation) })}
          >
            {t("annotations.useCurrentEvaluation")}
          </button>
          {value.evaluation && (
            <button type="button" onClick={() => update({ evaluation: null })}>
              {t("common.delete")}
            </button>
          )}
        </div>
      </section>

      <section className="annotation-section">
        <div className="annotation-section-title">{t("annotations.savedVariations")}</div>
        {value.variations.length === 0 && (
          <div className="annotation-muted">{t("annotations.noVariations")}</div>
        )}
        {value.variations.map((variation, index) => (
          <div className="annotation-variation" key={`${index}-${variation}`}>
            <code>{variation}</code>
            <button
              type="button"
              onClick={() => update({
                variations: value.variations.filter((_, candidate) => candidate !== index),
              })}
            >
              {t("common.delete")}
            </button>
          </div>
        ))}
      </section>

      <section className="annotation-section">
        <div className="annotation-section-title">{t("annotations.engineAlternatives")}</div>
        {alternatives.length === 0 && (
          <div className="annotation-muted">{t("annotations.noEngineAlternatives")}</div>
        )}
        {alternatives.map((line, index) => {
          const variation = variationFromLine(line, selectedPly);
          const alreadyStored = variation !== "" && value.variations.includes(variation);
          return (
            <div className="annotation-engine-line" key={`${index}-${line.depth}-${line.moves}`}>
              <div>
                <strong>#{index + 1}</strong>
                <span>{line.moves || "—"}</span>
              </div>
              <button
                type="button"
                disabled={!variation || alreadyStored}
                onClick={() => addVariation(line)}
              >
                {alreadyStored ? t("annotations.added") : t("annotations.addVariation")}
              </button>
            </div>
          );
        })}
      </section>

      {error && <div className="annotation-error">{error}</div>}

      <div className="annotation-actions">
        <button type="button" onClick={onSave} disabled={!dirty || saving}>
          {saving ? t("annotations.saving") : t("annotations.saveChanges")}
        </button>
      </div>
    </div>
  );
}
