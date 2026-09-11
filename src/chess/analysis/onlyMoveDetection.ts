import type { AnalysisProfilePoint } from "../types";
import { MOVE_ANNOTATION_POLICY } from "./moveAnnotationPolicy";
import {
  moverScore,
  rankDepthCandidates,
  winPercentFromMoverScore,
} from "./moveAnnotationScoring";

export function isTrivialOnlyMove(
  previous: AnalysisProfilePoint,
  actualPosition: string,
  ply: number
): boolean {
  const policy = MOVE_ANNOTATION_POLICY.onlyMove;
  const snapshots = (previous.depthSnapshots ?? [])
    .filter(
      (snapshot) =>
        snapshot.depth > 0 &&
        snapshot.candidates.length >= 2
    )
    .slice()
    .sort((left, right) => left.depth - right.depth);

  if (snapshots.length < policy.trivialMinSnapshots) {
    return false;
  }

  const finalDepth = Math.max(
    previous.depth,
    snapshots[snapshots.length - 1]?.depth ?? 0
  );
  if (finalDepth <= 0) {
    return false;
  }

  const earlyStartDepth = Math.max(
    1,
    Math.ceil(finalDepth * policy.trivialEarlyStartRatio)
  );
  const earlyEndDepth = Math.max(
    earlyStartDepth,
    Math.floor(finalDepth * policy.trivialEarlyEndRatio)
  );

  const earlySnapshots = snapshots.filter(
    (snapshot) =>
      snapshot.depth >= earlyStartDepth &&
      snapshot.depth <= earlyEndDepth
  );

  if (earlySnapshots.length < policy.trivialMinSnapshots) {
    return false;
  }

  const obviousSnapshots = earlySnapshots.filter((snapshot) => {
    const ranked = rankDepthCandidates(snapshot, ply);
    if (ranked.length < 2 || ranked[0].position !== actualPosition) {
      return false;
    }

    const bestScore = moverScore(ranked[0].evaluation, ply);
    const secondBestScore = moverScore(ranked[1].evaluation, ply);
    const winPercentGap =
      winPercentFromMoverScore(bestScore) -
      winPercentFromMoverScore(secondBestScore);

    return winPercentGap >= policy.trivialWinPercentGap;
  }).length;

  return (
    obviousSnapshots / earlySnapshots.length >=
    policy.trivialSnapshotRatio
  );
}
