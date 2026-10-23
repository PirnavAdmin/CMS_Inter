/**
 * PIRNAV CAMPUS MANAGEMENT SYSTEM — Unified Announcements Service
 *
 * Centralized service for publishing and consuming announcements across Admin,
 * Principal, and Staff dashboards. Supports target audience filtering so that
 * portal views (like Non-Teaching Staff) receive only announcements designated for them.
 */

const STORAGE_KEY = "cms_campus_announcements_v1";
export const ANNOUNCEMENTS_EVENT = "cms_announcements_updated";

export const TARGET_AUDIENCES = [
  { value: "Non-Teaching Staff", label: "Non-Teaching Staff (Operations, Lab, Admin, Facilities)" },
  { value: "All Staff", label: "All Staff (Teaching & Non-Teaching Staff)" },
  { value: "Teaching Faculty", label: "Teaching Faculty (Academics & Lecturers Only)" },
  { value: "Students", label: "Students (Student Portal Only)" },
  { value: "General / Campus-wide", label: "General / Campus-wide (Everyone)" },
];

export const ANNOUNCEMENT_CATEGORIES = [
  "Administrative",
  "Operations & Maintenance",
  "HR & Payroll",
  "Safety & Compliance",
  "Meeting & Circular",
  "Campus Event",
  "General",
];

export const ANNOUNCEMENT_PRIORITIES = ["Normal", "Medium", "High", "Urgent"];

/**
 * Checks whether an announcement is targeted to or applicable to Non-Teaching Staff.
 */
export function isRegardingNonTeachingStaff(ann) {
  if (!ann) return false;
  const target = String(ann.targetAudience || ann.audience || "").trim().toLowerCase();

  // If audience is blank, general, campus-wide, or all
  if (
    !target ||
    target === "all" ||
    target === "everyone" ||
    target === "general" ||
    target === "campus-wide" ||
    target === "general / campus-wide"
  ) {
    return true;
  }

  // Non-teaching specific or all-staff inclusive
  if (
    target.includes("non-teaching") ||
    target.includes("nonteaching") ||
    target.includes("all staff") ||
    target.includes("all employees") ||
    target.includes("staff") && !target.includes("teaching only") && !target.includes("faculty only")
  ) {
    // Check if it strictly excludes non-teaching (e.g. "Teaching Staff Only")
    if (
      target === "teaching faculty" ||
      target === "teaching staff" ||
      target === "faculty" ||
      target === "teachers" ||
      target.includes("teaching faculty")
    ) {
      return false;
    }
    return true;
  }

  return false;
}

function formatDateNow() {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

function getStoredAnnouncements() {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to parse campus announcements from storage:", err);
    return [];
  }
}

function saveStoredAnnouncements(list) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Failed to persist campus announcements to storage:", err);
  }
}

function emitUpdateEvent(detail) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(ANNOUNCEMENTS_EVENT, { detail }));
  } catch (err) {
    console.error("Failed to dispatch announcements update event:", err);
  }
}

export const announcementService = {
  /**
   * Retrieves all published announcements in the system.
   */
  getAllAnnouncements: () => {
    return getStoredAnnouncements();
  },

  /**
   * Retrieves announcements strictly regarding Non-Teaching Staff.
   */
  getNonTeachingAnnouncements: () => {
    const all = getStoredAnnouncements();
    return all.filter(isRegardingNonTeachingStaff);
  },

  /**
   * Publishes a new announcement with audience tagging.
   */
  createAnnouncement: ({
    title,
    content,
    category = "Administrative",
    priority = "Normal",
    targetAudience = "Non-Teaching Staff",
    publisher = "Admin Office",
    publisherRole = "Admin",
    referenceNo = null,
  }) => {
    const all = getStoredAnnouncements();
    const id = `ANN-${Date.now()}`;
    const date = formatDateNow();
    const refNo = referenceNo || `CIR/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`;

    const newAnnouncement = {
      id,
      title: String(title || "").trim(),
      content: String(content || "").trim(),
      category: category || "Administrative",
      priority: priority || "Normal",
      targetAudience: targetAudience || "Non-Teaching Staff",
      publisher: publisher || "Admin Office",
      publisherRole: publisherRole || "Admin",
      referenceNo: refNo,
      date,
      createdAt: new Date().toISOString(),
    };

    const updated = [newAnnouncement, ...all];
    saveStoredAnnouncements(updated);
    emitUpdateEvent(newAnnouncement);

    return newAnnouncement;
  },

  /**
   * Removes an announcement by its ID.
   */
  deleteAnnouncement: (id) => {
    const all = getStoredAnnouncements();
    const updated = all.filter((item) => item.id !== id);
    saveStoredAnnouncements(updated);
    emitUpdateEvent({ id, deleted: true });
    return updated;
  },

  /**
   * Subscribes to real-time updates from any dashboard or tab.
   */
  subscribeAnnouncements: (callback) => {
    if (typeof window === "undefined") return () => {};

    const handleEvent = (e) => {
      if (typeof callback === "function") callback(e?.detail);
    };

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && typeof callback === "function") {
        callback();
      }
    };

    window.addEventListener(ANNOUNCEMENTS_EVENT, handleEvent);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(ANNOUNCEMENTS_EVENT, handleEvent);
      window.removeEventListener("storage", handleStorage);
    };
  },
};
