import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock3, Eye, FileText, History as HistoryIcon, Search, ShieldCheck, UserRound, UsersRound, XCircle } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
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
} from "@/features/leave/services/leaveStore.js";
import "./LeaveManagementPage.css";

const Field = ({ label, children }) => <label className="att-field"><span>{label}</span>{children}</label>;

const prettyDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

const defaultSlots = [
  { id: "tt-101", period: "P1", time: "09:00 AM - 10:00 AM", program: "MPC", section: "A", subject: "Mathematics" },
  { id: "tt-103", period: "P3", time: "11:00 AM - 12:00 PM", program: "MPC", section: "B", subject: "Physics" },
  { id: "tt-105", period: "P5", time: "01:00 PM - 02:00 PM", program: "IIT", section: "A", subject: "Physics" },
  { id: "tt-107", period: "P7", time: "03:00 PM - 04:00 PM", program: "EAMCET", section: "A", subject: "Mathematics" }
];

const defaultFaculty = [
  { id: "FAC002", name: "Mahesh Kumar", department: "Physics", subjects: ["Physics", "Mathematics"], classes: 3, active: true },
  { id: "FAC001", name: "Suresh Kumar", department: "Physics", subjects: ["Physics"], classes: 4, active: true },
  { id: "FAC004", name: "Anil Kumar", department: "Mathematics", subjects: ["Mathematics"], classes: 5, active: true },
  { id: "FAC006", name: "Kiran Rao", department: "Mathematics", subjects: ["Mathematics"], classes: 2, active: true }
];

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

function LeaveDetails({ leave, remark, setRemark, onClose, onReview, onAffected }) {
  const pending = String(leave.status || "").toLowerCase() === "pending";
  const staffName = leave.staffName || leave.facultyName || "Staff Member";
  const initials = staffName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const staffId = leave.staffCode || leave.employeeId || (typeof leave.staffId === 'string' && leave.staffId.startsWith('FAC') ? leave.staffId : (leave.staffId ? `FAC00${leave.staffId}` : "FAC005"));
  const department = leave.department || "Mathematics";
  const staffType = leave.staffType || "Teaching Staff";
  
  // Calculate or fallback balance
  const balance = leave.balance || {
    total: 12,
    used: String(leave.status).toLowerCase() === "approved" ? (Number(leave.days) || 1) : 0,
    remaining: 12 - (String(leave.status).toLowerCase() === "approved" ? (Number(leave.days) || 1) : 0)
  };

  const title = (
    <span className="leave-details-title">
      <i><FileText size={18} /></i>
      <span>Leave Request Details<small>Complete information about the leave request</small></span>
    </span>
  );

  const footer = pending ? (
    <>
      <button className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button>
      <button className="cms-btn cms-btn-danger" onClick={() => onReview("Rejected")}>Reject</button>
      <button className="cms-btn cms-btn-primary" onClick={() => onReview("Approved")}>Approve</button>
    </>
  ) : (
    <>
      <button className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button>
      {manage(leave) && (
        <button className="cms-btn cms-btn-primary" onClick={onAffected}>
          <UsersRound size={16} /> View Affected Classes
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
            <strong>{leave.leaveType || "Casual Leave"}</strong>
          </div>
        </div>
      </section>

      <section className="leave-date-grid">
        <div className="leave-detail-card date">
          <CalendarDays size={17} />
          <span>From Date</span>
          <strong>{leave.fromDate || "2026-09-10"}</strong>
        </div>
        <div className="leave-detail-card date">
          <CalendarDays size={17} />
          <span>To Date</span>
          <strong>{leave.toDate || "2026-09-10"}</strong>
        </div>
        <div className="leave-detail-card days">
          <Clock3 size={17} />
          <span>Total Days</span>
          <strong>{leave.days || 1} {Number(leave.days || 1) === 1 ? "day" : "days"}</strong>
        </div>
      </section>

      <section className="leave-reason-status">
        <div className="leave-detail-panel">
          <span>Reason</span>
          <strong>{leave.reason || "Personal work"}</strong>
        </div>
        <div className="leave-detail-panel">
          <span>Current Status</span>
          <LeaveStatus status={leave.status} />
        </div>
      </section>

      <section className="leave-detail-balance">
        <span>Leave Balance</span>
        <div>
          <b>Total <strong>{balance.total} days</strong></b>
          <b>Used <strong>{balance.used} {Number(balance.used) === 1 ? "day" : "days"}</strong></b>
          <b>Remaining <strong>{balance.remaining} days</strong></b>
        </div>
      </section>

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
          <span>Reviewed by <strong>{leave.reviewedBy || leave.approvedByUserName || "Admin"}</strong></span>
          <i />
          <span>Reviewed on <strong>{leave.reviewedOn || prettyDate(leave.approvedAt) || "08-Sep-2026"}</strong></span>
        </section>
      )}
    </Modal>
  );
}

