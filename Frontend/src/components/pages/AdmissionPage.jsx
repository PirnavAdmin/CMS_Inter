import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  BadgeCheck,
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  IndianRupee,
  MapPin,
  Plus,
  School,
  Search,
  User,
  Users,
  X,
} from "lucide-react";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import { env } from "@/config/env.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Field, Modal, Toast } from "@/components/common/Ui.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import {
  DEFAULT_INSTALLMENT_COUNT,
  INSTALLMENT_COUNTS,
  buildInstallmentSchedule,
  feeScheduleLabel,
  formatCurrency,
  formatDate,
  todayISO,
} from "@/data/feeManagementData.js";

const MAX_DOCUMENT_SIZE = 2 * 1024 * 1024;
const formatAmount = (value) => {
  const amount = Number(value || 0);
  return `\u20b9${(Number.isFinite(amount) ? amount : 0).toLocaleString("en-IN")}`;
};
const MOBILE_FIELDS = new Set(["studentMobileNumber", "mobile", "fatherMobile", "motherMobile", "guardianMobile"]);
const DIGIT_LIMITS = { aadhaar: 12, pincode: 6, passYear: 4 };
const AMOUNT_FIELDS = new Set(["feeAmount", "totalFee", "discount", "fine", "netPayable", "amountPaid", "balanceAmount"]);
const ALPHA_FIELDS = new Set([
  "firstName",
  "lastName",
  "religion",
  "fatherName",
  "fatherOccupation",
  "motherName",
  "motherOccupation",
  "guardianName",
  "city",
  "district",
  "prevSchool",
]);
const ADMISSION_GENDER_OPTIONS = ["Male", "Female", "Other"];
const DEFAULT_BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => ({ value: group, label: group }));
const newAdmissionValues = (values = {}) => {
  const next = normalizeAdmissionMobileState(values);
  if (!next.admissionDate) next.admissionDate = todayISO();
  if (String(next.quota || "").toLowerCase() === "other") next.quota = "Other";
  return next;
};

const getCollection = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.Results)) return data.Results;
  if (Array.isArray(data?.$values)) return data.$values;
  return [];
};

const getObject = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload;
  if (data?.data && !Array.isArray(data.data)) return data.data;
  if (data?.Data && !Array.isArray(data.Data)) return data.Data;
  if (data && !Array.isArray(data)) return data;
  return {};
};

const read = (item, ...keys) => {
  const key = keys.find((candidate) => item?.[candidate] !== undefined && item?.[candidate] !== null && item?.[candidate] !== "");
  return key ? item[key] : undefined;
};

const isSchemaPlaceholder = (value) => {
  if (typeof value !== "string") return false;
  return ["string", "number", "integer", "object", "array", "boolean"].includes(value.trim().toLowerCase());
};

const readText = (item, ...keys) => {
  const value = read(item, ...keys);
  if (value === undefined || value === null || value === "" || isSchemaPlaceholder(value)) return "";
  if (typeof value === "object") return "";
  return String(value);
};

const readNumber = (item, ...keys) => {
  const value = read(item, ...keys);
  if (value === undefined || value === null || value === "" || isSchemaPlaceholder(value)) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const readId = (item, ...keys) => {
  const value = read(item, ...keys);
  return value === undefined || value === null || value === "" || isSchemaPlaceholder(value) ? "" : String(value);
};

const studentMobileValue = (values = {}) => {
  const value = read(
    values,
    "studentMobileNumber",
    "StudentMobileNumber",
    "studentMobile",
    "mobile",
    "mobileNumber",
    "MobileNumber",
    "StudentMobile",
  );
  return String(value || "").replace(/\D/g, "").slice(0, 10);
};

const normalizeAdmissionMobileState = (values = {}) => {
  const mobile = studentMobileValue(values);
  const houseDoorNumber = values.houseDoorNumber ?? values.HouseDoorNumber ?? values.address1;
  const streetVillage = values.streetVillage ?? values.StreetVillage ?? values.address2;
  return {
    ...values,
    ...(mobile ? { studentMobileNumber: mobile, mobile } : {}),
    ...(houseDoorNumber !== undefined && houseDoorNumber !== null ? { houseDoorNumber, address1: houseDoorNumber } : {}),
    ...(streetVillage !== undefined && streetVillage !== null ? { streetVillage, address2: streetVillage } : {}),
  };
};

const getBackendOrigin = () => {
  const configuredBaseUrl = String(env.apiBaseUrl || "").trim();
  if (!configuredBaseUrl) return "";
  try {
    return new URL(configuredBaseUrl).origin;
  } catch {
    return configuredBaseUrl.replace(/\/+$/, "");
  }
};

const resolveStudentPhotoUrl = (value) => {
  const text = String(value || "").trim();
  if (!text || isSchemaPlaceholder(text)) return "";
  const cleanText = text.replace(/\\/g, "/");
  if (/^https?:\/\//i.test(cleanText)) {
    try {
      const url = new URL(cleanText);
      const baseUrl = getBackendOrigin();
      if (baseUrl && url.pathname.includes("/uploads/")) {
        return `${baseUrl}${url.pathname}${url.search}`;
      }
    } catch {
      return cleanText;
    }
    return cleanText;
  }
  if (cleanText.startsWith("blob:") || cleanText.startsWith("data:image/")) return cleanText;
  if (cleanText.startsWith("~") || cleanText.includes("/uploads/") || /\.(png|jpe?g|gif|webp|bmp)$/i.test(cleanText)) {
    const baseUrl = getBackendOrigin();
    const normalizedPath = cleanText.replace(/^~?\/?/, "/").replace(/^\/?wwwroot\//i, "/");
    const path = normalizedPath.startsWith("/student-photos/")
      ? `/uploads${normalizedPath}`
      : !normalizedPath.includes("/") && /\.(png|jpe?g|gif|webp|bmp)$/i.test(normalizedPath)
        ? `/uploads/student-photos/${normalizedPath}`
        : normalizedPath;
    return baseUrl ? `${baseUrl}${path}` : path;
  }
  return "";
};

const normalizeImageSource = resolveStudentPhotoUrl;

const studentPhotoSource = (values = {}, previewUrl = "") => (
  previewUrl || values.photoUrl || values.studentPhoto || ""
);

const isLooseId = (value) => {
  const text = String(value ?? "").trim();
  return text === "" || text === "0";
};

const idsMatchOrLoose = (selected, candidate) => (
  !selected || isLooseId(candidate) || String(candidate) === String(selected)
);

const textMatchesOrLoose = (selected, candidate) => (
  !selected || !candidate || String(candidate).trim().toLowerCase() === String(selected).trim().toLowerCase()
);

const normalizeMatchText = (value) => String(value ?? "").trim().toLowerCase();

const optionValuesFor = (options = [], value) => {
  const selected = String(value ?? "").trim();
  if (!selected) return [];
  const option = options.find((item) => String(item.value) === selected);
  return [selected, option?.label].filter(Boolean).map(normalizeMatchText);
};

const structureFieldMatches = (selectedValue, options, ...candidates) => {
  const selectedValues = optionValuesFor(options, selectedValue);
  if (!selectedValues.length) return true;
  const candidateValues = candidates.map(normalizeMatchText).filter(Boolean).filter((value) => value !== "0");
  if (!candidateValues.length) return true;
  return candidateValues.some((candidate) => selectedValues.includes(candidate));
};

const requiredStructureFieldMatches = (selectedValue, options, ...candidates) => {
  const selectedValues = optionValuesFor(options, selectedValue);
  if (!selectedValues.length) return false;
  const candidateValues = candidates.map(normalizeMatchText).filter(Boolean).filter((value) => value !== "0");
  if (!candidateValues.length) return false;
  return candidateValues.some((candidate) => selectedValues.includes(candidate));
};

const structureProgramMatches = (selectedValue, options, ...candidates) => {
  const selectedValues = optionValuesFor(options, selectedValue);
  const candidateValues = candidates.map(normalizeMatchText).filter(Boolean).filter((value) => value !== "0");
  if (!selectedValues.length) return !candidateValues.length;
  if (!candidateValues.length) return true;
  return candidateValues.some((candidate) => selectedValues.includes(candidate));
};

const isPlaceholderOption = (value) => String(value || "").startsWith("__");

function optionLabel(list, value) {
  return list?.find((option) => String(option.value) === String(value))?.label || "";
}

const uniqueOptionsByValue = (items = []) => Array.from(items.reduce((lookup, item) => {
  if (item?.value !== undefined && item.value !== null && item.value !== "") lookup.set(String(item.value), item);
  return lookup;
}, new Map()).values());

const isRawIdDisplay = (value, id = "") => {
  const text = String(value ?? "").trim();
  if (!text) return true;
  return Boolean(id && text === String(id)) || /^\d+$/.test(text);
};

const lookupLabel = (options = [], value, currentLabel = "") => {
  const label = String(currentLabel || "").trim();
  if (label && !isRawIdDisplay(label, value)) return label;
  return optionLabel(options, value) || (label && !isRawIdDisplay(label) ? label : "");
};

const resolveOptionValue = (options = [], value, label = "") => {
  const valueText = String(value ?? "").trim();
  const labelText = String(label ?? "").trim();
  const normalizedLabel = normalizeMatchText(labelText);
  if (normalizedLabel) {
    const byLabel = options.find((option) => normalizeMatchText(option.label) === normalizedLabel);
    if (byLabel) return String(byLabel.value);
  }
  const byValue = valueText ? options.find((option) => String(option.value) === valueText) : null;
  if (byValue) return String(byValue.value);
  return valueText;
};

const formatFeeDate = (value) => {
  if (!value || isSchemaPlaceholder(value)) return "";
  const raw = String(value).slice(0, 10);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
};

const getFeeTypeName = (item) => {
  const directName = readText(
    item,
    "feeTypeName",
    "FeeTypeName",
    "feeName",
    "FeeName",
    "name",
    "Name",
    "displayName",
    "DisplayName",
    "label",
    "Label",
  );
  if (directName) return directName;

  const feeType = read(item, "feeType", "FeeType", "type", "Type");
  if (typeof feeType === "string") return isSchemaPlaceholder(feeType) ? "" : feeType;
  if (!feeType || typeof feeType !== "object") return "";

  return readText(
    feeType,
    "feeTypeName",
    "FeeTypeName",
    "name",
    "Name",
    "displayName",
    "DisplayName",
    "label",
    "Label",
    "title",
    "Title",
  );
};

const getNestedRows = (item, ...keys) => {
  const value = read(item, ...keys);
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.$values)) return value.$values;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.Data)) return value.Data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.Items)) return value.Items;
  return [];
};

const expandFeeStructureItems = (item) => {
  const components = getNestedRows(
    item,
    "feeComponents",
    "FeeComponents",
    "feeItems",
    "FeeItems",
    "items",
    "Items",
    "feeStructureItems",
    "FeeStructureItems",
    "components",
    "Components",
    "feeDetails",
    "FeeDetails",
    "details",
    "Details",
  );
  if (!components.length) return [item];

  return components.map((component) => {
    const parentStructureId = readId(item, "feeStructureId", "FeeStructureId", "structureId", "StructureId", "id", "Id")
      || readFeeStructureId(item);
    const componentItemId = readId(component, "feeStructureItemId", "FeeStructureItemId", "structureItemId", "StructureItemId", "feeComponentId", "FeeComponentId", "id", "Id");
    return {
      ...item,
      ...component,
      ...(parentStructureId ? { feeStructureId: parentStructureId, structureId: parentStructureId } : {}),
      ...(componentItemId ? { feeStructureItemId: componentItemId } : {}),
    };
  });
};

const feeTypeIdentity = (item) => {
  const feeType = read(item, "feeType", "FeeType", "type", "Type");
  return [
    getFeeTypeName(item),
    readText(item, "feeTypeCode", "FeeTypeCode", "code", "Code"),
    readText(feeType, "feeTypeCode", "FeeTypeCode", "code", "Code"),
  ].join(" ").toLowerCase();
};

const classifyFeeItem = (item) => {
  const identity = feeTypeIdentity(item);
  if (identity.includes("admission")) return "admission";
  if (identity.includes("course") || identity.includes("tuition")) return "course";
  return "optional";
};

const isActiveRecord = (item) => {
  const status = read(item, "status", "Status");
  const isActive = read(item, "isActive", "IsActive", "active", "Active");
  if (typeof status === "string") return status.toLowerCase() !== "inactive";
  if (typeof isActive === "boolean") return isActive;
  return true;
};

const normalizeFeeStructureItem = (item, structure = {}) => {
  const feeType = read(item, "feeType", "FeeType", "type", "Type");
  const structureId = readId(item, "feeStructureId", "FeeStructureId", "structureId", "StructureId")
    || readId(structure, "feeStructureId", "FeeStructureId", "id", "Id");
  const feeStructureItemId = readId(item, "feeStructureComponentId", "FeeStructureComponentId", "feeStructureItemId", "FeeStructureItemId", "structureItemId", "StructureItemId", "itemId", "ItemId", "id", "Id");
  const feeTypeId = readId(item, "feeTypeId", "FeeTypeId", "typeId", "TypeId")
    || readId(feeType, "feeTypeId", "FeeTypeId", "id", "Id", "typeId", "TypeId");
  const name = getFeeTypeName(item);
  const amount = readNumber(item, "amount", "Amount", "feeAmount", "FeeAmount", "originalAmount", "OriginalAmount", "payableAmount", "PayableAmount", "totalAmount", "TotalAmount", "baseAmount", "BaseAmount") ?? 0;
  const mandatoryValue = read(item, "rule", "Rule", "requirement", "Requirement", "isMandatory", "IsMandatory", "required", "Required", "mandatory", "Mandatory");
  const requiredText = String(mandatoryValue ?? "").trim().toLowerCase();
  const required = typeof mandatoryValue === "string"
    ? ["true", "mandatory", "required", "yes", "1"].includes(requiredText)
    : Boolean(mandatoryValue);
  if (!name || !structureId) return null;
  const selectedValue = read(item, "selected", "Selected", "isSelected", "IsSelected", "applicable", "Applicable", "isApplicable", "IsApplicable");
  const selected = selectedValue === undefined || selectedValue === null || selectedValue === ""
    ? required
    : (typeof selectedValue === "string" ? !["false", "optional", "no", "0"].includes(selectedValue.trim().toLowerCase()) : Boolean(selectedValue));
  const id = feeStructureItemId || feeTypeId || `${structureId}-${name}`;
  return {
    id,
    structureId,
    feeStructureId: structureId,
    feeStructureItemId,
    structureItemId: feeStructureItemId,
    feeTypeId,
    type: name,
    originalAmount: amount,
    payableAmount: amount,
    required,
    selected: required || selected,
    kind: classifyFeeItem(item),
  };
};

const normalizeFeeStructureSummary = (item) => {
  const group = read(item, "group", "Group");
  const program = read(item, "program", "Program");
  const board = read(item, "board", "Board");
  const academicYear = read(item, "academicYear", "AcademicYear", "year", "Year");
  const id = readFeeStructureId(item);
  if (!id) return null;
  return {
    raw: item,
    id,
    boardId: readId(item, "boardId", "BoardId") || readId(board, "boardId", "BoardId", "id", "Id"),
    boardName: readText(item, "boardName", "BoardName") || (typeof board === "string" ? board : readText(board, "boardName", "BoardName", "name", "Name", "boardCode", "BoardCode")),
    academicYearId: readId(item, "academicYearId", "AcademicYearId") || readId(academicYear, "academicYearId", "AcademicYearId", "id", "Id"),
    academicYearName: readText(item, "academicYearName", "AcademicYearName") || (typeof academicYear === "string" ? academicYear : readText(academicYear, "academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name")),
    groupId: readId(item, "groupId", "GroupId") || readId(group, "groupId", "GroupId", "id", "Id"),
    groupName: readText(item, "groupName", "GroupName", "courseName", "CourseName") || (typeof group === "string" ? group : readText(group, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode")),
    programId: readId(item, "programId", "ProgramId") || readId(program, "programId", "ProgramId", "id", "Id"),
    programName: readText(item, "programName", "ProgramName") || (typeof program === "string" ? program : readText(program, "programName", "ProgramName", "name", "Name", "programCode", "ProgramCode")),
    status: readText(item, "status", "Status") || (read(item, "isActive", "IsActive") === false ? "Inactive" : "Active"),
  };
};

const feeStructureMatchesSelection = (item, { boardId, academicYearId, groupId, programId }, options = {}) => (
  structureFieldMatches(boardId, options.boards, item.boardId, item.boardName)
  && requiredStructureFieldMatches(academicYearId, options.years, item.academicYearId, item.academicYearName)
  && requiredStructureFieldMatches(groupId, options.groups, item.groupId, item.groupName)
  && structureProgramMatches(programId, options.programs, item.programId, item.programName)
);

const normalizeScholarship = (item) => {
  const id = readId(item, "scholarshipId", "ScholarshipId", "id", "Id");
  const name = readText(item, "scholarshipName", "ScholarshipName", "name", "Name", "title", "Title");
  if (!id || !name || !isActiveRecord(item)) return null;
  const discountType = readText(item, "discountType", "DiscountType", "type", "Type") || "Percentage";
  return {
    id,
    name,
    discountType: discountType === "%" ? "Percentage" : discountType,
    discountValue: readNumber(item, "discountValue", "DiscountValue", "value", "Value", "percentage", "Percentage", "amount", "Amount") ?? 0,
  };
};

const paymentPlanLabel = (plan) => COURSE_PAYMENT_PLAN_LABELS[plan] || feeScheduleLabel(plan);

const toOption = (item, idKeys, labelKeys) => {
  const value = read(item, ...idKeys);
  const label = read(item, ...labelKeys) || value;
  if (value === undefined || value === null || value === "") return null;
  return { value: String(value), label: String(label) };
};

const normalizeBloodGroupOption = (item) => {
  if (typeof item === "string") return item.trim() ? { value: item, label: item } : null;
  const label = readText(item, "bloodGroupName", "BloodGroupName", "bloodGroup", "BloodGroup", "name", "Name", "value", "Value", "label", "Label", "code", "Code");
  if (!label) return null;
  return { value: label, label };
};

const compactIds = (values = []) => (
  Array.isArray(values)
    ? values.map((value) => String(value ?? "").trim()).filter(Boolean)
    : []
);

const normalizeBoardOption = (item) => {
  const option = toOption(item, ["boardId", "BoardId", "id", "Id"], ["boardName", "BoardName", "boardCode", "BoardCode", "name", "Name"]);
  if (!option) return null;
  const levels = getCollection(read(item, "academicLevels", "AcademicLevels", "levels", "Levels"));
  const academicLevelIds = compactIds(read(item, "academicLevelIds", "AcademicLevelIds", "levelIds", "LevelIds"));
  const academicLevelNames = compactIds(read(item, "academicLevelNames", "AcademicLevelNames", "levelNames", "LevelNames"));
  const nestedLevelIds = levels.map((level) => readId(level, "academicLevelId", "AcademicLevelId", "id", "Id")).filter(Boolean);
  const nestedLevelNames = levels.map((level) => readText(level, "levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name")).filter(Boolean);
  return {
    ...option,
    academicLevelIds: academicLevelIds.length ? academicLevelIds : nestedLevelIds,
    academicLevelNames: academicLevelNames.length ? academicLevelNames : nestedLevelNames,
    levelMappingLoaded: Boolean(academicLevelIds.length || academicLevelNames.length || levels.length),
  };
};

const normalizeLevelOption = (item) => {
  const option = toOption(item, ["academicLevelId", "AcademicLevelId", "id", "Id"], ["levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name"]);
  return option ? {
    ...option,
    boardId: readId(item, "boardId", "BoardId"),
    academicYearId: readId(item, "academicYearId", "AcademicYearId"),
  } : null;
};

const toDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

const localISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const yesterdayISO = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localISODate(date);
};

const isTodayOrFutureDate = (value) => {
  if (!value) return false;
  const normalized = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) && normalized >= localISODate(new Date());
};

const appendIfPresent = (formData, key, value) => {
  if (value === undefined || value === null || value === "") return;
  formData.append(key, value);
};

const ADMISSION_DRAFT_KEY = "studentAdmissionDraft";
const ADMISSION_DRAFT_VERSION = 2;
const COURSE_PAYMENT_PLANS = ["Full Payment", "Installment Payment"];
const COURSE_PAYMENT_PLAN_LABELS = {
  "Full Payment": "Full Course Payment",
  "Installment Payment": "Course Fee Schedule",
};
const normalizeCoursePaymentPlan = (source, hasInstallments = false) => {
  const value = typeof source === "object" && source !== null
    ? read(
      source,
      "planName",
      "PlanName",
      "name",
      "Name",
      "paymentPlanName",
      "PaymentPlanName",
      "paymentPlan",
      "PaymentPlan",
    )
    : source;
  const text = typeof value === "object" ? "" : String(value || "").trim();
  const normalized = text.toLowerCase();
  if (normalized.includes("installment") || normalized.includes("schedule")) return "Installment Payment";
  if (normalized.includes("full")) return "Full Payment";
  if (COURSE_PAYMENT_PLANS.includes(text)) return text;
  return hasInstallments ? "Installment Payment" : "";
};
const toAdmissionPaymentPlan = (plan) => {
  const normalized = normalizeCoursePaymentPlan(plan);
  if (normalized === "Full Payment") return "Full Payment";
  if (normalized === "Installment Payment") return "Schedule Payment";
  return "";
};
const toFeeAssignmentPlanName = (plan) => {
  const normalized = normalizeCoursePaymentPlan(plan);
  if (normalized === "Full Payment") return "Full Payment";
  if (normalized === "Installment Payment") return "Installment Payment";
  return "";
};
const PAGE_SIZE = 6;
const ADMISSION_EXPORT_COLUMNS = [
  "Admission No",
  "Student Name",
  "Admission Date",
  "Academic Year",
  "Board",
  "Group",
  "Program",
  "Status",
];

