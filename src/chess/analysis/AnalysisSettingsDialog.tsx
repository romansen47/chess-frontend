import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { EngineDefinition, EngineProfile } from "../../engineConfig";
import { fetchEngineCapabilities } from "../api/engineCapabilitiesApi";
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
  const [profilePickerOpen, setProfilePickerOpen] = useState(false);
  const profilePickerRef = useRef<HTMLDivElement | null>(null);

  const engineById = useMemo(
    () => new Map(
      engines
        .filter((engine) => engine.id)
        .map((engine) => [engine.id as string, engine]),
    ),
    [engines],
  );

  const profileGroups = useMemo(
    () => engines
      .map((engine) => ({
        engine,
        profiles: profiles.filter((profile) => profile.engineId === engine.id && profile.id),
      }))
      .filter((group) => group.profiles.length > 0),
    [engines, profiles],
  );

  useEffect(() => {
    if (!profilePickerOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (profilePickerRef.current?.contains(event.target as Node)) return;
      setProfilePickerOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfilePickerOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profilePickerOpen]);

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
          <div
            className="analysis-settings-profile-picker analysis-settings-field-wide"
            ref={profilePickerRef}
          >
            <span className="analysis-settings-profile-picker-label">{t("analysis.engineProfile")}</span>
            <button
              type="button"
              className="analysis-settings-profile-picker-trigger"
              aria-haspopup="menu"
              aria-expanded={profilePickerOpen}
              onClick={() => setProfilePickerOpen((previous) => !previous)}
              onContextMenu={(event) => {
                event.preventDefault();
                setProfilePickerOpen(true);
              }}
              disabled={profiles.length === 0 || running}
            >
              <span className="analysis-settings-profile-picker-text">
                <strong>{selectedProfile?.name ?? t("analysis.noEngineProfile")}</strong>
                <small>
                  {selectedEngine?.name || selectedEngine?.engineName || t("settings.unknownEngine")}
                </small>
              </span>
              <span className="analysis-settings-profile-picker-chevron" aria-hidden="true">▾</span>
            </button>

            {profilePickerOpen && (
              <div
                className="analysis-settings-profile-menu"
                role="menu"
                aria-label={t("analysis.engineProfile")}
              >
                {profileGroups.map(({ engine, profiles: engineProfiles }) => (
                  <div className="analysis-settings-profile-menu-group" key={engine.id ?? engine.name}>
                    <div className="analysis-settings-profile-menu-engine">
                      {engine.name}
                    </div>
                    {engineProfiles.map((profile) => (
                      <button
                        key={profile.id ?? profile.name}
                        type="button"
                        role="menuitemradio"
                        aria-checked={settings.engineProfileId === profile.id}
                        className="analysis-settings-profile-menu-item"
                        onClick={() => {
                          onSettingsChange({
                            ...settings,
                            engineProfileId: profile.id,
                          });
                          setProfilePickerOpen(false);
                        }}
                      >
                        <span className="analysis-settings-profile-menu-check">
                          {settings.engineProfileId === profile.id ? "✓" : ""}
                        </span>
                        <span>{profile.name}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="analysis-settings-desktop-steppers analysis-settings-field-wide">
            <div className={`analysis-settings-stepper${settings.depth > 0 ? " active" : ""}`}>
              <span className="analysis-settings-stepper-label">{t("analysis.depth")}</span>
              <div className="analysis-settings-stepper-value">
                <strong>{settings.depth}</strong>
              </div>
              <div className="analysis-settings-stepper-buttons">
                <button
                  type="button"
                  onClick={() => onSettingsChange({
                    ...settings,
                    depth: settings.depth + 1,
                  })}
                  disabled={running}
                  aria-label={`${t("analysis.depth")} +1`}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => onSettingsChange({
                    ...settings,
                    depth: Math.max(0, settings.depth - 1),
                  })}
                  disabled={running || settings.depth <= 0}
                  aria-label={`${t("analysis.depth")} -1`}
                >
                  ▼
                </button>
              </div>
              <span className="analysis-settings-stepper-hint">
                {t("analysis.depth")}
                {" · "}0 = {t("analysis.timePerPosition")}
              </span>
            </div>

            <div className={`analysis-settings-stepper${settings.depth <= 0 ? " active" : ""}`}>
              <span className="analysis-settings-stepper-label">{t("analysis.timePerPosition")}</span>
              <div className="analysis-settings-stepper-value">
                <strong>{settings.moveTimeSeconds}</strong>
                <span>s</span>
              </div>
              <div className="analysis-settings-stepper-buttons">
                <button
                  type="button"
                  onClick={() => onSettingsChange({
                    ...settings,
                    moveTimeSeconds: settings.moveTimeSeconds + 1,
                  })}
                  disabled={running}
                  aria-label={`${t("analysis.timePerPosition")} +1`}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => onSettingsChange({
                    ...settings,
                    moveTimeSeconds: Math.max(1, settings.moveTimeSeconds - 1),
                  })}
                  disabled={running || settings.moveTimeSeconds <= 1}
                  aria-label={`${t("analysis.timePerPosition")} -1`}
                >
                  ▼
                </button>
              </div>
            </div>
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
