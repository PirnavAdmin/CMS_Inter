import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Eye, Pencil, Plus, RefreshCw } from "lucide-react";
import DashboardLayout from "../layout/DashboardLayout.jsx";
import { StatusBadge, Toast } from "../common/Ui.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { getApiErrorMessage } from "@/api/apiClient.js";
import ExamFormWizard, { ExamField } from "@/features/examination/ExamFormWizard.jsx";
import SchedulingWorkspace, {
  ExamDialog,
  ScheduleSummary,
} from "@/features/examination/SchedulingWorkspace.jsx";
import {
  getExams,
  getExam,
  getSchedules,
  updateMetadata,
  changeStatus,
  exportExcel,
} from "@/features/examination/examinationApi.js";
import { configurationIssues, strategy } from "@/features/examination/examinationModel.js";
import "./ExaminationPage.css";

export default function ExaminationPage() {
  const context = useAcademicContext();
  return (
    <ExaminationCenter
      key={`${context.selectedBoardId}:${context.selectedAcademicYearId}`}
      context={context}
    />
  );
}

function ExaminationCenter({ context }) {
  const location = useLocation(),
    navigate = useNavigate();
  const [creating, setCreating] = useState(location.pathname.endsWith("/add"));
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [workspace, setWorkspace] = useState("exams"),
    [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true),
    [listError, setListError] = useState("");
  const [search, setSearch] = useState(""),
    [filters, setFilters] = useState({ group: "", program: "", level: "", status: "" });
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState("");
  const [details, setDetails] = useState(null),
    [detailsLoading, setDetailsLoading] = useState(false),
    [detailsError, setDetailsError] = useState("");
  const [editing, setEditing] = useState(null),
    [action, setAction] = useState(null),
    [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const listRequest = useRef(null),
    detailsRequest = useRef(null),
    mutationRef = useRef(false);
  const boardId = Number(context.selectedBoardId),
    academicYearId = Number(context.selectedAcademicYearId);
  const notify = useCallback((message, type = "success") => setToast({ message, type }), []);
  const load = useCallback(async () => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setLoading(true);
    setListError("");
    try {
      const list = await getExams({ boardId, academicYearId }, controller.signal);
      if (!controller.signal.aborted) setExams(list);
    } catch (error) {
      if (!controller.signal.aborted) {
        setListError(getApiErrorMessage(error));
        throw error;
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [boardId, academicYearId]);
  useEffect(() => {
    load().catch(() => {
      /* load exposes error beside the retained list */
    });
    return () => listRequest.current?.abort();
  }, [load]);
  const fetchDetails = useCallback(async (examId) => {
    detailsRequest.current?.abort();
    const controller = new AbortController();
    detailsRequest.current = controller;
    setDetailsLoading(true);
    setDetailsError("");
    try {
      const [exam, schedules] = await Promise.all([
        getExam(examId, controller.signal),
        getSchedules(examId, controller.signal),
      ]);
      if (!controller.signal.aborted) setDetails({ exam, schedules });
    } catch (error) {
      if (!controller.signal.aborted) setDetailsError(getApiErrorMessage(error));
    } finally {
      if (!controller.signal.aborted) setDetailsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (selected) fetchDetails(selected);
    return () => detailsRequest.current?.abort();
  }, [selected, fetchDetails]);
  const openExam = (exam, target) => {
    setSelected(exam.id);
    setWorkspace(target);
    if (selected === exam.id) fetchDetails(exam.id);
  };
  const openEdit = async (exam) => {
    try {
      const [fresh, schedules] = await Promise.all([getExam(exam.id), getSchedules(exam.id)]);
      if (!["DRAFT", "SCHEDULED"].includes(fresh.status))
        throw new Error("This examination is read-only.");
      setEditing({ exam: fresh, schedules });
    } catch (error) {
      notify(getApiErrorMessage(error), "error");
    }
  };
  const doExport = async (examId) => {
    try {
      await exportExcel(examId, { boardId, academicYearId });
    } catch (error) {
      notify(getApiErrorMessage(error), "error");
    }
  };
  const confirmAction = async () => {
    if (mutationRef.current || !action) return;
    mutationRef.current = true;
    setBusy(true);
    try {
      const fresh = await getExam(action.exam.id);
      if (
        action.kind === "delete"
          ? !["DRAFT", "CANCELLED"].includes(fresh.status)
          : !["DRAFT", "SCHEDULED"].includes(fresh.status)
      )
        throw new Error("The examination status changed. Refresh before proceeding.");
      const list = await changeStatus(fresh, action.kind, { boardId, academicYearId });
      setExams(list);
      if (selected === fresh.id) {
        setSelected("");
        setDetails(null);
        setWorkspace("exams");
      }
      setAction(null);
      notify(
        action.kind === "delete"
          ? "Examination deletion verified."
          : "Examination cancellation verified.",
      );
    } catch (error) {
      notify(getApiErrorMessage(error), "error");
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  };
  const closeCreate = () => {
    setCreating(false);
    if (location.pathname.endsWith("/add")) navigate("/dashboard/examinations", { replace: true });
  };
  const scoped = exams.filter(
    (exam) => exam.boardId === String(boardId) && exam.yearId === String(academicYearId),
  );
  const filtered = scoped.filter(
    (exam) =>
      (!filters.group || exam.groupIds.includes(filters.group)) &&
      (!filters.program || exam.programIds.includes(filters.program)) &&
      (!filters.level || exam.levelIds.includes(filters.level)) &&
      (!filters.status || exam.status === filters.status) &&
      (!search.trim() ||
        [
          exam.name,
          exam.code,
          exam.groupName,
          exam.academicLevelName,
          exam.examPattern,
          exam.status,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
        )),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 8)),
    currentPage = Math.min(page, pages);
  const filterOptions = (key, label) => [
    ...new Map(
      scoped.flatMap((exam) =>
        exam[key].map((value) => [
          value,
          { id: value, name: exam[key].length === 1 && exam[label] ? exam[label] : value },
        ]),
      ),
    ).values(),
  ];
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const summary = [
    ["Total exams", scoped.length],
    [
      "Upcoming",
      scoped.filter((exam) => exam.status === "SCHEDULED" && exam.startDate > today).length,
    ],
    [
      "Ongoing",
      scoped.filter(
        (exam) => exam.status === "SCHEDULED" && exam.startDate <= today && exam.endDate >= today,
      ).length,
    ],
    ["Completed", scoped.filter((exam) => exam.status === "COMPLETED").length],
  ];
  const selectedDetails = details?.exam.id === selected ? details : null;
  return (
    <DashboardLayout
      title="Examination Center"
      subtitle="Manage examinations, scheduling and review within the active academic context."
      breadcrumb={["Examinations"]}
    >
      <div className="examination-center">
        <div className="ec-toolbar">
          <nav className="ec-tabs" aria-label="Examination workspaces">
            {[
              ["exams", "Exams"],
              ["scheduling", "Scheduling"],
              ["review", "Exam details / review"],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                disabled={creatingBusy}
                aria-current={workspace === key ? "page" : undefined}
                onClick={() => {
                  setWorkspace(key);
                  closeCreate();
                }}
              >
                {label}
              </button>
            ))}
          </nav>
          {!creating && (
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              onClick={() => {
                setWorkspace("exams");
                setCreating(true);
              }}
            >
              <Plus size={16} />
              Create examination
            </button>
          )}
        </div>
        {creating ? (
          <ExamFormWizard
            context={context}
            onBusyChange={setCreatingBusy}
            onClose={closeCreate}
            onSaved={async () => {
              await load();
            }}
          />
        ) : workspace === "exams" ? (
          <>
            {!loading && !listError && (
              <div className="ec-stats">
                {summary.map(([label, count]) => (
                  <div className="cms-card" key={label}>
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            )}
            <section className="cms-card ec-workspace">
              <div className="ec-filters">
                <ExamField
                  label="Search exams"
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setPage(1);
                  }}
                  placeholder="Name, code, pattern or group"
                />
                {[
                  ["group", "Group", "groupIds", "groupName"],
                  ["program", "Program", "programIds", "programName"],
                  ["level", "Academic level", "levelIds", "academicLevelName"],
                ].map(([key, label, idsKey, nameKey]) => (
                  <ExamField
                    key={key}
                    label={label}
                    value={filters[key]}
                    options={filterOptions(idsKey, nameKey)}
                    onChange={(value) => {
                      setFilters({ ...filters, [key]: value });
                      setPage(1);
                    }}
                  />
                ))}
                <ExamField
                  label="Status"
                  value={filters.status}
                  options={[...new Set(scoped.map((exam) => exam.status))]
                    .filter(Boolean)
                    .map((value) => ({ id: value, name: value }))}
                  onChange={(value) => {
                    setFilters({ ...filters, status: value });
                    setPage(1);
                  }}
                />
              </div>
              <div className="ec-actions">
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  disabled={loading}
                  onClick={() =>
                    load().catch(() => {
                      /* error rendered above */
                    })
                  }
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => {
                    setFilters({ group: "", program: "", level: "", status: "" });
                    setSearch("");
                  }}
                >
                  Clear filters
                </button>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => doExport()}>
                  Export Excel
                </button>
              </div>
              {listError && (
                <p className="ec-notice ec-error" role="alert">
                  {listError} The last loaded list is retained. Use Refresh to retry.
                </p>
              )}
              {loading && <p role="status">Loading examinations…</p>}
              <div className="cms-table-wrap">
                <table className="cms-table ec-list-table">
                  <thead>
                    <tr>
                      <th>Examination</th>
                      <th>Academic scope</th>
                      <th>Period</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice((currentPage - 1) * 8, currentPage * 8).map((exam) => (
                      <tr key={exam.id}>
                        <td>
                          <strong>{exam.name}</strong>
                          <small>
                            {exam.code || "Code not returned"} ·{" "}
                            {exam.examPattern || "Pattern not returned"}
                          </small>
                        </td>
                        <td>
                          {exam.academicLevelName || exam.academicLevel || "Level not returned"}
                          <small>
                            {exam.groupName || "Group not returned"} ·{" "}
                            {exam.programName || "Program not returned"}
                          </small>
                        </td>
                        <td>
                          {exam.startDate}
                          <small>to {exam.endDate}</small>
                        </td>
                        <td>
                          <StatusBadge value={exam.status} />
                        </td>
                        <td>
                          <div className="ec-actions">
                            <button
                              type="button"
                              className="cms-action-btn"
                              aria-label={`Review ${exam.name}`}
                              title="Review"
                              onClick={() => openExam(exam, "review")}
                            >
                              <Eye size={16} />
                            </button>
                            {["DRAFT", "SCHEDULED"].includes(exam.status) && (
                              <>
                                <button
                                  type="button"
                                  className="cms-action-btn"
                                  aria-label={`Schedule ${exam.name}`}
                                  title="Schedule / reschedule"
                                  onClick={() => openExam(exam, "scheduling")}
                                >
                                  <CalendarDays size={16} />
                                </button>
                                <button
                                  type="button"
                                  className="cms-action-btn"
                                  aria-label={`Edit ${exam.name}`}
                                  title="Edit"
                                  onClick={() => openEdit(exam)}
                                >
                                  <Pencil size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loading && !filtered.length && (
                  <p className="cms-empty">
                    No examinations match this academic context and filters.
                  </p>
                )}
              </div>
              <div className="ec-pagination">
                <span>{filtered.length} examinations</span>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Previous
                </button>
                <span>
                  {currentPage} / {pages}
                </span>
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  disabled={currentPage === pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="cms-card ec-selector">
              <ExamField
                label="Examination"
                value={selected}
                options={scoped.map((exam) => ({
                  id: exam.id,
                  name: `${exam.name} · ${exam.code} · ${exam.status}`,
                }))}
                onChange={setSelected}
              />
            </div>
            {detailsLoading ? (
              <p role="status">Loading examination and saved schedules…</p>
            ) : detailsError ? (
              <div className="ec-notice ec-error" role="alert">
                {detailsError}
                <button
                  type="button"
                  className="cms-btn cms-btn-ghost"
                  onClick={() => fetchDetails(selected)}
                >
                  Retry examination
                </button>
              </div>
            ) : selectedDetails ? (
              workspace === "scheduling" ? (
                <SchedulingWorkspace
                  key={selected}
                  exam={selectedDetails.exam}
                  schedules={selectedDetails.schedules}
                  onSchedules={(schedules) =>
                    setDetails((previous) => ({ ...previous, schedules }))
                  }
                  onRefresh={() => fetchDetails(selected)}
                  notify={notify}
                />
              ) : (
                <ExamDetailsPanel
                  details={selectedDetails}
                  onEdit={() => openEdit(selectedDetails.exam)}
                  onSchedule={() => setWorkspace("scheduling")}
                  onExport={() => doExport(selected)}
                  onAction={(kind) => setAction({ exam: selectedDetails.exam, kind })}
                />
              )
            ) : (
              <p className="cms-empty">
                Select an examination to{" "}
                {workspace === "scheduling" ? "manage its schedule" : "review its details"}.
              </p>
            )}
          </>
        )}
        {!creating && selectedDetails && workspace !== "exams" && (
          <div className="ec-print">
            <h1>{selectedDetails.exam.name}</h1>
            <p>
              {selectedDetails.exam.code} · {selectedDetails.exam.startDate} —{" "}
              {selectedDetails.exam.endDate}
            </p>
            <ScheduleSummary schedules={selectedDetails.schedules} />
          </div>
        )}
        {editing && (
          <MetadataEditor
            data={editing}
            onClose={() => setEditing(null)}
            onSaved={async () => {
              await load();
              if (selected === editing.exam.id) await fetchDetails(selected);
              notify("Examination metadata update verified.");
            }}
          />
        )}
        {action && (
          <ExamDialog
            title={action.kind === "delete" ? "Delete examination" : "Cancel examination"}
            busy={busy}
            onClose={() => !busy && setAction(null)}
          >
            <p>
              {action.kind === "delete" ? "Delete" : "Cancel"} {action.exam.name}?{" "}
              {action.kind === "cancel"
                ? "It will become read-only."
                : "Its associated examination records will be removed from the active list."}
            </p>
            <div className="ec-actions">
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Keep examination
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                disabled={busy}
                onClick={confirmAction}
              >
                {busy ? "Verifying…" : "Confirm"}
              </button>
            </div>
          </ExamDialog>
        )}
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      </div>
    </DashboardLayout>
  );
}

function ExamDetailsPanel({
  details: { exam, schedules },
  onEdit,
  onSchedule,
  onExport,
  onAction,
}) {
  const issues = configurationIssues(exam),
    editable = ["DRAFT", "SCHEDULED"].includes(exam.status);
  return (
    <section className="cms-card ec-workspace">
      <div className="ec-card-heading">
        <div>
          <h2>{exam.name}</h2>
          <p>
            {exam.code} · {exam.examType} · {exam.startDate} — {exam.endDate}
          </p>
        </div>
        <StatusBadge value={exam.status} />
      </div>
      <div className="ec-grid">
        <section className="ec-scope-panel">
          <h3>Overview</h3>
          <p>{exam.description || "No description"}</p>
          <p>Strategy: {strategy(exam) || "Not returned by backend"}</p>
        </section>
        <section className="ec-scope-panel">
          <h3>Academic scope</h3>
          <p>
            {exam.boardName} · {exam.academicYearName}
          </p>
          <p>
            {exam.academicLevelName || exam.academicLevel} · {exam.groupName} · {exam.programName}
          </p>
        </section>
      </div>
      <details className="ec-scope-panel" open>
        <summary>Subject / pattern configuration</summary>
        {issues.length ? (
          <>
            <p className="ec-notice">
              BACKEND CONTRACT BLOCKER: the saved configuration cannot be verified. No
              browser-stored configuration is substituted.
            </p>
            <ul>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </>
        ) : (
          <p>
            {exam.selectedSubjectIds.length} persisted subjects · {exam.groupIds.length} groups
          </p>
        )}
      </details>
      <h3>Schedule, hall and invigilator allocation</h3>
      <ScheduleSummary schedules={schedules} />
      <div className="ec-actions ec-footer">
        {editable && (
          <>
            <button type="button" className="cms-btn cms-btn-primary" onClick={onSchedule}>
              Schedule / reschedule
            </button>
            <button type="button" className="cms-btn cms-btn-ghost" onClick={onEdit}>
              Edit examination
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              onClick={() => onAction("cancel")}
            >
              Cancel examination
            </button>
          </>
        )}
        <button type="button" className="cms-btn cms-btn-ghost" onClick={onExport}>
          Export Excel
        </button>
        <button type="button" className="cms-btn cms-btn-ghost" onClick={() => window.print()}>
          Print
        </button>
        {["DRAFT", "CANCELLED"].includes(exam.status) && (
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => onAction("delete")}
          >
            Delete examination
          </button>
        )}
      </div>
    </section>
  );
}

function MetadataEditor({ data: { exam, schedules }, onClose, onSaved }) {
  const [form, setForm] = useState({
    examName: exam.name,
    startDate: exam.startDate,
    endDate: exam.endDate,
    description: exam.description || "",
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const save = async (event) => {
    event.preventDefault();
    if (lock.current) return;
    if (!form.examName.trim() || !form.startDate || !form.endDate || form.endDate < form.startDate)
      return setError("Complete a name and valid examination period.");
    if (schedules.some((row) => row.date < form.startDate || row.date > form.endDate))
      return setError(
        "Saved sessions fall outside this period. Reschedule those sessions before changing the period.",
      );
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await updateMetadata(exam, form);
      await onSaved();
      onClose();
    } catch (failure) {
      setError(getApiErrorMessage(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <ExamDialog title="Edit examination" onClose={() => !busy && onClose()} busy={busy}>
      <form onSubmit={save}>
        <p className="ec-notice">
          Academic scope and subject/pattern changes are blocked because the current API does not
          round-trip that configuration. Exam code is immutable.
        </p>
        <fieldset disabled={busy}>
          <div className="ec-grid">
            <ExamField label="Exam code" value={exam.code} readOnly />
            <ExamField
              label="Exam name"
              value={form.examName}
              onChange={(value) => setForm({ ...form, examName: value })}
              maxLength={150}
            />
            <ExamField
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(value) => setForm({ ...form, startDate: value })}
            />
            <ExamField
              label="End date"
              type="date"
              min={form.startDate}
              value={form.endDate}
              onChange={(value) => setForm({ ...form, endDate: value })}
            />
            <ExamField
              label="Description"
              type="textarea"
              value={form.description}
              maxLength={500}
              onChange={(value) => setForm({ ...form, description: value })}
            />
          </div>
        </fieldset>
        {error && (
          <p className="ec-notice ec-error" role="alert">
            {error}
          </p>
        )}
        <div className="ec-actions ec-footer">
          <button type="button" className="cms-btn cms-btn-ghost" disabled={busy} onClick={onClose}>
            Close
          </button>
          <button type="submit" className="cms-btn cms-btn-primary" disabled={busy}>
            {busy ? "Saving and verifying…" : "Save metadata"}
          </button>
        </div>
      </form>
    </ExamDialog>
  );
}
