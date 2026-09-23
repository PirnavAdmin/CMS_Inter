import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Edit3, Eye, Flag, PartyPopper, Plus, Search, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, SkeletonTable, Modal, Toast } from "@/components/common/Ui.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import holidayApi from "@/api/holidayApi.js";
import { holidayRecords } from "@/data/mockData.js";
import "./HolidayManagementPage.css";

const PAGE_SIZE = 5;
const TYPES = ["National Holiday", "Festival Holiday", "Special Holiday", "Other"];
const APPLIES_TO = ["All Students & Staff", "Students Only", "Staff Only"];
const EMPTY_HOLIDAY = {
  holidayName: "",
  holidayType: "Festival Holiday",
  dateType: "Single Day",
  startDate: "",
  endDate: "",
  appliesTo: "All Students & Staff",
  description: "",
  status: "Active",
};

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function getHolidayStartDate(holiday) {
  return holiday.startDate || holiday.holidayDate || "";
}

function getHolidayEndDate(holiday) {
  return holiday.endDate || getHolidayStartDate(holiday);
}

function todayIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getHolidayLifecycleStatus(holiday) {
  if (holiday.lifecycleStatus) return holiday.lifecycleStatus;
  if (holiday.status === "Inactive") return "Inactive";
  return getHolidayEndDate(holiday) < todayIso() ? "Completed" : "Active";
}

function dateRange(holiday) {
  if (holiday.formattedDateRange) return holiday.formattedDateRange;
  const startDate = getHolidayStartDate(holiday);
  const endDate = getHolidayEndDate(holiday);
  return holiday.dateType === "Date Range" && holiday.endDate && holiday.endDate !== startDate
    ? `${formatDate(startDate)} - ${formatDate(endDate)}`
    : formatDate(startDate);
}

function HolidayStatus({ holiday }) {
  const lifecycleStatus = getHolidayLifecycleStatus(holiday);
  return <span className={`holiday-status is-${lifecycleStatus.toLowerCase()}`}><i />{lifecycleStatus}</span>;
}

