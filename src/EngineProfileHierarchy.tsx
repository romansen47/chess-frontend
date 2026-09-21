import { useEffect, useMemo, useState } from "react";
import type {
  EngineConfigOverview,
  EngineDefinition,
  EngineProfile,
  UciOptionConfig,
} from "./engineConfig";
import { fetchEngineConfigOverview, isSystemManagedUciOption } from "./engineConfig";
import { useI18n } from "./i18n/I18nProvider";
import "./EngineProfileHierarchy.css";
import "./EngineConfigOptionPopup.css";

interface Props {
  overview: EngineConfigOverview | null;
  onOverviewChange: (overview: EngineConfigOverview) => void;
}

interface ProfileOptionEditorState {
  name: string;
  option: UciOptionConfig;
  value: string;
}

function copyEngine(engine: EngineDefinition): EngineDefinition {
  return {
    ...engine,
    options: Object.fromEntries(
      Object.entries(engine.options).map(([name, option]) => [
        name,
        { ...option, vars: [...(option.vars ?? [])] },
      ]),
    ),
  };
}

function copyProfile(profile: EngineProfile): EngineProfile {
  return {
    ...profile,
    optionValues: Object.fromEntries(
      Object.entries(profile.optionValues).filter(
        ([name]) => !isSystemManagedUciOption(name),
      ),
    ),
  };
}

function defaultProfileForEngine(
  engine: EngineDefinition,
  profileName: string,
): EngineProfile {
  return {
    id: null,
    name: profileName,
    engineId: engine.id ?? "",
    optionValues: Object.fromEntries(
      Object.entries(engine.options)
        .filter(
          ([name, option]) =>
            option.type !== "button" && !isSystemManagedUciOption(name),
        )
        .map(([name, option]) => [name, option.defaultValue ?? ""]),
    ),
  };
}

function optionHint(
  option: UciOptionConfig,
  labels: {
    defaultLabel: string;
    minLabel: string;
    maxLabel: string;
    emptyLabel: string;
  },
): string {
  const parts: string[] = [];
  if (option.defaultValue !== null) {
    parts.push(
      `${labels.defaultLabel} ${
        option.defaultValue === "" ? labels.emptyLabel : option.defaultValue
      }`,
    );
  }
  if (option.min !== null) parts.push(`${labels.minLabel} ${option.min}`);
  if (option.max !== null) parts.push(`${labels.maxLabel} ${option.max}`);
  return parts.join(" · ");
}

function displayOptionValue(
  option: UciOptionConfig,
  value: string,
  emptyLabel: string,
): string {
  if (option.type === "check") {
    return value.toLowerCase() === "true" ? "true" : "false";
  }
  return value === "" ? emptyLabel : value;
}

