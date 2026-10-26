/**
 * Central Feature Flag for Hall Tickets in Exam Cell.
 * Set to false by default (hidden from UI).
 *
 * To bring Hall Tickets back into the UI anytime:
 * 1. Run `localStorage.setItem("cms_show_hall_tickets", "true")` in browser console, OR
 * 2. Set `VITE_SHOW_HALL_TICKETS=true` in .env, OR
 * 3. Change `DEFAULT_SHOW_HALL_TICKETS = true` below.
 */

const DEFAULT_SHOW_HALL_TICKETS = false;

export const isHallTicketsVisible = () => {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("cms_show_hall_tickets");
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch {
      // LocalStorage access may be restricted
    }
  }
  return import.meta.env?.VITE_SHOW_HALL_TICKETS === "true" || DEFAULT_SHOW_HALL_TICKETS;
};

export const SHOW_HALL_TICKETS = isHallTicketsVisible();
