import { useI18n } from "../../i18n/I18nProvider";
import type { ClockState } from "../types";
import { formatClockTime } from "../game/gameFormatters";
import "./ClockPanel.css";

interface ClockPanelProps {
  clock: ClockState | null;
  clockError: string | null;
  whiteComputerEnabled: boolean;
  blackComputerEnabled: boolean;
  toggleWhiteComputer: () => void;
  toggleBlackComputer: () => void;
}

export default function ClockPanel({
  clock,
  clockError,
  whiteComputerEnabled,
  blackComputerEnabled,
  toggleWhiteComputer,
  toggleBlackComputer,
}: ClockPanelProps) {
  const { t } = useI18n();

  return <div className="clock-area">
    <button type="button"
      className={["clock-box", clock?.sideToMove === "white" ? "clock-active" : "",
        clock?.whiteRunning ? "clock-running" : "", whiteComputerEnabled ? "clock-computer-enabled" : ""].filter(Boolean).join(" ")}
      onClick={toggleWhiteComputer} aria-pressed={whiteComputerEnabled}
      title={whiteComputerEnabled ? t("game.disableWhiteEngine") : t("game.enableWhiteEngine")}>
      <div className="clock-time">{formatClockTime(clock?.whiteTime)}</div>
    </button>
    <button type="button"
      className={["clock-box", clock?.sideToMove === "black" ? "clock-active" : "",
        clock?.blackRunning ? "clock-running" : "", blackComputerEnabled ? "clock-computer-enabled" : ""].filter(Boolean).join(" ")}
      onClick={toggleBlackComputer} aria-pressed={blackComputerEnabled}
      title={blackComputerEnabled ? t("game.disableBlackEngine") : t("game.enableBlackEngine")}>
      <div className="clock-time">{formatClockTime(clock?.blackTime)}</div>
    </button>
    {clockError && <div className="clock-error">{clockError}</div>}
  </div>;
}
