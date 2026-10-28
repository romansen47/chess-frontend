import { useI18n } from "../i18n/I18nProvider";
import { BOARD_THEMES, type BoardThemeId } from "../chess/settings/boardThemes";
import {
  ANALYSIS_EVALUATION_ARROW_COUNTS,
  ENGINE_VARIATION_ANIMATION_INTERVALS,
  type UiPreferences,
} from "../chess/settings/useUiPreferences";

interface Props {
  preferences: UiPreferences;
  onChange: (patch: Partial<UiPreferences>) => void;
}

export default function DisplaySettings({ preferences, onChange }: Props) {
  const { t } = useI18n();
  return (
    <main className="engine-config-details engine-config-display-details">
      <div className="engine-config-editor">
        <div className="engine-config-details-heading">
          <div>
            <strong>{t("settings.displaySettings")}</strong>
            <span>{t("settings.displaySettingsDescription")}</span>
          </div>
          <span className="engine-config-chip">{t("settings.thisDevice")}</span>
        </div>

        <div className="engine-config-preference-grid">
          <label className="engine-config-preference-card">
            <div><strong>{t("settings.showEvaluationArrows")}</strong><span>{t("settings.showEvaluationArrowsDescription")}</span></div>
            <input type="checkbox" checked={preferences.showAnalysisEvaluationArrows}
              onChange={(event) => onChange({ showAnalysisEvaluationArrows: event.target.checked })} />
          </label>
          <label className="engine-config-preference-card">
            <div><strong>{t("settings.engineArrowCount")}</strong><span>{t("settings.engineArrowCountDescription")}</span></div>
            <select className="engine-config-preference-select"
              value={preferences.analysisEvaluationArrowCount}
              disabled={!preferences.showAnalysisEvaluationArrows}
              onChange={(event) => onChange({ analysisEvaluationArrowCount: Number(event.target.value) as UiPreferences["analysisEvaluationArrowCount"] })}>
              {ANALYSIS_EVALUATION_ARROW_COUNTS.map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
          <label className="engine-config-preference-card">
            <div><strong>{t("settings.animateEngineVariations")}</strong><span>{t("settings.animateEngineVariationsDescription")}</span></div>
            <input type="checkbox" checked={preferences.animateEngineVariations}
              onChange={(event) => onChange({ animateEngineVariations: event.target.checked })} />
          </label>
          <label className="engine-config-preference-card">
            <div><strong>{t("settings.animationSpeed")}</strong><span>{t("settings.animationSpeedDescription")}</span></div>
            <select className="engine-config-preference-select"
              value={preferences.engineVariationAnimationIntervalMs}
              disabled={!preferences.animateEngineVariations}
              onChange={(event) => onChange({ engineVariationAnimationIntervalMs: Number(event.target.value) as UiPreferences["engineVariationAnimationIntervalMs"] })}>
              {ENGINE_VARIATION_ANIMATION_INTERVALS.map((milliseconds) => (
                <option key={milliseconds} value={milliseconds}>{milliseconds === 500 ? "0.5 s" : `${milliseconds / 1000} s`}</option>
              ))}
            </select>
          </label>
          <label className="engine-config-preference-card">
            <div><strong>{t("settings.showMoveAnnotationsOnBoard")}</strong><span>{t("settings.showMoveAnnotationsOnBoardDescription")}</span></div>
            <input type="checkbox" checked={preferences.showMoveAnnotationsOnBoard}
              onChange={(event) => onChange({ showMoveAnnotationsOnBoard: event.target.checked })} />
          </label>
          <label className="engine-config-preference-card">
            <div><strong>{t("settings.boardTheme")}</strong><span>{t("settings.boardThemeDescription")}</span></div>
            <select className="engine-config-preference-select" value={preferences.boardTheme}
              onChange={(event) => onChange({ boardTheme: event.target.value as BoardThemeId })}>
              {BOARD_THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.id === "green" ? t("settings.boardThemeGreen") : theme.id === "brown" ? t("settings.boardThemeBrown") : t("settings.boardThemeSlate")}
                </option>
              ))}
            </select>
          </label>
          <label className="engine-config-preference-card">
            <div><strong>{t("settings.showBoardCoordinates")}</strong><span>{t("settings.showBoardCoordinatesDescription")}</span></div>
            <input type="checkbox" checked={preferences.showBoardCoordinates}
              onChange={(event) => onChange({ showBoardCoordinates: event.target.checked })} />
          </label>
        </div>
        <div className="engine-config-display-note">{t("settings.displayStoredLocally")}</div>
      </div>
    </main>
  );
}
