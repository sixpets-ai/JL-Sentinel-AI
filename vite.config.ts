import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["maplibre-gl", "maplibre-gl/dist/maplibre-gl-csp-worker.js"],
  },
  worker: { format: "es" },
  server: {
    port: 5174,
    host: "127.0.0.1",
    proxy: { "/api": { target: "http://127.0.0.1:3001", changeOrigin: true } }
  }
});
