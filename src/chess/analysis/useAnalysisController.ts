import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { EngineConfigOverview } from "../../engineConfig";
import { useI18n } from "../../i18n/I18nProvider";
import {
  cancelAnalysisReplayRequest,
  fetchAnalysisEvaluation as fetchAnalysisEvaluationRequest,
  fetchAnalysisVariationEvaluation,
  fetchAnalysisReplayState,
  fetchNextAnalysisReplayStep,
  startAnalysisReplayRequest,
  stopAnalysisEvaluationRequest,
  submitAnalysisVariationMove,
} from "../api/analysisApi";
import {
  mapBackendPiecesToLocalPieces,
  mapPositionStringToLocalPieces,
} from "../board/positionUtils";
import {
  piecesMatchPosition,
  transitionBoardPosition,
} from "../board/pieceTransitions";
import {
  getAnalysisBlackPlayerName,
  getAnalysisWhitePlayerName,
  getDisplayedBlackPlayerName,
  getDisplayedWhitePlayerName,
} from "../game/gameFormatters";
import { saveGameAnnotations } from "../api/gameApi";
import type {
  AnalysisPositionSelection,
  AnalysisProfilePoint,
  AnalysisReplaySettings,
  AnalysisReplayStep,
  AnalysisVariationRequest,
  ClockState,
  EngineEvaluation,
  GameAnnotation,
  GameSound,
  HoverPreview,
  LastMove,
  MoveRow,
  Piece,
  PieceType,
  PromotionContext,
  UciGameResponse,
} from "../types";
import type { AnalysisEngineView } from "./AnalysisEngineTabs";
import type { AnalysisDetailsTab } from "./AnalysisReplayContent";
import { buildSelectedBoardAnnotations } from "./analysisBoardAnnotations";
import {
  analysisEvaluationKey,
  createDefaultAnalysisReplaySettings,
} from "./analysisUtils";
import {
  getAnalysisMoveSelectionForPly,
  getEffectiveAnalysisLineIndex,
} from "./analysisSelectionUtils";
import { gameAnnotationRecord, isEmptyGameAnnotation } from "./annotationUtils";
import { buildDiagnosticAnalysisPgn } from "./analysisPgnExport";
import { buildMoveAnnotations } from "./moveAnnotations";
import { useMoveAnnotationTooltip } from "./useMoveAnnotationTooltip";

interface UseAnalysisControllerOptions {
  engineConfigOverview: EngineConfigOverview | null;
  engineEval: EngineEvaluation | null;
  setEngineEval: Dispatch<SetStateAction<EngineEvaluation | null>>;
  setPieces: Dispatch<SetStateAction<Piece[]>>;
  setLastMove: Dispatch<SetStateAction<LastMove | null>>;
  moves: MoveRow[];
  clock: ClockState | null;
  uciAnalysisLoaded: boolean;
  whiteComputerEnabled: boolean;
  blackComputerEnabled: boolean;
  disablePlayerEngines: () => Promise<void>;
  stopLiveEvaluation: () => Promise<void>;
  setEngineAutoUpdate: (value: boolean | ((previous: boolean) => boolean)) => void;
  setLiveEvaluationBar: Dispatch<SetStateAction<number | null>>;
  setShowGameEndDialog: Dispatch<SetStateAction<boolean>>;
  setShowEngineConfig: Dispatch<SetStateAction<boolean>>;
  showGameSettingsDialog: boolean;
  showEngineConfig: boolean;
  showEngineManager: boolean;
  showChessDatabaseDialog: boolean;
  setSelectedSquare: Dispatch<SetStateAction<string | null>>;
  updatePossibleTargets: (targets: string[]) => void;
  resetBoardInteraction: () => void;
  setHoverPreview: Dispatch<SetStateAction<HoverPreview | null>>;
  setPromotionContext: Dispatch<SetStateAction<PromotionContext | null>>;
  promotionContext: PromotionContext | null;
  setIsLoadingMoves: Dispatch<SetStateAction<boolean>>;
  setLoadError: Dispatch<SetStateAction<string | null>>;
  animateMoveLocally: (
    from: string,
    to: string,
    requestedPromotion?: PieceType | null,
    resultingPosition?: string | null,
  ) => void;
  playGameSound: (sound: GameSound) => Promise<void>;
}

const EMPTY_PROFILE: AnalysisProfilePoint[] = [
  { ply: 0, from: null, to: null, san: "Start", evaluation: 0, bar: 0.5, depth: 0 },
];

