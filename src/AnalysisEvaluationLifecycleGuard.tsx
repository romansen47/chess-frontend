import { useEffect } from "react";

const ANALYSIS_CONTENT_SELECTOR = ".analysis-replay-content";
const ANALYSIS_EVALUATION_STOP_URL = "/api/analysis-eval/stop";

function stopAnalysisEvaluation(keepalive = false) {
  void fetch(ANALYSIS_EVALUATION_STOP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    keepalive,
  }).catch((error) => {
    console.warn("[AnalysisEvaluationLifecycleGuard] stop failed", error);
  });
}

/**
 * Keeps the analysis-only evaluation engine tied to the lifetime of the
 * analysis view. A stale analysis evaluation process is stopped when the app
 * starts outside analysis mode, when the analysis view disappears, and when
 * the page is unloaded.
 */
export default function AnalysisEvaluationLifecycleGuard() {
  useEffect(() => {
    let previousAnalysisViewPresent: boolean | null = null;
    let scheduled = false;

    const synchronize = () => {
      if (scheduled) {
        return;
      }

      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;

        const analysisViewPresent = document.querySelector(
          ANALYSIS_CONTENT_SELECTOR
        ) !== null;

        if (!analysisViewPresent && previousAnalysisViewPresent !== false) {
          stopAnalysisEvaluation();
        }

        previousAnalysisViewPresent = analysisViewPresent;
      });
    };

    const root = document.getElementById("root");
    const observer = new MutationObserver(synchronize);

    synchronize();

    if (root) {
      observer.observe(root, {
        childList: true,
        subtree: true,
      });
    }

    const handlePageHide = () => {
      stopAnalysisEvaluation(true);
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      observer.disconnect();
      window.removeEventListener("pagehide", handlePageHide);
      stopAnalysisEvaluation(true);
    };
  }, []);

  return null;
}
