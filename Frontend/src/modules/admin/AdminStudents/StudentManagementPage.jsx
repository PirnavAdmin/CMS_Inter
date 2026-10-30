import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { CheckCircle2, Download, Eye, FileText, FileUp, Search, Upload } from "lucide-react";
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { Modal, SkeletonRow, StatusBadge, Toast } from "@/shared/components/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { fetchAdminGroups, fetchAdminLevels } from "@/api/studentApi.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
import "./StudentManagementPage.css";

export const pageConfig = { title: "Student Management", rows: [], fields: [] };
const STUDENT_PAGE_SIZE = 5;
const list = (payload) => {
  let source = payload;
  for (let depth = 0; depth < 5 && source; depth += 1) {
    if (Array.isArray(source)) return source;
    const next = source.data ?? source.Data ?? source.items ?? source.Items ?? source.results ?? source.Results ?? source.$values;
    if (next == null || next === source) break;
    source = next;
  }
  return [];
};
const value = (record, ...keys) => keys.map((key) => record?.[key]).find((item) => item != null && item !== "");
const flagIsTrue = (flag) => flag === true || flag === 1 || ["true", "1"].includes(String(flag ?? "").trim().toLowerCase());
const flagIsFalse = (flag) => flag === false || flag === 0 || ["false", "0"].includes(String(flag ?? "").trim().toLowerCase());
const isEligibleAdmission = (admission) => {
  const status = String(value(admission, "status", "Status", "admissionStatus", "AdmissionStatus") ?? "").trim().toLowerCase();
  return flagIsTrue(value(admission, "isApproved", "IsApproved"))
    && flagIsTrue(value(admission, "isVerified", "IsVerified"))
    && !flagIsTrue(value(admission, "isRejected", "IsRejected"))
    && !flagIsFalse(value(admission, "isActive", "IsActive"))
    && (!status || status === "approved");
};
const admissionKey = (record) => String(value(record, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "").trim().toLowerCase();
const matchesStudentContext = (record, params) => ["campusId", "boardId", "academicYearId", "academicLevelId", "groupId", "programId", "sectionId"].every((key) => {
  if (params[key] == null || params[key] === "") return true;
  const actual = value(record, key, key[0].toUpperCase() + key.slice(1));
  return actual == null || String(actual) === String(params[key]);
});
const hasCompletedPlacement = (record) => {
  const sectionId = Number(value(record, "sectionId", "SectionId", "allocatedSectionId", "AllocatedSectionId", "assignedSectionId", "AssignedSectionId"));
  const roll = value(record, "rollNumber", "RollNumber", "rollNo", "RollNo", "roll", "Roll");
  if (!["string", "number"].includes(typeof roll)) return false;
  const normalizedRoll = String(roll).trim().toLowerCase();
  return Number.isInteger(sectionId) && sectionId > 0 && Boolean(normalizedRoll)
    && !["-", "—", "–", "null", "undefined", "n/a", "not assigned", "unassigned", "unallocated", "pending"].includes(normalizedRoll)
    && !/^0+$/.test(normalizedRoll);
};
const admissionSequence = (record) => {
  const admission = String(value(record, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "");
  const suffix = admission.match(/(\d+)\s*$/);
  return suffix ? Number(suffix[1]) : -1;
};
const loadStudentsForNumberOrder = async (url, { params }) => {
  const { campusId, boardId, academicYearId, academicLevelId, groupId, programId } = params;
  const admissionsResponse = await apiClient.get(apiEndpoints.admissions.getAll, {
    params: { campusId, boardId, academicYearId, academicLevelId, groupId, programId },
  });
  const admissionContext = { campusId, boardId, academicYearId, academicLevelId, groupId, programId };
  const admissionsByNumber = new Map();
  list(admissionsResponse.data).filter((admission) => matchesStudentContext(admission, admissionContext)).forEach((admission) => {
    const key = admissionKey(admission);
    if (key) admissionsByNumber.set(key, admissionsByNumber.has(key) ? null : admission);
  });
  const records = [];
  const fetchSize = 100;
  let previousPage = "";
  for (let pageNumber = 1; ; pageNumber += 1) {
    const response = await apiClient.get(url, { params: { ...params, pageNumber, pageSize: fetchSize } });
    const payload = response.data?.data ?? response.data?.Data ?? response.data ?? {};
    const batch = list(payload);
    const fingerprint = JSON.stringify(batch.map((record) => value(record, "studentId", "StudentId", "id", "Id") ?? admissionKey(record)));
    if (batch.length && fingerprint === previousPage) throw new Error("The server repeated a student list page. Refresh and try again.");
    previousPage = fingerprint;
    records.push(...batch);
    const total = payload.totalCount ?? payload.TotalCount ?? response.data?.totalCount ?? response.data?.TotalCount;
    if (!batch.length || (total != null ? records.length >= Number(total) : Array.isArray(response.data) || batch.length < fetchSize)) break;
    if (pageNumber >= 100) throw new Error("Unable to verify the complete student list. Narrow your filters and try again.");
  }
  const eligibleRecords = records.filter((record) => {
    const studentId = Number(value(record, "studentId", "StudentId", "id", "Id"));
    return Number.isInteger(studentId) && studentId > 0 && matchesStudentContext(record, params)
      && hasCompletedPlacement(record) && isEligibleAdmission(admissionsByNumber.get(admissionKey(record)));
  });
  eligibleRecords.sort((a, b) => admissionSequence(b) - admissionSequence(a)
    || Number(value(b, "studentId", "StudentId", "id", "Id") ?? 0) - Number(value(a, "studentId", "StudentId", "id", "Id") ?? 0));
  return { data: { items: eligibleRecords, totalCount: eligibleRecords.length, totalPages: Math.max(1, Math.ceil(eligibleRecords.length / STUDENT_PAGE_SIZE)) } };
};
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
  const location = useLocation();
  const restoredState = location.state?.studentManagement;
  const restoringFilters = useRef(Boolean(restoredState));
  const { selectedBoardId, selectedAcademicYearId } = useAcademicContext();
  const { selectedCampusId } = useCampusContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const studentModal = searchParams.get("modal");
  const uploadStudentId = searchParams.get("studentId") || "";
  const uploadRequested = studentModal === "document" || studentModal === "photo";
  const uploadScope = JSON.stringify([selectedCampusId, selectedBoardId, selectedAcademicYearId, uploadStudentId]);
  const [uploadStudent, setUploadStudent] = useState(null);
  const [uploadLoadError, setUploadLoadError] = useState("");
  const navigateStudentModal = (modal, studentId) => setSearchParams((previous) => {
    const params = new URLSearchParams(previous);
    if (modal) params.set("modal", modal); else params.delete("modal");
    if (studentId) params.set("studentId", String(studentId)); else params.delete("studentId");
    return params;
  });
  const [query, setQuery] = useState(restoredState?.query ?? "");
  const [filters, setFilters] = useState(restoredState?.filters ?? {
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
  const importOpen = studentModal === "import";
  const setImportOpen = (open) => navigateStudentModal(open ? "import" : null);
  const [importFile, setImportFile] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [importBusy, setImportBusy] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  const credentialsOpen = studentModal === "credentials";
  const setCredentialsOpen = (open) => navigateStudentModal(open ? "credentials" : null);
  const [credentialFilters, setCredentialFilters] = useState({ level: "", group: "", program: "", section: "", admissionNo: "" });
  const [credentialGroups, setCredentialGroups] = useState([]);
  const [credentialPrograms, setCredentialPrograms] = useState([]);
  const [credentialSections, setCredentialSections] = useState([]);
  const fileAction = uploadRequested && uploadStudent?.scope === uploadScope ? { kind: studentModal, student: uploadStudent.student } : null;
  const setFileAction = (action) => {
    if (action) setUploadStudent({ scope: JSON.stringify([selectedCampusId, selectedBoardId, selectedAcademicYearId, String(action.student.id)]), student: action.student });
    navigateStudentModal(action?.kind, action?.student?.id);
  };
  const [uploadFile, setUploadFile] = useState(null);
  const [documentType, setDocumentType] = useState("");
  const [levelOptions, setLevelOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState("");
  const [programmeOptions, setProgrammeOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [page, setPage] = useState(restoredState?.page ?? 1);

  useEffect(() => {
    setUploadFile(null);
    setDocumentType("");
    if (!uploadRequested || uploadStudent?.scope === uploadScope) return;
    let active = true;
    setUploadLoadError("");
    if (!/^[1-9]\d*$/.test(uploadStudentId)) { setUploadLoadError("Invalid student ID."); return; }
    apiClient.get(apiEndpoints.students.getById(uploadStudentId)).then(({ data }) => {
      const record = data?.data ?? data?.Data ?? data;
      if (!record || typeof record !== "object" || String(value(record, "studentId", "StudentId", "id", "Id")) !== uploadStudentId) throw new Error("Student record was not found.");
      if (!matchesStudentContext(record, { campusId: selectedCampusId, boardId: selectedBoardId, academicYearId: selectedAcademicYearId })) throw new Error("Student is unavailable in the current context.");
      if (active) setUploadStudent({ scope: uploadScope, student: { ...record, id: uploadStudentId, name: value(record, "studentName", "StudentName", "fullName", "FullName", "name", "Name") ?? "Unnamed Student", admissionNo: value(record, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "—" } });
    }).catch((error) => { if (active) setUploadLoadError(getApiErrorMessage(error)); });
    return () => { active = false; };
  }, [studentModal, uploadRequested, uploadStudentId, uploadScope, uploadStudent?.scope, selectedCampusId, selectedBoardId, selectedAcademicYearId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { restoringFilters.current = false; }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    if (!selectedCampusId || !selectedBoardId || !selectedAcademicYearId) {
      setStudents([]);
      setLoading(false);
      return () => { active = false; };
    }
    loadStudentsForNumberOrder(apiEndpoints.students.list, {
        params: {

          boardId: selectedBoardId,
          academicYearId: selectedAcademicYearId,
          ...(filters.level ? { academicLevelId: filters.level } : {}),
          ...(filters.group ? { groupId: filters.group } : {}),
          ...(filters.programme ? { programId: filters.programme } : {}),
          ...(filters.section ? { sectionId: filters.section } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          campusId: selectedCampusId,
        },
      })
      .then(({ data }) => {
        const payload = data?.data ?? data?.Data ?? data ?? {};
        const source = Array.isArray(payload)
          ? payload
          : payload.items ?? payload.Items ?? payload.results ?? payload.Results ?? [];
        const mapped = source.map((x, index) => ({
          ...x,
          id: value(x, "studentId", "StudentId", "id", "Id") ?? index,
          studentId: value(x, "studentId", "StudentId", "id", "Id") ?? "—",
          name: value(x, "studentName", "StudentName", "fullName", "FullName", "name", "Name") ?? "Unnamed Student",
          admissionNo: value(x, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "—",
          board: value(x, "boardName", "BoardName", "board", "Board") ?? "",
          academicYear: value(x, "academicYearName", "AcademicYearName", "academicYear", "AcademicYear") ?? "",
          level: value(x, "academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel", "levelName", "LevelName") ?? "",
          group: value(x, "groupName", "GroupName", "group", "Group") ?? "",
          programme: value(x, "programmeName", "ProgrammeName", "programName", "ProgramName", "programme", "program") ?? "",
          section: value(x, "sectionName", "SectionName", "section", "Section", "allocatedSectionName", "AllocatedSectionName", "assignedSectionName", "AssignedSectionName") ?? `Section ${value(x, "sectionId", "SectionId")}`,
          roll: String(value(x, "rollNumber", "RollNumber", "rollNo", "RollNo", "roll", "Roll") ?? "").trim(),
          mobile: value(x, "mobileNumber", "MobileNumber", "mobile", "Mobile") ?? "",
          status: value(x, "status", "Status", "studentStatus", "StudentStatus") ?? "Pending assignment",
        }));
        if (!active) return;
        setStudents(mapped);
      })
      .catch((e) => {
        if (!active) return;
        setStudents([]);
        setError(getApiErrorMessage(e));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filters.level, filters.group, filters.programme, filters.section, filters.status, reloadKey, selectedCampusId, selectedBoardId, selectedAcademicYearId]);
  useEffect(() => {
    if (!restoringFilters.current) {
      setQuery("");
      setFilters({ level: "", group: "", programme: "", section: "", status: "" });
      setPage(1);
    }
    setLevelOptions([]); setGroupOptions([]); setProgrammeOptions([]); setSectionOptions([]);
    if (!selectedBoardId) return undefined;
    let active = true;
    fetchAdminLevels({ boardId: selectedBoardId, academicYearId: selectedAcademicYearId })
      .then((levels) => active && setLevelOptions(selectOptions(levels, ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"])))
      .catch(() => active && setLevelOptions([]));
    return () => { active = false; };
  }, [selectedCampusId, selectedBoardId, selectedAcademicYearId]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const enabled = Boolean(selectedBoardId && selectedAcademicYearId && filters.level);
    setGroupOptions([]);
    setGroupsLoading(enabled);
    setGroupsError("");
    if (!enabled) return () => controller.abort();
    fetchAdminGroups({ boardId: selectedBoardId, academicYearId: selectedAcademicYearId, campusId: selectedCampusId }, { signal: controller.signal })
      .then((groups) => {
        if (!active) return;
        const options = selectOptions(groups, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name"]);
        setGroupOptions(options);
        setFilters((current) => current.group && !options.some((option) => option.value === String(current.group))
          ? { ...current, group: "", programme: "", section: "" } : current);
        if (!options.length) setGroupsError("No active groups available for this board and academic year.");
      }).catch((error) => { if (active) setGroupsError(getApiErrorMessage(error)); })
      .finally(() => { if (active) setGroupsLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [filters.level, selectedCampusId, selectedBoardId, selectedAcademicYearId]);
  useEffect(() => {
    if (!restoringFilters.current) setFilters((current) => ({ ...current, programme: "", section: "" }));
    setProgrammeOptions([]); setSectionOptions([]);
    if (!filters.group) return undefined;
    let active = true;
    apiClient.get(apiEndpoints.groups.programs(filters.group))
      .then((response) => active && setProgrammeOptions(selectOptions(response.data, ["programId", "ProgramId", "programmeId", "ProgrammeId", "id", "Id"], ["programName", "ProgramName", "programmeName", "ProgrammeName", "name", "Name"])))
      .catch(() => active && setProgrammeOptions([]));
    return () => { active = false; };
  }, [filters.group]);
  useEffect(() => {
    setSectionOptions([]);
    if (!filters.programme) return undefined;
    let active = true;
    apiClient.get(apiEndpoints.sections.list, { params: { boardId: selectedBoardId, academicYearId: selectedAcademicYearId, academicLevelId: filters.level, groupId: filters.group, programId: filters.programme, ProgramId: filters.programme, IsActive: true } })
      .then((response) => {
        if (!active) return;
        if (response.data?.success === false) throw new Error(response.data.message || "Unable to load sections.");
        const options = selectOptions(response.data, ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"]);
        setSectionOptions(options);
        setFilters((current) => current.section && !options.some((option) => option.value === String(current.section)) ? { ...current, section: "" } : current);
      })
      .catch(() => active && setSectionOptions([]));
    return () => { active = false; };
  }, [filters.programme, filters.group, filters.level, selectedBoardId, selectedAcademicYearId]);
  useEffect(() => {
    setCredentialFilters({ level: "", group: "", program: "", section: "", admissionNo: "" });
    setCredentialGroups([]);
    setCredentialPrograms([]);
    setCredentialSections([]);
  }, [selectedCampusId, selectedBoardId, selectedAcademicYearId]);
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
  const pageSize = STUDENT_PAGE_SIZE;
  const matchingStudents = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    if (!searchText) return students;
    return students.filter((student) => [student.name, student.studentId, student.admissionNo, student.roll, student.mobile]
      .some((field) => String(field ?? "").toLowerCase().includes(searchText)));
  }, [students, query]);
  const studentTotalCount = matchingStudents.length;
  const totalPages = Math.max(1, Math.ceil(studentTotalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = matchingStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageRows = rows;
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  useEffect(() => { if (!restoringFilters.current) setPage(1); }, [query, filters.level, filters.group, filters.programme, filters.section, filters.status, selectedCampusId, selectedBoardId, selectedAcademicYearId]);
  const updateFilter = (key, selectedValue) => {
    setFilters((current) => ({
      ...current,
      [key]: selectedValue,
      ...(key === "level" && !selectedValue ? { group: "", programme: "", section: "" } : {}),
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
      if (!matchingStudents.length) throw new Error("No students with approved, verified admissions and completed section and roll number allocation are available to export.");
      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.json_to_sheet(matchingStudents.map((student) => ({
        "Admission No": student.admissionNo,
        "Student Name": student.name,
        "Academic Year": student.academicYear,
        "Academic Level": student.level,
        Group: student.group,
        Programme: student.programme,
        Section: student.section,
        "Roll No": student.roll,
        Status: student.status,
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Students");
      XLSX.writeFile(workbook, "Students.xlsx");
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
            ["Group", "group", groupOptions, !filters.level || groupsLoading],
            ["Programme", "programme", programmeOptions, !filters.group],
            ["Section", "section", sectionOptions, !filters.programme],
          ].map(([label, key, options, disabled]) => (
            <label className="cms-field" key={key}>
              <span>{label}</span>
              <select
                value={filters[key]}
                onChange={(event) => updateFilter(key, event.target.value)}
                disabled={disabled}
              >
                <option value="">{key === "group" && groupsLoading ? "Loading groups..." : key === "group" && groupsError ? "Groups unavailable" : `All ${label}s`}</option>
                {options.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              {key === "group" && groupsError && <small role="alert">{groupsError}</small>}
            </label>
          ))}
          </div>
        </div>
        <div className="student-management-search-row">
          <div className="cms-card-body student-management-toolbar">
            <label className="student-management-search">
              <Search size={18} />
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
                Array.from({ length: 5 }, (_, index) => <SkeletonRow key={index} columns={10} />)
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
                        <button
                          type="button"
                          aria-label={`Export ${s.name} PDF`}
                          title="Export PDF"
                          disabled={Boolean(exporting)}
                          onClick={() => {
                            setSelectedStudentId(String(s.id));
                            exportStudents("pdf", s);
                          }}
                        >
                          <FileText size={16} />
                        </button>
                        <Link to={`/dashboard/students/${s.id}`} state={{ studentManagement: { query, filters, page: currentPage } }} aria-label="View student" title="View student">
                          <Eye size={16} />
                        </Link>
                        <button
                          type="button"
                          aria-label={`Upload document for ${s.name}`}
                          title="Upload document"
                          onClick={() => {
                            setError("");
                            setFileAction({ kind: "document", student: s });
                          }}
                        >
                          <Upload size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10">
                    <div className="cms-empty">{error || "No students with approved, verified admissions and completed section and roll number allocation match your search."}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!loading && <footer className="student-management-pagination">
          <span>
            Showing {rows.length ? (currentPage - 1) * pageSize + 1 : 0}-{rows.length ? Math.min((currentPage - 1) * pageSize + rows.length, studentTotalCount) : 0} of {studentTotalCount} students
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
          className="student-import-dialog"
          onClose={closeImportModal}
          footer={<>
            <button className="cms-btn cms-btn-ghost" type="button" disabled={Boolean(importBusy)} onClick={closeImportModal}>Close</button>
            {importSuccess ? <button className="cms-btn cms-btn-primary" type="button" disabled={Boolean(importBusy)} onClick={importAnotherFile}>Import Another File</button> : <button className="cms-btn cms-btn-primary" type="button" disabled={!importFile || !validationResult || Boolean(importBusy) || Number(value(validationResult, "invalidRows", "InvalidRows", "invalidCount", "InvalidCount", "failedRows", "FailedRows") ?? 0) > 0} onClick={importStudents}>{importBusy === "import" ? "Importing..." : "Import Students"}</button>}
          </>}
        >
          <div className="student-import-modal">
            <div className="student-import-actions">
              <section className="student-import-step">
                <div className="student-import-step-head"><b>1</b><div><h4>Download Import Template</h4><p>Download the Excel template and fill in the student details.</p></div></div>
              <button className="cms-btn cms-btn-ghost" type="button" disabled={Boolean(importBusy)} onClick={() => downloadImportFile("template")}>{importBusy === "template" ? "Downloading..." : "Download Import Template"}</button>
              </section>
              <section className="student-import-step">
                <div className="student-import-step-head"><b>2</b><div><h4>Upload Student File</h4><p>Choose the completed .xlsx or .xls file containing student records.</p></div></div>
              <label className="cms-btn cms-btn-ghost">Choose Excel File
                <input type="file" accept=".xlsx,.xls" hidden onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setImportFile(file);
                  setValidationResult(null);
                  setImportSuccess(false);
                }} />
              </label>
                {importFile ? <p className="cms-muted student-import-filename">Selected file: {importFile.name}</p> : null}
              </section>
              <section className="student-import-step">
                <div className="student-import-step-head"><b>3</b><div><h4>Validate File</h4><p>Check the file and review validation results before importing.</p></div></div>
              <button className="cms-btn cms-btn-primary" type="button" disabled={!importFile || Boolean(importBusy)} onClick={validateImport}>{importBusy === "validate" ? "Validating..." : "Validate File"}</button>
              </section>
            </div>
            {importSuccess ? <p className="cms-success-message" role="status">✓ Students imported successfully</p> : null}
            {validationResult ? <ImportValidation result={validationResult} onCredentials={() => downloadImportFile("credentials")} downloading={importBusy === "credentials"} /> : null}
          </div>
        </Modal>
      )}
      {uploadRequested && !fileAction && <Modal title={studentModal === "photo" ? "Upload Student Photo" : "Upload Student Document"} size="sm" onClose={() => navigateStudentModal(null)} footer={<button className="cms-btn cms-btn-ghost" type="button" onClick={() => navigateStudentModal(null)}>Cancel</button>}><p role={uploadLoadError ? "alert" : "status"}>{uploadLoadError || "Loading student..."}</p></Modal>}
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
