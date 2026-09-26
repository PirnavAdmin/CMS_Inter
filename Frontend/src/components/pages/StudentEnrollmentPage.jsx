import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/apiClient.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { env } from "@/config/env.js";
import "./StudentManagementPage.css";

const emptyForm = () => ({ admissionId: "", admissionNo: "", admissionNumber: "", admissionDate: "", admissionType: "", admissionQuota: "", medium: "", secondLanguage: "", studentName: "", photo: "", gender: "", dateOfBirth: "", bloodGroup: "", email: "", mobileNumber: "", aadhaarNumber: "", nationality: "", religion: "", category: "", address: "", city: "", district: "", state: "", pincode: "", boardId: "", academicYearId: "", academicLevelId: "", groupId: "", programId: "", sectionId: "", rollNo: "", rollNumber: "", feeStructureId: "", paymentPlan: "", studentType: "", transportRequired: "", busType: "", busRoute: "", busRouteName: "", pickupPoint: "", pickupPointName: "", hostelBlock: "", hostelBlockName: "", hostelRoom: "", hostelRoomName: "", previousSchool: "", previousHallTicketNumber: "", previousBoard: "", previousYearOfPassing: "", previousPercentage: "", studentCategory: "", scholarshipStatus: "", scholarshipAmount: "", fatherName: "", fatherOccupation: "", fatherMobile: "", fatherEmail: "", motherName: "", motherOccupation: "", motherMobile: "", motherEmail: "", guardianName: "", guardianMobile: "", guardianEmail: "", annualIncome: "", remarks: "" });
const valueOf = (record, ...keys) => keys.map((key) => record?.[key]).find((value) => value !== undefined && value !== null) ?? "";
const asList = (value) => {
  const data = value?.data ?? value?.Data ?? value;
  if (Array.isArray(data)) return data;
  const candidates = [data?.data?.$values, data?.Data?.$values, data?.result, data?.Result, data?.response, data?.Response, data?.data, data?.Data, data?.items, data?.Items, data?.records, data?.Records, data?.rows, data?.Rows, data?.results, data?.Results, data?.$values];
  return candidates.find(Array.isArray) ?? [];
};
const optionsFrom = (response, idKeys, labelKeys) => asList(response).map((item) => ({
  value: String(valueOf(item, ...idKeys)),
  label: String(valueOf(item, ...labelKeys)),
})).filter((item) => item.value && item.label);
const asDateInput = (value) => value ? String(value).slice(0, 10) : "";
const stringValue = (value) => String(value ?? "");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const personNamePattern = /^[\p{L}][\p{L} .'-]*$/u;
const placePattern = /^[\p{L}][\p{L} .,'()-]*$/u;
const digitsOnly = (value, maximum) => String(value).replace(/\D/g, "").slice(0, maximum);
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const imageUrl = (value) => {
  const path = String(value ?? "").trim();
  if (!path || /^(?:https?:|blob:|data:)/i.test(path)) return path;
  return `${env.apiBaseUrl.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
};
const initialsOf = (name) => String(name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ST";
const fieldKeys = ["admissionNo", "admissionNumber", "admissionDate", "studentName", "gender", "dateOfBirth", "email", "mobileNumber", "aadhaarNumber", "nationality", "address", "city", "district", "state", "pincode", "studentType", "transportRequired", "busType", "busRoute", "pickupPoint", "hostelBlock", "hostelRoom", "previousYearOfPassing", "previousPercentage", "fatherName", "fatherOccupation", "fatherMobile", "fatherEmail", "motherName", "motherOccupation", "motherMobile", "motherEmail", "guardianName", "guardianMobile", "guardianEmail"];
const studentUpdateError = (error) => {
  const response = error?.response?.data ?? error?.data ?? {};
  const details = String(response?.details ?? response?.Details ?? "");
  if (/UX_Students_AadhaarNumber|duplicate entry.*aadhaar/i.test(details)) return "This Aadhaar number is already assigned to another student.";
  return getApiErrorMessage(error) || "Unable to update the student profile.";
};
const unwrapStudent = (payload) => {
  let current = payload;
  for (let index = 0; index < 4 && current && typeof current === "object" && !Array.isArray(current); index += 1) {
    const next = current.data ?? current.Data ?? current.result ?? current.Result;
    if (!next || typeof next !== "object" || next === current) break;
    current = next;
  }
  return current;
};
const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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
const isActiveMaster = (record = {}) => {
  const status = valueOf(record, "status", "Status", "isActive", "IsActive", "active", "Active");
  if (status === "" || status === undefined || status === null) return true;
  if (typeof status === "boolean") return status;
  if (typeof status === "number") return status === 1;
  return !["inactive", "deleted", "false", "0"].includes(String(status).trim().toLowerCase());
};
const transportRouteFrom = (route = {}) => {
  const id = valueOf(route, "routeId", "RouteId", "id", "Id");
  const code = stringValue(valueOf(route, "routeNumber", "RouteNumber", "routeCode", "RouteCode", "code", "Code")).trim();
  const value = id !== "" ? String(id) : code;
  if (!value) return null;
  const routeName = stringValue(valueOf(route, "routeName", "RouteName", "name", "Name") || code || value);
  return { value, label: code && code !== routeName ? `${code} - ${routeName}` : routeName, routeName, active: isActiveMaster(route) };
};
const pickupPointFrom = (point = {}) => {
  const id = valueOf(point, "pickupPointId", "PickupPointId", "id", "Id");
  const label = stringValue(valueOf(point, "stopName", "StopName", "pickupPointName", "PickupPointName", "pickupName", "PickupName", "name", "Name")).trim();
  const value = id !== "" ? String(id) : label;
  if (!value) return null;
  const routeId = valueOf(point, "routeId", "RouteId");
  return { value, label: label || value, routeId: routeId === "" ? "" : String(routeId), active: isActiveMaster(point) };
};
const vehicleFrom = (vehicle = {}) => {
  const id = valueOf(vehicle, "vehicleId", "VehicleId", "id", "Id");
  if (id === "") return null;
  return { value: String(id), busType: normalizeBusType(valueOf(vehicle, "isAC", "IsAC", "isAc", "IsAc", "ac", "AC", "busType", "BusType")), active: isActiveMaster(vehicle) };
};
const vehicleAssignmentFrom = (assignment = {}) => {
  const routeId = valueOf(assignment, "routeId", "RouteId");
  const vehicleId = valueOf(assignment, "vehicleId", "VehicleId");
  if (routeId === "" || vehicleId === "") return null;
  return { routeId: String(routeId), vehicleId: String(vehicleId), busType: normalizeBusType(valueOf(assignment, "isAC", "IsAC", "isAc", "IsAc", "ac", "AC", "busType", "BusType")), active: isActiveMaster(assignment) };
};
const hostelBlockFrom = (block = {}) => {
  const id = valueOf(block, "hostelId", "HostelId", "id", "Id");
  const code = stringValue(valueOf(block, "hostelCode", "HostelCode", "code", "Code")).trim();
  const value = id !== "" ? String(id) : code;
  if (!value) return null;
  const name = stringValue(valueOf(block, "hostelName", "HostelName", "name", "Name") || code || value);
  return { value, hostelId: id === "" ? "" : String(id), code, name, label: code && code !== name ? `${code} - ${name}` : name, active: isActiveMaster(block) };
};
const hostelRoomFrom = (room = {}) => {
  const roomId = valueOf(room, "roomId", "RoomId", "id", "Id");
  const roomTypeId = valueOf(room, "roomTypeId", "RoomTypeId");
  const hostelId = valueOf(room, "hostelId", "HostelId");
  const roomNo = stringValue(valueOf(room, "roomNumber", "RoomNumber", "roomNo", "RoomNo")).trim();
  if (roomId === "" && roomTypeId === "" && !roomNo) return null;
  const roomTypeName = stringValue(valueOf(room, "roomTypeSpecification", "RoomTypeSpecification", "roomTypeName", "RoomTypeName", "type", "Type")).trim();
  return { value: roomId !== "" ? String(roomId) : roomNo, roomId: roomId === "" ? "" : String(roomId), roomTypeId: roomTypeId === "" ? "" : String(roomTypeId), hostelId: hostelId === "" ? "" : String(hostelId), blockValue: hostelId === "" ? stringValue(valueOf(room, "hostelCode", "HostelCode", "block", "Block")) : String(hostelId), roomTypeName, roomNo, active: isActiveMaster(room) };
};
const hostelRoomTypeFrom = (roomType = {}) => {
  const id = valueOf(roomType, "roomTypeId", "RoomTypeId", "hostelRoomTypeId", "HostelRoomTypeId", "id", "Id");
  const name = stringValue(valueOf(roomType, "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification", "name", "Name")).trim();
  const value = id !== "" ? String(id) : name;
  return value ? { value, roomTypeId: id === "" ? "" : String(id), label: name || value, name: name || value, active: isActiveMaster(roomType) } : null;
};
const hostelFeeFrom = (fee = {}) => {
  const hostelId = valueOf(fee, "hostelId", "HostelId");
  const roomTypeId = valueOf(fee, "roomTypeId", "RoomTypeId");
  if (hostelId === "" || roomTypeId === "") return null;
  return { hostelId: String(hostelId), roomTypeId: String(roomTypeId), roomTypeName: stringValue(valueOf(fee, "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification")), active: isActiveMaster(fee) };
};
const allocationFrom = (source = {}) => {
  const allocation = valueOf(source, "allocation", "Allocation", "residentialAllocation", "ResidentialAllocation", "studentAllocation", "StudentAllocation") || {};
  const transport = valueOf(source, "transport", "Transport", "transportDetails", "TransportDetails", "transportAllocation", "TransportAllocation", "studentTransport", "StudentTransport") || {};
  const route = valueOf(source, "route", "Route", "busRoute", "BusRoute") || valueOf(transport, "route", "Route", "busRoute", "BusRoute") || {};
  const pickup = valueOf(source, "pickup", "Pickup", "pickupPoint", "PickupPoint") || valueOf(transport, "pickup", "Pickup", "pickupPoint", "PickupPoint") || {};
  const hostel = valueOf(source, "hostel", "Hostel", "hostelDetails", "HostelDetails", "hostelAllocation", "HostelAllocation", "studentHostel", "StudentHostel") || {};
  const block = valueOf(source, "hostelBlock", "HostelBlock") || valueOf(hostel, "block", "Block", "hostelBlock", "HostelBlock") || {};
  const room = valueOf(source, "hostelRoom", "HostelRoom", "room", "Room") || valueOf(hostel, "room", "Room", "hostelRoom", "HostelRoom") || {};
  const values = [source, allocation, transport, hostel];
  const fromValues = (...keys) => values.map((item) => valueOf(item, ...keys)).find((item) => item !== undefined && item !== null && item !== "");
  return {
    studentType: normalizeStudentType(fromValues("studentType", "StudentType", "residentialType", "ResidentialType", "residenceType", "ResidenceType", "isResidential", "IsResidential")),
    transportRequired: normalizeYesNo(fromValues("transportRequired", "TransportRequired", "isTransportRequired", "IsTransportRequired", "requiresTransport", "RequiresTransport")),
    busType: normalizeBusType(fromValues("busType", "BusType", "vehicleType", "VehicleType", "isAC", "IsAC", "isAc", "IsAc")),
    busRoute: stringValue(valueOf(route, "routeId", "RouteId", "busRouteId", "BusRouteId", "id", "Id") ?? fromValues("routeId", "RouteId", "busRouteId", "BusRouteId", "busRoute", "BusRoute")),
    busRouteName: stringValue(valueOf(route, "routeName", "RouteName", "name", "Name", "routeNumber", "RouteNumber", "routeCode", "RouteCode") ?? fromValues("busRouteName", "BusRouteName", "routeName", "RouteName")),
    pickupPoint: stringValue(valueOf(pickup, "pickupPointId", "PickupPointId", "pickupId", "PickupId", "id", "Id") ?? fromValues("pickupPointId", "PickupPointId", "pickupId", "PickupId", "pickupPoint", "PickupPoint")),
    pickupPointName: stringValue(valueOf(pickup, "stopName", "StopName", "pickupPointName", "PickupPointName", "pickupName", "PickupName", "name", "Name") ?? fromValues("pickupPointName", "PickupPointName", "pickupName", "PickupName")),
    hostelBlock: stringValue(valueOf(block, "hostelId", "HostelId", "id", "Id") ?? fromValues("hostelId", "HostelId", "hostelBlock", "HostelBlock", "hostelCode", "HostelCode")),
    hostelBlockName: stringValue(valueOf(block, "hostelName", "HostelName", "name", "Name", "hostelCode", "HostelCode") ?? fromValues("hostelBlockName", "HostelBlockName", "hostelName", "HostelName")),
    hostelRoom: stringValue(valueOf(room, "roomTypeId", "RoomTypeId", "hostelRoomTypeId", "HostelRoomTypeId") ?? fromValues("roomTypeId", "RoomTypeId", "hostelRoom", "HostelRoom", "roomTypeName", "RoomTypeName")),
    hostelRoomName: stringValue(valueOf(room, "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification", "name", "Name") ?? fromValues("hostelRoomName", "HostelRoomName", "roomTypeName", "RoomTypeName", "hostelRoom", "HostelRoom")),
  };
};

const formFromStudent = (record) => {
  const nested = record?.student ?? record?.Student ?? record?.profile ?? record?.Profile ?? {};
  const admission = record?.admission ?? record?.Admission ?? {};
  const academic = record?.academicDetails ?? record?.AcademicDetails ?? record?.academic ?? record?.Academic ?? {};
  const source = { ...record, ...admission, ...academic, ...nested };
  const text = (...keys) => stringValue(valueOf(source, ...keys));
  const allocation = allocationFrom(source);
  return {
    admissionId: text("admissionId", "AdmissionId"), admissionNo: text("admissionNo", "AdmissionNo"), admissionNumber: text("admissionNumber", "AdmissionNumber"), admissionDate: asDateInput(valueOf(source, "admissionDate", "AdmissionDate")), admissionType: text("admissionType", "AdmissionType"), admissionQuota: text("admissionQuota", "AdmissionQuota"), medium: text("medium", "Medium"), secondLanguage: text("secondLanguage", "SecondLanguage"),
    studentName: text("studentName", "StudentName", "fullName", "name"), photo: text("photo", "Photo", "photoPath", "PhotoPath"), gender: text("gender", "Gender"), dateOfBirth: asDateInput(valueOf(source, "dateOfBirth", "DateOfBirth", "dob", "DOB")), bloodGroup: text("bloodGroup", "BloodGroup"), email: text("email", "Email", "studentEmail", "StudentEmail"), mobileNumber: text("mobileNumber", "MobileNumber", "mobile", "Mobile"), aadhaarNumber: text("aadhaarNumber", "AadhaarNumber", "aadhaar", "Aadhaar"), nationality: text("nationality", "Nationality"), religion: text("religion", "Religion"), category: text("category", "Category"), address: text("address", "Address", "addressLine1", "AddressLine1"), city: text("city", "City"), district: text("district", "District"), state: text("state", "State"), pincode: text("pincode", "Pincode", "pinCode", "PinCode"),
    boardId: text("boardId", "BoardId"), academicYearId: text("academicYearId", "AcademicYearId"), academicLevelId: text("academicLevelId", "AcademicLevelId"), groupId: text("groupId", "GroupId"), programId: text("programId", "ProgramId"), sectionId: text("sectionId", "SectionId"), rollNo: text("rollNo", "RollNo"), rollNumber: text("rollNumber", "RollNumber"), feeStructureId: text("feeStructureId", "FeeStructureId"), paymentPlan: text("paymentPlan", "PaymentPlan"), ...allocation,
    previousSchool: text("previousSchool", "PreviousSchool"), previousHallTicketNumber: text("previousHallTicketNumber", "PreviousHallTicketNumber"), previousBoard: text("previousBoard", "PreviousBoard"), previousYearOfPassing: text("previousYearOfPassing", "PreviousYearOfPassing"), previousPercentage: text("previousPercentage", "PreviousPercentage"), studentCategory: text("studentCategory", "StudentCategory"), scholarshipStatus: text("scholarshipStatus", "ScholarshipStatus"), scholarshipAmount: text("scholarshipAmount", "ScholarshipAmount"),
    fatherName: text("fatherName", "FatherName"), fatherOccupation: text("fatherOccupation", "FatherOccupation"), fatherMobile: text("fatherMobile", "FatherMobile"), fatherEmail: text("fatherEmail", "FatherEmail"), motherName: text("motherName", "MotherName"), motherOccupation: text("motherOccupation", "MotherOccupation"), motherMobile: text("motherMobile", "MotherMobile"), motherEmail: text("motherEmail", "MotherEmail"), guardianName: text("guardianName", "GuardianName"), guardianMobile: text("guardianMobile", "GuardianMobile"), guardianEmail: text("guardianEmail", "GuardianEmail"), annualIncome: text("annualIncome", "AnnualIncome"), remarks: text("remarks", "Remarks"),
  };
};

const validate = (form) => {
  const errors = {};
  const person = (key, label, required = false) => {
    const value = form[key].trim();
    if (required && !value) errors[key] = "Student name is required.";
    else if (value && value.length > 100) errors[key] = `${label} cannot exceed 100 characters.`;
    else if (value && !personNamePattern.test(value)) errors[key] = required ? "Enter a valid student name." : `Enter a valid ${label.toLowerCase()}.`;
  };
  const mobile = (key, label) => { if (form[key].trim() && !/^\d{10}$/.test(form[key].trim())) errors[key] = `${label} must be exactly 10 digits.`; };
  person("studentName", "Student name", true);
  if (!form.gender) errors.gender = "Gender is required.";
  if (!form.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
  else if (new Date(`${form.dateOfBirth}T00:00:00`) > new Date()) errors.dateOfBirth = "Date of birth cannot be in the future.";
  if (form.email.trim() && !emailPattern.test(form.email.trim())) errors.email = "Enter a valid email address.";
  mobile("mobileNumber", "Mobile number");
  if (form.aadhaarNumber.trim() && !/^\d{12}$/.test(form.aadhaarNumber.trim())) errors.aadhaarNumber = "Aadhaar number must be exactly 12 digits.";
  if (form.nationality.trim() && (form.nationality.trim().length > 100 || !/^[\p{L} ]+$/u.test(form.nationality.trim()))) errors.nationality = "Enter a valid nationality.";
  if (form.address.trim().length > 250) errors.address = "Address cannot exceed 250 characters.";
  [["city", "city"], ["district", "district"], ["state", "state"]].forEach(([key, label]) => { const value = form[key].trim(); if (value && (value.length > 100 || !placePattern.test(value))) errors[key] = `Enter a valid ${label}.`; });
  if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim())) errors.pincode = "Pincode must be exactly 6 digits.";
  if (!form.studentType) errors.studentType = "Student Type is required.";
  if (form.studentType === "Non-Residential" && !form.transportRequired) errors.transportRequired = "School Transport Facility Required is required.";
  if (form.studentType === "Non-Residential" && form.transportRequired === "Yes") {
    if (!form.busType) errors.busType = "Bus Type is required.";
    if (!form.busRoute) errors.busRoute = "Route is required.";
    if (!form.pickupPoint) errors.pickupPoint = "Pickup Point is required.";
  }
  if (form.studentType === "Residential") {
    if (!form.hostelBlock) errors.hostelBlock = "Hostel Block is required.";
    if (!form.hostelRoom) errors.hostelRoom = "Room Type is required.";
  }
  person("fatherName", "Father name"); person("motherName", "Mother name"); person("guardianName", "Guardian name");
  [["fatherOccupation", "Father occupation"], ["motherOccupation", "Mother occupation"]].forEach(([key, label]) => { if (form[key].trim().length > 100) errors[key] = `${label} cannot exceed 100 characters.`; });
  mobile("fatherMobile", "Father mobile number"); mobile("motherMobile", "Mother mobile number"); mobile("guardianMobile", "Guardian mobile number");
  if (form.fatherEmail.trim() && !emailPattern.test(form.fatherEmail.trim())) errors.fatherEmail = "Enter a valid father email address.";
  if (form.motherEmail.trim() && !emailPattern.test(form.motherEmail.trim())) errors.motherEmail = "Enter a valid mother email address.";
  if (form.guardianEmail.trim() && !emailPattern.test(form.guardianEmail.trim())) errors.guardianEmail = "Enter a valid guardian email address.";
  if (form.previousYearOfPassing && (!/^\d{4}$/.test(form.previousYearOfPassing) || Number(form.previousYearOfPassing) > new Date().getFullYear())) errors.previousYearOfPassing = "Enter a valid passing year.";
  if (form.previousPercentage && (Number(form.previousPercentage) < 0 || Number(form.previousPercentage) > 100)) errors.previousPercentage = "Percentage must be between 0 and 100.";
  return errors;
};

export default function StudentEnrollmentPage({ id, embedded = false, onCancel, onSaved }) {
  const navigate = useNavigate();
  const redirectTimer = useRef(null);
  const photoInputRef = useRef(null);
  const [student, setStudent] = useState(null), [form, setForm] = useState(emptyForm), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [loadError, setLoadError] = useState(""), [errors, setErrors] = useState({}), [touched, setTouched] = useState({}), [message, setMessage] = useState(""), [photoFile, setPhotoFile] = useState(null), [photoPreview, setPhotoPreview] = useState(""), [photoError, setPhotoError] = useState(""), [lookups, setLookups] = useState({ boards: [], years: [], levels: [], groups: [], programs: [], sections: [] }), [allocationLookups, setAllocationLookups] = useState({ routes: [], pickupPoints: [], vehicles: [], vehicleAssignments: [], hostelBlocks: [], hostelRoomTypes: [], hostelRooms: [], hostelFees: [] }), [allocationLookupError, setAllocationLookupError] = useState("");
  const loadStudent = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      if (!/^\d+$/.test(String(id))) throw new Error("Invalid student ID.");
      const { data } = await apiClient.get(apiEndpoints.students.getById(id));
      const record = unwrapStudent(data);
      if (!record || typeof record !== "object") throw new Error("Student record was not found.");
      const nested = record.student ?? record.Student ?? record.profile ?? record.Profile ?? {};
      const admission = record.admission ?? record.Admission ?? {};
      const academic = record.academicDetails ?? record.AcademicDetails ?? record.academic ?? record.Academic ?? {};
      const source = { ...record, ...admission, ...academic, ...nested };
      setStudent({ name: stringValue(valueOf(source, "studentName", "StudentName", "fullName", "name")) || "Student", rollNo: stringValue(valueOf(source, "rollNo", "RollNo", "rollNumber", "RollNumber")) || "—", admissionNo: stringValue(valueOf(source, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")) || "-" });
      setForm(formFromStudent(record)); setErrors({}); setTouched({}); setPhotoFile(null); setPhotoPreview(""); setPhotoError("");
    } catch (error) { setLoadError(getApiErrorMessage(error) || "Unable to load the student profile."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { loadStudent(); }, [loadStudent]);
  useEffect(() => {
    let active = true;
    const loadLookups = async () => {
      const results = await Promise.allSettled([
        apiClient.get(apiEndpoints.boards.list), apiClient.get(apiEndpoints.academicYears.list), apiClient.get(apiEndpoints.academicLevels.list),
        apiClient.get(apiEndpoints.groups.list), apiClient.get(apiEndpoints.programs.list), apiClient.get(apiEndpoints.sections.list),
      ]);
      if (!active) return;
      const data = results.map((result) => result.status === "fulfilled" ? result.value.data : []);
      setLookups({
        boards: optionsFrom(data[0], ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "name", "Name"]),
        years: optionsFrom(data[1], ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"]),
        levels: optionsFrom(data[2], ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"]),
        groups: optionsFrom(data[3], ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name"]),
        programs: optionsFrom(data[4], ["programId", "ProgramId", "programmeId", "ProgrammeId", "id", "Id"], ["programName", "ProgramName", "programmeName", "ProgrammeName", "name", "Name"]),
        sections: optionsFrom(data[5], ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "name", "Name"]),
      });
    };
    loadLookups();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    const loadAllocationLookups = async () => {
      setAllocationLookupError("");
      const results = await Promise.allSettled([
        apiClient.get(`${apiEndpoints.transport.routes}?PageNumber=1&PageSize=1000`),
        apiClient.get(`${apiEndpoints.transport.pickupPoints}?PageNumber=1&PageSize=1000`),
        apiClient.get(`${apiEndpoints.transport.vehicles}?PageNumber=1&PageSize=1000`),
        apiClient.get(`${apiEndpoints.transport.vehicleAssignments}?PageNumber=1&PageSize=1000`),
        apiClient.get(apiEndpoints.hostel.blocks),
        apiClient.get(apiEndpoints.hostel.roomTypes),
        apiClient.get(apiEndpoints.hostel.rooms),
        apiClient.get(apiEndpoints.hostel.fees),
      ]);
      if (!active) return;
      const normalizers = [transportRouteFrom, pickupPointFrom, vehicleFrom, vehicleAssignmentFrom, hostelBlockFrom, hostelRoomTypeFrom, hostelRoomFrom, hostelFeeFrom];
      const data = results.map((result, index) => result.status === "fulfilled" ? asList(result.value.data).map(normalizers[index]).filter(Boolean) : []);
      setAllocationLookups({ routes: data[0], pickupPoints: data[1], vehicles: data[2], vehicleAssignments: data[3], hostelBlocks: data[4], hostelRoomTypes: data[5], hostelRooms: data[6], hostelFees: data[7] });
      if (results.some((result) => result.status === "rejected")) setAllocationLookupError("Some allocation options could not be loaded. Please refresh and try again.");
    };
    loadAllocationLookups();
    return () => { active = false; };
  }, []);
  const routeBusTypes = useMemo(() => {
    const vehicleTypes = new Map(allocationLookups.vehicles.filter((vehicle) => vehicle.active && vehicle.busType).map((vehicle) => [vehicle.value, vehicle.busType]));
    return allocationLookups.vehicleAssignments.filter((assignment) => assignment.active).reduce((map, assignment) => {
      const type = assignment.busType || vehicleTypes.get(assignment.vehicleId);
      if (!type) return map;
      if (!map.has(assignment.routeId)) map.set(assignment.routeId, new Set());
      map.get(assignment.routeId).add(type);
      return map;
    }, new Map());
  }, [allocationLookups.vehicleAssignments, allocationLookups.vehicles]);
  const routeOptions = useMemo(() => allocationLookups.routes.filter((route) => route.active && (!form.busType || routeBusTypes.get(route.value)?.has(form.busType))), [allocationLookups.routes, form.busType, routeBusTypes]);
  const pickupOptions = useMemo(() => {
    const linked = allocationLookups.pickupPoints.some((point) => point.routeId);
    return allocationLookups.pickupPoints.filter((point) => point.active && (!linked || point.routeId === String(form.busRoute || "")));
  }, [allocationLookups.pickupPoints, form.busRoute]);
  const hostelBlockOptions = useMemo(() => allocationLookups.hostelBlocks.filter((block) => block.active), [allocationLookups.hostelBlocks]);
  const hostelRoomOptions = useMemo(() => {
    const block = allocationLookups.hostelBlocks.find((item) => item.value === String(form.hostelBlock));
    const roomTypeIds = new Set(allocationLookups.hostelRooms.filter((room) => room.active && (room.blockValue === String(form.hostelBlock) || (block?.hostelId && room.hostelId === block.hostelId))).map((room) => room.roomTypeId).filter(Boolean));
    allocationLookups.hostelFees.filter((fee) => fee.active && fee.hostelId === String(block?.hostelId || form.hostelBlock)).forEach((fee) => roomTypeIds.add(fee.roomTypeId));
    const types = allocationLookups.hostelRoomTypes.length ? allocationLookups.hostelRoomTypes : [...roomTypeIds].map((roomTypeId) => {
      const room = allocationLookups.hostelRooms.find((item) => item.roomTypeId === roomTypeId);
      const fee = allocationLookups.hostelFees.find((item) => item.roomTypeId === roomTypeId);
      const label = room?.roomTypeName || fee?.roomTypeName || `Room Type ${roomTypeId}`;
      return { value: roomTypeId, roomTypeId, label, name: label, active: true };
    });
    return types.filter((type) => type.active && (!roomTypeIds.size || roomTypeIds.has(String(type.roomTypeId || type.value))));
  }, [allocationLookups.hostelBlocks, allocationLookups.hostelFees, allocationLookups.hostelRooms, allocationLookups.hostelRoomTypes, form.hostelBlock]);
  useEffect(() => {
    if (form.busType || !form.busRoute) return;
    const types = routeBusTypes.get(String(form.busRoute));
    if (types?.size === 1) setForm((current) => ({ ...current, busType: [...types][0] }));
  }, [form.busRoute, form.busType, routeBusTypes]);
  useEffect(() => {
    if (!allocationLookups.routes.length && !allocationLookups.hostelBlocks.length) return;
    setForm((current) => {
      const matches = (value, ...candidates) => Boolean(String(value || "").trim()) && candidates.some((candidate) => String(candidate || "").trim().toLowerCase() === String(value || "").trim().toLowerCase());
      const next = { ...current };
      let changed = false;
      const route = allocationLookups.routes.find((item) => matches(current.busRoute, item.value, item.routeName, item.label));
      if (route && current.busRoute !== route.value) { next.busRoute = route.value; next.busRouteName = route.routeName; changed = true; }
      const pickup = allocationLookups.pickupPoints.find((item) => (!route || !item.routeId || item.routeId === route.value) && matches(current.pickupPoint, item.value, item.label));
      if (pickup && current.pickupPoint !== pickup.value) { next.pickupPoint = pickup.value; next.pickupPointName = pickup.label; changed = true; }
      const block = allocationLookups.hostelBlocks.find((item) => matches(current.hostelBlock, item.value, item.hostelId, item.code, item.name, item.label));
      if (block && current.hostelBlock !== block.value) { next.hostelBlock = block.value; next.hostelBlockName = block.name; changed = true; }
      const room = allocationLookups.hostelRooms.find((item) => (!block || item.blockValue === block.value || item.hostelId === block.hostelId) && matches(current.hostelRoom, item.roomTypeId, item.roomTypeName, item.value, item.roomNo));
      const type = allocationLookups.hostelRoomTypes.find((item) => matches(current.hostelRoom, item.value, item.roomTypeId, item.name, item.label) || (room?.roomTypeId && item.roomTypeId === room.roomTypeId));
      const roomTypeId = type?.roomTypeId || room?.roomTypeId || type?.value;
      if (roomTypeId && current.hostelRoom !== roomTypeId) { next.hostelRoom = roomTypeId; next.hostelRoomName = type?.name || room?.roomTypeName || ""; changed = true; }
      return changed ? next : current;
    });
  }, [allocationLookups.hostelBlocks, allocationLookups.hostelRoomTypes, allocationLookups.hostelRooms, allocationLookups.pickupPoints, allocationLookups.routes]);
  useEffect(() => () => window.clearTimeout(redirectTimer.current), []);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);
  const updateField = (key, value) => setForm((current) => {
    const next = { ...current, [key]: value };
    if (touched[key]) setErrors((currentErrors) => ({ ...currentErrors, [key]: validate(next)[key] || "" }));
    return next;
  });
  const change = (key) => (event) => updateField(key, event.target.value);
  const changeAllocation = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => {
      if (key === "studentType") return { ...current, studentType: value, transportRequired: "", busType: "", busRoute: "", busRouteName: "", pickupPoint: "", pickupPointName: "", hostelBlock: "", hostelBlockName: "", hostelRoom: "", hostelRoomName: "" };
      if (key === "transportRequired") return { ...current, transportRequired: value, ...(value === "Yes" ? {} : { busType: "", busRoute: "", busRouteName: "", pickupPoint: "", pickupPointName: "" }) };
      if (key === "busType") {
        const keepRoute = current.busRoute && routeBusTypes.get(String(current.busRoute))?.has(value);
        return { ...current, busType: value, ...(keepRoute ? { pickupPoint: "", pickupPointName: "" } : { busRoute: "", busRouteName: "", pickupPoint: "", pickupPointName: "" }) };
      }
      if (key === "busRoute") {
        const route = allocationLookups.routes.find((item) => item.value === value);
        return { ...current, busRoute: value, busRouteName: route?.routeName || "", pickupPoint: "", pickupPointName: "" };
      }
      if (key === "pickupPoint") {
        const point = allocationLookups.pickupPoints.find((item) => item.value === value && (!item.routeId || item.routeId === String(current.busRoute)));
        return { ...current, pickupPoint: value, pickupPointName: point?.label || "" };
      }
      if (key === "hostelBlock") {
        const block = allocationLookups.hostelBlocks.find((item) => item.value === value);
        return { ...current, hostelBlock: value, hostelBlockName: block?.name || "", hostelRoom: "", hostelRoomName: "" };
      }
      if (key === "hostelRoom") {
        const type = allocationLookups.hostelRoomTypes.find((item) => item.value === value || item.roomTypeId === value);
        const room = allocationLookups.hostelRooms.find((item) => item.roomTypeId === value && (item.blockValue === String(current.hostelBlock) || item.hostelId === String(current.hostelBlock)));
        return { ...current, hostelRoom: value, hostelRoomName: type?.name || room?.roomTypeName || "" };
      }
      return current;
    });
    setErrors((current) => ({ ...current, studentType: undefined, transportRequired: undefined, busType: undefined, busRoute: undefined, pickupPoint: undefined, hostelBlock: undefined, hostelRoom: undefined }));
  };
  const numericChange = (key, maximum) => (event) => updateField(key, digitsOnly(event.target.value, maximum));
  const choosePhoto = (event) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setPhotoFile(null); setPhotoPreview(""); setPhotoError("Only JPG, JPEG and PNG images are allowed."); event.target.value = "";
      return;
    }
    setPhotoError(""); setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file));
  };
  const blur = (key) => () => { setTouched((current) => ({ ...current, [key]: true })); setErrors((current) => ({ ...current, [key]: validate(form)[key] || "" })); };
  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setTouched(Object.fromEntries(fieldKeys.map((key) => [key, true]))); setErrors(nextErrors);
    const firstInvalid = fieldKeys.find((key) => nextErrors[key]);
    if (firstInvalid) {
      window.requestAnimationFrame(() => document.querySelector(".student-profile-edit .cms-field.is-invalid input, .student-profile-edit .cms-field.is-invalid select, .student-profile-edit .cms-field.is-invalid textarea")?.focus());
      return;
    }
    const optionalEmail = (value) => value.trim() || null;
    const payload = {
      admissionId: numberOrZero(form.admissionId), admissionNo: form.admissionNo.trim(), admissionNumber: form.admissionNumber.trim(), admissionDate: form.admissionDate || null, admissionType: form.admissionType.trim(), admissionQuota: form.admissionQuota.trim(), medium: form.medium.trim(), secondLanguage: form.secondLanguage.trim(),
      studentName: form.studentName.trim(), photo: form.photo.trim(), gender: form.gender, dateOfBirth: form.dateOfBirth || null, bloodGroup: form.bloodGroup, email: optionalEmail(form.email), mobileNumber: form.mobileNumber.trim(), aadhaarNumber: form.aadhaarNumber.trim(), nationality: form.nationality.trim(), religion: form.religion.trim(), category: form.category.trim(), address: form.address.trim(), city: form.city.trim(), district: form.district.trim(), state: form.state.trim(), pincode: form.pincode.trim(),
      boardId: numberOrZero(form.boardId), academicYearId: numberOrZero(form.academicYearId), academicLevelId: numberOrZero(form.academicLevelId), groupId: numberOrZero(form.groupId), programId: numberOrZero(form.programId), sectionId: numberOrZero(form.sectionId), rollNo: form.rollNo.trim(), rollNumber: form.rollNumber.trim(), feeStructureId: numberOrZero(form.feeStructureId), paymentPlan: form.paymentPlan.trim(),
      studentType: form.studentType,
      transportRequired: form.studentType === "Non-Residential" && form.transportRequired === "Yes",
      ...(form.studentType === "Non-Residential" && form.transportRequired === "Yes" ? { routeId: numberOrZero(form.busRoute), pickupPointId: numberOrZero(form.pickupPoint) } : {}),
      ...(form.studentType === "Residential" ? { hostelId: numberOrZero(form.hostelBlock), hostelRoom: form.hostelRoomName || form.hostelRoom } : {}),
      previousSchool: form.previousSchool.trim(), previousHallTicketNumber: form.previousHallTicketNumber.trim(), previousBoard: form.previousBoard.trim(), previousYearOfPassing: numberOrZero(form.previousYearOfPassing), previousPercentage: numberOrZero(form.previousPercentage), studentCategory: form.studentCategory.trim(), scholarshipStatus: form.scholarshipStatus.trim(), scholarshipAmount: numberOrZero(form.scholarshipAmount),
      fatherName: form.fatherName.trim(), fatherOccupation: form.fatherOccupation.trim(), fatherMobile: form.fatherMobile.trim(), fatherEmail: optionalEmail(form.fatherEmail), motherName: form.motherName.trim(), motherOccupation: form.motherOccupation.trim(), motherMobile: form.motherMobile.trim(), motherEmail: optionalEmail(form.motherEmail), guardianName: form.guardianName.trim(), guardianMobile: form.guardianMobile.trim(), guardianEmail: optionalEmail(form.guardianEmail), annualIncome: numberOrZero(form.annualIncome), remarks: form.remarks.trim(),
    };
    if (import.meta.env.DEV) console.info("Student profile update payload:", payload);
    setSaving(true);
    let saved = false;
    try {
      await apiClient.put(apiEndpoints.students.update(id), payload);
      if (photoFile) {
        const photoData = new FormData();
        photoData.append("file", photoFile);
        await apiClient.post(apiEndpoints.students.uploadPhoto(id), photoData, { headers: { "Content-Type": "multipart/form-data" } });
      }
      saved = true;
      setMessage(photoFile ? "Student profile and photo updated successfully." : "Student profile updated successfully.");
      if (embedded && onSaved) await onSaved();
      else redirectTimer.current = window.setTimeout(() => navigate(`/dashboard/students/${id}`), 1400);
    }
    catch (error) { setMessage(studentUpdateError(error)); }
    finally { if (!saved) setSaving(false); }
  };
  const field = (key, props = {}) => ({ ...props, error: errors[key], onBlur: blur(key) });
  if (loading) return embedded ? <div className="cms-card"><div className="cms-empty">Loading student profile...</div></div> : <DashboardLayout title="EDIT STUDENT PROFILE" breadcrumb={["People", "Students"]}><div className="cms-card"><div className="cms-empty">Loading student profile...</div></div></DashboardLayout>;
  if (!student) return embedded ? <div className="cms-card"><div className="cms-empty">{loadError || "Student record was not found."}</div></div> : <DashboardLayout title="EDIT STUDENT PROFILE" breadcrumb={["People", "Students"]}><div className="cms-card"><div className="cms-empty">{loadError || "Student record was not found."}</div></div></DashboardLayout>;
  const editor = <form onSubmit={submit} className="cms-card student-profile-edit" noValidate>
    {!embedded ? <div className="student-profile-edit-summary"><span><small>Student Name</small><b>{student.name}</b></span><span><small>Roll No.</small><b>{student.rollNo}</b></span><span><small>Admission No.</small><b>{student.admissionNo}</b></span></div> : null}
    <ProfileSection title="Admission Details">
      <Field label="Admission No." {...field("admissionNo")}><input value={form.admissionNo} onChange={change("admissionNo")} /></Field><Field label="Admission Number" {...field("admissionNumber")}><input value={form.admissionNumber} onChange={change("admissionNumber")} /></Field><Field label="Admission Date" {...field("admissionDate")}><input type="date" value={form.admissionDate} onChange={change("admissionDate")} /></Field><Field label="Medium"><input value={form.medium} onChange={change("medium")} /></Field><Field label="Second Language"><input value={form.secondLanguage} onChange={change("secondLanguage")} /></Field>
    </ProfileSection>
    <ProfileSection title="Personal Information">
      <Field label="Student Name *" {...field("studentName")}><input value={form.studentName} onChange={change("studentName")} maxLength="100" /></Field>
      <Field label="Photo" error={photoError}><div className="student-profile-photo-upload"><div className="student-profile-photo-preview">{photoPreview || imageUrl(form.photo) ? <img src={photoPreview || imageUrl(form.photo)} alt={`${student.name}'s profile`} /> : <span>{initialsOf(student.name)}</span>}</div><input ref={photoInputRef} className="student-profile-photo-input" type="file" accept="image/jpeg,image/jpg,image/png" onChange={choosePhoto} /><button className="cms-btn cms-btn-ghost" type="button" onClick={() => photoInputRef.current?.click()}>{form.photo || photoPreview ? "Replace Photo" : "Upload Photo"}</button><small>JPG, JPEG or PNG</small></div></Field>
      <Field label="Gender *" {...field("gender")}><select value={form.gender} onChange={change("gender")}><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option></select></Field><Field label="Date of Birth *" {...field("dateOfBirth")}><input type="date" value={form.dateOfBirth} onChange={change("dateOfBirth")} /></Field><Field label="Blood Group"><select value={form.bloodGroup} onChange={change("bloodGroup")}><option value="">Select Blood Group</option>{bloodGroups.map((group) => <option key={group} value={group}>{group}</option>)}</select></Field><Field label="Nationality" {...field("nationality")}><input value={form.nationality} onChange={change("nationality")} maxLength="100" /></Field><Field label="Religion"><input value={form.religion} onChange={change("religion")} /></Field><Field label="Category"><input value={form.category} onChange={change("category")} /></Field>
    </ProfileSection>
    <ProfileSection title="Contact Information"><Field label="Email" {...field("email")}><input type="email" value={form.email} onChange={change("email")} maxLength="254" /></Field><Field label="Mobile Number" {...field("mobileNumber")}><input type="tel" inputMode="numeric" maxLength="10" value={form.mobileNumber} onChange={numericChange("mobileNumber", 10)} /></Field><Field label="Aadhaar Number" {...field("aadhaarNumber")}><input type="text" inputMode="numeric" maxLength="12" value={form.aadhaarNumber} onChange={numericChange("aadhaarNumber", 12)} /></Field></ProfileSection>
    <ProfileSection title="Academic Placement">
      <SelectField label="Board" value={form.boardId} options={lookups.boards} placeholder="Select board" disabled /><SelectField label="Academic Year" value={form.academicYearId} options={lookups.years} placeholder="Select academic year" disabled /><SelectField label="Academic Level" value={form.academicLevelId} options={lookups.levels} placeholder="Select academic level" disabled /><SelectField label="Group" value={form.groupId} options={lookups.groups} placeholder="Select group" disabled /><SelectField label="Program" value={form.programId} options={lookups.programs} placeholder="Select program" disabled /><SelectField label="Section" value={form.sectionId} options={lookups.sections} placeholder="Select section" disabled /><Field label="Roll No."><input value={form.rollNo} disabled /></Field><Field label="Roll Number"><input value={form.rollNumber} disabled /></Field>
    </ProfileSection>
    <ProfileSection title="Student Type & Residential Allocation">
      <AllocationSelectField label="Student Type" value={form.studentType} onChange={changeAllocation("studentType")} onBlur={blur("studentType")} error={errors.studentType} options={["Non-Residential", "Residential"]} placeholder="Select Type" />
      {form.studentType === "Non-Residential" ? <AllocationSelectField label="School Transport Facility Required?" value={form.transportRequired} onChange={changeAllocation("transportRequired")} onBlur={blur("transportRequired")} error={errors.transportRequired} options={["Yes", "No"]} placeholder="Select option" /> : null}
      {form.studentType === "Non-Residential" && form.transportRequired === "Yes" ? <><AllocationSelectField label="Bus Type" value={form.busType} onChange={changeAllocation("busType")} onBlur={blur("busType")} error={errors.busType} options={["AC", "Non-AC"]} placeholder="Select Bus Type" /><AllocationSelectField label="Route" value={form.busRoute} onChange={changeAllocation("busRoute")} onBlur={blur("busRoute")} error={errors.busRoute} options={routeOptions} placeholder={form.busType ? "Select Route" : "Select Bus Type first"} /><AllocationSelectField label="Pickup Point" value={form.pickupPoint} onChange={changeAllocation("pickupPoint")} onBlur={blur("pickupPoint")} error={errors.pickupPoint} options={pickupOptions} placeholder={form.busRoute ? "Select Pickup Point" : "Select Route first"} /></> : null}
      {form.studentType === "Residential" ? <><AllocationSelectField label="Hostel Block" value={form.hostelBlock} onChange={changeAllocation("hostelBlock")} onBlur={blur("hostelBlock")} error={errors.hostelBlock} options={hostelBlockOptions} placeholder="Select Hostel Block" /><AllocationSelectField label="Room Type" value={form.hostelRoom} onChange={changeAllocation("hostelRoom")} onBlur={blur("hostelRoom")} error={errors.hostelRoom} options={hostelRoomOptions} placeholder={form.hostelBlock ? "Select Room Type" : "Select Hostel Block first"} /></> : null}
      {allocationLookupError && (form.studentType === "Residential" || (form.studentType === "Non-Residential" && form.transportRequired === "Yes")) ? <small className="student-allocation-lookup-error student-profile-full">{allocationLookupError}</small> : null}
    </ProfileSection>
    <ProfileSection title="Previous Education">
      <Field label="Previous School"><input value={form.previousSchool} onChange={change("previousSchool")} /></Field><Field label="Previous Hall Ticket Number"><input value={form.previousHallTicketNumber} onChange={change("previousHallTicketNumber")} /></Field><Field label="Previous Board"><input value={form.previousBoard} onChange={change("previousBoard")} /></Field><Field label="Previous Year of Passing" {...field("previousYearOfPassing")}><input type="number" min="1900" max={new Date().getFullYear()} value={form.previousYearOfPassing} onChange={change("previousYearOfPassing")} /></Field><Field label="Previous Percentage" {...field("previousPercentage")}><input type="number" min="0" max="100" step="0.01" value={form.previousPercentage} onChange={change("previousPercentage")} /></Field>
    </ProfileSection>
    <ProfileSection title="Address"><Field label="Address" className="student-profile-full" {...field("address")}><textarea value={form.address} onChange={change("address")} rows="3" maxLength="250" /></Field><Field label="City" {...field("city")}><input value={form.city} onChange={change("city")} maxLength="100" /></Field><Field label="District" {...field("district")}><input value={form.district} onChange={change("district")} maxLength="100" /></Field><Field label="State" {...field("state")}><input value={form.state} onChange={change("state")} maxLength="100" /></Field><Field label="Pincode" {...field("pincode")}><input type="text" inputMode="numeric" maxLength="6" value={form.pincode} onChange={numericChange("pincode", 6)} /></Field></ProfileSection>
    <ProfileSection title="Father Details"><Field label="Father Name" {...field("fatherName")}><input value={form.fatherName} onChange={change("fatherName")} maxLength="100" /></Field><Field label="Occupation" {...field("fatherOccupation")}><input value={form.fatherOccupation} onChange={change("fatherOccupation")} maxLength="100" /></Field><Field label="Mobile Number" {...field("fatherMobile")}><input type="tel" inputMode="numeric" maxLength="10" value={form.fatherMobile} onChange={numericChange("fatherMobile", 10)} /></Field><Field label="Email" {...field("fatherEmail")}><input type="email" value={form.fatherEmail} onChange={change("fatherEmail")} maxLength="254" /></Field></ProfileSection>
    <ProfileSection title="Mother Details"><Field label="Mother Name" {...field("motherName")}><input value={form.motherName} onChange={change("motherName")} maxLength="100" /></Field><Field label="Occupation" {...field("motherOccupation")}><input value={form.motherOccupation} onChange={change("motherOccupation")} maxLength="100" /></Field><Field label="Mobile Number" {...field("motherMobile")}><input type="tel" inputMode="numeric" maxLength="10" value={form.motherMobile} onChange={numericChange("motherMobile", 10)} /></Field><Field label="Email" {...field("motherEmail")}><input type="email" value={form.motherEmail} onChange={change("motherEmail")} maxLength="254" /></Field></ProfileSection>
    <ProfileSection title="Guardian Details"><Field label="Guardian Name" {...field("guardianName")}><input value={form.guardianName} onChange={change("guardianName")} maxLength="100" /></Field><Field label="Mobile Number" {...field("guardianMobile")}><input type="tel" inputMode="numeric" maxLength="10" value={form.guardianMobile} onChange={numericChange("guardianMobile", 10)} /></Field><Field label="Email" {...field("guardianEmail")}><input type="email" value={form.guardianEmail} onChange={change("guardianEmail")} maxLength="254" /></Field></ProfileSection>
    <div className="student-profile-edit-actions">{embedded ? <button type="button" className="cms-btn cms-btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button> : <Link to={`/dashboard/students/${id}`} className="cms-btn cms-btn-ghost">Cancel</Link>}<button className="cms-btn cms-btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button></div>
  </form>;
  if (embedded) return <>{editor}<Toast message={message} onClose={() => setMessage("")} /></>;
  return <DashboardLayout title="EDIT STUDENT PROFILE" subtitle="Update student personal and family information." breadcrumb={["People", "Students"]}>{editor}<Toast message={message} onClose={() => setMessage("")} /></DashboardLayout>;
}

function ProfileSection({ title, children }) { return <section className="student-profile-section"><h2>{title}</h2><div className="cms-form-grid student-profile-form-grid">{children}</div></section>; }
function Field({ label, error, className = "", children, onBlur }) { return <label className={`cms-field ${className}${error ? " is-invalid" : ""}`} onBlur={onBlur}><span>{label}</span>{children}{error ? <small className="cms-field-error">{error}</small> : null}</label>; }
function SelectField({ label, value, onChange, options, placeholder, disabled = false }) {
  const selected = String(value ?? "");
  const hasSelectedOption = options.some((option) => option.value === selected);
  return <label className="cms-field"><span>{label}</span><select value={selected} onChange={onChange} disabled={disabled}><option value="">{placeholder}</option>{selected && !hasSelectedOption ? <option value={selected}>Loading {label.toLowerCase()}…</option> : null}{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
function AllocationSelectField({ label, value, onChange, onBlur, error, options, placeholder }) {
  const selected = String(value ?? "");
  const hasSelectedOption = options.some((option) => String(typeof option === "string" ? option : option.value) === selected);
  return <label className={`cms-field${error ? " is-invalid" : ""}`} onBlur={onBlur}><span>{label} <span className="req">*</span></span><select value={selected} onChange={onChange}><option value="">{placeholder}</option>{selected && !hasSelectedOption ? <option value={selected}>{selected}</option> : null}{options.map((option) => { const optionValue = typeof option === "string" ? option : option.value; const optionLabel = typeof option === "string" ? option : option.label; return <option key={optionValue} value={optionValue}>{optionLabel}</option>; })}</select>{error ? <small className="cms-field-error">{error}</small> : null}</label>;
}
