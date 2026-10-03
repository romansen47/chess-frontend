import { useId } from "react";
import type { BoardOrientation } from "./boardOrientation";
import { squareToBoardOffset } from "./boardOrientation";
import type { BoardArrowSpec } from "./boardArrows";
import "./BoardArrowOverlay.css";

interface Props {
  arrows: BoardArrowSpec[];
  orientation: BoardOrientation;
}

interface BoardPoint {
  x: number;
  y: number;
}

function squareCenter(
  square: string,
  orientation: BoardOrientation,
): BoardPoint | null {
  const offset = squareToBoardOffset(square, orientation, 1);
  if (!offset) return null;
  return {
    x: offset.x + 0.5,
    y: offset.y + 0.5,
  };
}

export default function BoardArrowOverlay({ arrows, orientation }: Props) {
  const idPrefix = useId().replace(/:/g, "");

  const rendered = arrows.flatMap((arrow, index) => {
    const from = squareCenter(arrow.from, orientation);
    const to = squareCenter(arrow.to, orientation);
    if (!from || !to) return [];

    const markerId = `${idPrefix}-arrow-${index}`;
    const width = arrow.strokeWidth ?? 0.11;

    return [
      <g key={`${arrow.from}-${arrow.to}-${index}`}>
        <defs>
          <marker
            id={markerId}
            markerUnits="userSpaceOnUse"
            markerWidth={0.42}
            markerHeight={0.42}
            refX={0.39}
            refY={0.21}
            orient="auto"
            viewBox="0 0 0.42 0.42"
          >
            <path
              d="M 0 0 L 0.42 0.21 L 0 0.42 Z"
              fill={arrow.color}
              fillOpacity={arrow.opacity}
            />
          </marker>
        </defs>
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={arrow.color}
          strokeOpacity={arrow.opacity}
          strokeWidth={width}
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
        />
      </g>,
    ];
  });

  if (rendered.length === 0) return null;

  return (
    <svg
      className="board-arrow-overlay"
      viewBox="0 0 8 8"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {rendered}
    </svg>
  );
}
