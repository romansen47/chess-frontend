import { useI18n } from "../../i18n/I18nProvider";
import { saveGameMetadata } from "../api/gameApi";
import type { AnalysisState } from "./useAnalysisState";

export function useAnalysisMetadata(state: AnalysisState) {
  const { t } = useI18n();

  function restoreGameMetadata(
    tags: Record<string, string> | null | undefined,
    available: boolean,
  ) {
    state.setAnalysisGameMetadata(tags ? { ...tags } : {});
    state.setAnalysisGameMetadataAvailable(available);
    state.setAnalysisGameMetadataError(null);
    state.setAnalysisGameMetadataSaving(false);
  }

  async function persistGameMetadata(tags: Record<string, string>) {
    if (!state.analysisGameMetadataAvailable || state.analysisGameMetadataSaving) return;

    state.setAnalysisGameMetadataSaving(true);
    state.setAnalysisGameMetadataError(null);
    try {
      const saved = await saveGameMetadata(tags);
      state.setAnalysisGameMetadata({ ...saved.tags });
      state.setAnalysisWhitePlayerName(saved.tags.White?.trim() || "White");
      state.setAnalysisBlackPlayerName(saved.tags.Black?.trim() || "Black");
    } catch (error) {
      console.error("[persistGameMetadata] error", error);
      state.setAnalysisGameMetadataError(
        error instanceof Error ? error.message : t("metadata.saveFailed"),
      );
      throw error;
    } finally {
      state.setAnalysisGameMetadataSaving(false);
    }
  }

  function resetGameMetadata() {
    restoreGameMetadata({}, false);
  }

  return {
    restoreGameMetadata,
    persistGameMetadata,
    resetGameMetadata,
  };
}
