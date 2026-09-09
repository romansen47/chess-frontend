import type { MouseEvent } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { MoveRow } from "../types";

interface MovePanelState {
  moves: MoveRow[];
  whitePlayerName: string;
  blackPlayerName: string;
  whiteActive: boolean;
  blackActive: boolean;
  selectedPly: number | null;
  loadingMoves: boolean;
  computerThinking: boolean;
  error: string | null;
}

interface MovePanelActions {
  showPreview: (event: MouseEvent<HTMLElement>, position: string | undefined) => void;
  movePreview: (event: MouseEvent<HTMLElement>) => void;
  hidePreview: () => void;
  selectPosition: (
    position: string | undefined,
    san: string | undefined,
    ply: number
  ) => void;
}

interface MovePanelProps {
  state: MovePanelState;
  actions: MovePanelActions;
}

interface PgnImportErrorPayload {
  code?: string;
  gameCount?: number;
  earlyAbort?: boolean;
}

function parsePgnImportError(error: string | null): PgnImportErrorPayload | null {
  if (!error) return null;

  try {
    const parsed = JSON.parse(error) as PgnImportErrorPayload;
    if (parsed && typeof parsed === "object" && typeof parsed.code === "string") {
      return parsed;
    }
  } catch {
    // Non-JSON errors keep the normal generic error presentation.
  }

  return null;
}

export default function MovePanel({ state, actions }: MovePanelProps) {
  const { t } = useI18n();
  const pgnImportError = parsePgnImportError(state.error);
  const multiplePgnGames = pgnImportError?.code === "PGN_MULTIPLE_GAMES";
  const gameCount = typeof pgnImportError?.gameCount === "number"
    ? pgnImportError.gameCount
    : null;
  const countPrefix = pgnImportError?.earlyAbort ? "≥ " : "";

  return (
    <section className="moves-panel">
      <h2 className="panel-title">{t("moves.title")}</h2>

      <div className="player-names-panel">
        <div
          className={[
            "player-name-row",
            "player-name-row-white",
            state.whiteActive ? "player-name-row-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          title={state.whitePlayerName}
        >
          <span className="player-name-color">{t("common.white")}</span>
          <span className="player-name-value">{state.whitePlayerName}</span>
        </div>

        <div
          className={[
            "player-name-row",
            "player-name-row-black",
            state.blackActive ? "player-name-row-active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          title={state.blackPlayerName}
        >
          <span className="player-name-color">{t("common.black")}</span>
          <span className="player-name-value">{state.blackPlayerName}</span>
        </div>
      </div>

      {state.error && (
        multiplePgnGames ? (
          <div className="moves-import-warning" role="alert">
            <strong>
              ⚠ {countPrefix}{gameCount ?? "?"} {t("common.games")}
            </strong>
            <span>
              {t("data.label")} → {t("data.chessDatabase")} → {t("database.importPgn")}
            </span>
          </div>
        ) : (
          <div className="moves-error-banner" role="alert">
            {t("moves.error", { message: state.error })}
          </div>
        )
      )}

      <div className="moves-list">
        {state.moves.length === 0 && (
          <div className="moves-empty">{t("moves.empty")}</div>
        )}

        {state.moves.map((row) => (
          <div key={row.moveNumber} className="move-row">
            <span className="move-number">{row.moveNumber}.</span>
            <span
              className={[
                "move-entry",
                "move-entry-white",
                row.whitePosition ? "move-entry-previewable" : "",
                state.selectedPly === (row.moveNumber - 1) * 2 + 1
                  ? "move-entry-analysis-selected"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={(event) => actions.showPreview(event, row.whitePosition)}
              onMouseMove={actions.movePreview}
              onMouseLeave={actions.hidePreview}
              onClick={() =>
                actions.selectPosition(
                  row.whitePosition,
                  row.white,
                  (row.moveNumber - 1) * 2 + 1
                )
              }
            >
              {row.white ?? ""}
            </span>
            <span
              className={[
                "move-entry",
                "move-entry-black",
                row.blackPosition ? "move-entry-previewable" : "",
                state.selectedPly === row.moveNumber * 2
                  ? "move-entry-analysis-selected"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={(event) => actions.showPreview(event, row.blackPosition)}
              onMouseMove={actions.movePreview}
              onMouseLeave={actions.hidePreview}
              onClick={() =>
                actions.selectPosition(
                  row.blackPosition,
                  row.black,
                  row.moveNumber * 2
                )
              }
            >
              {row.black ?? ""}
            </span>
          </div>
        ))}

        {(state.loadingMoves || state.computerThinking) && (
          <div className="moves-empty">
            {state.computerThinking ? t("moves.computerThinking") : t("moves.loading")}
          </div>
        )}
      </div>
    </section>
  );
}
