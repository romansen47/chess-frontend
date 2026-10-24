import { describe, expect, it } from "vitest";

import type { EngineLine } from "../types";
import {
  isPlayedLine,
  normalizeEngineLineForPgn,
  variationFromLine,
} from "./engineVariationUtils";

function line(moves: string): EngineLine {
  return {
    eval: 0,
    depth: 12,
    moves,
  };
}

describe("engine variation utilities", () => {
  it("uses the correct move-number prefix for white and black", () => {
    expect(variationFromLine(line("e4 e5 Nf3"), 1))
      .toBe("1. e4 e5 Nf3");
    expect(variationFromLine(line("e5 Nf3 Nc6"), 2))
      .toBe("1... e5 Nf3 Nc6");
    expect(variationFromLine(line("Bb5 a6"), 5))
      .toBe("3. Bb5 a6");
  });

  it("normalizes figurines and castling for PGN storage", () => {
    expect(normalizeEngineLineForPgn("♘f3 0-0 ♛xd1"))
      .toBe("Nf3 O-O Qxd1");
  });

  it("detects when an engine line starts with the played SAN move", () => {
    expect(isPlayedLine(line("Nf3 d5"), "Nf3")).toBe(true);
    expect(isPlayedLine(line("d4 d5"), "Nf3")).toBe(false);
  });
});
