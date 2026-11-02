import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Pencil, Search, Users } from "lucide-react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { ConfirmDialog, Modal, SkeletonTable, StatusBadge, Toast } from "@/shared/components/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { fetchAdminGroups, fetchAdminLevels } from "@/api/studentApi.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { generateNextNumber } from "@/api/numberSeriesApi.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import "./SectionAllocationPage.css";

const list = (value) => {
  let source = value;
  for (let depth = 0; depth < 5 && source; depth += 1) {
    if (Array.isArray(source)) return source;
    const rows = [source.items, source.Items, source.groups, source.Groups, source.programs, source.Programs,
      source.sections, source.Sections, source.students, source.Students, source.admissions, source.Admissions,
      source.academicLevels, source.AcademicLevels, source.$values].find(Array.isArray);
    if (rows) return rows;
    source = source.data ?? source.Data ?? source.result ?? source.Result;
  }
  return [];
};
const body = (response) => response?.data?.data ?? response?.data?.Data ?? response?.data ?? {};
const get = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null);
const number = (value) => Number(value ?? 0);
const filled = (value) => {
  if (!["string", "number"].includes(typeof value)) return false;
  const normalized = String(value).trim().toLowerCase();
  return Boolean(normalized) && !/^0+$/.test(normalized)
    && !["—", "–", "-", "n/a", "null", "undefined", "not assigned", "unassigned", "unallocated", "pending"].includes(normalized);
};
const positiveId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const flagIsTrue = (value) => value === true || value === 1 || ["true", "1"].includes(String(value ?? "").trim().toLowerCase());
const flagIsFalse = (value) => value === false || value === 0 || ["false", "0"].includes(String(value ?? "").trim().toLowerCase());
const isEligibleAdmission = (admission) => {
  const status = String(get(admission, "status", "Status", "admissionStatus", "AdmissionStatus") ?? "").trim().toLowerCase();
  return flagIsTrue(get(admission, "isApproved", "IsApproved"))
    && flagIsTrue(get(admission, "isVerified", "IsVerified"))
    && !flagIsTrue(get(admission, "isRejected", "IsRejected"))
    && !flagIsFalse(get(admission, "isActive", "IsActive"))
    && (!status || status === "approved");
};
const admissionKey = (row) => String(get(row, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "").trim().toLowerCase();
const recentAdmissionsFirst = (rows) => {
  const timestamp = (student) => {
    const admissionDate = get(student, "admissionDate", "AdmissionDate");
    if (!admissionDate) return -Infinity;
    const parsed = new Date(admissionDate).getTime();
    return Number.isFinite(parsed) ? parsed : -Infinity;
  };
  return [...rows].sort((a, b) => {
    const first = timestamp(a), second = timestamp(b);
    return first === second ? 0 : first > second ? -1 : 1;
  });
};
const sectionId = (row) => get(row, "sectionId", "SectionId", "id", "Id");
const studentId = (row) => get(row, "studentId", "StudentId", "id", "Id");
const loadAllocationRecords = async (endpoint, scope, { signal } = {}) => {
  const pageSize = 100;
  const records = [];
  let previousPage = "";
  for (let pageNumber = 1; ; pageNumber += 1) {
    const response = await apiClient.get(endpoint, { params: { ...scope, pageNumber, pageSize }, signal });
    const payload = body(response);
    const pageRecords = list(payload);
    const fingerprint = JSON.stringify(pageRecords.map((record) => get(record, "studentId", "StudentId", "admissionId", "AdmissionId", "id", "Id") ?? admissionKey(record)));
    if (pageRecords.length && previousPage === fingerprint) throw new Error("The server repeated an allocation page. Refresh and try again.");
    previousPage = fingerprint;
    records.push(...pageRecords);
    const totalCount = get(response.data, "totalCount", "TotalCount") ?? get(response.data?.data, "totalCount", "TotalCount") ?? get(payload, "totalCount", "TotalCount");
    if (!pageRecords.length || (totalCount != null ? records.length >= Number(totalCount) : Array.isArray(response.data) || pageRecords.length < pageSize)) break;
    if (pageNumber >= 100) throw new Error("Unable to verify the complete allocation student list.");
  }
  return { data: records };
};
const loadAllocationStudentRecords = (scope, options) => loadAllocationRecords(apiEndpoints.students.getAll, scope, options);
const sectionValue = (row) => get(row, "sectionId", "SectionId", "existingSectionId", "ExistingSectionId", "allocatedSectionId", "AllocatedSectionId");
const sectionName = (row) => get(row, "sectionName", "SectionName", "existingSectionName", "ExistingSectionName", "allocatedSectionName", "AllocatedSectionName");
const capacity = (row) => get(row, "maximumStrength", "MaximumStrength", "totalCapacity", "TotalCapacity", "capacity", "Capacity");
const count = (row) => get(row, "allocatedCount", "AllocatedCount", "alreadyAllocated", "AlreadyAllocated", "currentAllocatedCount", "CurrentAllocatedCount");
const date = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";
const matches = (row, context) => ["campusId", "boardId", "academicYearId", "academicLevelId", "groupId", "programId"].every((key) => { const actual = get(row, key, key[0].toUpperCase() + key.slice(1)); return actual == null || String(actual) === String(context[key]); });
const mapStudent = (admission = {}, record = {}) => ({
  id: studentId(record),
  admissionNo: get(record, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? get(admission, "admissionNo", "AdmissionNo") ?? "—",
  name: get(record, "studentName", "StudentName", "name", "Name") ?? [get(admission, "firstName", "FirstName"), get(admission, "lastName", "LastName")].filter(Boolean).join(" "),
  admissionDate: get(record, "admissionDate", "AdmissionDate") ?? get(admission, "admissionDate", "AdmissionDate"),
  ...Object.fromEntries(["campusId", "boardId", "academicYearId", "academicLevelId", "groupId", "programId"].map((key) => {
    const pascalKey = key[0].toUpperCase() + key.slice(1);
    return [key, get(record, key, pascalKey) ?? get(admission, key, pascalKey)];
  })),
  sectionId: sectionValue(record),
  sectionName: sectionName(record) ?? sectionName(admission),
  rollNo: get(record, "rollNo", "RollNo", "rollNumber", "RollNumber"),
});
const eligibleAllocationStudents = (admissions, records, scope) => {
  const byAdmission = new Map();
  admissions.filter((admission) => matches(admission, scope)).forEach((admission) => {
    const key = admissionKey(admission);
    if (key) byAdmission.set(key, byAdmission.has(key) ? null : admission);
  });
  return records.filter((record) => positiveId(studentId(record)) && matches(record, scope))
    .flatMap((record) => {
      const admission = byAdmission.get(admissionKey(record));
      return admission && isEligibleAdmission(admission) ? [mapStudent(admission, record)] : [];
    });
};
const loadAllocationWorkflow = async (scope, options) => {
  const [admissionsResponse, studentsResponse] = await Promise.all([
    loadAllocationRecords(apiEndpoints.admissions.getAll, scope, options),
    loadAllocationStudentRecords(scope, options),
  ]);
  const records = list(body(studentsResponse)).filter((record) => matches(record, scope));
  return { records, students: eligibleAllocationStudents(list(body(admissionsResponse)), records, scope) };
};
const requireEligibleStudents = (rows, eligibleStudents, scope) => {
  const eligibleById = new Map(eligibleStudents.map((student) => [String(student.id), student]));
  const seen = new Set();
  return rows.map((row) => {
    const id = String(studentId(row));
    const student = eligibleById.get(id);
    if (!positiveId(id) || seen.has(id) || !student || !matches(row, scope)
      || (admissionKey(row) && admissionKey(row) !== admissionKey(student))) {
      throw new Error("Admission eligibility changed or could not be verified. Refresh the allocation preview.");
    }
    seen.add(id);
    return student;
  });
};
const createEligibleSectionPreview = (eligibleStudents, sections) => {
  const pending = eligibleStudents.filter((student) => !positiveId(student.sectionId)).sort((left, right) => {
    const first = Date.parse(left.admissionDate) || 0, second = Date.parse(right.admissionDate) || 0;
    return first - second || number(left.id) - number(right.id);
  });
  const targets = sections.filter((section) => positiveId(section.id)).map((section) => ({ ...section }))
    .sort((left, right) => String(sectionName(left) ?? "").localeCompare(String(sectionName(right) ?? "")) || number(left.id) - number(right.id));
  const rows = pending.map((student) => {
    const target = targets.find((section) => section.allocated < section.maximum);
    if (!target) throw new Error("Section capacity is not sufficient for all approved and verified students.");
    target.allocated += 1;
    return { studentId: student.id, admissionNo: student.admissionNo, studentName: student.name,
      admissionDate: student.admissionDate, sectionId: target.id, sectionName: sectionName(target) };
  });
  return { students: rows, studentsToAllocate: rows.length, totalStudents: eligibleStudents.length,
    totalCapacity: sections.reduce((sum, section) => sum + section.maximum, 0) };
};
const validateSectionPlans = (rows, eligibleStudents, sections, scope) => {
  const students = requireEligibleStudents(rows, eligibleStudents, scope);
  const targets = new Map(sections.map((section) => [String(section.id), { ...section }]));
  rows.forEach((row, index) => {
    const target = targets.get(String(sectionValue(row)));
    if (positiveId(students[index].sectionId)) throw new Error("A previewed student already has a section. Refresh the allocation preview.");
    if (!target || !matches(target, scope) || !positiveId(target.id)) throw new Error("The proposed section is no longer available for this academic context.");
    if (target.allocated >= target.maximum) throw new Error("A proposed section has reached its maximum strength. Refresh the allocation preview.");
    target.allocated += 1;
  });
  return students;
};

export default function SectionAllocationPage() {
  const { selectedBoardId, selectedAcademicYear, selectedAcademicYearId, academicYearsLoading } = useAcademicContext();
  const { selectedCampusId, selectedCampus } = useCampusContext();
  const [filters, setFilters] = useState({ academicLevelId: "", groupId: "", programId: "", sectionId: "" });
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState("");
  const [masters, setMasters] = useState({ levels: [], groups: [], programs: [], sections: [] });
  const [students, setStudents] = useState([]); const [sectionCounts, setSectionCounts] = useState({}); const [sectionStudents, setSectionStudents] = useState([]);
  const [loading, setLoading] = useState(true); const [studentLoading, setStudentLoading] = useState(false); const [busy, setBusy] = useState(""); const [confirming, setConfirming] = useState("");
  const [preview, setPreview] = useState(null); const [search, setSearch] = useState(""); const [editing, setEditing] = useState(null); const [refresh, setRefresh] = useState(0); const [toast, setToast] = useState({ message: "", type: "success" });
  const [rollPreview, setRollPreview] = useState(null);
  const generatedRolls = useRef(new Map());
  const workflowRequestRef = useRef(0);
  const currentScopeRef = useRef("");
  useEffect(() => { setPreview(null); setRollPreview(null); setConfirming(""); setEditing(null); }, [selectedCampusId, selectedBoardId, selectedAcademicYearId, filters.academicLevelId, filters.groupId, filters.programId, filters.sectionId]);
  const [allocatedPage, setAllocatedPage] = useState(1);
  const [rollPage, setRollPage] = useState(1);
  const location = useLocation(); const navigate = useNavigate();
  const activeTab = location.pathname.endsWith("/allocated") ? "allocated" : location.pathname.endsWith("/roll-numbers") ? "roll" : "allocation";
  const hasSectionFilter = activeTab !== "allocation";
  const readyContext = !groupsLoading && masters.groups.some((group) => String(get(group, "groupId", "GroupId")) === String(filters.groupId)) && Boolean(selectedCampusId && selectedBoardId && selectedAcademicYearId && filters.academicLevelId && filters.groupId && filters.programId);
  const readySection = readyContext && Boolean(filters.sectionId);
  const context = useMemo(() => ({ campusId: number(selectedCampusId), academicYearId: number(selectedAcademicYearId), academicLevelId: number(filters.academicLevelId), groupId: number(filters.groupId), programId: number(filters.programId) }), [selectedCampusId, selectedAcademicYearId, filters]);
  const scopeContext = useMemo(() => ({ ...context, campusId: number(selectedCampusId), boardId: number(selectedBoardId) }), [context, selectedCampusId, selectedBoardId]);
  const scopeToken = JSON.stringify({ ...scopeContext, sectionId: filters.sectionId });
  currentScopeRef.current = scopeToken;
  useEffect(() => {
    currentScopeRef.current = scopeToken;
    return () => { if (currentScopeRef.current === scopeToken) currentScopeRef.current = ""; };
  }, [scopeToken]);
  const assertCurrentScope = useCallback((expectedScope) => {
    if (currentScopeRef.current !== expectedScope) throw new Error("The academic selection changed. Review the allocation again.");
  }, []);
  const say = useCallback((reason) => setToast({ message: typeof reason === "string" ? reason : getApiErrorMessage(reason), type: "error" }), []);
  const update = (key, value) => { setFilters((current) => ({ ...current, [key]: value, ...(key === "academicLevelId" && !value ? { groupId: "", programId: "", sectionId: "" } : {}), ...(key === "groupId" ? { programId: "", sectionId: "" } : {}), ...(key === "programId" ? { sectionId: "" } : {}) })); if (["academicLevelId", "groupId", "programId"].includes(key)) setPreview(null); setStudents([]); setSectionStudents([]); setSearch(""); };

  useEffect(() => { setFilters({ academicLevelId: "", groupId: "", programId: "", sectionId: "" }); setPreview(null); setStudents([]); setSectionStudents([]); setMasters({ levels: [], groups: [], programs: [], sections: [] }); if (!selectedBoardId) return undefined; let active = true; setLoading(true); fetchAdminLevels({ boardId: selectedBoardId, academicYearId: selectedAcademicYearId }).then((levels) => active && setMasters({ levels, groups: [], programs: [], sections: [] })).catch(say).finally(() => active && setLoading(false)); return () => { active = false; }; }, [selectedCampusId, selectedBoardId, selectedAcademicYearId, say]);
  useEffect(() => { setFilters({ academicLevelId: "", groupId: "", programId: "", sectionId: "" }); setPreview(null); setStudents([]); }, [selectedAcademicYearId]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const enabled = Boolean(selectedBoardId && selectedAcademicYearId && filters.academicLevelId);
    setMasters((current) => ({ ...current, groups: [] }));
    setGroupsLoading(enabled); setGroupsError("");
    if (!enabled) return () => controller.abort();
    fetchAdminGroups({ boardId: selectedBoardId, academicYearId: selectedAcademicYearId, academicLevelId: filters.academicLevelId, campusId: selectedCampusId }, { signal: controller.signal }).then((groups) => {
      if (!active) return;
      setMasters((current) => ({ ...current, groups }));
      setFilters((current) => current.groupId && !groups.some((group) => String(get(group, "groupId", "GroupId")) === String(current.groupId))
        ? { ...current, groupId: "", programId: "", sectionId: "" } : current);
      if (!groups.length) setGroupsError("No active groups are available for this board and academic year.");
    }).catch((error) => { if (active) setGroupsError(getApiErrorMessage(error)); })
      .finally(() => { if (active) setGroupsLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [filters.academicLevelId, selectedCampusId, selectedBoardId, selectedAcademicYearId]);
  useEffect(() => { if (!filters.groupId) return undefined; let active = true; apiClient.get(apiEndpoints.groups.programs(filters.groupId)).then((response) => active && setMasters((current) => ({ ...current, programs: list(body(response)), sections: [] }))).catch((error) => { if (active) say(error); }); return () => { active = false; }; }, [filters.groupId, say]);
  useEffect(() => { if (!readyContext) return undefined; let active = true; apiClient.get(apiEndpoints.sections.list, { params: { ...scopeContext, ProgramId: context.programId, IsActive: true, pageSize: 1000 } }).then((response) => {
    if (!active || response.data?.success === false) return;
    const sections = list(body(response)).filter((section) => matches(section, scopeContext));
    setMasters((current) => ({ ...current, sections }));
    setFilters((current) => current.sectionId && !sections.some((section) => String(sectionId(section)) === String(current.sectionId)) ? { ...current, sectionId: "" } : current);
  }).catch((error) => { if (active) say(error); }); return () => { active = false; }; }, [context.programId, scopeContext, readyContext, refresh, say]);
  const loadStudents = useCallback(async ({ signal } = {}) => {
    const requestId = ++workflowRequestRef.current;
    if (!readyContext) { setStudents([]); setStudentLoading(false); return; }
    setStudents([]);
    setStudentLoading(true);
    try {
      const workflow = await loadAllocationWorkflow(scopeContext, { signal });
      if (!signal?.aborted && requestId === workflowRequestRef.current && currentScopeRef.current === scopeToken) setStudents(workflow.students);
    } catch (error) {
      if (!signal?.aborted && requestId === workflowRequestRef.current && currentScopeRef.current === scopeToken) say(error);
    } finally {
      if (!signal?.aborted && requestId === workflowRequestRef.current) setStudentLoading(false);
    }
  }, [readyContext, say, scopeContext, scopeToken]);
  useEffect(() => { const controller = new AbortController(); loadStudents({ signal: controller.signal }); return () => { controller.abort(); workflowRequestRef.current += 1; }; }, [loadStudents]);
  useEffect(() => {
    if (!readyContext || !masters.sections.length) return setSectionCounts({});
    const counts = Object.fromEntries(
      masters.sections.map((section) => [
        String(sectionId(section)),
        Number(section.enrolledCount ?? section.currentStrength ?? count(section) ?? 0)
      ])
    );
    setSectionCounts(counts);
  }, [masters.sections, readyContext, refresh]);
  useEffect(() => { setSectionStudents([]); if (!readySection) return undefined; let active = true; apiClient.get(apiEndpoints.students.getBySection(filters.sectionId)).then((response) => active && setSectionStudents(list(body(response)))).catch((error) => { if (active) say(error); }); return () => { active = false; }; }, [filters.sectionId, readySection, refresh, say, scopeToken]);

  const sections = useMemo(() => masters.sections.map((section) => { const id = sectionId(section); const maximum = number(capacity(section)); const allocated = sectionCounts[String(id)] ?? number(count(section)); return { ...section, id, maximum, allocated, available: Math.max(0, maximum - allocated) }; }), [masters.sections, sectionCounts]);
  const eligibleIds = useMemo(() => new Set(students.map((student) => String(student.id))), [students]);
  const unallocated = recentAdmissionsFirst(students.filter((student) => !positiveId(student.sectionId))); const selectedSection = sections.find((section) => String(section.id) === String(filters.sectionId));
  const allocatedRows = useMemo(() => sectionStudents.filter((record) => {
    const student = students.find((entry) => String(entry.id) === String(studentId(record)));
    return eligibleIds.has(String(studentId(record))) && matches(record, scopeContext)
      && positiveId(sectionValue(record)) && positiveId(student?.sectionId)
      && String(sectionValue(record)) === String(student.sectionId)
      && String(sectionValue(record)) === String(filters.sectionId);
  }).map((record) => {
    const contextStudent = students.find((student) => String(student.id) === String(studentId(record))) ?? {};
    return { ...mapStudent(contextStudent, record), sectionName: sectionName(record) ?? get(selectedSection, "sectionName", "SectionName") };
  }), [eligibleIds, filters.sectionId, scopeContext, sectionStudents, selectedSection, students]);
  const visibleAllocated = useMemo(() => { const query = search.trim().toLowerCase(); return recentAdmissionsFirst(query ? allocatedRows.filter((student) => `${student.name} ${student.admissionNo} ${student.rollNo}`.toLowerCase().includes(query)) : allocatedRows); }, [allocatedRows, search]);
  const allocatedPageSize = 5;
  const allocatedTotalPages = Math.max(1, Math.ceil(visibleAllocated.length / allocatedPageSize));
  const currentAllocatedPage = Math.min(allocatedPage, allocatedTotalPages);
  const paginatedAllocated = visibleAllocated.slice((currentAllocatedPage - 1) * allocatedPageSize, currentAllocatedPage * allocatedPageSize);
  const rollTotalPages = Math.max(1, Math.ceil(visibleAllocated.length / allocatedPageSize));
  const currentRollPage = Math.min(rollPage, rollTotalPages);
  const paginatedRollRows = visibleAllocated.slice((currentRollPage - 1) * allocatedPageSize, currentRollPage * allocatedPageSize);
  useEffect(() => { setAllocatedPage(1); setRollPage(1); }, [search, filters.academicLevelId, filters.groupId, filters.programId, filters.sectionId, selectedCampusId, selectedBoardId, selectedAcademicYearId]);
  const previewRows = list(preview?.students); const totalAvailable = sections.reduce((sum, section) => sum + section.available, 0); const rollAssigned = allocatedRows.filter((student) => filled(student.rollNo)).length;
  const loadCurrentSections = async () => {
    const response = await apiClient.get(apiEndpoints.sections.list, { params: { ...scopeContext, ProgramId: scopeContext.programId, IsActive: true, pageSize: 1000 } });
    assertCurrentScope(scopeToken);
    const records = list(body(response)).filter((section) => positiveId(sectionId(section)) && matches(section, scopeContext)
      && !flagIsFalse(get(section, "isActive", "IsActive")));
    const currentSections = await Promise.all(records.map(async (section) => {
      const id = sectionId(section);
      // Capacity includes every physical occupant, including ineligible admissions.
      const occupants = list(body(await apiClient.get(apiEndpoints.students.getBySection(id))));
      const maximum = number(capacity(section));
      return { ...section, id, maximum: Number.isInteger(maximum) && maximum > 0 ? maximum : 0, allocated: occupants.length };
    }));
    assertCurrentScope(scopeToken);
    setMasters((current) => ({ ...current, sections: records }));
    setSectionCounts(Object.fromEntries(currentSections.map((section) => [String(section.id), section.allocated])));
    return currentSections;
  };
  const previewAllocation = async () => {
    if (!readyContext || busy) return;
    setBusy("section-preview");
    setPreview(null);
    try {
      const [workflow, currentSections] = await Promise.all([loadAllocationWorkflow(scopeContext), loadCurrentSections()]);
      assertCurrentScope(scopeToken);
      setStudents(workflow.students);
      // The context-only bulk API also allocates hidden, ineligible admissions.
      // Propose only the verified and approved students that this screen can save.
      setPreview(createEligibleSectionPreview(workflow.students, currentSections));
    } catch (error) { say(error); }
    finally { setBusy(""); }
  };
  const assignRollNumbers = async (records) => {
    const workflow = await loadAllocationWorkflow(scopeContext);
    assertCurrentScope(scopeToken);
    const verifiedStudents = requireEligibleStudents(records, workflow.students, scopeContext);
    verifiedStudents.forEach((student, index) => {
      if (!positiveId(student.sectionId) || String(student.sectionId) !== String(sectionValue(records[index]))) {
        throw new Error("Student section allocation changed. Review roll number generation again.");
      }
    });
    for (const student of verifiedStudents) {
      assertCurrentScope(scopeToken);
      const id = studentId(student);
      const existingRoll = get(student, "rollNo", "RollNo", "rollNumber", "RollNumber");
      if (filled(existingRoll)) continue;
      const targetSectionId = sectionValue(student);
      const contextPayload = Object.fromEntries(["campusId", "boardId", "academicYearId", "groupId", "programId"].map((key) => [key, number(get(student, key, key[0].toUpperCase() + key.slice(1)) ?? scopeContext[key])]));
      if (!filled(id) || !filled(targetSectionId) || Object.values(contextPayload).some((value) => !Number.isInteger(value) || value <= 0)) throw new Error("Student allocation and all five roll-number dependencies are required.");
      const cacheKey = JSON.stringify([id, contextPayload]);
      let rollNo = generatedRolls.current.get(cacheKey);
      if (!rollNo) {
        const campusCode = String(contextPayload.campusId) === String(selectedCampusId) ? get(selectedCampus, "campusCode", "code", "CampusCode", "Code") : undefined;
        const response = await generateNextNumber("ROLL_NO", contextPayload, contextPayload.campusId, campusCode);
        assertCurrentScope(scopeToken);
        const result = response?.data ?? response?.Data ?? response;
        rollNo = typeof result === "string" ? result : get(result, "generatedNumber", "GeneratedNumber");
        if (!filled(rollNo)) throw new Error("The number series API did not return a generated roll number.");
        generatedRolls.current.set(cacheKey, rollNo);
      }
      assertCurrentScope(scopeToken);
      await apiClient.put(apiEndpoints.sectionRollAllocation.updateStudent(id), { ...contextPayload, sectionId: number(targetSectionId), rollNo });
    }
  };
  const confirmSections = async () => {
    if (!readyContext || busy || !previewRows.length) return;
    setBusy("section-confirm");
    try {
      const [workflow, currentSections] = await Promise.all([loadAllocationWorkflow(scopeContext), loadCurrentSections()]);
      assertCurrentScope(scopeToken);
      validateSectionPlans(previewRows, workflow.students, currentSections, scopeContext);
      // Persist the reviewed IDs individually; bulk confirm reselects unrelated students.
      for (const row of previewRows) {
        assertCurrentScope(scopeToken);
        await apiClient.put(apiEndpoints.sectionRollAllocation.updateStudent(studentId(row)), {
          ...scopeContext, sectionId: number(sectionValue(row)),
        });
      }
      assertCurrentScope(scopeToken);
      setToast({ message: "Section allocation completed. Open the Roll Numbers tab to review and generate pending roll numbers.", type: "success" });
      setPreview(null); setConfirming(""); setRefresh((value) => value + 1); await loadStudents();
    } catch (error) {
      say(error); setPreview(null); setConfirming("");
      if (currentScopeRef.current === scopeToken) { setRefresh((value) => value + 1); await loadStudents(); }
    } finally { setBusy(""); }
  };
  const previewRolls = async () => {
    if (!readySection || busy) return;
    setBusy("roll-preview"); setRollPreview(null);
    try {
      const workflow = await loadAllocationWorkflow(scopeContext);
      assertCurrentScope(scopeToken);
      const eligible = workflow.students.filter((student) => positiveId(student.sectionId)
        && String(student.sectionId) === String(filters.sectionId) && !filled(student.rollNo));
      const rows = eligible.map((student) => ({ studentId: student.id, admissionNo: student.admissionNo,
        studentName: student.name, sectionId: student.sectionId, sectionName: student.sectionName
          || get(selectedSection, "sectionName", "SectionName"), rollNo: student.rollNo }));
      if (rows.length) {
        const response = await apiClient.get(apiEndpoints.numberSeries.preview("ROLL_NO"), {
          params: { ...Object.fromEntries(["campusId", "boardId", "academicYearId", "groupId", "programId"]
            .map((key) => [key, number(scopeContext[key])])),
          campusCode: get(selectedCampus, "campusCode", "code", "CampusCode", "Code") },
        });
        assertCurrentScope(scopeToken);
        const result = body(response);
        const nextRoll = typeof result === "string" ? result
          : get(result, "preview", "Preview", "livePreview", "LivePreview", "nextNumber", "NextNumber", "generatedNumber", "GeneratedNumber");
        if (!filled(nextRoll)) throw new Error("The number series API did not return a roll number preview.");
        const sequence = String(nextRoll).match(/^(.*?)(\d+)$/);
        if (rows.length > 1 && !sequence) throw new Error("The configured roll number format does not support a sequential preview.");
        rows.forEach((row, index) => {
          row.previewRollNo = index === 0 ? String(nextRoll)
            : sequence[1] + String(BigInt(sequence[2]) + BigInt(index)).padStart(sequence[2].length, "0");
        });
      }
      setStudents(workflow.students);
      setRollPreview({ students: rows, studentsToAllocate: rows.length, totalStudents: eligible.length });
      setConfirming("roll");
    } catch (error) { say(error); }
    finally { setBusy(""); }
  };
  const confirmRolls = async () => {
    if (!readySection || busy || !rollPreviewRows.length) return;
    setBusy("roll-confirm");
    try {
      await assignRollNumbers(rollPreviewRows);
      assertCurrentScope(scopeToken);
      setToast({ message: "Roll number allocation completed successfully.", type: "success" });
      setConfirming(""); setRefresh((value) => value + 1); await loadStudents();
    } catch (error) {
      say(error); setConfirming("");
      if (currentScopeRef.current === scopeToken) { setRefresh((value) => value + 1); await loadStudents(); }
    } finally { setBusy(""); }
  };
  const saveEdit = async () => {
    if (!editing || busy) return;
    setBusy("edit");
    try {
      const [workflow, currentSections] = await Promise.all([loadAllocationWorkflow(scopeContext), loadCurrentSections()]);
      assertCurrentScope(scopeToken);
      const [student] = requireEligibleStudents([editing], workflow.students, scopeContext);
      if (!positiveId(student.sectionId) || String(student.sectionId) !== String(editing.sectionId)) throw new Error("This student's section has changed. Refresh the allocated students list.");
      const destination = currentSections.find((section) => String(section.id) === String(editing.nextSectionId));
      if (!destination) throw new Error("The selected section is not available for this academic context.");
      if (destination.allocated >= destination.maximum && String(student.sectionId) !== String(destination.id)) throw new Error("The selected section has reached its maximum strength.");
      await apiClient.put(apiEndpoints.sectionRollAllocation.updateStudent(student.id), {
        ...scopeContext, sectionId: number(destination.id), ...(filled(student.rollNo) ? { rollNo: student.rollNo } : {}),
      });
      assertCurrentScope(scopeToken);
      setToast({ message: "Allocation updated successfully.", type: "success" }); setEditing(null);
      setRefresh((value) => value + 1); await loadStudents();
    } catch (error) { say(error); }
    finally { setBusy(""); }
  };
  const selectOptions = (items, ids, labels) => items.map((item) => <option key={get(item, ...ids)} value={get(item, ...ids)}>{get(item, ...labels) ?? "Unnamed"}</option>);
  const tabPath = (tab) => tab === "allocated" ? "/dashboard/section-allocation/allocated" : tab === "roll" ? "/dashboard/section-allocation/roll-numbers" : "/dashboard/section-allocation";
  const rollPreviewRows = list(get(rollPreview, "students", "Students") ?? rollPreview);
  const rollPreviewDialog = confirming === "roll" ? <Modal title="Review Roll Number Generation" onClose={() => !busy && setConfirming("")} footer={<>
    <button className="cms-btn cms-btn-ghost" disabled={Boolean(busy)} onClick={() => setConfirming("")}>Cancel</button>
    <button className="cms-btn cms-btn-primary" disabled={Boolean(busy) || !readySection || !rollPreviewRows.length} onClick={confirmRolls}>{busy === "roll-confirm" ? "Saving..." : "Generate Roll Numbers"}</button>
  </>}>
    <p>Review the proposed roll numbers below. Click Generate Roll Numbers to generate and save them. Preview numbers may change if another user generates numbers before you confirm. Existing roll numbers are kept.</p>
    <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Admission No</th><th>Student Name</th><th>Section</th><th>Roll Number</th></tr></thead><tbody>
      {rollPreviewRows.map((student) => <tr key={studentId(student)}><td>{get(student, "admissionNo", "AdmissionNo")}</td><td>{get(student, "studentName", "StudentName")}</td><td>{sectionName(student)}</td><td>{student.previewRollNo || get(student, "rollNo", "RollNo") || "—"}</td></tr>)}
      {!rollPreviewRows.length ? <tr><td colSpan={4}>No students returned for roll number generation.</td></tr> : null}
    </tbody></table></div>
  </Modal> : null;

  return <DashboardLayout title="Section Allocation" subtitle="Manage student section allocation and roll number assignment." breadcrumb={["People", "Section Allocation"]}><main className="allocation-page"><nav className="allocation-tabs" aria-label="Section allocation views">{[["allocation", "Section Allocation"], ["allocated", "Allocated Students"], ["roll", "Roll Numbers"]].map(([tab, label]) => <button key={tab} type="button" className={activeTab === tab ? "is-active" : ""} onClick={() => navigate(tabPath(tab))}>{label}</button>)}</nav><section className="cms-card allocation-workspace"><div className="cms-card-body"><div className={`allocation-filter-grid ${hasSectionFilter ? "has-section-filter" : ""}`}><div className="cms-field"><span>Academic Year</span><div className="allocation-year-value">{selectedAcademicYear?.name ?? selectedAcademicYear?.label ?? (academicYearsLoading ? "Loading academic year..." : "Select an Academic Year in the header")}</div></div><SelectField label="Academic Level" value={filters.academicLevelId} disabled={!selectedBoardId || !selectedAcademicYearId || loading} onChange={(value) => update("academicLevelId", value)}>{selectOptions(masters.levels, ["academicLevelId", "AcademicLevelId", "levelId", "LevelId"], ["academicLevelName", "AcademicLevelName", "levelName", "LevelName"])}</SelectField><SelectField label="Group" value={filters.groupId} disabled={!filters.academicLevelId || groupsLoading} error={groupsError} placeholder={groupsLoading ? "Loading groups..." : groupsError ? "Groups unavailable" : undefined} onChange={(value) => update("groupId", value)}>{selectOptions(masters.groups, ["groupId", "GroupId"], ["groupName", "GroupName"])}</SelectField><SelectField label="Program" value={filters.programId} disabled={!filters.groupId} onChange={(value) => update("programId", value)}>{selectOptions(masters.programs, ["programId", "ProgramId"], ["programName", "ProgramName"])}</SelectField>{hasSectionFilter ? <SelectField label="Section" value={filters.sectionId} disabled={!filters.programId} onChange={(value) => update("sectionId", value)}>{sections.map((section) => <option key={section.id} value={section.id}>{get(section, "sectionName", "SectionName")} ({section.allocated}/{section.maximum})</option>)}</SelectField> : null}</div></div>
    {activeTab === "allocation" ? <><CardHead title={`Students to Allocate (${unallocated.length})`} text="Approved and verified students waiting for a section assignment." icon={<Users size={20} />} />{studentLoading ? <SkeletonTable columns={6} rows={6} /> : <StudentTable students={unallocated} pending />} {readyContext ? <div className="allocation-section-capacities"><div className="allocation-section-capacities-head"><div><h3>Available Target Sections</h3><p>Current capacity for sections mapped to this program.</p></div><button className="cms-btn cms-btn-primary" disabled={Boolean(busy) || !unallocated.length || !sections.length} onClick={previewAllocation}>{busy === "section-preview" ? "Preparing..." : "Preview Section Allocation"}</button></div>{sections.length ? <div className="allocation-capacity-grid">{sections.map((section) => <div className="allocation-capacity-item" key={section.id}><strong>{get(section, "sectionName", "SectionName")}</strong><span>{section.allocated} / {section.maximum}</span><small>{section.available} Available</small></div>)}</div> : <div className="cms-empty">No sections are configured for this program.</div>}</div> : null}{readyContext && !studentLoading && !unallocated.length ? <div className="allocation-empty-note">No approved and verified students are waiting for a section in this program.</div> : null}{preview ? <PreviewCard preview={preview} sections={sections} program={get(masters.programs.find((program) => String(get(program, "programId", "ProgramId")) === String(filters.programId)), "programName", "ProgramName")} totalAvailable={totalAvailable} busy={busy} onCancel={() => setPreview(null)} onConfirm={() => setConfirming("section")} /> : null}</> : null}
    {activeTab === "allocated" ? <><CardHead title={`Allocated Students (${allocatedRows.length})`} text="Students assigned to the selected section." icon={<Users size={20} />} /><SearchBox value={search} onChange={setSearch} /><StudentTable students={paginatedAllocated} onEdit={(student) => setEditing({ ...student, nextSectionId: student.sectionId })} iconOnlyEdit showAdmissionDate={false} /><footer className="allocation-pagination"><span>Showing {visibleAllocated.length ? (currentAllocatedPage - 1) * allocatedPageSize + 1 : 0}-{Math.min(currentAllocatedPage * allocatedPageSize, visibleAllocated.length)} of {visibleAllocated.length} students</span><div className="allocation-pagination-actions"><button disabled={currentAllocatedPage === 1} onClick={() => setAllocatedPage(currentAllocatedPage - 1)}>Previous</button><span>Page {currentAllocatedPage} of {allocatedTotalPages}</span><button disabled={currentAllocatedPage === allocatedTotalPages} onClick={() => setAllocatedPage(currentAllocatedPage + 1)}>Next</button></div></footer></> : null}
    {activeTab === "roll" ? <><CardHead title="Roll Numbers" text="Review roll numbers for the selected section." icon={<CheckCircle2 size={20} />} />{selectedSection ? <div className="allocation-summary allocation-roll-summary"><Summary label="Section" value={get(selectedSection, "sectionName", "SectionName")} /><Summary label="Total Students" value={allocatedRows.length} /><Summary label="Roll Numbers Assigned" value={rollAssigned} /><Summary label="Pending" value={Math.max(0, allocatedRows.length - rollAssigned)} /></div> : null}<SearchBox value={search} onChange={setSearch} /><StudentTable students={paginatedRollRows} showAdmissionDate={false} showStatus={false} /><footer className="allocation-pagination"><span>Showing {visibleAllocated.length ? (currentRollPage - 1) * allocatedPageSize + 1 : 0}-{Math.min(currentRollPage * allocatedPageSize, visibleAllocated.length)} of {visibleAllocated.length} students</span><div className="allocation-pagination-actions"><button disabled={currentRollPage === 1} onClick={() => setRollPage(currentRollPage - 1)}>Previous</button><span>Page {currentRollPage} of {rollTotalPages}</span><button disabled={currentRollPage === rollTotalPages} onClick={() => setRollPage(currentRollPage + 1)}>Next</button></div></footer><div className="allocation-selection-footer"><span>{Math.max(0, allocatedRows.length - rollAssigned)} roll number{Math.max(0, allocatedRows.length - rollAssigned) === 1 ? "" : "s"} pending</span><button className="cms-btn cms-btn-primary" disabled={!readySection || Boolean(busy) || !allocatedRows.length} onClick={previewRolls}>{busy === "roll-preview" ? "Preparing..." : "Generate Roll Numbers"}</button></div></> : null}
  </section></main>{confirming === "section" ? <ConfirmDialog title={confirming === "section" ? "Confirm Section Allocation" : "Confirm Roll Number Generation"} message={confirming === "section" ? "Confirm the previewed section allocation? This will save the proposed changes." : "Generate roll numbers using the existing allocation rules?"} confirmLabel={confirming === "section" ? "Confirm Section Allocation" : "Generate Roll Numbers"} loading={busy === `${confirming}-confirm`} loadingLabel="Saving..." onCancel={() => !busy && setConfirming("")} onConfirm={confirming === "section" ? confirmSections : confirmRolls} /> : null}{rollPreviewDialog}{editing ? <Modal title="Edit Allocation" onClose={() => !busy && setEditing(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="cms-btn cms-btn-primary" disabled={Boolean(busy) || !editing.nextSectionId} onClick={saveEdit}>{busy === "edit" ? "Saving..." : "Save Allocation"}</button></>}><div className="allocation-student-summary"><strong>{editing.name}</strong><span>Admission No: {editing.admissionNo}</span></div><SelectField label="New Section" value={editing.nextSectionId} onChange={(nextSectionId) => setEditing((current) => ({ ...current, nextSectionId }))}>{sections.map((section) => <option key={section.id} value={section.id} disabled={section.available <= 0 && String(section.id) !== String(editing.sectionId)}>{get(section, "sectionName", "SectionName")}</option>)}</SelectField></Modal> : null}<Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} /></DashboardLayout>;
}

function SelectField({ label, value, disabled, onChange, children, placeholder, error }) { return <label className="cms-field"><span>{label} <span className="req">*</span></span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder || `Select ${label}`}</option>{children}</select>{error && <small role="alert">{error}</small>}</label>; }
function Summary({ label, value }) { return <div className="allocation-summary-item"><span>{label}</span><strong>{value ?? "—"}</strong></div>; }
function CardHead({ title, text, icon }) { return <div className="cms-card-head allocation-card-head"><div><h3>{title}</h3><p>{text}</p></div>{icon}</div>; }
function SearchBox({ value, onChange }) { return <div className="allocation-table-tools"><Search size={17} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search by student name, admission no or roll no..." /></div>; }
function StudentTable({ students, pending = false, onEdit, showAdmissionDate = true, showStatus = true, iconOnlyEdit = false }) { const status = (student) => positiveId(student.sectionId) ? filled(student.rollNo) ? "Roll Allocated" : "Section Allocated" : "Unallocated"; const columns = 2 + (showAdmissionDate ? 1 : 0) + (pending ? 0 : 2) + (showStatus ? 1 : 0) + (onEdit ? 1 : 0); return <div className="cms-table-wrap"><table className="cms-table allocation-students-table"><thead><tr><th>Admission No</th><th>Student Name</th>{showAdmissionDate ? <th>Admission Date</th> : null}{!pending ? <><th>Section</th><th>Roll No</th></> : null}{showStatus ? <th>Allocation Status</th> : null}{onEdit ? <th>Action</th> : null}</tr></thead><tbody>{students.length ? students.map((student) => <tr key={student.id ?? student.admissionNo}><td>{student.admissionNo || "—"}</td><td className="cms-font-semibold">{student.name || "—"}</td>{showAdmissionDate ? <td>{date(student.admissionDate)}</td> : null}{!pending ? <><td>{student.sectionName || "—"}</td><td>{student.rollNo || "—"}</td></> : null}{showStatus ? <td><StatusBadge value={status(student)} /></td> : null}{onEdit ? <td><button className={`cms-btn cms-btn-ghost${iconOnlyEdit ? " allocation-edit-icon-button" : ""}`} title="Edit" aria-label="Edit" onClick={() => onEdit(student)}><Pencil size={16} />{!iconOnlyEdit ? "Edit" : null}</button></td> : null}</tr>) : <tr><td colSpan={columns}><div className="cms-empty">No students found for this allocation status.</div></td></tr>}</tbody></table></div>; }
function PreviewCard({ preview, sections, program, totalAvailable, busy, onCancel, onConfirm }) { const rows = list(preview?.students); const capacities = new Map(sections.map((section) => [String(section.id), section])); return <section className="allocation-preview-card"><div className="allocation-preview-head"><div><h3>Preview Section Allocation</h3><p>Review eligible students and available section capacity before confirmation.</p></div><span>Preview Only – Changes are not saved yet</span></div><div className="allocation-summary allocation-preview-summary"><Summary label="Students to Allocate" value={get(preview, "studentsToAllocate", "StudentsToAllocate") ?? rows.length} /><Summary label="Available Sections" value={sections.filter((section) => section.available > 0).length} /><Summary label="Total Capacity" value={get(preview, "totalCapacity", "TotalCapacity") ?? "—"} /><Summary label="Available Capacity" value={totalAvailable} /></div><div className="cms-table-wrap"><table className="cms-table allocation-preview-table"><thead><tr><th>Student Name</th><th>Admission No.</th><th>Program</th><th>Proposed Section</th><th>Section Capacity</th><th>Status</th></tr></thead><tbody>{rows.length ? rows.map((student) => { const section = capacities.get(String(get(student, "sectionId", "SectionId"))); return <tr key={get(student, "studentId", "StudentId")}><td className="cms-font-semibold">{get(student, "studentName", "StudentName") || "—"}</td><td>{get(student, "admissionNo", "AdmissionNo") || "—"}</td><td>{program || "—"}</td><td>{get(student, "sectionName", "SectionName") || "—"}</td><td>{section ? `${section.allocated} / ${section.maximum}` : "—"}</td><td><StatusBadge value="Ready" /></td></tr>; }) : <tr><td colSpan="6"><div className="cms-empty">The preview returned no students to allocate.</div></td></tr>}</tbody></table></div><div className="allocation-preview-footer"><button className="cms-btn cms-btn-ghost" disabled={Boolean(busy)} onClick={onCancel}>Cancel</button><button className="cms-btn cms-btn-primary" disabled={Boolean(busy) || !rows.length} onClick={onConfirm}>Confirm Section Allocation</button></div></section>; }
