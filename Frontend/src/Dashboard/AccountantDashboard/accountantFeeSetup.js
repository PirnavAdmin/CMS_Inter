import apiClient from "@/api/axios.js";
import { apiEndpoints } from "@/api/apiEndpoints.js";
import { ACTIONS } from "@/features/rolesPermissions/rolesPermissions.constants.js";
import { checkedFeeData, checkedFeeRows } from "./accountantFeeRequests.js";
import { readFee, feeStatus, scopedFeeMasters } from "./feeViewData.js";
import { requestError } from "./accountantData.js";

export const setupNames = { types: "Fee Type", structures: "Fee Structure", hostel: "Hostel Fee", transport: "Transport Fee", scholarships: "Scholarship", fine: "Fine Rule" };
export const setupIdKeys = { types: "feeTypeId", structures: "feeStructureId", hostel: "feeConfigId", transport: "pickupPointId", scholarships: "scholarshipId", fine: "fineRuleId" };
export const setupId = (kind, row) => readFee(row, setupIdKeys[kind]);

export function feeSetupAccess(permissions, kind) {
  const module = "fee-management";
  const screen = kind === "hostel" ? "hostel-fees" : "fee-structure";
  const ready = !permissions.loading && !permissions.error;
  const view = Boolean(ready && permissions.canView(module, screen));
  // Transport fare configuration belongs to Fee Setup, not route management.
  const actions = { create: ACTIONS.CREATE, edit: ACTIONS.EDIT, delete: kind === "transport" ? null : ACTIONS.DELETE };
  return { module, screen, view, ...Object.fromEntries(Object.entries(actions).map(([key, action]) => [key, Boolean(view && action && permissions.canDo(module, action, screen))])) };
}

export function requireSetupAction(access, action, method, endpoint) {
  if (!access?.view || !access[action]) {
    const permission = action === "create" && access?.module === "transport" ? ACTIONS.MANAGE_ROUTES : action;
    throw Object.assign(new Error(`Permission required: ${access?.module || "fee-management"}:${access?.screen || "fee-structure"}:${permission}. ${method} ${endpoint}`), { code: "ACCOUNTANT_DATA_ERROR" });
  }
}

export function setupEndpoint(kind, row) {
  const id = setupId(kind, row);
  if (id != null && (!Number.isInteger(Number(id)) || Number(id) <= 0)) throw new Error("A valid saved record ID is required.");
  const config = {
    types: [apiEndpoints.fee.feeTypes, apiEndpoints.fee.feeTypeById],
    structures: [apiEndpoints.fee.createStructure, apiEndpoints.fee.getStructureById],
    hostel: [apiEndpoints.hostel.fees, apiEndpoints.hostel.feeById],
    transport: [apiEndpoints.transport.pickupPoints, apiEndpoints.transport.pickupPointById],
    scholarships: [apiEndpoints.fee.scholarships, apiEndpoints.fee.getScholarshipById],
    fine: [apiEndpoints.fee.fineRules, apiEndpoints.fee.fineRuleById],
  }[kind];
  if (!config) throw new Error("Unsupported fee setup section.");
  return id == null ? config[0] : config[1](id);
}

export async function loadFeeOptions(endpoint, params, signal) {
  const rows = [];
  let pageNumber = 1;
  let totalPages = 1;
  do {
    const data = checkedFeeData(await apiClient.get(endpoint, { params: { ...params, pageNumber, pageSize: 100 }, signal }));
    rows.push(...checkedFeeRows(data));
    if (!Array.isArray(data)) {
      const count = readFee(data, "totalCount");
      const size = Number(readFee(data, "pageSize") ?? 100);
      const explicitPages = readFee(data, "totalPages");
      totalPages = explicitPages != null ? Number(explicitPages) : count != null && size > 0 ? Math.ceil(Number(count) / size) : 1;
      if (!Number.isInteger(totalPages) || totalPages < 0 || totalPages > 10000) throw new Error("Fee setup lookup pagination could not be verified.");
    }
    pageNumber += 1;
  } while (pageNumber <= totalPages);
  return rows;
}

