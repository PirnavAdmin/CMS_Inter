import { useEffect, useState, useSyncExternalStore } from "react";

const NAV_KEY = "cms_sidebar_collapsed";
const FACULTY_KEY = "cms_sidebar_faculty_open";
const listeners = new Set();

const state = {
  navOpen: null,
  facultyOpen: readBoolean(FACULTY_KEY, false),
};

function readBoolean(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    if (value === "true") return true;
    if (value === "false") return false;
  } catch {
    /* storage unavailable */
  }
  return fallback;
}

function writeBoolean(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* storage unavailable */
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function snapshot() {
  return `${state.navOpen}|${state.facultyOpen}`;
}

function resolveInitialNavOpen() {
  if (typeof window === "undefined") return true;
  if (window.innerWidth <= 992) return false;
  return !readBoolean(NAV_KEY, false);
}

export function useSidebar() {
  const snap = useSyncExternalStore(subscribe, snapshot, () => "null|false");
  const [mounted, setMounted] = useState(false);
  const [nav, faculty] = snap.split("|");

  useEffect(() => {
    if (state.navOpen === null) {
      state.navOpen = resolveInitialNavOpen();
      emit();
    }
    setMounted(true);
  }, []);

  return {
    ready: mounted,
    navOpen: mounted ? nav === "true" : true,
    facultyOpen: faculty === "true",
    setNavOpen: (value) => {
      const next = typeof value === "function" ? value(state.navOpen === true) : value;
      if (next === state.navOpen) return;
      state.navOpen = next;
      if (typeof window !== "undefined" && window.innerWidth > 992) {
        writeBoolean(NAV_KEY, !next);
      }
      emit();
    },
    setFacultyOpen: (value) => {
      const next = typeof value === "function" ? value(state.facultyOpen) : value;
      if (next === state.facultyOpen) return;
      state.facultyOpen = next;
      writeBoolean(FACULTY_KEY, next);
      emit();
    },
  };
}
