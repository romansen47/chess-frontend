import { useMemo } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  groupOpeningHierarchy,
  openingLineLabel,
} from "../openings/openingHierarchy";
import type { PlayerColorAssignment } from "./chessDatabaseTypes";
import type { ChessDatabaseSearchController } from "./useChessDatabaseSearch";

interface Props {
  controller: ChessDatabaseSearchController;
}

/** Search criteria panels used by the chess database search dialog. */
export default function ChessDatabaseSearchFilters({ controller }: Props) {
  const { t } = useI18n();
  const {
    searchForm,
    openings,
    openingsLoading,
    updateSearchField,
  } = controller;
  const hierarchy = useMemo(() => groupOpeningHierarchy(openings), [openings]);
  const family = hierarchy.find((candidate) =>
    candidate.name === searchForm.openingFamily) ?? null;
  const variation = family?.variations.find((candidate) =>
    candidate.name === searchForm.openingVariation) ?? null;

  return (
    <div className="chess-database-filter-panels">
      <section className="chess-database-filter-panel">
        <div className="chess-database-filter-panel-title">
          <strong>{t("common.player")}</strong>
          <span>{t("database.playerPairHint")}</span>
        </div>
        <div className="chess-database-search-grid chess-database-player-grid">
          <label>
            <span className="chess-database-player-label-row">
              <span>{t("common.player")} 1</span>
              {searchForm.colorAssignment !== "any" && (
                <span className={`chess-database-color-badge ${
                  searchForm.colorAssignment === "player1White" ? "is-white" : "is-black"
                }`}>
                  {searchForm.colorAssignment === "player1White"
                    ? t("common.white")
                    : t("common.black")}
                </span>
              )}
            </span>
            <input
              value={searchForm.player}
              onChange={(event) => updateSearchField("player", event.target.value)}
            />
          </label>
          <label>
            <span className="chess-database-player-label-row">
              <span>{t("common.player")} 2</span>
              {searchForm.colorAssignment !== "any" && (
                <span className={`chess-database-color-badge ${
                  searchForm.colorAssignment === "player1White" ? "is-black" : "is-white"
                }`}>
                  {searchForm.colorAssignment === "player1White"
                    ? t("common.black")
                    : t("common.white")}
                </span>
              )}
            </span>
            <input
              value={searchForm.player2}
              onChange={(event) => updateSearchField("player2", event.target.value)}
            />
          </label>
        </div>

        <label className="chess-database-color-assignment">
          <span>{t("database.colorAssignment")}</span>
          <select
            value={searchForm.colorAssignment}
            onChange={(event) =>
              updateSearchField(
                "colorAssignment",
                event.target.value as PlayerColorAssignment,
              )
            }
          >
            <option value="any">{t("common.any")}</option>
            <option value="player1White">
              {t("common.player")} 1 = {t("common.white")} ·{" "}
              {t("common.player")} 2 = {t("common.black")}
            </option>
            <option value="player1Black">
              {t("common.player")} 1 = {t("common.black")} ·{" "}
              {t("common.player")} 2 = {t("common.white")}
            </option>
          </select>
        </label>
      </section>

      <section className="chess-database-filter-panel">
        <div className="chess-database-filter-panel-title">
          <strong>{t("common.games")}</strong>
        </div>
        <div className="chess-database-search-grid">
          <label>
            <span>{t("database.fromYear")}</span>
            <input type="number" min="1000" max="9999" value={searchForm.fromYear}
              onChange={(event) => updateSearchField("fromYear", event.target.value)} />
          </label>
          <label>
            <span>{t("database.toYear")}</span>
            <input type="number" min="1000" max="9999" value={searchForm.toYear}
              onChange={(event) => updateSearchField("toYear", event.target.value)} />
          </label>
          <label>
            <span>{t("common.result")}</span>
            <select value={searchForm.result}
              onChange={(event) => updateSearchField("result", event.target.value)}>
              <option value="">{t("common.any")}</option>
              <option value="1-0">1-0</option>
              <option value="0-1">0-1</option>
              <option value="1/2-1/2">½-½</option>
            </select>
          </label>
          <label>
            <span>{t("database.minimumElo")}</span>
            <input type="number" min="0" value={searchForm.minElo}
              onChange={(event) => updateSearchField("minElo", event.target.value)} />
          </label>
        </div>
      </section>

      <section className="chess-database-filter-panel">
        <div className="chess-database-filter-panel-title">
          <strong>{t("game.opening")}</strong>
          <span>{t("database.openingExactHint")}</span>
        </div>
        <div className="chess-database-search-grid">
          <label>
            <span>{t("database.openingFamily")}</span>
            <select
              value={searchForm.openingFamily}
              disabled={openingsLoading}
              onChange={(event) => {
                updateSearchField("openingFamily", event.target.value);
                updateSearchField("openingVariation", "");
                updateSearchField("openingLineId", "");
              }}
            >
              <option value="">{openingsLoading ? "…" : t("common.any")}</option>
              {hierarchy.map((candidate) => (
                <option key={candidate.name} value={candidate.name}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t("database.openingVariation")}</span>
            <select
              value={searchForm.openingVariation}
              disabled={!family}
              onChange={(event) => {
                updateSearchField("openingVariation", event.target.value);
                updateSearchField("openingLineId", "");
              }}
            >
              <option value="">{t("common.any")}</option>
              {family?.variations.map((candidate) => (
                <option key={candidate.key} value={candidate.name}>
                  {candidate.variation} · {candidate.lines.length}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t("database.openingLine")}</span>
            <select
              value={searchForm.openingLineId}
              disabled={!variation}
              onChange={(event) =>
                updateSearchField("openingLineId", event.target.value)
              }
            >
              <option value="">
                {variation
                  ? t("database.allMoveOrders", { count: variation.lines.length })
                  : t("common.any")}
              </option>
              {variation?.lines.map((line, index) => (
                <option key={line.id} value={line.id}>
                  {openingLineLabel(line, index, variation.lines.length)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>{t("database.eco")}</span>
            <input value={searchForm.eco}
              onChange={(event) => updateSearchField("eco", event.target.value)}
              placeholder="B90" />
          </label>
        </div>
      </section>
    </div>
  );
}
