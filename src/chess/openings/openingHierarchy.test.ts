import { describe, expect, it } from "vitest";
import type { Opening } from "../types";
import { groupOpeningHierarchy } from "./openingHierarchy";

function opening(
  id: string,
  name: string,
  family: string,
  variation: string,
  moves: string[],
): Opening {
  return {
    id,
    name,
    family,
    variation,
    eco: "D96",
    startingPositionId: 518,
    initialFen: null,
    moves,
    sanMoves: moves,
    position: "",
    sideToMove: "white",
    playable: true,
  };
}

describe("opening hierarchy", () => {
  it("keeps multiple exact move orders under one variation", () => {
    const grouped = groupOpeningHierarchy([
      opening("a", "Grünfeld Defense: Russian Variation", "Grünfeld Defense",
        "Russian Variation", ["d2d4", "g8f6"]),
      opening("b", "Grünfeld Defense: Russian Variation", "Grünfeld Defense",
        "Russian Variation", ["g1f3", "g8f6"]),
      opening("c", "Italian Game", "Italian Game", "Italian Game",
        ["e2e4", "e7e5"]),
    ]);

    const gruenfeld = grouped.find((family) => family.name === "Grünfeld Defense");
    expect(gruenfeld?.variations).toHaveLength(1);
    expect(gruenfeld?.variations[0].lines).toHaveLength(2);
    expect(gruenfeld?.variations[0].lines.map((line) => line.id)).toEqual(["a", "b"]);
  });
});
