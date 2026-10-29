// Strictly read-only Exam Cell Student Attendance Screen
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Download,
  Eye,
  PieChart,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import DashboardLayout from "../layout/ExamCellPageLayout.jsx";
import Search3DIcon from "@/shared/components/Search3DIcon.jsx";
import { SkeletonPage, Toast } from "@/shared/components/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import holidayApi from "@/api/holidayApi.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import { getModuleState, saveModuleState } from "../statePersistence.js";
import "@/modules/admin/AdminAttendance/AttendancePage.css";
import "@/modules/admin/AdminAttendance/AttendanceTimingConfigPage.css";

const STUDENT_STATUSES = ["Present", "Absent", "Half Day"];
const STUDENT_SESSION_STATUSES = ["Present", "Absent"];

const dailyStudentStatus = (morning, afternoon) => {
  if (!STUDENT_SESSION_STATUSES.includes(morning) || !STUDENT_SESSION_STATUSES.includes(afternoon)) {
    if (morning === "Present" || afternoon === "Present") return "Present";
    if (morning === "Absent" || afternoon === "Absent") return "Absent";
    return "Not Marked";
  }
  return morning === afternoon ? morning : "Half Day";
};

const STUDENT_LABEL = { 1: "Present", 2: "Absent", 4: "Half Day", 5: "Holiday" };

const asList = (v) =>
  Array.isArray(v)
    ? v
    : Array.isArray(v?.items)
    ? v.items
    : Array.isArray(v?.records)
    ? v.records
    : Array.isArray(v?.data)
    ? v.data
    : [];

const body = (r) => r?.data?.data ?? r?.data ?? r ?? {};

const get = (o, ...keys) => keys.map((k) => o?.[k]).find((v) => v !== undefined && v !== null);

const num = (v) => (v === "" || v == null ? undefined : Number(v));

const getTodayDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const studentStatus = (v) => STUDENT_LABEL[v] ?? (v === "Half-Day" ? "Half Day" : v) ?? "—";

const studentSessionStatus = (row, session) =>
  studentStatus(
    get(
      row,
      `${session}Status`,
      `${session}AttendanceStatus`,
      `${session}SessionStatus`,
      session,
      `${session}Attendance`
    )
  );

