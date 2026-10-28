import { useMemo } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { Opening } from "../types";
import { groupOpeningHierarchy } from "./openingHierarchy";

interface Props {
  openings: Opening[];
  selectedId: string | null;
  filter: string;
  onFilterChange: (value: string) => void;
  onSelect: (openingId: string) => void;
}

/** Hierarchical family/variation navigation for the exact opening lines. */
export default function OpeningVariationList({
  openings,
  selectedId,
  filter,
  onFilterChange,
  onSelect,
}: Props) {
  const { t } = useI18n();
  const hierarchy = useMemo(() => groupOpeningHierarchy(openings), [openings]);
  const query = filter.trim().toLocaleLowerCase();

  const matches = hierarchy.flatMap((family) =>
    family.variations
      .filter((variation) => {
        if (!query) return true;
        return family.name.toLocaleLowerCase().includes(query)
          || variation.name.toLocaleLowerCase().includes(query)
          || variation.lines.some((line) =>
            line.eco?.toLocaleLowerCase().includes(query));
      })
      .map((variation) => ({ family: family.name, variation })),
  );
  const visible = matches.slice(0, 400);

  if (openings.length === 0) {
    return <div className="opening-manager-empty">{t("openings.empty")}</div>;
  }

  let lastFamily = "";
  return (
    <>
      <div className="opening-manager-filter">
        <input
          type="search"
          value={filter}
          placeholder={t("openings.filter")}
          onChange={(event) => onFilterChange(event.target.value)}
        />
        <span>{t("openings.showing", { shown: visible.length, total: matches.length })}</span>
      </div>

      {visible.length === 0 ? (
        <div className="opening-manager-empty">{t("openings.noMatches")}</div>
      ) : visible.map(({ family, variation }) => {
        const showFamily = family !== lastFamily;
        lastFamily = family;
        const selected = variation.lines.some((line) => line.id === selectedId);
        const ecos = [...new Set(variation.lines.map((line) => line.eco).filter(Boolean))];
        return (
          <div className="opening-manager-variation-entry" key={variation.key}>
            {showFamily && <div className="opening-manager-family">{family}</div>}
            <button
              type="button"
              className={selected ? "active" : ""}
              onClick={() => onSelect(variation.lines[0].id)}
            >
              <strong>{variation.variation}</strong>
              <span>
                {ecos.length > 0 ? `${ecos.join("/")} · ` : ""}
                {t("openings.moveOrders", { count: variation.lines.length })}
              </span>
            </button>
          </div>
        );
      })}
    </>
  );
}
