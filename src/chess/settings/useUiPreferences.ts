import { useEffect, useState } from "react";

const STORAGE_KEY = "chess.uiPreferences";

export interface UiPreferences {
  showAnalysisEvaluationArrows: boolean;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  showAnalysisEvaluationArrows: true,
};

function loadUiPreferences(): UiPreferences {
  if (typeof window === "undefined") return DEFAULT_UI_PREFERENCES;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_UI_PREFERENCES;
    const parsed = JSON.parse(stored) as Partial<UiPreferences>;
    return {
      showAnalysisEvaluationArrows:
        typeof parsed.showAnalysisEvaluationArrows === "boolean"
          ? parsed.showAnalysisEvaluationArrows
          : DEFAULT_UI_PREFERENCES.showAnalysisEvaluationArrows,
    };
  } catch {
    return DEFAULT_UI_PREFERENCES;
  }
}

export function useUiPreferences() {
  const [preferences, setPreferences] = useState<UiPreferences>(loadUiPreferences);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
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
