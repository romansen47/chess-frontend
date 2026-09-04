import { useEffect, useMemo, useState } from "react";
import type {
  EngineConfigOverview,
  EngineDefinition,
  EngineProfile,
  EngineProfileAssignments,
  UciOptionConfig,
} from "./engineConfig";
import { fetchEngineConfigOverview } from "./engineConfig";
import "./EngineConfigManager.css";
import "./EngineConfigOptionPopup.css";

interface EngineConfigManagerProps {
  overview: EngineConfigOverview | null;
  onOverviewChange: (overview: EngineConfigOverview) => void;
  onClose: () => void;
}

type ManagerMode = "DEFAULTS" | "PROFILES" | "ENGINES";
type AssignmentKey = keyof EngineProfileAssignments;

interface ProfileOptionEditorState {
  name: string;
  option: UciOptionConfig;
  value: string;
}

const EMPTY_ASSIGNMENTS: EngineProfileAssignments = {
  whitePlayerProfileId: "",
  blackPlayerProfileId: "",
  evaluationProfileId: "",
  deepAnalysisProfileId: "",
};

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

function copyAssignments(assignments: EngineProfileAssignments | null | undefined): EngineProfileAssignments {
  return assignments ? { ...assignments } : { ...EMPTY_ASSIGNMENTS };
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

function displayOptionValue(option: UciOptionConfig, value: string): string {
  if (option.type === "button") {
    return "action";
  }
  return value === "" ? "<empty>" : value;
}

function defaultProfileForEngine(engine: EngineDefinition): EngineProfile {
  return {
    id: null,
    name: `${engine.name} Profile`,
    engineId: engine.id ?? "",
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
  const [mode, setMode] = useState<ManagerMode>("DEFAULTS");
  const [defaultsDraft, setDefaultsDraft] = useState<EngineProfileAssignments>(() =>
    copyAssignments(overview?.defaults)
  );

  const [selectedEngineId, setSelectedEngineId] = useState<string | null>(null);
  const [engineDraft, setEngineDraft] = useState<EngineDefinition | null>(null);
  const [creatingEngine, setCreatingEngine] = useState(false);
  const [newEngineName, setNewEngineName] = useState("");

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<EngineProfile | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [newProfileEngineId, setNewProfileEngineId] = useState("");
  const [profileOptionEditor, setProfileOptionEditor] = useState<ProfileOptionEditorState | null>(null);

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

  const fallbackProfile = useMemo(
    () => profiles.find((profile) => profile.id === overview?.fallbackProfileId) ?? null,
    [profiles, overview?.fallbackProfileId]
  );

  const fallbackEngine = useMemo(
    () => engines.find((engine) => engine.id === fallbackProfile?.engineId) ?? null,
    [engines, fallbackProfile?.engineId]
  );

  const isFallbackProfile = profileDraft?.id != null && profileDraft.id === overview?.fallbackProfileId;

  useEffect(() => {
    if (overview) {
      setDefaultsDraft(copyAssignments(overview.defaults));
    }
  }, [overview]);

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
    setProfileOptionEditor(null);
    setOptionFilter("");
    setMessage(null);
    setError(null);
  }

  function selectExistingEngine(id: string) {
    setCreatingEngine(false);
    setSelectedEngineId(id);
    const selected = engines.find((engine) => engine.id === id);
    setEngineDraft(selected ? copyEngine(selected) : null);
    setProfileOptionEditor(null);
    setOptionFilter("");
    setMessage(null);
    setError(null);
  }

  function selectExistingProfile(id: string) {
    setCreatingProfile(false);
    setSelectedProfileId(id);
    const selected = profiles.find((profile) => profile.id === id);
    setProfileDraft(selected ? copyProfile(selected) : null);
    setProfileOptionEditor(null);
    setOptionFilter("");
    setMessage(null);
    setError(null);
  }

  function beginCreateEngine() {
    setMode("ENGINES");
    setCreatingEngine(true);
    setSelectedEngineId(null);
    setEngineDraft(null);
    setNewEngineName("");
    setProfileOptionEditor(null);
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
    setProfileOptionEditor(null);
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
    setMessage(`${engine.name} selected. Its UCI defaults are now the starting values of this profile.`);
  }

  async function inspectEngine() {
    const requestedName = (engineDraft?.id ? "" : engineDraft?.name ?? newEngineName).trim();

    try {
      setBusy(true);
      setError(null);
      setMessage("Opening system file picker…");
      const response = await fetch("/api/engine-configs/engines/select", {
        method: "POST",
      });
      if (response.status === 204) {
        setMessage(null);
        return;
      }
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      const inspected = (await response.json()) as EngineDefinition;
      if (requestedName) {
        inspected.name = requestedName;
      }
      setEngineDraft(copyEngine(inspected));
      setNewEngineName(inspected.name);
      setOptionFilter("");
      setMessage(
        `${inspected.engineName} detected · ${Object.keys(inspected.options).length} UCI options`
      );
    } catch (e) {
      setEngineDraft(null);
      setMessage(null);
      setError(e instanceof Error ? e.message : "Engine could not be selected or inspected.");
    } finally {
      setBusy(false);
    }
  }

  async function reloadOverview() {
    const next = await fetchEngineConfigOverview();
    onOverviewChange(next);
    return next;
  }

  async function scanSystemEngines() {
    try {
      setBusy(true);
      setError(null);
      setMessage("Scanning /usr/games and validating UCI handshakes…");

      const previousEngineCount = overview?.engines.length ?? 0;
      const previousProfileCount = overview?.profiles.length ?? 0;
      const response = await fetch("/api/engine-configs/discover", { method: "POST" });
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }

      const next = (await response.json()) as EngineConfigOverview;
      onOverviewChange(next);
      setDefaultsDraft(copyAssignments(next.defaults));

      const addedEngines = Math.max(0, next.engines.length - previousEngineCount);
      const addedProfiles = Math.max(0, next.profiles.length - previousProfileCount);
      if (addedEngines === 0) {
        setMessage("Scan complete. No new responsive UCI engines found in /usr/games.");
      } else {
        setMessage(
          `Scan complete. Added ${addedEngines} UCI engine${addedEngines === 1 ? "" : "s"}` +
          ` and ${addedProfiles} default profile${addedProfiles === 1 ? "" : "s"}.`
        );
      }
    } catch (e) {
      setMessage(null);
      setError(e instanceof Error ? e.message : "System engines could not be scanned.");
    } finally {
      setBusy(false);
    }
  }

  async function resetEngineSettings() {
    const confirmed = window.confirm(
      "Delete all saved engines and profiles? /usr/games will be scanned again. " +
      "Only executables that complete a UCI handshake will be imported, each with a default profile. " +
      "/usr/games/stockfish is preferred as fallback when available."
    );
    if (!confirmed) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      setProfileOptionEditor(null);

      const response = await fetch("/api/engine-configs/reset", { method: "POST" });
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }

      const next = (await response.json()) as EngineConfigOverview;
      onOverviewChange(next);
      setDefaultsDraft(copyAssignments(next.defaults));

      setCreatingEngine(false);
      setCreatingProfile(false);
      setNewEngineName("");
      setNewProfileEngineId("");
      setOptionFilter("");
      setMode("DEFAULTS");

      const nextProfile =
        next.profiles.find((profile) => profile.id === next.fallbackProfileId) ??
        next.profiles[0] ??
        null;
      const nextEngine =
        next.engines.find((engine) => engine.id === nextProfile?.engineId) ??
        next.engines[0] ??
        null;
      setSelectedEngineId(nextEngine?.id ?? null);
      setEngineDraft(nextEngine ? copyEngine(nextEngine) : null);
      setSelectedProfileId(nextProfile?.id ?? null);
      setProfileDraft(nextProfile ? copyProfile(nextProfile) : null);

      setMessage(
        `Engine settings reset. ${next.engines.length} engine${next.engines.length === 1 ? "" : "s"} available; ` +
        `fallback: ${nextEngine?.engine ?? "none"}.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Engine settings could not be reset.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDefaults() {
    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      const response = await fetch("/api/engine-configs/defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaultsDraft),
      });
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      const next = (await response.json()) as EngineConfigOverview;
      onOverviewChange(next);
      setDefaultsDraft(copyAssignments(next.defaults));
      setMessage("Default profile assignments saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Default profile assignments could not be saved.");
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
      const saved = (await response.json()) as EngineDefinition;
      const next = await reloadOverview();
      const selected = next.engines.find((engine) => engine.id === saved.id) ?? saved;
      setCreatingEngine(false);
      setSelectedEngineId(selected.id);
      setEngineDraft(copyEngine(selected));
      setMessage(isNew ? "Engine created." : "Engine saved.");
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
        }
      );
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      const saved = (await response.json()) as EngineProfile;
      const next = await reloadOverview();
      const selected = next.profiles.find((profile) => profile.id === saved.id) ?? saved;
      setCreatingProfile(false);
      setSelectedProfileId(selected.id);
      setProfileDraft(copyProfile(selected));
      setMessage(isNew ? "Engine profile created." : "Engine profile saved.");
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
      const nextEngine = next.engines[0] ?? null;
      setSelectedEngineId(nextEngine?.id ?? null);
      setEngineDraft(nextEngine ? copyEngine(nextEngine) : null);
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
      setProfileOptionEditor(null);
      const response = await fetch(`/api/engine-configs/profiles/${selectedStoredProfile.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      const next = await reloadOverview();
      const nextProfile = next.profiles[0] ?? null;
      setSelectedProfileId(nextProfile?.id ?? null);
      setProfileDraft(nextProfile ? copyProfile(nextProfile) : null);
      setMessage("Engine profile deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Engine profile could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  function assignmentLabels(profileId: string | null): string[] {
    if (!profileId || !overview) {
      return [];
    }
    const result: string[] = [];
    if (overview.defaults.whitePlayerProfileId === profileId) result.push("White CPU");
    if (overview.defaults.blackPlayerProfileId === profileId) result.push("Black CPU");
    if (overview.defaults.evaluationProfileId === profileId) result.push("Evaluation");
    if (overview.defaults.deepAnalysisProfileId === profileId) result.push("Deep Analysis");
    return result;
  }

  function isAssignedProfile(profileId: string | null): boolean {
    return assignmentLabels(profileId).length > 0;
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

  function openProfileOptionEditor(name: string, option: UciOptionConfig, value: string) {
    if (busy || option.type === "button") {
      return;
    }
    setProfileOptionEditor({ name, option, value });
  }

  function applyProfileOptionEditor() {
    if (!profileOptionEditor) {
      return;
    }
    updateProfileOption(profileOptionEditor.name, profileOptionEditor.value);
    setProfileOptionEditor(null);
  }

  function resetProfileOptionsToDefaults() {
    if (!profileEngine) {
      return;
    }
    setProfileOptionEditor(null);
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

  function renderOption(
    name: string,
    option: UciOptionConfig,
    value: string,
    disabled = false
  ) {
    const hint = optionHint(option);
    const displayValue = displayOptionValue(option, value);
    const common = (
      <div className="engine-config-option-meta">
        <span className="engine-config-option-type">{option.type}</span>
        {hint && <span>{hint}</span>}
      </div>
    );

    if (disabled || option.type === "button") {
      return (
        <div className="engine-config-option engine-config-option-readonly" key={name}>
          <div className="engine-config-option-label">
            <strong>{name}</strong>
            {common}
          </div>
          <span className="engine-config-option-default" title={displayValue}>
            {displayValue}
          </span>
        </div>
      );
    }

    return (
      <div className="engine-config-option" key={name}>
        <div className="engine-config-option-label">
          <strong>{name}</strong>
          {common}
        </div>
        <button
          type="button"
          className="engine-config-option-value-button"
          title={`${name}: ${displayValue} · click to edit`}
          onClick={() => openProfileOptionEditor(name, option, value)}
          disabled={busy}
        >
          {displayValue}
        </button>
      </div>
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

  function profileAndEngine(profileId: string) {
    const profile = profiles.find((candidate) => candidate.id === profileId) ?? null;
    const engine = profile
      ? engines.find((candidate) => candidate.id === profile.engineId) ?? null
      : null;
    return { profile, engine };
  }

  function renderAssignmentCard(
    key: AssignmentKey,
    title: string,
    description: string
  ) {
    const selectedId = defaultsDraft[key] ?? "";
    const { profile, engine } = profileAndEngine(selectedId);
    return (
      <label className="engine-config-default-card" key={key}>
        <div className="engine-config-default-card-heading">
          <div>
            <strong>{title}</strong>
            <span>{description}</span>
          </div>
          {selectedId === overview?.fallbackProfileId && (
            <span className="engine-config-chip">Fallback</span>
          )}
        </div>
        <select
          value={selectedId}
          onChange={(event) => setDefaultsDraft({ ...defaultsDraft, [key]: event.target.value })}
          disabled={busy || profiles.length === 0}
        >
          {profiles.map((candidate) => (
            <option key={candidate.id ?? candidate.name} value={candidate.id ?? ""}>
              {candidate.name}
            </option>
          ))}
        </select>
        <div className="engine-config-default-card-meta">
          <span>{engine?.name ?? "Unknown engine"}</span>
          <span className="engine-config-default-card-path">{engine?.engine ?? "–"}</span>
        </div>
      </label>
    );
  }

  return (
    <div className="engine-config-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="engine-config-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Engine Settings"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="engine-config-dialog-header">
          <div>
            <h2>Engine Settings</h2>
            <div className="engine-config-dialog-subtitle">
              Engines, reusable profiles, and their assignments
              {overview && <span> · Version {overview.version}</span>}
            </div>
          </div>
          <div className="engine-config-header-actions">
            <button
              type="button"
              onClick={() => void scanSystemEngines()}
              disabled={busy}
            >
              Scan /usr/games
            </button>
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
        </header>

        {error && <div className="engine-config-error-banner">{error}</div>}
        {message && <div className="engine-config-message-banner">{message}</div>}

        <div className="engine-config-tabs" role="tablist" aria-label="Engine settings area">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "DEFAULTS"}
            className={mode === "DEFAULTS" ? "active" : ""}
            onClick={() => changeMode("DEFAULTS")}
            disabled={busy}
          >
            Defaults
            <span className="engine-config-tab-count">4</span>
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
            <span className="engine-config-tab-count">{profiles.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "ENGINES"}
            className={mode === "ENGINES" ? "active" : ""}
            onClick={() => changeMode("ENGINES")}
            disabled={busy}
          >
            Engines
            <span className="engine-config-tab-count">{engines.length}</span>
          </button>
        </div>

        <div className="engine-config-body">
          {mode === "DEFAULTS" ? (
            <>
              <aside className="engine-config-sidebar">
                <div className="engine-config-sidebar-header">
                  <div>
                    <strong>Use Cases</strong>
                    <span>Profiles are independent of their use case</span>
                  </div>
                </div>
                <div className="engine-config-nav-list engine-config-assignment-list">
                  {([
                    ["whitePlayerProfileId", "White CPU"],
                    ["blackPlayerProfileId", "Black CPU"],
                    ["evaluationProfileId", "Live Evaluation"],
                    ["deepAnalysisProfileId", "Deep Analysis"],
                  ] as Array<[AssignmentKey, string]>).map(([key, label]) => {
                    const { profile, engine } = profileAndEngine(defaultsDraft[key]);
                    return (
                      <div className="engine-config-nav-item engine-config-assignment-summary" key={key}>
                        <span className="engine-config-nav-title">{label}</span>
                        <span className="engine-config-nav-meta">{profile?.name ?? "No profile"}</span>
                        <span className="engine-config-nav-path">{engine?.name ?? "–"}</span>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <main className="engine-config-details">
                <div className="engine-config-editor">
                  <div className="engine-config-details-heading">
                    <div>
                      <strong>Default Profile Assignments</strong>
                      <span>
                        A profile only describes its engine configuration. This section defines
                        which profile each use case uses by default.
                      </span>
                    </div>
                    <span className="engine-config-chip">Global</span>
                  </div>

                  <div className="engine-config-default-info">
                    The fallback profile remains bound to <strong>{fallbackEngine?.engine ?? "the detected UCI engine"}</strong> so the
                    application always has a valid engine profile available. It can be edited like any other profile, but it cannot be deleted
                    while it is the fallback. <strong>/usr/games/stockfish</strong> is preferred as the fallback engine when available.
                  </div>

                  <div className="engine-config-default-grid">
                    {renderAssignmentCard(
                      "whitePlayerProfileId",
                      "White CPU Player",
                      "Profile used when White is controlled by the computer."
                    )}
                    {renderAssignmentCard(
                      "blackPlayerProfileId",
                      "Black CPU Player",
                      "Profile used when Black is controlled by the computer."
                    )}
                    {renderAssignmentCard(
                      "evaluationProfileId",
                      "Live Evaluation",
                      "Profile used for live position evaluation."
                    )}
                    {renderAssignmentCard(
                      "deepAnalysisProfileId",
                      "Deep Analysis",
                      "Default selection for a new Deep Analysis run."
                    )}
                  </div>

                  <div className="engine-config-actions engine-config-actions-footer">
                    <div className="engine-config-actions-spacer" />
                    <button
                      type="button"
                      onClick={() => void saveDefaults()}
                      disabled={busy || profiles.length === 0}
                    >
                      {busy ? "Saving…" : "Save Defaults"}
                    </button>
                  </div>
                </div>
              </main>
            </>
          ) : (
            <>
              <aside className="engine-config-sidebar">
                <div className="engine-config-sidebar-header">
                  <div>
                    <strong>{mode === "ENGINES" ? "Defined Engines" : "Engine Profiles"}</strong>
                    <span>
                      {mode === "ENGINES"
                        ? "Executable und UCI-Definition"
                        : "Engine and concrete UCI values"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={mode === "ENGINES" ? beginCreateEngine : beginCreateProfile}
                    disabled={busy}
                  >
                    {mode === "ENGINES" ? "New Engine" : "New Profile"}
                  </button>
                </div>

                <div className="engine-config-nav-list">
                  {mode === "ENGINES" && engines.length === 0 && (
                    <div className="engine-config-empty">No engine has been defined yet.</div>
                  )}
                  {mode === "ENGINES" && engines.map((engine) => (
                    <button
                      type="button"
                      key={engine.id ?? engine.name}
                      className={`engine-config-nav-item${
                        !creatingEngine && selectedEngineId === engine.id
                          ? " engine-config-nav-item-selected"
                          : ""
                      }`}
                      onClick={() => engine.id && selectExistingEngine(engine.id)}
                      disabled={busy || !engine.id}
                    >
                      <span className="engine-config-nav-title">{engine.name}</span>
                      <span className="engine-config-nav-meta">
                        {engine.engineName || "UCI Engine"}
                        {engine.engineAuthor ? ` · ${engine.engineAuthor}` : ""}
                      </span>
                      <span className="engine-config-nav-path">{engine.engine}</span>
                    </button>
                  ))}

                  {mode === "PROFILES" && profiles.length === 0 && (
                    <div className="engine-config-empty">No profile has been defined yet.</div>
                  )}
                  {mode === "PROFILES" && profiles.map((profile) => {
                    const engine = engines.find((candidate) => candidate.id === profile.engineId);
                    const labels = assignmentLabels(profile.id);
                    const fallback = profile.id === overview?.fallbackProfileId;
                    return (
                      <button
                        type="button"
                        key={profile.id ?? profile.name}
                        className={`engine-config-nav-item${
                          !creatingProfile && selectedProfileId === profile.id
                            ? " engine-config-nav-item-selected"
                            : ""
                        }`}
                        onClick={() => profile.id && selectExistingProfile(profile.id)}
                        disabled={busy || !profile.id}
                      >
                        <span className="engine-config-nav-title-row">
                          <span className="engine-config-nav-title">{profile.name}</span>
                          {(labels.length > 0 || fallback) && (
                            <span className="engine-config-nav-active-dot" title="Assigned profile" />
                          )}
                        </span>
                        <span className="engine-config-nav-meta">{engine?.name ?? "Unknown engine"}</span>
                        <span className="engine-config-nav-path">
                          {fallback ? "Fallback" : labels.length > 0 ? labels.join(" · ") : "Reusable profile"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <main className="engine-config-details">
                {mode === "ENGINES" && (
                  <>
                    {creatingEngine && !engineDraft && (
                      <div className="engine-config-create-card">
                        <div className="engine-config-details-heading">
                          <div>
                            <strong>Neue Engine definieren</strong>
                            <span>Step 1 · Select the executable using the system file picker</span>
                          </div>
                        </div>
                        <div className="engine-config-form-grid">
                          <label>
                            <span>Engine name (optional)</span>
                            <input
                              value={newEngineName}
                              onChange={(event) => setNewEngineName(event.target.value)}
                              placeholder="Otherwise taken from the UCI engine"
                            />
                          </label>
                        </div>
                        <div className="engine-config-default-info">
                          The file dialog opens on the computer running the backend. After selection, the engine is inspected automatically through UCI.
                        </div>
                        <div className="engine-config-actions">
                          <button type="button" onClick={() => void inspectEngine()} disabled={busy}>
                            {busy ? "File picker is open…" : "Select engine file…"}
                          </button>
                        </div>
                      </div>
                    )}

                    {!creatingEngine && !engineDraft && (
                      <div className="engine-config-details-empty">
                        <strong>No engine selected</strong>
                        <span>Select an engine on the left or create a new definition.</span>
                      </div>
                    )}

                    {engineDraft && (
                      <div className="engine-config-editor">
                        <div className="engine-config-details-heading">
                          <div>
                            <strong>{engineDraft.id ? engineDraft.name : "Review engine definition"}</strong>
                            <span>
                              {engineDraft.id
                                ? "UCI metadata and detected engine capabilities"
                                : "Step 2 · Review and save the detected engine and UCI capabilities"}
                            </span>
                          </div>
                          <span className="engine-config-chip">
                            {Object.keys(engineDraft.options).length} UCI options
                          </span>
                        </div>

                        <div className="engine-config-form-grid">
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
                        </div>

                        <div className="engine-config-engine-summary">
                          <div>
                            <span>UCI name</span>
                            <strong>{engineDraft.engineName || "–"}</strong>
                          </div>
                          <div>
                            <span>Author</span>
                            <strong>{engineDraft.engineAuthor || "–"}</strong>
                          </div>
                          <div>
                            <span>Options</span>
                            <strong>{Object.keys(engineDraft.options).length}</strong>
                          </div>
                        </div>

                        <div className="engine-config-options-header">
                          <div>
                            <strong>Available UCI Options</strong>
                            <span>
                              Capabilities and original defaults reported by the engine. Concrete values are configured exclusively in profiles.
                            </span>
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
                          {visibleEngineOptions.map(([name, option]) =>
                            renderOption(
                              name,
                              option,
                              option.defaultValue ?? "",
                              true
                            )
                          )}
                          {visibleEngineOptions.length === 0 && (
                            <div className="engine-config-no-options">No matching UCI options.</div>
                          )}
                        </div>

                        <div className="engine-config-actions engine-config-actions-footer">
                          {engineDraft.id ? (
                            <button
                              type="button"
                              className="engine-config-delete"
                              onClick={() => void deleteSelectedEngine()}
                              disabled={busy}
                            >
                              Delete Engine
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void inspectEngine()}
                              disabled={busy}
                            >
                              {busy ? "File picker is open…" : "Select another engine…"}
                            </button>
                          )}
                          <div className="engine-config-actions-spacer" />
                          <button
                            type="button"
                            onClick={() => void saveEngine()}
                            disabled={busy || !engineDraft.name.trim()}
                          >
                            {busy ? "Saving…" : engineDraft.id ? "Save Engine" : "Create Engine"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {mode === "PROFILES" && (
                  <>
                    {creatingProfile && !profileDraft && (
                      <div className="engine-config-create-card">
                        <div className="engine-config-details-heading">
                          <div>
                            <strong>New profile</strong>
                            <span>Step 1 · Select an already defined engine</span>
                          </div>
                        </div>
                        {engines.length === 0 ? (
                          <div className="engine-config-details-empty">
                            <strong>No engine available</strong>
                            <span>Definiere zuerst unter Engines eine UCI-Engine.</span>
                          </div>
                        ) : (
                          <>
                            <div className="engine-config-form-grid">
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
                            </div>
                            <div className="engine-config-actions">
                              <button
                                type="button"
                                onClick={chooseEngineForProfile}
                                disabled={busy || !newProfileEngineId}
                              >
                                Continue
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {!creatingProfile && !profileDraft && (
                      <div className="engine-config-details-empty">
                        <strong>No profile selected</strong>
                        <span>Select a profile on the left or create a new one.</span>
                      </div>
                    )}

                    {profileDraft && profileEngine && (
                      <div className="engine-config-editor">
                        <div className="engine-config-details-heading">
                          <div>
                            <strong>{profileDraft.id ? profileDraft.name : "Configure profile"}</strong>
                            <span>
                              {profileDraft.id
                                ? `${profileEngine.name} · reusable engine configuration`
                                : `Step 2 · Configure UCI values for ${profileEngine.name}`}
                            </span>
                          </div>
                          <div className="engine-config-heading-badges">
                            {isFallbackProfile && <span className="engine-config-chip">Fallback</span>}
                            {assignmentLabels(profileDraft.id).map((label) => (
                              <span className="engine-config-chip engine-config-chip-active" key={label}>{label}</span>
                            ))}
                          </div>
                        </div>

                        {isFallbackProfile && (
                          <div className="engine-config-default-info">
                            This profile is the fallback for <strong>{profileEngine.engine}</strong>. It can be edited like any other profile,
                            but it cannot be deleted while it is the fallback.
                          </div>
                        )}

                        <div className="engine-config-form-grid">
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
                        </div>

                        <div className="engine-config-options-header">
                          <div>
                            <strong>Profile UCI Options ({Object.keys(profileDraft.optionValues).length})</strong>
                            <span>
                              Values are only displayed here. Click a value to edit that specific option.
                            </span>
                          </div>
                          <div className="engine-config-option-tools">
                            <input
                              type="search"
                              value={optionFilter}
                              onChange={(event) => setOptionFilter(event.target.value)}
                              placeholder="Filter options"
                            />
                            <button
                              type="button"
                              onClick={resetProfileOptionsToDefaults}
                              disabled={busy}
                            >
                              Reset defaults
                            </button>
                          </div>
                        </div>

                        <div className="engine-config-options">
                          {visibleProfileOptions.map(([name, option]) =>
                            renderOption(
                              name,
                              option,
                              profileDraft.optionValues[name] ?? option.defaultValue ?? ""
                            )
                          )}
                          {visibleProfileOptions.length === 0 && (
                            <div className="engine-config-no-options">No matching UCI options.</div>
                          )}
                        </div>

                        <div className="engine-config-actions engine-config-actions-footer">
                          {profileDraft.id && (
                            <button
                              type="button"
                              className="engine-config-delete"
                              onClick={() => void deleteSelectedProfile()}
                              disabled={busy || isFallbackProfile || isAssignedProfile(profileDraft.id)}
                              title={
                                isFallbackProfile
                                  ? "Fallback profile cannot be deleted"
                                  : isAssignedProfile(profileDraft.id)
                                    ? "Remove this profile from Defaults before deleting it"
                                    : undefined
                              }
                            >
                              Delete Profile
                            </button>
                          )}
                          <div className="engine-config-actions-spacer" />
                          <button
                            type="button"
                            onClick={() => void saveProfile()}
                            disabled={busy || !profileDraft.name.trim()}
                          >
                            {busy ? "Saving…" : profileDraft.id ? "Save Profile" : "Create Profile"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </main>
            </>
          )}
        </div>

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
              aria-label={`Edit ${profileOptionEditor.name}`}
              onMouseDown={(event) => event.stopPropagation()}
              onSubmit={(event) => {
                event.preventDefault();
                applyProfileOptionEditor();
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setProfileOptionEditor(null);
                }
              }}
            >
              <div className="engine-config-option-popup-header">
                <div className="engine-config-option-popup-title">
                  <strong>{profileOptionEditor.name}</strong>
                  <div className="engine-config-option-popup-meta">
                    <span className="engine-config-option-type">{profileOptionEditor.option.type}</span>
                    {optionHint(profileOptionEditor.option) && (
                      <span>{optionHint(profileOptionEditor.option)}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileOptionEditor(null)}
                  aria-label="Close editor"
                >
                  ×
                </button>
              </div>

              <label className="engine-config-option-popup-editor">
                <span>Profile value</span>
                {profileOptionEditor.option.type === "check" ? (
                  <span className="engine-config-option-popup-check">
                    <input
                      type="checkbox"
                      checked={profileOptionEditor.value.toLowerCase() === "true"}
                      onChange={(event) => setProfileOptionEditor({
                        ...profileOptionEditor,
                        value: event.target.checked ? "true" : "false",
                      })}
                      autoFocus
                    />
                    <span>{profileOptionEditor.value.toLowerCase() === "true" ? "true" : "false"}</span>
                  </span>
                ) : profileOptionEditor.option.type === "combo" ? (
                  <select
                    value={profileOptionEditor.value}
                    onChange={(event) => setProfileOptionEditor({
                      ...profileOptionEditor,
                      value: event.target.value,
                    })}
                    autoFocus
                  >
                    {(profileOptionEditor.option.vars ?? []).map((candidate) => (
                      <option key={candidate} value={candidate}>{candidate}</option>
                    ))}
                  </select>
                ) : profileOptionEditor.option.type === "spin" ? (
                  <input
                    type="number"
                    min={profileOptionEditor.option.min ?? undefined}
                    max={profileOptionEditor.option.max ?? undefined}
                    value={profileOptionEditor.value}
                    onChange={(event) => setProfileOptionEditor({
                      ...profileOptionEditor,
                      value: event.target.value,
                    })}
                    required
                    autoFocus
                  />
                ) : (
                  <input
                    type="text"
                    value={profileOptionEditor.value}
                    onChange={(event) => setProfileOptionEditor({
                      ...profileOptionEditor,
                      value: event.target.value,
                    })}
                    autoFocus
                  />
                )}
              </label>

              <div className="engine-config-option-popup-actions">
                <button type="button" onClick={() => setProfileOptionEditor(null)}>
                  Cancel
                </button>
                <button type="submit">Apply</button>
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
