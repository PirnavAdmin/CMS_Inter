import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, CheckCircle2, Clock, RefreshCw, RotateCcw, X, XCircle } from "lucide-react";
import Search3DIcon from "@/shared/components/Search3DIcon.jsx";
import { Modal, SkeletonPage } from "@/shared/components/Ui.jsx";
import { attendanceService } from "@/api/attendanceService.js";
import { getApiErrorMessage } from "@/api/apiClient.js";

const toUtcDate = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  const normalized = s.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getIstDateKey = (dateObj = new Date()) => {
  if (!dateObj || Number.isNaN(dateObj.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(dateObj);
};

const formatIstDateTime = (raw) => {
  const d = toUtcDate(raw);
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
};

const formatAttendanceDate = (raw) => {
  if (!raw) return "—";
  const iso = String(raw).slice(0, 10);
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTimeStr = (raw) => {
  if (!raw) return "—";
  const m = String(raw).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return String(raw);
  let h = Number(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${min} ${ampm}`;
};

const extractList = (res) => {
  const payload = res?.data ?? res?.Data ?? res ?? [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
};

const matchesLocalSearch = (r, q, includeRemarks = false) => {
  if (!q) return true;
  const hay = [
    r.regularizationId,
    r.staffName,
    r.employeeId,
    r.departmentName,
    r.requestType,
    r.reason,
    r.originalAttendanceStatus,
    includeRemarks ? r.adminRemarks : null,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
};

const REQUEST_TYPES = ["Late Attendance", "Missed Checkout", "Absent", "Other"];

const statusPillClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "att-reg-status-approved";
  if (s === "rejected") return "att-reg-status-rejected";
  return "att-reg-status-pending";
};

const typePillClass = (type) => {
  const t = String(type || "").toLowerCase();
  if (t.includes("missed")) return "att-reg-type-missed";
  if (t.includes("late")) return "att-reg-type-late";
  return "att-reg-type-other";
};

export default function StaffRegularizePanel({ departments = [], campusId, onNotify }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightedRegId = searchParams.get("regId") || "";
  const urlScreen = searchParams.get("regScreen");
  const initialScreen = urlScreen === "history" || urlScreen === "pending" ? urlScreen : "pending";

  const [activeScreen, setActiveScreen] = useState(initialScreen);
  const pendingTabRef = useRef(null);
  const historyTabRef = useRef(null);
  const highlightRef = useRef(null);
  const autoRoutedRegIdRef = useRef("");

  // Normalized active department list (supports both id/name and departmentId/departmentName DTO shapes)
  const departmentOptions = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const d of departments || []) {
      const id = d?.id ?? d?.Id ?? d?.departmentId ?? d?.DepartmentId;
      const name = d?.name ?? d?.Name ?? d?.departmentName ?? d?.DepartmentName;
      if (id == null || id === "" || !name) continue;
      const key = String(id);
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ id: key, name: String(name) });
    }
    return list;
  }, [departments]);

  // Screen 1: Pending Requests state & filters
  const [pendingRaw, setPendingRaw] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingDebouncedSearch, setPendingDebouncedSearch] = useState("");
  const [pendingDept, setPendingDept] = useState("");
  const [pendingType, setPendingType] = useState("");
  const pendingSeq = useRef(0);

  // Screen 2: Regularization Request History state & filters
  const [historyRaw, setHistoryRaw] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyDebouncedSearch, setHistoryDebouncedSearch] = useState("");
  const [historyDept, setHistoryDept] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [historyType, setHistoryType] = useState("");
  const historySeq = useRef(0);

  const [reviewModal, setReviewModal] = useState(null); // { item, decision: 'Approved' | 'Rejected' }
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sync URL regScreen changes
  useEffect(() => {
    if (urlScreen === "pending" || urlScreen === "history") {
      setActiveScreen(urlScreen);
    }
  }, [urlScreen]);

  // Debounce backend search queries cleanly
  useEffect(() => {
    const timer = setTimeout(() => setPendingDebouncedSearch(pendingSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [pendingSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setHistoryDebouncedSearch(historySearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [historySearch]);

  const switchScreen = useCallback(
    (nextScreen) => {
      setActiveScreen(nextScreen);
      const next = new URLSearchParams(searchParams);
      next.set("regScreen", nextScreen);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleTabKeyDown = (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const target =
        e.key === "Home"
          ? "pending"
          : e.key === "End"
          ? "history"
          : activeScreen === "pending"
          ? "history"
          : "pending";
      switchScreen(target);
      if (target === "pending") pendingTabRef.current?.focus();
      else historyTabRef.current?.focus();
    }
  };

  // Load Pending Requests from backend endpoint with explicit query parameters
  const loadPending = useCallback(async () => {
    const seq = ++pendingSeq.current;
    setPendingLoading(true);
    setPendingError("");
    try {
      const res = await attendanceService.getRegularizations({
        status: "Pending",
        campusId: campusId ? Number(campusId) : undefined,
        departmentId: pendingDept ? Number(pendingDept) : undefined,
        requestType: pendingType || undefined,
        search: pendingDebouncedSearch || undefined,
      });
      if (seq !== pendingSeq.current) return;
      setPendingRaw(extractList(res));
    } catch (err) {
      if (seq !== pendingSeq.current) return;
      setPendingError(getApiErrorMessage(err) || "Failed to load pending regularization requests.");
    } finally {
      if (seq === pendingSeq.current) setPendingLoading(false);
    }
  }, [campusId, pendingDept, pendingType, pendingDebouncedSearch]);

  // Load Regularization Request History from backend endpoint with explicit query parameters
  const loadHistory = useCallback(async () => {
    const seq = ++historySeq.current;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await attendanceService.getRegularizations({
        campusId: campusId ? Number(campusId) : undefined,
        departmentId: historyDept ? Number(historyDept) : undefined,
        status: historyStatus || undefined,
        requestType: historyType || undefined,
        search: historyDebouncedSearch || undefined,
      });
      if (seq !== historySeq.current) return;
      setHistoryRaw(extractList(res));
    } catch (err) {
      if (seq !== historySeq.current) return;
      setHistoryError(getApiErrorMessage(err) || "Failed to load regularization request history.");
    } finally {
      if (seq === historySeq.current) setHistoryLoading(false);
    }
  }, [campusId, historyDept, historyStatus, historyType, historyDebouncedSearch]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Real-time refresh when a SignalR/resync notification arrives on this admin session
  useEffect(() => {
    const onResync = () => {
      loadPending();
      loadHistory();
    };
    window.addEventListener("cms-notifications-resync", onResync);
    return () => window.removeEventListener("cms-notifications-resync", onResync);
  }, [loadPending, loadHistory]);

  const istTodayKey = getIstDateKey(new Date());

  // Screen 1 rows: unreviewed Pending requests submitted today (IST) + instant search responsiveness
  const todaysPendingRequests = useMemo(() => {
    const q = pendingSearch.trim().toLowerCase();
    return pendingRaw.filter((r) => {
      if (String(r.status || "").toLowerCase() !== "pending") return false;
      const createdIst = getIstDateKey(toUtcDate(r.createdAt));
      if (createdIst !== istTodayKey) return false;
      if (pendingDept && String(r.departmentId ?? "") !== String(pendingDept)) return false;
      if (pendingType && String(r.requestType || "").toLowerCase() !== pendingType.toLowerCase()) return false;
      return matchesLocalSearch(r, q, false);
    });
  }, [pendingRaw, istTodayKey, pendingDept, pendingType, pendingSearch]);

  // Screen 2 rows: Approved/Rejected requests + prior-day unreviewed Pending requests
  const historyRequests = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return historyRaw.filter((r) => {
      const isPending = String(r.status || "").toLowerCase() === "pending";
      const createdIst = getIstDateKey(toUtcDate(r.createdAt));
      if (isPending && createdIst === istTodayKey) return false;
      if (historyDept && String(r.departmentId ?? "") !== String(historyDept)) return false;
      if (historyStatus && String(r.status || "").toLowerCase() !== historyStatus.toLowerCase()) return false;
      if (historyType && String(r.requestType || "").toLowerCase() !== historyType.toLowerCase()) return false;
      return matchesLocalSearch(r, q, true);
    });
  }, [historyRaw, istTodayKey, historyDept, historyStatus, historyType, historySearch]);

  // Auto-open whichever screen contains ?regId=... when arriving from notifications
  useEffect(() => {
    if (!highlightedRegId || pendingLoading || historyLoading) return;
    if (autoRoutedRegIdRef.current === highlightedRegId) return;
    const inPending = todaysPendingRequests.some((r) => String(r.regularizationId) === String(highlightedRegId));
    const inHistory = historyRequests.some((r) => String(r.regularizationId) === String(highlightedRegId));
    if (inPending) {
      autoRoutedRegIdRef.current = highlightedRegId;
      if (activeScreen !== "pending") setActiveScreen("pending");
    } else if (inHistory) {
      autoRoutedRegIdRef.current = highlightedRegId;
      if (activeScreen !== "history") setActiveScreen("history");
    }
  }, [highlightedRegId, pendingLoading, historyLoading, todaysPendingRequests, historyRequests, activeScreen]);

  useEffect(() => {
    if (highlightedRegId && !pendingLoading && !historyLoading && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedRegId, pendingLoading, historyLoading, activeScreen, todaysPendingRequests, historyRequests]);

  const openReviewModal = (item, decision) => {
    setReviewModal({ item, decision });
    setRemarks(
      decision === "Approved"
        ? `Approved ${item.requestType || "attendance regularization"}`
        : "",
    );
  };

  const handleConfirmReview = async (e) => {
    e.preventDefault();
    if (!reviewModal || submitting) return;
    if (reviewModal.decision === "Rejected" && remarks.trim().length < 3) {
      onNotify?.("Please enter rejection remarks before rejecting a request.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await attendanceService.reviewRegularization(reviewModal.item.regularizationId, {
        status: reviewModal.decision,
        adminRemarks: remarks.trim() || `${reviewModal.decision} by Admin`,
      });
      if (res?.status === false || res?.Status === false) {
        throw new Error(res?.message || res?.Message || "Failed to review regularization request.");
      }
      onNotify?.(
        res?.message ||
          res?.Message ||
          `Regularization request #${reviewModal.item.regularizationId} ${reviewModal.decision.toLowerCase()}.`,
        "success",
      );
      setReviewModal(null);
      setRemarks("");
      await Promise.all([loadPending(), loadHistory()]);
    } catch (err) {
      onNotify?.(getApiErrorMessage(err) || "Failed to process regularization request.", "error");
      await Promise.all([loadPending(), loadHistory()]);
    } finally {
      setSubmitting(false);
    }
  };

  const renderRow = (r, showReviewAudit) => {
    const isPending = String(r.status || "").toLowerCase() === "pending";
    const isHighlighted = highlightedRegId && String(r.regularizationId) === String(highlightedRegId);
    const origInDisp = formatTimeStr(r.originalInTime);
    const origOutDisp = formatTimeStr(r.originalOutTime);
    const hasRequestedTimings = Boolean(r.requestedInTime || r.requestedOutTime);
    const reqInDisp = formatTimeStr(r.requestedInTime);
    const reqOutDisp = formatTimeStr(r.requestedOutTime);

    return (
      <tr
        key={r.regularizationId}
        ref={isHighlighted ? highlightRef : undefined}
        className={isHighlighted ? "att-reg-row-highlight" : undefined}
      >
        <td>#{r.regularizationId}</td>
        <td>
          <div className="att-reg-staff-cell">
            <strong>{r.staffName || "—"}</strong>
            <span>
              {r.employeeId || "—"} · {r.departmentName || "General"}
            </span>
          </div>
        </td>
        <td>{formatAttendanceDate(r.attendanceDate)}</td>
        <td>
          <span className={`att-reg-type-pill ${typePillClass(r.requestType)}`}>
            {r.requestType || "Late Attendance"}
          </span>
        </td>
        <td>
          <div className="att-reg-orig-cell">
            <span>{r.originalAttendanceStatus || "Not recorded"}</span>
            <small>
              Orig: In {origInDisp} · Out {origOutDisp}
            </small>
            {hasRequestedTimings && (
              <small className="att-reg-req-times">
                Req: In {reqInDisp} · Out {reqOutDisp}
              </small>
            )}
          </div>
        </td>
        <td className="att-reg-reason-cell">{r.reason || "—"}</td>
        <td>{formatIstDateTime(r.createdAt)}</td>
        <td>
          <span className={`att-reg-status-pill ${statusPillClass(r.status)}`}>{r.status}</span>
        </td>
        {showReviewAudit && (
          <td>
            {isPending ? (
              <span className="att-reg-unreviewed-note">Unreviewed (carried forward)</span>
            ) : (
              <div className="att-reg-audit-cell">
                <span>{r.reviewedByAdminName || `User #${r.reviewedByUserId || "—"}`}</span>
                <small>{formatIstDateTime(r.reviewedAt)}</small>
                {r.adminRemarks && <small className="att-reg-remarks-text">{r.adminRemarks}</small>}
              </div>
            )}
          </td>
        )}
        <td>
          {isPending ? (
            <div className="att-reg-actions">
              <button
                type="button"
                className="cms-btn cms-btn-primary att-reg-btn-approve"
                onClick={() => openReviewModal(r, "Approved")}
                title="Approve Regularization"
              >
                <Check size={14} /> Approve
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-ghost att-reg-btn-reject"
                onClick={() => openReviewModal(r, "Rejected")}
                title="Reject Regularization"
              >
                <X size={14} /> Reject
              </button>
            </div>
          ) : (
            <span className="att-reg-processed-label">Processed</span>
          )}
        </td>
      </tr>
    );
  };

  const hasPendingFilters = Boolean(pendingSearch || pendingDept || pendingType);
  const hasHistoryFilters = Boolean(historySearch || historyDept || historyStatus || historyType);

  return (
    <div className="att-regularize-panel">
      {/* Side-by-side Sub-Tab Screen Switcher */}
      <div
        className="att-reg-subtabs"
        role="tablist"
        aria-label="Regularization Screens"
        onKeyDown={handleTabKeyDown}
      >
        <button
          ref={pendingTabRef}
          type="button"
          id="att-reg-tab-pending"
          role="tab"
          tabIndex={activeScreen === "pending" ? 0 : -1}
          aria-selected={activeScreen === "pending"}
          className="att-reg-subtab"
          onClick={() => switchScreen("pending")}
        >
          <Clock size={15} />
          <span>Pending Requests</span>
          <span className="att-reg-tab-badge">{todaysPendingRequests.length}</span>
        </button>

        <button
          ref={historyTabRef}
          type="button"
          id="att-reg-tab-history"
          role="tab"
          tabIndex={activeScreen === "history" ? 0 : -1}
          aria-selected={activeScreen === "history"}
          className="att-reg-subtab"
          onClick={() => switchScreen("history")}
        >
          <CheckCircle2 size={15} />
          <span>Regularization Request History</span>
          <span className="att-reg-tab-badge">{historyRequests.length}</span>
        </button>
      </div>

      {/* Screen 1: Pending Requests */}
      <div
        role="tabpanel"
        aria-labelledby="att-reg-tab-pending"
        hidden={activeScreen !== "pending"}
      >
        <div className="att-reg-panel-shell">
          <section className="att-card att-reg-filter-bar" aria-label="Pending Requests Filters">
            <div className="att-search-wrap">
              <Search3DIcon size={18} />
              <input
                type="search"
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                placeholder="Search pending requests by ID, staff name, employee ID, reason..."
                aria-label="Search pending regularization requests"
              />
            </div>
            <div className="att-reg-selects">
              <select
                aria-label="Filter pending requests by department"
                value={pendingDept}
                onChange={(e) => setPendingDept(e.target.value)}
              >
                <option value="">All Departments</option>
                {departmentOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter pending requests by request type"
                value={pendingType}
                onChange={(e) => setPendingType(e.target.value)}
              >
                <option value="">All Request Types</option>
                {REQUEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {hasPendingFilters && (
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost att-reg-reset-btn"
                  onClick={() => {
                    setPendingSearch("");
                    setPendingDebouncedSearch("");
                    setPendingDept("");
                    setPendingType("");
                  }}
                >
                  <RotateCcw size={13} /> Clear
                </button>
              )}
              <button
                type="button"
                className="cms-btn cms-btn-outline"
                disabled={pendingLoading}
                onClick={loadPending}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </section>

          {pendingError && (
            <div className="att-holiday-banner" role="alert">
              <strong>Error:</strong> {pendingError}
            </div>
          )}

          {pendingLoading ? (
            <SkeletonPage variant="table" columns={9} rows={5} />
          ) : (
            <section className="att-card att-table-card">
              <div className="att-table-top">
                <div className="att-reg-section-title">
                  <Clock size={18} />
                  <div>
                    <h3 id="att-reg-pending-heading">Pending Requests ({todaysPendingRequests.length})</h3>
                    <small>Unreviewed regularization requests submitted today requiring action</small>
                  </div>
                </div>
              </div>
              <div
                className="att-scroll att-reg-scroll-region"
                tabIndex={0}
                role="region"
                aria-labelledby="att-reg-pending-heading"
              >
                <table className="cms-table att-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Staff</th>
                      <th>Attendance Date</th>
                      <th>Request Type</th>
                      <th>Original &amp; Requested Record</th>
                      <th>Staff Reason</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaysPendingRequests.length ? (
                      todaysPendingRequests.map((r) => renderRow(r, false))
                    ) : (
                      <tr>
                        <td colSpan={9}>
                          <div className="cms-empty">
                            {hasPendingFilters
                              ? "No pending regularization requests match your search/filters."
                              : "No pending regularization requests submitted today."}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Screen 2: Regularization Request History */}
      <div
        role="tabpanel"
        aria-labelledby="att-reg-tab-history"
        hidden={activeScreen !== "history"}
      >
        <div className="att-reg-panel-shell">
          <section className="att-card att-reg-filter-bar" aria-label="Regularization History Filters">
            <div className="att-search-wrap">
              <Search3DIcon size={18} />
              <input
                type="search"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search history by ID, staff name, employee ID, reason, remarks..."
                aria-label="Search regularization request history"
              />
            </div>
            <div className="att-reg-selects">
              <select
                aria-label="Filter history by department"
                value={historyDept}
                onChange={(e) => setHistoryDept(e.target.value)}
              >
                <option value="">All Departments</option>
                {departmentOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter history by request status"
                value={historyStatus}
                onChange={(e) => setHistoryStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending (Carried Forward)</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <select
                aria-label="Filter history by request type"
                value={historyType}
                onChange={(e) => setHistoryType(e.target.value)}
              >
                <option value="">All Request Types</option>
                {REQUEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {hasHistoryFilters && (
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost att-reg-reset-btn"
                  onClick={() => {
                    setHistorySearch("");
                    setHistoryDebouncedSearch("");
                    setHistoryDept("");
                    setHistoryStatus("");
                    setHistoryType("");
                  }}
                >
                  <RotateCcw size={13} /> Clear
                </button>
              )}
              <button
                type="button"
                className="cms-btn cms-btn-outline"
                disabled={historyLoading}
                onClick={loadHistory}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </section>

          {historyError && (
            <div className="att-holiday-banner" role="alert">
              <strong>Error:</strong> {historyError}
            </div>
          )}

          {historyLoading ? (
            <SkeletonPage variant="table" columns={10} rows={5} />
          ) : (
            <section className="att-card att-table-card">
              <div className="att-table-top">
                <div className="att-reg-section-title">
                  <CheckCircle2 size={18} />
                  <div>
                    <h3 id="att-reg-history-heading">Regularization Request History ({historyRequests.length})</h3>
                    <small>
                      Processed requests and prior-day unreviewed Pending requests (still approvable / rejectable)
                    </small>
                  </div>
                </div>
              </div>
              <div
                className="att-scroll att-reg-scroll-region"
                tabIndex={0}
                role="region"
                aria-labelledby="att-reg-history-heading"
              >
                <table className="cms-table att-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Staff</th>
                      <th>Attendance Date</th>
                      <th>Request Type</th>
                      <th>Original &amp; Requested Record</th>
                      <th>Staff Reason</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Review Details</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRequests.length ? (
                      historyRequests.map((r) => renderRow(r, true))
                    ) : (
                      <tr>
                        <td colSpan={10}>
                          <div className="cms-empty">No regularization request history matches the filters.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Review Decision Confirmation Modal */}
      {reviewModal && (
        <Modal
          title={`${reviewModal.decision === "Approved" ? "Approve" : "Reject"} Regularization #${reviewModal.item.regularizationId}`}
          onClose={() => !submitting && setReviewModal(null)}
          footer={
            <>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={submitting}
                onClick={() => setReviewModal(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="att-reg-review-form"
                className={`cms-btn ${reviewModal.decision === "Approved" ? "cms-btn-primary" : "att-reg-btn-reject-solid"}`}
                disabled={submitting}
              >
                {reviewModal.decision === "Approved" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                {submitting
                  ? "Processing..."
                  : reviewModal.decision === "Approved"
                  ? "Confirm Approval"
                  : "Confirm Rejection"}
              </button>
            </>
          }
        >
          <form id="att-reg-review-form" onSubmit={handleConfirmReview} className="att-modal-fields">
            <p>
              <b>{reviewModal.item.staffName}</b> ({reviewModal.item.employeeId || "—"}) ·{" "}
              {reviewModal.item.departmentName || "General"}
            </p>
            <p>
              Attendance Date: <b>{formatAttendanceDate(reviewModal.item.attendanceDate)}</b> · Type:{" "}
              <b>{reviewModal.item.requestType || "Late Attendance"}</b>
            </p>
            <p>
              Original Status: <b>{reviewModal.item.originalAttendanceStatus || "Not recorded"}</b> (In:{" "}
              {formatTimeStr(reviewModal.item.originalInTime)} · Out:{" "}
              {formatTimeStr(reviewModal.item.originalOutTime)})
            </p>
            {(reviewModal.item.requestedInTime || reviewModal.item.requestedOutTime) && (
              <p>
                Requested Timings: In <b>{formatTimeStr(reviewModal.item.requestedInTime)}</b> · Out{" "}
                <b>{formatTimeStr(reviewModal.item.requestedOutTime)}</b>
              </p>
            )}
            <div className="att-reg-modal-reason-box">
              <small>Staff Submitted Reason</small>
              <p>{reviewModal.item.reason || "—"}</p>
            </div>
            <label className="att-field">
              <span>
                Admin Remarks {reviewModal.decision === "Rejected" ? "*" : "(Optional)"}
              </span>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                required={reviewModal.decision === "Rejected"}
                placeholder={
                  reviewModal.decision === "Rejected"
                    ? "Provide reason for rejecting this regularization request..."
                    : "Enter optional approval notes..."
                }
              />
            </label>
          </form>
        </Modal>
      )}
    </div>
  );
}
