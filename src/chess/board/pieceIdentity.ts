let nextPieceId = 0;
const pieceIdSession = Math.random().toString(36).slice(2, 10);

export function createPieceId(): string {
  nextPieceId += 1;
  return `piece-${pieceIdSession}-${nextPieceId}`;
}
