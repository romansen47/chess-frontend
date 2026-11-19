export interface EvaluationAreaPoint {
  x: number;
  y: number;
}

export interface EvaluationCurveSegment {
  control1: EvaluationAreaPoint;
  control2: EvaluationAreaPoint;
  end: EvaluationAreaPoint;
}

function monotoneTangents(points: readonly EvaluationAreaPoint[]): number[] {
  if (points.length < 2) return points.map(() => 0);

  const widths = points.slice(1).map((point, index) =>
    point.x - points[index].x
  );
  const slopes = widths.map((width, index) =>
    (points[index + 1].y - points[index].y) / width
  );
  const tangents = points.map(() => 0);
  tangents[0] = slopes[0];
  tangents[tangents.length - 1] = slopes[slopes.length - 1];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previousSlope = slopes[index - 1];
    const nextSlope = slopes[index];
    if (previousSlope * nextSlope <= 0) continue;

    const previousWidth = widths[index - 1];
    const nextWidth = widths[index];
    const previousWeight = 2 * nextWidth + previousWidth;
    const nextWeight = nextWidth + 2 * previousWidth;
    tangents[index] = (previousWeight + nextWeight) /
      (previousWeight / previousSlope + nextWeight / nextSlope);
  }

  return tangents;
}

export function buildMonotoneCurveSegments(
  points: readonly EvaluationAreaPoint[],
): EvaluationCurveSegment[] {
  const tangents = monotoneTangents(points);
  return points.slice(1).map((end, index) => {
    const start = points[index];
    const width = end.x - start.x;
    return {
      control1: {
        x: start.x + width / 3,
        y: start.y + tangents[index] * width / 3,
      },
      control2: {
        x: end.x - width / 3,
        y: end.y - tangents[index + 1] * width / 3,
      },
      end,
    };
  });
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

  const curve = buildMonotoneCurveSegments(points)
    .map((segment) => [
      "C",
      segment.control1.x,
      segment.control1.y,
      segment.control2.x,
      segment.control2.y,
      segment.end.x,
      segment.end.y,
    ].join(" "))
    .join(" ");
  return [
    `M ${startX} ${baselineY}`,
    `L ${startX} ${first.y}`,
    `L ${first.x} ${first.y}`,
    curve,
    `L ${endX} ${last.y}`,
    `L ${endX} ${baselineY}`,
    "Z",
  ].join(" ");
}
