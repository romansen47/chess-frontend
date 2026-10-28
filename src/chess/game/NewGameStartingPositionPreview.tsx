import { createInitialPieces } from "../board/boardUtils";
import PositionPreviewBoard from "../board/PositionPreviewBoard";

interface Props {
  positionId: number;
  title: string;
  position?: string | null;
}

/** Square-preserving board preview for the new-game dialog. */
export default function NewGameStartingPositionPreview({
  positionId,
  title,
  position,
}: Props) {
  return (
    <section className="new-game-preview" aria-label={title}>
      <div className="new-game-preview-title">{title}</div>
      <div className="new-game-preview-id">#{positionId}</div>
      <PositionPreviewBoard
        position={position}
        fallbackPieces={createInitialPieces(positionId)}
        classPrefix="new-game-preview"
        labelSquares
      />
    </section>
  );
}
