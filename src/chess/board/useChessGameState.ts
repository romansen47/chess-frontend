import { useRef, useState } from "react";
import type { ClockState, GameSettings, GameSound } from "../types";
import { createDefaultGameSettings } from "../game/gameDefaults";

export function useChessGameState() {
  const [clock, setClock] = useState<ClockState | null>(null);
  const [clockError, setClockError] = useState<string | null>(null);
  const [showGameEndDialog, setShowGameEndDialog] = useState(false);
  const [gameEndState, setGameEndStateState] = useState<string | null>(null);
  const gameEndStateRef = useRef<string | null>(null);
  const [showGameSettingsDialog, setShowGameSettingsDialog] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>(() => createDefaultGameSettings());
  const [isStartingNewGame, setIsStartingNewGame] = useState(false);
  const [gameSettingsError, setGameSettingsError] = useState<string | null>(null);
  const uciFileInputRef = useRef<HTMLInputElement | null>(null);
  const soundCacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  function setGameEndState(value: string | null) {
    gameEndStateRef.current = value;
    setGameEndStateState(value);
  }

  async function playGameSound(_sound: GameSound, sources: readonly string[]) {
    for (const source of sources) {
      let audio = soundCacheRef.current.get(source);
      if (!audio) {
        audio = new Audio(source);
        audio.preload = "auto";
        soundCacheRef.current.set(source, audio);
      }
      try {
        audio.pause();
        audio.currentTime = 0;
        await audio.play();
        return;
      } catch (error) {
        console.warn(`[playGameSound] could not play ${source}`, error);
      }
    }
  }

  return {
    clock, setClock, clockError, setClockError,
    showGameEndDialog, setShowGameEndDialog,
    gameEndState, setGameEndState, gameEndStateRef,
    showGameSettingsDialog, setShowGameSettingsDialog,
    gameSettings, setGameSettings,
    isStartingNewGame, setIsStartingNewGame,
    gameSettingsError, setGameSettingsError,
    uciFileInputRef, playGameSound,
  };
}

export type ChessGameState = ReturnType<typeof useChessGameState>;
