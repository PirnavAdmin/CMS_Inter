import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthSession } from "../../features/authStorage.js";

// Keep the activity clock independent of API refreshes and settings edits.
export default function useDriverIdleLogout(autoLogoutMinutes) {
  const navigate = useNavigate();
  const lastActivity = useRef(Date.now());
  useEffect(() => {
    if (![15, 30, 60].includes(autoLogoutMinutes)) return;
    let timer;
    let loggedOut = false;
    const duration = autoLogoutMinutes * 60000;
    const checkIdle = () => {
      clearTimeout(timer);
      if (loggedOut) return;
      const remaining = duration - (Date.now() - lastActivity.current);
      if (remaining <= 0) {
        loggedOut = true;
        clearAuthSession();
        navigate("/login", { replace: true });
      } else timer = setTimeout(checkIdle, remaining);
    };
    const onActivity = (event) => {
      if (!event.isTrusted || loggedOut) return;
      // Check elapsed time first so returning to a throttled tab cannot revive it.
      checkIdle();
      if (!loggedOut) { lastActivity.current = Date.now(); checkIdle(); }
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"];
    events.forEach((name) => window.addEventListener(name, onActivity, { passive: true, capture: true }));
    document.addEventListener("visibilitychange", checkIdle);
    window.addEventListener("focus", checkIdle);
    checkIdle();
    return () => {
      clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, onActivity, true));
      document.removeEventListener("visibilitychange", checkIdle);
      window.removeEventListener("focus", checkIdle);
    };
  }, [autoLogoutMinutes, navigate]);
}
