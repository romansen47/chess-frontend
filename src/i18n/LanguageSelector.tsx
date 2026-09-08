import { useI18n } from "./I18nProvider";
import { SUPPORTED_LANGUAGES, type Language } from "./languages";
import "./LanguageSelector.css";

export default function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();

  return (
    <label className="language-selector">
      <select
        value={language}
        aria-label={t("language.label")}
        onChange={(event) => setLanguage(event.target.value as Language)}
      >
        {SUPPORTED_LANGUAGES.map(({ code, nativeName }) => (
          <option key={code} value={code}>{nativeName}</option>
        ))}
      </select>
    </label>
  );
}
