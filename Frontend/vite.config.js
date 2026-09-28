import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL || "https://heroics-ambush-baton.ngrok-free.dev";
  const isHttpsApi = apiBaseUrl.startsWith("https://");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
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
      allowedHosts: true,
      proxy: {
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: !isHttpsApi ? true : false,
          agent: isHttpsApi ? new https.Agent({ keepAlive: false, rejectUnauthorized: false }) : undefined,
          proxyTimeout: 10000,
          timeout: 10000,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
          configure: (proxy) => {
            proxy.on("error", (err, req, res) => {
              if (res && !res.headersSent && typeof res.writeHead === "function") {
                try {
                  res.writeHead(502, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ success: false, message: "Backend proxy unreachable", error: err?.message }));
                } catch {
                  // ignore
                }
              }
            });
          },
        },
      },
    },
  };
});



