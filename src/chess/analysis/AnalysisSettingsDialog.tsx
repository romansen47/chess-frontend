import { useI18n } from "../../i18n/I18nProvider";
import type { EngineDefinition, EngineProfile } from "../../engineConfig";
import type { AnalysisReplaySettings } from "../types";

interface AnalysisSettingsDialogProps {
  settings: AnalysisReplaySettings;
  profiles: EngineProfile[];
  selectedProfile: EngineProfile | null;
  selectedEngine: EngineDefinition | null;
  error: string | null;
  running: boolean;
  onSettingsChange: (settings: AnalysisReplaySettings) => void;
  onCancel: () => void;
  onStart: () => void;
}

export default function AnalysisSettingsDialog({
  settings,
  profiles,
  selectedProfile,
  selectedEngine,
  error,
  running,
  onSettingsChange,
  onCancel,
  onStart,
}: AnalysisSettingsDialogProps) {
  const { t } = useI18n();

  return (
    <div
      className="analysis-settings-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-settings-title"
    >
      <div className="analysis-settings-dialog-content">
        <h2 id="analysis-settings-title">{t("analysis.dialogTitle")}</h2>
        <p className="analysis-settings-description">
          {t("analysis.dialogDescription")}
        </p>

        <div className="analysis-settings-form">
          <label className="analysis-settings-field analysis-settings-field-wide">
            <span>{t("analysis.engineProfile")}</span>
            <select
              value={settings.engineProfileId ?? ""}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  engineProfileId: event.target.value || null,
                })
              }
              disabled={profiles.length === 0}
            >
              {profiles.map((profile) => (
                <option key={profile.id ?? profile.name} value={profile.id ?? ""}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>

          <label className="analysis-settings-field">
            <span>{t("analysis.depth")}</span>
            <input
              type="number"
              min={0}
              value={settings.depth}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  depth: Math.max(0, Number(event.target.value)),
                })
              }
            />
          </label>

          <label className="analysis-settings-field">
            <span>{t("analysis.timePerPosition")}</span>
            <input
              type="number"
              min={1}
              value={settings.moveTimeSeconds}
              disabled={settings.depth > 0}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  moveTimeSeconds: Math.max(1, Number(event.target.value)),
                })
              }
            />
          </label>

          {selectedProfile && selectedEngine ? (
            <div className="analysis-settings-config-summary">
              <div>
                <span>{t("analysis.profile")}</span>
                <strong>{selectedProfile.name}</strong>
              </div>
              <div>
                <span>{t("analysis.engine")}</span>
                <strong>{selectedEngine.engineName || selectedEngine.name}</strong>
              </div>
              <div>
                <span>{t("analysis.search")}</span>
                <strong>
                  {settings.depth > 0
                    ? t("analysis.searchDepth", { depth: settings.depth })
                    : t("analysis.searchTime", { seconds: settings.moveTimeSeconds })}
                </strong>
              </div>
              <div className="analysis-settings-config-path">
                <span>{t("engine.executable")}</span>
                <strong>{selectedEngine.engine}</strong>
              </div>
            </div>
          ) : (
            <div className="analysis-settings-empty">
              {t("analysis.noEngineProfile")}
            </div>
          )}
        </div>

        {error && <div className="analysis-settings-error">{error}</div>}

        <div className="analysis-settings-dialog-actions">
          <button
            type="button"
            className="analysis-settings-dialog-button"
            onClick={onCancel}
            disabled={running}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="analysis-settings-dialog-button"
            onClick={onStart}
            disabled={running || !settings.engineProfileId}
          >
            {running ? t("analysis.starting") : t("common.ok")}
          </button>
        </div>
      </div>
    </div>
  );
}
