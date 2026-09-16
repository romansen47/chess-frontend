import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchEngineCapabilities } from "./engineCapabilitiesApi";
import type { EngineCapabilities } from "./engineContracts";

describe("fetchEngineCapabilities", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the stable capability snapshot", async () => {
    const payload: EngineCapabilities = {
      whitePlayer: {
        configured: true,
        available: true,
        reason: "AVAILABLE",
      },
      blackPlayer: {
        configured: false,
        available: false,
        reason: "NOT_CONFIGURED",
      },
      evaluation: {
        configured: true,
        available: false,
        reason: "EXECUTABLE_NOT_FOUND",
      },
      deepAnalysis: {
        configured: true,
        available: false,
        reason: "UCI_UNRESPONSIVE",
      },
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify(payload),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchEngineCapabilities()).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("/api/engines/capabilities");
  });
});
