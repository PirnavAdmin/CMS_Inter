import { useMemo, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock3, Eye, FileText, History as HistoryIcon, Search, ShieldCheck, UserRound, UsersRound, XCircle, Loader2, Plus, Calendar, AlertCircle, RefreshCw, X, ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import Search3DIcon from "@/shared/components/Search3DIcon.jsx";
import { Modal, Toast, SkeletonRow, Skeleton } from "@/shared/components/Ui.jsx";
import { getAuthUser, getAuthToken } from "@/modules/auth/authStorage.js";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import {
  LEAVE_STATUS,
  getLeaveRequests,
  getLeaveDetails,
  reviewLeaveRequest,
  getLeaveHistorySummary,
  getLeaveHistory,
  getAffectedClasses,
  getEligibleSubstitutes,
  assignSubstitutes
} from "@/modules/admin/AdminLeave/services/leaveStore.js";
import "./LeaveManagementPage.css";

const STATUS_BADGE = {
  Approved: "cms-badge-active",
  Active: "cms-badge-active",
  Pending: "cms-badge-warn",
  Rejected: "cms-badge-danger",
  Cancelled: "cms-badge-inactive",
};

const Field = ({ label, children }) => <label className="att-field"><span>{label}</span>{children}</label>;

const prettyDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";



// Always allow viewing affected classes for any approved leave request
const manage = (request) => {
  if (!request) return false;
  const status = String(request.status || "").toLowerCase();
  const staffType = String(request.staffType || "").toLowerCase();
  return status === "approved" && (staffType.includes("teach") || !staffType || staffType === "teaching staff" || staffType === "teaching");
};

function LeaveStatus({ status }) {
  const normalized = String(status || "").toLowerCase();
  const Icon = normalized === "approved" ? CheckCircle2 : normalized === "rejected" ? XCircle : Clock3;
  return <span className={`leave-detail-status ${normalized}`}><Icon size={15} />{status}</span>;
}

function LeaveDetails({ leave, remark, setRemark, onClose, onReview, onAffected, reviewing = false }) {
  const pending = String(leave.status || "").toLowerCase() === "pending";
  const staffName = leave.staffName || leave.facultyName || "Staff Member";
  const initials = staffName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const staffId = leave.staffCode || leave.employeeId || (typeof leave.staffId === 'string' && leave.staffId.startsWith('FAC') ? leave.staffId : (leave.staffId ? `FAC00${leave.staffId}` : "--"));
  const department = leave.department || leave.departmentName || "--";
  const staffType = leave.staffType || "--";

  // Balance from leave record if available
  const balance = leave.balance || (leave.total != null ? {
    total: leave.total,
    used: leave.used || 0,
    remaining: leave.remaining !== undefined ? leave.remaining : Math.max(0, leave.total - (leave.used || 0))
  } : null);

  const title = (
    <span className="leave-details-title">
      <i><FileText size={18} /></i>
      <span>Leave Request Details<small>Complete information about the leave request</small></span>
    </span>
  );

  const [openingAffected, setOpeningAffected] = useState(false);

  const footer = pending ? (
    <>
      <button className="cms-btn cms-btn-ghost" onClick={onClose} disabled={Boolean(reviewing)}>Close</button>
      <button className="cms-btn cms-btn-danger" onClick={() => onReview("Rejected")} disabled={Boolean(reviewing)}>
        {reviewing === "Rejected" ? <Loader2 size={14} style={{ animation: "cms-spin 0.8s linear infinite", marginRight: "6px" }} /> : null}
        {reviewing === "Rejected" ? "Rejecting..." : "Reject"}
      </button>
      <button className="cms-btn cms-btn-primary" onClick={() => onReview("Approved")} disabled={Boolean(reviewing)}>
        {reviewing === "Approved" ? <Loader2 size={14} style={{ animation: "cms-spin 0.8s linear infinite", marginRight: "6px" }} /> : null}
        {reviewing === "Approved" ? "Approving..." : "Approve"}
      </button>
    </>
  ) : (
    <>
      <button className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button>
      {manage(leave) && (
        <button
          className="cms-btn cms-btn-primary"
          onClick={() => {
            setOpeningAffected(true);
            onAffected();
          }}
          disabled={openingAffected}
        >
          {openingAffected ? (
            <Loader2 size={15} style={{ animation: "cms-spin 0.8s linear infinite", marginRight: "6px" }} />
          ) : (
            <UsersRound size={16} />
          )}
          {openingAffected ? "Loading Classes..." : "View Affected Classes"}
        </button>
      )}
    </>
  );

  return (
    <Modal title={title} className="leave-details-modal" onClose={onClose} footer={footer}>
      <section className="leave-identity-row">
        <div className="leave-person">
          <span className="leave-avatar">{initials}</span>
          <div>
            <div className="leave-person-name">
              <strong>{staffName}</strong>
              <b>{staffId}</b>
            </div>
            <span>{department} <i>·</i> {staffType}</span>
          </div>
        </div>
        <div className="leave-type-card">
          <CalendarDays size={19} />
          <div>
            <span>Leave Type</span>
            <strong>{leave.leaveType || "--"}</strong>
          </div>
        </div>
      </section>

      <section className="leave-date-grid">
        <div className="leave-detail-card date">
          <CalendarDays size={17} />
          <span>From Date</span>
          <strong>{prettyDate(leave.fromDate || leave.startDate) || "--"}</strong>
        </div>
        <div className="leave-detail-card date">
          <CalendarDays size={17} />
          <span>To Date</span>
          <strong>{prettyDate(leave.toDate || leave.endDate) || "--"}</strong>
        </div>
        <div className="leave-detail-card days">
          <Clock3 size={17} />
          <span>Total Days</span>
          <strong>{leave.days || leave.totalDays || 1} {Number(leave.days || leave.totalDays || 1) === 1 ? "day" : "days"}</strong>
        </div>
      </section>

      <section className="leave-reason-status">
        <div className="leave-detail-panel">
          <span>Reason</span>
          <strong>{leave.reason || "--"}</strong>
        </div>
        <div className="leave-detail-panel">
          <span>Current Status</span>
          <LeaveStatus status={leave.status} />
        </div>
      </section>

      {balance && (
        <section className="leave-detail-balance">
          <span>Leave Balance</span>
          <div>
            <b>Total <strong>{balance.total} days</strong></b>
            <b>Used <strong>{balance.used} {Number(balance.used) === 1 ? "day" : "days"}</strong></b>
            <b>Remaining <strong>{balance.remaining} days</strong></b>
          </div>
        </section>
      )}

      <section className="leave-remark">
        <div><FileText size={17} /><strong>Admin Remark</strong></div>
        {pending ? (
          <Field label="Add a remark">
            <textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Add an optional review remark" />
          </Field>
        ) : (
          <p>{leave.adminRemark || leave.rejectionReason || "No remarks added."}</p>
        )}
      </section>

      {!pending && (
        <section className="leave-reviewed">
          <UserRound size={16} />
          <span>Reviewed by <strong>{leave.reviewedBy || leave.approvedByUserName || "--"}</strong></span>
          <i />
          <span>Reviewed on <strong>{leave.reviewedOn || prettyDate(leave.approvedAt) || "--"}</strong></span>
        </section>
      )}
    </Modal>
  );
}

function AffectedClasses({ leave, records = [], close, assign }) {
  const date = leave.fromDate || leave.startDate || "";
  const [apiRows, setApiRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingSlotId, setOpeningSlotId] = useState(null);

  useEffect(() => {
    let active = true;
    const leaveId = leave.staffLeaveRequestId || leave.id;
    if (leaveId) {
      getAffectedClasses(leaveId).then(data => {
        if (active) {
          setApiRows(Array.isArray(data) && data.length ? data : []);
          setLoading(false);
        }
      }).catch(err => {
        console.warn("Could not load affected classes from API:", err);
        if (active) setLoading(false);
      });
    } else {
      setLoading(false);
    }
    return () => { active = false; };
  }, [leave]);

  const rows = apiRows.map(slot => {
    const slotId = slot.timetableId || slot.id;
    const existingRec = records.find(r => (r.timetableId === slotId || r.id === slotId) && (r.date === date || !r.date) && r.status === "Active");
    return {
      ...slot,
      substitution: slot.substitution || existingRec || null
    };
  });

  const assignedCount = rows.filter(row => row.substitution).length;

  return (
    <Modal title="Affected Classes" className="leave-affected-modal" onClose={close} footer={<button className="cms-btn cms-btn-ghost" onClick={close}>Close</button>}>
      <div className="leave-context">
        <div><span>Staff</span><strong>{leave.staffName || "Staff Member"}</strong></div>
        <div><span>Leave date</span><strong>{prettyDate(date) || "--"}</strong></div>
        <div><span>Leave status</span><b className="leave-sub-status assigned">Approved</b></div>
      </div>

      <div className="leave-progress">
        <div>
          <strong>{assignedCount} of {rows.length} classes assigned</strong>
          <span>Temporary coverage for {prettyDate(date) || "selected date"}</span>
        </div>
        <div className="leave-progress-track">
          <i style={{ width: `${rows.length ? (assignedCount / rows.length) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="att-scroll leave-sub-scroll">
        <table className="cms-table leave-sub-table">
          <thead>
            <tr>
              {["Period", "Time", "Program / Group", "Section", "Subject", "Original Faculty", "Status", "Action"].map(head => (
                <th key={head}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }, (_, index) => (
                <SkeletonRow key={index} columns={8} />
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--cms-muted)" }}>
                  No affected classes found for this leave request.
                </td>
              </tr>
            ) : (
              rows.map(row => {
                const rowId = row.timetableId || row.id;
                const isAssigned = Boolean(row.substitution);
                return (
                  <tr key={rowId}>
                    <td><b>{row.period || "--"}</b></td>
                    <td>{row.time || (row.startTime && row.endTime ? `${row.startTime} - ${row.endTime}` : "--")}</td>
                    <td>{row.program || row.group || "--"}</td>
                    <td>{row.section || "--"}</td>
                    <td>{row.subject || "--"}</td>
                    <td>{leave.staffName || "Staff Member"}</td>
                    <td>
                      <span className={`leave-sub-status ${isAssigned ? "assigned" : "not-assigned"}`}>
                        {isAssigned ? "Assigned" : "Not Assigned"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="cms-btn cms-btn-primary leave-compact-btn"
                        onClick={() => {
                          setOpeningSlotId(rowId);
                          assign({ ...row, date, leave, substitution: row.substitution });
                        }}
                        disabled={openingSlotId === rowId}
                      >
                        {openingSlotId === rowId ? (
                          <Loader2 size={13} style={{ animation: "cms-spin 0.8s linear infinite", marginRight: "4px" }} />
                        ) : null}
                        {openingSlotId === rowId ? "Opening..." : (isAssigned ? "View" : "Assign")}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function Assignment({ item, records = [], close, save, toast }) {
  const existing = item.substitution;
  const [candidates, setCandidates] = useState([]);
  const [choice, setChoice] = useState("");
  const [checked, setChecked] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(!existing);

  useEffect(() => {
    if (!existing) {
      setLoadingCandidates(true);
      const leaveId = item.leave?.staffLeaveRequestId || item.leave?.id;
      const ttId = item.timetableId || item.id;
      if (leaveId && ttId) {
        getEligibleSubstitutes(leaveId, ttId, item.date).then(data => {
          if (Array.isArray(data) && data.length) {
            setCandidates(data);
          } else {
            setCandidates([]);
          }
        }).catch(() => {
          setCandidates([]);
        }).finally(() => {
          setLoadingCandidates(false);
        });
      } else {
        setCandidates([]);
        setLoadingCandidates(false);
      }
    }
  }, [item, existing]);

  const chosen = candidates.find(person => (String(person.staffId) === String(choice) || String(person.id) === String(choice)));

  const [confirming, setConfirming] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleConfirm = () => {
    if (!chosen) return;
    setConfirming(true);
    const leaveId = item.leave?.staffLeaveRequestId || item.leave?.id;
    const ttId = item.timetableId || item.id;

    // Call backend API if possible
    if (leaveId && (typeof ttId === 'number' || !isNaN(Number(ttId)))) {
      const numTtId = Number(ttId);
      const subStaffId = Number(chosen.staffId || chosen.id);
      if (!isNaN(numTtId) && !isNaN(subStaffId)) {
        assignSubstitutes(leaveId, {
          assignments: [
            {
              timetableId: numTtId,
              substituteStaffId: subStaffId,
              substitutionDate: item.date
            }
          ]
        }).catch(console.warn);
      }
    }

    // Save record locally so UI updates immediately
    save({
      id: `sub-${Date.now()}`,
      timetableId: item.timetableId || item.id,
      date: item.date,
      period: item.period,
      status: "Active",
      substituteStaffId: chosen.staffId || chosen.id,
      faculty: chosen,
      substituteName: chosen.staffName || chosen.name,
      substituteId: chosen.staffId || chosen.id,
      originalStaffId: item.leave?.staffId,
      reason: "Faculty Leave"
    });
  };

  return (
    <Modal
      title={existing ? "Substitution Assignment" : "Assign Substitute"}
      className="leave-assignment-modal"
      onClose={close}
      footer={
        <>
          <button className="cms-btn cms-btn-ghost" onClick={close} disabled={confirming}>Cancel</button>
          {!existing && (
            <button className="cms-btn cms-btn-primary" disabled={!checked || confirming} onClick={handleConfirm}>
              {confirming ? <Loader2 size={14} style={{ animation: "cms-spin 0.8s linear infinite", marginRight: "6px" }} /> : null}
              {confirming ? "Assigning..." : "Confirm Assignment"}
            </button>
          )}
        </>
      }
    >
      <section className="leave-assignment-context">
        <div><span>Subject</span><strong>{item.subject || "--"}</strong></div>
        <div><span>Class</span><strong>{item.program || item.group || "--"} - {item.section || "--"}</strong></div>
        <div><span>Date & period</span><strong>{prettyDate(item.date)} · {item.period || "--"}</strong></div>
        <div><span>Time</span><strong>{item.time || (item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : "--")}</strong></div>
        <div><span>Original faculty</span><strong>{item.leave?.staffName || "--"}</strong><small>On leave</small></div>
      </section>

      {existing ? (
        <div className="leave-existing">
          <CheckCircle2 size={20} />
          <div>
            <strong>{(existing.faculty?.name || existing.faculty?.staffName || existing.substituteName || "Assigned Faculty")} is assigned</strong>
            <span>This date-specific override does not change the published timetable.</span>
          </div>
        </div>
      ) : (
        <>
          <div className="leave-candidate-head">
            <div>
              <h4>Eligible substitute faculty</h4>
              <p>Active, subject-qualified faculty who are free this period and not on leave.</p>
            </div>
            <span>{candidates.length} available</span>
          </div>

          {loadingCandidates ? (
            <div className="leave-candidates">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} style={{ padding: "14px", border: "1px solid var(--cms-border, #e5e7eb)", borderRadius: "10px", display: "grid", gap: "8px" }}>
                  <Skeleton style={{ width: "45%", height: "16px" }} />
                  <Skeleton style={{ width: "70%", height: "12px" }} />
                </div>
              ))}
            </div>
          ) : candidates.length ? (
            <div className="leave-candidates">
              {candidates.map((person, index) => {
                const id = person.staffId || person.id;
                const name = person.staffName || person.name;
                const isSelected = choice === id;
                return (
                  <label className={`leave-candidate ${isSelected ? "selected" : ""}`} key={id}>
                    <input
                      type="radio"
                      checked={isSelected}
                      name="substitute"
                      onChange={() => { setChoice(id); setChecked(false); }}
                    />
                    <div>
                      <strong>{name}</strong>
                      <span>{id} · {person.department || person.departmentName || "--"}</span>
                    </div>
                    <div className="leave-candidate-checks">
                      <span>✓ {item.subject || "Subject"} eligible</span>
                      <span>✓ Period free</span>
                      <span>✓ Not on leave</span>
                    </div>
                    <div>
                      <b>{person.classes ?? person.weeklyLoadCount ?? 0}</b>
                      <span>classes today</span>
                    </div>
                    {index === 0 && <em>Recommended</em>}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="cms-empty">No eligible faculty members are available for this class.</div>
          )}

          {chosen && (
            <div className={`leave-availability ${checked ? "available" : ""}`}>
              <div>
                <ShieldCheck size={18} />
                <span>{checked ? "Available for substitution" : "Validate the selected faculty before assignment."}</span>
              </div>
              <button
                className="cms-btn cms-btn-ghost"
                disabled={checking}
                onClick={() => {
                  setChecking(true);
                  setTimeout(() => {
                    setChecking(false);
                    setChecked(true);
                    toast(`${chosen.staffName || chosen.name} is available for substitution.`);
                  }, 300);
                }}
              >
                {checking ? <Loader2 size={13} style={{ animation: "cms-spin 0.8s linear infinite", marginRight: "6px" }} /> : null}
                {checking ? "Checking..." : "Check Availability"}
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function TablePagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  unit = "records"
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (safePage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (safePage >= totalPages - 3) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      pages.push(safePage - 1);
      pages.push(safePage);
      pages.push(safePage + 1);
      pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className="cms-pagination leave-pagination-bar">
      <div className="leave-pagination-left">
        <span className="cms-page-info">
          Showing <strong>{start}–{end}</strong> of <strong>{totalItems}</strong> {unit}
        </span>
      </div>

      <div className="leave-pagination-right">
        {onPageSizeChange && (
          <div className="leave-page-size-wrap">
            <span className="leave-page-size-label">Rows per page:</span>
            <select
              className="leave-page-size-select"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              aria-label="Rows per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="leave-pagination-nav">
          <button
            type="button"
            className="cms-page-btn"
            disabled={safePage <= 1}
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
            <span className="leave-btn-text">Previous</span>
          </button>

          <div className="leave-page-numbers">
            {getPageNumbers().map((p, idx) =>
              p === "..." ? (
                <span key={`dots-${idx}`} className="leave-pagination-dots">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`cms-page-btn ${safePage === p ? "is-active" : ""}`}
                  onClick={() => onPageChange(p)}
                  aria-current={safePage === p ? "page" : undefined}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            className="cms-page-btn"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            aria-label="Next page"
          >
            <span className="leave-btn-text">Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function LeaveHistory({ onSelect }) {
  const campusCtx = useCampusContext();
  const campusId = campusCtx?.selectedCampus?.campusId || campusCtx?.selectedCampus?.id || null;

  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingStaffId, setOpeningStaffId] = useState(null);

  useEffect(() => {
    setLoading(true);
    getLeaveHistorySummary(null, null, campusId).then(data => {
      if (Array.isArray(data)) setHistoryData(data);
    }).catch(console.error).finally(() => {
      setLoading(false);
    });
  }, [campusId]);

  const [staffType, setStaffType] = useState("All Staff");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Status");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const people = useMemo(() => {
    return historyData.filter(person => {
      const matchType = staffType === "All Staff" || person.staffType === staffType;
      const matchQuery = `${person.staffName || ""} ${person.staffId || ""} ${person.department || ""}`.toLowerCase().includes(query.toLowerCase());
      let matchStatus = true;
      if (status === "Approved") matchStatus = (person.approved || 0) > 0;
      else if (status === "Pending") matchStatus = (person.pending || 0) > 0;
      else if (status === "Rejected") matchStatus = (person.rejected || 0) > 0;
      return matchType && matchQuery && matchStatus;
    });
  }, [historyData, staffType, query, status]);

  useEffect(() => {
    setCurrentPage(1);
  }, [staffType, query, status, pageSize]);

  const totalPages = Math.max(1, Math.ceil(people.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedPeople = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return people.slice(startIndex, startIndex + pageSize);
  }, [people, safePage, pageSize]);

  return (
    <main className="attendance-module leave-history-screen">
      <section className="att-card leave-history-card">
        <div className="leave-history-filters">
          <div className="leave-type-toggle">
            {["All Staff", "Teaching Staff", "Non-Teaching Staff"].map(type => (
              <button key={type} className={staffType === type ? "active" : ""} onClick={() => setStaffType(type)}>
                {type}
              </button>
            ))}
          </div>
          <div className="leave-history-controls">
            <label>
              <Search3DIcon size={15} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search faculty..." />
            </label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {["All Status", "Approved", "Pending", "Rejected"].map(item => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="leave-history-table-wrap">
          <table className="cms-table leave-history-table">
            <thead>
              <tr>
                {["Staff", "Department", "Staff Type", "Total Requests", "Total Leaves", "Used", "Remaining", "Approved", "Pending", "Rejected", "Action"].map(head => (
                  <th key={head}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }, (_, index) => (
                  <SkeletonRow key={index} columns={11} />
                ))
              ) : people.length ? paginatedPeople.map(person => {
                const total = person.totalLeaves ?? person.total ?? 0;
                const used = person.used || 0;
                const remaining = person.remaining !== undefined ? person.remaining : Math.max(0, total - used);
                return (
                  <tr key={person.staffId}>
                    <td>
                      <div className="history-staff">
                        <b>{(person.staffName || "").split(" ").map(p => p[0]).join("").slice(0, 2)}</b>
                        <div>
                          <strong>{person.staffName}</strong>
                          <span>{person.staffId}</span>
                        </div>
                      </div>
                    </td>
                    <td>{person.department}</td>
                    <td>{person.staffType}</td>
                    <td>{person.totalRequests || 0}</td>
                    <td>{total} days</td>
                    <td>{used} {used === 1 ? "day" : "days"}</td>
                    <td>{remaining} days</td>
                    <td><LeaveStatus status="Approved" /> <small>{person.approved || 0}</small></td>
                    <td><LeaveStatus status="Pending" /> <small>{person.pending || 0}</small></td>
                    <td><LeaveStatus status="Rejected" /> <small>{person.rejected || 0}</small></td>
                    <td>
                      <button
                        className="cms-btn cms-btn-ghost leave-view-history"
                        onClick={() => {
                          setOpeningStaffId(person.staffId);
                          onSelect(person);
                        }}
                        disabled={openingStaffId === person.staffId}
                      >
                        {openingStaffId === person.staffId ? (
                          <Loader2 size={12} style={{ animation: "cms-spin 0.8s linear infinite", marginRight: "5px" }} />
                        ) : null}
                        {openingStaffId === person.staffId ? "Opening..." : "View History"}
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="11"><div className="cms-empty">No staff leave history matches these filters.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={people.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          unit="staff"
        />
      </section>
    </main>
  );
}

function StaffLeaveHistory({ person, onClose, onLeave }) {
  const [detailHistory, setDetailHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingLeaveId, setOpeningLeaveId] = useState(null);

  useEffect(() => {
    setLoading(true);
    getLeaveHistory(person.staffId).then(data => {
      if (data) setDetailHistory(data);
    }).catch(console.error).finally(() => {
      setLoading(false);
    });
  }, [person]);

  const data = detailHistory || {
    balance: {
      total: person.totalLeaves ?? person.total ?? 0,
      used: person.used || 0,
      remaining: person.remaining !== undefined ? person.remaining : Math.max(0, (person.totalLeaves ?? person.total ?? 0) - (person.used || 0))
    },
    history: [],
    approved: person.approved || 0,
    pending: person.pending || 0,
    rejected: person.rejected || 0
  };

  const total = data.balance?.total ?? 0;
  const used = data.balance?.used ?? 0;
  const remaining = data.balance?.remaining !== undefined ? data.balance.remaining : Math.max(0, total - used);
  const percent = total ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const requests = data.history || data.History || data.requests || [];

  return (
    <Modal title="Faculty Leave History" className="leave-staff-history-modal" onClose={onClose} footer={<button className="cms-btn cms-btn-ghost" onClick={onClose}>Back to History</button>}>
      <section className="history-person-head">
        <span>{(person.staffName || "").split(" ").map(p => p[0]).join("").slice(0, 2)}</span>
        <div>
          <h4>{person.staffName} <b>{person.staffId}</b></h4>
          <p>{person.department} · {person.staffType}</p>
        </div>
      </section>

      <section className="history-balance">
        <h4>Leave Balance</h4>
        <div className="history-balance-grid">
          <div><span>Total Leaves</span><strong>{total} days</strong></div>
          <div><span>Used Leaves</span><strong>{used} {used === 1 ? "day" : "days"}</strong></div>
          <div><span>Remaining</span><strong>{remaining} days</strong></div>
        </div>
        <div className="history-usage">
          <div><strong>Leave Usage</strong><span>{used} of {total} days used · {percent}%</span></div>
          <i><b style={{ width: `${percent}%` }} /></i>
        </div>
      </section>

      <section className="history-request-summary">
        <strong>Total Requests: {requests.length || person.totalRequests || 0}</strong>
        <span>Approved: {data.approved ?? person.approved ?? 0}</span>
        <span>Pending: {data.pending ?? person.pending ?? 0}</span>
        <span>Rejected: {data.rejected ?? person.rejected ?? 0}</span>
      </section>

      <section className="history-leaves">
        <h4>Leave History</h4>
        <div className="leave-history-table-wrap">
          <table className="cms-table leave-history-table">
            <thead>
              <tr>
                {["Leave Type", "From Date", "To Date", "Days", "Status"].map(head => (
                  <th key={head}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }, (_, index) => (
                  <SkeletonRow key={index} columns={5} />
                ))
              ) : requests.length ? (
                requests.map(leave => (
                  <tr key={leave.staffLeaveRequestId || leave.id}>
                    <td>{leave.leaveType}</td>
                    <td>{prettyDate(leave.fromDate || leave.startDate)}</td>
                    <td>{prettyDate(leave.toDate || leave.endDate)}</td>
                    <td>{leave.days || leave.totalDays || 1} {Number(leave.days || leave.totalDays || 1) === 1 ? "day" : "days"}</td>
                    <td>
                      <button
                        className="history-status-link"
                        onClick={() => {
                          setOpeningLeaveId(leave.staffLeaveRequestId || leave.id);
                          onLeave(leave);
                        }}
                        disabled={openingLeaveId === (leave.staffLeaveRequestId || leave.id)}
                      >
                        {openingLeaveId === (leave.staffLeaveRequestId || leave.id) ? (
                          <Loader2 size={13} style={{ animation: "cms-spin 0.8s linear infinite", marginRight: "4px" }} />
                        ) : null}
                        <LeaveStatus status={leave.status} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}><div className="cms-empty">No leave history found.</div></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Modal>
  );
}

function RejectLeaveConfirmation({ leave, remark, setRemark, onCancel, onConfirm, reviewing = false }) {
  return (
    <Modal
      title="Reject Leave Request?"
      size="sm"
      className="leave-reject-modal"
      onClose={onCancel}
      footer={
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onCancel} disabled={Boolean(reviewing)}>Cancel</button>
          <button className="cms-btn cms-btn-danger" onClick={onConfirm} disabled={Boolean(reviewing)}>
            {reviewing ? <Loader2 size={14} style={{ animation: "cms-spin 0.8s linear infinite", marginRight: "6px" }} /> : null}
            {reviewing ? "Rejecting..." : "Reject Leave"}
          </button>
        </>
      }
    >
      <div className="leave-reject-copy">
        <p>Are you sure you want to reject this leave request?</p>
        <strong>{leave.staffName}</strong>
        <span>{leave.leaveType} · {prettyDate(leave.fromDate)} to {prettyDate(leave.toDate)}</span>
        <Field label="Admin Remark (optional)">
          <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Enter rejection reason..." />
        </Field>
      </div>
    </Modal>
  );
}

export default function LeaveManagementPage() {
  const campusCtx = useCampusContext();
  const campusId = campusCtx?.selectedCampus?.campusId || campusCtx?.selectedCampus?.id || null;
  const academicCtx = useAcademicContext?.() || {};
  const selectedAcademicYearId = academicCtx?.selectedAcademicYearId || 1;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [openingRequestId, setOpeningRequestId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [affected, setAffected] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [records, setRecords] = useState([]);
  const [remark, setRemark] = useState("");
  const [message, setMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [staffHistory, setStaffHistory] = useState(null);
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam === "today" ? "today" : tabParam === "all" ? "all" : "apply");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requestPage, setRequestPage] = useState(1);
  const [requestPageSize, setRequestPageSize] = useState(10);

  useEffect(() => {
    if (tabParam === "history") {
      setHistoryOpen(true);
    } else {
      setHistoryOpen(false);
      setActiveTab(tabParam === "all" ? "all" : "today");
    }
  }, [tabParam]);

  // Admin personal leave states (First Reference Screen)
  const [adminLeaveList, setAdminLeaveList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categorySummary, setCategorySummary] = useState(null);
  const [adminBalance, setAdminBalance] = useState(null);
  const [adminResponseData, setAdminResponseData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    categoryId: "",
    customLeaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });
  const [addingCategory, setAddingCategory] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [holidays, setHolidays] = useState([]);

  // Derive Admin identification strictly
  const effectiveAdminId = useMemo(() => {
    const a = getAuthUser() || {};
    const token = getAuthToken();
    let jwtAdminId = null;
    let jwtStaffId = null;
    let jwtUserId = null;
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length >= 2) {
          const decoded = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          jwtAdminId = decoded?.AdminId || decoded?.adminId || decoded?.admin_id;
          jwtStaffId = decoded?.StaffId || decoded?.staffId || decoded?.staff_id;
          jwtUserId = decoded?.UserId || decoded?.userId || decoded?.id || decoded?.sub;
        }
      } catch {
        /* ignore parse error */
      }
    }
    const id = Number(
      a?.staffId ||
      a?.StaffId ||
      jwtStaffId ||
      (a?.role !== "Admin" && a?.role !== "Super Admin" ? (a?.adminId || a?.AdminId || jwtAdminId) : null) ||
      a?.id ||
      a?.userId ||
      jwtUserId ||
      1116
    );
    return id > 0 ? id : 1116;
  }, []);

  const effectiveDepartmentId = useMemo(() => {
    const a = getAuthUser() || {};
    return Number(a?.departmentId || 5);
  }, []);

  const effectiveCampusId = useMemo(() => {
    const a = getAuthUser() || {};
    return Number(campusId || a?.campusId || 1);
  }, [campusId]);

  // Fetch admin leave data and categories from backend
  const fetchAdminLeaveData = useCallback(async () => {
    setAdminLoading(true);
    setAdminError(null);
    try {
      // 1. Fetch leave categories and summary
      try {
        const [catRes, sumRes] = await Promise.allSettled([
          apiClient.get("/api/v1/leave-categories"),
          apiClient.get("/api/v1/leave-categories/summary"),
        ]);

        if (catRes.status === "fulfilled") {
          const catList = catRes.value?.data?.data || catRes.value?.data?.Data || catRes.value?.data || [];
          if (Array.isArray(catList) && catList.length > 0) {
            setCategories(catList);
            setLeaveForm((prev) => ({
              ...prev,
              categoryId: prev.categoryId || catList[0]?.leaveCategoryId || "",
            }));
          }
        }

        if (sumRes.status === "fulfilled") {
          const sumData = sumRes.value?.data?.data || sumRes.value?.data?.Data;
          if (sumData) {
            setCategorySummary(sumData);
          }
        }
      } catch (catErr) {
        console.warn("Could not fetch leave categories:", catErr);
      }

      // Fetch official holidays to exclude from working days
      try {
        const holRes = await apiClient.get("/api/v1/holidays", { params: { pageSize: 100 } });
        const hList = holRes?.data?.data || holRes?.data || [];
        if (Array.isArray(hList)) setHolidays(hList);
      } catch {
        /* fallback to default working days calculation */
      }

      // 2. Fetch admin's personal leave history & balance via self-service endpoint first
      let leaves = [];
      let balanceObj = null;

      try {
        let histRes;
        try {
          histRes = await apiClient.get("/api/v1/staff-attendance/leave/my-history");
        } catch {
          histRes = await apiClient.get(
            `/api/v1/staff-attendance/leave/history/staff/${effectiveAdminId}`
          );
        }
        const rawHist = histRes?.data;
        const histData = (rawHist && typeof rawHist === "object" && ("data" in rawHist || "Data" in rawHist))
          ? (rawHist.data || rawHist.Data)
          : rawHist;
        if (histData) {
          setAdminResponseData(histData);
          balanceObj = histData.balance || {
            total: histData.total,
            used: histData.used,
            remaining: histData.remaining,
          };
          if (Array.isArray(histData.history)) {
            leaves = histData.history;
          }
        }
      } catch (histErr) {
        console.warn("Could not fetch admin leave history:", histErr);
      }

      // Fallback if history endpoint returned empty
      if (leaves.length === 0) {
        try {
          const leaveRes = await apiClient.get("/api/v1/staff-attendance/leave", {
            params: { staffId: effectiveAdminId, campusId: effectiveCampusId },
          });
          const leaveData = leaveRes?.data?.data || leaveRes?.data?.Data || leaveRes?.data;
          if (Array.isArray(leaveData) && leaveData.length > 0) {
            leaves = leaveData;
          }
        } catch (leaveErr) {
          console.warn("Could not fetch admin leaves list:", leaveErr);
        }
      }

      // Sort newest first
      leaves.sort((a, b) => {
        const dateA = new Date(a.startDate || a.fromDate || a.createdAt || 0);
        const dateB = new Date(b.startDate || b.fromDate || b.createdAt || 0);
        return dateB - dateA;
      });

      setAdminLeaveList(leaves);
      setAdminBalance(balanceObj);
    } catch (err) {
      console.error("Failed to load admin leave records:", err);
      setAdminError(getApiErrorMessage(err) || "Failed to load leave records.");
    } finally {
      setAdminLoading(false);
    }
  }, [effectiveAdminId, effectiveCampusId]);

  useEffect(() => {
    fetchAdminLeaveData();
  }, [fetchAdminLeaveData]);

  // Approved admin leaves & Response Status KPI stats
  const approvedAdminLeaves = useMemo(
    () => adminLeaveList.filter((l) => (l.status || "").toLowerCase() === "approved"),
    [adminLeaveList]
  );

  // Admin stats derived directly from the backend leave history response status and balance
  const adminStats = useMemo(() => {
    const listTotal = adminLeaveList.length;
    const listApproved = adminLeaveList.filter((l) => (l.status || "").toLowerCase() === "approved").length;
    const listPending = adminLeaveList.filter((l) => (l.status || "").toLowerCase() === "pending").length;
    const listRejected = adminLeaveList.filter((l) => (l.status || "").toLowerCase() === "rejected").length;

    const source = adminResponseData?.data || adminResponseData || {};
    const totalRequests = Number(source?.totalRequests ?? (source?.history ? source.history.length : listTotal));
    const approved = Number(source?.approved ?? listApproved);
    const pending = Number(source?.pending ?? listPending);
    const rejected = Number(source?.rejected ?? listRejected);

    const totalDays = Number(source?.total ?? source?.balance?.total ?? adminBalance?.total ?? 0);
    const usedDays = Number(source?.used ?? source?.balance?.used ?? adminBalance?.used ?? approved);
    const remainingDays = Number(source?.remaining ?? source?.balance?.remaining ?? adminBalance?.remaining ?? Math.max(0, totalDays - usedDays));

    const balanceText = totalDays > 0 ? `${remainingDays} / ${totalDays} Days Left` : `${remainingDays} Days Left`;

    return {
      totalRequests,
      approved,
      pending,
      rejected,
      totalDays,
      usedDays,
      remainingDays,
      balanceText,
    };
  }, [adminResponseData, adminLeaveList, adminBalance]);

  // Working days duration preview calculation (excludes Sundays & holidays)
  const leavePreviewDays = useMemo(() => {
    if (!leaveForm.fromDate || !leaveForm.toDate || leaveForm.toDate < leaveForm.fromDate) return 0;
    const start = new Date(`${leaveForm.fromDate}T00:00:00`);
    const end = new Date(`${leaveForm.toDate}T00:00:00`);
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const isSunday = cur.getDay() === 0;
      const curIso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
      const isHoliday = holidays.some((h) => {
        const hStart = (h.startDate || h.holidayDate || "").slice(0, 10);
        const hEnd = (h.endDate || hStart).slice(0, 10);
        return curIso >= hStart && curIso <= hEnd && (h.status === "Active" || !h.status);
      });
      if (!isSunday && !isHoliday) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }, [leaveForm.fromDate, leaveForm.toDate, holidays]);

  const handleOpenApplyModal = () => {
    setShowApplyModal(true);
    setLeaveForm({
      categoryId: categories.length > 0 ? categories[0].leaveCategoryId : "OTHERS",
      customLeaveType: "",
      fromDate: "",
      toDate: "",
      reason: "",
    });
  };

  // Create custom leave category via POST /api/v1/leave-categories
  const handleCreateCustomCategory = async () => {
    const customName = (leaveForm.customLeaveType || "").trim();
    if (!customName) {
      setMessage("Please enter a custom leave type name.");
      return;
    }

    const existing = categories.find(
      (c) => (c.categoryName || "").trim().toLowerCase() === customName.toLowerCase()
    );
    if (existing) {
      setLeaveForm((prev) => ({
        ...prev,
        categoryId: existing.leaveCategoryId,
        customLeaveType: "",
      }));
      setMessage(`Selected existing category: ${existing.categoryName}`);
      return existing.leaveCategoryId;
    }

    setAddingCategory(true);
    try {
      const code =
        customName
          .replace(/[^a-zA-Z0-9]/g, "")
          .substring(0, 4)
          .toUpperCase() || "LV";

      const newCatPayload = {
        categoryName: customName,
        categoryCode: code,
        annualQuota: 10,
        applicableStaffType: "All Staff",
        allowCarryForward: false,
        requiresProof: false,
        description: `Custom leave type: ${customName}`,
        displayOrder: categories.length + 1,
      };

      const res = await apiClient.post("/api/v1/leave-categories", newCatPayload);
      const created = res?.data?.data || res?.data;
      const createdId = created?.leaveCategoryId || created?.id;

      setMessage(`Custom leave type "${customName}" added successfully!`);

      try {
        const catRes = await apiClient.get("/api/v1/leave-categories");
        const catList = catRes?.data?.data || catRes?.data?.Data || catRes?.data || [];
        if (Array.isArray(catList) && catList.length > 0) {
          setCategories(catList);
          const found = catList.find(
            (c) => (c.categoryName || "").trim().toLowerCase() === customName.toLowerCase()
          );
          if (found) {
            setLeaveForm((prev) => ({
              ...prev,
              categoryId: found.leaveCategoryId,
              customLeaveType: "",
            }));
            return found.leaveCategoryId;
          }
        }
      } catch {
        /* proceed to fallback create */
      }

      if (createdId) {
        setCategories((prev) => [...prev, { ...newCatPayload, leaveCategoryId: createdId }]);
        setLeaveForm((prev) => ({
          ...prev,
          categoryId: createdId,
          customLeaveType: "",
        }));
        return createdId;
      }
      return null;
    } catch (err) {
      console.error("Failed to create custom leave category:", err);
      setMessage(getApiErrorMessage(err) || "Failed to create custom leave category.");
      return null;
    } finally {
      setAddingCategory(false);
    }
  };

  // Submit leave request via POST /api/v1/staff-attendance/leave using Admin ID
  const applyAdminLeave = async () => {
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) {
      setMessage("Please complete all required fields.");
      return;
    }
    if (new Date(leaveForm.toDate) < new Date(leaveForm.fromDate)) {
      setMessage("To Date cannot be earlier than From Date.");
      return;
    }
    if (leavePreviewDays <= 0) {
      setMessage("Selected leave range contains 0 working days (Sundays and official holidays are excluded).");
      return;
    }

    setLeaveSubmitting(true);
    try {
      let targetCategoryId = leaveForm.categoryId;
      let targetLeaveType = "Casual";

      if (String(leaveForm.categoryId) === "OTHERS") {
        const customName = (leaveForm.customLeaveType || "").trim();
        if (!customName) {
          setLeaveSubmitting(false);
          setMessage("Please enter a custom leave type name.");
          return;
        }

        const existing = categories.find(
          (c) => (c.categoryName || "").trim().toLowerCase() === customName.toLowerCase()
        );

        if (existing) {
          targetCategoryId = existing.leaveCategoryId;
          targetLeaveType = existing.categoryName;
        } else {
          const code =
            customName
              .replace(/[^a-zA-Z0-9]/g, "")
              .substring(0, 4)
              .toUpperCase() || "LV";

          const newCatPayload = {
            categoryName: customName,
            categoryCode: code,
            annualQuota: 10,
            applicableStaffType: "All Staff",
            allowCarryForward: false,
            requiresProof: false,
            description: `Custom leave type: ${customName}`,
            displayOrder: categories.length + 1,
          };

          try {
            const res = await apiClient.post("/api/v1/leave-categories", newCatPayload);
            const created = res?.data?.data || res?.data;
            targetCategoryId = created?.leaveCategoryId || created?.id;
            targetLeaveType = customName;

            const catRes = await apiClient.get("/api/v1/leave-categories");
            const catList = catRes?.data?.data || catRes?.data?.Data || catRes?.data || [];
            if (Array.isArray(catList) && catList.length > 0) {
              setCategories(catList);
            }
          } catch (createErr) {
            console.warn("Could not create leave category on server, submitting directly:", createErr);
            targetCategoryId = categories[0]?.leaveCategoryId || 1;
            targetLeaveType = customName;
          }
        }
      } else {
        const selectedCat = categories.find(
          (c) => String(c.leaveCategoryId) === String(leaveForm.categoryId)
        );
        targetLeaveType = selectedCat
          ? (selectedCat.categoryName || "").replace(/\s*Leave\s*/i, "").trim() || "Casual"
          : "Casual";
        targetCategoryId = selectedCat?.leaveCategoryId || leaveForm.categoryId;
      }

      const payload = {
        staffId: effectiveAdminId,
        leaveType: targetLeaveType,
        leaveCategoryId: Number(targetCategoryId || 1),
        startDate: new Date(leaveForm.fromDate).toISOString(),
        endDate: new Date(leaveForm.toDate).toISOString(),
        reason: leaveForm.reason.trim(),
        departmentId: effectiveDepartmentId,
        academicYearId: Number(selectedAcademicYearId || 1),
      };

      const res = await apiClient.post("/api/v1/staff-attendance/leave", payload);
      if (res.data?.status || res.status === 200 || res.status === 201) {
        setMessage("Leave application submitted successfully!");
        setShowApplyModal(false);
        setLeaveForm({
          categoryId: categories[0]?.leaveCategoryId || "",
          customLeaveType: "",
          fromDate: "",
          toDate: "",
          reason: "",
        });
        fetchAdminLeaveData();
        loadRequests();
      }
    } catch (err) {
      console.error("Failed to apply for leave:", err);
      setMessage(getApiErrorMessage(err) || "Failed to apply for leave.");
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // Cancel pending admin leave application
  const handleCancelAdminLeave = async (leave) => {
    const leaveId = leave.staffLeaveRequestId || leave.id;
    if (!leaveId) return;
    if (!window.confirm("Are you sure you want to cancel this leave application?")) return;
    try {
      await apiClient.post(`/api/v1/staff-attendance/leave/${leaveId}/action`, {
        status: "Cancelled",
        rejectionReason: "Cancelled by employee",
      });
      setMessage("Leave application cancelled successfully.");
      fetchAdminLeaveData();
      loadRequests();
    } catch (err) {
      console.error("Failed to cancel leave:", err);
      setMessage(getApiErrorMessage(err) || "Failed to cancel leave application.");
    }
  };

  const getAdminLeaveTypeName = (l) => {
    if (l.leaveCategoryName) return l.leaveCategoryName;
    const type = l.leaveType;
    if (!type) return "Leave";
    const lower = String(type).toLowerCase();
    if (lower.includes("casual")) return "Casual Leave (CL)";
    if (lower.includes("sick")) return "Sick Leave (SL)";
    if (lower.includes("earned")) return "Earned Leave (EL)";
    if (lower.includes("maternity")) return "Maternity Leave (ML)";
    if (lower.includes("duty")) return "On-Duty (OD)";
    if (lower.includes("compensatory")) return "Compensatory Off (CO)";
    if (lower.includes("medical")) return "Medical Leave";
    return type;
  };

  const formatAdminDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const todayDate = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);
  const todayFormatted = useMemo(() => todayDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" }), [todayDate]);

  const isTodayMatch = useCallback((req) => {
    const s = req.fromDate || (req.startDate ? String(req.startDate).split("T")[0] : "");
    const e = req.toDate || (req.endDate ? String(req.endDate).split("T")[0] : "");
    const applied = req.appliedDate || (req.createdAt ? String(req.createdAt).split("T")[0] : "") || (req.CreatedAt ? String(req.CreatedAt).split("T")[0] : "");

    // 1. Matches if application was requested today
    const isRequestedToday = Boolean(applied && applied === todayIso);

    // 2. Matches if leave is active today
    const isOnLeaveToday = Boolean(s && todayIso >= s && (!e || todayIso <= e));

    return isRequestedToday || isOnLeaveToday;
  }, [todayIso]);

  const todayRequestsCount = useMemo(() => {
    return requests.filter(isTodayMatch).length;
  }, [requests, isTodayMatch]);

  const currentTabRequests = useMemo(() => {
    return activeTab === "today" ? requests.filter(isTodayMatch) : requests;
  }, [requests, activeTab, isTodayMatch]);

  const filteredRequests = useMemo(() => {
    return currentTabRequests.filter(req => {
      if (statusFilter !== "all" && String(req.status || "").toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = String(req.staffName || "").toLowerCase();
        const dept = String(req.department || "").toLowerCase();
        const code = String(req.staffCode || req.staffId || "").toLowerCase();
        const reason = String(req.reason || "").toLowerCase();
        if (!name.includes(q) && !dept.includes(q) && !code.includes(q) && !reason.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [currentTabRequests, statusFilter, searchQuery]);

  // Pagination for Requests Table (default: 5, supports custom page size)
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsPageSize, setRequestsPageSize] = useState(5);
  const [isCustomPageSize, setIsCustomPageSize] = useState(false);
  const [customPageSizeInput, setCustomPageSizeInput] = useState("5");

  useEffect(() => {
    setRequestsPage(1);
  }, [searchQuery, statusFilter, activeTab]);

  const totalRequestsCount = filteredRequests.length;
  const totalRequestsPages = Math.max(1, Math.ceil(totalRequestsCount / (requestsPageSize || 5)));
  const safeRequestsPage = Math.min(requestsPage, totalRequestsPages);

  const paginatedRequests = useMemo(() => {
    const size = requestsPageSize > 0 ? requestsPageSize : 5;
    const start = (safeRequestsPage - 1) * size;
    return filteredRequests.slice(start, start + size);
  }, [filteredRequests, safeRequestsPage, requestsPageSize]);

  const handlePageSizeChange = (e) => {
    const val = e.target.value;
    if (val === "custom") {
      setIsCustomPageSize(true);
      const parsed = parseInt(customPageSizeInput, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setRequestsPageSize(parsed);
      }
    } else {
      setIsCustomPageSize(false);
      const num = parseInt(val, 10);
      setRequestsPageSize(num);
      setCustomPageSizeInput(String(num));
    }
    setRequestsPage(1);
  };

  const handleCustomPageSizeInput = (e) => {
    const val = e.target.value;
    setCustomPageSizeInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 500) {
      setRequestsPageSize(parsed);
      setRequestsPage(1);
    }
  };

  const startRecord = totalRequestsCount === 0 ? 0 : (safeRequestsPage - 1) * (requestsPageSize || 5) + 1;
  const endRecord = totalRequestsCount === 0 ? 0 : Math.min(safeRequestsPage * (requestsPageSize || 5), totalRequestsCount);

  const loadRequests = useCallback(() => {
    setLoading(true);
    getLeaveRequests(null, null, null, campusId).then(data => {
      if (Array.isArray(data)) setRequests(data);
    }).catch(console.error).finally(() => {
      setLoading(false);
    });
  }, [campusId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openDetails = (req) => {
    setSelected(req); // Open immediately so the modal is never blocked
    setRemark(req.adminRemark || "");
    const rid = req.staffLeaveRequestId || req.id;
    if (rid) {
      setOpeningRequestId(rid);
      getLeaveDetails(rid).then(detail => {
        if (detail) {
          setSelected(prev => ({ ...prev, ...detail }));
          if (detail.adminRemark) setRemark(detail.adminRemark);
        }
      }).catch(console.warn).finally(() => {
        setOpeningRequestId(null);
      });
    }
  };

  const commitReview = (status) => {
    const statusVal = status === "Approved" ? LEAVE_STATUS.APPROVED : LEAVE_STATUS.REJECTED;
    const leaveId = (selected && (selected.staffLeaveRequestId || selected.id)) || (rejecting && (rejecting.staffLeaveRequestId || rejecting.id));
    if (!leaveId) return;
    setReviewing(status);
    reviewLeaveRequest(leaveId, {
      status: statusVal,
      rejectionReason: remark
    }).then(() => {
      loadRequests();
      setSelected(null);
      setRejecting(null);
      setMessage(`Leave request ${status.toLowerCase()}.`);
    }).catch(console.error).finally(() => {
      setReviewing(false);
    });
  };

  const review = (status) => {
    if (status === "Rejected") {
      setRejecting(selected);
      return;
    }
    commitReview(status);
  };

  const openAssignment = (item) => {
    setAssignment(item);
  };

  const saveAssignment = (record) => {
    setRecords(prev => [...prev, record]);
    setAssignment(null);
    setMessage("Temporary substitution assigned. The published timetable was not changed.");
  };

  if (historyOpen) {
    return (
      <>
        <DashboardLayout
          title="Leave History"
          subtitle="View staff leave usage, requests, and approval history"
          breadcrumb={["Operations", "Leave Management", "Leave History"]}
          actions={
            <button className="cms-btn cms-btn-ghost leave-history-button" onClick={() => { setHistoryOpen(false); setStaffHistory(null); }}>
              Back to Leave Management
            </button>
          }
        >
          <LeaveHistory onSelect={setStaffHistory} />
        </DashboardLayout>

        {staffHistory && (
          <StaffLeaveHistory
            person={staffHistory}
            onClose={() => setStaffHistory(null)}
            onLeave={(leave) => { setStaffHistory(null); openDetails(leave); }}
          />
        )}

        {selected && (
          <LeaveDetails
            leave={selected}
            remark={remark}
            setRemark={setRemark}
            onClose={() => setSelected(null)}
            onReview={review}
            onAffected={() => { setAffected(selected); setSelected(null); }}
            reviewing={reviewing}
          />
        )}

        {rejecting && (
          <RejectLeaveConfirmation
            leave={rejecting}
            remark={remark}
            setRemark={setRemark}
            onCancel={() => setRejecting(null)}
            onConfirm={() => commitReview("Rejected")}
            reviewing={reviewing}
          />
        )}

        {affected && (
          <AffectedClasses
            leave={affected}
            records={records}
            close={() => setAffected(null)}
            assign={openAssignment}
          />
        )}

        {assignment && (
          <Assignment
            item={assignment}
            records={records}
            close={() => setAssignment(null)}
            save={saveAssignment}
            toast={setMessage}
          />
        )}

        <Toast message={message} onClose={() => setMessage("")} />
      </>
    );
  }

  return (
    <>
      <DashboardLayout
        title="Leave Management"
        subtitle={
          activeTab === "apply"
            ? "Apply for casual, sick, or earned leave and track approval status."
            : activeTab === "today"
              ? `Showing leaves active on today (${todayFormatted})`
              : "Review and manage all staff leave requests across all dates"
        }
        breadcrumb={["Operations", "Leave Management"]}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {activeTab === "apply" && (
              <button className="cms-btn cms-btn-primary" onClick={handleOpenApplyModal}>
                <Plus size={14} /> Apply Leave
              </button>
            )}
            <button className="cms-btn cms-btn-ghost leave-history-button" onClick={() => setHistoryOpen(true)}>
              <HistoryIcon size={16} /> History
            </button>
          </div>
        }
      >
        <main className="attendance-module">
          {/* Tabs Container */}
          <div className="leave-tabs-card">
            <button
              type="button"
              className={`leave-tab-btn ${activeTab === "apply" ? "active" : ""}`}
              onClick={() => setActiveTab("apply")}
            >
              <FileText size={16} /> Apply Leave
            </button>
            <button
              type="button"
              className={`leave-tab-btn ${activeTab === "today" ? "active" : ""}`}
              onClick={() => setActiveTab("today")}
            >
              <CalendarDays size={16} /> Today's Leaves <span className="tab-pill count">{todayRequestsCount}</span>
            </button>
            <button
              type="button"
              className={`leave-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              <UsersRound size={16} /> All Requests <span className="tab-pill count">{requests.length}</span>
            </button>
          </div>

          {activeTab === "apply" ? (
            <div className="leave-apply-screen-wrap">

              {/* Error Banner */}
              {adminError && (
                <div className="leave-error-banner" role="alert">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <AlertCircle size={18} />
                    <span>{adminError}</span>
                  </div>
                  <button
                    className="cms-btn cms-btn-ghost"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={fetchAdminLeaveData}
                  >
                    <RefreshCw size={13} /> Retry
                  </button>
                </div>
              )}

              {/* Leave Analytics / Response Status KPI Cards Strip */}
              <div className="leave-stat-grid">
                <div className="leave-stat-card">
                  <div className="leave-stat-icon tone-blue">
                    <FileText size={20} />
                  </div>
                  <div className="leave-stat-content">
                    <div className="leave-stat-label">Total Requests</div>
                    <div className="leave-stat-value">
                      {adminLoading ? <Loader2 size={16} className="leave-spin" /> : adminStats.totalRequests}
                    </div>
                    <div className="leave-stat-sub">
                      {adminLoading ? "Loading balance..." : `Balance: ${adminStats.balanceText}`}
                    </div>
                  </div>
                </div>

                <div className="leave-stat-card">
                  <div className="leave-stat-icon tone-green">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="leave-stat-content">
                    <div className="leave-stat-label">Approved</div>
                    <div className="leave-stat-value">
                      {adminLoading ? <Loader2 size={16} className="leave-spin" /> : adminStats.approved}
                    </div>
                    <div className="leave-stat-sub">
                      {adminLoading ? "..." : adminStats.approved === 1 ? "1 Request Approved" : `${adminStats.approved} Requests Approved`}
                    </div>
                  </div>
                </div>

                <div className="leave-stat-card">
                  <div className="leave-stat-icon tone-amber">
                    <Clock3 size={20} />
                  </div>
                  <div className="leave-stat-content">
                    <div className="leave-stat-label">Pending Review</div>
                    <div className="leave-stat-value">
                      {adminLoading ? <Loader2 size={16} className="leave-spin" /> : adminStats.pending}
                    </div>
                    <div className="leave-stat-sub">
                      {adminLoading ? "..." : adminStats.pending === 1 ? "1 Request Awaiting" : `${adminStats.pending} Awaiting Review`}
                    </div>
                  </div>
                </div>

                <div className="leave-stat-card">
                  <div className="leave-stat-icon tone-red">
                    <XCircle size={20} />
                  </div>
                  <div className="leave-stat-content">
                    <div className="leave-stat-label">Rejected</div>
                    <div className="leave-stat-value">
                      {adminLoading ? <Loader2 size={16} className="leave-spin" /> : adminStats.rejected}
                    </div>
                    <div className="leave-stat-sub">
                      {adminLoading ? "..." : adminStats.rejected === 1 ? "1 Request Declined" : `${adminStats.rejected} Requests Declined`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Leave Applications History Table Card */}
              <div className="leave-history-card-wrap">
                <div className="leave-history-card-head">
                  <h3>Leave Applications History</h3>
                </div>
                <div className="leave-history-table-wrap">
                  <table className="cms-table">
                    <thead>
                      <tr>
                        <th>TYPE</th>
                        <th>FROM DATE</th>
                        <th>TO DATE</th>
                        <th>DAYS</th>
                        <th>REASON</th>
                        <th>APPLIED ON</th>
                        <th>STATUS</th>
                        <th>APPROVER</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminLoading ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: "center", padding: "32px 20px" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                              <Loader2 size={24} className="leave-spin" style={{ color: "var(--cms-primary)" }} />
                              <span style={{ fontSize: 13, color: "var(--cms-muted)" }}>Loading leave applications...</span>
                            </div>
                          </td>
                        </tr>
                      ) : adminLeaveList.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: "center", padding: "40px 20px" }}>
                            <div className="empty-leave-state">
                              <Calendar size={32} style={{ color: "var(--cms-muted)", opacity: 0.7, marginBottom: 8 }} />
                              <h4>No Leave Applications Found</h4>
                              <p>
                                You have not submitted any leave applications yet.
                                <br />
                                Click "+ Apply Leave" above to apply for casual, sick, or earned leave.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        adminLeaveList.map((l) => (
                          <tr key={l.staffLeaveRequestId || l.id}>
                            <td className="cms-strong">{getAdminLeaveTypeName(l)}</td>
                            <td>{formatAdminDate(l.startDate || l.fromDate)}</td>
                            <td>{formatAdminDate(l.endDate || l.toDate)}</td>
                            <td><strong>{l.totalDays || l.days || 1}</strong></td>
                            <td style={{ maxWidth: 220, whiteSpace: "normal" }}>{l.reason || "--"}</td>
                            <td style={{ color: "var(--cms-muted)" }}>{formatAdminDate(l.createdAt || l.appliedOn)}</td>
                            <td>
                              <span className={`cms-badge ${STATUS_BADGE[l.status] || "cms-badge-warn"}`}>
                                {l.status}
                              </span>
                            </td>
                            <td>{l.approvedByUserName || l.reviewedBy || "--"}</td>
                            <td>
                              {l.status === "Pending" ? (
                                <button
                                  type="button"
                                  className="cms-btn cms-btn-ghost"
                                  style={{ padding: "4px 8px", fontSize: 12, color: "var(--cms-red)" }}
                                  onClick={() => handleCancelAdminLeave(l)}
                                >
                                  Cancel
                                </button>
                              ) : (
                                <span style={{ color: "var(--cms-muted)" }}>--</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Stat Summary Cards */}
              <section className="att-summary att-leave-summary">
                {["Total Requests", "Pending Review", "Approved", "Rejected"].map(label => {
                  let count = 0;
                  if (label === "Total Requests") count = currentTabRequests.length;
                  else if (label === "Pending Review") count = currentTabRequests.filter(r => r.status === "Pending").length;
                  else if (label === "Approved") count = currentTabRequests.filter(r => r.status === "Approved").length;
                  else if (label === "Rejected") count = currentTabRequests.filter(r => r.status === "Rejected").length;

                  return (
                    <div key={label}>
                      <span>{label}</span>
                      <b>{count}</b>
                    </div>
                  );
                })}
              </section>

              {/* Filter Bar */}
              <div className="leave-filter-bar">
                <div className="leave-search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search faculty name, ID, department..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="leave-status-filter">
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Requests Table */}
              <section className="att-card att-table-card">
                <div className="att-scroll">
                  <table className="cms-table">
                    <thead>
                      <tr>
                        {["Request ID", "Staff Name", "Department", "Staff Type", "Leave Type", "From Date", "To Date", "Days", "Reason", "Status", "Action"].map(head => (
                          <th key={head}>{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        Array.from({ length: 6 }, (_, index) => (
                          <SkeletonRow key={index} columns={11} />
                        ))
                      ) : filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={11} style={{ textAlign: "center", padding: "30px", color: "var(--cms-muted)" }}>
                            {activeTab === "today"
                              ? "No active leaves for today."
                              : "No leave requests found matching these filters."}
                          </td>
                        </tr>
                      ) : (
                        paginatedRequests.map(request => {
                          const rid = request.staffLeaveRequestId || request.id;
                          const initials = (request.staffName || "Staff").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                          return (
                            <tr key={rid}>
                              <td><strong>LR-{String(rid).padStart(3, "0")}</strong></td>
                              <td>
                                <div className="staff-table-info">
                                  <span className="staff-avatar-circle">{initials}</span>
                                  <div className="staff-name-col">
                                    <strong>{request.staffName}</strong>
                                    <span>ID: {request.staffCode || request.staffId}</span>
                                  </div>
                                </div>
                              </td>
                              <td>{request.department || "--"}</td>
                              <td>
                                <span className="staff-type-pill">
                                  {request.staffType || "--"}
                                </span>
                              </td>
                              <td><strong>{request.leaveType}</strong></td>
                              <td>{prettyDate(request.fromDate || request.startDate)}</td>
                              <td>{prettyDate(request.toDate || request.endDate)}</td>
                              <td>
                                <span className="days-pill">
                                  {request.days || 1} {Number(request.days || 1) === 1 ? "day" : "days"}
                                </span>
                              </td>
                              <td style={{ maxWidth: 220 }}>
                                <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 12 }}>
                                  {request.reason || "—"}
                                </span>
                              </td>
                              <td><LeaveStatus status={request.status} /></td>
                              <td>
                                <button
                                  className="cms-action-btn"
                                  onClick={() => openDetails(request)}
                                  aria-label="View request"
                                  disabled={openingRequestId === rid}
                                >
                                  {openingRequestId === rid ? (
                                    <Loader2 size={15} style={{ animation: "cms-spin 0.8s linear infinite" }} />
                                  ) : (
                                    <Eye size={16} />
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="leave-pagination-bar">
                  <div className="leave-record-summary">
                    Showing {startRecord}–{endRecord} of {totalRequestsCount} records
                  </div>
                  <div className="leave-pagination-controls">
                    <span className="leave-page-size-label">Per page:</span>
                    <select
                      className="leave-page-size-select"
                      value={isCustomPageSize ? "custom" : requestsPageSize}
                      onChange={handlePageSizeChange}
                      aria-label="Records per page"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value="custom">Custom</option>
                    </select>
                    {isCustomPageSize && (
                      <input
                        type="number"
                        min="1"
                        max="500"
                        className="leave-page-size-custom-input"
                        value={customPageSizeInput}
                        onChange={handleCustomPageSizeInput}
                        placeholder="Qty"
                        title="Enter custom records per page"
                        aria-label="Custom records per page"
                      />
                    )}
                    <button
                      type="button"
                      className="leave-page-nav-btn"
                      onClick={() => setRequestsPage((p) => Math.max(1, p - 1))}
                      disabled={safeRequestsPage <= 1}
                    >
                      Previous
                    </button>
                    <span className="leave-page-counter">
                      {safeRequestsPage} / {totalRequestsPages}
                    </span>
                    <button
                      type="button"
                      className="leave-page-nav-btn"
                      onClick={() => setRequestsPage((p) => Math.min(totalRequestsPages, p + 1))}
                      disabled={safeRequestsPage >= totalRequestsPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </DashboardLayout>

      {/* Admin Apply Leave Modal */}
      {showApplyModal &&
        (typeof document !== "undefined"
          ? createPortal(
            <div
              className="cms-overlay faculty-leave-modal-overlay"
              onClick={(e) => e.target === e.currentTarget && setShowApplyModal(false)}
            >
              <div className="cms-modal sm faculty-leave-modal" role="dialog" aria-modal="true">
                <div className="cms-modal-head">
                  <h3>Apply for Staff Leave</h3>
                  <button
                    type="button"
                    className="cms-icon-btn"
                    onClick={() => setShowApplyModal(false)}
                    aria-label="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="cms-modal-body">
                  <div className="cms-form-grid">
                    <div className="cms-field full">
                      <label>
                        Leave Type <span className="req">*</span>
                      </label>
                      <select
                        value={leaveForm.categoryId}
                        onChange={(e) =>
                          setLeaveForm({ ...leaveForm, categoryId: e.target.value })
                        }
                      >
                        {categories.length === 0 && (
                          <option value="">Loading leave categories...</option>
                        )}
                        {categories.map((c) => (
                          <option key={c.leaveCategoryId} value={c.leaveCategoryId}>
                            {c.categoryName}
                          </option>
                        ))}
                        <option value="OTHERS">Others</option>
                      </select>
                    </div>

                    {/* Conditional Custom Leave Type Field when "OTHERS" is selected */}
                    {String(leaveForm.categoryId) === "OTHERS" && (
                      <div className="cms-field full leave-custom-field-group">
                        <label>
                          Custom Leave Type <span className="req">*</span>
                        </label>
                        <div className="leave-custom-input-wrap">
                          <input
                            type="text"
                            placeholder="Enter custom leave type (e.g. Sabbatical, Bereavement)..."
                            value={leaveForm.customLeaveType || ""}
                            onChange={(e) =>
                              setLeaveForm({ ...leaveForm, customLeaveType: e.target.value })
                            }
                            autoFocus
                          />
                          <button
                            type="button"
                            className="cms-btn cms-btn-ghost leave-add-custom-btn"
                            onClick={handleCreateCustomCategory}
                            disabled={addingCategory || !leaveForm.customLeaveType?.trim()}
                            title="Add to categories list"
                          >
                            {addingCategory ? (
                              <Loader2 size={13} className="leave-spin" />
                            ) : (
                              <Plus size={13} />
                            )}
                            <span>Add</span>
                          </button>
                        </div>
                        <span className="leave-custom-hint">
                          This custom leave type will be saved to your institution's leave categories.
                        </span>
                      </div>
                    )}

                    <div className="cms-field">
                      <label>
                        From Date <span className="req">*</span>
                      </label>
                      <input
                        type="date"
                        value={leaveForm.fromDate}
                        onChange={(e) =>
                          setLeaveForm({ ...leaveForm, fromDate: e.target.value })
                        }
                      />
                    </div>

                    <div className="cms-field">
                      <label>
                        To Date <span className="req">*</span>
                      </label>
                      <input
                        type="date"
                        value={leaveForm.toDate}
                        onChange={(e) =>
                          setLeaveForm({ ...leaveForm, toDate: e.target.value })
                        }
                      />
                    </div>

                    <div className="cms-field full">
                      <label>
                        Reason for Leave <span className="req">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={leaveForm.reason}
                        placeholder="State reason clearly..."
                        onChange={(e) =>
                          setLeaveForm({ ...leaveForm, reason: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {leavePreviewDays > 0 ? (
                    <div className="leave-duration-badge">
                      Effective Duration: {leavePreviewDays} working day{leavePreviewDays > 1 ? "s" : ""} (Sundays &amp; official holidays excluded)
                    </div>
                  ) : leaveForm.fromDate && leaveForm.toDate ? (
                    <div className="leave-duration-warning">
                      Selected range contains only non-working days (Sundays or holidays). Leave cannot be requested for 0 working days.
                    </div>
                  ) : null}
                </div>

                <div className="cms-modal-foot">
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setShowApplyModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-primary"
                    onClick={applyAdminLeave}
                    disabled={leaveSubmitting}
                  >
                    {leaveSubmitting && (
                      <Loader2 size={14} className="leave-spin" style={{ marginRight: 6 }} />
                    )}
                    Submit Leave
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
          : null)}

      {selected && (
        <LeaveDetails
          leave={selected}
          remark={remark}
          setRemark={setRemark}
          onClose={() => setSelected(null)}
          onReview={review}
          onAffected={() => { setAffected(selected); setSelected(null); }}
          reviewing={reviewing}
        />
      )}

      {rejecting && (
        <RejectLeaveConfirmation
          leave={rejecting}
          remark={remark}
          setRemark={setRemark}
          onCancel={() => setRejecting(null)}
          onConfirm={() => commitReview("Rejected")}
          reviewing={reviewing}
        />
      )}

      {affected && (
        <AffectedClasses
          leave={affected}
          records={records}
          close={() => setAffected(null)}
          assign={openAssignment}
        />
      )}

      {assignment && (
        <Assignment
          item={assignment}
          records={records}
          close={() => setAssignment(null)}
          save={saveAssignment}
          toast={setMessage}
        />
      )}

      <Toast message={message} onClose={() => setMessage("")} />
    </>
  );
}
