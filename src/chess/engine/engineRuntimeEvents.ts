import type { EngineRuntimeAssignments } from "../../engineConfig";

export const ENGINE_RUNTIME_ASSIGNMENTS_CHANGED_EVENT =
  "chess-engine-runtime-assignments-changed";

export function notifyEngineRuntimeAssignmentsChanged(
  assignments: EngineRuntimeAssignments,
): void {
  window.dispatchEvent(
    new CustomEvent<EngineRuntimeAssignments>(
      ENGINE_RUNTIME_ASSIGNMENTS_CHANGED_EVENT,
      { detail: assignments },
    ),
  );
}
