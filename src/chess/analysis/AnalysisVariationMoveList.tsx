import { useI18n } from "../../i18n/I18nProvider";
import type { AnalysisVariationMove } from "../types";
import { buildAnalysisVariationMoveRows } from "./analysisVariationMoveRows";

interface Props {
  anchorPly: number;
  moves: readonly AnalysisVariationMove[];
}

export default function AnalysisVariationMoveList({ anchorPly, moves }: Props) {
  const { t } = useI18n();
  const rows = buildAnalysisVariationMoveRows(anchorPly, moves);

  return (
    <section className="analysis-variation-move-list" aria-label={t("analysis.continuationMoves")}>
      <div className="analysis-variation-move-list-title">{t("analysis.continuationMoves")}</div>
      {rows.length === 0 ? (
        <div className="analysis-variation-move-list-empty">
          {t("analysis.noContinuationMoves")}
        </div>
      ) : rows.map((row) => (
        <div className="analysis-variation-move-row" key={row.moveNumber}>
          <span className="analysis-variation-move-number">{row.moveNumber}.</span>
          <span className="analysis-variation-move">{row.white ?? ""}</span>
          <span className="analysis-variation-move">{row.black ?? ""}</span>
        </div>
      ))}
    </section>
  );
}
