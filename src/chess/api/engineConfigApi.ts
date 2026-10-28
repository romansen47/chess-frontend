import type {
  EngineConfigOverview,
  EngineDefinition,
  EngineProfile,
  EngineProfileAssignments,
  EngineRuntimeAssignments,
  EngineRuntimeTarget,
} from "../../engineConfigTypes";
import { jsonRequest, requestJson, requestVoid } from "./httpClient";

export function fetchEngineConfigOverview(): Promise<EngineConfigOverview> {
  return requestJson<EngineConfigOverview>("/api/engine-configs");
}

export function fetchEngineRuntimeAssignments(): Promise<EngineRuntimeAssignments> {
  return requestJson<EngineRuntimeAssignments>("/api/engine-configs/runtime");
}

export function updateEngineRuntimeProfile(
  target: EngineRuntimeTarget,
  profileId: string | null,
): Promise<EngineRuntimeAssignments> {
  return requestJson<EngineRuntimeAssignments>(
    `/api/engine-configs/runtime/${encodeURIComponent(target)}`,
    jsonRequest("PUT", { profileId }),
  );
}

export function discoverEngineDefinitions(): Promise<EngineDefinition[]> {
  return requestJson<EngineDefinition[]>(
    "/api/engine-configs/engines/discover",
    { method: "POST" },
  );
}

export function inspectEngineDefinition(
  engine: string,
  name: string | null,
): Promise<EngineDefinition> {
  return requestJson<EngineDefinition>(
    "/api/engine-configs/engines/inspect",
    jsonRequest("POST", { engine, name }),
  );
}

export function createEngineDefinition(
  definition: EngineDefinition,
): Promise<EngineDefinition> {
  return requestJson<EngineDefinition>(
    "/api/engine-configs/engines",
    jsonRequest("POST", definition),
  );
}

export function deleteEngineDefinition(engineId: string): Promise<void> {
  return requestVoid(
    `/api/engine-configs/engines/${encodeURIComponent(engineId)}`,
    { method: "DELETE" },
  );
}

export function createEngineProfile(
  profile: EngineProfile,
): Promise<EngineProfile> {
  return requestJson<EngineProfile>(
    "/api/engine-configs/profiles",
    jsonRequest("POST", profile),
  );
}

export function updateEngineProfile(
  profileId: string,
  profile: EngineProfile,
): Promise<EngineProfile> {
  return requestJson<EngineProfile>(
    `/api/engine-configs/profiles/${encodeURIComponent(profileId)}`,
    jsonRequest("PUT", profile),
  );
}

export function deleteEngineProfile(profileId: string): Promise<void> {
  return requestVoid(
    `/api/engine-configs/profiles/${encodeURIComponent(profileId)}`,
    { method: "DELETE" },
  );
}

export function updateEngineDefaults(
  assignments: EngineProfileAssignments,
): Promise<EngineConfigOverview> {
  return requestJson<EngineConfigOverview>(
    "/api/engine-configs/defaults",
    jsonRequest("PUT", assignments),
  );
}

export function resetEngineConfig(): Promise<EngineConfigOverview> {
  return requestJson<EngineConfigOverview>(
    "/api/engine-configs/reset",
    { method: "POST" },
  );
}
