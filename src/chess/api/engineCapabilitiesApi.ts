import type { EngineCapabilities } from "./engineContracts";

export async function fetchEngineCapabilities(): Promise<EngineCapabilities> {
  const response = await fetch("/api/engines/capabilities");
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  return (await response.json()) as EngineCapabilities;
}
