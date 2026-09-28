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
import * as hostelApi from "@/api/hostelApi.js";
import { env } from "@/config/env.js";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { Field, Modal, Skeleton, SkeletonButton, SkeletonInput, SkeletonRow, SkeletonTable, Toast } from "@/components/common/Ui.jsx";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import { useCampusContext } from "@/context/CampusContext.jsx";
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

/** Layout-matched placeholders for admission forms, fee details, and records. */
function AdmissionPageSkeleton({ variant = "form" }) {
  if (variant === "table") return <SkeletonTable columns={9} rows={6} className="cms-admission-table-skeleton" />;
  if (variant === "fees") return <div className="cms-fee-block cms-admission-fee-skeleton"><Skeleton style={{ width: 190, height: 20 }} /><div className="cms-skeleton-form">{Array.from({ length: 6 }, (_, index) => <SkeletonInput key={index} />)}</div></div>;
  return <section className="cms-admission-skeleton" aria-label="Loading admission form"><div className="cms-admission-skeleton-head"><Skeleton style={{ width: 220, height: 25 }} /><SkeletonButton width={132} /></div><div className="cms-skeleton-form">{Array.from({ length: 8 }, (_, index) => <SkeletonInput key={index} />)}</div></section>;
}
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
  return next;
};

const getCollection = (payload) => {
  const data = payload?.data ?? payload?.Data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  if (Array.isArray(data?.Data?.$values)) return data.Data.$values;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.Result)) return data.Result;
  if (Array.isArray(data?.response)) return data.response;
  if (Array.isArray(data?.Response)) return data.Response;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.Records)) return data.Records;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.Rows)) return data.Rows;
  if (Array.isArray(data?.scholarships)) return data.scholarships;
  if (Array.isArray(data?.Scholarships)) return data.Scholarships;
  if (Array.isArray(data?.groups)) return data.groups;
  if (Array.isArray(data?.Groups)) return data.Groups;
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

const compactObjects = (...sources) => sources.filter((source) => source && typeof source === "object");

const readTextFromSources = (sources, ...keys) => compactObjects(...sources)
  .map((source) => readText(source, ...keys))
  .find(Boolean) || "";

const readIdFromSources = (sources, ...keys) => compactObjects(...sources)
  .map((source) => readId(source, ...keys))
  .find(Boolean) || "";

const normalizeYesNoText = (value) => {
  const text = String(value ?? "").trim();
  if (["true", "1", "yes"].includes(text.toLowerCase())) return "Yes";
  if (["false", "0", "no"].includes(text.toLowerCase())) return "No";
  return text;
};

const normalizeStudentTypeText = (value) => {
  const text = String(value ?? "").trim();
  if (["true", "2", "yes", "residential", "hostel", "hosteller"].includes(text.toLowerCase())) return "Residential";
  if (["false", "1", "0", "no", "non-residential", "non residential", "day scholar", "dayscholar"].includes(text.toLowerCase())) return "Non-Residential";
  return text;
};

