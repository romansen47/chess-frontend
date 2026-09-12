import { useI18n } from "../../i18n/I18nProvider";
import type { MoveAnnotation } from "../types";

/**
 * Formats the explanation shown for CAT move-quality annotations.
 *
 * Keeping this in one hook ensures annotations in the move list and on the
 * analysis board explain themselves in exactly the same way.
 */
export function useMoveAnnotationTooltip() {
  const { t, locale } = useI18n();

  function formatNumber(value: number): string {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatEvaluation(value: number): string {
    const formatted = formatNumber(Math.abs(value));
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
  }

  return (annotation: MoveAnnotation): string => {
    if (annotation.kind === "extraordinary") {
      const values = {
        earlyDepth: annotation.earlyDepth ?? 0,
        finalDepth: annotation.finalDepth ?? 0,
        material: formatNumber(annotation.materialInvestment ?? 0),
        earlyStrength: formatNumber(annotation.earlyStrength ?? 0),
        finalStrength: formatNumber(annotation.finalStrength ?? 0),
        compensationPlies: annotation.materialCompensationPlies ?? 0,
      };

      if (
        annotation.extraordinaryReason ===
          "deepDiscoveryAndMaterialSacrifice"
      ) {
        return `${annotation.symbol} · ${t(
          "analysis.moveAnnotationExtraordinaryCombined",
          values
        )}`;
      }

      if (annotation.extraordinaryReason === "materialSacrifice") {
        if (
          annotation.shortTermMaterialCompensated === true &&
          annotation.sacrificeType !== "activeInvestment"
        ) {
          return `${annotation.symbol} · ${t(
            "analysis.moveAnnotationExtraordinaryShortTermCompensation",
            values
          )}`;
        }

        const key =
          annotation.sacrificeType === "activeInvestment"
            ? "analysis.moveAnnotationExtraordinaryActiveSacrifice"
            : annotation.sacrificeType === "newMaterialOffer"
              ? "analysis.moveAnnotationExtraordinaryMaterialOffer"
              : "analysis.moveAnnotationExtraordinaryDeclinedSave";

        return `${annotation.symbol} · ${t(key, values)}`;
      }

      if (annotation.extraordinaryReason === "deepDiscovery") {
        return `${annotation.symbol} · ${t(
          "analysis.moveAnnotationExtraordinaryDiscovery",
          values
        )}`;
      }
    }

    if (annotation.kind === "onlyMove" && annotation.secondBestEvaluation != null) {
      return `${annotation.symbol} · ${t("analysis.moveAnnotationOnlyMove", {
        best: formatEvaluation(annotation.bestEvaluation),
        second: formatEvaluation(annotation.secondBestEvaluation),
      })}`;
    }

    return `${annotation.symbol} · ${t("analysis.moveAnnotationLoss", {
      loss: formatNumber(annotation.winChanceLoss ?? 0),
      best: formatEvaluation(annotation.bestEvaluation),
    })}`;
  };
}
