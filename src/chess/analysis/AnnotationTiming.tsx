import { useI18n } from "../../i18n/I18nProvider";
import { formatClockTime } from "../game/gameFormatters";
import type { GameAnnotation } from "../types";

export default function AnnotationTiming({ annotation }: { annotation: GameAnnotation | null | undefined }) {
  const { t } = useI18n();
  if (annotation?.clockMillis == null && annotation?.elapsedMoveMillis == null) return null;
  return <dl className="annotation-timing">
    {annotation.clockMillis != null && <>
      <dt>{t("annotations.remainingTime")}</dt>
      <dd>{formatClockTime(annotation.clockMillis / 1000)}</dd>
    </>}
    {annotation.elapsedMoveMillis != null && <>
      <dt>{t("annotations.elapsedTime")}</dt>
      <dd>{formatClockTime(annotation.elapsedMoveMillis / 1000)}</dd>
    </>}
  </dl>;
}
