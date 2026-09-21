import type { EngineDefinition, EngineProfile } from "../engineConfigTypes";
import { useI18n } from "../i18n/I18nProvider";
import EngineProfileCard from "./EngineProfileCard";

interface Props {
  engine: EngineDefinition;
  profiles: EngineProfile[];
  selectedProfileId: string | null;
  fallbackProfileId: string | null;
  busy: boolean;
  assignmentLabels: (profileId: string | null) => string[];
  onSelectProfile: (profile: EngineProfile) => void;
  onDeleteEngine: () => void;
}

export default function EngineDetailsPanel({
  engine,
  profiles,
  selectedProfileId,
  fallbackProfileId,
  busy,
  assignmentLabels,
  onSelectProfile,
  onDeleteEngine,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="engine-profile-editor-card">
      <div className="engine-config-details-heading">
        <div>
          <strong>{engine.name}</strong>
          <span>{t("settings.engineReadOnlyDescription")}</span>
        </div>
        <span className="engine-config-chip">
          {t("settings.profileCount", { count: profiles.length })}
        </span>
      </div>

      <div className="engine-profile-engine-summary">
        <div>
          <span>{t("settings.uciName")}</span>
          <strong>{engine.engineName || "–"}</strong>
        </div>
        <div>
          <span>{t("common.author")}</span>
          <strong>{engine.engineAuthor || "–"}</strong>
        </div>
        <div>
          <span>{t("common.options")}</span>
          <strong>{Object.keys(engine.options).length}</strong>
        </div>
        <div className="engine-profile-summary-path">
          <span>{t("engine.executable")}</span>
          <strong>{engine.engine}</strong>
        </div>
      </div>

      <div className="engine-profile-profile-section">
        <div className="engine-profile-profile-section-header">
          <div>
            <strong>{t("settings.profilesForEngine", { engine: engine.name })}</strong>
            <span>{t("settings.profilesForEngineDescription")}</span>
          </div>
        </div>

        <div className="engine-profile-card-list">
          {profiles.length === 0 ? (
            <div className="engine-profile-hierarchy-empty">
              {t("settings.noProfilesForEngine")}
            </div>
          ) : (
            profiles.map((profile) => (
              <EngineProfileCard
                key={profile.id ?? profile.name}
                profile={profile}
                selected={selectedProfileId === profile.id}
                fallback={profile.id === fallbackProfileId}
                assignmentLabels={assignmentLabels(profile.id)}
                busy={busy}
                onSelect={onSelectProfile}
              />
            ))
          )}
        </div>
      </div>

      <div className="engine-config-actions engine-config-actions-footer">
        <button
          type="button"
          className="engine-config-delete"
          onClick={onDeleteEngine}
          disabled={busy || profiles.length > 0}
          title={
            profiles.length > 0
              ? t("settings.deleteProfilesBeforeEngine")
              : undefined
          }
        >
          {t("settings.deleteEngine")}
        </button>
        <div className="engine-config-actions-spacer" />
      </div>
    </div>
  );
}
