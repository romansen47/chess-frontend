import { describe, expect, it } from "vitest";

import { squareToBoardOffset } from "./boardOrientation";

describe("squareToBoardOffset", () => {
  it("scales board offsets with the rendered square size", () => {
    expect(squareToBoardOffset("a8", "white", 88)).toEqual({ x: 0, y: 0 });
    expect(squareToBoardOffset("h1", "white", 44)).toEqual({ x: 308, y: 308 });
  });

  it("keeps orientation handling independent of board size", () => {
    expect(squareToBoardOffset("h1", "black", 44)).toEqual({ x: 0, y: 0 });
    expect(squareToBoardOffset("a8", "black", 44)).toEqual({ x: 308, y: 308 });
  });
});
