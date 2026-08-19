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

interface EngineConfigManagerProps {
  overview: EngineConfigOverview | null;
  onOverviewChange: (overview: EngineConfigOverview) => void;
  onClose: () => void;
}

type ManagerMode = "DEFAULTS" | "PROFILES" | "ENGINES";
type AssignmentKey = keyof EngineProfileAssignments;

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
    setMessage(`${engine.name} selected. Its UCI defaults are now the starting values of this profile.`);
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
      "/usr/games/stockfish, one fallback profile using its UCI defaults, and all four default assignments pointing to it."
    );
    if (!confirmed) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setMessage(null);

      const response = await fetch("/api/engine-configs/reset", { method: "POST" });
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }

      const next = (await response.json()) as EngineConfigOverview;
      onOverviewChange(next);
      setDefaultsDraft(copyAssignments(next.defaults));

      setCreatingEngine(false);
      setCreatingProfile(false);
      setNewEnginePath("");
      setNewEngineName("");
      setNewProfileEngineId("");
      setOptionFilter("");
      setMode("DEFAULTS");

      const nextEngine = next.engines[0] ?? null;
      setSelectedEngineId(nextEngine?.id ?? null);
      setEngineDraft(nextEngine ? copyEngine(nextEngine) : null);

      const nextProfile =
        next.profiles.find((profile) => profile.id === next.fallbackProfileId) ??
        next.profiles[0] ??
        null;
      setSelectedProfileId(nextProfile?.id ?? null);
      setProfileDraft(nextProfile ? copyProfile(nextProfile) : null);

      setMessage(
        "Engine settings reset. /usr/games/stockfish is the fallback; all default assignments use its UCI-default profile."
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

  function updateEngineDefault(name: string, value: string) {
    setEngineDraft((current) => {
      if (!current || !current.options[name]) {
        return current;
      }
      return {
        ...current,
        options: {
          ...current.options,
          [name]: {
            ...current.options[name],
            defaultValue: value,
            value,
          },
        },
      };
    });
  }

  function resetProfileOptionsToDefaults() {
    if (!profileEngine || isFallbackProfile) {
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

  function renderEditableOption(
    name: string,
    option: UciOptionConfig,
    value: string,
    update: (name: string, value: string) => void,
    disabled = false
  ) {
    const hint = optionHint(option);
    const common = (
      <div className="engine-config-option-meta">
        <span className="engine-config-option-type">{option.type}</span>
        {hint && <span>{hint}</span>}
      </div>
    );

    if (option.type === "button") {
      return (
        <div className="engine-config-option engine-config-option-readonly" key={name}>
          <div className="engine-config-option-label">
            <strong>{name}</strong>
            {common}
          </div>
          <span className="engine-config-option-default">action</span>
        </div>
      );
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
            onChange={(event) => update(name, event.target.checked ? "true" : "false")}
            disabled={disabled || busy}
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
          <select
            value={value}
            onChange={(event) => update(name, event.target.value)}
            disabled={disabled || busy}
          >
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
            onChange={(event) => update(name, event.target.value)}
            disabled={disabled || busy}
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
          onChange={(event) => update(name, event.target.value)}
          disabled={disabled || busy}
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
              Engines, wiederverwendbare Profile und ihre Verwendung
              {overview && <span> · Version {overview.version}</span>}
            </div>
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
            <button type="button" onClick={onClose} disabled={busy}>Schließen</button>
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
                    <span>Profile sind unabhängig vom Einsatzzweck</span>
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
                        Ein Profil beschreibt nur seine Engine-Konfiguration. Hier wird festgelegt,
                        welches Profil ein konkreter Anwendungsfall standardmäßig benutzt.
                      </span>
                    </div>
                    <span className="engine-config-chip">Global</span>
                  </div>

                  <div className="engine-config-default-info">
                    Das Fallback-Profil bleibt immer an <strong>/usr/games/stockfish</strong> mit dessen
                    UCI-Defaultwerten gebunden. Jedes andere Profil kann gleichzeitig mehreren Aufgaben
                    zugewiesen werden.
                  </div>

                  <div className="engine-config-default-grid">
                    {renderAssignmentCard(
                      "whitePlayerProfileId",
                      "White CPU Player",
                      "Profil, sobald Weiß als Computer spielt."
                    )}
                    {renderAssignmentCard(
                      "blackPlayerProfileId",
                      "Black CPU Player",
                      "Profil, sobald Schwarz als Computer spielt."
                    )}
                    {renderAssignmentCard(
                      "evaluationProfileId",
                      "Live Evaluation",
                      "Profil für die laufende Stellungsbewertung."
                    )}
                    {renderAssignmentCard(
                      "deepAnalysisProfileId",
                      "Deep Analysis",
                      "Vorauswahl für einen neuen Deep-Analysis-Lauf."
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
                        : "Engine und konkrete UCI-Werte"}
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
                    <div className="engine-config-empty">Noch keine Engine definiert.</div>
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
                    <div className="engine-config-empty">Noch kein Profil definiert.</div>
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
                            <span>Schritt 1 · Executable auswählen und UCI-Definition einlesen</span>
                          </div>
                        </div>
                        <div className="engine-config-form-grid engine-config-form-grid-wide">
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
                        </div>
                        <div className="engine-config-actions">
                          <button type="button" onClick={() => void inspectEngine()} disabled={busy}>
                            {busy ? "Inspecting…" : "Inspect Engine (uci)"}
                          </button>
                        </div>
                      </div>
                    )}

                    {!creatingEngine && !engineDraft && (
                      <div className="engine-config-details-empty">
                        <strong>Keine Engine ausgewählt</strong>
                        <span>Wähle links eine Engine oder lege eine neue Definition an.</span>
                      </div>
                    )}

                    {engineDraft && (
                      <div className="engine-config-editor">
                        <div className="engine-config-details-heading">
                          <div>
                            <strong>{engineDraft.id ? engineDraft.name : "Engine definition prüfen"}</strong>
                            <span>
                              {engineDraft.id
                                ? "UCI-Metadaten und editierbare Engine-Defaults"
                                : "Schritt 2 · Erkannte Engine prüfen, Defaults anpassen und speichern"}
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
                            <strong>UCI Option Defaults</strong>
                            <span>
                              Diese Werte werden beim Erstellen neuer Profile übernommen. Bestehende Profile behalten ihre eigenen Werte.
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
                            renderEditableOption(
                              name,
                              option,
                              option.defaultValue ?? "",
                              updateEngineDefault
                            )
                          )}
                          {visibleEngineOptions.length === 0 && (
                            <div className="engine-config-no-options">No matching UCI options.</div>
                          )}
                        </div>

                        <div className="engine-config-actions engine-config-actions-footer">
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
                            <strong>Neues Profil</strong>
                            <span>Schritt 1 · Bereits definierte Engine auswählen</span>
                          </div>
                        </div>
                        {engines.length === 0 ? (
                          <div className="engine-config-details-empty">
                            <strong>Keine Engine vorhanden</strong>
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
                        <strong>Kein Profil ausgewählt</strong>
                        <span>Wähle links ein Profil oder lege ein neues an.</span>
                      </div>
                    )}

                    {profileDraft && profileEngine && (
                      <div className="engine-config-editor">
                        <div className="engine-config-details-heading">
                          <div>
                            <strong>{profileDraft.id ? profileDraft.name : "Profil konfigurieren"}</strong>
                            <span>
                              {profileDraft.id
                                ? `${profileEngine.name} · wiederverwendbare Engine-Konfiguration`
                                : `Schritt 2 · UCI-Werte für ${profileEngine.name} festlegen`}
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
                            Dieses Profil ist der feste Fallback für <strong>/usr/games/stockfish</strong> und bleibt auf dessen
                            UCI-Defaultwerten. Erstelle ein neues Profil, wenn du diese Engine anders konfigurieren möchtest.
                          </div>
                        )}

                        <div className="engine-config-form-grid">
                          <label>
                            <span>Profile name</span>
                            <input
                              value={profileDraft.name}
                              onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })}
                              disabled={isFallbackProfile}
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
                            <span>Das Profil speichert ausschließlich konkrete Werte für {profileEngine.name}.</span>
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
                              disabled={busy || isFallbackProfile}
                            >
                              Reset defaults
                            </button>
                          </div>
                        </div>

                        <div className="engine-config-options">
                          {visibleProfileOptions.map(([name, option]) =>
                            renderEditableOption(
                              name,
                              option,
                              profileDraft.optionValues[name] ?? option.defaultValue ?? "",
                              updateProfileOption,
                              isFallbackProfile
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
                          {!isFallbackProfile && (
                            <button
                              type="button"
                              onClick={() => void saveProfile()}
                              disabled={busy || !profileDraft.name.trim()}
                            >
                              {busy ? "Saving…" : profileDraft.id ? "Save Profile" : "Create Profile"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </main>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
