import { useEffect, useMemo, useState } from "react";
import type {
  EngineConfigOverview,
  ManagedEngineConfig,
  UciOptionConfig,
} from "./engineConfig";
import { fetchEngineConfigOverview } from "./engineConfig";
import "./EngineConfigManager.css";

interface EngineConfigManagerProps {
  overview: EngineConfigOverview | null;
  onOverviewChange: (overview: EngineConfigOverview) => void;
}

function copyConfig(config: ManagedEngineConfig): ManagedEngineConfig {
  return {
    ...config,
    options: Object.fromEntries(
      Object.entries(config.options).map(([name, option]) => [
        name,
        { ...option, vars: [...(option.vars ?? [])] },
      ])
    ),
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

export default function EngineConfigManager({
  overview,
  onOverviewChange,
}: EngineConfigManagerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ManagedEngineConfig | null>(null);
  const [newEnginePath, setNewEnginePath] = useState("");
  const [newConfigName, setNewConfigName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [optionFilter, setOptionFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const configs = overview?.configs ?? [];

  useEffect(() => {
    if (!overview || creating) {
      return;
    }
    const nextId = selectedId && configs.some((config) => config.id === selectedId)
      ? selectedId
      : configs[0]?.id ?? null;
    setSelectedId(nextId);
    const selected = configs.find((config) => config.id === nextId) ?? null;
    setDraft(selected ? copyConfig(selected) : null);
  }, [overview, configs, creating, selectedId]);

  const selectedStoredConfig = useMemo(
    () => configs.find((config) => config.id === selectedId) ?? null,
    [configs, selectedId]
  );

  function selectExisting(id: string) {
    setCreating(false);
    setSelectedId(id);
    const selected = configs.find((config) => config.id === id);
    setDraft(selected ? copyConfig(selected) : null);
    setOptionFilter("");
    setMessage(null);
    setError(null);
  }

  function beginCreate() {
    setCreating(true);
    setSelectedId(null);
    setDraft(null);
    setNewEnginePath("");
    setNewConfigName("");
    setOptionFilter("");
    setMessage(null);
    setError(null);
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
      setMessage("Starting engine and reading UCI options…");
      const response = await fetch("/api/engine-configs/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engine, name: newConfigName.trim() || null }),
      });
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      const inspected = (await response.json()) as ManagedEngineConfig;
      setDraft(copyConfig(inspected));
      setNewConfigName(inspected.name);
      setMessage(
        `${inspected.engineName} detected · ${Object.keys(inspected.options).length} UCI options`
      );
    } catch (e) {
      setDraft(null);
      setMessage(null);
      setError(e instanceof Error ? e.message : "Engine could not be inspected.");
    } finally {
      setBusy(false);
    }
  }

  function updateDraft(patch: Partial<ManagedEngineConfig>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function updateOption(name: string, value: string | null) {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      const option = current.options[name];
      if (!option) {
        return current;
      }
      return {
        ...current,
        options: {
          ...current.options,
          [name]: { ...option, value },
        },
      };
    });
  }

  function resetOptionsToDefaults() {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        options: Object.fromEntries(
          Object.entries(current.options).map(([name, option]) => [
            name,
            {
              ...option,
              value: option.type === "button" ? null : option.defaultValue,
            },
          ])
        ),
      };
    });
  }

  async function reloadOverview(preferredId?: string | null) {
    const next = await fetchEngineConfigOverview();
    onOverviewChange(next);
    const id = preferredId && next.configs.some((config) => config.id === preferredId)
      ? preferredId
      : next.configs[0]?.id ?? null;
    setSelectedId(id);
    const selected = next.configs.find((config) => config.id === id);
    setDraft(selected ? copyConfig(selected) : null);
    return next;
  }

  async function saveDraft() {
    if (!draft) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      const isNew = !draft.id;
      const response = await fetch(
        isNew ? "/api/engine-configs" : `/api/engine-configs/${draft.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        }
      );
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      const saved = (await response.json()) as ManagedEngineConfig;
      setCreating(false);
      await reloadOverview(saved.id);
      setMessage("Engine configuration saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Engine configuration could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    if (!selectedStoredConfig?.id) {
      return;
    }
    if (!window.confirm(`Delete engine configuration "${selectedStoredConfig.name}"?`)) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const response = await fetch(`/api/engine-configs/${selectedStoredConfig.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      await reloadOverview(null);
      setMessage("Engine configuration deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Engine configuration could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function changeEvaluationConfig(configId: string) {
    try {
      setBusy(true);
      setError(null);
      const response = await fetch("/api/engine-configs/evaluation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId }),
      });
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`);
      }
      const next = (await response.json()) as EngineConfigOverview;
      onOverviewChange(next);
      setMessage("Live evaluation configuration changed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation configuration could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  function renderOption(name: string, option: UciOptionConfig) {
    const hint = optionHint(option);
    const common = (
      <div className="engine-config-option-meta">
        <span className="engine-config-option-type">{option.type}</span>
        {hint && <span>{hint}</span>}
      </div>
    );

    if (option.type === "button") {
      return (
        <div className="engine-config-option" key={name}>
          <div className="engine-config-option-label">
            <strong>{name}</strong>
            {common}
          </div>
          <button type="button" disabled title="UCI button options are actions and are not persisted in a config.">
            UCI action
          </button>
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
            checked={(option.value ?? "false").toLowerCase() === "true"}
            onChange={(event) => updateOption(name, event.target.checked ? "true" : "false")}
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
            value={option.value ?? ""}
            onChange={(event) => updateOption(name, event.target.value)}
          >
            {(option.vars ?? []).map((value) => (
              <option key={value} value={value}>{value}</option>
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
            value={option.value ?? ""}
            onChange={(event) => updateOption(name, event.target.value)}
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
          value={option.value ?? ""}
          onChange={(event) => updateOption(name, event.target.value)}
        />
      </label>
    );
  }

  const visibleOptions = draft
    ? Object.entries(draft.options).filter(([name]) =>
        name.toLowerCase().includes(optionFilter.trim().toLowerCase())
      )
    : [];

  return (
    <div className="engine-config-manager">
      <div className="engine-config-manager-header">
        <div>
          <strong>Engine Configs</strong>
          {overview && <span className="engine-config-version">version {overview.version}</span>}
        </div>
        <button type="button" onClick={beginCreate} disabled={busy}>New Config</button>
      </div>

      {overview && configs.length > 0 && (
        <div className="engine-config-toolbar">
          <label>
            <span>Configuration</span>
            <select
              value={selectedId ?? ""}
              onChange={(event) => selectExisting(event.target.value)}
              disabled={creating || busy}
            >
              {configs.map((config) => (
                <option key={config.id ?? config.name} value={config.id ?? ""}>
                  {config.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Live evaluation</span>
            <select
              value={overview.evaluationConfigId}
              onChange={(event) => void changeEvaluationConfig(event.target.value)}
              disabled={busy}
            >
              {configs.map((config) => (
                <option key={config.id ?? config.name} value={config.id ?? ""}>
                  {config.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {creating && !draft && (
        <div className="engine-config-inspect-step">
          <div className="engine-config-step-title">1. Select engine executable</div>
          <label>
            <span>Config name</span>
            <input
              value={newConfigName}
              onChange={(event) => setNewConfigName(event.target.value)}
              placeholder="e.g. Lc0 CUDA"
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

      {draft && (
        <div className="engine-config-editor">
          <div className="engine-config-step-title">2. Configure engine</div>
          <div className="engine-config-identity">
            <label>
              <span>Config name</span>
              <input
                value={draft.name}
                onChange={(event) => updateDraft({ name: event.target.value })}
              />
            </label>
            <label>
              <span>Engine</span>
              <input value={draft.engine} readOnly />
            </label>
            <div className="engine-config-engine-id">
              <strong>{draft.engineName}</strong>
              {draft.engineAuthor && <span>{draft.engineAuthor}</span>}
            </div>
          </div>

          <div className="engine-config-search-settings">
            <div className="engine-config-step-title">Search</div>
            <label>
              <span>Depth (0 = time/clock)</span>
              <input
                type="number"
                min={0}
                value={draft.depth}
                onChange={(event) => updateDraft({ depth: Math.max(0, Number(event.target.value)) })}
              />
            </label>
            <label>
              <span>Move time s (0 = player clock)</span>
              <input
                type="number"
                min={0}
                value={draft.moveTimeSeconds}
                onChange={(event) => updateDraft({ moveTimeSeconds: Math.max(0, Number(event.target.value)) })}
              />
            </label>
          </div>

          <div className="engine-config-options-header">
            <div>
              <div className="engine-config-step-title">
                UCI Options ({Object.keys(draft.options).length})
              </div>
              <span>Values were initialized from the engine defaults returned by <code>uci</code>.</span>
            </div>
            <div className="engine-config-option-tools">
              <input
                type="search"
                value={optionFilter}
                onChange={(event) => setOptionFilter(event.target.value)}
                placeholder="Filter options"
              />
              <button type="button" onClick={resetOptionsToDefaults} disabled={busy}>
                Reset defaults
              </button>
            </div>
          </div>

          <div className="engine-config-options">
            {visibleOptions.map(([name, option]) => renderOption(name, option))}
            {visibleOptions.length === 0 && (
              <div className="engine-config-no-options">No matching UCI options.</div>
            )}
          </div>

          <div className="engine-config-actions">
            <button type="button" onClick={() => void saveDraft()} disabled={busy || !draft.name.trim()}>
              {busy ? "Saving…" : draft.id ? "Save Config" : "Create Config"}
            </button>
            {draft.id && (
              <button type="button" className="engine-config-delete" onClick={() => void deleteSelected()} disabled={busy}>
                Delete Config
              </button>
            )}
          </div>
        </div>
      )}

      {message && <div className="engine-config-message">{message}</div>}
      {error && <div className="engine-error">{error}</div>}
    </div>
  );
}