function HolidayForm({ holiday, onClose, onSave, saving }) {
  const [values, setValues] = useState(holiday || EMPTY_HOLIDAY);
  const [errors, setErrors] = useState({});
  const setValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value, ...(name === "dateType" && value === "Single Day" ? { endDate: "" } : {}) }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };
  const submit = () => {
    const nextErrors = {};
    if (!values.holidayName.trim()) nextErrors.holidayName = "Holiday name is required.";
    if (!values.startDate) nextErrors.startDate = "Date is required.";
    if (values.dateType === "Date Range" && !values.endDate) nextErrors.endDate = "End date is required.";
    if (values.dateType === "Date Range" && values.startDate && values.endDate && values.endDate < values.startDate) nextErrors.endDate = "End date must be on or after the start date.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave({ ...values, holidayName: values.holidayName.trim(), description: (values.description || "").trim() });
  };
  const fieldClass = (name) => `cms-field ${errors[name] ? "has-error" : ""}`;
  return (
    <Modal
      title={holiday ? "Edit Holiday" : "Add Holiday"}
      onClose={onClose}
      className="holiday-modal"
      footer={
        <>
          <button type="button" className="cms-btn cms-btn-ghost" disabled={saving} onClick={onClose}>Cancel</button>
          <button type="button" className="cms-btn cms-btn-primary" disabled={saving} onClick={submit}>
            {saving ? "Saving..." : holiday ? "Save Changes" : "Add Holiday"}
          </button>
        </>
      }
    >
      <div className="holiday-form-grid">
        <div className={`${fieldClass("holidayName")} full`}>
          <label htmlFor="holiday-name">Holiday Name <span className="req">*</span></label>
          <input id="holiday-name" value={values.holidayName} onChange={(event) => setValue("holidayName", event.target.value)} placeholder="Enter holiday name" />
          {errors.holidayName ? <span className="cms-error">{errors.holidayName}</span> : null}
        </div>
        <div className={fieldClass("holidayType")}>
          <label htmlFor="holiday-type">Holiday Type</label>
          <select className="app-select" id="holiday-type" value={values.holidayType} onChange={(event) => setValue("holidayType", event.target.value)}>
            {TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </div>
        <div className={fieldClass("appliesTo")}>
          <label htmlFor="holiday-applies">Applies To</label>
          <select className="app-select" id="holiday-applies" value={values.appliesTo} onChange={(event) => setValue("appliesTo", event.target.value)}>
            {APPLIES_TO.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <fieldset className="holiday-date-type full">
          <legend>Date Type</legend>
          <label><input type="radio" name="dateType" checked={values.dateType === "Single Day"} onChange={() => setValue("dateType", "Single Day")} /> Single Day</label>
          <label><input type="radio" name="dateType" checked={values.dateType === "Date Range"} onChange={() => setValue("dateType", "Date Range")} /> Date Range</label>
        </fieldset>
        <div className={fieldClass("startDate")}>
          <label htmlFor="holiday-start">{values.dateType === "Date Range" ? "Start Date" : "Date"} <span className="req">*</span></label>
          <input id="holiday-start" type="date" value={values.startDate} onChange={(event) => setValue("startDate", event.target.value)} />
          {errors.startDate ? <span className="cms-error">{errors.startDate}</span> : null}
        </div>
        {values.dateType === "Date Range" ? (
          <div className={fieldClass("endDate")}>
            <label htmlFor="holiday-end">End Date <span className="req">*</span></label>
            <input id="holiday-end" type="date" value={values.endDate} min={values.startDate} onChange={(event) => setValue("endDate", event.target.value)} />
            {errors.endDate ? <span className="cms-error">{errors.endDate}</span> : null}
          </div>
        ) : (
          <div className={fieldClass("status")}>
            <label htmlFor="holiday-status">Status</label>
            <select className="app-select" id="holiday-status" value={values.status} onChange={(event) => setValue("status", event.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        )}
        {values.dateType === "Date Range" ? (
          <div className={fieldClass("status")}>
            <label htmlFor="holiday-status">Status</label>
            <select className="app-select" id="holiday-status" value={values.status} onChange={(event) => setValue("status", event.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        ) : null}
        <div className={`${fieldClass("description")} full`}>
          <label htmlFor="holiday-description">Description</label>
          <textarea id="holiday-description" value={values.description} onChange={(event) => setValue("description", event.target.value)} placeholder="Optional holiday details" />
        </div>
      </div>
    </Modal>
  );
}

export default function HolidayManagementPage() {
  const { selectedAcademicYearId, selectedBoardId } = useAcademicContext();
  const [holidays, setHolidays] = useState(holidayRecords);
  const [summary, setSummary] = useState({ total: 8, national: 3, festival: 5, upcoming: 7, completed: 1 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("All");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [appliedRange, setAppliedRange] = useState(null);
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [formHoliday, setFormHoliday] = useState(undefined);
  const [viewHoliday, setViewHoliday] = useState(null);
  const [deleteHoliday, setDeleteHoliday] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const months = useMemo(() => Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: new Intl.DateTimeFormat("en-IN", { month: "long" }).format(new Date(2026, index, 1)) })), []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, listRes] = await Promise.allSettled([
        holidayApi.getSummary({ academicYearId: selectedAcademicYearId || undefined, boardId: selectedBoardId || undefined }),
        holidayApi.getHolidays({ academicYearId: selectedAcademicYearId || undefined, boardId: selectedBoardId || undefined, page: 1, pageSize: 100 }),
      ]);

      if (summaryRes.status === "fulfilled" && summaryRes.value) {
        setSummary(summaryRes.value);
      }

      if (listRes.status === "fulfilled" && Array.isArray(listRes.value?.data) && listRes.value.data.length > 0) {
        setHolidays(listRes.value.data);
      }
    } catch (err) {
      console.warn("Using local holiday data fallback:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYearId, selectedBoardId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Chronological sort
  const sortedHolidays = useMemo(() => {
    return [...holidays].sort((a, b) => {
      const dateA = getHolidayStartDate(a);
      const dateB = getHolidayStartDate(b);
      return dateA.localeCompare(dateB);
    });
  }, [holidays]);

  // Comprehensive client-side filter
  const filteredHolidays = useMemo(() => {
    return sortedHolidays.filter((holiday) => {
      // 1. Text Search Filter
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const text = `${holiday.holidayName} ${holiday.holidayType} ${holiday.appliesTo} ${holiday.description || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      // 2. Type Filter
      if (type !== "All") {
        const hType = (holiday.holidayType || "").trim().toLowerCase();
        const selType = type.trim().toLowerCase();
        const isFestival = (selType.includes("festival") && hType.includes("festival"));
        if (!isFestival && hType !== selType) {
          return false;
        }
      }

      // 3. Status Filter (Lifecycle: Active, Upcoming, Completed, Inactive)
      if (status !== "All") {
        const lifecycle = getHolidayLifecycleStatus(holiday).toLowerCase();
        const target = status.toLowerCase();
        if (target === "active" || target === "upcoming") {
          if (lifecycle !== "active" && lifecycle !== "upcoming") return false;
        } else if (lifecycle !== target) {
          return false;
        }
      }

      // 4. Month Filter
      const startDate = getHolidayStartDate(holiday);
      const endDate = getHolidayEndDate(holiday);
      if (month !== "All" && month !== "Custom Range") {
        const isMonthMatch = (dateStr) => {
          if (!dateStr) return false;
          const d = new Date(`${dateStr}T00:00:00`);
          if (isNaN(d.getTime())) return false;
          const mNum = String(d.getMonth() + 1);
          const mLong = new Intl.DateTimeFormat("en-IN", { month: "long" }).format(d);
          const mShort = new Intl.DateTimeFormat("en-IN", { month: "short" }).format(d);
          return mNum === month || mLong.toLowerCase() === month.toLowerCase() || mShort.toLowerCase() === month.toLowerCase();
        };
        if (!isMonthMatch(startDate) && !isMonthMatch(endDate)) {
          return false;
        }
      }

      // 5. Custom Range Filter
      if (appliedRange?.from && appliedRange?.to) {
        if (startDate > appliedRange.to || endDate < appliedRange.from) {
          return false;
        }
      }

      return true;
    });
  }, [sortedHolidays, query, type, status, month, appliedRange]);

  const totalCount = filteredHolidays.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filteredHolidays.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const updateFilter = (setter) => (value) => { setter(value); setPage(1); };
  const changeMonth = (value) => {
    setMonth(value);
    setPage(1);
    if (value !== "Custom Range") {
      setCustomRange({ from: "", to: "" });
      setAppliedRange(null);
    }
  };

  const applyCustomRange = () => {
    if (!customRange.from || !customRange.to) {
      setToast({ message: "Please select both From Date and To Date.", type: "error" });
      return;
    }
    if (customRange.to < customRange.from) {
      setToast({ message: "To Date cannot be earlier than From Date.", type: "error" });
      return;
    }
    setAppliedRange(customRange);
    setPage(1);
  };

  const saveHoliday = async (values) => {
    try {
      setSaving(true);
      const payload = {
        ...values,
        academicYearId: selectedAcademicYearId ? Number(selectedAcademicYearId) : null,
        boardId: selectedBoardId ? Number(selectedBoardId) : null,
      };

      if (formHoliday?.id) {
        await holidayApi.updateHoliday(formHoliday.id, payload);
        setToast({ message: "Holiday updated successfully.", type: "success" });
      } else {
        await holidayApi.createHoliday(payload);
        setToast({ message: "Holiday added successfully.", type: "success" });
      }

      setFormHoliday(undefined);
      await loadData();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save holiday.";
      setToast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteHoliday) return;
    try {
      await holidayApi.deleteHoliday(deleteHoliday.id);
      setToast({ message: "Holiday deleted successfully.", type: "success" });
      setDeleteHoliday(null);
      await loadData();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to delete holiday.";
      setToast({ message: msg, type: "error" });
    }
  };

  return (
    <DashboardLayout
      title="Holiday Management"
      subtitle="Manage holidays for the selected academic year."
      breadcrumb={["Academic"]}
      actions={
        <button type="button" className="cms-btn cms-btn-primary" onClick={() => setFormHoliday(null)}>
          <Plus size={16} /> Add Holiday
        </button>
      }
    >
      <div className="holiday-page">
        <section className="holiday-summary" aria-label="Holiday summary">
          <article className="holiday-stat is-primary"><span><CalendarDays size={19} /></span><div><small>Total Holidays</small><strong>{summary.total}</strong></div></article>
          <article className="holiday-stat is-blue"><span><Flag size={19} /></span><div><small>National Holidays</small><strong>{summary.national}</strong></div></article>
          <article className="holiday-stat is-amber"><span><PartyPopper size={19} /></span><div><small>Festival Holidays</small><strong>{summary.festival}</strong></div></article>
          <article className="holiday-stat is-violet"><span><Clock3 size={19} /></span><div><small>Upcoming Holidays</small><strong>{summary.upcoming}</strong></div></article>
          <article className="holiday-stat is-completed"><span><CheckCircle2 size={19} /></span><div><small>Completed Holidays</small><strong>{summary.completed}</strong></div></article>
        </section>

        <section className="cms-card holiday-list-card">
          <div className="cms-card-head"><div><h2>Holiday List</h2><p>Review and maintain academic holidays.</p></div></div>
          <div className="holiday-filters">
            <label className="holiday-search app-search-field">
              <Search className="app-search-field__icon" size={16} />
              <input value={query} onChange={(event) => updateFilter(setQuery)(event.target.value)} placeholder="Search holidays..." />
            </label>
            <select className="app-select" value={month} onChange={(event) => changeMonth(event.target.value)} aria-label="Filter by month">
              <option value="All">All Months</option>
              {months.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              <option value="Custom Range">Custom Range</option>
            </select>
            {month === "Custom Range" ? (
              <>
                <label className="holiday-date-filter">
                  <span>From Date</span>
                  <input type="date" value={customRange.from} onChange={(event) => setCustomRange((current) => ({ ...current, from: event.target.value }))} />
                </label>
                <label className="holiday-date-filter">
                  <span>To Date</span>
                  <input type="date" min={customRange.from} value={customRange.to} onChange={(event) => setCustomRange((current) => ({ ...current, to: event.target.value }))} />
                </label>
              </>
            ) : null}
            <select className="app-select" value={type} onChange={(event) => updateFilter(setType)(event.target.value)} aria-label="Filter by holiday type">
              <option value="All">All Types</option>
              {TYPES.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="app-select" value={status} onChange={(event) => updateFilter(setStatus)(event.target.value)} aria-label="Filter by status">
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Completed">Completed</option>
              <option value="Inactive">Inactive</option>
            </select>
            {month === "Custom Range" ? (
              <button type="button" className="cms-btn cms-btn-primary holiday-apply" onClick={applyCustomRange}>
                Apply
              </button>
            ) : null}
          </div>

          <div className="cms-table-wrap">
            <table className="cms-table holiday-table">
              <thead>
                <tr>
                  <th>Date / Range</th>
                  <th>Holiday Name</th>
                  <th>Type</th>
                  <th>Applies To</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>
                      <SkeletonTable columns={6} rows={5} />
                    </td>
                  </tr>
                ) : rows.length ? (
                  rows.map((holiday) => (
                    <tr key={holiday.id}>
                      <td>{dateRange(holiday)}</td>
                      <td className="holiday-name">{holiday.holidayName}</td>
                      <td><span className="holiday-type">{holiday.holidayType}</span></td>
                      <td>{holiday.appliesTo}</td>
                      <td className="holiday-description">{holiday.description || "-"}</td>
                      <td><HolidayStatus holiday={holiday} /></td>
                      <td>
                        <div className="holiday-actions">
                          <button type="button" className="cms-action-btn" title="View holiday" aria-label="View holiday" onClick={() => setViewHoliday(holiday)}>
                            <Eye size={15} />
                          </button>
                          <button type="button" className="cms-action-btn" title="Edit holiday" aria-label="Edit holiday" onClick={() => setFormHoliday(holiday)}>
                            <Edit3 size={15} />
                          </button>
                          <button type="button" className="cms-action-btn danger" title="Delete holiday" aria-label="Delete holiday" onClick={() => setDeleteHoliday(holiday)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="holiday-empty">No holidays match the selected filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="holiday-pagination">
            <span>
              Showing {totalCount ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} holiday{totalCount === 1 ? "" : "s"}
            </span>
            <div>
              <button type="button" className="cms-btn cms-btn-ghost" disabled={currentPage === 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                Prev
              </button>
              <b>{currentPage}</b>
              <button type="button" className="cms-btn cms-btn-ghost" disabled={currentPage === totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      {formHoliday !== undefined ? (
        <HolidayForm holiday={formHoliday} saving={saving} onClose={() => setFormHoliday(undefined)} onSave={saveHoliday} />
      ) : null}

      {viewHoliday ? (
        <Modal title="Holiday Details" onClose={() => setViewHoliday(null)} size="sm" footer={<button type="button" className="cms-btn cms-btn-primary" onClick={() => setViewHoliday(null)}>Close</button>}>
          <div className="holiday-detail-grid">
            <div><small>Holiday Name</small><strong>{viewHoliday.holidayName}</strong></div>
            <div><small>Type</small><strong>{viewHoliday.holidayType}</strong></div>
            <div><small>Date / Range</small><strong>{dateRange(viewHoliday)}</strong></div>
            <div><small>Applies To</small><strong>{viewHoliday.appliesTo}</strong></div>
            <div><small>Status</small><HolidayStatus holiday={viewHoliday} /></div>
            <div className="full"><small>Description</small><strong>{viewHoliday.description || "-"}</strong></div>
          </div>
        </Modal>
      ) : null}

      {deleteHoliday ? (
        <ConfirmDialog
          danger
          title="Delete holiday"
          message={`Delete ${deleteHoliday.holidayName}?`}
          confirmLabel="Delete"
          onCancel={() => setDeleteHoliday(null)}
          onConfirm={handleDelete}
        />
      ) : null}

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
    </DashboardLayout>
  );
}
