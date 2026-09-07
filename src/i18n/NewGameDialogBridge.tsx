import { useEffect } from "react";
import { useI18n } from "./I18nProvider";

const NEW_GAME_LABELS = new Set([
  "New Game",
  "Neue Partie",
  "Nouvelle partie",
]);

const IMPORT_LABELS = new Set([
  "Load PGN",
  "Import New Game",
  "Neue Partie importieren",
  "Importer une nouvelle partie",
]);

export default function NewGameDialogBridge() {
  const { language } = useI18n();

  useEffect(() => {
    let suppressed = false;

    const cancelLabel = language === "de"
      ? "Abbrechen"
      : language === "fr"
        ? "Annuler"
        : "Cancel";

    const ensureDialogControls = () => {
      const dialog = document.querySelector<HTMLElement>(".game-settings-dialog");
      if (!dialog) {
        return;
      }

      if (suppressed) {
        dialog.style.display = "none";
        return;
      }
      dialog.style.removeProperty("display");

      const actions = dialog.querySelector<HTMLElement>(".game-settings-dialog-actions");
      if (!actions) {
        return;
      }

      for (const button of actions.querySelectorAll<HTMLButtonElement>("button")) {
        if (IMPORT_LABELS.has(button.textContent?.trim() ?? "")) {
          button.style.display = "none";
          button.setAttribute("aria-hidden", "true");
        }
      }

      let cancelButton = actions.querySelector<HTMLButtonElement>("[data-new-game-cancel='true']");
      if (!cancelButton) {
        cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "game-settings-dialog-button";
        cancelButton.dataset.newGameCancel = "true";
        cancelButton.addEventListener("click", () => {
          suppressed = true;
          dialog.style.display = "none";
        });

        const visibleStartButton = [...actions.querySelectorAll<HTMLButtonElement>("button")]
          .find((button) => button.style.display !== "none");
        actions.insertBefore(cancelButton, visibleStartButton ?? null);
      }
      cancelButton.textContent = cancelLabel;
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("button") : null;
      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      if (NEW_GAME_LABELS.has(target.textContent?.trim() ?? "")) {
        suppressed = false;
        const dialog = document.querySelector<HTMLElement>(".game-settings-dialog");
        dialog?.style.removeProperty("display");
        window.queueMicrotask(ensureDialogControls);
      }
    };

    document.addEventListener("click", handleClick, true);
    ensureDialogControls();

    const observer = new MutationObserver(() => ensureDialogControls());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handleClick, true);
    };
  }, [language]);

  return null;
}
