import { useI18n } from "../../i18n/I18nProvider";
import type { HistoricalClock } from "../analysis/historicalClock";
import { formatClockTime } from "../game/gameFormatters";
import "./ClockPanel.css";

interface ClockPanelProps {
  clock: HistoricalClock | null;
  readOnly?: boolean;
  clockError?: string | null;
  whiteComputerEnabled?: boolean;
  blackComputerEnabled?: boolean;
  toggleWhiteComputer?: () => void;
  toggleBlackComputer?: () => void;
}

export default function ClockPanel({
  clock,
  readOnly = false,
  clockError,
  whiteComputerEnabled,
  blackComputerEnabled,
  toggleWhiteComputer,
  toggleBlackComputer,
}: ClockPanelProps) {
  const { t } = useI18n();
  const ClockBox = readOnly ? "div" : "button";

  return <div className={`clock-area${readOnly ? " clock-history" : ""}`}>
    <ClockBox type={readOnly ? undefined : "button"}
      className={["clock-box", clock?.sideToMove === "white" ? "clock-active" : "",
        clock?.whiteRunning ? "clock-running" : "", whiteComputerEnabled ? "clock-computer-enabled" : ""].filter(Boolean).join(" ")}
      onClick={readOnly ? undefined : toggleWhiteComputer} aria-pressed={readOnly ? undefined : whiteComputerEnabled}
      aria-label={t("common.white")}
      title={readOnly ? t("annotations.remainingTime") : whiteComputerEnabled ? t("game.disableWhiteEngine") : t("game.enableWhiteEngine")}>
      <div className="clock-time">{formatClockTime(clock?.whiteTime)}</div>
    </ClockBox>
    <ClockBox type={readOnly ? undefined : "button"}
      className={["clock-box", clock?.sideToMove === "black" ? "clock-active" : "",
        clock?.blackRunning ? "clock-running" : "", blackComputerEnabled ? "clock-computer-enabled" : ""].filter(Boolean).join(" ")}
      onClick={readOnly ? undefined : toggleBlackComputer} aria-pressed={readOnly ? undefined : blackComputerEnabled}
      aria-label={t("common.black")}
      title={readOnly ? t("annotations.remainingTime") : blackComputerEnabled ? t("game.disableBlackEngine") : t("game.enableBlackEngine")}>
      <div className="clock-time">{formatClockTime(clock?.blackTime)}</div>
    </ClockBox>
    {clockError && <div className="clock-error">{clockError}</div>}
  </div>;
}
