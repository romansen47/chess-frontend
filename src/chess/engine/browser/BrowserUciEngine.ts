import type { EngineLine } from "../../types";
import type { LiveEvaluationPosition } from "../../evaluation/LiveEvaluationSource";
import { UciInfoParser } from "./UciInfoParser";

export interface BrowserUciWorker {
  postMessage(command: string): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<string>) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<string>) => void,
  ): void;
  terminate(): void;
}

export interface BrowserUciAnalysisOptions {
  multiPv: number;
}

export interface BrowserUciEvaluation {
  engineName: string | null;
  lines: readonly EngineLine[];
}

export type BrowserUciEvaluationListener = (
  evaluation: BrowserUciEvaluation,
) => void;

interface BrowserUciEngineOptions {
  handshakeTimeoutMs?: number;
}

export class BrowserUciEngine {
  private readonly handshakeTimeoutMs: number;
  private worker: BrowserUciWorker | null = null;
  private initializePromise: Promise<void> | null = null;
  private lineWaiters = new Set<LineWaiter>();
  private engineName: string | null = null;
  private searchGeneration = 0;
  private activeSearch: ActiveSearch | null = null;
  private transitionChain: Promise<void> = Promise.resolve();
  private disposed = false;

  private readonly handleMessage = (event: MessageEvent<string>) => {
    if (typeof event.data !== "string") return;

    for (const rawLine of event.data.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      this.handleLine(line);
    }
  };

  constructor(
    createWorker: () => BrowserUciWorker,
    options: BrowserUciEngineOptions = {},
  ) {
    this.createWorker = createWorker;
    this.handshakeTimeoutMs = options.handshakeTimeoutMs ?? 5000;
  }

  get name(): string | null {
    return this.engineName;
  }

  async initialize(): Promise<void> {
    this.assertNotDisposed();
    if (this.worker !== null && this.initializePromise === null) return;
    if (this.initializePromise !== null) return this.initializePromise;

    const worker = this.createWorker();
    worker.addEventListener("message", this.handleMessage);
    this.worker = worker;

    const initialization = this.performInitialization();
    this.initializePromise = initialization;

    try {
      await initialization;
    } catch (error) {
      this.destroyWorker();
      throw error;
    } finally {
      if (this.initializePromise === initialization) {
        this.initializePromise = null;
      }
    }
  }

  async startInfinite(
    position: LiveEvaluationPosition,
    options: BrowserUciAnalysisOptions,
    listener: BrowserUciEvaluationListener,
  ): Promise<void> {
    this.assertNotDisposed();
    validateMultiPv(options.multiPv);

    const generation = ++this.searchGeneration;
    return this.enqueueTransition(async () => {
      await this.initialize();
      if (!this.isCurrentGeneration(generation)) return;

      await this.cancelActiveSearch();
      if (!this.isCurrentGeneration(generation)) return;

      const worker = this.requireWorker();
      worker.postMessage("setoption name MultiPV value " + options.multiPv);

      const ready = this.waitForLine((line) => line === "readyok", "readyok");
      worker.postMessage("isready");
      await ready;
      if (!this.isCurrentGeneration(generation)) return;

      const sideToMove = position.uciMoves.length % 2 === 0
        ? "white"
        : "black";
      const parser = new UciInfoParser(sideToMove, options.multiPv);

      this.activeSearch = { generation, parser, listener };

      worker.postMessage(positionCommand(position));
      worker.postMessage("go infinite");
    });
  }

  async stop(): Promise<void> {
    if (this.disposed) return;

    this.searchGeneration++;
    return this.enqueueTransition(async () => {
      if (this.disposed) return;
      await this.cancelActiveSearch();
    });
  }

  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;
    this.searchGeneration++;
    this.activeSearch = null;

    if (this.worker !== null) {
      try {
        this.worker.postMessage("quit");
      } catch {
        // Worker termination below is authoritative.
      }
    }
    this.destroyWorker();
  }

  private async performInitialization(): Promise<void> {
    const worker = this.requireWorker();

    const uciOk = this.waitForLine((line) => line === "uciok", "uciok");
    worker.postMessage("uci");
    await uciOk;

    const readyOk = this.waitForLine((line) => line === "readyok", "readyok");
    worker.postMessage("isready");
    await readyOk;
  }

  private handleLine(line: string): void {
    if (line.startsWith("id name ")) {
      this.engineName = line.substring("id name ".length).trim() || null;
    }

    for (const waiter of [...this.lineWaiters]) {
      if (!waiter.matches(line)) continue;
      this.lineWaiters.delete(waiter);
      clearTimeout(waiter.timeoutId);
      waiter.resolve(line);
    }

    const search = this.activeSearch;
    if (
      search === null
      || search.generation !== this.searchGeneration
      || !line.startsWith("info ")
    ) {
      return;
    }

    const lines = search.parser.push(line);
    if (lines === null || lines.length === 0) return;

    search.listener({
      engineName: this.engineName,
      lines,
    });
  }

  private waitForLine(
    matches: (line: string) => boolean,
    label: string,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const waiter: LineWaiter = {
        matches,
        resolve,
        reject,
        timeoutId: setTimeout(() => {
          this.lineWaiters.delete(waiter);
          reject(new Error("Timed out waiting for UCI " + label));
        }, this.handshakeTimeoutMs),
      };
      this.lineWaiters.add(waiter);
    });
  }

  private async cancelActiveSearch(): Promise<void> {
    if (this.activeSearch === null) return;

    this.activeSearch = null;
    const worker = this.requireWorker();
    const bestMove = this.waitForLine(
      (line) => line.startsWith("bestmove "),
      "bestmove",
    );
    worker.postMessage("stop");

    try {
      await bestMove;
    } catch (error) {
      this.destroyWorker();
      throw error;
    }
  }

  private enqueueTransition(operation: () => Promise<void>): Promise<void> {
    const execution = this.transitionChain.then(operation);
    this.transitionChain = execution.catch(() => undefined);
    return execution;
  }

  private destroyWorker(): void {
    const worker = this.worker;
    this.worker = null;

    for (const waiter of this.lineWaiters) {
      clearTimeout(waiter.timeoutId);
      waiter.reject(new Error("UCI worker terminated"));
    }
    this.lineWaiters.clear();

    if (worker !== null) {
      worker.removeEventListener("message", this.handleMessage);
      worker.terminate();
    }
  }

  private requireWorker(): BrowserUciWorker {
    if (this.worker === null) {
      throw new Error("UCI worker is not initialized");
    }
    return this.worker;
  }

  private isCurrentGeneration(generation: number): boolean {
    return !this.disposed && generation === this.searchGeneration;
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new Error("BrowserUciEngine is disposed");
    }
  }
}

interface LineWaiter {
  matches: (line: string) => boolean;
  resolve: (line: string) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

interface ActiveSearch {
  generation: number;
  parser: UciInfoParser;
  listener: BrowserUciEvaluationListener;
}

function positionCommand(position: LiveEvaluationPosition): string {
  if (position.uciMoves.length === 0) {
    return "position startpos";
  }
  return "position startpos moves " + position.uciMoves.join(" ");
}

function validateMultiPv(multiPv: number): void {
  if (!Number.isInteger(multiPv) || multiPv < 1) {
    throw new Error("multiPv must be a positive integer");
  }
}
