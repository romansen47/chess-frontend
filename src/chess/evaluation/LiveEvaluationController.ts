import { fetchEngineCapabilities } from "../api/engineCapabilitiesApi";
import type { EngineCapabilities } from "../api/engineContracts";
import { EngineUnavailableApiError } from "../api/engineErrors";
import type {
  LiveEvaluationEvent,
  LiveEvaluationListener,
  LiveEvaluationPosition,
  LiveEvaluationSource,
} from "./LiveEvaluationSource";

interface LiveEvaluationControllerDependencies {
  backendSource: LiveEvaluationSource;
  createBrowserSource: () => LiveEvaluationSource | Promise<LiveEvaluationSource>;
  fetchCapabilities?: () => Promise<EngineCapabilities>;
}

export class LiveEvaluationController {
  private readonly listeners = new Set<LiveEvaluationListener>();
  private readonly backendSource: LiveEvaluationSource;
  private readonly createBrowserSource:
    () => LiveEvaluationSource | Promise<LiveEvaluationSource>;
  private readonly fetchCapabilities: () => Promise<EngineCapabilities>;

  private browserSource: LiveEvaluationSource | null = null;
  private browserSourcePromise: Promise<LiveEvaluationSource> | null = null;
  private activeSource: LiveEvaluationSource | null = null;
  private activeSourceUnsubscribe: (() => void) | null = null;
  private currentPosition: LiveEvaluationPosition | null = null;
  private activationGeneration = 0;
  private desiredActive = false;
  private disposed = false;

  constructor(dependencies: LiveEvaluationControllerDependencies) {
    this.backendSource = dependencies.backendSource;
    this.createBrowserSource = dependencies.createBrowserSource;
    this.fetchCapabilities =
      dependencies.fetchCapabilities ?? fetchEngineCapabilities;
  }

  subscribe(listener: LiveEvaluationListener): () => void {
    this.assertNotDisposed();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async start(position: LiveEvaluationPosition): Promise<void> {
    this.assertNotDisposed();
    this.desiredActive = true;
    this.currentPosition = copyPosition(position);

    const generation = ++this.activationGeneration;
    this.suspendActiveSource();

    let capabilities: EngineCapabilities;
    try {
      capabilities = await this.fetchCapabilities();
    } catch (error) {
      if (!this.isCurrent(generation)) return;
      this.emit({ type: "error", error });
      return;
    }

    if (!this.isCurrent(generation)) return;

    if (capabilities.evaluation.available) {
      await this.activateSource(
        this.backendSource,
        this.currentPosition,
        generation,
      );
      return;
    }

    await this.activateBrowserSource(generation);
  }

  async reselect(position: LiveEvaluationPosition): Promise<void> {
    this.assertNotDisposed();
    this.desiredActive = true;
    this.currentPosition = copyPosition(position);

    const generation = ++this.activationGeneration;
    try {
      await this.stopActiveSource();
    } catch (error) {
      console.debug(
        "[LiveEvaluationController] source stop failed during reselection",
        error,
      );
    }
    if (!this.isCurrent(generation)) return;

    let capabilities: EngineCapabilities;
    try {
      capabilities = await this.fetchCapabilities();
    } catch (error) {
      if (!this.isCurrent(generation)) return;
      this.emit({ type: "error", error });
      return;
    }

    if (!this.isCurrent(generation)) return;

    if (capabilities.evaluation.available) {
      await this.activateSource(
        this.backendSource,
        this.currentPosition,
        generation,
      );
      return;
    }

    await this.activateBrowserSource(generation);
  }

  async updatePosition(position: LiveEvaluationPosition): Promise<void> {
    this.assertNotDisposed();
    this.currentPosition = copyPosition(position);
    if (!this.desiredActive || this.activeSource === null) return;
    await this.activeSource.updatePosition(this.currentPosition);
  }

  refresh(): void {
    this.assertNotDisposed();
    if (!this.desiredActive || this.activeSource === null) return;
    void this.activeSource.refresh();
  }

  suspend(): void {
    if (this.disposed) return;
    this.desiredActive = false;
    this.activationGeneration++;
    this.suspendActiveSource();
  }

  async stop(): Promise<void> {
    if (this.disposed) return;
    this.desiredActive = false;
    this.activationGeneration++;
    await this.stopActiveSource();
  }

  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;
    this.desiredActive = false;
    this.activationGeneration++;
    this.detachActiveSource();

    this.backendSource.dispose();
    if (this.browserSource && this.browserSource !== this.backendSource) {
      this.browserSource.dispose();
    }
    this.listeners.clear();
  }

