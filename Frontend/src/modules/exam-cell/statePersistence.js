import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "cms_examcell_";

/**
 * Safely retrieve parsed JSON state from sessionStorage
 */
export function getModuleState(moduleKey, defaultValue = {}) {
  if (typeof window === "undefined" || !window.sessionStorage) return defaultValue;
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${moduleKey}`);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : defaultValue;
  } catch (err) {
    console.warn(`[ExamCellState] Error reading sessionStorage for "${moduleKey}":`, err);
    return defaultValue;
  }
}

/**
 * Safely save or merge state into sessionStorage
 */
export function saveModuleState(moduleKey, updates) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    const current = getModuleState(moduleKey, {});
    const next = typeof updates === "function" ? updates(current) : { ...current, ...updates };
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${moduleKey}`, JSON.stringify(next));
    return next;
  } catch (err) {
    console.warn(`[ExamCellState] Error writing sessionStorage for "${moduleKey}":`, err);
  }
}

/**
 * Safely remove state from sessionStorage
 */
export function clearModuleState(moduleKey) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(`${STORAGE_PREFIX}${moduleKey}`);
  } catch (err) {
    console.warn(`[ExamCellState] Error removing sessionStorage for "${moduleKey}":`, err);
  }
}

/**
 * Hook to manage persistent tabs synchronized with URL search params and sessionStorage.
 * Does not trigger full React Router navigation or Suspense boundary fallback on tab switch.
 *
 * Priority order for initial tab:
 * 1. URL searchParam (?tab=...)
 * 2. Explicit non-default route prop (e.g. screen="single")
 * 3. Last active tab from sessionStorage
 * 4. Default tab
 */
export function useExamCellTab({
  moduleKey,
  defaultTab,
  tabParamKey = "tab",
  initialProp = null,
  tabAliases = {},
  onTabChange = null,
}) {
  const normalize = useCallback(
    (tabVal) => {
      if (!tabVal) return "";
      const trimmed = String(tabVal).trim();
      const lower = trimmed.toLowerCase();
      if (tabAliases[trimmed] !== undefined) return tabAliases[trimmed];
      if (tabAliases[lower] !== undefined) return tabAliases[lower];
      return trimmed;
    },
    [tabAliases]
  );

  const resolveInitialTab = () => {
    // 1. URL searchParam has highest priority (explicit browser URL)
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlVal = params.get(tabParamKey);
        if (urlVal) {
          const normalized = normalize(urlVal);
          if (normalized) return normalized;
        }
      } catch {
        // ignore
      }
    }

    // 2. Initial prop from route if explicitly specified and not equal to default
    if (initialProp) {
      const normalized = normalize(initialProp);
      if (normalized && normalized !== defaultTab) return normalized;
    }

    // 3. Last saved tab in sessionStorage
    const stored = getModuleState(moduleKey);
    if (stored?.tab) {
      const normalized = normalize(stored.tab);
      if (normalized) return normalized;
    }

    // 4. Initial prop fallback
    if (initialProp) {
      const normalized = normalize(initialProp);
      if (normalized) return normalized;
    }

    // 5. Default tab
    return defaultTab;
  };

  const [activeTab, setActiveTabState] = useState(resolveInitialTab);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // On mount and when activeTab changes: update URL quietly without triggering Suspense/reload, and save to sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        const currentParam = url.searchParams.get(tabParamKey);
        if (normalize(currentParam) !== activeTab) {
          url.searchParams.set(tabParamKey, activeTab);
          window.history.replaceState(window.history.state, "", url.toString());
        }
      } catch {
        // ignore
      }
    }
    saveModuleState(moduleKey, { tab: activeTab });
  }, [activeTab, tabParamKey, normalize, moduleKey]);

  // Handle browser Back / Forward history navigation
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        try {
          const params = new URLSearchParams(window.location.search);
          const val = params.get(tabParamKey);
          if (val) {
            const normalized = normalize(val);
            if (normalized && normalized !== activeTabRef.current) {
              setActiveTabState(normalized);
              saveModuleState(moduleKey, { tab: normalized });
              if (typeof onTabChange === "function") {
                onTabChange(normalized);
              }
            }
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [tabParamKey, normalize, moduleKey, onTabChange]);

  // Public setter that updates state, sessionStorage, and browser URL quietly
  const setActiveTab = useCallback(
    (nextTab) => {
      const normalized = normalize(nextTab);
      if (!normalized || normalized === activeTabRef.current) return;
      setActiveTabState(normalized);
      saveModuleState(moduleKey, { tab: normalized });

      if (typeof window !== "undefined") {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set(tabParamKey, normalized);
          window.history.replaceState(window.history.state, "", url.toString());
        } catch {
          // ignore
        }
      }

      if (typeof onTabChange === "function") {
        onTabChange(normalized);
      }
    },
    [normalize, moduleKey, tabParamKey, onTabChange]
  );

  return [activeTab, setActiveTab];
}

/**
 * Hook to manage persistent nested/sub-tabs synchronized with URL search params and sessionStorage.
 */
export function useExamCellSubTab({
  moduleKey,
  mainTab,
  defaultSubTab,
  subTabParamKey = "subtab",
  subTabAliases = {},
}) {
  const normalize = useCallback(
    (val) => {
      if (!val) return "";
      const trimmed = String(val).trim();
      const lower = trimmed.toLowerCase();
      if (subTabAliases[trimmed] !== undefined) return subTabAliases[trimmed];
      if (subTabAliases[lower] !== undefined) return subTabAliases[lower];
      return trimmed;
    },
    [subTabAliases]
  );

  const resolveInitialSubTab = () => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlSub = params.get(subTabParamKey);
        if (urlSub) {
          const normalized = normalize(urlSub);
          if (normalized) return normalized;
        }
      } catch {
        // ignore
      }
    }
    const stored = getModuleState(moduleKey);
    const storedSub = stored?.subTabs?.[mainTab];
    if (storedSub) {
      const normalized = normalize(storedSub);
      if (normalized) return normalized;
    }
    return defaultSubTab;
  };

  const [activeSubTab, setActiveSubTabState] = useState(resolveInitialSubTab);
  const activeSubTabRef = useRef(activeSubTab);
  activeSubTabRef.current = activeSubTab;

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        const current = url.searchParams.get(subTabParamKey);
        if (normalize(current) !== activeSubTab) {
          url.searchParams.set(subTabParamKey, activeSubTab);
          window.history.replaceState(window.history.state, "", url.toString());
        }
      } catch {
        // ignore
      }
    }
    saveModuleState(moduleKey, (prev) => ({
      ...prev,
      subTabs: {
        ...(prev?.subTabs || {}),
        [mainTab]: activeSubTab,
      },
    }));
  }, [activeSubTab, subTabParamKey, normalize, moduleKey, mainTab]);

  const setActiveSubTab = useCallback(
    (nextSubTab) => {
      const normalized = normalize(nextSubTab);
      if (!normalized || normalized === activeSubTabRef.current) return;
      setActiveSubTabState(normalized);

      saveModuleState(moduleKey, (prev) => ({
        ...prev,
        subTabs: {
          ...(prev?.subTabs || {}),
          [mainTab]: normalized,
        },
      }));

      if (typeof window !== "undefined") {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set(subTabParamKey, normalized);
          window.history.replaceState(window.history.state, "", url.toString());
        } catch {
          // ignore
        }
      }
    },
    [moduleKey, mainTab, subTabParamKey, normalize]
  );

  return [activeSubTab, setActiveSubTab];
}
