import type { EngineLine } from "../../types";

export type UciSideToMove = "white" | "black";

export class UciInfoParser {
  private readonly linesByDepth = new Map<number, Map<number, EngineLine>>();
  private highestSeenDepth = 0;
  private lastEmittedDepth = 0;

  constructor(
    private readonly sideToMove: UciSideToMove,
    private readonly requestedVariants: number,
  ) {
    if (!Number.isInteger(requestedVariants) || requestedVariants < 1) {
      throw new Error("requestedVariants must be a positive integer");
    }
  }

  push(rawLine: string): EngineLine[] | null {
    const parsed = parseInfoLine(rawLine, this.sideToMove, this.requestedVariants);
    if (parsed === null) return null;

    let rolloverSnapshot: EngineLine[] | null = null;
    if (parsed.depth > this.highestSeenDepth) {
      rolloverSnapshot = this.selectDepthSnapshot(this.highestSeenDepth, false);
      this.highestSeenDepth = parsed.depth;
    }

    const depthLines = this.linesByDepth.get(parsed.depth)
      ?? new Map<number, EngineLine>();

    if (parsed.line === null) {
      depthLines.delete(parsed.multiPv);
    } else {
      depthLines.set(parsed.multiPv, parsed.line);
    }
    this.linesByDepth.set(parsed.depth, depthLines);

    const completeSnapshot = this.selectDepthSnapshot(parsed.depth, true);
    if (completeSnapshot !== null) return completeSnapshot;
    return rolloverSnapshot;
  }

  flush(): EngineLine[] | null {
    const depths = [...this.linesByDepth.keys()].sort((a, b) => b - a);
    for (const depth of depths) {
      const snapshot = this.selectDepthSnapshot(depth, false);
      if (snapshot !== null) return snapshot;
    }
    return null;
  }

  private selectDepthSnapshot(
    depth: number,
    requireRequestedVariants: boolean,
  ): EngineLine[] | null {
    if (depth <= this.lastEmittedDepth) return null;

    const depthLines = this.linesByDepth.get(depth);
    if (!depthLines) return null;

    const contiguousCount = countContiguousVariants(
      depthLines,
      this.requestedVariants,
    );
    if (contiguousCount === 0) return null;
    if (requireRequestedVariants && contiguousCount < this.requestedVariants) {
      return null;
    }

    const result: EngineLine[] = [];
    for (let multiPv = 1; multiPv <= contiguousCount; multiPv++) {
      const line = depthLines.get(multiPv);
      if (!line) return null;
      result.push(line);
    }

    this.lastEmittedDepth = depth;
    return result;
  }
}

interface ParsedInfoLine {
  depth: number;
  multiPv: number;
  line: EngineLine | null;
}

function parseInfoLine(
  rawLine: string,
  sideToMove: UciSideToMove,
  requestedVariants: number,
): ParsedInfoLine | null {
  const tokens = rawLine.trim().split(/\s+/);
  if (tokens[0] !== "info") return null;

  const depth = readIntegerAfter(tokens, "depth");
  if (depth === null || depth < 1) return null;

  const pvIndex = tokens.indexOf("pv");
  if (pvIndex < 0 || pvIndex === tokens.length - 1) return null;

  const parsedMultiPv = readIntegerAfter(tokens, "multipv");
  const multiPv = parsedMultiPv ?? 1;
  if (multiPv < 1 || multiPv > requestedVariants) return null;

  const scoreIndex = tokens.indexOf("score");
  if (scoreIndex < 0 || scoreIndex + 2 >= tokens.length) return null;

  const scoreType = tokens[scoreIndex + 1];
  const scoreValue = Number(tokens[scoreIndex + 2]);
  if (!Number.isFinite(scoreValue)) return null;

  let evaluation: number;
  let mateDistance: number | null = null;

  if (scoreType === "mate") {
    if (scoreValue === 0) {
      return { depth, multiPv, line: null };
    }
    evaluation = Math.sign(scoreValue) * 99;
    mateDistance = Math.abs(scoreValue);
  } else if (scoreType === "cp") {
    evaluation = scoreValue / 100;
  } else {
    return null;
  }

  if (sideToMove === "black") {
    evaluation *= -1;
  }

  return {
    depth,
    multiPv,
    line: {
      eval: evaluation,
      depth,
      mateDistance,
      moves: tokens.slice(pvIndex + 1).join(" "),
    },
  };
}

function readIntegerAfter(tokens: string[], key: string): number | null {
  const index = tokens.indexOf(key);
  if (index < 0 || index + 1 >= tokens.length) return null;

  const value = Number(tokens[index + 1]);
  return Number.isInteger(value) ? value : null;
}

function countContiguousVariants(
  lines: ReadonlyMap<number, EngineLine>,
  maximum: number,
): number {
  let count = 0;
  for (let multiPv = 1; multiPv <= maximum; multiPv++) {
    if (!lines.has(multiPv)) break;
    count++;
  }
  return count;
}
