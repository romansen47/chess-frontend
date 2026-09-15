import type { GameSound } from "../types";

export const GAME_SOUND_SOURCES: Record<GameSound, string[]> = {
  move: ["/sounds/move.mp3"],
  capture: ["/sounds/capture.mp3"],
  notify: ["/sounds/game-end.mp3"],
};