const cleanExportValue = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
};

const safeExportFileName = (value) => String(value || "student-admissions")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "") || "student-admissions";

const steps = [
  {
    title: "Admission",
    fields: [
      { name: "admissionNo", label: "Admission Number", required: true },
      { name: "admissionDate", label: "Admission Date", type: "date", required: true },
      { name: "board", label: "Board", type: "select", options: [], required: true },
      { name: "year", label: "Academic Year", type: "select", options: [], required: true },
      { name: "admissionType", label: "Admission Type", type: "select", options: ["Regular", "Lateral Entry", "Transfer"] },
      { name: "quota", label: "Admission Quota", type: "select", options: ["Regular", "Merit", "Management", "Sports", "Reserved", "Other"] },
    ],
  },
  {
    title: "Student Details",
    fields: [
      { name: "photo", label: "Student Photo", type: "file" },
      { name: "firstName", label: "First Name", required: true },
      { name: "lastName", label: "Last Name", required: true },
      { name: "gender", label: "Gender", type: "select", options: ADMISSION_GENDER_OPTIONS, required: true },
      { name: "dob", label: "Date of Birth", type: "date", required: true },
      { name: "bloodGroup", label: "Blood Group", type: "select", options: [], required: true },
      { name: "aadhaar", label: "Aadhaar Number", required: true },
      { name: "studentMobileNumber", label: "Student Mobile", type: "tel" },
      { name: "email", label: "Email", type: "email" },
      { name: "religion", label: "Religion" },
      { name: "caste", label: "Caste Category", type: "select", options: ["General", "OBC", "SC", "ST", "EWS"] },
    ],
  },
  {
    title: "Parent Details",
    fields: [
      { name: "fatherName", label: "Father Name" },
      { name: "fatherOccupation", label: "Father Occupation" },
      { name: "fatherMobile", label: "Father Mobile", type: "tel" },
      { name: "motherName", label: "Mother Name" },
      { name: "motherOccupation", label: "Mother Occupation" },
      { name: "motherMobile", label: "Mother Mobile", type: "tel" },
      { name: "guardianName", label: "Guardian Name" },
      { name: "guardianMobile", label: "Guardian Mobile", type: "tel" },
      { name: "annualIncome", label: "Annual Income", type: "number" },
    ],
  },
  {
    title: "Address",
    fields: [
      { name: "houseDoorNumber", label: "House / Door Number", required: true },
      { name: "streetVillage", label: "Street / Village" },
      { name: "city", label: "Town", required: true },
      { name: "district", label: "District", required: true },
      { name: "state", label: "State", type: "select", options: ["Andhra Pradesh", "Telangana", "Karnataka", "Maharashtra", "Delhi"], required: true },
      { name: "pincode", label: "Pincode", required: true },
    ],
  },
  {
    title: "Previous School",
    fields: [
      { name: "prevSchool", label: "Previous School Name", required: true },
      { name: "prevBoard", label: "Previous Board", placeholder: "Enter Previous Board" },
      { name: "passYear", label: "Year of Passing", type: "number" },
      { name: "prevMarks", label: "Marks / GPA Obtained" },
      { name: "hallTicket", label: "Hall Ticket Number" },
    ],
  },
  {
    title: "Academic Details",
    fields: [
      { name: "level", label: "Academic Level", type: "select", options: [], required: true },
      { name: "group", label: "Group", type: "select", options: [] },
      { name: "program", label: "Program", type: "select", options: [] },
      { name: "medium", label: "Medium", type: "select", options: ["English", "Telugu", "Hindi"] },
      { name: "secondLanguage", label: "Second Language", type: "select", options: ["Sanskrit", "Telugu", "Hindi", "French"] },
    ],
  },
  {
    title: "Fee",
    custom: "fee",
    fields: [],
  },
];

// The stepper adds a final read-only Preview step after all data steps.
const allSteps = [...steps, { title: "Preview", fields: [] }];
const ADMISSION_FORM_STEP_COUNT = 6;
const FEE_STEP_INDEX = steps.findIndex((section) => section.custom === "fee");
const PREVIEW_STEP_INDEX = allSteps.length - 1;
const admissionMainTabs = [
  { title: "Admission Form", step: 0, icon: ClipboardList },
  { title: "Fee", step: FEE_STEP_INDEX, icon: IndianRupee },
  { title: "Preview", step: PREVIEW_STEP_INDEX, icon: Eye },
];
const admissionStatusFilterOptions = ["Pending", "Verified", "Approved", "Rejected"];

const stepIcons = {
  Admission: ClipboardList,
  "Admission Details": ClipboardList,
  "Personal Details": User,
  "Student Details": User,
  "Contact Details": MapPin,
  "Parent / Guardian": Users,
  "Parent Details": Users,
  Address: MapPin,
  "Previous School": School,
  "Academic Details": GraduationCap,
  Fee: IndianRupee,
  Preview: Eye,
};

const buildAdmissionFormData = (values) => {
  const formData = new FormData();
  const houseDoorNumber = values.houseDoorNumber ?? values.address1 ?? "";
  const streetVillage = values.streetVillage ?? values.address2 ?? "";
  appendIfPresent(formData, "AdmissionNo", values.admissionNo);
  appendIfPresent(formData, "AdmissionDate", toDateTime(values.admissionDate));
  appendIfPresent(formData, "AdmissionQuota", values.quota === "Other" ? values.quotaOther : values.quota);
  appendIfPresent(formData, "FirstName", values.firstName);
  appendIfPresent(formData, "LastName", values.lastName);
  appendIfPresent(formData, "Gender", values.gender);
  appendIfPresent(formData, "DateOfBirth", toDateTime(values.dob));
  appendIfPresent(formData, "BloodGroup", values.bloodGroup);
  if (typeof File !== "undefined" && values.photo instanceof File) {
    formData.append("StudentPhoto", values.photo);
  }
  appendIfPresent(formData, "Email", values.email);
  appendIfPresent(formData, "Student Mobile", studentMobileValue(values));
  appendIfPresent(formData, "HallTicketNumber", values.hallTicket);
  appendIfPresent(formData, "AadhaarNumber", values.aadhaar);
  appendIfPresent(formData, "Nationality", values.nationality);
  appendIfPresent(formData, "Religion", values.religion);
  appendIfPresent(formData, "Category", values.caste);
  appendIfPresent(formData, "FatherName", values.fatherName);
  appendIfPresent(formData, "FatherOccupation", values.fatherOccupation);
  appendIfPresent(formData, "FatherMobile", values.fatherMobile);
  appendIfPresent(formData, "FatherEmail", values.fatherEmail);
  appendIfPresent(formData, "MotherName", values.motherName);
  appendIfPresent(formData, "MotherOccupation", values.motherOccupation);
  appendIfPresent(formData, "MotherMobile", values.motherMobile);
  appendIfPresent(formData, "MotherEmail", values.motherEmail);
  appendIfPresent(formData, "GuardianName", values.guardianName);
  appendIfPresent(formData, "GuardianMobile", values.guardianMobile);
  appendIfPresent(formData, "GuardianEmail", values.guardianEmail);
  appendIfPresent(formData, "AnnualIncome", values.annualIncome);
  appendIfPresent(formData, "Address", [houseDoorNumber, streetVillage, values.city, values.district, values.state, values.pincode].filter(Boolean).join(", "));
  appendIfPresent(formData, "HouseDoorNumber", houseDoorNumber);
  appendIfPresent(formData, "StreetVillage", streetVillage);
  appendIfPresent(formData, "City", values.city);
  appendIfPresent(formData, "District", values.district);
  appendIfPresent(formData, "State", values.state);
  appendIfPresent(formData, "Pincode", values.pincode);
  appendIfPresent(formData, "BoardId", values.board);
  appendIfPresent(formData, "AcademicYearId", values.year);
  appendIfPresent(formData, "AcademicLevelId", values.level);
  appendIfPresent(formData, "AcademicLevel", values.levelName || values.level);
  appendIfPresent(formData, "GroupId", values.group);
  appendIfPresent(formData, "ProgramId", values.program);
  appendIfPresent(formData, "FeeStructureId", numericId(values.feeStructureId));
  const admissionPaymentPlan = toAdmissionPaymentPlan(values.paymentPlan);
  appendIfPresent(formData, "PaymentPlan", admissionPaymentPlan);
  if (import.meta.env.DEV) {
    console.log("Student Admission payment plan payload:", {
      uiPaymentPlan: values.paymentPlan,
      admissionPaymentPlan,
    });
  }
  appendIfPresent(formData, "Medium", values.medium);
  appendIfPresent(formData, "SecondLanguage", values.secondLanguage);
  appendIfPresent(formData, "AdmissionType", values.admissionType);
  appendIfPresent(formData, "ScholarshipStatus", values.scholarshipStatus);
  appendIfPresent(formData, "PreviousSchool", values.prevSchool);
  appendIfPresent(formData, "PreviousBoard", values.prevBoard);
  appendIfPresent(formData, "PreviousYearOfPassing", values.passYear);
  appendIfPresent(formData, "PreviousPercentage", values.prevMarks);
  return formData;
};

const debugAdmissionSubmitPayload = ({ endpoint, method, formData, values }) => {
  if (!import.meta.env.DEV) return;
  const keys = Array.from(formData.keys());
  console.log("Student Admission submit payload", {
    endpoint,
    method,
    keys,
    hasStudentMobileNumber: formData.has("Student Mobile"),
    hasHouseDoorNumber: formData.has("HouseDoorNumber"),
    hasStreetVillage: formData.has("StreetVillage"),
    hasExistingStudentPhoto: Boolean(values.studentPhoto),
    hasNewStudentPhoto: typeof File !== "undefined" && values.photo instanceof File,
  });
};

const sanitizeValue = (field, value) => {
  if (value === undefined || value === null) return "";
  const text = String(value);
  if (MOBILE_FIELDS.has(field.name)) return text.replace(/\D/g, "").slice(0, 10);
  if (field.name === "aadhaar") return text.replace(/\D/g, "").slice(0, DIGIT_LIMITS.aadhaar);
  if (field.name === "pincode") return text.replace(/\D/g, "").slice(0, DIGIT_LIMITS.pincode);
  if (field.name === "annualIncome") return text.replace(/[^\d.]/g, "");
  if (AMOUNT_FIELDS.has(field.name)) return text.replace(/[^\d.]/g, "");
  if (field.name === "passYear") return text.replace(/\D/g, "").slice(0, DIGIT_LIMITS.passYear);
  if (ALPHA_FIELDS.has(field.name)) return text.replace(/[^A-Za-z ]/g, "").replace(/\s{2,}/g, " ");
  return text;
};

const fieldByName = steps
  .flatMap((section) => section.fields)
  .reduce((lookup, field) => ({ ...lookup, [field.name]: field }), {});

const visibleFieldsFor = (fields, currentValues) => fields.filter((field) => (
  typeof field.conditional === "function" ? field.conditional(currentValues) : true
));

const focusFirstError = (nextErrors) => {
  const [firstName] = Object.keys(nextErrors);
  if (!firstName) return;
  window.setTimeout(() => {
    const input = document.getElementById(`f-${firstName}`) || document.getElementById(`file-${firstName}`);
    input?.focus();
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 0);
};

const isBrowserStorageAvailable = () => typeof window !== "undefined" && window.localStorage;

const isFileFieldName = (name) => fieldByName[name]?.type === "file";

const toSerializableAdmissionValues = (currentValues) => Object.entries(currentValues).reduce((draftValues, [name, value]) => {
  if (isFileFieldName(name)) return draftValues;
  if (typeof File !== "undefined" && value instanceof File) return draftValues;
  if (value === undefined) return draftValues;
  draftValues[name] = value;
  return draftValues;
}, {});

const safeStepIndex = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), allSteps.length - 1);
};

const migrateDraftStep = (draft) => {
  const parsed = Number(draft?.currentStep);
  if (!Number.isInteger(parsed)) return 0;
  if (Number(draft?.version) === ADMISSION_DRAFT_VERSION) return safeStepIndex(parsed);
  if (parsed === 6 || parsed === 7) return steps.findIndex((section) => section.title === "Fee");
  if (parsed > 7) return allSteps.length - 1;
  return safeStepIndex(parsed);
};

const readAdmissionDraft = () => {
  if (!isBrowserStorageAvailable()) return { values: {}, step: 0, feeSelection: [], hasFeeSelection: false };

  const raw = window.localStorage.getItem(ADMISSION_DRAFT_KEY);
  if (!raw) return { values: {}, step: 0, feeSelection: [], hasFeeSelection: false };

  try {
    const draft = JSON.parse(raw);
    const values = normalizeAdmissionMobileState(draft?.formData && typeof draft.formData === "object" ? draft.formData : {});
    const feeSelection = Array.isArray(draft?.feeSelection) ? draft.feeSelection.map(String) : [];
    return {
      values,
      step: migrateDraftStep(draft),
      feeSelection,
      hasFeeSelection: Array.isArray(draft?.feeSelection),
    };
  } catch {
    window.localStorage.removeItem(ADMISSION_DRAFT_KEY);
    return { values: {}, step: 0, feeSelection: [], hasFeeSelection: false };
  }
};

const persistAdmissionDraft = ({ currentStep, formData, feeSelection }) => {
  if (!isBrowserStorageAvailable()) return;

  window.localStorage.setItem(ADMISSION_DRAFT_KEY, JSON.stringify({
    version: ADMISSION_DRAFT_VERSION,
    currentStep: safeStepIndex(currentStep),
    formData: toSerializableAdmissionValues(formData),
    feeSelection: Array.isArray(feeSelection) ? feeSelection.map(String) : [],
    updatedAt: new Date().toISOString(),
  }));
};

const clearAdmissionDraft = () => {
  if (isBrowserStorageAvailable()) window.localStorage.removeItem(ADMISSION_DRAFT_KEY);
};

const normalizeAdmissionStatus = (value, fallback = "Pending") => {
  const status = String(value || "").trim().toLowerCase();
  if (["approved", "approve", "active", "completed", "complete"].includes(status)) return "Approved";
  if (["rejected", "reject", "inactive", "cancelled", "canceled", "denied"].includes(status)) return "Rejected";
  if (["verified", "verify"].includes(status)) return "Verified";
  if (["pending", "draft", "incomplete", "new", "created", "submitted"].includes(status)) return "Pending";
  return fallback;
};

const readPhotoUrl = (...sources) => {
  const keys = [
    "studentPhotoUrl",
    "StudentPhotoUrl",
    "photoUrl",
    "PhotoUrl",
    "studentPhoto",
    "StudentPhoto",
    "photo",
    "Photo",
    "photoPath",
    "PhotoPath",
    "profilePhoto",
    "ProfilePhoto",
    "passportPhoto",
    "PassportPhoto",
  ];
  return sources
    .filter((source) => source && typeof source === "object")
    .map((source) => readText(source, ...keys))
    .find(Boolean) || "";
};

const readFeeStructureId = (item) => {
  const feeStructure = read(item, "feeStructure", "FeeStructure", "structure", "Structure");
  return readId(item, "feeStructureId", "FeeStructureId", "structureId", "StructureId")
    || readId(feeStructure, "feeStructureId", "FeeStructureId", "id", "Id", "structureId", "StructureId");
};

const isAdmissionVerified = (...sources) => sources.some((source) => {
  const status = readText(source, "status", "Status", "admissionStatus", "AdmissionStatus", "verificationStatus", "VerificationStatus");
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "verified"
    || normalized === "approved"
    || normalized === "approve"
    || read(source, "isVerified", "IsVerified", "verified", "Verified") === true
    || Boolean(read(source, "verifiedAt", "VerifiedAt", "verifiedDate", "VerifiedDate", "verifiedBy", "VerifiedBy"));
});

const admissionStatusClass = (status) => {
  if (status === "Approved") return "cms-badge-active";
  if (status === "Verified") return "cms-badge-info";
  if (status === "Rejected") return "cms-badge-danger";
  return "cms-badge-warn";
};

const readAdmissionFeeItems = (item, feeStructureId) => getNestedRows(
  item,
  "feeItems",
  "FeeItems",
  "selectedFeeItems",
  "SelectedFeeItems",
  "admissionFeeItems",
  "AdmissionFeeItems",
  "feeDetails",
  "FeeDetails",
  "feeComponents",
  "FeeComponents",
  "components",
  "Components",
).map((feeItem) => normalizeFeeStructureItem(
  { ...feeItem, feeStructureId: readFeeStructureId(feeItem) || feeStructureId },
  { feeStructureId },
)).filter(Boolean);

const readAdmissionInstallments = (item) => getNestedRows(
  item,
  "installments",
  "Installments",
  "courseSchedules",
  "CourseSchedules",
  "feeSchedules",
  "FeeSchedules",
  "paymentSchedules",
  "PaymentSchedules",
).map((row, index) => ({
  no: readNumber(row, "no", "No", "installmentNo", "InstallmentNo", "scheduleNo", "ScheduleNo") ?? index + 1,
  amount: readNumber(row, "amount", "Amount", "installmentAmount", "InstallmentAmount", "dueAmount", "DueAmount") ?? 0,
  dueDate: readText(row, "dueDate", "DueDate", "date", "Date").slice(0, 10),
}));

const persistedFeeSources = (payload) => {
  const root = getObject(payload);
  return [
    root,
    read(
      root,
      "studentFee",
      "StudentFee",
      "feeDetails",
      "FeeDetails",
      "feeAccount",
      "FeeAccount",
      "admissionFeeSelection",
      "AdmissionFeeSelection",
      "feeSelection",
      "FeeSelection",
      "assignment",
      "Assignment",
    ),
  ].filter((source) => source && typeof source === "object");
};

const readPersistedFeeState = (payload, currentValues = {}) => {
  const sources = persistedFeeSources(payload);
  const planSource = sources
    .map((source) => read(
      source,
      "paymentPlan",
      "PaymentPlan",
      "planName",
      "PlanName",
      "paymentPlanName",
      "PaymentPlanName",
      "feePaymentPlan",
      "FeePaymentPlan",
      "plan",
      "Plan",
    ))
    .find((source) => source !== undefined && source !== null && source !== "");
  const planObject = planSource && typeof planSource === "object" ? planSource : {};
  const schedules = [planObject, ...sources].map(readAdmissionInstallments).find((rows) => rows.length) || [];
  const explicitCount = sources.map((source) => readNumber(
    source,
    "numberOfInstallments",
    "NumberOfInstallments",
    "installmentCount",
    "InstallmentCount",
    "scheduleCount",
    "ScheduleCount",
  )).find((count) => count !== null) ?? readNumber(
    planObject,
    "numberOfInstallments",
    "NumberOfInstallments",
    "installmentCount",
    "InstallmentCount",
    "scheduleCount",
    "ScheduleCount",
  );
  const paymentPlan = normalizeCoursePaymentPlan(planSource, schedules.length > 0);
  const installmentCount = paymentPlan === "Installment Payment"
    ? explicitCount || schedules.length || Number(currentValues.installmentCount) || DEFAULT_INSTALLMENT_COUNT
    : paymentPlan === "Full Payment" ? 1 : currentValues.installmentCount || "";

  return {
    paymentPlan,
    installmentCount,
    installments: schedules.length ? schedules : (currentValues.installments || []),
    rawPaymentPlan: planSource,
  };
};

const hydratePersistedFeeState = (currentValues, payload) => {
  const persisted = readPersistedFeeState(payload, currentValues);
  if (!persisted.paymentPlan) return currentValues;
  return {
    ...currentValues,
    paymentPlan: persisted.paymentPlan,
    installmentCount: persisted.installmentCount,
    installments: persisted.paymentPlan === "Installment Payment" ? persisted.installments : [],
  };
};

