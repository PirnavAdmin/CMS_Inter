import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Download, RefreshCw } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Loader, Modal, Toast } from "@/components/common/Ui.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import {
  getPromotionOptions,
  getEligibleStudents,
  getAllocationStudents,
  promotionList,
  previewPromotion,
  promoteStudents,
  promoteSingleStudent,
  allocateProgram,
  allocateSection,
  getPromotionHistory,
  getPromotionReport,
  rollbackPromotion,
  promotionError,
  isPromotionEligible,
  isFinalPromotionLevel,
  nextPromotionLevel,
  nextPromotionYear,
} from "@/features/promotion/services/promotionStore.js";
import "./PromotionPage.css";

const EMPTY_COHORT = { academicLevelId: "", groupId: "", programId: "", sectionId: "" };
const VIEWS = [
  ["promote", "Promote Students"],
  ["allocation", "Allocation"],
  ["history", "History & Reports"],
];
const text = (value) => String(value ?? "");
const findOption = (options, value) => options.find((item) => item.value === text(value));
const toggle = (items, id) =>
  items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
const matchStudent = (row, search) =>
  `${row.studentName} ${row.studentCode ?? row.admissionNo ?? ""} ${row.rollNo ?? ""}`
    .toLowerCase()
    .includes(search.trim().toLowerCase());
const date = (value) => (value ? new Date(value).toLocaleDateString() : "—");

// Promise caching deduplicates identical scopes, including StrictMode effects.
// The key check hides stale options in the same render as a dependency change.
function useOptions(kind, params, enabled, cache) {
  const key = enabled ? JSON.stringify([kind, params]) : "";
  const [result, setResult] = useState({ key: "", options: [], error: "" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!key) return undefined;
    let current = true;
    if (!cache.current.has(key)) {
      const [type, scope] = JSON.parse(key);
      const request = getPromotionOptions(type, scope).catch((error) => {
        cache.current.delete(key);
        throw error;
      });
      cache.current.set(key, request);
    }
    cache.current
      .get(key)
      .then((options) => {
        if (current) setResult({ key, options, error: "" });
      })
      .catch((error) => {
        if (current) setResult({ key, options: [], error: promotionError(error, `load ${kind}`) });
      });
    return () => {
      current = false;
    };
  }, [key, kind, attempt, cache]);
  const retry = () => {
    cache.current.delete(key);
    setResult({ key: "", options: [], error: "" });
    setAttempt((value) => value + 1);
  };
  return {
    options: key && result.key === key ? result.options : [],
    loading: Boolean(key && result.key !== key),
    error: key && result.key === key ? result.error : "",
    enabled,
    retry,
  };
}

function useRecords(kind, query, revision = 0) {
  const key = query ? JSON.stringify([kind, query, revision]) : "";
  const [result, setResult] = useState({ key: "", data: null, error: "" });
  useEffect(() => {
    if (!key) return undefined;
    const controller = new AbortController();
    let current = true;
    const [type, params] = JSON.parse(key);
    const load = {
      eligible: getEligibleStudents,
      allocation: getAllocationStudents,
      history: getPromotionHistory,
      report: getPromotionReport,
    }[type];
    load(params, controller.signal)
      .then((data) => {
        if (current)
          setResult({ key, data: type === "report" ? data : promotionList(data), error: "" });
      })
      .catch((error) => {
        if (current && error.code !== "ERR_CANCELED")
          setResult({
            key,
            data: null,
            error: promotionError(
              error,
              `load ${type === "eligible" ? "eligible students" : type}`,
            ),
          });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [key]);
  return {
    data: result.key === key ? result.data : null,
    error: result.key === key ? result.error : "",
    loading: Boolean(key && result.key !== key),
    loaded: Boolean(key && result.key === key),
  };
}

// A synchronous lock closes the gap before React renders disabled buttons.
function useOperation() {
  const lock = useRef(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const run = async (label, task) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(label);
    setError("");
    try {
      await task();
    } catch (failure) {
      setError(promotionError(failure, label.toLowerCase()));
    } finally {
      lock.current = false;
      setBusy("");
    }
  };
  return { busy, error, setError, run };
}

function ErrorNotice({ message, onRetry }) {
  return message ? (
    <div className="promotion-error" role="alert">
      {message}
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  ) : null;
}

function PromotionDialog({ onClose, title, ...props }) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = document.querySelector(".promotion-dialog");
    if (!dialog) return undefined;
    dialog.setAttribute("aria-label", title);
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      ).filter((element) => element.offsetParent);
    focusable()[0]?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [title]);
  return <Modal {...props} title={title} onClose={onClose} />;
}