export async function loadSetupEditor(kind, row, params, signal, viewOnly = false) {
  const sources = viewOnly ? {} : kind === "structures" ? { types: apiEndpoints.fee.feeTypes, boards: apiEndpoints.boards.getAll, years: apiEndpoints.academicYears.getAll }
    : kind === "fine" ? { types: apiEndpoints.fee.feeTypes }
      : kind === "hostel" ? { blocks: apiEndpoints.hostel.blocks, roomTypes: apiEndpoints.hostel.roomTypes }
        : kind === "transport" ? { routes: apiEndpoints.transport.routes } : {};
  const lookups = {};
  const context = { ...params, ...(row && kind === "structures" ? { boardId: readFee(row, "boardId"), academicYearId: readFee(row, "academicYearId") } : {}) };
  await Promise.all(Object.entries(sources).map(async ([key, endpoint]) => {
    const query = key === "types" || key === "years" || key === "boards" ? {} : context;
    lookups[key] = await loadFeeOptions(endpoint, query, signal);
    if (key === "types") lookups[key] = scopedFeeMasters(lookups[key], context).filter((item) => !["hostel fee", "transport fee"].includes(String(readFee(item, "feeTypeName") || "").trim().toLowerCase()));
  }));
  let detail = null;
  const warnings = [];
  if (row && kind === "structures") {
    const results = await Promise.allSettled([
      apiClient.get(setupEndpoint(kind, row), { signal }),
      apiClient.get(apiEndpoints.fee.getStructureItems(setupId(kind, row)), { signal }),
    ]);
    // Admin can hydrate a listed structure from its items route. Never use that
    // fallback to get around an authorization denial or a deleted-record response.
    for (const result of results) {
      if (result.status === "rejected" && [401, 403, 404].includes(result.reason?.response?.status)) throw result.reason;
    }
    const [recordResult, itemsResult] = results;
    if (recordResult.status === "fulfilled") detail = checkedFeeData(recordResult.value);
    else { detail = { ...row }; warnings.push(requestError(recordResult.reason)); }
    if (itemsResult.status === "fulfilled") detail = { ...detail, items: checkedFeeRows(itemsResult.value) };
    else {
      const existing = readFee(detail, "items") ?? readFee(row, "items");
      if (existing == null) throw itemsResult.reason;
      const savedItems = checkedFeeRows(existing);
      if (!viewOnly && savedItems.some((item) => !readFee(item, "feeStructureComponentId"))) throw itemsResult.reason;
      detail = { ...detail, items: savedItems };
      warnings.push(requestError(itemsResult.reason));
    }
  } else if (row) detail = checkedFeeData(await apiClient.get(setupEndpoint(kind, row), { signal }));
  if (row && (!detail || typeof detail !== "object" || Array.isArray(detail))) throw new Error("The saved fee record could not be loaded. No changes have been made.");
  return { lookups, detail: detail ? { ...row, ...detail } : null, warnings };
}

const names = ["feeTypeName", "scholarshipName", "fineRuleName"];
const nameKey = (kind) => ({ types: names[0], scholarships: names[1], fine: names[2] })[kind];
const keysByKind = {
  types: ["feeTypeName", "feeTypeCode", "category"], scholarships: ["scholarshipName", "discountType", "discountValue"],
  fine: ["fineRuleName", "applicableFeeId", "fineType", "fineAmount", "gracePeriod"],
  hostel: ["hostelId", "roomTypeId", "feeFrequency", "hostelFeeAmount", "securityDeposit", "effectiveDate"],
  transport: ["routeId", "pickupPointName", "landmark", "sequenceNo", "distanceFromStart", "monthlyFee", "pickupTime", "dropTime"],
  structures: ["structureName", "description", "boardId", "academicYearId", "groupId", "programId", "yearFeeMode", "incrementType", "incrementValue"],
};

export function setupDraft(kind, detail, lookups, params) {
  const defaults = { status: "Active", category: "Academic", discountType: "Percentage", fineType: "Fixed Amount", gracePeriod: 0, feeFrequency: "Monthly", securityDeposit: 0,
    effectiveDate: new Date().toLocaleDateString("en-CA"), sequenceNo: 1, pickupTime: "07:30", dropTime: "16:15", yearFeeMode: "same", incrementType: "percentage", incrementValue: "", boardId: params.boardId ?? "", academicYearId: params.academicYearId ?? "" };
  const draft = Object.fromEntries((keysByKind[kind] || []).map((key) => [key, readFee(detail, key) ?? defaults[key] ?? ""]));
  draft.status = detail ? feeStatus(detail) : "Active";
  if (draft.status === "-") draft.status = "Active";
  if (kind === "scholarships" && draft.discountType === "Fixed Amount") draft.discountType = "Fixed";
  if (kind === "hostel") draft.effectiveDate = String(draft.effectiveDate).slice(0, 10);
  if (kind === "transport") { draft.pickupTime = String(draft.pickupTime).slice(0, 5); draft.dropTime = String(draft.dropTime).slice(0, 5); }
  if (kind === "structures") {
    const saved = checkedItems(detail);
    const types = lookups.types || [];
    draft.items = [...saved.map((item) => ({ feeTypeId: readFee(item, "feeTypeId"), feeTypeName: readFee(item, "feeTypeName"), itemId: readFee(item, "feeStructureComponentId"), rule: readFee(item, "rule") || "Optional", amount: readFee(item, "amount") ?? "", isActive: readFee(item, "isActive") !== false,
      original: { rule: readFee(item, "rule") || "Optional", amount: readFee(item, "amount") ?? "", isActive: readFee(item, "isActive") !== false } })),
      ...types.filter((type) => !saved.some((item) => String(readFee(item, "feeTypeId")) === String(readFee(type, "feeTypeId")))).map((type) => ({ feeTypeId: readFee(type, "feeTypeId"), feeTypeName: readFee(type, "feeTypeName"), rule: "Optional", amount: "", isActive: false }))];
  }
  return draft;
}

