import { useI18n } from "../../i18n/I18nProvider";
import type { MoveAnnotation, PgnNagSymbol } from "../types";

interface Props {
  value: PgnNagSymbol | null;
  catAnnotation?: MoveAnnotation | null;
  onChange: (nag: PgnNagSymbol | null) => void;
  disabled?: boolean;
}

const NAGS: PgnNagSymbol[] = ["!!", "!", "!?", "?!", "?", "??"];

/** Compact shared PGN annotation picker used by desktop and mobile editors. */
export default function AnnotationNagPicker({
  value,
  catAnnotation,
  onChange,
  disabled = false,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="annotation-rating-inline">
      <div
        className="annotation-nag-grid"
        role="group"
        aria-label={t("annotations.moveAnnotation")}
      >
        {NAGS.map((nag) => {
          const active = value === nag;
          const suggested = catAnnotation?.symbol === nag;
          return (
            <button
              type="button"
              key={nag}
              className={[
                "annotation-nag-button",
                active ? "annotation-nag-active" : "",
                suggested ? "annotation-nag-suggested" : "",
              ].filter(Boolean).join(" ")}
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onChange(active ? null : nag)}
              title={suggested
                ? `${nag} · ${t("annotations.catAssessment")}`
                : nag}
            >
              {nag}
            </button>
          );
        })}
      </div>
      <span className="annotation-cat-badge">
        {t("annotations.catAssessment")}:{" "}
        <strong>{catAnnotation?.symbol ?? "–"}</strong>
      </span>
    </div>
  );
}
