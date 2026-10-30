import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  fetchActiveAnalysisEngineLog,
  type EngineLogEntry,
} from "../api/engineLogApi";
import EngineCommunicationLog from "../engine/EngineCommunicationLog";

const POLL_INTERVAL_MS = 400;

export default function AnalysisEngineOutput() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<EngineLogEntry[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeout: number | null = null;

    async function refresh() {
      try {
        const next = await fetchActiveAnalysisEngineLog();
        if (!mounted) return;
        setEntries(next);
        setFailed(false);
      } catch {
        if (mounted) setFailed(true);
      } finally {
        if (mounted) {
          timeout = window.setTimeout(() => void refresh(), POLL_INTERVAL_MS);
        }
      }
    }

    void refresh();
    return () => {
      mounted = false;
      if (timeout != null) window.clearTimeout(timeout);
    };
  }, []);

  return (
    <section
      className="analysis-engine-output"
      aria-label={t("settings.engineLog")}
    >
      <div className="analysis-engine-output-heading">
        <strong>{t("settings.engineLog")}</strong>
        <span>{t("engine.protocol")}</span>
      </div>
      {failed && (
        <div className="analysis-engine-output-error">
          {t("common.error")}
        </div>
      )}
      <EngineCommunicationLog
        entries={entries}
        emptyText={t("engine.noCommunication")}
        followLatest
      />
    </section>
  );
}
