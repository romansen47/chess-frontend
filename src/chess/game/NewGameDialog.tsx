import { useI18n } from "../../i18n/I18nProvider";
import {
  groupOpeningHierarchy,
  openingLineLabel,
} from "../openings/openingHierarchy";
import NumericStepper from "../ui/NumericStepper";
import type { GameSettings, Opening } from "../types";
import NewGameStartingPositionPreview from "./NewGameStartingPositionPreview";
import "./NewGameDialog.css";

interface NewGameDialogProps {
  settings: GameSettings;
  openings: Opening[];
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

const MOBILE_TIME_PRESETS_MINUTES = [1, 2, 3, 5, 10, 15, 30, 60, 90];
const MOBILE_INCREMENT_PRESETS_SECONDS = [0, 1, 2, 3, 5, 10, 15, 30];

function presetValues(values: number[], current: number): number[] {
  return Array.from(new Set([...values, current])).sort((left, right) => left - right);
}

export default function NewGameDialog({
  settings,
  openings,
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

  const selectedOpening = openings.find((opening) => opening.id === settings.openingId) ?? null;
  const openingHierarchy = groupOpeningHierarchy(
    openings.filter((opening) => opening.playable),
  );
  const startingPositionId = selectedOpening?.startingPositionId ?? settings.startingPositionId ?? 518;
  const timeMinutes = Math.max(1, Math.floor(settings.timeForEachPlayerSeconds / 60));
  const mobileTimeValues = presetValues(MOBILE_TIME_PRESETS_MINUTES, timeMinutes);
  const mobileWhiteIncrementValues = presetValues(
    MOBILE_INCREMENT_PRESETS_SECONDS,
    settings.incrementForWhiteSeconds,
  );
  const mobileBlackIncrementValues = presetValues(
    MOBILE_INCREMENT_PRESETS_SECONDS,
    settings.incrementForBlackSeconds,
  );

  return (
    <div className="game-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="new-game-title">
      <div className="game-settings-dialog-content">
        <h2 id="new-game-title">{t("game.newGame")}</h2>

        <div className="game-settings-layout">
          <div className="game-settings-form">
            <label className="game-settings-field game-settings-opening">
              <span>{t("game.opening")}</span>
              <select
                value={settings.openingId ?? ""}
                onChange={(event) => onSettingsChange({
                  ...settings,
                  openingId: event.target.value || null,
                })}
                disabled={starting}
              >
                <option value="">{t("game.noOpening")}</option>
                {openingHierarchy.map((family) => (
                  <optgroup key={family.name} label={family.name}>
                    {family.variations.flatMap((variation) =>
                      variation.lines.map((line, index) => (
                        <option key={line.id} value={line.id}>
                          {variation.variation} · {
                            openingLineLabel(line, index, variation.lines.length)
                          }
                        </option>
                      )))}
                  </optgroup>
                ))}
              </select>
              <small>{t("game.openingHint")}</small>
              {selectedOpening && (
                <small className="game-settings-opening-meta">
                  {t("openings.plies", { count: selectedOpening.moves.length })} · {
                    selectedOpening.sideToMove === "white" ? t("common.white") : t("common.black")
                  } {t("openings.toMove")}
                </small>
              )}
            </label>

            <div className="game-settings-desktop-options" aria-label={t("game.newGame")}>
              <NumericStepper
                label={t("game.timeEachPlayerMinutes")}
                value={timeMinutes}
                unit="min"
                min={1}
                disabled={starting}
                onChange={(minutes) => updateNumberField(
                  "timeForEachPlayerSeconds",
                  minutes * 60,
                )}
              />
              <NumericStepper
                label={t("game.startingPosition")}
                value={startingPositionId}
                prefix="#"
                min={0}
                max={959}
                editable
                disabled={starting || Boolean(selectedOpening)}
                onChange={updateStartingPosition}
              />
              <NumericStepper
                label={t("game.incrementWhiteSeconds")}
                value={settings.incrementForWhiteSeconds}
                unit="s"
                min={0}
                disabled={starting}
                onChange={(seconds) => updateNumberField(
                  "incrementForWhiteSeconds",
                  seconds,
                )}
              />
              <NumericStepper
                label={t("game.incrementBlackSeconds")}
                value={settings.incrementForBlackSeconds}
                unit="s"
                min={0}
                disabled={starting}
                onChange={(seconds) => updateNumberField(
                  "incrementForBlackSeconds",
                  seconds,
                )}
              />
            </div>

            <div className="game-settings-mobile-controls">
              <label className="game-settings-field">
                <span>{t("game.timeEachPlayerMinutes")}</span>
                <select
                  value={timeMinutes}
                  onChange={(event) => updateNumberField(
                    "timeForEachPlayerSeconds",
                    Number(event.target.value) * 60,
                  )}
                  disabled={starting}
                >
                  {mobileTimeValues.map((minutes) => (
                    <option key={minutes} value={minutes}>{minutes}</option>
                  ))}
                </select>
              </label>

              <div className="game-settings-mobile-increments">
                <label className="game-settings-field">
                  <span>{t("game.incrementWhiteSeconds")}</span>
                  <select
                    value={settings.incrementForWhiteSeconds}
                    onChange={(event) => updateNumberField(
                      "incrementForWhiteSeconds",
                      Number(event.target.value),
                    )}
                    disabled={starting}
                  >
                    {mobileWhiteIncrementValues.map((seconds) => (
                      <option key={seconds} value={seconds}>{seconds}</option>
                    ))}
                  </select>
                </label>

                <label className="game-settings-field">
                  <span>{t("game.incrementBlackSeconds")}</span>
                  <select
                    value={settings.incrementForBlackSeconds}
                    onChange={(event) => updateNumberField(
                      "incrementForBlackSeconds",
                      Number(event.target.value),
                    )}
                    disabled={starting}
                  >
                    {mobileBlackIncrementValues.map((seconds) => (
                      <option key={seconds} value={seconds}>{seconds}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="game-settings-mobile-position">
                <div className="game-settings-mobile-position-header">
                  <span>{t("game.startingPosition")}</span>
                  <strong>#{startingPositionId}</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={959}
                  step={1}
                  value={startingPositionId}
                  onChange={(event) => updateStartingPosition(Number(event.target.value))}
                  disabled={starting || Boolean(selectedOpening)}
                  aria-label={t("game.startingPosition")}
                />
                <div className="game-settings-mobile-position-actions">
                  <button
                    type="button"
                    onClick={() => updateStartingPosition(startingPositionId - 1)}
                    disabled={starting || Boolean(selectedOpening) || startingPositionId <= 0}
                    aria-label="-1"
                  >
                    −1
                  </button>
                  <button
                    type="button"
                    className={startingPositionId === 518 ? "active" : ""}
                    onClick={() => updateStartingPosition(518)}
                    disabled={starting || Boolean(selectedOpening)}
                  >
                    518
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStartingPosition(startingPositionId + 1)}
                    disabled={starting || Boolean(selectedOpening) || startingPositionId >= 959}
                    aria-label="+1"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>

          </div>

          <NewGameStartingPositionPreview
            positionId={startingPositionId}
            position={selectedOpening?.position}
            title={selectedOpening?.name ?? t("game.startingPositionPreview")}
          />
        </div>

        <div className="game-settings-engine-note">
          {t("game.cpuProfileNote")}
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
