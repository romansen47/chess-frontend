import type { EngineLine } from "../types";
import type { BrowserUciEvaluation, BrowserUciEvaluationListener } from "../engine/browser/BrowserUciEngine";
import { createStockfishBrowserUciEngine } from "../engine/browser/createStockfishWorker";
import { evaluationToBar } from "./evaluationBar";
import type {
  LiveEvaluationEvent,
  LiveEvaluationListener,
  LiveEvaluationPosition,
  LiveEvaluationSource,
} from "./LiveEvaluationSource";

export const BROWSER_LIVE_EVALUATION_MULTIPV = 3;

interface BrowserEvaluationEngine {
  startInfinite(
    position: LiveEvaluationPosition,
    options: { multiPv: number },
    listener: BrowserUciEvaluationListener,
  ): Promise<void>;
  stop(): Promise<void>;
  dispose(): void;
}

export class BrowserLiveEvaluationSource implements LiveEvaluationSource {
  private readonly listeners = new Set<LiveEvaluationListener>();
  private readonly createEngine: () => BrowserEvaluationEngine;
  private readonly multiPv: number;
  private engine: BrowserEvaluationEngine | null = null;
  private position: LiveEvaluationPosition | null = null;
  private generation = 0;
  private active = false;
  private disposed = false;

  constructor(
    createEngine: () => BrowserEvaluationEngine =
      createStockfishBrowserUciEngine,
    multiPv: number = BROWSER_LIVE_EVALUATION_MULTIPV,
  ) {
    if (!Number.isInteger(multiPv) || multiPv < 1) {
      throw new Error("Browser live evaluation MultiPV must be positive");
    }
    this.createEngine = createEngine;
    this.multiPv = multiPv;
  }

  subscribe(listener: LiveEvaluationListener): () => void {
    this.assertUsable();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async start(position: LiveEvaluationPosition): Promise<void> {
    this.assertUsable();
    this.active = true;
    this.position = copyPosition(position);
    await this.search(this.position);
  }

  async updatePosition(position: LiveEvaluationPosition): Promise<void> {
    this.assertUsable();
    this.position = copyPosition(position);
    if (this.active) {
      await this.search(this.position);
    }
  }

  refresh(): void {
    this.assertUsable();
    if (this.active && this.position) void this.search(this.position);
  }

  suspend(): void {
    if (this.disposed) return;
    this.active = false;
    this.generation++;
    this.emit({ type: "loading", loading: false });
    if (this.engine) {
      void this.engine.stop().catch((error) =>
        console.debug("[BrowserLiveEvaluationSource] suspend failed", error));
    }
  }

  async stop(): Promise<void> {
    if (this.disposed) return;
    this.active = false;
    this.generation++;
    this.emit({ type: "loading", loading: false });
    const engine = this.engine;
    this.engine = null;
    if (!engine) return;
    try {
      await engine.stop();
    } finally {
      engine.dispose();
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.active = false;
    this.generation++;
    this.engine?.dispose();
    this.engine = null;
    this.listeners.clear();
  }

  private async search(position: LiveEvaluationPosition): Promise<void> {
    const generation = ++this.generation;
    const engine = this.engine ?? this.createEngine();
    this.engine = engine;
    this.emit({ type: "error", error: null });
    this.emit({ type: "loading", loading: true });
    try {
      await engine.startInfinite(
        position,
        { multiPv: this.multiPv },
        (evaluation) => this.publish(generation, evaluation),
      );
    } catch (error) {
      if (!this.isCurrent(generation)) return;
      this.emit({ type: "loading", loading: false });
      this.emit({ type: "error", error });
    }
  }

  private publish(
    generation: number,
    evaluation: BrowserUciEvaluation,
  ): void {
    if (!this.isCurrent(generation) || evaluation.lines.length === 0) return;
    const lines = evaluation.lines.map(copyEngineLine);
    const evalValue = lines[0].eval;
    const bar = evaluationToBar(evalValue);
    this.emit({ type: "loading", loading: false });
    this.emit({ type: "bar", bar });
    this.emit({
      type: "evaluation",
      evaluation: {
        eval: evalValue,
        bar,
        engineName: browserEngineName(evaluation.engineName),
        lines,
      },
    });
  }

  private isCurrent(generation: number): boolean {
    return !this.disposed && this.active && generation === this.generation;
  }

  private emit(event: LiveEvaluationEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  private assertUsable(): void {
    if (this.disposed) {
      throw new Error("BrowserLiveEvaluationSource is disposed");
    }
  }
}

function browserEngineName(name: string | null): string {
  return name?.trim()
    ? name.trim() + " (Browser)"
    : "Stockfish 19 Lite (Browser)";
}

function copyPosition(position: LiveEvaluationPosition): LiveEvaluationPosition {
  return { ...position, uciMoves: [...position.uciMoves] };
}

function copyEngineLine(line: EngineLine): EngineLine {
  return {
    ...line,
    positions: line.positions ? [...line.positions] : undefined,
  };
}
