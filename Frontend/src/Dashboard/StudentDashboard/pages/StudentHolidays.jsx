import { useEffect, useState } from "react";
import { CalendarDays, CalendarCheck, CalendarClock, List, ChevronLeft, ChevronRight } from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { SkeletonPage } from "@/components/common/Ui.jsx";
import StudentCard from "../components/StudentCard.jsx";
import StudentDataTable from "../components/StudentDataTable.jsx";
import StudentPageHeader from "../components/StudentPageHeader.jsx";
import StudentSummaryCard from "../components/StudentSummaryCard.jsx";
import { useStudentProfile } from "../context/StudentProfileContext.jsx";
import studentApiEndpoints from "../api/studentApiEndpoints.js";

const unwrap = (data) => data?.data?.data ?? data?.data ?? data?.Data ?? data ?? {};
const read = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null && value !== "");
const extract = (data) => { const value = unwrap(data); if (Array.isArray(value)) return value; for (const key of ["items", "Items", "holidays", "Holidays", "records", "Records", "$values"]) if (Array.isArray(value?.[key])) return value[key]; return []; };
const parseDate = (value) => {
  const date = value ? new Date(`${String(value).slice(0, 10)}T00:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};
const formatDate = (date) => date ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const weekday = (date) => date ? date.toLocaleDateString("en-IN", { weekday: "long" }) : "—";
const category = (type) => /national/i.test(type) ? "national" : /festival/i.test(type) ? "festival" : "other";
const normalizeHoliday = (item, today) => {
  const start = parseDate(read(item, "startDate", "StartDate", "holidayDate", "HolidayDate", "date", "Date", "fromDate", "FromDate"));
  const end = parseDate(read(item, "endDate", "EndDate", "toDate", "ToDate")) || start;
  return { name: read(item, "holidayName", "HolidayName", "name", "Name", "title", "Title") || "Holiday", start, end,
    type: read(item, "holidayType", "HolidayType", "type", "Type") || "Other",
    description: read(item, "description", "Description") || "—",
    status: !start ? "Not provided" : end < today ? "Past" : start > today ? "Upcoming" : "Ongoing" };
};

export default function StudentHolidays() {
  const { profile: student, loading: profileLoading, error: profileError } = useStudentProfile();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("list");
  const [type, setType] = useState("All Types");
  const [period, setPeriod] = useState("All Holidays");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const [page, setPage] = useState(1);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!student) { setLoading(false); return; }
      setLoading(true); setError("");
      try {
        const response = await apiClient.get(studentApiEndpoints.holidays.list, { params: { CampusId: student.campusId, AcademicYearId: student.academicYearId, BoardId: student.boardId, Page: 1, PageSize: 100 } });
        if (active) { setHolidays(extract(response.data)); setPage(1); }
      } catch (requestError) { if (active) setError(getApiErrorMessage(requestError)); }
      finally { if (active) setLoading(false); }
    };
    if (!profileLoading) load();
    return () => { active = false; };
  }, [profileLoading, student]);
  if (profileLoading || loading) return <div className="sp-page"><SkeletonPage variant="table" columns={6} rows={5}/></div>;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const items = holidays.map((item) => normalizeHoliday(item, today)).sort((a, b) => (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity));
  const upcoming = items.filter((item) => item.status === "Upcoming");
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const types = [...new Set(items.map((item) => item.type))];
  const filtered = items.filter((item) => (type === "All Types" || item.type === type) && (period === "All Holidays" || item.status === period) && (!selectedDate || (item.start && item.start <= selectedDate && item.end >= selectedDate)));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const firstCell = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
  const calendarItems = items.filter((item) => type === "All Types" || item.type === type);
  const navigateMonth = (offset) => { setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1)); setSelectedDate(null); setPage(1); };
  const calendar = <StudentCard className="sp-holiday-calendar" title={month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} action={<div className="sp-holiday-calendar-actions"><button className="sp-icon-action" aria-label="Previous month" onClick={() => navigateMonth(-1)}><ChevronLeft size={16}/></button><button className="sp-icon-action" aria-label="Next month" onClick={() => navigateMonth(1)}><ChevronRight size={16}/></button><button className="sp-btn" onClick={() => { setMonth(thisMonthStart); setSelectedDate(null); setPage(1); }}>Today</button></div>}>
    <div className="sp-holiday-calendar-grid">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <small key={day}>{day}</small>)}{Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index);
      const matches = calendarItems.filter((item) => item.start && item.start <= date && item.end >= date);
      const label = `${formatDate(date)}${matches.length ? `: ${matches.map((item) => item.name).join(", ")}` : ": No holidays"}`;
      return <button key={index} title={label} aria-label={label} aria-pressed={selectedDate?.getTime() === date.getTime()} aria-current={date.getTime() === today.getTime() ? "date" : undefined} className={`${date.getMonth() !== month.getMonth() ? "is-outside" : ""} ${matches.length ? `has-holiday is-${category(matches[0].type)}` : ""} ${date.getTime() === today.getTime() ? "is-today" : ""} ${selectedDate?.getTime() === date.getTime() ? "is-selected" : ""}`} onClick={() => { setSelectedDate(selectedDate?.getTime() === date.getTime() ? null : date); setPage(1); }}>{date.getDate()}{matches.length ? <i/> : null}</button>;
    })}</div><div className="sp-holiday-legend">{["National", "Festival", "Other"].map((label) => <span className={`is-${label.toLowerCase()}`} key={label}><i/>{label}</span>)}</div>
    {selectedDate ? <p className="sp-muted">Selected: {formatDate(selectedDate)} <button className="sp-holiday-clear" onClick={() => { setSelectedDate(null); setPage(1); }}>Clear</button></p> : null}
  </StudentCard>;
  return <div className="sp-page sp-holidays-page">
    <StudentPageHeader title="Holidays" subtitle={student?.academicYearName ? `Academic holiday calendar for ${student.academicYearName}.` : "Academic holiday calendar."}/>
    {profileError || error ? <div className="sp-api-state is-error">{profileError || error}</div> : null}
    <div className="sp-summary-grid four"><StudentSummaryCard icon={CalendarDays} label="Total Holidays" value={items.length} note="In the loaded academic calendar"/><StudentSummaryCard icon={CalendarClock} label="Upcoming Holidays" value={upcoming.length} note={upcoming[0] ? `Next: ${formatDate(upcoming[0].start)}` : "No upcoming holidays"} tone="blue"/><StudentSummaryCard icon={CalendarDays} label="This Month" value={items.filter((item) => item.start && item.start <= thisMonthEnd && item.end >= thisMonthStart).length} note={today.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} tone="orange"/><StudentSummaryCard icon={CalendarCheck} label="Past Holidays" value={items.filter((item) => item.status === "Past").length} note="Completed calendar holidays"/></div>
    <div className="sp-holiday-toolbar"><div className="sp-actions"><button className={`sp-btn ${view === "list" ? "primary" : ""}`} aria-pressed={view === "list"} onClick={() => setView("list")}><List size={15}/> List View</button><button className={`sp-btn ${view === "calendar" ? "primary" : ""}`} aria-pressed={view === "calendar"} onClick={() => setView("calendar")}><CalendarDays size={15}/> Calendar View</button></div><div className="sp-holiday-filters"><select aria-label="Holiday type" value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}><option>All Types</option>{types.map((label) => <option key={label}>{label}</option>)}</select><select aria-label="Holiday status" value={period} onChange={(event) => { setPeriod(event.target.value); setPage(1); }}>{["All Holidays", "Upcoming", "Ongoing", "Past"].map((label) => <option key={label}>{label}</option>)}</select><span className="sp-college-managed">{student?.academicYearName || "Academic calendar"}</span></div></div>
    <div className={`sp-holiday-layout ${view === "calendar" ? "is-calendar-view" : ""}`}>
      <StudentCard title={selectedDate ? `Holidays · ${formatDate(selectedDate)}` : period === "All Holidays" ? "Academic Holidays" : `${period} Holidays`} subtitle={`${filtered.length} holiday${filtered.length === 1 ? "" : "s"}`}>
        <StudentDataTable columns={["Holiday", "Date", "Day", "Type", "Description", "Status"]} rows={filtered.slice((currentPage - 1) * 10, currentPage * 10).map((item) => [item.name, item.start && item.end > item.start ? `${formatDate(item.start)} - ${formatDate(item.end)}` : formatDate(item.start), item.start && item.end > item.start ? `${weekday(item.start)} - ${weekday(item.end)}` : weekday(item.start), item.type, item.description, item.status])} renderCell={(value, row, column, index) => index === 3 ? <span className={`sp-holiday-type is-${category(value)}`}>{value}</span> : index === 5 ? <span className={`sp-holiday-status is-${String(value).toLowerCase()}`}>{value}</span> : value} empty="No holidays match the selected filters."/>
        {filtered.length ? <div className="sp-pagination"><span>Showing {(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, filtered.length)} of {filtered.length} holidays</span><div><button className="sp-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><strong>{currentPage} / {pages}</strong><button className="sp-btn" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></div> : null}
      </StudentCard>{calendar}
    </div>
  </div>;
}
