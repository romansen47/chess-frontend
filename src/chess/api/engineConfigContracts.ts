import type { EngineRuntimeAssignments } from "../../engineConfigTypes";

function nullableString(
  source: Record<string, unknown>,
  field: keyof EngineRuntimeAssignments,
): string | null {
  const value = source[field];
  if (value === null || typeof value === "string") return value;
  throw new Error(`Invalid engine runtime assignment field: ${field}`);
}

/** Validates the small runtime-assignment contract at the HTTP boundary. */
export function parseEngineRuntimeAssignments(
  value: unknown,
): EngineRuntimeAssignments {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid engine runtime assignments response");
  }
  const source = value as Record<string, unknown>;
  return {
    whitePlayerProfileId: nullableString(source, "whitePlayerProfileId"),
    blackPlayerProfileId: nullableString(source, "blackPlayerProfileId"),
    evaluationProfileId: nullableString(source, "evaluationProfileId"),
  };
}
