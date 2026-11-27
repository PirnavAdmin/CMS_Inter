import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { appendReferralFields, mapAdmissionReferral } from "./admissionReferral.js";

const campuses = [{ value: "1" }, { value: "2" }];

test("referrals use the destination campus, retain source, and discard a previewed number", () => {
  const values = { admissionNo: "PREVIEW-001", firstName: "Test", photo: { name: "photo.png" } };
  const result = mapAdmissionReferral(values, "1", true, "2", campuses);
  assert.equal(result.campus, 2);
  assert.equal(result.sourceCampusId, 1);
  assert.equal(result.isReferral, true);
  assert.equal(result.admissionNo, "");
  assert.equal(result.photo, values.photo);
  assert.equal(values.admissionNo, "PREVIEW-001");
});

test("normal admissions use the current campus and retain their number", () => {
  const result = mapAdmissionReferral({ admissionNo: "NORMAL-001" }, 1, false, "", campuses);
  assert.equal(result.campus, 1);
  assert.equal(result.sourceCampusId, null);
  assert.equal(result.isReferral, false);
  assert.equal(result.admissionNo, "NORMAL-001");
});

test("referrals reject the current campus, missing or invalid destinations", () => {
  for (const target of ["", "1", 1, "3", "2x", "2.5"]) {
    assert.throws(() => mapAdmissionReferral({}, 1, true, target, campuses));
  }
  assert.throws(() => mapAdmissionReferral({}, "", true, "2", campuses));
});

test("multipart referral fields bind an empty number, never the string null", () => {
  const data = new FormData();
  data.append("AdmissionNo", "STALE-001");
  data.append("CampusId", "1");
  data.append("FirstName", "Test");
  appendReferralFields(data, mapAdmissionReferral({}, 1, true, 2, campuses));
  assert.equal(data.get("AdmissionNo"), "");
  assert.equal(data.get("CampusId"), "2");
  assert.equal(data.get("SourceCampusId"), "1");
  assert.equal(data.get("IsReferral"), "true");
  assert.equal(data.get("FirstName"), "Test");
  assert.equal(data.getAll("AdmissionNo").length, 1);
});

test("normal multipart admissions do not acquire referral metadata", () => {
  const data = new FormData();
  data.append("AdmissionNo", "NORMAL-001");
  appendReferralFields(data, mapAdmissionReferral({}, 1, false, "", campuses));
  assert.equal(data.get("IsReferral"), "false");
  assert.equal(data.has("SourceCampusId"), false);
  assert.equal(data.get("AdmissionNo"), "NORMAL-001");
});

const admissionSource = (await readFile(new URL("./AdmissionPage.jsx", import.meta.url), "utf8")).replace(/\r\n/g, "\n");
const clientSource = await readFile(new URL("../../../api/apiClient.js", import.meta.url), "utf8");
const section = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

