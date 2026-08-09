import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Explizit IPv4 verwenden. Unter Windows/WSL kann "localhost" beim
// Verbindungsaufbau deutlich langsamer sein als 127.0.0.1.
export default defineConfig({
  plugins: [react()],
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
