import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle,
  Copy,
  Eye,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Trash2,
  Users,
  WalletCards,
} from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import Search3DIcon from "@/components/common/Search3DIcon.jsx";
import { Modal, Toast } from "@/components/common/Ui.jsx";
import apiClient, { getApiErrorMessage } from "@/api/axios.js";
import { apiEndpoints, uniqueAcademicYearsByName } from "@/api/apiEndpoints.js";
import { useAcademicContext } from "@/context/AcademicContext.jsx";
import collegeLogo from "@/assets/pirnav-colleges-logo.png";
import {
  COLLEGE_NAME,
  PAYMENT_METHODS,
  PAYMENT_PLANS,
  deriveAccount,
  feeScheduleLabel,
  feeStatusTone,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  todayISO,
} from "@/data/feeManagementData.js";
import "./FeeManagementPage.css";

const TABS = ["Overview", "Fee Setup", "Student Fee Ledger"];
const FEE_SETUP_TABS = ["Fee Types", "Fee Structure", "Scholarships"];
const LEDGER_TABS = [
  { id: "Student Fee Ledger", label: "Fee Accounts" },
  { id: "Fee Collection", label: "Fee Collection" },
  { id: "Payment History", label: "Payment History" },
];
const FEE_TYPE_CATEGORIES = ["Admission", "Academic", "Examination", "Facility", "Activity", "Other"];
const PAGE_SIZE = 5;
const OVERVIEW_TABS = [
  { id: "overdue", label: "Overdue Fees", icon: AlertCircle },
  { id: "upcoming", label: "Upcoming Fee Schedules", icon: CalendarClock },
  { id: "recent", label: "Recent Payments", icon: ReceiptText },
];
const CHART_COLORS = ["var(--cms-primary)", "var(--cms-green)", "var(--cms-amber)"];

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

const textValue = (item, ...keys) => {
  const value = read(item, ...keys);
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return "";
  return String(value);
};

const numberValue = (item, ...keys) => {
  const value = read(item, ...keys);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const optionalNumberValue = (item, ...keys) => {
  const value = read(item, ...keys);
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeKey = (value) => String(value || "").trim().toLowerCase();

const normalizeBackendPaymentPlan = (...sources) => {
  const normalizeSource = (source, depth = 0) => {
    if (depth > 2 || source === undefined || source === null || source === "") return "";
    if (typeof source === "object") {
      const nested = read(
        source,
        "planName",
        "PlanName",
        "paymentPlanName",
        "PaymentPlanName",
        "name",
        "Name",
        "paymentPlan",
        "PaymentPlan",
        "plan",
        "Plan",
      );
      return nested === source ? "" : normalizeSource(nested, depth + 1);
    }
    const value = normalizeKey(source);
    if (value === "installment payment" || value === "installment" || value === "course fee schedule" || value === "schedule payment") {
      return "Installment Payment";
    }
    if (value === "full payment" || value === "full" || value === "full course payment") {
      return "Full Payment";
    }
    return "";
  };

  for (const source of sources) {
    const plan = normalizeSource(source);
    if (plan) return plan;
  }
  return "";
};

const optionLabel = (list, value) => list?.find((option) => String(option.value) === String(value))?.label || "";

const uniqueOptionsByValue = (items = []) => Array.from(items.reduce((lookup, item) => {
  if (item?.value !== undefined && item.value !== null && item.value !== "") lookup.set(String(item.value), item);
  return lookup;
}, new Map()).values());

const isRawIdDisplay = (value, id) => {
  const text = String(value ?? "").trim();
  if (!text) return true;
  return Boolean(id && text === String(id)) || /^\d+$/.test(text);
};

const displayNameFor = (name, id, options = [], fallback = "-") => {
  const label = String(name ?? "").trim();
  if (label && !isRawIdDisplay(label, id)) return label;
  const resolved = optionLabel(options, id);
  return resolved || fallback;
};

const compactKey = (value) => normalizeKey(value).replace(/[^a-z0-9]/g, "");

const valueTokens = (...values) => values
  .flatMap((value) => String(value ?? "").split(/[/,|()-]+/))
  .map(compactKey)
  .filter(Boolean);

const matchesAnyNormalized = (selectedValue, selectedLabel, ...itemValues) => {
  if (!selectedValue && !selectedLabel) return true;
  const selectedKeys = valueTokens(selectedValue, selectedLabel);
  if (!selectedKeys.length) return true;
  const itemKeys = valueTokens(...itemValues);
  if (!itemKeys.length) return true;
  return selectedKeys.some((selectedKey) => itemKeys.includes(selectedKey));
};

const isActiveStatus = (status) => {
  if (status === undefined || status === null || status === "") return true;
  if (typeof status === "boolean") return status;
  const normalized = normalizeKey(status);
  return !["inactive", "false", "disabled", "deleted", "deactivated"].includes(normalized);
};

const structureItemIdentity = (item) => textValue(item, "feeStructureComponentId", "FeeStructureComponentId", "feeStructureItemId", "FeeStructureItemId", "structureItemId", "StructureItemId", "itemId", "ItemId");

const isStructureItemPayload = (item) => {
  if (!item) return false;
  if (structureItemIdentity(item)) return true;
  const hasStructureId = read(item, "feeStructureId", "FeeStructureId") !== undefined;
  const hasFeeType = read(item, "feeTypeId", "FeeTypeId", "typeId", "TypeId", "feeType", "FeeType") !== undefined;
  const hasAmount = read(item, "amount", "Amount", "feeAmount", "FeeAmount", "originalAmount", "OriginalAmount", "payableAmount", "PayableAmount") !== undefined;
  return hasStructureId && hasFeeType && hasAmount;
};

const configuredFeeItemKey = (item) => {
  const feeTypeId = textValue(item, "feeTypeId", "FeeTypeId", "typeId", "TypeId");
  if (feeTypeId) return `fee-type:${feeTypeId}`;
  const feeType = read(item, "feeType", "FeeType", "type", "Type");
  const nestedFeeTypeId = textValue(feeType, "feeTypeId", "FeeTypeId", "id", "Id", "typeId", "TypeId");
  if (nestedFeeTypeId) return `fee-type:${nestedFeeTypeId}`;
  const structureItemId = structureItemIdentity(item) || textValue(item, "structureItemId", "StructureItemId");
  if (structureItemId) return `structure-item:${structureItemId}`;
  return `fee-name:${normalizeKey(textValue(item, "type", "Type", "name", "Name", "feeTypeName", "FeeTypeName"))}`;
};

const mergeFeeItem = (current, incoming) => {
  if (!current) return incoming;
  const currentHasStructureItem = Boolean(current.structureItemId);
  const incomingHasStructureItem = Boolean(incoming.structureItemId);
  const base = incomingHasStructureItem && !currentHasStructureItem ? incoming : current;
  const other = base === incoming ? current : incoming;
  return {
    ...base,
    structureItemId: base.structureItemId || other.structureItemId,
    feeTypeId: base.feeTypeId || other.feeTypeId,
    type: base.type && base.type !== "Fee Type" ? base.type : other.type,
    originalAmount: Number(base.originalAmount || 0) > 0 ? base.originalAmount : other.originalAmount,
    payableAmount: Number(base.payableAmount || 0) > 0 ? base.payableAmount : other.payableAmount,
    selected: base.selected,
    required: Boolean(base.required || other.required),
    structureId: base.structureId || other.structureId,
  };
};

const dedupeConfiguredFeeItems = (items = []) => Array.from(items.reduce((lookup, item) => {
  const key = configuredFeeItemKey(item);
  lookup.set(key, mergeFeeItem(lookup.get(key), item));
  return lookup;
}, new Map()).values());

const stripFeeItemCollections = (item = {}) => {
  const {
    feeItems,
    FeeItems,
    items,
    Items,
    feeStructureItems,
    FeeStructureItems,
    components,
    Components,
    feeComponents,
    FeeComponents,
    ...rest
  } = item;
  return rest;
};

const cleanDateValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const datePart = raw.slice(0, 10);
  if (/^0*1-0?1-0?1/.test(datePart) || datePart === "0001-01-01") return "";
  const date = new Date(datePart);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1) return "";
  return raw;
};

const formatFeeDate = (value) => {
  const cleaned = cleanDateValue(value);
  return cleaned ? formatDate(cleaned) : "-";
};

const matchesContext = (selectedId, selectedLabel, itemId, itemLabel) => {
  if (!selectedId && !selectedLabel) return true;
  if (!itemId && !itemLabel) return true;
  return String(itemId || "") === String(selectedId || "")
    || Boolean(selectedLabel && itemLabel && normalizeKey(itemLabel) === normalizeKey(selectedLabel));
};

const admissionFullName = (item) => (
  textValue(item, "studentName", "StudentName", "name", "Name", "fullName", "FullName")
  || [textValue(item, "firstName", "FirstName"), textValue(item, "lastName", "LastName")].filter(Boolean).join(" ")
);

const isApprovedAdmission = (item) => {
  const status = normalizeKey(textValue(item, "status", "Status", "admissionStatus", "AdmissionStatus"));
  return status === "approved" || status === "admitted" || read(item, "isApproved", "IsApproved") === true;
};

const accountStatusFor = ({ payable = 0, paid = 0, balance = 0, dueDate = "", status = "" }) => {
  const backendStatus = textValue({ status }, "status");
  if (backendStatus && normalizeKey(backendStatus) !== "pending") return backendStatus;
  if (balance <= 0 && payable > 0) return "Paid";
  if (dueDate && new Date(dueDate) < new Date(todayISO()) && balance > 0) return "Overdue";
  if (paid > 0 && balance > 0) return "Partial";
  if (balance > 0) return backendStatus || "Due";
  if (payable <= 0 && balance <= 0) return "Not Assigned";
  return backendStatus || "Due";
};

const hasUsefulChartData = (rows = []) => rows.some((row) => (
  normalizeKey(row.group) && (Number(row.expected || 0) > 0 || Number(row.collected || 0) > 0 || Number(row.outstanding || 0) > 0)
));

const accountHasUsefulTotals = (account) => (
  Number(account?.totalPayable || 0) > 0
  || Number(account?.totalPaid || 0) > 0
  || Number(account?.balance || 0) > 0
);

const accountOverviewTotals = (accounts = []) => {
  const totalExpected = accounts.reduce((sum, account) => sum + Number(account.totalPayable || 0), 0);
  const totalCollected = accounts.reduce((sum, account) => sum + Number(account.totalPaid || 0), 0);
  const pendingStudents = accounts.filter((account) => Number(account.balance || 0) > 0).length;
  const overdueStudents = accounts.filter((account) => (
    Number(account.balance || 0) > 0
    && account.nextDueDate
    && new Date(account.nextDueDate) < new Date(todayISO())
  )).length;
  return {
    totalStudents: accounts.length,
    totalCollected,
    pendingStudents,
    overdueStudents,
    collectedPercent: totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0,
  };
};

const accountGroupWiseTotals = (accounts = []) => {
  const grouped = new Map();
  accounts.forEach((account) => {
    const group = account.group || account.program || "-";
    const row = grouped.get(group) || { group, expected: 0, collected: 0, outstanding: 0 };
    row.expected += Number(account.totalPayable || 0);
    row.collected += Number(account.totalPaid || 0);
    row.outstanding += Number(account.balance || 0);
    grouped.set(group, row);
  });
  return Array.from(grouped.values());
};

