import { useEffect, useState } from "react";
import type {
  EngineConfigOverview,
  EngineProfileAssignments,
} from "./engineConfigTypes";
import {
  resetEngineConfig,
  updateEngineDefaults,
} from "./chess/api/engineConfigApi";
import { useI18n } from "./i18n/I18nProvider";
import EngineManager from "./EngineManager";
import EngineProfileHierarchy from "./EngineProfileHierarchy";
import OpeningManager from "./chess/openings/OpeningManager";
import EngineDefaultsSettings from "./settings/EngineDefaultsSettings";
import DisplaySettings from "./settings/DisplaySettings";
import type { UiPreferences } from "./chess/settings/useUiPreferences";
import "./SettingsManager.css";

interface SettingsManagerProps {
  overview: EngineConfigOverview | null;
  uiPreferences: UiPreferences;
  onOverviewChange: (overview: EngineConfigOverview) => void;
  onUiPreferencesChange: (patch: Partial<UiPreferences>) => void;
  onClose: () => void;
}

type SettingsMode =
  | "ENGINE_DEFAULTS"
  | "OPENINGS"
  | "DISPLAY"
  | "ENGINES"
  | "ENGINE_LOG";

const EMPTY_ASSIGNMENTS: EngineProfileAssignments = {
  whitePlayerProfileId: null,
  blackPlayerProfileId: null,
  evaluationProfileId: null,
  deepAnalysisProfileId: null,
};

function copyAssignments(
  assignments: EngineProfileAssignments | null | undefined,
): EngineProfileAssignments {
  return assignments ? { ...assignments } : { ...EMPTY_ASSIGNMENTS };
}

export default function SettingsManager({
  overview,
  uiPreferences,
  onOverviewChange,
  onUiPreferencesChange,
  onClose,
}: SettingsManagerProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<SettingsMode>("ENGINE_DEFAULTS");
  const [defaultsDraft, setDefaultsDraft] = useState<EngineProfileAssignments>(
    () => copyAssignments(overview?.defaults),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileHeaderMenuOpen, setMobileHeaderMenuOpen] = useState(false);

  const engines = overview?.engines ?? [];
  const profiles = overview?.profiles ?? [];

  useEffect(() => {
    if (overview) setDefaultsDraft(copyAssignments(overview.defaults));
  }, [overview]);

  function changeMode(nextMode: SettingsMode) {
    setMode(nextMode);
    setMessage(null);
    setError(null);
    setMobileHeaderMenuOpen(false);
  }

  async function resetEngineSettings() {
    if (!window.confirm(t("settings.resetConfirm"))) return;
    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      const next = await resetEngineConfig();
      onOverviewChange(next);
      setDefaultsDraft(copyAssignments(next.defaults));
      setMode("ENGINE_DEFAULTS");
      const fallbackProfile = next.profiles.find(
        (profile) => profile.id === next.fallbackProfileId,
      );
      setMessage(t("settings.resetSummary", {
        engines: next.engines.length,
        fallback: next.engines.find(
          (engine) => engine.id === fallbackProfile?.engineId,
        )?.engine ?? "–",
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("settings.resetFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function saveDefaults() {
    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      const next = await updateEngineDefaults(defaultsDraft);
      onOverviewChange(next);
      setDefaultsDraft(copyAssignments(next.defaults));
      setMessage(t("settings.defaultSaved"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("settings.defaultSaveFailed"));
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<{ mode: SettingsMode; label: string; count?: string }> = [
    { mode: "ENGINE_DEFAULTS", label: t("settings.engineDefaults") },
    { mode: "OPENINGS", label: t("openings.title") },
    { mode: "DISPLAY", label: t("settings.display") },
    {
      mode: "ENGINES",
      label: t("settings.enginesAndProfiles"),
      count: `${engines.length}/${profiles.length}`,
    },
    { mode: "ENGINE_LOG", label: t("settings.engineLog") },
  ];

  return (
    <div className="engine-config-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="engine-config-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("settings.title")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="engine-config-dialog-header">
          <div>
            <h2>{t("settings.title")}</h2>
            <div className="engine-config-dialog-subtitle">
              {t("settings.subtitle")}
              {overview && <span> · {t("settings.version", { version: overview.version })}</span>}
            </div>
          </div>

          <div className="engine-config-header-actions engine-config-header-actions-desktop">
            <button
              type="button"
              className="engine-config-reset"
              onClick={() => void resetEngineSettings()}
              disabled={busy}
            >
              {t("settings.reset")}
            </button>
            <button type="button" onClick={onClose} disabled={busy}>
              {t("common.close")}
            </button>
          </div>

          <div className="engine-config-mobile-header-actions">
            <details
              className="engine-config-mobile-header-menu"
              open={mobileHeaderMenuOpen}
              onToggle={(event) => setMobileHeaderMenuOpen(event.currentTarget.open)}
            >
              <summary
                aria-label={t("settings.mobileMoreActions")}
                title={t("settings.mobileMoreActions")}
              >
                ⋮
              </summary>
              <div className="engine-config-mobile-header-menu-popup">
                <button
                  type="button"
                  className="engine-config-reset"
                  onClick={() => {
                    setMobileHeaderMenuOpen(false);
                    void resetEngineSettings();
                  }}
                  disabled={busy}
                >
                  {t("settings.reset")}
                </button>
              </div>
            </details>
            <button
              type="button"
              className="engine-config-mobile-close"
              onClick={onClose}
              disabled={busy}
              aria-label={t("common.close")}
              title={t("common.close")}
            >
              ×
            </button>
          </div>
        </header>

        {error && <div className="engine-config-error-banner">{error}</div>}
        {message && <div className="engine-config-message-banner">{message}</div>}

        <div className="engine-config-tabs" role="tablist" aria-label={t("settings.area")}>
          {tabs.map((tab) => (
            <button
              key={tab.mode}
              type="button"
              role="tab"
              aria-selected={mode === tab.mode}
              className={mode === tab.mode ? "active" : ""}
              onClick={() => changeMode(tab.mode)}
              disabled={busy}
            >
              {tab.label}
              {tab.count && <span className="engine-config-tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>

        <label className="engine-config-mobile-mode-picker">
          <span>{t("settings.area")}</span>
          <select
            value={mode}
            onChange={(event) => changeMode(event.target.value as SettingsMode)}
            disabled={busy}
          >
            {tabs.map((tab) => (
              <option key={tab.mode} value={tab.mode}>
                {tab.label}{tab.count ? ` (${tab.count})` : ""}
              </option>
            ))}
          </select>
        </label>

        <div
          className={[
            "engine-config-body",
            `engine-config-body-${mode.toLowerCase().replace("_", "-")}`,
            mode === "ENGINE_LOG" ? "engine-config-body-log" : "",
          ].filter(Boolean).join(" ")}
        >
          {mode === "ENGINE_LOG" ? (
            <EngineManager embedded />
          ) : mode === "ENGINES" ? (
            <EngineProfileHierarchy overview={overview} onOverviewChange={onOverviewChange} />
          ) : mode === "OPENINGS" ? (
            <OpeningManager />
          ) : mode === "DISPLAY" ? (
            <DisplaySettings preferences={uiPreferences} onChange={onUiPreferencesChange} />
          ) : (
            <EngineDefaultsSettings
              overview={overview}
              draft={defaultsDraft}
              busy={busy}
              onDraftChange={setDefaultsDraft}
              onSave={() => void saveDefaults()}
            />
          )}
        </div>
      </section>
    </div>
  );
}
