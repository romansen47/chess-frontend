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

  return (
    <div className="game-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="new-game-title">
      <div className="game-settings-dialog-content">
        <h2 id="new-game-title">{t("game.newGame")}</h2>

        <div className="game-settings-layout">
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
