export type NativeEngineRole =
  | "WHITE_PLAYER"
  | "BLACK_PLAYER"
  | "EVALUATION"
  | "DEEP_ANALYSIS";

export type NativeEngineAvailabilityReason =
  | "AVAILABLE"
  | "NOT_CONFIGURED"
  | "EXECUTABLE_NOT_FOUND"
  | "NOT_EXECUTABLE"
  | "UCI_UNRESPONSIVE"
  | "CHESS960_UNSUPPORTED";

export interface EngineCapability {
  configured: boolean;
  available: boolean;
  reason: NativeEngineAvailabilityReason;
}

export interface EngineCapabilities {
  whitePlayer: EngineCapability;
  blackPlayer: EngineCapability;
  evaluation: EngineCapability;
  deepAnalysis: EngineCapability;
}

export interface EngineUnavailableErrorPayload {
  code: "ENGINE_UNAVAILABLE";
  role: NativeEngineRole;
  message: string;
}
