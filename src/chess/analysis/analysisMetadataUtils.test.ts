import { describe, expect, it } from "vitest";
import {
  customGameMetadataEntries,
  metadataMapsEqual,
  nextCustomMetadataKey,
} from "./analysisMetadataUtils";

describe("analysis metadata utilities", () => {
  it("compares metadata independent of object insertion order", () => {
    expect(metadataMapsEqual(
      { White: "Alice", Black: "Bob" },
      { Black: "Bob", White: "Alice" },
    )).toBe(true);
    expect(metadataMapsEqual(
      { White: "Alice" },
      { White: "Carol" },
    )).toBe(false);
  });

  it("separates custom tags from standard and protected tags", () => {
    expect(customGameMetadataEntries({
      White: "Alice",
      FEN: "fen",
      Annotator: "Roman",
      Source: "Archive",
    })).toEqual([
      ["Annotator", "Roman"],
      ["Source", "Archive"],
    ]);
  });

  it("creates a collision-free custom tag key", () => {
    expect(nextCustomMetadataKey({})).toBe("CustomTag");
    expect(nextCustomMetadataKey({ CustomTag: "a", CustomTag2: "b" }))
      .toBe("CustomTag3");
  });
});
