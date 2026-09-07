# Chess frontend structure

This package is the target for the incremental, behavior-preserving split of `ChessBoard.tsx`.

Planned responsibilities:

- `types.ts`: shared chess/game/analysis DTO-style frontend types.
- `board/`: board rendering and board-coordinate utilities.
- `game/`: game lifecycle, clocks, move list, and new-game UI.
- `analysis/`: replay/evaluation state and analysis presentation.
- `header/`: header and data-menu presentation.
- `pgn/`: current-game import/export actions.

The refactoring is intentionally incremental. Existing behavior, API contracts, and board layout must remain unchanged while code is moved into these modules.
