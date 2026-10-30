import { frenchCommonTranslations } from "./fr/common";
import { frenchDatabaseTranslations } from "./fr/database";
import { frenchAnalysisTranslations } from "./fr/analysis";
import { frenchGameTranslations } from "./fr/game";
import { frenchSettingsTranslations } from "./fr/settings";

export const frenchTranslations = {
  ...frenchCommonTranslations,
  ...frenchDatabaseTranslations,
  ...frenchAnalysisTranslations,
  ...frenchGameTranslations,
  ...frenchSettingsTranslations,
} as const;
