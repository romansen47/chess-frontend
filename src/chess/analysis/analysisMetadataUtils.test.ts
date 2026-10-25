import { describe, expect, it } from "vitest";
import {
  customGameMetadataEntries,
  displayPositionMetadata,
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

  it("presents internal Chess960 position 518 as classical chess", () => {
    const tags = {
      Variant: "Chess960",
      SetUp: "1",
      FEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w HAha - 0 1",
    };
    expect(displayPositionMetadata(tags)).toEqual({
      Variant: "Standard", SetUp: "0", FEN: "—",
    });
    expect(tags).toEqual({
      Variant: "Chess960", SetUp: "1",
      FEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w HAha - 0 1",
    });
  });

  it("recognizes classical castling notation for the initial position", () => {
    expect(displayPositionMetadata({
      Variant: "Chess960", SetUp: "1",
      FEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    })).toEqual({ Variant: "Standard", SetUp: "0", FEN: "—" });
  });

  it("retains nonclassical starting positions and custom FEN positions", () => {
    const tags = {
      Variant: "Chess960", SetUp: "1",
      FEN: "rbnqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RBNQKBNR w HAha - 0 1",
    };
    expect(displayPositionMetadata(tags)).toEqual(tags);
    const later = {
      Variant: "Chess960", SetUp: "1",
      FEN: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b HAha - 0 1",
    };
    expect(displayPositionMetadata(later)).toEqual(later);
  });

});