const hasAccountIdentityGaps = (rows = []) => rows.some((item) => {
  const student = read(item, "student", "Student");
  const admission = read(item, "admission", "Admission", "studentAdmission", "StudentAdmission");
  return !read(item, "studentId", "StudentId") && !read(student, "studentId", "StudentId", "id", "Id")
    || !textValue(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
      && !textValue(student, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
      && !textValue(admission, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
    || !textValue(item, "studentName", "StudentName", "name", "Name", "fullName", "FullName")
      && !textValue(student, "studentName", "StudentName", "name", "Name", "fullName", "FullName");
});

const findMatchingAdmission = (admissions, account, student) => {
  const admissionNo = normalizeKey(textValue(account, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
    || textValue(student, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber"));
  if (admissionNo) {
    const byAdmissionNo = admissions.find((item) => normalizeKey(textValue(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")) === admissionNo);
    if (byAdmissionNo) return byAdmissionNo;
  }
  const studentName = normalizeKey(textValue(account, "studentName", "StudentName") || textValue(student, "studentName", "StudentName", "name", "Name"));
  return admissions.find((item) => isApprovedAdmission(item) && normalizeKey(admissionFullName(item)) === studentName) || null;
};

const feeDetailPayloadRows = (detail) => getCollection(read(detail, "breakdown", "Breakdown", "feeItems", "FeeItems", "items", "Items"));

const feeDetailScheduleRows = (detail) => getCollection(read(detail, "schedules", "Schedules", "installments", "Installments", "feeSchedules", "FeeSchedules"));

const feeDetailPaymentRows = (detail) => getCollection(read(detail, "paymentHistory", "PaymentHistory", "payments", "Payments", "transactions", "Transactions", "history", "History"));

const readStudentFeeId = (...items) => {
  for (const item of items) {
    const id = read(item, "studentFeeAssignmentId", "StudentFeeAssignmentId", "studentFeeId", "StudentFeeId", "feeAccountId", "FeeAccountId", "assignmentId", "AssignmentId");
    if (id !== undefined && id !== null && id !== "") return id;
  }
  return undefined;
};

const feePaymentRows = (item, detail) => {
  const sources = [
    feeDetailPaymentRows(detail),
    getCollection(read(item, "paymentHistory", "PaymentHistory", "payments", "Payments", "transactions", "Transactions")),
  ];
  return sources.find((rows) => rows.length) || [];
};

const toSelectOptions = (rows, idKeys, labelKeys) => rows
  .map((item) => {
    const value = read(item, ...idKeys);
    const label = read(item, ...labelKeys) ?? value;
    if (value === undefined || value === null || value === "") return null;
    return { value: String(value), label: String(label) };
  })
  .filter(Boolean);

const groupOption = (item) => {
  const board = read(item, "board", "Board");
  const academicYear = read(item, "academicYear", "AcademicYear", "year", "Year");
  const academicLevel = read(item, "academicLevel", "AcademicLevel", "level", "Level");
  const option = toSelectOptions([item], ["groupId", "GroupId", "id", "Id"], ["groupName", "GroupName", "name", "Name", "groupCode", "GroupCode"])[0];
  return option ? {
    ...option,
    code: textValue(item, "groupCode", "GroupCode", "code", "Code") || option.label,
    boardId: textValue(item, "boardId", "BoardId", "boardID") || textValue(board, "boardId", "BoardId", "id", "Id"),
    boardName: textValue(item, "boardName", "BoardName") || textValue(board, "boardName", "BoardName", "name", "Name"),
    academicYearId: textValue(item, "academicYearId", "AcademicYearId", "yearId", "YearId", "academicYearID") || textValue(academicYear, "academicYearId", "AcademicYearId", "yearId", "YearId", "id", "Id"),
    academicYearName: textValue(item, "academicYearName", "AcademicYearName", "yearName", "YearName") || textValue(academicYear, "academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name"),
    academicLevelId: textValue(item, "academicLevelId", "AcademicLevelId", "levelId", "LevelId") || textValue(academicLevel, "academicLevelId", "AcademicLevelId", "levelId", "LevelId", "id", "Id"),
    academicLevelName: textValue(item, "academicLevelName", "AcademicLevelName", "levelName", "LevelName") || textValue(academicLevel, "academicLevelName", "AcademicLevelName", "levelName", "LevelName", "name", "Name"),
  } : null;
};

const programOption = (item) => toSelectOptions(
  [item],
  ["programId", "ProgramId", "id", "Id"],
  ["programName", "ProgramName", "name", "Name", "programCode", "ProgramCode"],
)[0] || null;

const sectionOption = (item) => {
  const group = read(item, "group", "Group");
  const option = toSelectOptions([item], ["sectionId", "SectionId", "id", "Id"], ["sectionName", "SectionName", "section", "Section", "name", "Name"])[0];
  return option ? {
    ...option,
    groupId: textValue(item, "groupId", "GroupId") || textValue(group, "groupId", "GroupId", "id", "Id"),
    groupName: textValue(item, "groupName", "GroupName") || textValue(group, "groupName", "GroupName", "name", "Name"),
    academicYearId: textValue(item, "academicYearId", "AcademicYearId"),
    academicLevelId: textValue(item, "academicLevelId", "AcademicLevelId"),
  } : null;
};

const categoryForFeeType = (name = "") => {
  const normalized = String(name).toLowerCase();
  if (normalized.includes("admission")) return "Admission";
  if (normalized.includes("exam")) return "Examination";
  if (normalized.includes("transport") || normalized.includes("hostel") || normalized.includes("uniform") || normalized.includes("id card")) return "Facility";
  if (normalized.includes("activity") || normalized.includes("sports")) return "Activity";
  return "Academic";
};

const feeTypeCodeFor = (name = "") => {
  const normalized = String(name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return normalized.length >= 2 ? normalized : `FT${normalized}`.slice(0, 30);
};

const feeTypeOption = (item) => {
  const feeType = read(item, "feeType", "FeeType");
  const name = textValue(item, "feeTypeName", "FeeTypeName", "name", "Name", "type", "Type", "label", "Label")
    || textValue(feeType, "feeTypeName", "FeeTypeName", "name", "Name", "type", "Type", "label", "Label")
    || "Fee Type";
  const status = read(item, "isActive", "IsActive", "active", "Active", "status", "Status") ?? read(feeType, "isActive", "IsActive", "active", "Active", "status", "Status");
  return {
    id: String(read(item, "feeTypeId", "FeeTypeId", "typeId", "TypeId") ?? read(feeType, "feeTypeId", "FeeTypeId", "id", "Id", "typeId", "TypeId") ?? read(item, "id", "Id") ?? ""),
    name,
    code: textValue(item, "feeTypeCode", "FeeTypeCode", "code", "Code") || textValue(feeType, "feeTypeCode", "FeeTypeCode", "code", "Code") || feeTypeCodeFor(name),
    category: textValue(item, "category", "Category", "feeCategory", "FeeCategory") || textValue(feeType, "category", "Category", "feeCategory", "FeeCategory") || categoryForFeeType(name),
    status: isActiveStatus(status) ? "Active" : "Inactive",
  };
};

const feeTypeRowsFromMaster = (feeTypes) => {
  const source = feeTypes.filter((item) => item.status !== "Inactive");
  return source.map((item) => {
    return {
      id: String(item.id),
      feeTypeId: String(item.id).startsWith("custom-") ? "" : String(item.id),
      type: item.name,
      originalAmount: 0,
      payableAmount: 0,
      selected: true,
      required: false,
    };
  });
};

const feeItemsWithMasterRows = (feeTypes = [], configuredItems = []) => {
  const configured = dedupeConfiguredFeeItems(configuredItems);
  const configuredByFeeType = new Map(configured
    .filter((item) => item.feeTypeId || item.id)
    .map((item) => [String(item.feeTypeId || item.id), item]));
  const usedConfiguredKeys = new Set();
  const rows = feeTypeRowsFromMaster(feeTypes).map((masterItem) => {
    const key = String(masterItem.feeTypeId || masterItem.id);
    const configuredItem = configuredByFeeType.get(key);
    if (!configuredItem) return masterItem;
    usedConfiguredKeys.add(key);
    return {
      ...masterItem,
      ...configuredItem,
      id: configuredItem.id || masterItem.id,
      feeTypeId: configuredItem.feeTypeId || masterItem.feeTypeId,
      type: configuredItem.type || masterItem.type,
      structureId: configuredItem.structureId || masterItem.structureId,
    };
  });
  const configuredWithoutActiveMaster = configured.filter((item) => {
    const key = String(item.feeTypeId || item.id || "");
    return !key || !usedConfiguredKeys.has(key);
  });
  return dedupeConfiguredFeeItems([...rows, ...configuredWithoutActiveMaster]);
};

const hasBackendFeeTypeIds = (feeTypes) => feeTypes.some((item) => Number(item.id) > 0);

const pageItems = (items, page, pageSize = PAGE_SIZE) => items.slice((page - 1) * pageSize, page * pageSize);

const feeAccountKey = (account = {}) => {
  const studentFeeId = account.studentFeeId || account.studentFeeAssignmentId || account.assignmentId;
  if (studentFeeId) return `student-fee:${studentFeeId}`;
  if (account.studentId) return `student:${account.studentId}`;
  if (account.admissionNo && account.admissionNo !== "-") return `admission:${normalizeKey(account.admissionNo)}`;
  return "";
};

const admissionNumberParts = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/^(.*?)(\d+)\D*$/);
  return match ? { prefix: normalizeKey(match[1]), number: Number(match[2]) } : { prefix: normalizeKey(text), number: null };
};

const compareAdmissionNumbersDesc = (left, right) => {
  const a = admissionNumberParts(left?.admissionNo);
  const b = admissionNumberParts(right?.admissionNo);
  if (a.number !== null && b.number !== null && a.prefix === b.prefix && a.number !== b.number) {
    return b.number - a.number;
  }
  return 0;
};

const normalizeFeeAccountDataset = (accounts = []) => {
  const keyed = new Map();
  const ordered = [];
  accounts.forEach((account) => {
    const key = feeAccountKey(account);
    if (!key) {
      ordered.push(account);
      return;
    }
    if (!keyed.has(key)) ordered.push(account);
    keyed.set(key, { ...keyed.get(key), ...account });
  });
  return ordered
    .map((account) => {
      const key = feeAccountKey(account);
      return key ? keyed.get(key) : account;
    })
    .sort(compareAdmissionNumbersDesc);
};

const scholarshipValueLabel = (item) => (
  item.discountType === "Percentage" ? `${Number(item.discountValue || 0)}%` : formatCurrency(item.discountValue || 0)
);

const normalizeScholarshipRows = (rows) => rows.map((item, index) => {
  const id = read(item, "scholarshipId", "ScholarshipId", "id", "Id");
  const type = textValue(item, "discountType", "DiscountType", "type", "Type") || "Percentage";
  const status = read(item, "isActive", "IsActive", "active", "Active", "status", "Status");
  return {
    id: String(id ?? `SCH-${index + 1}`),
    name: textValue(item, "scholarshipName", "ScholarshipName", "name", "Name", "title", "Title") || "Scholarship",
    discountType: type === "%" ? "Percentage" : type,
    discountValue: numberValue(item, "discountValue", "DiscountValue", "value", "Value", "percentage", "Percentage", "amount", "Amount"),
    status: typeof status === "string" ? (status.toLowerCase() === "inactive" ? "Inactive" : "Active") : status === false ? "Inactive" : "Active",
  };
});

const normalizeFeeStructureRows = (rows, feeTypes = [], lookups = {}) => {
  const feeTypeById = new Map(feeTypes.map((feeType) => [String(feeType.id), feeType]));
  const grouped = new Map();
  rows.forEach((item, index) => {
    const itemGroup = read(item, "group", "Group");
    const itemProgram = read(item, "program", "Program");
    const itemAcademicYear = read(item, "academicYear", "AcademicYear", "year", "Year");
    const itemBoard = read(item, "board", "Board");
    const groupId = textValue(item, "groupId", "GroupId") || textValue(itemGroup, "groupId", "GroupId", "id", "Id");
    const groupName = textValue(item, "groupName", "GroupName", "courseName", "CourseName") || textValue(itemGroup, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode");
    const academicYearId = textValue(item, "academicYearId", "AcademicYearId") || textValue(itemAcademicYear, "academicYearId", "AcademicYearId", "id", "Id");
    const academicYearName = textValue(item, "academicYearName", "AcademicYearName") || textValue(itemAcademicYear, "academicYearName", "AcademicYearName", "name", "Name");
    const programId = textValue(item, "programId", "ProgramId") || textValue(itemProgram, "programId", "ProgramId", "id", "Id");
    const programName = textValue(item, "programName", "ProgramName") || textValue(itemProgram, "programName", "ProgramName", "name", "Name", "programCode", "ProgramCode");
    const group = displayNameFor(groupName, groupId, lookups.groups);
    const academicYear = displayNameFor(academicYearName, academicYearId, lookups.years);
    const program = displayNameFor(programName, programId, lookups.programs, programId ? "-" : "Regular");
    const structureId = String(read(item, "feeStructureId", "FeeStructureId", "id", "Id") ?? `api-${index}`);
    const key = [academicYearId || academicYear, groupId || group, programId || program].join("|");
    const explicitTotal = optionalNumberValue(item, "totalFee", "TotalFee", "feeTotal", "FeeTotal", "totalAmount", "TotalAmount", "totalActiveFees", "TotalActiveFees", "activeFeeTotal", "ActiveFeeTotal");
    const existing = grouped.get(key);
    const row = existing || {
      id: structureId,
      boardId: textValue(item, "boardId", "BoardId") || textValue(itemBoard, "boardId", "BoardId", "id", "Id"),
      board: textValue(item, "boardName", "BoardName") || textValue(itemBoard, "boardName", "BoardName", "name", "Name") || textValue(item, "boardId", "BoardId"),
      academicYearId,
      academicYear,
      groupId,
      group,
      programId,
      program,
      status: textValue(item, "status", "Status") || "Active",
      totalFee: explicitTotal,
      feeItems: [],
    };
    if (row.totalFee === undefined && explicitTotal !== undefined) row.totalFee = explicitTotal;
    const nestedItems = getCollection(read(item, "feeItems", "FeeItems", "items", "Items", "feeStructureItems", "FeeStructureItems", "components", "Components", "feeComponents", "FeeComponents"));
    const hasTopLevelFeeItem = isStructureItemPayload(item);
    const sourceItems = nestedItems.length ? nestedItems : hasTopLevelFeeItem ? [item] : [];
    sourceItems.forEach((feeItem, feeIndex) => {
      if (!isStructureItemPayload(feeItem)) return;
      const feeType = feeTypeOption(feeItem);
      const masterFeeType = feeTypeById.get(String(feeType.id)) || null;
      const amount = numberValue(feeItem, "amount", "Amount", "feeAmount", "FeeAmount", "originalAmount", "OriginalAmount", "payableAmount", "PayableAmount", "totalAmount", "TotalAmount");
      const status = read(feeItem, "isActive", "IsActive", "active", "Active", "status", "Status");
      const structureItemId = structureItemIdentity(feeItem);
      const rule = textValue(feeItem, "rule", "Rule", "requirement", "Requirement");
      const mandatoryValue = read(feeItem, "isMandatory", "IsMandatory", "required", "Required", "mandatory", "Mandatory");
      const mandatoryText = String(mandatoryValue ?? "").trim().toLowerCase();
      row.feeItems.push({
        id: structureItemId || feeType.id || textValue(feeItem, "id", "Id") || `type-${index}-${feeIndex}`,
        feeTypeId: feeType.id,
        structureItemId,
        type: feeType.name === "Fee Type" && masterFeeType?.name ? masterFeeType.name : feeType.name,
        originalAmount: amount,
        payableAmount: amount,
        selected: isActiveStatus(status) && feeType.status !== "Inactive" && masterFeeType?.status !== "Inactive",
        required: ["mandatory", "required"].includes(normalizeKey(rule))
          || (typeof mandatoryValue === "string" ? ["true", "mandatory", "required", "yes", "1"].includes(mandatoryText) : Boolean(mandatoryValue)),
        structureId,
      });
    });
    grouped.set(key, row);
  });
  return Array.from(grouped.values()).map((row) => {
    const feeItems = dedupeConfiguredFeeItems(row.feeItems);
    return {
      ...row,
      feeItems,
      totalFee: feeItems
        .filter((feeItem) => feeItem.selected !== false)
        .reduce((sum, feeItem) => sum + Number(feeItem.originalAmount || feeItem.payableAmount || 0), 0),
    };
  });
};

const normalizeTransactionRows = (rows, account = {}) => rows.map((item, index) => {
  const student = read(item, "student", "Student");
  const admission = read(item, "admission", "Admission", "studentAdmission", "StudentAdmission");
  const group = read(item, "group", "Group");
  const section = read(item, "section", "Section");
  return {
    id: String(read(item, "feePaymentId", "FeePaymentId", "paymentId", "PaymentId", "id", "Id") ?? `${account.id || "payment"}-TXN-${index + 1}`),
    feePaymentId: read(item, "feePaymentId", "FeePaymentId", "paymentId", "PaymentId", "id", "Id"),
    studentId: read(item, "studentId", "StudentId") ?? read(student, "studentId", "StudentId", "id", "Id") ?? account.studentId,
    studentFeeId: read(item, "studentFeeId", "StudentFeeId", "studentFeeAssignmentId", "StudentFeeAssignmentId") ?? account.studentFeeId ?? account.studentFeeAssignmentId,
    receiptNo: textValue(item, "receiptNo", "ReceiptNo", "receiptNumber", "ReceiptNumber") || account.receiptNo || "-",
    studentName: textValue(item, "studentName", "StudentName", "name", "Name")
      || textValue(student, "studentName", "StudentName", "name", "Name", "fullName", "FullName")
      || admissionFullName(admission)
      || account.studentName
      || "Student",
    admissionNo: textValue(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
      || textValue(student, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
      || textValue(admission, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
      || account.admissionNo
      || "-",
    group: textValue(item, "groupName", "GroupName", "group", "Group", "programName", "ProgramName")
      || textValue(group, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode")
      || textValue(admission, "groupName", "GroupName")
      || account.group
      || "-",
    groupId: textValue(item, "groupId", "GroupId") || textValue(group, "groupId", "GroupId", "id", "Id") || textValue(admission, "groupId", "GroupId") || account.groupId,
    section: textValue(item, "sectionName", "SectionName", "section", "Section")
      || textValue(section, "sectionName", "SectionName", "name", "Name")
      || textValue(admission, "sectionName", "SectionName", "programName", "ProgramName")
      || account.section
      || "-",
    sectionId: textValue(item, "sectionId", "SectionId") || textValue(section, "sectionId", "SectionId", "id", "Id") || textValue(admission, "sectionId", "SectionId") || account.sectionId,
    academicYear: textValue(item, "academicYearName", "AcademicYearName", "academicYear", "AcademicYear") || textValue(admission, "academicYearName", "AcademicYearName") || account.academicYear,
    academicYearId: textValue(item, "academicYearId", "AcademicYearId") || textValue(admission, "academicYearId", "AcademicYearId") || account.academicYearId,
    type: textValue(item, "paymentType", "PaymentType", "feeTypeName", "FeeTypeName", "feeType", "FeeType", "type", "Type") || "Fee Payment",
    amount: numberValue(item, "amount", "Amount", "paidAmount", "PaidAmount", "paymentAmount", "PaymentAmount"),
    baseAmount: numberValue(item, "baseAmount", "BaseAmount", "amount", "Amount"),
    discount: numberValue(item, "discount", "Discount", "discountAmount", "DiscountAmount"),
    fine: numberValue(item, "fine", "Fine", "fineAmount", "FineAmount"),
    method: textValue(item, "paymentMethod", "PaymentMethod", "paymentMode", "PaymentMode", "method", "Method") || "-",
    reference: textValue(item, "transactionNumber", "TransactionNumber", "reference", "Reference", "transactionReference", "TransactionReference"),
    date: textValue(item, "paymentDate", "PaymentDate", "paidDate", "PaidDate", "date", "Date", "createdAt", "CreatedAt") || todayISO(),
    status: textValue(item, "status", "Status", "paymentStatus", "PaymentStatus") || "Paid",
    previousBalance: optionalNumberValue(item, "previousBalance", "PreviousBalance", "previousOutstanding", "PreviousOutstanding"),
    balance: optionalNumberValue(item, "balance", "Balance", "remainingBalance", "RemainingBalance", "outstandingBalance", "OutstandingBalance"),
  };
});

const paymentHistoryIdentity = (row = {}) => {
  const paymentId = row.feePaymentId || row.paymentId;
  if (paymentId) return `payment-${paymentId}`;
  if (row.receiptNo && row.receiptNo !== "-") return `receipt-${row.receiptNo}`;
  return [
    "transaction",
    row.studentId,
    row.admissionNo,
    row.date,
    row.amount,
    row.method,
    row.reference,
    row.type,
  ].map((value) => String(value ?? "").trim()).join("|");
};

const normalizeReceiptBreakdownRows = (rows) => rows
  .map((item, index) => {
    const feeType = read(item, "feeType", "FeeType");
    const amount = optionalNumberValue(item, "amount", "Amount", "originalAmount", "OriginalAmount", "baseAmount", "BaseAmount", "feeAmount", "FeeAmount", "payableAmount", "PayableAmount");
    const paidAmount = optionalNumberValue(item, "paidAmount", "PaidAmount", "amountPaid", "AmountPaid", "paymentAmount", "PaymentAmount", "paid", "Paid");
    return {
      id: String(read(item, "id", "Id", "feeTypeId", "FeeTypeId") ?? `receipt-fee-${index + 1}`),
      feeType: textValue(item, "feeTypeName", "FeeTypeName", "name", "Name", "type", "Type")
        || textValue(feeType, "feeTypeName", "FeeTypeName", "name", "Name", "type", "Type")
        || "Fee",
      amount: amount ?? 0,
      discount: optionalNumberValue(item, "discount", "Discount", "discountAmount", "DiscountAmount", "concession", "Concession", "concessionAmount", "ConcessionAmount") ?? 0,
      paidAmount: paidAmount ?? amount ?? 0,
    };
  })
  .filter((item) => item.feeType || item.amount || item.discount || item.paidAmount);

const amountToWords = (amount) => {
  const value = Math.round(Number(amount || 0));
  if (!Number.isFinite(value) || value < 0) return "";
  if (value === 0) return "Rupees Zero Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const belowHundred = (num) => (num < 20 ? ones[num] : `${tens[Math.floor(num / 10)]}${num % 10 ? ` ${ones[num % 10]}` : ""}`);
  const belowThousand = (num) => {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    return `${hundred ? `${ones[hundred]} Hundred` : ""}${hundred && rest ? " " : ""}${rest ? belowHundred(rest) : ""}`.trim();
  };
  const parts = [
    [10000000, "Crore"],
    [100000, "Lakh"],
    [1000, "Thousand"],
    [1, ""],
  ];
  let remaining = value;
  const words = [];
  parts.forEach(([unit, label]) => {
    const count = Math.floor(remaining / unit);
    if (!count) return;
    words.push(`${belowThousand(count)}${label ? ` ${label}` : ""}`);
    remaining %= unit;
  });
  return `Rupees ${words.join(" ")} Only`;
};

const normalizeReceipt = (payload, fallback = {}) => {
  const data = getObject(payload);
  const merged = { ...fallback, ...data };
  const [row] = normalizeTransactionRows([merged], fallback);
  const student = read(merged, "student", "Student");
  const admission = read(merged, "admission", "Admission", "studentAdmission", "StudentAdmission");
  const board = read(merged, "board", "Board");
  const academicLevel = read(merged, "academicLevel", "AcademicLevel", "level", "Level");
  const group = read(merged, "group", "Group");
  const program = read(merged, "program", "Program", "programme", "Programme");
  const section = read(merged, "section", "Section");
  const rawMethod = row?.method || textValue(merged, "paymentMethod", "PaymentMethod", "paymentMode", "PaymentMode", "method", "Method");
  const rawPaymentType = textValue(merged, "paymentType", "PaymentType", "paymentCategory", "PaymentCategory", "collectionType", "CollectionType");
  const feeSchedule = textValue(merged, "feeScheduleName", "FeeScheduleName", "scheduleName", "ScheduleName", "installmentName", "InstallmentName", "feeName", "FeeName", "feeTypeName", "FeeTypeName")
    || textValue(read(merged, "feeSchedule", "FeeSchedule", "schedule", "Schedule", "installment", "Installment"), "name", "Name", "title", "Title")
    || textValue(merged, "installmentNo", "InstallmentNo", "scheduleNo", "ScheduleNo");
  const paymentType = rawPaymentType && normalizeKey(rawPaymentType) !== normalizeKey(rawMethod) ? rawPaymentType : "";
  const breakdown = normalizeReceiptBreakdownRows(getCollection(read(merged, "feeBreakdown", "FeeBreakdown", "breakdown", "Breakdown", "feeItems", "FeeItems", "components", "Components", "details", "Details", "paymentBreakdown", "PaymentBreakdown")));
  const originalAmount = optionalNumberValue(merged, "originalAmount", "OriginalAmount", "grossAmount", "GrossAmount", "baseAmount", "BaseAmount", "totalAmount", "TotalAmount")
    ?? (breakdown.length ? breakdown.reduce((sum, item) => sum + Number(item.amount || 0), 0) : undefined)
    ?? row?.baseAmount
    ?? row?.amount;
  return {
    ...(row || fallback),
    type: paymentType || feeSchedule || (row?.type && normalizeKey(row.type) !== normalizeKey(rawMethod) ? row.type : "Fee Payment"),
    feeSchedule,
    originalAmount,
    board: textValue(merged, "boardName", "BoardName") || textValue(board, "boardName", "BoardName", "name", "Name") || textValue(admission, "boardName", "BoardName") || fallback.board || "",
    academicLevel: textValue(merged, "academicLevelName", "AcademicLevelName", "levelName", "LevelName", "academicLevel", "AcademicLevel")
      || textValue(academicLevel, "academicLevelName", "AcademicLevelName", "levelName", "LevelName", "name", "Name")
      || textValue(admission, "academicLevelName", "AcademicLevelName", "levelName", "LevelName")
      || fallback.academicLevel
      || fallback.level
      || "",
    group: textValue(merged, "groupName", "GroupName") || textValue(group, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode") || row?.group || fallback.group || "",
    program: textValue(merged, "programName", "ProgramName", "programmeName", "ProgrammeName")
      || textValue(program, "programName", "ProgramName", "programmeName", "ProgrammeName", "name", "Name")
      || textValue(admission, "programName", "ProgramName", "programmeName", "ProgrammeName")
      || fallback.program
      || fallback.programme
      || "",
    section: textValue(merged, "sectionName", "SectionName") || textValue(section, "sectionName", "SectionName", "name", "Name") || row?.section || fallback.section || "",
    rollNumber: textValue(merged, "rollNumber", "RollNumber", "rollNo", "RollNo", "roll", "Roll")
      || textValue(student, "rollNumber", "RollNumber", "rollNo", "RollNo", "roll", "Roll")
      || textValue(admission, "rollNumber", "RollNumber", "rollNo", "RollNo", "roll", "Roll")
      || fallback.rollNumber
      || fallback.rollNo
      || "",
    collegeAddress: textValue(merged, "collegeAddress", "CollegeAddress", "institutionAddress", "InstitutionAddress", "campusAddress", "CampusAddress"),
    collegePhone: textValue(merged, "collegePhone", "CollegePhone", "collegeMobile", "CollegeMobile", "institutionPhone", "InstitutionPhone", "institutionMobile", "InstitutionMobile"),
    collegeEmail: textValue(merged, "collegeEmail", "CollegeEmail", "institutionEmail", "InstitutionEmail"),
    collegeWebsite: textValue(merged, "collegeWebsite", "CollegeWebsite", "institutionWebsite", "InstitutionWebsite", "websiteUrl", "WebsiteUrl"),
    amountInWords: amountToWords(row?.amount),
    breakdown,
  };
};

const accountMatchesPayment = (account, payment) => (
  (payment.studentId && String(account.studentId) === String(payment.studentId))
  || (payment.studentFeeId && String(account.studentFeeId || account.studentFeeAssignmentId || account.assignmentId) === String(payment.studentFeeId))
  || (payment.admissionNo && payment.admissionNo !== "-" && normalizeKey(account.admissionNo) === normalizeKey(payment.admissionNo))
  || (payment.studentName && payment.studentName !== "Student" && normalizeKey(account.studentName) === normalizeKey(payment.studentName))
);

const withPaymentContext = (payment, accounts = []) => {
  const account = accounts.find((item) => accountMatchesPayment(item, payment));
  if (!account) return payment;
  return {
    ...payment,
    studentId: payment.studentId || account.studentId,
    studentFeeId: payment.studentFeeId || account.studentFeeId || account.studentFeeAssignmentId || account.assignmentId,
    studentName: payment.studentName && payment.studentName !== "Student" ? payment.studentName : account.studentName,
    admissionNo: payment.admissionNo && payment.admissionNo !== "-" ? payment.admissionNo : account.admissionNo,
    group: payment.group && payment.group !== "-" ? payment.group : account.group,
    groupId: payment.groupId || account.groupId,
    section: payment.section && payment.section !== "-" ? payment.section : account.section,
    sectionId: payment.sectionId || account.sectionId,
    academicYear: payment.academicYear || account.academicYear,
    academicYearId: payment.academicYearId || account.academicYearId,
  };
};

const normalizeInstallmentRows = (rows, account) => rows.map((item, index) => ({
  id: read(item, "feeInstallmentId", "FeeInstallmentId", "installmentId", "InstallmentId", "id", "Id"),
  feeInstallmentId: read(item, "feeInstallmentId", "FeeInstallmentId", "installmentId", "InstallmentId", "id", "Id"),
  no: Number(read(item, "installmentNo", "InstallmentNo", "scheduleNo", "ScheduleNo", "no", "No") || index + 1),
  amount: numberValue(item, "amount", "Amount", "installmentAmount", "InstallmentAmount", "payableAmount", "PayableAmount", "dueAmount", "DueAmount"),
  paid: optionalNumberValue(item, "paid", "Paid", "paidAmount", "PaidAmount", "amountPaid", "AmountPaid"),
  balance: optionalNumberValue(item, "balance", "Balance", "outstandingBalance", "OutstandingBalance", "dueAmount", "DueAmount", "pendingAmount", "PendingAmount"),
  dueDate: textValue(item, "dueDate", "DueDate", "date", "Date"),
  status: textValue(item, "status", "Status") || account.feeStatus || "Pending",
})).map((item) => ({
  ...item,
  paid: item.paid ?? (item.balance !== undefined ? Math.max(Number(item.amount || 0) - Number(item.balance || 0), 0) : 0),
  balance: item.balance ?? Math.max(Number(item.amount || 0) - Number(item.paid || 0), 0),
}));

const normalizeFeeAccountRows = (rows, context = {}) => rows.map((item, index) => {
  const studentsById = context.studentsById || new Map();
  const admissions = context.admissions || [];
  const feeDetailsByStudentId = context.feeDetailsByStudentId || new Map();
  const feeDetailsByAccountId = context.feeDetailsByAccountId || new Map();
  const student = read(item, "student", "Student");
  const studentFee = read(item, "studentFee", "StudentFee", "feeAccount", "FeeAccount", "assignment", "Assignment");
  const studentId = read(item, "studentId", "StudentId") ?? read(student, "studentId", "StudentId", "id", "Id");
  const studentRecord = studentsById.get(String(studentId)) || {};
  const admissionRecord = findMatchingAdmission(admissions, item, studentRecord);
  const ledgerAssignmentId = readStudentFeeId(item, studentFee);
  const detail = feeDetailsByStudentId.get(String(studentId)) || feeDetailsByAccountId.get(String(ledgerAssignmentId)) || {};
  const detailStudentFee = read(detail, "studentFee", "StudentFee", "feeAccount", "FeeAccount", "assignment", "Assignment");
  const group = read(item, "group", "Group");
  const section = read(item, "section", "Section");
  const program = read(item, "program", "Program");
  const academicYear = read(item, "academicYear", "AcademicYear", "year", "Year");
  const assignmentId = readStudentFeeId(item, studentFee, detail);
  const feeItems = feeDetailPayloadRows(detail).length ? feeDetailPayloadRows(detail) : getCollection(read(item, "feeItems", "FeeItems", "items", "Items", "breakdown", "Breakdown"));
  const normalizedItems = feeItems.map((feeItem, feeIndex) => {
    const originalAmount = numberValue(feeItem, "originalAmount", "OriginalAmount", "amount", "Amount", "feeAmount", "FeeAmount", "baseAmount", "BaseAmount");
    const concessionAmount = numberValue(feeItem, "concessionAmount", "ConcessionAmount", "discount", "Discount", "discountAmount", "DiscountAmount", "scholarshipAmount", "ScholarshipAmount");
    const explicitPayable = optionalNumberValue(feeItem, "payableAmount", "PayableAmount", "payable", "Payable", "netAmount", "NetAmount", "finalAmount", "FinalAmount");
    return {
      id: String(read(feeItem, "feeTypeId", "FeeTypeId", "id", "Id") ?? `${index}-${feeIndex}`),
      type: textValue(feeItem, "feeTypeName", "FeeTypeName", "feeType", "FeeType", "type", "Type", "name", "Name") || `Fee ${feeIndex + 1}`,
      originalAmount,
      concessionName: textValue(feeItem, "concessionName", "ConcessionName", "scholarshipName", "ScholarshipName", "schemeName", "SchemeName"),
      concessionAmount,
      payableAmount: explicitPayable ?? Math.max(originalAmount - concessionAmount, 0),
      selected: read(feeItem, "selected", "Selected") !== false,
      required: Boolean(read(feeItem, "isMandatory", "IsMandatory", "required", "Required")),
    };
  });
  const detailTotal = normalizedItems.reduce((sum, feeItem) => sum + Number(feeItem.payableAmount || feeItem.originalAmount || 0), 0);
  const detailSchedules = feeDetailScheduleRows(detail).length
    ? feeDetailScheduleRows(detail)
    : feeDetailScheduleRows(detailStudentFee);
  const schedules = detailSchedules.length
    ? detailSchedules
    : getCollection(read(item, "installments", "Installments", "schedules", "Schedules", "feeSchedules", "FeeSchedules"));
  const explicitPaymentPlan = normalizeBackendPaymentPlan(
    read(detail, "paymentPlan", "PaymentPlan"),
    read(detail, "planName", "PlanName", "plan", "Plan"),
    read(detailStudentFee, "paymentPlan", "PaymentPlan"),
    read(detailStudentFee, "planName", "PlanName", "plan", "Plan"),
    read(item, "paymentPlan", "PaymentPlan"),
    read(item, "planName", "PlanName", "plan", "Plan"),
    read(studentFee, "paymentPlan", "PaymentPlan"),
    read(studentFee, "planName", "PlanName", "plan", "Plan"),
  );
  const schedulePaymentPlan = schedules.length > 1
    ? "Installment Payment"
    : schedules.length === 1 ? normalizeBackendPaymentPlan(schedules[0]) : "";
  const paymentPlan = explicitPaymentPlan || schedulePaymentPlan;
  const paymentPlanObject = read(detail, "paymentPlan", "PaymentPlan")
    || read(detailStudentFee, "paymentPlan", "PaymentPlan")
    || read(studentFee, "paymentPlan", "PaymentPlan");
  const numberOfInstallments = optionalNumberValue(detail, "numberOfInstallments", "NumberOfInstallments", "installmentCount", "InstallmentCount")
    ?? optionalNumberValue(paymentPlanObject, "numberOfInstallments", "NumberOfInstallments", "installmentCount", "InstallmentCount")
    ?? (schedules.length || undefined);
  const rawTotalPayable = optionalNumberValue(item, "totalPayable", "TotalPayable", "payable", "Payable", "netPayable", "NetPayable", "totalAmount", "TotalAmount", "assignedAmount", "AssignedAmount")
    ?? optionalNumberValue(detail, "totalPayable", "TotalPayable", "payable", "Payable", "originalFee", "OriginalFee", "scheduledFees", "ScheduledFees", "totalAmount", "TotalAmount", "assignedAmount", "AssignedAmount")
    ?? detailTotal;
  const totalPaid = optionalNumberValue(item, "totalPaid", "TotalPaid", "paid", "Paid", "paidAmount", "PaidAmount", "amountPaid", "AmountPaid", "collectedAmount", "CollectedAmount", "totalCollected", "TotalCollected")
    ?? optionalNumberValue(detail, "totalPaid", "TotalPaid", "paid", "Paid", "paidAmount", "PaidAmount", "amountPaid", "AmountPaid", "collectedAmount", "CollectedAmount", "totalCollected", "TotalCollected")
    ?? 0;
  const rawBalance = optionalNumberValue(item, "balance", "Balance", "outstanding", "Outstanding", "outstandingAmount", "OutstandingAmount", "outstandingBalance", "OutstandingBalance", "dueAmount", "DueAmount", "pendingAmount", "PendingAmount", "balanceAmount", "BalanceAmount")
    ?? optionalNumberValue(detail, "balance", "Balance", "outstanding", "Outstanding", "outstandingAmount", "OutstandingAmount", "outstandingBalance", "OutstandingBalance", "dueAmount", "DueAmount", "pendingAmount", "PendingAmount", "balanceAmount", "BalanceAmount")
    ?? undefined;
  const nextDueDate = textValue(item, "nextDueDate", "NextDueDate", "nextDue", "NextDue", "dueDate", "DueDate")
    || textValue(detail, "nextDueDate", "NextDueDate", "nextDue", "NextDue", "dueDate", "DueDate");
  const rawStatus = textValue(item, "feeStatus", "FeeStatus", "status", "Status") || textValue(detail, "feeStatus", "FeeStatus", "status", "Status");
  const totalPayable = rawTotalPayable <= 0 && detailTotal > 0 ? detailTotal : rawTotalPayable;
  const balance = rawBalance !== undefined && !(rawBalance <= 0 && totalPayable > totalPaid && normalizeKey(rawStatus) === "pending")
    ? rawBalance
    : Math.max(totalPayable - totalPaid, 0);
  const account = {
    id: String(assignmentId ?? read(item, "studentId", "StudentId") ?? read(item, "id", "Id") ?? `fee-account-${index + 1}`),
    assignmentId,
    studentFeeAssignmentId: assignmentId,
    studentFeeId: assignmentId,
    studentId,
    studentName: textValue(item, "studentName", "StudentName", "name", "Name")
      || textValue(detail, "studentName", "StudentName", "name", "Name")
      || textValue(studentRecord, "studentName", "StudentName", "name", "Name", "fullName", "FullName")
      || admissionFullName(admissionRecord)
      || "Student",
    admissionNo: textValue(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
      || textValue(detail, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
      || textValue(studentRecord, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
      || textValue(admissionRecord, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
      || "-",
    rollNumber: textValue(item, "rollNumber", "RollNumber") || textValue(detail, "rollNumber", "RollNumber") || textValue(studentRecord, "rollNo", "RollNo", "rollNumber", "RollNumber"),
    academicYearId: textValue(item, "academicYearId", "AcademicYearId") || textValue(academicYear, "academicYearId", "AcademicYearId", "id", "Id") || textValue(admissionRecord, "academicYearId", "AcademicYearId"),
    academicYear: textValue(item, "academicYearName", "AcademicYearName", "academicYear", "AcademicYear") || textValue(detail, "academicYearName", "AcademicYearName") || textValue(academicYear, "academicYearName", "AcademicYearName", "name", "Name") || textValue(admissionRecord, "academicYearName", "AcademicYearName"),
    academicLevel: textValue(item, "academicLevelName", "AcademicLevelName", "academicLevel", "AcademicLevel") || textValue(detail, "academicLevelName", "AcademicLevelName") || textValue(admissionRecord, "academicLevelName", "AcademicLevelName"),
    groupId: textValue(item, "groupId", "GroupId") || textValue(group, "groupId", "GroupId", "id", "Id") || textValue(admissionRecord, "groupId", "GroupId") || textValue(studentRecord, "groupId", "GroupId"),
    group: textValue(item, "groupName", "GroupName", "group", "Group") || textValue(detail, "groupName", "GroupName") || textValue(group, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode") || textValue(admissionRecord, "groupName", "GroupName"),
    programId: textValue(item, "programId", "ProgramId") || textValue(program, "programId", "ProgramId", "id", "Id") || textValue(admissionRecord, "programId", "ProgramId") || textValue(studentRecord, "programId", "ProgramId"),
    program: textValue(item, "programName", "ProgramName", "program", "Program") || textValue(program, "programName", "ProgramName", "name", "Name", "programCode", "ProgramCode") || textValue(admissionRecord, "programName", "ProgramName"),
    sectionId: textValue(item, "sectionId", "SectionId") || textValue(section, "sectionId", "SectionId", "id", "Id") || textValue(studentRecord, "sectionId", "SectionId"),
    section: textValue(item, "sectionName", "SectionName", "section", "Section") || textValue(detail, "sectionName", "SectionName") || textValue(section, "sectionName", "SectionName", "name", "Name") || textValue(admissionRecord, "sectionName", "SectionName") || textValue(admissionRecord, "programName", "ProgramName"),
    admissionDate: textValue(item, "admissionDate", "AdmissionDate", "createdAt", "CreatedAt") || textValue(detail, "admissionDate", "AdmissionDate") || textValue(admissionRecord, "admissionDate", "AdmissionDate"),
    paymentPlan,
    numberOfInstallments,
    admissionFee: numberValue(item, "admissionFee", "AdmissionFee"),
    courseFee: numberValue(item, "courseFee", "CourseFee", "totalPayable", "TotalPayable", "payable", "Payable", "totalAmount", "TotalAmount"),
    totalPayable,
    totalPaid,
    balance,
    concessionAmount: numberValue(item, "concessionAmount", "ConcessionAmount", "discountAmount", "DiscountAmount"),
    feeStatus: accountStatusFor({ payable: totalPayable, paid: totalPaid, balance, dueDate: nextDueDate, status: rawStatus }),
    nextDueDate,
    feeItems: normalizedItems,
    transactions: [],
    installments: [],
  };
  account.transactions = normalizeTransactionRows(feePaymentRows(item, detail), account);
  account.installments = normalizeInstallmentRows(schedules, account);
  const derived = deriveAccount(account);
  const nextDue = account.installments
    .filter((row) => normalizeKey(row.status) !== "paid" && row.balance > 0 && row.dueDate)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0] || null;
  return {
    ...derived,
    totalPayable: account.totalPayable ?? derived.totalPayable,
    totalPaid: account.totalPaid ?? derived.totalPaid,
    balance: account.balance ?? derived.balance,
    feeStatus: account.feeStatus || derived.feeStatus,
    nextDueDate: account.nextDueDate || nextDue?.dueDate || derived.nextDueDate,
  };
});

const printFeeTarget = (target) => {
  const className = `cms-fee-print-${target}`;
  const cleanup = () => {
    document.body.classList.remove(className);
    window.removeEventListener("afterprint", cleanup);
  };

  document.body.classList.add(className);
  window.addEventListener("afterprint", cleanup);
  window.setTimeout(() => {
    window.print();
    window.setTimeout(cleanup, 500);
  }, 50);
};

const escapePrintValue = (value) => String(value ?? "-")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const printFeeList = (title, columns, rows) => {
  const printableRows = rows.length ? rows : [];
  const html = `
    <html>
      <head>
        <title>${escapePrintValue(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
          h1 { margin: 0; font-size: 20px; }
          .meta { margin: 6px 0 18px; color: #6b7280; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #eff6ff; color: #1e3a8a; }
          td.num, th.num { text-align: right; }
        </style>
      </head>
      <body>
        <h1>${escapePrintValue(COLLEGE_NAME)}</h1>
        <div class="meta">${escapePrintValue(title)} &middot; ${printableRows.length} records &middot; ${formatDate(todayISO())}</div>
        <table>
          <thead><tr>${columns.map((column) => `<th class="${column.num ? "num" : ""}">${escapePrintValue(column.label)}</th>`).join("")}</tr></thead>
          <tbody>
            ${printableRows.length ? printableRows.map((row) => `<tr>${columns.map((column) => `<td class="${column.num ? "num" : ""}">${escapePrintValue(column.value(row))}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}">No records available.</td></tr>`}
          </tbody>
        </table>
      </body>
    </html>
  `;
  const popup = window.open("", "_blank", "width=960,height=720");
  if (!popup) return;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => {
    popup.print();
    popup.close();
  }, 150);
};

function StatusBadge({ status }) {
  return <span className={`cms-badge ${feeStatusTone(status)}`}>{status}</span>;
}

function SummaryCard({ icon: Icon, label, value, hint, tone, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`cms-fee-stat tone-${tone} ${onClick ? "is-clickable" : ""}`} type={onClick ? "button" : undefined} onClick={onClick}>
      <span className="cms-fee-stat-icon"><Icon size={16} /></span>
      <div>
        <span className="cms-fee-stat-label">{label}</span>
        <strong className="cms-fee-stat-value">{value}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
    </Tag>
  );
}

function SelectFilter({ label, value, options, onChange }) {
  const emptyLabel = label === "Section" ? "No sections available" : `No ${label.toLowerCase()} available`;
  return (
    <label className="cms-fee-filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => {
          const optionValue = option && typeof option === "object" ? option.value : option;
          const optionLabel = option && typeof option === "object" ? option.label : option;
          return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
        })}
        {!options.length ? <option value="" disabled>{emptyLabel}</option> : null}
      </select>
    </label>
  );
}

function TablePagination({ page, pageSize = PAGE_SIZE, totalItems, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems ? ((page - 1) * pageSize) + 1 : 0;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="cms-fee-pagination">
      <span className="cms-fee-pagination-info">Showing {start}-{end} of {totalItems}</span>
      <div className="cms-fee-pagination-actions">
        <button className="cms-btn cms-btn-ghost cms-fee-mini-btn" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>Previous</button>
        <button className="cms-btn cms-btn-primary cms-fee-mini-btn" type="button" aria-current="page">{page}</button>
        <button className="cms-btn cms-btn-ghost cms-fee-mini-btn" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>Next</button>
      </div>
    </div>
  );
}

/* ------------------------------- Overview ------------------------------- */
const normalizeDueRows = (rows) => rows
  .map((item, index) => {
    const student = read(item, "student", "Student");
    const admission = read(item, "admission", "Admission", "studentAdmission", "StudentAdmission");
    const group = read(item, "group", "Group");
    const section = read(item, "section", "Section");
    const paymentPlan = textValue(item, "paymentPlan", "PaymentPlan", "plan", "Plan");
    const scheduleNo = textValue(item, "installmentNo", "InstallmentNo", "scheduleNo", "ScheduleNo", "no", "No");
    const scheduleText = textValue(item, "feeSchedule", "FeeSchedule", "schedule", "Schedule");
    const isFullPayment = normalizeKey(paymentPlan).includes("full")
      || normalizeKey(scheduleText).includes("full payment")
      || normalizeKey(scheduleNo).includes("full payment");
    const status = textValue(item, "status", "Status", "feeStatus", "FeeStatus") || "Due";
    return {
      key: String(read(item, "feeInstallmentId", "FeeInstallmentId", "studentFeeId", "StudentFeeId", "id", "Id") ?? `due-${index + 1}`),
      studentId: textValue(item, "studentId", "StudentId") || textValue(student, "studentId", "StudentId", "id", "Id") || textValue(admission, "studentId", "StudentId"),
      studentName: textValue(item, "studentName", "StudentName", "name", "Name")
        || textValue(student, "studentName", "StudentName", "name", "Name", "fullName", "FullName")
        || admissionFullName(admission)
        || "Student",
      admissionNo: textValue(item, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
        || textValue(student, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
        || textValue(admission, "admissionNo", "AdmissionNo", "admissionNumber", "AdmissionNumber")
        || "-",
      group: textValue(item, "groupName", "GroupName", "group", "Group", "programName", "ProgramName")
        || textValue(group, "groupName", "GroupName", "name", "Name", "groupCode", "GroupCode")
        || textValue(admission, "groupName", "GroupName")
        || "-",
      section: textValue(item, "sectionName", "SectionName", "section", "Section", "programName", "ProgramName")
        || textValue(section, "sectionName", "SectionName", "name", "Name")
        || textValue(admission, "sectionName", "SectionName", "programName", "ProgramName")
        || "-",
      no: scheduleNo,
      scheduleLabel: isFullPayment ? "Full Payment" : scheduleNo ? `Fee Schedule ${scheduleNo}` : scheduleText || "Fee Schedule",
      dueDate: cleanDateValue(textValue(item, "dueDate", "DueDate", "nextDue", "NextDue")),
      amount: numberValue(item, "balance", "Balance", "outstandingBalance", "OutstandingBalance", "pendingAmount", "PendingAmount", "amount", "Amount", "dueAmount", "DueAmount"),
      status,
    };
  })
  .filter((item) => item.amount > 0 && !["paid", "completed"].includes(normalizeKey(item.status)));

const dueDateKey = (value) => cleanDateValue(value).slice(0, 10);

const splitDueRows = (rows = []) => {
  const today = todayISO();
  const unique = new Map();
  rows.forEach((row) => {
    if (Number(row.amount || 0) <= 0 || ["paid", "completed"].includes(normalizeKey(row.status))) return;
    const key = row.key || `${row.admissionNo}-${row.scheduleLabel}-${row.dueDate}-${row.amount}`;
    if (!unique.has(key)) unique.set(key, row);
  });
  const all = Array.from(unique.values());
  return {
    overdue: all.filter((row) => dueDateKey(row.dueDate) && dueDateKey(row.dueDate) < today),
    upcoming: all.filter((row) => !dueDateKey(row.dueDate) || dueDateKey(row.dueDate) >= today),
  };
};

const dueStudentKey = (row) => normalizeKey(row.studentId || row.admissionNo || row.studentName);

const uniqueDueStudentCount = (rows = []) => {
  const students = new Set();
  rows.forEach((row) => {
    const key = dueStudentKey(row);
    if (key) students.add(key);
  });
  return students.size;
};

const normalizeDashboard = (payload) => {
  const data = getObject(payload);
  const chartRows = getCollection(read(data, "groupWiseCollection", "GroupWiseCollection", "groupWiseTotals", "GroupWiseTotals", "chartData", "ChartData"));
  return {
    totals: {
      totalStudents: optionalNumberValue(data, "totalStudents", "TotalStudents"),
      totalCollected: optionalNumberValue(data, "totalCollected", "TotalCollected", "collected", "Collected", "totalPaid", "TotalPaid"),
      pendingStudents: optionalNumberValue(data, "pendingStudents", "PendingStudents"),
      overdueStudents: optionalNumberValue(data, "overdueStudents", "OverdueStudents"),
      collectedPercent: optionalNumberValue(data, "collectionPercentage", "CollectionPercentage", "collectedPercent", "CollectedPercent"),
    },
    chartData: chartRows.map((item) => ({
      group: textValue(item, "groupName", "GroupName", "group", "Group", "programName", "ProgramName") || "-",
      expected: numberValue(item, "expected", "Expected", "totalExpected", "TotalExpected", "totalPayable", "TotalPayable"),
      collected: numberValue(item, "collected", "Collected", "totalCollected", "TotalCollected", "totalPaid", "TotalPaid", "paidAmount", "PaidAmount"),
      outstanding: numberValue(item, "outstanding", "Outstanding", "totalOutstanding", "TotalOutstanding", "balance", "Balance", "pendingAmount", "PendingAmount"),
    })),
    upcoming: normalizeDueRows(getCollection(read(data, "upcomingSchedules", "UpcomingSchedules", "dues", "Dues"))),
    recent: normalizeTransactionRows(getCollection(read(data, "recentPayments", "RecentPayments", "payments", "Payments")), {}),
  };
};

function OverviewTab({ accounts, dashboard = null, dueRows = [], dashboardLoaded = false }) {
  const [overviewTab, setOverviewTab] = useState("overdue");
  const [overduePage, setOverduePage] = useState(1);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [recentPage, setRecentPage] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState("");
  const overviewRef = useRef(null);
  const dashboardData = dashboard ? normalizeDashboard(dashboard) : null;
  const fallbackTotals = accountOverviewTotals(accounts);
  const dashboardTotals = Object.fromEntries(Object.entries(dashboardData?.totals || {}).filter(([, value]) => value !== undefined));
  const hasAccountData = accounts.some(accountHasUsefulTotals);
  const emptyTotals = { totalStudents: 0, totalCollected: 0, pendingStudents: 0, overdueStudents: 0, collectedPercent: 0 };
  const totals = Object.keys(dashboardTotals).length ? { ...fallbackTotals, ...dashboardTotals } : dashboardLoaded ? fallbackTotals : emptyTotals;
  const dashboardChart = dashboardData?.chartData || [];
  const accountChart = accountGroupWiseTotals(accounts);
  const chartData = hasUsefulChartData(dashboardChart) ? dashboardChart : dashboardLoaded && hasAccountData && hasUsefulChartData(accountChart) ? accountChart : [];
  const sourceDueRows = dueRows.length ? dueRows : dashboardData?.upcoming?.length ? dashboardData.upcoming : [];
  const { overdue, upcoming } = splitDueRows(sourceDueRows);
  const pendingDueStudentCount = uniqueDueStudentCount([...overdue, ...upcoming]);
  const overdueStudentCount = uniqueDueStudentCount(overdue);
  const hasDueScheduleData = dashboardLoaded || sourceDueRows.length > 0;
  const pendingOverdueStudents = hasDueScheduleData ? pendingDueStudentCount : totals.pendingStudents;
  const overdueStudents = hasDueScheduleData ? overdueStudentCount : totals.overdueStudents || 0;
  const recent = dashboardData?.recent?.length ? dashboardData.recent : [];
  const collectedPercent = totals.collectedPercent ?? fallbackTotals.collectedPercent;
  const groupOptions = Array.from(new Set(chartData.map((row) => row.group).filter(Boolean))).sort();
  const selectedChartRows = selectedGroup ? chartData.filter((row) => row.group === selectedGroup) : chartData;
  const selectedChartTotals = selectedChartRows.reduce((sum, row) => ({
    expected: sum.expected + Number(row.expected || 0),
    collected: sum.collected + Number(row.collected || 0),
    outstanding: sum.outstanding + Number(row.outstanding || 0),
  }), { expected: 0, collected: 0, outstanding: 0 });
  const circularData = [
    { name: "Expected", value: selectedChartTotals.expected },
    { name: "Collected", value: selectedChartTotals.collected },
    { name: "Outstanding", value: selectedChartTotals.outstanding },
  ].filter((item) => item.value > 0);
  const paginatedOverdue = pageItems(overdue, overduePage);
  const paginatedUpcoming = pageItems(upcoming, upcomingPage);
  const paginatedRecent = pageItems(recent, recentPage);
  const overdueSignature = overdue.map((row) => `${row.key}-${row.amount}-${row.status}-${row.dueDate}`).join("|");
  const upcomingSignature = upcoming.map((row) => `${row.key}-${row.amount}-${row.status}-${row.dueDate}`).join("|");
  const recentSignature = recent.map((row) => `${row.id}-${row.amount}-${row.date}-${row.receiptNo}`).join("|");
  const dueColumns = [
    { label: "Student", value: (row) => row.studentName },
    { label: "Admission No", value: (row) => row.admissionNo },
    { label: "Group / Section", value: (row) => `${row.group} / ${row.section}` },
    { label: "Fee Schedule", value: (row) => row.scheduleLabel },
    { label: "Due Date", value: (row) => formatFeeDate(row.dueDate) },
    { label: "Amount", value: (row) => formatCurrency(row.amount), num: true },
    { label: "Status", value: (row) => row.status },
  ];
  const recentColumns = [
    { label: "Receipt No", value: (row) => row.receiptNo },
    { label: "Student", value: (row) => row.studentName },
    { label: "Payment Type", value: (row) => feeScheduleLabel(row.type) },
    { label: "Amount", value: (row) => formatCurrency(row.amount), num: true },
    { label: "Payment Method", value: (row) => row.method },
    { label: "Date", value: (row) => formatFeeDate(row.date) },
  ];
  const openOverviewTab = (tabId) => {
    setOverviewTab(tabId);
    window.requestAnimationFrame(() => overviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  useEffect(() => {
    setOverduePage(1);
  }, [overdueSignature]);

  useEffect(() => {
    setUpcomingPage(1);
  }, [upcomingSignature]);

  useEffect(() => {
    setRecentPage(1);
  }, [recentSignature]);

  return (
    <div className="cms-fee-stack">
      <div className="cms-fee-stat-grid">
        <SummaryCard icon={Users} tone="blue" label="Total Students" value={`${totals.totalStudents} Students`} hint="With active fee accounts" />
        <SummaryCard icon={WalletCards} tone="green" label="Total Collected" value={formatCompactCurrency(totals.totalCollected)} hint={`${collectedPercent.toFixed(1)}% of expected`} onClick={() => openOverviewTab("recent")} />
        <SummaryCard icon={AlertCircle} tone="red" label="Pending / Overdue" value={`${pendingOverdueStudents} Students`} hint={`${overdueStudents} overdue`} onClick={() => openOverviewTab("overdue")} />
        <SummaryCard icon={CalendarClock} tone="amber" label="Upcoming Fees" value={`${upcoming.length} Schedules`} hint="Unpaid schedules due today or later" onClick={() => openOverviewTab("upcoming")} />
      </div>

      <div className="cms-card">
        <div className="cms-card-head">
          <h2>Group-wise Collection</h2>
          <label className="cms-fee-chart-filter">
            <span>Group</span>
            <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)}>
              <option value="">All Groups</option>
              {groupOptions.map((group, index) => <option key={`${group}-${index}`} value={group}>{group}</option>)}
            </select>
          </label>
        </div>
        <div className="cms-card-body">
          <div className="cms-fee-chart cms-fee-donut">
            {circularData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={circularData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2}>
                    {circularData.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 10, border: "1px solid var(--cms-border)", background: "var(--cms-surface)", color: "var(--cms-text)", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="cms-fee-empty-row">No collection chart data available.</div>
            )}
            <div className="cms-fee-chart-summary">
              <span>Expected <strong>{formatCurrency(selectedChartTotals.expected)}</strong></span>
              <span>Collected <strong>{formatCurrency(selectedChartTotals.collected)}</strong></span>
              <span>Outstanding <strong>{formatCurrency(selectedChartTotals.outstanding)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="cms-card cms-fee-overview-card" ref={overviewRef}>
        <div className="cms-card-head">
          <h2>Fee Management Overview</h2>
          {overviewTab === "overdue" ? <button className="cms-btn cms-btn-ghost cms-fee-mini-btn" type="button" onClick={() => printFeeList("Overdue Fees", dueColumns, overdue)}><Printer size={14} /> Print List</button> : null}
          {overviewTab === "upcoming" ? <button className="cms-btn cms-btn-ghost cms-fee-mini-btn" type="button" onClick={() => printFeeList("Upcoming Fee Schedules", dueColumns, upcoming)}><Printer size={14} /> Print List</button> : null}
        </div>
        <div className="cms-card-body cms-fee-overview-shell">
          <div className="cms-fee-overview-tabs" role="tablist" aria-label="Fee Management Overview">
            {OVERVIEW_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={overviewTab === id}
                className={`cms-fee-overview-tab ${overviewTab === id ? "is-active" : ""}`}
                onClick={() => setOverviewTab(id)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          <div className="cms-fee-overview-content">
            {overviewTab === "overdue" ? (
              <div className="cms-table-wrap">
                <table className="cms-table cms-fee-schedule-list-table">
                  <colgroup>
                    <col className="cms-fee-schedule-student-col" />
                    <col className="cms-fee-schedule-admission-col" />
                    <col className="cms-fee-schedule-group-col" />
                    <col className="cms-fee-schedule-label-col" />
                    <col className="cms-fee-schedule-date-col" />
                    <col className="cms-fee-schedule-money-col" />
                    <col className="cms-fee-schedule-status-col" />
                  </colgroup>
                  <thead>
                    <tr><th>Student</th><th>Admission No</th><th>Group / Section</th><th>Fee Schedule</th><th>Due Date</th><th className="num">Amount</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {overdue.length === 0 ? (
                      <tr><td colSpan={7} className="cms-fee-empty-row">No overdue fee schedules.</td></tr>
                    ) : paginatedOverdue.map((row) => (
                      <tr key={row.key}>
                        <td><strong>{row.studentName}</strong></td>
                        <td>{row.admissionNo}</td>
                        <td>{row.group} / {row.section}</td>
                        <td>{row.scheduleLabel}</td>
                        <td>{formatFeeDate(row.dueDate)}</td>
                        <td className="num">{formatCurrency(row.amount)}</td>
                        <td><StatusBadge status={row.status || "Overdue"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePagination page={overduePage} totalItems={overdue.length} onPageChange={setOverduePage} />
              </div>
            ) : null}

            {overviewTab === "upcoming" ? (
              <div className="cms-table-wrap">
                <table className="cms-table cms-fee-schedule-list-table">
                  <colgroup>
                    <col className="cms-fee-schedule-student-col" />
                    <col className="cms-fee-schedule-admission-col" />
                    <col className="cms-fee-schedule-group-col" />
                    <col className="cms-fee-schedule-label-col" />
                    <col className="cms-fee-schedule-date-col" />
                    <col className="cms-fee-schedule-money-col" />
                    <col className="cms-fee-schedule-status-col" />
                  </colgroup>
                  <thead>
                    <tr><th>Student</th><th>Admission No</th><th>Group / Section</th><th>Fee Schedule</th><th>Due Date</th><th className="num">Amount</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {upcoming.length === 0 ? (
                      <tr><td colSpan={7} className="cms-fee-empty-row">No pending fee schedules.</td></tr>
                    ) : paginatedUpcoming.map((row) => (
                      <tr key={row.key}>
                        <td><strong>{row.studentName}</strong></td>
                        <td>{row.admissionNo}</td>
                        <td>{row.group} / {row.section}</td>
                        <td>{row.scheduleLabel}</td>
                        <td>{formatFeeDate(row.dueDate)}</td>
                        <td className="num">{formatCurrency(row.amount)}</td>
                        <td><StatusBadge status={row.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePagination page={upcomingPage} totalItems={upcoming.length} onPageChange={setUpcomingPage} />
              </div>
            ) : null}

            {overviewTab === "recent" ? (
              <div className="cms-table-wrap">
                <table className="cms-table cms-fee-recent-payments-table">
                  <colgroup>
                    <col className="cms-fee-recent-receipt-col" />
                    <col className="cms-fee-recent-student-col" />
                    <col className="cms-fee-recent-type-col" />
                    <col className="cms-fee-recent-money-col" />
                    <col className="cms-fee-recent-method-col" />
                    <col className="cms-fee-recent-date-col" />
                  </colgroup>
                  <thead>
                    <tr><th>Receipt No</th><th>Student</th><th>Payment Type</th><th className="num">Amount</th><th>Payment Method</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {recent.length === 0 ? (
                      <tr><td colSpan={6} className="cms-fee-empty-row">No recent payments.</td></tr>
                    ) : paginatedRecent.map((row) => (
                      <tr key={row.id}>
                        <td><strong>{row.receiptNo}</strong></td>
                        <td>{row.studentName}</td>
                        <td>{feeScheduleLabel(row.type)}</td>
                        <td className="num">{formatCurrency(row.amount)}</td>
                        <td>{row.method}</td>
                        <td>{formatFeeDate(row.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="cms-fee-print-row">
                  <button className="cms-btn cms-btn-ghost cms-fee-mini-btn" type="button" onClick={() => printFeeList("Recent Payments", recentColumns, recent)}><Printer size={14} /> Print List</button>
                </div>
                <TablePagination page={recentPage} totalItems={recent.length} onPageChange={setRecentPage} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Collect payment ---------------------------- */
function CollectPaymentModal({ account, onClose, onSaved }) {
  const pending = account.installments.filter((item) => normalizeKey(item.status) !== "paid" && Number(item.balance || 0) > 0);
  const [target, setTarget] = useState(pending.length ? String(pending[0].no) : "full");
  const [amount, setAmount] = useState(String(pending.length ? pending[0].balance : account.balance));
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [discount, setDiscount] = useState("");
  const [fine, setFine] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const isReferenceRequired = method && method !== "Cash";

  const selectTarget = (value) => {
    setTarget(value);
    setError("");
    if (value === "full") {
      setAmount(String(account.balance));
      return;
    }
    const installment = pending.find((item) => String(item.no) === value);
    setAmount(String(installment ? installment.balance : account.balance));
  };

  const save = async () => {
    if (savingRef.current) return null;
    const value = Number(amount || 0);
    const discountValue = Number(discount || 0);
    const fineValue = Number(fine || 0);
    if (!Number.isFinite(value) || value <= 0) return setError("Enter a valid payment amount");
    if (discountValue > value + fineValue) return setError("Discount cannot exceed the payment amount plus fine");
    if (value > account.balance) return setError(`Amount cannot exceed the outstanding balance of ${formatCurrency(account.balance)}`);
    if (!method) return setError("Payment Method is required");
    if (isReferenceRequired && !reference.trim()) return setError("Transaction / Reference Number is required for this payment method");
    const assignmentId = account.assignmentId || account.studentFeeAssignmentId;
    if (!assignmentId) return setError("Student fee assignment ID is required to collect payment");
    const assignmentIdValue = Number(assignmentId);
    if (!Number.isFinite(assignmentIdValue) || assignmentIdValue <= 0) return setError("Student fee assignment ID must be a valid number");
    const studentIdValue = Number(account.studentId || 0);
    if (!Number.isFinite(studentIdValue) || studentIdValue <= 0) return setError("Student ID is required to collect payment");
    const installment = target === "full" ? null : pending.find((item) => String(item.no) === target);
    savingRef.current = true;
    setSaving(true);
    try {
      const response = await apiClient.post(apiEndpoints.fee.collect, {
        studentId: studentIdValue,
        studentFeeId: assignmentIdValue,
        feeInstallmentId: installment?.feeInstallmentId || installment?.installmentId || installment?.id || null,
        amount: value,
        paymentDate: date ? new Date(date).toISOString() : null,
        paymentMode: method,
        discount: discountValue,
        fine: fineValue,
        transactionReference: reference,
        note,
      });
      const saved = getObject(response.data);
      setSaving(false);
      savingRef.current = false;
      return onSaved({
        amount: numberValue(saved, "amount", "Amount", "paidAmount", "PaidAmount") || value,
        baseAmount: numberValue(saved, "baseAmount", "BaseAmount", "amount", "Amount") || value,
        discount: numberValue(saved, "discount", "Discount", "discountAmount", "DiscountAmount"),
        fine: numberValue(saved, "fine", "Fine", "fineAmount", "FineAmount"),
        method: textValue(saved, "paymentMethod", "PaymentMethod", "paymentMode", "PaymentMode", "method", "Method") || method,
        reference: textValue(saved, "transactionNumber", "TransactionNumber", "reference", "Reference", "transactionReference", "TransactionReference") || reference,
        date: textValue(saved, "paymentDate", "PaymentDate", "paidDate", "PaidDate", "date", "Date", "createdAt", "CreatedAt") || date,
        feePaymentId: read(saved, "feePaymentId", "FeePaymentId", "paymentId", "PaymentId", "id", "Id"),
        receiptNo: textValue(saved, "receiptNo", "ReceiptNo", "receiptNumber", "ReceiptNumber") || "-",
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSaving(false);
      savingRef.current = false;
      return null;
    }
  };

  return (
    <Modal
      title="Collect Payment"
      onClose={onClose}
      footer={(
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cms-btn cms-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Payment"}</button>
        </>
      )}
    >
      <div className="cms-fee-collect">
        <div className="cms-fee-context">
          <div className="cms-fee-context-item"><span>Student</span><strong>{account.studentName}</strong></div>
          <div className="cms-fee-context-item"><span>Admission No</span><strong>{account.admissionNo}</strong></div>
          <div className="cms-fee-context-item"><span>Group / Section</span><strong>{account.group} / {account.section}</strong></div>
          <div className="cms-fee-context-item"><span>Outstanding Balance</span><strong>{formatCurrency(account.balance)}</strong></div>
        </div>

        <div className="cms-form-grid cols-3">
          <div className="cms-field full">
            <label htmlFor="collect-target">Pay Towards</label>
            <select id="collect-target" value={target} onChange={(event) => selectTarget(event.target.value)}>
              {pending.map((item) => (
                <option key={item.no} value={String(item.no)}>
                  Fee Schedule {item.no} - {formatCurrency(item.balance)} due {formatDate(item.dueDate)}
                </option>
              ))}
              <option value="full">Pay Full Remaining Balance - {formatCurrency(account.balance)}</option>
            </select>
          </div>
          <div className="cms-field">
            <label htmlFor="collect-amount">Amount <span className="req">*</span></label>
            <input id="collect-amount" type="number" min="0" value={amount} disabled={target === "full"} onChange={(event) => setAmount(event.target.value)} />
          </div>
          <div className="cms-field">
            <label htmlFor="collect-date">Payment Date</label>
            <input id="collect-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="cms-field">
            <label htmlFor="collect-method">Payment Method <span className="req">*</span></label>
            <select id="collect-method" value={method} onChange={(event) => setMethod(event.target.value)}>
              {PAYMENT_METHODS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="cms-field">
            <label htmlFor="collect-discount">Discount</label>
            <input id="collect-discount" type="number" min="0" value={discount} onChange={(event) => setDiscount(event.target.value)} />
          </div>
          <div className="cms-field">
            <label htmlFor="collect-fine">Fine</label>
            <input id="collect-fine" type="number" min="0" value={fine} onChange={(event) => setFine(event.target.value)} />
          </div>
          <div className="cms-field">
            <label htmlFor="collect-ref">Transaction / Reference Number {isReferenceRequired ? <span className="req">*</span> : null}</label>
            <input id="collect-ref" value={reference} placeholder={method === "Cash" ? "Optional for cash" : "Reference number"} onChange={(event) => setReference(event.target.value)} />
          </div>
          <div className="cms-field full">
            <label htmlFor="collect-note">Note</label>
            <textarea id="collect-note" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
        </div>
        {error ? <p className="cms-error">{error}</p> : null}
      </div>
    </Modal>
  );
}

/* ------------------------------- Receipt -------------------------------- */
function ReceiptModal({ receipt, onClose }) {
  const visibleRows = (rows) => rows.filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== "-");
  const studentRows = visibleRows([
    ["Student Name", receipt.studentName],
    ["Admission Number", receipt.admissionNo],
    ["Academic Year", receipt.academicYear],
    ["Board", receipt.board],
    ["Academic Level", receipt.academicLevel],
    ["Group", receipt.group],
    ["Program", receipt.program],
    ["Section", receipt.section],
    ["Roll Number", receipt.rollNumber],
  ]);
  const paymentRows = visibleRows([
    ["Payment Type", feeScheduleLabel(receipt.type)],
    ["Fee / Schedule", receipt.feeSchedule ? feeScheduleLabel(receipt.feeSchedule) : ""],
    ["Original Amount", formatCurrency(receipt.originalAmount ?? receipt.baseAmount ?? receipt.amount)],
    ["Discount / Concession", formatCurrency(receipt.discount || 0)],
    ["Fine", formatCurrency(receipt.fine || 0)],
    ["Amount Paid", formatCurrency(receipt.amount)],
    ["Payment Method", receipt.method],
    ["Transaction / Reference Number", receipt.reference],
    ["Payment Date", formatDate(receipt.date)],
    ["Remaining Balance", receipt.balance !== undefined ? formatCurrency(receipt.balance) : ""],
    ["Payment Status", receipt.status],
  ]);
  const collegeContact = [
    receipt.collegeAddress,
    receipt.collegePhone ? `Phone: ${receipt.collegePhone}` : "",
    receipt.collegeEmail ? `Email: ${receipt.collegeEmail}` : "",
    receipt.collegeWebsite ? `Website: ${receipt.collegeWebsite}` : "",
  ].filter(Boolean);

  return (
    <Modal
      title="Payment Receipt"
      onClose={onClose}
      footer={(
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onClose}>Close</button>
          <button className="cms-btn cms-btn-primary" onClick={() => printFeeTarget("receipt")}><Printer size={14} /> Print Receipt</button>
        </>
      )}
    >
      <div className="cms-fee-receipt cms-fee-receipt-print">
        <div className="cms-fee-receipt-head">
          <img src={collegeLogo} alt="Pirnav College logo" />
          <div>
            <strong>{COLLEGE_NAME}</strong>
            {collegeContact.map((line) => <span key={line}>{line}</span>)}
          </div>
        </div>
        <div className="cms-fee-receipt-title">Intermediate College Fee Receipt</div>
        <div className="cms-fee-receipt-meta">
          <span><b>Receipt Number</b> {receipt.receiptNo}</span>
          <span><b>Receipt Date</b> {formatDate(receipt.date)}</span>
        </div>
        <section className="cms-fee-receipt-section">
          <h4>Student Details</h4>
          <table className="cms-fee-receipt-info-table">
            <tbody>
              {studentRows.map(([label, value]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="cms-fee-receipt-section">
          <h4>Payment Details</h4>
          <table className="cms-fee-receipt-info-table">
            <tbody>
              {paymentRows.map(([label, value]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {receipt.breakdown?.length ? (
          <section className="cms-fee-receipt-section">
            <h4>Fee-wise Breakdown</h4>
            <table className="cms-fee-receipt-breakdown">
              <thead>
                <tr>
                  <th>Fee Type</th>
                  <th>Amount</th>
                  <th>Discount</th>
                  <th>Paid Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipt.breakdown.map((item) => (
                  <tr key={item.id}>
                    <td>{item.feeType}</td>
                    <td>{formatCurrency(item.amount)}</td>
                    <td>{formatCurrency(item.discount || 0)}</td>
                    <td>{formatCurrency(item.paidAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
        <div className="cms-fee-receipt-total">
          <span>Amount Paid</span>
          <strong>{formatCurrency(receipt.amount)}</strong>
        </div>
        {receipt.amountInWords ? (
          <div className="cms-fee-receipt-words">
            <span>Amount Paid in Words</span>
            <strong>{receipt.amountInWords}</strong>
          </div>
        ) : null}
        <div className="cms-fee-signature">
          <span>Student / Parent Signature</span>
          <span>Received By / Authorized Signatory</span>
        </div>
        <p className="cms-fee-receipt-note">This is a computer-generated receipt.</p>
      </div>
    </Modal>
  );
}

/* --------------------------- Student fee details -------------------------- */
function StudentFeeAccountScreen({ account, onClose, onCollect, onReceipt, allowCollect = false }) {
  const receiptFallback = (txn) => ({
    ...txn,
    studentName: account.studentName,
    admissionNo: account.admissionNo,
    academicYear: account.academicYear,
    board: account.board,
    academicLevel: account.academicLevel || account.level,
    group: account.group,
    program: account.program || account.programme,
    section: account.section,
    rollNumber: account.rollNumber || account.rollNo,
    balance: account.balance,
  });
  const viewReceipt = async (txn) => {
    const receiptNo = txn.receiptNo && txn.receiptNo !== "-" ? txn.receiptNo : "";
    const paymentId = txn.feePaymentId || txn.paymentId || txn.id;
    try {
      const response = receiptNo
        ? await apiClient.get(apiEndpoints.fee.receiptByNumber(receiptNo))
        : await apiClient.get(apiEndpoints.fee.paymentDetails(paymentId));
      onReceipt(normalizeReceipt(response.data, receiptFallback(txn)));
    } catch {
      if (paymentId) {
        try {
          const response = await apiClient.get(apiEndpoints.fee.paymentDetails(paymentId));
          onReceipt(normalizeReceipt(response.data, receiptFallback(txn)));
          return;
        } catch {
          // Fall through to the row data so the action still opens gracefully.
        }
      }
      onReceipt(receiptFallback(txn));
    }
  };

  return (
    <div className="cms-card cms-fee-account-screen">
      <div className="cms-card-head cms-fee-account-head">
          <div>
            <h3>{account.studentName}</h3>
            <span>{account.admissionNo} &middot; {account.group} / {account.section}</span>
          </div>
          <div className="cms-fee-drawer-actions">
            <button className="cms-btn cms-btn-ghost" onClick={() => printFeeTarget("student")}>
              <Printer size={14} /> Print
            </button>
            {allowCollect ? (
              <button className="cms-btn cms-btn-primary" onClick={onCollect} disabled={account.balance === 0}>
                <WalletCards size={14} /> Collect Payment
              </button>
            ) : null}
            <button className="cms-btn cms-btn-ghost" onClick={onClose}>Back</button>
          </div>
        </div>

        <div className="cms-card-body cms-fee-drawer-body cms-fee-student-print">
          <section className="cms-fee-block">
            <h3>Student Information</h3>
            <div className="cms-fee-kv">
              <div><span>Name</span><strong>{account.studentName}</strong></div>
              <div><span>Admission Number</span><strong>{account.admissionNo}</strong></div>
              <div><span>Roll Number</span><strong>{account.rollNumber}</strong></div>
              <div><span>Group</span><strong>{account.group}</strong></div>
              <div><span>Section</span><strong>{account.section}</strong></div>
              <div><span>Academic Level</span><strong>{account.academicLevel}</strong></div>
              <div><span>Academic Year</span><strong>{account.academicYear}</strong></div>
              <div><span>Admission Date</span><strong>{formatDate(account.admissionDate)}</strong></div>
            </div>
          </section>

          <section className="cms-fee-block">
            <h3>Fee Summary</h3>
            <div className="cms-fee-kv">
              <div><span>Original Fee</span><strong>{formatCurrency(account.totalOriginal)}</strong></div>
              <div><span>Concession</span><strong>{formatCurrency(account.totalConcession)}</strong></div>
              <div><span>Scheduled Fees</span><strong>{formatCurrency(account.courseFee)}</strong></div>
              <div><span>Total Payable</span><strong>{formatCurrency(account.totalPayable)}</strong></div>
              <div><span>Total Paid</span><strong>{formatCurrency(account.totalPaid)}</strong></div>
              <div><span>Outstanding Balance</span><strong>{formatCurrency(account.balance)}</strong></div>
              <div><span>Payment Plan</span><strong>{account.paymentPlan ? feeScheduleLabel(account.paymentPlan) : "-"}</strong></div>
              <div><span>Fee Status</span><strong><StatusBadge status={account.feeStatus} /></strong></div>
            </div>
          </section>

          <section className="cms-fee-block">
            <h3>Applicable Fee Breakdown</h3>
            <div className="cms-table-wrap">
              <table className="cms-table cms-fee-breakdown-table">
                <colgroup>
                  <col className="cms-fee-breakdown-type-col" />
                  <col className="cms-fee-breakdown-money-col" />
                  <col className="cms-fee-breakdown-concession-col" />
                  <col className="cms-fee-breakdown-money-col" />
                  <col className="cms-fee-breakdown-money-col" />
                </colgroup>
                <thead>
                  <tr><th>Fee Type</th><th className="num">Amount</th><th>Concession / Scheme</th><th className="num">Discount</th><th className="num">Payable</th></tr>
                </thead>
                <tbody>
                  {account.feeItems.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.type}</strong></td>
                      <td className="num">{formatCurrency(item.originalAmount)}</td>
                      <td>{item.concessionName || "-"} {item.concessionValue ? `(${item.concessionType === "Percentage" ? `${item.concessionValue}%` : formatCurrency(item.concessionValue)})` : ""}</td>
                      <td className="num">{formatCurrency(item.concessionAmount)}</td>
                      <td className="num"><strong>{formatCurrency(item.payableAmount)}</strong></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><strong>Total Fee</strong></td>
                    <td className="num"><strong>{formatCurrency(account.totalOriginal)}</strong></td>
                    <td />
                    <td className="num"><strong>{formatCurrency(account.totalConcession)}</strong></td>
                    <td className="num"><strong>{formatCurrency(account.totalPayable)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {account.installments.length ? (
            <section className="cms-fee-block">
              <h3>Fee Schedule</h3>
              <div className="cms-table-wrap">
                <table className="cms-table">
                  <thead>
                    <tr><th>Fee Schedule</th><th>Due Date</th><th className="num">Amount</th><th className="num">Paid</th><th className="num">Balance</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {account.installments.map((item) => (
                      <tr key={item.no}>
                        <td><strong>Fee Schedule {item.no}</strong></td>
                        <td>{formatDate(item.dueDate)}</td>
                        <td className="num">{formatCurrency(item.amount)}</td>
                        <td className="num">{formatCurrency(item.paid)}</td>
                        <td className="num">{formatCurrency(item.balance)}</td>
                        <td><StatusBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="cms-fee-block">
            <h3>Payment History</h3>
            <div className="cms-table-wrap">
              <table className="cms-table">
                <thead>
                  <tr><th>Receipt No</th><th>Payment Type</th><th className="num">Amount</th><th>Method</th><th>Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {account.transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td><strong>{txn.receiptNo}</strong></td>
                      <td>{feeScheduleLabel(txn.type)}</td>
                      <td className="num">{formatCurrency(txn.amount)}</td>
                      <td>{txn.method}</td>
                      <td>{formatDate(txn.date)}</td>
                      <td>
                        <button className="cms-action-btn" title="View receipt" onClick={() => viewReceipt(txn)}>
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
      </div>
    </div>
  );
}

/* ----------------------------- Student ledger ---------------------------- */
function LedgerTab({ accounts, onView, onPrint, masters, loading = false, error = "" }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ academicYear: "", group: "", section: "", paymentPlan: "", feeStatus: "" });
  const [page, setPage] = useState(1);
  useEffect(() => {
    const nextAcademicYear = masters.selectedAcademicYearId ? String(masters.selectedAcademicYearId) : "";
    setFilters((current) => {
      if (String(current.academicYear || "") === nextAcademicYear) return current;
      return { ...current, academicYear: nextAcademicYear, group: "", section: "" };
    });
    setPage(1);
  }, [masters.selectedAcademicYearId]);
  const setSearchTerm = (value) => {
    setSearch(value);
    setPage(1);
  };
  const setFilter = (key) => (value) => {
    setFilters((current) => ({ ...current, [key]: value, ...(key === "group" ? { section: "" } : {}) }));
    setPage(1);
  };

  const optionLabel = (list, value) => list?.find((option) => String(option.value) === String(value))?.label || "";
  const selectedYearLabel = optionLabel(masters.years, filters.academicYear);
  const selectedGroupLabel = optionLabel(masters.groups, filters.group);
  const groupOptions = masters.groups.filter((item) => (
    matchesAnyNormalized(filters.academicYear, selectedYearLabel, item.academicYearId, item.academicYearName)
  ));
  const sectionOptions = masters.sections.filter((item) => (
    matchesAnyNormalized(filters.academicYear, selectedYearLabel, item.academicYearId, item.academicYearName)
    && matchesAnyNormalized(filters.group, selectedGroupLabel, item.groupId, item.groupName)
  ));
  const paymentPlanOptions = PAYMENT_PLANS.map((plan) => ({ value: plan, label: feeScheduleLabel(plan) }));
  const rows = normalizeFeeAccountDataset(accounts.filter((item) => {
    const term = search.trim().toLowerCase();
    const selectedSectionLabel = optionLabel(sectionOptions, filters.section);
    const matchesSearch = !term
      || String(item.studentName || "").toLowerCase().includes(term)
      || String(item.admissionNo || "").toLowerCase().includes(term);
    return matchesSearch
      && matchesAnyNormalized(filters.academicYear, selectedYearLabel, item.academicYearId, item.academicYear)
      && matchesAnyNormalized(filters.group, selectedGroupLabel, item.groupId, item.group, item.program, `${item.group || ""} / ${item.section || ""}`)
      && matchesAnyNormalized(filters.section, selectedSectionLabel, item.sectionId, item.section, `${item.group || ""} / ${item.section || ""}`)
      && matchesAnyNormalized(filters.paymentPlan, feeScheduleLabel(filters.paymentPlan), item.paymentPlan, feeScheduleLabel(item.paymentPlan))
      && matchesAnyNormalized(filters.feeStatus, filters.feeStatus, item.feeStatus);
  }));
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginatedRows = pageItems(rows, page);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="cms-card">
      <div className="cms-card-head">
        <h2>Student Fee Ledger</h2>
        <span className="cms-badge cms-badge-info">{rows.length} of {accounts.length} students</span>
      </div>
      <div className="cms-card-body cms-fee-toolbar cms-fee-controls">
        <div className="cms-fee-search">
          <Search3DIcon size={15} />
          <input value={search} placeholder="Search by student name or admission number" onChange={(event) => setSearchTerm(event.target.value)} />
        </div>
        <div className="cms-fee-filter-row">
          <SelectFilter label="Academic Year" value={filters.academicYear} options={masters.years} onChange={setFilter("academicYear")} />
          <SelectFilter label="Group" value={filters.group} options={groupOptions} onChange={setFilter("group")} />
          <SelectFilter label="Section" value={filters.section} options={sectionOptions} onChange={setFilter("section")} />
          <SelectFilter label="Payment Plan" value={filters.paymentPlan} options={paymentPlanOptions} onChange={setFilter("paymentPlan")} />
          <SelectFilter label="Fee Status" value={filters.feeStatus} options={["Paid", "Partial", "Due", "Overdue"]} onChange={setFilter("feeStatus")} />
        </div>
      </div>
      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>Admission No</th><th>Student Name</th><th>Group</th><th>Section</th><th>Payment Plan</th>
              <th className="num">Total Payable</th><th className="num">Total Paid</th><th className="num">Balance</th>
              <th>Next Due Date</th><th>Fee Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="cms-fee-empty-row">Loading fee accounts...</td></tr>
            ) : error ? (
              <tr><td colSpan={11} className="cms-fee-empty-row">Unable to load fee accounts: {error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="cms-fee-empty-row">No students match the current search and filters.</td></tr>
            ) : paginatedRows.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.admissionNo}</strong></td>
                <td>{item.studentName}</td>
                <td>{item.group}</td>
                <td>{item.section}</td>
                <td>{item.paymentPlan ? feeScheduleLabel(item.paymentPlan) : "-"}</td>
                <td className="num">{formatCurrency(item.totalPayable)}</td>
                <td className="num">{formatCurrency(item.totalPaid)}</td>
                <td className="num">{formatCurrency(item.balance)}</td>
                <td>{item.nextDueDate ? formatDate(item.nextDueDate) : "-"}</td>
                <td><StatusBadge status={item.feeStatus} /></td>
                <td>
                  <div className="cms-actions">
                    <button className="cms-action-btn" title="View fee account" aria-label="View fee account" onClick={() => onView(item.id)}>
                      <Eye size={15} />
                    </button>
                    <button className="cms-action-btn" title="Print fee statement" aria-label="Print fee statement" onClick={() => onPrint(item.id)}>
                      <Printer size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination page={page} totalItems={rows.length} onPageChange={setPage} />
    </div>
  );
}

function FeeCollectionTab({ accounts, onCollect, loading = false, error = "" }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const setSearchTerm = (value) => {
    setSearch(value);
    setPage(1);
  };
  const rows = normalizeFeeAccountDataset(accounts.filter((item) => {
    const term = search.trim().toLowerCase();
    return !term
      || item.studentName.toLowerCase().includes(term)
      || item.admissionNo.toLowerCase().includes(term);
  }));
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginatedRows = pageItems(rows, page);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="cms-card">
      <div className="cms-card-head">
        <h2>Fee Collection</h2>
        <span className="cms-badge cms-badge-info">{rows.length} accounts</span>
      </div>
      <div className="cms-card-body cms-fee-toolbar cms-fee-controls cms-fee-search-only">
        <div className="cms-fee-search">
          <Search3DIcon size={15} />
          <input value={search} placeholder="Search by student name or admission number" onChange={(event) => setSearchTerm(event.target.value)} />
        </div>
      </div>
      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>Admission No</th><th>Student</th><th>Group / Section</th><th className="num">Payable</th>
              <th className="num">Paid</th><th className="num">Balance</th><th>Next Due</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="cms-fee-empty-row">Loading fee accounts...</td></tr>
            ) : error ? (
              <tr><td colSpan={9} className="cms-fee-empty-row">Unable to load fee accounts: {error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="cms-fee-empty-row">No fee accounts match the current search and filters.</td></tr>
            ) : paginatedRows.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.admissionNo}</strong></td>
                <td>{item.studentName}</td>
                <td>{item.group} / {item.section}</td>
                <td className="num">{formatCurrency(item.totalPayable)}</td>
                <td className="num">{formatCurrency(item.totalPaid)}</td>
                <td className="num">{formatCurrency(item.balance)}</td>
                <td>{item.nextDueDate ? formatDate(item.nextDueDate) : "-"}</td>
                <td><StatusBadge status={item.feeStatus} /></td>
                <td>
                  <button className="cms-action-btn" title="Open fee account" aria-label="Open fee account" disabled={item.balance === 0} onClick={() => onCollect(item.id)}>
                    <WalletCards size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination page={page} totalItems={rows.length} onPageChange={setPage} />
    </div>
  );
}

/* ----------------------------- Fee structure ----------------------------- */
function StructureFormModal({ initial, structures = [], onClose, onSaved, feeTypes, masters, masterErrors = {}, masterLoading = false }) {
  const initialProgram = initial?.programId || "";
  const initialValues = initial || {
    boardId: masters.selectedBoardId ? String(masters.selectedBoardId) : "",
    academicYear: "",
    academicYearId: masters.selectedAcademicYearId ? String(masters.selectedAcademicYearId) : "",
    group: "",
    groupId: "",
    programId: "",
    program: "",
    admissionFee: 0,
    courseFee: 0,
    status: "Active",
  };
  const configuredFeeItems = feeTypeRowsFromMaster(feeTypes);
  const initialFeeItems = initial
    ? feeItemsWithMasterRows(feeTypes, initial.feeItems || [])
    : configuredFeeItems;
  const [values, setValues] = useState({
    ...initialValues,
    boardId: initialValues.boardId || (masters.selectedBoardId ? String(masters.selectedBoardId) : ""),
    academicYearId: initialValues.academicYearId || (masters.selectedAcademicYearId ? String(masters.selectedAcademicYearId) : ""),
    academicYear: initialValues.academicYear || optionLabel(masters.years, masters.selectedAcademicYearId),
    programId: initialProgram,
    program: initial?.program || "",
    feeItems: initialFeeItems,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [programOptions, setProgramOptions] = useState([]);
  const [programLoading, setProgramLoading] = useState(false);
  const [programError, setProgramError] = useState("");
  const programRequestRef = useRef(0);
  const savingRef = useRef(false);
  const selectedBoardLabel = optionLabel(masters.boards, values.boardId);
  const selectedYearLabel = optionLabel(masters.years, values.academicYearId) || values.academicYear;
  const groupOptions = useMemo(() => (
    masters.groups.filter((item) => (
      matchesContext(values.boardId, selectedBoardLabel, item.boardId, item.boardName)
      && matchesContext(values.academicYearId, selectedYearLabel, item.academicYearId, item.academicYearName)
    ))
  ), [masters.groups, selectedBoardLabel, selectedYearLabel, values.academicYearId, values.boardId]);

  useEffect(() => {
    if (initial || values.feeItems.length || !configuredFeeItems.length) return;
    setValues((current) => (
      current.feeItems.length ? current : { ...current, feeItems: configuredFeeItems }
    ));
  }, [configuredFeeItems, initial, values.feeItems.length]);

  useEffect(() => {
    if (initial) return;
    const nextBoardId = masters.selectedBoardId ? String(masters.selectedBoardId) : "";
    const nextAcademicYearId = masters.selectedAcademicYearId ? String(masters.selectedAcademicYearId) : "";
    if (!nextBoardId && !nextAcademicYearId) return;
    setValues((current) => {
      if (String(current.boardId || "") === nextBoardId && String(current.academicYearId || "") === nextAcademicYearId) return current;
      return {
        ...current,
        boardId: nextBoardId || current.boardId,
        academicYearId: nextAcademicYearId || current.academicYearId,
        academicYear: optionLabel(masters.years, nextAcademicYearId) || current.academicYear,
        group: "",
        groupId: "",
        programId: "",
        program: "",
      };
    });
  }, [initial, masters.selectedAcademicYearId, masters.selectedBoardId, masters.years]);

  useEffect(() => {
    if (!initial || !configuredFeeItems.length) return;
    setValues((current) => ({
      ...current,
      feeItems: feeItemsWithMasterRows(feeTypes, current.feeItems),
    }));
  }, [configuredFeeItems.length, feeTypes, initial]);

  useEffect(() => {
    const groupId = values.groupId;
    const requestId = programRequestRef.current + 1;
    programRequestRef.current = requestId;
    setProgramOptions([]);
    setProgramError("");
    if (!groupId) {
      setProgramLoading(false);
      return undefined;
    }
    setProgramLoading(true);
    apiClient.get(apiEndpoints.programs.byGroup(groupId))
      .then((response) => {
        if (programRequestRef.current !== requestId) return;
        const options = getCollection(response.data).map(programOption).filter(Boolean);
        setProgramOptions(options);
        setValues((current) => {
          if (String(current.groupId) !== String(groupId)) return current;
          const selectedProgram = options.find((item) => item.value === String(current.programId));
          if (selectedProgram) return { ...current, program: selectedProgram.label };
          return {
            ...current,
            programId: options[0]?.value || "",
            program: options[0]?.label || "",
          };
        });
      })
      .catch((err) => {
        if (programRequestRef.current !== requestId) return;
        setProgramError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (programRequestRef.current === requestId) setProgramLoading(false);
      });
    return undefined;
  }, [values.groupId]);

  const feeItemsForContext = (currentItems = []) => (
    feeItemsWithMasterRows(feeTypes, currentItems)
  );

  const changeGroup = (groupId) => {
    const group = groupOptions.find((item) => item.value === groupId);
    setValues((current) => ({
      ...current,
      groupId,
      group: group?.label || "",
      academicLevelId: group?.academicLevelId || current.academicLevelId || "",
      programId: "",
      program: "",
      feeItems: feeItemsForContext(current.feeItems),
    }));
  };

  const changeProgram = (programId) => {
    const program = programOptions.find((item) => item.value === programId);
    setValues((current) => ({
      ...current,
      programId,
      program: program?.label || "",
    }));
  };

  const update = (key, value) => setValues((current) => {
    const nextGroup = key === "group" ? value : current.group;
    const nextCourseFee = current.courseFee;
    const next = {
      ...current,
      [key]: value,
      ...(["boardId", "academicYearId"].includes(key) ? { group: "", groupId: "", programId: "", program: "", feeItems: current.feeItems } : {}),
      ...(key === "group" ? { group: nextGroup, courseFee: nextCourseFee } : {}),
    };
    if (key === "admissionFee" || key === "courseFee" || key === "group") {
      const type = key === "admissionFee" ? "Admission Fee" : "Course Fee";
      next.feeItems = current.feeItems.map((item) => (
        item.type === type ? { ...item, originalAmount: Number(key === "admissionFee" ? value || 0 : nextCourseFee || value || 0), selected: true } : item
      ));
    }
    return next;
  });

  const updateFeeItem = (id, patch) => {
    setValues((current) => {
      const feeItems = dedupeConfiguredFeeItems(current.feeItems.map((item) => (item.id === id ? { ...item, ...patch } : item)));
      const admissionFee = feeItems.find((item) => item.type === "Admission Fee")?.originalAmount ?? current.admissionFee;
      const courseFee = feeItems.find((item) => item.type === "Course Fee")?.originalAmount ?? current.courseFee;
      return { ...current, feeItems, admissionFee, courseFee };
    });
  };

  const buildStructureItemPayload = (item, includeFeeType = true) => {
    const feeTypeId = Number(item.feeTypeId || item.id || 0);
    const amount = Number(item.originalAmount || 0);
    return {
      ...(includeFeeType ? { feeTypeId } : {}),
      rule: item.required ? "Mandatory" : "Optional",
      amount,
      isActive: item.selected !== false,
    };
  };

  const buildStructurePayload = (items = []) => {
    const programId = Number(values.programId || 0);
    if (initial?.id) {
      return {
        ...(programId ? { programId } : {}),
        isActive: values.status !== "Inactive",
      };
    }
    return {
      boardId: Number(values.boardId || values.board || 0),
      academicYearId: Number(values.academicYearId || values.academicYear || 0),
      groupId: Number(values.groupId || values.group || 0),
      ...(programId ? { programId } : {}),
      items: items.map((item) => buildStructureItemPayload(item, true)),
    };
  };

  const save = async () => {
    if (savingRef.current) return null;
    const configuredItems = dedupeConfiguredFeeItems(values.feeItems).filter((item) => item.structureItemId || item.required || Number(item.originalAmount || 0) > 0);
    const activeItems = configuredItems.filter((item) => item.selected !== false);
    if (!values.academicYear && !values.academicYearId) return setError("Academic Year is required");
    if (!values.group && !values.groupId) return setError("Group is required");
    if (!values.programId) return setError("Program is required");
    if (!activeItems.length) return setError("Select at least one active fee type for this structure");
    if (values.feeItems.some((item) => Number(item.originalAmount || 0) < 0)) return setError("Fee amount cannot be negative");
    if (activeItems.some((item) => Number(item.originalAmount || 0) <= 0)) return setError("Fee amount must be greater than 0 for active fee types.");
    const canUseFeeStructureApi = hasBackendFeeTypeIds(feeTypes);
    if (!canUseFeeStructureApi) return setError("Fee structures require saved backend fee types. Please save fee types successfully before creating a structure.");
    if (configuredItems.some((item) => !Number(item.feeTypeId || item.id))) return setError("Only saved backend fee types can be used for API fee structures.");
    const duplicate = structures.some((row) => (
      row.id !== initial?.id
      && row.status === "Active"
      && String(row.academicYearId || row.academicYear) === String(values.academicYearId || values.academicYear)
      && String(row.groupId || row.group) === String(values.groupId || values.group)
      && String(row.programId || row.program || "regular") === String(values.programId || values.program || "regular")
    ));
    if (duplicate) return setError("A fee structure already exists for the selected Academic Year, Group and Program.");
    savingRef.current = true;
    setSaving(true);
    try {
      const structurePayload = buildStructurePayload(configuredItems);
      const structureResponse = initial?.id
        ? await apiClient.put(apiEndpoints.fee.updateStructure(initial.id), structurePayload)
        : await apiClient.post(apiEndpoints.fee.createStructure, structurePayload);
      const feeStructureId = initial?.id || read(getObject(structureResponse.data), "feeStructureId", "FeeStructureId", "id", "Id");
      if (!feeStructureId) throw new Error("Fee structure saved, but the structure ID was not returned.");
      if (initial?.id) {
        await Promise.all(configuredItems.map((item) => (
          item.structureItemId
            ? apiClient.put(apiEndpoints.fee.updateStructureItem(item.structureItemId), buildStructureItemPayload(item, false))
            : apiClient.post(apiEndpoints.fee.addStructureItem(feeStructureId), buildStructureItemPayload(item, true))
        )));
      }
      onSaved(initial?.id ? "Fee structure updated" : "Fee structure added", true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
    return null;
  };

  const displayFeeItems = dedupeConfiguredFeeItems(values.feeItems);

  return (
    <Modal
      title={initial?.id ? "Edit Fee Structure" : "Add Fee Structure"}
      onClose={onClose}
      footer={(
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cms-btn cms-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Fee Structure"}</button>
        </>
      )}
    >
      <div className="cms-form-grid cols-3">
        <div className="cms-field">
          <label htmlFor="fs-board">Board <span className="req">*</span></label>
          <select id="fs-board" value={values.boardId || ""} onChange={(event) => update("boardId", event.target.value)}>
            <option value="">{masterErrors.boards ? "Unable to load boards" : masterLoading && !masters.boards.length ? "Loading boards..." : masters.boards.length ? "Select Board" : "No boards available"}</option>
            {masters.boards.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="fs-year">Academic Year <span className="req">*</span></label>
          <select id="fs-year" value={values.academicYearId || values.academicYear} onChange={(event) => {
            update("academicYearId", event.target.value);
            update("academicYear", masters.years.find((item) => item.value === event.target.value)?.label || event.target.value);
          }}>
            <option value="">{masterErrors.years ? "Unable to load academic years" : masterLoading && !masters.years.length ? "Loading academic years..." : masters.years.length ? "Select Academic Year" : "No academic years available"}</option>
            {masters.years.map((year) => <option key={year.value} value={year.value}>{year.label}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="fs-group">Group <span className="req">*</span></label>
          <select id="fs-group" value={values.groupId || ""} onChange={(event) => changeGroup(event.target.value)} disabled={!values.boardId || !values.academicYearId}>
            <option value="">{!values.boardId || !values.academicYearId ? "Select Board/Year first" : masterErrors.groups ? "Unable to load groups" : masterLoading && !groupOptions.length ? "Loading groups..." : groupOptions.length ? "Select Group" : "No groups available"}</option>
            {groupOptions.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="fs-program">Program</label>
          <select id="fs-program" value={values.programId || ""} onChange={(event) => changeProgram(event.target.value)} disabled={!values.groupId || programLoading || !programOptions.length}>
            <option value="">{!values.groupId ? "Select Group first" : programLoading ? "Loading programs..." : programError ? "Unable to load programs" : programOptions.length ? "Select Program" : "No programs available"}</option>
            {programOptions.map((program) => <option key={program.value} value={program.value}>{program.label}</option>)}
          </select>
        </div>
      </div>
      <div className="cms-fee-structure-items">
        <div className="cms-fee-structure-items-head">
          <h4>Configured Fee Types</h4>
          <span>{values.academicYear} / {values.group || "Group"} / {programOptions.find((item) => item.value === values.programId)?.label || "Program"}</span>
        </div>
        <div className="cms-table-wrap cms-fee-config-wrap">
          <table className="cms-table cms-fee-config-table cms-fee-setup-table cms-fee-types-table">
            <colgroup>
              <col style={{ width: "34%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "24%" }} />
            </colgroup>
            <thead>
              <tr><th>Fee Type</th><th>Rule</th><th>Status</th><th className="num">Amount</th></tr>
            </thead>
            <tbody>
              {displayFeeItems.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.type}</strong>{item.required ? <small className="cms-fee-required">Mandatory</small> : null}</td>
                  <td>
                    <select
                      className="cms-mini-input"
                      value={item.required ? "Mandatory" : "Optional"}
                      onChange={(event) => updateFeeItem(item.id, { required: event.target.value === "Mandatory" })}
                    >
                      <option value="Mandatory">Mandatory</option>
                      <option value="Optional">Optional</option>
                    </select>
                  </td>
                  <td>
                    <select
                      className="cms-mini-input"
                      value={item.selected === false ? "Inactive" : "Active"}
                      onChange={(event) => updateFeeItem(item.id, { selected: event.target.value === "Active" })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="num">
                    <input
                      className="cms-mini-input"
                      type="number"
                      min="0"
                      value={item.originalAmount}
                      onChange={(event) => updateFeeItem(item.id, { originalAmount: Number(event.target.value || 0), selected: Number(event.target.value || 0) > 0 || item.required })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cms-fee-progress-head">
          <span>Total Active Fees</span>
          <strong>{formatCurrency(displayFeeItems.filter((item) => item.selected).reduce((sum, item) => sum + Number(item.originalAmount || 0), 0))}</strong>
        </div>
        <p className="cms-fee-note"><CheckCircle size={14} /> Manage the reusable fee type list from the Fee Types tab, then adjust amounts here for this structure.</p>
      </div>
      {error ? <p className="cms-error">{error}</p> : null}
    </Modal>
  );
}

function FeeTypeFormModal({ initial, feeTypes, onClose, onSaved }) {
  const [draft, setDraft] = useState({
    name: initial?.name || "",
    category: initial?.category || FEE_TYPE_CATEGORIES[1],
    status: initial?.status || "Active",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const saveType = async () => {
    const name = draft.name.trim();
    if (!name) return setError("Fee Type Name is required");
    const duplicate = feeTypes.some((item) => item.id !== initial?.id && item.name.trim().toLowerCase() === name.toLowerCase());
    if (duplicate) return setError(`${name} already exists`);
    const nextType = {
      id: initial?.id || `custom-${Date.now()}`,
      name,
      category: draft.category || "Other",
      status: draft.status || "Active",
    };
    setSaving(true);
    try {
      await onSaved(nextType, initial?.id ? "Fee type updated" : "Fee type added");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
    return null;
  };

  return (
    <Modal
      title={initial?.id ? "Edit Fee Type" : "Add Fee Type"}
      size="sm"
      onClose={onClose}
      footer={(
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cms-btn cms-btn-primary" onClick={saveType} disabled={saving}>{saving ? "Saving..." : "Save Fee Type"}</button>
        </>
      )}
    >
      <div className="cms-form-grid">
        <div className="cms-field">
          <label htmlFor="ft-name">Fee Type Name <span className="req">*</span></label>
          <input id="ft-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </div>
        <div className="cms-field">
          <label htmlFor="ft-category">Category</label>
          <select id="ft-category" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
            {FEE_TYPE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="ft-status">Status</label>
          <select id="ft-status" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>
      {error ? <p className="cms-error">{error}</p> : null}
    </Modal>
  );
}

const feeTypePayload = (item) => ({
  FeeTypeName: item.name,
  FeeTypeCode: item.code || feeTypeCodeFor(item.name),
  Category: item.category || "Other",
  IsActive: item.status !== "Inactive",
});

const scholarshipPayload = (item) => ({
  ScholarshipName: item.name,
  DiscountType: item.discountType,
  DiscountValue: Number(item.discountValue || 0),
  IsActive: item.status !== "Inactive",
});

function FeeTypesTab({ feeTypes, onChange, onToast, onRefresh }) {
  const [formItem, setFormItem] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(feeTypes.length / PAGE_SIZE));
  const paginatedFeeTypes = pageItems(feeTypes, page);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const saveType = async (item, message) => {
    if (Number(item.id)) {
      await apiClient.put(apiEndpoints.fee.updateFeeType(item.id), feeTypePayload(item));
    } else {
      await apiClient.post(apiEndpoints.fee.createFeeType, feeTypePayload(item));
    }
    onToast(message);
    setFormItem(null);
    await onRefresh();
  };

  const deleteType = async (item) => {
    setDeletingId(item.id);
    try {
      if (Number(item.id)) {
        await apiClient.delete(apiEndpoints.fee.deleteFeeType(item.id));
        await onRefresh();
      } else {
        onChange(feeTypes.filter((feeType) => feeType.id !== item.id));
      }
      onToast("Fee type deleted");
    } catch (err) {
      onToast(getApiErrorMessage(err));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="cms-card cms-fee-types-card">
      <div className="cms-card-head">
        <div>
          <h2>Fee Types</h2>
          <p>Manage the reusable master list of fee types.</p>
        </div>
        <button className="cms-btn cms-btn-primary" onClick={() => setFormItem({})}><Plus size={14} /> Add Fee Type</button>
      </div>
      <div className="cms-card-body cms-fee-toolbar">
        <div className="cms-table-wrap cms-fee-config-wrap">
          <table className="cms-table cms-fee-config-table cms-fee-types-table">
            <thead>
              <tr><th>Fee Type</th><th>Category</th><th>Status</th><th className="cms-fee-actions-col">Actions</th></tr>
            </thead>
            <tbody>
              {paginatedFeeTypes.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong>{String(item.id).startsWith("custom-") ? <small className="cms-fee-required">Local only</small> : null}</td>
                  <td>{item.category || "Other"}</td>
                  <td><span className={`cms-badge ${item.status === "Active" ? "cms-badge-active" : "cms-badge-inactive"}`}>{item.status}</span></td>
                  <td className="cms-fee-actions-col">
                    <div className="cms-actions">
                      <button type="button" className="cms-action-btn" title="Edit fee type" aria-label="Edit fee type" onClick={() => setFormItem(item)}><Pencil size={15} /></button>
                      <button type="button" className="cms-action-btn" title="Delete fee type" aria-label="Delete fee type" disabled={deletingId === item.id} onClick={() => deleteType(item)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!feeTypes.length ? <tr><td colSpan={4} className="cms-fee-empty-row">No fee types found.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalItems={feeTypes.length} onPageChange={setPage} />
        <p className="cms-fee-note"><CheckCircle size={14} /> Fee Types define what can be charged. Amount, rule and active status are configured inside Fee Structure.</p>
      </div>
      {formItem ? (
        <FeeTypeFormModal
          initial={formItem.id ? formItem : null}
          feeTypes={feeTypes}
          onClose={() => setFormItem(null)}
          onSaved={saveType}
        />
      ) : null}
    </div>
  );
}

function ScholarshipFormModal({ initial, scholarships, onClose, onSaved }) {
  const [draft, setDraft] = useState({
    name: initial?.name || "",
    discountType: initial?.discountType || "Percentage",
    discountValue: initial?.discountValue ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const saveScholarship = async () => {
    const name = draft.name.trim();
    const discountValue = Number(draft.discountValue || 0);
    if (!name) return setError("Scholarship Name is required");
    if (!Number.isFinite(discountValue) || discountValue < 0) return setError("Discount Value must be 0 or greater");
    if (draft.discountType === "Percentage" && discountValue > 100) return setError("Percentage cannot exceed 100");
    if (scholarships.some((item) => item.id !== initial?.id && item.name.trim().toLowerCase() === name.toLowerCase())) return setError(`${name} already exists`);

    const nextScholarship = {
      id: initial?.id || `SCH-${Date.now()}`,
      name,
      discountType: draft.discountType,
      discountValue,
      status: initial?.status || "Active",
    };
    const nextScholarships = initial?.id
      ? scholarships.map((item) => (item.id === initial.id ? { ...item, ...nextScholarship } : item))
      : [...scholarships, nextScholarship];
    setSaving(true);
    try {
      await onSaved(nextScholarships, initial?.id ? "Scholarship updated" : "Scholarship added", nextScholarship);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
    return null;
  };

  return (
    <Modal
      title={initial?.id ? "Edit Scholarship" : "Add Scholarship"}
      size="sm"
      onClose={onClose}
      footer={(
        <>
          <button className="cms-btn cms-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="cms-btn cms-btn-primary" onClick={saveScholarship} disabled={saving}>{saving ? "Saving..." : "Save Scholarship"}</button>
        </>
      )}
    >
      <div className="cms-form-grid">
        <div className="cms-field">
          <label htmlFor="sch-name">Scholarship Name</label>
          <input id="sch-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        </div>
        <div className="cms-field">
          <label htmlFor="sch-type">Discount Type</label>
          <select id="sch-type" value={draft.discountType} onChange={(event) => setDraft((current) => ({ ...current, discountType: event.target.value }))}>
            <option value="Percentage">Percentage</option>
            <option value="Fixed Amount">Fixed Amount</option>
          </select>
        </div>
        <div className="cms-field">
          <label htmlFor="sch-value">Discount Value</label>
          <input id="sch-value" type="number" min="0" max={draft.discountType === "Percentage" ? "100" : undefined} value={draft.discountValue} onChange={(event) => setDraft((current) => ({ ...current, discountValue: event.target.value }))} />
        </div>
      </div>
      {error ? <p className="cms-error">{error}</p> : null}
    </Modal>
  );
}

function ScholarshipsTab({ scholarships, onChange, onToast, onRefresh }) {
  const [formItem, setFormItem] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(scholarships.length / PAGE_SIZE));
  const paginatedScholarships = pageItems(scholarships, page);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const saveScholarship = async (nextScholarships, message, item) => {
    const payload = scholarshipPayload(item);
    if (Number(item.id)) {
      await apiClient.put(apiEndpoints.fee.updateScholarship(item.id), payload);
    } else {
      await apiClient.post(apiEndpoints.fee.createScholarship, payload);
    }
    onChange(nextScholarships);
    onToast(message);
    setFormItem(null);
    await onRefresh();
  };

  const deleteScholarship = async (item) => {
    setDeletingId(item.id);
    try {
      if (Number(item.id)) {
        await apiClient.delete(apiEndpoints.fee.deleteScholarship(item.id));
        await onRefresh();
      } else {
        onChange(scholarships.filter((scholarship) => scholarship.id !== item.id));
      }
      onToast("Scholarship deleted");
    } catch (err) {
      onToast(getApiErrorMessage(err));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="cms-card cms-fee-types-card">
      <div className="cms-card-head">
        <div>
          <h2>Scholarships</h2>
          <p>Manage scholarship and concession schemes available for student fee assignments.</p>
        </div>
        <button className="cms-btn cms-btn-primary" onClick={() => setFormItem({})}><Plus size={14} /> Add Scholarship</button>
      </div>
      <div className="cms-card-body cms-fee-toolbar">
        <div className="cms-table-wrap">
          <table className="cms-table cms-fee-setup-table cms-fee-scholarship-table">
            <colgroup>
              <col className="cms-fee-scholarship-name-col" />
              <col className="cms-fee-scholarship-type-col" />
              <col className="cms-fee-scholarship-value-col" />
              <col className="cms-fee-scholarship-actions-col" />
            </colgroup>
            <thead>
              <tr><th>Scholarship</th><th>Type</th><th className="cms-fee-value-col">Value</th><th className="cms-fee-actions-col">Actions</th></tr>
            </thead>
            <tbody>
              {paginatedScholarships.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.discountType}</td>
                  <td className="cms-fee-value-col">{scholarshipValueLabel(item)}</td>
                  <td className="cms-fee-actions-col">
                    <div className="cms-actions">
                      <button type="button" className="cms-action-btn" title="Edit scholarship" aria-label="Edit scholarship" onClick={() => setFormItem(item)}><Pencil size={15} /></button>
                      <button type="button" className="cms-action-btn" title="Delete scholarship" aria-label="Delete scholarship" disabled={deletingId === item.id} onClick={() => deleteScholarship(item)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!scholarships.length ? <tr><td colSpan={4} className="cms-fee-empty-row">No scholarships found.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalItems={scholarships.length} onPageChange={setPage} />
      </div>
      {formItem ? (
        <ScholarshipFormModal
          initial={formItem.id ? formItem : null}
          scholarships={scholarships}
          onClose={() => setFormItem(null)}
          onSaved={saveScholarship}
        />
      ) : null}
    </div>
  );
}

function StructureTab({ structures, onToast, onRefresh, loading, error, feeTypes, masters, masterErrors }) {
  const [editing, setEditing] = useState(null);
  const [loadingEditId, setLoadingEditId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(structures.length / PAGE_SIZE));
  const paginatedStructures = pageItems(structures, page);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const copyStructure = (row) => {
    setEditing({
      ...row,
      id: "",
      status: "Active",
      feeItems: (row.feeItems || []).map((item) => ({
        ...item,
        structureId: "",
      })),
    });
  };

  const editStructure = async (row) => {
    setLoadingEditId(row.id);
    try {
      const [structureResult, itemsResult] = await Promise.allSettled([
        apiClient.get(apiEndpoints.fee.getStructureById(row.id)),
        apiClient.get(apiEndpoints.fee.getStructureItems(row.id)),
      ]);
      const detail = structureResult.status === "fulfilled" ? getObject(structureResult.value.data) : row;
      const structureContext = { ...stripFeeItemCollections(row), ...stripFeeItemCollections(detail) };
      const itemRows = itemsResult.status === "fulfilled"
        ? getCollection(itemsResult.value.data).map((item) => ({ ...structureContext, ...item }))
        : [];
      const [normalized] = normalizeFeeStructureRows(itemRows.length ? itemRows : [{ ...row, ...detail }], feeTypes, masters);
      setEditing({ ...row, ...normalized, feeItems: dedupeConfiguredFeeItems(normalized?.feeItems?.length ? normalized.feeItems : row.feeItems) });
    } catch (err) {
      onToast(getApiErrorMessage(err));
      setEditing(row);
    } finally {
      setLoadingEditId("");
    }
  };

  const deleteStructure = async (row) => {
    if (!row.id) return;
    setDeletingId(row.id);
    try {
      await apiClient.delete(apiEndpoints.fee.deleteStructure(row.id));
      onToast("Fee structure deleted");
      onRefresh();
    } catch (err) {
      onToast(getApiErrorMessage(err));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="cms-card">
      <div className="cms-card-head">
        <h2>Fee Structure</h2>
        <button className="cms-btn cms-btn-primary" onClick={() => setEditing({})}><Plus size={14} /> Add Fee Structure</button>
      </div>
      <div className="cms-table-wrap">
        <table className="cms-table cms-fee-setup-table cms-fee-structure-table">
          <colgroup>
            <col className="cms-fee-structure-year-col" />
            <col className="cms-fee-structure-group-col" />
            <col className="cms-fee-structure-program-col" />
            <col className="cms-fee-structure-types-col" />
            <col className="cms-fee-structure-total-col" />
            <col className="cms-fee-structure-actions-col" />
          </colgroup>
          <thead>
            <tr><th>Academic Year</th><th>Group</th><th>Program</th><th>Configured Fee Types</th><th className="num cms-fee-total-col">Total Fee</th><th className="cms-fee-actions-col">Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="cms-fee-empty-row">Loading fee structures...</td></tr>
            ) : structures.length === 0 ? (
              <tr><td colSpan={6} className="cms-fee-empty-row">{error || "No fee structures found."}</td></tr>
            ) : paginatedStructures.map((row) => {
              const feeItems = row.feeItems || [];
              const activeItems = feeItems.filter((item) => item.selected);
              const activeTotal = row.totalFee ?? activeItems.reduce((sum, item) => sum + Number(item.originalAmount || item.payableAmount || 0), 0);
              return (
                <tr key={row.id}>
                  <td><strong>{row.academicYear}</strong></td>
                  <td>{row.group}</td>
                  <td>{row.program || "Regular"}</td>
                  <td>
                    <div className="cms-fee-type-list">
                      {activeItems.slice(0, 4).map((item) => (
                        <span key={item.id} className={item.selected ? "" : "is-inactive"}>
                          {item.type}
                        </span>
                      ))}
                      {activeItems.length > 4 ? <span>+{activeItems.length - 4} more</span> : null}
                    </div>
                  </td>
                  <td className="num cms-fee-total-col">{formatCurrency(activeTotal)}</td>
                  <td className="cms-fee-actions-col">
                    <div className="cms-actions">
                      <button className="cms-action-btn" title="Edit fee structure" aria-label="Edit fee structure" disabled={loadingEditId === row.id} onClick={() => editStructure(row)}><Pencil size={15} /></button>
                      <button className="cms-action-btn" title="Copy fee structure" aria-label="Copy fee structure" onClick={() => copyStructure(row)}><Copy size={15} /></button>
                      <button className="cms-action-btn" title="Delete fee structure" aria-label="Delete fee structure" disabled={deletingId === row.id} onClick={() => deleteStructure(row)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="cms-card-body">
        <TablePagination page={page} totalItems={structures.length} onPageChange={setPage} />
        <p className="cms-fee-note">
          <CheckCircle size={14} /> Fee structure changes apply to future admissions only. Existing students keep the fee snapshot captured at admission.
        </p>
      </div>
      {editing ? (
        <StructureFormModal
          initial={Object.keys(editing).length ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={(message) => { setEditing(null); onToast(message); onRefresh(); }}
          feeTypes={feeTypes}
          masters={masters}
          masterErrors={masterErrors}
          masterLoading={loading}
          structures={structures}
        />
      ) : null}
    </div>
  );
}

function FeeSetupTab({ setupTab, onSetupTabChange, feeTypes, onFeeTypesChange, scholarships, onScholarshipsChange, structures, onToast, onRefresh, loading, error, masters, masterErrors }) {
  return (
    <div className="cms-fee-stack">
      <div className="cms-fee-tabs cms-fee-subtabs" role="tablist" aria-label="Fee setup">
        {FEE_SETUP_TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={setupTab === item}
            className={`cms-fee-tab ${setupTab === item ? "is-active" : ""}`}
            onClick={() => onSetupTabChange(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {setupTab === "Fee Types" ? <FeeTypesTab feeTypes={feeTypes} onChange={onFeeTypesChange} onToast={onToast} onRefresh={onRefresh} /> : null}
      {setupTab === "Fee Structure" ? (
        <StructureTab
          structures={structures}
          onToast={onToast}
          onRefresh={onRefresh}
          loading={loading}
          error={error}
          feeTypes={feeTypes}
          masters={masters}
          masterErrors={masterErrors}
        />
      ) : null}
      {setupTab === "Scholarships" ? <ScholarshipsTab scholarships={scholarships} onChange={onScholarshipsChange} onToast={onToast} onRefresh={onRefresh} /> : null}
    </div>
  );
}

function StudentFeeLedgerSection({ ledgerTab, onLedgerTabChange, ledgerAccounts, collectionAccounts, paymentHistoryRows, onView, onPrint, onCollect, onReceipt, masters, loading, errors }) {
  return (
    <div className="cms-fee-stack">
      <div className="cms-fee-tabs cms-fee-subtabs" role="tablist" aria-label="Student fee ledger">
        {LEDGER_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={ledgerTab === item.id}
            className={`cms-fee-tab ${ledgerTab === item.id ? "is-active" : ""}`}
            onClick={() => onLedgerTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {ledgerTab === "Student Fee Ledger" ? <LedgerTab accounts={ledgerAccounts} onView={onView} onPrint={onPrint} masters={masters} loading={loading.ledger} error={errors.ledger} /> : null}
      {ledgerTab === "Fee Collection" ? <FeeCollectionTab accounts={collectionAccounts} onCollect={onCollect} loading={loading.collection} error={errors.collection} /> : null}
      {ledgerTab === "Payment History" ? <HistoryTab transactions={paymentHistoryRows} onReceipt={onReceipt} loading={loading.ledger} error={errors.ledger} /> : null}
    </div>
  );
}

/* ---------------------------- Payment history ---------------------------- */
function HistoryTab({ transactions = [], onReceipt, loading = false, error = "" }) {
  const [search, setSearch] = useState("");
  const [loadingReceiptId, setLoadingReceiptId] = useState("");
  const [page, setPage] = useState(1);
  const setSearchTerm = (value) => {
    setSearch(value);
    setPage(1);
  };

  const rows = transactions.filter((row) => {
    const term = search.trim().toLowerCase();
    return !term
      || String(row.studentName || "").toLowerCase().includes(term)
      || String(row.admissionNo || "").toLowerCase().includes(term)
      || String(row.receiptNo || "").toLowerCase().includes(term);
  });
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const keyedRows = rows.map((row) => ({ ...row, reactKey: paymentHistoryIdentity(row) }))
    .reduce((items, row) => {
      const count = items.counts.get(row.reactKey) || 0;
      items.counts.set(row.reactKey, count + 1);
      items.rows.push({ ...row, reactKey: count ? `${row.reactKey}-${count + 1}` : row.reactKey });
      return items;
    }, { counts: new Map(), rows: [] }).rows;
  const paginatedRows = pageItems(keyedRows, page);
  const historyColumns = [
    { label: "Receipt Number", value: (row) => row.receiptNo },
    { label: "Date", value: (row) => formatFeeDate(row.date) },
    { label: "Admission No", value: (row) => row.admissionNo },
    { label: "Student Name", value: (row) => row.studentName },
    { label: "Group / Section", value: (row) => `${row.group} / ${row.section}` },
    { label: "Payment Type", value: (row) => feeScheduleLabel(row.type) },
    { label: "Amount", value: (row) => formatCurrency(row.amount), num: true },
    { label: "Payment Method", value: (row) => row.method },
    { label: "Transaction Reference", value: (row) => row.reference || "-" },
    { label: "Status", value: (row) => row.status || "Paid" },
  ];

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const viewReceipt = async (row) => {
    const paymentId = row.feePaymentId || row.paymentId || row.id;
    setLoadingReceiptId(row.id);
    try {
      const response = row.receiptNo && row.receiptNo !== "-"
        ? await apiClient.get(apiEndpoints.fee.receiptByNumber(row.receiptNo))
        : await apiClient.get(apiEndpoints.fee.paymentDetails(paymentId));
      onReceipt(normalizeReceipt(response.data, row));
    } catch {
      try {
        const response = await apiClient.get(apiEndpoints.fee.paymentDetails(paymentId));
        onReceipt(normalizeReceipt(response.data, row));
      } catch {
        onReceipt(row);
      }
    } finally {
      setLoadingReceiptId("");
    }
  };

  return (
    <div className="cms-card">
      <div className="cms-card-head">
        <h2>Payment History</h2>
        <div className="cms-fee-head-actions">
          <span className="cms-badge cms-badge-info">{rows.length} transactions</span>
          <button className="cms-btn cms-btn-ghost cms-fee-mini-btn" type="button" onClick={() => printFeeList("Payment History", historyColumns, rows)}>
            <Printer size={14} /> Print
          </button>
        </div>
      </div>
      <div className="cms-card-body cms-fee-toolbar cms-fee-controls cms-fee-search-only">
        <div className="cms-fee-search">
          <Search3DIcon size={15} />
          <input value={search} placeholder="Search by student, admission number or receipt number" onChange={(event) => setSearchTerm(event.target.value)} />
        </div>
      </div>
      <div className="cms-table-wrap">
        <table className="cms-table">
          <thead>
            <tr>
              <th>Receipt Number</th><th>Date</th><th>Admission No</th><th>Student Name</th><th>Group / Section</th>
              <th>Payment Type</th><th className="num">Amount</th><th>Payment Method</th><th>Transaction Reference</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="cms-fee-empty-row">Loading payment history...</td></tr>
            ) : error ? (
              <tr><td colSpan={11} className="cms-fee-empty-row">Unable to load payment history: {error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="cms-fee-empty-row">No payments match the current search and filters.</td></tr>
            ) : paginatedRows.map((row) => (
              <tr key={row.reactKey}>
                <td><strong>{row.receiptNo}</strong></td>
                <td>{formatDate(row.date)}</td>
                <td>{row.admissionNo}</td>
                <td>{row.studentName}</td>
                <td>{row.group} / {row.section}</td>
                <td>{feeScheduleLabel(row.type)}</td>
                <td className="num">{formatCurrency(row.amount)}</td>
                <td>{row.method}</td>
                <td>{row.reference || "-"}</td>
                <td><StatusBadge status={row.status || "Paid"} /></td>
                <td>
                  <button className="cms-action-btn" title="View receipt" aria-label="View receipt" disabled={loadingReceiptId === row.id} onClick={() => viewReceipt(row)}><ReceiptText size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination page={page} totalItems={rows.length} onPageChange={setPage} />
    </div>
  );
}

/* -------------------------------- Page ---------------------------------- */
export default function FeeManagementPage() {
  const {
    boards: contextBoards,
    academicYears: contextAcademicYears,
    boardsError: contextBoardsError,
    academicYearsError: contextAcademicYearsError,
    selectedBoardId,
    selectedAcademicYearId,
  } = useAcademicContext();
  const [tab, setTab] = useState(TABS[0]);
  const [setupTab, setSetupTab] = useState(FEE_SETUP_TABS[0]);
  const [ledgerTab, setLedgerTab] = useState(LEDGER_TABS[0].id);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedSource, setSelectedSource] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [toast, setToast] = useState("");
  const [feeTypes, setFeeTypes] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [apiStructures, setApiStructures] = useState([]);
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureError, setStructureError] = useState("");
  const [masters, setMasters] = useState({ boards: [], years: [], levels: [], groups: [], sections: [], programs: [] });
  const [masterErrors, setMasterErrors] = useState({});
  const [ledgerAccounts, setLedgerAccounts] = useState([]);
  const [collectionAccounts, setCollectionAccounts] = useState([]);
  const [accountLoading, setAccountLoading] = useState({ ledger: false, collection: false });
  const [accountErrors, setAccountErrors] = useState({ ledger: "", collection: "" });
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const [dueRows, setDueRows] = useState([]);
  const [, setOverviewError] = useState("");
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedDetailVersion, setSelectedDetailVersion] = useState(0);
  const [paymentHistoryExtras, setPaymentHistoryExtras] = useState([]);
  const accountRequestRef = useRef({ ledger: 0, collection: 0 });
  const overviewRequestRef = useRef(0);
  const structureRequestRef = useRef(0);
  const paymentHistoryRequestRef = useRef(0);
  const loadedTabsRef = useRef(new Set());
  const feeDetailCacheRef = useRef(new Map());

  const contextBoardOptions = useMemo(() => (
    toSelectOptions(
      (contextBoards || []).filter((item) => isActiveStatus(read(item, "isActive", "IsActive", "active", "Active", "status", "Status"))),
      ["boardId", "BoardId", "id", "Id"],
      ["boardName", "BoardName", "name", "Name", "code", "Code"],
    )
  ), [contextBoards]);
  const contextYearOptions = useMemo(() => uniqueAcademicYearsByName(
    toSelectOptions(
      (contextAcademicYears || []).filter((item) => isActiveStatus(read(item, "isActive", "IsActive", "active", "Active", "status", "Status"))),
      ["academicYearId", "AcademicYearId", "id", "Id"],
      ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name", "label", "Label", "code", "Code"],
    ),
    (item) => item.label,
  ), [contextAcademicYears]);
  const selectedBoardLabel = optionLabel(contextBoardOptions, selectedBoardId);
  const selectedAcademicYearLabel = optionLabel(contextYearOptions, selectedAcademicYearId);
  const structures = useMemo(() => apiStructures.filter((item) => (
    matchesContext(selectedBoardId, selectedBoardLabel, item.boardId, item.board)
    && matchesContext(selectedAcademicYearId, selectedAcademicYearLabel, item.academicYearId, item.academicYear)
  )), [apiStructures, selectedAcademicYearId, selectedAcademicYearLabel, selectedBoardId, selectedBoardLabel]);
  const syncedMasters = useMemo(() => ({
    ...masters,
    selectedBoardId,
    selectedAcademicYearId,
  }), [masters, selectedAcademicYearId, selectedBoardId]);
  const overviewAccounts = ledgerAccounts;
  const selectedAccounts = selectedSource === "collection" ? [...collectionAccounts, ...ledgerAccounts] : [...ledgerAccounts, ...collectionAccounts];
  const selectedBase = selectedId ? selectedAccounts.find((item) => item.id === selectedId) : null;
  const selected = selectedDetail || selectedBase;
  const modalOpen = Boolean(collecting || receipt);
  const paymentHistoryRows = useMemo(() => {
    const rows = [];
    const accounts = [...ledgerAccounts, ...collectionAccounts];
    accounts.forEach((account) => {
      rows.push(...(account.transactions || []));
    });
    rows.push(...paymentHistoryExtras);
    if (dashboardData) {
      rows.push(...normalizeDashboard(dashboardData).recent.map((payment) => withPaymentContext(payment, accounts)));
    }
    const seen = new Set();
    return rows.filter((row) => {
      const key = row.feePaymentId || row.receiptNo || `${row.admissionNo}-${row.date}-${row.amount}-${row.reference}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [collectionAccounts, dashboardData, ledgerAccounts, paymentHistoryExtras]);

  const saveFeeTypes = (nextTypes) => {
    setFeeTypes(nextTypes);
  };

  const saveScholarships = (nextScholarships) => {
    setScholarships(nextScholarships);
  };

  const loadAccountContext = useCallback(async (rows) => {
    if (!hasAccountIdentityGaps(rows)) return {};
    const [studentsResult, admissionsResult] = await Promise.allSettled([
      apiClient.get(apiEndpoints.students.getAll),
      apiClient.get(apiEndpoints.admissions.getAll),
    ]);
    return {
      studentsById: studentsResult.status === "fulfilled"
        ? new Map(getCollection(studentsResult.value.data).map((item) => [String(read(item, "studentId", "StudentId", "id", "Id")), item]))
        : new Map(),
      admissions: admissionsResult.status === "fulfilled"
        ? getCollection(admissionsResult.value.data)
        : [],
    };
  }, []);

  const loadFeeAccounts = useCallback(async (source) => {
    const endpoint = source === "collection" ? apiEndpoints.fee.collection : apiEndpoints.fee.ledger;
    const requestId = (accountRequestRef.current[source] || 0) + 1;
    accountRequestRef.current = { ...accountRequestRef.current, [source]: requestId };
    setAccountLoading((current) => ({ ...current, [source]: true }));
    setAccountErrors((current) => ({ ...current, [source]: "" }));
    try {
      const response = await apiClient.get(endpoint);
      if (accountRequestRef.current[source] !== requestId) return;
      const rows = getCollection(response.data);
      const context = await loadAccountContext(rows);
      if (accountRequestRef.current[source] !== requestId) return;
      const initialAccounts = normalizeFeeAccountRows(rows, context);
      const unresolvedAccounts = initialAccounts.filter((account) => (
        (!account.paymentPlan || (account.paymentPlan === "Installment Payment" && !account.installments?.length))
        && (account.studentId || account.studentFeeId || account.studentFeeAssignmentId || account.assignmentId)
      ));
      const detailRequests = new Map();
      unresolvedAccounts.forEach((account) => {
        const endpoint = account.studentId
          ? apiEndpoints.fee.studentFeeDetailsByStudent(account.studentId)
          : apiEndpoints.fee.studentFeeDetails(account.studentFeeId || account.studentFeeAssignmentId || account.assignmentId);
        if (!detailRequests.has(endpoint)) detailRequests.set(endpoint, account);
      });
      const detailEntries = await Promise.all(Array.from(detailRequests.entries()).map(async ([endpoint, account]) => {
        let detailRequest = feeDetailCacheRef.current.get(endpoint);
        if (!detailRequest) {
          detailRequest = apiClient.get(endpoint)
            .then((detailResponse) => getObject(detailResponse.data))
            .catch(() => {
              feeDetailCacheRef.current.delete(endpoint);
              return {};
            });
          feeDetailCacheRef.current.set(endpoint, detailRequest);
        }
        const detail = await detailRequest;
        return { account, detail };
      }));
      if (accountRequestRef.current[source] !== requestId) return;
      const feeDetailsByStudentId = new Map();
      const feeDetailsByAccountId = new Map();
      detailEntries.forEach(({ account, detail }) => {
        if (!Object.keys(detail).length) return;
        if (account.studentId) feeDetailsByStudentId.set(String(account.studentId), detail);
        const accountId = account.studentFeeId || account.studentFeeAssignmentId || account.assignmentId;
        if (accountId) feeDetailsByAccountId.set(String(accountId), detail);
      });
      const accounts = normalizeFeeAccountDataset(detailEntries.length
        ? normalizeFeeAccountRows(rows, { ...context, feeDetailsByStudentId, feeDetailsByAccountId })
        : initialAccounts);
      if (source === "collection") {
        setCollectionAccounts(accounts);
      } else {
        setLedgerAccounts(accounts);
      }
    } catch (err) {
      if (accountRequestRef.current[source] !== requestId) return;
      setAccountErrors((current) => ({ ...current, [source]: getApiErrorMessage(err) }));
    } finally {
      if (accountRequestRef.current[source] === requestId) {
        setAccountLoading((current) => ({ ...current, [source]: false }));
      }
    }
  }, [loadAccountContext]);

  const loadOverviewData = useCallback(async () => {
    const requestId = overviewRequestRef.current + 1;
    overviewRequestRef.current = requestId;
    setDashboardLoaded(false);
    setOverviewError("");
    const dashboardResult = await apiClient.get(apiEndpoints.fee.dashboard).then(
      (response) => ({ status: "fulfilled", response }),
      (error) => ({ status: "rejected", error }),
    );
    const dueResult = await apiClient.get(apiEndpoints.fee.due || apiEndpoints.fee.getDue).then(
      (response) => ({ status: "fulfilled", response }),
      (error) => ({ status: "rejected", error }),
    );
    if (overviewRequestRef.current !== requestId) return;
    if (dashboardResult.status === "fulfilled") {
      const nextDashboard = getObject(dashboardResult.response.data);
      if (Object.keys(nextDashboard).length) setDashboardData(nextDashboard);
    }
    setDashboardLoaded(true);
    if (dueResult.status === "fulfilled") {
      setDueRows(normalizeDueRows(getCollection(dueResult.response.data)));
    }
    const messages = [dashboardResult, dueResult]
      .filter((result) => result.status === "rejected")
      .map((result) => getApiErrorMessage(result.error));
    if (messages.length) setOverviewError(messages.join(" "));
  }, []);

  const loadMissingPaymentHistories = useCallback(async (accounts) => {
    const targets = accounts.filter((account) => (
      account.studentId
      && Number(account.totalPaid || 0) > 0
      && !(account.transactions || []).length
    ));
    if (!targets.length) {
      setPaymentHistoryExtras([]);
      return;
    }
    const requestId = paymentHistoryRequestRef.current + 1;
    paymentHistoryRequestRef.current = requestId;
    const results = await Promise.allSettled(targets.map((account) => (
      apiClient.get(apiEndpoints.fee.getHistory(account.studentId))
        .then((response) => normalizeTransactionRows(getCollection(response.data), account))
    )));
    if (paymentHistoryRequestRef.current !== requestId) return;
    setPaymentHistoryExtras(results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])));
  }, []);

  const loadFeeApiData = useCallback(async () => {
    const requestId = structureRequestRef.current + 1;
    structureRequestRef.current = requestId;
    setStructureLoading(true);
    setStructureError("");
    setMasterErrors({});
    const [typesResult, structuresResult, scholarshipsResult, yearsResult, levelsResult, groupsResult, sectionsResult, programsResult] = await Promise.allSettled([
      apiClient.get(apiEndpoints.fee.feeTypes),
      apiClient.get(apiEndpoints.fee.getStructures),
      apiClient.get(apiEndpoints.fee.scholarships),
      apiClient.get(apiEndpoints.academicYears.getAll),
      apiClient.get(apiEndpoints.boards.getAcademicLevels),
      apiClient.get(apiEndpoints.groups.getAll, { params: { isActive: true } }).catch(() => apiClient.get(apiEndpoints.groups.dropdown)),
      apiClient.get(apiEndpoints.sections.getAll),
      apiClient.get(apiEndpoints.programs.getAll),
    ]);
    if (structureRequestRef.current !== requestId) return;
    const allYearOptions = yearsResult.status === "fulfilled"
      ? toSelectOptions(
        getCollection(yearsResult.value.data),
        ["academicYearId", "AcademicYearId", "id", "Id"],
        ["academicYearName", "AcademicYearName", "yearName", "YearName", "name", "Name", "label", "Label", "code", "Code"],
      )
      : [];
    const yearOptions = uniqueOptionsByValue([...contextYearOptions, ...allYearOptions]);
    const groupOptions = groupsResult.status === "fulfilled"
      ? getCollection(groupsResult.value.data).map(groupOption).filter(Boolean)
      : [];
    const programOptions = programsResult.status === "fulfilled"
      ? getCollection(programsResult.value.data).map(programOption).filter(Boolean)
      : [];

    if (typesResult.status === "fulfilled") {
      const apiTypes = getCollection(typesResult.value.data).map(feeTypeOption).filter((item) => item.id);
      setFeeTypes(apiTypes);
    }
    if (structuresResult.status === "fulfilled") {
      const normalizedFeeTypes = typesResult.status === "fulfilled"
        ? getCollection(typesResult.value.data).map(feeTypeOption).filter((item) => item.id)
        : [];
      const structureLookups = { years: yearOptions, groups: groupOptions, programs: programOptions };
      const listedStructures = normalizeFeeStructureRows(getCollection(structuresResult.value.data), normalizedFeeTypes, structureLookups);
      const itemResults = await Promise.allSettled(listedStructures.map((structure) => (
        Number(structure.id)
          ? apiClient.get(apiEndpoints.fee.getStructureItems(structure.id))
          : Promise.resolve(null)
      )));
      if (structureRequestRef.current !== requestId) return;
      const structuresWithItems = listedStructures.map((structure, index) => {
        const result = itemResults[index];
        if (result?.status !== "fulfilled" || !result.value) return structure;
        const itemRows = getCollection(result.value.data);
        if (!itemRows.length) return { ...structure, feeItems: [], totalFee: 0 };
        const [normalized] = normalizeFeeStructureRows([
          {
            ...structure,
            items: itemRows.map((item) => ({
              ...item,
              feeStructureId: read(item, "feeStructureId", "FeeStructureId") ?? structure.id,
            })),
          },
        ], normalizedFeeTypes, structureLookups);
        return normalized || { ...structure, feeItems: [], totalFee: 0 };
      });
      setApiStructures(structuresWithItems);
    } else {
      setStructureError(getApiErrorMessage(structuresResult.reason));
    }
    if (scholarshipsResult.status === "fulfilled") {
      setScholarships(normalizeScholarshipRows(getCollection(scholarshipsResult.value.data)));
    }
    setMasters((current) => ({
      boards: contextBoardOptions,
      years: yearOptions,
      levels: levelsResult.status === "fulfilled"
        ? toSelectOptions(getCollection(levelsResult.value.data), ["academicLevelId", "AcademicLevelId", "id", "Id"], ["academicLevelName", "AcademicLevelName", "name", "Name"])
        : current.levels,
      groups: groupsResult.status === "fulfilled"
        ? groupOptions
        : current.groups,
      sections: sectionsResult.status === "fulfilled"
        ? getCollection(sectionsResult.value.data).map(sectionOption).filter(Boolean)
        : current.sections,
      programs: programsResult.status === "fulfilled"
        ? programOptions
        : current.programs,
    }));
    setMasterErrors({
      boards: contextBoardsError || "",
      years: yearsResult.status === "rejected" ? getApiErrorMessage(yearsResult.reason) || contextAcademicYearsError || "" : contextAcademicYearsError || "",
      levels: levelsResult.status === "rejected" ? getApiErrorMessage(levelsResult.reason) : "",
      groups: groupsResult.status === "rejected" ? getApiErrorMessage(groupsResult.reason) : "",
      sections: sectionsResult.status === "rejected" ? getApiErrorMessage(sectionsResult.reason) : "",
      programs: programsResult.status === "rejected" ? getApiErrorMessage(programsResult.reason) : "",
      scholarships: scholarshipsResult.status === "rejected" ? getApiErrorMessage(scholarshipsResult.reason) : "",
    });
    if (structureRequestRef.current === requestId) setStructureLoading(false);
  }, [contextAcademicYearsError, contextBoardOptions, contextBoardsError, contextYearOptions]);

  const openCollectPayment = (id) => {
    setSelectedId(id);
    setSelectedSource("collection");
    setCollecting(false);
  };

  const printStudentStatement = (id) => {
    setSelectedId(id);
    setSelectedSource("ledger");
    window.setTimeout(() => printFeeTarget("student"), 80);
  };

  useEffect(() => {
    let ignore = false;
    setSelectedDetail(null);
    if (!selectedId || !selectedBase?.studentId) return undefined;
    const loadSelectedDetail = async () => {
      const studentDetailResult = await apiClient.get(apiEndpoints.fee.studentFeeDetailsByStudent(selectedBase.studentId)).then(
        (response) => ({ status: "fulfilled", response }),
        (error) => ({ status: "rejected", error }),
      );
      if (ignore) return;
      let detail = studentDetailResult.status === "fulfilled" ? getObject(studentDetailResult.response?.data) : {};
      const hasPayments = feeDetailPaymentRows(detail).length > 0;
      if (!hasPayments && Number(selectedBase.totalPaid || 0) > 0) {
        const historyResult = await apiClient.get(apiEndpoints.fee.getHistory(selectedBase.studentId)).then(
          (response) => ({ status: "fulfilled", response }),
          (error) => ({ status: "rejected", error }),
        );
        if (ignore) return;
        if (historyResult.status === "fulfilled") {
          detail = {
            ...detail,
            paymentHistory: getCollection(historyResult.response.data),
          };
        }
      }
      if (!ignore) {
        const [normalized] = normalizeFeeAccountRows([selectedBase], {
          feeDetailsByStudentId: new Map([[String(selectedBase.studentId), detail]]),
        });
        setSelectedDetail(normalized || selectedBase);
      }
      const primaryError = studentDetailResult.status === "rejected" ? studentDetailResult.error : null;
      if (primaryError) {
        setAccountErrors((current) => ({ ...current, ledger: current.ledger || getApiErrorMessage(primaryError) }));
      }
    };
    loadSelectedDetail();
    return () => {
      ignore = true;
    };
  }, [selectedBase, selectedDetailVersion, selectedId]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen]);

  useEffect(() => {
    loadOverviewData();
    loadedTabsRef.current.add("Overview");
  }, [loadOverviewData]);

  useEffect(() => {
    const contextKey = `${selectedBoardId || ""}:${selectedAcademicYearId || ""}`;
    const loadKey = tab === "Student Fee Ledger" ? `${tab}:${ledgerTab}:${contextKey}` : `${tab}:${contextKey}`;
    if (loadedTabsRef.current.has(loadKey)) return;
    loadedTabsRef.current.add(loadKey);
    if (tab === "Overview") loadOverviewData();
    if (tab === "Fee Setup") loadFeeApiData();
    if (tab === "Student Fee Ledger" && ledgerTab === "Fee Collection") loadFeeAccounts("collection");
    if (tab === "Student Fee Ledger" && ledgerTab !== "Fee Collection") loadFeeAccounts("ledger");
  }, [ledgerTab, loadFeeAccounts, loadFeeApiData, loadOverviewData, selectedAcademicYearId, selectedBoardId, tab]);

  useEffect(() => {
    if (tab !== "Student Fee Ledger" || ledgerTab !== "Payment History") return;
    loadMissingPaymentHistories(ledgerAccounts);
  }, [ledgerAccounts, ledgerTab, loadMissingPaymentHistories, tab]);

  return (
    <DashboardLayout
      title="Fee Management"
      subtitle="Manage fee structures, scholarships, student balances and collections."
      breadcrumb={["Administration"]}
    >
      <div className="cms-fee-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={`cms-fee-tab ${tab === item ? "is-active" : ""}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "Overview" ? <OverviewTab accounts={overviewAccounts} dashboard={dashboardData} dueRows={dueRows} dashboardLoaded={dashboardLoaded} /> : null}
      {tab === "Fee Setup" ? (
        <FeeSetupTab
          setupTab={setupTab}
          onSetupTabChange={setSetupTab}
          feeTypes={feeTypes}
          onFeeTypesChange={saveFeeTypes}
          scholarships={scholarships}
          onScholarshipsChange={saveScholarships}
          structures={structures}
          onToast={setToast}
          onRefresh={loadFeeApiData}
          loading={structureLoading}
          error={structureError}
          masters={syncedMasters}
          masterErrors={masterErrors}
        />
      ) : null}
      {tab === "Student Fee Ledger" && selected && !collecting ? (
        <StudentFeeAccountScreen
          account={selected}
          onClose={() => { setSelectedId(null); setSelectedSource(""); setCollecting(false); }}
          onCollect={() => setCollecting(true)}
          onReceipt={setReceipt}
          allowCollect={selectedSource === "collection"}
        />
      ) : null}
      {tab === "Student Fee Ledger" && (!selected || collecting) ? (
        <StudentFeeLedgerSection
          ledgerTab={ledgerTab}
          onLedgerTabChange={setLedgerTab}
          ledgerAccounts={ledgerAccounts}
          collectionAccounts={collectionAccounts}
          paymentHistoryRows={paymentHistoryRows}
          onView={(id) => { setSelectedId(id); setSelectedSource("ledger"); }}
          onPrint={printStudentStatement}
          onCollect={openCollectPayment}
          onReceipt={setReceipt}
          masters={syncedMasters}
          loading={accountLoading}
          errors={accountErrors}
        />
      ) : null}

      {selected && collecting ? (
        <CollectPaymentModal
          account={selected}
          onClose={() => setCollecting(false)}
          onSaved={(saved) => {
            setCollecting(false);
            setToast(`Payment of ${formatCurrency(saved.amount)} recorded - receipt ${saved.receiptNo}`);
            setPaymentHistoryExtras((current) => [withPaymentContext(saved, [selected]), ...current]);
            setSelectedDetail(null);
            setSelectedDetailVersion((current) => current + 1);
            Promise.allSettled([
              loadFeeAccounts("ledger"),
              loadFeeAccounts("collection"),
              loadOverviewData(),
            ]);
          }}
        />
      ) : null}

      {receipt ? <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} /> : null}

      <Toast message={toast} onClose={() => setToast("")} />
    </DashboardLayout>
  );
}
