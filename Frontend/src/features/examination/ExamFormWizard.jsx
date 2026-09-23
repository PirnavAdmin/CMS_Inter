import { useRef, useState } from "react";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { getApiErrorMessage } from "@/api/apiClient.js";
import { useLookup, saveExam } from "./examinationApi.js";
import {
  ids,
  id,
  normalizeSubject,
  isEligibleSubject,
  strategy,
  creationBlockers,
  same,
} from "./examinationModel.js";

export function ExamField({ label, value = "", onChange, options, type = "text", ...props }) {
  return (
    <label className="cms-field ec-field">
      <span>{label}</span>
      {options ? (
        <select value={value} onChange={(e) => onChange?.(e.target.value)} {...props}>
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange?.(e.target.value)} {...props} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange?.(e.target.value)} {...props} />
      )}
    </label>
  );
}
export function LookupState({ lookup, noun }) {
  if (lookup.status === "error")
    return (
      <div className="ec-notice" role="alert">
        Unable to load {noun}: {getApiErrorMessage(lookup.error)}{" "}
        <button type="button" className="cms-btn cms-btn-ghost" onClick={lookup.retry}>
          Retry {noun}
        </button>
      </div>
    );
  if (lookup.status === "loading") return <p role="status">Loading {noun}…</p>;
  if (lookup.status === "loaded" && !lookup.data.length)
    return <p className="ec-muted">No {noun} are configured for this scope.</p>;
  return null;
}
function GroupPrograms({ group, selected, onChange }) {
  const programs = useLookup(apiEndpoints.groups.programs(group.id));
  return (
    <div className="ec-scope-panel">
      <h3>{group.name}</h3>
      <LookupState lookup={programs} noun="programs" />
      <div className="ec-choices">
        {programs.data
          .filter((p) => p.isActive !== false)
          .map((p) => {
            const pid = id(p.programId ?? p.id);
            return (
              <label key={pid}>
                <input
                  type="checkbox"
                  checked={selected.includes(pid)}
                  onChange={() =>
                    onChange(
                      selected.includes(pid)
                        ? selected.filter((v) => v !== pid)
                        : [...selected, pid],
                      Object.fromEntries(
                        programs.data.map((program) => [
                          id(program.programId ?? program.id),
                          program.programName ?? program.name,
                        ]),
                      ),
                    )
                  }
                />
                {p.programName ?? p.name}
              </label>
            );
          })}
      </div>
    </div>
  );
}
function LevelGroups({ level, form, updatePrograms }) {
  const groups = useLookup(apiEndpoints.groups.list, {
    boardId: Number(form.boardId),
    academicYearId: Number(form.yearId),
    academicLevelId: Number(level.id),
    isActive: true,
  });
  const [active, setActive] = useState("");
  const options = groups.data
    .filter((g) => g.isActive !== false && id(g.boardId) === form.boardId)
    .map((g) => ({ id: id(g.groupId ?? g.id), name: g.groupName ?? g.name }));
  const current = options.find((g) => g.id === active) ?? options[0];
  return (
    <section className="ec-scope-panel">
      <h3>{level.name}</h3>
      <LookupState lookup={groups} noun="groups" />
      <div className="ec-pills">
        {options.map((g) => (
          <button
            type="button"
            key={g.id}
            aria-pressed={current?.id === g.id}
            onClick={() => setActive(g.id)}
          >
            {g.name} · {form.groupProgramSelections[g.id]?.length || 0} programs
          </button>
        ))}
      </div>
      {current && (
        <GroupPrograms
          key={current.id}
          group={current}
          selected={form.groupProgramSelections[current.id] || []}
          onChange={(selection, labels) => updatePrograms(current, level, selection, labels)}
        />
      )}
    </section>
  );
}
function SubjectScope({ form, lid, gid, update, patterns }) {
  const lookup = useLookup(apiEndpoints.subjects.context, {
    boardId: Number(form.boardId),
    groupId: Number(gid),
    academicLevelId: Number(lid),
  });
  const objective = strategy(form) === "PATTERN_WISE",
    key = `${lid}:${gid}`;
  const subjects = lookup.data
    .map(normalizeSubject)
    .filter((s, index, all) => s.id && all.findIndex((other) => other.id === s.id) === index)
    .filter((s) =>
      isEligibleSubject(
        s,
        { boardId: form.boardId, groupId: gid, academicLevelId: lid },
        objective,
      ),
    );
  const selected = form.groupSubjectSelections[key] || [];
  const setSelected = (selection) =>
    update((previous) => {
      const mapping = { ...previous.groupSubjectSelections, [key]: ids(selection) };
      return {
        ...previous,
        groupSubjectSelections: mapping,
        selectedSubjectIds: ids(Object.values(mapping).flat()),
        subjectLabels: {
          ...previous.subjectLabels,
          ...Object.fromEntries(subjects.map((s) => [s.id, s.name])),
        },
      };
    });
  return (
    <details className="ec-scope-panel" open>
      <summary>
        {form.levelLabels[lid] || `Level ${lid}`} · {form.groupLabels[gid] || `Group ${gid}`}
      </summary>
      <p className="ec-muted">
        Programs:{" "}
        {(form.groupProgramSelections[gid] || [])
          .map((pid) => form.programLabels[pid] || `Program ${pid}`)
          .join(", ")}
      </p>
      {objective && (
        <ExamField
          label="Objective pattern"
          value={form.selectedGroupPatterns[gid]?.[0] || ""}
          options={patterns}
          onChange={(value) =>
            update((previous) => ({
              ...previous,
              selectedGroupPatterns: {
                ...previous.selectedGroupPatterns,
                [gid]: value ? [value] : [],
              },
              examPattern: value,
            }))
          }
        />
      )}
      <LookupState lookup={lookup} noun="subjects" />
      <div className="ec-actions">
        <button
          type="button"
          className="cms-btn cms-btn-ghost"
          disabled={lookup.status !== "loaded"}
          onClick={() => setSelected(subjects.map((s) => s.id))}
        >
          {objective ? "Include all non-language subjects" : "Select all in this scope"}
        </button>
        {!objective && (
          <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setSelected([])}>
            Clear this scope
          </button>
        )}
      </div>
      <div className="ec-choices">
        {subjects.map((s) => (
          <label key={s.id}>
            <input
              type="checkbox"
              checked={selected.includes(s.id)}
              disabled={objective}
              onChange={() =>
                setSelected(
                  selected.includes(s.id)
                    ? selected.filter((v) => v !== s.id)
                    : [...selected, s.id],
                )
              }
            />
            {s.name}
          </label>
        ))}
      </div>
      {objective &&
        lookup.status === "loaded" &&
        !same(
          selected,
          subjects.map((s) => s.id),
        ) && (
          <p className="ec-notice">Include the exact non-language subjects above before review.</p>
        )}
    </details>
  );
}
export default function ExamFormWizard({ context, onClose, onSaved, onBusyChange }) {
  const [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [accepted, setAccepted] = useState("");
  const submissionInProgressRef = useRef(false);
  const [form, setForm] = useState({
    name: "",
    boardId: id(context.selectedBoardId),
    yearId: id(context.selectedAcademicYearId),
    examCategory: "",
    scheduleMode: "",
    examType: "",
    assessmentTypeId: "",
    examPattern: "",
    startDate: "",
    endDate: "",
    description: "",
    status: "DRAFT",
    levelIds: [],
    groupIds: [],
    programIds: [],
    programLabels: {},
    groupProgramSelections: {},
    groupSubjectSelections: {},
    selectedGroupPatterns: {},
    selectedSubjectIds: [],
    levelLabels: {},
    groupLabels: {},
    subjectLabels: {},
  });
  const [confirmed, setConfirmed] = useState(false);
  const levels = useLookup(
    apiEndpoints.boards.academicLevels,
    { boardId: Number(form.boardId) },
    step >= 1 && Boolean(form.boardId),
  );
  const types = useLookup(apiEndpoints.examinations.types);
  const patterns = useLookup(apiEndpoints.examinations.patterns, {}, step >= 2);
  const levelOptions = levels.data.map((l) => ({
    id: id(l.academicLevelId ?? l.id),
    name: l.levelName ?? l.academicLevelName ?? l.name,
  }));
  const patternOptions = patterns.data.map((p) => ({ id: p.patternName, name: p.patternName }));
  const change = (key, value) => {
    setError("");
    setConfirmed(false);
    setForm((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "examCategory"
        ? {
            scheduleMode: value === "Objective" ? "PATTERN_WISE" : "SUBJECT_WISE",
            groupSubjectSelections: {},
            selectedSubjectIds: [],
            selectedGroupPatterns: {},
            examPattern: "",
            ...(value === "Objective" ? { endDate: previous.startDate } : {}),
          }
        : {}),
      ...(key === "startDate" && previous.examCategory === "Objective" ? { endDate: value } : {}),
    }));
  };
  const updatePrograms = (group, level, selections, labels) =>
    setForm((previous) => {
      const mapping = { ...previous.groupProgramSelections, [group.id]: ids(selections) };
      if (!selections.length) delete mapping[group.id];
      const subjectMapping = Object.fromEntries(
        Object.entries(previous.groupSubjectSelections).filter(
          ([key]) => !key.endsWith(`:${group.id}`),
        ),
      );
      const groupPatterns = { ...previous.selectedGroupPatterns };
      delete groupPatterns[group.id];
      return {
        ...previous,
        groupProgramSelections: mapping,
        groupIds: ids(Object.keys(mapping)),
        programIds: ids(Object.values(mapping).flat()),
        programLabels: { ...previous.programLabels, ...labels },
        groupSubjectSelections: subjectMapping,
        selectedSubjectIds: ids(Object.values(subjectMapping).flat()),
        selectedGroupPatterns: groupPatterns,
        groupLabels: { ...previous.groupLabels, [group.id]: group.name },
        levelLabels: { ...previous.levelLabels, [level.id]: level.name },
      };
    });
  const validateStep = () => {
    if (
      step === 0 &&
      (!form.name.trim() ||
        !strategy(form) ||
        !form.assessmentTypeId ||
        !form.startDate ||
        !form.endDate ||
        form.endDate < form.startDate ||
        !form.boardId ||
        !form.yearId)
    )
      return "Complete exam name, category, type and a valid date range using the active academic context.";
    if (step === 1 && (!form.levelIds.length || !form.groupIds.length))
      return "Select academic levels and explicit programs for at least one group.";
    if (
      step === 2 &&
      (!form.examPattern ||
        form.levelIds.some((lid) =>
          form.groupIds.some((gid) => !form.groupSubjectSelections[`${lid}:${gid}`]?.length),
        ) ||
        (strategy(form) === "PATTERN_WISE" &&
          form.groupIds.some((gid) => form.selectedGroupPatterns[gid]?.length !== 1)))
    )
      return "Configure subjects for each level/group and one pattern per Objective group.";
    return "";
  };
  const next = () => {
    const issue = validateStep();
    if (issue) setError(issue);
    else {
      setError("");
      setStep(step + 1);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (step !== 3) {
      next();
      return;
    }
    if (submissionInProgressRef.current || accepted) return;
    if (!confirmed) return setError("Confirm the reviewed configuration before creating.");
    const blockers = creationBlockers(form);
    if (blockers.length) return setError(blockers.join(" "));
    submissionInProgressRef.current = true;
    onBusyChange?.(true);
    setBusy(true);
    setError("");
    try {
      const result = await saveExam(form, null, setAccepted);
      await onSaved(result.exam);
      if (result.issues.length)
        setError(
          `BACKEND CONTRACT BLOCKER — Draft ${result.exam.code || result.exam.id} exists, but scheduling remains disabled: ${result.issues.join(" ")} No local copy is used as persisted configuration.`,
        );
      else onClose();
    } catch (failure) {
      setError(getApiErrorMessage(failure));
    } finally {
      submissionInProgressRef.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  };
  return (
    <section className="cms-card ec-wizard">
      <div className="ec-card-heading">
        <div>
          <h2>Create examination</h2>
          <p>
            {context.selectedBoard?.name} · {context.selectedAcademicYear?.name}
          </p>
        </div>
        <button type="button" className="cms-btn cms-btn-ghost" disabled={busy} onClick={onClose}>
          Back to Exams
        </button>
      </div>
      <ol className="ec-stepper">
        {["Exam information", "Academic scope", "Subjects / patterns", "Review & create"].map(
          (name, index) => (
            <li key={name} aria-current={step === index ? "step" : undefined}>
              <span>{index + 1}</span>
              {name}
            </li>
          ),
        )}
      </ol>
      <form onSubmit={submit}>
        <fieldset disabled={busy || Boolean(accepted)}>
          {step === 0 && (
            <div className="ec-grid">
              <ExamField
                label="Board"
                value={context.selectedBoard?.name || "Select in navbar"}
                readOnly
              />
              <ExamField
                label="Academic year"
                value={context.selectedAcademicYear?.name || "Select in navbar"}
                readOnly
              />
              <ExamField
                label="Exam name"
                value={form.name}
                onChange={(value) => change("name", value)}
                maxLength={150}
              />
              <ExamField
                label="Exam category"
                value={form.examCategory}
                options={[
                  { id: "Regular", name: "Regular — subject wise" },
                  { id: "Objective", name: "Objective — pattern wise" },
                ]}
                onChange={(value) => change("examCategory", value)}
              />
              <div>
                <ExamField
                  label="Exam type"
                  value={form.assessmentTypeId}
                  options={types.data.map((t) => ({
                    id: String(t.assessmentTypeId ?? t.examTypeId),
                    name: t.name ?? t.examType,
                  }))}
                  onChange={(value) => {
                    change("assessmentTypeId", value);
                    change(
                      "examType",
                      types.data.find((t) => String(t.assessmentTypeId ?? t.examTypeId) === value)
                        ?.name || "",
                    );
                  }}
                />
                <LookupState lookup={types} noun="exam types" />
              </div>
              <ExamField
                label="Start date"
                type="date"
                value={form.startDate}
                onChange={(value) => change("startDate", value)}
              />
              <ExamField
                label="End date"
                type="date"
                value={form.endDate}
                min={form.startDate}
                readOnly={form.examCategory === "Objective"}
                onChange={(value) => change("endDate", value)}
              />
              <ExamField
                label="Description"
                type="textarea"
                value={form.description}
                maxLength={500}
                onChange={(value) => change("description", value)}
              />
            </div>
          )}
          {step === 1 && (
            <>
              <LookupState lookup={levels} noun="academic levels" />
              <div className="ec-choices">
                {levelOptions.map((level) => (
                  <label key={level.id}>
                    <input
                      type="checkbox"
                      checked={form.levelIds.includes(level.id)}
                      onChange={() => {
                        change(
                          "levelIds",
                          form.levelIds.includes(level.id)
                            ? form.levelIds.filter((lid) => lid !== level.id)
                            : [...form.levelIds, level.id],
                        );
                        setForm((previous) => ({
                          ...previous,
                          groupSubjectSelections: {},
                          selectedSubjectIds: [],
                          levelLabels: { ...previous.levelLabels, [level.id]: level.name },
                        }));
                      }}
                    />
                    {level.name}
                  </label>
                ))}
              </div>
              {levelOptions
                .filter((level) => form.levelIds.includes(level.id))
                .map((level) => (
                  <LevelGroups
                    key={level.id}
                    level={level}
                    form={form}
                    updatePrograms={updatePrograms}
                  />
                ))}
              <p className="ec-muted">
                Programs are selected per group. Switching panels preserves your choices.
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <LookupState lookup={patterns} noun="patterns" />
              {form.examCategory === "Regular" && (
                <ExamField
                  label="Exam pattern"
                  value={form.examPattern}
                  options={patternOptions}
                  onChange={(value) => change("examPattern", value)}
                />
              )}
              {form.levelIds.flatMap((lid) =>
                form.groupIds.map((gid) => (
                  <SubjectScope
                    key={`${lid}:${gid}`}
                    form={form}
                    lid={lid}
                    gid={gid}
                    update={setForm}
                    patterns={patternOptions}
                  />
                )),
              )}
            </>
          )}
          {step === 3 && (
            <>
              <h3>{form.name}</h3>
              <p>
                {form.examCategory} · {form.examType} · {form.startDate} — {form.endDate}
              </p>
              {form.groupIds.map((gid) => (
                <section className="ec-scope-panel" key={gid}>
                  <h3>{form.groupLabels[gid] || `Group ${gid}`}</h3>
                  <p>
                    Programs:{" "}
                    {form.groupProgramSelections[gid]
                      .map((pid) => form.programLabels[pid] || `Program ${pid}`)
                      .join(", ")}
                  </p>
                  {form.levelIds.map((lid) => (
                    <p key={lid}>
                      {form.levelLabels[lid] || `Level ${lid}`}:{" "}
                      {(form.groupSubjectSelections[`${lid}:${gid}`] || [])
                        .map((sid) => form.subjectLabels[sid] || `Subject ${sid}`)
                        .join(", ")}
                    </p>
                  ))}
                  {form.examCategory === "Objective" && (
                    <p>Pattern: {form.selectedGroupPatterns[gid]?.join(", ")}</p>
                  )}
                </section>
              ))}
              <div className="ec-notice" role="note">
                <strong>Backend contract limitation</strong>
                <p>
                  {creationBlockers(form).join(" ") ||
                    "The current API can create this basic draft but does not return the category or selected subject configuration. Scheduling will stay unavailable unless the saved configuration can be verified. Do not use this draft as a finalized examination."}
                </p>
              </div>
              <label className="ec-check">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I have reviewed the configuration and understand the persistence limitation.
              </label>
            </>
          )}
        </fieldset>
        {error && (
          <div className="ec-notice ec-error" role="alert">
            {error}
          </div>
        )}
        <div className="ec-actions ec-footer">
          {step > 0 && !accepted && (
            <button
              type="button"
              className="cms-btn cms-btn-ghost"
              disabled={busy}
              onClick={() => {
                setError("");
                setStep(step - 1);
              }}
            >
              Previous
            </button>
          )}
          {accepted ? (
            <button
              type="button"
              className="cms-btn cms-btn-primary"
              disabled={busy}
              onClick={onClose}
            >
              Return to Exams
            </button>
          ) : (
            <button
              type="submit"
              className="cms-btn cms-btn-primary"
              disabled={busy || (step === 3 && (!confirmed || creationBlockers(form).length > 0))}
            >
              {busy ? "Saving and verifying…" : step === 3 ? "Create draft & verify" : "Continue"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
