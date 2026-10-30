import { englishCommonTranslations } from "./en/common";
import { englishDatabaseTranslations } from "./en/database";
import { englishAnalysisTranslations } from "./en/analysis";
import { englishGameTranslations } from "./en/game";
import { englishSettingsTranslations } from "./en/settings";

export const englishTranslations = {
  ...englishCommonTranslations,
  ...englishDatabaseTranslations,
  ...englishAnalysisTranslations,
  ...englishGameTranslations,
  ...englishSettingsTranslations,
} as const;
export type TranslationKey = keyof typeof englishTranslations;
