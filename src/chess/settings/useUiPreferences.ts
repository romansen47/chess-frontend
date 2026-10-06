import { useEffect, useState } from "react";
import {
  DEFAULT_BOARD_THEME_ID,
  isBoardThemeId,
  type BoardThemeId,
} from "./boardThemes";

const STORAGE_KEY = "chess.uiPreferences";

export type AnalysisEvaluationArrowCount = 1 | 2 | 3;
export type EngineVariationAnimationIntervalMs = 500 | 1000 | 2000;

export const ANALYSIS_EVALUATION_ARROW_COUNTS: AnalysisEvaluationArrowCount[] = [1, 2, 3];
export const ENGINE_VARIATION_ANIMATION_INTERVALS: EngineVariationAnimationIntervalMs[] = [
  500,
  1000,
  2000,
];

export interface UiPreferences {
  showAnalysisEvaluationArrows: boolean;
  analysisEvaluationArrowCount: AnalysisEvaluationArrowCount;
  animateEngineVariations: boolean;
  engineVariationAnimationIntervalMs: EngineVariationAnimationIntervalMs;
  showMoveAnnotationsOnBoard: boolean;
  showBoardCoordinates: boolean;
  boardTheme: BoardThemeId;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  showAnalysisEvaluationArrows: true,
  analysisEvaluationArrowCount: 3,
  animateEngineVariations: true,
  engineVariationAnimationIntervalMs: 1000,
  showMoveAnnotationsOnBoard: true,
  showBoardCoordinates: true,
  boardTheme: DEFAULT_BOARD_THEME_ID,
};

function isAnalysisEvaluationArrowCount(
  value: unknown,
): value is AnalysisEvaluationArrowCount {
  return value === 1 || value === 2 || value === 3;
}

function isAnimationInterval(
  value: unknown,
): value is EngineVariationAnimationIntervalMs {
  return value === 500 || value === 1000 || value === 2000;
}

function booleanPreference(
  value: unknown,
  fallback: boolean,
): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function loadUiPreferences(): UiPreferences {
  if (typeof window === "undefined") return DEFAULT_UI_PREFERENCES;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_UI_PREFERENCES;

    const parsed = JSON.parse(stored) as Partial<UiPreferences>;
    return {
      showAnalysisEvaluationArrows: booleanPreference(
        parsed.showAnalysisEvaluationArrows,
        DEFAULT_UI_PREFERENCES.showAnalysisEvaluationArrows,
      ),
      analysisEvaluationArrowCount: isAnalysisEvaluationArrowCount(
        parsed.analysisEvaluationArrowCount,
      )
        ? parsed.analysisEvaluationArrowCount
        : DEFAULT_UI_PREFERENCES.analysisEvaluationArrowCount,
      animateEngineVariations: booleanPreference(
        parsed.animateEngineVariations,
        DEFAULT_UI_PREFERENCES.animateEngineVariations,
      ),
      engineVariationAnimationIntervalMs: isAnimationInterval(
        parsed.engineVariationAnimationIntervalMs,
      )
        ? parsed.engineVariationAnimationIntervalMs
        : DEFAULT_UI_PREFERENCES.engineVariationAnimationIntervalMs,
      showMoveAnnotationsOnBoard: booleanPreference(
        parsed.showMoveAnnotationsOnBoard,
        DEFAULT_UI_PREFERENCES.showMoveAnnotationsOnBoard,
      ),
      showBoardCoordinates: booleanPreference(
        parsed.showBoardCoordinates,
        DEFAULT_UI_PREFERENCES.showBoardCoordinates,
      ),
      boardTheme: isBoardThemeId(parsed.boardTheme)
        ? parsed.boardTheme
        : DEFAULT_UI_PREFERENCES.boardTheme,
    };
  } catch {
    return DEFAULT_UI_PREFERENCES;
  }
}

export function useUiPreferences() {
  const [preferences, setPreferences] = useState<UiPreferences>(loadUiPreferences);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Display preferences are non-critical; keep the in-memory values.
    }
  }, [preferences]);

  function updatePreferences(patch: Partial<UiPreferences>) {
    setPreferences((current) => ({ ...current, ...patch }));
  }

  return {
    preferences,
    updatePreferences,
  };
}

export type UiPreferencesController = ReturnType<typeof useUiPreferences>;
