import type {
  AnalysisProfilePoint,
  EngineLine,
  MoveAnnotation,
} from "../types";

export interface DiagnosticAnalysisPgnOptions {
  profile: AnalysisProfilePoint[];
  whitePlayerName: string;
  blackPlayerName: string;
  engineName?: string | null;
}

function escapeTagValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function sanitizeCommentValue(value: string): string {
  return value
    .replace(/[{}]/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/"/g, "'");
}

function number(value: number | null | undefined): string | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(2)
    : null;
}

function normalizeSanForPgn(san: string | null | undefined): string {
  if (!san || !san.trim()) {
    return "--";
  }

  return san
    .trim()
    .replaceAll("♔", "K")
    .replaceAll("♚", "K")
    .replaceAll("♕", "Q")
    .replaceAll("♛", "Q")
    .replaceAll("♖", "R")
    .replaceAll("♜", "R")
    .replaceAll("♗", "B")
    .replaceAll("♝", "B")
    .replaceAll("♘", "N")
    .replaceAll("♞", "N")
    .replace(/0-0-0/g, "O-O-O")
    .replace(/0-0/g, "O-O")
    .replace(/\s+e\.p\.(?=[+#]?$)/i, "");
}

function addAnnotationDiagnostics(
  parts: string[],
  annotation: MoveAnnotation | null | undefined
) {
  if (!annotation) {
    return;
  }

  parts.push(`class=${annotation.kind}`);
  parts.push(`symbol=${annotation.symbol}`);

  if (annotation.extraordinaryReason) {
    parts.push(`reason=${annotation.extraordinaryReason}`);
  }
  if (annotation.sacrificeType) {
    parts.push(`sacrificeType=${annotation.sacrificeType}`);
  }

  const optionalNumbers: Array<[string, number | null | undefined]> = [
    ["bestEvalBefore", annotation.bestEvaluation],
    ["secondBestEvalBefore", annotation.secondBestEvaluation],
    ["winChanceLoss", annotation.winChanceLoss],
    ["investment", annotation.materialInvestment],
    ["earlyDepth", annotation.earlyDepth],
    ["earlyRank", annotation.earlyRank],
    ["finalDepth", annotation.finalDepth],
    ["finalRank", annotation.finalRank],
    ["earlyRegret", annotation.earlyRegret],
    ["earlyStrength", annotation.earlyStrength],
    ["finalStrength", annotation.finalStrength],
  ];

  for (const [key, value] of optionalNumbers) {
    const formatted = number(value);
    if (formatted !== null) {
      parts.push(`${key}=${formatted}`);
    }
  }

  if (annotation.givesCheck !== null && annotation.givesCheck !== undefined) {
    parts.push(`givesCheck=${annotation.givesCheck}`);
  }
}

function addEngineLines(
  parts: string[],
  prefix: "prePv" | "postPv",
  lines: EngineLine[] | undefined
) {
  for (const [index, line] of (lines ?? []).slice(0, 3).entries()) {
    const ordinal = index + 1;
    const evalText = number(line.eval);
    if (evalText !== null) {
      parts.push(`${prefix}${ordinal}Eval=${evalText}`);
    }
    parts.push(`${prefix}${ordinal}Depth=${line.depth}`);
    if (line.mateDistance !== null && line.mateDistance !== undefined) {
      parts.push(`${prefix}${ordinal}Mate=${line.mateDistance}`);
    }
    if (line.moves?.trim()) {
      parts.push(
        `${prefix}${ordinal}="${sanitizeCommentValue(line.moves.trim())}"`
      );
    }
  }
}

function diagnosticComment(
  point: AnalysisProfilePoint,
  previousPoint: AnalysisProfilePoint | undefined
): string {
  const parts = [
    `[%eval ${point.evaluation.toFixed(2)}]`,
    `[%depth ${point.depth}]`,
  ];

  addAnnotationDiagnostics(parts, point.annotation);
  addEngineLines(parts, "prePv", previousPoint?.lines);
  addEngineLines(parts, "postPv", point.lines);

  return `{ ${parts.join(" ")} }`;
}

function inferredResult(points: AnalysisProfilePoint[]): string {
  const last = points[points.length - 1];
  const san = normalizeSanForPgn(last?.san);
  if (!san.endsWith("#") || !last) {
    return "*";
  }
  return last.ply % 2 === 1 ? "1-0" : "0-1";
}

function pgnDate(): string {
  const now = new Date();
  const year = now.getFullYear().toString().padStart(4, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export function buildDiagnosticAnalysisPgn({
  profile,
  whitePlayerName,
  blackPlayerName,
  engineName,
}: DiagnosticAnalysisPgnOptions): string {
  const points = profile
    .filter((point) => point.ply > 0)
    .sort((left, right) => left.ply - right.ply);
  const byPly = new Map(profile.map((point) => [point.ply, point]));
  const result = inferredResult(points);

  const headers = [
    '[Event "ChessAnalysisTool diagnostic export"]',
    '[Site "ChessAnalysisTool"]',
    `[Date "${pgnDate()}"]`,
    '[Round "-"]',
    `[White "${escapeTagValue(whitePlayerName || "White")}"]`,
    `[Black "${escapeTagValue(blackPlayerName || "Black")}"]`,
    `[Result "${result}"]`,
    `[Annotator "${escapeTagValue(engineName || "ChessAnalysisTool")}"]`,
    '[AnalysisFormat "ChessAnalysisTool-Diagnostic-v2"]',
  ];

  const moveLines: string[] = [];
  let currentLine = "";

  for (const point of points) {
    const san = normalizeSanForPgn(point.san);
    const comment = diagnosticComment(point, byPly.get(point.ply - 1));
    const moveNumber = Math.ceil(point.ply / 2);

    if (point.ply % 2 === 1) {
      if (currentLine) {
        moveLines.push(currentLine.trim());
      }
      currentLine = `${moveNumber}. ${san} ${comment}`;
    } else {
      currentLine += ` ${san} ${comment}`;
    }
  }

  if (currentLine) {
    moveLines.push(currentLine.trim());
  }

  const movetext = moveLines.length > 0
    ? `${moveLines.join("\n")} ${result}`
    : result;

  return `${headers.join("\n")}\n\n${movetext}\n`;
}
