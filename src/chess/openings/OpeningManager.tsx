import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import PositionPreviewBoard from "../board/PositionPreviewBoard";
import {
  deleteOpening,
  fetchOpenings,
  renameOpening,
} from "../api/openingApi";
import type { Opening } from "../types";
import {
  groupOpeningHierarchy,
  openingLineLabel,
} from "./openingHierarchy";
import { openingMoveRows } from "./openingMoveRows";
import OpeningVariationList from "./OpeningVariationList";
import "./OpeningManager.css";

function OpeningBoard({ opening }: { opening: Opening }) {
  return <PositionPreviewBoard position={opening.position} classPrefix="opening-preview" />;
}

export default function OpeningManager() {
  const { t } = useI18n();
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => openings.find((opening) => opening.id === selectedId) ?? openings[0] ?? null,
    [openings, selectedId],
  );
  const hierarchy = useMemo(() => groupOpeningHierarchy(openings), [openings]);
  const selectedVariation = useMemo(
    () => hierarchy
      .flatMap((family) => family.variations)
      .find((variation) => variation.lines.some((line) => line.id === selected?.id)) ?? null,
    [hierarchy, selected?.id],
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
      <div className="opening-manager-toolbar">
        <div>
          <strong>{t("openings.title")}</strong>
          <span>{t("openings.description")}</span>
        </div>
      </div>

      {error && <div className="opening-manager-error">{error}</div>}

      <div className="opening-manager-layout">
        <aside className="opening-manager-list">
          <OpeningVariationList
            openings={openings}
            selectedId={selected?.id ?? null}
            filter={filter}
            onFilterChange={setFilter}
            onSelect={setSelectedId}
          />
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

              {selectedVariation && (
                <label className="opening-manager-line-selector">
                  <span>
                    {t("openings.moveOrder")} · {t("openings.family")}:{" "}
                    {selectedVariation.family} · {t("openings.variation")}:{" "}
                    {selectedVariation.variation}
                  </span>
                  <select
                    value={selected.id}
                    onChange={(event) => setSelectedId(event.target.value)}
                  >
                    {selectedVariation.lines.map((line, index) => (
                      <option key={line.id} value={line.id}>
                        {openingLineLabel(line, index, selectedVariation.lines.length)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

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
