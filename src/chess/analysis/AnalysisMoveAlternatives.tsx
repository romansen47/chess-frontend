import { useI18n } from "../../i18n/I18nProvider";
import type { BoardOrientation } from "../board/boardOrientation";
import { formatEngineLineScore } from "../engine/engineEvaluationUtils";
import type { BoardArrowMove, EngineLine } from "../types";
import AnalysisStaticBoard from "./AnalysisStaticBoard";

interface Props {
  playedSan: string | null;
  playedMoveUci: string | null;
  playedPosition: string | null;
  alternatives: EngineLine[];
  orientation: BoardOrientation;
}

function moveArrowFromUci(
  uci: string | null | undefined,
): BoardArrowMove | null {
  if (!uci || uci.length < 4) return null;
  return {
    from: uci.substring(0, 2),
    to: uci.substring(2, 4),
  };
}

function firstMoveLabel(
  moves: string | null | undefined,
): string | null {
  if (!moves?.trim()) return null;
  return moves.trim().split(/\s+/)[0] ?? null;
}

function matchesPlayedMove(
  arrow: BoardArrowMove | null | undefined,
  playedMoveUci: string | null | undefined,
): boolean {
  if (!arrow || !playedMoveUci || playedMoveUci.length < 4) {
    return false;
  }
  return arrow.from === playedMoveUci.substring(0, 2)
    && arrow.to === playedMoveUci.substring(2, 4);
}

/**
 * Shows the actually played move together with every stored MultiPV candidate
 * from the position before that move.
 *
 * The component is intentionally independent of move annotations: alternatives
 * are useful for every move, not only for mistakes or remarkable moves.
 */
export default function AnalysisMoveAlternatives({
  playedSan,
  playedMoveUci,
  playedPosition,
  alternatives,
  orientation,
}: Props) {
  const { t } = useI18n();

  if (
    !playedPosition
    || playedPosition.length !== 64
    || alternatives.length === 0
  ) {
    return null;
  }

  const candidates = alternatives
    .map((line, index) => ({
      line,
      rank: index + 1,
      position: line.positions?.[1] ?? null,
      arrow: line.moveArrows?.[0] ?? null,
      move: firstMoveLabel(line.moves) ?? "—",
    }))
    .filter(
      (candidate) =>
        candidate.position != null
        && candidate.position.length === 64,
    );

  if (candidates.length === 0) {
    return null;
  }

  return (
    <section className="analysis-move-alternatives">
      <div className="analysis-move-alternative-card analysis-move-alternative-played">
        <div className="analysis-move-alternative-heading">
          <strong>{t("analysis.playedMove")}</strong>
          <span>{playedSan ?? "—"}</span>
        </div>
        <AnalysisStaticBoard
          position={playedPosition}
          orientation={orientation}
          highlightedMove={moveArrowFromUci(playedMoveUci)}
          className="analysis-move-alternative-board"
        />
      </div>

      {candidates.map(({ line, rank, position, arrow, move }) => {
        const played = matchesPlayedMove(arrow, playedMoveUci);
        return (
          <div
            key={`${rank}-${move}-${line.eval}`}
            className={[
              "analysis-move-alternative-card",
              rank === 1 ? "analysis-move-alternative-best" : "",
              played ? "analysis-move-alternative-current" : "",
            ].filter(Boolean).join(" ")}
          >
            <div className="analysis-move-alternative-heading">
              <strong>
                {t("analysis.engineCandidate", { rank })}
              </strong>
              <span>
                {move} · {formatEngineLineScore(line)}
                {played
                  ? ` · ${t("analysis.playedCandidate")}`
                  : ""}
              </span>
            </div>
            <AnalysisStaticBoard
              position={position!}
              orientation={orientation}
              highlightedMove={arrow}
              className="analysis-move-alternative-board"
            />
          </div>
        );
      })}
    </section>
  );
}
