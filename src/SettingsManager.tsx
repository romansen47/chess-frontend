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
import "./SettingsManager.css";

interface SettingsManagerProps {
  overview: EngineConfigOverview | null;
  onOverviewChange: (overview: EngineConfigOverview) => void;
  onClose: () => void;
}

type SettingsMode = "DEFAULTS" | "ENGINES" | "ENGINE_LOG";
type AssignmentKey = keyof EngineProfileAssignments;

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
  onOverviewChange,
  onClose,
}: SettingsManagerProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<SettingsMode>("DEFAULTS");
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
    if (overview) {
      setDefaultsDraft(copyAssignments(overview.defaults));
    }
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
      setMode("DEFAULTS");
      setMessage(
        t("settings.resetSummary", {
          engines: next.engines.length,
          fallback:
            next.engines.find(
              (engine) =>
                engine.id ===
                next.profiles.find(
                  (profile) => profile.id === next.fallbackProfileId,
                )?.engineId,
            )?.engine ?? "–",
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("settings.resetFailed"));
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
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("settings.defaultSaveFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  function profileAndEngine(profileId: string | null | undefined) {
    const profile =
      profiles.find((candidate) => candidate.id === profileId) ?? null;
    const engine = profile
      ? engines.find((candidate) => candidate.id === profile.engineId) ?? null
      : null;
    return { profile, engine };
  }

  function renderAssignmentCard(
    key: AssignmentKey,
    title: string,
    description: string,
  ) {
    const selectedId = defaultsDraft[key] ?? "";
    const { engine } = profileAndEngine(selectedId);

    return (
      <label className="engine-config-default-card" key={key}>
        <div className="engine-config-default-card-heading">
          <div>
            <strong>{title}</strong>
            <span>{description}</span>
          </div>
          {selectedId === overview?.fallbackProfileId && (
            <span className="engine-config-chip">
              {t("settings.fallback")}
            </span>
          )}
        </div>

        <select
          value={selectedId}
          onChange={(event) =>
            setDefaultsDraft({
              ...defaultsDraft,
              [key]: event.target.value,
            })
          }
          disabled={busy || profiles.length === 0}
        >
          {engines.map((candidateEngine) => {
            const engineProfiles = profiles.filter(
              (profile) => profile.engineId === candidateEngine.id,
            );
            if (engineProfiles.length === 0) return null;
            return (
              <optgroup
                key={candidateEngine.id ?? candidateEngine.name}
                label={candidateEngine.name}
              >
                {engineProfiles.map((profile) => (
                  <option
                    key={profile.id ?? profile.name}
                    value={profile.id ?? ""}
                  >
                    {profile.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>

        <div className="engine-config-default-card-meta">
          <span>{engine?.name ?? t("settings.unknownEngine")}</span>
          <span className="engine-config-default-card-path">
            {engine?.engine ?? "–"}
          </span>
        </div>
      </label>
    );
  }

  const fallbackProfile =
    profiles.find((profile) => profile.id === overview?.fallbackProfileId) ??
    null;
  const fallbackEngine = fallbackProfile
    ? engines.find((engine) => engine.id === fallbackProfile.engineId) ?? null
    : null;

  return (
    <div
      className="engine-config-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
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
              {overview && (
                <span>
                  {" "}
                  · {t("settings.version", { version: overview.version })}
                </span>
              )}
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
              onToggle={(event) =>
                setMobileHeaderMenuOpen(event.currentTarget.open)
              }
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
        {message && (
          <div className="engine-config-message-banner">{message}</div>
        )}

        <div
          className="engine-config-tabs"
          role="tablist"
          aria-label={t("settings.area")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "DEFAULTS"}
            className={mode === "DEFAULTS" ? "active" : ""}
            onClick={() => changeMode("DEFAULTS")}
            disabled={busy}
          >
            {t("settings.defaults")}
            <span className="engine-config-tab-count">4</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "ENGINES"}
            className={mode === "ENGINES" ? "active" : ""}
            onClick={() => changeMode("ENGINES")}
            disabled={busy}
          >
            {t("settings.enginesAndProfiles")}
            <span className="engine-config-tab-count">
              {engines.length}/{profiles.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "ENGINE_LOG"}
            className={mode === "ENGINE_LOG" ? "active" : ""}
            onClick={() => changeMode("ENGINE_LOG")}
            disabled={busy}
          >
            {t("settings.engineLog")}
          </button>
        </div>

        <label className="engine-config-mobile-mode-picker">
          <span>{t("settings.area")}</span>
          <select
            value={mode}
            onChange={(event) =>
              changeMode(event.target.value as SettingsMode)
            }
            disabled={busy}
          >
            <option value="DEFAULTS">{t("settings.defaults")}</option>
            <option value="ENGINES">
              {t("settings.enginesAndProfiles")} ({engines.length}/{profiles.length})
            </option>
            <option value="ENGINE_LOG">{t("settings.engineLog")}</option>
          </select>
        </label>

        <div
          className={[
            "engine-config-body",
            `engine-config-body-${mode.toLowerCase().replace("_", "-")}`,
            mode === "ENGINE_LOG" ? "engine-config-body-log" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {mode === "ENGINE_LOG" ? (
            <EngineManager embedded />
          ) : mode === "ENGINES" ? (
            <EngineProfileHierarchy
              overview={overview}
              onOverviewChange={onOverviewChange}
            />
          ) : (
            <>
              <aside className="engine-config-sidebar">
                <div className="engine-config-sidebar-header">
                  <div>
                    <strong>{t("settings.useCases")}</strong>
                    <span>{t("settings.useCasesDescription")}</span>
                  </div>
                </div>
                <div className="engine-config-nav-list engine-config-assignment-list">
                  {([
                    ["whitePlayerProfileId", t("settings.whiteCpu")],
                    ["blackPlayerProfileId", t("settings.blackCpu")],
                    ["evaluationProfileId", t("settings.liveEvaluation")],
                    ["deepAnalysisProfileId", t("settings.deepAnalysis")],
                  ] as Array<[AssignmentKey, string]>).map(([key, label]) => {
                    const { profile, engine } = profileAndEngine(
                      defaultsDraft[key],
                    );
                    return (
                      <div
                        className="engine-config-nav-item engine-config-assignment-summary"
                        key={key}
                      >
                        <span className="engine-config-nav-title">{label}</span>
                        <span className="engine-config-nav-meta">
                          {profile?.name ?? t("settings.noProfile")}
                        </span>
                        <span className="engine-config-nav-path">
                          {engine?.name ?? "–"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <main className="engine-config-details">
                <div className="engine-config-editor">
                  <div className="engine-config-details-heading">
                    <div>
                      <strong>{t("settings.defaultAssignments")}</strong>
                      <span>{t("settings.defaultAssignmentsDescription")}</span>
                    </div>
                    <span className="engine-config-chip">
                      {t("settings.global")}
                    </span>
                  </div>

                  {fallbackProfile && (
                    <div className="engine-config-default-info">
                      {t("settings.fallbackInfoBefore")}{" "}
                      <strong>
                        {fallbackEngine?.engine ??
                          t("settings.detectedUciEngine")}
                      </strong>{" "}
                      {t("settings.fallbackInfoAfter")}
                    </div>
                  )}

                  <div className="engine-config-default-grid">
                    {renderAssignmentCard(
                      "whitePlayerProfileId",
                      t("settings.whiteCpuPlayer"),
                      t("settings.whiteCpuDescription"),
                    )}
                    {renderAssignmentCard(
                      "blackPlayerProfileId",
                      t("settings.blackCpuPlayer"),
                      t("settings.blackCpuDescription"),
                    )}
                    {renderAssignmentCard(
                      "evaluationProfileId",
                      t("settings.liveEvaluation"),
                      t("settings.liveEvaluationDescription"),
                    )}
                    {renderAssignmentCard(
                      "deepAnalysisProfileId",
                      t("settings.deepAnalysis"),
                      t("settings.deepAnalysisDescription"),
                    )}
                  </div>

                  <div className="engine-config-actions engine-config-actions-footer">
                    <div className="engine-config-actions-spacer" />
                    <button
                      type="button"
                      onClick={() => void saveDefaults()}
                      disabled={busy || profiles.length === 0}
                    >
                      {busy
                        ? t("settings.saving")
                        : t("settings.saveDefaults")}
                    </button>
                  </div>
                </div>
              </main>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
