import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import https from "node:https";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL || "https://willfully-external-disinfect.ngrok-free.dev";
  const isHttpsApi = apiBaseUrl.startsWith("https://");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rolldownOptions: {
        checks: { pluginTimings: false },
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: !isHttpsApi ? true : false,
          agent: isHttpsApi ? new https.Agent({ keepAlive: false, rejectUnauthorized: false }) : undefined,
          proxyTimeout: 30000,
          timeout: 30000,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        },
      },
    },
  };
});



