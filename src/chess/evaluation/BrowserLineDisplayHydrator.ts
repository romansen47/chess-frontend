import type { BrowserLineDisplayHydration } from "../api/browserLineDisplayApi";
import type { EngineLine } from "../types";
import type { LiveEvaluationPosition } from "./LiveEvaluationSource";

interface PendingHydration {
  position: LiveEvaluationPosition;
  lines: EngineLine[];
  onSuccess: (lines: EngineLine[]) => void;
  onError?: (error: unknown) => void;
  version: number;
}

/** Rate-limits display-only backend work and discards obsolete responses. */
export class BrowserLineDisplayHydrator {
  private readonly hydrate: BrowserLineDisplayHydration;
  private readonly intervalMs: number;
  private readonly now: () => number;
  private pending: PendingHydration | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private lastStartedAt = Number.NEGATIVE_INFINITY;
  private version = 0;
  private disposed = false;

  constructor(
    hydrate: BrowserLineDisplayHydration,
    intervalMs = 500,
    now: () => number = () => Date.now(),
  ) {
    if (intervalMs < 0) throw new Error("Hydration interval must not be negative");
    this.hydrate = hydrate;
    this.intervalMs = intervalMs;
    this.now = now;
  }

  submit(
    position: LiveEvaluationPosition,
    lines: readonly EngineLine[],
    onSuccess: (lines: EngineLine[]) => void,
    onError?: (error: unknown) => void,
  ): void {
    if (this.disposed) return;
    this.pending = {
      position: copyPosition(position),
      lines: lines.map(copyLine),
      onSuccess,
      onError,
      version: this.version,
    };
    this.drain();
  }

  cancel(): void {
    this.version++;
    this.pending = null;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancel();
  }

  private drain(): void {
    if (this.disposed || this.inFlight || !this.pending || this.timer !== null) return;
    const delay = Math.max(0, this.lastStartedAt + this.intervalMs - this.now());
    if (delay > 0) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.drain();
      }, delay);
      return;
    }

    const request = this.pending;
    this.pending = null;
    this.inFlight = true;
    this.lastStartedAt = this.now();
    void this.hydrate(request.position, request.lines)
      .then((lines) => {
        if (this.isCurrent(request)) request.onSuccess(lines.map(copyLine));
      })
      .catch((error: unknown) => {
        if (this.isCurrent(request)) request.onError?.(error);
      })
      .finally(() => {
        this.inFlight = false;
        this.drain();
      });
  }

  private isCurrent(request: PendingHydration): boolean {
    return !this.disposed && request.version === this.version;
  }
}

function copyPosition(position: LiveEvaluationPosition): LiveEvaluationPosition {
  return { ...position, uciMoves: [...position.uciMoves] };
}

function copyLine(line: EngineLine): EngineLine {
  return {
    ...line,
    positions: line.positions ? [...line.positions] : undefined,
    moveArrows: line.moveArrows?.map((arrow) => ({ ...arrow })),
  };
}