function pincodeFixture(initial = {}) {
  let effect;
  let timer;
  const requests = [];
  const toasts = [];
  const context = vm.createContext({
    values: { ...initial }, viewMode: "form", pincodeRequestRef: { current: 0 },
    lastLocationLookupRef: { current: initial.restored ? { pincode: initial.pincode, restored: true } : null },
    useEffect: (callback) => { effect = callback; },
    window: { setTimeout: (callback, delay) => { assert.equal(delay, 450); timer = callback; return 1; }, clearTimeout() { timer = null; } },
    apiEndpoints: { location: { byPincode: (pin) => `/pincode/${pin}` } },
    apiClient: { get: (url) => new Promise((resolve, reject) => requests.push({ url, resolve, reject })) },
    readText: (data, ...keys) => String(keys.map((key) => data?.[key]).find(Boolean) || ""),
    setToast: (message) => toasts.push(message),
    setValues(updater) {
      const before = context.values;
      const first = updater(before);
      const second = updater(before);
      assert.deepEqual(first, second, "React updater must remain pure under replay");
      context.values = second;
    },
    setErrors() {}, fieldByName: { pincode: {} },
    sanitizeValue: (_, value) => String(value).replace(/\D/g, "").slice(0, 6),
  });
  const start = admissionSource.indexOf("const INDIAN_ADDRESS_STATES =");
  const end = admissionSource.indexOf("\nconst ", admissionSource.indexOf("};", start) + 2);
  vm.runInContext(admissionSource.slice(start, end), context);
  const lookup = section(admissionSource, '  useEffect(() => {\n    if (viewMode !== "form") return undefined;\n    const pincode =', "\n  const fee = deriveAdmissionFee(values);");
  vm.runInContext(lookup, context);
  const changeStart = admissionSource.indexOf('    if (name === "pincode") {', admissionSource.indexOf("  const setValue ="));
  const changeEnd = admissionSource.indexOf('    if (name === "campus"', changeStart);
  vm.runInContext(`globalThis.changePincode = (val) => { const name = "pincode"; ${admissionSource.slice(changeStart, changeEnd)} };`, context);
  return { context, requests, toasts, runEffect: () => effect(), fire: async () => { const callback = timer; timer = null; if (callback) await callback(); }, hasTimer: () => Boolean(timer) };
}

test("pincode changes replace location, preserve other address fields and use pure state updates", async () => {
  const f = pincodeFixture({ houseDoorNumber: "12", streetVillage: "Main Road" });
  f.context.changePincode("500001");
  let cleanup = f.runEffect();
  let pending = f.fire();
  assert.equal(f.requests[0].url, "/pincode/500001");
  f.requests[0].resolve({ data: { city: "Hyderabad City", district: "Hyderabad", state: "Telangana" } });
  await pending;
  assert.equal(f.context.values.city, "Hyderabad City");
  cleanup();
  f.context.changePincode("110001");
  assert.equal(f.context.values.city, "");
  cleanup = f.runEffect();
  pending = f.fire();
  f.requests[1].resolve({ data: { city: "New Delhi Central", district: "Central Delhi", state: "Delhi" } });
  await pending;
  assert.deepEqual([f.context.values.city, f.context.values.district, f.context.values.state], ["New Delhi Central", "Central Delhi", "Delhi"]);
  assert.equal(f.context.values.houseDoorNumber, "12");
  assert.equal(f.context.values.streetVillage, "Main Road");
  cleanup();
});

test("restored and manually corrected locations persist until pincode changes", async () => {
  const f = pincodeFixture({ restored: true, pincode: "500001", city: "Custom", district: "Hyderabad", state: "Telangana" });
  f.runEffect();
  assert.equal(f.hasTimer(), false);
  f.context.changePincode("110001");
  f.runEffect();
  const pending = f.fire();
  f.requests[0].resolve({ data: { city: "New Delhi Central", district: "Central Delhi", state: "Delhi" } });
  await pending;
  f.context.values.city = "Manual correction";
  f.runEffect();
  assert.equal(f.hasTimer(), false);
  assert.equal(f.context.values.city, "Manual correction");
});

test("invalid pincodes, failed lookup and stale responses do not retain an old verified location", async () => {
  const f = pincodeFixture({ restored: true, pincode: "500001", city: "Old", district: "Old", state: "Telangana" });
  f.context.changePincode("");
  f.runEffect();
  assert.equal(f.context.values.city, "");
  f.context.changePincode("012345");
  f.runEffect();
  assert.equal(f.hasTimer(), false);
  f.context.changePincode("500001");
  const cleanup = f.runEffect();
  const old = f.fire();
  f.context.changePincode("110001");
  cleanup();
  f.runEffect();
  const latest = f.fire();
  f.requests[1].reject(new Error("offline"));
  await latest;
  f.requests[0].resolve({ data: { city: "Old", district: "Old", state: "Telangana" } });
  await old;
  assert.equal(f.context.values.city, "");
  assert.match(f.toasts[0], /manually/);
});

