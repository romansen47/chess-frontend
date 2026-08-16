export type UciOptionType = "spin" | "check" | "combo" | "button" | "string";
export type EngineConfigType = "PLAYER" | "EVALUATION" | "DEEP_ANALYSIS";

export interface UciOptionConfig {
  type: UciOptionType;
  defaultValue: string | null;
  value: string | null;
  min: number | null;
  max: number | null;
  vars: string[];
}

export interface ManagedEngineConfig {
  id: string | null;
  name: string;
  type: EngineConfigType;
  engine: string;
  engineName: string;
  engineAuthor: string;
  depth: number;
  moveTimeSeconds: number;
  options: Record<string, UciOptionConfig>;
}

export interface EngineConfigOverview {
  configs: ManagedEngineConfig[];
  evaluationConfigId: string;
  defaultPlayerConfigId: string;
  defaultDeepAnalysisConfigId: string;
  version: number;
}

export async function fetchEngineConfigOverview(): Promise<EngineConfigOverview> {
  const response = await fetch("/api/engine-configs");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as EngineConfigOverview;
}