const transportRequiredPayloadValue = (values = {}) => (
  normalizeStudentTypeText(values.studentType) === "Non-Residential"
    ? normalizeYesNoText(values.transportRequired) === "Yes"
    : false
);

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

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const loadPdfImageDataUrl = async (source) => {
  try {
    if (typeof File !== "undefined" && source instanceof File) return await blobToDataUrl(source);
  } catch {
    return "";
  }
  const normalizedSrc = resolveStudentPhotoUrl(source);
  if (!normalizedSrc) return "";
  if (/^data:image\//i.test(normalizedSrc)) return normalizedSrc;
  try {
    if (normalizedSrc.startsWith("blob:")) {
      const response = await fetch(normalizedSrc);
      if (!response.ok) return "";
      return await blobToDataUrl(await response.blob());
    }
    const response = await apiClient.get(normalizedSrc, {
      responseType: "blob",
      headers: { Accept: "image/*" },
      skipGlobalLoader: true,
    });
    const contentType = String(response.headers?.["content-type"] ?? response.data?.type ?? "").toLowerCase();
    if (!contentType.startsWith("image/")) return "";
    return await blobToDataUrl(response.data);
  } catch {
    try {
      const response = await fetch(normalizedSrc, { credentials: "include", headers: { Accept: "image/*" } });
      if (!response.ok) throw new Error(`Photo request failed with HTTP ${response.status}`);
      const blob = await response.blob();
      if (!String(blob.type || "").toLowerCase().startsWith("image/")) return "";
      return await blobToDataUrl(blob);
    } catch {
      // Fall through to the visible development log below.
    }
    if (import.meta.env.DEV) console.error("Student photo failed to load for PDF:", normalizedSrc);
    return "";
  }
};

const readImageDimensions = (src) => new Promise((resolve) => {
  if (!src || typeof Image === "undefined") {
    resolve({ width: 1, height: 1 });
    return;
  }
  const image = new Image();
  image.onload = () => resolve({
    width: image.naturalWidth || image.width || 1,
    height: image.naturalHeight || image.height || 1,
  });
  image.onerror = () => resolve({ width: 1, height: 1 });
  image.src = src;
});

const coverImageDataUrl = (src, targetRatio) => new Promise((resolve) => {
  if (!src || typeof Image === "undefined" || typeof document === "undefined") {
    resolve(src);
    return;
  }
  const image = new Image();
  image.onload = () => {
    const sourceWidth = image.naturalWidth || image.width || 1;
    const sourceHeight = image.naturalHeight || image.height || 1;
    const sourceRatio = sourceWidth / sourceHeight;
    let cropWidth = sourceWidth;
    let cropHeight = sourceHeight;
    let cropX = 0;
    let cropY = 0;
    if (sourceRatio > targetRatio) {
      cropWidth = sourceHeight * targetRatio;
      cropX = (sourceWidth - cropWidth) / 2;
    } else {
      cropHeight = sourceWidth / targetRatio;
      cropY = (sourceHeight - cropHeight) / 2;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = Math.max(1, Math.round(canvas.width / targetRatio));
    const context = canvas.getContext("2d");
    if (!context) {
      resolve(src);
      return;
    }
    context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL("image/jpeg", 0.9));
  };
  image.onerror = () => resolve(src);
  image.src = src;
});

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

const lookupValue = (options = [], value, currentLabel = "") => {
  const selected = String(value ?? "").trim();
  if (selected && options.some((option) => String(option.value) === selected)) return selected;
  const label = String(currentLabel || value || "").trim().toLowerCase();
  if (!label) return selected;
  return options.find((option) => String(option.label || "").trim().toLowerCase() === label)?.value || selected;
};

const optionMatchesRecord = (selectedValue, options = [], ...candidates) => {
  const selected = String(selectedValue ?? "").trim();
  if (!selected) return true;
  const selectedLabel = optionLabel(options, selected);
  const accepted = [selected, selectedLabel].filter(Boolean).map(normalizeMatchText);
  return candidates.some((candidate) => {
    const normalized = normalizeMatchText(candidate);
    return normalized && accepted.includes(normalized);
  });
};

const optionFromRecord = (value, label) => {
  const normalizedValue = String(value ?? "").trim();
  const normalizedLabel = String(label ?? "").trim();
  if (!normalizedValue && !normalizedLabel) return null;
  return {
    value: normalizedValue || normalizedLabel,
    label: normalizedLabel || normalizedValue,
  };
};

const scopedOptionMatches = (selectedValue, options = [], candidateId = "", candidateName = "", selectedLabel = "") => {
  const selected = String(selectedValue ?? "").trim();
  if (!selected) return true;
  const accepted = [
    ...optionValuesFor(options, selected),
    selectedLabel,
  ].filter(Boolean).map(normalizeMatchText);
  if (!accepted.length) return true;
  const candidates = [candidateId, candidateName]
    .map(normalizeMatchText)
    .filter((value) => value && value !== "0" && value !== "[object object]");
  if (!candidates.length) return true;
  return candidates.some((candidate) => accepted.includes(candidate));
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

const isFacilityFeeItem = (item) => {
  const identity = feeTypeIdentity(item);
  return identity.includes("hostel") || identity.includes("transport");
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
  if (typeof status === "string") return !["inactive", "false", "0", "no", "disabled"].includes(status.trim().toLowerCase());
  if (typeof status === "number") return status !== 0;
  if (typeof isActive === "boolean") return isActive;
  if (typeof isActive === "number") return isActive !== 0;
  if (typeof isActive === "string") return ["true", "1", "active", "yes"].includes(isActive.trim().toLowerCase());
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

const normalizeScholarshipDiscountType = (value) => {
  const text = String(value || "").trim();
  const normalized = text.toLowerCase();
  if (["%", "percent", "percentage"].includes(normalized)) return "Percentage";
  if (["fixed", "amount", "flat", "fixed amount"].includes(normalized)) return "Fixed";
  return text || "Percentage";
};

const normalizeScholarship = (item) => {
  const id = readId(item, "scholarshipId", "ScholarshipId", "scholarshipID", "ScholarshipID", "id", "Id");
  const name = readText(item, "scholarshipName", "ScholarshipName", "schemeName", "SchemeName", "name", "Name", "title", "Title", "label", "Label", "scholarship", "Scholarship");
  if (!id || !name || !isActiveRecord(item)) return null;
  const board = read(item, "board", "Board");
  const academicYear = read(item, "academicYear", "AcademicYear", "year", "Year");
  const academicLevel = read(item, "academicLevel", "AcademicLevel", "level", "Level");
  const group = read(item, "group", "Group");
  const program = read(item, "program", "Program");
  const discountType = readText(item, "discountType", "DiscountType", "scholarshipType", "ScholarshipType", "type", "Type", "concessionType", "ConcessionType");
  return {
    id,
    name,
    discountType: normalizeScholarshipDiscountType(discountType),
    discountValue: readNumber(item, "discountValue", "DiscountValue", "value", "Value", "percentage", "Percentage", "amount", "Amount", "scholarshipValue", "ScholarshipValue") ?? 0,
    boardId: readId(item, "boardId", "BoardId") || readId(board, "boardId", "BoardId", "id", "Id"),
    boardName: readText(item, "boardName", "BoardName") || (typeof board === "string" ? board : readText(board, "boardName", "BoardName", "name", "Name", "boardCode", "BoardCode")),
    academicYearId: readId(item, "academicYearId", "AcademicYearId") || readId(academicYear, "academicYearId", "AcademicYearId", "id", "Id"),
    academicYearName: readText(item, "academicYearName", "AcademicYearName", "yearName", "YearName") || (typeof academicYear === "string" ? academicYear : readText(academicYear, "academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name")),
    academicLevelId: readId(item, "academicLevelId", "AcademicLevelId") || readId(academicLevel, "academicLevelId", "AcademicLevelId", "id", "Id"),
    academicLevelName: readText(item, "academicLevelName", "AcademicLevelName", "levelName", "LevelName") || (typeof academicLevel === "string" ? academicLevel : readText(academicLevel, "academicLevelName", "AcademicLevelName", "levelName", "LevelName", "name", "Name")),
    groupId: readId(item, "groupId", "GroupId") || readId(group, "groupId", "GroupId", "id", "Id"),
    groupName: readText(item, "groupName", "GroupName", "groupCode", "GroupCode") || (typeof group === "string" ? group : readText(group, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode")),
    programId: readId(item, "programId", "ProgramId") || readId(program, "programId", "ProgramId", "id", "Id"),
    programName: readText(item, "programName", "ProgramName", "programCode", "ProgramCode") || (typeof program === "string" ? program : readText(program, "programName", "ProgramName", "name", "Name", "programCode", "ProgramCode")),
  };
};

const paymentPlanLabel = (plan) => COURSE_PAYMENT_PLAN_LABELS[plan] || feeScheduleLabel(plan);

const toOption = (item, idKeys, labelKeys) => {
  const value = read(item, ...idKeys);
  const label = read(item, ...labelKeys) || value;
  if (value === undefined || value === null || value === "") return null;
  return { value: String(value), label: String(label) };
};

const normalizeGroupOption = (item) => {
  const option = toOption(item, ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "groupCode", "GroupCode", "name", "Name"]);
  if (!option) return null;
  const board = read(item, "board", "Board");
  const academicYear = read(item, "academicYear", "AcademicYear", "year", "Year");
  const academicLevel = read(item, "academicLevel", "AcademicLevel", "level", "Level");
  return {
    ...option,
    boardId: readId(item, "boardId", "BoardId") || readId(board, "boardId", "BoardId", "id", "Id"),
    boardName: readText(item, "boardName", "BoardName") || (typeof board === "string" ? board : readText(board, "boardName", "BoardName", "name", "Name", "boardCode", "BoardCode")),
    academicYearId: readId(item, "academicYearId", "AcademicYearId") || readId(academicYear, "academicYearId", "AcademicYearId", "id", "Id"),
    academicYearName: readText(item, "academicYearName", "AcademicYearName", "yearName", "YearName") || (typeof academicYear === "string" ? academicYear : readText(academicYear, "academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name")),
    academicLevelId: readId(item, "academicLevelId", "AcademicLevelId") || readId(academicLevel, "academicLevelId", "AcademicLevelId", "id", "Id"),
    academicLevelName: readText(item, "academicLevelName", "AcademicLevelName", "levelName", "LevelName") || (typeof academicLevel === "string" ? academicLevel : readText(academicLevel, "academicLevelName", "AcademicLevelName", "levelName", "LevelName", "name", "Name")),
  };
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

const formatPdfCurrency = (value) => {
  const amount = Number(value || 0);
  return `Rs. ${(Number.isFinite(amount) ? Math.round(amount) : 0).toLocaleString("en-IN")}`;
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
      { name: "campus", label: "Campus", type: "select", options: [], required: true },
      { name: "board", label: "Board", type: "select", options: [], required: true },
      { name: "year", label: "Academic Year", type: "select", options: [], required: true },
      { name: "admissionType", label: "Admission Type", type: "select", options: ["Regular", "Lateral Entry", "Transfer"] },
    ],
  },
  {
    title: "Student Details",
    fields: [
      { name: "firstName", label: "First Name", required: true, gridColumn: "1 / span 1", gridRow: "1" },
      { name: "lastName", label: "Last Name", required: true, gridColumn: "2 / span 1", gridRow: "1" },
      { name: "gender", label: "Gender", type: "select", options: ADMISSION_GENDER_OPTIONS, required: true, gridColumn: "3 / span 1", gridRow: "1" },
      { name: "photo", label: "Student Photo", type: "file", gridColumn: "4 / span 1", gridRow: "1 / span 3" },
      { name: "dob", label: "Date of Birth", type: "date", required: true, gridColumn: "1 / span 1", gridRow: "2" },
      { name: "bloodGroup", label: "Blood Group", type: "select", options: [], required: true, gridColumn: "2 / span 1", gridRow: "2" },
      { name: "aadhaar", label: "Aadhaar Number", required: true, gridColumn: "3 / span 1", gridRow: "2" },
      { name: "studentMobileNumber", label: "Student Mobile", type: "tel", gridColumn: "1 / span 1", gridRow: "3" },
      { name: "email", label: "Email", type: "email", gridColumn: "2 / span 1", gridRow: "3" },
      { name: "admittedBy", label: "Admitted By", type: "staffSearch", gridColumn: "3 / span 1", gridRow: "3" },
      { name: "religion", label: "Religion", gridColumn: "1 / span 1", gridRow: "4" },
      { name: "caste", label: "Caste Category", type: "select", options: ["General", "OBC", "SC", "ST", "EWS"], gridColumn: "2 / span 1", gridRow: "4" },
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
      { name: "group", label: "Group", type: "select", options: [], required: true },
      { name: "program", label: "Program", type: "select", options: [], required: true },
      { name: "medium", label: "Medium", type: "select", options: ["English", "Telugu", "Hindi"] },
      { name: "secondLanguage", label: "Second Language", type: "select", options: ["Sanskrit", "Telugu", "Hindi", "French"] },
    ],
  },
  {
    title: "Student Type & Residential Allocation",
    fields: [
      { name: "studentType", label: "Student Type", type: "select", selectPlaceholder: "Select Type", options: ["Non-Residential", "Residential"], required: true },
      {
        name: "transportRequired",
        label: "School Transport Facility Required?",
        type: "select",
        options: ["Yes", "No"],
        conditional: (values) => values.studentType === "Non-Residential",
        requiredWhen: (values) => values.studentType === "Non-Residential",
      },
      {
        name: "busType",
        label: "Bus Type",
        type: "select",
        options: ["AC", "Non-AC"],
        conditional: (values) => values.studentType === "Non-Residential" && values.transportRequired === "Yes",
        requiredWhen: (values) => values.studentType === "Non-Residential" && values.transportRequired === "Yes",
      },
      {
        name: "busRoute",
        label: "Route",
        type: "select",
        options: [],
        conditional: (values) => values.studentType === "Non-Residential" && values.transportRequired === "Yes",
        requiredWhen: (values) => values.studentType === "Non-Residential" && values.transportRequired === "Yes",
      },
      {
        name: "pickupPoint",
        label: "Pickup Point",
        type: "select",
        options: [],
        conditional: (values) => values.studentType === "Non-Residential" && values.transportRequired === "Yes",
        requiredWhen: (values) => values.studentType === "Non-Residential" && values.transportRequired === "Yes",
      },
      {
        name: "hostelBlock",
        label: "Hostel Block",
        type: "select",
        options: [],
        conditional: (values) => values.studentType === "Residential",
        requiredWhen: (values) => values.studentType === "Residential",
      },
      {
        name: "hostelRoom",
        label: "Room Type",
        type: "select",
        selectPlaceholder: "Select Room Type",
        options: [],
        conditional: (values) => values.studentType === "Residential",
        requiredWhen: (values) => values.studentType === "Residential",
      },
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
const FEE_STEP_INDEX = steps.findIndex((section) => section.custom === "fee");
const ADMISSION_FORM_STEP_COUNT = FEE_STEP_INDEX;
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
  appendIfPresent(formData, "CampusId", values.campus);
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
  appendIfPresent(formData, "StudentType", values.studentType);
  appendIfPresent(formData, "TransportRequired", transportRequiredPayloadValue(values));
  appendIfPresent(formData, "RouteId", values.busRoute);
  appendIfPresent(formData, "PickupPointId", values.pickupPoint);
  appendIfPresent(formData, "HostelId", values.hostelBlock);
  appendIfPresent(formData, "HostelRoom", values.hostelRoomName || values.hostelRoom);
  selectedFeeStructureComponentIdsFor(values).componentIds.forEach((componentId) => {
    formData.append("SelectedFeeStructureComponentIds", componentId);
  });
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

const isLiveMasterActive = (item = {}) => {
  const status = read(item, "status", "Status", "isActive", "IsActive", "active", "Active");
  if (status === undefined || status === null || status === "") return true;
  if (typeof status === "boolean") return status;
  if (typeof status === "number") return status === 1;
  return !["inactive", "deleted", "false", "0"].includes(String(status).trim().toLowerCase());
};

const normalizeTransportRouteOption = (route = {}) => {
  const id = read(route, "routeId", "RouteId", "id", "Id");
  const routeCode = readText(route, "routeNumber", "RouteNumber", "routeCode", "RouteCode", "code", "Code");
  const value = id !== undefined && id !== null && id !== "" ? String(id) : routeCode;
  if (!value) return null;
  const routeName = readText(route, "routeName", "RouteName", "name", "Name") || routeCode || value;
  return {
    value,
    label: routeCode && routeName && routeCode !== routeName ? `${routeCode} - ${routeName}` : routeName,
    routeName,
    routeCode,
    status: isLiveMasterActive(route) ? "Active" : "Inactive",
  };
};

const normalizeTransportPickupOption = (point = {}) => {
  const id = read(point, "pickupPointId", "PickupPointId", "id", "Id");
  const value = id !== undefined && id !== null && id !== "" ? String(id) : readText(point, "pickupPointName", "PickupPointName", "pickupName", "PickupName", "stopName", "StopName");
  if (!value) return null;
  const routeId = read(point, "routeId", "RouteId");
  return {
    value,
    routeId: routeId !== undefined && routeId !== null && routeId !== "" ? String(routeId) : "",
    routeName: readText(point, "routeName", "RouteName"),
    label: readText(point, "stopName", "StopName", "pickupPointName", "PickupPointName", "pickupName", "PickupName") || value,
    monthlyFee: Number(read(point, "monthlyFee", "MonthlyFee", "fare", "Fare") || 0),
    status: isLiveMasterActive(point) ? "Active" : "Inactive",
  };
};

const normalizeTransportBusType = (value) => {
  if (typeof value === "boolean") return value ? "AC" : "Non-AC";
  if (typeof value === "number") return value === 1 ? "AC" : "Non-AC";
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return "";
  if (["ac", "a/c", "air conditioned", "air-conditioned", "true", "yes", "1"].includes(text)) return "AC";
  if (["non-ac", "non ac", "nonac", "false", "no", "0"].includes(text)) return "Non-AC";
  return "";
};

const normalizeTransportVehicleOption = (vehicle = {}) => {
  const id = read(vehicle, "vehicleId", "VehicleId", "id", "Id");
  if (id === undefined || id === null || id === "") return null;
  const busType = normalizeTransportBusType(read(vehicle, "isAC", "IsAC", "isAc", "IsAc", "ac", "AC", "busType", "BusType"));
  return {
    value: String(id),
    busType,
    status: isLiveMasterActive(vehicle) ? "Active" : "Inactive",
  };
};

const normalizeTransportVehicleAssignmentOption = (assignment = {}) => {
  const routeId = read(assignment, "routeId", "RouteId");
  const vehicleId = read(assignment, "vehicleId", "VehicleId");
  if (routeId === undefined || routeId === null || routeId === "" || vehicleId === undefined || vehicleId === null || vehicleId === "") return null;
  return {
    routeId: String(routeId),
    vehicleId: String(vehicleId),
    busType: normalizeTransportBusType(read(assignment, "isAC", "IsAC", "isAc", "IsAc", "ac", "AC", "busType", "BusType")),
    status: isLiveMasterActive(assignment) ? "Active" : "Inactive",
  };
};

const normalizeHostelBlockOption = (block = {}) => {
  const hostelId = read(block, "hostelId", "HostelId", "id", "Id");
  const code = readText(block, "hostelCode", "HostelCode", "code", "Code");
  const value = hostelId !== undefined && hostelId !== null && hostelId !== "" ? String(hostelId) : code;
  if (!value) return null;
  const name = readText(block, "hostelName", "HostelName", "name", "Name") || code || value;
  return {
    value,
    hostelId: hostelId !== undefined && hostelId !== null && hostelId !== "" ? String(hostelId) : "",
    label: code && name && code !== name ? `${code} - ${name}` : name,
    name,
    code,
    status: isLiveMasterActive(block) ? "Active" : "Inactive",
  };
};

const normalizeHostelRoomOption = (room = {}) => {
  const roomId = read(room, "roomId", "RoomId", "id", "Id");
  const roomNo = readText(room, "roomNumber", "RoomNumber", "roomNo", "RoomNo");
  const value = roomId !== undefined && roomId !== null && roomId !== "" ? String(roomId) : roomNo;
  if (!value) return null;
  const hostelId = read(room, "hostelId", "HostelId");
  const roomTypeId = read(room, "roomTypeId", "RoomTypeId");
  const blockValue = hostelId !== undefined && hostelId !== null && hostelId !== "" ? String(hostelId) : readText(room, "hostelCode", "HostelCode", "block", "Block");
  const type = readText(room, "roomTypeSpecification", "RoomTypeSpecification", "type", "Type");
  const floor = readText(room, "floorLevel", "FloorLevel", "floor", "Floor");
  return {
    value,
    roomId: roomId !== undefined && roomId !== null && roomId !== "" ? String(roomId) : "",
    hostelId: hostelId !== undefined && hostelId !== null && hostelId !== "" ? String(hostelId) : "",
    roomTypeId: roomTypeId !== undefined && roomTypeId !== null && roomTypeId !== "" ? String(roomTypeId) : "",
    roomTypeName: type,
    blockValue,
    label: `Room ${roomNo || value}${floor ? ` - Floor: ${floor}` : type ? ` - ${type}` : ""}`,
    roomNo: roomNo || value,
    feeAmount: Number(read(room, "fee", "Fee", "monthlyFee", "MonthlyFee") || 0),
    status: isLiveMasterActive(room) ? "Active" : "Inactive",
  };
};

const normalizeHostelRoomTypeOption = (roomType = {}) => {
  const id = read(roomType, "roomTypeId", "RoomTypeId", "hostelRoomTypeId", "HostelRoomTypeId", "id", "Id");
  const value = id !== undefined && id !== null && id !== "" ? String(id) : readText(roomType, "roomTypeSpecification", "RoomTypeSpecification", "roomTypeName", "RoomTypeName", "name", "Name");
  if (!value) return null;
  const name = readText(roomType, "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification", "name", "Name") || value;
  return {
    value,
    roomTypeId: id !== undefined && id !== null && id !== "" ? String(id) : "",
    label: name,
    name,
    status: isLiveMasterActive(roomType) ? "Active" : "Inactive",
  };
};

const normalizeHostelFeeConfig = (fee = {}) => {
  const hostelId = read(fee, "hostelId", "HostelId");
  const roomTypeId = read(fee, "roomTypeId", "RoomTypeId");
  if (hostelId === undefined || hostelId === null || hostelId === "" || roomTypeId === undefined || roomTypeId === null || roomTypeId === "") return null;
  return {
    feeConfigId: read(fee, "feeConfigId", "FeeConfigId", "id", "Id"),
    hostelId: String(hostelId),
    hostelName: readText(fee, "hostelName", "HostelName"),
    roomTypeId: String(roomTypeId),
    roomTypeName: readText(fee, "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification"),
    feeFrequency: readText(fee, "feeFrequency", "FeeFrequency") || "Monthly",
    hostelFeeAmount: Number(read(fee, "hostelFeeAmount", "HostelFeeAmount", "feeAmount", "FeeAmount") || 0),
    securityDeposit: Number(read(fee, "securityDeposit", "SecurityDeposit") || 0),
    totalFee: Number(read(fee, "totalFee", "TotalFee") || 0),
    status: isLiveMasterActive(fee) ? "Active" : "Inactive",
  };
};

const resolveTransportFee = (values) => {
  if (values.studentType !== "Non-Residential" || values.transportRequired !== "Yes" || !values.busRoute || !values.pickupPoint || !values.pickupPointName) return null;
  return {
    type: `Transport Fee${values.busRouteName ? ` (${values.busRouteName})` : ""}`,
    amount: Number(values.transportMonthlyFee || 0),
    plan: "Monthly",
    detail: values.pickupPointName,
  };
};

const resolveHostelFee = (values) => {
  if (values.studentType !== "Residential" || !values.hostelBlock || !values.hostelRoom) return null;
  if (values.hostelFeeTotal === undefined || values.hostelFeeTotal === null || values.hostelFeeTotal === "") return null;
  const hostelFeeAmount = Number(values.hostelFeeAmount || 0);
  const securityDeposit = Number(values.hostelSecurityDeposit || 0);
  const totalFee = Number(values.hostelFeeTotal || 0);
  if (!totalFee && !hostelFeeAmount && !securityDeposit) return null;
  return {
    type: `Hostel Fee (${values.hostelBlockName || values.hostelBlock}, ${values.hostelRoomName || values.hostelRoom})`,
    amount: totalFee || hostelFeeAmount + securityDeposit,
    plan: values.hostelFeeFrequency || "Monthly",
    detail: [
      values.hostelRoomName ? `Room Type: ${values.hostelRoomName}` : "",
      `Hostel Fee: ${formatCurrency(hostelFeeAmount)}`,
      `Security Deposit: ${formatCurrency(securityDeposit)}`,
    ].filter(Boolean).join(" | "),
  };
};

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
  "selectedFeeComponents",
  "SelectedFeeComponents",
  "selectedComponents",
  "SelectedComponents",
  "selectedFeeStructureComponents",
  "SelectedFeeStructureComponents",
  "feeBreakdown",
  "FeeBreakdown",
  "breakdown",
  "Breakdown",
  "lineItems",
  "LineItems",
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
  "schedules",
  "Schedules",
  "scheduledFees",
  "ScheduledFees",
  "courseSchedules",
  "CourseSchedules",
  "feeSchedules",
  "FeeSchedules",
  "paymentSchedules",
  "PaymentSchedules",
).map((row, index) => ({
  no: readNumber(row, "no", "No", "installmentNo", "InstallmentNo", "scheduleNo", "ScheduleNo") ?? index + 1,
  amount: readNumber(row, "amount", "Amount", "installmentAmount", "InstallmentAmount", "scheduledAmount", "ScheduledAmount", "dueAmount", "DueAmount", "payable", "Payable") ?? 0,
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
  const persistedItems = readAdmissionFeeItems(payload, currentValues.feeStructureId || readFeeStructureId(payload));
  if (!persisted.paymentPlan && !persistedItems.length) return currentValues;
  return {
    ...currentValues,
    ...(persistedItems.length ? { feeItems: persistedItems } : {}),
    ...(persisted.paymentPlan ? {
      paymentPlan: persisted.paymentPlan,
      installmentCount: persisted.installmentCount,
      installments: persisted.paymentPlan === "Installment Payment" ? persisted.installments : [],
    } : {}),
  };
};

const persistedFeeComponents = (payload, feeStructureId = "") => persistedFeeSources(payload)
  .flatMap((source) => readAdmissionFeeItems(source, readFeeStructureId(source) || feeStructureId));

const readPersistedFeeSummary = (payload, fallbackFee) => {
  const sources = persistedFeeSources(payload);
  if (!sources.length) return fallbackFee;
  const components = persistedFeeComponents(payload, fallbackFee.feeStructureId);
  const componentTotal = (kind, amountKeys) => components
    .filter((item) => item.kind === kind)
    .reduce((sum, item) => sum + (amountKeys.map((key) => Number(item[key])).find(Number.isFinite) || 0), 0);
  const readFirstNumber = (...keys) => sources
    .map((source) => readNumber(source, ...keys))
    .find((value) => value !== null);
  const readFirstText = (...keys) => sources
    .map((source) => readText(source, ...keys))
    .find(Boolean) || "";
  const totalAmount = readFirstNumber("totalAmount", "TotalAmount", "originalFee", "OriginalFee");
  const concessionAmount = readFirstNumber("concessionAmount", "ConcessionAmount", "discountAmount", "DiscountAmount", "concession", "Concession");
  const payableAmount = readFirstNumber("payableAmount", "PayableAmount", "netPayable", "NetPayable", "totalPayable", "TotalPayable");
  const paidAmount = readFirstNumber("paidAmount", "PaidAmount", "amountPaid", "AmountPaid", "totalPaid", "TotalPaid");
  const balanceAmount = readFirstNumber("balanceAmount", "BalanceAmount", "remainingBalance", "RemainingBalance", "outstandingBalance", "OutstandingBalance");

  return {
    admissionFee: componentTotal("admission", ["payableAmount", "originalAmount"]) || fallbackFee.admissionFee,
    courseFee: componentTotal("course", ["originalAmount", "payableAmount"]) || fallbackFee.courseFeeOriginal || fallbackFee.courseFee,
    concessionAmount: concessionAmount ?? fallbackFee.courseConcession,
    optionalFees: componentTotal("optional", ["payableAmount", "originalAmount"]) || fallbackFee.optionalFeesTotal,
    totalPayable: payableAmount ?? fallbackFee.totalPayable ?? fallbackFee.totalCommitment,
    amountPaid: paidAmount ?? fallbackFee.paidToday,
    remainingBalance: balanceAmount ?? fallbackFee.remainingBalance ?? fallbackFee.remaining,
    paymentPlan: readFirstText("paymentPlan", "PaymentPlan", "planName", "PlanName") || fallbackFee.paymentPlan,
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
  const campus = read(item, "campus", "Campus");
  const campusId = readId(item, "campusId", "CampusId") || readId(campus, "campusId", "CampusId", "id", "Id");
  const campusName = readText(item, "campusName", "CampusName")
    || (typeof campus === "string" ? campus : readText(campus, "campusName", "CampusName", "name", "Name", "campusCode", "CampusCode"));
  const admittedByEmployeeId = readText(item, "admittedByEmployeeId", "AdmittedByEmployeeId", "admittedByEmpId", "AdmittedByEmpId");
  const admittedByEmployeeName = readText(item, "admittedByEmployeeName", "AdmittedByEmployeeName", "admittedByName", "AdmittedByName");
  const studentPhoto = readPhotoUrl(item, student, admission);
  const photoUrl = resolveStudentPhotoUrl(studentPhoto);
  const feeStructureId = readFeeStructureId(item);
  const savedFeeItems = readAdmissionFeeItems(item, feeStructureId);
  const savedInstallments = readAdmissionInstallments(item);
  const persistedFee = readPersistedFeeState(item, { installments: savedInstallments });
  const paymentPlan = persistedFee.paymentPlan
    || normalizeCoursePaymentPlan(readText(item, "paymentPlan", "PaymentPlan"), savedInstallments.length > 0);
  const allocation = read(item, "allocation", "Allocation", "residentialAllocation", "ResidentialAllocation", "studentAllocation", "StudentAllocation");
  const transport = read(item, "transport", "Transport", "transportDetails", "TransportDetails", "transportAllocation", "TransportAllocation", "studentTransport", "StudentTransport");
  const hostel = read(item, "hostel", "Hostel", "hostelDetails", "HostelDetails", "hostelAllocation", "HostelAllocation", "studentHostel", "StudentHostel");
  const route = read(item, "route", "Route", "busRoute", "BusRoute")
    || read(transport, "route", "Route", "busRoute", "BusRoute");
  const pickup = read(item, "pickup", "Pickup", "pickupPoint", "PickupPoint")
    || read(transport, "pickup", "Pickup", "pickupPoint", "PickupPoint");
  const block = read(item, "block", "Block", "hostelBlock", "HostelBlock")
    || read(hostel, "block", "Block", "hostelBlock", "HostelBlock");
  const room = read(item, "room", "Room", "hostelRoom", "HostelRoom")
    || read(hostel, "room", "Room", "hostelRoom", "HostelRoom");
  const allocationSources = compactObjects(item, admission, student, allocation, transport, hostel);
  const combinedAddress = readText(item, "address", "Address");
  const combinedAddressParts = combinedAddress.split(",").map((part) => part.trim()).filter(Boolean);
  const houseDoorNumber = readText(item, "houseDoorNumber", "HouseDoorNumber", "addressLine1", "AddressLine1") || combinedAddressParts[0] || "";
  const streetVillage = readText(item, "streetVillage", "StreetVillage", "addressLine2", "AddressLine2") || combinedAddressParts[1] || "";
  const city = readText(item, "city", "City") || combinedAddressParts[2] || "";
  const district = readText(item, "district", "District") || combinedAddressParts[3] || "";
  const state = readText(item, "state", "State") || combinedAddressParts[4] || "";
  const pincode = readText(item, "pincode", "Pincode", "pinCode", "PinCode") || combinedAddressParts[5] || "";
  const studentType = normalizeStudentTypeText(readTextFromSources(allocationSources, "studentType", "StudentType", "residentialType", "ResidentialType", "residenceType", "ResidenceType", "isResidential", "IsResidential"));
  const transportRequired = normalizeYesNoText(readTextFromSources(allocationSources, "transportRequired", "TransportRequired", "isTransportRequired", "IsTransportRequired", "requiresTransport", "RequiresTransport"));
  const busType = normalizeTransportBusType(readTextFromSources(allocationSources, "busType", "BusType", "vehicleType", "VehicleType", "isAC", "IsAC", "isAc", "IsAc"));
  const busRoute = readIdFromSources([route, ...allocationSources], "routeId", "RouteId", "busRouteId", "BusRouteId", "id", "Id")
    || readTextFromSources(allocationSources, "busRoute", "BusRoute", "route", "Route");
  const busRouteName = readTextFromSources([route, ...allocationSources], "fetchedBusRoute", "FetchedBusRoute", "busRouteName", "BusRouteName", "routeName", "RouteName", "name", "Name", "routeNumber", "RouteNumber", "routeCode", "RouteCode");
  const pickupPoint = readIdFromSources([pickup, ...allocationSources], "pickupPointId", "PickupPointId", "pickupId", "PickupId", "id", "Id")
    || readTextFromSources(allocationSources, "pickupPoint", "PickupPoint", "pickup", "Pickup");
  const pickupPointName = readTextFromSources([pickup, ...allocationSources], "fetchedPickupPoint", "FetchedPickupPoint", "stopName", "StopName", "pickupPointName", "PickupPointName", "pickupName", "PickupName", "name", "Name");
  const hostelBlock = readIdFromSources([block, ...allocationSources], "hostelId", "HostelId", "id", "Id")
    || readTextFromSources(allocationSources, "hostelBlock", "HostelBlock", "hostelCode", "HostelCode", "blockCode", "BlockCode", "code", "Code");
  const hostelBlockName = readTextFromSources([block, ...allocationSources], "fetchedHostelBlock", "FetchedHostelBlock", "hostelBlockName", "HostelBlockName", "hostelName", "HostelName", "blockName", "BlockName", "hostelBlock", "HostelBlock", "name", "Name");
  const hostelRoom = readIdFromSources([room, ...allocationSources], "roomTypeId", "RoomTypeId", "hostelRoomTypeId", "HostelRoomTypeId")
    || readTextFromSources([room, ...allocationSources], "hostelRoom", "HostelRoom", "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification");
  const hostelRoomName = readTextFromSources([room, ...allocationSources], "fetchedHostelRoom", "FetchedHostelRoom", "hostelRoomName", "HostelRoomName", "roomTypeName", "RoomTypeName", "roomTypeSpecification", "RoomTypeSpecification", "hostelRoom", "HostelRoom");

  return {
    id: admissionId || admissionNo,
    admissionId,
    studentId: readId(item, "studentId", "StudentId") || readId(student, "studentId", "StudentId", "id", "Id"),
    admissionNo,
    studentName,
    admissionDate: readText(item, "admissionDate", "AdmissionDate", "date", "Date"),
    academicYearId,
    academicYear: academicYearId || academicYearName,
    academicYearName,
    campusId,
    campus: campusId || campusName,
    campusName,
    boardId,
    board: boardId || boardName,
    boardName,
    groupId,
    group: !isRawIdDisplay(groupName, groupId) ? groupName : groupId,
    programId,
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
      campus: campusId,
      campusName,
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
      admittedByEmployeeId,
      admittedByEmployeeName,
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
      studentType,
      transportRequired,
      busType,
      busRoute,
      busRouteName,
      pickupPoint,
      pickupPointName,
      hostelBlock,
      hostelBlockName,
      hostelRoom,
      hostelRoomName,
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
  const feeItems = baseItems.filter((item) => !isFacilityFeeItem(item)).map((item, index) => {
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
  const facilityFeeItems = [resolveHostelFee(values), resolveTransportFee(values)]
    .filter(Boolean)
    .map((item, index) => ({
      id: `${item.type.toLowerCase().includes("hostel") ? "hostel" : "transport"}-fee-${index + 1}`,
      type: item.type,
      originalAmount: Number(item.amount || 0),
      payableAmount: Number(item.amount || 0),
      selected: true,
      required: true,
      kind: item.type.toLowerCase().includes("hostel") ? "hostel" : "transport",
      plan: item.plan,
      detail: item.detail,
    }));
  const selectedItems = feeItems.filter((item) => item.selected);
  const admissionItems = selectedItems.filter((item) => item.kind === "admission");
  const courseItems = selectedItems.filter((item) => item.kind === "course");
  const optionalItems = selectedItems.filter((item) => item.kind === "optional");
  const admissionFee = admissionItems.reduce((sum, item) => sum + item.originalAmount, 0);
  const courseFeeOriginal = courseItems.reduce((sum, item) => sum + item.originalAmount, 0);
  const optionalFeesTotal = optionalItems.reduce((sum, item) => sum + item.originalAmount, 0);
  const facilityFeesTotal = facilityFeeItems.reduce((sum, item) => sum + item.originalAmount, 0);
  const originalTotal = admissionFee + courseFeeOriginal + optionalFeesTotal + facilityFeesTotal;
  const concessionType = values.concessionType || values.scholarshipDiscountType || "Fixed";
  const concessionValue = Number(values.concessionValue || 0);
  const rawConcession = concessionType === "Percentage"
    ? (courseFeeOriginal * concessionValue) / 100
    : concessionValue;
  const courseConcession = Math.min(Math.max(Math.round(rawConcession), 0), courseFeeOriginal);
  const courseFeePayable = Math.max(courseFeeOriginal - courseConcession, 0);
  const totalCommitment = admissionFee + courseFeePayable + optionalFeesTotal + facilityFeesTotal;
  const schedule = Array.isArray(values.installments) ? values.installments : [];
  const isInstallment = values.paymentPlan === "Installment Payment";
  const coursePaidToday = 0;
  const paidToday = 0;
  const courseScheduleBalance = isInstallment ? Math.max(courseFeePayable - coursePaidToday, 0) : 0;

  return {
    feeStructureId: values.feeStructureId || "",
    admissionFee,
    courseFee: courseFeePayable,
    courseFeeOriginal,
    courseConcession,
    courseFeePayable,
    optionalFeesTotal,
    facilityFeesTotal,
    facilityFeeItems,
    totalCommitment,
    admissionFeeDueToday: 0,
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
  if (field.name === "admittedBy") {
    return admissionStaffLabel({
      employeeId: values.admittedByEmployeeId,
      fullName: values.admittedByEmployeeName,
    }) || values.admittedBySearch || "";
  }
  if (field.name === "level") return values.levelName || values.level;
  if (field.name === "group") return values.groupName || values.group;
  if (field.name === "program") return values.programName || values.program;
  if (field.name === "busRoute") return values.busRouteName || values.busRoute;
  if (field.name === "pickupPoint") return values.pickupPointName || values.pickupPoint;
  if (field.name === "hostelBlock") return values.hostelBlockName || values.hostelBlock;
  if (field.name === "hostelRoom") return values.hostelRoomName || values.hostelRoom;
  return values[field.name];
};

const normalizeAdmissionStaff = (payload) => {
  const staff = getObject(payload);
  const personal = read(staff, "personal", "Personal") || {};
  const employeeId = readText(staff, "employeeId", "EmployeeId", "empId", "EmpId");
  const firstName = readText(staff, "firstName", "FirstName") || readText(personal, "firstName", "FirstName");
  const middleName = readText(staff, "middleName", "MiddleName") || readText(personal, "middleName", "MiddleName");
  const lastName = readText(staff, "lastName", "LastName") || readText(personal, "lastName", "LastName");
  const fullName = readText(staff, "fullName", "FullName", "staffName", "StaffName", "name", "Name")
    || [firstName, middleName, lastName].filter(Boolean).join(" ");
  if (!employeeId && !fullName) return null;
  return {
    id: readId(staff, "id", "Id", "staffId", "StaffId"),
    employeeId,
    fullName,
  };
};

const admissionStaffLabel = (staff) => {
  const employeeId = readText(staff, "employeeId", "EmployeeId", "empId", "EmpId");
  const fullName = readText(staff, "fullName", "FullName", "staffName", "StaffName", "name", "Name");
  if (fullName && employeeId) return `${fullName} - ${employeeId}`;
  return fullName || employeeId || "";
};

const admissionStaffSearchText = (staff) => [
  readText(staff, "fullName", "FullName", "staffName", "StaffName", "name", "Name"),
  readText(staff, "employeeId", "EmployeeId", "empId", "EmpId"),
].filter(Boolean).join(" ").toLowerCase();

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
        const visibleFields = visibleFieldsFor(section.fields, values);
        const hasOpenStaffDropdown = visibleFields.some((field) => field.type === "staffSearch" && field.open);
        const gridStyle = {
          ...(section.title === "Student Details" ? { gridTemplateColumns: "repeat(3, minmax(0, 1fr)) 88px", gridAutoFlow: "row" } : {}),
          ...(hasOpenStaffDropdown ? { overflow: "visible", position: "relative", zIndex: 30 } : {}),
        };
        return (
          <section
            key={section.title}
            className="cms-admission-form-section"
            style={hasOpenStaffDropdown ? { overflow: "visible", position: "relative", zIndex: 30 } : undefined}
          >
            <div className="cms-admission-section-head">
              <span className="cms-admission-section-icon"><SectionIcon size={16} /></span>
              <h3>{section.title === "Admission" ? "Admission Details" : section.title}</h3>
            </div>
            <div
              className={`cms-form-grid ${section.title === "Address" ? "cms-admission-address-grid" : "cols-3"} ${section.title === "Admission" ? "cms-admission-details-grid" : ""} ${section.title === "Student Details" ? "cms-admission-student-grid" : ""}`}
              style={Object.keys(gridStyle).length ? gridStyle : undefined}
            >
              {visibleFields.map((field) => (
                <AdmissionField
                  key={field.name}
                  field={{ ...field, required: field.required || (typeof field.requiredWhen === "function" && field.requiredWhen(values)) }}
                  value={values[field.name]}
                  error={errors[field.name]}
                  onChange={onChange}
                  onFileChange={onFileChange}
                  onFileRemove={onFileRemove}
                  inputRef={(element) => { inputRefs.current[field.name] = element; }}
                  previewUrl={field.name === "photo" ? studentPhotoSource(values, photoPreviewUrl) : ""}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AdmissionField({ field, value, error, onChange, onFileChange, onFileRemove, inputRef, previewUrl = "" }) {
  const fieldStyle = field.gridColumn || field.gridRow ? { gridColumn: field.gridColumn, gridRow: field.gridRow, minWidth: 0 } : undefined;
  if (field.type === "staffSearch") {
    const displayValue = field.displayValue ?? value ?? "";
    return (
      <div className={`cms-field ${field.full ? "full" : ""} ${error ? "has-error" : ""}`} style={{ ...fieldStyle, position: "relative", zIndex: field.open ? 60 : "auto" }}>
        <label htmlFor={`f-${field.name}`}>
          {field.label} {field.required ? <span className="req">*</span> : null}
        </label>
        <div style={{ position: "relative" }}>
          <input
            id={`f-${field.name}`}
            ref={inputRef}
            value={displayValue}
            placeholder={field.placeholder || "Search employee by name or ID..."}
            autoComplete="off"
            onFocus={field.onFocus}
            onBlur={field.onBlur}
            onChange={(event) => onChange(field.name, { kind: "search", value: event.target.value })}
          />
          <ChevronDown
            size={16}
            aria-hidden="true"
            style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#6f7a63", pointerEvents: "none" }}
          />
        </div>
        {field.open ? (
          <div
            role="listbox"
            aria-label="Admitted By employee results"
            style={{
              position: "absolute",
              zIndex: 1000,
              left: 0,
              right: 0,
              top: "calc(100% + 4px)",
              maxHeight: 218,
              overflowY: "auto",
              background: "#fff",
              border: "1px solid rgba(111, 128, 50, 0.25)",
              borderRadius: 12,
              boxShadow: "0 14px 30px rgba(24, 36, 20, 0.14)",
              padding: 6,
            }}
          >
            {field.loading ? (
              <div style={{ padding: "10px 12px", color: "#6f7a63" }}>Loading employees...</div>
            ) : field.loadError ? (
              <div style={{ padding: "10px 12px", color: "#c43d3d" }}>{field.loadError}</div>
            ) : field.options?.length ? (
              field.options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onChange(field.name, { kind: "select", option })}
                  style={{
                    width: "100%",
                    border: 0,
                    background: "transparent",
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    color: "#1f2b1d",
                    font: "inherit",
                  }}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div style={{ padding: "10px 12px", color: "#6f7a63" }}>No employees found</div>
            )}
          </div>
        ) : null}
        {error ? <span className="cms-error">{error}</span> : null}
      </div>
    );
  }

  if (field.name === "caste") {
    const normalizedOptions = (field.options || []).map((option) => (
      option && typeof option === "object"
        ? { value: option.value, label: option.label ?? option.value, disabled: Boolean(option.disabled) }
        : { value: option, label: option, disabled: false }
    ));
    return (
      <div className={`cms-field ${error ? "has-error" : ""}`} style={fieldStyle}>
        <label htmlFor={`f-${field.name}`}>
          {field.label} {field.required ? <span className="req">*</span> : null}
        </label>
        <select id={`f-${field.name}`} value={value ?? ""} disabled={field.disabled} onChange={(event) => onChange(field.name, event.target.value)}>
          <option value="">Select {field.label}</option>
          {normalizedOptions.map((option, index) => (
            <option key={`${option.value}-${index}`} value={option.value} disabled={option.disabled}>{option.label}</option>
          ))}
        </select>
        {error ? <span className="cms-error">{error}</span> : null}
      </div>
    );
  }

  if (field.type === "select" && field.selectPlaceholder) {
    const normalizedOptions = (field.options || []).map((option) => (
      option && typeof option === "object"
        ? { value: option.value, label: option.label ?? option.value, disabled: Boolean(option.disabled) }
        : { value: option, label: option, disabled: false }
    ));
    return (
      <div className={`cms-field ${field.full ? "full" : ""} ${error ? "has-error" : ""}`} style={fieldStyle}>
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

  if (field.type !== "file" && fieldStyle) {
    const normalizedOptions = (field.options || []).map((option) => (
      option && typeof option === "object"
        ? { value: option.value, label: option.label ?? option.value, disabled: Boolean(option.disabled) }
        : { value: option, label: option, disabled: false }
    ));
    return (
      <div className={`cms-field ${field.full ? "full" : ""} ${error ? "has-error" : ""}`} style={fieldStyle}>
        <label htmlFor={`f-${field.name}`}>
          {field.label} {field.required ? <span className="req">*</span> : null}
        </label>
        {field.type === "select" ? (
          <select id={`f-${field.name}`} value={value ?? ""} disabled={field.disabled} onChange={(event) => onChange(field.name, event.target.value)}>
            <option value="">Select {field.label}</option>
            {normalizedOptions.map((option, index) => (
              <option key={`${option.value}-${index}`} value={option.value} disabled={option.disabled}>{option.label}</option>
            ))}
          </select>
        ) : (
          <input
            id={`f-${field.name}`}
            type={field.type || "text"}
            value={value ?? ""}
            disabled={field.disabled}
            placeholder={field.placeholder || field.label}
            min={field.min}
            max={field.max}
            step={field.step}
            autoComplete={field.autoComplete}
            onChange={(event) => onChange(field.name, event.target.value)}
          />
        )}
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
    <div className={`cms-field cms-admission-photo-cell ${error ? "has-error" : ""}`} style={fieldStyle}>
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
      {(fee.facilityFeeItems || []).map((item) => (
        <div key={item.id}><span>{item.type}</span><strong>{formatCurrency(item.originalAmount)}</strong></div>
      ))}
      <div className="is-total"><span>Total Fee Commitment</span><strong>{formatCurrency(fee.totalCommitment)}</strong></div>
      <div><span>Amount Paid Now</span><strong>{formatCurrency(fee.paidToday)}</strong></div>
      <div><span>Future Scheduled Course Fee</span><strong>{formatCurrency(fee.courseScheduleBalance)}</strong></div>
      <div className="is-total"><span>Remaining Balance</span><strong>{formatCurrency(fee.remainingBalance)}</strong></div>
      <div><span>Payment Plan</span><strong>{fee.paymentPlan ? paymentPlanLabel(fee.paymentPlan) : "Not selected"}</strong></div>
    </div>
  );
}

function FacilityFeesTable({ feeItems }) {
  if (!feeItems?.length) return null;
  return (
    <section className="cms-fee-block">
      <h3>Applicable Facility Fees</h3>
      <div className="cms-fee-scroll">
        <table className="cms-fee-table">
          <thead>
            <tr>
              <th>Fee Type</th>
              <th>Plan</th>
              <th>Details</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {feeItems.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.type}</strong></td>
                <td>{item.plan || "-"}</td>
                <td>{item.detail || "-"}</td>
                <td className="num">{formatCurrency(item.originalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
        <AdmissionPageSkeleton variant="fees" />
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

          <FacilityFeesTable feeItems={fee.facilityFeeItems} />

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
                    <small>{plan === "Full Payment" ? "Use the selected fee items as one fee assignment." : "Schedule the Course Fee payable."}</small>
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
                <div><span>Facility Fees</span><strong>{formatCurrency(fee.facilityFeesTotal)}</strong></div>
                <div className="is-total"><span>Total Selected Fee</span><strong>{formatCurrency(fee.totalCommitment)}</strong></div>
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
  const persistedFee = readPersistedFeeSummary(values.persistedFeeDetails, fee);
  const previewPaymentPlan = persistedFee.paymentPlan || values.paymentPlan;
  const previewCourseFeePayable = Math.max(Number(persistedFee.courseFee || 0) - Number(persistedFee.concessionAmount || 0), 0);
  return (
    <div className="cms-fee-preview">
      <div className="cms-fee-kv-grid">
        <div><span>Group</span><strong>{values.groupName || values.group || "Not provided"}</strong></div>
        <div><span>Program</span><strong>{values.programName || values.program || "Not provided"}</strong></div>
        <div><span>Admission Fee</span><strong>{formatCurrency(persistedFee.admissionFee)}</strong></div>
        <div><span>Course Fee</span><strong>{formatCurrency(persistedFee.courseFee)}</strong></div>
        <div><span>Scholarship</span><strong>{fee.concessionName || "No scholarship"}</strong></div>
        <div><span>Course Fee Payable</span><strong>{formatCurrency(previewCourseFeePayable)}</strong></div>
        <div><span>Facility Fees</span><strong>{formatCurrency(fee.facilityFeesTotal)}</strong></div>
        <div><span>Payment Plan</span><strong>{previewPaymentPlan ? paymentPlanLabel(previewPaymentPlan) : "Not selected"}</strong></div>
        <div><span>Amount Paid Now</span><strong>{formatCurrency(persistedFee.amountPaid)}</strong></div>
        <div><span>Future Course Schedules</span><strong>{formatCurrency(fee.courseScheduleBalance)}</strong></div>
        <div><span>Remaining Balance</span><strong>{formatCurrency(persistedFee.remainingBalance)}</strong></div>
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
      {fee.facilityFeeItems?.length ? (
        <div className="cms-fee-preview-schedule">
          <h4>Facility Fees</h4>
          <div className="cms-fee-scroll">
            <table className="cms-fee-table">
              <thead>
                <tr><th>Fee Type</th><th>Plan</th><th>Details</th><th className="num">Amount</th></tr>
              </thead>
              <tbody>
                {fee.facilityFeeItems.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.type}</strong></td>
                    <td>{item.plan || "-"}</td>
                    <td>{item.detail || "-"}</td>
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
  const { campuses, selectedCampus } = useCampusContext();
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
  const [allocationMasterData, setAllocationMasterData] = useState({
    routes: [],
    pickupPoints: [],
    vehicles: [],
    vehicleAssignments: [],
    hostelBlocks: [],
    hostelRooms: [],
    hostelRoomTypes: [],
    hostelFees: [],
  });
  const [allocationMasterStatus, setAllocationMasterStatus] = useState({ loading: false, error: "", failed: [] });
  const [scholarships, setScholarships] = useState([]);
  const [feeStructureLoading, setFeeStructureLoading] = useState(false);
  const [feeStructureError, setFeeStructureError] = useState("");
  const [admissionNumberLoading, setAdmissionNumberLoading] = useState(false);
  const [admissionNumberError, setAdmissionNumberError] = useState("");
  const [admittedByLookupLoading, setAdmittedByLookupLoading] = useState(false);
  const [admittedByStaffOptions, setAdmittedByStaffOptions] = useState([]);
  const [admittedByStaffLoaded, setAdmittedByStaffLoaded] = useState(false);
  const [admittedByStaffError, setAdmittedByStaffError] = useState("");
  const [admittedByDropdownOpen, setAdmittedByDropdownOpen] = useState(false);
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
  const scholarshipRequestRef = useRef(0);
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
  const campusOptions = useMemo(() => (
    (campuses || [])
      .filter((campus) => campus?.isActive !== false && campus?.status !== "Inactive")
      .map((campus) => {
        const value = campus.campusId ?? campus.id;
        const name = campus.name || campus.campusName || "";
        const code = campus.code || campus.campusCode || "";
        if (value === undefined || value === null || value === "") return null;
        return {
          value: String(value),
          label: code ? `${name || code} (${code})` : name || String(value),
        };
      })
      .filter(Boolean)
  ), [campuses]);
  const selectedCampusValue = selectedCampus?.campusId ?? selectedCampus?.id ?? "";
  const admittedBySelectedLabel = admissionStaffLabel({
    employeeId: values.admittedByEmployeeId,
    fullName: values.admittedByEmployeeName,
  });
  const admittedByDisplayValue = values.admittedBySearch ?? admittedBySelectedLabel;
  const filteredAdmittedByStaffOptions = useMemo(() => {
    const query = String(admittedByDisplayValue || "").trim().toLowerCase();
    const selectedLabel = admittedBySelectedLabel.toLowerCase();
    const shouldShowAll = !query || query === selectedLabel;
    return admittedByStaffOptions
      .filter((option) => shouldShowAll || option.searchText.includes(query));
  }, [admittedByDisplayValue, admittedBySelectedLabel, admittedByStaffOptions]);
  const loadAdmittedByStaffOptions = useCallback(() => {
    setAdmittedByDropdownOpen(true);
    if (admittedByStaffLoaded || admittedByLookupLoading) return;
    setAdmittedByLookupLoading(true);
    setAdmittedByStaffError("");
    apiClient.get(apiEndpoints.faculty.list, { params: { PageNumber: 1, PageSize: 500 } })
      .then((response) => {
        const seen = new Set();
        const options = getCollection(response.data)
          .map(normalizeAdmissionStaff)
          .filter(Boolean)
          .map((staff, index) => {
            const employeeId = staff.employeeId || "";
            const label = admissionStaffLabel(staff);
            const key = employeeId || staff.id || `${label}-${index}`;
            if (!label || seen.has(key)) return null;
            seen.add(key);
            return {
              ...staff,
              key,
              label,
              searchText: admissionStaffSearchText(staff),
            };
          })
          .filter(Boolean);
        setAdmittedByStaffOptions(options);
        setAdmittedByStaffLoaded(true);
      })
      .catch((error) => {
        setAdmittedByStaffError(getApiErrorMessage(error, "Unable to load employees"));
      })
      .finally(() => setAdmittedByLookupLoading(false));
  }, [admittedByLookupLoading, admittedByStaffLoaded]);
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
  const routeBusTypesByRoute = useMemo(() => {
    const vehicleTypeById = new Map(
      allocationMasterData.vehicles
        .filter((vehicle) => vehicle.status !== "Inactive" && vehicle.busType)
        .map((vehicle) => [String(vehicle.value), vehicle.busType])
    );
    return allocationMasterData.vehicleAssignments
      .filter((assignment) => assignment.status !== "Inactive")
      .reduce((lookup, assignment) => {
        const busType = assignment.busType || vehicleTypeById.get(String(assignment.vehicleId));
        if (!busType) return lookup;
        const routeKey = String(assignment.routeId);
        if (!lookup.has(routeKey)) lookup.set(routeKey, new Set());
        lookup.get(routeKey).add(busType);
        return lookup;
      }, new Map());
  }, [allocationMasterData.vehicleAssignments, allocationMasterData.vehicles]);
  const transportRouteOptions = useMemo(() => (
    allocationMasterData.routes
      .filter((route) => route.status !== "Inactive")
      .filter((route) => {
        if (!values.busType) return true;
        const routeBusTypes = routeBusTypesByRoute.get(String(route.value));
        return routeBusTypes?.has(values.busType);
      })
      .map(({ value, label }) => ({ value, label }))
  ), [allocationMasterData.routes, routeBusTypesByRoute, values.busType]);
  const pickupOptionsForRoute = useCallback((routeId) => (
    allocationMasterData.pickupPoints
      .filter((point) => point.status !== "Inactive" && (
        !allocationMasterData.pickupPoints.some((item) => item.routeId)
        || String(point.routeId || "") === String(routeId || "")
      ))
      .map(({ value, label }) => ({ value, label }))
  ), [allocationMasterData.pickupPoints]);
  const hostelBlockOptions = useMemo(() => (
    allocationMasterData.hostelBlocks
      .filter((block) => block.status !== "Inactive")
      .map(({ value, label }) => ({ value, label }))
  ), [allocationMasterData.hostelBlocks]);
  const hostelRoomsForBlock = useCallback((blockValue) => {
    const block = allocationMasterData.hostelBlocks.find((item) => String(item.value) === String(blockValue));
    const roomTypeIdsForBlock = new Set(allocationMasterData.hostelRooms
      .filter((room) => room.status !== "Inactive" && (
        String(room.blockValue || "") === String(blockValue || "")
        || Boolean(block?.hostelId && String(room.hostelId || "") === String(block.hostelId))
      ))
      .map((room) => String(room.roomTypeId || ""))
      .filter(Boolean));
    allocationMasterData.hostelFees
      .filter((fee) => fee.status === "Active" && String(fee.hostelId || "") === String(block?.hostelId || blockValue || ""))
      .forEach((fee) => {
        if (fee.roomTypeId) roomTypeIdsForBlock.add(String(fee.roomTypeId));
      });
    const sourceRoomTypes = allocationMasterData.hostelRoomTypes.length
      ? allocationMasterData.hostelRoomTypes
      : Array.from(roomTypeIdsForBlock).map((roomTypeId) => {
        const room = allocationMasterData.hostelRooms.find((item) => String(item.roomTypeId || "") === roomTypeId);
        const fee = allocationMasterData.hostelFees.find((item) => String(item.roomTypeId || "") === roomTypeId);
        return { value: roomTypeId, roomTypeId, label: room?.roomTypeName || fee?.roomTypeName || `Room Type ${roomTypeId}`, name: room?.roomTypeName || fee?.roomTypeName || `Room Type ${roomTypeId}`, status: "Active" };
      });
    return sourceRoomTypes
      .filter((roomType) => roomType.status !== "Inactive" && (!roomTypeIdsForBlock.size || roomTypeIdsForBlock.has(String(roomType.roomTypeId || roomType.value))))
      .map(({ value, label }) => ({ value, label }));
  }, [allocationMasterData.hostelBlocks, allocationMasterData.hostelFees, allocationMasterData.hostelRooms, allocationMasterData.hostelRoomTypes]);
  const hostelFeeForRoom = useCallback((blockValue, roomValue) => {
    const block = allocationMasterData.hostelBlocks.find((item) => String(item.value) === String(blockValue));
    const roomType = allocationMasterData.hostelRoomTypes.find((item) => String(item.value) === String(roomValue) || String(item.roomTypeId) === String(roomValue));
    const room = allocationMasterData.hostelRooms.find((item) => (
      String(item.roomTypeId || "") === String(roomValue || "")
      && (
        String(item.blockValue || "") === String(blockValue || "")
        || Boolean(block?.hostelId && String(item.hostelId || "") === String(block.hostelId))
      )
    ));
    const hostelId = room?.hostelId || block?.hostelId || blockValue;
    const roomTypeId = roomType?.roomTypeId || room?.roomTypeId || roomValue;
    if (!hostelId || !roomTypeId) return { room, roomType, config: null };
    const config = allocationMasterData.hostelFees.find((item) => (
      item.status === "Active"
      && String(item.hostelId) === String(hostelId)
      && String(item.roomTypeId) === String(roomTypeId)
    ));
    return { room, roomType, config: config || null };
  }, [allocationMasterData.hostelBlocks, allocationMasterData.hostelFees, allocationMasterData.hostelRooms, allocationMasterData.hostelRoomTypes]);
  const groupFilterOptions = useMemo(() => {
    const scopedMasterGroups = (masterOptions.groups || []).filter((item) => (
      scopedOptionMatches(selectedContextBoardValue, boardOptions, item.boardId, item.boardName, selectedContextBoardLabel)
      && scopedOptionMatches(selectedContextYearValue, yearOptions, item.academicYearId, item.academicYearName, selectedContextYearLabel)
    ));
    const admissionGroups = admissions
      .map((row) => optionFromRecord(row.groupId || row.values?.group, row.group || row.values?.groupName))
      .filter(Boolean);
    return uniqueOptionsByValue([...scopedMasterGroups, ...admissionGroups]);
  }, [
    admissions,
    boardOptions,
    masterOptions.groups,
    selectedContextBoardLabel,
    selectedContextBoardValue,
    selectedContextYearLabel,
    selectedContextYearValue,
    yearOptions,
  ]);
  const academicYearFilterOptions = useMemo(() => uniqueAcademicYearsByName(
    yearOptions || [],
    (item) => item.label,
  ), [yearOptions]);
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
    if (field.name === "campus") {
      return {
        ...field,
        options: campusOptions.length ? campusOptions : [{ value: "__no_campuses", label: "No campuses available", disabled: true }],
      };
    }
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
    if (field.name === "admittedBy") {
      return {
        ...field,
        displayValue: admittedByDisplayValue,
        placeholder: "Search employee by name or ID...",
        options: filteredAdmittedByStaffOptions,
        open: admittedByDropdownOpen,
        loading: admittedByLookupLoading,
        loadError: admittedByStaffError,
        onFocus: loadAdmittedByStaffOptions,
        onBlur: () => window.setTimeout(() => setAdmittedByDropdownOpen(false), 120),
      };
    }
    if (field.name === "busRoute") {
      if (!values.busType) return { ...field, options: [{ value: "__select_bus_type", label: "Select Bus Type first", disabled: true }] };
      if (allocationMasterStatus.loading && !transportRouteOptions.length) return { ...field, options: [{ value: "__loading_routes", label: "Loading routes...", disabled: true }] };
      if (allocationMasterStatus.error && !transportRouteOptions.length) return { ...field, options: [{ value: "__routes_error", label: "Unable to load routes. Please try again.", disabled: true }] };
      return {
        ...field,
        options: transportRouteOptions.length ? transportRouteOptions : [{ value: "__no_routes", label: `No ${values.busType} routes available`, disabled: true }],
      };
    }
    if (field.name === "pickupPoint") {
      if (!values.busRoute) return { ...field, options: [{ value: "__select_route", label: "Select Route first", disabled: true }] };
      const pickupOptions = pickupOptionsForRoute(values.busRoute);
      if (allocationMasterStatus.loading && !pickupOptions.length) return { ...field, options: [{ value: "__loading_pickup_points", label: "Loading pickup points...", disabled: true }] };
      if (allocationMasterStatus.error && !pickupOptions.length) return { ...field, options: [{ value: "__pickup_points_error", label: "Unable to load pickup points. Please try again.", disabled: true }] };
      return {
        ...field,
        options: pickupOptions.length ? pickupOptions : [{ value: "__no_pickup_points", label: "No pickup points available", disabled: true }],
      };
    }
    if (field.name === "hostelBlock") {
      if (allocationMasterStatus.loading && !hostelBlockOptions.length) return { ...field, options: [{ value: "__loading_hostel_blocks", label: "Loading hostel blocks...", disabled: true }] };
      if (allocationMasterStatus.failed?.includes("hostel blocks") && !hostelBlockOptions.length) return { ...field, options: [{ value: "__hostel_blocks_error", label: "Unable to load hostel blocks. Please try again.", disabled: true }] };
      return {
        ...field,
        options: hostelBlockOptions.length ? hostelBlockOptions : [{ value: "__no_hostel_blocks", label: "No hostel blocks available", disabled: true }],
      };
    }
    if (field.name === "hostelRoom") {
      if (!values.hostelBlock) return { ...field, options: [{ value: "__select_hostel_block", label: "Select Hostel Block first", disabled: true }] };
      const roomOptions = hostelRoomsForBlock(values.hostelBlock);
      if (allocationMasterStatus.loading && !roomOptions.length) return { ...field, options: [{ value: "__loading_hostel_room_types", label: "Loading room types...", disabled: true }] };
      if ((allocationMasterStatus.failed?.includes("hostel room types") || allocationMasterStatus.failed?.includes("hostel rooms")) && !roomOptions.length) return { ...field, options: [{ value: "__hostel_room_types_error", label: "Unable to load room types. Please try again.", disabled: true }] };
      return {
        ...field,
        options: roomOptions.length ? roomOptions : [{ value: "__no_hostel_room_types", label: "No room types available", disabled: true }],
      };
    }
    return field;
  };
  const currentFields = current.fields.map(enhanceField);
  const visibleCurrentFields = visibleFieldsFor(currentFields, values);
  const currentHasOpenStaffDropdown = visibleCurrentFields.some((field) => field.type === "staffSearch" && field.open);
  const currentGridStyle = {
    ...(current.title === "Student Details" ? { gridTemplateColumns: "repeat(3, minmax(0, 1fr)) 88px", gridAutoFlow: "row" } : {}),
    ...(currentHasOpenStaffDropdown ? { overflow: "visible", position: "relative", zIndex: 30 } : {}),
  };
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
      const matchesYear = optionMatchesRecord(
        filters.year,
        academicYearFilterOptions,
        row.values?.year,
        row.academicYear,
        row.academicYearName,
        rowYearLabel,
      );
      const matchesGroup = optionMatchesRecord(
        filters.group,
        groupFilterOptions,
        row.groupId,
        row.values?.group,
        row.group,
        row.values?.groupName,
      );
      const matchesStatus = !filters.status || normalizeAdmissionStatus(row.status) === filters.status;
      return matchesSearch && matchesYear && matchesGroup && matchesStatus;
    });
  }, [academicYearFilterOptions, admissionYearDisplay, admissions, filters.group, filters.status, filters.year, groupFilterOptions, search]);
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
    const pdfPhotoSource = typeof File !== "undefined" && values.photo instanceof File ? values.photo : studentPhotoSource(values, photoPreviewUrl);
    const pdfPhotoDataUrl = await loadPdfImageDataUrl(pdfPhotoSource);
    const pdfPhotoDimensions = pdfPhotoDataUrl ? await readImageDimensions(pdfPhotoDataUrl) : null;
    const pdfPhotoBoxWidth = 112;
    const pdfPhotoLabelHeight = 14;
    const pdfFee = readPersistedFeeSummary(values.persistedFeeDetails, fee);
    document.setFontSize(16);
    document.text("Student Admission Form", 36, 38);
    document.setFontSize(10);
    document.setTextColor(88, 97, 84);
    document.text(`Admission No: ${admissionNo}`, 36, 56);
    let startY = 76;

    for (const section of previewSections) {
      if (section.custom === "fee") {
        const concessionAmount = Number(pdfFee.concessionAmount || 0);
        const feeRows = [
          ["Admission Fee", formatPdfCurrency(pdfFee.admissionFee)],
          ["Course Fee", formatPdfCurrency(pdfFee.courseFee)],
          ["Scholarship / Concession", concessionAmount > 0 ? `-${formatPdfCurrency(concessionAmount)}` : formatPdfCurrency(0)],
          ["Selected Optional Fees", formatPdfCurrency(pdfFee.optionalFees)],
          ["Total Payable", formatPdfCurrency(pdfFee.totalPayable)],
          ["Amount Paid", formatPdfCurrency(pdfFee.amountPaid)],
          ["Remaining Balance", formatPdfCurrency(pdfFee.remainingBalance)],
          ["Payment Plan", paymentPlanLabel(pdfFee.paymentPlan) || "-"],
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
        continue;
      }

      const isStudentDetailsSection = section.title === "Student Details";
      const fields = visibleFieldsFor(section.previewFields ?? section.fields, values)
        .filter((field) => !(isStudentDetailsSection && field.type === "file" && field.name === "photo"));
      const body = fields.map((field) => [
        field.label,
        cleanExportValue(formatPreviewValue(field, previewFieldValue(field, values))),
      ]);
      const isAdmissionSection = section.title === "Admission";
      const tableStartY = startY;
      autoTable(document, {
        startY,
        head: [[section.title, "Details"]],
        body,
        styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak", textColor: [28, 36, 22] },
        headStyles: { fillColor: [111, 132, 0], textColor: [255, 255, 255] },
        columnStyles: { 0: { cellWidth: 150, fontStyle: "bold" } },
        margin: isAdmissionSection && pdfPhotoDataUrl ? { left: 36, right: 164 } : { left: 36, right: 36 },
      });
      if (isAdmissionSection && pdfPhotoDataUrl && pdfPhotoDimensions) {
        const tableHeight = Math.max(0, document.lastAutoTable.finalY - tableStartY);
        const boxHeight = Math.max(118, Math.min(152, tableHeight - pdfPhotoLabelHeight));
        const photoDataUrl = await coverImageDataUrl(pdfPhotoDataUrl, pdfPhotoBoxWidth / boxHeight);
        const x = document.internal.pageSize.getWidth() - 36 - pdfPhotoBoxWidth;
        const y = tableStartY;
        document.setDrawColor(210, 214, 194);
        document.setLineWidth(0.6);
        document.rect(x, y, pdfPhotoBoxWidth, boxHeight);
        document.addImage(photoDataUrl, undefined, x + 1, y + 1, pdfPhotoBoxWidth - 2, boxHeight - 2);
        document.setFontSize(8);
        document.setTextColor(0, 0, 0);
        document.text("Student Photo", x + (pdfPhotoBoxWidth / 2), y + boxHeight + 10, { align: "center" });
      }
      startY = document.lastAutoTable.finalY + 14;
      if (startY > 720) {
        document.addPage();
        startY = 40;
      }
    }

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
    let cancelled = false;
    const loadAllocationMasterData = async () => {
      setAllocationMasterStatus({ loading: true, error: "", failed: [] });
      const [
        routesResult,
        pickupPointsResult,
        vehiclesResult,
        vehicleAssignmentsResult,
        hostelBlocksResult,
        hostelRoomTypesResult,
        hostelRoomsResult,
        hostelFeesResult,
      ] = await Promise.allSettled([
        apiClient.get(`${apiEndpoints.transport.routes}?PageNumber=1&PageSize=1000`),
        apiClient.get(`${apiEndpoints.transport.pickupPoints}?PageNumber=1&PageSize=1000`),
        apiClient.get(`${apiEndpoints.transport.vehicles}?PageNumber=1&PageSize=1000`),
        apiClient.get(`${apiEndpoints.transport.vehicleAssignments}?PageNumber=1&PageSize=1000`),
        hostelApi.getHostelBlocks(),
        hostelApi.getRoomTypes(),
        hostelApi.getRooms(),
        apiClient.get("/api/v1/hostel/fees"),
      ]);
      if (cancelled) return;
      const nextData = {
        routes: routesResult.status === "fulfilled"
          ? getCollection(routesResult.value.data).map(normalizeTransportRouteOption).filter(Boolean)
          : [],
        pickupPoints: pickupPointsResult.status === "fulfilled"
          ? getCollection(pickupPointsResult.value.data).map(normalizeTransportPickupOption).filter(Boolean)
          : [],
        vehicles: vehiclesResult.status === "fulfilled"
          ? getCollection(vehiclesResult.value.data).map(normalizeTransportVehicleOption).filter(Boolean)
          : [],
        vehicleAssignments: vehicleAssignmentsResult.status === "fulfilled"
          ? getCollection(vehicleAssignmentsResult.value.data).map(normalizeTransportVehicleAssignmentOption).filter(Boolean)
          : [],
        hostelBlocks: hostelBlocksResult.status === "fulfilled"
          ? getCollection(hostelBlocksResult.value.data).map(normalizeHostelBlockOption).filter(Boolean)
          : [],
        hostelRoomTypes: hostelRoomTypesResult.status === "fulfilled"
          ? getCollection(hostelRoomTypesResult.value.data).map(normalizeHostelRoomTypeOption).filter(Boolean)
          : [],
        hostelRooms: hostelRoomsResult.status === "fulfilled"
          ? getCollection(hostelRoomsResult.value.data).map(normalizeHostelRoomOption).filter(Boolean)
          : [],
        hostelFees: hostelFeesResult.status === "fulfilled"
          ? getCollection(hostelFeesResult.value.data).map(normalizeHostelFeeConfig).filter(Boolean)
          : [],
      };
      setAllocationMasterData(nextData);
      const failed = [
        routesResult.status === "rejected" ? "routes" : "",
        pickupPointsResult.status === "rejected" ? "pickup points" : "",
        vehiclesResult.status === "rejected" ? "vehicles" : "",
        vehicleAssignmentsResult.status === "rejected" ? "vehicle assignments" : "",
        hostelBlocksResult.status === "rejected" ? "hostel blocks" : "",
        hostelRoomTypesResult.status === "rejected" ? "hostel room types" : "",
        hostelRoomsResult.status === "rejected" ? "hostel rooms" : "",
        hostelFeesResult.status === "rejected" ? "hostel fees" : "",
      ].filter(Boolean);
      setAllocationMasterStatus({
        loading: false,
        error: failed.length ? `Unable to load ${failed.join(", ")}.` : "",
        failed,
      });
      if (import.meta.env.DEV) {
        console.log("Admission allocation master data loaded:", {
          routes: nextData.routes.length,
          pickupPoints: nextData.pickupPoints.length,
          vehicles: nextData.vehicles.length,
          vehicleAssignments: nextData.vehicleAssignments.length,
          hostelBlocks: nextData.hostelBlocks.length,
          hostelRoomTypes: nextData.hostelRoomTypes.length,
          hostelRooms: nextData.hostelRooms.length,
          hostelFees: nextData.hostelFees.length,
          failed,
        });
      }
    };
    loadAllocationMasterData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (viewMode !== "form" || editingAdmissionId || values.admissionDate) return;
    setValues((current) => (current.admissionDate ? current : { ...current, admissionDate: todayISO() }));
  }, [editingAdmissionId, values.admissionDate, viewMode]);

  useEffect(() => {
    if (viewMode !== "form") return;
    if (
      !allocationMasterData.routes.length
      && !allocationMasterData.pickupPoints.length
      && !allocationMasterData.hostelBlocks.length
      && !allocationMasterData.hostelRooms.length
      && !allocationMasterData.hostelFees.length
    ) return;
    setValues((current) => {
      let changed = false;
      const next = { ...current };
      const matchText = (value, ...candidates) => {
        const target = String(value || "").trim().toLowerCase();
        return Boolean(target) && candidates.some((candidate) => String(candidate || "").trim().toLowerCase() === target);
      };

      const selectedRoute = allocationMasterData.routes.find((route) => matchText(next.busRoute, route.value, route.routeCode, route.routeName, route.label));
      if (selectedRoute) {
        if (next.busRoute !== selectedRoute.value) {
          next.busRoute = selectedRoute.value;
          changed = true;
        }
        if (!next.busRouteName && selectedRoute.routeName) {
          next.busRouteName = selectedRoute.routeName;
          changed = true;
        }
        const routeBusTypes = routeBusTypesByRoute.get(String(selectedRoute.value));
        if (!next.busType && routeBusTypes?.size === 1) {
          next.busType = Array.from(routeBusTypes)[0];
          changed = true;
        } else if (next.busType && routeBusTypes?.size && !routeBusTypes.has(next.busType)) {
          next.busRoute = "";
          next.busRouteName = "";
          next.pickupPoint = "";
          next.pickupPointName = "";
          next.transportMonthlyFee = "";
          changed = true;
        }
      }
      const selectedPickup = allocationMasterData.pickupPoints.find((point) => (
        (!selectedRoute || !point.routeId || String(point.routeId) === String(selectedRoute.value))
        && matchText(next.pickupPoint, point.value, point.label)
      ));
      if (selectedPickup) {
        if (next.pickupPoint !== selectedPickup.value) {
          next.pickupPoint = selectedPickup.value;
          changed = true;
        }
        if (!next.pickupPointName && selectedPickup.label) {
          next.pickupPointName = selectedPickup.label;
          changed = true;
        }
        if (!next.transportMonthlyFee && selectedPickup.monthlyFee) {
          next.transportMonthlyFee = selectedPickup.monthlyFee;
          changed = true;
        }
      }

      const selectedBlock = allocationMasterData.hostelBlocks.find((block) => matchText(next.hostelBlock, block.value, block.code, block.name, block.hostelId, block.label));
      if (selectedBlock) {
        if (next.hostelBlock !== selectedBlock.value) {
          next.hostelBlock = selectedBlock.value;
          changed = true;
        }
        if (!next.hostelBlockName && selectedBlock.name) {
          next.hostelBlockName = selectedBlock.name;
          changed = true;
        }
      }
      const selectedRoom = allocationMasterData.hostelRooms.find((room) => (
        (!selectedBlock || String(room.blockValue || "") === String(selectedBlock.value) || String(room.hostelId || "") === String(selectedBlock.hostelId || ""))
        && matchText(next.hostelRoom, room.roomTypeId, room.roomTypeName, room.value, room.roomNo, room.roomId, room.label)
      ));
      const selectedRoomType = allocationMasterData.hostelRoomTypes.find((roomType) => (
        matchText(next.hostelRoom, roomType.value, roomType.roomTypeId, roomType.name, roomType.label)
        || (selectedRoom?.roomTypeId && String(roomType.roomTypeId || roomType.value) === String(selectedRoom.roomTypeId))
      ));
      if (selectedRoom || selectedRoomType) {
        const nextRoomTypeId = selectedRoomType?.roomTypeId || selectedRoom?.roomTypeId || selectedRoomType?.value || next.hostelRoom;
        const nextRoomTypeName = selectedRoomType?.name || selectedRoom?.roomTypeName || selectedRoom?.label || "";
        if (next.hostelRoom !== nextRoomTypeId) {
          next.hostelRoom = nextRoomTypeId;
          changed = true;
        }
        if (next.hostelRoomName !== nextRoomTypeName) {
          next.hostelRoomName = nextRoomTypeName;
          changed = true;
        }
        if (next.hostelRoomTypeId !== nextRoomTypeId) {
          next.hostelRoomTypeId = nextRoomTypeId;
          changed = true;
        }
        const hostelId = selectedRoom?.hostelId || selectedBlock?.hostelId || next.hostelBlock;
        const selectedHostelFee = allocationMasterData.hostelFees.find((item) => (
          item.status === "Active"
          && String(item.hostelId) === String(hostelId || "")
          && String(item.roomTypeId) === String(nextRoomTypeId || "")
        ));
        const nextFeeFields = selectedHostelFee
          ? {
            hostelFeeConfigId: selectedHostelFee.feeConfigId ? String(selectedHostelFee.feeConfigId) : "",
            hostelFeeAmount: String(selectedHostelFee.hostelFeeAmount ?? ""),
            hostelSecurityDeposit: String(selectedHostelFee.securityDeposit ?? ""),
            hostelFeeTotal: String(selectedHostelFee.totalFee || (Number(selectedHostelFee.hostelFeeAmount || 0) + Number(selectedHostelFee.securityDeposit || 0))),
            hostelFeeFrequency: selectedHostelFee.feeFrequency || "Monthly",
          }
          : {
            hostelFeeConfigId: "",
            hostelFeeAmount: "",
            hostelSecurityDeposit: "",
            hostelFeeTotal: "",
            hostelFeeFrequency: "",
          };
        Object.entries(nextFeeFields).forEach(([key, value]) => {
          if (next[key] !== value) {
            next[key] = value;
            changed = true;
          }
        });
      }
      return changed ? next : current;
    });
  }, [allocationMasterData, routeBusTypesByRoute, viewMode]);

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

  useEffect(() => {
    if (!isFeeStep || scholarships.length) return undefined;
    const requestId = scholarshipRequestRef.current + 1;
    scholarshipRequestRef.current = requestId;
    apiClient.get(apiEndpoints.fee.scholarships)
      .then((response) => {
        if (scholarshipRequestRef.current !== requestId) return;
        setScholarships(getCollection(response.data).map(normalizeScholarship).filter(Boolean));
      })
      .catch((err) => {
        if (scholarshipRequestRef.current === requestId) {
          console.error("Unable to load admission scholarships", err);
        }
      });
    return undefined;
  }, [isFeeStep, scholarships.length]);

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
      const [yearsResult, levelsResult, groupsResult, bloodGroupsResult] = await Promise.allSettled([
        apiClient.get(apiEndpoints.academicYears.getAll),
        apiClient.get(apiEndpoints.boards.getAcademicLevels, selectedBoardForLevels ? { params: { boardId: selectedBoardForLevels } } : undefined),
        fetchGroups(),
        apiClient.get(apiEndpoints.admissions.bloodGroups),
      ]);

      if (ignore) return;
      if (groupsResult.status === "rejected") console.error("Unable to load admission groups", groupsResult.reason);
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
            .map(normalizeGroupOption)
            .filter((item) => item?.value)
          : (current.groups || []),
        sections: current.sections || [],
        bloodGroups: loadedBloodGroups.length ? loadedBloodGroups : DEFAULT_BLOOD_GROUP_OPTIONS,
      }));
      setMasterStatus((current) => ({
        ...current,
        groupsLoading: false,
        groupsError: groupsResult.status === "rejected" ? "Unable to load groups. Please try again." : "",
        sectionsError: "",
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
    if (!selectedCampusValue && !selectedContextBoardValue && !selectedContextYearValue) return;
    setValues((current) => {
      const nextCampus = selectedCampusValue ? String(selectedCampusValue) : current.campus || "";
      const nextBoard = selectedContextBoardValue ? String(selectedContextBoardValue) : current.board || "";
      const nextYear = selectedContextYearValue ? String(selectedContextYearValue) : current.year || "";
      const campusChanged = String(current.campus || "") !== nextCampus;
      const boardChanged = String(current.board || "") !== nextBoard;
      const yearChanged = String(current.year || "") !== nextYear;
      if (!campusChanged && !boardChanged && !yearChanged) return current;
      return {
        ...current,
        campus: nextCampus,
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
  }, [editingAdmissionId, selectedCampusValue, selectedContextBoardValue, selectedContextYearValue, viewMode]);

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
      const programValue = lookupValue(programOptions, current.program, current.programName);
      const programName = lookupLabel(programOptions, current.program, current.programName);
      const levelName = lookupLabel(masterOptions.levels, current.level, current.levelName);
      const next = { ...current };
      let changed = false;
      if (groupName && groupName !== current.groupName) {
        next.groupName = groupName;
        changed = true;
      }
      if (programValue && programValue !== current.program) {
        next.program = programValue;
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
          .map(normalizeGroupOption)
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

        const detailResult = await Promise.resolve(apiClient.get(apiEndpoints.fee.getStructureById(matching.id)))
          .then((value) => ({ status: "fulfilled", value }))
          .catch((reason) => ({ status: "rejected", reason }));
        if (ignore) return;
        const detail = detailResult.status === "fulfilled" ? getObject(detailResult.value.data) : matching.raw;
        const itemSource = [
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
    if (!String(next.campus ?? "").trim() && selectedCampusValue) {
      next.campus = String(selectedCampusValue);
    }
    if (!String(next.board ?? "").trim() && selectedContextBoardValue) {
      next.board = String(selectedContextBoardValue);
    }
    if (!String(next.year ?? "").trim() && selectedContextYearValue) {
      next.year = String(selectedContextYearValue);
    }
    return next;
  }, [selectedCampusValue, selectedContextBoardValue, selectedContextYearValue]);

  const setValue = (name, val) => {
    const field = fieldByName[name] || {};
    if (isPlaceholderOption(val)) return;
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
    if (name === "admittedBy") {
      if (val?.kind === "select" && val.option) {
        setValues((v) => ({
          ...v,
          admittedBySearch: val.option.label,
          admittedByEmployeeId: val.option.employeeId || "",
          admittedByEmployeeName: val.option.fullName || "",
          admittedByStaffId: val.option.id ? String(val.option.id) : "",
        }));
        setAdmittedByDropdownOpen(false);
        setErrors((e) => ({ ...e, admittedBy: undefined, admittedByEmployeeId: undefined, admittedByEmployeeName: undefined }));
        return;
      }
      const searchValue = sanitizeValue(field, val?.value ?? "");
      setValues((v) => ({
        ...v,
        admittedBySearch: searchValue,
        admittedByEmployeeId: "",
        admittedByEmployeeName: "",
        admittedByStaffId: "",
      }));
      setAdmittedByDropdownOpen(true);
      if (!admittedByStaffLoaded && !admittedByLookupLoading) loadAdmittedByStaffOptions();
      setErrors((e) => ({ ...e, admittedBy: undefined, admittedByEmployeeId: undefined, admittedByEmployeeName: undefined }));
      return;
    }
    if (name === "admittedByEmployeeId") {
      setValues((v) => ({
        ...v,
        admittedByEmployeeId: sanitizeValue(field, val),
        admittedByEmployeeName: "",
        admittedByStaffId: "",
      }));
      setErrors((e) => ({ ...e, admittedByEmployeeId: undefined, admittedByEmployeeName: undefined }));
      return;
    }
    if (name === "studentType") {
      setValues((v) => ({
        ...v,
        studentType: val,
        transportRequired: "",
        busType: "",
        busRoute: "",
        busRouteName: "",
        pickupPoint: "",
        pickupPointName: "",
        transportMonthlyFee: "",
        hostelBlock: "",
        hostelBlockName: "",
        hostelRoom: "",
        hostelRoomName: "",
        hostelRoomTypeId: "",
        hostelFeeConfigId: "",
        hostelFeeAmount: "",
        hostelSecurityDeposit: "",
        hostelFeeTotal: "",
        hostelFeeFrequency: "",
      }));
      setErrors((e) => ({
        ...e,
        studentType: undefined,
        transportRequired: undefined,
        busType: undefined,
        busRoute: undefined,
        pickupPoint: undefined,
        hostelBlock: undefined,
        hostelRoom: undefined,
      }));
      return;
    }
    if (name === "transportRequired") {
      setValues((v) => ({
        ...v,
        transportRequired: val,
        ...(val === "Yes" ? {} : { busType: "", busRoute: "", busRouteName: "", pickupPoint: "", pickupPointName: "", transportMonthlyFee: "" }),
      }));
      setErrors((e) => ({ ...e, transportRequired: undefined, busType: undefined, busRoute: undefined, pickupPoint: undefined }));
      return;
    }
    if (name === "busType") {
      setValues((v) => {
        const routeBusTypes = routeBusTypesByRoute.get(String(v.busRoute || ""));
        const keepCurrentRoute = v.busRoute && routeBusTypes?.has(val);
        return {
          ...v,
          busType: val,
          ...(keepCurrentRoute
            ? { pickupPoint: "", pickupPointName: "", transportMonthlyFee: "" }
            : { busRoute: "", busRouteName: "", pickupPoint: "", pickupPointName: "", transportMonthlyFee: "" }),
        };
      });
      setErrors((e) => ({ ...e, busType: undefined, busRoute: undefined, pickupPoint: undefined }));
      return;
    }
    if (name === "busRoute") {
      const route = allocationMasterData.routes.find((item) => String(item.value) === String(val));
      setValues((v) => ({ ...v, busRoute: val, busRouteName: route?.routeName || "", pickupPoint: "", pickupPointName: "", transportMonthlyFee: "" }));
      setErrors((e) => ({ ...e, busRoute: undefined, pickupPoint: undefined }));
      return;
    }
    if (name === "pickupPoint") {
      const hasRouteLinkedPickupPoints = allocationMasterData.pickupPoints.some((item) => item.routeId);
      const pickup = allocationMasterData.pickupPoints.find((item) => (
        String(item.value) === String(val)
        && (!hasRouteLinkedPickupPoints || String(item.routeId || "") === String(values.busRoute || ""))
      ));
      setValues((v) => ({
        ...v,
        pickupPoint: val,
        pickupPointName: pickup?.label || "",
        transportMonthlyFee: pickup?.monthlyFee || "",
      }));
      setErrors((e) => ({ ...e, pickupPoint: undefined }));
      return;
    }
    if (name === "hostelBlock") {
      const block = allocationMasterData.hostelBlocks.find((item) => String(item.value) === String(val));
      setValues((v) => ({
        ...v,
        hostelBlock: val,
        hostelBlockName: block?.name || "",
        hostelRoom: "",
        hostelRoomName: "",
        hostelRoomTypeId: "",
        hostelFeeConfigId: "",
        hostelFeeAmount: "",
        hostelSecurityDeposit: "",
        hostelFeeTotal: "",
        hostelFeeFrequency: "",
      }));
      setErrors((e) => ({ ...e, hostelBlock: undefined, hostelRoom: undefined }));
      return;
    }
    if (name === "hostelRoom") {
      const { room, roomType, config } = hostelFeeForRoom(values.hostelBlock, val);
      const roomTypeName = roomType?.name || room?.roomTypeName || "";
      setValues((v) => ({
        ...v,
        hostelRoom: val,
        hostelRoomName: roomTypeName,
        hostelRoomTypeId: roomType?.roomTypeId || room?.roomTypeId || val,
        hostelFeeConfigId: config?.feeConfigId ? String(config.feeConfigId) : "",
        hostelFeeAmount: config ? String(config.hostelFeeAmount ?? "") : "",
        hostelSecurityDeposit: config ? String(config.securityDeposit ?? "") : "",
        hostelFeeTotal: config ? String(config.totalFee || (Number(config.hostelFeeAmount || 0) + Number(config.securityDeposit || 0))) : "",
        hostelFeeFrequency: config?.feeFrequency || "",
      }));
      setErrors((e) => ({ ...e, hostelRoom: undefined }));
      return;
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
    const formValuesWithDefaults = applyNewAdmissionAcademicDefaults(formValues);
    setValues(admissionId ? formValuesWithDefaults : newAdmissionValues(formValuesWithDefaults));
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
      const persistedSelection = getNestedRows(
        detail,
        "selectedFeeStructureComponentIds",
        "SelectedFeeStructureComponentIds",
      ).map(String);

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
          formValues = {
            ...hydratePersistedFeeState(formValues, feeDetailsResponse.data),
            persistedFeeDetails: getObject(feeDetailsResponse.data),
          };
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
        selection: persistedSelection.length ? persistedSelection : null,
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

    if (Number(feeValues.scholarshipId)) {
      await apiClient.post(apiEndpoints.fee.concession, {
        studentId,
        studentFeeId: Number(studentFeeId),
        scholarshipId: Number(feeValues.scholarshipId),
        scholarshipName: feeValues.concessionName || null,
        discountType: feeValues.concessionType || null,
        discountValue: Number(feeValues.concessionValue || 0),
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
      setToast("Fee structure is being prepared. Please wait.");
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
      if (isUpdate) formData.delete("CampusId");
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
              <Search size={16} />
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
                  Array.from({ length: 6 }, (_, index) => <SkeletonRow key={index} columns={9} />)
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
            <div
              className={`cms-form-grid ${current.title === "Address" ? "cms-admission-address-grid" : "cols-3"} ${current.title === "Admission" ? "cms-admission-details-grid" : ""} ${current.title === "Student Details" ? "cms-admission-student-grid" : ""}`}
              style={Object.keys(currentGridStyle).length ? currentGridStyle : undefined}
            >
              {visibleCurrentFields.map((f) => (
                <AdmissionField
                  key={f.name}
                  field={{ ...f, required: f.required || (typeof f.requiredWhen === "function" && f.requiredWhen(values)) }}
                  value={values[f.name]}
                  error={errors[f.name]}
                  onChange={setValue}
                  onFileChange={setFileValue}
                  onFileRemove={removeFileValue}
                  inputRef={(element) => { fileInputRefs.current[f.name] = element; }}
                  previewUrl={f.name === "photo" ? studentPhotoSource(values, photoPreviewUrl) : ""}
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
