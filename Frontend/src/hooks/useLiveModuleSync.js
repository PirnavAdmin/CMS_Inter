import { useEffect, useRef } from "react";
import notificationHubService from "@/services/notificationHubService.js";
import { useCampusContext } from "@/context/CampusContext.jsx";

/**
 * Universal hook to enable live event-driven auto-refresh for any module in CMS.
 *
 * Guarantees:
 * - 0 continuous HTTP polling (reacts only to real server-pushed events).
 * - Scoped to the mounted component (unsubscribes automatically when user navigates away).
 * - Debounces rapid successive updates.
 * - Respects active tab / visibility states.
 *
 * Supports both signatures:
 * 1) useLiveModuleSync({ moduleName, onRefresh, enabled, filter, debounceMs })
 * 2) useLiveModuleSync(moduleName, onRefresh, { enabled, filter, debounceMs })
 */
export function useLiveModuleSync(moduleNameOrOptions, maybeOnRefresh, maybeOptions = {}) {
  const options =
    typeof moduleNameOrOptions === "object" && !Array.isArray(moduleNameOrOptions) && moduleNameOrOptions !== null
      ? moduleNameOrOptions
      : {
          moduleName: moduleNameOrOptions,
          onRefresh: maybeOnRefresh,
          ...(maybeOptions || {}),
        };

  const {
    moduleName,
    onRefresh,
    enabled = true,
    filter,
    debounceMs = 300,
    campusId: explicitCampusId,
  } = options;

  const campusCtx = useCampusContext?.();
  const selectedCampus = campusCtx?.selectedCampus;
  const currentCampusId = explicitCampusId ?? selectedCampus?.campusId ?? selectedCampus?.id;

  const onRefreshRef = useRef(onRefresh);
  const filterRef = useRef(filter);
  const timerRef = useRef(null);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  useEffect(() => {
    if (!enabled || typeof onRefreshRef.current !== "function") {
      return undefined;
    }

    const targetModules = (Array.isArray(moduleName) ? moduleName : [moduleName]).map((m) =>
      String(m || "").trim().toLowerCase()
    );

    const handleDomainEvent = (payload) => {
      if (!payload) return;

      const eventModule = String(payload.module || payload.type || "").trim().toLowerCase();
      if (!eventModule || !targetModules.includes(eventModule)) {
        return;
      }

      // Check campus scope if event carries campusId
      const eventCampusId = payload.campusId ? Number(payload.campusId) : null;
      if (
        eventCampusId &&
        eventCampusId > 0 &&
        currentCampusId &&
        Number(currentCampusId) > 0 &&
        eventCampusId !== Number(currentCampusId)
      ) {
        return;
      }

      // Don't refetch if the browser tab/document is minimized or hidden
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      // Check custom filter if supplied
      if (typeof filterRef.current === "function") {
        try {
          if (!filterRef.current(payload)) return;
        } catch (err) {
          console.warn("[useLiveModuleSync] Filter evaluation error:", err);
          return;
        }
      }

      // Debounce trigger to avoid multiple rapid endpoint calls
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        try {
          onRefreshRef.current?.(payload);
        } catch (err) {
          console.error("[useLiveModuleSync] onRefresh invocation error:", err);
        }
      }, debounceMs);
    };

    const unsubscribeDomain = notificationHubService.subscribeDomainEvents(handleDomainEvent);

    const unsubscribeResync = notificationHubService.subscribeResync?.(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          onRefreshRef.current?.({ type: "resync", module: moduleName });
        } catch (err) {
          console.error("[useLiveModuleSync] resync onRefresh error:", err);
        }
      }, debounceMs);
    });

    return () => {
      unsubscribeDomain();
      unsubscribeResync?.();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [moduleName, enabled, currentCampusId, debounceMs]);
}

export default useLiveModuleSync;
