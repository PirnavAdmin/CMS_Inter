import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Pencil, Search, Users } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Loader, Modal, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import "./SectionAllocationPage.css";

const list = (value) => [value, value?.data, value?.Data, value?.items, value?.Items, value?.groups, value?.Groups, value?.programs, value?.Programs, value?.sections, value?.Sections, value?.academicLevels, value?.AcademicLevels, value?.data?.items, value?.Data?.Items].find(Array.isArray) ?? [];
const body = (response) => response?.data?.data ?? response?.data?.Data ?? response?.data ?? {};
const get = (row, ...keys) => keys.map((key) => row?.[key]).find((value) => value != null);
const num = (value) => Number(value ?? 0);
const filled = (value) => value != null && String(value).trim() !== "" && String(value) !== "0";
const date = (value) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";
const admissionDateOf = (student) => {
  const value = get(student, "admissionDate", "AdmissionDate", "admission_date");
  return value != null && String(value).trim() !== "" ? value : undefined;
};
const existingSectionId = (student) => get(student, "sectionId", "SectionId", "existingSectionId", "ExistingSectionId", "allocatedSectionId", "AllocatedSectionId", "currentSectionId", "CurrentSectionId");
const existingSectionName = (student) => get(student, "sectionName", "SectionName", "existingSectionName", "ExistingSectionName", "allocatedSectionName", "AllocatedSectionName", "currentSectionName", "CurrentSectionName");
const studentIdOf = (student) => get(student, "studentId", "StudentId", "studentID", "StudentID", "student_Id", "Student_Id", "id", "Id");
const studentKey = (student) => String(get(student, "studentId", "StudentId", "studentID", "StudentID", "student_Id", "Student_Id", "id", "Id", "admissionId", "AdmissionId", "admission_Id", "Admission_Id", "admissionNo", "AdmissionNo") ?? "").trim();
const mapStudent = (admission = {}, student = {}) => ({
  id: studentIdOf(student),
  hasStudentRecord: studentIdOf(student) != null,
  admissionNo: get(student, "admissionNo", "AdmissionNo") ?? get(admission, "admissionNo", "AdmissionNo") ?? "—",
  name: get(student, "studentName", "StudentName", "name", "Name") ?? [get(admission, "firstName", "FirstName"), get(admission, "lastName", "LastName")].filter(Boolean).join(" "),
  admissionDate: admissionDateOf(student) ?? admissionDateOf(admission),
  academicYearId: get(student, "academicYearId", "AcademicYearId") ?? get(admission, "academicYearId", "AcademicYearId"),
  academicLevelId: get(student, "academicLevelId", "AcademicLevelId") ?? get(admission, "academicLevelId", "AcademicLevelId"),
  groupId: get(student, "groupId", "GroupId") ?? get(admission, "groupId", "GroupId"),
  programId: get(student, "programId", "ProgramId") ?? get(admission, "programId", "ProgramId"),
  sectionId: existingSectionId(student) ?? existingSectionId(admission),
  sectionName: existingSectionName(student) ?? existingSectionName(admission),
  rollNo: get(student, "rollNo", "RollNo", "rollNumber", "RollNumber") ?? get(admission, "rollNo", "RollNo", "rollNumber", "RollNumber"),
});
const maximumCapacity = (section) => get(section, "maximumStrength", "MaximumStrength", "totalCapacity", "TotalCapacity", "capacity", "Capacity");
const allocatedCapacity = (section) => get(section, "allocatedCount", "AllocatedCount", "alreadyAllocated", "AlreadyAllocated", "currentAllocatedCount", "CurrentAllocatedCount");
const remainingCapacity = (section) => get(section, "remainingCapacity", "RemainingCapacity", "availableCapacity", "AvailableCapacity");
const matchesSectionContext = (section, context) => ["boardId", "academicYearId", "academicLevelId", "groupId", "programId"].every((key) => String(get(section, key, key[0].toUpperCase() + key.slice(1)) ?? "") === String(context[key]));
const matchesStudentContext = (student, context) => ["academicYearId", "academicLevelId", "groupId", "programId"].every((key) => {
  const value = student?.[key];
  return value == null || String(value).trim() === "" || String(value) === String(context[key]);
});
const isFull = (section) => {
  const maximum = maximumCapacity(section);
  const allocated = allocatedCapacity(section);
  return ["true", "1"].includes(String(get(section, "isFull", "IsFull") ?? "").toLowerCase()) || (maximum != null && allocated != null && num(allocated) >= num(maximum));
};
const capacityText = (section) => {
  const maximum = maximumCapacity(section);
  const allocated = allocatedCapacity(section);
  const remainingFromApi = remainingCapacity(section);
  const remaining = remainingFromApi ?? (maximum != null && allocated != null ? Math.max(0, num(maximum) - num(allocated)) : undefined);
  return maximum == null && allocated == null && remaining == null ? "Capacity unavailable" : `Total: ${maximum ?? "—"} · Allocated: ${allocated ?? "—"} · Available: ${remaining ?? "—"}`;
};