test("clear and re-enter performs a new lookup, including another district in the same state", async () => {
  const f = pincodeFixture({ pincode: "500001", city: "Hyderabad City", district: "Hyderabad", state: "Telangana", restored: true });
  f.context.changePincode("");
  f.runEffect();
  f.context.changePincode("506001");
  f.runEffect();
  const pending = f.fire();
  f.requests[0].resolve({ data: { city: "Warangal", district: "Warangal", state: "Telangana" } });
  await pending;
  assert.equal(f.context.values.district, "Warangal");
  assert.equal(f.context.values.state, "Telangana");
});

test("successful pincode state is used in the actual admission payload", async () => {
  const f = pincodeFixture({ houseDoorNumber: "12", streetVillage: "Main Road" });
  f.context.changePincode("110001");
  f.runEffect();
  const pending = f.fire();
  f.requests[0].resolve({ data: { city: "New Delhi Central", district: "Central Delhi", state: "Delhi" } });
  await pending;
  const payloadContext = vm.createContext({ FormData, File: globalThis.File, appendReferralFields() {},
    appendIfPresent: (form, key, value) => { if (value != null && value !== "") form.append(key, String(value)); },
    toDateTime: () => "", studentMobileValue: () => "", numericId: () => "", toAdmissionPaymentPlan: () => "",
    transportRequiredPayloadValue: () => "", console });
  const source = section(admissionSource, "const buildAdmissionFormData =", "const debugAdmissionSubmitPayload =")
    .replace("const buildAdmissionFormData =", "globalThis.buildAdmissionFormData =").replace("import.meta.env.DEV", "false");
  vm.runInContext(source, payloadContext);
  const data = payloadContext.buildAdmissionFormData(f.context.values, { includeFee: false });
  assert.equal(data.get("City"), "New Delhi Central");
  assert.equal(data.get("District"), "Central Delhi");
  assert.equal(data.get("State"), "Delhi");
  assert.equal(data.get("Pincode"), "110001");
  assert.equal(data.get("Address"), "12, Main Road, New Delhi Central, Central Delhi, Delhi, 110001");
});

function submissionFixture(overrides = {}) {
  const calls = { creates: [], updates: [], fees: [], toasts: [], refreshes: 0, persisted: [] };
  const context = vm.createContext({
    saving: false, submitInFlightRef: { current: false }, uncertainAdmissionRef: { current: false },
    committedAdmissionRef: { current: null }, editingAdmissionId: "", feeStructureLoading: false,
    isCrossCampusAdmission: false, isReferral: false, step: 2, feeSelection: [],
    values: { admissionNo: "PREVIEW-0100", campus: "1" }, selectedCampusValue: "1",
    selectedContextBoardValue: "1", selectedContextYearValue: "9", campusOptions: [], targetCampusId: "",
    validateAdmission: () => true, normalizeAdmissionMobileState: value => value,
    studentMobileValue: value => value.studentMobileNumber || "", requestAdmissionNumber: async () => "PREVIEW-0100",
    mapAdmissionReferral: value => value, buildAdmissionFormData: () => new FormData(), FormData,
    debugAdmissionSubmitPayload() {}, getObject: value => value, normalizeAdmissionRow: value => value,
    numericId: value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null,
    readId: value => value.admissionId || value.id, getApiErrorMessage: error => error.message || "Request error",
    stepView: () => "preview", navigateAdmission() {}, resetAdmissionDraftState() {}, setViewMode() {}, setPage() {},
    setToast: (message, type) => calls.toasts.push({ message, type }),
    persistAdmissionDraft: draft => calls.persisted.push(draft),
    refreshAdmissions: async () => { calls.refreshes++; return []; },
    apiEndpoints: { admissions: { create: "/api/v1/student-admissions", update: id => `/api/v1/student-admissions/${id}` } },
    apiClient: {
      post: async (...args) => { calls.creates.push(args); return { data: { admissionId: 710, admissionNo: "FINAL-0107" } }; },
      put: async (...args) => { calls.updates.push(args); return { data: { admissionId: 710, admissionNo: "FINAL-0107" } }; },
    },
    saveAdmissionFeeSelections: async (id, values) => calls.fees.push({ id, values }),
    ...overrides,
  });
  context.setSaving = value => { context.saving = value; };
  context.setEditingAdmissionId = value => { context.editingAdmissionId = value; };
  context.setValues = value => { context.values = typeof value === "function" ? value(context.values) : value; };
  vm.runInContext(`${section(admissionSource, "  const submit = async () => {", "  const handlePreviewPrimaryAction")};globalThis.submitAdmission = submit;`, context);
  return { context, calls };
}

