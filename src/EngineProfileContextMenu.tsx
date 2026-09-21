import { useEffect, useRef, useState } from "react";
import {
  fetchEngineConfigOverview,
  fetchEngineRuntimeAssignments,
  updateEngineRuntimeProfile,
  type EngineConfigOverview,
  type EngineRuntimeAssignments,
  type EngineRuntimeTarget,
} from "./engineConfig";
import { notifyEngineRuntimeAssignmentsChanged } from "./chess/engine/engineRuntimeEvents";
import EngineProfileMenu, { EngineProfileMenuItem } from "./chess/engine/EngineProfileMenu";
import { useI18n } from "./i18n/I18nProvider";
import "./EngineProfileContextMenu.css";

interface MenuState {
  target: EngineRuntimeTarget;
  x: number;
  y: number;
}

function targetFromContextEvent(event: MouseEvent): EngineRuntimeTarget | null {
  const element = event.target instanceof Element ? event.target : null;
  if (!element) return null;

  const clockBox = element.closest(".clock-box") as HTMLElement | null;
  if (clockBox) {
    const clockArea = clockBox.closest(".clock-area") as HTMLElement | null;
    const clocks = clockArea ? Array.from(clockArea.querySelectorAll<HTMLElement>(".clock-box")) : [];
    if (clocks[0] === clockBox) return "white";
    if (clocks[1] === clockBox) return "black";
  }

  if (element.closest(".engine-bar-wrapper")) {
    return "evaluation";
  }

  return null;
}

export default function EngineProfileContextMenu() {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(false);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [overview, setOverview] = useState<EngineConfigOverview | null>(null);
  const [runtime, setRuntime] = useState<EngineRuntimeAssignments | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const target = targetFromContextEvent(event);
      if (!target) return;

      event.preventDefault();
      setMenu({ target, x: event.clientX, y: event.clientY });
      setPosition({ x: event.clientX, y: event.clientY });
      setError(null);
      setLoading(true);

      Promise.all([fetchEngineConfigOverview(), fetchEngineRuntimeAssignments()])
        .then(([nextOverview, nextRuntime]) => {
          if (!mountedRef.current) return;
          setOverview(nextOverview);
          setRuntime(nextRuntime);
        })
        .catch((loadError: unknown) => {
          if (!mountedRef.current) return;
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        })
        .finally(() => {
          if (mountedRef.current) setLoading(false);
        });
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  useEffect(() => {
    if (!menu) return;

    const closeOnPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenu(null);
    };
    const closeOnKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };

    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnKeyDown);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnKeyDown);
    };
  }, [menu]);

  useEffect(() => {
    if (!menu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const margin = 8;
    const x = Math.max(margin, Math.min(menu.x, window.innerWidth - rect.width - margin));
    const y = Math.max(margin, Math.min(menu.y, window.innerHeight - rect.height - margin));
    setPosition({ x, y });
  }, [menu, overview, runtime, loading, error]);

  if (!menu) return null;

  const targetLabel = menu.target === "white"
    ? t("settings.whiteCpu")
    : menu.target === "black"
      ? t("settings.blackCpu")
      : t("settings.liveEvaluation");

  const defaultProfileId = menu.target === "white"
    ? overview?.defaults.whitePlayerProfileId
    : menu.target === "black"
      ? overview?.defaults.blackPlayerProfileId
      : overview?.defaults.evaluationProfileId;

  const runtimeProfileId = menu.target === "white"
    ? runtime?.whitePlayerProfileId ?? null
    : menu.target === "black"
      ? runtime?.blackPlayerProfileId ?? null
      : runtime?.evaluationProfileId ?? null;

  const profiles = (overview?.profiles ?? []).filter((profile) => profile.id);
  const defaultProfile = profiles.find((profile) => profile.id === defaultProfileId) ?? null;

  const selectProfile = async (profileId: string | null) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const nextRuntime = await updateEngineRuntimeProfile(menu.target, profileId);
      if (!mountedRef.current) return;
      setRuntime(nextRuntime);
      notifyEngineRuntimeAssignmentsChanged(nextRuntime);
      setMenu(null);
    } catch (selectionError) {
      if (!mountedRef.current) return;
      setError(selectionError instanceof Error ? selectionError.message : String(selectionError));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  return (
    <div
      ref={menuRef}
      className="engine-profile-context-menu"
      role="menu"
      aria-label={`${targetLabel} · ${t("analysis.engineProfile")}`}
      style={{ left: position.x, top: position.y }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="engine-profile-context-menu-title">
        {targetLabel} · {t("analysis.engineProfile")}
      </div>

      {loading && !overview && (
        <div className="engine-profile-context-menu-status">{t("common.loading")}</div>
      )}

      {overview && (
        <>
          <EngineProfileMenuItem
            checked={runtimeProfileId == null}
            disabled={saving || !defaultProfile}
            primary={
              <>
                {t("settings.defaults")} · {defaultProfile?.name ?? t("settings.noProfile")}
              </>
            }
            secondary={
              defaultProfile
                ? overview.engines.find((engine) => engine.id === defaultProfile.engineId)?.name
                  || overview.engines.find((engine) => engine.id === defaultProfile.engineId)?.engineName
                  || t("settings.unknownEngine")
                : undefined
            }
            onSelect={() => void selectProfile(null)}
          />

          <div className="engine-profile-menu-separator" />

          <EngineProfileMenu
            engines={overview.engines}
            profiles={profiles}
            selectedProfileId={runtimeProfileId}
            disabled={saving}
            unknownEngineLabel={t("settings.unknownEngine")}
            emptyLabel={t("settings.noProfile")}
            onSelect={(profileId) => void selectProfile(profileId)}
          />
        </>
      )}

      {error && <div className="engine-profile-context-menu-error">{error}</div>}
    </div>
  );
}
