import type { EngineEvaluation } from "../types";
import {
  fetchEvaluation,
  openEvaluationStream,
  stopEvaluation,
} from "../api/evaluationApi";

const FAST_POLL_MS = 250;
const NORMAL_POLL_MS = 2000;

export type BackendLiveEvaluationEvent =
  | { type: "evaluation"; evaluation: EngineEvaluation }
  | { type: "bar"; bar: number }
  | { type: "loading"; loading: boolean }
  | { type: "error"; error: unknown | null };

export type BackendLiveEvaluationListener = (
  event: BackendLiveEvaluationEvent,
) => void;

interface BackendLiveEvaluationDependencies {
  fetchEvaluation: () => Promise<EngineEvaluation>;
  openEvaluationStream: () => EventSource;
  stopEvaluation: () => Promise<void>;
}

/**
 * Owns the transport and lifecycle details of backend live evaluation.
 *
 * React/UI state deliberately stays outside this class. This source only
 * manages HTTP polling, SSE bar updates, request de-duplication and backend
 * stop requests.
 */
export class BackendLiveEvaluationSource {

  private readonly listeners = new Set<BackendLiveEvaluationListener>();
  private readonly dependencies: BackendLiveEvaluationDependencies;

  private active = false;
  private fastPolling = true;
  private requestInFlight = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private eventSource: EventSource | null = null;

  private readonly handleReady = () => {
    void this.requestEvaluation();
  };

  private readonly handleBar = (event: Event) => {
    if (!this.active) return;

    try {
      const data = JSON.parse((event as MessageEvent<string>).data) as {
        bar?: number;
      };
      if (typeof data.bar !== "number" || !Number.isFinite(data.bar)) return;
      this.emit({
        type: "bar",
        bar: Math.max(0, Math.min(1, data.bar)),
      });
    } catch (error) {
      console.warn("[liveEvaluationBar] invalid SSE update", error);
    }
  };

  constructor(
    dependencies: Partial<BackendLiveEvaluationDependencies> = {},
  ) {
    this.dependencies = {
      fetchEvaluation: dependencies.fetchEvaluation ?? fetchEvaluation,
      openEvaluationStream:
        dependencies.openEvaluationStream ?? openEvaluationStream,
      stopEvaluation: dependencies.stopEvaluation ?? stopEvaluation,
    };
  }

  subscribe(listener: BackendLiveEvaluationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  start(): void {
    if (this.active) return;

    this.active = true;
    this.fastPolling = true;
    this.connectEventSource();
    this.restartPolling();
    void this.requestEvaluation();
  }

  suspend(): void {
    if (!this.active && this.eventSource === null && this.intervalId === null) {
      return;
    }

    this.active = false;
    this.disconnectEventSource();
    this.clearPolling();
  }

  refresh(): void {
    if (!this.active) return;

    this.setFastPolling(true);
    void this.requestEvaluation();
  }

  async stop(): Promise<void> {
    this.suspend();
    await this.dependencies.stopEvaluation();
  }

  dispose(): void {
    this.suspend();
    this.listeners.clear();
  }

  private connectEventSource(): void {
    if (this.eventSource !== null) return;

    const source = this.dependencies.openEvaluationStream();
    source.addEventListener("ready", this.handleReady);
    source.addEventListener("bar", this.handleBar);
    source.onerror = () => {
      console.debug(
        "[liveEvaluationBar] SSE connection interrupted; waiting for reconnect",
      );
    };
    this.eventSource = source;
  }

  private disconnectEventSource(): void {
    const source = this.eventSource;
    if (source === null) return;

    source.removeEventListener("ready", this.handleReady);
    source.removeEventListener("bar", this.handleBar);
    source.close();
    this.eventSource = null;
  }

  private restartPolling(): void {
    this.clearPolling();
    if (!this.active) return;

    const delay = this.fastPolling ? FAST_POLL_MS : NORMAL_POLL_MS;
    this.intervalId = setInterval(() => {
      void this.requestEvaluation();
    }, delay);
  }

  private clearPolling(): void {
    if (this.intervalId === null) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  private setFastPolling(value: boolean): void {
    if (this.fastPolling === value) return;
    this.fastPolling = value;
    this.restartPolling();
  }

  private async requestEvaluation(): Promise<void> {
    if (!this.active || this.requestInFlight) return;

    this.requestInFlight = true;
    this.emit({ type: "loading", loading: true });
    this.emit({ type: "error", error: null });

    try {
      const data = await this.dependencies.fetchEvaluation();
      if (!this.active) return;

      const hasLines = Boolean(data.lines && data.lines.length > 0);
      this.setFastPolling(!hasLines);
      if (hasLines) {
        this.emit({ type: "evaluation", evaluation: data });
      }
    } catch (error) {
      if (!this.active) return;
      this.emit({ type: "error", error });
      this.setFastPolling(false);
    } finally {
      this.requestInFlight = false;
      this.emit({ type: "loading", loading: false });
    }
  }

  private emit(event: BackendLiveEvaluationEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
