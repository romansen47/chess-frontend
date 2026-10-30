import { afterEach, describe, expect, it, vi } from "vitest";

import { hydrateBrowserEngineLines } from "./browserLineDisplayApi";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w HAha - 0 1";

describe("hydrateBrowserEngineLines", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends only raw engine data with the exact position context", async () => {
    const response = [{
      eval: 0.4,
      depth: 18,
      moves: "♗b5+",
      positions: ["position"],
      moveArrows: [{ from: "f1", to: "b5" }],
    }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify(response),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(hydrateBrowserEngineLines(
      { initialFen: INITIAL_FEN, uciMoves: ["e2e4", "e7e5"] },
      [{
        eval: 0.4,
        depth: 18,
        mateDistance: null,
        moves: "f1b5",
        positions: ["must not be sent"],
      }],
    )).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/eval/browser-lines",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({
      initialFen: INITIAL_FEN,
      positionMoves: ["e2e4", "e7e5"],
      lines: [{ eval: 0.4, depth: 18, mateDistance: null, moves: "f1b5" }],
    });
  });

  it("rejects positions without the initial FEN before sending a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(hydrateBrowserEngineLines(
      { uciMoves: [] },
      [{ eval: 0, depth: 1, moves: "e2e4" }],
    )).rejects.toThrow("initial FEN");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
