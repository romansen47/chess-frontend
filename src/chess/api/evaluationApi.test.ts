import { afterEach, describe, expect, it, vi } from "vitest";

import type { EngineEvaluation } from "../types";
import { EngineUnavailableApiError } from "./engineErrors";
import { fetchEvaluation } from "./evaluationApi";

describe("fetchEvaluation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a successful backend evaluation", async () => {
    const payload: EngineEvaluation = {
      eval: 0.42,
      bar: 0.55,
      engineName: "Stockfish",
      lines: [{ eval: 0.42, depth: 18, moves: "e2e4 e7e5" }],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify(payload),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    )));

    await expect(fetchEvaluation()).resolves.toEqual(payload);
  });

  it("preserves ENGINE_UNAVAILABLE as a typed frontend error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({
        code: "ENGINE_UNAVAILABLE",
        role: "EVALUATION",
        message: "Native engine for evaluation is configured but could not be started",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    )));

    const error = await fetchEvaluation().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(EngineUnavailableApiError);
    expect(error).toMatchObject({
      code: "ENGINE_UNAVAILABLE",
      status: 503,
      role: "EVALUATION",
      message: "Native engine for evaluation is configured but could not be started",
    });
  });

  it("does not classify unrelated backend failures as engine unavailability", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      "database unavailable",
      { status: 500 },
    )));

    await expect(fetchEvaluation()).rejects.toThrow("database unavailable");
  });
});
