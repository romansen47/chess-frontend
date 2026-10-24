import type { ReactNode } from "react";
import AnalysisProfilePanel from "./AnalysisProfilePanel";
import type {
  AnalysisReplayContentActions,
  AnalysisReplayContentState,
} from "./analysisReplayViewTypes";

interface Props {
  state: AnalysisReplayContentState;
  actions: AnalysisReplayContentActions;
  children?: ReactNode;
}

/**
 * Shared composition boundary for the analysis profile and all content below it.
 *
 * <p>CAT deliberately renders the detail area only after deep analysis has
 * completed or been cancelled. Using the terminal replay state avoids brief
 * detail-tab flashes during preparation/resume transitions. Desktop and mobile
 * use this same component so the visibility rule cannot drift between layouts.</p>
 */
export default function AnalysisProfileContent({
  state,
  actions,
  children,
}: Props) {
  return (
    <>
      <AnalysisProfilePanel state={state} actions={actions} />
      {state.analysisReplayFinished && !state.isAnalysisReplayRunning && children}
    </>
  );
}
