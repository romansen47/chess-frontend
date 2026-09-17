import { useI18n } from "../../i18n/I18nProvider";
import type { GameSettings } from "../types";

interface NewGameDialogProps {
  settings: GameSettings;
  error: string | null;
  starting: boolean;
  onSettingsChange: (settings: GameSettings) => void;
  onCancel: () => void;
  onStart: (settings: GameSettings) => void;
}

type NumericSettingKey =
  | "timeForEachPlayerSeconds"
  | "incrementForWhiteSeconds"
  | "incrementForBlackSeconds";

export default function NewGameDialog({
  settings,
  error,
  starting,
  onSettingsChange,
  onCancel,
  onStart,
}: NewGameDialogProps) {
  const { t } = useI18n();

  const updateNumberField = (key: NumericSettingKey, value: number) => {
    const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
    onSettingsChange({ ...settings, [key]: safeValue });
  };

  const updateStartingPosition = (value: number) => {
    const safeValue = Number.isFinite(value)
      ? Math.max(0, Math.min(959, Math.trunc(value)))
      : 518;
    onSettingsChange({ ...settings, startingPositionId: safeValue });
  };

  return (
    <div className="game-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="new-game-title">
      <div className="game-settings-dialog-content">
        <h2 id="new-game-title">{t("game.newGame")}</h2>

        <div className="game-settings-form">
          <label className="game-settings-field">
            <span>{t("game.timeEachPlayerMinutes")}</span>
            <input
              type="number"
              min={1}
              value={Math.max(1, Math.floor(settings.timeForEachPlayerSeconds / 60))}
              onChange={(event) => updateNumberField(
                "timeForEachPlayerSeconds",
                Number(event.target.value) * 60,
              )}
              disabled={starting}
            />
          </label>

          <label className="game-settings-field">
            <span>{t("game.incrementWhiteSeconds")}</span>
            <input
              type="number"
              min={0}
              value={settings.incrementForWhiteSeconds}
              onChange={(event) => updateNumberField(
                "incrementForWhiteSeconds",
                Number(event.target.value),
              )}
              disabled={starting}
            />
          </label>

          <label className="game-settings-field">
            <span>{t("game.incrementBlackSeconds")}</span>
            <input
              type="number"
              min={0}
              value={settings.incrementForBlackSeconds}
              onChange={(event) => updateNumberField(
                "incrementForBlackSeconds",
                Number(event.target.value),
              )}
              disabled={starting}
            />
          </label>

          <label className="game-settings-field">
            <span>Chess960-Startposition (0–959, Standard 518)</span>
            <input
              type="number"
              min={0}
              max={959}
              value={settings.startingPositionId ?? 518}
              onChange={(event) => updateStartingPosition(Number(event.target.value))}
              disabled={starting}
            />
          </label>

          <div className="game-settings-engine-note">
            {t("game.cpuProfileNote")}
          </div>
        </div>

        {error && <div className="game-settings-error">{error}</div>}

        <div className="game-settings-dialog-actions">
          <button
            type="button"
            className="game-settings-dialog-button"
            onClick={onCancel}
            disabled={starting}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="game-settings-dialog-button"
            onClick={() => onStart(settings)}
            disabled={starting}
          >
            {starting ? t("game.starting") : t("game.startGame")}
          </button>
        </div>
      </div>
    </div>
  );
}
