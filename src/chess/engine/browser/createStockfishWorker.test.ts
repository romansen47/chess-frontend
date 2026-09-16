import { describe, expect, it, vi } from "vitest";

import type { BrowserUciWorker } from "./BrowserUciEngine";
import {
  STOCKFISH_BROWSER_RELATIVE_PATH,
  STOCKFISH_BROWSER_VERSION,
  createStockfishWorker,
  stockfishWorkerUrl,
} from "./createStockfishWorker";

function fakeWorker(): BrowserUciWorker {
  return {
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    terminate: vi.fn(),
  };
}

describe("createStockfishWorker", () => {
  it("pins the Stockfish browser version and asset path", () => {
    expect(STOCKFISH_BROWSER_VERSION).toBe("19.0.0");
    expect(STOCKFISH_BROWSER_RELATIVE_PATH).toBe(
      "third-party/stockfish/19.0.0/stockfish-19-lite-single.js",
    );
  });

  it("resolves the worker below the Vite base path", () => {
    expect(stockfishWorkerUrl("/")).toBe(
      "/third-party/stockfish/19.0.0/stockfish-19-lite-single.js",
    );
    expect(stockfishWorkerUrl("/chess")).toBe(
      "/chess/third-party/stockfish/19.0.0/stockfish-19-lite-single.js",
    );
  });

  it("creates a classic worker through the injectable constructor boundary", () => {
    const worker = fakeWorker();
    const instantiate = vi.fn(() => worker);

    expect(createStockfishWorker(instantiate)).toBe(worker);
    expect(instantiate).toHaveBeenCalledWith(
      expect.stringContaining(
        "third-party/stockfish/19.0.0/stockfish-19-lite-single.js",
      ),
    );
  });
});