export function useAnalysisController({
  engineConfigOverview,
  engineEval,
  setEngineEval,
  setPieces,
  setLastMove,
  moves,
  clock,
  uciAnalysisLoaded,
  whiteComputerEnabled,
  blackComputerEnabled,
  disablePlayerEngines,
  stopLiveEvaluation,
  setEngineAutoUpdate,
  setLiveEvaluationBar,
  setShowGameEndDialog,
  setShowEngineConfig,
  showGameSettingsDialog,
  showEngineConfig,
  showEngineManager,
  showChessDatabaseDialog,
  setSelectedSquare,
  updatePossibleTargets,
  resetBoardInteraction,
  setHoverPreview,
  setPromotionContext,
  promotionContext,
  setIsLoadingMoves,
  setLoadError,
  animateMoveLocally,
  playGameSound,
}: UseAnalysisControllerOptions) {
  const { t } = useI18n();
  const getMoveAnnotationTooltip = useMoveAnnotationTooltip();

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
  const [analysisProfile, setAnalysisProfile] = useState<AnalysisProfilePoint[]>(EMPTY_PROFILE);
  const [analysisTotalPlies, setAnalysisTotalPlies] = useState(0);
  const [analysisSelectedPosition, setAnalysisSelectedPosition] =
    useState<AnalysisPositionSelection | null>(null);
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

  const analysisEngineProfiles = useMemo(
    () => engineConfigOverview?.profiles ?? [],
    [engineConfigOverview],
  );
  const selectedAnalysisProfile = useMemo(
    () => analysisEngineProfiles.find((profile) => profile.id === analysisSettings.engineProfileId) ?? null,
    [analysisEngineProfiles, analysisSettings.engineProfileId],
  );
  const selectedAnalysisEngine = useMemo(
    () => (engineConfigOverview?.engines ?? []).find(
      (engine) => engine.id === selectedAnalysisProfile?.engineId,
    ) ?? null,
    [engineConfigOverview, selectedAnalysisProfile?.engineId],
  );
  const moveAnnotations = useMemo(() => buildMoveAnnotations(analysisProfile), [analysisProfile]);
  const selectedBoardAnnotations = useMemo(
    () => buildSelectedBoardAnnotations({
      analysisReplayActive,
      analysisReplayFinished,
      analysisSelectedPosition,
      analysisProfile,
      analysisVariationMoves,
      analysisEvaluationEnabled,
      analysisEvaluation,
      moveAnnotations,
      gameAnnotations,
      savedAnnotationLabel: t("annotations.savedAnnotation"),
      getMoveAnnotationTooltip,
    }),
    [
      analysisReplayActive,
      analysisReplayFinished,
      analysisSelectedPosition,
      analysisProfile,
      analysisVariationMoves,
      analysisEvaluationEnabled,
      analysisEvaluation,
      moveAnnotations,
      gameAnnotations,
      getMoveAnnotationTooltip,
      t,
    ],
  );

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

  function resetAnalysisVariation() {
    setAnalysisVariationMoves([]);
    setAnalysisVariationGameState(null);
    resetBoardInteraction();
  }

  function resetAnalysisState() {
    analysisReplayCancelledRef.current = true;
    analysisReplayResumeRef.current = null;
    setAnalysisReplayActive(false);
    setIsAnalysisReplayRunning(false);
    setAnalysisReplayStatus(null);
    setAnalysisReplayError(null);
    setAnalysisReplayFinished(false);
    setAnalysisTotalPlies(0);
    analysisSelectedPlyRef.current = null;
    setAnalysisSelectedPosition(null);
    setAnalysisSelectedLineIndex(null);
    setAnalysisLineAnimationIndex(0);
    setAnalysisEvaluationEnabled(false);
    setAnalysisEvaluation(null);
    setAnalysisEvaluationError(null);
    analysisEvaluationPlyRef.current = null;
    analysisEvaluationKeyRef.current = null;
    resetAnalysisVariation();
    setAnalysisDetailsTab("engine");
    setAnalysisProfile(EMPTY_PROFILE);
  }

  function resetAnnotations() {
    setGameAnnotations({});
    setAnnotationsDirty(false);
    setAnnotationSaveError(null);
  }

  function analysisBoardInteractive(): boolean {
    return Boolean(
      analysisReplayActiveRef.current
      && analysisReplayFinished
      && analysisSelectedPosition
      && !isAnalysisReplayRunning
      && !analysisVariationGameState
    );
  }

  async function stopAnalysisEvaluation() {
    try {
      await stopAnalysisEvaluationRequest();
    } catch (error) {
      console.warn("[stopAnalysisEvaluation] backend stop failed", error);
    }
  }

  async function loadAnalysisEvaluation(
    ply: number,
    variationMoves: string[] = analysisVariationMovesRef.current,
  ) {
    const key = analysisEvaluationKey(ply, variationMoves);
    if (!analysisEvaluationEnabledRef.current || analysisEvaluationKeyRef.current !== key) return;

    try {
      setAnalysisEvaluationError(null);
      const data = variationMoves.length > 0
        ? await fetchAnalysisVariationEvaluation(ply, variationMoves)
        : await fetchAnalysisEvaluationRequest(ply);
      const hasUsableLines = Boolean(data.lines && data.lines.length > 0);
      const isTerminalPosition = Math.abs(data.eval ?? 0) >= 99
        || (variationMoves.length > 0 && Boolean(analysisVariationGameState));
      if (
        analysisEvaluationEnabledRef.current
        && analysisEvaluationKeyRef.current === key
        && (hasUsableLines || isTerminalPosition)
      ) {
        setAnalysisEvaluation(data);
      }
    } catch (error) {
      console.error("[loadAnalysisEvaluation] error", error);
      if (analysisEvaluationKeyRef.current === key) {
        setAnalysisEvaluationError(t("evaluation.analysisFailed"));
      }
    }
  }

  function toggleAnalysisEvaluation() {
    if (!analysisReplayFinished || !analysisSelectedPosition) return;
    const nextValue = !analysisEvaluationEnabledRef.current;
    setAnalysisEvaluationEnabled(nextValue);
    setAnalysisEvaluation(null);
    setAnalysisEvaluationError(null);
    if (!nextValue) {
      analysisEvaluationKeyRef.current = null;
      void stopAnalysisEvaluation();
    }
  }

  function selectAnalysisPosition(
    position: string | undefined,
    san: string | undefined,
    ply: number,
    options?: { updateBoard?: boolean },
  ) {
    if (!analysisReplayActiveRef.current || !position || position.length !== 64) return;
    const hadVariation = analysisVariationMovesRef.current.length > 0;
    if (hadVariation) void stopAnalysisEvaluation();
    resetAnalysisVariation();
    const moveLabel = san ? ` · ${san}` : "";
    analysisEvaluationPlyRef.current = ply;
    analysisEvaluationKeyRef.current = `ply:${ply}`;
    setAnalysisEvaluation(null);
    setAnalysisEvaluationError(null);
    analysisSelectedPlyRef.current = ply;
    setAnalysisSelectedPosition({ position, label: `Ply ${ply}${moveLabel}`, ply });
    setAnalysisSelectedLineIndex(null);
    setAnalysisLineAnimationIndex(0);
    if (options?.updateBoard !== false) {
      setPieces(mapPositionStringToLocalPieces(position));
    }
    setLastMove(null);
  }

  function selectAnalysisPositionByPly(ply: number) {
    const selection = getAnalysisMoveSelectionForPly(moves, ply);
    if (selection) {
      selectAnalysisPosition(selection.position, selection.san, selection.ply);
    }
  }

  function animateAnalysisNavigationMove(
    moveFrom: string,
    moveTo: string,
    sourcePosition: string,
    targetPosition: string,
    reverse: boolean,
  ) {
    setPieces((previousPieces) => {
      if (!piecesMatchPosition(previousPieces, sourcePosition)) {
        console.warn("[analysis-navigation] board/source mismatch; snapping to target position", {
          currentPly: analysisSelectedPlyRef.current,
          moveFrom,
          moveTo,
          reverse,
        });
      }
      return transitionBoardPosition(previousPieces, {
        moveFrom,
        moveTo,
        sourcePosition,
        targetPosition,
        reverse,
      });
    });
  }

  function navigateAnalysisPositionByKeyboard(targetPly: number) {
    const currentPly = analysisSelectedPlyRef.current;
    if (
      currentPly == null
      || Math.abs(targetPly - currentPly) !== 1
      || analysisVariationMovesRef.current.length > 0
    ) {
      selectAnalysisPositionByPly(targetPly);
      return;
    }

    const sourceSelection = getAnalysisMoveSelectionForPly(moves, currentPly);
    const targetSelection = getAnalysisMoveSelectionForPly(moves, targetPly);
    if (
      !sourceSelection?.position
      || sourceSelection.position.length !== 64
      || !targetSelection?.position
      || targetSelection.position.length !== 64
    ) {
      selectAnalysisPositionByPly(targetPly);
      return;
    }

    const reverse = targetPly < currentPly;
    const moveSelection = reverse ? sourceSelection : targetSelection;
    const uci = moveSelection.uci;
    if (!uci || uci.length < 4) {
      console.warn(
        "[navigateAnalysisPositionByKeyboard] missing UCI move for ply",
        reverse ? currentPly : targetPly,
      );
      selectAnalysisPosition(targetSelection.position, targetSelection.san, targetSelection.ply);
      return;
    }

    animateAnalysisNavigationMove(
      uci.substring(0, 2),
      uci.substring(2, 4),
      sourceSelection.position,
      targetSelection.position,
      reverse,
    );
    selectAnalysisPosition(
      targetSelection.position,
      targetSelection.san,
      targetSelection.ply,
      { updateBoard: false },
    );
  }

  function applyAnalysisReplayStep(step: AnalysisReplayStep) {
    if (step.board?.pieces && !analysisReplayActiveRef.current) {
      setPieces(mapBackendPiecesToLocalPieces(step.board.pieces));
    }
    if (step.from && step.to && !analysisReplayActiveRef.current) {
      setLastMove({ from: step.from, to: step.to });
    }
    setAnalysisTotalPlies(Math.max(0, step.totalPlies ?? 0));
    setAnalysisProfile(step.profile?.length ? step.profile : EMPTY_PROFILE);
    const latestProfilePoint = step.profile?.[step.profile.length - 1];
    setEngineEval({
      eval: step.evaluation ?? 0,
      bar: step.bar ?? 0.5,
      engineName: step.engineName ?? null,
      lines: latestProfilePoint?.lines ?? [],
    });
  }

  async function runAnalysisReplayLoop(initialStep: AnalysisReplayStep) {
    setIsAnalysisReplayRunning(true);
    analysisReplayCancelledRef.current = false;
    let currentStep = initialStep;
    try {
      while (!analysisReplayCancelledRef.current) {
        if (currentStep.currentPly < currentStep.totalPlies) {
          const activePly = currentStep.currentPly + 1;
          selectAnalysisPositionByPly(activePly);
          setAnalysisReplayStatus(`Analyzing ${activePly} / ${currentStep.totalPlies}…`);
        }
        const step = await fetchNextAnalysisReplayStep();
        applyAnalysisReplayStep(step);
        currentStep = step;
        const progressText = `${step.currentPly} / ${step.totalPlies}`;
        if (step.done) {
          setAnalysisReplayStatus(`Analysis complete (${progressText}).`);
          setAnalysisReplayFinished(true);
          break;
        }
      }
    } catch (error) {
      console.error("[runAnalysisReplayLoop] error", error);
      setAnalysisReplayError(t("analysis.failed"));
    } finally {
      setIsAnalysisReplayRunning(false);
    }
  }

  async function restoreAnalysisReplayAfterReload(restoredMoves: UciGameResponse["moves"]) {
    const replayState = await fetchAnalysisReplayState();
    if (!replayState) return;
    const hasReplayState = replayState.active
      || replayState.totalPlies > 0
      || (replayState.profile?.length ?? 0) > 1;
    if (!hasReplayState) return;

    setAnalysisReplayActive(true);
    setAnalysisReplayFinished(Boolean(replayState.done));
    setIsAnalysisReplayRunning(false);
    setAnalysisReplayError(null);
    setAnalysisEvaluationEnabled(false);
    setAnalysisEvaluation(null);
    setAnalysisEvaluationError(null);
    analysisEvaluationPlyRef.current = null;
    analysisEvaluationKeyRef.current = null;
    resetAnalysisVariation();
    setAnalysisDetailsTab("engine");
    setEngineAutoUpdate(false);
    setLiveEvaluationBar(null);
    applyAnalysisReplayStep(replayState);

    const currentPly = Math.max(0, Math.min(replayState.currentPly ?? 0, restoredMoves.length));
    const selectedMove = currentPly > 0
      ? restoredMoves.find((move) => move.ply === currentPly) ?? restoredMoves[currentPly - 1]
      : null;
    if (selectedMove?.position && selectedMove.position.length === 64) {
      const moveLabel = selectedMove.san ? ` · ${selectedMove.san}` : "";
      analysisSelectedPlyRef.current = currentPly;
      setAnalysisSelectedPosition({
        position: selectedMove.position,
        label: `Ply ${currentPly}${moveLabel}`,
        ply: currentPly,
      });
      setPieces(mapPositionStringToLocalPieces(selectedMove.position));
      setLastMove(
        selectedMove.uci && selectedMove.uci.length >= 4
          ? { from: selectedMove.uci.substring(0, 2), to: selectedMove.uci.substring(2, 4) }
          : null,
      );
    } else if (replayState.board?.pieces) {
      analysisSelectedPlyRef.current = null;
      setAnalysisSelectedPosition(null);
      setPieces(mapBackendPiecesToLocalPieces(replayState.board.pieces));
      setLastMove(null);
    }

    const progressText = `${replayState.currentPly} / ${replayState.totalPlies}`;
    setAnalysisReplayStatus(
      replayState.done ? `Analysis complete (${progressText}).` : `Analyzing ${progressText}…`,
    );
    analysisReplayResumeRef.current = replayState.active && !replayState.done ? replayState : null;
  }

  function openAnalysisSettingsDialog() {
    setAnalysisReplayError(null);
    setAnalysisReplayStatus(null);
    if (engineConfigOverview?.defaults.deepAnalysisProfileId) {
      setAnalysisSettings((previous) => ({
        ...previous,
        engineProfileId: engineConfigOverview.defaults.deepAnalysisProfileId,
      }));
    }
    setShowGameEndDialog(false);
    setShowAnalysisSettingsDialog(true);
  }

  async function startAnalysisReplay() {
    try {
      if (!analysisSettings.engineProfileId) throw new Error(t("analysis.noDeepProfile"));
      analysisReplayResumeRef.current = null;
      setAnalysisReplayError(null);
      setAnalysisReplayStatus(t("analysis.preparing"));
      setAnalysisReplayFinished(false);
      setIsAnalysisReplayRunning(true);
      setShowAnalysisSettingsDialog(false);
      setShowGameEndDialog(false);
      setShowEngineConfig(false);
      setSelectedSquare(null);
      updatePossibleTargets([]);
      setHoverPreview(null);
      setPromotionContext(null);
      setAnalysisWhitePlayerName(
        uciAnalysisLoaded
          ? analysisWhitePlayerName || "White"
          : getDisplayedWhitePlayerName(clock, whiteComputerEnabled),
      );
      setAnalysisBlackPlayerName(
        uciAnalysisLoaded
          ? analysisBlackPlayerName || "Black"
          : getDisplayedBlackPlayerName(clock, blackComputerEnabled),
      );
      setAnalysisReplayActive(true);
      setAnalysisEvaluationEnabled(false);
      setAnalysisEvaluation(null);
      setAnalysisEvaluationError(null);
      analysisEvaluationPlyRef.current = null;
      analysisEvaluationKeyRef.current = null;
      resetAnalysisVariation();
      await stopAnalysisEvaluation();
      await stopLiveEvaluation();
      await disablePlayerEngines();
      setShowGameEndDialog(false);
      setEngineAutoUpdate(false);
      setLiveEvaluationBar(null);
      setAnalysisTotalPlies(0);
      analysisSelectedPlyRef.current = null;
      setAnalysisSelectedPosition(null);
      setAnalysisSelectedLineIndex(null);
      setAnalysisLineAnimationIndex(0);
      setAnalysisProfile(EMPTY_PROFILE);
      const step = await startAnalysisReplayRequest(analysisSettings);
      applyAnalysisReplayStep(step);
      setAnalysisReplayStatus(`Analyzing 0 / ${step.totalPlies}…`);
      await runAnalysisReplayLoop(step);
    } catch (error) {
      console.error("[startAnalysisReplay] error", error);
      setAnalysisReplayError(t("analysis.startFailed"));
      setAnalysisReplayFinished(false);
      setAnalysisReplayActive(false);
      setIsAnalysisReplayRunning(false);
    }
  }

  async function cancelAnalysisReplay() {
    analysisReplayCancelledRef.current = true;
    setIsAnalysisReplayRunning(false);
    setAnalysisReplayFinished(true);
    setAnalysisReplayStatus(t("analysis.cancelled"));
    try {
      await cancelAnalysisReplayRequest();
    } catch (error) {
      console.warn("[cancelAnalysisReplay] backend cancel failed", error);
    }
  }

  function updateGameAnnotation(annotation: GameAnnotation) {
    setGameAnnotations((previous) => {
      const next = { ...previous };
      if (isEmptyGameAnnotation(annotation)) {
        delete next[annotation.ply];
      } else {
        next[annotation.ply] = {
          ...annotation,
          variations: [...(annotation.variations ?? [])],
        };
      }
      return next;
    });
    setAnnotationsDirty(true);
    setAnnotationSaveError(null);
  }

  async function persistGameAnnotations() {
    if (!annotationsDirty || annotationsSaving) return;
    setAnnotationsSaving(true);
    setAnnotationSaveError(null);
    try {
      const annotations = Object.values(gameAnnotations)
        .filter((annotation) => !isEmptyGameAnnotation(annotation))
        .sort((left: GameAnnotation, right: GameAnnotation) => left.ply - right.ply);
      const saved = await saveGameAnnotations(
        annotations,
        whiteComputerEnabled,
        blackComputerEnabled,
      );
      setGameAnnotations(gameAnnotationRecord(saved));
      setAnnotationsDirty(false);
    } catch (error) {
      console.error("[persistGameAnnotations] error", error);
      setAnnotationSaveError(
        error instanceof Error ? error.message : t("annotations.saveFailed"),
      );
    } finally {
      setAnnotationsSaving(false);
    }
  }

  function saveAnalysisPgn() {
    try {
      setLoadError(null);
      const diagnosticPgn = buildDiagnosticAnalysisPgn({
        profile: analysisProfile,
        whitePlayerName: getAnalysisWhitePlayerName(clock, analysisWhitePlayerName),
        blackPlayerName: getAnalysisBlackPlayerName(clock, analysisBlackPlayerName),
        engineName: engineEval?.engineName ?? null,
      });
      const blob = new Blob([diagnosticPgn], { type: "application/x-chess-pgn;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "analysis-diagnostic.pgn";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[saveAnalysisPgn] error", error);
      setLoadError(t("analysis.exportPgnFailed"));
    }
  }

  async function performAnalysisVariationMove(from: string, to: string, promotion?: PieceType) {
    if (!analysisSelectedPosition) return;
    const previousMoves = [...analysisVariationMovesRef.current];
    const request: AnalysisVariationRequest = {
      anchorPly: analysisSelectedPosition.ply,
      moves: previousMoves,
      from,
      to,
      promotion: promotion ?? null,
    };
    try {
      setIsLoadingMoves(true);
      setLoadError(null);
      const result = await submitAnalysisVariationMove(request);
      const data = result.data;
      if (!result.ok || !data.success || !data.uci || !data.position) {
        setLoadError(data.message || `HTTP ${result.status}`);
        return;
      }
      const nextMoves = [...previousMoves, data.uci];
      setAnalysisVariationMoves(nextMoves);
      setAnalysisVariationGameState(data.gameState ?? null);
      animateMoveLocally(from, to, promotion, data.position);
      setLastMove({ from, to });
      setSelectedSquare(null);
      updatePossibleTargets([]);
      setAnalysisSelectedLineIndex(null);
      setAnalysisLineAnimationIndex(0);
      setAnalysisEngineView("live");
      setAnalysisEvaluationError(null);
      analysisEvaluationKeyRef.current = analysisEvaluationKey(
        analysisSelectedPosition.ply,
        nextMoves,
      );
      void playGameSound(data.gameState ? "notify" : "move");
    } catch (error) {
      console.error("[performAnalysisVariationMove] failed", error);
      setLoadError(t("analysis.variationMoveFailed"));
    } finally {
      setIsLoadingMoves(false);
    }
  }

  function restoreAnnotations(annotations: GameAnnotation[] | null | undefined) {
    setGameAnnotations(gameAnnotationRecord(annotations));
    setAnnotationsDirty(false);
    setAnnotationSaveError(null);
  }

  function setImportedPlayers(
    whitePlayerName: string | null | undefined,
    blackPlayerName: string | null | undefined,
    totalPlies: number,
  ) {
    setAnalysisWhitePlayerName(whitePlayerName || "White");
    setAnalysisBlackPlayerName(blackPlayerName || "Black");
    setAnalysisTotalPlies(Math.max(0, totalPlies));
  }

  useEffect(() => {
    if (!engineConfigOverview) return;
    setAnalysisSettings((previous) => {
      if (engineConfigOverview.profiles.some((profile) => profile.id === previous.engineProfileId)) {
        return previous;
      }
      const preferred = engineConfigOverview.profiles.find(
        (profile) => profile.id === engineConfigOverview.defaults.deepAnalysisProfileId,
      );
      return {
        ...previous,
        engineProfileId: preferred?.id ?? engineConfigOverview.profiles[0]?.id ?? null,
      };
    });
  }, [engineConfigOverview]);

  useEffect(() => {
    const replayState = analysisReplayResumeRef.current;
    if (!replayState || !analysisReplayActive || moves.length === 0) return;
    analysisReplayResumeRef.current = null;
    void runAnalysisReplayLoop(replayState);
  }, [analysisReplayActive, moves.length]);

  useEffect(() => {
    setAnalysisLineAnimationIndex(0);
  }, [analysisSelectedPosition?.ply, analysisSelectedLineIndex]);

  useEffect(() => {
    if (!analysisReplayActive || !analysisSelectedPosition || analysisVariationMoves.length > 0) return;
    const selectedPoint = analysisProfile.find(
      (point) => point.ply === analysisSelectedPosition.ply,
    );
    const lines = selectedPoint?.lines ?? [];
    if (lines.length === 0) return;
    const lineIndex = getEffectiveAnalysisLineIndex(
      selectedPoint,
      lines,
      analysisSelectedLineIndex,
    );
    const positions = lines[lineIndex]?.positions ?? [];
    if (positions.length <= 1) return;
    const intervalId = window.setInterval(() => {
      setAnalysisLineAnimationIndex((previous) => (previous + 1) % positions.length);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [
    analysisReplayActive,
    analysisSelectedPosition?.ply,
    analysisSelectedLineIndex,
    analysisProfile,
    analysisVariationMoves.length,
  ]);

  useEffect(() => {
    if (
      !analysisReplayActive
      || !analysisReplayFinished
      || !analysisEvaluationEnabled
      || !analysisSelectedPosition
    ) return;
    const ply = analysisSelectedPosition.ply;
    const variationSnapshot = [...analysisVariationMoves];
    const key = analysisEvaluationKey(ply, variationSnapshot);
    analysisEvaluationPlyRef.current = ply;
    analysisEvaluationKeyRef.current = key;
    setAnalysisEvaluation(null);
    setAnalysisEvaluationError(null);
    void loadAnalysisEvaluation(ply, variationSnapshot);
    const intervalId = window.setInterval(() => {
      void loadAnalysisEvaluation(ply, variationSnapshot);
    }, 2000);
    return () => window.clearInterval(intervalId);
  }, [
    analysisReplayActive,
    analysisReplayFinished,
    analysisEvaluationEnabled,
    analysisSelectedPosition?.ply,
    analysisVariationMoves,
  ]);

  useEffect(() => {
    if (
      !analysisReplayActive
      || !analysisReplayFinished
      || !analysisEvaluationEnabled
      || !analysisSelectedPosition
      || analysisVariationMoves.length > 0
      || !analysisEvaluation?.moveAnnotationReady
    ) return;

    const ply = analysisSelectedPosition.ply;
    const liveAnnotation = analysisEvaluation.moveAnnotation ?? null;
    setAnalysisProfile((previous) => {
      let changed = false;
      const next = previous.map((point) => {
        if (point.ply !== ply) return point;
        const current = point.annotation ?? null;
        const sameAnnotation = current === liveAnnotation || (
          current !== null
          && liveAnnotation !== null
          && current.symbol === liveAnnotation.symbol
          && current.kind === liveAnnotation.kind
          && current.winChanceLoss === liveAnnotation.winChanceLoss
          && current.bestEvaluation === liveAnnotation.bestEvaluation
          && current.secondBestEvaluation === liveAnnotation.secondBestEvaluation
          && current.extraordinaryReason === liveAnnotation.extraordinaryReason
          && current.materialInvestment === liveAnnotation.materialInvestment
          && current.sacrificeType === liveAnnotation.sacrificeType
          && current.shortTermMaterialCompensated === liveAnnotation.shortTermMaterialCompensated
          && current.materialCompensationPlies === liveAnnotation.materialCompensationPlies
          && current.forcedMateDistance === liveAnnotation.forcedMateDistance
          && current.earlyDepth === liveAnnotation.earlyDepth
          && current.earlyRank === liveAnnotation.earlyRank
          && current.finalDepth === liveAnnotation.finalDepth
          && current.finalRank === liveAnnotation.finalRank
          && current.givesCheck === liveAnnotation.givesCheck
          && current.earlyRegret === liveAnnotation.earlyRegret
          && current.earlyStrength === liveAnnotation.earlyStrength
          && current.finalStrength === liveAnnotation.finalStrength
        );
        if (sameAnnotation) return point;
        changed = true;
        return { ...point, annotation: liveAnnotation };
      });
      return changed ? next : previous;
    });
  }, [
    analysisReplayActive,
    analysisReplayFinished,
    analysisEvaluationEnabled,
    analysisSelectedPosition,
    analysisVariationMoves.length,
    analysisEvaluation,
  ]);

  useEffect(() => {
    function handleAnalysisArrowNavigation(event: KeyboardEvent) {
      if (
        !analysisReplayActive
        || !analysisReplayFinished
        || analysisTotalPlies <= 0
        || showAnalysisSettingsDialog
        || showGameSettingsDialog
        || showEngineConfig
        || showEngineManager
        || showChessDatabaseDialog
        || promotionContext
      ) return;
      if ((event.key !== "ArrowLeft" && event.key !== "ArrowRight") || event.repeat) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable)
      ) return;

      const currentPly = analysisSelectedPlyRef.current
        ?? (event.key === "ArrowRight" ? 0 : analysisTotalPlies + 1);
      const nextPly = currentPly + (event.key === "ArrowRight" ? 1 : -1);
      if (nextPly < 1 || nextPly > analysisTotalPlies) return;
      event.preventDefault();
      navigateAnalysisPositionByKeyboard(nextPly);
    }

    window.addEventListener("keydown", handleAnalysisArrowNavigation);
    return () => window.removeEventListener("keydown", handleAnalysisArrowNavigation);
  }, [
    analysisReplayActive,
    analysisReplayFinished,
    analysisSelectedPosition?.ply,
    analysisTotalPlies,
    showAnalysisSettingsDialog,
    showGameSettingsDialog,
    showEngineConfig,
    showEngineManager,
    showChessDatabaseDialog,
    promotionContext,
    moves,
  ]);

  return {
    showAnalysisSettingsDialog,
    setShowAnalysisSettingsDialog,
    analysisSettings,
    setAnalysisSettings,
    analysisReplayActive,
    analysisReplayActiveRef,
    isAnalysisReplayRunning,
    analysisReplayStatus,
    analysisReplayError,
    analysisReplayFinished,
    analysisProfile,
    setAnalysisProfile,
    analysisTotalPlies,
    setAnalysisTotalPlies,
    analysisSelectedPosition,
    analysisSelectedPlyRef,
    analysisDetailsTab,
    setAnalysisDetailsTab,
    gameAnnotations,
    annotationsDirty,
    annotationsSaving,
    annotationSaveError,
    analysisEngineView,
    setAnalysisEngineView,
    analysisSelectedLineIndex,
    setAnalysisSelectedLineIndex,
    analysisLineAnimationIndex,
    setAnalysisLineAnimationIndex,
    analysisWhitePlayerName,
    setAnalysisWhitePlayerName,
    analysisBlackPlayerName,
    setAnalysisBlackPlayerName,
    analysisEvaluationEnabled,
    analysisEvaluation,
    setAnalysisEvaluation,
    analysisEvaluationError,
    analysisEvaluationKeyRef,
    analysisVariationMoves,
    analysisVariationMovesRef,
    analysisVariationGameState,
    analysisEngineProfiles,
    selectedAnalysisProfile,
    selectedAnalysisEngine,
    moveAnnotations,
    selectedBoardAnnotations,
    analysisBoardInteractive,
    resetAnalysisVariation,
    resetAnalysisState,
    resetAnnotations,
    setAnalysisReplayActive,
    setAnalysisEvaluationEnabled,
    setAnalysisVariationMoves,
    stopAnalysisEvaluation,
    toggleAnalysisEvaluation,
    selectAnalysisPosition,
    selectAnalysisPositionByPly,
    restoreAnalysisReplayAfterReload,
    openAnalysisSettingsDialog,
    startAnalysisReplay,
    cancelAnalysisReplay,
    updateGameAnnotation,
    persistGameAnnotations,
    saveAnalysisPgn,
    performAnalysisVariationMove,
    restoreAnnotations,
    setImportedPlayers,
  };
}
