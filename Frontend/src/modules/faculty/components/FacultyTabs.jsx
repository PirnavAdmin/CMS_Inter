import React, { useCallback, useEffect, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

// Batch related view changes so one click creates one complete history entry.
export function useFacultyViewParams() {
  const [params, setParams] = useSearchParams();
  const { pathname } = useLocation();
  const current = useRef(null);
  current.current = { key: pathname + "?" + params.toString(), params, setParams };
  const pending = useRef(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pending.current = null; }; }, []);
  const updateParams = useCallback((change) => {
    if (!mounted.current) return;
    const existing = pending.current;
    const next = existing?.key === current.current.key ? existing : { key: current.current.key, params: new URLSearchParams(current.current.params) };
    change(next.params);
    pending.current = next;
    if (!existing) queueMicrotask(() => {
      const target = pending.current;
      pending.current = null;
      if (mounted.current && target?.key === current.current.key && target.params.toString() !== current.current.params.toString()) current.current.setParams(target.params);
    });
  }, []);
  const setParam = useCallback((key, value) => updateParams((next) => {
    if (value == null || value === "") next.delete(key);
    else next.set(key, String(value));
  }), [updateParams]);
  return { params, setParam, updateParams };
}

export default function FacultyTabs({ as: Element = "div", className = "", children, ...props }) { return <Element className={className} {...props}>{children}</Element>; }
