import { afterEach, describe, expect, it, vi } from "vitest";
import {
  jsonRequest,
  requestBlob,
  requestJson,
  requestJsonResponse,
  requestVoid,
} from "./httpClient";

describe("httpClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns typed JSON for successful responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ value: 7 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ));
    await expect(requestJson<{ value: number }>("/api/example"))
      .resolves.toEqual({ value: 7 });
  });

  it("uses the response body and then the status as error text", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("Detailed failure", { status: 400 }))
      .mockResolvedValueOnce(new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(requestVoid("/body-error")).rejects.toThrow("Detailed failure");
    await expect(requestVoid("/status-error")).rejects.toThrow("HTTP 503");
  });

  it("creates consistent JSON request options", () => {
    expect(jsonRequest("PATCH", { enabled: true })).toEqual({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
  });

  it("preserves status information for expected API failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ legal: false }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    ));
    await expect(requestJsonResponse<{ legal: boolean }>("/api/move"))
      .resolves.toEqual({ ok: false, status: 409, data: { legal: false } });
  });

  it("loads successful binary responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("pgn", { status: 200 }),
    ));
    await expect((await requestBlob("/api/game/pgn")).text())
      .resolves.toBe("pgn");
  });
});
