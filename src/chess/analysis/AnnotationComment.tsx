import { useI18n } from "../../i18n/I18nProvider";

interface Props {
  comment: string | null | undefined;
  disabled?: boolean;
  onChange?: (comment: string | null) => void;
}

/** Shared comment field for the desktop editor and mobile editor. */
export default function AnnotationComment({ comment, onChange, disabled }: Props) {
  const { t } = useI18n();
  return <section className="annotation-section">
    {onChange ? <label className="annotation-field">
      <span className="annotation-section-title">{t("annotations.comment")}</span>
      <textarea value={comment ?? ""} rows={3} disabled={disabled}
        placeholder={t("annotations.commentPlaceholder")}
        onChange={(event) => onChange(event.target.value || null)} />
    </label> : <>
      <strong className="annotation-section-title">{t("annotations.comment")}</strong>
      <p className="annotation-comment-text">{comment?.trim() ? comment : t("annotations.noComment")}</p>
    </>}
  </section>;
}
