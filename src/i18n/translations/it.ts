import { italianCommonTranslations } from "./it/common";
import { italianDatabaseTranslations } from "./it/database";
import { italianAnalysisTranslations } from "./it/analysis";
import { italianGameTranslations } from "./it/game";
import { italianSettingsTranslations } from "./it/settings";

export const italianTranslations = {
  ...italianCommonTranslations,
  ...italianDatabaseTranslations,
  ...italianAnalysisTranslations,
  ...italianGameTranslations,
  ...italianSettingsTranslations,
} as const;
