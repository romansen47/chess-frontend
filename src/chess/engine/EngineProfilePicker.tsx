import { useEffect, useRef, useState } from "react";
import type { EngineDefinition, EngineProfile } from "../../engineConfig";
import EngineProfileMenu from "./EngineProfileMenu";
import "./EngineProfilePicker.css";

interface EngineProfilePickerProps {
  label: string;
  engines: EngineDefinition[];
  profiles: EngineProfile[];
  selectedProfileId: string | null;
  disabled?: boolean;
  emptyLabel: string;
  unknownEngineLabel: string;
  className?: string;
  onChange: (profileId: string) => void;
}

export default function EngineProfilePicker({
  label,
  engines,
  profiles,
  selectedProfileId,
  disabled = false,
  emptyLabel,
  unknownEngineLabel,
  className = "",
  onChange,
}: EngineProfilePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedProfile =
    profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const selectedEngine = selectedProfile
    ? engines.find((engine) => engine.id === selectedProfile.engineId) ?? null
    : null;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={["engine-profile-picker", className].filter(Boolean).join(" ")}
    >
      <span className="engine-profile-picker-label">{label}</span>
      <button
        type="button"
        className="engine-profile-picker-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
        onContextMenu={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        disabled={disabled}
      >
        <span className="engine-profile-picker-text">
          <strong>{selectedProfile?.name ?? emptyLabel}</strong>
          <small>
            {selectedEngine?.name || selectedEngine?.engineName || unknownEngineLabel}
          </small>
        </span>
        <span className="engine-profile-picker-chevron" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div
          className="engine-profile-picker-popup"
          role="menu"
          aria-label={label}
        >
          <EngineProfileMenu
            engines={engines}
            profiles={profiles}
            selectedProfileId={selectedProfileId}
            disabled={disabled}
            unknownEngineLabel={unknownEngineLabel}
            emptyLabel={emptyLabel}
            onSelect={(profileId) => {
              onChange(profileId);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
