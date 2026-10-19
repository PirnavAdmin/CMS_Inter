export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:5167",
  useDevProxy: import.meta.env.DEV && import.meta.env.VITE_USE_DEV_PROXY !== "false",
};
