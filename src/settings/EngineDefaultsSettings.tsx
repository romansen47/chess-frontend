import type { EngineConfigOverview, EngineProfileAssignments } from "../engineConfigTypes";
import { useI18n } from "../i18n/I18nProvider";

type AssignmentKey = keyof EngineProfileAssignments;

interface Props {
  overview: EngineConfigOverview | null;
  draft: EngineProfileAssignments;
  busy: boolean;
  onDraftChange: (draft: EngineProfileAssignments) => void;
  onSave: () => void;
}

export default function EngineDefaultsSettings({
  overview,
  draft,
  busy,
  onDraftChange,
  onSave,
}: Props) {
  const { t } = useI18n();
  const engines = overview?.engines ?? [];
  const profiles = overview?.profiles ?? [];

  function profileAndEngine(profileId: string | null | undefined) {
    const profile = profiles.find((candidate) => candidate.id === profileId) ?? null;
    const engine = profile ? engines.find((candidate) => candidate.id === profile.engineId) ?? null : null;
    return { profile, engine };
  }

  function assignmentCard(key: AssignmentKey, title: string, description: string) {
    const selectedId = draft[key] ?? "";
    const { engine } = profileAndEngine(selectedId);
    return (
      <label className="engine-config-default-card" key={key}>
        <div className="engine-config-default-card-heading">
          <div><strong>{title}</strong><span>{description}</span></div>
          {selectedId === overview?.fallbackProfileId && <span className="engine-config-chip">{t("settings.fallback")}</span>}
        </div>
        <select value={selectedId}
          onChange={(event) => onDraftChange({ ...draft, [key]: event.target.value })}
          disabled={busy || profiles.length === 0}>
          {engines.map((candidateEngine) => {
            const engineProfiles = profiles.filter((profile) => profile.engineId === candidateEngine.id);
            if (engineProfiles.length === 0) return null;
            return (
              <optgroup key={candidateEngine.id ?? candidateEngine.name} label={candidateEngine.name}>
                {engineProfiles.map((profile) => (
                  <option key={profile.id ?? profile.name} value={profile.id ?? ""}>{profile.name}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <div className="engine-config-default-card-meta">
          <span>{engine?.name ?? t("settings.unknownEngine")}</span>
          <span className="engine-config-default-card-path">{engine?.engine ?? "–"}</span>
        </div>
      </label>
    );
  }

  const fallbackProfile = profiles.find((profile) => profile.id === overview?.fallbackProfileId) ?? null;
  const fallbackEngine = fallbackProfile ? engines.find((engine) => engine.id === fallbackProfile.engineId) ?? null : null;
  const assignments: Array<[AssignmentKey, string]> = [
    ["whitePlayerProfileId", t("settings.whiteCpu")],
    ["blackPlayerProfileId", t("settings.blackCpu")],
    ["deepAnalysisProfileId", t("settings.deepAnalysis")],
  ];

  return <>
    <aside className="engine-config-sidebar">
      <div className="engine-config-sidebar-header"><div><strong>{t("settings.useCases")}</strong><span>{t("settings.useCasesDescription")}</span></div></div>
      <div className="engine-config-nav-list engine-config-assignment-list">
        {assignments.map(([key, label]) => {
          const { profile, engine } = profileAndEngine(draft[key]);
          return <div className="engine-config-nav-item engine-config-assignment-summary" key={key}>
            <span className="engine-config-nav-title">{label}</span>
            <span className="engine-config-nav-meta">{profile?.name ?? t("settings.noProfile")}</span>
            <span className="engine-config-nav-path">{engine?.name ?? "–"}</span>
          </div>;
        })}
      </div>
    </aside>
    <main className="engine-config-details">
      <div className="engine-config-editor">
        <div className="engine-config-details-heading">
          <div><strong>{t("settings.defaultAssignments")}</strong><span>{t("settings.defaultAssignmentsDescription")}</span></div>
          <span className="engine-config-chip">{t("settings.global")}</span>
        </div>
        {fallbackProfile && <div className="engine-config-default-info">
          {t("settings.fallbackInfoBefore")} <strong>{fallbackEngine?.engine ?? t("settings.detectedUciEngine")}</strong> {t("settings.fallbackInfoAfter")}
        </div>}
        <div className="engine-config-default-grid">
          {assignmentCard("whitePlayerProfileId", t("settings.whiteCpuPlayer"), t("settings.whiteCpuDescription"))}
          {assignmentCard("blackPlayerProfileId", t("settings.blackCpuPlayer"), t("settings.blackCpuDescription"))}
          {assignmentCard("deepAnalysisProfileId", t("settings.deepAnalysis"), t("settings.deepAnalysisDescription"))}
        </div>
        <div className="engine-config-actions engine-config-actions-footer">
          <div className="engine-config-actions-spacer" />
          <button type="button" onClick={onSave} disabled={busy || profiles.length === 0}>
            {busy ? t("settings.saving") : t("settings.saveDefaults")}
          </button>
        </div>
      </div>
    </main>
  </>;
}
