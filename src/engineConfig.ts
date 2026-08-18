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
  type: EngineConfigType;
  engineId: string;
  depth: number;
  moveTimeSeconds: number;
  optionValues: Record<string, string>;
}

export interface EngineConfigOverview {
  engines: EngineDefinition[];
  profiles: EngineProfile[];
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