function checkedItems(detail) {
  const items = readFee(detail, "items");
  return items == null ? [] : checkedFeeRows(items);
}

export const structureItemChanged = (item) => !item.original || item.rule !== item.original.rule || Number(item.amount) !== Number(item.original.amount) || item.isActive !== item.original.isActive;

export function structureDraftPreview(draft) {
  const first = draft.items.filter((item) => item.isActive).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const increment = draft.yearFeeMode === "different" ? draft.incrementType === "percentage" ? first * Number(draft.incrementValue || 0) / 100 : Number(draft.incrementValue || 0) : 0;
  const rounded = Math.round((increment + Number.EPSILON) * 100) / 100;
  return { first, increment: rounded, second: Math.round((first + rounded + Number.EPSILON) * 100) / 100 };
}

export function validateSetupDraft(kind, draft, rows, row) {
  const name = nameKey(kind);
  const text = (key) => String(draft[key] ?? "").trim();
  const number = (key) => text(key) !== "" && Number.isFinite(Number(draft[key]));
  const positive = (key) => number(key) && Number(draft[key]) > 0;
  if (name && !text(name)) return `${setupNames[kind]} Name is required`;
  if (name && rows.some((item) => String(setupId(kind, item)) !== String(setupId(kind, row)) && String(readFee(item, name) || "").trim().toLowerCase() === text(name).toLowerCase())) return `${text(name)} already exists`;
  if (kind === "types" && text(name).length < 2) return "Fee Type Name must contain at least 2 characters";
  if (kind === "scholarships" && (!positive("discountValue") || (draft.discountType === "Percentage" && Number(draft.discountValue) > 100))) return "Enter a positive discount value; percentages cannot exceed 100";
  if (kind === "fine") {
    if (!positive("applicableFeeId")) return "Applicable Fee / Fee Type is required";
    if (!positive("fineAmount") || (draft.fineType === "Percentage" && Number(draft.fineAmount) > 100)) return "Enter a positive fine amount; percentages cannot exceed 100";
    if (!number("gracePeriod") || Number(draft.gracePeriod) < 0 || !Number.isInteger(Number(draft.gracePeriod))) return "Grace Period must be a non-negative whole number";
  }
  if (kind === "hostel" && (!positive("hostelId") || !positive("roomTypeId") || !positive("hostelFeeAmount") || !number("securityDeposit") || Number(draft.securityDeposit) < 0 || !text("effectiveDate"))) return "Select hostel block, room type, effective date, and valid hostel fee and deposit";
  if (kind === "transport" && (!positive("routeId") || !text("pickupPointName") || !number("monthlyFee") || Number(draft.monthlyFee) < 0 || !number("distanceFromStart") || Number(draft.distanceFromStart) < 0 || !positive("sequenceNo") || !Number.isInteger(Number(draft.sequenceNo)) || !text("pickupTime") || !text("dropTime"))) return "Select route, pickup point, times, distance, sequence, and a valid monthly fare";
  if (kind === "structures") {
    if (!["boardId", "academicYearId", "groupId", "programId"].every(positive)) return "Board, Academic Year, Group and Program are required";
    if (row && draft.items.some((item) => item.original && !item.itemId)) return "Saved fee component IDs are missing. Refresh before editing this structure";
    const active = draft.items.filter((item) => item.isActive);
    if (!active.length) return "Select at least one active fee type for this structure";
    if (draft.items.some((item) => !Number.isInteger(Number(item.feeTypeId)) || Number(item.feeTypeId) <= 0 || Number(item.amount || 0) < 0)) return "Only saved fee types and non-negative amounts can be used";
    if (draft.items.some((item) => (!row ? item.isActive : structureItemChanged(item) && (item.itemId || item.isActive)) && (!Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0))) return "Fee amount must be greater than 0 for active or modified fee types";
    if (!row && draft.yearFeeMode === "different" && (!number("incrementValue") || Number(draft.incrementValue) < 0)) return "Enter a valid, non-negative increment value";
    if (!row && !Number.isFinite(structureDraftPreview(draft).second)) return "Enter a smaller fee or increment value";
    if (!row && rows.some((item) => feeStatus(item) === "Active" && Number(readFee(item, "academicLevelId") || 1) === 1 && ["academicYearId", "groupId", "programId"].every((key) => String(readFee(item, key)) === String(draft[key])))) return "A fee structure already exists for the selected Academic Year, Group and Program";
  }
  return "";
}