  private async activateBrowserSource(generation: number): Promise<void> {
    let source: LiveEvaluationSource;
    try {
      source = await this.getBrowserSource();
    } catch (error) {
      if (!this.isCurrent(generation)) return;
      this.emit({ type: "error", error });
      return;
    }

    if (!this.isCurrent(generation) || this.currentPosition === null) return;
    await this.activateSource(source, this.currentPosition, generation);
  }

  private async getBrowserSource(): Promise<LiveEvaluationSource> {
    if (this.browserSource !== null) return this.browserSource;
    if (this.browserSourcePromise !== null) return this.browserSourcePromise;

    const creation = Promise.resolve(this.createBrowserSource())
      .then((source) => {
        if (this.disposed) {
          source.dispose();
          throw new Error("LiveEvaluationController is disposed");
        }

        if (this.browserSource === null) {
          this.browserSource = source;
          return source;
        }

        if (this.browserSource !== source) {
          source.dispose();
        }
        return this.browserSource;
      });

    this.browserSourcePromise = creation;
    try {
      return await creation;
    } finally {
      if (this.browserSourcePromise === creation) {
        this.browserSourcePromise = null;
      }
    }
  }

  private async activateSource(
    source: LiveEvaluationSource,
    position: LiveEvaluationPosition,
    generation: number,
  ): Promise<void> {
    if (!this.isCurrent(generation)) return;

    this.attachActiveSource(source);

    try {
      await source.start(position);
    } catch (error) {
      if (!this.isCurrent(generation) || this.activeSource !== source) return;

      this.detachActiveSource();
      source.suspend();

      if (this.shouldFallbackToBrowser(source, error)) {
        await this.fallbackFromBackend(generation);
        return;
      }

      this.emit({ type: "error", error });
    }
  }

  private attachActiveSource(source: LiveEvaluationSource): void {
    this.detachActiveSource();
    this.activeSource = source;
    this.activeSourceUnsubscribe = source.subscribe((event) => {
      this.handleSourceEvent(source, event);
    });
  }

  private handleSourceEvent(
    source: LiveEvaluationSource,
    event: LiveEvaluationEvent,
  ): void {
    if (source !== this.activeSource || !this.desiredActive) return;

    if (
      event.type === "error"
      && event.error !== null
      && this.shouldFallbackToBrowser(source, event.error)
    ) {
      const generation = ++this.activationGeneration;
      this.detachActiveSource();
      source.suspend();
      void this.fallbackFromBackend(generation, source);
      return;
    }

    this.emit(event);
  }

  private shouldFallbackToBrowser(
    source: LiveEvaluationSource,
    error: unknown,
  ): boolean {
    return source === this.backendSource
      && error instanceof EngineUnavailableApiError
      && error.role === "EVALUATION";
  }

  private async fallbackFromBackend(
    generation: number,
    source: LiveEvaluationSource = this.backendSource,
  ): Promise<void> {
    try {
      await source.stop();
    } catch (error) {
      console.debug(
        "[LiveEvaluationController] backend stop failed during browser fallback",
        error,
      );
    }

    if (!this.isCurrent(generation)) return;
    await this.activateBrowserSource(generation);
  }

  private suspendActiveSource(): void {
    const source = this.activeSource;
    this.detachActiveSource();
    source?.suspend();
  }

  private async stopActiveSource(): Promise<void> {
    const source = this.activeSource;
    this.detachActiveSource();
    if (source) {
      await source.stop();
    }
  }

  private detachActiveSource(): void {
    this.activeSourceUnsubscribe?.();
    this.activeSourceUnsubscribe = null;
    this.activeSource = null;
  }

  private isCurrent(generation: number): boolean {
    return !this.disposed
      && this.desiredActive
      && generation === this.activationGeneration;
  }

  private emit(event: LiveEvaluationEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new Error("LiveEvaluationController is disposed");
    }
  }
}

function copyPosition(position: LiveEvaluationPosition): LiveEvaluationPosition {
  return { uciMoves: [...position.uciMoves] };
}
