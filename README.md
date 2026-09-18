# Chess Frontend

`chess-frontend` is the React/TypeScript user interface for the Chess Analysis Tool. The interface is analysis-oriented: the board is the central workspace for reviewing positions and games, while ordinary play—including playing against a configured engine—is provided as a supporting feature.

## Features

The frontend provides an interactive chessboard and move list, clocks and game controls, live engine evaluation, deep game analysis with replay/profile views, UCI engine and profile configuration, current-game PGN import/export, and access to the embedded chess database for library import, search, and loading stored games into the analysis workflow.

The UI supports English, German, and French browser-side localization. Engine names, UCI options, PGN/SAN notation, API payload keys, and other technical protocol data are intentionally kept separate from translated UI text.

## PGN workflows

`Import New Game` is the current-game workflow and accepts exactly one PGN game. Multi-game collections belong in the Chess Database import workflow. `Export Current Game` exports the game currently represented by the application.

Large PGN libraries are processed by the backend database importer rather than in the browser. Depending on collection size and machine performance, importing a large library can take many minutes or several hours.

## Third-party browser engine

The optional browser live-evaluation fallback uses the vendored Stockfish.js 19.0.0 lite single-threaded build. Stockfish.js and its WASM binary are licensed separately under GNU GPL v3 and are not covered by this repository's Apache-2.0 license. The exact upstream source, release commit, checksums, and GPL text are documented under `public/third-party/stockfish/19.0.0/`.

## Engine profiles and Chess960

`UCI_Chess960` is an engine capability and runtime protocol switch, not a reusable profile preference. The profile editor therefore omits it completely. The engine-definition view may show the advertised option, but labels it as `supported · runtime-managed` instead of presenting the engine's UCI default `false` as if it were an active user setting. The backend derives the actual value from the current game's Chess960 starting position.

## Unified Chess960 position model

All 960 Scharnagl positions use the same frontend runtime contract. Position 518 is the classical piece layout, but it is not a separate engine mode: browser evaluation uses `UCI_Chess960=true` and an explicit initial FEN for 518 exactly as it does for every other position. Authoritative move histories therefore always stay attached to an initial FEN.

The New Game dialog shows a live preview of the selected Scharnagl position. The preview and browser-evaluation fallback both use the same frontend Chess960 decoder, so changing the numeric id immediately shows the board that will actually be started.

## Development

The frontend uses React 19, TypeScript, and Vite. During development Vite binds to `127.0.0.1` and proxies `/api` requests to the backend at `127.0.0.1:8080`.

Available package scripts are `npm run dev`, `npm run build`, `npm run lint`, and `npm run preview`. In the complete project, the production frontend build is normally driven by the `chess-api` Maven build and embedded into the Spring Boot application.

## Architecture

`ChessBoard.tsx` is currently being refactored incrementally into smaller modules grouped by responsibility (board, game lifecycle, analysis, header/data actions, PGN, and shared types). Refactoring is intended to remain behavior-preserving and must not change board geometry or API contracts merely for structural reasons.


## Engine ownership and process controls

Engine executables are server-owned resources. The browser never asks the backend
to open a native file chooser. Engine Settings discovers UCI candidates in the
configured backend directory and lets the user choose which one to register; an
explicit server path remains available for advanced setups.

The Engine Manager distinguishes normal lifecycle control from emergency recovery:
**Stop gracefully** delegates to the owning UCI adapter, while **Force kill** bypasses
UCI shutdown and terminates the operating-system process. Starting a new game is
a backend-owned lifecycle transition; frontend cleanup is not relied upon to stop
native engine processes.


## Unified Settings workspace

The top-level UI exposes one **Settings** entry. Engine defaults, reusable profiles,
engine definitions, and runtime diagnostics live in one Settings workspace. Runtime
process/UCI diagnostics are available through the **Engine Log** tab; the former
standalone Engine Manager is embedded there rather than opened as a second top-level
dialog.

The vertical evaluation bar has an explicit no-result state. Disabled evaluation and
an enabled evaluator that has not produced a result yet are rendered fully gray.
Only a real engine result activates the normal black/white split, so a synthetic
50/50 bar is never mistaken for an actual 0.00 evaluation.
