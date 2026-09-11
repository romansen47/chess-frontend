/**
 * Central policy for DeepAnalysis move annotations.
 *
 * These values are intentionally kept in one place because the annotation
 * system is heuristic and will be tuned against real games.
 */
export const MOVE_ANNOTATION_POLICY = {
  onlyMove: {
    finalWinPercentGap: 15.0,
    trivialEarlyStartRatio: 0.30,
    trivialEarlyEndRatio: 0.50,
    trivialWinPercentGap: 10.0,
    trivialSnapshotRatio: 0.70,
    trivialMinSnapshots: 2,
  },
  brilliant: {
    maxFinalRank: 3,
    discoveryEarlyDepthRatio: 0.60,
    discoveryLateDepthRatio: 0.75,
    discoveryWinPercentGain: 15.0,
    materialInvestment: 2.0,
    materialHorizonPlies: 6,
  },
  mistake: {
    pawnLoss: 1.0,
  },
  blunder: {
    pawnLoss: 3.0,
  },
} as const;
