import type { EngineCapabilities } from "./engineContracts";
import { requestJson } from "./httpClient";

export function fetchEngineCapabilities(): Promise<EngineCapabilities> {
  return requestJson<EngineCapabilities>("/api/engines/capabilities");
}
