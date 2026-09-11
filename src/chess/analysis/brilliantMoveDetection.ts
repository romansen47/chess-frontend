import type { AnalysisProfilePoint, EngineLine } from "../types";
import type { BrilliantReason } from "./moveAnnotationModel";
import { MOVE_ANNOTATION_POLICY } from "./moveAnnotationPolicy";
import {
  materialInvestmentAlongLine,
  moverScore,
  rankDepthCandidates,
  winPercentFromMoverScore,
} from "./moveAnnotationScoring";

export interface BrilliantEvidence {
  reason: BrilliantReason;
  materialInvestment?: number;
  earlyDepth?: number;
  earlyRank?: number;
  finalDepth: number;
  finalRank: number;
}

interface DeepDiscoveryEvidence {
  earlyDepth: number;
  earlyRank?: number;
  finalDepth: number;
}

function findDeepDiscoveryEvidence(
  previous: AnalysisProfilePoint,
  finalPlayed: EngineLine,
  actualPosition: string,
  ply: number
): DeepDiscoveryEvidence | null {
  const policy = MOVE_ANNOTATION_POLICY.brilliant;
  const snapshots = (previous.depthSnapshots ?? [])
    .filter(
      (snapshot) =>
        snapshot.depth > 0 &&
        snapshot.candidates.length >= policy.maxFinalRank
    )
    .slice()
    .sort((left, right) => left.depth - right.depth);

  if (snapshots.length < 3) {
    return null;
  }

  const finalDepth = Math.max(
    previous.depth,
    snapshots[snapshots.length - 1]?.depth ?? 0
  );
  if (finalDepth <= 0) {
    return null;
  }

  const earlyDepthLimit = Math.max(
    1,
    Math.floor(finalDepth * policy.discoveryEarlyDepthRatio)
  );
  const earlySnapshots = snapshots.filter(
    (snapshot) => snapshot.depth <= earlyDepthLimit
  );
  const earlySnapshot = earlySnapshots[earlySnapshots.length - 1];
  if (!earlySnapshot) {
    return null;
  }

  const earlyCandidates = rankDepthCandidates(earlySnapshot, ply);
  const earlyPlayedIndex = earlyCandidates.findIndex(
    (candidate) => candidate.position === actualPosition
  );
  const finalPlayedScore = moverScore(finalPlayed.eval, ply);

  const wasOutsideTopThree =
    earlyPlayedIndex < 0 ||
    earlyPlayedIndex >= policy.maxFinalRank;

  let gainedWinningChance = false;
  if (earlyPlayedIndex >= 0) {
    const earlyPlayedScore = moverScore(
      earlyCandidates[earlyPlayedIndex].evaluation,
      ply
    );
    const winPercentGain =
      winPercentFromMoverScore(finalPlayedScore) -
      winPercentFromMoverScore(earlyPlayedScore);
    gainedWinningChance =
      winPercentGain >= policy.discoveryWinPercentGain;
  }

  if (!wasOutsideTopThree && !gainedWinningChance) {
    return null;
  }

  // Avoid one-depth spikes: the move must remain Top 3 in at least two of
  // the last three sufficiently deep snapshots.
  const lateDepthStart = Math.max(
    1,
    Math.ceil(finalDepth * policy.discoveryLateDepthRatio)
  );
  const lateSnapshots = snapshots
    .filter((snapshot) => snapshot.depth >= lateDepthStart)
    .slice(-3);

  if (lateSnapshots.length < 2) {
    return null;
  }

  const stableTopThreeCount = lateSnapshots.filter((snapshot) => {
    const ranked = rankDepthCandidates(snapshot, ply);
    const rank = ranked.findIndex(
      (candidate) => candidate.position === actualPosition
    );
    return rank >= 0 && rank < policy.maxFinalRank;
  }).length;

  if (stableTopThreeCount < 2) {
    return null;
  }

  return {
    earlyDepth: earlySnapshot.depth,
    earlyRank:
      earlyPlayedIndex >= 0 ? earlyPlayedIndex + 1 : undefined,
    finalDepth,
  };
}

export function findBrilliantEvidence(
  previous: AnalysisProfilePoint,
  finalCandidates: EngineLine[],
  actualPosition: string,
  ply: number
): BrilliantEvidence | null {
  const policy = MOVE_ANNOTATION_POLICY.brilliant;

  // Both brilliant-move paths require a reliable final Top-3 placement.
  if (finalCandidates.length < policy.maxFinalRank) {
    return null;
  }

  const finalPlayedIndex = finalCandidates.findIndex(
    (line) => line.positions?.[1] === actualPosition
  );
  if (
    finalPlayedIndex < 0 ||
    finalPlayedIndex >= policy.maxFinalRank
  ) {
    return null;
  }

  const finalPlayed = finalCandidates[finalPlayedIndex];
  const deepDiscovery = findDeepDiscoveryEvidence(
    previous,
    finalPlayed,
    actualPosition,
    ply
  );

  const materialInvestment = materialInvestmentAlongLine(
    finalPlayed,
    ply,
    policy.materialHorizonPlies
  );
  const hasMaterialInvestment =
    materialInvestment >= policy.materialInvestment;

  if (!deepDiscovery && !hasMaterialInvestment) {
    return null;
  }

  const reason: BrilliantReason =
    deepDiscovery && hasMaterialInvestment
      ? "deepDiscoveryAndMaterialInvestment"
      : deepDiscovery
        ? "deepDiscovery"
        : "materialInvestment";

  return {
    reason,
    materialInvestment: hasMaterialInvestment
      ? materialInvestment
      : undefined,
    earlyDepth: deepDiscovery?.earlyDepth,
    earlyRank: deepDiscovery?.earlyRank,
    finalDepth:
      deepDiscovery?.finalDepth ??
      Math.max(previous.depth, finalPlayed.depth),
    finalRank: finalPlayedIndex + 1,
  };
}
