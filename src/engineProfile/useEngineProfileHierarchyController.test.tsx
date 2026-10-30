// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EngineConfigOverview } from "../engineConfigTypes";
import { useEngineProfileHierarchyController } from "./useEngineProfileHierarchyController";

vi.mock("../i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      key === "settings.defaultProfileName"
        ? `${values?.engine} profile`
        : key,
  }),
}));

const overview: EngineConfigOverview = {
  engines: [{
    id: "stockfish",
    name: "Stockfish",
    engine: "/engines/stockfish",
    engineName: "Stockfish",
    engineAuthor: "Stockfish developers",
    options: {
      Threads: { type: "spin", defaultValue: "1", value: "1", min: 1, max: 512, vars: [] },
      ClearHash: { type: "button", defaultValue: null, value: null, min: null, max: null, vars: [] },
      UCI_Chess960: { type: "check", defaultValue: "false", value: "false", min: null, max: null, vars: [] },
    },
  }],
  profiles: [],
  defaults: {
    whitePlayerProfileId: null,
    blackPlayerProfileId: null,
    evaluationProfileId: null,
    deepAnalysisProfileId: null,
  },
  fallbackProfileId: null,
  version: 1,
};

describe("useEngineProfileHierarchyController", () => {
  it("creates a profile draft only from user-configurable UCI options", async () => {
    const { result } = renderHook(() => useEngineProfileHierarchyController({
      overview,
      onOverviewChange: vi.fn(),
    }));
    await waitFor(() => expect(result.current.selectedEngine?.id).toBe("stockfish"));

    act(() => result.current.beginCreateProfile(overview.engines[0]));

    expect(result.current.creatingProfile).toBe(true);
    expect(result.current.profileDraft).toEqual({
      id: null,
      name: "Stockfish profile",
      engineId: "stockfish",
      optionValues: { Threads: "1" },
    });
  });
});
