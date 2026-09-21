import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { fetchChessDatabaseStatus } from "../api/chessDatabaseApi";
import type { DatabaseStatus } from "./chessDatabaseTypes";

export function useChessDatabaseStatus() {
  const { t } = useI18n();
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  async function loadStatus() {
    setIsStatusLoading(true);
    setStatusError(null);
    try {
      const nextStatus = await fetchChessDatabaseStatus();
      setStatus(nextStatus);
      if (!nextStatus.available && nextStatus.message) {
        setStatusError(nextStatus.message);
      }
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : t("database.statusReadFailed"),
      );
    } finally {
      setIsStatusLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
    // Initial status load only. Later refreshes are explicit after imports.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    status,
    statusError,
    isStatusLoading,
    loadStatus,
  };
}

export type ChessDatabaseStatusController =
  ReturnType<typeof useChessDatabaseStatus>;
