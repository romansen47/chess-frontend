export interface EvaluationAreaPoint {
  x: number;
  y: number;
}

export function buildEvaluationAreaPath(
  points: readonly EvaluationAreaPoint[],
  baselineY: number,
  startX: number,
  endX: number,
): string | null {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return null;

  const line = points.map((point) => `L ${point.x} ${point.y}`).join(" ");
  return [
    `M ${startX} ${baselineY}`,
    `L ${startX} ${first.y}`,
    line,
    `L ${endX} ${last.y}`,
    `L ${endX} ${baselineY}`,
    "Z",
  ].join(" ");
}
