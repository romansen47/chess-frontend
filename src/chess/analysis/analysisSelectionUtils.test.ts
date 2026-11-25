import { describe, expect, it } from "vitest";
import { getAnalysisNavigationSound } from "./analysisSelectionUtils";

describe("analysis selection utilities", () => {
  it("uses the capture sound for capturing SAN moves", () => {
    expect(getAnalysisNavigationSound("Qxd4+")).toBe("capture");
  });

  it("uses the regular move sound for ordinary moves and missing notation", () => {
    expect(getAnalysisNavigationSound("Nf3")).toBe("move");
    expect(getAnalysisNavigationSound(undefined)).toBe("move");
  });
});
