import { describe, expect, it } from "vitest";
import contractJson from "../../../../contracts/engine-runtime-assignments.json?raw";
import { parseEngineRuntimeAssignments } from "./engineConfigContracts";

describe("engine runtime assignment API contract", () => {
  it("accepts the shared backend/frontend example", () => {
    expect(parseEngineRuntimeAssignments(JSON.parse(contractJson))).toEqual({
      whitePlayerProfileId: "white-fast",
      blackPlayerProfileId: null,
      evaluationProfileId: "browser-fallback",
    });
  });

  it("rejects a changed field type at the HTTP boundary", () => {
    expect(() => parseEngineRuntimeAssignments({
      whitePlayerProfileId: 42,
      blackPlayerProfileId: null,
      evaluationProfileId: null,
    })).toThrow("whitePlayerProfileId");
  });
});
