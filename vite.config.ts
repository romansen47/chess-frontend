import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const TERMINATE_HEADER = "x-chess-terminate";
const TERMINATE_HEADER_VALUE = "terminate";

// Explizit IPv4 verwenden. Unter Windows/WSL kann "localhost" beim
// Verbindungsaufbau deutlich langsamer sein als 127.0.0.1.
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/chess/board/useChessGameLifecycle.ts",
        "src/chess/board/useChessLiveEvaluation.ts",
        "src/chess/board/useChessMoveFlow.ts",
        "src/chess/engine/browser/UciInfoParser.ts",
        "src/chess/evaluation/BackendLiveEvaluationSource.ts",
        "src/chess/evaluation/BrowserLineDisplayHydrator.ts",
        "src/chess/evaluation/BrowserLiveEvaluationSource.ts",
        "src/chess/evaluation/LiveEvaluationController.ts",
        "src/chess/game/useComputerMoves.ts",
        "src/engineProfile/useEngineProfileHierarchyController.ts",
      ],
      thresholds: {
        lines: 55,
        functions: 60,
        branches: 45,
        statements: 55,
      },
    },
  },
  plugins: [
    react(),
    {
      name: "chess-terminate-dev-server",
      configureServer(server) {
        server.middlewares.use("/__chess/terminate", (request, response) => {
          if (request.method !== "POST") {
            response.statusCode = 405;
            response.setHeader("Allow", "POST");
            response.end();
            return;
          }

          if (request.headers[TERMINATE_HEADER] !== TERMINATE_HEADER_VALUE) {
            response.statusCode = 403;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ accepted: false }));
            return;
          }

          response.statusCode = 202;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ accepted: true }));

          setTimeout(() => {
            process.exit(0);
          }, 500);
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
});