export default function SectionAllocationPage() {
  const { selectedBoardId, selectedAcademicYear, selectedAcademicYearId, academicYearsLoading } = useAcademicContext();
  const [filters, setFilters] = useState({ academicLevelId: "", groupId: "", programId: "", sectionId: "" });
  const [targetSectionId, setTargetSectionId] = useState("");
  const [masters, setMasters] = useState({ levels: [], groups: [], programs: [], sections: [] });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [confirming, setConfirming] = useState("");
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({ groupId: "", programId: "", sectionId: "", rollNo: "" });
  const [editPrograms, setEditPrograms] = useState([]);
  const [editSections, setEditSections] = useState([]);
  const [selectedSectionData, setSelectedSectionData] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [allocatedSearch, setAllocatedSearch] = useState("");
  const [sectionRefresh, setSectionRefresh] = useState(0);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.endsWith("/allocated") ? "allocated" : location.pathname.endsWith("/roll-numbers") ? "roll" : "allocation";
  const readyContext = Boolean(selectedBoardId && selectedAcademicYearId && filters.academicLevelId && filters.groupId && filters.programId);
  const effectiveSectionId = activeTab === "allocation" ? targetSectionId : filters.sectionId;
  const ready = readyContext && Boolean(effectiveSectionId);
  const context = useMemo(() => ({ academicYearId: num(selectedAcademicYearId), academicLevelId: num(filters.academicLevelId), groupId: num(filters.groupId), programId: num(filters.programId) }), [selectedAcademicYearId, filters.academicLevelId, filters.groupId, filters.programId]);
  const sectionRequest = useMemo(() => ({ boardId: num(selectedBoardId), ...context, ProgramId: num(filters.programId), IsActive: true }), [selectedBoardId, context, filters.programId]);
  const say = useCallback((reason) => setToast({ message: typeof reason === "string" ? reason : getApiErrorMessage(reason), type: "error" }), []);
  const update = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, ...(key === "academicLevelId" ? { groupId: "", programId: "", sectionId: "" } : {}), ...(key === "groupId" ? { programId: "", sectionId: "" } : {}), ...(key === "programId" ? { sectionId: "" } : {}) }));
    if (["academicLevelId", "groupId", "programId"].includes(key)) setTargetSectionId("");
    setStudents([]); setSelectedSectionData(null); setSelectedStudentIds([]); setAllocatedSearch("");
  };
  const updateTargetSection = (value) => {
    setTargetSectionId(value);
    setSelectedSectionData(null);
    setSelectedStudentIds([]);
  };

  useEffect(() => {
    setFilters({ academicLevelId: "", groupId: "", programId: "", sectionId: "" });
    setTargetSectionId("");
    setMasters({ levels: [], groups: [], programs: [], sections: [] });
    setStudents([]); setSelectedSectionData(null); setSelectedStudentIds([]); setAllocatedSearch("");
    if (!selectedBoardId) { setLoading(false); return undefined; }
    let active = true; setLoading(true);
    apiClient.get(apiEndpoints.boards.academicLevels, { params: { boardId: selectedBoardId } })
      .then((response) => active && setMasters((current) => ({ ...current, levels: list(body(response)).filter((level) => { const boardId = get(level, "boardId", "BoardId"); return boardId == null || String(boardId) === String(selectedBoardId); }) })))
      .catch((error) => active && say(error)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [selectedBoardId, say]);
  useEffect(() => {
    setFilters({ academicLevelId: "", groupId: "", programId: "", sectionId: "" });
    setTargetSectionId("");
    setMasters((current) => ({ ...current, groups: [], programs: [], sections: [] }));
    setStudents([]); setSelectedSectionData(null); setSelectedStudentIds([]); setAllocatedSearch("");
  }, [selectedAcademicYearId]);
  useEffect(() => {
    if (!selectedBoardId || !selectedAcademicYearId || !filters.academicLevelId) return setMasters((current) => ({ ...current, groups: [], programs: [], sections: [] }));
    apiClient.get(apiEndpoints.groups.getByBoard(selectedBoardId), { params: { academicYearId: selectedAcademicYearId, academicLevelId: filters.academicLevelId, isActive: true } }).then((response) => setMasters((current) => ({ ...current, groups: list(body(response)) }))).catch(say);
  }, [selectedBoardId, selectedAcademicYearId, filters.academicLevelId, say]);
  useEffect(() => {
    if (!filters.groupId) return setMasters((current) => ({ ...current, programs: [], sections: [] }));
    apiClient.get(apiEndpoints.groups.programs(filters.groupId)).then((response) => setMasters((current) => ({ ...current, programs: list(body(response)) }))).catch(say);
  }, [filters.groupId, say]);
  useEffect(() => {
    if (!readyContext) return setMasters((current) => ({ ...current, sections: [] }));
    let active = true;
    apiClient.get(apiEndpoints.sections.list, { params: { ...sectionRequest, pageSize: 1000 } }).then((response) => active && setMasters((current) => ({ ...current, sections: list(body(response)).filter((section) => matchesSectionContext(section, sectionRequest)) }))).catch((error) => active && say(error));
    return () => { active = false; };
  }, [readyContext, sectionRequest, sectionRefresh, say]);
  useEffect(() => {
    setSelectedSectionData(null);
    if (!ready) return undefined;
    let active = true;
    const sectionId = effectiveSectionId;
    Promise.allSettled([
      apiClient.get(apiEndpoints.sections.getById(sectionId)),
      apiClient.get(apiEndpoints.students.getBySection(sectionId)),
    ]).then(([sectionResult, studentsResult]) => {
      if (!active) return;
      const sectionPayload = sectionResult.status === "fulfilled" ? body(sectionResult.value) : null;
      const section = list(sectionPayload)[0] ?? sectionPayload;
      const sectionStudents = studentsResult.status === "fulfilled" ? list(body(studentsResult.value)) : null;
      setSelectedSectionData({ sectionId, section, allocatedCount: sectionStudents?.length, students: sectionStudents ?? [] });
    });
    return () => { active = false; };
  }, [ready, effectiveSectionId, sectionRefresh]);
  useEffect(() => {
    if (!editing || !editValues.groupId) return setEditPrograms([]);
    apiClient.get(apiEndpoints.groups.programs(editValues.groupId)).then((response) => setEditPrograms(list(body(response)))).catch(say);
  }, [editing, editValues.groupId, say]);
  useEffect(() => {
    if (!editing || !editValues.groupId || !editValues.programId) return setEditSections([]);
    const params = { boardId: num(selectedBoardId), academicYearId: num(selectedAcademicYearId), academicLevelId: num(filters.academicLevelId), groupId: num(editValues.groupId), programId: num(editValues.programId), ProgramId: num(editValues.programId), IsActive: true };
    apiClient.get(apiEndpoints.sections.list, { params }).then((response) => setEditSections(list(body(response)).filter((section) => !isFull(section) || String(get(section, "sectionId", "SectionId")) === String(editing.sectionId)))).catch(say);
  }, [editing, editValues.groupId, editValues.programId, selectedBoardId, selectedAcademicYearId, filters.academicLevelId, say]);

  const loadStudents = useCallback(async () => {
    if (!readyContext) return;
    setStudentLoading(true);
    try {
      const [admissionsResponse, studentsResponse] = await Promise.all([apiClient.get(apiEndpoints.admissions.getAll), apiClient.get(apiEndpoints.students.getAll)]);
      const allStudents = list(body(studentsResponse));
      const studentByAdmission = new Map(allStudents.map((student) => [String(get(student, "admissionNo", "AdmissionNo") ?? "").trim(), student]));
      const studentById = new Map(allStudents.map((student) => [studentKey(student), student]));
      setStudents(list(body(admissionsResponse)).filter((admission) => ["academicYearId", "academicLevelId", "groupId", "programId"].every((key) => String(get(admission, key, key[0].toUpperCase() + key.slice(1)) ?? "") === String(context[key]))).map((admission) => {
        const student = studentById.get(studentKey(admission)) ?? studentByAdmission.get(String(get(admission, "admissionNo", "AdmissionNo") ?? "").trim()) ?? {};
        return mapStudent(admission, student);
      }).filter((student) => student.hasStudentRecord && matchesStudentContext(student, context)));
    } catch (error) { say(error); } finally { setStudentLoading(false); }
  }, [readyContext, context, say]);
  useEffect(() => { loadStudents(); }, [loadStudents]);
  const listedSection = masters.sections.find((section) => String(get(section, "sectionId", "SectionId")) === String(effectiveSectionId));
  const selectedSection = selectedSectionData?.sectionId === effectiveSectionId ? { ...listedSection, ...selectedSectionData.section } : listedSection;
  const allocatedRows = useMemo(() => {
    const contextStudents = new Map(students.map((student) => [studentKey(student), student]));
    const contextStudentsByAdmission = new Map(students.map((student) => [String(student.admissionNo ?? "").trim(), student]));
    return (selectedSectionData?.students ?? []).map((student) => {
      const contextStudent = contextStudents.get(studentKey(student)) ?? contextStudentsByAdmission.get(String(get(student, "admissionNo", "AdmissionNo") ?? "").trim()) ?? {};
      const mapped = mapStudent(contextStudent, student);
      return {
        ...mapped,
        admissionDate: admissionDateOf(student) ?? admissionDateOf(contextStudent),
        sectionId: existingSectionId(student) ?? existingSectionId(contextStudent) ?? effectiveSectionId,
        sectionName: existingSectionName(student) ?? existingSectionName(contextStudent) ?? get(selectedSectionData?.section, "sectionName", "SectionName"),
      };
    });
  }, [selectedSectionData, students, effectiveSectionId]);
  // The destination section must not change the Academic Level/Group/Program candidate pool.
  // Selected-section students are kept separately in `allocatedRows` for the other two tabs.
  const unallocated = students.filter((student) => !filled(student.sectionId));
  const selectedStudentIdSet = useMemo(() => new Set(selectedStudentIds.map(String)), [selectedStudentIds]);
  const selectedStudents = unallocated.filter((student) => selectedStudentIdSet.has(String(student.id)));
  const selectedSectionStudents = students.filter((student) => String(student.sectionId ?? "") === String(effectiveSectionId));
  const maximumStrength = maximumCapacity(selectedSection);
  const allocatedFromApi = allocatedCapacity(selectedSection);
  const allocatedCount = allocatedFromApi ?? selectedSectionData?.allocatedCount ?? selectedSectionStudents.length;
  const remainingFromApi = remainingCapacity(selectedSection);
  const remaining = remainingFromApi ?? (maximumStrength != null ? Math.max(0, num(maximumStrength) - num(allocatedCount)) : undefined);
  const selectedCapacityValid = remaining == null || selectedStudents.length <= num(remaining);
  const sectionFull = remaining != null && num(remaining) <= 0;
  const selectedSectionName = get(selectedSection, "sectionName", "SectionName") || "selected section";
  const toggleStudentSelection = (studentId) => {
    const id = String(studentId ?? "");
    if (!id) return;
    const isSelected = selectedStudentIdSet.has(id);
    if (!isSelected && sectionFull) {
      say("Section is full. Cannot allocate more students.");
      return;
    }
    if (!isSelected && remaining != null && selectedStudents.length >= num(remaining)) {
      say("Cannot allocate students. Section capacity cannot be exceeded.");
      return;
    }
    setSelectedStudentIds((current) => {
      if (current.map(String).includes(id)) return current.filter((value) => String(value) !== id);
      return [...current, studentId];
    });
  };
  const toggleAllStudentSelections = () => {
    if (selectedStudents.length === unallocated.length) {
      setSelectedStudentIds([]);
      return;
    }
    const limit = remaining == null ? unallocated.length : Math.min(unallocated.length, num(remaining));
    if (sectionFull) {
      say("Section is full. Cannot allocate more students.");
      return;
    }
    if (limit < unallocated.length) say("Cannot allocate students. Section capacity cannot be exceeded.");
    setSelectedStudentIds(unallocated.slice(0, limit).map((student) => student.id).filter((id) => id != null));
  };
  const requestSelectedAllocation = () => {
    if (!selectedStudents.length) return;
    if (!ready) return say("Please select a Target Section.");
    if (sectionFull) return say("Section is full. Cannot allocate more students.");
    if (!selectedCapacityValid) return say("Cannot allocate students. Section capacity cannot be exceeded.");
    setConfirming("selected-section");
  };
  const requestRollGeneration = async () => {
    if (!ready) return say("Please select a Section.");
    setBusy("roll-preview");
    try {
      await apiClient.post(apiEndpoints.sectionRollAllocation.rollPreview, context);
      setConfirming("roll");
    } catch (error) { say(error); } finally { setBusy(""); }
  };
  const confirm = async () => {
    const type = confirming; setBusy(`${type}-confirm`);
    try {
      if (type === "selected-section") {
        if (sectionFull) throw new Error("Section is full. Cannot allocate more students.");
        if (!selectedCapacityValid) throw new Error("Cannot allocate students. Section capacity cannot be exceeded.");
        const payload = { groupId: num(filters.groupId), programId: num(filters.programId), sectionId: num(targetSectionId) };
        await Promise.all(selectedStudents.map((student) => apiClient.put(apiEndpoints.sectionRollAllocation.updateStudent(student.id), payload)));
        setToast({ message: `${selectedStudents.length} student${selectedStudents.length === 1 ? "" : "s"} allocated to ${selectedSectionName}.`, type: "success" });
        setSelectedStudentIds([]); setConfirming(""); setSectionRefresh((value) => value + 1); await loadStudents();
        return;
      }
      const response = await apiClient.post(apiEndpoints.sectionRollAllocation.rollConfirm, context);
      setToast({ message: body(response).message ?? "Roll number allocation completed successfully.", type: "success" });
      setConfirming(""); setSectionRefresh((value) => value + 1); await loadStudents();
    } catch (error) { say(error); setConfirming(""); } finally { setBusy(""); }
  };
  const editChanged = editing && (String(editing.groupId) !== String(editValues.groupId) || String(editing.programId) !== String(editValues.programId));
  const filteredAllocatedRows = useMemo(() => {
    const query = allocatedSearch.trim().toLowerCase();
    return query ? allocatedRows.filter((student) => `${student.name} ${student.admissionNo} ${student.rollNo}`.toLowerCase().includes(query)) : allocatedRows;
  }, [allocatedRows, allocatedSearch]);
  const saveEdit = async () => {
    setBusy("edit");
    try {
      const payload = { groupId: num(editValues.groupId), programId: num(editValues.programId), sectionId: num(editValues.sectionId) };
      if (!editChanged && filled(editValues.rollNo)) payload.rollNo = editValues.rollNo;
      const response = await apiClient.put(apiEndpoints.sectionRollAllocation.updateStudent(editing.id), payload);
      setToast({ message: body(response).message ?? "Allocation updated successfully.", type: "success" }); setEditing(null); setSectionRefresh((value) => value + 1); await loadStudents();
    } catch (error) { say(error); } finally { setBusy(""); }
  };
  const options = (items, ids, labels) => items.map((item) => <option key={get(item, ...ids)} value={get(item, ...ids)}>{get(item, ...labels) ?? "Unnamed"}</option>);
  const openEdit = (student) => { setEditing(student); setEditValues({ groupId: String(student.groupId), programId: String(student.programId), sectionId: String(student.sectionId), rollNo: student.rollNo ?? "" }); };
  const tabPath = (tab) => tab === "allocated" ? "/dashboard/section-allocation/allocated" : tab === "roll" ? "/dashboard/section-allocation/roll-numbers" : "/dashboard/section-allocation";
  const sectionChoices = masters.sections;
  const rollAssigned = allocatedRows.filter((student) => filled(student.rollNo)).length;
  return <DashboardLayout title="Section Allocation" subtitle="Manage student section allocation and roll number assignment." breadcrumb={["People", "Section Allocation"]}>
    <main className="allocation-page">
      <nav className="allocation-tabs" aria-label="Section allocation views">
        {[['allocation', 'Section Allocation'], ['allocated', 'Allocated Students'], ['roll', 'Roll Numbers']].map(([tab, label]) => <button key={tab} type="button" className={activeTab === tab ? "is-active" : ""} onClick={() => navigate(tabPath(tab))}>{label}</button>)}
      </nav>
      <section className="cms-card allocation-workspace">
        <div className="cms-card-body">
          <div className="allocation-filter-grid">
            <div className="cms-field"><span>Academic Year</span><div className="allocation-year-value">{selectedAcademicYear?.name ?? selectedAcademicYear?.label ?? (academicYearsLoading ? "Loading academic year..." : "Select an Academic Year in the header")}</div></div>
            <Field label="Academic Level" value={filters.academicLevelId} disabled={!selectedBoardId || !selectedAcademicYearId || loading} onChange={(value) => update("academicLevelId", value)}>{options(masters.levels, ["academicLevelId", "AcademicLevelId", "levelId", "LevelId"], ["academicLevelName", "AcademicLevelName", "levelName", "LevelName"])}</Field>
            <Field label="Group" value={filters.groupId} disabled={!filters.academicLevelId} onChange={(value) => update("groupId", value)}>{options(masters.groups, ["groupId", "GroupId"], ["groupName", "GroupName"])}</Field>
            <Field label="Program" value={filters.programId} disabled={!filters.groupId} onChange={(value) => update("programId", value)}>{options(masters.programs, ["programId", "ProgramId"], ["programName", "ProgramName"])}</Field>
            <Field label="Section" value={filters.sectionId} disabled={!filters.programId} onChange={(value) => update("sectionId", value)}>{sectionChoices.map((section) => <option key={get(section, "sectionId", "SectionId")} value={get(section, "sectionId", "SectionId")}>{get(section, "sectionName", "SectionName")} ({get(section, "allocatedCount", "AllocatedCount") ?? "—"}/{get(section, "maximumStrength", "MaximumStrength") ?? "—"})</option>)}</Field>
          </div>
          {activeTab !== "roll" && selectedSection && <div className="allocation-summary allocation-context-summary"><div className="allocation-summary-item"><span>Target Section</span><strong>{selectedSectionName}</strong></div><div className="allocation-summary-item"><span>Capacity</span><strong>{maximumStrength ?? "—"}</strong></div><div className="allocation-summary-item"><span>Allocated</span><strong>{allocatedCount}</strong></div><div className="allocation-summary-item"><span>Available</span><strong>{remaining ?? "—"}</strong></div></div>}
        </div>
        {activeTab === "allocation" && <><CardHead title={`Students to Allocate (${unallocated.length})`} text="Students waiting for a section assignment." icon={<Users size={20} />}><label className="allocation-target-field"><span>Target Section</span><select value={targetSectionId} disabled={!filters.programId} onChange={(event) => updateTargetSection(event.target.value)}><option value="">Select Target Section</option>{sectionChoices.map((section) => <option key={get(section, "sectionId", "SectionId")} value={get(section, "sectionId", "SectionId")}>{get(section, "sectionName", "SectionName")} ({get(section, "allocatedCount", "AllocatedCount") ?? "â€”"}/{get(section, "maximumStrength", "MaximumStrength") ?? "â€”"})</option>)}</select></label></CardHead>{studentLoading ? <Loader label="Loading students to allocate..." /> : <><StudentTable students={unallocated} pending selectable selectedIds={selectedStudentIdSet} onToggleSelection={toggleStudentSelection} onToggleAll={toggleAllStudentSelections} /><div className="allocation-selection-footer"><span>{sectionFull ? "Target section is full." : !targetSectionId ? "Select a Target Section to allocate students." : `${selectedStudents.length} student${selectedStudents.length === 1 ? "" : "s"} selected`}</span><button className="cms-btn cms-btn-primary" disabled={!selectedStudents.length || !ready || sectionFull || Boolean(busy)} onClick={requestSelectedAllocation}>Allocate Students</button></div></>}</>}
        {activeTab === "allocated" && <><CardHead title={`Allocated Students (${allocatedRows.length})`} text="Students assigned to the selected section." icon={<Users size={20} />} /><div className="allocation-table-tools"><Search size={17} /><input value={allocatedSearch} onChange={(event) => setAllocatedSearch(event.target.value)} placeholder="Search by student name, admission no or roll no..." /></div><StudentTable students={filteredAllocatedRows} onEdit={openEdit} iconOnlyEdit showAdmissionDate={false} /></>}
        {activeTab === "roll" && <><CardHead title="Roll Numbers" text="Generate and review roll numbers for the selected section." icon={<CheckCircle2 size={20} />} />{selectedSection && <div className="allocation-summary allocation-roll-summary"><div className="allocation-summary-item"><span>Section</span><strong>{selectedSectionName}</strong></div><div className="allocation-summary-item"><span>Total Students</span><strong>{allocatedRows.length}</strong></div><div className="allocation-summary-item"><span>Roll Numbers Assigned</span><strong>{rollAssigned}</strong></div><div className="allocation-summary-item"><span>Pending</span><strong>{Math.max(0, allocatedRows.length - rollAssigned)}</strong></div></div>}<StudentTable students={allocatedRows} showAdmissionDate={false} showStatus={false} /><div className="allocation-selection-footer"><span>{Math.max(0, allocatedRows.length - rollAssigned)} roll number{Math.max(0, allocatedRows.length - rollAssigned) === 1 ? "" : "s"} pending</span><button className="cms-btn cms-btn-primary" disabled={!ready || Boolean(busy) || !allocatedRows.length} onClick={requestRollGeneration}>{busy === "roll-preview" ? "Preparing..." : "Generate Roll Numbers"}</button></div></>}
      </section>
    </main>
    {confirming && <ConfirmDialog title={confirming === "selected-section" ? "Confirm Student Allocation" : "Confirm Roll Number Generation"} message={confirming === "selected-section" ? `Allocate ${selectedStudents.length} selected student${selectedStudents.length === 1 ? "" : "s"} to ${selectedSectionName}?` : "Generate roll numbers using the existing allocation rules?"} confirmLabel={confirming === "selected-section" ? "Allocate Students" : "Generate Roll Numbers"} loading={busy === `${confirming}-confirm`} loadingLabel="Saving..." onCancel={() => !busy && setConfirming("")} onConfirm={confirm} />}
    {editing && <Modal title="Edit Allocation" onClose={() => !busy && setEditing(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="cms-btn cms-btn-primary" disabled={Boolean(busy) || !editValues.groupId || !editValues.programId || !editValues.sectionId} onClick={saveEdit}>{busy === "edit" ? "Saving..." : "Save Allocation"}</button></>}><div className="allocation-student-summary"><strong>{editing.name}</strong><span>Admission No: {editing.admissionNo}</span><span>Current section: {editing.sectionName || "—"} · Roll No: {editing.rollNo || "—"}</span></div><div className="cms-form-grid"><Field label="New Group" value={editValues.groupId} onChange={(groupId) => setEditValues({ groupId, programId: "", sectionId: "", rollNo: "" })}>{options(masters.groups, ["groupId", "GroupId"], ["groupName", "GroupName"])}</Field><Field label="New Program" value={editValues.programId} onChange={(programId) => setEditValues((current) => ({ ...current, programId, sectionId: "", rollNo: "" }))}>{options(editPrograms, ["programId", "ProgramId"], ["programName", "ProgramName"])}</Field><Field label="New Section" value={editValues.sectionId} onChange={(sectionId) => setEditValues((current) => ({ ...current, sectionId }))}>{options(editSections, ["sectionId", "SectionId"], ["sectionName", "SectionName"])}</Field><label className="cms-field"><span>Roll No {editChanged ? "(assigned by backend)" : "(optional)"}</span><input value={editChanged ? "" : editValues.rollNo} disabled={editChanged} onChange={(event) => setEditValues((current) => ({ ...current, rollNo: event.target.value }))} /></label></div></Modal>}
<Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
</DashboardLayout>;
}
function Field({ label, value, disabled, onChange, children }) { return <label className="cms-field"><span>{label} <span className="req">*</span></span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">Select {label}</option>{children}</select></label>; }
function CardHead({ title, text, icon, children }) { return <div className="cms-card-head allocation-card-head"><div><h3>{title}</h3><p>{text}</p></div><div className="allocation-card-head-actions">{children}{icon}</div></div>; }
function StudentTable({ students, onEdit, pending = false, selectable = false, selectedIds = new Set(), onToggleSelection, onToggleAll, showAdmissionDate = true, showStatus = true, iconOnlyEdit = false }) {
  const status = (student) => filled(student.rollNo) ? "Roll Allocated" : filled(student.sectionId) || student.sectionName ? "Section Allocated" : "Unallocated";
  const selectableStudents = students.filter((student) => student.id != null);
  const allSelected = selectableStudents.length > 0 && selectableStudents.every((student) => selectedIds.has(String(student.id)));
  const columnCount = 2 + (showAdmissionDate ? 1 : 0) + (pending ? 0 : 2) + (showStatus ? 1 : 0) + (onEdit ? 1 : 0) + (selectable ? 1 : 0);

  return <div className="cms-table-wrap"><table className="cms-table allocation-students-table"><thead><tr>
    {selectable && <th className="allocation-select-column"><input type="checkbox" aria-label="Select all students" checked={allSelected} onChange={onToggleAll} /></th>}
    <th>Admission No</th><th>Student Name</th>{showAdmissionDate && <th>Admission Date</th>}{!pending && <><th>Section</th><th>Roll No</th></>}{showStatus && <th>Allocation Status</th>}{onEdit && <th>Action</th>}
  </tr></thead><tbody>{students.length ? students.map((student) => {
    const studentId = student.id;
    const selectableStudent = selectable && studentId != null;
    return <tr key={student.id ?? student.admissionNo}>
      {selectable && <td className="allocation-select-column"><input type="checkbox" aria-label={`Select ${student.name || student.admissionNo || "student"}`} checked={selectableStudent && selectedIds.has(String(studentId))} disabled={!selectableStudent} onChange={() => selectableStudent && onToggleSelection(studentId)} /></td>}
      <td>{student.admissionNo || "—"}</td><td className="cms-font-semibold">{student.name || "—"}</td>{showAdmissionDate && <td>{date(student.admissionDate)}</td>}{!pending && <><td>{student.sectionName || "—"}</td><td>{student.rollNo || "—"}</td></>}{showStatus && <td><StatusBadge value={status(student)} /></td>}{onEdit && <td><button className={`cms-btn cms-btn-ghost${iconOnlyEdit ? " allocation-edit-icon-button" : ""}`} title="Edit" aria-label="Edit" onClick={() => onEdit(student)}><Pencil size={16} />{!iconOnlyEdit && "Edit"}</button></td>}
    </tr>;
  }) : <tr><td colSpan={columnCount}><div className="cms-empty">No students found for this allocation status.</div></td></tr>}</tbody></table></div>;
}