const attendancePercentage = (row) => {
  const parsed = Number.parseFloat(String(get(row, "attendancePercentage", "percentage") ?? 0).replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const ATTENDANCE_PAGE_SIZE = 10;

const Field = ({ label, children }) => (
  <label className="att-field">
    <span>{label}</span>
    {children}
  </label>
);

function Select({ label, value, onChange, items = [], all, disabled = false, mutedPlaceholder = false }) {
  return (
    <Field label={label}>
      <select
        className={mutedPlaceholder && !value ? "is-placeholder" : undefined}
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        {all ? <option value="">{all}</option> : null}
        {items.map((x) => {
          const id =
            get(
              x,
              "id",
              "Id",
              "sectionId",
              "programId",
              "groupId",
              "academicLevelId",
              "academicYearId",
              "boardId"
            ) ?? x;
          const name =
            get(
              x,
              "name",
              "Name",
              "sectionName",
              "programName",
              "programmeName",
              "groupName",
              "levelName",
              "academicYearName",
              "boardName"
            ) ?? x;
          return (
            <option key={String(id)} value={id}>
              {name}
            </option>
          );
        })}
      </select>
    </Field>
  );
}

function AttendancePagination({ page, totalRows, onPageChange, unit = "records" }) {
  const totalPages = totalRows === 0 ? 0 : Math.ceil(totalRows / ATTENDANCE_PAGE_SIZE);
  const currentPage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const start = totalRows ? (currentPage - 1) * ATTENDANCE_PAGE_SIZE + 1 : 0;
  const end = Math.min(currentPage * ATTENDANCE_PAGE_SIZE, totalRows);

  const pageNumbers = totalPages <= 0
    ? []
    : totalPages === 1
    ? [1]
    : currentPage <= 2
    ? [1, 2]
    : [currentPage - 1, currentPage];

  return (
    <nav className="att-pagination" aria-label="Attendance pages">
      <span className="att-pagination-summary">
        Showing ${start}–${end} of ${totalRows} records
      </span>
      <div className="att-pagination-controls">
        <button type="button" disabled={currentPage <= 1 || totalPages === 0 || totalRows === 0} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous Page">
          Previous
        </button>
        {pageNumbers.map((p) => (
          <button
            key={"page-" + p}
            type="button"
            className={p === currentPage ? "active is-active" : ""}
            onClick={() => onPageChange(p)}
            aria-label={"Page " + p}
          >
            {p}
          </button>
        ))}
        <button type="button" disabled={currentPage >= totalPages || totalPages === 0 || totalRows === 0} onClick={() => onPageChange(currentPage + 1)} aria-label="Next Page">
          Next
        </button>
      </div>
    </nav>
  );
}

export default function AttendancePage() {
  const [notice, setNotice] = useState({ message: "", type: "success" });
  const say = (message, type = "success") => setNotice({ message, type });

  return (
    <>
      <DashboardLayout
        title="Attendance"
        subtitle="View student attendance records managed by Admin"
        breadcrumb={["Student Operations", "Attendance"]}
      >
        <main className="attendance-module">
          <Screen say={say} />
        </main>
      </DashboardLayout>
      <Toast
        message={notice.message}
        type={notice.type}
        onClose={() => setNotice({ message: "", type: "success" })}
      />
    </>
  );
}

function useStudentOptions(boardId, academicYearId, levelId, groupId, programId) {
  const [options, setOptions] = useState({
    levels: [],
    groups: [],
    programs: [],
    sections: [],
    loadingLevels: false,
    loadingGroups: false,
    loadingPrograms: false,
    loadingSections: false,
  });

  const scoped = (rows, selected, keys) =>
    rows.filter((row) => {
      const rowValue = get(row, ...keys);
      return rowValue == null || rowValue === "" || String(rowValue) === String(selected);
    });

  const unique = (rows, keys) => {
    const seen = new Set();
    return rows.filter((row) => {
      const id = String(get(row, ...keys) ?? "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  useEffect(() => {
    if (!boardId) {
      setOptions((value) => ({ ...value, levels: [], groups: [], programs: [], sections: [] }));
      return undefined;
    }
    let active = true;
    setOptions((value) => ({ ...value, levels: [], loadingLevels: true }));
    apiClient
      .get(apiEndpoints.boards.academicLevels, { params: { boardId } })
      .then(
        (response) =>
          active &&
          setOptions((value) => ({
            ...value,
            levels: unique(scoped(asList(body(response)), boardId, ["boardId", "BoardId"]), [
              "academicLevelId",
              "AcademicLevelId",
              "levelId",
              "LevelId",
              "id",
              "Id",
            ]),
            loadingLevels: false,
          }))
      )
      .catch(() => active && setOptions((value) => ({ ...value, levels: [], loadingLevels: false })));
    return () => {
      active = false;
    };
  }, [boardId]);

  useEffect(() => {
    if (!boardId) {
      setOptions((value) => ({ ...value, groups: [], loadingGroups: false }));
      return undefined;
    }
    let active = true;
    setOptions((value) => ({ ...value, groups: [], loadingGroups: true }));
    const params = { academicYearId, isActive: true };
    if (levelId) params.academicLevelId = levelId;
    apiClient
      .get(apiEndpoints.groups.getByBoard(boardId), { params })
      .then((response) => {
        if (!active) return;
        const payload = body(response);
        const wrappers = asList(payload);
        let groupRows = Array.isArray(payload?.groups)
          ? payload.groups
          : Array.isArray(payload?.Groups)
          ? payload.Groups
          : wrappers.flatMap((item) =>
              Array.isArray(item?.groups)
                ? item.groups
                : Array.isArray(item?.Groups)
                ? item.Groups
                : Array.isArray(item?.groupList)
                ? item.groupList
                : Array.isArray(item?.data)
                ? item.data
                : get(item, "groupId", "GroupId", "id", "Id") != null
                ? [item]
                : []
            );
        groupRows = scoped(
          scoped(groupRows, boardId, ["boardId", "BoardId"]),
          academicYearId,
          ["academicYearId", "AcademicYearId"]
        );
        if (levelId) {
          groupRows = scoped(groupRows, levelId, ["academicLevelId", "AcademicLevelId", "levelId", "LevelId"]);
        }
        setOptions((value) => ({
          ...value,
          groups: unique(
            groupRows.filter((item) => item?.isActive !== false && item?.IsActive !== false),
            ["groupId", "GroupId", "id", "Id"]
          ),
          loadingGroups: false,
        }));
      })
      .catch(() => active && setOptions((value) => ({ ...value, groups: [], loadingGroups: false })));
    return () => {
      active = false;
    };
  }, [boardId, academicYearId, levelId]);

  useEffect(() => {
    let active = true;
    setOptions((value) => ({ ...value, programs: [], loadingPrograms: true }));
    const endpoint = groupId ? apiEndpoints.groups.programs(groupId) : apiEndpoints.programs.getAll;
    apiClient
      .get(endpoint)
      .then((response) => {
        if (!active) return;
        let progRows = asList(body(response));
        if (groupId) {
          progRows = scoped(progRows, groupId, ["groupId", "GroupId"]);
        }
        setOptions((value) => ({
          ...value,
          programs: unique(progRows, [
            "programId",
            "ProgramId",
            "programmeId",
            "ProgrammeId",
            "groupProgramId",
            "GroupProgramId",
            "id",
            "Id",
          ]),
          loadingPrograms: false,
        }));
      })
      .catch(() => active && setOptions((value) => ({ ...value, programs: [], loadingPrograms: false })));
    return () => {
      active = false;
    };
  }, [groupId]);

  useEffect(() => {
    let active = true;
    const selectedProgram = options.programs.find(
      (program) =>
        String(
          get(
            program,
            "id",
            "Id",
            "programId",
            "ProgramId",
            "programmeId",
            "ProgrammeId",
            "groupProgramId",
            "GroupProgramId"
          )
        ) === String(programId)
    );
    const validProgramIds = new Set(
      [
        programId,
        get(selectedProgram, "programId", "ProgramId", "programmeId", "ProgrammeId"),
        get(selectedProgram, "groupProgramId", "GroupProgramId"),
      ]
        .filter((id) => id != null && id !== "")
        .map(String)
    );
    const selectedProgramName = String(
      get(
        selectedProgram,
        "programName",
        "ProgramName",
        "programmeName",
        "ProgrammeName",
        "name",
        "Name"
      ) ?? ""
    )
      .trim()
      .toLowerCase();
    setOptions((value) => ({ ...value, sections: [], loadingSections: true }));
    const params = { boardId, academicYearId, isActive: true, IsActive: true };
    if (levelId) params.academicLevelId = levelId;
    if (groupId) params.groupId = groupId;
    if (programId) {
      params.programId = programId;
      params.ProgramId = programId;
    }
    apiClient
      .get(apiEndpoints.sections.list, { params })
      .then((response) => {
        if (!active) return;
        let sectionRows = asList(body(response));
        sectionRows = scoped(
          scoped(
            scoped(scoped(sectionRows, boardId, ["boardId", "BoardId"]), academicYearId, [
              "academicYearId",
              "AcademicYearId",
            ]),
            levelId,
            ["academicLevelId", "AcademicLevelId", "levelId", "LevelId"]
          ),
          groupId,
          ["groupId", "GroupId"]
        );
        if (programId) {
          sectionRows = sectionRows.filter((section) => {
            const sectionProgramIds = [
              get(section, "programId", "ProgramId", "programmeId", "ProgrammeId"),
              get(section, "groupProgramId", "GroupProgramId"),
            ]
              .filter((id) => id != null && id !== "")
              .map(String);
            if (sectionProgramIds.length) return sectionProgramIds.some((id) => validProgramIds.has(id));
            const sectionProgramName = String(
              get(
                section,
                "programName",
                "ProgramName",
                "programmeName",
                "ProgrammeName",
                "programme",
                "Programme",
                "program",
                "Program"
              ) ?? ""
            )
              .trim()
              .toLowerCase();
            return Boolean(selectedProgramName && sectionProgramName === selectedProgramName);
          });
        }
        setOptions((value) => ({
          ...value,
          sections: unique(
            sectionRows.filter((section) => section?.isActive !== false && section?.IsActive !== false),
            ["sectionId", "SectionId", "id", "Id"]
          ),
          loadingSections: false,
        }));
      })
      .catch(() => active && setOptions((value) => ({ ...value, sections: [], loadingSections: false })));
    return () => {
      active = false;
    };
  }, [boardId, academicYearId, levelId, groupId, programId, options.programs]);

  return options;
}

function Screen({ say }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBoardId: navbarBoardId, selectedAcademicYearId: navbarAcademicYearId } =
    useAcademicContext();
  const campusCtx = useCampusContext();
  const navbarCampusId = campusCtx?.selectedCampus?.campusId || campusCtx?.selectedCampus?.id || null;
  const savedAttState = getModuleState("attendance", {});
  const restoredState = location.state?.attendanceState || (savedAttState?.filters ? savedAttState : null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const getInitialView = () => {
    if (tabParam === "monthly") return "Monthly Report";
    if (tabParam === "defaulters") return "Defaulters";
    if (tabParam === "daily") return "Daily Attendance";
    if (restoredState?.filters?.view) return restoredState.filters.view;
    return "Daily Attendance";
  };

  const defaultFilters = {
    date: getTodayDate(),
    level: "",
    group: "",
    section: "",
    program: "",
    status: "",
    view: getInitialView(),
  };

  const [f, setF] = useState(() =>
    restoredState?.filters ? { ...restoredState.filters, view: getInitialView() } : defaultFilters
  );
  const [rows, setRows] = useState(() => restoredState?.rows || []);
  const [report, setReport] = useState(() => restoredState?.report || null);
  const [loaded, setLoaded] = useState(() => Boolean(restoredState?.loaded));
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(() => restoredState?.search || "");
  const [page, setPage] = useState(() => restoredState?.page || 1);
  const [attendanceThreshold, setAttendanceThreshold] = useState(() => restoredState?.attendanceThreshold || 75);
  const [activeHoliday, setActiveHoliday] = useState(() => restoredState?.activeHoliday || null);
  const initialAcademicContext = useRef(`${navbarCampusId}:${navbarBoardId}:${navbarAcademicYearId}`);
  const skipInitialPageReset = useRef(true);

  useEffect(() => {
    saveModuleState("attendance", {
      filters: f,
      rows,
      report,
      loaded,
      search,
      page,
      attendanceThreshold,
      activeHoliday,
    });
  }, [f, rows, report, loaded, search, page, attendanceThreshold, activeHoliday]);

  const studentOptions = useStudentOptions(
    navbarBoardId,
    navbarAcademicYearId,
    f.level,
    f.group,
    f.program
  );

  const update = (key) => (e) => {
    setPage(1);
    setF((old) => ({
      ...old,
      [key]: e.target.value,
      ...(key === "level" ? { group: "", program: "", section: "" } : {}),
      ...(key === "group" ? { program: "", section: "" } : {}),
      ...(key === "program" ? { section: "" } : {}),
    }));
  };

  const switchView = (newView) => {
    setPage(1);
    setF((old) => ({ ...old, view: newView }));
    const tabKey =
      newView === "Monthly Report"
        ? "monthly"
        : newView === "Defaulters"
        ? "defaulters"
        : "";
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tabKey) {
          next.set("tab", tabKey);
        } else {
          next.delete("tab");
        }
        return next;
      },
      { replace: false }
    );
  };

  useEffect(() => {
    const tabKey = searchParams.get("tab");
    const targetView =
      tabKey === "monthly"
        ? "Monthly Report"
        : tabKey === "defaulters"
        ? "Defaulters"
        : "Daily Attendance";
    setF((old) => (old.view === targetView ? old : { ...old, view: targetView }));
  }, [searchParams]);

  useEffect(() => {
    const currentAcademicContext = `${navbarCampusId}:${navbarBoardId}:${navbarAcademicYearId}`;
    if (initialAcademicContext.current === currentAcademicContext) return;
    initialAcademicContext.current = currentAcademicContext;
    setF((old) => ({ ...old, level: "", group: "", program: "", section: "" }));
  }, [navbarCampusId, navbarBoardId, navbarAcademicYearId]);

  const monthParams = () => {
    const [year, month] = f.date.slice(0, 7).split("-");
    return {
      month: Number(month),
      year: Number(year),
      campusId: num(navbarCampusId),
      boardId: num(navbarBoardId),
      academicYearId: num(navbarAcademicYearId),
      academicLevelId: num(f.level),
      groupId: num(f.group),
      sectionId: num(f.section),
      ...(f.program ? { programId: num(f.program) } : {}),
    };
  };

  const load = async (overrideView) => {
    const currentView = typeof overrideView === "string" ? overrideView : f.view;
    setPage(1);
    setBusy(true);
    try {
      const holidayPromise = (async () => {
        try {
          const holidays = await holidayApi.getHolidays({
            boardId: num(navbarBoardId),
            academicYearId: num(navbarAcademicYearId),
          });
          const holidayList = Array.isArray(holidays) ? holidays : holidays?.data || [];
          const targetDate = f.date.slice(0, 10);
          const match = holidayList.find((h) => {
            const start = (h.startDate || h.StartDate || "").slice(0, 10);
            const end = (h.endDate || h.EndDate || start).slice(0, 10);
            return targetDate >= start && targetDate <= end;
          });
          setActiveHoliday(match || null);
        } catch {
          setActiveHoliday(null);
        }
      })();

      const fetchPromise = (async () => {
        if (currentView === "Monthly Report") {
          const r = await apiClient.get(apiEndpoints.attendance.studentMonthlyReport, {
            params: monthParams(),
          });
          setReport(body(r));
        } else if (currentView === "Defaulters") {
          try {
            const r = await apiClient.get(apiEndpoints.attendance.studentDefaulters, {
              params: { ...monthParams(), threshold: attendanceThreshold || 75 },
              silent: true,
              skipErrorLog: true,
            });
            setRows(asList(body(r)));
          } catch {
            // Fallback: derive defaulters list from monthly report if defaulters endpoint has role restrictions
            const r = await apiClient.get(apiEndpoints.attendance.studentMonthlyReport, {
              params: monthParams(),
            });
            const rep = body(r);
            const studentList = rep.studentRows || rep.students || rep.rows || rep.items || [];
            const threshold = attendanceThreshold || 75;
            const defaulters = asList(studentList)
              .map((s) => ({
                ...s,
                attendancePercentage: s.attendancePercentage ?? s.percentage ?? 0,
              }))
              .filter((s) => Number(String(s.attendancePercentage).replace("%", "")) < threshold);
            setRows(defaulters);
          }
        } else {
          let rowsData = [];
          const queryParams = {
            date: f.date,
            campusId: num(navbarCampusId),
            boardId: num(navbarBoardId),
            academicYearId: num(navbarAcademicYearId),
            academicLevelId: num(f.level),
            groupId: num(f.group),
            sectionId: num(f.section),
            ...(f.program ? { programId: num(f.program) } : {}),
          };

          try {
            const r = await apiClient.get(apiEndpoints.attendance.studentAdminDaily, {
              params: queryParams,
            });
            rowsData = asList(body(r));
          } catch {
            try {
              // Fallback to general students attendance endpoint if admin endpoint has role constraints
              const r2 = await apiClient.get(apiEndpoints.attendance.students, {
                params: queryParams,
              });
              rowsData = asList(body(r2));
            } catch {
              try {
                // Secondary fallback to attendance search endpoint
                const r3 = await apiClient.get(apiEndpoints.attendance.search, {
                  params: queryParams,
                });
                rowsData = asList(body(r3));
              } catch {
                rowsData = [];
              }
            }
          }
          setRows(rowsData);
        }
      })();

      await Promise.all([holidayPromise, fetchPromise]);
      setLoaded(true);
    } catch (e) {
      say(getApiErrorMessage(e) || "Failed to load student attendance records.", "error");
      setLoaded(true);
    } finally {
      setBusy(false);
    }
  };

  const dailyLoader = useRef(load);
  dailyLoader.current = load;
  const restoredDailyLoad = useRef(Boolean(restoredState?.loaded));

  useEffect(() => {
    if (!navbarBoardId || !navbarAcademicYearId) return;
    if (restoredDailyLoad.current) {
      restoredDailyLoad.current = false;
      return;
    }
    const timer = window.setTimeout(() => dailyLoader.current(), 200);
    return () => window.clearTimeout(timer);
  }, [
    navbarCampusId,
    navbarBoardId,
    navbarAcademicYearId,
    f.date,
    f.level,
    f.group,
    f.program,
    f.section,
    f.view,
  ]);

  const exportReport = async (kind) => {
    setBusy(true);
    try {
      const endpoint =
        kind === "csv"
          ? apiEndpoints.attendance.studentMonthlyExportCsv
          : apiEndpoints.attendance.studentMonthlyExportExcel;
      const r = await apiClient.get(endpoint, { params: monthParams(), responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `student-attendance-${f.date.slice(0, 7)}.${kind === "csv" ? "csv" : "xlsx"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      say(getApiErrorMessage(e) || "Failed to export monthly report.", "error");
    } finally {
      setBusy(false);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const visible = rows
    .filter((r) => {
      if (!normalizedSearch) return true;
      return [
        get(r, "studentName", "name"),
        get(r, "rollNo", "rollNumber"),
        get(r, "admissionNo", "admissionNumber"),
        get(r, "studentId", "id"),
        get(r, "groupName"),
        get(r, "sectionName"),
      ].some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
    })
    .filter((r) => {
      if (!f.status) return true;
      const m = studentSessionStatus(r, "morning");
      const a = studentSessionStatus(r, "afternoon");
      const overall = dailyStudentStatus(m, a);
      return overall === f.status || m === f.status || a === f.status;
    });

  const normalizedThreshold = attendanceThreshold === "" ? 0 : Number(attendanceThreshold);
  const defaulterRows =
    f.view === "Defaulters"
      ? visible.filter((row) => attendancePercentage(row) < normalizedThreshold)
      : visible;
  const totalPages = Math.max(1, Math.ceil(defaulterRows.length / ATTENDANCE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = defaulterRows.slice(
    (currentPage - 1) * ATTENDANCE_PAGE_SIZE,
    currentPage * ATTENDANCE_PAGE_SIZE
  );

  useEffect(() => {
    if (skipInitialPageReset.current) {
      skipInitialPageReset.current = false;
      return;
    }
    setPage(1);
  }, [rows]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const recordsToolbar = (
    <div className="att-student-search att-records-search-toolbar">
      <div className="att-student-search-box">
        <Search3DIcon size={18} />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by student name, roll no. or admission no..."
        />
      </div>
      <div className="att-toolbar-actions">
        <span className="cms-badge" style={{ background: "var(--cms-primary-soft)", color: "var(--cms-primary)", fontWeight: 600 }}>
          Read-Only View
        </span>
      </div>
    </div>
  );

  return (
    <>
      <Filters
        f={f}
        update={update}
        o={studentOptions}
        busy={busy}
        load={load}
        exportReport={exportReport}
        search={search}
        onSearchChange={setSearch}
        switchView={switchView}
      />

      {busy && !loaded ? <SkeletonPage variant="table" columns={7} rows={6} /> : null}

      {loaded &&
        (f.view === "Monthly Report" ? (
          <Monthly
            data={report}
            monthValue={f.date}
            page={page}
            onPageChange={setPage}
            search={search}
            onSearchChange={setSearch}
          />
        ) : f.view === "Defaulters" ? (
          <Defaulters
            rows={pagedRows}
            totalRows={defaulterRows.length}
            page={currentPage}
            onPageChange={setPage}
            threshold={attendanceThreshold}
            onThresholdChange={(value) => {
              setAttendanceThreshold(value);
              setPage(1);
            }}
          />
        ) : (
          <>
            {activeHoliday && (
              <div className="att-holiday-banner">
                <span className="att-holiday-banner-badge">Official Holiday</span>
                <strong>{activeHoliday.holidayName || activeHoliday.name}</strong>
                <span>
                  ({activeHoliday.holidayType || "General Holiday"}) — Official institution holiday.
                </span>
              </div>
            )}
            <StudentSummary rows={visible} />
            <section className="att-card att-student-record-controls">
              {recordsToolbar}
              <StudentAttendanceFilters f={f} update={update} o={studentOptions} />
            </section>
            <section className="att-card att-table-card">
              <DailyTable
                rows={pagedRows}
                emptyMessage={normalizedSearch ? "No students found matching your search." : undefined}
                view={(record) => {
                  const personId = get(record, "studentId", "id");
                  if (personId != null) {
                    navigate(`/exam-cell-dashboard/attendance/student/${personId}/overview`, {
                      state: {
                        attendanceState: {
                          filters: f,
                          rows,
                          report,
                          loaded,
                          search,
                          page: currentPage,
                          activeHoliday,
                        },
                      },
                    });
                  }
                }}
              />
              <AttendancePagination page={currentPage} totalRows={visible.length} onPageChange={setPage} />
            </section>
          </>
        ))}
    </>
  );
}

function Filters({ f, update, o, busy, exportReport, search, onSearchChange, switchView }) {
  const isMonth = f.view === "Monthly Report";
  const label = new Date(`${f.date.slice(0, 7)}-01T00:00:00`)
    .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    .replace(" ", ", ");

  return (
    <>
      <div className="att-student-date-card">
        {isMonth ? (
          <Field label="Month">
            <div className="att-month-picker">
              <span>{label}</span>
              <CalendarDays size={18} />
              <input
                type="month"
                value={f.date.slice(0, 7)}
                onChange={(event) => update("date")({ target: { value: `${event.target.value}-01` } })}
              />
            </div>
          </Field>
        ) : (
          <Field label={<>Date <span className="req">*</span></>}>
            <input type="date" value={f.date} onChange={update("date")} />
          </Field>
        )}
        <AttendanceViewSection view={f.view} update={switchView} />
        {isMonth ? (
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            disabled={busy}
            onClick={() => exportReport("excel")}
          >
            <Download size={15} /> Export
          </button>
        ) : null}
      </div>
      {f.view !== "Daily Attendance" && f.view !== "Attendance" ? (
        <section className="att-card att-student-report-filters">
          <label className="att-student-top-search">
            <Search3DIcon size={18} />
            <input
              type="search"
              aria-label="Search students"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, admission no, roll no..."
            />
          </label>
          <StudentAttendanceFilters f={f} update={update} o={o} />
        </section>
      ) : null}
    </>
  );
}

function StudentAttendanceFilters({ f, update, o }) {
  return (
    <div className="att-student-relocated-filters">
      <Select
        label="Academic Level"
        value={f.level}
        onChange={update("level")}
        items={o.levels}
        all="All Academic Levels"
        disabled={o.loadingLevels}
      />
      <Select
        label="Group"
        value={f.group}
        onChange={update("group")}
        items={o.groups}
        all="All Groups"
        disabled={o.loadingGroups}
      />
      <Select
        label="Program"
        value={f.program}
        onChange={update("program")}
        items={o.programs}
        all="All Programs"
        disabled={o.loadingPrograms}
      />
      <Select
        label="Section"
        value={f.section}
        onChange={update("section")}
        items={o.sections}
        all="All Sections"
        disabled={o.loadingSections}
      />
      <Select
        label="Status"
        value={f.status}
        onChange={update("status")}
        items={STUDENT_STATUSES}
        all="All Status"
      />
    </div>
  );
}

function AttendanceViewSection({ view, update }) {
  const isDaily = view === "Attendance" || view === "Daily Attendance" || view === "Student Attendance";
  return (
    <div className="attendance-view-section">
      <div className="attendance-view-tabs" role="tablist" aria-label="Attendance view">
        <button
          type="button"
          role="tab"
          aria-selected={isDaily}
          className={isDaily ? "active" : ""}
          onClick={() => update("Daily Attendance")}
        >
          Attendance
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "Monthly Report"}
          className={view === "Monthly Report" ? "active" : ""}
          onClick={() => update("Monthly Report")}
        >
          Monthly Report
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "Defaulters"}
          className={view === "Defaulters" ? "active" : ""}
          onClick={() => update("Defaulters")}
        >
          Defaulters
        </button>
      </div>
    </div>
  );
}

function StudentSummary({ rows }) {
  const perStudent = rows
    .map((r) => {
      const m = studentSessionStatus(r, "morning");
      const a = studentSessionStatus(r, "afternoon");
      if (STUDENT_SESSION_STATUSES.includes(m) && STUDENT_SESSION_STATUSES.includes(a)) {
        return dailyStudentStatus(m, a);
      }
      if (m === "Half Day" || a === "Half Day") return "Half Day";
      if ((m === "Present" && a === "Absent") || (a === "Present" && m === "Absent")) return "Half Day";
      if (m === "Present" || a === "Present") return "Present";
      if (m === "Absent" || a === "Absent") return "Absent";
      if (m === "Holiday" || a === "Holiday") return "Holiday";
      return "—";
    })
    .filter((x) => x !== "—" && x !== "Holiday");

  const p = perStudent.filter((x) => x === "Present").length;
  const ab = perStudent.filter((x) => x === "Absent").length;
  const hd = perStudent.filter((x) => x === "Half Day").length;
  const total = perStudent.length;
  const pct = total ? `${Math.round(((p + 0.5 * hd) * 100) / total)}%` : "0%";

  return (
    <Summary
      data={[
        ["Total Students", rows.length],
        ["Present", p],
        ["Absent", ab],
        ["Half Day", hd],
        ["Attendance %", pct],
      ]}
    />
  );
}

const studentSummaryIcons = {
  "Total Students": Users,
  Present: UserCheck,
  Absent: UserX,
  "Half Day": UserCheck,
  "Attendance %": PieChart,
};

function Summary({ data }) {
  return (
    <section className="att-summary att-student-summary">
      {data.map(([l, v]) => {
        const Icon = studentSummaryIcons[l];
        return (
          <div
            key={l}
            className={`att-summary-card att-summary-${String(l)
              .toLowerCase()
              .replace(/[^a-z]+/g, "-")
              .replace(/^-|-$/g, "")}`}
          >
            {Icon ? (
              <span className="att-summary-icon">
                <Icon size={25} strokeWidth={2.1} />
              </span>
            ) : null}
            <div className="att-summary-copy">
              <span>{l}</span>
              <b>{v}</b>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function DailyTable({ rows, view, emptyMessage }) {
  const roll = rows.some((r) => get(r, "rollNo", "rollNumber") != null);
  const admission = rows.some((r) => get(r, "admissionNo", "admissionNumber") != null);

  return (
    <div className="att-scroll">
      <table className="cms-table att-table">
        <thead>
          <tr>
            <th>Student Name</th>
            {roll ? <th>Roll No</th> : null}
            {admission ? <th>Admission No</th> : null}
            <th>Group</th>
            <th>Section</th>
            <th>Morning</th>
            <th>Afternoon</th>
            <th>Status</th>
            <th>Percentage</th>
            <th style={{ textAlign: "center", width: "80px" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => {
              const m = studentSessionStatus(r, "morning");
              const a = studentSessionStatus(r, "afternoon");
              const dailySt = dailyStudentStatus(m, a);
              const pct = attendancePercentage(r);
              const isPresent = dailySt === "Present";
              const isAbsent = dailySt === "Absent";
              const isHalfDay = dailySt === "Half Day";

              return (
                <tr key={get(r, "studentId", "id") ?? i}>
                  <td>
                    <button type="button" className="att-name-link" onClick={() => view(r)}>
                      {get(r, "studentName", "name")}
                    </button>
                  </td>
                  {roll ? <td>{get(r, "rollNo", "rollNumber") || "—"}</td> : null}
                  {admission ? <td>{get(r, "admissionNo", "admissionNumber") || "—"}</td> : null}
                  <td>{get(r, "groupName") || "—"}</td>
                  <td>{get(r, "sectionName") || "—"}</td>
                  <td>
                    <Pill value={m} />
                  </td>
                  <td>
                    <Pill value={a} />
                  </td>
                  <td>
                    <span
                      className={`cms-badge ${
                        isPresent
                          ? "cms-badge-success"
                          : isAbsent
                          ? "cms-badge-danger"
                          : isHalfDay
                          ? "cms-badge-warning"
                          : "cms-badge-muted"
                      }`}
                      style={{ fontSize: "11.5px", padding: "3px 8px" }}
                    >
                      {dailySt}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        color: pct >= 75 ? "var(--cms-success, #16a34a)" : "var(--cms-danger, #dc2626)",
                      }}
                    >
                      {pct > 0 ? `${pct}%` : "—"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="cms-action-btn"
                      title="View Student Attendance Overview"
                      aria-label="View Student Attendance Overview"
                      onClick={() => view(r)}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="10">
                <div className="cms-empty">{emptyMessage || "No attendance records match the selected filters."}</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Pill({ value }) {
  const norm = String(value || "").trim();
  let code = "—";
  let cls = "att-month-off";
  if (norm === "Present" || norm === "P") {
    code = "P";
    cls = "att-month-p";
  } else if (norm === "Absent" || norm === "A") {
    code = "A";
    cls = "att-month-a";
  } else if (norm === "Half Day" || norm === "Half-Day" || norm === "HD" || norm === "HalfDay") {
    code = "HD";
    cls = "att-month-hd";
  } else if (norm === "Leave" || norm === "LV" || norm === "L") {
    code = "L";
    cls = "att-month-lv";
  } else if (norm === "Late" || norm === "LT") {
    code = "LT";
    cls = "att-month-l";
  } else if (norm === "Holiday" || norm === "H") {
    code = "H";
    cls = "att-month-h";
  }
  return <span className={`att-status-pill ${cls}`}>{code}</span>;
}

function monthlyDate(header, index, monthValue) {
  const raw = get(header, "date", "Date") ?? header;
  const parsed = new Date(`${String(raw).slice(0, 10)}T00:00:00`);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const [year, month] = String(monthValue || "").slice(0, 7).split("-").map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, index + 1);
}

function MonthlyPill({ value }) {
  const raw = String(value ?? "-").trim().toUpperCase();
  const normalized =
    raw === "PRESENT" || raw === "P"
      ? "P"
      : raw === "ABSENT" || raw === "A"
      ? "A"
      : raw === "H" || raw === "HOLIDAY"
      ? "H"
      : raw === "HD" || raw === "HALFDAY" || raw === "HALF-DAY"
      ? "HD"
      : raw === "LEAVE" || raw === "LV" || raw === "L"
      ? "L"
      : raw === "LATE" || raw === "LT"
      ? "LT"
      : "-";
  const type =
    normalized === "P"
      ? "att-month-p"
      : normalized === "A"
      ? "att-month-a"
      : normalized === "HD"
      ? "att-month-hd"
      : normalized === "L"
      ? "att-month-lv"
      : normalized === "LT"
      ? "att-month-l"
      : normalized === "H"
      ? "att-month-h"
      : "att-month-off";
  return <span className={`att-month-status ${type}`}>{normalized}</span>;
}

function Monthly({ data, monthValue, page, onPageChange, search = "", onSearchChange = () => {} }) {
  const headers = data?.dayHeaders ?? data?.headers ?? [];
  const rawRows = data?.studentRows ?? data?.rows ?? [];
  const normalizedSearch = search.trim().toLowerCase();
  const rows = rawRows.filter((r) => {
    if (!normalizedSearch) return true;
    return [
      get(r, "studentName", "name"),
      get(r, "rollNo", "rollNumber"),
      get(r, "admissionNo", "admissionNumber"),
      get(r, "studentId", "id"),
    ].some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
  });

  const totalPages = Math.max(1, Math.ceil(rows.length / ATTENDANCE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = rows.slice((currentPage - 1) * ATTENDANCE_PAGE_SIZE, currentPage * ATTENDANCE_PAGE_SIZE);

  const monthlyLegend = (
    <div className="att-month-legend">
      <span><i className="att-month-p">P</i> Present</span>
      <span><i className="att-month-a">A</i> Absent</span>
      <span><i className="att-month-hd">HD</i> Half Day</span>
      <span><i className="att-month-h">H</i> Holiday</span>
      <span><i className="att-month-off">-</i> Non-working day</span>
    </div>
  );

  return (
    <section className="att-card att-month-card">
      <header className="att-month-header">
        <div>
          <h3>Student Monthly Attendance</h3>
          <p>{headers.length} days · {rows.length} students</p>
        </div>
        {monthlyLegend}
      </header>
      <div className="att-student-search att-records-search-toolbar att-month-search-toolbar">
        <div className="att-student-search-box">
          <Search3DIcon size={18} />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onPageChange(1);
            }}
            placeholder="Search by student name, roll no. or admission no..."
          />
        </div>
      </div>
      <div className="att-month-scroll">
        <table className="cms-table att-month-table">
          <thead>
            <tr>
              <th className="att-sticky-roll">Student ID</th>
              <th className="att-sticky-name">Student Name</th>
              {headers.map((h, i) => {
                const date = monthlyDate(h, i, monthValue);
                return (
                  <th key={i} className="att-month-day">
                    <b>{date.getDate()}</b>
                    <small>{date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}</small>
                  </th>
                );
              })}
              <th>Present</th>
              <th>Absent</th>
              <th>Half Day</th>
              <th>Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length ? (
              pagedRows.map((r, i) => (
                <MonthRow key={get(r, "studentId", "id") ?? i} r={r} headers={headers} />
              ))
            ) : (
              <tr>
                <td colSpan={headers.length + 6}>
                  <div className="cms-empty">No attendance records match the selected filters.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AttendancePagination page={currentPage} totalRows={rows.length} onPageChange={onPageChange} />
    </section>
  );
}

function MonthRow({ r, headers }) {
  const ds = r.dailyStatus ?? r.statuses ?? [];
  const p = r.present ?? r.presentCount ?? ds.filter((x) => x === "P").length;
  const a = r.absent ?? r.absentCount ?? ds.filter((x) => x === "A").length;
  const hd = r.halfDays ?? r.halfDayCount ?? ds.filter((x) => x === "HD").length;
  const work = r.workingDays ?? ds.filter((x) => !["-", "H"].includes(x)).length;
  const pc = r.attendancePercentage ?? (work ? Math.round(((p + 0.5 * hd) * 100) / work) : 0);

  return (
    <tr>
      <td className="att-sticky-roll">
        {get(r, "studentId", "id") || get(r, "rollNo", "rollNumber") || "—"}
      </td>
      <td className="att-sticky-name">{get(r, "studentName", "name")}</td>
      {headers.map((_, i) => (
        <td key={i} className="att-month-day">
          <MonthlyPill value={ds[i] ?? "-"} />
        </td>
      ))}
      <td>{p}</td>
      <td>{a}</td>
      <td>{hd}</td>
      <td>{pc}%</td>
    </tr>
  );
}

function Defaulters({ rows, totalRows, page, onPageChange, threshold, onThresholdChange }) {
  const normalizedThreshold = threshold === "" ? 0 : Number(threshold);
  return (
    <>
      <section className="att-card att-defaulter-threshold">
        <label className="att-field">
          <span>Attendance Shortage Threshold</span>
          <div className="att-threshold-input">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              inputMode="numeric"
              value={threshold}
              onChange={(event) => {
                const next = event.target.value;
                if (next === "") return onThresholdChange("");
                const numberValue = Number(next);
                if (Number.isFinite(numberValue)) onThresholdChange(Math.min(100, Math.max(0, numberValue)));
              }}
            />
            <span>%</span>
          </div>
        </label>
      </section>
      <section className="att-card att-table-card">
        <div className="att-scroll">
          <table className="cms-table att-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Roll No</th>
                <th>Admission No</th>
                <th>Group</th>
                <th>Section</th>
                <th>Attendance %</th>
                <th>Shortage %</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r, i) => (
                  <tr key={get(r, "studentId", "id") ?? i}>
                    <td>{get(r, "studentName", "name")}</td>
                    <td>{get(r, "rollNo", "rollNumber") || "—"}</td>
                    <td>{get(r, "admissionNo", "admissionNumber") || "—"}</td>
                    <td>{get(r, "groupName") || "—"}</td>
                    <td>{get(r, "sectionName") || "—"}</td>
                    <td>{attendancePercentage(r)}%</td>
                    <td>{Math.max(0, normalizedThreshold - attendancePercentage(r)).toFixed(1)}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="cms-empty">No students are below this threshold.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AttendancePagination page={page} totalRows={totalRows} onPageChange={onPageChange} unit="students" />
      </section>
    </>
  );
}
