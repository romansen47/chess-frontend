import { useEffect, useState } from "react";
import { useI18n } from "./i18n/I18nProvider";
import "./AnalysisDatabasePanel.css";

interface DatabasePositionMove {
  uci: string;
  san: string | null;
  games: number;
  whiteWins: number;
  draws: number;
  blackWins: number;
}

interface DatabasePositionResult {
  ply: number;
  games: number;
  moves: DatabasePositionMove[];
}

interface AnalysisDatabasePanelProps {
  ply: number | null;
}

function percentage(value: number, total: number): string {
  if (total <= 0) {
    return "0.0%";
  }
  return `${((value * 100) / total).toFixed(1)}%`;
}

export default function AnalysisDatabasePanel({ ply }: AnalysisDatabasePanelProps) {
  const { t } = useI18n();
  const [result, setResult] = useState<DatabasePositionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ply == null) {
      setResult(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    void fetch(`/api/chess-database/position?ply=${encodeURIComponent(String(ply))}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
        return response.json() as Promise<DatabasePositionResult>;
      })
      .then((data) => {
        setResult(data);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") {
          return;
        }
        setResult(null);
        setError(reason instanceof Error ? reason.message : t("analysis.databaseQueryFailed"));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [ply]);

  if (ply == null) {
    return (
      <div className="analysis-database-placeholder">
        {t("database.selectMove")}
      </div>
    );
  }

  if (isLoading) {
    return <div className="analysis-database-placeholder">{t("database.querying")}</div>;
  }

  if (error) {
    return (
      <div className="analysis-database-placeholder analysis-database-error">
        {error}
      </div>
    );
  }

  if (!result || result.moves.length === 0) {
    return (
      <div className="analysis-database-placeholder">
        {t("database.noPosition")}
      </div>
    );
  }

  return (
    <div className="analysis-database-content">
      <div className="analysis-database-summary">
        <span>{t("database.local")}</span>
        <strong>{result.games.toLocaleString()} continuations</strong>
      </div>

      <div className="analysis-database-table-wrap">
        <table className="analysis-database-table">
          <thead>
            <tr>
              <th>{t("common.move")}</th>
              <th>{t("common.games")}</th>
              <th>{t("common.white")}</th>
              <th>{t("common.draw")}</th>
              <th>{t("common.black")}</th>
            </tr>
          </thead>
          <tbody>
            {result.moves.map((move) => (
              <tr key={move.uci}>
                <td>
                  <strong>{move.san || move.uci}</strong>
                  <span className="analysis-database-uci">{move.uci}</span>
                </td>
                <td>{move.games.toLocaleString()}</td>
                <td title={`${move.whiteWins.toLocaleString()} white wins`}>
                  {percentage(move.whiteWins, move.games)}
                </td>
                <td title={`${move.draws.toLocaleString()} draws`}>
                  {percentage(move.draws, move.games)}
                </td>
                <td title={`${move.blackWins.toLocaleString()} black wins`}>
                  {percentage(move.blackWins, move.games)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