test("one click uses the final server number and concurrent clicks do not create another admission", async () => {
  let release, requests = 0;
  const { context, calls } = submissionFixture({ apiClient: { post: async (_url, _body, config) => {
    requests++; assert.equal(config.skipNetworkRetry, true);
    return new Promise(resolve => { release = resolve; });
  } } });
  const first = context.submitAdmission();
  await context.submitAdmission();
  assert.equal(requests, 1);
  release({ data: { admissionId: 710, admissionNo: "FINAL-0107" } });
  await first;
  assert.equal(calls.fees[0].id, 710);
  assert.equal(context.values.admissionNo, "FINAL-0107");
  assert.match(calls.toasts.at(-1).message, /FINAL-0107.*successfully/);
  assert.equal(context.saving, false);
});

test("timeouts, network errors and server errors retain uncertainty and never recover by preview number", async () => {
  for (const failure of [Object.assign(new Error("Timeout"), { code: "ECONNABORTED" }), new Error("Network Error"),
    ...[500, 502, 503, 504].map(status => ({ message: "Server error", response: { status } }))]) {
    let requests = 0;
    const { context, calls } = submissionFixture({ apiClient: { post: async () => { requests++; throw failure; } },
      // A matching preview is not evidence that this request created this record.
      refreshAdmissions: async () => [{ admissionId: 999, admissionNo: "PREVIEW-0100" }],
    });
    await context.submitAdmission();
    assert.equal(context.uncertainAdmissionRef.current, true);
    assert.equal(calls.persisted[0].submissionUncertain, true);
    assert.equal(context.editingAdmissionId, "");
    assert.equal(context.committedAdmissionRef.current, null);
    assert.match(calls.toasts.at(-1).message, /outcome is uncertain/);
    await context.submitAdmission();
    assert.equal(requests, 1);
  }
});

test("validation rejection remains correctable without marking the draft uncertain", async () => {
  let requests = 0;
  const { context, calls } = submissionFixture({ apiClient: { post: async () => {
    requests++; throw { message: "Board is required", response: { status: 400 } };
  } } });
  await context.submitAdmission(); await context.submitAdmission();
  assert.equal(requests, 2);
  assert.equal(context.uncertainAdmissionRef.current, false);
  assert.match(calls.toasts.at(-1).message, /server rejected/);
});

test("fee-selection failure preserves the admission ID and subsequent save updates it", async () => {
  let attempts = 0;
  const { context, calls } = submissionFixture({ saveAdmissionFeeSelections: async () => {
    if (++attempts === 1) throw new Error("Fee API unavailable");
  } });
  await context.submitAdmission();
  assert.equal(context.editingAdmissionId, 710);
  assert.equal(context.committedAdmissionRef.current.admissionId, 710);
  assert.match(calls.toasts.at(-1).message, /FINAL-0107 was created, but fee selections could not be saved/);
  await context.submitAdmission();
  assert.equal(calls.creates.length, 1);
  assert.equal(calls.updates.length, 1);
});

