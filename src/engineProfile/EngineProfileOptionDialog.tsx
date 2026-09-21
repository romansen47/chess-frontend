import { useI18n } from "../i18n/I18nProvider";
import { optionHint, type ProfileOptionEditorState } from "./engineProfilePresentation";

interface Props {
  editor: ProfileOptionEditorState;
  onValueChange: (value: string) => void;
  onClose: () => void;
  onApply: () => void;
}

export default function EngineProfileOptionDialog({
  editor,
  onValueChange,
  onClose,
  onApply,
}: Props) {
  const { t } = useI18n();

  return (
    <div
      className="engine-config-option-popup-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className="engine-config-option-popup"
        role="dialog"
        aria-modal="true"
        aria-label={t("settings.editOption", { name: editor.name })}
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}
      >
        <div className="engine-config-option-popup-header">
          <div className="engine-config-option-popup-title">
            <strong>{editor.name}</strong>
            <div className="engine-config-option-popup-meta">
              <span className="engine-config-option-type">{editor.option.type}</span>
              <span>
                {optionHint(editor.option, {
                  defaultLabel: t("settings.optionDefault"),
                  minLabel: t("settings.optionMin"),
                  maxLabel: t("settings.optionMax"),
                  emptyLabel: t("settings.optionEmpty"),
                })}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("settings.closeEditor")}
          >
            ×
          </button>
        </div>

        <label className="engine-config-option-popup-editor">
          <span>{t("settings.profileValue")}</span>
          {editor.option.type === "check" ? (
            <span className="engine-config-option-popup-check">
              <input
                type="checkbox"
                checked={editor.value.toLowerCase() === "true"}
                onChange={(event) => onValueChange(event.target.checked ? "true" : "false")}
                autoFocus
              />
              <span>{editor.value.toLowerCase() === "true" ? "true" : "false"}</span>
            </span>
          ) : editor.option.type === "combo" ? (
            <select
              value={editor.value}
              onChange={(event) => onValueChange(event.target.value)}
              autoFocus
            >
              {(editor.option.vars ?? []).map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate}
                </option>
              ))}
            </select>
          ) : editor.option.type === "spin" ? (
            <div className="engine-config-option-popup-spin">
              <input
                className="engine-config-option-popup-spin-range"
                type="range"
                min={editor.option.min ?? 0}
                max={editor.option.max ?? 100}
                step={1}
                value={editor.value}
                onChange={(event) => onValueChange(event.target.value)}
              />
              <span className="engine-config-option-popup-spin-value">
                {editor.value}
              </span>
              <input
                className="engine-config-option-popup-spin-number"
                type="number"
                min={editor.option.min ?? undefined}
                max={editor.option.max ?? undefined}
                value={editor.value}
                onChange={(event) => onValueChange(event.target.value)}
                required
                autoFocus
              />
            </div>
          ) : (
            <input
              type="text"
              value={editor.value}
              onChange={(event) => onValueChange(event.target.value)}
              autoFocus
            />
          )}
        </label>

        <div className="engine-config-option-popup-actions">
          <button type="button" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit">{t("settings.apply")}</button>
        </div>
      </form>
    </div>
  );
}
