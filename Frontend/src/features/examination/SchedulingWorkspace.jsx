import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/common/Ui.jsx";
import { getApiErrorMessage } from "@/api/apiClient.js";
import { ExamField } from "./ExamFormWizard.jsx";
import {
  createAvailabilityClient,
  loadCandidates,
  updateSchedule,
  deleteSchedule,
  getSchedules,
  exportExcel,
} from "./examinationApi.js";
import {
  id,
  ids,
  strategy,
  configurationIssues,
  requirements,
  matchesRequirement,
  candidateCount,
  availableForDraft,
  allocate,
  validateAllocation,
  readiness,
  CONTRACT_BLOCKERS,
} from "./examinationModel.js";

export function ExamDialog({ title, onClose, children, busy = false }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = document.querySelector(".ec-dialog");
    const selector =
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';
    dialog?.querySelector(selector)?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== "Tab") return;
      const nodes = [...(dialog?.querySelectorAll(selector) || [])].filter(
        (node) => node.getClientRects().length,
      );
      const first = nodes[0],
        last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus?.();
    };
  }, []);
  return (
    <Modal
      title={title}
      onClose={() => !busy && onClose()}
      className="ec-dialog"
      closeOnOverlay={false}
    >
      {children}
    </Modal>
  );
}
export function ScheduleSummary({ schedules }) {
  return (
    <div className="cms-table-wrap">
      <table className="cms-table ec-schedule-table">
        <thead>
          <tr>
            <th>Subject / pattern</th>
            <th>Group / level</th>
            <th>Date & time</th>
            <th>Hall</th>
            <th>Invigilator</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map((row) => (
            <tr key={row.id}>
              <td>
                {row.patternName || row.subjectName || "Not returned"}
                <small>{row.scheduleMode}</small>
              </td>
              <td>
                {row.groupId || "Not returned"} / {row.academicLevelId || "Not returned"}
              </td>
              <td>
                {row.date}
                <small>
                  {row.startTime}–{row.endTime}
                </small>
              </td>
              <td>
                {row.hallAssignments.length
                  ? row.hallAssignments.map((a) => a.hallName || `Hall ${a.hallId}`).join(", ")
                  : row.hall || (row.roomId ? `Room ${row.roomId}` : "Not assigned")}
              </td>
              <td>
                {row.invigilator ||
                  (row.invigilatorId ? `Faculty ${row.invigilatorId}` : "Not assigned")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!schedules.length && <p className="cms-empty">No saved schedules.</p>}
    </div>
  );
}
function ScheduleEditor({ exam, original, schedules, availability, onClose, onSaved }) {
  const [entry, setEntry] = useState({
    ...original,
    hallAssignments: original.hallAssignments.map((a) => ({
      ...a,
      invigilatorIds: [...a.invigilatorIds],
    })),
  });
  const [candidates, setCandidates] = useState({ status: "loading", count: null });
  const [lookup, setLookup] = useState({ key: "", status: "idle", halls: [], faculty: [] });
  const [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [accepted, setAccepted] = useState(false);
  const submitRef = useRef(false);
  const objective =
    original.scheduleMode === "PATTERN_WISE" || original.scheduleMode === "COMBINED_OBJECTIVE";
  const configurationMissing = configurationIssues(exam);
  // Existing legacy single-scope rows can still have their supported date/room/
  // faculty fields edited. This does not certify the examination configuration.
  const gid = original.groupId || (exam.groupIds.length === 1 ? exam.groupIds[0] : "");
  const levelIds = original.academicLevelId ? [original.academicLevelId] : exam.levelIds;
  const programIds =
    exam.groupProgramSelections[gid] || (exam.groupIds.length === 1 ? exam.programIds : []);
  const studentKey = JSON.stringify({
    examId: exam.id,
    boardId: exam.boardId,
    yearId: exam.yearId,
    groupId: gid,
    levelIds,
    programIds,
  });
  useEffect(() => {
    const scope = JSON.parse(studentKey),
      controller = new AbortController();
    if (!scope.groupId || !scope.levelIds.length || !scope.programIds.length) {
      setCandidates({
        status: "error",
        count: null,
        error: "The backend does not identify the candidate level/group/program scope.",
      });
      return;
    }
    setCandidates({ status: "loading", count: null });
    loadCandidates(scope, scope, controller.signal)
      .then((students) => {
        if (controller.signal.aborted) return;
        const count = candidateCount(
          students,
          { groupProgramSelections: { [scope.groupId]: scope.programIds } },
          scope,
        );
        setCandidates({ status: "loaded", count });
        setEntry((previous) =>
          previous.hallAssignments.length || !previous.roomId
            ? previous
            : {
                ...previous,
                hallAssignments: [
                  {
                    hallId: previous.roomId,
                    candidateCount: count,
                    invigilatorIds: previous.invigilatorId ? [previous.invigilatorId] : [],
                  },
                ],
              },
        );
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setCandidates({ status: "error", count: null, error: getApiErrorMessage(failure) });
      });
    return () => controller.abort();
  }, [studentKey]);
  const subjectIds = objective ? original.includedSubjectIds : ids([original.subjectId]);
  const scope = {
    examId: exam.id,
    groupId: gid,
    subjectIds,
    candidateCount: candidates.count,
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
    excludeScheduleId: original.id,
  };
  const ready =
    candidates.status === "loaded" &&
    candidates.count > 0 &&
    scope.groupId &&
    subjectIds.length &&
    entry.date &&
    entry.startTime &&
    entry.endTime &&
    entry.startTime < entry.endTime;
  const availabilityKey = ready ? JSON.stringify(scope) : "";
  useEffect(() => {
    let active = true;
    if (!availabilityKey) return;
    setLookup({ key: availabilityKey, status: "loading", halls: [], faculty: [] });
    availability
      .load(JSON.parse(availabilityKey))
      .then((result) => {
        if (!active) return;
        setLookup({ key: availabilityKey, status: "loaded", ...result });
      })
      .catch((failure) => {
        if (active)
          setLookup({
            key: availabilityKey,
            status: "error",
            halls: [],
            faculty: [],
            error: getApiErrorMessage(failure),
          });
      });
    return () => {
      active = false;
    };
  }, [availabilityKey, revision, availability]);
  const currentLookup =
    lookup.key === availabilityKey
      ? lookup
      : { status: availabilityKey ? "loading" : "idle", halls: [], faculty: [] };
  const halls = availableForDraft(currentLookup.halls, schedules, entry, "hall"),
    faculty = availableForDraft(currentLookup.faculty, schedules, entry, "faculty");
  const refresh = () => {
    availability.invalidate();
    setRevision((value) => value + 1);
  };
  const changeInterval = (field, value) => {
    availability.invalidate();
    setEntry((previous) => ({ ...previous, [field]: value, hallAssignments: [] }));
    setError("");
  };
  const updateHall = (index, patch) =>
    setEntry((previous) => ({
      ...previous,
      hallAssignments: previous.hallAssignments.map((assignment, i) =>
        i === index ? { ...assignment, ...patch } : assignment,
      ),
    }));
  const validate = () => {
    const messages = validateAllocation(entry, candidates.count, halls, faculty, schedules);
    if (entry.date < exam.startDate || entry.date > exam.endDate)
      messages.push("Schedule date must fall within the examination period.");
    if (
      !(Number(entry.maxMarks) > 0) ||
      Number(entry.passingMarks) < 0 ||
      Number(entry.passingMarks) > Number(entry.maxMarks)
    )
      messages.push("Check total and passing marks.");
    return messages;
  };
  const save = async (event) => {
    event.preventDefault();
    if (submitRef.current || accepted) return;
    if (currentLookup.status !== "loaded")
      return setError("Load current hall and invigilator availability before saving.");
    const messages = validate();
    if (messages.length) return setError(messages.join(" "));
    submitRef.current = true;
    setBusy(true);
    setError("");
    try {
      const list = await updateSchedule(exam.id, original, entry, halls, faculty, () =>
        setAccepted(true),
      );
      availability.invalidate();
      onSaved(list);
      onClose();
    } catch (failure) {
      setError(getApiErrorMessage(failure));
      refresh();
    } finally {
      submitRef.current = false;
      setBusy(false);
    }
  };
  const saveBlocked =
    objective ||
    entry.hallAssignments.length !== 1 ||
    entry.hallAssignments[0]?.invigilatorIds.length !== 1;
  const lookupMessage = !ready
    ? "Select a subject scope, confirmed candidates, date and time first."
    : currentLookup.status === "loading"
      ? "Loading available halls and invigilators…"
      : currentLookup.status === "error"
        ? `Unable to load availability. ${currentLookup.error}`
        : "";
  return (
    <ExamDialog
      title={`Schedule editor · ${original.subjectName || original.patternName || original.id}`}
      onClose={() => !busy && onClose()}
      busy={busy}
    >
      <form onSubmit={save}>
        <p className="ec-muted">
          Existing assignment: {original.hall || original.roomId || "Not assigned"} ·{" "}
          {original.invigilator || original.invigilatorId || "Not assigned"}. Lookup failures do not
          change the saved schedule.
        </p>
        {configurationMissing.length > 0 && (
          <p className="ec-notice">
            The examination configuration is incomplete in the API. This editor can verify only
            supported fields of an existing Regular schedule; it cannot certify final readiness.
          </p>
        )}
        {objective && (
          <p role="alert" className="ec-notice">
            BACKEND CONTRACT BLOCKER: Objective rescheduling needs persisted group, pattern,
            included subjects and an atomic update of the full sitting. No schedules will be deleted
            or recreated.
          </p>
        )}
        <fieldset disabled={busy || accepted}>
          <div className="ec-grid">
            <ExamField
              label="Exam date"
              type="date"
              min={exam.startDate}
              max={exam.endDate}
              value={entry.date}
              onChange={(value) => changeInterval("date", value)}
              readOnly={objective}
            />
            <ExamField
              label="Start time"
              type="time"
              value={entry.startTime}
              onChange={(value) => changeInterval("startTime", value)}
              readOnly={objective}
            />
            <ExamField
              label="End time"
              type="time"
              value={entry.endTime}
              onChange={(value) => changeInterval("endTime", value)}
              readOnly={objective}
            />
            <ExamField
              label="Total marks"
              type="number"
              min="1"
              value={entry.maxMarks}
              onChange={(value) => setEntry({ ...entry, maxMarks: value })}
            />
            <ExamField
              label="Passing marks"
              type="number"
              min="0"
              value={entry.passingMarks}
              onChange={(value) => setEntry({ ...entry, passingMarks: value })}
            />
          </div>
          <p role="status">
            {candidates.status === "loading"
              ? "Loading scoped candidate roster…"
              : candidates.status === "error"
                ? candidates.error
                : `Confirmed active candidates: ${candidates.count}. Counts are calculated from the roster; the schedule API does not persist them.`}
          </p>
          <div className="ec-notice" aria-live="polite">
            {lookupMessage || (
              <>
                <span>
                  {halls.length
                    ? `${halls.length} available halls`
                    : "No halls are available during this interval."}
                </span>
                <br />
                <span>
                  {faculty.length
                    ? `${faculty.length} available invigilators`
                    : "No invigilators are available during this interval."}
                </span>
              </>
            )}
            {ready && (
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={currentLookup.status === "loading"}
                onClick={refresh}
              >
                {currentLookup.status === "error" ? "Retry availability" : "Refresh availability"}
              </button>
            )}
          </div>
          <div className="ec-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={currentLookup.status !== "loaded"}
              onClick={() => {
                try {
                  setEntry({
                    ...entry,
                    hallAssignments: allocate(candidates.count, halls, faculty),
                  });
                  setError("");
                } catch (failure) {
                  setError(failure.message);
                }
              }}
            >
              Auto allocate
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={currentLookup.status !== "loaded"}
              onClick={() =>
                setEntry({
                  ...entry,
                  hallAssignments: [
                    ...entry.hallAssignments,
                    { hallId: "", candidateCount: "", invigilatorIds: [] },
                  ],
                })
              }
            >
              Add hall
            </button>
          </div>
          {entry.hallAssignments.map((assignment, index) => (
            <section className="ec-scope-panel" key={index}>
              <div className="ec-grid">
                <ExamField
                  label={`Hall ${index + 1}`}
                  value={assignment.hallId}
                  disabled={currentLookup.status !== "loaded"}
                  options={halls
                    .filter(
                      (hall) =>
                        !entry.hallAssignments.some((a, i) => i !== index && a.hallId === hall.id),
                    )
                    .map((hall) => ({
                      ...hall,
                      name: `${hall.name} · ${hall.code} · ${hall.capacity} seats · ${hall.roomType}`,
                    }))}
                  onChange={(value) => updateHall(index, { hallId: value })}
                />
                <ExamField
                  label={`Candidates in hall ${index + 1}`}
                  type="number"
                  min="1"
                  value={assignment.candidateCount}
                  onChange={(value) => updateHall(index, { candidateCount: value })}
                />
              </div>
              <p>
                Invigilators · {Number(assignment.candidateCount) > 60 ? "minimum 2" : "minimum 1"}
              </p>
              <div className="ec-choices">
                {faculty
                  .filter(
                    (person) =>
                      !entry.hallAssignments.some(
                        (a, i) => i !== index && a.invigilatorIds.includes(person.id),
                      ),
                  )
                  .map((person) => (
                    <label key={person.id}>
                      <input
                        type="checkbox"
                        checked={assignment.invigilatorIds.includes(person.id)}
                        disabled={currentLookup.status !== "loaded"}
                        onChange={() =>
                          updateHall(index, {
                            invigilatorIds: assignment.invigilatorIds.includes(person.id)
                              ? assignment.invigilatorIds.filter((fid) => fid !== person.id)
                              : [...assignment.invigilatorIds, person.id],
                          })
                        }
                      />
                      {person.name} · {person.employeeId}
                    </label>
                  ))}
              </div>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                onClick={() =>
                  setEntry({
                    ...entry,
                    hallAssignments: entry.hallAssignments.filter((_, i) => index !== i),
                  })
                }
              >
                Remove hall {index + 1}
              </button>
            </section>
          ))}
          {saveBlocked && (
            <p className="ec-notice">
              Saving multiple halls, multiple invigilators or Objective sessions is blocked: the
              current update API cannot persist those assignments. Auto allocation is an unsaved
              preview.
            </p>
          )}
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
          <button
            type="submit"
            className="cms-btn cms-btn-primary"
            disabled={busy || accepted || saveBlocked || currentLookup.status !== "loaded"}
          >
            {busy ? "Saving and verifying…" : "Save supported changes"}
          </button>
        </div>
      </form>
    </ExamDialog>
  );
}
export default function SchedulingWorkspace({ exam, schedules, onSchedules, onRefresh, notify }) {
  const [editor, setEditor] = useState(null),
    [removing, setRemoving] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [availability] = useState(createAvailabilityClient);
  const mutationRef = useRef(false);
  const editable = ["DRAFT", "SCHEDULED"].includes(exam.status);
  const problems = configurationIssues(exam),
    required = requirements(exam);
  const scheduledCount = required.filter((req) =>
    schedules.some((row) => matchesRequirement(row, req)),
  ).length;
  const remove = async () => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    setBusy(true);
    setError("");
    try {
      const list = await deleteSchedule(exam.id, removing.id);
      availability.invalidate();
      onSchedules(list);
      setRemoving(null);
      notify("Schedule deletion verified.");
    } catch (failure) {
      setError(getApiErrorMessage(failure));
    } finally {
      mutationRef.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="cms-card ec-workspace">
      <div className="ec-card-heading">
        <div>
          <h2>{exam.name}</h2>
          <p>
            {exam.startDate} — {exam.endDate} · {strategy(exam) || "Strategy not returned"}
          </p>
        </div>
        <button type="button" className="cms-btn cms-btn-ghost" onClick={onRefresh}>
          Refresh schedules
        </button>
      </div>
      {problems.length ? (
        <div className="ec-notice">
          <strong>Required sessions cannot be verified</strong>
          <p>
            The backend has not returned the examination's selected configuration. Saved rows remain
            visible; new scheduling and finalization are blocked.
          </p>
          <details>
            <summary>Backend contract details</summary>
            <ul>
              {problems.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </details>
        </div>
      ) : (
        <p className="ec-progress">
          {required.length} required sessions · {scheduledCount} scheduled ·{" "}
          {required.length - scheduledCount} remaining
        </p>
      )}
      {required.length > 0 && (
        <div className="ec-notice">
          {CONTRACT_BLOCKERS[2]} {CONTRACT_BLOCKERS[3]}
        </div>
      )}
      <div className="ec-session-list">
        {schedules.map((row) => (
          <article className="ec-session" key={row.id}>
            <div>
              <h3>{row.patternName || row.subjectName || `Schedule ${row.id}`}</h3>
              <p>
                {row.date} · {row.startTime}–{row.endTime}
              </p>
              <small>
                {row.hall || "Hall not returned"} · {row.invigilator || "Invigilator not returned"}
              </small>
            </div>
            <div className="ec-actions">
              {editable && (
                <>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setEditor(row)}
                  >
                    Edit / reschedule
                  </button>
                  <button
                    type="button"
                    className="cms-btn cms-btn-ghost"
                    onClick={() => setRemoving(row)}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {!schedules.length && (
        <p className="cms-empty">
          No saved sessions. Configure and verify the examination before assigning a schedule.
        </p>
      )}
      <div className="ec-actions ec-footer">
        <button
          type="button"
          className="cms-btn cms-btn-ghost"
          onClick={async () => {
            try {
              await exportExcel(exam.id);
            } catch (failure) {
              notify(getApiErrorMessage(failure), "error");
            }
          }}
        >
          Export Excel
        </button>
        <button type="button" className="cms-btn cms-btn-ghost" onClick={() => window.print()}>
          Print
        </button>
        {editable && (
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={() => {
              const issues = readiness(exam, schedules);
              setError(
                `BACKEND CONTRACT BLOCKER: ${issues.join(" ") || CONTRACT_BLOCKERS[2]} Finalization has not been sent.`,
              );
            }}
          >
            Validate / finalize
          </button>
        )}
      </div>
      {error && (
        <div className="ec-notice ec-error" role="alert">
          {error}
        </div>
      )}
      {editor && (
        <ScheduleEditor
          key={editor.id}
          exam={exam}
          original={editor}
          schedules={schedules}
          availability={availability}
          onClose={() => setEditor(null)}
          onSaved={(list) => {
            onSchedules(list);
            notify("Supported schedule changes verified against the backend.");
          }}
        />
      )}
      {removing && (
        <ExamDialog title="Remove schedule" busy={busy} onClose={() => !busy && setRemoving(null)}>
          <p>
            Remove {removing.subjectName || removing.id} on {removing.date}?
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="ec-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Keep schedule
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              disabled={busy}
              onClick={remove}
            >
              {busy ? "Removing…" : "Confirm removal"}
            </button>
          </div>
        </ExamDialog>
      )}
    </section>
  );
}
