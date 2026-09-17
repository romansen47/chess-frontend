import { useEffect } from "react";
import { fetchEngineConfigOverview, type EngineConfigOverview } from "../../engineConfig";
import { useI18n } from "../../i18n/I18nProvider";
import { fetchGameSnapshot } from "../api/gameApi";
import { createLiveEvaluationPosition } from "../evaluation/liveEvaluationPosition";
import type { AnalysisReplaySettings } from "../types";
import type { ChessBoardState } from "./useChessBoardState";
import type { ChessEngineState } from "./useChessEngineState";
import type { ChessGameState } from "./useChessGameState";
import type { Dispatch, SetStateAction } from "react";

interface Options {
  board: ChessBoardState;
  engine: ChessEngineState;
  game: ChessGameState;
  analysisReplayActive: boolean;
  analysisReplayActiveRef: { current: boolean };
  setAnalysisSettings: Dispatch<SetStateAction<AnalysisReplaySettings>>;
}

export function useChessLiveEvaluation(options: Options) {
  const { board, engine, game } = options;
  const { t } = useI18n();

  async function ensureLiveEvaluationPosition() {
    if (board.liveEvaluationPositionRef.current) return board.liveEvaluationPositionRef.current;
    try {
      const snapshot = await fetchGameSnapshot();
      const position = createLiveEvaluationPosition(snapshot.game.moves ?? []);
      board.liveEvaluationPositionRef.current = position;
      return snapshot.importedAnalysisGame ? null : position;
    } catch (error) {
      console.warn("[ensureLiveEvaluationPosition] could not load authoritative position", error);
      engine.setEvalError(t("evaluation.failed"));
      return null;
    }
  }

  async function stopLiveEvaluation() {
    try {
      await engine.liveEvaluationControllerRef.current?.stop();
    } catch (error) {
      console.warn("[stopLiveEvaluation] evaluation stop failed", error);
    }
  }

  function toggleEngineAutoUpdate() {
    const nextValue = !engine.engineAutoUpdateRef.current;
    engine.setEngineAutoUpdate(nextValue);
    engine.setLiveEvaluationBar(null);
    if (!nextValue) {
      engine.setEngineEval(null);
      engine.setEvalError(null);
      engine.setIsLoadingEval(false);
      void stopLiveEvaluation();
    }
  }

  async function loadEngineConfigs() {
    try {
      const data = await fetchEngineConfigOverview();
      engine.setEngineConfigOverview(data);
      engine.setEngineConfigLoadError(null);
      return data;
    } catch (error) {
      console.error("[loadEngineConfigs] error", error);
      engine.setEngineConfigLoadError(t("settings.loadFailed"));
      return null;
    }
  }

  function handleEngineConfigOverviewChange(data: EngineConfigOverview) {
    engine.setEngineConfigOverview(data);
    engine.setEngineConfigLoadError(null);
    options.setAnalysisSettings((previous) => {
      if (data.profiles.some((profile) => profile.id === previous.engineProfileId)) return previous;
      const preferred = data.profiles.find((profile) => profile.id === data.defaults.deepAnalysisProfileId);
      return { ...previous, engineProfileId: preferred?.id ?? data.profiles[0]?.id ?? null };
    });
    engine.setEngineEval(null);
    engine.setLiveEvaluationBar(null);
    if (engine.engineAutoUpdateRef.current) {
      void ensureLiveEvaluationPosition().then((position) => {
        if (position && engine.engineAutoUpdateRef.current) {
          void engine.liveEvaluationControllerRef.current?.reselect(position);
        }
      });
    }
  }

  useEffect(() => {
    const controller = engine.liveEvaluationControllerRef.current;
    if (!controller) return;
    return controller.subscribe((event) => {
      switch (event.type) {
        case "evaluation": engine.setEngineEval(event.evaluation); break;
        case "bar": engine.setLiveEvaluationBar(event.bar); break;
        case "loading": engine.setIsLoadingEval(event.loading); break;
        case "error":
          if (event.error === null) engine.setEvalError(null);
          else {
            console.error("[loadEvaluation] error", event.error);
            engine.setEvalError(t("evaluation.failed"));
          }
          break;
      }
    });
  }, [t]);

  useEffect(() => {
    const controller = engine.liveEvaluationControllerRef.current;
    if (!controller) return;
    if (engine.engineAutoUpdate && !options.analysisReplayActive && !board.uciAnalysisLoaded && !game.clock?.gameState) {
      void ensureLiveEvaluationPosition().then((position) => {
        if (!position || !engine.engineAutoUpdateRef.current || options.analysisReplayActiveRef.current
          || board.uciAnalysisLoadedRef.current || game.gameEndStateRef.current) return;
        void controller.start(position);
      });
    } else {
      controller.suspend();
      engine.setLiveEvaluationBar(null);
    }
    return () => controller.suspend();
  }, [engine.engineAutoUpdate, options.analysisReplayActive, board.uciAnalysisLoaded, game.clock?.gameState]);

  useEffect(() => {
    const controller = engine.liveEvaluationControllerRef.current;
    return () => { controller?.dispose(); };
  }, []);

  return {
    ensureLiveEvaluationPosition,
    stopLiveEvaluation,
    toggleEngineAutoUpdate,
    loadEngineConfigs,
    handleEngineConfigOverviewChange,
  };
}

export type ChessLiveEvaluation = ReturnType<typeof useChessLiveEvaluation>;
