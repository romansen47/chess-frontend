import { germanCommonTranslations } from "./de/common";
import { germanDatabaseTranslations } from "./de/database";
import { germanAnalysisTranslations } from "./de/analysis";
import { germanGameTranslations } from "./de/game";
import { germanSettingsTranslations } from "./de/settings";

export const germanTranslations = {
  ...germanCommonTranslations,
  ...germanDatabaseTranslations,
  ...germanAnalysisTranslations,
  ...germanGameTranslations,
  ...germanSettingsTranslations,
} as const;
