import type {
  EngineDefinition,
  EngineProfile,
  UciOptionConfig,
} from "../engineConfigTypes";
import { useI18n } from "../i18n/I18nProvider";
import { displayOptionValue, optionHint } from "./engineProfilePresentation";

interface Props {
  profileDraft: EngineProfile;
  profileEngine: EngineDefinition;
  creatingProfile: boolean;
  advancedOpen: boolean;
  optionFilter: string;
  visibleProfileOptions: Array<[string, UciOptionConfig]>;
  busy: boolean;
  isFallbackProfile: boolean;
  assignmentLabels: string[];
  assigned: boolean;
  onBack: () => void;
  onNameChange: (value: string) => void;
  onToggleAdvanced: () => void;
  onOptionFilterChange: (value: string) => void;
  onResetDefaults: () => void;
  onOpenOptionEditor: (name: string, option: UciOptionConfig) => void;
  onDelete: () => void;
  onSave: () => void;
}

export default function EngineProfileEditor({
  profileDraft,
  profileEngine,
  creatingProfile,
  advancedOpen,
  optionFilter,
  visibleProfileOptions,
  busy,
  isFallbackProfile,
  assignmentLabels,
  assigned,
  onBack,
  onNameChange,
  onToggleAdvanced,
  onOptionFilterChange,
  onResetDefaults,
  onOpenOptionEditor,
  onDelete,
  onSave,
}: Props) {
  const { t } = useI18n();

  return (
    <div
      className={[
        "engine-profile-editor-card",
        advancedOpen ? "engine-profile-advanced-open" : "",
      ].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        className="engine-profile-mobile-back"
        onClick={onBack}
        disabled={busy || !profileEngine.id}
      >
        ← {t("common.back")} · {profileEngine.name}
      </button>

      <div className="engine-config-details-heading">
        <div>
          <strong>
            {creatingProfile ? t("settings.newProfileTitle") : profileDraft.name}
          </strong>
          <span>
            {t("settings.profileBelongsToEngine", {
              engine: profileEngine.name,
            })}
          </span>
        </div>
        <div className="engine-config-heading-badges">
          {isFallbackProfile && (
            <span className="engine-config-chip">{t("settings.fallback")}</span>
          )}
          {assignmentLabels.map((label) => (
            <span
              className="engine-config-chip engine-config-chip-active"
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <label className="engine-profile-field engine-profile-name-field">
        <span>{t("settings.profileName")}</span>
        <input
          value={profileDraft.name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </label>

      <button
        type="button"
        className="engine-profile-advanced-toggle"
        onClick={onToggleAdvanced}
      >
        {advancedOpen
          ? t("settings.hideAdvancedOptions")
          : t("settings.showAdvancedOptions", {
              count: visibleProfileOptions.length,
            })}
      </button>

      <div className="engine-profile-options-header">
        <div>
          <strong>
            {t("settings.profileUciOptions", {
              count: visibleProfileOptions.length,
            })}
          </strong>
          <span>{t("settings.profileUciOptionsDescription")}</span>
        </div>
        <div className="engine-config-option-tools">
          <input
            type="search"
            value={optionFilter}
            onChange={(event) => onOptionFilterChange(event.target.value)}
            placeholder={t("settings.filterOptions")}
          />
          <button type="button" onClick={onResetDefaults} disabled={busy}>
            {t("settings.resetDefaults")}
          </button>
        </div>
      </div>

      <div className="engine-profile-options">
        {visibleProfileOptions.map(([name, option]) => {
          const value =
            profileDraft.optionValues[name] ?? option.defaultValue ?? "";
          return (
            <div className="engine-config-option" key={name}>
              <div className="engine-config-option-name">
                <strong>{name}</strong>
                <span className="engine-config-option-type">{option.type}</span>
              </div>
              <button
                type="button"
                className="engine-config-option-value-button"
                onClick={() => onOpenOptionEditor(name, option)}
                disabled={busy}
              >
                {displayOptionValue(option, value, t("settings.optionEmpty"))}
              </button>
              <div className="engine-config-option-meta">
                {optionHint(option, {
                  defaultLabel: t("settings.optionDefault"),
                  minLabel: t("settings.optionMin"),
                  maxLabel: t("settings.optionMax"),
                  emptyLabel: t("settings.optionEmpty"),
                })}
              </div>
            </div>
          );
        })}
        {visibleProfileOptions.length === 0 && (
          <div className="engine-config-no-options">
            {t("settings.noMatchingUciOptions")}
          </div>
        )}
      </div>

      <div className="engine-config-actions engine-config-actions-footer">
        {profileDraft.id && (
          <button
            type="button"
            className="engine-config-delete"
            onClick={onDelete}
            disabled={busy || isFallbackProfile || assigned}
            title={
              isFallbackProfile
                ? t("settings.fallbackProfileCannotDelete")
                : assigned
                  ? t("settings.removeFromDefaultsBeforeDelete")
                  : undefined
            }
          >
            {t("settings.deleteProfile")}
          </button>
        )}
        <div className="engine-config-actions-spacer" />
        <button
          type="button"
          onClick={onSave}
          disabled={busy || !profileDraft.name.trim()}
        >
          {busy
            ? t("settings.saving")
            : profileDraft.id
              ? t("settings.saveProfile")
              : t("settings.createProfile")}
        </button>
      </div>
    </div>
  );
}
