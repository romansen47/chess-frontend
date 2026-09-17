import type { GameSettings } from "../types";

export function createDefaultGameSettings(): GameSettings {
  return {
    timeForEachPlayerSeconds: 5 * 60,
    incrementForWhiteSeconds: 0,
    incrementForBlackSeconds: 0,
    additionalTimeAfter40MovesSeconds: 0,
    startingColor: "WHITE",
    startingPositionId: 518,
    version: 0,
  };
}
