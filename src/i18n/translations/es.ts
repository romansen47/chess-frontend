import { spanishCommonTranslations } from "./es/common";
import { spanishDatabaseTranslations } from "./es/database";
import { spanishAnalysisTranslations } from "./es/analysis";
import { spanishGameTranslations } from "./es/game";
import { spanishSettingsTranslations } from "./es/settings";

export const spanishTranslations = {
  ...spanishCommonTranslations,
  ...spanishDatabaseTranslations,
  ...spanishAnalysisTranslations,
  ...spanishGameTranslations,
  ...spanishSettingsTranslations,
} as const;
