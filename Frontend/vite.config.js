import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function hostelDevMockPlugin() {
  return {
    name: "vite-hostel-dev-mock",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || "";
        const pathname = rawUrl.split("?")[0];
        if (!pathname.startsWith("/api/v1/hostel")) {
          return next();
        }

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          return res.end();
        }

        const successJson = (data) => {
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, data, message: "OK" }));
        };

        if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
          return successJson({ id: `item-${Date.now()}` });
        }

        if (pathname.includes("/dashboard")) {
          return successJson({
            totalHostels: 7,
            totalCapacity: 138,
            occupiedBeds: 5,
            vacantBeds: 133,
            occupancyRate: 4,
            occupancyPercentage: 4,
            availableBeds: 133,
            hostellers: 5,
            monthlyRevenue: 34500,
            activeWardens: 4,
            blocks: [],
          });
        }

        return successJson([]);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL || "https://superior-hatchery-gibberish.ngrok-free.dev";
  const isHttpsApi = apiBaseUrl.startsWith("https://");

  return {
    plugins: [react(), hostelDevMockPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: ["@microsoft/signalr"],
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
          agent: isHttpsApi ? new https.Agent({ keepAlive: true, rejectUnauthorized: false }) : undefined,
          proxyTimeout: 120000,
          timeout: 120000,
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



