import { useState, useRef } from "react";
import type {
  AnalysisPositionSelection,
  AnalysisProfilePoint,
  AnalysisReplaySettings,
  AnalysisReplayStep,
  EngineEvaluation,
  GameAnnotation,
} from "../types";
import type { AnalysisEngineView } from "./AnalysisEngineTabs";
import type { AnalysisDetailsTab } from "./analysisReplayViewTypes";
import { createDefaultAnalysisReplaySettings } from "./analysisUtils";

export const EMPTY_ANALYSIS_PROFILE: AnalysisProfilePoint[] = [
  { ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 },
];

export function useAnalysisState() {
  const [showAnalysisSettingsDialog, setShowAnalysisSettingsDialog] = useState(false);
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisReplaySettings>(
    () => createDefaultAnalysisReplaySettings(),
  );
  const [analysisReplayActive, setAnalysisReplayActiveState] = useState(false);
  const analysisReplayActiveRef = useRef(false);
  const [isAnalysisReplayRunning, setIsAnalysisReplayRunning] = useState(false);
  const [analysisReplayStatus, setAnalysisReplayStatus] = useState<string | null>(null);
  const [analysisReplayError, setAnalysisReplayError] = useState<string | null>(null);
  const [analysisReplayFinished, setAnalysisReplayFinished] = useState(false);
  const [analysisProfile, setAnalysisProfile] = useState<AnalysisProfilePoint[]>(EMPTY_ANALYSIS_PROFILE);
  const [analysisTotalPlies, setAnalysisTotalPlies] = useState(0);
  const [analysisSelectedPosition, setAnalysisSelectedPosition] = useState<AnalysisPositionSelection | null>(null);
  const analysisSelectedPlyRef = useRef<number | null>(null);
  const [analysisDetailsTab, setAnalysisDetailsTab] = useState<AnalysisDetailsTab>("engine");
  const [gameAnnotations, setGameAnnotations] = useState<Record<number, GameAnnotation>>({});
  const [annotationsDirty, setAnnotationsDirty] = useState(false);
  const [annotationsSaving, setAnnotationsSaving] = useState(false);
  const [annotationSaveError, setAnnotationSaveError] = useState<string | null>(null);
  const [analysisEngineView, setAnalysisEngineView] = useState<AnalysisEngineView>("deep");
  const [analysisSelectedLineIndex, setAnalysisSelectedLineIndex] = useState<number | null>(null);
  const [analysisLineAnimationIndex, setAnalysisLineAnimationIndex] = useState(0);
  const [analysisWhitePlayerName, setAnalysisWhitePlayerName] = useState<string | null>(null);
  const [analysisBlackPlayerName, setAnalysisBlackPlayerName] = useState<string | null>(null);
  const analysisReplayCancelledRef = useRef(false);
  const analysisReplayResumeRef = useRef<AnalysisReplayStep | null>(null);
  const [analysisEvaluationEnabled, setAnalysisEvaluationEnabledState] = useState(false);
  const analysisEvaluationEnabledRef = useRef(false);
  const [analysisEvaluation, setAnalysisEvaluation] = useState<EngineEvaluation | null>(null);
  const [analysisEvaluationError, setAnalysisEvaluationError] = useState<string | null>(null);
  const analysisEvaluationPlyRef = useRef<number | null>(null);
  const analysisEvaluationKeyRef = useRef<string | null>(null);
  const [analysisVariationMoves, setAnalysisVariationMovesState] = useState<string[]>([]);
  const analysisVariationMovesRef = useRef<string[]>([]);
  const [analysisVariationGameState, setAnalysisVariationGameState] = useState<string | null>(null);

  function setAnalysisReplayActive(value: boolean) {
    analysisReplayActiveRef.current = value;
    setAnalysisReplayActiveState(value);
  }

  function setAnalysisEvaluationEnabled(value: boolean) {
    analysisEvaluationEnabledRef.current = value;
    setAnalysisEvaluationEnabledState(value);
  }

  function setAnalysisVariationMoves(value: string[]) {
    const next = [...value];
    analysisVariationMovesRef.current = next;
    setAnalysisVariationMovesState(next);
  }

  return {
    showAnalysisSettingsDialog, setShowAnalysisSettingsDialog,
    analysisSettings, setAnalysisSettings,
    analysisReplayActive, setAnalysisReplayActive, analysisReplayActiveRef,
    isAnalysisReplayRunning, setIsAnalysisReplayRunning,
    analysisReplayStatus, setAnalysisReplayStatus,
    analysisReplayError, setAnalysisReplayError,
    analysisReplayFinished, setAnalysisReplayFinished,
    analysisProfile, setAnalysisProfile,
    analysisTotalPlies, setAnalysisTotalPlies,
    analysisSelectedPosition, setAnalysisSelectedPosition, analysisSelectedPlyRef,
    analysisDetailsTab, setAnalysisDetailsTab,
    gameAnnotations, setGameAnnotations,
    annotationsDirty, setAnnotationsDirty,
    annotationsSaving, setAnnotationsSaving,
    annotationSaveError, setAnnotationSaveError,
    analysisEngineView, setAnalysisEngineView,
    analysisSelectedLineIndex, setAnalysisSelectedLineIndex,
    analysisLineAnimationIndex, setAnalysisLineAnimationIndex,
    analysisWhitePlayerName, setAnalysisWhitePlayerName,
    analysisBlackPlayerName, setAnalysisBlackPlayerName,
    analysisReplayCancelledRef, analysisReplayResumeRef,
    analysisEvaluationEnabled, setAnalysisEvaluationEnabled, analysisEvaluationEnabledRef,
    analysisEvaluation, setAnalysisEvaluation,
    analysisEvaluationError, setAnalysisEvaluationError,
    analysisEvaluationPlyRef, analysisEvaluationKeyRef,
    analysisVariationMoves, setAnalysisVariationMoves, analysisVariationMovesRef,
    analysisVariationGameState, setAnalysisVariationGameState,
  };
}

export type AnalysisState = ReturnType<typeof useAnalysisState>;