const normalizeAdmissionRow = (item) => {
  const admissionId = readId(item, "admissionId", "AdmissionId", "id", "Id");
  const student = read(item, "student", "Student", "studentDetails", "StudentDetails", "approvedStudent", "ApprovedStudent", "createdStudent", "CreatedStudent");
  const admission = read(item, "admission", "Admission", "studentAdmission", "StudentAdmission", "admissionDetails", "AdmissionDetails");
  const firstName = readText(item, "firstName", "FirstName");
  const lastName = readText(item, "lastName", "LastName");
  const board = read(item, "board", "Board");
  const academicYear = read(item, "academicYear", "AcademicYear", "year", "Year");
  const academicLevel = read(item, "academicLevel", "AcademicLevel", "level", "Level");
  const group = read(item, "group", "Group");
  const program = read(item, "program", "Program");
  const studentName = readText(item, "studentName", "StudentName", "name", "Name", "fullName", "FullName")
    || [firstName, lastName].filter(Boolean).join(" ");
  const admissionNo = readText(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber", "number", "Number");
  const status = normalizeAdmissionStatus(readText(item, "status", "Status", "admissionStatus", "AdmissionStatus"));
  const programName = readText(item, "programName", "ProgramName")
    || (typeof program === "string" ? program : readText(program, "programName", "ProgramName", "name", "Name", "programCode", "ProgramCode"));
  const boardId = readId(item, "boardId", "BoardId") || readId(board, "boardId", "BoardId", "id", "Id");
  const rawBoardName = readText(item, "boardName", "BoardName")
    || (typeof board === "string" ? board : readText(board, "boardName", "BoardName", "name", "Name", "boardCode", "BoardCode"));
  const boardName = !isRawIdDisplay(rawBoardName, boardId) ? rawBoardName : "";
  const academicYearId = readId(item, "academicYearId", "AcademicYearId") || readId(academicYear, "academicYearId", "AcademicYearId", "id", "Id");
  const rawAcademicYearName = readText(item, "academicYearName", "AcademicYearName")
    || (typeof academicYear === "string" ? academicYear : readText(academicYear, "academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"));
  const academicYearName = !isRawIdDisplay(rawAcademicYearName, academicYearId) ? rawAcademicYearName : "";
  const groupId = readId(item, "groupId", "GroupId") || readId(group, "groupId", "GroupId", "id", "Id");
  const groupName = readText(item, "groupName", "GroupName") || (typeof group === "string" ? group : readText(group, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode"));
  const programId = readId(item, "programId", "ProgramId") || readId(program, "programId", "ProgramId", "id", "Id");
  const quotaValue = readText(item, "admissionQuota", "AdmissionQuota", "quota", "Quota");
  const standardQuota = steps[0].fields.find((field) => field.name === "quota")?.options || [];
  const isStandardQuota = standardQuota.some((option) => String(option).toLowerCase() === quotaValue.toLowerCase());
  const studentPhoto = readPhotoUrl(item, student, admission);
  const photoUrl = resolveStudentPhotoUrl(studentPhoto);
  const feeStructureId = readFeeStructureId(item);
  const savedFeeItems = readAdmissionFeeItems(item, feeStructureId);
  const savedInstallments = readAdmissionInstallments(item);
  const persistedFee = readPersistedFeeState(item, { installments: savedInstallments });
  const paymentPlan = persistedFee.paymentPlan;
  const combinedAddress = readText(item, "address", "Address");
  const combinedAddressParts = combinedAddress.split(",").map((part) => part.trim()).filter(Boolean);
  const houseDoorNumber = readText(item, "houseDoorNumber", "HouseDoorNumber", "addressLine1", "AddressLine1") || combinedAddressParts[0] || "";
  const streetVillage = readText(item, "streetVillage", "StreetVillage", "addressLine2", "AddressLine2") || combinedAddressParts[1] || "";
  const city = readText(item, "city", "City") || combinedAddressParts[2] || "";
  const district = readText(item, "district", "District") || combinedAddressParts[3] || "";
  const state = readText(item, "state", "State") || combinedAddressParts[4] || "";
  const pincode = readText(item, "pincode", "Pincode", "pinCode", "PinCode") || combinedAddressParts[5] || "";

  return {
    id: admissionId || admissionNo,
    admissionId,
    studentId: readId(item, "studentId", "StudentId") || readId(student, "studentId", "StudentId", "id", "Id"),
    admissionNo,
    studentName,
    admissionDate: readText(item, "admissionDate", "AdmissionDate", "date", "Date"),
    academicYear: academicYearId || academicYearName,
    academicYearName,
    board: boardId || boardName,
    boardName,
    group: !isRawIdDisplay(groupName, groupId) ? groupName : groupId,
    program: !isRawIdDisplay(programName, programId) ? programName : programId,
    studentPhoto,
    photoUrl,
    status,
    currentStep: 0,
    source: "api",
    raw: item,
    values: {
      admissionNo,
      admissionDate: readText(item, "admissionDate", "AdmissionDate", "date", "Date").slice(0, 10),
      admissionType: readText(item, "admissionType", "AdmissionType"),
      quota: quotaValue && !isStandardQuota ? "Other" : quotaValue,
      quotaOther: quotaValue && !isStandardQuota ? quotaValue : "",
      board: boardId,
      year: academicYearId,
      firstName,
      lastName,
      gender: readText(item, "gender", "Gender"),
      dob: readText(item, "dateOfBirth", "DateOfBirth", "dob", "DOB").slice(0, 10),
      bloodGroup: readText(item, "bloodGroup", "BloodGroup"),
      studentPhoto,
      photoUrl,
      aadhaar: readText(item, "aadhaarNumber", "AadhaarNumber", "aadhaar", "Aadhaar"),
      studentMobileNumber: readText(item, "studentMobileNumber", "StudentMobileNumber", "mobileNumber", "MobileNumber", "mobile", "Mobile"),
      mobile: readText(item, "studentMobileNumber", "StudentMobileNumber", "mobileNumber", "MobileNumber", "mobile", "Mobile"),
      email: readText(item, "studentEmail", "StudentEmail", "email", "Email"),
      religion: readText(item, "religion", "Religion"),
      caste: readText(item, "category", "Category", "caste", "Caste"),
      fatherName: readText(item, "fatherName", "FatherName"),
      fatherOccupation: readText(item, "fatherOccupation", "FatherOccupation"),
      fatherMobile: readText(item, "fatherMobile", "FatherMobile"),
      fatherEmail: readText(item, "fatherEmail", "FatherEmail"),
      motherName: readText(item, "motherName", "MotherName"),
      motherOccupation: readText(item, "motherOccupation", "MotherOccupation"),
      motherMobile: readText(item, "motherMobile", "MotherMobile"),
      motherEmail: readText(item, "motherEmail", "MotherEmail"),
      guardianName: readText(item, "guardianName", "GuardianName"),
      guardianMobile: readText(item, "guardianMobile", "GuardianMobile"),
      guardianEmail: readText(item, "guardianEmail", "GuardianEmail"),
      annualIncome: readText(item, "annualIncome", "AnnualIncome"),
      houseDoorNumber,
      streetVillage,
      address1: houseDoorNumber,
      address2: streetVillage,
      city,
      district,
      state,
      pincode,
      prevSchool: readText(item, "previousSchool", "PreviousSchool", "prevSchool", "PrevSchool"),
      prevBoard: readText(item, "previousBoard", "PreviousBoard", "prevBoard", "PrevBoard"),
      passYear: readText(item, "previousYearOfPassing", "PreviousYearOfPassing", "passYear", "PassYear"),
      prevMarks: readText(item, "previousPercentage", "PreviousPercentage", "prevMarks", "PrevMarks"),
      hallTicket: readText(item, "hallTicketNumber", "HallTicketNumber"),
      group: groupId,
      groupName,
      program: programId,
      programName,
      feeStructureId,
      feeItems: savedFeeItems,
      paymentPlan,
      installmentCount: persistedFee.installmentCount,
      installments: persistedFee.installments,
      status,
      level: readId(item, "academicLevelId", "AcademicLevelId") || readId(academicLevel, "academicLevelId", "AcademicLevelId", "id", "Id"),
      levelName: readText(item, "academicLevelName", "AcademicLevelName") || (typeof academicLevel === "string" ? academicLevel : readText(academicLevel, "academicLevelName", "AcademicLevelName", "name", "Name")),
      rollNumber: readText(item, "rollNo", "RollNo", "rollNumber", "RollNumber"),
      medium: readText(item, "medium", "Medium"),
      secondLanguage: readText(item, "secondLanguage", "SecondLanguage"),
    },
  };
};

const numericId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const admissionKeyFor = (record) => String(record?.admissionId || record?.id || "");

const findAdmissionByNumber = (rows = [], admissionNo = "") => {
  const target = String(admissionNo || "").trim().toLowerCase();
  if (!target) return null;
  return rows.find((row) => String(row.admissionNo || "").trim().toLowerCase() === target) || null;
};

const readStudentFeeAssignmentId = (payload) => {
  const data = getObject(payload);
  const rows = getCollection(payload);
  const sources = [
    data,
    read(data, "studentFee", "StudentFee", "feeAccount", "FeeAccount", "assignment", "Assignment"),
    rows[0],
    read(rows[0], "studentFee", "StudentFee", "feeAccount", "FeeAccount", "assignment", "Assignment"),
  ];
  for (const source of sources) {
    const id = readId(
      source,
      "studentFeeAssignmentId",
      "StudentFeeAssignmentId",
      "studentFeeId",
      "StudentFeeId",
      "feeAccountId",
      "FeeAccountId",
      "assignmentId",
      "AssignmentId",
      "id",
      "Id",
    );
    if (numericId(id)) return id;
  }
  return "";
};

const resolveApprovedStudentId = (...sources) => {
  for (const source of sources) {
    const student = read(source, "student", "Student", "approvedStudent", "ApprovedStudent", "createdStudent", "CreatedStudent", "studentDetails", "StudentDetails");
    const id = readId(source, "studentId", "StudentId", "approvedStudentId", "ApprovedStudentId", "createdStudentId", "CreatedStudentId")
      || readId(student, "studentId", "StudentId", "id", "Id");
    if (numericId(id)) return numericId(id);
  }
  return null;
};

const sameAdmissionIdentity = (left, right) => {
  const leftAdmissionId = readId(left, "admissionId", "AdmissionId", "id", "Id");
  const rightAdmissionId = readId(right, "admissionId", "AdmissionId", "id", "Id");
  if (leftAdmissionId && rightAdmissionId && String(leftAdmissionId) === String(rightAdmissionId)) return true;
  const leftNo = readText(left, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber");
  const rightNo = readText(right, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber");
  return Boolean(leftNo && rightNo && leftNo.trim().toLowerCase() === rightNo.trim().toLowerCase());
};

const sameStudentIdentity = (student, admission) => {
  const studentAdmissionNo = readText(student, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber");
  const admissionNo = readText(admission, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber");
  if (studentAdmissionNo && admissionNo && studentAdmissionNo.trim().toLowerCase() === admissionNo.trim().toLowerCase()) return true;
  const studentName = readText(student, "studentName", "StudentName", "name", "Name", "fullName", "FullName").trim().toLowerCase();
  const admissionName = (readText(admission, "studentName", "StudentName", "name", "Name", "fullName", "FullName")
    || [readText(admission, "firstName", "FirstName"), readText(admission, "lastName", "LastName")].filter(Boolean).join(" "))
    .trim()
    .toLowerCase();
  return Boolean(studentName && admissionName && studentName === admissionName);
};

const admissionFeeApprovalBody = (admissionId, status) => {
  const id = numericId(admissionId);
  if (status === "Rejected") {
    return { admissionId: id, rejectionReason: "Rejected from admission screen", remarks: "" };
  }
  return { admissionId: id, remarks: "" };
};

const admissionStatusBody = (admissionId) => admissionFeeApprovalBody(admissionId, "Verified");

const findApplicableFeeStructure = async ({ boardId, academicYearId, groupId, programId }) => {
  if (!boardId || !academicYearId || !groupId) {
    throw new Error("Fee account was not created because Board, Academic Year and Group are required to find a fee structure.");
  }
  const response = await apiClient.get(apiEndpoints.fee.getStructures);
  const structureRows = getCollection(response.data);
  const summaries = structureRows
    .map(normalizeFeeStructureSummary)
    .filter(Boolean)
    .filter((item) => item.status.toLowerCase() !== "inactive");
  const expandedSummaries = summaries.length ? summaries : structureRows
    .flatMap(expandFeeStructureItems)
    .map(normalizeFeeStructureSummary)
    .filter(Boolean)
    .filter((item) => item.status.toLowerCase() !== "inactive");
  const matching = expandedSummaries.find((item) => feeStructureMatchesSelection(item, { boardId, academicYearId, groupId, programId }));
  if (!matching) throw new Error("No active fee structure is configured for the approved student's academic combination.");
  return matching;
};

// Derives fee numbers only from backend fee rows loaded into the form state.
const deriveAdmissionFee = (values) => {
  const baseItems = Array.isArray(values.feeItems) ? values.feeItems : [];
  const feeItems = baseItems.map((item, index) => {
    const originalAmount = Number(item.originalAmount ?? item.amount ?? 0);
    const required = Boolean(item.required);
    return {
      ...item,
      id: item.id || item.feeStructureItemId || item.feeTypeId || `fee-${index + 1}`,
      type: item.type || `Fee ${index + 1}`,
      originalAmount,
      selected: required || item.selected !== false,
      required,
      payableAmount: originalAmount,
      dueDate: item.dueDate || "",
      kind: item.kind || classifyFeeItem(item),
    };
  });
  const selectedItems = feeItems.filter((item) => item.selected);
  const admissionItems = selectedItems.filter((item) => item.kind === "admission");
  const courseItems = selectedItems.filter((item) => item.kind === "course");
  const optionalItems = selectedItems.filter((item) => item.kind === "optional");
  const admissionFee = admissionItems.reduce((sum, item) => sum + item.originalAmount, 0);
  const courseFeeOriginal = courseItems.reduce((sum, item) => sum + item.originalAmount, 0);
  const optionalFeesTotal = optionalItems.reduce((sum, item) => sum + item.originalAmount, 0);
  const originalTotal = admissionFee + courseFeeOriginal + optionalFeesTotal;
  const concessionType = values.concessionType || values.scholarshipDiscountType || "Fixed";
  const concessionValue = Number(values.concessionValue || 0);
  const rawConcession = concessionType === "Percentage"
    ? (courseFeeOriginal * concessionValue) / 100
    : concessionValue;
  const courseConcession = Math.min(Math.max(Math.round(rawConcession), 0), courseFeeOriginal);
  const courseFeePayable = Math.max(courseFeeOriginal - courseConcession, 0);
  const totalCommitment = admissionFee + courseFeePayable + optionalFeesTotal;
  const schedule = Array.isArray(values.installments) ? values.installments : [];
  const isInstallment = values.paymentPlan === "Installment Payment";
  const coursePaidToday = isInstallment ? 0 : courseFeePayable;
  const paidToday = admissionFee + optionalFeesTotal + coursePaidToday;
  const courseScheduleBalance = isInstallment ? Math.max(courseFeePayable - coursePaidToday, 0) : 0;

  return {
    feeStructureId: values.feeStructureId || "",
    admissionFee,
    courseFee: courseFeePayable,
    courseFeeOriginal,
    courseConcession,
    courseFeePayable,
    optionalFeesTotal,
    totalCommitment,
    admissionFeeDueToday: admissionFee,
    coursePaidToday,
    courseScheduleBalance,
    feeItems,
    selectedFeeItems: selectedItems,
    originalTotal,
    concessionName: values.concessionName || "",
    concessionType,
    concessionValue,
    concessionTotal: courseConcession,
    totalPayable: totalCommitment,
    paidToday,
    remaining: Math.max(totalCommitment - paidToday, 0),
    remainingBalance: Math.max(totalCommitment - paidToday, 0),
    paymentPlan: values.paymentPlan || "",
    paymentMethod: values.paymentMethod || "",
    schedule: schedule.map((row, index) => ({
      ...row,
      no: row.no ?? index + 1,
      paidAmount: 0,
    })),
    courseSchedules: schedule.map((row, index) => ({
      ...row,
      no: row.no ?? index + 1,
      paidAmount: 0,
    })),
  };
};

const positiveIdValue = (value) => {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const readFeeStructureComponentId = (item = {}) => {
  const explicitId = positiveIdValue(read(
    item,
    "feeStructureComponentId",
    "FeeStructureComponentId",
    "feeStructureItemId",
    "FeeStructureItemId",
    "structureItemId",
    "StructureItemId",
    "itemId",
    "ItemId",
  ));
  if (explicitId) return explicitId;

  const rowId = positiveIdValue(read(item, "id", "Id"));
  const feeTypeId = positiveIdValue(read(item, "feeTypeId", "FeeTypeId", "typeId", "TypeId"));
  return rowId && rowId !== feeTypeId ? rowId : null;
};

const selectedFeeStructureComponentIdsFor = (values = {}) => {
  const fee = deriveAdmissionFee(values);
  const selectedItems = fee.selectedFeeItems.map((item) => ({
    item,
    componentId: readFeeStructureComponentId(item),
  }));
  return {
    selectedItems: fee.selectedFeeItems,
    missingComponentItems: selectedItems.filter(({ componentId }) => !componentId).map(({ item }) => item),
    componentIds: Array.from(new Set(selectedItems.map(({ componentId }) => componentId).filter(Boolean))),
  };
};

const saveAdmissionFeeSelections = async (admissionId, values) => {
  const numericAdmissionId = numericId(admissionId);
  if (!numericAdmissionId) throw new Error("Admission was saved, but the admission ID was not returned for fee selection.");

  const { selectedItems, missingComponentItems, componentIds } = selectedFeeStructureComponentIdsFor(values);
  if (!selectedItems.length) return;
  if (missingComponentItems.length) {
    if (import.meta.env.DEV) {
      console.error("Selected fee items are missing backend fee structure component IDs.", missingComponentItems);
    }
    throw new Error("Selected fee components could not be saved because their backend component IDs were not available.");
  }

  const payload = {
    admissionId: numericAdmissionId,
    selectedFeeStructureComponentIds: componentIds,
  };

  if (import.meta.env.DEV) {
    console.log("Student Admission fee selections payload", {
      endpoint: apiEndpoints.studentAdmissions.feeSelections(numericAdmissionId),
      admissionId: numericAdmissionId,
      selectedFeeStructureComponentIds: componentIds,
    });
  }

  await apiClient.post(apiEndpoints.studentAdmissions.feeSelections(numericAdmissionId), payload);
};

const feeStepErrors = (values) => {
  const next = {};
  const fee = deriveAdmissionFee(values);
  if (!numericId(values.feeStructureId) || !fee.feeItems.length) {
    next.feeStructure = "No fee structure is configured for the selected Academic Year, Group and Program.";
    return next;
  }
  if (!fee.admissionFee) next.feeStructure = "Admission Fee is not configured in the selected fee structure";
  if (!fee.courseFeeOriginal) next.feeStructure = "Course Fee is not configured in the selected fee structure";
  if (fee.feeItems.some((item) => item.required && !item.selected)) next.feeItems = "Mandatory fees cannot be removed";
  if (!values.paymentPlan) next.paymentPlan = "Select a course fee payment plan";
  if (!fee.selectedFeeItems.length) next.feeItems = "Select at least one applicable fee";
  if (fee.concessionType === "Percentage" && fee.concessionValue > 100) next.concessionValue = "Percentage concession cannot exceed 100%";
  if (fee.courseConcession > fee.courseFeeOriginal) next.concessionValue = "Concession cannot exceed the course fee";

  if (values.paymentPlan === "Installment Payment") {
    const schedule = Array.isArray(values.installments) ? values.installments : [];
    const total = schedule.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    if (schedule.length < 2) next.installments = "At least 2 fee schedules are required";
    else if (schedule.some((row) => Number(row.amount || 0) <= 0)) next.installments = "Every fee schedule amount must be greater than zero";
    else if (total !== fee.courseFeePayable) next.installments = `Course Fee Schedule total (${formatCurrency(total)}) must equal the course fee payable amount (${formatCurrency(fee.courseFeePayable)})`;
    else if (schedule.some((row) => !row.dueDate)) next.installments = "Every fee schedule needs a due date";
    else if (schedule.some((row, index) => index > 0 && String(row.dueDate) <= String(schedule[index - 1].dueDate))) {
      next.installments = "Course Fee Schedule due dates must be in ascending order and cannot conflict";
    }
  }
  return next;
};

// Renders a stored admission value for the read-only Preview step.
const formatPreviewValue = (field, value) => {
  if (value === undefined || value === null || String(value).trim() === "") return "-";
  if (field.type === "file") return value?.name || "Uploaded";
  if (field.type === "checkbox") return value ? "Yes" : "No";
  if (field.type === "select") return optionLabel(field.options || [], value) || String(value);
  if (AMOUNT_FIELDS.has(field.name)) return formatAmount(value);
  return String(value);
};

const previewFieldValue = (field, values) => {
  if (field.name === "quota" && values.quota === "Other") return values.quotaOther || "";
  if (field.name === "level") return values.levelName || values.level;
  if (field.name === "group") return values.groupName || values.group;
  if (field.name === "program") return values.programName || values.program;
  return values[field.name];
};

function StudentPhotoPreview({ src, label = "Student photo", emptyLabel = "Upload Photo" }) {
  const normalizedSrc = resolveStudentPhotoUrl(src);
  const [displaySrc, setDisplaySrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    setFailed(false);
    setDisplaySrc("");
    if (!normalizedSrc) return () => { active = false; };
    if (/^(?:blob:|data:image\/)/i.test(normalizedSrc)) {
      setDisplaySrc(normalizedSrc);
      return () => { active = false; };
    }
    apiClient.get(normalizedSrc, {
      responseType: "blob",
      headers: { Accept: "image/*" },
      skipGlobalLoader: true,
    }).then((response) => {
      if (!active) return;
      const contentType = String(response.headers?.["content-type"] ?? response.data?.type ?? "").toLowerCase();
      if (!contentType.startsWith("image/")) throw new Error("The photo endpoint did not return an image.");
      objectUrl = URL.createObjectURL(response.data);
      setDisplaySrc(objectUrl);
    }).catch(() => {
      if (!active) return;
      setFailed(true);
      if (import.meta.env.DEV) console.error("Student photo failed to load:", normalizedSrc);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [normalizedSrc]);
  return (
    <div className={`cms-admission-photo-preview ${!displaySrc || failed ? "is-empty" : ""}`}>
      {displaySrc && !failed ? (
        <img
          src={displaySrc}
          alt={label}
          onError={() => {
            setFailed(true);
          }}
        />
      ) : <span>{emptyLabel}</span>}
    </div>
  );
}

function AdmissionPreview({ sections, values, errors, onEdit, feeNode, photoPreviewUrl }) {
  return (
    <div className="cms-admission-preview">
      {sections.map((section, index) => (
        <section key={section.title} className="cms-preview-section">
          <div className="cms-preview-head">
            <h3>{section.title}</h3>
            <button type="button" className="cms-btn cms-btn-ghost cms-preview-edit" onClick={() => onEdit(index)}>
              <Edit3 size={14} /> Edit
            </button>
          </div>
          {section.custom === "fee" ? (
            <div className="cms-preview-fee">{feeNode}</div>
          ) : (
          <div className="cms-preview-grid">
            {visibleFieldsFor(section.previewFields ?? section.fields, values).map((field) => {
              const value = previewFieldValue(field, values);
              const fieldRequired = field.required || (typeof field.requiredWhen === "function" && field.requiredWhen(values));
              const missingRequired = fieldRequired && (value === undefined || value === null || String(value).trim() === "");
              const isPhoto = field.type === "file" && field.name === "photo";
              return (
                <div key={field.name} className={`cms-preview-item ${isPhoto ? "cms-preview-photo-item" : ""} ${missingRequired ? "is-missing" : ""}`}>
                  <span>{field.label}</span>
                  {isPhoto ? <StudentPhotoPreview src={studentPhotoSource(values, photoPreviewUrl)} emptyLabel="No Photo" /> : <strong>{formatPreviewValue(field, value)}</strong>}
                  {errors[field.name] || missingRequired ? <small>{errors[field.name] || `${field.label} is required`}</small> : null}
                </div>
              );
            })}
          </div>
          )}
        </section>
      ))}
    </div>
  );
}

function AdmissionFormSections({ sections, values, errors, onChange, onFileChange, onFileRemove, inputRefs, photoPreviewUrl }) {
  return (
    <div className="cms-admission-form-sections">
      {sections.map((section) => {
        const SectionIcon = stepIcons[section.title] || BookOpen;
        return (
          <section key={section.title} className="cms-admission-form-section">
            <div className="cms-admission-section-head">
              <span className="cms-admission-section-icon"><SectionIcon size={16} /></span>
              <h3>{section.title === "Admission" ? "Admission Details" : section.title}</h3>
            </div>
            <div className={`cms-form-grid ${section.title === "Address" ? "cms-admission-address-grid" : "cols-3"} ${section.title === "Admission" ? "cms-admission-details-grid" : ""} ${section.title === "Student Details" ? "cms-admission-student-grid" : ""}`}>
              {visibleFieldsFor(section.fields, values).map((field) => (
                <AdmissionField
                  key={field.name}
                  field={{ ...field, required: field.required || (typeof field.requiredWhen === "function" && field.requiredWhen(values)) }}
                  value={values[field.name]}
                  error={field.name === "quota" ? errors.quota || errors.quotaOther : errors[field.name]}
                  onChange={onChange}
                  onFileChange={onFileChange}
                  onFileRemove={onFileRemove}
                  inputRef={(element) => { inputRefs.current[field.name] = element; }}
                  previewUrl={field.name === "photo" ? studentPhotoSource(values, photoPreviewUrl) : ""}
                  extraValue={field.name === "quota" ? values.quotaOther : ""}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AdmissionField({ field, value, error, onChange, onFileChange, onFileRemove, inputRef, previewUrl = "", extraValue = "" }) {
  if (field.type === "select" && field.selectPlaceholder) {
    const normalizedOptions = (field.options || []).map((option) => (
      option && typeof option === "object"
        ? { value: option.value, label: option.label ?? option.value, disabled: Boolean(option.disabled) }
        : { value: option, label: option, disabled: false }
    ));
    return (
      <div className={`cms-field ${field.full ? "full" : ""} ${error ? "has-error" : ""}`}>
        <label htmlFor={`f-${field.name}`}>
          {field.label} {field.required ? <span className="req">*</span> : null}
        </label>
        <select
          id={`f-${field.name}`}
          value={value ?? ""}
          disabled={field.disabled}
          onChange={(event) => onChange(field.name, event.target.value)}
        >
          <option value="">{field.selectPlaceholder}</option>
          {normalizedOptions.map((option, index) => (
            <option key={`${option.value}-${index}`} value={option.value} disabled={option.disabled}>{option.label}</option>
          ))}
        </select>
        {error ? <span className="cms-error">{error}</span> : null}
      </div>
    );
  }

  if (field.name === "quota") {
    const isOtherQuota = value === "Other";
    return (
      <div className={`cms-field ${field.full ? "full" : ""} ${error ? "has-error" : ""}`}>
        <label htmlFor={isOtherQuota ? "f-quotaOther" : "f-quota"}>
          {field.label} {field.required ? <span className="req">*</span> : null}
        </label>
        <div className="cms-admission-quota-control">
          {isOtherQuota ? (
            <>
            <input
              id="f-quotaOther"
              value={extraValue || ""}
              placeholder="Specify Admission Quota"
              autoFocus
              onChange={(event) => onChange("quotaOther", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") onChange("quota", "");
              }}
            />
            <button type="button" className="cms-admission-quota-reset" onClick={() => onChange("quota", "")} aria-label="Choose predefined quota">
              <X size={14} />
            </button>
            </>
          ) : (
            <select id="f-quota" value={value ?? ""} onChange={(event) => onChange(field.name, event.target.value)}>
              <option value="">Select {field.label}</option>
              {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          )}
        </div>
        {error ? <span className="cms-error">{error}</span> : null}
      </div>
    );
  }

  if (field.type !== "file") {
    return <Field field={field} value={value} error={error} onChange={onChange} />;
  }

  const fileName = value?.name || "";
  const hasPhoto = Boolean(normalizeImageSource(previewUrl));
  return (
    <div className={`cms-field cms-admission-photo-cell ${error ? "has-error" : ""}`}>
      <label htmlFor={`file-${field.name}`}>
        {field.label} {field.required ? <span className="req">*</span> : null}
      </label>
      <div className="cms-admission-photo-field">
        <label className="cms-admission-photo-box" htmlFor={`file-${field.name}`}>
          <StudentPhotoPreview src={previewUrl} />
        </label>
        <div className={`cms-file-control ${fileName || hasPhoto ? "has-file" : ""}`}>
          <input
            ref={inputRef}
            id={`file-${field.name}`}
            type="file"
            className="cms-admission-photo-input"
            accept="image/*"
            onChange={(event) => onFileChange(field, event.target.files?.[0] || null)}
          />
          {fileName || hasPhoto ? (
            <button type="button" className="cms-file-remove" onClick={() => onFileRemove(field.name)} aria-label={`Remove ${field.label}`}>
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>
      {error ? <span className="cms-error">{error}</span> : null}
    </div>
  );
}

function FeeSummaryRows({ fee }) {
  return (
    <div className="cms-fee-summary">
      <div><span>Admission Fee</span><strong>{formatCurrency(fee.admissionFee)}</strong></div>
      <div><span>Course Fee Before Scholarship</span><strong>{formatCurrency(fee.courseFeeOriginal)}</strong></div>
      <div><span>Scholarship / Concession</span><strong>-{formatCurrency(fee.courseConcession)}</strong></div>
      <div><span>Course Fee Payable</span><strong>{formatCurrency(fee.courseFeePayable)}</strong></div>
      <div><span>Optional Selected Fees</span><strong>{formatCurrency(fee.optionalFeesTotal)}</strong></div>
      <div className="is-total"><span>Total Fee Commitment</span><strong>{formatCurrency(fee.totalCommitment)}</strong></div>
      <div><span>Due on Admission</span><strong>{formatCurrency(fee.paidToday)}</strong></div>
      <div><span>Future Scheduled Course Fee</span><strong>{formatCurrency(fee.courseScheduleBalance)}</strong></div>
      <div className="is-total"><span>Remaining Balance</span><strong>{formatCurrency(fee.remainingBalance)}</strong></div>
      <div><span>Payment Plan</span><strong>{fee.paymentPlan ? paymentPlanLabel(fee.paymentPlan) : "Not selected"}</strong></div>
    </div>
  );
}

function FeeItemsTable({ feeItems, errors, onChange }) {
  const updateItem = (id, patch) => {
    onChange("feeItems", feeItems.map((item) => {
      if (item.id !== id) return item;
      return { ...item, ...patch };
    }));
  };

  return (
    <div className="cms-fee-scroll">
      <table className="cms-fee-table">
        <thead>
          <tr>
            <th>Apply</th>
            <th>Fee Type</th>
            <th>Default Rule</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        <tbody>
          {feeItems.map((item) => (
            <tr key={item.id}>
              <td>
                <input
                  type="checkbox"
                  checked={item.selected}
                  disabled={item.required}
                  aria-label={`Apply ${item.type}`}
                  onChange={(event) => updateItem(item.id, { selected: event.target.checked })}
                />
              </td>
              <td>
                <strong>{item.type}</strong>
                {item.required ? <small className="cms-fee-required">Mandatory</small> : null}
              </td>
              <td>{item.required ? "Mandatory" : "Optional"}</td>
              <td className="num">{formatCurrency(item.originalAmount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Selected Fee Items Total</td>
            <td className="num">{formatCurrency(feeItems.filter((item) => item.selected).reduce((sum, item) => sum + item.originalAmount, 0))}</td>
          </tr>
        </tfoot>
      </table>
      {errors.feeItems ? <span className="cms-error">{errors.feeItems}</span> : null}
    </div>
  );
}

function ConcessionPanel({ fee, values, errors, onChange, scholarships }) {
  const scholarshipOptions = scholarships.map((item) => ({ value: item.id, label: item.name }));
  return (
    <section className="cms-fee-block">
      <h3>Scholarship / Concession</h3>
      <div className="cms-form-grid cols-3">
        <Field
          field={{ name: "scholarshipId", label: "Scholarship", type: "select", options: scholarshipOptions }}
          value={values.scholarshipId}
          error={errors.scholarshipId}
          onChange={onChange}
        />
        <div className="cms-fee-readonly-field">
          <span>Discount Type</span>
          <strong>{values.concessionType || "-"}</strong>
        </div>
        <div className="cms-fee-readonly-field">
          <span>Discount Value</span>
          <strong>{values.concessionType === "Percentage" ? `${Number(values.concessionValue || 0)}%` : formatCurrency(values.concessionValue || 0)}</strong>
        </div>
      </div>
      <div className="cms-fee-concession-summary">
        <div><span>Course Fee Before Scholarship</span><strong>{formatCurrency(fee.courseFeeOriginal)}</strong></div>
        <div><span>Course Scholarship</span><strong>-{formatCurrency(fee.courseConcession)}</strong></div>
        <div className="is-total"><span>Course Fee Payable</span><strong>{formatCurrency(fee.courseFeePayable)}</strong></div>
      </div>
    </section>
  );
}

function InstallmentScheduleTable({ schedule, editable, onChange }) {
  return (
    <div className="cms-fee-scroll">
      <table className="cms-fee-table">
        <thead>
          <tr>
            <th>Course Fee Schedule</th>
            <th className="num">Amount</th>
            <th>Due Date</th>
            <th className="num">Paid Amount</th>
            <th className="num">Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((row, index) => (
            <tr key={row.no}>
              <td>Course Fee Schedule {row.no}</td>
              <td className="num">
                {editable ? (
                  <input
                    className="cms-mini-input"
                    type="number"
                    min="0"
                    value={row.amount}
                    onChange={(event) => onChange(index, "amount", event.target.value)}
                    aria-label={`Course Fee Schedule ${row.no} amount`}
                  />
                ) : formatCurrency(row.amount)}
              </td>
              <td>
                {editable ? (
                  <input
                    className="cms-mini-input"
                    type="date"
                    value={row.dueDate || ""}
                    onChange={(event) => onChange(index, "dueDate", event.target.value)}
                    aria-label={`Course Fee Schedule ${row.no} due date`}
                  />
                ) : formatDate(row.dueDate)}
              </td>
              <td className="num">{formatCurrency(row.paidAmount || 0)}</td>
              <td className="num">{formatCurrency(Math.max(Number(row.amount || 0) - Number(row.paidAmount || 0), 0))}</td>
              <td>
                <span className={`cms-badge ${row.paidAmount ? "cms-badge-active" : "cms-badge-warn"}`}>
                  {row.paidAmount ? "Paid" : "Pending"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td className="num">{formatCurrency(schedule.reduce((sum, row) => sum + Number(row.amount || 0), 0))}</td>
            <td colSpan={4} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function FeeStep({ context, fee, values, errors, onChange, onInstallmentChange, onPlanChange, onInstallmentCountChange, scholarships = [], feeStructureLoading, feeStructureError }) {
  const hasStructure = fee.feeItems.length > 0;
  const isInstallment = values.paymentPlan === "Installment Payment";
  const schedule = fee.schedule;

  return (
    <div className="cms-fee-step">
      <div className="cms-fee-context">
        {context.map((item) => (
          <div key={item.label} className="cms-fee-context-item">
            <span>{item.label}</span>
            <strong>{item.value || "Not provided"}</strong>
          </div>
        ))}
      </div>

      {feeStructureLoading ? (
        <section className="cms-fee-block">
          <p className="cms-fee-empty">Loading applicable fee structure...</p>
        </section>
      ) : !hasStructure ? (
        <section className="cms-fee-block">
          <p className="cms-fee-empty">
            {feeStructureError || "No active fee structure is configured for the selected academic combination. Configure it in Fee Management -> Fee Setup -> Fee Structure."}
          </p>
          {errors.feeStructure ? <span className="cms-error">{errors.feeStructure}</span> : null}
        </section>
      ) : (
        <>
          <section className="cms-fee-block">
            <h3>Applicable Fee Structure</h3>
            <FeeItemsTable feeItems={fee.feeItems} errors={errors} onChange={onChange} />
          </section>

          <section className="cms-fee-block">
            <h3>Admission Fee - Due Today</h3>
            <div className="cms-fee-summary">
              <div><span>Admission Fee</span><strong>{formatCurrency(fee.admissionFee)}</strong></div>
              <div><span>Payment Requirement</span><strong>Due on admission</strong></div>
            </div>
          </section>

          <ConcessionPanel fee={fee} values={values} errors={errors} onChange={onChange} scholarships={scholarships} />

          <section className="cms-fee-block">
            <h3>Course Fee Payment Plan</h3>
            <div className="cms-fee-plan-grid">
              {COURSE_PAYMENT_PLANS.map((plan) => (
                <button
                  type="button"
                  key={plan}
                  className={`cms-fee-plan ${values.paymentPlan === plan ? "is-active" : ""}`}
                  onClick={() => onPlanChange(plan)}
                  aria-pressed={values.paymentPlan === plan}
                >
                  <span className="cms-fee-radio" aria-hidden="true" />
                  <span>
                    <strong>{paymentPlanLabel(plan)}</strong>
                    <small>{plan === "Full Payment" ? "Admission Fee and the full Course Fee are due on admission." : "Admission Fee is due on admission; schedule the Course Fee payable."}</small>
                  </span>
                </button>
              ))}
            </div>
            {errors.paymentPlan ? <span className="cms-error">{errors.paymentPlan}</span> : null}
          </section>

          {isInstallment ? (
            <section className="cms-fee-block">
              <h3>Course Fee Schedule</h3>
              <div className="cms-fee-inline-fields">
                <div className="cms-field">
                  <label htmlFor="f-installmentCount">Number of Course Fee Schedules</label>
                  <select
                    id="f-installmentCount"
                    value={String(values.installmentCount || DEFAULT_INSTALLMENT_COUNT)}
                    onChange={(event) => onInstallmentCountChange(Number(event.target.value))}
                  >
                    {INSTALLMENT_COUNTS.map((count) => <option key={count} value={String(count)}>{count} Course Fee Schedules</option>)}
                  </select>
                </div>
              </div>
              <InstallmentScheduleTable schedule={schedule} editable onChange={onInstallmentChange} />
              {errors.installments ? <span className="cms-error">{errors.installments}</span> : null}
            </section>
          ) : (
            <section className="cms-fee-block">
              <h3>Full Course Payment</h3>
              <div className="cms-fee-summary">
                <div><span>Admission Fee</span><strong>{formatCurrency(fee.admissionFee)}</strong></div>
                <div><span>Course Fee Payable</span><strong>{formatCurrency(fee.courseFeePayable)}</strong></div>
                <div><span>Optional One-Time Fees</span><strong>{formatCurrency(fee.optionalFeesTotal)}</strong></div>
                <div className="is-total"><span>Total Due on Admission</span><strong>{formatCurrency(fee.paidToday)}</strong></div>
              </div>
            </section>
          )}

          <section className="cms-fee-block">
            <h3>Final Fee Summary</h3>
            <FeeSummaryRows fee={fee} />
          </section>
        </>
      )}
    </div>
  );
}

function FeePreview({ fee, values }) {
  return (
    <div className="cms-fee-preview">
      <div className="cms-fee-kv-grid">
        <div><span>Group</span><strong>{values.groupName || values.group || "Not provided"}</strong></div>
        <div><span>Program</span><strong>{values.programName || values.program || "Not provided"}</strong></div>
        <div><span>Admission Fee</span><strong>{formatCurrency(fee.admissionFee)}</strong></div>
        <div><span>Course Fee</span><strong>{formatCurrency(fee.courseFeeOriginal)}</strong></div>
        <div><span>Scholarship</span><strong>{fee.concessionName || "No scholarship"}</strong></div>
        <div><span>Course Fee Payable</span><strong>{formatCurrency(fee.courseFeePayable)}</strong></div>
        <div><span>Payment Plan</span><strong>{values.paymentPlan ? paymentPlanLabel(values.paymentPlan) : "Not selected"}</strong></div>
        <div><span>Due on Admission</span><strong>{formatCurrency(fee.paidToday)}</strong></div>
        <div><span>Future Course Schedules</span><strong>{formatCurrency(fee.courseScheduleBalance)}</strong></div>
        <div><span>Remaining Balance</span><strong>{formatCurrency(fee.remainingBalance)}</strong></div>
      </div>
      {fee.selectedFeeItems.length ? (
        <div className="cms-fee-preview-schedule">
          <h4>Selected Fee Items</h4>
          <div className="cms-fee-scroll">
            <table className="cms-fee-table">
              <thead>
                <tr><th>Fee Type</th><th className="num">Amount</th></tr>
              </thead>
              <tbody>
                {fee.selectedFeeItems.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.type}</strong></td>
                    <td className="num">{formatCurrency(item.originalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {values.paymentPlan === "Installment Payment" && fee.courseSchedules.length ? (
        <div className="cms-fee-preview-schedule">
          <h4>Course Fee Schedule</h4>
          <InstallmentScheduleTable schedule={fee.courseSchedules} editable={false} onChange={() => {}} />
        </div>
      ) : null}
    </div>
  );
}

export default function AdmissionPage() {
  const {
    boards: contextBoards,
    academicYears: contextAcademicYears,
    selectedBoard,
    selectedBoardId,
    selectedAcademicYear,
    selectedAcademicYearId,
  } = useAcademicContext();
  const [initialDraft] = useState(readAdmissionDraft);
  const [viewMode, setViewMode] = useState("list");
  const [step, setStep] = useState(initialDraft.step);
  const [values, setValues] = useState(initialDraft.values);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ year: "", group: "", status: "" });
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionBusy, setActionBusy] = useState("");
  const [masterOptions, setMasterOptions] = useState({});
  const [masterStatus, setMasterStatus] = useState({ groupsLoading: false, groupsError: "", sectionsError: "", programsLoading: false, programsError: "" });
  const [scholarships, setScholarships] = useState([]);
  const [feeStructureLoading, setFeeStructureLoading] = useState(false);
  const [feeStructureError, setFeeStructureError] = useState("");
  const [admissionNumberLoading, setAdmissionNumberLoading] = useState(false);
  const [admissionNumberError, setAdmissionNumberError] = useState("");
  const [editingAdmissionId, setEditingAdmissionId] = useState("");
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [feeSelection, setFeeSelection] = useState(initialDraft.feeSelection);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const fileInputRefs = useRef({});
  const committedAdmissionRef = useRef(null);
  const submitInFlightRef = useRef(false);
  const stepNavRef = useRef(null);
  const stepButtonRefs = useRef({});
  const persistTimerRef = useRef(null);
  const suppressPersistRef = useRef(false);
  const feeSelectionInitializedRef = useRef(initialDraft.hasFeeSelection);
  const admissionNumberInFlightRef = useRef(false);
  const pincodeRequestRef = useRef(0);
  const academicLevelRequestRef = useRef(0);
  const programRequestRef = useRef(0);
  const boardMappingRequestRef = useRef(0);
  const approveInFlightRef = useRef(new Set());
  const approveStatusCheckRef = useRef(new Set());
  const verifiedInFlightRef = useRef(new Set());
  const admissionsRequestRef = useRef(0);
  const autoLocationRef = useRef({ city: "", district: "", state: "" });

  const current = allSteps[step];
  const isAdmissionFormStep = step < ADMISSION_FORM_STEP_COUNT;
  const isPreview = current.title === "Preview";
  const isFeeStep = current.custom === "fee";
  const activeMainStep = isAdmissionFormStep ? 0 : isFeeStep ? FEE_STEP_INDEX : PREVIEW_STEP_INDEX;
  const previewAdmissionStatus = normalizeAdmissionStatus(values.status);
  const previewVerifyRecord = useMemo(() => ({
    id: editingAdmissionId,
    admissionId: editingAdmissionId,
    admissionNo: values.admissionNo,
    feeStructureId: values.feeStructureId,
    values,
    status: previewAdmissionStatus,
  }), [editingAdmissionId, previewAdmissionStatus, values]);
  const canVerifyPreviewAdmission = isPreview && editingAdmissionId && previewAdmissionStatus === "Pending";
  const contextBoardOptions = useMemo(() => (
    (contextBoards || []).map(normalizeBoardOption).filter(Boolean)
  ), [contextBoards]);
  const contextYearOptions = useMemo(() => (
    (contextAcademicYears || []).map((item) => {
      const option = toOption(item, ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "name", "Name", "label", "Label", "code", "Code"]);
      return option ? { ...option, boardId: readId(item, "boardId", "BoardId") } : null;
    }).filter(Boolean)
  ), [contextAcademicYears]);
  const boardOptions = useMemo(() => uniqueOptionsByValue([
    ...contextBoardOptions,
    ...(masterOptions.boards || []),
  ]), [contextBoardOptions, masterOptions.boards]);
  const yearOptions = useMemo(() => uniqueOptionsByValue([
    ...contextYearOptions,
    ...(masterOptions.years || []),
  ]), [contextYearOptions, masterOptions.years]);
  const contextBoardLookupOptions = useMemo(() => uniqueOptionsByValue([
    ...(masterOptions.boards || []),
    ...contextBoardOptions,
  ]), [contextBoardOptions, masterOptions.boards]);
  const contextYearLookupOptions = useMemo(() => uniqueOptionsByValue([
    ...(masterOptions.years || []),
    ...contextYearOptions,
  ]), [contextYearOptions, masterOptions.years]);
  const selectedContextBoardLabel = selectedBoard?.boardName || selectedBoard?.name || selectedBoard?.label || selectedBoard?.code || "";
  const selectedContextYearLabel = selectedAcademicYear?.academicYearName || selectedAcademicYear?.name || selectedAcademicYear?.label || selectedAcademicYear?.code || "";
  const selectedContextBoardValue = useMemo(() => resolveOptionValue(
    contextBoardLookupOptions,
    selectedBoardId,
    selectedContextBoardLabel,
  ), [contextBoardLookupOptions, selectedBoardId, selectedContextBoardLabel]);
  const selectedContextYearValue = useMemo(() => resolveOptionValue(
    contextYearLookupOptions,
    selectedAcademicYearId,
    selectedContextYearLabel,
  ), [contextYearLookupOptions, selectedAcademicYearId, selectedContextYearLabel]);
  const admissionYearDisplay = useCallback((row) => (
    lookupLabel(yearOptions, row.academicYear, row.academicYearName)
    || (!isRawIdDisplay(row.academicYear) ? row.academicYear : "-")
  ), [yearOptions]);
  const admissionBoardDisplay = useCallback((row) => (
    lookupLabel(boardOptions, row.board, row.boardName)
    || (!isRawIdDisplay(row.board) ? row.board : "-")
  ), [boardOptions]);
  const groupOptions = useMemo(() => {
    const rows = masterOptions.groups || [];
    return rows.filter((item) => (
      idsMatchOrLoose(values.board, item.boardId)
      && idsMatchOrLoose(values.year, item.academicYearId)
      && idsMatchOrLoose(values.level, item.academicLevelId)
    ));
  }, [masterOptions.groups, values.board, values.level, values.year]);
  const sectionOptions = useMemo(() => {
    const rows = masterOptions.sections || [];
    const selectedGroupName = values.groupName || optionLabel(masterOptions.groups, values.group);
    const selectedLevelName = values.levelName || optionLabel(masterOptions.levels, values.level);
    const selectedBoardName = optionLabel(masterOptions.boards, values.board);
    return rows.filter((item) => (
      (!values.group || idsMatchOrLoose(values.group, item.groupId) || textMatchesOrLoose(selectedGroupName, item.groupName))
      && idsMatchOrLoose(values.year, item.academicYearId)
      && (idsMatchOrLoose(values.level, item.academicLevelId) || textMatchesOrLoose(selectedLevelName, item.academicLevelName))
      && (!values.board || idsMatchOrLoose(values.board, item.boardId) || textMatchesOrLoose(selectedBoardName, item.boardName))
    ));
  }, [masterOptions.boards, masterOptions.groups, masterOptions.levels, masterOptions.sections, values.board, values.group, values.groupName, values.level, values.levelName, values.year]);
  const programOptions = useMemo(() => masterOptions.programs || [], [masterOptions.programs]);
  const groupFilterOptions = useMemo(() => masterOptions.groups || [], [masterOptions.groups]);
  const bloodGroupOptions = useMemo(() => (
    masterOptions.bloodGroups?.length ? masterOptions.bloodGroups : DEFAULT_BLOOD_GROUP_OPTIONS
  ), [masterOptions.bloodGroups]);
  const academicYearOptions = useMemo(() => uniqueAcademicYearsByName(
    (yearOptions || []).filter((item) => (
      !values.board || !item.boardId || String(item.boardId) === String(values.board)
    )),
    (item) => item.label,
  ), [values.board, yearOptions]);
  const levelOptions = useMemo(() => {
    if (!values.board) return [];
    const levels = masterOptions.levels || [];
    const selectedBoard = (boardOptions || []).find((item) => String(item.value) === String(values.board));
    if (!selectedBoard) return [];
    const mappedIds = new Set((selectedBoard.academicLevelIds || []).map(String));
    if (mappedIds.size) return levels.filter((item) => mappedIds.has(String(item.value)));
    const mappedNames = new Set((selectedBoard.academicLevelNames || []).map((name) => String(name).trim().toLowerCase()));
    if (mappedNames.size) return levels.filter((item) => mappedNames.has(String(item.label).trim().toLowerCase()));
    const boardScopedLevels = levels.filter((item) => item.boardId && String(item.boardId) === String(values.board));
    if (boardScopedLevels.length) return boardScopedLevels;
    const yearScopedLevels = levels.filter((item) => item.academicYearId && String(item.academicYearId) === String(values.year));
    if (yearScopedLevels.length) return yearScopedLevels;
    const unscopedLevels = levels.filter((item) => !item.boardId && !item.academicYearId);
    return unscopedLevels.length ? unscopedLevels : levels;
  }, [boardOptions, masterOptions.levels, values.board, values.year]);
  const enhanceField = (field) => {
    if (field.name === "admissionNo" && !editingAdmissionId) {
      return {
        ...field,
        disabled: true,
        placeholder: admissionNumberLoading ? "Generating admission number..." : "Admission Number",
      };
    }
    if (field.name === "dob") return { ...field, max: yesterdayISO() };
    if (field.name === "board" && boardOptions?.length) return { ...field, options: boardOptions };
    if (field.name === "year" && yearOptions?.length) return { ...field, options: academicYearOptions };
    if (field.name === "level") {
      if (!values.board) return { ...field, options: [], selectPlaceholder: "Select Board first", disabled: true };
      return {
        ...field,
        options: levelOptions,
        selectPlaceholder: levelOptions.length ? "Select Academic Level" : "No academic levels available",
        disabled: !levelOptions.length,
      };
    }
    if (field.name === "group") {
      if (!values.board || !values.year || !values.level) {
        return { ...field, options: [], selectPlaceholder: "Select Board, Academic Year and Academic Level first", disabled: true };
      }
      if (masterStatus.groupsLoading) return { ...field, options: [{ value: "__loading_groups", label: "Loading groups...", disabled: true }] };
      if (masterStatus.groupsError) return { ...field, options: [{ value: "__groups_error", label: "Unable to load groups. Please try again.", disabled: true }] };
      return { ...field, options: groupOptions.length ? groupOptions : [{ value: "__no_groups", label: "No groups available", disabled: true }] };
    }
    if (field.name === "section") {
      if (masterStatus.sectionsError) return { ...field, options: [{ value: "__sections_error", label: "Unable to load sections. Please try again.", disabled: true }] };
      return { ...field, options: sectionOptions.length ? sectionOptions : [{ value: "__no_sections", label: "No sections available", disabled: true }] };
    }
    if (field.name === "program") {
      if (!values.group) return { ...field, options: [{ value: "__select_group", label: "Select Group first", disabled: true }] };
      if (masterStatus.programsLoading) return { ...field, options: [{ value: "__loading_programs", label: "Loading programs...", disabled: true }] };
      if (masterStatus.programsError) return { ...field, options: [{ value: "__programs_error", label: "Unable to load programs. Please try again.", disabled: true }] };
      return { ...field, options: programOptions.length ? programOptions : [{ value: "__no_programs", label: "No programs available", disabled: true }] };
    }
    if (field.name === "bloodGroup") return { ...field, options: bloodGroupOptions };
    return field;
  };
  const currentFields = current.fields.map(enhanceField);
  const admissionFormSections = steps.slice(0, ADMISSION_FORM_STEP_COUNT).map((section) => ({
    ...section,
    fields: section.fields.map(enhanceField),
  }));
  const previewSections = steps.map((section) => ({
    ...section,
    fields: section.fields.map(enhanceField),
  }));
  const displayedAdmissions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return admissions.filter((row) => {
      const matchesSearch = !term
        || String(row.studentName || "").toLowerCase().includes(term)
        || String(row.admissionNo || "").toLowerCase().includes(term);
      const rowYearLabel = admissionYearDisplay(row);
      const matchesYear = !filters.year
        || String(row.academicYear) === String(filters.year)
        || normalizeMatchText(rowYearLabel) === normalizeMatchText(filters.year);
      const matchesGroup = !filters.group
        || String(row.values?.group || "") === String(filters.group)
        || String(row.group || "").trim().toLowerCase() === String(optionLabel(groupFilterOptions, filters.group) || filters.group).trim().toLowerCase();
      const matchesStatus = !filters.status || normalizeAdmissionStatus(row.status) === filters.status;
      return matchesSearch && matchesYear && matchesGroup && matchesStatus;
    });
  }, [admissionYearDisplay, admissions, filters.group, filters.status, filters.year, groupFilterOptions, search]);
  const totalPages = Math.max(1, Math.ceil(displayedAdmissions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedAdmissions = displayedAdmissions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const admissionExportRows = useMemo(() => displayedAdmissions.map((row) => ({
    "Admission No": cleanExportValue(row.admissionNo),
    "Student Name": cleanExportValue(row.studentName),
    "Admission Date": cleanExportValue(formatDate(row.admissionDate) || "-"),
    "Academic Year": cleanExportValue(admissionYearDisplay(row)),
    Board: cleanExportValue(admissionBoardDisplay(row)),
    Group: cleanExportValue(row.group),
    Program: cleanExportValue(row.program),
    Status: cleanExportValue(row.status),
  })), [admissionBoardDisplay, admissionYearDisplay, displayedAdmissions]);

  const exportAdmissionsExcel = async () => {
    if (!admissionExportRows.length) {
      setToast("No admissions available to export.");
      setExportOpen(false);
      return;
    }
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(admissionExportRows, { header: ADMISSION_EXPORT_COLUMNS });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Admissions");
    XLSX.writeFile(workbook, `${safeExportFileName("Student Admissions")}.xlsx`);
    setExportOpen(false);
  };

  const exportAdmissionsPdf = async () => {
    if (!admissionExportRows.length) {
      setToast("No admissions available to export.");
      setExportOpen(false);
      return;
    }
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const document = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const exportedAt = new Date();
    document.setFontSize(16);
    document.text("Student Admissions", 36, 38);
    document.setFontSize(9);
    document.setTextColor(88, 97, 84);
    document.text(`Exported ${exportedAt.toLocaleString()}`, 36, 54);
    autoTable(document, {
      startY: 68,
      head: [ADMISSION_EXPORT_COLUMNS],
      body: admissionExportRows.map((row) => ADMISSION_EXPORT_COLUMNS.map((column) => row[column])),
      styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak", textColor: [28, 36, 22] },
      headStyles: { fillColor: [111, 132, 0], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [247, 248, 239] },
      margin: { left: 28, right: 28 },
    });
    document.save(`${safeExportFileName("Student Admissions")}-${exportedAt.toISOString().slice(0, 10)}.pdf`);
    setExportOpen(false);
  };

  const downloadAdmissionPreview = async () => {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const admissionNo = values.admissionNo || "admission";
    const document = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    document.setFontSize(16);
    document.text("Student Admission Form", 36, 38);
    document.setFontSize(10);
    document.setTextColor(88, 97, 84);
    document.text(`Admission No: ${admissionNo}`, 36, 56);
    let startY = 76;

    previewSections.forEach((section) => {
      if (section.custom === "fee") {
        const feeRows = [
          ["Admission Fee", formatCurrency(fee.admissionFee)],
          ["Course Fee", formatCurrency(fee.courseFee)],
          ["Total Payable", formatCurrency(fee.totalPayable)],
          ["Due on Admission", formatCurrency(fee.paidToday)],
          ["Remaining", formatCurrency(fee.remaining)],
          ["Payment Plan", paymentPlanLabel(fee.paymentPlan) || "-"],
        ];
        autoTable(document, {
          startY,
          head: [[section.title, ""]],
          body: feeRows,
          styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak", textColor: [28, 36, 22] },
          headStyles: { fillColor: [111, 132, 0], textColor: [255, 255, 255] },
          margin: { left: 36, right: 36 },
        });
        startY = document.lastAutoTable.finalY + 14;
        return;
      }

      const body = visibleFieldsFor(section.previewFields ?? section.fields, values).map((field) => [
        field.label,
        cleanExportValue(formatPreviewValue(field, previewFieldValue(field, values))),
      ]);
      autoTable(document, {
        startY,
        head: [[section.title, "Details"]],
        body,
        styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak", textColor: [28, 36, 22] },
        headStyles: { fillColor: [111, 132, 0], textColor: [255, 255, 255] },
        columnStyles: { 0: { cellWidth: 150, fontStyle: "bold" } },
        margin: { left: 36, right: 36 },
      });
      startY = document.lastAutoTable.finalY + 14;
      if (startY > 720) {
        document.addPage();
        startY = 40;
      }
    });

    document.save(`${safeExportFileName(`Admission ${admissionNo}`)}.pdf`);
  };

  const refreshAdmissions = async () => {
    const requestId = admissionsRequestRef.current + 1;
    admissionsRequestRef.current = requestId;
    setListLoading(true);
    try {
      const response = await apiClient.get(apiEndpoints.admissions.getAll);
      const apiRows = getCollection(response.data).map(normalizeAdmissionRow);
      if (admissionsRequestRef.current !== requestId) return apiRows;
      setAdmissions(apiRows);
      return apiRows;
    } catch (err) {
      if (admissionsRequestRef.current === requestId) setToast(getApiErrorMessage(err));
      return [];
    } finally {
      if (admissionsRequestRef.current === requestId) setListLoading(false);
    }
  };

  useEffect(() => {
    refreshAdmissions();
  }, []);

  useEffect(() => {
    if (viewMode !== "form" || editingAdmissionId || values.admissionDate) return;
    setValues((current) => (current.admissionDate ? current : { ...current, admissionDate: todayISO() }));
  }, [editingAdmissionId, values.admissionDate, viewMode]);

  useEffect(() => {
    const photo = values.photo;
    if (typeof File !== "undefined" && photo instanceof File) {
      const objectUrl = URL.createObjectURL(photo);
      setPhotoPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setPhotoPreviewUrl(values.photoUrl || values.studentPhoto || "");
    return undefined;
  }, [values.photo, values.photoUrl, values.studentPhoto]);

  useEffect(() => {
    const container = stepNavRef.current;
    const activeStep = stepButtonRefs.current[step];
    if (!container || !activeStep) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const targetLeft = activeStep.offsetLeft - ((container.clientWidth - activeStep.offsetWidth) / 2);
      container.scrollTo({ left: Math.max(targetLeft, 0), behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    if (editingAdmissionId) return undefined;
    if (suppressPersistRef.current) return undefined;

    if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      persistAdmissionDraft({ currentStep: step, formData: values, feeSelection });
    }, 250);

    return () => {
      if (persistTimerRef.current) window.clearTimeout(persistTimerRef.current);
    };
  }, [editingAdmissionId, feeSelection, step, values, viewMode]);

  const feeStructureId = values.feeStructureId;
  const feeItems = values.feeItems;
  const paymentPlan = values.paymentPlan;
  const installmentCount = values.installmentCount;
  const admissionDate = values.admissionDate;

  // Keeps an explicitly selected installment schedule aligned with the course fee.
  useEffect(() => {
    if (editingAdmissionId) return;
    if (!feeStructureId || !feeItems?.length) return;
    setValues((current) => {
      const courseFeePayable = deriveAdmissionFee(current).courseFeePayable;
      const next = { ...current };
      let changed = false;
      if (next.paymentPlan === "Installment Payment") {
        const count = Number(next.installmentCount) || DEFAULT_INSTALLMENT_COUNT;
        const schedule = Array.isArray(next.installments) ? next.installments : [];
        const scheduleTotal = schedule.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        if (schedule.length !== count || scheduleTotal !== courseFeePayable) {
          next.installmentCount = count;
          next.installments = buildInstallmentSchedule(courseFeePayable, count, next.admissionDate || todayISO());
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [admissionDate, editingAdmissionId, feeItems, feeStructureId, installmentCount, paymentPlan]);

  useEffect(() => {
    if (!isFeeStep) return;
    window.requestAnimationFrame(() => {
      document.querySelector(".cms-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [isFeeStep]);

  const mastersLoadedRef = useRef(false);
  const loadedAcademicLevelsRef = useRef(new Set());
  const loadedBoardLevelsRef = useRef(new Set());

  useEffect(() => {
    if (viewMode !== "form" && viewMode !== "list") return;
    if (mastersLoadedRef.current) return;

    let ignore = false;
    mastersLoadedRef.current = true;

    const loadAdmissionMasters = async () => {
      setMasterStatus((current) => ({ ...current, groupsLoading: true, groupsError: "", sectionsError: "" }));
      const fetchGroups = () => apiClient.get(apiEndpoints.groups.dropdown)
        .catch((dropdownError) => {
          console.error("Unable to load group dropdown endpoint, falling back to groups list", dropdownError);
          return apiClient.get(apiEndpoints.groups.getAll, { params: { isActive: true } });
        });
      const selectedBoardForLevels = selectedContextBoardValue || values.board;
      const [yearsResult, levelsResult, groupsResult, sectionsResult, bloodGroupsResult, scholarshipsResult] = await Promise.allSettled([
        apiClient.get(apiEndpoints.academicYears.getAll),
        apiClient.get(apiEndpoints.boards.getAcademicLevels, selectedBoardForLevels ? { params: { boardId: selectedBoardForLevels } } : undefined),
        fetchGroups(),
        apiClient.get(apiEndpoints.sections.getAll),
        apiClient.get(apiEndpoints.admissions.bloodGroups),
        apiClient.get(apiEndpoints.fee.scholarships),
      ]);

      if (ignore) return;
      if (groupsResult.status === "rejected") console.error("Unable to load admission groups", groupsResult.reason);
      if (sectionsResult.status === "rejected") console.error("Unable to load admission sections", sectionsResult.reason);
      if (scholarshipsResult.status === "fulfilled") {
        setScholarships(getCollection(scholarshipsResult.value.data).map(normalizeScholarship).filter(Boolean));
      } else {
        setScholarships([]);
      }
      const allYearOptions = yearsResult.status === "fulfilled"
        ? getCollection(yearsResult.value.data)
          .map((item) => {
            const option = toOption(item, ["academicYearId", "AcademicYearId", "id", "Id"], ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name", "label", "Label", "code", "Code"]);
            return option ? { ...option, boardId: readId(item, "boardId", "BoardId") } : null;
          })
          .filter(Boolean)
        : [];
      
      const loadedBloodGroups = bloodGroupsResult.status === "fulfilled"
        ? getCollection(bloodGroupsResult.value.data).map(normalizeBloodGroupOption).filter(Boolean)
        : [];
      if (levelsResult.status === "fulfilled" && selectedBoardForLevels) {
        loadedAcademicLevelsRef.current.add(String(selectedBoardForLevels));
      }

      setMasterOptions((current) => ({
        ...current,
        boards: contextBoardOptions.length ? contextBoardOptions : current.boards || [],
        years: uniqueOptionsByValue([...contextYearOptions, ...allYearOptions]),
        levels: levelsResult.status === "fulfilled"
          ? getCollection(levelsResult.value.data)
            .map(normalizeLevelOption)
            .filter(Boolean)
          : (current.levels || []),
        groups: groupsResult.status === "fulfilled"
          ? getCollection(groupsResult.value.data)
            .map((item) => {
              const option = toOption(item, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "groupCode", "GroupCode", "name", "Name"]);
              return option ? {
                ...option,
                boardId: readId(item, "boardId", "BoardId"),
                academicYearId: readId(item, "academicYearId", "AcademicYearId"),
                academicLevelId: readId(item, "academicLevelId", "AcademicLevelId"),
              } : null;
            })
            .filter((item) => item?.value)
          : (current.groups || []),
        sections: sectionsResult.status === "fulfilled"
          ? getCollection(sectionsResult.value.data)
            .map((item) => {
              const option = toOption(item, ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "section", "Section", "name", "Name"]);
              const group = read(item, "group", "Group");
              const board = read(item, "board", "Board");
              const academicLevel = read(item, "academicLevel", "AcademicLevel");
              return option ? {
                ...option,
                boardId: readId(item, "boardId", "BoardId") || readId(board, "boardId", "BoardId", "id", "Id"),
                boardName: readText(item, "boardName", "BoardName") || (typeof board === "string" ? board : readText(board, "boardName", "BoardName", "name", "Name", "boardCode", "BoardCode")),
                groupId: readId(item, "groupId", "GroupId") || readId(group, "groupId", "GroupId", "id", "Id"),
                groupName: readText(item, "groupName", "GroupName") || (typeof group === "string" ? group : readText(group, "groupName", "GroupName", "name", "Name")),
                academicYearId: readId(item, "academicYearId", "AcademicYearId"),
                academicLevelId: readId(item, "academicLevelId", "AcademicLevelId") || readId(academicLevel, "academicLevelId", "AcademicLevelId", "id", "Id"),
                academicLevelName: readText(item, "academicLevelName", "AcademicLevelName") || (typeof academicLevel === "string" ? academicLevel : readText(academicLevel, "levelName", "LevelName", "academicLevelName", "AcademicLevelName", "name", "Name")),
              } : null;
            })
            .filter((item) => item?.value)
          : (current.sections || []),
        bloodGroups: loadedBloodGroups.length ? loadedBloodGroups : DEFAULT_BLOOD_GROUP_OPTIONS,
      }));
      setMasterStatus((current) => ({
        ...current,
        groupsLoading: false,
        groupsError: groupsResult.status === "rejected" ? "Unable to load groups. Please try again." : "",
        sectionsError: sectionsResult.status === "rejected" ? "Unable to load sections. Please try again." : "",
      }));
    };

    loadAdmissionMasters();
    return () => {
      ignore = true;
      setMasterStatus((current) => ({ ...current, groupsLoading: false }));
    };
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "form" || !values.board) return undefined;
    const boardId = String(values.board);
    if (loadedAcademicLevelsRef.current.has(boardId)) return undefined;

    const requestId = academicLevelRequestRef.current + 1;
    academicLevelRequestRef.current = requestId;
    apiClient.get(apiEndpoints.boards.getAcademicLevels, { params: { boardId } })
      .then((response) => {
        if (academicLevelRequestRef.current !== requestId) return;
        const levels = getCollection(response.data).map(normalizeLevelOption).filter(Boolean);
        if (!levels.length) return;
        loadedAcademicLevelsRef.current.add(boardId);
        setMasterOptions((current) => ({
          ...current,
          levels,
        }));
      })
      .catch((err) => {
        if (academicLevelRequestRef.current === requestId) {
          console.error("Unable to load academic levels for selected board", err);
        }
      });
    return undefined;
  }, [values.board, viewMode]);

  useEffect(() => {
    if (viewMode !== "form" || editingAdmissionId) return;
    if (!selectedContextBoardValue && !selectedContextYearValue) return;
    setValues((current) => {
      const nextBoard = selectedContextBoardValue ? String(selectedContextBoardValue) : current.board || "";
      const nextYear = selectedContextYearValue ? String(selectedContextYearValue) : current.year || "";
      const boardChanged = String(current.board || "") !== nextBoard;
      const yearChanged = String(current.year || "") !== nextYear;
      if (!boardChanged && !yearChanged) return current;
      return {
        ...current,
        board: nextBoard,
        year: nextYear,
        ...(boardChanged ? { level: "", levelName: "" } : {}),
        group: "",
        groupName: "",
        program: "",
        programName: "",
        section: "",
        feeStructureId: "",
        feeItems: [],
        installments: [],
        paymentPlan: "",
        collectFirstInstallment: false,
      };
    });
  }, [editingAdmissionId, selectedContextBoardValue, selectedContextYearValue, viewMode]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    if (editingAdmissionId || values.admissionNo) return undefined;
    if (admissionNumberInFlightRef.current) return undefined;

    let ignore = false;
    admissionNumberInFlightRef.current = true;
    setAdmissionNumberError("");
    setErrors((current) => ({ ...current, admissionNo: undefined }));
    setAdmissionNumberLoading(true);

    apiClient.post(apiEndpoints.admissions.generateNumber)
      .then((response) => {
        if (ignore) return;
        const data = response.data?.data ?? response.data?.Data ?? response.data;
        const generatedNumber = typeof data === "string"
          ? data
          : read(data, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber", "number", "Number");
        if (generatedNumber) {
          setValues((currentValues) => ({ ...currentValues, admissionNo: String(generatedNumber) }));
          return;
        }
        const message = "Admission number could not be generated by the backend.";
        setAdmissionNumberError(message);
        setErrors((current) => ({ ...current, admissionNo: message }));
        setToast(message);
      })
      .catch((err) => {
        if (ignore) return;
        const message = getApiErrorMessage(err);
        setAdmissionNumberError(message);
        setErrors((current) => ({ ...current, admissionNo: message }));
        setToast(message);
      })
      .finally(() => {
        if (!ignore) setAdmissionNumberLoading(false);
        admissionNumberInFlightRef.current = false;
      });

    return () => {
      ignore = true;
      admissionNumberInFlightRef.current = false;
    };
  }, [editingAdmissionId, values.admissionNo, viewMode]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    if (!values.board || loadedBoardLevelsRef.current.has(String(values.board))) return undefined;
    loadedBoardLevelsRef.current.add(String(values.board));

    const requestId = boardMappingRequestRef.current + 1;
    boardMappingRequestRef.current = requestId;
    apiClient.get(apiEndpoints.boards.getById(values.board))
      .then((response) => {
        if (boardMappingRequestRef.current !== requestId) return;
        const board = normalizeBoardOption(getObject(response.data));
        if (!board) return;
        setMasterOptions((current) => ({
          ...current,
          boards: (current.boards || []).map((item) => (
            String(item.value) === String(values.board)
              ? { ...item, ...board, levelMappingLoaded: true }
              : item
          )),
        }));
      })
      .catch(() => {
        if (boardMappingRequestRef.current !== requestId) return;
        setMasterOptions((current) => ({
          ...current,
          boards: (current.boards || []).map((item) => (
            String(item.value) === String(values.board)
              ? { ...item, levelMappingLoaded: true }
              : item
          )),
        }));
      });
    return undefined;
  }, [values.board, viewMode]);

  useEffect(() => {
    if (viewMode !== "form") return;
    setValues((current) => {
      const groupName = lookupLabel(masterOptions.groups, current.group, current.groupName);
      const programName = lookupLabel(programOptions, current.program, current.programName);
      const levelName = lookupLabel(masterOptions.levels, current.level, current.levelName);
      const next = { ...current };
      let changed = false;
      if (groupName && groupName !== current.groupName) {
        next.groupName = groupName;
        changed = true;
      }
      if (programName && programName !== current.programName) {
        next.programName = programName;
        changed = true;
      }
      if (levelName && levelName !== current.levelName) {
        next.levelName = levelName;
        changed = true;
      }
      return changed ? next : current;
    });
  }, [masterOptions.groups, masterOptions.levels, programOptions, viewMode]);

  useEffect(() => {
    if (viewMode !== "form" || !values.board || !values.level) return;
    if (!(masterOptions.levels || []).length) return;
    if (levelOptions.some((item) => String(item.value) === String(values.level))) return;
    if (editingAdmissionId && !levelOptions.length) return;
    setValues((current) => ({
      ...current,
      level: "",
      levelName: "",
      group: "",
      groupName: "",
      program: "",
      programName: "",
      feeStructureId: "",
      feeItems: [],
      installments: [],
    }));
  }, [editingAdmissionId, levelOptions, masterOptions.levels, values.board, values.level, viewMode]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    if (!values.board || !values.year || !values.level) {
      setMasterOptions((current) => ({ ...current, groups: [] }));
      setMasterStatus((current) => ({ ...current, groupsLoading: false, groupsError: "" }));
      return undefined;
    }
    let ignore = false;
    setMasterStatus((current) => ({ ...current, groupsLoading: true, groupsError: "" }));
    const params = {
      boardId: values.board || undefined,
      academicYearId: values.year || undefined,
      academicLevelId: values.level || undefined,
      isActive: true,
    };
    apiClient.get(apiEndpoints.groups.getAll, { params })
      .then((response) => {
        if (ignore) return;
        const groups = getCollection(response.data)
          .map((item) => {
            const option = toOption(item, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "groupCode", "GroupCode", "name", "Name"]);
            return option ? {
              ...option,
              boardId: readId(item, "boardId", "BoardId"),
              academicYearId: readId(item, "academicYearId", "AcademicYearId"),
              academicLevelId: readId(item, "academicLevelId", "AcademicLevelId"),
            } : null;
          })
          .filter((item) => item?.value);
        setMasterOptions((current) => ({ ...current, groups }));
      })
      .catch(() => {
        if (!ignore) {
          setMasterOptions((current) => ({ ...current, groups: [] }));
          setMasterStatus((current) => ({ ...current, groupsError: "Unable to load groups. Please try again." }));
        }
      })
      .finally(() => {
        if (!ignore) setMasterStatus((current) => ({ ...current, groupsLoading: false }));
      });
    return () => { ignore = true; };
  }, [values.board, values.level, values.year, viewMode]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    const groupId = values.group;
    const requestId = programRequestRef.current + 1;
    programRequestRef.current = requestId;
    setMasterOptions((current) => ({ ...current, programs: [] }));
    setMasterStatus((current) => ({ ...current, programsError: "" }));
    if (!groupId) {
      setMasterStatus((current) => ({ ...current, programsLoading: false }));
      return undefined;
    }
    setMasterStatus((current) => ({ ...current, programsLoading: true }));
    apiClient.get(apiEndpoints.programs.byGroup(groupId))
      .catch(() => apiClient.get(apiEndpoints.programs.mappedByGroup(groupId)))
      .catch(() => apiClient.get(apiEndpoints.programs.list, { params: { groupId, GroupId: groupId, isActive: true } }))
      .then((response) => {
        if (programRequestRef.current !== requestId) return;
        const programs = getCollection(response.data)
          .map((item) => toOption(item, ["programId", "ProgramId", "id", "Id"], ["programName", "ProgramName", "name", "Name", "programCode", "ProgramCode"]))
          .filter(Boolean);
        setMasterOptions((current) => ({ ...current, programs }));
        setValues((current) => {
          if (String(current.group) !== String(groupId)) return current;
          const selectedProgram = programs.find((item) => item.value === String(current.program));
          if (selectedProgram) return { ...current, programName: selectedProgram.label };
          if (editingAdmissionId) return current;
          return {
            ...current,
            program: "",
            programName: "",
            feeItems: [],
            installments: [],
          };
        });
      })
      .catch((err) => {
        if (programRequestRef.current !== requestId) return;
        setMasterStatus((current) => ({ ...current, programsError: getApiErrorMessage(err) }));
      })
      .finally(() => {
        if (programRequestRef.current === requestId) {
          setMasterStatus((current) => ({ ...current, programsLoading: false }));
        }
      });
    return undefined;
  }, [editingAdmissionId, values.group, viewMode]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    const boardId = values.board;
    const academicYearId = values.year;
    const groupId = values.group;
    const programId = values.program;
    setFeeStructureError("");
    if (!boardId || !academicYearId || !groupId) {
      setFeeStructureLoading(false);
      setValues((current) => ({
        ...current,
        feeStructureId: "",
        feeItems: [],
        ...(editingAdmissionId ? {} : { installments: [], paymentPlan: "" }),
        collectFirstInstallment: false,
      }));
      return undefined;
    }

    let ignore = false;
    setFeeStructureLoading(true);
    apiClient.get(apiEndpoints.fee.getStructures)
      .then(async (response) => {
        if (ignore) return;
        const structureRows = getCollection(response.data);
        const summaries = structureRows
          .map(normalizeFeeStructureSummary)
          .filter(Boolean)
          .filter((item) => item.status.toLowerCase() !== "inactive");
        const expandedSummaries = summaries.length ? summaries : structureRows
          .flatMap(expandFeeStructureItems)
          .map(normalizeFeeStructureSummary)
          .filter(Boolean)
          .filter((item) => item.status.toLowerCase() !== "inactive");
        const matching = expandedSummaries.find((item) => feeStructureMatchesSelection(item, {
          boardId,
          academicYearId,
          groupId,
          programId,
        }, {
          boards: boardOptions,
          years: yearOptions,
          groups: groupOptions,
          programs: programOptions,
        }));
        if (!matching) {
          if (!ignore) {
            setValues((current) => ({
              ...current,
              feeStructureId: "",
              feeItems: [],
              ...(editingAdmissionId ? {} : { installments: [], paymentPlan: "" }),
              collectFirstInstallment: false,
            }));
            setFeeStructureError("No fee structure is configured for the selected Academic Year, Group and Program.");
          }
          return;
        }

        const [detailResult, itemsResult] = await Promise.allSettled([
          apiClient.get(apiEndpoints.fee.getStructureById(matching.id)),
          apiClient.get(apiEndpoints.fee.getStructureItems(matching.id)),
        ]);
        if (ignore) return;
        const detail = detailResult.status === "fulfilled" ? getObject(detailResult.value.data) : matching.raw;
        const itemSource = itemsResult.status === "fulfilled"
          ? getCollection(itemsResult.value.data)
          : [
            ...expandFeeStructureItems(detail),
            ...expandedSummaries.filter((item) => item.id === matching.id).map((item) => item.raw),
          ];
        const feeItems = itemSource
          .map((item) => normalizeFeeStructureItem({ ...detail, ...item }, { ...matching.raw, ...detail, feeStructureId: matching.id }))
          .filter(Boolean);
        if (!feeItems.length) {
          setValues((current) => ({
            ...current,
            feeStructureId: "",
            feeItems: [],
            ...(editingAdmissionId ? {} : { installments: [], paymentPlan: "" }),
            collectFirstInstallment: false,
          }));
          setFeeStructureError("The matched fee structure has no configured fee items.");
          return;
        }
        setValues((current) => {
          if (String(current.board) !== String(boardId) || String(current.year) !== String(academicYearId) || String(current.group) !== String(groupId) || String(current.program || "") !== String(programId || "")) return current;
          const previousItems = Array.isArray(current.feeItems) ? current.feeItems : [];
          const selectedByKey = new Map(previousItems.map((item) => [String(item.feeStructureItemId || item.structureItemId || item.feeTypeId || item.id), item]));
          const hydratedFeeItems = feeItems.map((item) => {
            const previous = selectedByKey.get(String(item.feeStructureItemId || item.structureItemId || item.feeTypeId || item.id));
            const componentId = String(item.feeStructureItemId || item.structureItemId || item.id || "");
            if (!previous && feeSelectionInitializedRef.current) {
              return {
                ...item,
                selected: item.required || feeSelection.includes(componentId),
              };
            }
            if (!previous) return item;
            return {
              ...item,
              selected: item.required || previous.selected !== false,
            };
          });
          const nextPlan = normalizeCoursePaymentPlan(current.paymentPlan, current.installments?.length > 0);
          return {
            ...current,
            feeStructureId: matching.id,
            feeItems: hydratedFeeItems,
            paymentPlan: nextPlan,
            installments: nextPlan === "Installment Payment" ? current.installments : [],
            collectFirstInstallment: false,
          };
        });
      })
      .catch((err) => {
        if (ignore) return;
        setValues((current) => ({
          ...current,
          feeStructureId: "",
          feeItems: [],
          ...(editingAdmissionId ? {} : { installments: [], paymentPlan: "" }),
          collectFirstInstallment: false,
        }));
        setFeeStructureError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!ignore) setFeeStructureLoading(false);
      });
    return () => { ignore = true; };
  }, [boardOptions, editingAdmissionId, feeSelection, groupOptions, programOptions, values.board, values.group, values.program, values.year, viewMode, yearOptions]);

  useEffect(() => {
    if (viewMode !== "form") return undefined;
    const pincode = String(values.pincode || "").trim();
    if (!/^[0-9]{6}$/.test(pincode)) {
      pincodeRequestRef.current += 1;
      setValues((current) => {
        const next = { ...current };
        let changed = false;
        ["city", "district", "state"].forEach((key) => {
          if (autoLocationRef.current[key] && current[key] === autoLocationRef.current[key]) {
            next[key] = "";
            changed = true;
          }
        });
        return changed ? next : current;
      });
      autoLocationRef.current = { city: "", district: "", state: "" };
      return undefined;
    }
    let ignore = false;
    const requestId = pincodeRequestRef.current + 1;
    pincodeRequestRef.current = requestId;
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiClient.get(apiEndpoints.location.byPincode(pincode));
        const data = response.data?.data ?? response.data?.Data ?? response.data;
        const city = readText(data, "city", "City", "mandal", "Mandal", "postOffice", "PostOffice");
        const district = readText(data, "district", "District");
        const state = readText(data, "state", "State");
        if (ignore || pincodeRequestRef.current !== requestId) return;
        setValues((current) => {
          const next = { ...current };
          const incoming = { city, district, state };
          ["city", "district", "state"].forEach((key) => {
            const wasAutoFilled = autoLocationRef.current[key] && current[key] === autoLocationRef.current[key];
            if (!current[key] || wasAutoFilled) next[key] = incoming[key] || "";
          });
          autoLocationRef.current = {
            city: next.city === city ? city : "",
            district: next.district === district ? district : "",
            state: next.state === state ? state : "",
          };
          return next;
        });
      } catch {
        if (!ignore && pincodeRequestRef.current === requestId) setToast("Pincode details could not be loaded. You can enter address details manually.");
      }
    }, 450);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [values.pincode, viewMode]);

  const fee = deriveAdmissionFee(values);

  const changePlan = (plan) => {
    setErrors((current) => ({ ...current, paymentPlan: undefined, installments: undefined }));
    setValues((current) => {
      const count = Number(current.installmentCount) || DEFAULT_INSTALLMENT_COUNT;
      if (plan !== "Installment Payment") {
        return { ...current, paymentPlan: plan, installments: [], collectFirstInstallment: false };
      }
      return {
        ...current,
        paymentPlan: plan,
        installmentCount: count,
        installments: buildInstallmentSchedule(deriveAdmissionFee({ ...current, paymentPlan: plan }).courseFeePayable, count, current.admissionDate || todayISO()),
      };
    });
  };

  const changeInstallmentCount = (count) => {
    setErrors((current) => ({ ...current, installments: undefined }));
    setValues((current) => ({
      ...current,
      installmentCount: count,
      installments: buildInstallmentSchedule(deriveAdmissionFee(current).courseFeePayable, count, current.admissionDate || todayISO()),
    }));
  };

  const changeInstallment = (index, key, value) => {
    setErrors((current) => ({ ...current, installments: undefined }));
    setValues((current) => {
      const schedule = (Array.isArray(current.installments) ? current.installments : []).map((row, rowIndex) => (
        rowIndex === index
          ? { ...row, [key]: key === "amount" ? Number(String(value).replace(/[^\d]/g, "") || 0) : value }
          : row
      ));
      return { ...current, installments: schedule };
    });
  };

  const academicYearFilterOptions = useMemo(() => uniqueAcademicYearsByName(
    (masterOptions.years || []).map((item) => ({ value: item.label, label: item.label })),
    (item) => item.label,
  ), [masterOptions.years]);

  const feeContext = [
    { label: "Student", value: [values.firstName, values.lastName].filter(Boolean).join(" ") },
    { label: "Admission No", value: values.admissionNo },
    { label: "Academic Year", value: lookupLabel(yearOptions, values.year) || values.year },
    { label: "Academic Level", value: optionLabel(masterOptions.levels, values.level) || values.levelName || values.level },
    { label: "Group", value: values.groupName || optionLabel(masterOptions.groups, values.group) || values.group },
    { label: "Program", value: values.programName || optionLabel(programOptions, values.program) || values.program },
  ];

  const applyNewAdmissionAcademicDefaults = useCallback((formValues = {}) => {
    const next = { ...formValues };
    if (!String(next.board ?? "").trim() && selectedContextBoardValue) {
      next.board = String(selectedContextBoardValue);
    }
    if (!String(next.year ?? "").trim() && selectedContextYearValue) {
      next.year = String(selectedContextYearValue);
    }
    return next;
  }, [selectedContextBoardValue, selectedContextYearValue]);

  const setValue = (name, val) => {
    const field = fieldByName[name] || {};
    if (isPlaceholderOption(val)) return;
    if (name === "quota") {
      setValues((v) => ({
        ...v,
        quota: val,
        ...(val === "Other" ? {} : { quotaOther: "" }),
      }));
      setErrors((e) => ({ ...e, quota: undefined, quotaOther: undefined }));
      return;
    }
    if (name === "feeItems") {
      setValues((v) => ({ ...v, feeItems: val, installments: v.paymentPlan === "Installment Payment"
        ? buildInstallmentSchedule(deriveAdmissionFee({ ...v, feeItems: val }).courseFeePayable, Number(v.installmentCount) || DEFAULT_INSTALLMENT_COUNT, v.admissionDate || todayISO())
        : v.installments }));
      setErrors((e) => ({ ...e, feeItems: undefined, installments: undefined }));
      return;
    }
    if (name === "scholarshipId") {
      const scholarship = scholarships.find((item) => String(item.id) === String(val));
      setValues((v) => {
        const next = {
          ...v,
          scholarshipId: val,
          concessionName: scholarship?.name || "",
          concessionType: scholarship?.discountType || "",
          concessionValue: scholarship ? String(scholarship.discountValue || 0) : "",
        };
        return {
          ...next,
          installments: next.paymentPlan === "Installment Payment"
            ? buildInstallmentSchedule(deriveAdmissionFee(next).courseFeePayable, Number(next.installmentCount) || DEFAULT_INSTALLMENT_COUNT, next.admissionDate || todayISO())
            : next.installments,
        };
      });
      setErrors((e) => ({ ...e, scholarshipId: undefined, concessionValue: undefined, installments: undefined }));
      return;
    }
    if (["concessionName", "concessionType", "concessionValue"].includes(name)) {
      setValues((v) => {
        const next = {
          ...v,
          [name]: name === "concessionValue" ? String(val).replace(/[^\d.]/g, "") : val,
          ...(name === "concessionType" ? { concessionValue: "" } : {}),
        };
        return {
          ...next,
          installments: next.paymentPlan === "Installment Payment"
            ? buildInstallmentSchedule(deriveAdmissionFee(next).courseFeePayable, Number(next.installmentCount) || DEFAULT_INSTALLMENT_COUNT, next.admissionDate || todayISO())
            : next.installments,
        };
      });
      setErrors((e) => ({ ...e, [name]: undefined, installments: undefined }));
      return;
    }
    if (["board", "year", "level", "group", "program"].includes(name)) {
      feeSelectionInitializedRef.current = false;
      setFeeSelection([]);
    }
    if (["board", "year", "level"].includes(name)) {
      const labelKey = name === "level" ? "levelName" : null;
      const labelValue = name === "level" ? optionLabel(levelOptions, val) : "";
      setMasterOptions((current) => ({ ...current, programs: [] }));
      setValues((v) => ({
        ...v,
        [name]: sanitizeValue(field, val),
        ...(labelKey ? { [labelKey]: labelValue } : {}),
        ...(name === "board" ? { year: "", level: "", levelName: "" } : {}),
        group: "",
        groupName: "",
        program: "",
        programName: "",
        feeStructureId: "",
        feeItems: [],
        installments: [],
      }));
      setErrors((e) => ({ ...e, [name]: undefined, group: undefined, program: undefined, feeStructure: undefined }));
      return;
    }
    if (name === "collectFirstInstallment") {
      setValues((v) => ({ ...v, collectFirstInstallment: Boolean(val) }));
      setErrors((e) => ({ ...e, collectFirstInstallment: undefined }));
      return;
    }
    if (name === "group") {
      // Program depends on Group: reset the program and the fee schedule.
      setMasterOptions((current) => ({ ...current, programs: [] }));
      setValues((v) => ({
        ...v,
        group: val,
        groupName: optionLabel(groupOptions, val),
        program: "",
        programName: "",
        feeStructureId: "",
        feeItems: [],
        installments: [],
      }));
      setErrors((e) => ({ ...e, group: undefined, program: undefined, feeStructure: undefined }));
      return;
    }
    if (name === "program") {
      setValues((v) => ({ ...v, program: val, programName: optionLabel(programOptions, val), feeStructureId: "", feeItems: [], installments: [] }));
      setErrors((e) => ({ ...e, program: undefined, feeStructure: undefined }));
      return;
    }
    setValues((v) => ({ ...v, [name]: sanitizeValue(field, val) }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const setFileValue = (field, file) => {
    if (!file) return;
    if (file.size > MAX_DOCUMENT_SIZE) {
      if (fileInputRefs.current[field.name]) fileInputRefs.current[field.name].value = "";
      setValues((v) => {
        const next = { ...v };
        delete next[field.name];
        return next;
      });
      setErrors((e) => ({ ...e, [field.name]: "File size must not exceed 2 MB." }));
      return;
    }
    setValues((v) => ({ ...v, [field.name]: file }));
    setErrors((e) => ({ ...e, [field.name]: undefined }));
  };

  const removeFileValue = (name) => {
    if (fileInputRefs.current[name]) fileInputRefs.current[name].value = "";
    setValues((v) => {
      const next = { ...v };
      delete next[name];
      return next;
    });
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const validateFields = (fields) => {
    const next = {};
    visibleFieldsFor(fields, values).forEach((f) => {
      const val = values[f.name];
      const required = f.required || (typeof f.requiredWhen === "function" && f.requiredWhen(values));
      if (required && (!String(val ?? "").trim() || isPlaceholderOption(val))) next[f.name] = `${f.label} is required`;
      else if (f.name === "quota" && val === "Other" && !String(values.quotaOther || "").trim()) next.quotaOther = "Specify Admission Quota is required";
      else if (f.name === "dob" && val && isTodayOrFutureDate(val)) next[f.name] = "Date of Birth must be before today";
      else if (f.type === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) next[f.name] = "Enter a valid email";
      else if (MOBILE_FIELDS.has(f.name) && val && !/^[0-9]{10}$/.test(String(val))) next[f.name] = "Enter a valid 10 digit number";
      else if (f.name === "aadhaar" && val && !/^[0-9]{12}$/.test(String(val))) next[f.name] = "Enter a valid 12 digit Aadhaar number";
      else if (f.name === "pincode" && val && !/^[0-9]{6}$/.test(String(val))) next[f.name] = "Enter a valid 6 digit pincode";
      else if (ALPHA_FIELDS.has(f.name) && val && !/^[A-Za-z ]+$/.test(String(val))) next[f.name] = `${f.label} can contain only letters and spaces`;
      else if (f.type === "number" && val && Number.isNaN(Number(val))) next[f.name] = "Enter a valid number";
      else if (f.type === "file" && val?.size > MAX_DOCUMENT_SIZE) next[f.name] = "File size must not exceed 2 MB.";
      else if (f.name === "paymentMode" && !val && Number(values.amountPaid || 0) > 0) next[f.name] = "Payment Mode is required when an amount is paid";
      else if (f.name === "amountPaid" && Number(val || 0) > Number(values.netPayable || 0)) next[f.name] = "Amount Paid cannot exceed Net Payable";
    });
    return next;
  };

  const validateStepAt = (stepIndex) => {
    const section = steps[stepIndex];
    if (!section) return {};
    if (section.custom === "fee") return feeStepErrors(values);
    return validateFields(section.fields);
  };

  const validateStep = (stepIndex = step) => {
    const next = stepIndex < ADMISSION_FORM_STEP_COUNT
      ? steps.slice(0, ADMISSION_FORM_STEP_COUNT).reduce((all, section) => ({ ...all, ...validateFields(section.fields) }), {})
      : validateStepAt(stepIndex);
    setErrors(next);
    if (Object.keys(next).length) focusFirstError(next);
    return Object.keys(next).length === 0;
  };

  const validateAdmission = () => {
    const next = steps.reduce((all, section) => ({
      ...all,
      ...(section.custom === "fee" ? feeStepErrors(values) : validateFields(section.fields)),
    }), {});
    setErrors(next);
    if (Object.keys(next).length) focusFirstError(next);
    return Object.keys(next).length === 0;
  };

  const validateBeforeStep = (targetStep) => {
    const relevantSteps = steps.slice(0, Math.min(targetStep, steps.length));
    const next = {};
    let firstInvalidStep = -1;

    relevantSteps.forEach((section, index) => {
      const sectionErrors = section.custom === "fee" ? feeStepErrors(values) : validateFields(section.fields);
      if (Object.keys(sectionErrors).length && firstInvalidStep === -1) firstInvalidStep = index;
      Object.assign(next, sectionErrors);
    });

    if (firstInvalidStep !== -1) {
      setErrors(next);
      setStep(firstInvalidStep < ADMISSION_FORM_STEP_COUNT ? 0 : firstInvalidStep);
      focusFirstError(next);
      setToast(`Please complete ${firstInvalidStep < ADMISSION_FORM_STEP_COUNT ? "Admission Form" : steps[firstInvalidStep].title} before continuing`);
      return false;
    }
    return true;
  };

  const goToStep = (targetStep) => {
    if (targetStep <= step) {
      if (!editingAdmissionId) persistAdmissionDraft({ currentStep: targetStep, formData: values, feeSelection });
      setStep(targetStep);
      return;
    }
    if (validateBeforeStep(targetStep)) {
      if (!editingAdmissionId) persistAdmissionDraft({ currentStep: targetStep, formData: values, feeSelection });
      setStep(targetStep);
    }
  };

  const next = () => {
    if (!validateStep()) return;
    if (step < allSteps.length - 1) {
      const nextStep = step < ADMISSION_FORM_STEP_COUNT ? FEE_STEP_INDEX : step + 1;
      if (!editingAdmissionId) persistAdmissionDraft({ currentStep: nextStep, formData: values, feeSelection });
      setStep(nextStep);
    }
  };

  const resetAdmissionDraftState = () => {
    suppressPersistRef.current = true;
    clearAdmissionDraft();
    committedAdmissionRef.current = null;
    setValues({});
    setFeeSelection([]);
    feeSelectionInitializedRef.current = false;
    Object.values(fileInputRefs.current).forEach((input) => {
      if (input) input.value = "";
    });
    setStep(0);
    window.setTimeout(() => { suppressPersistRef.current = false; }, 0);
  };

  const backOrCancel = () => {
    if (step !== 0) {
      const previousStep = isPreview ? FEE_STEP_INDEX : 0;
      
      if (!editingAdmissionId) persistAdmissionDraft({ currentStep: previousStep, formData: values, feeSelection });
      setStep(previousStep);
      return;
    }

    returnToAdmissions();
  };

  const editPreviewStep = (targetStep) => {
    const nextStep = targetStep < ADMISSION_FORM_STEP_COUNT ? 0 : targetStep;
    if (!editingAdmissionId) persistAdmissionDraft({ currentStep: nextStep, formData: values, feeSelection });
    setStep(nextStep);
  };

  const openAdmissionForm = ({ formValues = {}, targetStep = 0, selection = [], admissionId = "" } = {}) => {
    suppressPersistRef.current = false;
    setAdmissionNumberError("");
    setEditingAdmissionId(admissionId ? String(admissionId) : "");
    committedAdmissionRef.current = admissionId
      ? { admissionId: String(admissionId), admissionNo: formValues.admissionNo || "" }
      : null;
    setValues(admissionId ? formValues : newAdmissionValues(formValues));
    const hasPersistedSelection = Array.isArray(selection);
    setFeeSelection(hasPersistedSelection ? selection : []);
    feeSelectionInitializedRef.current = hasPersistedSelection;
    setErrors({});
    setStep(safeStepIndex(targetStep));
    setViewMode("form");
  };

  const addNewAdmission = () => {
    const draft = readAdmissionDraft();
    const draftValues = applyNewAdmissionAcademicDefaults({ ...(draft.values || {}), admissionNo: "" });
    openAdmissionForm({
      formValues: draftValues,
      targetStep: draft.step || 0,
      selection: draft.feeSelection || [],
    });
  };

  const continueAdmission = async (record, targetStep = record.currentStep || 0) => {
    const admissionId = record.admissionId || record.id;
    if (!admissionId) {
      setToast("Admission ID is required to load admission details.");
      return;
    }
    setActionBusy(`Load-${record.id}`);
    try {
      const response = await apiClient.get(apiEndpoints.admissions.getById(admissionId));
      const detail = getObject(response.data);
      const detailRow = normalizeAdmissionRow(detail);
      let formValues = detailRow.values || {};
      const persistedSelection = null;

      let studentId = resolveApprovedStudentId(detail, detailRow.raw, detailRow, record.raw, record);
      let studentFeeId = readStudentFeeAssignmentId(detail) || readStudentFeeAssignmentId(record.raw || record);
      if (!studentId && !studentFeeId && detailRow.admissionNo) {
        try {
          const ledgerResponse = await apiClient.get(apiEndpoints.fee.ledger);
          const matchingAccount = getCollection(ledgerResponse.data).find((account) => {
            const admission = read(account, "admission", "Admission", "studentAdmission", "StudentAdmission");
            const accountAdmissionNo = readText(account, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
              || readText(admission, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber");
            return accountAdmissionNo.trim().toLowerCase() === detailRow.admissionNo.trim().toLowerCase();
          });
          studentId = resolveApprovedStudentId(matchingAccount);
          studentFeeId = readStudentFeeAssignmentId(matchingAccount);
        } catch (ledgerError) {
          if (import.meta.env.DEV) {
            console.warn("Fee account lookup by admission number was unavailable.", {
              status: ledgerError?.response?.status,
            });
          }
        }
      }
      const feeDetailsEndpoint = studentId
        ? apiEndpoints.fee.studentFeeDetailsByStudent(studentId)
        : studentFeeId ? apiEndpoints.fee.studentFeeDetails(studentFeeId) : "";

      if (feeDetailsEndpoint) {
        try {
          const feeDetailsResponse = await apiClient.get(feeDetailsEndpoint);
          const persistedFee = readPersistedFeeState(feeDetailsResponse.data, formValues);
          formValues = hydratePersistedFeeState(formValues, feeDetailsResponse.data);
          if (import.meta.env.DEV) {
            console.log("Payment plan hydration:", {
              rawBackendPaymentPlan: persistedFee.rawPaymentPlan,
              normalizedPaymentPlan: persistedFee.paymentPlan,
              scheduleCount: persistedFee.installments.length,
              currentMode: "edit",
            });
          }
        } catch (feeDetailsError) {
          if (feeDetailsError?.response?.status !== 404 && import.meta.env.DEV) {
            console.warn("Persisted student fee details could not be loaded.", {
              status: feeDetailsError?.response?.status,
            });
          }
        }
      }
      openAdmissionForm({
        formValues,
        targetStep,
        selection: persistedSelection,
        admissionId,
      });
    } catch (err) {
      setToast(getApiErrorMessage(err));
    } finally {
      setActionBusy("");
    }
  };

  const returnToAdmissions = () => {
    if (!editingAdmissionId) persistAdmissionDraft({ currentStep: step, formData: values, feeSelection });
    setViewMode("list");
    setPage(1);
    refreshAdmissions();
  };

  const resolveApprovedStudentIdFromBackend = useCallback(async ({ admissionId, approvedPayload, detail, detailRow }) => {
    const directId = resolveApprovedStudentId(approvedPayload, detail, detailRow?.raw, detailRow);
    if (directId) return directId;

    const currentDetailResponse = await apiClient.get(apiEndpoints.admissions.getById(admissionId));
    const currentDetail = getObject(currentDetailResponse.data);
    const currentRow = normalizeAdmissionRow(currentDetail);
    const detailId = resolveApprovedStudentId(currentDetail, currentRow.raw, currentRow);
    if (detailId) return detailId;

    const admissionsResponse = await apiClient.get(apiEndpoints.admissions.getAll);
    const admissionRows = getCollection(admissionsResponse.data);
    const matchingAdmission = admissionRows.find((item) => sameAdmissionIdentity(item, currentDetail));
    const admissionListId = resolveApprovedStudentId(matchingAdmission);
    if (admissionListId) return admissionListId;

    const studentsResponse = await apiClient.get(apiEndpoints.students.getAll);
    const studentRows = getCollection(studentsResponse.data);
    const matchingStudent = studentRows.find((item) => sameStudentIdentity(item, currentDetail));
    return resolveApprovedStudentId(matchingStudent);
  }, []);

  const ensureApprovedStudentFeeAccount = useCallback(async ({ admissionId, approvedPayload, selectedFeeStructureId = "", selectedFeeValues = {} }) => {
    const detailResponse = await apiClient.get(apiEndpoints.admissions.getById(admissionId));
    const detail = getObject(detailResponse.data);
    const detailRow = normalizeAdmissionRow(detail);
    const studentId = await resolveApprovedStudentIdFromBackend({ admissionId, approvedPayload, detail, detailRow });
    if (!studentId) {
      throw new Error("Admission approved successfully, but the backend did not expose the created student ID required for fee assignment.");
    }

    try {
      const existingResponse = await apiClient.get(apiEndpoints.fee.studentFeeDetailsByStudent(studentId));
      const existingStudentFeeId = readStudentFeeAssignmentId(existingResponse.data);
      if (existingStudentFeeId) {
        return {
          studentId,
          studentFeeId: existingStudentFeeId,
          reused: true,
          persistedFeeValues: hydratePersistedFeeState(selectedFeeValues, existingResponse.data),
        };
      }
    } catch (err) {
      if (err?.response?.status && err.response.status !== 404) throw err;
    }

    const selectedValues = selectedFeeValues && typeof selectedFeeValues === "object" ? selectedFeeValues : {};
    const feeValues = {
      ...detailRow.values,
      ...selectedValues,
      feeItems: selectedValues.feeItems?.length ? selectedValues.feeItems : detailRow.values.feeItems,
      installments: selectedValues.installments?.length ? selectedValues.installments : detailRow.values.installments,
    };
    const selectedStructureId = numericId(selectedFeeStructureId || feeValues.feeStructureId)
      ? String(selectedFeeStructureId || feeValues.feeStructureId)
      : "";
    const feeStructure = selectedStructureId
      ? { id: selectedStructureId }
      : await findApplicableFeeStructure({
        boardId: feeValues.board,
        academicYearId: feeValues.year,
        groupId: feeValues.group,
        programId: feeValues.program,
      });
    const feeStructureId = numericId(feeStructure?.id);
    if (!feeStructureId) {
      throw new Error("Fee account was not created because the selected Fee Structure ID was not available.");
    }

    const fee = deriveAdmissionFee(feeValues);
    const planName = toFeeAssignmentPlanName(fee.paymentPlan || feeValues.paymentPlan);
    if (!planName) {
      throw new Error("Course fee payment plan is missing. Please select and save a payment plan before fee assignment.");
    }
    const selectedInstallmentCount = Number(feeValues.installmentCount);
    const numberOfInstallments = planName === "Installment Payment"
      ? Math.max(Number.isInteger(selectedInstallmentCount) && selectedInstallmentCount > 0
        ? selectedInstallmentCount
        : Number(fee.courseSchedules.length || DEFAULT_INSTALLMENT_COUNT), 1)
      : 1;
    if (import.meta.env.DEV) {
      console.log("FINAL fee assignment request", {
        planName,
        numberOfInstallments,
      });
    }
    const assignResponse = await apiClient.post(apiEndpoints.fee.assignStudentFee, {
      studentId: Number(studentId),
      feeStructureId,
      planName,
      numberOfInstallments,
    });
    const studentFeeId = readStudentFeeAssignmentId(assignResponse.data);
    if (!studentFeeId) throw new Error("Fee structure was assigned, but the student fee assignment ID was not returned.");

    if (Number(detailRow.values.scholarshipId)) {
      await apiClient.post(apiEndpoints.fee.concession, {
        studentId,
        studentFeeId: Number(studentFeeId),
        scholarshipId: Number(detailRow.values.scholarshipId),
        scholarshipName: detailRow.values.concessionName || null,
        discountType: detailRow.values.concessionType || null,
        discountValue: Number(detailRow.values.concessionValue || 0),
        reason: "Applied during admission approval",
      });
    }

    let persistedFeeValues = null;
    try {
      const persistedResponse = await apiClient.get(apiEndpoints.fee.studentFeeDetailsByStudent(studentId));
      persistedFeeValues = hydratePersistedFeeState(feeValues, persistedResponse.data);
    } catch (readbackError) {
      if (import.meta.env.DEV) {
        console.warn("Assigned student fee readback was unavailable.", {
          status: readbackError?.response?.status,
        });
      }
    }

    return { studentId, studentFeeId, reused: false, persistedFeeValues };
  }, [resolveApprovedStudentIdFromBackend]);

  const updateAdmissionStatus = async (record, status) => {
    const admissionId = record.admissionId || record.id;
    const admissionKey = admissionKeyFor(record);
    if (!admissionId) {
      setToast("Admission ID is required for this action.");
      return;
    }
    if (normalizeAdmissionStatus(record.status) === "Approved") {
      setToast(`Admission ${record.admissionNo} is already approved.`);
      setApproveTarget(null);
      return;
    }
    if (status === "Approved" && approveInFlightRef.current.has(admissionKey)) return;
    if (status === "Approved") approveInFlightRef.current.add(admissionKey);
    setActionBusy(`${status}-${record.id}`);
    const endpoint = status === "Approved" ? apiEndpoints.admissions.approve : apiEndpoints.admissions.reject;
    try {
      if (status === "Approved" && approveStatusCheckRef.current.has(admissionKey)) {
        const latestResponse = await apiClient.get(apiEndpoints.admissions.getById(admissionId));
        const latestRow = normalizeAdmissionRow(getObject(latestResponse.data));
        if (latestRow.status === "Approved") {
          setApproveTarget(null);
          await refreshAdmissions();
          setToast(`Admission ${latestRow.admissionNo || record.admissionNo} is already approved.`);
          return;
        }
        if (latestRow.status !== "Verified") {
          await refreshAdmissions();
          setToast(`Admission ${latestRow.admissionNo || record.admissionNo} is ${latestRow.status}. Verify it before approving.`);
          return;
        }
      }
      if (status === "Approved" && !isAdmissionVerified(record.raw, record)) {
        setToast("Verify the admission before approving.");
        return;
      }
      const response = status === "Approved"
        ? await apiClient.post(endpoint(admissionId), admissionStatusBody(admissionId))
        : await apiClient.post(endpoint(admissionId), admissionFeeApprovalBody(admissionId, status));
      if (status === "Approved") {
        setApproveTarget(null);
        await refreshAdmissions();
        try {
          const feeAccount = await ensureApprovedStudentFeeAccount({
            admissionId,
            approvedPayload: getObject(response.data),
            selectedFeeStructureId: record.feeStructureId || record.values?.feeStructureId || values.feeStructureId,
            selectedFeeValues: record.values || values,
          });
          if (feeAccount.persistedFeeValues && String(editingAdmissionId) === String(admissionId)) {
            setValues((current) => ({ ...current, ...feeAccount.persistedFeeValues }));
          }
        } catch (feeErr) {
          setToast(`Admission ${record.admissionNo} was approved, but fee account creation failed: ${getApiErrorMessage(feeErr)}`);
          return;
        }
        approveStatusCheckRef.current.delete(admissionKey);
        setToast(`Admission ${record.admissionNo} approved and fee account is ready.`);
        return;
      }
      await refreshAdmissions();
      setToast(`Admission ${record.admissionNo} marked as ${status}.`);
    } catch (err) {
      if (status === "Approved") approveStatusCheckRef.current.add(admissionKey);
      setToast(status === "Approved"
        ? `Admission approval failed: ${getApiErrorMessage(err)}`
        : getApiErrorMessage(err));
    } finally {
      if (status === "Approved") approveInFlightRef.current.delete(admissionKey);
      setActionBusy("");
      setApproveTarget(null);
      setRejectTarget(null);
    }
  };

  const verifyAdmission = async (record) => {
    const admissionId = record.admissionId || record.id;
    const admissionKey = admissionKeyFor(record);
    if (!admissionId) {
      setToast("Admission ID is required for this action.");
      return;
    }
    if (verifiedInFlightRef.current.has(admissionKey)) return;
    verifiedInFlightRef.current.add(admissionKey);
    setActionBusy(`Verified-${record.id}`);
    try {
      await apiClient.post(apiEndpoints.admissions.verify(admissionId), admissionStatusBody(admissionId));
      await refreshAdmissions();
      setToast(`Admission ${record.admissionNo} verified successfully.`);
      setViewMode("list");
      setPage(1);
    } catch (err) {
      setToast(`Admission verification failed: ${getApiErrorMessage(err)}`);
    } finally {
      verifiedInFlightRef.current.delete(admissionKey);
      setActionBusy("");
    }
  };

  const submit = async () => {
    if (saving || submitInFlightRef.current) return;
    if (feeStructureLoading) {
      setToast("Loading applicable fee structure. Please wait.");
      return;
    }
    if (!validateAdmission()) {
      setToast("Please complete required admission details before submitting");
      return;
    }
    if (!editingAdmissionId && (!values.admissionNo || admissionNumberError)) {
      const message = admissionNumberError || "Admission number must be generated by the backend before submitting.";
      setAdmissionNumberError(message);
      setToast(message);
      return;
    }

    const committed = committedAdmissionRef.current;
    const committedAdmissionId = committed
      && String(committed.admissionNo || "").trim().toLowerCase() === String(values.admissionNo || "").trim().toLowerCase()
      ? committed.admissionId
      : "";
    const submitAdmissionId = editingAdmissionId || committedAdmissionId;
    const isUpdate = Boolean(submitAdmissionId);
    const visibleMobile = typeof document !== "undefined"
      ? studentMobileValue({ studentMobileNumber: document.getElementById("f-studentMobileNumber")?.value || "" })
      : "";
    const submitValues = normalizeAdmissionMobileState({
      ...values,
      studentMobileNumber: studentMobileValue(values) || visibleMobile,
    });

    submitInFlightRef.current = true;
    setSaving(true);
    let savedAdmissionId = submitAdmissionId;
    let admissionWriteCompleted = false;
    try {
      const endpoint = isUpdate
        ? apiEndpoints.admissions.update(submitAdmissionId)
        : apiEndpoints.admissions.create;
      const method = isUpdate ? "put" : "post";
      const formData = buildAdmissionFormData(submitValues);
      debugAdmissionSubmitPayload({ endpoint, method, formData, values: submitValues });
      const response = await apiClient[method](endpoint, formData, {
        transformRequest: [(data, headers) => {
          delete headers["Content-Type"];
          delete headers["content-type"];
          return data;
        }],
      });
      admissionWriteCompleted = true;
      const savedRow = normalizeAdmissionRow(getObject(response.data));
      if (savedRow.values?.studentPhoto || savedRow.values?.photoUrl) {
        setValues((current) => {
          const next = {
            ...current,
            studentPhoto: savedRow.values.studentPhoto || current.studentPhoto || "",
            photoUrl: savedRow.values.photoUrl || current.photoUrl || "",
          };
          delete next.photo;
          return next;
        });
      }
      if (!isUpdate) {
        savedAdmissionId = savedRow.admissionId || readId(getObject(response.data), "admissionId", "AdmissionId", "id", "Id");
        if (savedRow.admissionId) {
          committedAdmissionRef.current = {
            admissionId: savedRow.admissionId,
            admissionNo: savedRow.admissionNo || values.admissionNo,
          };
        }
      }
      await saveAdmissionFeeSelections(savedAdmissionId, submitValues);
    } catch (err) {
      const message = getApiErrorMessage(err);
      if (admissionWriteCompleted && savedAdmissionId) {
        if (!isUpdate) {
          committedAdmissionRef.current = {
            admissionId: savedAdmissionId,
            admissionNo: values.admissionNo,
          };
          setEditingAdmissionId(savedAdmissionId);
        }
        setToast(`Admission ${values.admissionNo} was ${isUpdate ? "updated" : "created"}, but fee selections could not be saved: ${message}`);
        submitInFlightRef.current = false;
        setSaving(false);
        return;
      }
      if (!isUpdate && values.admissionNo) {
        const latestAdmissions = await refreshAdmissions();
        const committedRow = findAdmissionByNumber(latestAdmissions, values.admissionNo);
        if (committedRow?.admissionId) {
          committedAdmissionRef.current = {
            admissionId: committedRow.admissionId,
            admissionNo: committedRow.admissionNo || values.admissionNo,
          };
          setEditingAdmissionId(committedRow.admissionId);
          setValues((current) => ({
            ...current,
            admissionNo: committedRow.admissionNo || current.admissionNo,
            status: committedRow.status || current.status,
          }));
          setViewMode("list");
          setPage(1);
          setToast(`Admission ${committedRow.admissionNo || values.admissionNo} was created successfully, but fee setup could not be completed: ${message}`);
          submitInFlightRef.current = false;
          setSaving(false);
          return;
        }
      }
      setToast(message);
      submitInFlightRef.current = false;
      setSaving(false);
      return;
    }

    setToast(`Admission ${values.admissionNo} ${isUpdate ? "updated" : "submitted"} successfully.`);
    resetAdmissionDraftState();
    setViewMode("list");
    setPage(1);
    await refreshAdmissions();
    submitInFlightRef.current = false;
    setSaving(false);
  };

  if (viewMode === "list") {
    return (
      <DashboardLayout
        title="Student Admission"
        subtitle="Manage student admission applications and admissions."
        breadcrumb={["People"]}
        actions={(
          <button type="button" className="cms-btn cms-btn-primary" onClick={addNewAdmission}>
            <Plus size={15} /> Add New Admission
          </button>
        )}
      >
        <div className="cms-card cms-admission-list-card">
          <div className="cms-admission-toolbar">
            <div className="cms-search cms-admission-search">
              <Search3DIcon size={16} />
              <input
                value={search}
                placeholder="Search by student name or admission number"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="cms-admission-filters">
              <Field field={{ name: "year", label: "Academic Year", type: "select", options: academicYearFilterOptions }} value={filters.year} onChange={(name, value) => { setFilters((current) => ({ ...current, [name]: value })); setPage(1); }} />
              <Field field={{ name: "group", label: "Group", type: "select", options: groupFilterOptions }} value={filters.group} onChange={(name, value) => { setFilters((current) => ({ ...current, [name]: value })); setPage(1); }} />
              <Field field={{ name: "status", label: "Status", type: "select", options: admissionStatusFilterOptions }} value={filters.status} onChange={(name, value) => { setFilters((current) => ({ ...current, [name]: value })); setPage(1); }} />
            </div>
            <div
              className="cms-admission-export-control"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setExportOpen(false);
              }}
            >
              <button
                type="button"
                className="cms-btn cms-btn-ghost cms-admission-export-btn"
                aria-haspopup="menu"
                aria-expanded={exportOpen}
                onClick={() => setExportOpen((open) => !open)}
              >
                <Download size={15} /> Export <ChevronDown size={14} />
              </button>
              {exportOpen ? (
                <div className="cms-admission-export-menu" role="menu" aria-label="Admission export options">
                  <button type="button" role="menuitem" onClick={exportAdmissionsExcel}>
                    <FileSpreadsheet size={15} /> Export Excel
                  </button>
                  <button type="button" role="menuitem" onClick={exportAdmissionsPdf}>
                    <FileText size={15} /> Export PDF
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="cms-table-wrap">
            <table className="cms-table cms-admission-table">
              <colgroup>
                <col className="cms-admission-col-no" />
                <col className="cms-admission-col-name" />
                <col className="cms-admission-col-date" />
                <col className="cms-admission-col-year" />
                <col className="cms-admission-col-board" />
                <col className="cms-admission-col-group" />
                <col className="cms-admission-col-program" />
                <col className="cms-admission-col-status" />
                <col className="cms-admission-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th>Admission Date</th>
                  <th>Academic Year</th>
                  <th>Board</th>
                  <th>Group</th>
                  <th>Program</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr><td colSpan={9}><div className="cms-empty">Loading admissions...</div></td></tr>
                ) : pagedAdmissions.length ? pagedAdmissions.map((row) => (
                  <tr key={`${row.source}-${row.id}`}>
                    <td className="cms-strong">{row.admissionNo}</td>
                    <td>{row.studentName}</td>
                    <td>{formatDate(row.admissionDate) || "-"}</td>
                    <td>{admissionYearDisplay(row)}</td>
                    <td>{admissionBoardDisplay(row)}</td>
                    <td>{row.group || "-"}</td>
                    <td>{row.program || "-"}</td>
                    <td><span className={`cms-badge ${admissionStatusClass(row.status)}`}>{row.status}</span></td>
                    <td>
                      <div className="cms-actions cms-admission-actions">
                        <button type="button" className="cms-action-btn view" title="View / edit admission" aria-label="View or edit admission" disabled={actionBusy === `Load-${row.id}`} onClick={() => continueAdmission(row)}>
                          <Eye size={15} />
                        </button>
                        {row.status === "Pending" ? (
                          <button type="button" className="cms-action-btn edit" title="Verify admission" aria-label="Verify admission" disabled={actionBusy === `Load-${row.id}`} onClick={() => continueAdmission(row, allSteps.length - 1)}>
                            <BadgeCheck size={15} />
                          </button>
                        ) : null}
                        {row.status === "Verified" ? (
                          <button type="button" className="cms-action-btn edit" title="Approve admission" aria-label="Approve admission" disabled={actionBusy === `Approved-${row.id}`} onClick={() => setApproveTarget(row)}>
                            <Check size={15} />
                          </button>
                        ) : null}
                        {row.status === "Pending" || row.status === "Verified" ? (
                          <button type="button" className="cms-action-btn danger" title="Reject admission" aria-label="Reject admission" disabled={actionBusy === `Rejected-${row.id}`} onClick={() => setRejectTarget(row)}>
                            <X size={15} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={9}><div className="cms-empty">No admissions found.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="cms-pagination">
            <span className="cms-page-info">
              Showing {displayedAdmissions.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-
              {Math.min(currentPage * PAGE_SIZE, displayedAdmissions.length)} of {displayedAdmissions.length} admissions
            </span>
            <button className="cms-page-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
            <button className="cms-page-btn is-active" type="button" aria-current="page">{currentPage}</button>
            <button className="cms-page-btn" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
          </div>
        </div>

        {approveTarget ? (
          <Modal
            title="Approve Admission?"
            size="sm"
            onClose={() => setApproveTarget(null)}
            footer={(
              <>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setApproveTarget(null)} disabled={actionBusy === `Approved-${approveTarget.id}`}>Cancel</button>
                <button
                  type="button"
                  className="cms-btn cms-btn-primary"
                  disabled={actionBusy === `Approved-${approveTarget.id}`}
                  onClick={() => updateAdmissionStatus(approveTarget, "Approved")}
                >
                  {actionBusy === `Approved-${approveTarget.id}` ? "Approving..." : "Approve"}
                </button>
              </>
            )}
          >
            <p style={{ margin: 0, color: "var(--cms-muted)" }}>Are you sure you want to approve this admission? This will mark the student's admission as approved.</p>
          </Modal>
        ) : null}

        {rejectTarget ? (
          <Modal
            title="Reject Admission?"
            size="sm"
            onClose={() => setRejectTarget(null)}
            footer={(
              <>
                <button type="button" className="cms-btn cms-btn-ghost" onClick={() => setRejectTarget(null)}>Cancel</button>
                <button
                  type="button"
                  className="cms-btn cms-btn-danger"
                  disabled={actionBusy === `Rejected-${rejectTarget.id}`}
                  onClick={() => updateAdmissionStatus(rejectTarget, "Rejected")}
                >
                  {actionBusy === `Rejected-${rejectTarget.id}` ? "Rejecting..." : "Reject"}
                </button>
              </>
            )}
          >
            <p style={{ margin: 0, color: "var(--cms-muted)" }}>Are you sure you want to reject this admission?</p>
          </Modal>
        ) : null}
        <Toast message={toast} onClose={() => setToast("")} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Student Admission"
      subtitle="Multi-step admission form."
      breadcrumb={["People"]}
      actions={(
        <div className="cms-admission-form-actions">
          <div className="cms-admission-main-tabs" role="tablist" aria-label="Admission form steps">
            {admissionMainTabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.title}
                  type="button"
                  role="tab"
                  aria-selected={activeMainStep === tab.step}
                  className={`cms-admission-main-tab ${activeMainStep === tab.step ? "is-active" : ""} ${tab.step < activeMainStep ? "is-done" : ""}`}
                  onClick={() => goToStep(tab.step)}
                >
                  <TabIcon size={14} />
                  <span>{tab.title}</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="cms-btn cms-btn-ghost" onClick={returnToAdmissions}>
            Back to Admissions
          </button>
        </div>
      )}
    >
      <div className="cms-card">
        <div className="cms-card-head">
          <h2>{isAdmissionFormStep ? "Admission Form" : current.title}</h2>
        </div>
        <div className="cms-card-body">
          {isPreview ? (
            <AdmissionPreview
              sections={previewSections}
              values={values}
              errors={errors}
              onEdit={editPreviewStep}
              feeNode={<FeePreview fee={fee} values={values} />}
              photoPreviewUrl={photoPreviewUrl}
            />
          ) : isFeeStep ? (
            <div className="cms-admission-form-sections cms-admission-fee-form">
              <section className="cms-admission-form-section">
                <div className="cms-admission-section-head">
                  <span className="cms-admission-section-icon"><IndianRupee size={16} /></span>
                  <h3>Fee Details</h3>
                </div>
                <div className="cms-admission-fee-body">
                  <FeeStep
                    context={feeContext}
                    fee={fee}
                    values={values}
                    errors={errors}
                    onChange={setValue}
                    onPlanChange={changePlan}
                    onInstallmentCountChange={changeInstallmentCount}
                    onInstallmentChange={changeInstallment}
                    scholarships={scholarships}
                    feeStructureLoading={feeStructureLoading}
                    feeStructureError={feeStructureError}
                  />
                </div>
              </section>
            </div>
          ) : isAdmissionFormStep ? (
            <AdmissionFormSections
              sections={admissionFormSections}
              values={values}
              errors={errors}
              onChange={setValue}
              onFileChange={setFileValue}
              onFileRemove={removeFileValue}
              inputRefs={fileInputRefs}
              photoPreviewUrl={photoPreviewUrl}
            />
          ) : (
            <div className={`cms-form-grid ${current.title === "Address" ? "cms-admission-address-grid" : "cols-3"} ${current.title === "Admission" ? "cms-admission-details-grid" : ""} ${current.title === "Student Details" ? "cms-admission-student-grid" : ""}`}>
              {visibleFieldsFor(currentFields, values).map((f) => (
                <AdmissionField
                  key={f.name}
                  field={{ ...f, required: f.required || (typeof f.requiredWhen === "function" && f.requiredWhen(values)) }}
                  value={values[f.name]}
                  error={f.name === "quota" ? errors.quota || errors.quotaOther : errors[f.name]}
                  onChange={setValue}
                  onFileChange={setFileValue}
                  onFileRemove={removeFileValue}
                  inputRef={(element) => { fileInputRefs.current[f.name] = element; }}
                  previewUrl={f.name === "photo" ? studentPhotoSource(values, photoPreviewUrl) : ""}
                  extraValue={f.name === "quota" ? values.quotaOther : ""}
                />
              ))}
            </div>
          )}
        </div>
        <div className="cms-modal-foot">
          <button className="cms-btn cms-btn-ghost" onClick={backOrCancel}>
            {step === 0 ? "Back to Admissions" : isPreview ? "Back" : "Previous"}
          </button>
          {isPreview ? (
            <button type="button" className="cms-btn cms-btn-ghost" onClick={downloadAdmissionPreview}>
              <Download size={14} /> Download
            </button>
          ) : null}
          {!isPreview ? (
            <button className="cms-btn cms-btn-primary" onClick={next} disabled={admissionNumberLoading || (!editingAdmissionId && (!values.admissionNo || admissionNumberError))}>
              {admissionNumberLoading ? "Generating Number..." : step === steps.length - 1 ? "Preview" : "Save & Continue"}
            </button>
          ) : (
            <button
              className="cms-btn cms-btn-primary"
              onClick={canVerifyPreviewAdmission ? () => verifyAdmission(previewVerifyRecord) : submit}
              disabled={
                canVerifyPreviewAdmission
                  ? actionBusy === `Verified-${editingAdmissionId}`
                  : saving || feeStructureLoading || admissionNumberLoading || (!editingAdmissionId && (!values.admissionNo || admissionNumberError))
              }
            >
              {canVerifyPreviewAdmission
                ? (actionBusy === `Verified-${editingAdmissionId}` ? "Verifying..." : "Verify Admission")
                : (saving ? "Submitting..." : "Submit Admission")}
            </button>
          )}
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
