import type { ReactNode } from "react";
import type { EngineDefinition, EngineProfile } from "../../engineConfig";
import "./EngineProfileMenu.css";

interface EngineProfileMenuItemProps {
  checked: boolean;
  disabled?: boolean;
  primary: ReactNode;
  secondary?: ReactNode;
  onSelect: () => void;
}

export function EngineProfileMenuItem({
  checked,
  disabled = false,
  primary,
  secondary,
  onSelect,
}: EngineProfileMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      className="engine-profile-menu-item"
      disabled={disabled}
      onClick={onSelect}
    >
      <span className="engine-profile-menu-check">{checked ? "✓" : ""}</span>
      <span className="engine-profile-menu-label">
        <span className="engine-profile-menu-primary">{primary}</span>
        {secondary && (
          <span className="engine-profile-menu-secondary">{secondary}</span>
        )}
      </span>
    </button>
  );
}

interface EngineProfileMenuProps {
  engines: EngineDefinition[];
  profiles: EngineProfile[];
  selectedProfileId: string | null;
  disabled?: boolean;
  unknownEngineLabel: string;
  emptyLabel: string;
  onSelect: (profileId: string) => void;
}

export default function EngineProfileMenu({
  engines,
  profiles,
  selectedProfileId,
  disabled = false,
  unknownEngineLabel,
  emptyLabel,
  onSelect,
}: EngineProfileMenuProps) {
  const validProfiles = profiles.filter(
    (profile): profile is EngineProfile & { id: string } => Boolean(profile.id),
  );
  const knownEngineIds = new Set(
    engines.flatMap((engine) => engine.id ? [engine.id] : []),
  );

  const groups = engines
    .filter((engine) => engine.id)
    .map((engine) => ({
      key: engine.id as string,
      label: engine.name || engine.engineName || unknownEngineLabel,
      profiles: validProfiles.filter((profile) => profile.engineId === engine.id),
    }))
    .filter((group) => group.profiles.length > 0);

  const unknownProfiles = validProfiles.filter(
    (profile) => !knownEngineIds.has(profile.engineId),
  );

  if (validProfiles.length === 0) {
    return <div className="engine-profile-menu-status">{emptyLabel}</div>;
  }

  return (
    <div className="engine-profile-menu">
      {groups.map((group) => (
        <div className="engine-profile-menu-group" key={group.key}>
          <div className="engine-profile-menu-engine">{group.label}</div>
          {group.profiles.map((profile) => (
            <EngineProfileMenuItem
              key={profile.id}
              checked={selectedProfileId === profile.id}
              disabled={disabled}
              primary={profile.name}
              onSelect={() => onSelect(profile.id)}
            />
          ))}
        </div>
      ))}

      {unknownProfiles.length > 0 && (
        <div className="engine-profile-menu-group">
          <div className="engine-profile-menu-engine">{unknownEngineLabel}</div>
          {unknownProfiles.map((profile) => (
            <EngineProfileMenuItem
              key={profile.id}
              checked={selectedProfileId === profile.id}
              disabled={disabled}
              primary={profile.name}
              onSelect={() => onSelect(profile.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
