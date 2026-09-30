import { useEffect, useRef } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import AnnotationComment from "../analysis/AnnotationComment";
import AnnotationNagPicker from "../analysis/AnnotationNagPicker";
import type {
  GameAnnotation,
  HoverPreview,
  MoveAnnotation,
} from "../types";
import type { BoardOrientation } from "./boardOrientation";
import { positionIndexForDisplayCell } from "./boardOrientation";
import {
  getPieceSymbolFromPositionChar,
  isWhitePositionPiece,
} from "./positionUtils";
import "./HoverBoard.css";
import "../analysis/annotationPanel.css";

interface HoverBoardProps {
  preview: HoverPreview | null;
  annotationText: string | null;
  orientation: BoardOrientation;
  storedAnnotations: Record<number, GameAnnotation>;
  catAnnotations: Record<number, MoveAnnotation>;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  editingEnabled: boolean;
  onChange: (annotation: GameAnnotation) => void;
  onClose: () => void;
}

const PREVIEW_SIZE = 240;
const OFFSET = 18;
const EDITOR_RESERVE_HEIGHT = 245;
const COMMENT_RESERVE_HEIGHT = 120;

function emptyAnnotation(ply: number): GameAnnotation {
  return {
    ply,
    nag: null,
    comment: null,
    evaluation: null,
    variations: [],
  };
}

export default function HoverBoard({
  preview,
  annotationText,
  orientation,
  storedAnnotations,
  catAnnotations,
  dirty,
  saving,
  error,
  editingEnabled,
  onChange,
  onClose,
}: HoverBoardProps) {
  const { t } = useI18n();
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const pinned = Boolean(preview?.pinned && editingEnabled);

  useEffect(() => {
    if (!pinned) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        popoverRef.current
        && event.target instanceof Node
        && !popoverRef.current.contains(event.target)
      ) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pinned, onClose]);

  if (!preview) return null;

  const ply = preview.ply ?? null;
  const stored = ply == null ? null : storedAnnotations[ply] ?? null;
  const catAnnotation = ply == null ? null : catAnnotations[ply] ?? null;
  const value = ply == null ? null : stored ?? emptyAnnotation(ply);
  const hasComment = Boolean(stored?.comment?.trim());
  const showDetails = pinned || hasComment || Boolean(annotationText);
  const reserveHeight = pinned
    ? EDITOR_RESERVE_HEIGHT
    : showDetails ? COMMENT_RESERVE_HEIGHT : 0;
  const combinedHeight = PREVIEW_SIZE + reserveHeight;
  const left = Math.max(
    OFFSET,
    Math.min(preview.x + OFFSET, window.innerWidth - PREVIEW_SIZE - OFFSET),
  );
  const top = Math.max(
    OFFSET,
    Math.min(preview.y + OFFSET, window.innerHeight - combinedHeight - OFFSET),
  );

  const squares = Array.from({ length: 64 }, (_, index) => {
    const rankFromTop = Math.floor(index / 8);
    const fileFromLeft = index % 8;
    const positionIndex = positionIndexForDisplayCell(
      rankFromTop,
      fileFromLeft,
      orientation,
    );
    const pieceChar = preview.position.charAt(positionIndex);
    const pieceSymbol = getPieceSymbolFromPositionChar(pieceChar);
    const isLight = (rankFromTop + fileFromLeft) % 2 === 0;

    return (
      <div
        key={index}
        className={[
          "hover-board-square",
          isLight ? "hover-board-square-light" : "hover-board-square-dark",
        ].join(" ")}
      >
        {pieceSymbol && (
          <span
            className={[
              "hover-board-piece",
              isWhitePositionPiece(pieceChar)
                ? "hover-board-piece-white"
                : "hover-board-piece-black",
            ].join(" ")}
          >
            {pieceSymbol}
          </span>
        )}
      </div>
    );
  });

  const moveLabel = ply == null
    ? ""
    : `${Math.ceil(ply / 2)}${ply % 2 ? "." : "..."} ${preview.san ?? ""}`;

  function update(patch: Partial<GameAnnotation>) {
    if (value == null || ply == null) return;
    onChange({ ...value, ...patch, ply });
  }

  return (
    <div
      ref={popoverRef}
      className={[
        "move-preview-popover",
        pinned ? "move-preview-popover-pinned" : "move-preview-popover-passive",
      ].join(" ")}
      style={{ left, top }}
      role={pinned ? "dialog" : undefined}
      aria-label={pinned ? t("annotations.title") : undefined}
    >
      {pinned && (
        <button
          type="button"
          className="hover-popover-close"
          onClick={onClose}
          aria-label={t("common.close")}
          title={t("common.close")}
        >
          ×
        </button>
      )}

      <div className="hover-board">{squares}</div>

      {showDetails && (
        <div className="hover-board-details">
          {pinned && value ? (
            <>
              <div className="hover-comment-editor-header">
                <strong className="hover-move-label">{moveLabel}</strong>
                <AnnotationNagPicker
                  value={value.nag}
                  catAnnotation={catAnnotation}
                  onChange={(nag) => update({ nag })}
                />
              </div>
              <AnnotationComment
                comment={value.comment}
                hideTitle
                rows={3}
                onChange={(comment) => update({ comment })}
              />
              <div className="annotation-autosave-status" role="status">
                {saving
                  ? t("annotations.saving")
                  : dirty ? t("annotations.unsaved") : ""}
              </div>
              {error && <div className="annotation-error" role="alert">{error}</div>}
            </>
          ) : (
            <>
              {annotationText && (
                <div className="hover-annotation-text">{annotationText}</div>
              )}
              {hasComment && (
                <div className="hover-comment-preview">
                  <strong>{t("annotations.comment")}</strong>
                  <p>{stored?.comment}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
