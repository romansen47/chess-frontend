import { useEffect, useRef, useState } from "react";
import type { EngineConfigOverview } from "../../engineConfig";
import type { EngineEvaluation } from "../types";
import { fetchProgramFeatures } from "../api/programApi";
import { BackendLiveEvaluationSource } from "../evaluation/BackendLiveEvaluationSource";
import { LiveEvaluationController } from "../evaluation/LiveEvaluationController";

export function useChessEngineState() {
  const [engineEval, setEngineEval] = useState<EngineEvaluation | null>(null);
  const [liveEvaluationBar, setLiveEvaluationBar] = useState<number | null>(null);
  const [isLoadingEval, setIsLoadingEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [engineAutoUpdate, setEngineAutoUpdateState] = useState(false);
  const engineAutoUpdateRef = useRef(false);
  const liveEvaluationControllerRef = useRef<LiveEvaluationController | null>(null);
  if (liveEvaluationControllerRef.current === null) {
    liveEvaluationControllerRef.current = new LiveEvaluationController({
      backendSource: new BackendLiveEvaluationSource(),
      createBrowserSource: async () => {
        const { BrowserLiveEvaluationSource } = await import("../evaluation/BrowserLiveEvaluationSource");
        return new BrowserLiveEvaluationSource();
      },
    });
  }
  const [showEngineConfig, setShowEngineConfig] = useState(false);
  const [engineConfigOverview, setEngineConfigOverview] = useState<EngineConfigOverview | null>(null);
  const [engineConfigLoadError, setEngineConfigLoadError] = useState<string | null>(null);
  const [showEngineManager, setShowEngineManager] = useState(false);
  const [showChessDatabaseDialog, setShowChessDatabaseDialog] = useState(false);
  const [isTerminatingProgram, setIsTerminatingProgram] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  function setEngineAutoUpdate(value: boolean | ((previous: boolean) => boolean)) {
    const nextValue = typeof value === "function" ? value(engineAutoUpdateRef.current) : value;
    engineAutoUpdateRef.current = nextValue;
    setEngineAutoUpdateState(nextValue);
  }

  useEffect(() => {
    let cancelled = false;
    void fetchProgramFeatures()
      .then((features) => { if (!cancelled) setDebugMode(features.debugMode); })
      .catch(() => { if (!cancelled) setDebugMode(false); });
    return () => { cancelled = true; };
  }, []);

  return {
    engineEval, setEngineEval, liveEvaluationBar, setLiveEvaluationBar,
    isLoadingEval, setIsLoadingEval, evalError, setEvalError,
    engineAutoUpdate, setEngineAutoUpdate, engineAutoUpdateRef, liveEvaluationControllerRef,
    showEngineConfig, setShowEngineConfig, engineConfigOverview, setEngineConfigOverview,
    engineConfigLoadError, setEngineConfigLoadError,
    showEngineManager, setShowEngineManager, showChessDatabaseDialog, setShowChessDatabaseDialog,
    isTerminatingProgram, setIsTerminatingProgram, debugMode,
  };
}

export type ChessEngineState = ReturnType<typeof useChessEngineState>;
