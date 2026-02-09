import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    plugins: [react()],

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

    define: {
      __APP_NAME__: JSON.stringify(env.VITE_APP_NAME || "Nexus Trading Bot"),
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV || mode),
    },
  };
});
