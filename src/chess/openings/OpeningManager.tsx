import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { getPieceSymbol, squareName } from "../board/boardUtils";
import { mapPositionStringToLocalPieces } from "../board/positionUtils";
import {
  deleteOpening,
  fetchOpenings,
  importOpenings,
  renameOpening,
} from "../api/openingApi";
import type { Opening, Piece } from "../types";
import { openingMoveRows } from "./openingMoveRows";
import "./OpeningManager.css";

function OpeningBoard({ opening }: { opening: Opening }) {
  const pieces = opening.position?.length === 64
    ? mapPositionStringToLocalPieces(opening.position)
    : [];
  const piecesBySquare = new Map<string, Piece>(
    pieces.map((piece) => [squareName(piece.file, piece.rank), piece]),
  );
  const squares = [];

  for (let rank = 8; rank >= 1; rank--) {
    for (let file = 1; file <= 8; file++) {
      const square = squareName(file, rank);
      const piece = piecesBySquare.get(square);
      squares.push(
        <div
          key={square}
          className={`opening-preview-square ${(file + rank) % 2 !== 0 ? "light" : "dark"}`}
        >
          {piece && (
            <span className={`opening-preview-piece opening-preview-piece-${piece.color}`}>
              {getPieceSymbol(piece)}
            </span>
          )}
        </div>,
      );
    }
  }

  return <div className="opening-preview-board">{squares}</div>;
}

export default function OpeningManager() {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => openings.find((opening) => opening.id === selectedId) ?? openings[0] ?? null,
    [openings, selectedId],
  );

  async function load() {
    try {
      setError(null);
      const next = await fetchOpenings();
      setOpenings(next);
      setSelectedId((current) =>
        current && next.some((opening) => opening.id === current)
          ? current
          : next[0]?.id ?? null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("openings.loadFailed"));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      const imported = await importOpenings(await file.text(), file.name);
      await load();
      if (imported[0]) setSelectedId(imported[0].id);
      setMessage(t("openings.imported", { count: imported.length }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("openings.importFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(opening: Opening) {
    const name = window.prompt(t("openings.renamePrompt"), opening.name);
    if (name == null || !name.trim() || name.trim() === opening.name) return;

    try {
      setBusy(true);
      setError(null);
      const updated = await renameOpening(opening.id, name.trim());
      setOpenings((current) =>
        current.map((candidate) => candidate.id === updated.id ? updated : candidate)
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("openings.renameFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(opening: Opening) {
    if (!window.confirm(t("openings.deleteConfirm", { name: opening.name }))) return;

    try {
      setBusy(true);
      setError(null);
      await deleteOpening(opening.id);
      const next = openings.filter((candidate) => candidate.id !== opening.id);
      setOpenings(next);
      setSelectedId(next[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("openings.deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  const rows = selected ? openingMoveRows(selected.sanMoves) : [];

  return (
    <main className="opening-manager">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pgn,text/plain,application/x-chess-pgn"
        hidden
        onChange={(event) => void handleFile(event)}
      />

      <div className="opening-manager-toolbar">
        <div>
          <strong>{t("openings.title")}</strong>
          <span>{t("openings.description")}</span>
        </div>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy}>
          {t("openings.importPgn")}
        </button>
      </div>

      {error && <div className="opening-manager-error">{error}</div>}
      {message && <div className="opening-manager-message">{message}</div>}

      <div className="opening-manager-layout">
        <aside className="opening-manager-list">
          {openings.length === 0 ? (
            <div className="opening-manager-empty">{t("openings.empty")}</div>
          ) : openings.map((opening) => (
            <button
              key={opening.id}
              type="button"
              className={opening.id === selected?.id ? "active" : ""}
              onClick={() => setSelectedId(opening.id)}
            >
              <strong>{opening.name}</strong>
              <span>
                {opening.eco ? `${opening.eco} · ` : ""}
                {t("openings.plies", { count: opening.moves.length })}
              </span>
            </button>
          ))}
        </aside>

        <section className="opening-manager-details">
          {selected ? (
            <>
              <div className="opening-manager-heading">
                <div>
                  <strong>{selected.name}</strong>
                  <span>
                    {selected.eco ?? "–"} · #{selected.startingPositionId} · {
                      selected.sideToMove === "white" ? t("common.white") : t("common.black")
                    } {t("openings.toMove")}
                  </span>
                </div>
                <div className="opening-manager-actions">
                  <button type="button" onClick={() => void handleRename(selected)} disabled={busy}>
                    {t("openings.rename")}
                  </button>
                  <button type="button" onClick={() => void handleDelete(selected)} disabled={busy}>
                    {t("common.delete")}
                  </button>
                </div>
              </div>

              {!selected.playable && (
                <div className="opening-manager-warning">{t("openings.notPlayable")}</div>
              )}

              <div className="opening-manager-preview">
                <OpeningBoard opening={selected} />
                <div className="opening-manager-moves">
                  {rows.map((row) => (
                    <div className="opening-manager-move-row" key={row.moveNumber}>
                      <span>{row.moveNumber}.</span>
                      <strong>{row.white ?? ""}</strong>
                      <strong>{row.black ?? ""}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="opening-manager-empty">{t("openings.select")}</div>
          )}
        </section>
      </div>
    </main>
  );
}
