import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  cancelDatabaseImport,
  fetchDatabaseImportJob,
  startDatabaseImport,
} from "../api/chessDatabaseApi";
import type { DatabaseImportJob } from "./chessDatabaseTypes";

interface Options {
  refreshStatus: () => Promise<void>;
}

export function useChessDatabaseImport({ refreshStatus }: Options) {
  const { t } = useI18n();
  const [importFileName, setImportFileName] = useState("");
  const [isImportStarting, setIsImportStarting] = useState(false);
  const [importJob, setImportJob] = useState<DatabaseImportJob | null>(null);
  const [importStartError, setImportStartError] = useState<string | null>(null);
  const [cancelRequested, setCancelRequested] = useState(false);

  async function refreshImportJob(importId: string) {
    try {
      const nextJob = await fetchDatabaseImportJob(importId);
      setImportJob(nextJob);
      if (nextJob.status !== "RUNNING") {
        setCancelRequested(false);
        await refreshStatus();
      }
    } catch (error) {
      setImportStartError(
        error instanceof Error
          ? error.message
          : "Could not read import progress.",
      );
    }
  }

  useEffect(() => {
    const importId = importJob?.id;
    if (!importId || importJob.status !== "RUNNING") {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshImportJob(importId);
    }, 400);

    return () => window.clearInterval(timer);
    // Polling is intentionally keyed only by import identity/status.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importJob?.id, importJob?.status]);

  async function startImport(file: File) {
    setImportFileName(file.name);
    setImportJob(null);
    setImportStartError(null);
    setCancelRequested(false);
    setIsImportStarting(true);

    try {
      const job = await startDatabaseImport(file);
      setImportJob(job);
      if (job.status !== "RUNNING") {
        await refreshStatus();
      }
    } catch (error) {
      setImportStartError(
        error instanceof Error
          ? error.message
          : t("database.importStartFailed"),
      );
    } finally {
      setIsImportStarting(false);
    }
  }

  async function cancelImport() {
    if (!importJob || importJob.status !== "RUNNING") {
      return;
    }

    setCancelRequested(true);
    try {
      setImportJob(await cancelDatabaseImport(importJob.id));
    } catch (error) {
      setCancelRequested(false);
      setImportStartError(
        error instanceof Error
          ? error.message
          : t("database.importCancelFailed"),
      );
    }
  }

  function resetImport() {
    if (isImportStarting || importJob?.status === "RUNNING") {
      return false;
    }
    setImportJob(null);
    setImportStartError(null);
    setCancelRequested(false);
    return true;
  }

  return {
    importFileName,
    isImportStarting,
    importJob,
    importStartError,
    cancelRequested,
    startImport,
    cancelImport,
    resetImport,
  };
}

export type ChessDatabaseImportController =
  ReturnType<typeof useChessDatabaseImport>;
