import { useEffect, useRef, useState } from "react";
import type {
  EngineConfigOverview,
  EngineRuntimeAssignments,
} from "../../engineConfigTypes";
import type { EngineEvaluation } from "../types";
import {
  recordEvaluationHistoryPoint,
  type EvaluationHistoryPoint,
} from "../evaluation/evaluationHistory";
import { fetchProgramFeatures } from "../api/programApi";
import { BackendLiveEvaluationSource } from "../evaluation/BackendLiveEvaluationSource";
import { LiveEvaluationController } from "../evaluation/LiveEvaluationController";
import { ENGINE_RUNTIME_ASSIGNMENTS_CHANGED_EVENT } from "../engine/engineRuntimeEvents";
import type { LiveEvaluationSourcePreference } from "../evaluation/liveEvaluationEngine";

export function useChessEngineState(
  liveEvaluationSource: LiveEvaluationSourcePreference,
) {
  const [engineEval, setEngineEval] = useState<EngineEvaluation | null>(null);
  const [engineEvaluationPly, setEngineEvaluationPly] = useState<number | null>(null);
  const [engineEvaluationHistory, setEngineEvaluationHistory] =
    useState<EvaluationHistoryPoint[]>([]);
  const [liveEvaluationBar, setLiveEvaluationBar] = useState<number | null>(null);
  const [isLoadingEval, setIsLoadingEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [engineAutoUpdate, setEngineAutoUpdateState] = useState(false);
  const engineAutoUpdateRef = useRef(false);
  const liveEvaluationSourceRef = useRef(liveEvaluationSource);
  const liveEvaluationControllerRef = useRef<LiveEvaluationController | null>(null);
  if (liveEvaluationControllerRef.current === null) {
    liveEvaluationControllerRef.current = new LiveEvaluationController({
      backendSource: new BackendLiveEvaluationSource(),
      createBrowserSource: async () => {
        const { BrowserLiveEvaluationSource } = await import("../evaluation/BrowserLiveEvaluationSource");
        return new BrowserLiveEvaluationSource();
      },
      sourcePreference: liveEvaluationSource,
    });
  }
  const [showSettings, setShowSettings] = useState(false);
  const [engineConfigOverview, setEngineConfigOverview] = useState<EngineConfigOverview | null>(null);
  const [engineRuntimeAssignments, setEngineRuntimeAssignments] = useState<EngineRuntimeAssignments | null>(null);
  const [engineConfigLoadError, setEngineConfigLoadError] = useState<string | null>(null);
  const [showChessDatabaseDialog, setShowChessDatabaseDialog] = useState(false);
  const [isTerminatingProgram, setIsTerminatingProgram] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  function recordEngineEvaluation(ply: number, evaluation: EngineEvaluation) {
    setEngineEvaluationPly(ply);
    setEngineEval(evaluation);
    setEngineEvaluationHistory((current) =>
      recordEvaluationHistoryPoint(current, ply, evaluation)
    );
  }

  function resetEngineEvaluationHistory() {
    setEngineEvaluationHistory([]);
    setEngineEvaluationPly(null);
  }

  function setEngineAutoUpdate(value: boolean | ((previous: boolean) => boolean)) {
    const nextValue = typeof value === "function" ? value(engineAutoUpdateRef.current) : value;
    engineAutoUpdateRef.current = nextValue;
    setEngineAutoUpdateState(nextValue);
  }

  useEffect(() => {
    if (liveEvaluationSourceRef.current === liveEvaluationSource) return;
    liveEvaluationSourceRef.current = liveEvaluationSource;
    setEngineEval(null);
    setLiveEvaluationBar(null);
    setEvalError(null);
    setEngineEvaluationHistory([]);
    setEngineEvaluationPly(null);
    void liveEvaluationControllerRef.current
      ?.setSourcePreference(liveEvaluationSource)
      .catch((error) => {
        console.warn("[useChessEngineState] evaluation source switch failed", error);
      });
  }, [liveEvaluationSource]);

  useEffect(() => {
    let cancelled = false;
    void fetchProgramFeatures()
      .then((features) => { if (!cancelled) setDebugMode(features.debugMode); })
      .catch(() => { if (!cancelled) setDebugMode(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleRuntimeAssignmentsChanged = (event: Event) => {
      const assignments = (event as CustomEvent<EngineRuntimeAssignments>).detail;
      if (assignments) setEngineRuntimeAssignments(assignments);
    };
    window.addEventListener(
      ENGINE_RUNTIME_ASSIGNMENTS_CHANGED_EVENT,
      handleRuntimeAssignmentsChanged,
    );
    return () => {
      window.removeEventListener(
        ENGINE_RUNTIME_ASSIGNMENTS_CHANGED_EVENT,
        handleRuntimeAssignmentsChanged,
      );
    };
  }, []);

  return {
    engineEval, setEngineEval, engineEvaluationPly, setEngineEvaluationPly,
    engineEvaluationHistory, recordEngineEvaluation, resetEngineEvaluationHistory,
    liveEvaluationBar, setLiveEvaluationBar,
    isLoadingEval, setIsLoadingEval, evalError, setEvalError,
    engineAutoUpdate, setEngineAutoUpdate, engineAutoUpdateRef, liveEvaluationControllerRef,
    showSettings, setShowSettings, engineConfigOverview, setEngineConfigOverview,
    engineRuntimeAssignments, setEngineRuntimeAssignments,
    engineConfigLoadError, setEngineConfigLoadError,
    showChessDatabaseDialog, setShowChessDatabaseDialog,
    isTerminatingProgram, setIsTerminatingProgram, debugMode,
  };
}

export type ChessEngineState = ReturnType<typeof useChessEngineState>;