export default function EngineProfileHierarchy({ overview, onOverviewChange }: Props) {
  const { t } = useI18n();
  const engines = overview?.engines ?? [];
  const profiles = overview?.profiles ?? [];

  const [selectedEngineId, setSelectedEngineId] = useState<string | null>(null);
  const [expandedEngineId, setExpandedEngineId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<EngineProfile | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);

  const [importingEngine, setImportingEngine] = useState(false);
  const [discoveredEngines, setDiscoveredEngines] = useState<EngineDefinition[]>([]);
  const [importDraft, setImportDraft] = useState<EngineDefinition | null>(null);
  const [manualEnginePath, setManualEnginePath] = useState("");
  const [manualEngineName, setManualEngineName] = useState("");

  const [optionFilter, setOptionFilter] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [profileOptionEditor, setProfileOptionEditor] =
    useState<ProfileOptionEditorState | null>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedEngine = useMemo(
    () => engines.find((engine) => engine.id === selectedEngineId) ?? null,
    [engines, selectedEngineId],
  );

  const selectedStoredProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId],
  );

  const profileEngine = useMemo(
    () => engines.find((engine) => engine.id === profileDraft?.engineId) ?? null,
    [engines, profileDraft?.engineId],
  );

  const selectedEngineProfiles = useMemo(
    () =>
      selectedEngine?.id
        ? profiles.filter((profile) => profile.engineId === selectedEngine.id)
        : [],
    [profiles, selectedEngine?.id],
  );

  const isFallbackProfile =
    profileDraft?.id != null && profileDraft.id === overview?.fallbackProfileId;

  const visibleProfileOptions = useMemo(() => {
    if (!profileEngine || !profileDraft) return [];
    const filter = optionFilter.trim().toLowerCase();
    return Object.entries(profileEngine.options).filter(
      ([name, option]) =>
        option.type !== "button" &&
        !isSystemManagedUciOption(name) &&
        (!filter || name.toLowerCase().includes(filter)),
    );
  }, [optionFilter, profileDraft, profileEngine]);

  useEffect(() => {
    if (engines.length === 0) {
      setSelectedEngineId(null);
      setSelectedProfileId(null);
      setProfileDraft(null);
      return;
    }

    if (!selectedEngineId || !engines.some((engine) => engine.id === selectedEngineId)) {
      const fallbackProfile = profiles.find(
        (profile) => profile.id === overview?.fallbackProfileId,
      );
      const initialEngine =
        engines.find((engine) => engine.id === fallbackProfile?.engineId) ??
        engines[0];
      setSelectedEngineId(initialEngine?.id ?? null);
    }
  }, [engines, overview?.fallbackProfileId, profiles, selectedEngineId]);

  useEffect(() => {
    if (!selectedProfileId) return;
    const profile = profiles.find((candidate) => candidate.id === selectedProfileId);
    if (!profile) {
      setSelectedProfileId(null);
      setProfileDraft(null);
      setCreatingProfile(false);
      return;
    }
    setProfileDraft(copyProfile(profile));
  }, [profiles, selectedProfileId]);

  async function reloadOverview() {
    const next = await fetchEngineConfigOverview();
    onOverviewChange(next);
    return next;
  }

  function profilesForEngine(engineId: string | null): EngineProfile[] {
    if (!engineId) return [];
    return profiles.filter((profile) => profile.engineId === engineId);
  }

  function assignmentLabels(profileId: string | null): string[] {
    if (!profileId || !overview) return [];
    const labels: string[] = [];
    if (overview.defaults.whitePlayerProfileId === profileId) {
      labels.push(t("settings.whiteCpu"));
    }
    if (overview.defaults.blackPlayerProfileId === profileId) {
      labels.push(t("settings.blackCpu"));
    }
    if (overview.defaults.evaluationProfileId === profileId) {
      labels.push(t("settings.liveEvaluation"));
    }
    if (overview.defaults.deepAnalysisProfileId === profileId) {
      labels.push(t("settings.deepAnalysis"));
    }
    return labels;
  }

  function isAssignedProfile(profileId: string | null): boolean {
    return assignmentLabels(profileId).length > 0;
  }

  function selectEngine(engineId: string) {
    setSelectedEngineId(engineId);
    setSelectedProfileId(null);
    setProfileDraft(null);
    setCreatingProfile(false);
    setImportingEngine(false);
    setAdvancedOpen(false);
    setOptionFilter("");
    setProfileOptionEditor(null);
    setMessage(null);
    setError(null);
  }

  function toggleEngineInTree(engineId: string) {
    const nextExpandedEngineId =
      expandedEngineId === engineId ? null : engineId;
    setExpandedEngineId(nextExpandedEngineId);
    selectEngine(engineId);
  }

  function selectProfile(profile: EngineProfile) {
    setSelectedEngineId(profile.engineId);
    setExpandedEngineId(profile.engineId);
    setSelectedProfileId(profile.id);
    setProfileDraft(copyProfile(profile));
    setCreatingProfile(false);
    setImportingEngine(false);
    setAdvancedOpen(false);
    setOptionFilter("");
    setProfileOptionEditor(null);
    setMessage(null);
    setError(null);
  }

  function nextProfileName(engine: EngineDefinition): string {
    const base = t("settings.defaultProfileName", { engine: engine.name });
    const names = new Set(
      profilesForEngine(engine.id).map((profile) => profile.name.trim().toLowerCase()),
    );
    if (!names.has(base.toLowerCase())) return base;

    let index = 2;
    while (names.has(`${base} ${index}`.toLowerCase())) index += 1;
    return `${base} ${index}`;
  }

  function beginCreateProfile(engine: EngineDefinition) {
    if (!engine.id) return;
    setSelectedEngineId(engine.id);
    setExpandedEngineId(engine.id);
    setSelectedProfileId(null);
    setProfileDraft(defaultProfileForEngine(engine, nextProfileName(engine)));
    setCreatingProfile(true);
    setImportingEngine(false);
    setAdvancedOpen(false);
    setOptionFilter("");
    setProfileOptionEditor(null);
    setMessage(null);
    setError(null);
  }

  function beginImportEngine() {
    setImportingEngine(true);
    setCreatingProfile(false);
    setSelectedProfileId(null);
    setProfileDraft(null);
    setImportDraft(null);
    setDiscoveredEngines([]);
    setManualEnginePath("");
    setManualEngineName("");
    setMessage(null);
    setError(null);
    void discoverServerEngines();
  }

  async function discoverServerEngines() {
    try {
      setBusy(true);
      setError(null);
      setMessage(t("settings.scanningSystem"));
      const response = await fetch("/api/engine-configs/engines/discover", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error((await response.text()) || `HTTP ${response.status}`);
      }
      const candidates = (await response.json()) as EngineDefinition[];
      setDiscoveredEngines(candidates);
      setMessage(
        candidates.length === 0
          ? t("settings.noDiscoveredServerEngines")
          : t("settings.serverDiscoveryFound", { count: candidates.length }),
      );
    } catch (e) {
      setDiscoveredEngines([]);
      setMessage(null);
      setError(
        e instanceof Error ? e.message : t("settings.serverDiscoveryFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  function selectDiscoveredEngine(enginePath: string) {
    const candidate = discoveredEngines.find(
      (engine) => engine.engine === enginePath,
    );
    if (!candidate) return;
    setImportDraft(copyEngine(candidate));
    setManualEnginePath(candidate.engine);
    setManualEngineName(candidate.name);
    setError(null);
    setMessage(
      t("settings.engineDetected", {
        engine: candidate.engineName,
        count: Object.keys(candidate.options).length,
      }),
    );
  }

  async function inspectEngineByPath() {
    const engine = manualEnginePath.trim();
    if (!engine) {
      setError(t("settings.enterEnginePathFirst"));
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setMessage(t("settings.readingUciDefinition"));
      const response = await fetch("/api/engine-configs/engines/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine,
          name: manualEngineName.trim() || null,
        }),
      });
      if (!response.ok) {
        throw new Error((await response.text()) || `HTTP ${response.status}`);
      }
      const inspected = (await response.json()) as EngineDefinition;
      setImportDraft(copyEngine(inspected));
      setManualEnginePath(inspected.engine);
      setManualEngineName(inspected.name);
      setMessage(
        t("settings.engineDetected", {
          engine: inspected.engineName,
          count: Object.keys(inspected.options).length,
        }),
      );
    } catch (e) {
      setImportDraft(null);
      setMessage(null);
      setError(
        e instanceof Error ? e.message : t("settings.engineInspectFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function importEngine() {
    if (!importDraft) return;

    const payload = {
      ...importDraft,
      name: manualEngineName.trim() || importDraft.name,
    };

    try {
      setBusy(true);
      setError(null);
      const response = await fetch("/api/engine-configs/engines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error((await response.text()) || `HTTP ${response.status}`);
      }
      const saved = (await response.json()) as EngineDefinition;
      const next = await reloadOverview();
      const selected =
        next.engines.find((engine) => engine.id === saved.id) ?? saved;
      setImportingEngine(false);
      setImportDraft(null);
      setSelectedEngineId(selected.id);
      setExpandedEngineId(selected.id);
      setSelectedProfileId(null);
      setProfileDraft(null);
      setMessage(t("settings.engineImportedCreateProfile"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("settings.engineSaveFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    if (!profileDraft) return;

    try {
      setBusy(true);
      setError(null);
      setProfileOptionEditor(null);
      const isNew = !profileDraft.id;
      const response = await fetch(
        isNew
          ? "/api/engine-configs/profiles"
          : `/api/engine-configs/profiles/${profileDraft.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileDraft),
        },
      );
      if (!response.ok) {
        throw new Error((await response.text()) || `HTTP ${response.status}`);
      }
      const saved = (await response.json()) as EngineProfile;
      const next = await reloadOverview();
      const selected =
        next.profiles.find((profile) => profile.id === saved.id) ?? saved;
      setCreatingProfile(false);
      setSelectedEngineId(selected.engineId);
      setExpandedEngineId(selected.engineId);
      setSelectedProfileId(selected.id);
      setProfileDraft(copyProfile(selected));
      setMessage(
        isNew ? t("settings.profileCreated") : t("settings.profileSaved"),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("settings.profileSaveFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedProfile() {
    if (!selectedStoredProfile?.id) return;
    if (
      !window.confirm(
        t("settings.deleteProfileConfirm", { name: selectedStoredProfile.name }),
      )
    ) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const response = await fetch(
        `/api/engine-configs/profiles/${selectedStoredProfile.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error((await response.text()) || `HTTP ${response.status}`);
      }
      await reloadOverview();
      setSelectedProfileId(null);
      setProfileDraft(null);
      setCreatingProfile(false);
      setMessage(t("settings.profileDeleted"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("settings.profileDeleteFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedEngine() {
    if (!selectedEngine?.id || selectedEngineProfiles.length > 0) return;
    if (
      !window.confirm(
        t("settings.engineDeleteConfirm", { name: selectedEngine.name }),
      )
    ) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const response = await fetch(
        `/api/engine-configs/engines/${selectedEngine.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error((await response.text()) || `HTTP ${response.status}`);
      }
      const next = await reloadOverview();
      setSelectedEngineId(next.engines[0]?.id ?? null);
      setSelectedProfileId(null);
      setProfileDraft(null);
      setMessage(t("settings.engineDeleted"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("settings.engineDeleteFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  function resetProfileOptionsToDefaults() {
    if (!profileDraft || !profileEngine) return;
    const defaults = defaultProfileForEngine(profileEngine, profileDraft.name);
    setProfileDraft({
      ...defaults,
      id: profileDraft.id,
      engineId: profileDraft.engineId,
      name: profileDraft.name,
    });
  }

  function openProfileOptionEditor(name: string, option: UciOptionConfig) {
    if (!profileDraft) return;
    setProfileOptionEditor({
      name,
      option,
      value:
        profileDraft.optionValues[name] ?? option.defaultValue ?? "",
    });
  }

  function applyProfileOptionEditor() {
    if (!profileDraft || !profileOptionEditor) return;
    setProfileDraft({
      ...profileDraft,
      optionValues: {
        ...profileDraft.optionValues,
        [profileOptionEditor.name]: profileOptionEditor.value,
      },
    });
    setProfileOptionEditor(null);
  }

  function renderProfileCard(profile: EngineProfile) {
    const labels = assignmentLabels(profile.id);
    const fallback = profile.id === overview?.fallbackProfileId;
    const selected = selectedProfileId === profile.id;
    return (
      <button
        type="button"
        key={profile.id ?? profile.name}
        className={[
          "engine-profile-card",
          selected ? "engine-profile-card-selected" : "",
        ].filter(Boolean).join(" ")}
        onClick={() => selectProfile(profile)}
        disabled={busy || !profile.id}
      >
        <span className="engine-profile-card-title-row">
          <strong>{profile.name}</strong>
          {(fallback || labels.length > 0) && (
            <span className="engine-profile-active-dot" />
          )}
        </span>
        <span className="engine-profile-card-meta">
          {fallback
            ? t("settings.fallback")
            : labels.length > 0
              ? labels.join(" · ")
              : t("settings.reusableProfile")}
        </span>
      </button>
    );
  }

  if (!overview) {
    return (
      <div className="engine-profile-hierarchy-empty">
        {t("settings.loadingConfiguration")}
      </div>
    );
  }

  return (
    <div className="engine-profile-hierarchy">
      {(error || message) && (
        <div className="engine-profile-inline-status">
          {error && <div className="engine-config-error-banner">{error}</div>}
          {message && <div className="engine-config-message-banner">{message}</div>}
        </div>
      )}

      <aside className="engine-profile-tree">
        <div className="engine-profile-tree-header">
          <div>
            <strong>{t("settings.enginesAndProfiles")}</strong>
            <span>{t("settings.enginesAndProfilesDescription")}</span>
          </div>
          <div className="engine-profile-tree-header-actions">
            <button
              type="button"
              onClick={beginImportEngine}
              disabled={busy}
            >
              {t("settings.importEngine")}
            </button>
            <button
              type="button"
              onClick={() => selectedEngine && beginCreateProfile(selectedEngine)}
              disabled={busy || !selectedEngine}
              title={selectedEngine?.name}
            >
              + {t("settings.newProfile")}
            </button>
          </div>
        </div>

        {engines.length === 0 && (
          <div className="engine-profile-hierarchy-empty">
            {t("settings.noEngineDefined")}
          </div>
        )}

        <div className="engine-profile-tree-list">
          {engines.map((engine) => {
            const engineProfiles = profilesForEngine(engine.id);
            const engineSelected =
              !selectedProfileId && selectedEngineId === engine.id;
            const engineExpanded = expandedEngineId === engine.id;
            return (
              <div
                className={[
                  "engine-profile-tree-group",
                  engineExpanded ? "expanded" : "",
                ].filter(Boolean).join(" ")}
                key={engine.id ?? engine.name}
              >
                <button
                  type="button"
                  className={[
                    "engine-profile-engine-row",
                    engineSelected ? "selected" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => engine.id && toggleEngineInTree(engine.id)}
                  disabled={busy || !engine.id}
                  aria-expanded={engineExpanded}
                >
                  <span className="engine-profile-engine-main">
                    <span className="engine-profile-disclosure" aria-hidden="true">
                      {engineExpanded ? "▾" : "▸"}
                    </span>
                    <span className="engine-profile-engine-text">
                      <strong>{engine.name}</strong>
                      <small>
                        {engine.engineName || t("settings.uciEngine")}
                        {engine.engineAuthor ? ` · ${engine.engineAuthor}` : ""}
                      </small>
                    </span>
                  </span>
                  <span className="engine-profile-count">{engineProfiles.length}</span>
                </button>

                {engineExpanded && (
                  <div className="engine-profile-tree-children">
                  {engineProfiles.map((profile) => {
                    const labels = assignmentLabels(profile.id);
                    const fallback = profile.id === overview.fallbackProfileId;
                    return (
                      <button
                        type="button"
                        key={profile.id ?? profile.name}
                        className={[
                          "engine-profile-tree-profile",
                          selectedProfileId === profile.id ? "selected" : "",
                        ].filter(Boolean).join(" ")}
                        onClick={() => selectProfile(profile)}
                        disabled={busy || !profile.id}
                      >
                        <span>{profile.name}</span>
                        {(fallback || labels.length > 0) && (
                          <span className="engine-profile-active-dot" />
                        )}
                      </button>
                    );
                  })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <div className="engine-profile-mobile-selector">
        <label>
          <span>{t("settings.engineLabel")}</span>
          <select
            value={selectedEngineId ?? ""}
            onChange={(event) => selectEngine(event.target.value)}
            disabled={busy || engines.length === 0}
          >
            {engines.map((engine) => (
              <option key={engine.id ?? engine.name} value={engine.id ?? ""}>
                {engine.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={beginImportEngine}
          disabled={busy}
          aria-label={t("settings.importEngine")}
          title={t("settings.importEngine")}
        >
          +
        </button>

        {selectedEngine && !importingEngine && !creatingProfile && !selectedProfileId && (
          <div className="engine-profile-mobile-profile-list">
            <div className="engine-profile-mobile-profile-header">
              <span>
                {t("settings.profilesForEngine", { engine: selectedEngine.name })}
              </span>
              <button
                type="button"
                onClick={() => beginCreateProfile(selectedEngine)}
                disabled={busy}
              >
                + {t("settings.newProfile")}
              </button>
            </div>
            {selectedEngineProfiles.map(renderProfileCard)}
          </div>
        )}
      </div>

      <main className="engine-profile-details">
        {importingEngine ? (
          <div className="engine-profile-editor-card">
            <div className="engine-config-details-heading">
              <div>
                <strong>{t("settings.importEngine")}</strong>
                <span>{t("settings.importEngineDescription")}</span>
              </div>
            </div>

            <label className="engine-profile-field">
              <span>{t("settings.discoveredServerEngines")}</span>
              <select
                value={importDraft?.engine ?? ""}
                onChange={(event) => selectDiscoveredEngine(event.target.value)}
                disabled={busy || discoveredEngines.length === 0}
              >
                <option value="">
                  {discoveredEngines.length === 0
                    ? t("settings.noDiscoveredServerEngines")
                    : t("settings.chooseDiscoveredEngine")}
                </option>
                {discoveredEngines.map((candidate) => (
                  <option key={candidate.engine} value={candidate.engine}>
                    {candidate.name} · {candidate.engineName}
                  </option>
                ))}
              </select>
            </label>

            <details className="engine-profile-manual-import">
              <summary>{t("settings.manualEngineSetup")}</summary>
              <div className="engine-profile-manual-import-fields">
                <label className="engine-profile-field">
                  <span>{t("settings.enginePathFallback")}</span>
                  <input
                    value={manualEnginePath}
                    onChange={(event) => setManualEnginePath(event.target.value)}
                    placeholder="/usr/games/stockfish"
                  />
                </label>
                <label className="engine-profile-field">
                  <span>{t("settings.engineNameOptional")}</span>
                  <input
                    value={manualEngineName}
                    onChange={(event) => setManualEngineName(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void inspectEngineByPath()}
                  disabled={busy || !manualEnginePath.trim()}
                >
                  {busy ? t("settings.inspecting") : t("settings.useEnteredPath")}
                </button>
              </div>
            </details>

            {importDraft && (
              <div className="engine-profile-engine-summary">
                <div>
                  <span>{t("settings.engineName")}</span>
                  <strong>{manualEngineName || importDraft.name}</strong>
                </div>
                <div>
                  <span>{t("settings.uciName")}</span>
                  <strong>{importDraft.engineName || "–"}</strong>
                </div>
                <div>
                  <span>{t("common.author")}</span>
                  <strong>{importDraft.engineAuthor || "–"}</strong>
                </div>
                <div>
                  <span>{t("common.options")}</span>
                  <strong>{Object.keys(importDraft.options).length}</strong>
                </div>
                <div className="engine-profile-summary-path">
                  <span>{t("engine.executable")}</span>
                  <strong>{importDraft.engine}</strong>
                </div>
              </div>
            )}

            <div className="engine-config-actions engine-config-actions-footer">
              <button
                type="button"
                onClick={() => {
                  setImportingEngine(false);
                  setImportDraft(null);
                  setMessage(null);
                  setError(null);
                }}
                disabled={busy}
              >
                {t("common.cancel")}
              </button>
              <div className="engine-config-actions-spacer" />
              <button
                type="button"
                onClick={() => void importEngine()}
                disabled={busy || !importDraft}
              >
                {busy ? t("settings.saving") : t("settings.importEngine")}
              </button>
            </div>
          </div>
        ) : profileDraft && profileEngine ? (
          <div
            className={[
              "engine-profile-editor-card",
              advancedOpen ? "engine-profile-advanced-open" : "",
            ].filter(Boolean).join(" ")}
          >
            <button
              type="button"
              className="engine-profile-mobile-back"
              onClick={() => profileEngine.id && selectEngine(profileEngine.id)}
              disabled={busy || !profileEngine.id}
            >
              ← {t("common.back")} · {profileEngine.name}
            </button>

            <div className="engine-config-details-heading">
              <div>
                <strong>
                  {creatingProfile
                    ? t("settings.newProfileTitle")
                    : profileDraft.name}
                </strong>
                <span>
                  {t("settings.profileBelongsToEngine", {
                    engine: profileEngine.name,
                  })}
                </span>
              </div>
              <div className="engine-config-heading-badges">
                {isFallbackProfile && (
                  <span className="engine-config-chip">
                    {t("settings.fallback")}
                  </span>
                )}
                {assignmentLabels(profileDraft.id).map((label) => (
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
                onChange={(event) =>
                  setProfileDraft({ ...profileDraft, name: event.target.value })
                }
              />
            </label>

            <button
              type="button"
              className="engine-profile-advanced-toggle"
              onClick={() => setAdvancedOpen((previous) => !previous)}
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
                  onChange={(event) => setOptionFilter(event.target.value)}
                  placeholder={t("settings.filterOptions")}
                />
                <button
                  type="button"
                  onClick={resetProfileOptionsToDefaults}
                  disabled={busy}
                >
                  {t("settings.resetDefaults")}
                </button>
              </div>
            </div>

            <div className="engine-profile-options">
              {visibleProfileOptions.map(([name, option]) => {
                const value =
                  profileDraft.optionValues[name] ??
                  option.defaultValue ??
                  "";
                return (
                  <div className="engine-config-option" key={name}>
                    <div className="engine-config-option-name">
                      <strong>{name}</strong>
                      <span className="engine-config-option-type">
                        {option.type}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="engine-config-option-value-button"
                      onClick={() => openProfileOptionEditor(name, option)}
                      disabled={busy}
                    >
                      {displayOptionValue(
                        option,
                        value,
                        t("settings.optionEmpty"),
                      )}
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
                  onClick={() => void deleteSelectedProfile()}
                  disabled={
                    busy ||
                    isFallbackProfile ||
                    isAssignedProfile(profileDraft.id)
                  }
                  title={
                    isFallbackProfile
                      ? t("settings.fallbackProfileCannotDelete")
                      : isAssignedProfile(profileDraft.id)
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
                onClick={() => void saveProfile()}
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
        ) : selectedEngine ? (
          <div className="engine-profile-editor-card">
            <div className="engine-config-details-heading">
              <div>
                <strong>{selectedEngine.name}</strong>
                <span>{t("settings.engineReadOnlyDescription")}</span>
              </div>
              <span className="engine-config-chip">
                {t("settings.profileCount", {
                  count: selectedEngineProfiles.length,
                })}
              </span>
            </div>

            <div className="engine-profile-engine-summary">
              <div>
                <span>{t("settings.uciName")}</span>
                <strong>{selectedEngine.engineName || "–"}</strong>
              </div>
              <div>
                <span>{t("common.author")}</span>
                <strong>{selectedEngine.engineAuthor || "–"}</strong>
              </div>
              <div>
                <span>{t("common.options")}</span>
                <strong>{Object.keys(selectedEngine.options).length}</strong>
              </div>
              <div className="engine-profile-summary-path">
                <span>{t("engine.executable")}</span>
                <strong>{selectedEngine.engine}</strong>
              </div>
            </div>

            <div className="engine-profile-profile-section">
              <div className="engine-profile-profile-section-header">
                <div>
                  <strong>
                    {t("settings.profilesForEngine", {
                      engine: selectedEngine.name,
                    })}
                  </strong>
                  <span>{t("settings.profilesForEngineDescription")}</span>
                </div>
              </div>

              <div className="engine-profile-card-list">
                {selectedEngineProfiles.length === 0 ? (
                  <div className="engine-profile-hierarchy-empty">
                    {t("settings.noProfilesForEngine")}
                  </div>
                ) : (
                  selectedEngineProfiles.map(renderProfileCard)
                )}
              </div>
            </div>

            <div className="engine-config-actions engine-config-actions-footer">
              <button
                type="button"
                className="engine-config-delete"
                onClick={() => void deleteSelectedEngine()}
                disabled={busy || selectedEngineProfiles.length > 0}
                title={
                  selectedEngineProfiles.length > 0
                    ? t("settings.deleteProfilesBeforeEngine")
                    : undefined
                }
              >
                {t("settings.deleteEngine")}
              </button>
              <div className="engine-config-actions-spacer" />
            </div>
          </div>
        ) : (
          <div className="engine-profile-hierarchy-empty engine-profile-details-empty">
            {t("settings.selectOrImportEngine")}
          </div>
        )}
      </main>

      {profileOptionEditor && (
        <div
          className="engine-config-option-popup-backdrop"
          role="presentation"
          onMouseDown={() => setProfileOptionEditor(null)}
        >
          <form
            className="engine-config-option-popup"
            role="dialog"
            aria-modal="true"
            aria-label={t("settings.editOption", {
              name: profileOptionEditor.name,
            })}
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              applyProfileOptionEditor();
            }}
          >
            <div className="engine-config-option-popup-header">
              <div className="engine-config-option-popup-title">
                <strong>{profileOptionEditor.name}</strong>
                <div className="engine-config-option-popup-meta">
                  <span className="engine-config-option-type">
                    {profileOptionEditor.option.type}
                  </span>
                  <span>
                    {optionHint(profileOptionEditor.option, {
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
                onClick={() => setProfileOptionEditor(null)}
                aria-label={t("settings.closeEditor")}
              >
                ×
              </button>
            </div>

            <label className="engine-config-option-popup-editor">
              <span>{t("settings.profileValue")}</span>
              {profileOptionEditor.option.type === "check" ? (
                <span className="engine-config-option-popup-check">
                  <input
                    type="checkbox"
                    checked={
                      profileOptionEditor.value.toLowerCase() === "true"
                    }
                    onChange={(event) =>
                      setProfileOptionEditor({
                        ...profileOptionEditor,
                        value: event.target.checked ? "true" : "false",
                      })
                    }
                    autoFocus
                  />
                  <span>
                    {profileOptionEditor.value.toLowerCase() === "true"
                      ? "true"
                      : "false"}
                  </span>
                </span>
              ) : profileOptionEditor.option.type === "combo" ? (
                <select
                  value={profileOptionEditor.value}
                  onChange={(event) =>
                    setProfileOptionEditor({
                      ...profileOptionEditor,
                      value: event.target.value,
                    })
                  }
                  autoFocus
                >
                  {(profileOptionEditor.option.vars ?? []).map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {candidate}
                    </option>
                  ))}
                </select>
              ) : profileOptionEditor.option.type === "spin" ? (
                <div className="engine-config-option-popup-spin">
                  <input
                    className="engine-config-option-popup-spin-range"
                    type="range"
                    min={profileOptionEditor.option.min ?? 0}
                    max={profileOptionEditor.option.max ?? 100}
                    step={1}
                    value={profileOptionEditor.value}
                    onChange={(event) =>
                      setProfileOptionEditor({
                        ...profileOptionEditor,
                        value: event.target.value,
                      })
                    }
                  />
                  <span className="engine-config-option-popup-spin-value">
                    {profileOptionEditor.value}
                  </span>
                  <input
                    className="engine-config-option-popup-spin-number"
                    type="number"
                    min={profileOptionEditor.option.min ?? undefined}
                    max={profileOptionEditor.option.max ?? undefined}
                    value={profileOptionEditor.value}
                    onChange={(event) =>
                      setProfileOptionEditor({
                        ...profileOptionEditor,
                        value: event.target.value,
                      })
                    }
                    required
                    autoFocus
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={profileOptionEditor.value}
                  onChange={(event) =>
                    setProfileOptionEditor({
                      ...profileOptionEditor,
                      value: event.target.value,
                    })
                  }
                  autoFocus
                />
              )}
            </label>

            <div className="engine-config-option-popup-actions">
              <button
                type="button"
                onClick={() => setProfileOptionEditor(null)}
              >
                {t("common.cancel")}
              </button>
              <button type="submit">{t("settings.apply")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
