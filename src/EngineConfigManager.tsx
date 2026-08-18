import { useEffect, useMemo, useState } from "react";
import type {
  EngineConfigOverview,
  EngineConfigType,
  EngineDefinition,
  EngineProfile,
  UciOptionConfig,
} from "./engineConfig";
import { fetchEngineConfigOverview } from "./engineConfig";
import "./EngineConfigManager.css";

interface EngineConfigManagerProps {
  overview: EngineConfigOverview | null;
  onOverviewChange: (overview: EngineConfigOverview) => void;
  onClose: () => void;
}

type ManagerMode = "ENGINES" | "PROFILES";

function copyEngine(engine: EngineDefinition): EngineDefinition {
  return {
    ...engine,
    options: Object.fromEntries(
      Object.entries(engine.options).map(([name, option]) => [
        name,
        { ...option, vars: [...(option.vars ?? [])] },
      ])
    ),
  };
}

function copyProfile(profile: EngineProfile): EngineProfile {
  return {
    ...profile,
    optionValues: { ...profile.optionValues },
  };
}

function optionHint(option: UciOptionConfig): string {
  const parts: string[] = [];
  if (option.defaultValue !== null) {
    parts.push(`default ${option.defaultValue === "" ? "<empty>" : option.defaultValue}`);
  }
  if (option.min !== null) {
    parts.push(`min ${option.min}`);
  }
  if (option.max !== null) {
    parts.push(`max ${option.max}`);
  }
  return parts.join(" · ");
}

function purposeLabel(type: EngineConfigType): string {
  switch (type) {
    case "PLAYER":
      return "Player";
    case "EVALUATION":
      return "Evaluation";
    case "DEEP_ANALYSIS":
      return "Deep Analysis";
  }
}

function defaultProfileForEngine(engine: EngineDefinition): EngineProfile {
  return {
    id: null,
    name: `${engine.name} Profile`,
    type: "PLAYER",
    engineId: engine.id ?? "",
    depth: 0,
    moveTimeSeconds: 0,
    optionValues: Object.fromEntries(
      Object.entries(engine.options)
        .filter(([, option]) => option.type !== "button")
        .map(([name, option]) => [name, option.defaultValue ?? ""])
    ),
  };
}

