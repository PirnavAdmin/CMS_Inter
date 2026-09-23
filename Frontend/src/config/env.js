export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "https://sterile-retorted-tightness.ngrok-free.dev",
  useDevProxy: import.meta.env.DEV && import.meta.env.VITE_USE_DEV_PROXY !== "false",
};


