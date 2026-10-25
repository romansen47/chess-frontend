import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  PROTECTED_GAME_METADATA_TAGS,
  customGameMetadataEntries,
  metadataMapsEqual,
  nextCustomMetadataKey,
} from "./analysisMetadataUtils";
import type {
  AnalysisReplayContentActions,
  AnalysisReplayContentState,
} from "./analysisReplayViewTypes";
import "./analysisViews.css";

interface Props {
  state: AnalysisReplayContentState;
  actions: AnalysisReplayContentActions;
}

const TEXT_FIELDS = [
  ["Event", "metadata.event"],
  ["Site", "metadata.site"],
  ["Date", "metadata.date"],
  ["Round", "metadata.round"],
  ["White", "metadata.white"],
  ["Black", "metadata.black"],
  ["WhiteElo", "metadata.whiteElo"],
  ["BlackElo", "metadata.blackElo"],
  ["ECO", "metadata.eco"],
  ["TimeControl", "metadata.timeControl"],
] as const;

export default function AnalysisMetadataDetails({ state, actions }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Record<string, string>>(
    () => ({ ...state.analysisGameMetadata }),
  );

  useEffect(() => {
    setDraft({ ...state.analysisGameMetadata });
  }, [state.analysisGameMetadata]);

  const dirty = !metadataMapsEqual(draft, state.analysisGameMetadata);
  const customEntries = useMemo(() => customGameMetadataEntries(draft), [draft]);

  function setTag(key: string, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function removeTag(key: string) {
    setDraft((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  function renameCustomTag(oldKey: string, newKey: string) {
    const trimmed = newKey.trim();
    if (!trimmed || trimmed === oldKey) return;
    setDraft((previous) => {
      if (trimmed in previous) return previous;
      const next = { ...previous, [trimmed]: previous[oldKey] ?? "" };
      delete next[oldKey];
      return next;
    });
  }

  function addCustomTag() {
    setDraft((previous) => ({
      ...previous,
      [nextCustomMetadataKey(previous)]: "",
    }));
  }

  if (!state.analysisGameMetadataAvailable) {
    return (
      <div className="analysis-metadata-panel">
        <div className="analysis-detail-placeholder">
          {t("metadata.storedGameOnly")}
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-metadata-panel">
      <div className="analysis-metadata-heading">
        <div>
          <strong>{t("metadata.title")}</strong>
          <span>{t("metadata.description")}</span>
        </div>
        <div className="analysis-metadata-actions">
          <button
            type="button"
            onClick={() => setDraft({ ...state.analysisGameMetadata })}
            disabled={!dirty || state.analysisGameMetadataSaving}
          >
            {t("metadata.reset")}
          </button>
          <button
            type="button"
            onClick={() => void actions.persistGameMetadata(draft).catch(() => undefined)}
            disabled={!dirty || state.analysisGameMetadataSaving}
          >
            {state.analysisGameMetadataSaving
              ? t("metadata.saving")
              : t("common.save")}
          </button>
        </div>
      </div>

      {state.analysisGameMetadataError && (
        <div className="analysis-metadata-error">
          {state.analysisGameMetadataError}
        </div>
      )}

      <div className="analysis-metadata-grid">
        {TEXT_FIELDS.map(([key, labelKey]) => (
          <label className="analysis-metadata-field" key={key}>
            <span>{t(labelKey)}</span>
            <input
              value={draft[key] ?? ""}
              onChange={(event) => setTag(key, event.target.value)}
              disabled={state.analysisGameMetadataSaving}
            />
          </label>
        ))}

        <label className="analysis-metadata-field">
          <span>{t("metadata.result")}</span>
          <select
            value={draft.Result ?? "*"}
            onChange={(event) => setTag("Result", event.target.value)}
            disabled={state.analysisGameMetadataSaving}
          >
            <option value="*">*</option>
            <option value="1-0">1-0</option>
            <option value="0-1">0-1</option>
            <option value="1/2-1/2">1/2-1/2</option>
          </select>
        </label>
      </div>

      <section className="analysis-metadata-section">
        <div className="analysis-metadata-section-heading">
          <div>
            <strong>{t("metadata.additionalTags")}</strong>
            <span>{t("metadata.additionalTagsDescription")}</span>
          </div>
          <button
            type="button"
            onClick={addCustomTag}
            disabled={state.analysisGameMetadataSaving}
          >
            {t("metadata.addTag")}
          </button>
        </div>

        {customEntries.length === 0 ? (
          <div className="analysis-metadata-empty">{t("metadata.noAdditionalTags")}</div>
        ) : (
          <div className="analysis-metadata-custom-list">
            {customEntries.map(([key, value]) => (
              <div className="analysis-metadata-custom-row" key={key}>
                <input
                  value={key}
                  aria-label={t("metadata.tagName")}
                  onChange={(event) => renameCustomTag(key, event.target.value)}
                  disabled={state.analysisGameMetadataSaving}
                />
                <input
                  value={value}
                  aria-label={t("metadata.tagValue")}
                  onChange={(event) => setTag(key, event.target.value)}
                  disabled={state.analysisGameMetadataSaving}
                />
                <button
                  type="button"
                  onClick={() => removeTag(key)}
                  disabled={state.analysisGameMetadataSaving}
                >
                  {t("common.delete")}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="analysis-metadata-section">
        <div className="analysis-metadata-section-heading">
          <div>
            <strong>{t("metadata.positionTags")}</strong>
            <span>{t("metadata.positionTagsDescription")}</span>
          </div>
        </div>
        <div className="analysis-metadata-readonly-list">
          {PROTECTED_GAME_METADATA_TAGS.map((key) => (
            <div className="analysis-metadata-readonly-row" key={key}>
              <span>{key}</span>
              <code>{draft[key] ?? "—"}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