export default function EngineConfigManager({
  overview,
  onOverviewChange,
  onClose,
}: EngineConfigManagerProps) {
  const [mode, setMode] = useState<ManagerMode>("PROFILES");
  const [selectedEngineId, setSelectedEngineId] = useState<string | null>(null);
  const [engineDraft, setEngineDraft] = useState<EngineDefinition | null>(null);
  const [creatingEngine, setCreatingEngine] = useState(false);
  const [newEnginePath, setNewEnginePath] = useState("");
  const [newEngineName, setNewEngineName] = useState("");

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<EngineProfile | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [newProfileEngineId, setNewProfileEngineId] = useState("");

  const [busy, setBusy] = useState(false);
  const [optionFilter, setOptionFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const engines = overview?.engines ?? [];
  const profiles = overview?.profiles ?? [];

  const selectedStoredEngine = useMemo(
    () => engines.find((engine) => engine.id === selectedEngineId) ?? null,
    [engines, selectedEngineId]
  );

  const selectedStoredProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  const profileEngine = useMemo(
    () => engines.find((engine) => engine.id === profileDraft?.engineId) ?? null,
    [engines, profileDraft?.engineId]
  );

  const isActiveEvaluation =
    profileDraft?.type === "EVALUATION" &&
    profileDraft.id !== null &&
    profileDraft.id === overview?.evaluationConfigId;

  useEffect(() => {
    if (!overview || creatingEngine || mode !== "ENGINES") {
      return;
    }
    const nextId = selectedEngineId && engines.some((engine) => engine.id === selectedEngineId)
      ? selectedEngineId
      : engines[0]?.id ?? null;
    setSelectedEngineId(nextId);
    const selected = engines.find((engine) => engine.id === nextId) ?? null;
    setEngineDraft(selected ? copyEngine(selected) : null);
  }, [overview, engines, creatingEngine, mode, selectedEngineId]);

  useEffect(() => {
    if (!overview || creatingProfile || mode !== "PROFILES") {
      return;
    }
    const nextId = selectedProfileId && profiles.some((profile) => profile.id === selectedProfileId)
      ? selectedProfileId
      : profiles[0]?.id ?? null;
    setSelectedProfileId(nextId);
    const selected = profiles.find((profile) => profile.id === nextId) ?? null;
    setProfileDraft(selected ? copyProfile(selected) : null);
  }, [overview, profiles, creatingProfile, mode, selectedProfileId]);

  function changeMode(nextMode: ManagerMode) {
    setMode(nextMode);
    setCreatingEngine(false);
    setCreatingProfile(false);
    setOptionFilter("");
    setMessage(null);
    setError(null);
  }

  function selectExistingEngine(id: string) {
    setCreatingEngine(false);
    setSelectedEngineId(id);
    const selected = engines.find((engine) => engine.id === id);
    setEngineDraft(selected ? copyEngine(selected) : null);
    setOptionFilter("");
    setMessage(null);
    setError(null);
  }

  function selectExistingProfile(id: string) {
    setCreatingProfile(false);
    setSelectedProfileId(id);
    const selected = profiles.find((profile) => profile.id === id);
    setProfileDraft(selected ? copyProfile(selected) : null);
    setOptionFilter("");
    setMessage(null);
    setError(null);
  }

  function beginCreateEngine() {
    setMode("ENGINES");
    setCreatingEngine(true);
    setSelectedEngineId(null);
    setEngineDraft(null);
    setNewEnginePath("");
    setNewEngineName("");
    setOptionFilter("");
    setMessage(null);
    setError(null);
  }

  function beginCreateProfile() {
    setMode("PROFILES");
    setCreatingProfile(true);
    setSelectedProfileId(null);
    setProfileDraft(null);
    setNewProfileEngineId("");
    setOptionFilter("");
    setMessage(null);
    setError(null);
  }

  function chooseEngineForProfile() {
    const engine = engines.find((candidate) => candidate.id === newProfileEngineId);
    if (!engine?.id) {
      setError("Please select a defined engine first.");
      return;
    }
    setProfileDraft(defaultProfileForEngine(engine));
    setError(null);
    setMessage(`${engine.name} selected. Its UCI options are now available to the profile.`);
  }

  async function inspectEngine() {
    const engine = newEnginePath.trim();
    if (!engine) {
      setError("Please enter an engine executable path first.");
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setMessage("Starting engine and reading its UCI definition…");
      const response = await fetch("/api/engine-configs/engines/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine,
          name: newEngineName.trim() || null,
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      const inspected = (await response.json()) as EngineDefinition;
      setEngineDraft(copyEngine(inspected));
      setNewEngineName(inspected.name);
      setMessage(
        `${inspected.engineName} detected · ${Object.keys(inspected.options).length} UCI options`
      );
    } catch (e) {
      setEngineDraft(null);
      setMessage(null);
      setError(e instanceof Error ? e.message : "Engine could not be inspected.");
    } finally {
      setBusy(false);
    }
  }

  async function reloadOverview() {
    const next = await fetchEngineConfigOverview();
    onOverviewChange(next);
    return next;
  }

  async function resetEngineSettings() {
    const confirmed = window.confirm(
      "Delete all saved engines and profiles? The list will be recreated with " +
      "/usr/games/stockfish and its UCI default values."
    );
    if (!confirmed) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setMessage(null);

      const response = await fetch("/api/engine-configs/reset", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }

      const next = (await response.json()) as EngineConfigOverview;
      onOverviewChange(next);

      setCreatingEngine(false);
      setCreatingProfile(false);
      setNewEnginePath("");
      setNewEngineName("");
      setNewProfileEngineId("");
      setOptionFilter("");

      const nextEngine = next.engines[0] ?? null;
      setSelectedEngineId(nextEngine?.id ?? null);
      setEngineDraft(nextEngine ? copyEngine(nextEngine) : null);

      const nextProfile =
        next.profiles.find((profile) => profile.id === next.defaultPlayerConfigId) ??
        next.profiles[0] ??
        null;
      setSelectedProfileId(nextProfile?.id ?? null);
      setProfileDraft(nextProfile ? copyProfile(nextProfile) : null);

      setMessage(
        "Engine settings reset. /usr/games/stockfish is now the fallback and all fallback profiles use UCI defaults."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Engine settings could not be reset.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEngine() {
    if (!engineDraft) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const isNew = !engineDraft.id;
      const response = await fetch(
        isNew
          ? "/api/engine-configs/engines"
          : `/api/engine-configs/engines/${engineDraft.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(engineDraft),
        }
      );
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      await reloadOverview();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Engine could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    if (!profileDraft) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const isNew = !profileDraft.id;
      const response = await fetch(
        isNew
          ? "/api/engine-configs/profiles"
          : `/api/engine-configs/profiles/${profileDraft.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileDraft),
        }
      );
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      await reloadOverview();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Engine profile could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedEngine() {
    if (!selectedStoredEngine?.id) {
      return;
    }
    if (!window.confirm(`Delete engine "${selectedStoredEngine.name}"?`)) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const response = await fetch(`/api/engine-configs/engines/${selectedStoredEngine.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      const next = await reloadOverview();
      const nextId = next.engines[0]?.id ?? null;
      setSelectedEngineId(nextId);
      setEngineDraft(next.engines[0] ? copyEngine(next.engines[0]) : null);
      setMessage("Engine deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Engine could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedProfile() {
    if (!selectedStoredProfile?.id) {
      return;
    }
    if (!window.confirm(`Delete engine profile "${selectedStoredProfile.name}"?`)) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const response = await fetch(`/api/engine-configs/profiles/${selectedStoredProfile.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      const next = await reloadOverview();
      const nextId = next.profiles[0]?.id ?? null;
      setSelectedProfileId(nextId);
      setProfileDraft(next.profiles[0] ? copyProfile(next.profiles[0]) : null);
      setMessage("Engine profile deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Engine profile could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function useForEvaluation() {
    if (!profileDraft?.id || profileDraft.type !== "EVALUATION") {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const response = await fetch("/api/engine-configs/evaluation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: profileDraft.id }),
      });
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      const next = (await response.json()) as EngineConfigOverview;
      onOverviewChange(next);
      setMessage("Evaluation profile activated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation profile could not be activated.");
    } finally {
      setBusy(false);
    }
  }

  function updateProfileOption(name: string, value: string) {
    setProfileDraft((current) => current
      ? {
          ...current,
          optionValues: {
            ...current.optionValues,
            [name]: value,
          },
        }
      : current);
  }

  function resetProfileOptionsToDefaults() {
    if (!profileEngine) {
      return;
    }
    setProfileDraft((current) => current
      ? {
          ...current,
          optionValues: Object.fromEntries(
            Object.entries(profileEngine.options)
              .filter(([, option]) => option.type !== "button")
              .map(([name, option]) => [name, option.defaultValue ?? ""])
          ),
        }
      : current);
  }

  function renderProfileOption(name: string, option: UciOptionConfig) {
    const hint = optionHint(option);
    const value = profileDraft?.optionValues[name] ?? option.defaultValue ?? "";
    const common = (
      <div className="engine-config-option-meta">
        <span className="engine-config-option-type">{option.type}</span>
        {hint && <span>{hint}</span>}
      </div>
    );

    if (option.type === "button") {
      return null;
    }

    if (option.type === "check") {
      return (
        <label className="engine-config-option" key={name}>
          <div className="engine-config-option-label">
            <strong>{name}</strong>
            {common}
          </div>
          <input
            type="checkbox"
            checked={value.toLowerCase() === "true"}
            onChange={(event) => updateProfileOption(name, event.target.checked ? "true" : "false")}
          />
        </label>
      );
    }

    if (option.type === "combo") {
      return (
        <label className="engine-config-option" key={name}>
          <div className="engine-config-option-label">
            <strong>{name}</strong>
            {common}
          </div>
          <select value={value} onChange={(event) => updateProfileOption(name, event.target.value)}>
            {(option.vars ?? []).map((candidate) => (
              <option key={candidate} value={candidate}>{candidate}</option>
            ))}
          </select>
        </label>
      );
    }

    if (option.type === "spin") {
      return (
        <label className="engine-config-option" key={name}>
          <div className="engine-config-option-label">
            <strong>{name}</strong>
            {common}
          </div>
          <input
            type="number"
            min={option.min ?? undefined}
            max={option.max ?? undefined}
            value={value}
            onChange={(event) => updateProfileOption(name, event.target.value)}
          />
        </label>
      );
    }

    return (
      <label className="engine-config-option" key={name}>
        <div className="engine-config-option-label">
          <strong>{name}</strong>
          {common}
        </div>
        <input
          type="text"
          value={value}
          onChange={(event) => updateProfileOption(name, event.target.value)}
        />
      </label>
    );
  }

  const visibleEngineOptions = engineDraft
    ? Object.entries(engineDraft.options).filter(([name]) =>
        name.toLowerCase().includes(optionFilter.trim().toLowerCase())
      )
    : [];

  const visibleProfileOptions = profileEngine
    ? Object.entries(profileEngine.options).filter(([name]) =>
        name.toLowerCase().includes(optionFilter.trim().toLowerCase())
      )
    : [];

  return (
    <div className="engine-config-manager">
      <div className="engine-config-manager-header">
        <div>
          <strong>Engine Settings</strong>
          {overview && <span className="engine-config-version">version {overview.version}</span>}
        </div>
        <div className="engine-config-header-actions">
          <button
            type="button"
            className="engine-config-reset"
            onClick={() => void resetEngineSettings()}
            disabled={busy}
          >
            Reset Engines &amp; Profiles
          </button>
          <button type="button" onClick={onClose} disabled={busy}>Close</button>
        </div>
      </div>

      <div className="engine-config-type-tabs" role="tablist" aria-label="Engine settings area">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "ENGINES"}
          className={mode === "ENGINES" ? "active" : ""}
          onClick={() => changeMode("ENGINES")}
          disabled={busy}
        >
          Engines
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "PROFILES"}
          className={mode === "PROFILES" ? "active" : ""}
          onClick={() => changeMode("PROFILES")}
          disabled={busy}
        >
          Profiles
        </button>
      </div>

      {mode === "ENGINES" && (
        <>
          <div className="engine-config-manager-header engine-config-section-header">
            <div>
              <strong>Defined Engines</strong>
              <span className="engine-config-subtitle">Executable and UCI option schema</span>
            </div>
            <button type="button" onClick={beginCreateEngine} disabled={busy}>New Engine</button>
          </div>

          {engines.length > 0 && !creatingEngine && (
            <div className="engine-config-toolbar">
              <label>
                <span>Engine</span>
                <select
                  value={selectedEngineId ?? ""}
                  onChange={(event) => selectExistingEngine(event.target.value)}
                  disabled={busy}
                >
                  {engines.map((engine) => (
                    <option key={engine.id ?? engine.name} value={engine.id ?? ""}>
                      {engine.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {creatingEngine && !engineDraft && (
            <div className="engine-config-inspect-step">
              <div className="engine-config-step-title">1. Define engine executable</div>
              <label>
                <span>Engine name</span>
                <input
                  value={newEngineName}
                  onChange={(event) => setNewEngineName(event.target.value)}
                  placeholder="e.g. Stockfish 18"
                />
              </label>
              <label>
                <span>Engine path</span>
                <input
                  value={newEnginePath}
                  onChange={(event) => setNewEnginePath(event.target.value)}
                  placeholder="/usr/games/stockfish18 or /opt/lc0/lc0"
                />
              </label>
              <button type="button" onClick={() => void inspectEngine()} disabled={busy}>
                {busy ? "Inspecting…" : "Inspect Engine (uci)"}
              </button>
            </div>
          )}

          {engineDraft && (
            <div className="engine-config-editor">
              <div className="engine-config-step-title">
                {engineDraft.id ? "Engine definition" : "2. Review engine definition"}
              </div>
              <div className="engine-config-identity">
                <label>
                  <span>Engine name</span>
                  <input
                    value={engineDraft.name}
                    onChange={(event) => setEngineDraft({ ...engineDraft, name: event.target.value })}
                  />
                </label>
                <label>
                  <span>Executable</span>
                  <input value={engineDraft.engine} readOnly />
                </label>
                <div className="engine-config-engine-id">
                  <strong>{engineDraft.engineName}</strong>
                  {engineDraft.engineAuthor && <span>{engineDraft.engineAuthor}</span>}
                </div>
              </div>

              <div className="engine-config-options-header">
                <div>
                  <div className="engine-config-step-title">
                    UCI Option Schema ({Object.keys(engineDraft.options).length})
                  </div>
                  <span>These values describe the engine. Profiles store the concrete values.</span>
                </div>
                <div className="engine-config-option-tools">
                  <input
                    type="search"
                    value={optionFilter}
                    onChange={(event) => setOptionFilter(event.target.value)}
                    placeholder="Filter options"
                  />
                </div>
              </div>

              <div className="engine-config-options">
                {visibleEngineOptions.map(([name, option]) => (
                  <div className="engine-config-option engine-config-option-readonly" key={name}>
                    <div className="engine-config-option-label">
                      <strong>{name}</strong>
                      <div className="engine-config-option-meta">
                        <span className="engine-config-option-type">{option.type}</span>
                        {optionHint(option) && <span>{optionHint(option)}</span>}
                      </div>
                    </div>
                    <span className="engine-config-option-default">
                      {option.type === "button" ? "action" : option.defaultValue === "" ? "<empty>" : option.defaultValue ?? "–"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="engine-config-actions">
                <button type="button" onClick={() => void saveEngine()} disabled={busy || !engineDraft.name.trim()}>
                  {busy ? "Saving…" : engineDraft.id ? "Save Engine" : "Create Engine"}
                </button>
                {engineDraft.id && (
                  <button
                    type="button"
                    className="engine-config-delete"
                    onClick={() => void deleteSelectedEngine()}
                    disabled={busy}
                  >
                    Delete Engine
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {mode === "PROFILES" && (
        <>
          <div className="engine-config-manager-header engine-config-section-header">
            <div>
              <strong>Engine Profiles</strong>
              <span className="engine-config-subtitle">Engine + context-specific settings</span>
            </div>
            <button type="button" onClick={beginCreateProfile} disabled={busy}>New Profile</button>
          </div>

          {profiles.length > 0 && !creatingProfile && (
            <div className="engine-config-toolbar">
              <label>
                <span>Profile</span>
                <select
                  value={selectedProfileId ?? ""}
                  onChange={(event) => selectExistingProfile(event.target.value)}
                  disabled={busy}
                >
                  {profiles.map((profile) => (
                    <option key={profile.id ?? profile.name} value={profile.id ?? ""}>
                      {profile.name} · {purposeLabel(profile.type)}
                    </option>
                  ))}
                </select>
              </label>
              {selectedProfileId === overview?.evaluationConfigId && (
                <span className="engine-config-active-badge">Active evaluation</span>
              )}
            </div>
          )}

          {creatingProfile && !profileDraft && (
            <div className="engine-config-inspect-step">
              <div className="engine-config-step-title">1. Select a defined engine</div>
              {engines.length === 0 ? (
                <div className="engine-config-empty">
                  No engine is defined yet. Create an engine under Engines first.
                </div>
              ) : (
                <>
                  <label>
                    <span>Engine</span>
                    <select
                      value={newProfileEngineId}
                      onChange={(event) => setNewProfileEngineId(event.target.value)}
                      disabled={busy}
                    >
                      <option value="">Select engine…</option>
                      {engines.map((engine) => (
                        <option key={engine.id ?? engine.name} value={engine.id ?? ""}>
                          {engine.name} · {engine.engineName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={chooseEngineForProfile}
                    disabled={busy || !newProfileEngineId}
                  >
                    Continue
                  </button>
                </>
              )}
            </div>
          )}

          {profileDraft && profileEngine && (
            <div className="engine-config-editor">
              <div className="engine-config-step-title">
                {profileDraft.id ? "Profile settings" : "2. Configure profile"}
              </div>
              <div className="engine-config-identity">
                <label>
                  <span>Profile name</span>
                  <input
                    value={profileDraft.name}
                    onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })}
                  />
                </label>
                <label>
                  <span>Engine</span>
                  <input value={profileEngine.name} readOnly />
                </label>
                <label>
                  <span>Purpose</span>
                  <select
                    value={profileDraft.type}
                    disabled={busy || profileDraft.id !== null}
                    onChange={(event) => {
                      const type = event.target.value as EngineConfigType;
                      setProfileDraft({
                        ...profileDraft,
                        type,
                        moveTimeSeconds: type === "DEEP_ANALYSIS"
                          ? Math.max(1, profileDraft.moveTimeSeconds || 5)
                          : profileDraft.moveTimeSeconds,
                      });
                    }}
                  >
                    <option value="PLAYER">Player</option>
                    <option value="EVALUATION">Evaluation</option>
                    <option value="DEEP_ANALYSIS">Deep Analysis</option>
                  </select>
                </label>
                <div className="engine-config-engine-id">
                  <strong>{profileEngine.engineName}</strong>
                  {profileEngine.engineAuthor && <span>{profileEngine.engineAuthor}</span>}
                  <span className="engine-config-type-badge">{purposeLabel(profileDraft.type)}</span>
                </div>
              </div>

              <div className="engine-config-search-settings">
                <div className="engine-config-step-title">Search</div>
                <label>
                  <span>Depth (0 = time/clock)</span>
                  <input
                    type="number"
                    min={0}
                    value={profileDraft.depth}
                    onChange={(event) => setProfileDraft({
                      ...profileDraft,
                      depth: Math.max(0, Number(event.target.value)),
                    })}
                  />
                </label>
                <label>
                  <span>
                    {profileDraft.type === "DEEP_ANALYSIS"
                      ? "Move time s (when Depth = 0)"
                      : "Move time s (0 = player clock)"}
                  </span>
                  <input
                    type="number"
                    min={profileDraft.type === "DEEP_ANALYSIS" ? 1 : 0}
                    value={profileDraft.moveTimeSeconds}
                    onChange={(event) => setProfileDraft({
                      ...profileDraft,
                      moveTimeSeconds: Math.max(
                        profileDraft.type === "DEEP_ANALYSIS" ? 1 : 0,
                        Number(event.target.value)
                      ),
                    })}
                  />
                </label>
              </div>

              <div className="engine-config-options-header">
                <div>
                  <div className="engine-config-step-title">
                    Profile UCI Options ({Object.keys(profileDraft.optionValues).length})
                  </div>
                  <span>The option schema comes from {profileEngine.name}; this profile stores only its values.</span>
                </div>
                <div className="engine-config-option-tools">
                  <input
                    type="search"
                    value={optionFilter}
                    onChange={(event) => setOptionFilter(event.target.value)}
                    placeholder="Filter options"
                  />
                  <button type="button" onClick={resetProfileOptionsToDefaults} disabled={busy}>
                    Reset defaults
                  </button>
                </div>
              </div>

              <div className="engine-config-options">
                {visibleProfileOptions.map(([name, option]) => renderProfileOption(name, option))}
                {visibleProfileOptions.length === 0 && (
                  <div className="engine-config-no-options">No matching UCI options.</div>
                )}
              </div>

              <div className="engine-config-actions">
                {profileDraft.type === "EVALUATION" && profileDraft.id && !isActiveEvaluation && (
                  <button type="button" onClick={() => void useForEvaluation()} disabled={busy}>
                    Use for Evaluation
                  </button>
                )}
                {isActiveEvaluation && (
                  <span className="engine-config-active-badge">Active evaluation</span>
                )}
                <button
                  type="button"
                  onClick={() => void saveProfile()}
                  disabled={busy || !profileDraft.name.trim()}
                >
                  {busy ? "Saving…" : profileDraft.id ? "Save Profile" : "Create Profile"}
                </button>
                {profileDraft.id && (
                  <button
                    type="button"
                    className="engine-config-delete"
                    onClick={() => void deleteSelectedProfile()}
                    disabled={busy}
                  >
                    Delete Profile
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {message && <div className="engine-config-message">{message}</div>}
      {error && <div className="engine-error">{error}</div>}
    </div>
  );
}
