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
