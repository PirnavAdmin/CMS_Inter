import { useSyncExternalStore } from "react";

const STORAGE_KEY = "pirnav-theme";
const listeners = new Set();

function read() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function setTheme(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  const themeColor = document.querySelector('meta[name="theme-color"]');
  themeColor?.setAttribute("content", theme === "dark" ? "#161916" : "#6F8400");
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => "light");

  return {
    theme,
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
    setTheme,
  };
}
