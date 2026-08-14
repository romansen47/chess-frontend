import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const TERMINATE_HEADER = "x-chess-terminate";
const TERMINATE_HEADER_VALUE = "terminate";

// Explizit IPv4 verwenden. Unter Windows/WSL kann "localhost" beim
// Verbindungsaufbau deutlich langsamer sein als 127.0.0.1.
export default defineConfig({
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
