import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Download, Eye, FileText, FileUp, ImageUp, Upload } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Modal, StatusBadge, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import "./StudentManagementPage.css";

export const pageConfig = { title: "Student Management", rows: [], fields: [] };
const list = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(data)) return data;
  return data?.data ?? data?.Data ?? data?.items ?? data?.Items ?? data?.results ?? data?.Results ?? data?.$values ?? [];
};
const value = (record, ...keys) => keys.map((key) => record?.[key]).find((item) => item != null && item !== "");
const normalizedName = (item) => String(item ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const hasAssignedValue = (item) => item != null && String(item).trim() !== "" && String(item).trim() !== "—";
const isAdmissionApproved = (admission) => {
  const approval = value(admission, "isApproved", "IsApproved", "approved", "Approved", "approvalStatus", "ApprovalStatus");
  const status = String(value(admission, "status", "Status", "admissionStatus", "AdmissionStatus") ?? "").trim().toLowerCase();
  return approval === true
    || approval === 1
    || String(approval).toLowerCase() === "true"
    || ["approved", "active", "completed"].includes(status);
};
const nameFor = (items, id, idKeys, labelKeys) => value(items.find((item) => String(value(item, ...idKeys)) === String(id)), ...labelKeys) ?? "";
const saveDownload = (data, filename) => {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
const downloadName = (header, fallback) => {
  const match = String(header ?? "").match(/filename\*?=(?:UTF-8''|")?([^;"]+)/i);
  return match?.[1] ? decodeURIComponent(match[1].trim()) : fallback;
};
const selectOptions = (items, idKeys, labelKeys) => list(items).map((item) => ({
  value: String(value(item, ...idKeys) ?? ""),
  label: String(value(item, ...labelKeys) ?? ""),
})).filter((item) => item.value && item.label);

export default function StudentManagementPage() {
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    level: "",
    group: "",
    programme: "",
    section: "",
    status: "",
  });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [importBusy, setImportBusy] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [credentialFilters, setCredentialFilters] = useState({ level: "", group: "", program: "", section: "", admissionNo: "" });
  const [credentialGroups, setCredentialGroups] = useState([]);
  const [credentialPrograms, setCredentialPrograms] = useState([]);
  const [credentialSections, setCredentialSections] = useState([]);
  const [fileAction, setFileAction] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [documentType, setDocumentType] = useState("");
  const [levelOptions, setLevelOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [programmeOptions, setProgrammeOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  useEffect(() => {
    let active = true;
    apiClient
      .get(apiEndpoints.students.getAll)
      .then(({ data }) => {
        const source = Array.isArray(data)
          ? data
          : data?.data || data?.items || data?.results || [];
        const mapped = source.map((x, index) => ({
          ...x,
          id: x.studentId ?? x.id ?? index,
          studentId: x.studentId ?? x.id ?? "—",
          name: x.studentName ?? x.fullName ?? x.name ?? "Unnamed Student",
          admissionNo: x.admissionNo ?? x.admissionNumber ?? "—",
          board: x.boardName ?? x.board ?? "",
          academicYear: x.academicYearName ?? x.academicYear ?? "",
          level: x.academicLevelName ?? x.academicLevel ?? x.levelName ?? "",
          group: x.groupName ?? x.group ?? "",
          programme: x.programmeName ?? x.programName ?? x.programme ?? x.program ?? "",
          section: value(x, "sectionName", "SectionName", "section", "Section", "allocatedSectionName", "AllocatedSectionName", "assignedSectionName", "AssignedSectionName") ?? "",
          roll: value(x, "rollNumber", "RollNumber", "rollNo", "RollNo", "roll", "Roll") ?? "",
          status: x.status ?? x.studentStatus ?? "Pending assignment",
        }));
        return Promise.allSettled([
          apiClient.get(apiEndpoints.admissions.getAll), apiClient.get(apiEndpoints.academicYears.list),
          apiClient.get(apiEndpoints.academicLevels.list), apiClient.get(apiEndpoints.groups.list),
          apiClient.get(apiEndpoints.programs.list), apiClient.get(apiEndpoints.sections.list), apiClient.get(apiEndpoints.boards.list),
        ]).then((responses) => {
          const [admissions, years, levels, groups, programs, sections, boards] = responses.map((response) =>
            response.status === "fulfilled" ? list(response.value.data) : [],
          );
          const byNo = new Map(admissions.map((item) => [String(value(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "").trim(), item]));
          const byStudentId = new Map(admissions.map((item) => [String(value(item, "studentId", "StudentId") ?? ""), item]));
          const admissionName = (item) => value(item, "studentName", "StudentName", "name", "Name", "fullName", "FullName")
            ?? [value(item, "firstName", "FirstName"), value(item, "lastName", "LastName")].filter(Boolean).join(" ");
          const byName = new Map(admissions.map((item) => [normalizedName(admissionName(item)), item]));
          const enriched = mapped.map((student) => {
            const admission = byStudentId.get(String(student.studentId ?? ""))
              ?? byNo.get(String(student.admissionNo ?? "").trim())
              ?? byName.get(normalizedName(student.name));
            const yearId = value(student, "academicYearId", "AcademicYearId") ?? value(admission, "academicYearId", "AcademicYearId");
            const boardId = value(student, "boardId", "BoardId") ?? value(admission, "boardId", "BoardId");
            const levelId = value(student, "academicLevelId", "AcademicLevelId") ?? value(admission, "academicLevelId", "AcademicLevelId");
            const groupId = value(student, "groupId", "GroupId") ?? value(admission, "groupId", "GroupId");
            const programId = value(student, "programId", "ProgramId", "programmeId", "ProgrammeId") ?? value(admission, "programId", "ProgramId", "programmeId", "ProgrammeId");
            const sectionId = value(student, "sectionId", "SectionId", "allocatedSectionId", "AllocatedSectionId", "assignedSectionId", "AssignedSectionId")
              ?? value(admission, "sectionId", "SectionId", "allocatedSectionId", "AllocatedSectionId", "assignedSectionId", "AssignedSectionId")
              ?? value(admission?.section ?? admission?.Section, "sectionId", "SectionId", "id", "Id");
            const section = student.section || value(admission, "sectionName", "SectionName", "allocatedSectionName", "AllocatedSectionName", "assignedSectionName", "AssignedSectionName") || value(admission?.section ?? admission?.Section, "sectionName", "SectionName", "name", "Name") || nameFor(sections, sectionId, ["sectionId", "SectionId", "id"], ["sectionName", "SectionName", "name"]);
            const roll = student.roll || value(admission, "rollNumber", "RollNumber", "rollNo", "RollNo", "roll");
            const admissionApproved = isAdmissionApproved(admission);
            const hasSection = hasAssignedValue(sectionId) || hasAssignedValue(section);
            const hasRollNumber = hasAssignedValue(roll);
            return {
              ...student,
              boardId,
              academicYearId: yearId,
              academicLevelId: levelId,
              groupId,
              programId,
              sectionId,
              board: student.board || value(admission, "boardName", "BoardName") || nameFor(boards, boardId, ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name"]),
              academicYear: student.academicYear || value(admission, "academicYearName", "AcademicYearName") || nameFor(years, yearId, ["academicYearId", "AcademicYearId", "id"], ["academicYearName", "AcademicYearName", "name"]),
              level: student.level || value(admission, "academicLevelName", "AcademicLevelName") || nameFor(levels, levelId, ["academicLevelId", "AcademicLevelId", "id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name"]),
              group: student.group || value(admission, "groupName", "GroupName") || nameFor(groups, groupId, ["groupId", "GroupId", "id"], ["groupName", "GroupName", "name"]),
              programme: student.programme || value(admission, "programName", "ProgramName", "programmeName", "ProgrammeName") || nameFor(programs, programId, ["programId", "ProgramId", "programmeId", "ProgrammeId", "id"], ["programName", "ProgramName", "programmeName", "ProgrammeName", "name"]),
              section,
              roll,
              mobile: student.mobileNumber ?? student.mobile ?? "",
              admissionApproved,
              hasSection,
              hasRollNumber,
              isEligibleForStudentManagement: admissionApproved && hasSection && hasRollNumber,
            };
          });
          const visibleStudents = enriched.filter((student) => student.isEligibleForStudentManagement);
          if (active) setStudents(visibleStudents);
        });
      })
      .catch((e) => active && setError(getApiErrorMessage(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [reloadKey]);
  useEffect(() => {
    setFilters({ level: "", group: "", programme: "", section: "", status: "" });
    setLevelOptions([]); setGroupOptions([]); setProgrammeOptions([]); setSectionOptions([]);
    if (!selectedBoardId) return undefined;
    let active = true;
    apiClient.get(apiEndpoints.boards.academicLevels, { params: { boardId: selectedBoardId } })
      .then((response) => active && setLevelOptions(selectOptions(response.data, ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"])))
      .catch(() => active && setLevelOptions([]));
    return () => { active = false; };
  }, [selectedBoardId]);
  useEffect(() => {
    setFilters((current) => ({ ...current, group: "", programme: "", section: "" }));
    setGroupOptions([]); setProgrammeOptions([]); setSectionOptions([]);
    if (!selectedBoardId || !filters.level) return undefined;
    let active = true;
    apiClient.get(apiEndpoints.groups.getByBoard(selectedBoardId), { params: { academicYearId: selectedAcademicYearId, academicLevelId: filters.level, isActive: true } })
      .then((response) => active && setGroupOptions(selectOptions(response.data, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name"])))
      .catch(() => active && setGroupOptions([]));
    return () => { active = false; };
  }, [filters.level, selectedBoardId, selectedAcademicYearId]);
  useEffect(() => {
    setFilters((current) => ({ ...current, programme: "", section: "" }));
    setProgrammeOptions([]); setSectionOptions([]);
    if (!filters.group) return undefined;
    let active = true;
    apiClient.get(apiEndpoints.groups.programs(filters.group))
      .then((response) => active && setProgrammeOptions(selectOptions(response.data, ["programId", "ProgramId", "programmeId", "ProgrammeId", "id", "Id"], ["programName", "ProgramName", "programmeName", "ProgrammeName", "name", "Name"])))
      .catch(() => active && setProgrammeOptions([]));
    return () => { active = false; };
  }, [filters.group]);
  useEffect(() => {
    setFilters((current) => ({ ...current, section: "" }));
    setSectionOptions([]);
    if (!filters.programme) return undefined;
    let active = true;
    apiClient.get(apiEndpoints.sections.list, { params: { boardId: selectedBoardId, academicYearId: selectedAcademicYearId, academicLevelId: filters.level, groupId: filters.group, programId: filters.programme, ProgramId: filters.programme, IsActive: true } })
      .then((response) => active && setSectionOptions(selectOptions(response.data, ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"])))
      .catch(() => active && setSectionOptions([]));
    return () => { active = false; };
  }, [filters.programme, filters.group, filters.level, selectedBoardId, selectedAcademicYearId]);
  useEffect(() => {
    setCredentialFilters({ level: "", group: "", program: "", section: "", admissionNo: "" });
    setCredentialGroups([]);
    setCredentialPrograms([]);
    setCredentialSections([]);
  }, [selectedBoardId, selectedAcademicYearId]);
  useEffect(() => {
    setCredentialFilters((current) => ({ ...current, group: "", program: "", section: "" }));
    setCredentialGroups([]);
    setCredentialPrograms([]);
    setCredentialSections([]);
    if (!selectedBoardId || !credentialFilters.level) return undefined;
    let active = true;
    apiClient.get(apiEndpoints.groups.getByBoard(selectedBoardId), {
      params: { academicYearId: selectedAcademicYearId, academicLevelId: credentialFilters.level, isActive: true },
    })
      .then((response) => active && setCredentialGroups(selectOptions(response.data, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name"])))
      .catch(() => active && setCredentialGroups([]));
    return () => { active = false; };
  }, [credentialFilters.level, selectedBoardId, selectedAcademicYearId]);
  useEffect(() => {
    setCredentialFilters((current) => ({ ...current, program: "", section: "" }));
    setCredentialPrograms([]);
    setCredentialSections([]);
    if (!credentialFilters.group) return undefined;
    let active = true;
    apiClient.get(apiEndpoints.groups.programs(credentialFilters.group))
      .then((response) => active && setCredentialPrograms(selectOptions(response.data, ["programId", "ProgramId", "programmeId", "ProgrammeId", "id", "Id"], ["programName", "ProgramName", "programmeName", "ProgrammeName", "name", "Name"])))
      .catch(() => active && setCredentialPrograms([]));
    return () => { active = false; };
  }, [credentialFilters.group]);
  useEffect(() => {
    setCredentialFilters((current) => ({ ...current, section: "" }));
    setCredentialSections([]);
    if (!credentialFilters.program) return undefined;
    let active = true;
    apiClient.get(apiEndpoints.sections.list, {
      params: {
        boardId: selectedBoardId,
        academicYearId: selectedAcademicYearId,
        academicLevelId: credentialFilters.level,
        groupId: credentialFilters.group,
        programId: credentialFilters.program,
        ProgramId: credentialFilters.program,
        IsActive: true,
      },
    })
      .then((response) => active && setCredentialSections(selectOptions(response.data, ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"])))
      .catch(() => active && setCredentialSections([]));
    return () => { active = false; };
  }, [credentialFilters.group, credentialFilters.level, credentialFilters.program, selectedBoardId, selectedAcademicYearId]);
  const rows = useMemo(
    () =>
      students.filter(
        (student) =>
          `${student.name} ${student.studentId} ${student.admissionNo} ${student.roll || ""} ${student.mobile}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (!selectedBoardId || String(student.boardId ?? "") === String(selectedBoardId)) &&
          (!selectedAcademicYearId || String(student.academicYearId ?? "") === String(selectedAcademicYearId)) &&
          (!filters.level || String(student.academicLevelId ?? "") === String(filters.level)) &&
          (!filters.group || String(student.groupId ?? "") === String(filters.group)) &&
          (!filters.programme || String(student.programId ?? "") === String(filters.programme)) &&
          (!filters.section || String(student.sectionId ?? "") === String(filters.section)) &&
          (!filters.status || String(student.status || "") === filters.status),
      ),
    [students, query, filters, selectedBoardId, selectedAcademicYearId],
  );
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => setPage(1), [query, filters.level, filters.group, filters.programme, filters.section, filters.status, selectedBoardId, selectedAcademicYearId]);
  const values = (key) => [...new Set(students.map((student) => student[key]).filter(Boolean))];
  const updateFilter = (key, selectedValue) => {
    setFilters((current) => ({
      ...current,
      [key]: selectedValue,
      ...(key === "level" ? { group: "", programme: "", section: "" } : {}),
      ...(key === "group" ? { programme: "", section: "" } : {}),
      ...(key === "programme" ? { section: "" } : {}),
    }));
  };
  const selectedStudent = students.find((student) => String(student.id) === String(selectedStudentId));
  const exportStudents = async (format, studentForPdf = selectedStudent) => {
    setError("");
    setExporting(format);
    try {
      if (format === "pdf") {
        if (!studentForPdf) return;
        const response = await apiClient.get(apiEndpoints.students.exportPdf(studentForPdf.id), { responseType: "blob" });
        saveDownload(response.data, downloadName(response.headers?.["content-disposition"], `Student_${studentForPdf.id}_Profile.pdf`));
        return;
      }
      const filterIds = {
        level: ["academicLevelId", "AcademicLevelId"],
        group: ["groupId", "GroupId"],
        programme: ["programId", "ProgramId", "programmeId", "ProgrammeId"],
        section: ["sectionId", "SectionId"],
      };
      const params = {};
      const paramNames = { level: "AcademicLevelId", group: "GroupId", programme: "ProgramId", section: "SectionId" };
      Object.entries(filterIds).forEach(([filterKey]) => {
        if (!filters[filterKey]) return;
        params[paramNames[filterKey]] = filters[filterKey];
      });
      if (filters.status) params.Status = filters.status;
      if (selectedBoardId) params.BoardId = selectedBoardId;
      if (selectedAcademicYearId) params.AcademicYearId = selectedAcademicYearId;
      const response = await apiClient.get(apiEndpoints.students.exportExcel, { params, responseType: "blob" });
      saveDownload(response.data, downloadName(response.headers?.["content-disposition"], "Students.xlsx"));
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setExporting("");
    }
  };
  const contextParams = () => ({
    ...(selectedBoardId ? { boardId: selectedBoardId } : {}),
    ...(selectedAcademicYearId ? { academicYearId: selectedAcademicYearId } : {}),
    ...(filters.level ? { academicLevelId: filters.level } : {}),
    ...(filters.group ? { groupId: filters.group } : {}),
    ...(filters.programme ? { programId: filters.programme } : {}),
    ...(filters.section ? { sectionId: filters.section } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  });
  const downloadImportFile = async (kind, credentialsParams = contextParams()) => {
    if (importBusy) return;
    if (kind === "credentials" && (!selectedBoardId || !selectedAcademicYearId)) {
      setError("Please select Board and Academic Year.");
      return;
    }
    setError(""); setImportBusy(kind);
    try {
      const endpoint = kind === "template" ? apiEndpoints.students.importTemplate : apiEndpoints.students.importCredentialsPdf;
      const fallback = kind === "template" ? "Student_Import_Template.xlsx" : "Student_Credentials.pdf";
      const response = await apiClient.get(endpoint, { params: kind === "credentials" ? credentialsParams : undefined, responseType: "blob" });
      saveDownload(response.data, downloadName(response.headers?.["content-disposition"], fallback));
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setImportBusy(""); }
  };
  const validateImport = async () => {
    if (!importFile) return setError("Choose an Excel file before validation.");
    if (!importFile.size) return setError("The selected Excel file is empty.");
    setError(""); setImportSuccess(false); setImportBusy("validate");
    try {
      const formData = new FormData(); formData.append("file", importFile);
      const response = await apiClient.post(apiEndpoints.students.importValidate, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setValidationResult(response.data?.data ?? response.data?.Data ?? response.data ?? {});
    } catch (requestError) {
      const validationPayload = requestError?.response?.data;
      if (validationPayload && typeof validationPayload === "object" && Array.isArray(validationPayload.errors ?? validationPayload.Errors)) {
        setValidationResult(validationPayload);
        return;
      }
      const message = getApiErrorMessage(requestError);
      setError(message.includes("does not contain any data rows to import")
        ? "No student records were found in the Students sheet. Add student data below the header/example row, save the Excel file, and upload it again."
        : message);
    }
    finally { setImportBusy(""); }
  };
  const importStudents = async () => {
    if (!importFile || !validationResult) return;
    const invalid = Number(value(validationResult, "invalidRows", "InvalidRows", "invalidCount", "InvalidCount", "failedRows", "FailedRows") ?? 0);
    if (invalid > 0) return setError("Resolve validation errors before importing students.");
    setError(""); setImportSuccess(false); setImportBusy("import");
    try {
      const formData = new FormData(); formData.append("file", importFile);
      const response = await apiClient.post(apiEndpoints.students.importExcel, formData, { params: { allowPartial: false }, headers: { "Content-Type": "multipart/form-data" } });
      const result = response.data?.data ?? response.data?.Data ?? response.data ?? {};
      setValidationResult({ ...result, success: true }); setImportFile(null); setImportSuccess(true); setReloadKey((current) => current + 1); setMessage("Students imported successfully.");
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setImportBusy(""); }
  };
  const uploadStudentFile = async () => {
    if (!fileAction || !uploadFile) return setError("Choose a file to upload.");
    if (fileAction.kind === "document" && !documentType) return setError("Select a document type.");
    const permitted = fileAction.kind === "photo" ? /image\/(jpeg|png)/ : /^(application\/pdf|image\/(jpeg|png))$/;
    if (!permitted.test(uploadFile.type)) return setError(fileAction.kind === "photo" ? "Choose a JPG or PNG photo." : "Choose a PDF, JPG, JPEG, or PNG document.");
    setError(""); setImportBusy("upload");
    try {
      const formData = new FormData(); formData.append("file", uploadFile);
      if (fileAction.kind === "document") formData.append("documentType", documentType);
      await apiClient.post(fileAction.kind === "photo" ? apiEndpoints.students.uploadPhoto(fileAction.student.id) : apiEndpoints.students.uploadDocuments(fileAction.student.id), formData, { headers: { "Content-Type": "multipart/form-data" } });
      setFileAction(null); setUploadFile(null); setDocumentType(""); setReloadKey((current) => current + 1); setMessage(fileAction.kind === "photo" ? "Student photo updated successfully." : "Student document uploaded successfully.");
    } catch (requestError) { setError(getApiErrorMessage(requestError)); }
    finally { setImportBusy(""); }
  };
  const closeImportModal = () => {
    if (importBusy) return;
    setImportOpen(false);
    setImportSuccess(false);
  };
  const importAnotherFile = () => {
    if (importBusy) return;
    setError("");
    setImportFile(null);
    setValidationResult(null);
    setImportSuccess(false);
  };
  const clearCredentialFilters = () => {
    setCredentialFilters({ level: "", group: "", program: "", section: "", admissionNo: "" });
  };
  const credentialsParams = {
    ...(selectedBoardId ? { boardId: selectedBoardId } : {}),
    ...(selectedAcademicYearId ? { academicYearId: selectedAcademicYearId } : {}),
    ...(credentialFilters.level ? { academicLevelId: credentialFilters.level } : {}),
    ...(credentialFilters.group ? { groupId: credentialFilters.group } : {}),
    ...(credentialFilters.program ? { programId: credentialFilters.program } : {}),
    ...(credentialFilters.section ? { sectionId: credentialFilters.section } : {}),
    ...(credentialFilters.admissionNo.trim() ? { admissionNo: credentialFilters.admissionNo.trim() } : {}),
  };
  return (
    <DashboardLayout
      title="Student Management"
      subtitle="View students with completed admission and academic placement."
      breadcrumb={["People"]}
    >
      <section className="cms-card">
        <div className="student-management-filter-row">
          <div className="student-management-filters">
          {[
            ["Academic Level", "level", levelOptions, !selectedBoardId],
            ["Group", "group", groupOptions, !filters.level],
            ["Programme", "programme", programmeOptions, !filters.group],
            ["Section", "section", sectionOptions, !filters.programme],
            ["Status", "status", values("status").map((item) => ({ value: item, label: item })), false],
          ].map(([label, key, options, disabled]) => (
            <label className="cms-field" key={key}>
              <span>{label}</span>
              <select
                value={filters[key]}
                onChange={(event) => updateFilter(key, event.target.value)}
                disabled={disabled}
              >
                <option value="">All {label}s</option>
                {options.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          ))}
          </div>
        </div>
        <div className="student-management-search-row">
          <div className="cms-card-body student-management-toolbar">
            <label className="student-management-search">
              <Search3DIcon size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search student, ID, admission no, roll no or mobile"
              />
            </label>
          </div>
          <div className="student-management-actions">
            <button className="cms-btn cms-btn-ghost" type="button" disabled={Boolean(exporting)} onClick={() => exportStudents("excel")}><Download size={16} /> {exporting === "excel" ? "Exporting..." : "Export Excel"}</button>
            <button className="cms-btn cms-btn-primary" type="button" onClick={() => { setError(""); setImportFile(null); setValidationResult(null); setImportSuccess(false); setImportOpen(true); }}><FileUp size={16} /> Import Students</button>
            <button className="cms-btn cms-btn-ghost" type="button" onClick={() => { setError(""); setCredentialsOpen(true); }}>Credentials</button>
          </div>
        </div>
        <div className="cms-table-wrap student-management-table-wrap">
          <table className="cms-table student-management-table">
            <colgroup>
              <col className="student-col-admission" /><col className="student-col-name" />
              <col className="student-col-year" /><col className="student-col-level" /><col className="student-col-group" />
              <col className="student-col-programme" /><col className="student-col-section" /><col className="student-col-roll" />
              <col className="student-col-status" /><col className="student-col-actions" />
            </colgroup>
            <thead>
              <tr>
                {[
                  "Admission No",
                  "Student Name",
                  "Academic Year",
                  "Academic Level",
                  "Group",
                  "Programme",
                  "Section",
                  "Roll No",
                  "Status",
                  "Actions",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10"><div className="cms-empty">Loading approved students...</div></td></tr>
              ) : pageRows.length ? (
                pageRows.map((s) => (
                  <tr key={s.id} onClick={() => setSelectedStudentId(String(s.id))}>
                    <td>{s.admissionNo}</td>
                    <td className="cms-font-semibold">{s.name}</td>
                    <td>{s.academicYear || "—"}</td>
                    <td>{s.level || "—"}</td>
                    <td>{s.group || "—"}</td>
                    <td>{s.programme || "—"}</td>
                    <td>{s.section || "—"}</td>
                    <td>{s.roll || "—"}</td>
                    <td>
                      <StatusBadge value={s.status || "Pending assignment"} />
                    </td>
                    <td>
                    <div className="student-action-buttons">
                      <button type="button" aria-label={`Export ${s.name} PDF`} title="Export PDF" disabled={Boolean(exporting)} onClick={() => { setSelectedStudentId(String(s.id)); exportStudents("pdf", s); }}><FileText size={16} /></button>
                        <Link to={`/dashboard/students/${s.id}`} aria-label="View student" title="View student">
                          <Eye size={16} />
                        </Link>
                        <button type="button" aria-label={`Upload photo for ${s.name}`} title="Upload or replace photo" onClick={() => { setError(""); setFileAction({ kind: "photo", student: s }); }}><ImageUp size={16} /></button>
                        <button type="button" aria-label={`Upload documents for ${s.name}`} title="Upload documents" onClick={() => { setError(""); setFileAction({ kind: "document", student: s }); }}><Upload size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10">
                    <div className="cms-empty">{error || "No approved students match your search."}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!loading && <footer className="student-management-pagination">
          <span>
            Showing {rows.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, rows.length)} of {rows.length} students
          </span>
          <div className="student-management-pagination-actions">
            <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
          </div>
        </footer>}
      </section>
      {importOpen && (
        <Modal
          title="Import Students"
          size="lg"
          onClose={closeImportModal}
          footer={<>
            <button className="cms-btn cms-btn-ghost" type="button" disabled={Boolean(importBusy)} onClick={closeImportModal}>Close</button>
            {importSuccess ? <button className="cms-btn cms-btn-primary" type="button" disabled={Boolean(importBusy)} onClick={importAnotherFile}>Import Another File</button> : <button className="cms-btn cms-btn-primary" type="button" disabled={!importFile || !validationResult || Boolean(importBusy) || Number(value(validationResult, "invalidRows", "InvalidRows", "invalidCount", "InvalidCount", "failedRows", "FailedRows") ?? 0) > 0} onClick={importStudents}>{importBusy === "import" ? "Importing..." : "Import Students"}</button>}
          </>}
        >
          <div className="student-import-modal">
            <div className="student-import-actions">
              <button className="cms-btn cms-btn-ghost" type="button" disabled={Boolean(importBusy)} onClick={() => downloadImportFile("template")}>{importBusy === "template" ? "Downloading..." : "Download Import Template"}</button>
              <label className="cms-btn cms-btn-ghost">Choose Excel File
                <input type="file" accept=".xlsx,.xls" hidden onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setImportFile(file);
                  setValidationResult(null);
                  setImportSuccess(false);
                }} />
              </label>
              <button className="cms-btn cms-btn-primary" type="button" disabled={!importFile || Boolean(importBusy)} onClick={validateImport}>{importBusy === "validate" ? "Validating..." : "Validate File"}</button>
            </div>
            {importFile ? <p className="cms-muted">Selected file: {importFile.name}</p> : null}
            {importSuccess ? <p className="cms-success-message" role="status">✓ Students imported successfully</p> : null}
            {validationResult ? <ImportValidation result={validationResult} onCredentials={() => downloadImportFile("credentials")} downloading={importBusy === "credentials"} /> : null}
          </div>
        </Modal>
      )}
      {credentialsOpen && (
        <Modal
          title="Student Credentials"
          size="md"
          onClose={() => !importBusy && setCredentialsOpen(false)}
          footer={<>
            <button className="cms-btn cms-btn-ghost" type="button" disabled={Boolean(importBusy)} onClick={clearCredentialFilters}>Clear</button>
            <button className="cms-btn cms-btn-primary" type="button" disabled={Boolean(importBusy)} onClick={() => downloadImportFile("credentials", credentialsParams)}>{importBusy === "credentials" ? "Downloading..." : "Download Credentials PDF"}</button>
          </>}
        >
          <div className="student-credentials-modal">
            <p className="student-credentials-subtitle">Generate onboarding slips for legacy imported students</p>
            <div className="student-credentials-filters">
              <label className="cms-field"><span>Academic Level</span><select value={credentialFilters.level} onChange={(event) => setCredentialFilters((current) => ({ ...current, level: event.target.value }))}><option value="">All Academic Levels</option>{levelOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="cms-field"><span>Group</span><select value={credentialFilters.group} disabled={!credentialFilters.level} onChange={(event) => setCredentialFilters((current) => ({ ...current, group: event.target.value }))}><option value="">All Groups</option>{credentialGroups.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="cms-field"><span>Program</span><select value={credentialFilters.program} disabled={!credentialFilters.group} onChange={(event) => setCredentialFilters((current) => ({ ...current, program: event.target.value }))}><option value="">All Programs</option>{credentialPrograms.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="cms-field"><span>Section</span><select value={credentialFilters.section} disabled={!credentialFilters.program} onChange={(event) => setCredentialFilters((current) => ({ ...current, section: event.target.value }))}><option value="">All Sections</option>{credentialSections.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="cms-field"><span>Admission No</span><input value={credentialFilters.admissionNo} placeholder="Enter Admission No" onChange={(event) => setCredentialFilters((current) => ({ ...current, admissionNo: event.target.value }))} /></label>
            </div>
            <section className="student-credentials-about" aria-label="About the Credential PDF">
              <h3>About the Credential PDF</h3>
              <ul>
                {["Student Name", "Admission No / Login ID", "Academic Details", "Temporary Password", "First-login password change notice"].map((item) => <li key={item}><CheckCircle2 size={16} aria-hidden="true" />{item}</li>)}
              </ul>
            </section>
          </div>
        </Modal>
      )}
      {fileAction && <Modal title={fileAction.kind === "photo" ? "Upload Student Photo" : "Upload Student Document"} size="sm" onClose={() => !importBusy && setFileAction(null)} footer={<><button className="cms-btn cms-btn-ghost" type="button" disabled={Boolean(importBusy)} onClick={() => setFileAction(null)}>Cancel</button><button className="cms-btn cms-btn-primary" type="button" disabled={!uploadFile || Boolean(importBusy) || (fileAction.kind === "document" && !documentType)} onClick={uploadStudentFile}>{importBusy === "upload" ? "Uploading..." : "Upload"}</button></>}><div className="student-import-modal"><p className="cms-muted">{fileAction.student.name} · {fileAction.student.admissionNo}</p>{fileAction.kind === "document" ? <label className="cms-field"><span>Document Type <span className="req">*</span></span><select value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="">Select document type</option>{["BirthCertificate", "TransferCertificate", "StudyCertificate", "AadhaarDocument", "CommunityCertificate", "IncomeCertificate", "CasteCertificate", "TenthCertificate", "MarksMemo"].map((type) => <option key={type} value={type}>{type}</option>)}</select></label> : null}<label className="cms-field"><span>File <span className="req">*</span></span><input type="file" accept={fileAction.kind === "photo" ? "image/jpeg,image/jpg,image/png" : ".pdf,image/jpeg,image/jpg,image/png"} onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} /></label></div></Modal>}
      <Toast message={error || message} type={error ? "error" : "success"} onClose={() => { setError(""); setMessage(""); }} />
    </DashboardLayout>
  );
}

function ImportValidation({ result, onCredentials, downloading }) {
  const resultErrors = list(value(result, "errors", "Errors") ?? []);
  const resultRows = list(value(result, "rows", "Rows", "validationRows", "ValidationRows", "details", "Details") ?? []);
  const rows = resultRows.length ? resultRows : resultErrors.map((error) => ({
    rowNumber: value(error, "rowNumber", "RowNumber", "row", "Row"),
    admissionNo: value(error, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber"),
    studentName: value(error, "studentName", "StudentName", "name", "Name"),
    status: "Invalid",
    errors: value(error, "errorMessage", "ErrorMessage", "error", "Error") ?? "Validation failed.",
  }));
  const total = value(result, "totalRows", "TotalRows", "totalCount", "TotalCount") ?? rows.length;
  const valid = value(result, "validRows", "ValidRows", "validCount", "ValidCount", "successfulRows", "SuccessfulRows") ?? "—";
  const invalid = value(result, "invalidRows", "InvalidRows", "invalidCount", "InvalidCount", "failedRows", "FailedRows") ?? "—";
  return <div className="student-import-results"><div className="student-import-summary"><span>Total Rows <b>{total}</b></span><span>Valid Rows <b>{valid}</b></span><span>Invalid Rows <b>{invalid}</b></span></div>{rows.length ? <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Row Number</th><th>Admission No</th><th>Student Name</th><th>Status</th><th>Errors</th></tr></thead><tbody>{rows.map((row, index) => <tr key={value(row, "rowNumber", "RowNumber", "row", "Row") ?? index}><td>{value(row, "rowNumber", "RowNumber", "row", "Row") ?? index + 1}</td><td>{value(row, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "—"}</td><td>{value(row, "studentName", "StudentName", "name", "Name") ?? "—"}</td><td>{value(row, "status", "Status", "isValid", "IsValid") === false ? "Invalid" : value(row, "status", "Status") ?? "Valid"}</td><td>{Array.isArray(value(row, "errors", "Errors")) ? value(row, "errors", "Errors").join(", ") : value(row, "errors", "Errors", "error", "Error") ?? "—"}</td></tr>)}</tbody></table></div> : null}{value(result, "importedRows", "ImportedRows", "success", "Success") ? <button className="cms-btn cms-btn-ghost" type="button" disabled={downloading} onClick={onCredentials}>{downloading ? "Downloading..." : "Download Credentials PDF"}</button> : null}</div>;
}
