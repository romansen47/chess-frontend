import { useI18n } from "../../i18n/I18nProvider";

interface Props {
  comment: string | null | undefined;
  disabled?: boolean;
  hideTitle?: boolean;
  rows?: number;
  onChange?: (comment: string | null) => void;
}

/** Shared comment field for the desktop editor and mobile editor. */
export default function AnnotationComment({
  comment,
  onChange,
  disabled,
  hideTitle = false,
  rows = 3,
}: Props) {
  const { t } = useI18n();
  return <section className="annotation-section annotation-comment-section">
    {onChange ? <label className="annotation-field">
      <span className={hideTitle ? "annotation-visually-hidden" : "annotation-section-title"}>
        {t("annotations.comment")}
      </span>
      <textarea value={comment ?? ""} rows={rows} disabled={disabled}
        aria-label={t("annotations.comment")}
        placeholder={t("annotations.commentPlaceholder")}
        onChange={(event) => onChange(event.target.value || null)} />
    </label> : <>
      {!hideTitle && <strong className="annotation-section-title">{t("annotations.comment")}</strong>}
      <p className="annotation-comment-text">{comment?.trim() ? comment : t("annotations.noComment")}</p>
    </>}
  </section>;
}
