import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { EngineDefinition, EngineProfile } from "../../engineConfigTypes";
import { fetchEngineCapabilities } from "../api/engineCapabilitiesApi";
import EngineProfilePicker from "../engine/EngineProfilePicker";
import NumericStepper from "../ui/NumericStepper";
import type { AnalysisReplaySettings } from "../types";

const MOBILE_ANALYSIS_TIME_PRESETS = [1, 2, 3, 5, 10, 15, 30, 60];
const MOBILE_ANALYSIS_DEPTH_PRESETS = [8, 10, 12, 14, 16, 18, 20, 24, 30];

function analysisPresetValues(values: number[], current: number): number[] {
  return Array.from(new Set([...values, current])).sort((left, right) => left - right);
}

interface AnalysisSettingsDialogProps {
  settings: AnalysisReplaySettings;
  profiles: EngineProfile[];
  engines: EngineDefinition[];
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
  engines,
  selectedProfile,
  selectedEngine,
  error,
  running,
  onSettingsChange,
  onCancel,
  onStart,
}: AnalysisSettingsDialogProps) {
  const { t } = useI18n();
  const [deepAnalysisAvailable, setDeepAnalysisAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchEngineCapabilities()
      .then((capabilities) => {
        if (!cancelled) setDeepAnalysisAvailable(capabilities.deepAnalysis.available);
      })
      .catch(() => {
        if (!cancelled) setDeepAnalysisAvailable(false);
      });
    return () => { cancelled = true; };
  }, [profiles, selectedProfile?.id]);

  const unavailable = deepAnalysisAvailable === false;
  const timeSearch = settings.depth <= 0;
  const mobileTimeValues = analysisPresetValues(
    MOBILE_ANALYSIS_TIME_PRESETS,
    Math.max(1, settings.moveTimeSeconds),
  );
  const mobileDepthValues = analysisPresetValues(
    MOBILE_ANALYSIS_DEPTH_PRESETS,
    settings.depth > 0 ? settings.depth : 12,
  );

  const selectTimeSearch = () => {
    onSettingsChange({ ...settings, depth: 0 });
  };

  const selectDepthSearch = () => {
    onSettingsChange({ ...settings, depth: settings.depth > 0 ? settings.depth : 12 });
  };

  return (
    <div
      className="analysis-settings-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-settings-title"
    >
      <div className="analysis-settings-dialog-content">
        <h2 id="analysis-settings-title">{t("analysis.dialogTitle")}</h2>
        <p className="analysis-settings-description">{t("analysis.dialogDescription")}</p>

        <div className="analysis-settings-form">
          <EngineProfilePicker
            className="analysis-settings-field-wide"
            label={t("analysis.engineProfile")}
            engines={engines}
            profiles={profiles}
            selectedProfileId={settings.engineProfileId}
            disabled={profiles.length === 0 || running}
            emptyLabel={t("analysis.noEngineProfile")}
            unknownEngineLabel={t("settings.unknownEngine")}
            onChange={(profileId) => onSettingsChange({
              ...settings,
              engineProfileId: profileId,
            })}
          />

          <div className="analysis-settings-desktop-steppers analysis-settings-field-wide">
            <NumericStepper
              variant="card"
              active={settings.depth > 0}
              label={t("analysis.depth")}
              value={settings.depth}
              min={0}
              disabled={running}
              hint={<>0 = {t("analysis.timePerPosition")}</>}
              onChange={(depth) => onSettingsChange({ ...settings, depth })}
            />
            <NumericStepper
              variant="card"
              active={settings.depth <= 0}
              label={t("analysis.timePerPosition")}
              value={settings.moveTimeSeconds}
              unit="s"
              min={1}
              disabled={running}
              onChange={(moveTimeSeconds) => onSettingsChange({
                ...settings,
                moveTimeSeconds,
              })}
            />
          </div>

          <div className="analysis-settings-mobile-search">
            <div className="analysis-settings-mobile-search-mode" role="group">
              <button
                type="button"
                className={timeSearch ? "active" : ""}
                onClick={selectTimeSearch}
                disabled={running}
              >
                {t("analysis.timePerPosition")}
              </button>
              <button
                type="button"
                className={!timeSearch ? "active" : ""}
                onClick={selectDepthSearch}
                disabled={running}
              >
                {t("analysis.depth")}
              </button>
            </div>

            {timeSearch ? (
              <label className="analysis-settings-field">
                <span>{t("analysis.timePerPosition")}</span>
                <select
                  value={Math.max(1, settings.moveTimeSeconds)}
                  onChange={(event) => onSettingsChange({
                    ...settings,
                    depth: 0,
                    moveTimeSeconds: Number(event.target.value),
                  })}
                  disabled={running}
                >
                  {mobileTimeValues.map((seconds) => (
                    <option key={seconds} value={seconds}>{seconds} s</option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="analysis-settings-field">
                <span>{t("analysis.depth")}</span>
                <select
                  value={settings.depth > 0 ? settings.depth : 12}
                  onChange={(event) => onSettingsChange({
                    ...settings,
                    depth: Number(event.target.value),
                  })}
                  disabled={running}
                >
                  {mobileDepthValues.map((depth) => (
                    <option key={depth} value={depth}>{depth}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {selectedProfile && selectedEngine ? (
            <div className="analysis-settings-config-summary">
              <div className="analysis-settings-summary-engine"><span>{t("analysis.engine")}</span><strong>{selectedEngine.engineName || selectedEngine.name}</strong></div>
              <div className="analysis-settings-summary-search">
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
            <div className="analysis-settings-empty">{t("analysis.noEngineProfile")}</div>
          )}
        </div>

        {unavailable && (
          <div className="analysis-settings-error">
            Keine funktionsbereite native Engine für die Analyse verfügbar. Browser-Stockfish ist nur für die Live-Auswertung vorgesehen.
          </div>
        )}
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
            disabled={running || !settings.engineProfileId || unavailable || deepAnalysisAvailable === null}
          >
            {running ? t("analysis.starting") : t("common.ok")}
          </button>
        </div>
      </div>
    </div>
  );
}
