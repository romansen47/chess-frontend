import { describe, expect, it } from "vitest";

import { isSystemManagedUciOption } from "./engineConfig";

describe("isSystemManagedUciOption", () => {
  it("recognizes UCI_Chess960 independently of case and whitespace", () => {
    expect(isSystemManagedUciOption("UCI_Chess960")).toBe(true);
    expect(isSystemManagedUciOption("  uci_chess960  ")).toBe(true);
  });

  it("keeps normal profile options user-configurable", () => {
    expect(isSystemManagedUciOption("Hash")).toBe(false);
    expect(isSystemManagedUciOption("MultiPV")).toBe(false);
  });
});
