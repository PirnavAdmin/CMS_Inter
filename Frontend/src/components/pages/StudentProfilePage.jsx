import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import StudentEnrollmentPage from "@/components/pages/StudentEnrollmentPage.jsx";
import { SkeletonPage, StatusBadge } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { env } from "@/config/env.js";
import "./StudentManagementPage.css";

const ViewDetails = ({ items }) => <div className="student-profile-read-grid">{items.map(([key, value]) => <div className="student-profile-read-field" key={key}><span>{key}</span><strong>{value || "—"}</strong></div>)}</div>;
const ViewSection = ({ title, children, className = "" }) => <section className={`cms-card student-profile-view-section ${className}`}><h2>{title}</h2>{children}</section>;
const read = (record, ...keys) => keys.map((key) => record?.[key]).find((value) => value != null && value !== "");
const formatDisplayDate = (value) => {
  if (!value) return value;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
};
const normalizeStudentType = (value) => {
  const text = String(value ?? "").trim();
  if (["true", "2", "yes", "residential", "hostel", "hosteller"].includes(text.toLowerCase())) return "Residential";
  if (["false", "1", "0", "no", "non-residential", "non residential", "day scholar", "dayscholar"].includes(text.toLowerCase())) return "Non-Residential";
  return text;
};
const normalizeYesNo = (value) => {
  const text = String(value ?? "").trim();
  if (["true", "1", "yes"].includes(text.toLowerCase())) return "Yes";
  if (["false", "0", "no"].includes(text.toLowerCase())) return "No";
  return text;
};
const normalizeBusType = (value) => {
  const text = String(value ?? "").trim();
  if (["true", "1", "yes", "ac"].includes(text.toLowerCase())) return "AC";
  if (["false", "0", "no", "non-ac", "non ac", "nonac"].includes(text.toLowerCase())) return "Non-AC";
  return text;
};
const residentialAllocation = (record = {}) => {
  const allocation = read(record, "allocation", "Allocation", "residentialAllocation", "ResidentialAllocation", "studentAllocation", "StudentAllocation") || {};
  const transport = read(record, "transport", "Transport", "transportDetails", "TransportDetails", "transportAllocation", "TransportAllocation", "studentTransport", "StudentTransport") || {};
  const route = read(record, "route", "Route", "busRoute", "BusRoute") || read(transport, "route", "Route", "busRoute", "BusRoute") || {};
  const pickup = read(record, "pickup", "Pickup", "pickupPoint", "PickupPoint") || read(transport, "pickup", "Pickup", "pickupPoint", "PickupPoint") || {};
  const hostel = read(record, "hostel", "Hostel", "hostelDetails", "HostelDetails", "hostelAllocation", "HostelAllocation", "studentHostel", "StudentHostel") || {};
  const block = read(record, "hostelBlock", "HostelBlock") || read(hostel, "block", "Block", "hostelBlock", "HostelBlock") || {};
  const room = read(record, "hostelRoom", "HostelRoom", "room", "Room") || read(hostel, "room", "Room", "hostelRoom", "HostelRoom") || {};
  const sources = [record, allocation, transport, hostel];
  const readAny = (...keys) => sources.map((source) => read(source, ...keys)).find((item) => item != null && item !== "");
  return {
    studentType: normalizeStudentType(readAny("studentType", "StudentType", "residentialType", "ResidentialType", "residenceType", "ResidenceType", "isResidential", "IsResidential")),
    transportRequired: normalizeYesNo(readAny("transportRequired", "TransportRequired", "isTransportRequired", "IsTransportRequired", "requiresTransport", "RequiresTransport")),
    busType: normalizeBusType(readAny("busType", "BusType", "vehicleType", "VehicleType", "isAC", "IsAC", "isAc", "IsAc")),
    route: read(route, "routeName", "RouteName", "name", "Name", "routeNumber", "RouteNumber", "routeCode", "RouteCode") ?? readAny("busRouteName", "BusRouteName", "routeName", "RouteName", "busRoute", "BusRoute"),
    pickupPoint: read(pickup, "stopName", "StopName", "pickupPointName", "PickupPointName", "pickupName", "PickupName", "name", "Name") ?? readAny("pickupPointName", "PickupPointName", "pickupName", "PickupName", "pickupPoint", "PickupPoint"),
    hostelBlock: read(block, "hostelName", "HostelName", "name", "Name", "hostelCode", "HostelCode") ?? readAny("hostelBlockName", "HostelBlockName", "hostelName", "HostelName", "hostelBlock", "HostelBlock"),
    hostelRoom: read(room, "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification", "name", "Name") ?? readAny("hostelRoomName", "HostelRoomName", "roomTypeName", "RoomTypeName", "hostelRoom", "HostelRoom"),
  };
};
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
  const location = useLocation();
  const returnState = location.state?.studentManagement;
  const [student, setStudent] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [photoFailed, setPhotoFailed] = useState(false), [photoObjectUrl, setPhotoObjectUrl] = useState(""), [editMode, setEditMode] = useState(false), [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let active = true;
    apiClient.get(apiEndpoints.students.getById(id)).then(async ({ data }) => {
      const record = data?.data ?? data?.Data ?? data;
      if (!record || typeof record !== "object") throw new Error("Student record was not found.");
      const admissionNo = String(read(record, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "").trim();
      const studentId = String(read(record, "studentId", "StudentId", "id", "Id") ?? id);
      const [admissionsResult, sectionsResult] = await Promise.allSettled([
        apiClient.get(apiEndpoints.admissions.getAll),
        apiClient.get(apiEndpoints.sections.list),
      ]);
      const admissionRows = admissionsResult.status === "fulfilled" ? rows(admissionsResult.value.data) : [];
      const sectionRows = sectionsResult.status === "fulfilled" ? rows(sectionsResult.value.data) : [];
      const admissionSummary = admissionRows.find((item) => String(read(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber") ?? "").trim() === admissionNo || String(read(item, "studentId", "StudentId") ?? "") === studentId);
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
      let sectionRecord = sectionRows.find((item) => String(read(item, "sectionId", "SectionId", "id", "Id")) === String(sectionId));
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
  }, [id, refreshKey]);
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
  if (loading) return <DashboardLayout title="Student Profile" breadcrumb={["People", "Students"]}><SkeletonPage /></DashboardLayout>;
  if (!student) return <DashboardLayout title="Student Profile" breadcrumb={["People", "Students"]}><div className="cms-card"><div className="cms-empty">{error || "Student record was not found."}</div></div></DashboardLayout>;
  const initials = student.name.split(" ").map((x) => x[0]).join("").slice(0, 2);
  const allocation = residentialAllocation(student);
  const finishEditing = async () => { setEditMode(false); setRefreshKey((value) => value + 1); };
  return <DashboardLayout title={student.name} subtitle={`Admission No: ${student.admissionNo} · Roll No: ${student.roll || "Not assigned"}`} breadcrumb={["People", "Students"]} backLink={<Link className="cms-back-link" to="/dashboard/students" state={returnState ? { studentManagement: returnState } : undefined}><ArrowLeft size={14} /> Back to Students</Link>} actions={!editMode ? <button type="button" className="cms-btn cms-btn-primary" onClick={() => setEditMode(true)}><Pencil size={15} /> Edit Profile</button> : null}>
    <div className="student-management-profile-page">
    <section className="cms-card student-profile-summary"><div><span>Student ID</span><strong>{student.studentId}</strong></div><div><span>Admission No</span><strong>{student.admissionNo}</strong></div><div><span>Roll No</span><strong>{student.roll || "Not assigned"}</strong></div><div><span>Status</span><StatusBadge value={student.status}/></div></section>
    {editMode ? <div className="student-management-profile-editor"><StudentEnrollmentPage id={id} embedded onCancel={() => setEditMode(false)} onSaved={finishEditing} /></div> : <>
      <ViewSection title="Personal Information" className="student-profile-personal-section"><div className="student-profile-personal-layout"><div className="student-profile-view-photo">{photoObjectUrl && !photoFailed ? <img src={photoObjectUrl} alt={`${student.name}'s profile`} onError={() => setPhotoFailed(true)} /> : initials}</div><ViewDetails items={[["Student Name", student.name], ["Gender", read(student, "gender", "Gender")], ["Date of Birth", formatDisplayDate(read(student, "dateOfBirth", "DateOfBirth", "dob"))], ["Blood Group", read(student, "bloodGroup", "BloodGroup")], ["Nationality", read(student, "nationality", "Nationality")], ["Religion", read(student, "religion", "Religion")], ["Category", read(student, "category", "Category")], ["Aadhaar Number", read(student, "aadhaarNumber", "AadhaarNumber")]]}/></div></ViewSection>
      <ViewSection title="Contact Information"><ViewDetails items={[["Email", read(student, "studentEmail", "email", "Email")], ["Mobile Number", read(student, "studentMobileNumber", "mobileNumber", "mobile", "MobileNumber")]]}/></ViewSection>
      <ViewSection title="Admission Details"><ViewDetails items={[["Admission No", student.admissionNo], ["Admission Date", formatDisplayDate(read(student, "admissionDate", "AdmissionDate"))], ["Admission Type", student.admissionType], ["Campus", read(student, "campusName", "CampusName", "campus", "Campus")]]}/></ViewSection>
      <ViewSection title="Academic Placement"><ViewDetails items={[["Board", read(student, "boardName", "BoardName", "board")], ["Academic Year", student.academicYear], ["Academic Level", student.level], ["Group", student.group], ["Program", student.programme], ["Section", student.section], ["Roll No", student.roll], ["Medium", read(student, "medium", "Medium")], ["Second Language", read(student, "secondLanguage", "SecondLanguage")]]}/></ViewSection>
      <ViewSection title="Previous Education"><ViewDetails items={[["Previous School", read(student, "previousSchool", "PreviousSchool")], ["Previous Board", read(student, "previousBoard", "PreviousBoard")], ["Previous Year of Passing", read(student, "previousYearOfPassing", "PreviousYearOfPassing")], ["Previous Hall Ticket Number", read(student, "previousHallTicketNumber", "PreviousHallTicketNumber", "hallTicketNumber")], ["Previous Percentage / Marks", read(student, "previousPercentage", "PreviousPercentage", "previousMarks", "PreviousMarks")]]}/></ViewSection>
      <ViewSection title="Address"><ViewDetails items={[["Address / House No", read(student, "address", "Address", "addressLine1", "AddressLine1", "houseNo", "HouseNo")], ["Street / Village", read(student, "street", "Street", "village", "Village", "addressLine2", "AddressLine2")], ["City / Town", read(student, "city", "City", "town", "Town")], ["District", read(student, "district", "District")], ["State", read(student, "state", "State")], ["Pincode", read(student, "pincode", "Pincode", "pinCode", "PinCode")]]}/></ViewSection>
      <ViewSection title="Father Details"><ViewDetails items={[["Father Name", read(student, "fatherName", "FatherName")], ["Occupation", read(student, "fatherOccupation", "FatherOccupation")], ["Mobile Number", read(student, "fatherMobile", "FatherMobile")], ["Email", read(student, "fatherEmail", "FatherEmail")]]}/></ViewSection>
      <ViewSection title="Mother Details"><ViewDetails items={[["Mother Name", read(student, "motherName", "MotherName")], ["Occupation", read(student, "motherOccupation", "MotherOccupation")], ["Mobile Number", read(student, "motherMobile", "MotherMobile")], ["Email", read(student, "motherEmail", "MotherEmail")]]}/></ViewSection>
      <ViewSection title="Guardian Details"><ViewDetails items={[["Guardian Name", read(student, "guardianName", "GuardianName")], ["Mobile Number", read(student, "guardianMobile", "GuardianMobile")], ["Email", read(student, "guardianEmail", "GuardianEmail")]]}/></ViewSection>
      <ViewSection title="Student Type & Residential Allocation"><ViewDetails items={[["Student Type", allocation.studentType], ["School Transport Facility Required?", allocation.transportRequired], ...(allocation.studentType === "Non-Residential" && allocation.transportRequired === "Yes" ? [["Bus Type", allocation.busType], ["Route", allocation.route], ["Pickup Point", allocation.pickupPoint]] : []), ...(allocation.studentType === "Residential" ? [["Hostel Block", allocation.hostelBlock], ["Room Type", allocation.hostelRoom]] : [])]}/></ViewSection>
    </>}
    </div>
  </DashboardLayout>;
}