test("acknowledged creation without an admission ID is uncertain and cannot be recreated", async () => {
  let requests = 0;
  const { context } = submissionFixture({ apiClient: { post: async () => { requests++; return { data: {} }; } } });
  await context.submitAdmission(); await context.submitAdmission();
  assert.equal(context.uncertainAdmissionRef.current, true);
  assert.equal(requests, 1);
});

test("refresh failures preserve loaded admissions; successful refresh replaces them", async () => {
  const existing = [{ admissionId: 5 }], toasts = [];
  const context = vm.createContext({
    useCallback: fn => fn, admissionsRequestRef: { current: 0 }, admissionListParams: { campusId: "1" },
    apiEndpoints: { admissions: { getAll: "/api/v1/student-admissions" } },
    apiClient: { get: async () => { throw new Error("Offline"); } },
    getCollection: value => value, normalizeAdmissionRow: value => value,
    getApiErrorMessage: error => error.message, admissions: existing,
    setListLoading() {}, setToast: message => toasts.push(message),
  });
  context.setAdmissions = rows => { context.admissions = rows; };
  vm.runInContext(`${section(admissionSource, "  const refreshAdmissions = useCallback", "  useEffect(() => {\n    setPage(1);")};globalThis.refresh = refreshAdmissions;`, context);
  assert.equal(await context.refresh(), null);
  assert.equal(context.admissions, existing);
  assert.match(toasts[0], /Previously loaded records have been kept/);
  context.apiClient.get = async () => ({ data: [{ admissionId: 6 }] });
  await context.refresh();
  assert.equal(context.admissions[0].admissionId, 6);
});

test("the existing draft retains uncertain outcome across edits and reloads until explicitly cleared", () => {
  const storage = new Map();
  const context = vm.createContext({
    window: { localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } },
    ADMISSION_DRAFT_KEY: "draft", ADMISSION_DRAFT_VERSION: 1, isBrowserStorageAvailable: () => true,
    normalizeAdmissionMobileState: value => value, migrateDraftStep: draft => draft.currentStep,
    safeStepIndex: value => value, toSerializableAdmissionValues: value => value,
  });
  vm.runInContext(`${section(admissionSource, "const readAdmissionDraft =", "const normalizeAdmissionStatus =")};globalThis.draftRead=readAdmissionDraft;globalThis.draftSave=persistAdmissionDraft;globalThis.draftClear=clearAdmissionDraft;`, context);
  context.draftSave({ currentStep: 2, formData: {}, feeSelection: [], submissionUncertain: true });
  context.draftSave({ currentStep: 1, formData: {}, feeSelection: [] });
  assert.equal(context.draftRead().submissionUncertain, true);
  context.draftClear();
  assert.notEqual(context.draftRead().submissionUncertain, true);
});

test("the real response interceptor never replays admission creates and preserves unrelated retry behavior", async () => {
  let rejectResponse, replays = [];
  const client = config => { replays.push(config); return { retried: true }; };
  client.interceptors = { request: { use() {} }, response: { use: (_success, failure) => { rejectResponse = failure; } } };
  const context = vm.createContext({
    axios: { create: () => client, isCancel: () => false }, env: {}, testEnv: { DEV: false },
    getAuthToken: () => "", clearAuthSession() {}, updateAuthToken() {}, BACKEND_ADMIN_JWT: "",
    handleMockApiRequest: async () => null, setTimeout: fn => { fn(); }, console,
  });
  const source = clientSource.replace(/^import .*;\r?\n/gm, "").replace(/import\.meta\.env/g, "testEnv")
    .replace(/export const /g, "const ").replace(/export default apiClient;/, "");
  vm.runInContext(source, context);
  for (const url of ["/api/v1/student-admissions", "/api/v1/student-admissions/?campusId=1", "https://example.test/api/v1/student-admissions"]) {
    for (const status of [undefined, 401, 502, 503, 504]) {
      replays = [];
      const failure = { message: status ? "Server error" : "Network Error", config: { method: "post", url }, ...(status ? { response: { status } } : {}) };
      await assert.rejects(rejectResponse(failure));
      assert.equal(replays.length, 0);
    }
  }
  for (const [method, url] of [["get", "/api/v1/student-admissions"], ["put", "/api/v1/student-admissions/710"], ["post", "/api/v1/student-admissions/generate-number"], ["post", "/api/v1/student-admissions/710/approve-request"], ["post", "/api/v1/other-module"]]) {
    replays = [];
    await rejectResponse({ message: "Server error", response: { status: 503 }, config: { method, url } });
    assert.equal(replays.length, 1);
  }
});


