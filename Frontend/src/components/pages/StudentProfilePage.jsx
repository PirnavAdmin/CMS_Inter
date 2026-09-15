import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { StatusBadge } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { env } from "@/config/env.js";
import "./StudentManagementPage.css";

const Card = ({ title, children }) => <section className="cms-card"><div className="cms-card-head"><h2>{title}</h2></div><div className="cms-card-body">{children}</div></section>;
const Details = ({ items }) => <div className="cms-kv">{items.map(([key, value]) => <div key={key}><span>{key}</span><strong>{value || "—"}</strong></div>)}</div>;
const read = (record, ...keys) => keys.map((key) => record?.[key]).find((value) => value != null && value !== "");
const rows = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload;
  return Array.isArray(data) ? data : data?.data ?? data?.items ?? data?.results ?? [];
};
const resolvePhotoUrl = (value, version) => {
  const path = String(value ?? "").trim();
  if (!path) return "";
  const resolved = /^(?:https?:|blob:|data:)/i.test(path) ? path : `${env.apiBaseUrl.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
  if (/^(?:blob:|data:)/i.test(resolved)) return resolved;
  return `${resolved}${resolved.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
};

export default function StudentProfilePage({ id }) {
  const [student, setStudent] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [photoFailed, setPhotoFailed] = useState(false), [photoObjectUrl, setPhotoObjectUrl] = useState("");
  useEffect(() => {
    let active = true;
    apiClient.get(apiEndpoints.students.getById(id)).then(async ({ data }) => {
      const record = data?.data ?? data?.Data ?? data;
      if (!record || typeof record !== "object") throw new Error("Student record was not found.");
      const admissionNo = String(read(record, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "").trim();
      const studentId = String(read(record, "studentId", "StudentId", "id", "Id") ?? id);
      const [admissionsResponse, sectionsResponse] = await Promise.all([
        apiClient.get(apiEndpoints.admissions.getAll),
        apiClient.get(apiEndpoints.sections.list),
      ]);
      const admissionSummary = rows(admissionsResponse.data).find((item) => String(read(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "").trim() === admissionNo || String(read(item, "studentId", "StudentId") ?? "") === studentId);
      const admissionId = read(admissionSummary, "admissionId", "AdmissionId", "studentAdmissionId", "StudentAdmissionId", "id", "Id");
      let admission = admissionSummary;
      if (admissionId != null) {
        try {
          const detail = await apiClient.get(apiEndpoints.admissions.getById(admissionId));
          admission = { ...admissionSummary, ...(detail.data?.data ?? detail.data?.Data ?? detail.data ?? {}) };
        } catch { /* The admission list record is still useful when details are unavailable. */ }
      }
      // Do not let null/empty values in one API response erase populated
      // values returned by the other (notably sectionId and admissionType).
      const source = { ...record };
      Object.entries(admission || {}).forEach(([key, value]) => {
        if (value != null && value !== "") source[key] = value;
      });
      const sectionValue = read(source, "section", "Section", "allocatedSection", "AllocatedSection", "assignedSection", "AssignedSection", "sectionDetails", "SectionDetails");
      const sectionId = read(source, "sectionId", "SectionId", "allocatedSectionId", "AllocatedSectionId", "assignedSectionId", "AssignedSectionId") ?? read(sectionValue, "sectionId", "SectionId", "id", "Id");
      let sectionRecord = rows(sectionsResponse.data).find((item) => String(read(item, "sectionId", "SectionId", "id", "Id")) === String(sectionId));
      if (!sectionRecord && sectionId != null) {
        try {
          const sectionDetail = await apiClient.get(apiEndpoints.sections.getById(sectionId));
          sectionRecord = sectionDetail.data?.data ?? sectionDetail.data?.Data ?? sectionDetail.data;
        } catch { /* Keep the admission value if the detail endpoint is unavailable. */ }
      }
      const sectionName = read(source, "sectionName", "SectionName", "allocatedSectionName", "AllocatedSectionName", "assignedSectionName", "AssignedSectionName", "sectionCode", "SectionCode") ?? read(sectionValue, "sectionName", "SectionName", "name", "Name", "sectionCode", "SectionCode") ?? read(sectionRecord, "sectionName", "SectionName", "name", "Name", "sectionCode", "SectionCode");
      let uploadedPhoto = "";
      try { uploadedPhoto = sessionStorage.getItem(`cms_student_photo_${studentId}`) ?? ""; } catch { /* Storage may be unavailable. */ }
      if (active) {
        setPhotoFailed(false);
        setStudent({ ...source, id: studentId, studentId, name: read(source, "studentName", "StudentName", "fullName", "FullName", "name", "Name") ?? "Student", admissionNo: admissionNo || "—", roll: read(record, "rollNumber", "RollNumber", "rollNo", "RollNo", "roll") ?? "", photo: uploadedPhoto || read(source, "photo", "Photo", "photoPath", "PhotoPath", "photoUrl", "PhotoUrl", "profilePhoto", "ProfilePhoto", "profilePhotoUrl", "ProfilePhotoUrl"), photoVersion: Date.now(), academicYear: read(source, "academicYearName", "AcademicYearName", "academicYear", "AcademicYear"), level: read(source, "academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel", "levelName", "LevelName"), group: read(source, "groupName", "GroupName", "group", "Group"), programme: read(source, "programmeName", "ProgrammeName", "programName", "ProgramName", "programme", "Programme"), section: sectionName, admissionType: read(source, "admissionType", "AdmissionType", "admissionTypeName", "AdmissionTypeName", "admissionCategory", "AdmissionCategory", "admissionQuota", "AdmissionQuota", "quota", "Quota", "admissionMode", "AdmissionMode", "type", "Type"), status: read(record, "status", "Status", "studentStatus", "StudentStatus") ?? "Pending assignment" });
      }
    }).catch((e) => active && setError(getApiErrorMessage(e))).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);
  const remotePhotoUrl = student?.photo ? resolvePhotoUrl(student.photo, student.photoVersion) : "";
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setPhotoObjectUrl("");
    if (!remotePhotoUrl) return () => { active = false; };
    apiClient.get(remotePhotoUrl, {
      responseType: "blob",
      headers: { Accept: "image/*" },
      skipGlobalLoader: true,
    }).then((response) => {
      if (!active) return;
      const contentType = String(response.headers?.["content-type"] ?? response.data?.type ?? "").toLowerCase();
      if (!contentType.startsWith("image/")) throw new Error("The photo endpoint did not return an image.");
      objectUrl = URL.createObjectURL(response.data);
      setPhotoFailed(false);
      setPhotoObjectUrl(objectUrl);
    }).catch(() => active && setPhotoFailed(true));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [remotePhotoUrl]);
  if (loading) return <DashboardLayout title="Student Profile" breadcrumb={["People", "Students"]}><div className="cms-card"><div className="cms-empty">Loading student record...</div></div></DashboardLayout>;
  if (!student) return <DashboardLayout title="Student Profile" breadcrumb={["People", "Students"]}><div className="cms-card"><div className="cms-empty">{error || "Student record was not found."}</div></div></DashboardLayout>;
  const initials = student.name.split(" ").map((x) => x[0]).join("").slice(0, 2);
  return <DashboardLayout title={student.name} subtitle={`Admission No: ${student.admissionNo}`} breadcrumb={["People", "Students"]} actions={<><Link className="cms-btn cms-btn-ghost" to="/dashboard/students">Back to list</Link><Link className="cms-btn cms-btn-primary" to={`/dashboard/students/${student.id}/enroll`}>{student.roll ? "Edit Profile" : "save changes"}</Link></>}>
    <Card title="Student Profile"><div className="cms-profile-hero"><div className="cms-photo">{photoObjectUrl && !photoFailed ? <img src={photoObjectUrl} alt={`${student.name}'s profile`} onError={() => setPhotoFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} /> : initials}</div><div><h2>{student.name}</h2><p className="cms-muted">Student ID: {student.studentId} · Admission No: {student.admissionNo} · Roll No: {student.roll || "Not assigned"}</p><StatusBadge value={student.status}/></div></div></Card>
    <div className="cms-grid-2"><Card title="Basic Student Information"><Details items={[["Date of Birth", read(student, "dateOfBirth", "dob")], ["Gender", read(student, "gender")], ["Mobile Number", read(student, "studentMobileNumber", "mobileNumber", "mobile")], ["Email", read(student, "studentEmail", "email")], ["Admission Date", read(student, "admissionDate")], ["Student Status", student.status]]}/></Card><Card title="Academic Assignment"><Details items={[["Board", read(student, "boardName", "board")], ["Academic Year", student.academicYear], ["Academic Level", student.level], ["Group", student.group], ["Programme", student.programme], ["Section", student.section], ["Roll Number", student.roll], ["Enrollment Status", student.status]]}/></Card><Card title="Parent / Guardian Details"><Details items={[["Father Name", read(student, "fatherName", "father")], ["Mother Name", read(student, "motherName", "mother")], ["Guardian Name", read(student, "guardianName", "guardian")], ["Guardian Mobile", read(student, "guardianMobile", "parentMobile", "fatherMobile")], ["Guardian Email", read(student, "guardianEmail", "parentEmail", "fatherEmail")], ["Address", read(student, "address", "addressLine1")]]}/></Card><Card title="Admission Details"><Details items={[["Admission No", student.admissionNo], ["Admission Date", read(student, "admissionDate")], ["Admission Type", student.admissionType], ["Admission Status", read(student, "admissionStatus", "status")], ["Previous School/College", read(student, "previousSchool", "prevSchool")], ["Previous Qualification", read(student, "previousQualification", "qualification", "previousBoard")]]}/></Card></div>
  </DashboardLayout>;
}
