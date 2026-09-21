import { useEffect, useMemo, useState } from "react";
import type {
  EngineConfigOverview,
  EngineDefinition,
  EngineProfile,
  UciOptionConfig,
} from "./engineConfigTypes";
import { isSystemManagedUciOption } from "./engineConfigTypes";
import {
  createEngineDefinition,
  createEngineProfile,
  deleteEngineDefinition,
  deleteEngineProfile,
  discoverEngineDefinitions,
  fetchEngineConfigOverview,
  inspectEngineDefinition,
  updateEngineProfile,
} from "./chess/api/engineConfigApi";
import { useI18n } from "./i18n/I18nProvider";
import EngineDetailsPanel from "./engineProfile/EngineDetailsPanel";
import EngineImportPanel from "./engineProfile/EngineImportPanel";
import EngineProfileEditor from "./engineProfile/EngineProfileEditor";
import EngineProfileNavigation from "./engineProfile/EngineProfileNavigation";
import EngineProfileOptionDialog from "./engineProfile/EngineProfileOptionDialog";
import type { ProfileOptionEditorState } from "./engineProfile/engineProfilePresentation";
import "./EngineProfileHierarchy.css";
import "./EngineConfigOptionPopup.css";

interface Props {
  overview: EngineConfigOverview | null;
  onOverviewChange: (overview: EngineConfigOverview) => void;
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
      const candidates = await discoverEngineDefinitions();
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
      const inspected = await inspectEngineDefinition(
        engine,
        manualEngineName.trim() || null,
      );
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
      const saved = await createEngineDefinition(payload);
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
      const saved = isNew
        ? await createEngineProfile(profileDraft)
        : await updateEngineProfile(profileDraft.id as string, profileDraft);
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
      await deleteEngineProfile(selectedStoredProfile.id);
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
      await deleteEngineDefinition(selectedEngine.id);
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

  function cancelImportEngine() {
    setImportingEngine(false);
    setImportDraft(null);
    setMessage(null);
    setError(null);
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

      <EngineProfileNavigation
        engines={engines}
        profiles={profiles}
        selectedEngine={selectedEngine}
        selectedEngineId={selectedEngineId}
        selectedProfileId={selectedProfileId}
        expandedEngineId={expandedEngineId}
        selectedEngineProfiles={selectedEngineProfiles}
        fallbackProfileId={overview.fallbackProfileId}
        busy={busy}
        importingEngine={importingEngine}
        creatingProfile={creatingProfile}
        assignmentLabels={assignmentLabels}
        onImportEngine={beginImportEngine}
        onCreateProfile={beginCreateProfile}
        onSelectEngine={selectEngine}
        onToggleEngine={toggleEngineInTree}
        onSelectProfile={selectProfile}
      />

      <main className="engine-profile-details">
        {importingEngine ? (
          <EngineImportPanel
            discoveredEngines={discoveredEngines}
            importDraft={importDraft}
            manualEnginePath={manualEnginePath}
            manualEngineName={manualEngineName}
            busy={busy}
            onSelectDiscoveredEngine={selectDiscoveredEngine}
            onManualEnginePathChange={setManualEnginePath}
            onManualEngineNameChange={setManualEngineName}
            onInspectEngine={() => void inspectEngineByPath()}
            onCancel={cancelImportEngine}
            onImport={() => void importEngine()}
          />
        ) : profileDraft && profileEngine ? (
          <EngineProfileEditor
            profileDraft={profileDraft}
            profileEngine={profileEngine}
            creatingProfile={creatingProfile}
            advancedOpen={advancedOpen}
            optionFilter={optionFilter}
            visibleProfileOptions={visibleProfileOptions}
            busy={busy}
            isFallbackProfile={isFallbackProfile}
            assignmentLabels={assignmentLabels(profileDraft.id)}
            assigned={isAssignedProfile(profileDraft.id)}
            onBack={() => profileEngine.id && selectEngine(profileEngine.id)}
            onNameChange={(name) => setProfileDraft({ ...profileDraft, name })}
            onToggleAdvanced={() => setAdvancedOpen((previous) => !previous)}
            onOptionFilterChange={setOptionFilter}
            onResetDefaults={resetProfileOptionsToDefaults}
            onOpenOptionEditor={openProfileOptionEditor}
            onDelete={() => void deleteSelectedProfile()}
            onSave={() => void saveProfile()}
          />
        ) : selectedEngine ? (
          <EngineDetailsPanel
            engine={selectedEngine}
            profiles={selectedEngineProfiles}
            selectedProfileId={selectedProfileId}
            fallbackProfileId={overview.fallbackProfileId}
            busy={busy}
            assignmentLabels={assignmentLabels}
            onSelectProfile={selectProfile}
            onDeleteEngine={() => void deleteSelectedEngine()}
          />
        ) : (
          <div className="engine-profile-hierarchy-empty engine-profile-details-empty">
            {t("settings.selectOrImportEngine")}
          </div>
        )}
      </main>

      {profileOptionEditor && (
        <EngineProfileOptionDialog
          editor={profileOptionEditor}
          onValueChange={(value) =>
            setProfileOptionEditor({ ...profileOptionEditor, value })
          }
          onClose={() => setProfileOptionEditor(null)}
          onApply={applyProfileOptionEditor}
        />
      )}
    </div>
  );
}
