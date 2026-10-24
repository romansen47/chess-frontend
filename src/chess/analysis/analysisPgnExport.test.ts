import { describe, expect, it } from "vitest";

import { buildDiagnosticAnalysisPgn } from "./analysisPgnExport";
import type { AnalysisProfilePoint } from "../types";

describe("diagnostic analysis PGN export", () => {
  it("exports rejected extraordinary-candidate diagnostics", () => {
    const profile: AnalysisProfilePoint[] = [
      {
        ply: 0,
        from: null,
        to: null,
        san: "Start",
        evaluation: 0,
        bar: 0.5,
        depth: 0,
        lines: [],
      },
      {
        ply: 1,
        from: "e2",
        to: "e4",
        san: "e4",
        evaluation: 0.7,
        bar: 0.55,
        depth: 30,
        lines: [{ eval: 0.7, depth: 30, moves: "e7e5" }],
        annotation: null,
        annotationDiagnostics: {
          extraordinaryCandidate: true,
          deepDiscoveryRejectedBy: "strengthGainTooSmall",
          earlyWindowStartDepth: 5,
          earlyWindowEndDepth: 8,
          earlySampleCount: 4,
          earlyDepth: 8,
          earlyRank: 1,
          finalDepth: 30,
          finalRank: 1,
          finalRegret: 0,
          earlyRegret: 1.5,
          earlyStrength: 72.4,
          finalStrength: 88.1,
          strengthGain: 15.7,
        },
      },
    ];

    const pgn = buildDiagnosticAnalysisPgn({
      profile,
      whitePlayerName: "White",
      blackPlayerName: "Black",
      engineName: "TestEngine",
    });

    expect(pgn).toContain(
      '[AnalysisFormat "ChessAnalysisTool-Diagnostic-v3"]',
    );
    expect(pgn).toContain("extraCandidate=true");
    expect(pgn).toContain("deepRejectedBy=strengthGainTooSmall");
    expect(pgn).toContain("earlyWindow=5-8");
    expect(pgn).toContain("earlySamples=4");
    expect(pgn).toContain("diagEarlyDepth=8.00");
    expect(pgn).toContain("diagFinalDepth=30.00");
    expect(pgn).toContain("diagFinalRank=1.00");
    expect(pgn).toContain("diagFinalRegret=0.00");
    expect(pgn).toContain("diagStrengthGain=15.70");
  });
});
