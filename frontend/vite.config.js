import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      fastRefresh: true,
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  server: {
    host: true,
    port: 5173,
    strictPort: true,

    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },

  build: {
    target: "es2020",
    outDir: "dist",
    sourcemap: mode !== "production",
    chunkSizeWarningLimit: 1000,
  },

  preview: {
    port: 4173,
    strictPort: true,
  },
}));
