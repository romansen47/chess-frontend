import type { EngineProfileHierarchyProps } from "./engineProfile/useEngineProfileHierarchyController";
import { useEngineProfileHierarchyController } from "./engineProfile/useEngineProfileHierarchyController";
import EngineDetailsPanel from "./engineProfile/EngineDetailsPanel";
import EngineImportPanel from "./engineProfile/EngineImportPanel";
import EngineProfileEditor from "./engineProfile/EngineProfileEditor";
import EngineProfileNavigation from "./engineProfile/EngineProfileNavigation";
import EngineProfileOptionDialog from "./engineProfile/EngineProfileOptionDialog";
import "./EngineProfileHierarchy.css";
import "./EngineConfigOptionPopup.css";

export default function EngineProfileHierarchy(props: EngineProfileHierarchyProps) {
  const { overview } = props;
  const {
    t, engines, profiles, selectedEngine, selectedEngineId, selectedProfileId,
    expandedEngineId, selectedEngineProfiles, profileDraft, profileEngine,
    creatingProfile, importingEngine, discoveredEngines, importDraft,
    manualEnginePath, manualEngineName, optionFilter, advancedOpen,
    profileOptionEditor, busy, message, error, isFallbackProfile,
    visibleProfileOptions, assignmentLabels, isAssignedProfile, selectEngine,
    toggleEngineInTree, selectProfile, beginCreateProfile, beginImportEngine,
    selectDiscoveredEngine, inspectEngineByPath, importEngine, saveProfile,
    deleteSelectedProfile, deleteSelectedEngine, resetProfileOptionsToDefaults,
    openProfileOptionEditor, applyProfileOptionEditor, cancelImportEngine,
    setManualEnginePath, setManualEngineName, setProfileDraft, setAdvancedOpen,
    setOptionFilter, setProfileOptionEditor,
  } = useEngineProfileHierarchyController(props);

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
