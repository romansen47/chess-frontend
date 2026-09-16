import { describe, expect, it } from "vitest";

import { UciInfoParser } from "./UciInfoParser";

describe("UciInfoParser", () => {
  it("normalizes centipawn scores to White perspective", () => {
    const white = new UciInfoParser("white", 1);
    const black = new UciInfoParser("black", 1);

    expect(white.push(
      "info depth 18 multipv 1 score cp 125 nodes 100 pv e2e4 e7e5",
    )).toEqual([{
      eval: 1.25,
      depth: 18,
      mateDistance: null,
      moves: "e2e4 e7e5",
    }]);

    expect(black.push(
      "info depth 18 multipv 1 score cp 125 nodes 100 pv e7e5 g1f3",
    )).toEqual([{
      eval: -1.25,
      depth: 18,
      mateDistance: null,
      moves: "e7e5 g1f3",
    }]);
  });

  it("maps mate scores to plus or minus 99 and preserves distance", () => {
    const parser = new UciInfoParser("white", 1);

    expect(parser.push(
      "info depth 22 score mate -4 pv h7h8q e1e2",
    )).toEqual([{
      eval: -99,
      depth: 22,
      mateDistance: 4,
      moves: "h7h8q e1e2",
    }]);
  });

  it("ignores transient mate zero without completing MultiPV", () => {
    const parser = new UciInfoParser("white", 2);

    expect(parser.push(
      "info depth 12 multipv 1 score cp 30 pv e2e4",
    )).toBeNull();
    expect(parser.push(
      "info depth 12 multipv 2 score mate 0 pv d2d4",
    )).toBeNull();
    expect(parser.flush()).toEqual([{
      eval: 0.3,
      depth: 12,
      mateDistance: null,
      moves: "e2e4",
    }]);
  });

  it("emits MultiPV only as a contiguous set from one depth", () => {
    const parser = new UciInfoParser("white", 3);

    expect(parser.push(
      "info depth 15 multipv 2 score cp 20 pv d2d4 d7d5",
    )).toBeNull();
    expect(parser.push(
      "info depth 15 multipv 1 score cp 35 pv e2e4 e7e5",
    )).toBeNull();

    expect(parser.push(
      "info depth 15 multipv 3 score cp 10 pv g1f3 g8f6",
    )).toEqual([
      { eval: 0.35, depth: 15, mateDistance: null, moves: "e2e4 e7e5" },
      { eval: 0.2, depth: 15, mateDistance: null, moves: "d2d4 d7d5" },
      { eval: 0.1, depth: 15, mateDistance: null, moves: "g1f3 g8f6" },
    ]);
  });

  it("publishes a contiguous prefix when a depth rolls over", () => {
    const parser = new UciInfoParser("white", 3);

    expect(parser.push(
      "info depth 8 multipv 1 score cp 40 pv e2e4",
    )).toBeNull();
    expect(parser.push(
      "info depth 8 multipv 2 score cp 25 pv d2d4",
    )).toBeNull();

    expect(parser.push(
      "info depth 9 multipv 1 score cp 45 pv e2e4",
    )).toEqual([
      { eval: 0.4, depth: 8, mateDistance: null, moves: "e2e4" },
      { eval: 0.25, depth: 8, mateDistance: null, moves: "d2d4" },
    ]);
  });

  it("ignores non-info and malformed lines", () => {
    const parser = new UciInfoParser("white", 1);

    expect(parser.push("uciok")).toBeNull();
    expect(parser.push("info depth x score cp 10 pv e2e4")).toBeNull();
    expect(parser.push("info depth 10 score cp 10")).toBeNull();
  });
});
