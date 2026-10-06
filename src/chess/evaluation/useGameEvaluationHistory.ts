import { useEffect, useState } from "react";
import type { EngineEvaluation } from "../types";
import {
  recordEvaluationHistoryPoint,
  resetEvaluationHistoryForPly,
  type EvaluationHistoryPoint,
} from "./evaluationHistory";

interface GameEvaluationHistoryOptions {
  evaluation: EngineEvaluation | null;
  evaluationPly: number | null;
  currentPly: number;
}

export function useGameEvaluationHistory({
  evaluation,
  evaluationPly,
  currentPly,
}: GameEvaluationHistoryOptions) {
  const [points, setPoints] = useState<EvaluationHistoryPoint[]>([]);

  useEffect(() => {
    setPoints((current) =>
      resetEvaluationHistoryForPly(current, currentPly)
    );
  }, [currentPly]);

  useEffect(() => {
    if (!evaluation || evaluationPly == null) return;
    setPoints((current) =>
      recordEvaluationHistoryPoint(current, evaluationPly, evaluation)
    );
  }, [evaluation, evaluationPly]);

  return points;
}
