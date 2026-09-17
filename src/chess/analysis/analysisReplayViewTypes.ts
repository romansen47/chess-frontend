import type { EngineEvaluation, GameAnnotation, MoveAnnotation, MoveRow, AnalysisPositionSelection, AnalysisProfilePoint } from "../types";
import type { BoardOrientation } from "../board/boardOrientation";
import type { AnalysisEngineView } from "./AnalysisEngineTabs";

export type AnalysisDetailsTab = "engine" | "database" | "annotations";

export interface AnalysisReplayContentState {
  boardOrientation: BoardOrientation;
  analysisProfile: AnalysisProfilePoint[];
  analysisTotalPlies: number;
  analysisSelectedPosition: AnalysisPositionSelection | null;
  analysisReplayStatus: string | null;
  isAnalysisReplayRunning: boolean;
  analysisReplayError: string | null;
  analysisEvaluationError: string | null;
  moves: MoveRow[];
  analysisSelectedLineIndex: number | null;
  analysisLineAnimationIndex: number;
  analysisDetailsTab: AnalysisDetailsTab;
  engineEval: EngineEvaluation | null;
  analysisEvaluation: EngineEvaluation | null;
  analysisEvaluationEnabled: boolean;
  analysisVariationMoves: string[];
  analysisEngineView: AnalysisEngineView;
  evaluationKey: string | null;
  gameAnnotations: Record<number, GameAnnotation>;
  moveAnnotations: Record<number, MoveAnnotation>;
  annotationsDirty: boolean;
  annotationsSaving: boolean;
  annotationSaveError: string | null;
}

export interface AnalysisReplayContentActions {
  selectPositionByPly: (ply: number) => void;
  cancelAnalysisReplay: () => void | Promise<void>;
  selectLine: (index: number) => void;
  setDetailsTab: (tab: AnalysisDetailsTab) => void;
  setEngineView: (view: AnalysisEngineView) => void;
  updateGameAnnotation: (annotation: GameAnnotation) => void;
  persistGameAnnotations: () => void | Promise<void>;
}
