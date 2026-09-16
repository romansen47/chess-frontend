import {
  BrowserUciEngine,
  type BrowserUciWorker,
} from "./BrowserUciEngine";

export const STOCKFISH_BROWSER_VERSION = "19.0.0";
export const STOCKFISH_BROWSER_RELATIVE_PATH =
  "third-party/stockfish/19.0.0/stockfish-19-lite-single.js";

export type BrowserWorkerInstantiator = (
  url: string,
) => BrowserUciWorker;

export function stockfishWorkerUrl(
  baseUrl: string = import.meta.env.BASE_URL,
): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  return normalizedBase + STOCKFISH_BROWSER_RELATIVE_PATH;
}

export function createStockfishWorker(
  instantiate: BrowserWorkerInstantiator = (url) => new Worker(url),
): BrowserUciWorker {
  return instantiate(stockfishWorkerUrl());
}

export function createStockfishBrowserUciEngine(): BrowserUciEngine {
  return new BrowserUciEngine(() => createStockfishWorker());
}