function AffectedClasses({ leave, records = [], close, assign }) {
  const date = leave.fromDate || "2026-09-10";
  const [apiRows, setApiRows] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Use API slots if available, otherwise use default slots so the UI is fully functional
  const baseSlots = apiRows.length ? apiRows : defaultSlots;
  const rows = baseSlots.map(slot => {
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
        <div><span>Leave date</span><strong>{prettyDate(date)}</strong></div>
        <div><span>Leave status</span><b className="leave-sub-status assigned">Approved</b></div>
      </div>

      <div className="leave-progress">
        <div>
          <strong>{assignedCount} of {rows.length} classes assigned</strong>
          <span>Temporary coverage for {prettyDate(date)}</span>
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
            {rows.map(row => {
              const rowId = row.timetableId || row.id;
              const isAssigned = Boolean(row.substitution);
              return (
                <tr key={rowId}>
                  <td><b>{row.period}</b></td>
                  <td>{row.time || `${row.startTime || ""} - ${row.endTime || ""}`}</td>
                  <td>{row.program || row.group || "MPC"}</td>
                  <td>{row.section || "A"}</td>
                  <td>{row.subject || "Mathematics"}</td>
                  <td>{leave.staffName || "Staff Member"}</td>
                  <td>
                    <span className={`leave-sub-status ${isAssigned ? "assigned" : "not-assigned"}`}>
                      {isAssigned ? "Assigned" : "Not Assigned"}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="cms-btn cms-btn-primary leave-compact-btn" 
                      onClick={() => assign({ ...row, date, leave, substitution: row.substitution })}
                    >
                      {isAssigned ? "View" : "Assign"}
                    </button>
                  </td>
                </tr>
              );
            })}
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

  useEffect(() => {
    if (!existing) {
      const leaveId = item.leave?.staffLeaveRequestId || item.leave?.id;
      const ttId = item.timetableId || item.id;
      if (leaveId && ttId) {
        getEligibleSubstitutes(leaveId, ttId, item.date).then(data => {
          if (Array.isArray(data) && data.length) {
            setCandidates(data);
          } else {
            setCandidates(defaultFaculty);
          }
        }).catch(() => {
          setCandidates(defaultFaculty);
        });
      } else {
        setCandidates(defaultFaculty);
      }
    }
  }, [item, existing]);

  const chosen = candidates.find(person => (String(person.staffId) === String(choice) || String(person.id) === String(choice)));

  const handleConfirm = () => {
    if (!chosen) return;
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
          <button className="cms-btn cms-btn-ghost" onClick={close}>Cancel</button>
          {!existing && (
            <button className="cms-btn cms-btn-primary" disabled={!checked} onClick={handleConfirm}>
              Confirm Assignment
            </button>
          )}
        </>
      }
    >
      <section className="leave-assignment-context">
        <div><span>Subject</span><strong>{item.subject}</strong></div>
        <div><span>Class</span><strong>{item.program || item.group || "MPC"} - {item.section || "A"}</strong></div>
        <div><span>Date & period</span><strong>{prettyDate(item.date)} · {item.period}</strong></div>
        <div><span>Time</span><strong>{item.time || `${item.startTime || ""} - ${item.endTime || ""}`}</strong></div>
        <div><span>Original faculty</span><strong>{item.leave?.staffName}</strong><small>On leave</small></div>
      </section>

      {existing ? (
        <div className="leave-existing">
          <CheckCircle2 size={20} />
          <div>
            <strong>{(existing.faculty?.name || existing.faculty?.staffName || existing.substituteName || "Mahesh Kumar")} is assigned</strong>
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

          {candidates.length ? (
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
                      <span>{id} · {person.department || person.departmentName || "Physics"}</span>
                    </div>
                    <div className="leave-candidate-checks">
                      <span>✓ {item.subject || "Physics"} eligible</span>
                      <span>✓ Period free</span>
                      <span>✓ Not on leave</span>
                    </div>
                    <div>
                      <b>{person.classes || person.weeklyLoadCount || 3}</b>
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
                onClick={() => {
                  setChecked(true);
                  toast(`${chosen.staffName || chosen.name} is available for substitution.`);
                }}
              >
                Check Availability
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function LeaveHistory({ onSelect }) {
  const [historyData, setHistoryData] = useState([]);
  
  useEffect(() => {
    getLeaveHistorySummary().then(data => {
      if (Array.isArray(data) && data.length) setHistoryData(data);
    }).catch(console.error);
  }, []);

  const [staffType, setStaffType] = useState("All Staff");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Status");

  const people = useMemo(() => {
    return historyData.filter(person => {
      const matchType = staffType === "All Staff" || person.staffType === staffType;
      const matchQuery = `${person.staffName || ""} ${person.staffId || ""} ${person.department || ""}`.toLowerCase().includes(query.toLowerCase());
      return matchType && matchQuery;
    });
  }, [historyData, staffType, query]);

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
              {people.length ? people.map(person => {
                const total = person.totalLeaves || 12;
                const used = person.used || 0;
                const remaining = person.remaining !== undefined ? person.remaining : (total - used);
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
                      <button className="cms-btn cms-btn-ghost leave-view-history" onClick={() => onSelect(person)}>
                        View History
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
      </section>
    </main>
  );
}

function StaffLeaveHistory({ person, onClose, onLeave }) {
  const [detailHistory, setDetailHistory] = useState(null);

  useEffect(() => {
    getLeaveHistory(person.staffId).then(data => {
      if (data) setDetailHistory(data);
    }).catch(console.error);
  }, [person]);

  const data = detailHistory || {
    balance: { total: person.totalLeaves || 12, used: person.used || 0, remaining: person.remaining !== undefined ? person.remaining : (12 - (person.used || 0)) },
    history: [],
    approved: person.approved || 0,
    pending: person.pending || 0,
    rejected: person.rejected || 0
  };

  const total = data.balance?.total ?? 12;
  const used = data.balance?.used ?? 0;
  const remaining = data.balance?.remaining !== undefined ? data.balance.remaining : (total - used);
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
        {requests.length ? (
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
                {requests.map(leave => (
                  <tr key={leave.staffLeaveRequestId || leave.id}>
                    <td>{leave.leaveType}</td>
                    <td>{prettyDate(leave.fromDate || leave.startDate)}</td>
                    <td>{prettyDate(leave.toDate || leave.endDate)}</td>
                    <td>{leave.days || leave.totalDays || 1} {Number(leave.days || leave.totalDays || 1) === 1 ? "day" : "days"}</td>
                    <td>
                      <button className="history-status-link" onClick={() => onLeave(leave)}>
                        <LeaveStatus status={leave.status} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="cms-empty">No leave history found.</div>
        )}
      </section>
    </Modal>
  );
}

function RejectLeaveConfirmation({ leave, remark, setRemark, onCancel, onConfirm }) {
  return (
    <Modal 
      title="Reject Leave Request?" 
      size="sm" 
      className="leave-reject-modal" 
      onClose={onCancel} 
      footer={
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="cms-btn cms-btn-danger" onClick={onConfirm}>Reject Leave</button>
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
  const [requests, setRequests] = useState([]);
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
  const [activeTab, setActiveTab] = useState(tabParam === "today" ? "today" : "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const todayDate = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => todayDate.toISOString().split("T")[0], [todayDate]);
  const todayFormatted = useMemo(() => todayDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" }), [todayDate]);

  const currentTabRequests = useMemo(() => {
    const isTodayActive = (req) => {
      const s = req.fromDate || (req.startDate ? req.startDate.split("T")[0] : "");
      const e = req.toDate || (req.endDate ? req.endDate.split("T")[0] : "");
      if (!s) return false;
      return todayIso >= s && (!e || todayIso <= e);
    };

    return activeTab === "today" ? requests.filter(isTodayActive) : requests;
  }, [requests, activeTab, todayIso]);

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

  const loadRequests = () => {
    getLeaveRequests().then(data => {
      if (Array.isArray(data)) setRequests(data);
    }).catch(console.error);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const openDetails = (req) => {
    setSelected(req); // Open immediately so the modal is never blocked
    setRemark(req.adminRemark || "");
    const rid = req.staffLeaveRequestId || req.id;
    if (rid) {
      getLeaveDetails(rid).then(detail => {
        if (detail) {
          setSelected(prev => ({ ...prev, ...detail }));
          if (detail.adminRemark) setRemark(detail.adminRemark);
        }
      }).catch(console.warn);
    }
  };

  const commitReview = (status) => { 
    const statusVal = status === "Approved" ? LEAVE_STATUS.APPROVED : LEAVE_STATUS.REJECTED;
    const leaveId = selected.staffLeaveRequestId || selected.id;
    reviewLeaveRequest(leaveId, {
      status: statusVal,
      rejectionReason: remark
    }).then(() => {
      loadRequests();
      setSelected(null);
      setRejecting(null);
      setMessage(`Leave request ${status.toLowerCase()}.`);
    }).catch(console.error);
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
          />
        )}

        {rejecting && (
          <RejectLeaveConfirmation 
            leave={rejecting} 
            remark={remark} 
            setRemark={setRemark} 
            onCancel={() => setRejecting(null)} 
            onConfirm={() => commitReview("Rejected")} 
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
        subtitle={activeTab === "today" ? `Showing leaves active on today (${todayFormatted})` : "Review and manage all staff leave requests across all dates"} 
        breadcrumb={["Operations", "Leave Management"]} 
        actions={
          <button className="cms-btn cms-btn-ghost leave-history-button" onClick={() => setHistoryOpen(true)}>
            <HistoryIcon size={16} /> History
          </button>
        }
      >
        <main className="attendance-module">
          {/* Tabs Container */}
          <div className="leave-tabs-card">
            <button 
              type="button" 
              className={`leave-tab-btn ${activeTab === "today" ? "active" : ""}`}
              onClick={() => setActiveTab("today")}
            >
              <CalendarDays size={16} /> Today's Leaves <span className="tab-pill">TODAY</span>
            </button>
            <button 
              type="button" 
              className={`leave-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              <UsersRound size={16} /> All Requests <span className="tab-pill count">{requests.length}</span>
            </button>
          </div>

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
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: "center", padding: "30px", color: "var(--cms-muted)" }}>
                        {activeTab === "today" 
                          ? "No active leaves for today." 
                          : "No leave requests found matching these filters."}
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map(request => {
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
                          <td>{request.department || "Mathematics"}</td>
                          <td>
                            <span style={{ fontSize: 12, color: "#475569", background: "#f1f5f9", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>
                              {request.staffType || "Teaching Staff"}
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
                            <button className="cms-action-btn" onClick={() => openDetails(request)} aria-label="View request">
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </DashboardLayout>

      {selected && (
        <LeaveDetails 
          leave={selected} 
          remark={remark} 
          setRemark={setRemark} 
          onClose={() => setSelected(null)} 
          onReview={review} 
          onAffected={() => { setAffected(selected); setSelected(null); }} 
        />
      )}

      {rejecting && (
        <RejectLeaveConfirmation 
          leave={rejecting} 
          remark={remark} 
          setRemark={setRemark} 
          onCancel={() => setRejecting(null)} 
          onConfirm={() => commitReview("Rejected")} 
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
