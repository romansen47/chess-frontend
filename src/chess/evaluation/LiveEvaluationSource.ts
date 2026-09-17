import type { EngineEvaluation } from "../types";

export interface LiveEvaluationPosition {
  readonly uciMoves: readonly string[];
  /** Initial FEN for Chess960. Omitted for classical position 518. */
  readonly initialFen?: string | null;
  readonly chess960?: boolean;
}

export type LiveEvaluationEvent =
  | { type: "evaluation"; evaluation: EngineEvaluation }
  | { type: "bar"; bar: number }
  | { type: "loading"; loading: boolean }
  | { type: "error"; error: unknown | null };

export type LiveEvaluationListener = (event: LiveEvaluationEvent) => void;

export interface LiveEvaluationSource {
  subscribe(listener: LiveEvaluationListener): () => void;
  start(position: LiveEvaluationPosition): void | Promise<void>;
  updatePosition(position: LiveEvaluationPosition): void | Promise<void>;
  refresh(): void | Promise<void>;
  suspend(): void;
  stop(): Promise<void>;
  dispose(): void;
}
