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
        <option value="en">{t("language.english")}</option>
        <option value="de">{t("language.german")}</option>
        <option value="fr">{t("language.french")}</option>
      </select>
    </label>
  );
}
