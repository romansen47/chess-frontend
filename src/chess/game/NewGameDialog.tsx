import { useI18n } from "../../i18n/I18nProvider";
import { createInitialPieces, getPieceSymbol, squareName } from "../board/boardUtils";
import type { GameSettings, Piece } from "../types";

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

const MOBILE_TIME_PRESETS_MINUTES = [1, 2, 3, 5, 10, 15, 30, 60, 90];
const MOBILE_INCREMENT_PRESETS_SECONDS = [0, 1, 2, 3, 5, 10, 15, 30];

function presetValues(values: number[], current: number): number[] {
  return Array.from(new Set([...values, current])).sort((left, right) => left - right);
}

function StartingPositionPreview({
  positionId,
  title,
}: {
  positionId: number;
  title: string;
}) {
  const pieces = createInitialPieces(positionId);
  const piecesBySquare = new Map<string, Piece>(
    pieces.map((piece) => [squareName(piece.file, piece.rank), piece]),
  );
  const squares = [];

  for (let rank = 8; rank >= 1; rank--) {
    for (let file = 1; file <= 8; file++) {
      const square = squareName(file, rank);
      const piece = piecesBySquare.get(square);
      const light = (file + rank) % 2 !== 0;
      squares.push(
        <div
          key={square}
          className={`new-game-preview-square ${light ? "new-game-preview-square-light" : "new-game-preview-square-dark"}`}
          aria-label={square}
        >
          {piece && (
            <span
              className={`new-game-preview-piece new-game-preview-piece-${piece.color}`}
              aria-hidden="true"
            >
              {getPieceSymbol(piece)}
            </span>
          )}
        </div>,
      );
    }
  }

  return (
    <section className="new-game-preview" aria-label={title}>
      <div className="new-game-preview-title">{title}</div>
      <div className="new-game-preview-id">#{positionId}</div>
      <div className="new-game-preview-board">{squares}</div>
    </section>
  );
}

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

  const startingPositionId = settings.startingPositionId ?? 518;
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
            <label className="game-settings-field game-settings-desktop-field">
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

            <label className="game-settings-field game-settings-desktop-field">
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

            <label className="game-settings-field game-settings-desktop-field">
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

            <label className="game-settings-field game-settings-desktop-field">
              <span>{t("game.startingPosition")}</span>
              <input
                type="number"
                min={0}
                max={959}
                value={startingPositionId}
                onChange={(event) => updateStartingPosition(Number(event.target.value))}
                disabled={starting}
              />
            </label>

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
                  disabled={starting}
                  aria-label={t("game.startingPosition")}
                />
                <div className="game-settings-mobile-position-actions">
                  <button
                    type="button"
                    onClick={() => updateStartingPosition(startingPositionId - 1)}
                    disabled={starting || startingPositionId <= 0}
                    aria-label="-1"
                  >
                    −1
                  </button>
                  <button
                    type="button"
                    className={startingPositionId === 518 ? "active" : ""}
                    onClick={() => updateStartingPosition(518)}
                    disabled={starting}
                  >
                    518
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStartingPosition(startingPositionId + 1)}
                    disabled={starting || startingPositionId >= 959}
                    aria-label="+1"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>

            <div className="game-settings-engine-note">
              {t("game.cpuProfileNote")}
            </div>
          </div>

          <StartingPositionPreview
            positionId={startingPositionId}
            title={t("game.startingPositionPreview")}
          />
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