function OptionField({ name, label, value, onChange, source, disabled = false, optional = false }) {
  const resource = label.endsWith("Section") ? "sections" : `${label.toLowerCase()}s`;
  const message = source.loading
    ? `Loading ${resource}...`
    : source.error
      ? `Unable to load ${resource}.`
      : source.enabled && !source.options.length
        ? label === "Section"
          ? "No sections available for the selected program."
          : `No ${label.toLowerCase()} options available.`
        : "";
  return (
    <div className="promotion-option-field">
      <Field
        field={{
          name,
          label,
          type: "select",
          options: source.options,
          required: !optional,
          disabled: disabled || source.loading || !source.enabled || !source.options.length,
        }}
        value={value}
        onChange={(_, next) => onChange(next)}
      />
      {message ? (
        <div
          className={source.error ? "promotion-field-error" : "promotion-field-hint"}
          role={source.error ? "alert" : "status"}
        >
          {message}
          {source.error ? (
            <>
              {" "}
              {source.error}{" "}
              <button type="button" className="cms-action-link" onClick={source.retry}>
                Retry
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function useCohortOptions(context, filters, cache) {
  const scope = {
    boardId: context.boardId,
    academicYearId: context.yearId,
    academicLevelId: filters.academicLevelId,
  };
  const groups = useOptions(
    "groups",
    scope,
    Boolean(context.ready && filters.academicLevelId),
    cache,
  );
  const programs = useOptions(
    "programs",
    { groupId: filters.groupId },
    Boolean(findOption(groups.options, filters.groupId)),
    cache,
  );
  const sections = useOptions(
    "sections",
    { ...scope, groupId: filters.groupId, programId: filters.programId },
    Boolean(findOption(programs.options, filters.programId)),
    cache,
  );
  return { groups, programs, sections };
}
function changeCohort(filters, field, value) {
  return {
    ...filters,
    [field]: value,
    ...(field === "academicLevelId" ? { groupId: "", programId: "", sectionId: "" } : {}),
    ...(field === "groupId" ? { programId: "", sectionId: "" } : {}),
    ...(field === "programId" ? { sectionId: "" } : {}),
  };
}
function CohortFields({ prefix, filters, onChange, levels, options, optionalSection = false }) {
  return (
    <div className="promotion-field-grid">
      <OptionField
        name={`${prefix}-level`}
        label="Academic Level"
        value={filters.academicLevelId}
        onChange={(value) => onChange("academicLevelId", value)}
        source={levels}
      />
      <OptionField
        name={`${prefix}-group`}
        label="Group"
        value={filters.groupId}
        onChange={(value) => onChange("groupId", value)}
        source={options.groups}
      />
      <OptionField
        name={`${prefix}-program`}
        label="Program"
        value={filters.programId}
        onChange={(value) => onChange("programId", value)}
        source={options.programs}
      />
      <OptionField
        name={`${prefix}-section`}
        label="Section"
        value={filters.sectionId}
        onChange={(value) => onChange("sectionId", value)}
        source={options.sections}
        optional={optionalSection}
      />
      {optionalSection ? (
        <span className="promotion-field-hint">
          Leave Section empty to include all sections and unallocated students.
        </span>
      ) : null}
    </div>
  );
}

export default function PromotionPage() {
  const academic = useAcademicContext();
  return (
    <DashboardLayout
      title="Promotion Center"
      subtitle="Manage yearly promotion and academic allocation"
      breadcrumb={["Academics", "Promotion"]}
    >
      <PromotionCenter
        key={`${academic.selectedBoardId}:${academic.selectedAcademicYearId}`}
        academic={academic}
      />
    </DashboardLayout>
  );
}
function PromotionCenter({ academic }) {
  const [params, setParams] = useSearchParams();
  const view = VIEWS.some(([value]) => value === params.get("view"))
    ? params.get("view")
    : "promote";
  const cache = useRef(new Map());
  const [revision, setRevision] = useState(0);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const years = useOptions("years", {}, true, cache);
  const levels = useOptions(
    "levels",
    { boardId: text(academic.selectedBoardId) },
    Boolean(academic.selectedBoardId),
    cache,
  );
  const context = {
    boardId: text(academic.selectedBoardId),
    yearId: text(academic.selectedAcademicYearId),
    boardName:
      academic.selectedBoard?.name ??
      academic.selectedBoard?.boardName ??
      "Select a Board in the header",
    yearName:
      academic.selectedAcademicYear?.label ??
      academic.selectedAcademicYear?.name ??
      "Select an Academic Year in the header",
    ready: Boolean(
      academic.selectedBoardId && findOption(years.options, academic.selectedAcademicYearId),
    ),
  };
  const changed = (message, type = "success") => {
    setRevision((value) => value + 1);
    if (message) setToast({ message, type });
  };
  return (
    <div className="promotion-page">
      <nav className="promotion-tabs" aria-label="Promotion workspaces">
        {VIEWS.map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={view === value ? "is-active" : ""}
            aria-current={view === value ? "page" : undefined}
            onClick={() =>
              setParams((current) => {
                const next = new URLSearchParams(current);
                next.set("view", value);
                return next;
              })
            }
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="promotion-context-row">
        <div>
          <span>Board</span>
          <strong>{context.boardName}</strong>
        </div>
        <div>
          <span>Academic Year</span>
          <strong>{context.yearName}</strong>
        </div>
      </div>
      <ErrorNotice message={years.error} onRetry={years.retry} />
      {!years.loading && !years.error && !context.ready ? (
        <ErrorNotice message="The current academic year is not present in configured academic years. Select a configured year in the header." />
      ) : null}
      <div hidden={view !== "promote"}>
        <PromoteWorkspace
          context={context}
          levels={levels}
          years={years}
          cache={cache}
          revision={revision}
          onChanged={changed}
        />
      </div>
      <div hidden={view !== "allocation"}>
        <AllocationWorkspace
          context={context}
          levels={levels}
          cache={cache}
          revision={revision}
          onChanged={changed}
        />
      </div>
      <div hidden={view !== "history"}>
        <HistoryWorkspace
          context={context}
          years={years}
          levels={levels}
          active={view === "history"}
          revision={revision}
          onChanged={changed}
        />
      </div>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </div>
  );
}

function PromoteWorkspace({ context, levels, years, cache, revision, onChanged }) {
  const [filters, setFilters] = useState(EMPTY_COHORT);
  const [target, setTarget] = useState({ levelId: "", groupId: "", sectionId: "" });
  const [query, setQuery] = useState(null);
  const [reload, setReload] = useState(0);
  const [selection, setSelection] = useState({ revision: -1, ids: [] });
  const [search, setSearch] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [preview, setPreview] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const operation = useOperation();
  const options = useCohortOptions(context, filters, cache);
  const nextYear = nextPromotionYear(years.options, context.yearId, context.boardId);
  const sourceLevel = findOption(levels.options, filters.academicLevelId);
  const finalYear = isFinalPromotionLevel(sourceLevel?.label);
  const targetLevelId =
    target.levelId || nextPromotionLevel(levels.options, filters.academicLevelId);
  const targetLevel = findOption(levels.options, targetLevelId);
  const destinationGroups = useOptions(
    "groups",
    { boardId: context.boardId, academicYearId: nextYear?.value, academicLevelId: targetLevelId },
    Boolean(nextYear && targetLevel && !finalYear),
    cache,
  );
  const targetGroupId =
    target.groupId ||
    (findOption(destinationGroups.options, filters.groupId) ? filters.groupId : "");
  const destinationPrograms = useOptions(
    "programs",
    { groupId: targetGroupId },
    Boolean(targetGroupId && findOption(destinationGroups.options, targetGroupId)),
    cache,
  );
  const preservedProgram = findOption(destinationPrograms.options, filters.programId);
  const destinationSections = useOptions(
    "sections",
    {
      boardId: context.boardId,
      academicYearId: nextYear?.value,
      academicLevelId: targetLevelId,
      groupId: targetGroupId,
      programId: filters.programId,
    },
    Boolean(preservedProgram && !finalYear),
    cache,
  );
  const sourceSection = findOption(options.sections.options, filters.sectionId);
  const targetSection = findOption(destinationSections.options, target.sectionId);
  const readySource = Boolean(
    context.ready &&
    sourceLevel &&
    findOption(options.groups.options, filters.groupId) &&
    findOption(options.programs.options, filters.programId) &&
    sourceSection,
  );
  const readyTarget = Boolean(
    nextYear && targetLevel && targetGroupId && preservedProgram && targetSection && !finalYear,
  );
  const records = useRecords("eligible", query, `${revision}:${reload}`);
  const students = records.data ?? [];
  const selected =
    selection.revision === revision && !records.loading
      ? selection.ids.filter((studentId) =>
          students.some(
            (student) => student.studentId === studentId && isPromotionEligible(student),
          ),
        )
      : [];
  const select = (ids) => setSelection({ revision, ids });
  const visible = students.filter(
    (row) => matchStudent(row, search) && (!eligibility || row.eligibilityStatus === eligibility),
  );
  const invalidate = () => {
    setQuery(null);
    select([]);
    setPreview(null);
    setOutcome(null);
    operation.setError("");
  };
  const updateSource = (field, value) => {
    setFilters(changeCohort(filters, field, value));
    if (field === "academicLevelId") setTarget({ levelId: "", groupId: "", sectionId: "" });
    else
      setTarget((current) => ({
        ...current,
        ...(field === "groupId" ? { groupId: "" } : {}),
        sectionId: "",
      }));
    invalidate();
  };
  const updateTarget = (field, value) => {
    setTarget((current) => ({
      ...current,
      [field]: value,
      ...(field === "levelId" ? { groupId: "", sectionId: "" } : {}),
      ...(field === "groupId" ? { sectionId: "" } : {}),
    }));
    invalidate();
  };
  const load = () => {
    if (!readySource) return;
    select([]);
    setOutcome(null);
    operation.setError("");
    setQuery({
      academicYearId: Number(context.yearId),
      boardId: Number(context.boardId),
      academicLevel: sourceLevel.label,
      groupId: Number(filters.groupId),
      programId: Number(filters.programId),
      section: sourceSection.sectionName,
      targetAcademicYearId: nextYear ? Number(nextYear.value) : undefined,
      targetAcademicLevel: targetLevel?.label,
      targetGroupId: targetGroupId ? Number(targetGroupId) : undefined,
      targetProgramId: Number(filters.programId),
      targetSection: targetSection?.sectionName,
    });
    setReload((value) => value + 1);
  };
  const sourceDescription = [
    context.yearName,
    sourceLevel?.label,
    findOption(options.groups.options, filters.groupId)?.label,
    findOption(options.programs.options, filters.programId)?.label,
    sourceSection?.label,
  ]
    .filter(Boolean)
    .join(" · ");
  const destinationDescription = [
    nextYear?.label,
    targetLevel?.label,
    findOption(destinationGroups.options, targetGroupId)?.label,
    preservedProgram?.label,
    targetSection?.label,
  ]
    .filter(Boolean)
    .join(" · ");
  const openPreview = (ids, single = false) =>
    operation.run("Preparing preview", async () => {
      if (
        !readySource ||
        !readyTarget ||
        !ids.length ||
        ids.some(
          (studentId) =>
            !students.some(
              (student) => student.studentId === studentId && isPromotionEligible(student),
            ),
        )
      )
        throw new Error("Complete the source and destination, then select eligible students.");
      const payload = {
        sourceAcademicYearId: Number(context.yearId),
        sourceBoardId: Number(context.boardId),
        sourceAcademicLevelId: Number(filters.academicLevelId),
        sourceAcademicLevel: sourceLevel.label,
        sourceGroupId: Number(filters.groupId),
        sourceProgramId: Number(filters.programId),
        sourceSectionId: Number(sourceSection.value),
        sourceSection: sourceSection.sectionName,
        targetAcademicYearId: Number(nextYear.value),
        targetBoardId: Number(context.boardId),
        targetAcademicLevelId: Number(targetLevelId),
        targetAcademicLevel: targetLevel.label,
        targetGroupId: Number(targetGroupId),
        targetProgramId: Number(filters.programId),
        targetSectionId: Number(targetSection.value),
        targetSection: targetSection.sectionName,
        studentIds: ids,
      };
      const data = await previewPromotion(payload);
      if (!data || !Array.isArray(data.students))
        throw new Error("The server returned an invalid preview. Reload students and try again.");
      setPreview({
        payload,
        data,
        single,
        source: sourceDescription,
        destination: destinationDescription,
        revision,
      });
    });
  const validPreview =
    preview &&
    preview.revision === revision &&
    preview.data?.totalSelected === preview.payload.studentIds.length &&
    preview.data?.eligibleCount === preview.payload.studentIds.length &&
    preview.data?.notEligibleCount === 0 &&
    preview.data?.students?.length === preview.payload.studentIds.length &&
    new Set(preview.data.students.map((row) => row.studentId)).size ===
      preview.payload.studentIds.length &&
    preview.data.students.every(
      (row) => isPromotionEligible(row) && preview.payload.studentIds.includes(row.studentId),
    );
  const confirm = () =>
    operation.run("Promoting", async () => {
      if (!validPreview)
        throw new Error("The preview is no longer valid. Reload students and preview again.");
      const { payload, single } = preview;
      let result;
      if (single) {
        const {
          targetAcademicYearId,
          targetBoardId,
          targetAcademicLevel,
          targetGroupId,
          targetProgramId,
          targetSection,
        } = payload;
        result = await promoteSingleStudent(payload.studentIds[0], {
          targetAcademicYearId,
          targetBoardId,
          targetAcademicLevel,
          targetGroupId,
          targetProgramId,
          targetSection,
        });
        if (result.promotionStatus?.toLowerCase() !== "promoted")
          throw new Error("The server did not confirm promotion. Refresh history before retrying.");
      } else {
        result = await promoteStudents(payload);
        if (
          !Number.isInteger(result?.promotedCount) ||
          !Number.isInteger(result?.failedCount) ||
          result.promotedCount < 0 ||
          result.failedCount < 0 ||
          result.promotedCount + result.failedCount !== payload.studentIds.length
        ) {
          setPreview(null);
          select([]);
          onChanged("");
          throw new Error(
            "The server did not return a complete promotion result. Review refreshed history before retrying.",
          );
        }
      }
      setPreview(null);
      select([]);
      setOutcome({ result, single });
      const failed = !single && result.failedCount > 0;
      onChanged(
        single
          ? "Student promoted successfully."
          : `${result.promotedCount ?? "—"} promoted; ${result.failedCount ?? "—"} failed.${result.promotionBatchId ? ` Batch: ${result.promotionBatchId}` : ""}`,
        failed ? "warning" : "success",
      );
    });
  return (
    <div className="promotion-workspace">
      <ol className="promotion-steps" aria-label="Promotion workflow">
        <li aria-current={!query ? "step" : undefined}>
          <span>1</span>Select source cohort
        </li>
        <li aria-current={query && !preview ? "step" : undefined}>
          <span>2</span>Review eligible students
        </li>
        <li aria-current={preview ? "step" : undefined}>
          <span>3</span>Preview & confirm
        </li>
      </ol>
      <ErrorNotice message={operation.error} />
      <section className="cms-card promotion-card">
        <fieldset className="promotion-form" disabled={Boolean(operation.busy)}>
          <legend className="promotion-sr-only">Promotion configuration</legend>
          <div className="cms-card-body promotion-setup-grid">
            <div>
              <h2>Current cohort</h2>
              <p className="promotion-panel-caption">{context.yearName}</p>
              <CohortFields
                prefix="promote-source"
                filters={filters}
                onChange={updateSource}
                levels={levels}
                options={options}
              />
            </div>
            <ArrowRight className="promotion-arrow" size={24} aria-hidden="true" />
            <div>
              <h2>{finalYear ? "Course completion" : "Promotion destination"}</h2>
              <p className="promotion-panel-caption">
                {years.loading
                  ? "Loading academic years..."
                  : (nextYear?.label ?? "Next academic year is not configured.")}
              </p>
              {finalYear ? (
                <p className="promotion-note">
                  Final-year students follow the course completion process. This promotion service
                  does not provide a completion action.
                </p>
              ) : (
                <div className="promotion-field-grid">
                  <OptionField
                    name="promote-target-level"
                    label="Academic Level"
                    value={targetLevelId}
                    onChange={(value) => updateTarget("levelId", value)}
                    source={{
                      ...levels,
                      options: levels.options.filter(
                        (level) => level.value !== filters.academicLevelId,
                      ),
                      enabled: Boolean(sourceLevel),
                    }}
                  />
                  <OptionField
                    name="promote-target-group"
                    label="Group"
                    value={targetGroupId}
                    onChange={(value) => updateTarget("groupId", value)}
                    source={destinationGroups}
                  />
                  <div className="promotion-readonly">
                    <span>Program</span>
                    <strong>
                      {findOption(options.programs.options, filters.programId)?.label ?? "—"}
                    </strong>
                    <small>Same as current</small>
                    {destinationPrograms.loading ? (
                      <small role="status">Checking destination programs...</small>
                    ) : filters.programId && targetGroupId && !preservedProgram ? (
                      <small className="promotion-field-error">
                        Choose a destination group that supports the current program.
                      </small>
                    ) : null}
                    <ErrorNotice
                      message={destinationPrograms.error}
                      onRetry={destinationPrograms.retry}
                    />
                  </div>
                  <OptionField
                    name="promote-target-section"
                    label="Section"
                    value={target.sectionId}
                    onChange={(value) => updateTarget("sectionId", value)}
                    source={destinationSections}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="promotion-actions">
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              disabled={!readySource || records.loading}
              onClick={load}
            >
              {records.loading ? "Loading eligible students..." : "Load Eligible Students"}
            </button>
          </div>
        </fieldset>
      </section>
      <section className="cms-card promotion-card">
        <div className="cms-card-head">
          <div>
            <h2>Eligible students</h2>
            <p>
              {records.loaded && !records.error
                ? `${students.length} students returned for this cohort`
                : "Configure the cohort, then load students to review eligibility."}
            </p>
          </div>
        </div>
        <div className="promotion-table-controls">
          <input
            aria-label="Find student in current cohort"
            placeholder="Find student by name or admission number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            aria-label="Eligibility filter"
            value={eligibility}
            onChange={(event) => setEligibility(event.target.value)}
          >
            <option value="">All eligibility statuses</option>
            <option>Eligible</option>
            <option>Not Eligible</option>
          </select>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            disabled={!visible.some(isPromotionEligible) || Boolean(operation.busy) || finalYear}
            onClick={() =>
              select(visible.filter(isPromotionEligible).map((student) => student.studentId))
            }
          >
            Select All Eligible
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => select([])}
            disabled={!selected.length || Boolean(operation.busy)}
          >
            Clear Selection
          </button>
        </div>
        <ErrorNotice message={records.error} onRetry={load} />
        {records.loading ? (
          <Loader label="Loading eligible students..." />
        ) : (
          <div className="cms-table-wrap">
            <table className="cms-table promotion-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Student</th>
                  <th>Admission / Student Code</th>
                  <th>Current Level</th>
                  <th>Group</th>
                  <th>Program</th>
                  <th>Section</th>
                  <th>Eligibility</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((student) => (
                  <tr key={student.studentId}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${student.studentName}`}
                        checked={selected.includes(student.studentId)}
                        disabled={
                          !isPromotionEligible(student) || finalYear || Boolean(operation.busy)
                        }
                        onChange={() => select(toggle(selected, student.studentId))}
                      />
                    </td>
                    <td className="cms-strong">{student.studentName}</td>
                    <td>{student.studentCode || "—"}</td>
                    <td>{student.academicLevel || "—"}</td>
                    <td>{student.groupName || "—"}</td>
                    <td>{student.programName || "—"}</td>
                    <td>{student.section || "—"}</td>
                    <td>
                      <span
                        className={`promotion-status ${isPromotionEligible(student) ? "eligible" : "not-eligible"}`}
                      >
                        {student.eligibilityStatus || "Unknown"}
                      </span>
                    </td>
                    <td>{student.eligibilityReason || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="cms-action-link"
                        disabled={
                          !isPromotionEligible(student) || !readyTarget || Boolean(operation.busy)
                        }
                        onClick={() => openPreview([student.studentId], true)}
                      >
                        Promote
                      </button>
                    </td>
                  </tr>
                ))}
                {!visible.length ? (
                  <tr>
                    <td colSpan={10} className="promotion-empty">
                      {records.error
                        ? "Student data could not be loaded."
                        : records.loaded
                          ? "No eligible students found for this cohort or the selected filters."
                          : "Select a cohort and load eligible students."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
        {!finalYear ? (
          <div className="promotion-selection-bar">
            <strong>{selected.length} students selected</strong>
            <span>
              {!readyTarget
                ? "Complete the destination to preview promotion."
                : destinationDescription}
            </span>
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              disabled={!selected.length || !readyTarget || Boolean(operation.busy)}
              onClick={() => openPreview(selected)}
            >
              {operation.busy === "Preparing preview"
                ? "Preparing preview..."
                : "Preview Promotion"}
            </button>
          </div>
        ) : null}
      </section>
      {outcome ? (
        <div className="promotion-note" role="status">
          {outcome.single ? (
            `Promotion ${outcome.result.promotionId}: ${outcome.result.promotionStatus}`
          ) : (
            <>
              <strong>
                {outcome.result.promotedCount ?? "—"} promoted · {outcome.result.failedCount ?? "—"}{" "}
                failed
              </strong>
              {outcome.result.promotionBatchId ? (
                <p>Batch reference: {outcome.result.promotionBatchId}</p>
              ) : null}
              <ul>
                {outcome.result.students
                  ?.filter((row) => row.promotionStatus !== "Promoted")
                  .map((row) => (
                    <li key={row.studentId}>
                      {row.studentName || row.studentId}: {row.message}
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
      {preview ? (
        <PromotionDialog
          title={preview.single ? "Confirm Student Promotion" : "Promotion Preview"}
          className="promotion-dialog"
          onClose={() => !operation.busy && setPreview(null)}
          footer={
            <>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={Boolean(operation.busy)}
                onClick={() => setPreview(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-primary"
                disabled={Boolean(operation.busy) || !validPreview}
                onClick={confirm}
              >
                {operation.busy === "Promoting" ? "Promoting..." : "Confirm Promotion"}
              </button>
            </>
          }
        >
          <ErrorNotice message={operation.error} />
          <div className="promotion-preview-details">
            <div>
              <span>Source</span>
              <strong>{preview.source}</strong>
            </div>
            <div>
              <span>Destination</span>
              <strong>{preview.destination}</strong>
            </div>
            <div>
              <span>Selected Students</span>
              <strong>{preview.data.totalSelected ?? "—"}</strong>
            </div>
            <div>
              <span>Eligible</span>
              <strong>{preview.data.eligibleCount ?? "—"}</strong>
            </div>
            <div>
              <span>Not Eligible</span>
              <strong>{preview.data.notEligibleCount ?? "—"}</strong>
            </div>
          </div>
          {!validPreview ? (
            <p className="promotion-field-error">
              The backend has not approved every selected student. Review the validation results and
              load a fresh cohort before continuing.
            </p>
          ) : null}
          <ul className="promotion-preview-list">
            {preview.data.students?.map((row) => (
              <li key={row.studentId}>
                <strong>{row.studentName || `Student ${row.studentId}`}</strong> —{" "}
                {row.eligibilityStatus}
                <p>{row.eligibilityReason}</p>
              </li>
            ))}
          </ul>
        </PromotionDialog>
      ) : null}
    </div>
  );
}

function AllocationWorkspace({ context, levels, cache, revision, onChanged }) {
  const [mode, setMode] = useState("program");
  const [filters, setFilters] = useState(EMPTY_COHORT);
  const [query, setQuery] = useState(null);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({ revision: -1, selected: [], targets: {} });
  const [bulkTarget, setBulkTarget] = useState("");
  const [results, setResults] = useState([]);
  const operation = useOperation();
  const options = useCohortOptions(context, filters, cache);
  const records = useRecords("allocation", query, `${revision}:${reload}`);
  const students = records.data ?? [];
  const visible = students.filter((row) => matchStudent(row, search));
  const selected =
    draft.revision === revision && !records.loading
      ? draft.selected.filter((studentId) =>
          students.some((student) => student.studentId === studentId),
        )
      : [];
  const targets = draft.revision === revision ? draft.targets : {};
  const targetOptions = mode === "program" ? options.programs : options.sections;
  const select = (ids) => setDraft({ revision, selected: ids, targets });
  const clear = () => {
    setDraft({ revision, selected: [], targets: {} });
    setBulkTarget("");
    setResults([]);
    operation.setError("");
  };
  const ready = Boolean(
    context.ready &&
    findOption(levels.options, filters.academicLevelId) &&
    findOption(options.groups.options, filters.groupId) &&
    findOption(options.programs.options, filters.programId) &&
    (!filters.sectionId || findOption(options.sections.options, filters.sectionId)),
  );
  const load = () => {
    if (ready) {
      clear();
      setQuery({ boardId: context.boardId, academicYearId: context.yearId, ...filters });
      setReload((value) => value + 1);
    }
  };
  const setTarget = (studentId, value) =>
    setDraft({ revision, selected, targets: { ...targets, [studentId]: value } });
  const save = () =>
    operation.run("Saving allocation", async () => {
      if (!ready || !selected.length) throw new Error("Load a cohort and select students first.");
      const grouped = new Map();
      for (const studentId of selected) {
        const target = findOption(targetOptions.options, targets[studentId]);
        if (!target)
          throw new Error("Assign a valid target to every selected student before saving.");
        if (!grouped.has(target.value)) grouped.set(target.value, []);
        grouped.get(target.value).push(studentId);
      }
      const responses = [];
      let attempted = false;
      try {
        for (const [targetId, studentIds] of grouped) {
          attempted = true;
          const payload = {
            studentIds,
            targetAcademicYearId: Number(context.yearId),
            targetAcademicLevelId: Number(filters.academicLevelId),
            targetAcademicLevel: findOption(levels.options, filters.academicLevelId).label,
            targetGroupId: Number(filters.groupId),
          };
          const result =
            mode === "program"
              ? await allocateProgram({ ...payload, targetProgramId: Number(targetId) })
              : await allocateSection({
                  ...payload,
                  targetSectionId: Number(targetId),
                  targetSection: findOption(options.sections.options, targetId).sectionName,
                });
          if (
            !Number.isInteger(result?.updatedCount) ||
            !Number.isInteger(result?.failedCount) ||
            result.updatedCount < 0 ||
            result.failedCount < 0 ||
            result.updatedCount + result.failedCount !== studentIds.length
          )
            throw new Error(
              "The server did not return a complete allocation result. Review the refreshed cohort before retrying.",
            );
          responses.push(result);
          setResults([...responses]);
          if (result.failedCount > 0)
            throw new Error(
              "Some allocations failed. Review the returned results below. Unprocessed targets were not submitted.",
            );
        }
        onChanged(
          `${mode === "program" ? "Program" : "Section"} allocation saved. ${responses.reduce((sum, result) => sum + (result.updatedCount ?? 0), 0)} updates reported by the server.`,
        );
      } catch (error) {
        if (attempted)
          onChanged(
            "Allocation data refreshed. Review the save results before retrying.",
            "warning",
          );
        throw error;
      }
    });
  return (
    <div className="promotion-workspace">
      <section className="cms-card promotion-card">
        <div className="cms-card-head">
          <div>
            <h2>Academic allocation</h2>
            <p>
              Load students independently for the current academic year. Promotion eligibility does
              not restrict allocation.
            </p>
          </div>
        </div>
        <fieldset className="promotion-form" disabled={Boolean(operation.busy)}>
          <legend className="promotion-sr-only">Allocation configuration</legend>
          <div className="promotion-segmented" aria-label="Allocation type">
            {[
              ["program", "Program Allocation"],
              ["section", "Section Allocation"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={mode === value}
                className={mode === value ? "is-active" : ""}
                onClick={() => {
                  setMode(value);
                  clear();
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="cms-card-body">
            <CohortFields
              prefix="allocation"
              filters={filters}
              levels={levels}
              options={options}
              optionalSection
              onChange={(field, value) => {
                setFilters(changeCohort(filters, field, value));
                setQuery(null);
                clear();
              }}
            />
          </div>
          <div className="promotion-actions">
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              disabled={!ready || records.loading}
              onClick={load}
            >
              {records.loading ? "Loading students..." : "Load Students"}
            </button>
          </div>
        </fieldset>
      </section>
      <ErrorNotice message={operation.error} />
      <ErrorNotice message={records.error} onRetry={load} />
      <section className="cms-card promotion-card">
        <div className="cms-card-head">
          <div>
            <h2>{mode === "program" ? "Program" : "Section"} assignments</h2>
            <p>Choose targets for individual rows, or apply one target to selected students.</p>
          </div>
        </div>
        <fieldset className="promotion-form" disabled={Boolean(operation.busy) || records.loading}>
          <legend className="promotion-sr-only">Student allocations</legend>
          <div className="promotion-table-controls">
            <input
              aria-label="Search allocation students"
              placeholder="Search name, admission or roll number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={!visible.length}
              onClick={() => select(visible.map((row) => row.studentId))}
            >
              Select All
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={!selected.length}
              onClick={() => select([])}
            >
              Clear Selection
            </button>
          </div>
          <div className="promotion-allocation-tools">
            <OptionField
              name="allocation-bulk-target"
              label={`Target ${mode === "program" ? "Program" : "Section"}`}
              value={bulkTarget}
              onChange={setBulkTarget}
              source={targetOptions}
            />
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={!selected.length || !findOption(targetOptions.options, bulkTarget)}
              onClick={() =>
                setDraft({
                  revision,
                  selected,
                  targets: {
                    ...targets,
                    ...Object.fromEntries(selected.map((studentId) => [studentId, bulkTarget])),
                  },
                })
              }
            >
              Apply to Selected
            </button>
          </div>
          {records.loading ? (
            <Loader label="Loading allocation students..." />
          ) : (
            <div className="cms-table-wrap">
              <table className="cms-table promotion-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Student</th>
                    <th>Admission No.</th>
                    <th>Group</th>
                    <th>Current {mode === "program" ? "Program" : "Section"}</th>
                    <th>Target {mode === "program" ? "Program" : "Section"}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.studentId}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.studentName} for allocation`}
                          checked={selected.includes(row.studentId)}
                          onChange={() => select(toggle(selected, row.studentId))}
                        />
                      </td>
                      <td className="cms-strong">{row.studentName}</td>
                      <td>{row.admissionNo || "—"}</td>
                      <td>{row.groupName || "—"}</td>
                      <td>{(mode === "program" ? row.programName : row.sectionName) || "—"}</td>
                      <td>
                        <select
                          aria-label={`Target ${mode} for ${row.studentName}`}
                          value={targets[row.studentId] ?? ""}
                          disabled={targetOptions.loading || !targetOptions.options.length}
                          onChange={(event) => setTarget(row.studentId, event.target.value)}
                        >
                          <option value="">Choose {mode}</option>
                          {targetOptions.options.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                  {!visible.length ? (
                    <tr>
                      <td colSpan={6} className="promotion-empty">
                        {records.error
                          ? "Student data could not be loaded."
                          : records.loaded
                            ? "No students found for this allocation cohort or search."
                            : "Choose your allocation cohort above and load students."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </fieldset>
        <div className="promotion-selection-bar">
          <strong>{selected.length} students selected</strong>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            disabled={
              !selected.length ||
              !selected.every((studentId) =>
                findOption(targetOptions.options, targets[studentId]),
              ) ||
              Boolean(operation.busy)
            }
            onClick={save}
          >
            {operation.busy ? "Saving allocation..." : "Save Allocation"}
          </button>
        </div>
      </section>
      {results.length ? (
        <div className="promotion-note" role="status">
          <strong>Allocation results</strong>
          {results.map((result, index) => (
            <div key={index}>
              <p>
                {result.updatedCount ?? "—"} updated · {result.failedCount ?? "—"} failed
              </p>
              <ul>
                {result.students
                  ?.filter((row) => row.status !== "Updated")
                  .map((row) => (
                    <li key={row.studentId}>
                      {row.studentName || `Student ${row.studentId}`}: {row.message}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function exportCsv(filename, columns, rows) {
  const cell = (value) => {
    const string = text(value);
    return `"${(/^[\s]*[=+@-]/.test(string) ? "'" + string : string).replaceAll('"', '""')}"`;
  };
  const content = [
    columns.map(([label]) => cell(label)).join(","),
    ...rows.map((row) =>
      columns.map(([, key]) => cell(typeof key === "function" ? key(row) : row[key])).join(","),
    ),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const historyDescription = (row, prefix) =>
  [
    row[`${prefix}AcademicYear`],
    row[`${prefix}AcademicLevel`] ?? row[`${prefix}Level`],
    row[`${prefix}Group`],
    row[`${prefix}Program`],
    row[`${prefix}Section`],
  ]
    .filter(Boolean)
    .join(" · ") || "—";
const HISTORY_COLUMNS = [
  ["Promotion ID", "promotionId"],
  ["Student", "studentName"],
  ["Admission No.", "admissionNo"],
  ["Source", (row) => historyDescription(row, "source")],
  ["Destination", (row) => historyDescription(row, "target")],
  ["Date", "promotionDate"],
  ["Status", "promotionStatus"],
  ["Promoted By", "promotedBy"],
];
const REPORT_METRICS = [
  ["totalStudents", "Total Students"],
  ["eligibleStudents", "Eligible"],
  ["notEligibleStudents", "Not Eligible"],
  ["promotedStudents", "Promoted"],
  ["notPromotedStudents", "Not Promoted"],
  ["rolledBackStudents", "Rolled Back"],
];
const canRollback = (row) =>
  row.rollbackStatus === false && row.promotionStatus?.toLowerCase() === "promoted";

function HistoryWorkspace({ context, years, levels, active, revision, onChanged }) {
  const [opened, setOpened] = useState(active);
  const [filters, setFilters] = useState({
    academicYearId: context.yearId,
    academicLevel: "",
    promotionStatus: "",
    studentId: "",
    search: "",
    fromDate: "",
    toDate: "",
  });
  const [applied, setApplied] = useState(filters);
  const [reloadHistory, setReloadHistory] = useState(0);
  const [reloadReport, setReloadReport] = useState(0);
  const [rollbackRecord, setRollbackRecord] = useState(null);
  const [reason, setReason] = useState("");
  const operation = useOperation();
  useEffect(() => {
    if (active) setOpened(true);
  }, [active]);
  const history = useRecords(
    "history",
    opened && context.ready
      ? {
          ...applied,
          studentId: applied.studentId ? Number(applied.studentId) : undefined,
          academicYearId: Number(applied.academicYearId),
        }
      : null,
    `${revision}:${reloadHistory}`,
  );
  // Report DTO has no search, student, dates or program filters. Its cards show
  // the shared year/level/status scope, independently of history-only filters.
  const report = useRecords(
    "report",
    opened && context.ready
      ? {
          academicYearId: Number(applied.academicYearId),
          academicLevel: applied.academicLevel,
          promotionStatus: applied.promotionStatus,
        }
      : null,
    `${revision}:${reloadReport}`,
  );
  const rows = history.data ?? [];
  const latestInLoadedRows = new Map();
  for (const row of rows)
    if (canRollback(row) && (latestInLoadedRows.get(row.studentId) ?? 0) < row.promotionId)
      latestInLoadedRows.set(row.studentId, row.promotionId);
  const verifyLatest = async (record) => {
    // HistoryDto has no CanRollback flag. Check the student's complete history,
    // without year/search filters, before offering confirmation.
    const studentHistory = promotionList(
      await getPromotionHistory({ studentId: record.studentId }),
    );
    const latest = studentHistory
      .filter(canRollback)
      .sort((a, b) => b.promotionId - a.promotionId)[0];
    if (latest?.promotionId !== record.promotionId)
      throw new Error(
        "Only the latest active promotion can be rolled back. Refresh history to review this student.",
      );
  };
  const openRollback = (record) =>
    operation.run("Checking rollback", async () => {
      await verifyLatest(record);
      setRollbackRecord({ ...record, revision });
      setReason("");
    });
  const rollback = () =>
    operation.run("Rolling back", async () => {
      if (
        !rollbackRecord ||
        rollbackRecord.revision !== revision ||
        !reason.trim() ||
        reason.trim().length > 500
      )
        throw new Error(
          "Enter a rollback reason of up to 500 characters and use a current record.",
        );
      await verifyLatest(rollbackRecord);
      const result = await rollbackPromotion({
        promotionId: rollbackRecord.promotionId,
        reason: reason.trim(),
      });
      if (result.rollbackStatus?.toLowerCase() !== "rolledback")
        throw new Error(
          "Rollback was not confirmed by the server. Refresh history before retrying.",
        );
      setRollbackRecord(null);
      setReason("");
      onChanged(`Promotion ${result.promotionId} rolled back successfully.`);
    });
  const apply = () => {
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      operation.setError("From Date must be on or before To Date.");
      return;
    }
    if (!filters.academicYearId) {
      operation.setError("Select a source academic year.");
      return;
    }
    operation.setError("");
    setApplied(filters);
    setReloadHistory((value) => value + 1);
    setReloadReport((value) => value + 1);
  };
  const setFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }));
  return (
    <div className="promotion-workspace">
      <section className="cms-card promotion-card">
        <div className="cms-card-head">
          <div>
            <h2>History & Reports</h2>
            <p>
              Summary cards use the source year, level and status below. History also supports
              student, search and date filters.
            </p>
            <p>History and reports include all boards for the selected filters.</p>
          </div>
        </div>
        <div className="cms-card-body promotion-history-filters">
          <OptionField
            name="history-year"
            label="Source Academic Year"
            value={filters.academicYearId}
            onChange={(value) => setFilter("academicYearId", value)}
            source={years}
          />
          <OptionField
            name="history-level"
            label="Source Academic Level"
            value={filters.academicLevel}
            onChange={(value) => setFilter("academicLevel", value)}
            source={{
              ...levels,
              options: levels.options.map((level) => ({ ...level, value: level.label })),
            }}
            optional
          />
          {[
            {
              name: "promotionStatus",
              label: "Status",
              type: "select",
              options: ["Promoted", "RolledBack"],
            },
            { name: "studentId", label: "Student ID", type: "number", min: 1 },
            { name: "search", label: "Search", placeholder: "Student name or admission number" },
            { name: "fromDate", label: "From Date", type: "date" },
            { name: "toDate", label: "To Date", type: "date" },
          ].map((field) => (
            <Field
              key={field.name}
              field={{ ...field, name: `history-${field.name}` }}
              value={filters[field.name]}
              onChange={(_, value) => setFilter(field.name, value)}
            />
          ))}
        </div>
        <div className="promotion-actions">
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => {
              const empty = {
                academicYearId: context.yearId,
                academicLevel: "",
                promotionStatus: "",
                studentId: "",
                search: "",
                fromDate: "",
                toDate: "",
              };
              setFilters(empty);
              setApplied(empty);
              operation.setError("");
            }}
            disabled={Boolean(operation.busy)}
          >
            Clear Filters
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-primary"
            onClick={apply}
            disabled={
              !context.ready || history.loading || report.loading || Boolean(operation.busy)
            }
          >
            Apply Filters
          </button>
        </div>
      </section>
      <ErrorNotice message={operation.error} />
      <section aria-label="Promotion report summary">
        <div className="promotion-section-heading">
          <h2>Report summary</h2>
          <div>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={!report.data || report.loading}
              onClick={() =>
                exportCsv(
                  "Promotion_Report_Summary.csv",
                  [
                    ["Metric", "metric"],
                    ["Value", "value"],
                  ],
                  REPORT_METRICS.filter(([key]) => Number.isFinite(report.data[key])).map(
                    ([key, label]) => ({ metric: label, value: report.data[key] }),
                  ),
                )
              }
            >
              <Download size={15} />
              Export Summary
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={!report.data?.details?.length || report.loading}
              onClick={() =>
                exportCsv(
                  "Promotion_Report_Details.csv",
                  [
                    ...HISTORY_COLUMNS.filter(([label]) => label !== "Promoted By"),
                    ["Eligibility", "eligibilityStatus"],
                  ],
                  report.data.details,
                )
              }
            >
              Export Details
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={report.loading}
              onClick={() => setReloadReport((value) => value + 1)}
              aria-label="Refresh report"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <ErrorNotice message={report.error} onRetry={() => setReloadReport((value) => value + 1)} />
        {report.loading ? (
          <Loader label="Loading report summary..." />
        ) : report.data ? (
          <div className="promotion-summary">
            {REPORT_METRICS.filter(([key]) => Number.isFinite(report.data[key])).map(
              ([key, label]) => (
                <div key={key}>
                  <span>{label}</span>
                  <strong>{report.data[key]}</strong>
                </div>
              ),
            )}
          </div>
        ) : null}
      </section>
      <section className="cms-card promotion-card">
        <div className="cms-card-head">
          <div>
            <h2>Promotion history</h2>
            <p>{rows.length} loaded records</p>
          </div>
          <div className="promotion-heading-actions">
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={!rows.length || history.loading}
              onClick={() => exportCsv("Promotion_History.csv", HISTORY_COLUMNS, rows)}
            >
              <Download size={15} />
              Export CSV
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={history.loading}
              onClick={() => setReloadHistory((value) => value + 1)}
              aria-label="Refresh history"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <ErrorNotice
          message={history.error}
          onRetry={() => setReloadHistory((value) => value + 1)}
        />
        {history.loading ? (
          <Loader label="Loading promotion history..." />
        ) : (
          <div className="cms-table-wrap">
            <table className="cms-table promotion-table">
              <thead>
                <tr>
                  {[
                    "Promotion ID",
                    "Student",
                    "Admission No.",
                    "Source",
                    "Destination",
                    "Date",
                    "Status",
                    "Promoted By",
                    "Action",
                  ].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.promotionId}>
                    <td>{row.promotionId}</td>
                    <td className="cms-strong">{row.studentName}</td>
                    <td>{row.admissionNo || row.studentCode || "—"}</td>
                    <td>{historyDescription(row, "source")}</td>
                    <td>{historyDescription(row, "target")}</td>
                    <td className="promotion-date">{date(row.promotionDate)}</td>
                    <td>
                      <span
                        className={`promotion-status ${row.rollbackStatus ? "not-eligible" : "eligible"}`}
                      >
                        {row.promotionStatus}
                      </span>
                      {row.rollbackReason ? <small>{row.rollbackReason}</small> : null}
                    </td>
                    <td>{row.promotedBy || "—"}</td>
                    <td>
                      {canRollback(row) &&
                      latestInLoadedRows.get(row.studentId) === row.promotionId ? (
                        <button
                          type="button"
                          className="cms-action-link danger"
                          disabled={Boolean(operation.busy)}
                          onClick={() => openRollback(row)}
                        >
                          Rollback
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={9} className="promotion-empty">
                      {history.error
                        ? "History could not be loaded."
                        : "No promotion history found for the selected filters."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {rollbackRecord ? (
        <PromotionDialog
          title="Confirm Promotion Rollback"
          size="sm"
          className="promotion-dialog"
          onClose={() => !operation.busy && setRollbackRecord(null)}
          footer={
            <>
              <button
                type="button"
                className="cms-btn cms-btn-ghost"
                disabled={Boolean(operation.busy)}
                onClick={() => setRollbackRecord(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cms-btn cms-btn-danger"
                disabled={
                  Boolean(operation.busy) || !reason.trim() || rollbackRecord.revision !== revision
                }
                onClick={rollback}
              >
                {operation.busy ? "Rolling back..." : "Confirm Rollback"}
              </button>
            </>
          }
        >
          <ErrorNotice message={operation.error} />
          <p>
            Roll back promotion <strong>{rollbackRecord.promotionId}</strong> for{" "}
            <strong>{rollbackRecord.studentName}</strong>?
          </p>
          <div className="cms-field">
            <label htmlFor="promotion-rollback-reason">Reason (required)</label>
            <textarea
              id="promotion-rollback-reason"
              maxLength={500}
              value={reason}
              disabled={Boolean(operation.busy)}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </PromotionDialog>
      ) : null}
    </div>
  );
}
