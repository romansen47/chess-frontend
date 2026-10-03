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

function arrowPath(
  arrow: BoardArrowSpec,
  orientation: BoardOrientation,
): string | null {
  const from = squareCenter(arrow.from, orientation);
  const to = squareCenter(arrow.to, orientation);
  if (!from || !to) return null;

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length <= 0) return null;

  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;

  const startInset = Math.min(arrow.startInset, length * 0.22);
  const endInset = Math.min(arrow.endInset, length * 0.24);
  const start = {
    x: from.x + ux * startInset,
    y: from.y + uy * startInset,
  };
  const tip = {
    x: to.x - ux * endInset,
    y: to.y - uy * endInset,
  };

  const usableLength = Math.hypot(tip.x - start.x, tip.y - start.y);
  if (usableLength <= 0.08) return null;

  const headLength = Math.min(arrow.headLength, usableLength * 0.46);
  const headBase = {
    x: tip.x - ux * headLength,
    y: tip.y - uy * headLength,
  };
  const shaftHalf = arrow.shaftWidth / 2;
  const headHalf = arrow.headWidth / 2;

  const points = [
    [start.x + px * shaftHalf, start.y + py * shaftHalf],
    [headBase.x + px * shaftHalf, headBase.y + py * shaftHalf],
    [headBase.x + px * headHalf, headBase.y + py * headHalf],
    [tip.x, tip.y],
    [headBase.x - px * headHalf, headBase.y - py * headHalf],
    [headBase.x - px * shaftHalf, headBase.y - py * shaftHalf],
    [start.x - px * shaftHalf, start.y - py * shaftHalf],
  ];

  return `M ${points.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`;
}

export default function BoardArrowOverlay({ arrows, orientation }: Props) {
  const rendered = [...arrows].reverse().flatMap((arrow, index) => {
    const path = arrowPath(arrow, orientation);
    if (!path) return [];

    return [
      <path
        key={`${arrow.from}-${arrow.to}-${index}`}
        d={path}
        fill={arrow.color}
      />,
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
