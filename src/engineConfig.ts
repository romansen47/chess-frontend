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

export async function fetchEngineConfigOverview(): Promise<EngineConfigOverview> {
  const response = await fetch("/api/engine-configs");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as EngineConfigOverview;
}
