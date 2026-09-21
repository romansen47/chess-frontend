import type { EngineDefinition, EngineProfile } from "../engineConfigTypes";
import { useI18n } from "../i18n/I18nProvider";
import EngineProfileCard from "./EngineProfileCard";

interface Props {
  engines: EngineDefinition[];
  profiles: EngineProfile[];
  selectedEngine: EngineDefinition | null;
  selectedEngineId: string | null;
  selectedProfileId: string | null;
  expandedEngineId: string | null;
  selectedEngineProfiles: EngineProfile[];
  fallbackProfileId: string | null;
  busy: boolean;
  importingEngine: boolean;
  creatingProfile: boolean;
  assignmentLabels: (profileId: string | null) => string[];
  onImportEngine: () => void;
  onCreateProfile: (engine: EngineDefinition) => void;
  onSelectEngine: (engineId: string) => void;
  onToggleEngine: (engineId: string) => void;
  onSelectProfile: (profile: EngineProfile) => void;
}

export default function EngineProfileNavigation({
  engines,
  profiles,
  selectedEngine,
  selectedEngineId,
  selectedProfileId,
  expandedEngineId,
  selectedEngineProfiles,
  fallbackProfileId,
  busy,
  importingEngine,
  creatingProfile,
  assignmentLabels,
  onImportEngine,
  onCreateProfile,
  onSelectEngine,
  onToggleEngine,
  onSelectProfile,
}: Props) {
  const { t } = useI18n();

  const profilesForEngine = (engineId: string | null) =>
    engineId ? profiles.filter((profile) => profile.engineId === engineId) : [];

  return (
    <>
      <aside className="engine-profile-tree">
        <div className="engine-profile-tree-header">
          <div>
            <strong>{t("settings.enginesAndProfiles")}</strong>
            <span>{t("settings.enginesAndProfilesDescription")}</span>
          </div>
          <div className="engine-profile-tree-header-actions">
            <button type="button" onClick={onImportEngine} disabled={busy}>
              {t("settings.importEngine")}
            </button>
            <button
              type="button"
              onClick={() => selectedEngine && onCreateProfile(selectedEngine)}
              disabled={busy || !selectedEngine}
              title={selectedEngine?.name}
            >
              {t("settings.newProfile")}
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
                  onClick={() => engine.id && onToggleEngine(engine.id)}
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
                      const fallback = profile.id === fallbackProfileId;
                      return (
                        <button
                          type="button"
                          key={profile.id ?? profile.name}
                          className={[
                            "engine-profile-tree-profile",
                            selectedProfileId === profile.id ? "selected" : "",
                          ].filter(Boolean).join(" ")}
                          onClick={() => onSelectProfile(profile)}
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
            onChange={(event) => onSelectEngine(event.target.value)}
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
          onClick={onImportEngine}
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
                onClick={() => onCreateProfile(selectedEngine)}
                disabled={busy}
              >
                + {t("settings.newProfile")}
              </button>
            </div>
            {selectedEngineProfiles.map((profile) => (
              <EngineProfileCard
                key={profile.id ?? profile.name}
                profile={profile}
                selected={selectedProfileId === profile.id}
                fallback={profile.id === fallbackProfileId}
                assignmentLabels={assignmentLabels(profile.id)}
                busy={busy}
                onSelect={onSelectProfile}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
