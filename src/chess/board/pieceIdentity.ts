let nextRenderPieceId = 0;
const renderSessionId = Math.random().toString(36).slice(2, 10);

/**
 * Creates an opaque identity for one rendered chess piece.
 * The id must never encode square, color or piece type.
 */
export function createPieceId(): string {
  nextRenderPieceId += 1;
  return `piece-${renderSessionId}-${nextRenderPieceId}`;
}
