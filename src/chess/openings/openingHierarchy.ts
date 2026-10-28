import type { Opening } from "../types";

export interface OpeningVariationGroup {
  key: string;
  family: string;
  variation: string;
  name: string;
  lines: Opening[];
}

export interface OpeningFamilyGroup {
  name: string;
  variations: OpeningVariationGroup[];
}

/** Groups exact opening move orders without merging or normalizing their moves. */
export function groupOpeningHierarchy(openings: Opening[]): OpeningFamilyGroup[] {
  const families = new Map<string, Map<string, Opening[]>>();

  for (const opening of openings) {
    const family = opening.family || opening.name;
    let variations = families.get(family);
    if (!variations) {
      variations = new Map();
      families.set(family, variations);
    }
    const lines = variations.get(opening.name) ?? [];
    lines.push(opening);
    variations.set(opening.name, lines);
  }

  return [...families.entries()]
    .map(([family, variations]) => ({
      name: family,
      variations: [...variations.entries()]
        .map(([name, lines]) => ({
          key: name,
          family,
          name,
          variation: lines[0]?.variation || name,
          lines: [...lines].sort(compareLines),
        }))
        .sort((left, right) =>
          left.variation.localeCompare(right.variation, undefined, { sensitivity: "base" })),
    }))
    .sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
}

export function openingLineLabel(
  opening: Opening,
  index: number,
  total: number,
): string {
  const line = opening.sanMoves.join(" ");
  const number = total > 1 ? `#${index + 1} · ` : "";
  const eco = opening.eco ? `${opening.eco} · ` : "";
  return `${number}${eco}${line}`;
}

function compareLines(left: Opening, right: Opening): number {
  const moveCount = left.moves.length - right.moves.length;
  if (moveCount !== 0) return moveCount;
  return left.moves.join(" ").localeCompare(right.moves.join(" "));
}
