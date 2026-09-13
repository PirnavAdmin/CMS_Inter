import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Pencil, Users } from "lucide-react";
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
const studentKey = (student) => String(get(student, "studentId", "StudentId", "id", "Id", "admissionNo", "AdmissionNo") ?? "").trim();
const mapStudent = (admission = {}, student = {}) => ({
  id: get(student, "studentId", "StudentId", "id", "Id") ?? get(admission, "studentId", "StudentId", "id", "Id"),
  admissionNo: get(student, "admissionNo", "AdmissionNo") ?? get(admission, "admissionNo", "AdmissionNo") ?? "—",
  name: get(student, "studentName", "StudentName", "name", "Name") ?? [get(admission, "firstName", "FirstName"), get(admission, "lastName", "LastName")].filter(Boolean).join(" "),
  admissionDate: admissionDateOf(student) ?? admissionDateOf(admission),
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
  const [masters, setMasters] = useState({ levels: [], groups: [], programs: [], sections: [] });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [sectionPreview, setSectionPreview] = useState(null);
  const [rollPreview, setRollPreview] = useState(null);
  const [sectionConfirmed, setSectionConfirmed] = useState(false);
  const [confirming, setConfirming] = useState("");
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({ groupId: "", programId: "", sectionId: "", rollNo: "" });
  const [editPrograms, setEditPrograms] = useState([]);
  const [editSections, setEditSections] = useState([]);
  const [sectionStudents, setSectionStudents] = useState(null);
  const [selectedSectionData, setSelectedSectionData] = useState(null);
  const [sectionRefresh, setSectionRefresh] = useState(0);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const readyContext = Boolean(selectedBoardId && selectedAcademicYearId && filters.academicLevelId && filters.groupId && filters.programId);
  const ready = readyContext && Boolean(filters.sectionId);
  const context = useMemo(() => ({ academicYearId: num(selectedAcademicYearId), academicLevelId: num(filters.academicLevelId), groupId: num(filters.groupId), programId: num(filters.programId) }), [selectedAcademicYearId, filters.academicLevelId, filters.groupId, filters.programId]);
  const sectionRequest = useMemo(() => ({ boardId: num(selectedBoardId), ...context, ProgramId: num(filters.programId), IsActive: true }), [selectedBoardId, context, filters.programId]);
  const targetRequest = useMemo(() => ({ ...context, sectionId: num(filters.sectionId) }), [context, filters.sectionId]);
  const say = (reason) => setToast({ message: typeof reason === "string" ? reason : getApiErrorMessage(reason), type: "error" });
  const update = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, ...(key === "academicLevelId" ? { groupId: "", programId: "", sectionId: "" } : {}), ...(key === "groupId" ? { programId: "", sectionId: "" } : {}), ...(key === "programId" ? { sectionId: "" } : {}) }));
    setStudents([]); setSelectedSectionData(null); setSectionPreview(null); setRollPreview(null); setSectionConfirmed(false);
  };

  useEffect(() => {
    setFilters({ academicLevelId: "", groupId: "", programId: "", sectionId: "" });
    setMasters({ levels: [], groups: [], programs: [], sections: [] });
    setStudents([]); setSelectedSectionData(null); setSectionPreview(null); setRollPreview(null); setSectionConfirmed(false);
    if (!selectedBoardId) { setLoading(false); return undefined; }
    let active = true; setLoading(true);
    apiClient.get(apiEndpoints.boards.academicLevels, { params: { boardId: selectedBoardId } })
      .then((response) => active && setMasters((current) => ({ ...current, levels: list(body(response)).filter((level) => { const boardId = get(level, "boardId", "BoardId"); return boardId == null || String(boardId) === String(selectedBoardId); }) })))
      .catch((error) => active && say(error)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [selectedBoardId]);
  useEffect(() => {
    setFilters({ academicLevelId: "", groupId: "", programId: "", sectionId: "" });
    setMasters((current) => ({ ...current, groups: [], programs: [], sections: [] }));
    setStudents([]); setSelectedSectionData(null); setSectionPreview(null); setRollPreview(null); setSectionConfirmed(false);
  }, [selectedAcademicYearId]);
  useEffect(() => {
    if (!selectedBoardId || !selectedAcademicYearId || !filters.academicLevelId) return setMasters((current) => ({ ...current, groups: [], programs: [], sections: [] }));
    apiClient.get(apiEndpoints.groups.getByBoard(selectedBoardId), { params: { academicYearId: selectedAcademicYearId, academicLevelId: filters.academicLevelId, isActive: true } }).then((response) => setMasters((current) => ({ ...current, groups: list(body(response)) }))).catch(say);
  }, [selectedBoardId, selectedAcademicYearId, filters.academicLevelId]);
  useEffect(() => {
    if (!filters.groupId) return setMasters((current) => ({ ...current, programs: [], sections: [] }));
    apiClient.get(apiEndpoints.groups.programs(filters.groupId)).then((response) => setMasters((current) => ({ ...current, programs: list(body(response)) }))).catch(say);
  }, [filters.groupId]);
  useEffect(() => {
    if (!readyContext) return setMasters((current) => ({ ...current, sections: [] }));
    let active = true;
    apiClient.get(apiEndpoints.sections.list, { params: { ...sectionRequest, pageSize: 1000 } }).then((response) => active && setMasters((current) => ({ ...current, sections: list(body(response)).filter((section) => matchesSectionContext(section, sectionRequest)) }))).catch((error) => active && say(error));
    return () => { active = false; };
  }, [readyContext, sectionRequest, sectionRefresh]);
  useEffect(() => {
    setSelectedSectionData(null);
    if (!ready) return undefined;
    let active = true;
    const sectionId = filters.sectionId;
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
  }, [ready, filters.sectionId, sectionRefresh]);
  useEffect(() => {
    if (!editing || !editValues.groupId) return setEditPrograms([]);
    apiClient.get(apiEndpoints.groups.programs(editValues.groupId)).then((response) => setEditPrograms(list(body(response)))).catch(say);
  }, [editing, editValues.groupId]);
  useEffect(() => {
    if (!editing || !editValues.groupId || !editValues.programId) return setEditSections([]);
    const params = { boardId: num(selectedBoardId), academicYearId: num(selectedAcademicYearId), academicLevelId: num(filters.academicLevelId), groupId: num(editValues.groupId), programId: num(editValues.programId), ProgramId: num(editValues.programId), IsActive: true };
    apiClient.get(apiEndpoints.sections.list, { params }).then((response) => setEditSections(list(body(response)).filter((section) => !isFull(section) || String(get(section, "sectionId", "SectionId")) === String(editing.sectionId)))).catch(say);
  }, [editing, editValues.groupId, editValues.programId, selectedBoardId, selectedAcademicYearId, filters.academicLevelId]);

  const loadStudents = async () => {
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
      }));
    } catch (error) { say(error); } finally { setStudentLoading(false); }
  };
  useEffect(() => { loadStudents(); }, [readyContext, context]);
  const listedSection = masters.sections.find((section) => String(get(section, "sectionId", "SectionId")) === String(filters.sectionId));
  const selectedSection = selectedSectionData?.sectionId === filters.sectionId ? { ...listedSection, ...selectedSectionData.section } : listedSection;
  const matchingStudents = useMemo(() => {
    const byStudent = new Map(students.map((student) => [studentKey(student), student]));
    (selectedSectionData?.students ?? []).forEach((student) => {
      const mapped = mapStudent({}, student);
      const key = studentKey(mapped);
      if (!key) return;
      byStudent.set(key, { ...byStudent.get(key), ...mapped });
    });
    return [...byStudent.values()];
  }, [students, selectedSectionData]);
  const viewedStudentRows = useMemo(() => {
    const contextStudents = new Map(students.map((student) => [studentKey(student), student]));
    const contextStudentsByAdmission = new Map(students.map((student) => [String(student.admissionNo ?? "").trim(), student]));
    return (sectionStudents?.students ?? []).map((student) => {
      const contextStudent = contextStudents.get(studentKey(student)) ?? contextStudentsByAdmission.get(String(get(student, "admissionNo", "AdmissionNo") ?? "").trim()) ?? {};
      const mapped = mapStudent(contextStudent, student);
      return {
        ...mapped,
        admissionDate: admissionDateOf(student) ?? admissionDateOf(contextStudent),
        sectionId: existingSectionId(student) ?? existingSectionId(contextStudent) ?? get(sectionStudents?.section, "sectionId", "SectionId"),
        sectionName: existingSectionName(student) ?? existingSectionName(contextStudent) ?? get(sectionStudents?.section, "sectionName", "SectionName"),
      };
    });
  }, [sectionStudents, students]);
  const unallocated = matchingStudents.filter((student) => !filled(student.sectionId));
  const selectedSectionStudents = students.filter((student) => String(student.sectionId ?? "") === String(filters.sectionId));
  const pending = num(sectionPreview?.studentsToAllocate ?? unallocated.length);
  const maximumStrength = maximumCapacity(selectedSection);
  const allocatedFromApi = allocatedCapacity(selectedSection);
  const allocatedCount = allocatedFromApi ?? selectedSectionData?.allocatedCount ?? selectedSectionStudents.length;
  const remainingFromApi = remainingCapacity(selectedSection);
  const remaining = remainingFromApi ?? (maximumStrength != null ? Math.max(0, num(maximumStrength) - num(allocatedCount)) : undefined);
  const capacityValid = remaining == null || pending <= num(remaining);
  const preview = async (type) => {
    if (type === "section" && !filters.sectionId) return say("Please select a Section.");
    if (type === "section" ? !ready : !readyContext) return;
    setBusy(`${type}-preview`);
    try {
      const response = await apiClient.post(type === "section" ? apiEndpoints.sectionRollAllocation.sectionPreview : apiEndpoints.sectionRollAllocation.rollPreview, type === "section" ? targetRequest : context);
      if (type === "section") {
        const previewData = body(response);
        const previewSection = get(previewData, "section", "Section", "targetSection", "TargetSection") ?? previewData;
        setSectionPreview(previewData);
        setSelectedSectionData((current) => current?.sectionId === filters.sectionId ? { ...current, section: { ...current.section, ...previewSection } } : current);
        setRollPreview(null);
      } else setRollPreview(body(response));
    } catch (error) { say(error); } finally { setBusy(""); }
  };
  const requestConfirm = (type) => {
    if (type === "section" && !capacityValid) return say(`Selected section has only ${remaining} available seats, but ${pending} students are pending allocation.`);
    setConfirming(type);
  };
  const confirm = async () => {
    const type = confirming; setBusy(`${type}-confirm`);
    try {
      const response = await apiClient.post(type === "section" ? apiEndpoints.sectionRollAllocation.sectionConfirm : apiEndpoints.sectionRollAllocation.rollConfirm, type === "section" ? targetRequest : context);
      setToast({ message: body(response).message ?? `${type === "section" ? "Section" : "Roll number"} allocation completed successfully.`, type: "success" });
      setConfirming(""); setSectionPreview(null); setRollPreview(null); if (type === "section") { setSectionConfirmed(true); setSectionRefresh((value) => value + 1); } await loadStudents();
    } catch (error) { say(error); setConfirming(""); } finally { setBusy(""); }
  };
  const editChanged = editing && (String(editing.groupId) !== String(editValues.groupId) || String(editing.programId) !== String(editValues.programId));
  const saveEdit = async () => {
    setBusy("edit");
    try {
      const payload = { groupId: num(editValues.groupId), programId: num(editValues.programId), sectionId: num(editValues.sectionId) };
      if (!editChanged && filled(editValues.rollNo)) payload.rollNo = editValues.rollNo;
      const response = await apiClient.put(apiEndpoints.sectionRollAllocation.updateStudent(editing.id), payload);
      setToast({ message: body(response).message ?? "Allocation updated successfully.", type: "success" }); setEditing(null); setSectionRefresh((value) => value + 1); await loadStudents();
    } catch (error) { say(error); } finally { setBusy(""); }
  };
  const viewStudents = async (section) => {
    setBusy("section-students");
    try {
      const sectionId = get(section, "sectionId", "SectionId");
      const [studentsResult, sectionResult, admissionsResult] = await Promise.all([
        apiClient.get(apiEndpoints.students.getBySection(sectionId)),
        apiClient.get(apiEndpoints.sections.getById(sectionId)).catch(() => null),
        apiClient.get(apiEndpoints.admissions.getAll),
      ]);
      const detailsPayload = sectionResult ? body(sectionResult) : null;
      const viewedSection = { ...section, ...(list(detailsPayload)[0] ?? detailsPayload) };
      const admissionsByNumber = new Map(list(body(admissionsResult)).map((admission) => [String(get(admission, "admissionNo", "AdmissionNo") ?? "").trim(), admission]));
      const sectionStudentRows = list(body(studentsResult)).map((student) => {
        const admission = admissionsByNumber.get(String(get(student, "admissionNo", "AdmissionNo") ?? "").trim());
        return admissionDateOf(student) ? student : { ...student, admissionDate: admissionDateOf(admission) };
      });
      setSectionStudents({
        section: viewedSection,
        students: sectionStudentRows,
        allocatedCount: allocatedCapacity(viewedSection) ?? sectionStudentRows.length,
        remainingCapacity: remainingCapacity(viewedSection),
      });
    } catch (error) { say(error); } finally { setBusy(""); }
  };
  const options = (items, ids, labels) => items.map((item) => <option key={get(item, ...ids)} value={get(item, ...ids)}>{get(item, ...labels) ?? "Unnamed"}</option>);
  const openEdit = (student) => { setEditing(student); setEditValues({ groupId: String(student.groupId), programId: String(student.programId), sectionId: String(student.sectionId), rollNo: student.rollNo ?? "" }); };
  return <DashboardLayout title="Section & Roll Allocation" subtitle="Allocate existing students using backend-validated previews." breadcrumb={["People", "Section & Roll Allocation"]}>
    <section className="cms-card allocation-filter-card"><div className="cms-card-body"><div className="allocation-filter-grid">
      <div className="cms-field"><span>Academic Year</span><div className="allocation-year-value">{selectedAcademicYear?.name ?? selectedAcademicYear?.label ?? (academicYearsLoading ? "Loading academic year..." : "Select an Academic Year in the header")}</div></div>
      <Field label="Academic Level" value={filters.academicLevelId} disabled={!selectedBoardId || !selectedAcademicYearId || loading} onChange={(value) => update("academicLevelId", value)}>{options(masters.levels, ["academicLevelId", "AcademicLevelId", "levelId", "LevelId"], ["academicLevelName", "AcademicLevelName", "levelName", "LevelName"])}</Field>
      <Field label="Group" value={filters.groupId} disabled={!filters.academicLevelId} onChange={(value) => update("groupId", value)}>{options(masters.groups, ["groupId", "GroupId"], ["groupName", "GroupName"])}</Field>
      <Field label="Program" value={filters.programId} disabled={!filters.groupId} onChange={(value) => update("programId", value)}>{options(masters.programs, ["programId", "ProgramId", "programmeId", "ProgrammeId"], ["programName", "ProgramName", "programmeName", "ProgrammeName"])}</Field>
      <Field label="Section" value={filters.sectionId} disabled={!filters.programId} onChange={(value) => update("sectionId", value)}>{masters.sections.filter((section) => !isFull(section)).map((section) => <option key={get(section, "sectionId", "SectionId")} value={get(section, "sectionId", "SectionId")}>{get(section, "sectionName", "SectionName")} ({get(section, "allocatedCount", "AllocatedCount") ?? "—"}/{get(section, "maximumStrength", "MaximumStrength") ?? "—"})</option>)}</Field>
    </div>{selectedSection && <div className="allocation-summary"><div className="allocation-summary-item"><span>Target Section</span><strong>{get(selectedSection, "sectionName", "SectionName")}</strong></div><div className="allocation-summary-item"><span>Total Capacity</span><strong>{maximumStrength ?? "—"}</strong></div><div className="allocation-summary-item"><span>Already Allocated</span><strong>{allocatedCount}</strong></div><div className="allocation-summary-item"><span>Available Capacity</span><strong>{remaining ?? "—"}</strong></div><div className="allocation-summary-item"><span>Students to Allocate</span><strong>{pending}</strong></div></div>}<div className="allocation-actions"><button className="cms-btn cms-btn-primary" disabled={!readyContext || Boolean(busy)} onClick={() => preview("section")}><Eye size={16} />{busy === "section-preview" ? "Loading..." : "Preview Section Allocation"}</button><button className="cms-btn cms-btn-ghost" disabled={!readyContext || Boolean(busy) || (!sectionPreview && !sectionConfirmed)} onClick={() => preview("roll")}><Eye size={16} />{busy === "roll-preview" ? "Loading..." : "Preview Roll Numbers"}</button></div></div></section>
    <section className="cms-card"><CardHead title={`Students to Allocate (${unallocated.length})`} text="Students waiting for a section assignment." icon={<Users size={20} />} />{studentLoading ? <Loader label="Loading students to allocate..." /> : <StudentTable students={unallocated} pending />}</section>
    {Boolean(filters.programId) && <section className="cms-card allocation-preview-card"><CardHead title="Available Sections" text={masters.sections.some((section) => !isFull(section)) ? "Choose a target section or view its allocated students." : "No sections with available capacity."} icon={<Users size={20} />} /><div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Section</th><th>Capacity</th><th>Action</th></tr></thead><tbody>{masters.sections.map((section) => <tr key={get(section, "sectionId", "SectionId")}><td>{get(section, "sectionName", "SectionName")}</td><td>{capacityText(section)}{isFull(section) ? " (Full)" : ""}</td><td><button className="cms-btn cms-btn-ghost" disabled={busy === "section-students"} onClick={() => viewStudents(section)}>{busy === "section-students" ? "Loading..." : "View Students"}</button></td></tr>)}</tbody></table></div></section>}
    {sectionPreview && <Preview title="Section Allocation Preview" data={sectionPreview} type="section" busy={busy} onConfirm={() => requestConfirm("section")} />}
    {rollPreview && <Preview title="Roll Number Preview" data={rollPreview} type="roll" busy={busy} onConfirm={() => requestConfirm("roll")} />}
    {confirming && <ConfirmDialog title={`Confirm ${confirming === "section" ? "Section" : "Roll Number"} Allocation`} message="This saves the backend-calculated allocation. Existing section and roll allocations are not changed." confirmLabel={`Confirm ${confirming === "section" ? "Section Allocation" : "Roll Numbers"}`} loading={busy === `${confirming}-confirm`} loadingLabel="Saving..." onCancel={() => !busy && setConfirming("")} onConfirm={confirm} />}
    {editing && <Modal title="Edit Allocation" onClose={() => !busy && setEditing(null)} footer={<><button className="cms-btn cms-btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button className="cms-btn cms-btn-primary" disabled={Boolean(busy) || !editValues.groupId || !editValues.programId || !editValues.sectionId} onClick={saveEdit}>{busy === "edit" ? "Saving..." : "Save Allocation"}</button></>}><div className="allocation-student-summary"><strong>{editing.name}</strong><span>Admission No: {editing.admissionNo}</span><span>Current section: {editing.sectionName || "—"} · Roll No: {editing.rollNo || "—"}</span></div><div className="cms-form-grid"><Field label="New Group" value={editValues.groupId} onChange={(groupId) => setEditValues({ groupId, programId: "", sectionId: "", rollNo: "" })}>{options(masters.groups, ["groupId", "GroupId"], ["groupName", "GroupName"])}</Field><Field label="New Program" value={editValues.programId} onChange={(programId) => setEditValues((current) => ({ ...current, programId, sectionId: "", rollNo: "" }))}>{options(editPrograms, ["programId", "ProgramId"], ["programName", "ProgramName"])}</Field><Field label="New Section" value={editValues.sectionId} onChange={(sectionId) => setEditValues((current) => ({ ...current, sectionId }))}>{options(editSections, ["sectionId", "SectionId"], ["sectionName", "SectionName"])}</Field><label className="cms-field"><span>Roll No {editChanged ? "(assigned by backend)" : "(optional)"}</span><input value={editChanged ? "" : editValues.rollNo} disabled={editChanged} onChange={(event) => setEditValues((current) => ({ ...current, rollNo: event.target.value }))} /></label></div></Modal>}
    {sectionStudents && <Modal title="Allocated Students" onClose={() => setSectionStudents(null)} footer={<button className="cms-btn cms-btn-primary" onClick={() => setSectionStudents(null)}>Close</button>}><div className="allocation-student-summary"><strong>{get(sectionStudents.section, "sectionName", "SectionName")}</strong><span>{capacityText({ ...sectionStudents.section, allocatedCount: sectionStudents.allocatedCount, remainingCapacity: sectionStudents.remainingCapacity })}</span></div><StudentTable students={viewedStudentRows} onEdit={openEdit} /></Modal>}
    <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />
  </DashboardLayout>;
}
function Field({ label, value, disabled, onChange, children }) { return <label className="cms-field"><span>{label} <span className="req">*</span></span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">Select {label}</option>{children}</select></label>; }
function CardHead({ title, text, icon }) { return <div className="cms-card-head allocation-card-head"><div><h3>{title}</h3><p>{text}</p></div>{icon}</div>; }
function StudentTable({ students, onEdit, pending = false }) { const status = (student) => filled(student.rollNo) ? "Roll Allocated" : filled(student.sectionId) || student.sectionName ? "Section Allocated" : "Unallocated"; const columnCount = 4 + (pending ? 0 : 2) + (onEdit ? 1 : 0); return <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Admission No</th><th>Student Name</th><th>Admission Date</th>{!pending && <><th>Section</th><th>Roll No</th></>}<th>Allocation Status</th>{onEdit && <th>Action</th>}</tr></thead><tbody>{students.length ? students.map((student) => <tr key={student.id ?? student.admissionNo}><td>{student.admissionNo || "—"}</td><td className="cms-font-semibold">{student.name || "—"}</td><td>{date(student.admissionDate)}</td>{!pending && <><td>{student.sectionName || "—"}</td><td>{student.rollNo || "—"}</td></>}<td><StatusBadge value={status(student)} /></td>{onEdit && <td><button className="cms-btn cms-btn-ghost" onClick={() => onEdit(student)}><Pencil size={16} />Edit</button></td>}</tr>) : <tr><td colSpan={columnCount}><div className="cms-empty">No students found for this allocation status.</div></td></tr>}</tbody></table></div>; }
function Preview({ title, data, type, busy, onConfirm }) { const students = list(data.students); return <section className="cms-card allocation-preview-card"><CardHead title={title} text="Review the backend-proposed allocation before confirming." icon={<CheckCircle2 size={20} />} />{type === "section" && <div className="allocation-summary">{[["Total Students", data.totalStudents], ["Students to Allocate", data.studentsToAllocate], ["Total Capacity", data.totalCapacity]].map(([label, value]) => <div className="allocation-summary-item" key={label}><span>{label}</span><strong>{value ?? 0}</strong></div>)}</div>}<div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Admission No</th><th>Student Name</th>{type === "section" && <th>Admission Date</th>}<th>Section</th>{type === "roll" && <th>Proposed Roll No</th>}</tr></thead><tbody>{students.map((student, index) => <tr key={get(student, "studentId", "StudentId") ?? index}><td>{get(student, "admissionNo", "AdmissionNo") ?? "—"}</td><td className="cms-font-semibold">{get(student, "studentName", "StudentName") ?? "—"}</td>{type === "section" && <td>{date(get(student, "admissionDate", "AdmissionDate"))}</td>}<td>{get(student, "sectionName", "SectionName") ?? "—"}</td>{type === "roll" && <td>{get(student, "rollNo", "RollNo") ?? "—"}</td>}</tr>)}</tbody></table></div><div className="allocation-preview-footer"><button className="cms-btn cms-btn-primary" disabled={Boolean(busy)} onClick={onConfirm}>Confirm {type === "section" ? "Section Allocation" : "Roll Numbers"}</button></div></section>; }
