import { useI18n, type Language } from "./I18nProvider";
import "./LanguageSelector.css";

export default function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();

  return (
    <label className="language-selector">
      <span>{t("language.label")}</span>
      <select
        value={language}
        aria-label={t("language.label")}
        onChange={(event) => setLanguage(event.target.value as Language)}
      >
        <option value="en">English</option>
        <option value="de">Deutsch</option>
        <option value="fr">Français</option>
      </select>
    </label>
  );
}
