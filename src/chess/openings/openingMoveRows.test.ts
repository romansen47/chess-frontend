import { describe, expect, it } from "vitest";
import { openingMoveRows } from "./openingMoveRows";

describe("openingMoveRows", () => {
  it("groups SAN moves into full-move rows", () => {
    expect(openingMoveRows(["e4", "c5", "Nf3"])).toEqual([
      { moveNumber: 1, white: "e4", black: "c5" },
      { moveNumber: 2, white: "Nf3", black: null },
    ]);
  });
});
