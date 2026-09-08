export type UciOptionType = "spin" | "check" | "combo" | "button" | "string";

export interface UciOptionConfig {
  type: UciOptionType;
  defaultValue: string | null;
  value: string | null;
  min: number | null;
  max: number | null;
  vars: string[];
}

export interface EngineDefinition {
  id: string | null;
  name: string;
  engine: string;
  engineName: string;
  engineAuthor: string;
  options: Record<string, UciOptionConfig>;
}

export interface EngineProfile {
  id: string | null;
  name: string;
  engineId: string;
  optionValues: Record<string, string>;
}

export interface EngineProfileAssignments {
  whitePlayerProfileId: string;
  blackPlayerProfileId: string;
  evaluationProfileId: string;
  deepAnalysisProfileId: string;
}

export interface EngineConfigOverview {
  engines: EngineDefinition[];
  profiles: EngineProfile[];
  defaults: EngineProfileAssignments;
  fallbackProfileId: string;
  version: number;
}

export type EngineRuntimeTarget = "white" | "black" | "evaluation";

export interface EngineRuntimeAssignments {
  whitePlayerProfileId: string | null;
  blackPlayerProfileId: string | null;
  evaluationProfileId: string | null;
}

export async function fetchEngineConfigOverview(): Promise<EngineConfigOverview> {
  const response = await fetch("/api/engine-configs");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as EngineConfigOverview;
}

export async function fetchEngineRuntimeAssignments(): Promise<EngineRuntimeAssignments> {
  const response = await fetch("/api/engine-configs/runtime");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as EngineRuntimeAssignments;
}

export async function updateEngineRuntimeProfile(
  target: EngineRuntimeTarget,
  profileId: string | null,
): Promise<EngineRuntimeAssignments> {
  const response = await fetch(`/api/engine-configs/runtime/${encodeURIComponent(target)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileId }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `HTTP ${response.status}`);
  }
  return (await response.json()) as EngineRuntimeAssignments;
}
