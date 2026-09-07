import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";

interface DataMenuProps {
  disabled: boolean;
  actionsDisabled: boolean;
  terminating: boolean;
  onNewGame: () => void;
  onExportCurrentGame: () => void;
  onImportNewGame: () => void;
  onOpenDatabase: () => void;
  onTerminateProgram: () => void;
}

export default function DataMenu({
  disabled,
  actionsDisabled,
  terminating,
  onNewGame,
  onExportCurrentGame,
  onImportNewGame,
  onOpenDatabase,
  onTerminateProgram,
}: DataMenuProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const runAndClose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="data-menu" ref={menuRef}>
      <button
        className={[
          "top-engine-button",
          "data-menu-trigger",
          open ? "data-menu-trigger-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setOpen((previous) => !previous)}
        title={t("data.title")}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
      >
        {t("data.label")}
      </button>

      {open && (
        <div className="data-menu-popup" role="menu">
          <button
            className="data-menu-item"
            role="menuitem"
            onClick={() => runAndClose(onNewGame)}
            disabled={actionsDisabled}
          >
            {t("data.newGame")}
          </button>

          <button
            className="data-menu-item"
            role="menuitem"
            onClick={() => runAndClose(onExportCurrentGame)}
            disabled={actionsDisabled}
          >
            {t("data.exportCurrentGame")}
          </button>

          <button
            className="data-menu-item"
            role="menuitem"
            onClick={() => runAndClose(onImportNewGame)}
            disabled={actionsDisabled}
          >
            {t("data.importNewGame")}
          </button>

          <button
            className="data-menu-item"
            role="menuitem"
            onClick={() => runAndClose(onOpenDatabase)}
            disabled={actionsDisabled}
          >
            {t("data.chessDatabase")}
          </button>

          <div className="data-menu-separator" role="separator" />

          <button
            className="data-menu-item data-menu-item-danger"
            role="menuitem"
            onClick={() => runAndClose(onTerminateProgram)}
            disabled={terminating}
          >
            {terminating ? t("data.terminating") : t("data.terminateProgram")}
          </button>
        </div>
      )}
    </div>
  );
}
