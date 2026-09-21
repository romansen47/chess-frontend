import type { EngineProfile } from "../engineConfigTypes";
import { useI18n } from "../i18n/I18nProvider";

interface Props {
  profile: EngineProfile;
  selected: boolean;
  fallback: boolean;
  assignmentLabels: string[];
  busy: boolean;
  onSelect: (profile: EngineProfile) => void;
}

export default function EngineProfileCard({
  profile,
  selected,
  fallback,
  assignmentLabels,
  busy,
  onSelect,
}: Props) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      className={[
        "engine-profile-card",
        selected ? "engine-profile-card-selected" : "",
      ].filter(Boolean).join(" ")}
      onClick={() => onSelect(profile)}
      disabled={busy || !profile.id}
    >
      <span className="engine-profile-card-title-row">
        <strong>{profile.name}</strong>
        {(fallback || assignmentLabels.length > 0) && (
          <span className="engine-profile-active-dot" />
        )}
      </span>
      <span className="engine-profile-card-meta">
        {fallback
          ? t("settings.fallback")
          : assignmentLabels.length > 0
            ? assignmentLabels.join(" · ")
            : t("settings.reusableProfile")}
      </span>
    </button>
  );
}
