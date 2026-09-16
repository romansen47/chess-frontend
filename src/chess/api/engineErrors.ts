import type {
  EngineUnavailableErrorPayload,
  NativeEngineRole,
} from "./engineContracts";

const NATIVE_ENGINE_ROLES = new Set<NativeEngineRole>([
  "WHITE_PLAYER",
  "BLACK_PLAYER",
  "EVALUATION",
  "DEEP_ANALYSIS",
]);

function isNativeEngineRole(value: unknown): value is NativeEngineRole {
  return typeof value === "string"
    && NATIVE_ENGINE_ROLES.has(value as NativeEngineRole);
}

function isEngineUnavailablePayload(
  value: unknown,
): value is EngineUnavailableErrorPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.code === "ENGINE_UNAVAILABLE"
    && isNativeEngineRole(candidate.role)
    && typeof candidate.message === "string";
}

export class EngineUnavailableApiError extends Error {
  readonly code = "ENGINE_UNAVAILABLE";
  readonly status = 503;
  readonly role: NativeEngineRole;

  constructor(
    role: NativeEngineRole,
    message: string,
  ) {
    super(message);
    this.name = "EngineUnavailableApiError";
    this.role = role;
  }
}

export async function throwEngineAwareApiError(
  response: Response,
): Promise<never> {
  const body = await response.text();
  let parsed: unknown = null;

  if (body.trim()) {
    try {
      parsed = JSON.parse(body) as unknown;
    } catch {
      parsed = null;
    }
  }

  if (response.status === 503 && isEngineUnavailablePayload(parsed)) {
    throw new EngineUnavailableApiError(parsed.role, parsed.message);
  }

  const parsedMessage = typeof parsed === "object"
    && parsed !== null
    && typeof (parsed as Record<string, unknown>).message === "string"
      ? (parsed as Record<string, string>).message
      : null;

  throw new Error(parsedMessage || body.trim() || `HTTP ${response.status}`);
}
