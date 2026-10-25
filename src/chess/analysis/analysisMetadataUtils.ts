export const STANDARD_GAME_METADATA_TAGS = [
  "Event",
  "Site",
  "Date",
  "Round",
  "White",
  "Black",
  "WhiteElo",
  "BlackElo",
  "Result",
  "ECO",
  "TimeControl",
] as const;

export const PROTECTED_GAME_METADATA_TAGS = [
  "Variant",
  "SetUp",
  "FEN",
] as const;

const STANDARD = new Set<string>(STANDARD_GAME_METADATA_TAGS);
const PROTECTED = new Set<string>(PROTECTED_GAME_METADATA_TAGS);

export function isStandardGameMetadataTag(key: string): boolean {
  return STANDARD.has(key);
}

export function isProtectedGameMetadataTag(key: string): boolean {
  return PROTECTED.has(key);
}

export function customGameMetadataEntries(
  tags: Readonly<Record<string, string>>,
): Array<[string, string]> {
  return Object.entries(tags)
    .filter(([key]) => !isStandardGameMetadataTag(key) && !isProtectedGameMetadataTag(key))
    .sort(([left], [right]) => left.localeCompare(right));
}

export function metadataMapsEqual(
  left: Readonly<Record<string, string>>,
  right: Readonly<Record<string, string>>,
): boolean {
  const leftEntries = Object.entries(left).sort(([a], [b]) => a.localeCompare(b));
  const rightEntries = Object.entries(right).sort(([a], [b]) => a.localeCompare(b));
  if (leftEntries.length !== rightEntries.length) return false;
  return leftEntries.every(([key, value], index) => (
    rightEntries[index]?.[0] === key && rightEntries[index]?.[1] === value
  ));
}

export function nextCustomMetadataKey(
  tags: Readonly<Record<string, string>>,
): string {
  let index = 1;
  while (true) {
    const candidate = index === 1 ? "CustomTag" : `CustomTag${index}`;
    if (!(candidate in tags)) return candidate;
    index++;
  }
}

/**
 * Present the PGN-facing variant separately from the internal Chess960 model.
 * The core intentionally uses Scharnagl 518 (and an explicit FEN) even for
 * classical games. Never mutate the authoritative metadata here.
 */
export function displayPositionMetadata(
  tags: Readonly<Record<string, string>>,
): Record<(typeof PROTECTED_GAME_METADATA_TAGS)[number], string> {
  const fen = tags.FEN?.trim() ?? "";
  const fields = fen.split(/\s+/);
  const classicalLayout =
    fields[0] === "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR" &&
    fields[1] === "w" &&
    (fields[2] === "HAha" || fields[2] === "KQkq") &&
    fields[3] === "-" &&
    fields[4] === "0" &&
    fields[5] === "1";

  if (classicalLayout) {
    return { Variant: "Standard", SetUp: "0", FEN: "—" };
  }

  return {
    Variant: tags.Variant ?? "—",
    SetUp: tags.SetUp ?? "—",
    FEN: tags.FEN ?? "—",
  };
}
