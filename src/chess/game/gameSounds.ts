import type { GameSound } from "../types";

export const GAME_SOUND_SOURCES: Record<GameSound, string[]> = {
  move: [
    "/sounds/move.mp3",
    "/sounds/move.wav",
    "/sounds/move.ogg",
    "/sounds/move-self.mp3",
    "/sounds/move-self.wav",
    "/sounds/move-self.ogg",
  ],
  capture: [
    "/sounds/capture.mp3",
    "/sounds/capture.wav",
    "/sounds/capture.ogg",
  ],
  notify: [
    "/sounds/notify.mp3",
    "/sounds/notify.wav",
    "/sounds/notify.ogg",
    "/sounds/game-end.mp3",
    "/sounds/game-end.wav",
    "/sounds/game-end.ogg",
  ],
};
