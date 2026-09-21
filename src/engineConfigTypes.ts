export type UciOptionType = "spin" | "check" | "combo" | "button" | "string";

export const UCI_CHESS960_OPTION_NAME = "UCI_Chess960";

export function isSystemManagedUciOption(name: string): boolean {
  return name.trim().toLowerCase() === UCI_CHESS960_OPTION_NAME.toLowerCase();
}

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
  whitePlayerProfileId: string | null;
  blackPlayerProfileId: string | null;
  evaluationProfileId: string | null;
  deepAnalysisProfileId: string | null;
}

export interface EngineConfigOverview {
  engines: EngineDefinition[];
  profiles: EngineProfile[];
  defaults: EngineProfileAssignments;
  fallbackProfileId: string | null;
  version: number;
}

export type EngineRuntimeTarget = "white" | "black" | "evaluation";

export interface EngineRuntimeAssignments {
  whitePlayerProfileId: string | null;
  blackPlayerProfileId: string | null;
  evaluationProfileId: string | null;
}
