export type MoveAnnotationSymbol = "!" | "!!" | "?" | "??";

export type MoveAnnotationKind =
  | "onlyMove"
  | "brilliant"
  | "mistake"
  | "blunder";

export type BrilliantReason =
  | "deepDiscovery"
  | "materialInvestment"
  | "deepDiscoveryAndMaterialInvestment";

export interface MoveAnnotation {
  symbol: MoveAnnotationSymbol;
  kind: MoveAnnotationKind;
  loss?: number;
  bestEvaluation: number;
  secondBestEvaluation?: number;
  brilliantReason?: BrilliantReason;
  materialInvestment?: number;
  earlyDepth?: number;
  earlyRank?: number;
  finalDepth?: number;
  finalRank?: number;
}