test("approval student ID lookup uses returned studentId or searches /api/v1/students by admission number", async () => {
  const helperSection = section(
    admissionSource,
    "const resolveApprovedStudentId = (...sources) => {",
    "const admissionFeeApprovalBody =",
  );
  const callbackSection = section(
    admissionSource,
    "  const resolveApprovedStudentIdFromBackend = useCallback(",
    "  const ensureApprovedStudentFeeAccount = useCallback(",
  );

  const runResolver = async ({ approvedPayload = {}, detailById = {}, admissionsList = [], studentsHandler }) => {
    const studentCalls = [];
    const context = vm.createContext({
      useCallback: (fn) => fn,
      getObject: (payload) => payload?.data ?? payload ?? {},
      getCollection: (payload) => Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [],
      normalizeAdmissionRow: (item) => ({ raw: item }),
      numericId: (value) => {
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
      },
      read: (item, ...keys) => {
        const key = keys.find((c) => item?.[c] !== undefined && item?.[c] !== null && item?.[c] !== "");
        return key ? item[key] : undefined;
      },
      readId: (item, ...keys) => {
        const key = keys.find((c) => item?.[c] !== undefined && item?.[c] !== null && item?.[c] !== "");
        return key ? item[key] : "";
      },
      readText: (item, ...keys) => {
        const key = keys.find((c) => item?.[c] !== undefined && item?.[c] !== null && item?.[c] !== "");
        return key ? String(item[key]) : "";
      },
      apiEndpoints: {
        admissions: { getById: (id) => `/api/v1/student-admissions/${id}`, getAll: "/api/v1/student-admissions" },
        students: { getAll: "/api/v1/students" },
      },
      apiClient: {
        get: async (url, config) => {
          if (url.startsWith("/api/v1/student-admissions/")) return { data: detailById };
          if (url === "/api/v1/student-admissions") return { data: admissionsList };
          if (url === "/api/v1/students") {
            studentCalls.push(config);
            return studentsHandler(config);
          }
          throw new Error(`Unexpected URL ${url}`);
        },
      },
    });
    vm.runInContext(`${helperSection}\n${callbackSection}\nglobalThis.resolveApprovedStudentIdFromBackend = resolveApprovedStudentIdFromBackend;`, context);
    const id = await context.resolveApprovedStudentIdFromBackend({
      admissionId: 658,
      approvedPayload,
      detail: {},
      detailRow: {},
    });
    return { id, studentCalls };
  };

  const direct = await runResolver({
    approvedPayload: { statusCode: 200, studentId: 943 },
    studentsHandler: () => { throw new Error("Should not query students"); },
  });
  assert.equal(direct.id, 943);
  assert.equal(direct.studentCalls.length, 0);

  const searched = await runResolver({
    approvedPayload: { statusCode: 200 },
    detailById: { admissionId: 658, admissionNo: "MADM-0106", firstName: "dora", lastName: "t" },
    admissionsList: [{ admissionId: 658, admissionNo: "MADM-0106" }],
    studentsHandler: () => ({ data: { items: [{ studentId: 943, admissionNo: "MADM-0106", studentName: "dora t" }] } }),
  });
  assert.equal(searched.id, 943);
  assert.equal(searched.studentCalls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(searched.studentCalls[0])), { params: { search: "MADM-0106", pageNumber: 1, pageSize: 50 } });
});
