import { describe, expect, it } from "vitest";
import contractSource from "../../../../../contracts/uci-info-contract.tsv?raw";
import { UciInfoParser, type UciSideToMove } from "./UciInfoParser";

interface ContractCase {
  name: string;
  usable: boolean;
  depth: number | null;
  whiteEval: number | null;
  blackEval: number | null;
  mateDistance: number | null;
  pv: string | null;
  line: string;
}

function nullableNumber(value: string): number | null {
  return value === "-" ? null : Number(value);
}

function loadContract(): ContractCase[] {
  return contractSource.trim().split(/\r?\n/).slice(1).map((row) => {
    const [name, usable, depth, , , , pv, whiteEval, blackEval, mateDistance, line] = row.split("\t");
    return {
      name,
      usable: usable === "true",
      depth: nullableNumber(depth),
      whiteEval: nullableNumber(whiteEval),
      blackEval: nullableNumber(blackEval),
      mateDistance: nullableNumber(mateDistance),
      pv: pv === "-" ? null : pv,
      line,
    };
  });
}

function parse(testCase: ContractCase, side: UciSideToMove) {
  return new UciInfoParser(side, 1).push(testCase.line);
}

describe("shared UCI info contract", () => {
  for (const testCase of loadContract()) {
    it(testCase.name, () => {
      const white = parse(testCase, "white");
      const black = parse(testCase, "black");
      if (!testCase.usable) {
        expect(white).toBeNull();
        expect(black).toBeNull();
        return;
      }

      expect(white).toEqual([{
        eval: testCase.whiteEval,
        depth: testCase.depth,
        mateDistance: testCase.mateDistance,
        moves: testCase.pv,
      }]);
      expect(black).toEqual([{
        eval: testCase.blackEval,
        depth: testCase.depth,
        mateDistance: testCase.mateDistance,
        moves: testCase.pv,
      }]);
    });
  }
});