export function setupPayload(kind, draft, row, params) {
  const n = (key) => Number(draft[key]);
  const active = draft.status !== "Inactive";
  if (kind === "types") {
    const code = draft.feeTypeName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 30);
    return { FeeTypeName: draft.feeTypeName.trim(), FeeTypeCode: draft.feeTypeCode || (code.length >= 2 ? code : `FT${code}`.slice(0, 30)), Category: draft.category, IsActive: active };
  }
  if (kind === "scholarships") return { ScholarshipName: draft.scholarshipName.trim(), DiscountType: draft.discountType, DiscountValue: n("discountValue"), IsActive: active };
  if (kind === "fine") return { fineRuleName: draft.fineRuleName.trim(), applicableFeeId: n("applicableFeeId"), fineType: draft.fineType, fineAmount: n("fineAmount"), gracePeriod: n("gracePeriod"), status: draft.status };
  if (kind === "hostel") return { hostelId: n("hostelId"), roomTypeId: n("roomTypeId"), feeFrequency: draft.feeFrequency, hostelFeeAmount: n("hostelFeeAmount"), securityDeposit: n("securityDeposit"), effectiveDate: draft.effectiveDate, status: draft.status };
  if (kind === "transport") return { routeId: n("routeId"), pickupPointName: draft.pickupPointName.trim(), landmark: draft.landmark || "Main Landmark", sequenceNo: n("sequenceNo"), pickupTime: draft.pickupTime.length === 5 ? `${draft.pickupTime}:00` : draft.pickupTime, dropTime: draft.dropTime.length === 5 ? `${draft.dropTime}:00` : draft.dropTime, distanceFromStart: n("distanceFromStart"), monthlyFee: n("monthlyFee"), status: active };
  if (row) return { structureName: draft.structureName, description: draft.description || null, programId: n("programId"), isActive: active };
  return { ...(params.campusId ? { campusId: params.campusId } : {}), boardId: n("boardId"), academicYearId: n("academicYearId"), groupId: n("groupId"), programId: n("programId"), yearFeeMode: draft.yearFeeMode,
    ...(draft.yearFeeMode === "different" ? { incrementType: draft.incrementType, incrementValue: n("incrementValue") } : {}), items: draft.items.filter((item) => item.isActive).map((item) => ({ feeTypeId: Number(item.feeTypeId), rule: item.rule, amount: Number(item.amount) })) };
}

export async function saveSetupRecord(kind, draft, row, params, authorize) {
  if (row && !setupId(kind, row)) throw Object.assign(new Error("A valid saved record ID is required."), { code: "ACCOUNTANT_DATA_ERROR" });
  const action = row ? "edit" : "create";
  const method = row ? "PUT" : "POST";
  const endpoint = setupEndpoint(kind, row);
  authorize(action, method, endpoint);
  const payload = setupPayload(kind, draft, row, params);
  let wrote = false;
  try {
    const response = row ? await apiClient.put(endpoint, payload) : await apiClient.post(endpoint, payload);
    const result = checkedFeeData(response);
    if (result == null || result === false) throw new Error("The API did not confirm the save. Refresh before retrying.");
    wrote = true;
    if (kind === "structures" && row) {
      for (const item of draft.items.filter((item) => structureItemChanged(item) && (item.itemId || item.isActive))) {
        const itemEndpoint = item.itemId ? apiEndpoints.fee.updateStructureItem(item.itemId) : apiEndpoints.fee.addStructureItem(setupId(kind, row));
        authorize(action, item.itemId ? "PUT" : "POST", itemEndpoint);
        const itemPayload = { rule: item.rule, amount: Number(item.amount), isActive: item.isActive, ...(!item.itemId ? { feeTypeId: Number(item.feeTypeId) } : {}) };
        const savedItem = checkedFeeData(item.itemId ? await apiClient.put(itemEndpoint, itemPayload) : await apiClient.post(itemEndpoint, itemPayload));
        if (savedItem == null || savedItem === false) throw new Error("The API did not confirm the fee item save.");
      }
    }
    return result;
  } catch (error) {
    if (wrote || !error.response || error.response.status >= 500) error.feeSaveUncertain = true;
    throw error;
  }
}

export async function deleteSetupRecord(kind, row, authorize) {
  if (!setupId(kind, row)) throw new Error("A valid saved record ID is required.");
  const endpoint = setupEndpoint(kind, row);
  authorize("delete", "DELETE", endpoint);
  const result = checkedFeeData(await apiClient.delete(endpoint));
  if (result == null || result === false) throw new Error("The API did not confirm the deletion. Refresh the list before retrying.");
  return result;
}
