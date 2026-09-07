# Chess Frontend

`chess-frontend` is the React/TypeScript user interface for the Chess Analysis Tool. The interface is analysis-oriented: the board is the central workspace for reviewing positions and games, while ordinary play—including playing against a configured engine—is provided as a supporting feature.

## Features

The frontend provides an interactive chessboard and move list, clocks and game controls, live engine evaluation, deep game analysis with replay/profile views, UCI engine and profile configuration, current-game PGN import/export, and access to the embedded chess database for library import, search, and loading stored games into the analysis workflow.

The UI supports English, German, and French browser-side localization. Engine names, UCI options, PGN/SAN notation, API payload keys, and other technical protocol data are intentionally kept separate from translated UI text.

## PGN workflows

`Import New Game` is the current-game workflow and accepts exactly one PGN game. Multi-game collections belong in the Chess Database import workflow. `Export Current Game` exports the game currently represented by the application.

Large PGN libraries are processed by the backend database importer rather than in the browser. Depending on collection size and machine performance, importing a large library can take many minutes or several hours.

## Development

The frontend uses React 19, TypeScript, and Vite. During development Vite binds to `127.0.0.1` and proxies `/api` requests to the backend at `127.0.0.1:8080`.

Available package scripts are `npm run dev`, `npm run build`, `npm run lint`, and `npm run preview`. In the complete project, the production frontend build is normally driven by the `chess-api` Maven build and embedded into the Spring Boot application.

## Architecture

`ChessBoard.tsx` is currently being refactored incrementally into smaller modules grouped by responsibility (board, game lifecycle, analysis, header/data actions, PGN, and shared types). Refactoring is intended to remain behavior-preserving and must not change board geometry or API contracts merely for structural reasons.
