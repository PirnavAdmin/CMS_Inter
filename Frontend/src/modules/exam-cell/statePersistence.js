import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

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
 *
 * Priority order for initial tab:
 * 1. URL searchParam (?tab=...)
 * 2. Initial prop (if explicitly specified and not fallback default)
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
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get(tabParamKey);

  // Normalizer helper taking care of case-insensitivity and aliases
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

  const resolveInitialTab = useCallback(() => {
    // 1. URL searchParam has highest priority
    if (urlTab) {
      const normalized = normalize(urlTab);
      if (normalized) return normalized;
    }
    // 2. Initial prop from route (e.g. initialView="published" or screen="single")
    if (initialProp) {
      const normalized = normalize(initialProp);
      if (normalized) return normalized;
    }
    // 3. Last saved tab in sessionStorage
    const stored = getModuleState(moduleKey);
    if (stored?.tab) {
      const normalized = normalize(stored.tab);
      if (normalized) return normalized;
    }
    // 4. Default tab
    return defaultTab;
  }, [urlTab, initialProp, moduleKey, defaultTab, normalize]);

  const [activeTab, setActiveTabState] = useState(resolveInitialTab);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Sync with URL when URL changes externally (e.g., Back/Forward navigation)
  useEffect(() => {
    if (urlTab) {
      const normalized = normalize(urlTab);
      if (normalized && normalized !== activeTabRef.current) {
        setActiveTabState(normalized);
        saveModuleState(moduleKey, { tab: normalized });
        if (typeof onTabChange === "function") {
          onTabChange(normalized);
        }
      }
    }
  }, [urlTab, normalize, moduleKey, onTabChange]);

  // Synchronize URL on mount or when activeTab changes if URL does not reflect it
  useEffect(() => {
    const currentInUrl = searchParams.get(tabParamKey);
    const normalizedInUrl = normalize(currentInUrl);
    if (normalizedInUrl !== activeTab) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(tabParamKey, activeTab);
          return next;
        },
        { replace: true }
      );
    }
    saveModuleState(moduleKey, { tab: activeTab });
  }, [activeTab, tabParamKey, normalize, moduleKey, searchParams, setSearchParams]);

  // Public setter that updates state, sessionStorage, and URL
  const setActiveTab = useCallback(
    (nextTab) => {
      const normalized = normalize(nextTab);
      if (!normalized) return;
      setActiveTabState(normalized);
      saveModuleState(moduleKey, { tab: normalized });

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(tabParamKey, normalized);
          return next;
        },
        { replace: true }
      );

      if (typeof onTabChange === "function") {
        onTabChange(normalized);
      }
    },
    [moduleKey, tabParamKey, normalize, setSearchParams, onTabChange]
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
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSubTab = searchParams.get(subTabParamKey);

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

  const resolveInitialSubTab = useCallback(() => {
    if (urlSubTab) {
      const normalized = normalize(urlSubTab);
      if (normalized) return normalized;
    }
    const stored = getModuleState(moduleKey);
    const storedSub = stored?.subTabs?.[mainTab];
    if (storedSub) {
      const normalized = normalize(storedSub);
      if (normalized) return normalized;
    }
    return defaultSubTab;
  }, [urlSubTab, moduleKey, mainTab, defaultSubTab, normalize]);

  const [activeSubTab, setActiveSubTabState] = useState(resolveInitialSubTab);

  useEffect(() => {
    if (urlSubTab) {
      const normalized = normalize(urlSubTab);
      if (normalized && normalized !== activeSubTab) {
        setActiveSubTabState(normalized);
      }
    }
  }, [urlSubTab, normalize, activeSubTab]);

  const setActiveSubTab = useCallback(
    (nextSubTab) => {
      const normalized = normalize(nextSubTab);
      if (!normalized) return;
      setActiveSubTabState(normalized);

      saveModuleState(moduleKey, (prev) => ({
        ...prev,
        subTabs: {
          ...(prev?.subTabs || {}),
          [mainTab]: normalized,
        },
      }));

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(subTabParamKey, normalized);
          return next;
        },
        { replace: true }
      );
    },
    [moduleKey, mainTab, subTabParamKey, normalize, setSearchParams]
  );

  return [activeSubTab, setActiveSubTab];
}

