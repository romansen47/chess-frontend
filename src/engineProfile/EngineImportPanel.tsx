import type { EngineDefinition } from "../engineConfig";
import { useI18n } from "../i18n/I18nProvider";

interface Props {
  discoveredEngines: EngineDefinition[];
  importDraft: EngineDefinition | null;
  manualEnginePath: string;
  manualEngineName: string;
  busy: boolean;
  onSelectDiscoveredEngine: (enginePath: string) => void;
  onManualEnginePathChange: (value: string) => void;
  onManualEngineNameChange: (value: string) => void;
  onInspectEngine: () => void;
  onCancel: () => void;
  onImport: () => void;
}

export default function EngineImportPanel({
  discoveredEngines,
  importDraft,
  manualEnginePath,
  manualEngineName,
  busy,
  onSelectDiscoveredEngine,
  onManualEnginePathChange,
  onManualEngineNameChange,
  onInspectEngine,
  onCancel,
  onImport,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="engine-profile-editor-card">
      <div className="engine-config-details-heading">
        <div>
          <strong>{t("settings.importEngine")}</strong>
          <span>{t("settings.importEngineDescription")}</span>
        </div>
      </div>

      <label className="engine-profile-field">
        <span>{t("settings.discoveredServerEngines")}</span>
        <select
          value={importDraft?.engine ?? ""}
          onChange={(event) => onSelectDiscoveredEngine(event.target.value)}
          disabled={busy || discoveredEngines.length === 0}
        >
          <option value="">
            {discoveredEngines.length === 0
              ? t("settings.noDiscoveredServerEngines")
              : t("settings.chooseDiscoveredEngine")}
          </option>
          {discoveredEngines.map((candidate) => (
            <option key={candidate.engine} value={candidate.engine}>
              {candidate.name} · {candidate.engineName}
            </option>
          ))}
        </select>
      </label>

      <details className="engine-profile-manual-import">
        <summary>{t("settings.manualEngineSetup")}</summary>
        <div className="engine-profile-manual-import-fields">
          <label className="engine-profile-field">
            <span>{t("settings.enginePathFallback")}</span>
            <input
              value={manualEnginePath}
              onChange={(event) => onManualEnginePathChange(event.target.value)}
              placeholder="/usr/games/stockfish"
            />
          </label>
          <label className="engine-profile-field">
            <span>{t("settings.engineNameOptional")}</span>
            <input
              value={manualEngineName}
              onChange={(event) => onManualEngineNameChange(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={onInspectEngine}
            disabled={busy || !manualEnginePath.trim()}
          >
            {busy ? t("settings.inspecting") : t("settings.useEnteredPath")}
          </button>
        </div>
      </details>

      {importDraft && (
        <div className="engine-profile-engine-summary">
          <div>
            <span>{t("settings.engineName")}</span>
            <strong>{manualEngineName || importDraft.name}</strong>
          </div>
          <div>
            <span>{t("settings.uciName")}</span>
            <strong>{importDraft.engineName || "–"}</strong>
          </div>
          <div>
            <span>{t("common.author")}</span>
            <strong>{importDraft.engineAuthor || "–"}</strong>
          </div>
          <div>
            <span>{t("common.options")}</span>
            <strong>{Object.keys(importDraft.options).length}</strong>
          </div>
          <div className="engine-profile-summary-path">
            <span>{t("engine.executable")}</span>
            <strong>{importDraft.engine}</strong>
          </div>
        </div>
      )}

      <div className="engine-config-actions engine-config-actions-footer">
        <button type="button" onClick={onCancel} disabled={busy}>
          {t("common.cancel")}
        </button>
        <div className="engine-config-actions-spacer" />
        <button
          type="button"
          onClick={onImport}
          disabled={busy || !importDraft}
        >
          {busy ? t("settings.saving") : t("settings.importEngine")}
        </button>
      </div>
    </div>
  );
}
