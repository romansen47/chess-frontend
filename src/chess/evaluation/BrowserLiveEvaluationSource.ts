import type { EngineLine } from "../types";
import {
  hydrateBrowserEngineLines,
  type BrowserLineDisplayHydration,
} from "../api/browserLineDisplayApi";
import type { BrowserUciEvaluation, BrowserUciEvaluationListener } from "../engine/browser/BrowserUciEngine";
import { createStockfishBrowserUciEngine } from "../engine/browser/createStockfishWorker";
import { BrowserLineDisplayHydrator } from "./BrowserLineDisplayHydrator";
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

interface EvaluationSnapshot {
  engineName: string;
  lines: EngineLine[];
}

interface LineDisplay {
  moves: string;
  positions?: string[];
  moveArrows?: EngineLine["moveArrows"];
}

export class BrowserLiveEvaluationSource implements LiveEvaluationSource {
  private readonly listeners = new Set<LiveEvaluationListener>();
  private readonly createEngine: () => BrowserEvaluationEngine;
  private readonly multiPv: number;
  private readonly lineHydrator: BrowserLineDisplayHydrator;
  private engine: BrowserEvaluationEngine | null = null;
  private position: LiveEvaluationPosition | null = null;
  private generation = 0;
  private active = false;
  private disposed = false;
  private latestSnapshot: EvaluationSnapshot | null = null;
  private readonly displayByVariation = new Map<string, LineDisplay>();
  private readonly displayByIndex = new Map<number, LineDisplay>();
  private lastHydrationSignature: string | null = null;

  constructor(
    createEngine: () => BrowserEvaluationEngine =
      createStockfishBrowserUciEngine,
    multiPv: number = BROWSER_LIVE_EVALUATION_MULTIPV,
    hydrateLines: BrowserLineDisplayHydration = hydrateBrowserEngineLines,
    hydrationIntervalMs = 500,
  ) {
    if (!Number.isInteger(multiPv) || multiPv < 1) {
      throw new Error("Browser live evaluation MultiPV must be positive");
    }
    this.createEngine = createEngine;
    this.multiPv = multiPv;
    this.lineHydrator = new BrowserLineDisplayHydrator(
      hydrateLines,
      hydrationIntervalMs,
    );
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
    await this.search(this.position, false);
  }

  async updatePosition(position: LiveEvaluationPosition): Promise<void> {
    this.assertUsable();
    this.position = copyPosition(position);
    if (this.active) {
      await this.search(this.position, true);
    }
  }

  refresh(): void {
    this.assertUsable();
    if (this.active && this.position) void this.search(this.position, true);
  }

  suspend(): void {
    if (this.disposed) return;
    this.active = false;
    this.generation++;
    this.resetLineDisplay(false);
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
    this.resetLineDisplay(false);
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
    this.lineHydrator.dispose();
    this.displayByVariation.clear();
    this.displayByIndex.clear();
    this.engine?.dispose();
    this.engine = null;
    this.listeners.clear();
  }

  private async search(
    position: LiveEvaluationPosition,
    preserveDisplay: boolean,
  ): Promise<void> {
    const generation = ++this.generation;
    this.resetLineDisplay(preserveDisplay);
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
    this.latestSnapshot = {
      engineName: browserEngineName(evaluation.engineName),
      lines,
    };
    this.emit({ type: "loading", loading: false });
    this.emitSnapshot(this.latestSnapshot);
    this.requestLineDisplay(generation, lines);
  }

  private requestLineDisplay(generation: number, lines: EngineLine[]): void {
    if (!this.position?.initialFen) return;
    const signature = lines.map((line) => line.moves).join("\u0000");
    if (signature === this.lastHydrationSignature) return;
    this.lastHydrationSignature = signature;
    const rawLines = lines.map(copyEngineLine);
    this.lineHydrator.submit(
      this.position,
      rawLines,
      (displayLines) => this.applyLineDisplay(generation, rawLines, displayLines),
      (error) => {
        if (!this.isCurrent(generation)) return;
        if (this.lastHydrationSignature === signature) {
          this.lastHydrationSignature = null;
        }
        console.debug("[BrowserLiveEvaluationSource] line display unavailable", error);
      },
    );
  }

  private applyLineDisplay(
    generation: number,
    rawLines: EngineLine[],
    displayLines: EngineLine[],
  ): void {
    if (!this.isCurrent(generation)) return;
    rawLines.forEach((raw, index) => {
      const display = displayLines[index];
      if (!display?.positions?.length) return;
      const lineDisplay = {
        moves: display.moves,
        positions: [...display.positions],
        moveArrows: display.moveArrows?.map((arrow) => ({ ...arrow })),
      };
      this.displayByVariation.set(raw.moves, lineDisplay);
      if (this.latestSnapshot?.lines[index]?.moves === raw.moves) {
        this.displayByIndex.set(index, lineDisplay);
      }
    });
    if (this.latestSnapshot) this.emitSnapshot(this.latestSnapshot);
  }

  private emitSnapshot(snapshot: EvaluationSnapshot): void {
    const lines = snapshot.lines.map(
      (line, index) => this.withLineDisplay(line, index),
    );
    const evalValue = lines[0].eval;
    const bar = evaluationToBar(evalValue);
    this.emit({ type: "bar", bar });
    this.emit({
      type: "evaluation",
      evaluation: {
        eval: evalValue,
        bar,
        engineName: snapshot.engineName,
        lines,
      },
    });
  }

  private withLineDisplay(line: EngineLine, index: number): EngineLine {
    const display = this.displayByVariation.get(line.moves)
      ?? this.displayByIndex.get(index);
    return display ? { ...copyEngineLine(line), ...display } : copyEngineLine(line);
  }

  private resetLineDisplay(preserveDisplay: boolean): void {
    this.lineHydrator.cancel();
    this.latestSnapshot = null;
    this.displayByVariation.clear();
    if (!preserveDisplay) this.displayByIndex.clear();
    this.lastHydrationSignature = null;
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
    moveArrows: line.moveArrows?.map((arrow) => ({ ...arrow })),
  };
}
