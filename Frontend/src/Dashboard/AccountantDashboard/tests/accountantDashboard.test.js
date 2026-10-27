import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { createServer, transformWithOxc } from "vite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import fs from "node:fs";
import vm from "node:vm";
import { matchRoutes, resolvePath } from "react-router-dom";
import * as feeView from "../utils/feeViewData.js";
import * as profileHelpers from "../utils/accountantProfileData.js";
import * as leaveHelpers from "../utils/accountantLeaveStats.js";


await describe("Fee Management - data access", async () => {

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
after(() => server.close());
const { rowsOf, unwrap, loadSections, loadPaymentHistory, loadScopedLedger, requestError } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/services/accountantService.js");
const { default: client } = await server.ssrLoadModule("/src/api/axios.js");

test("normalizes report details, serialized collections, and attendance rows", () => {
  const rows = [{ studentFeeId: 1 }];
  assert.deepEqual(rowsOf({ data: { Data: { details: { $values: rows } } } }), rows);
  assert.deepEqual(rowsOf({ Data: { StaffRows: rows } }), rows);
  assert.deepEqual(rowsOf({ details: [] }), []);
  assert.deepEqual(unwrap({ data: { Data: { totalCollected: 12 } } }), { totalCollected: 12 });
});

test("preserves independent success and reports safe endpoint/status errors", async () => {
  const failure = { config: { url: "/api/v1/fees/history/123?search=private" }, response: { status: 403, data: { message: "private student data" } } };
  const result = await loadSections({ ledger: async () => ({ data: [{ balance: 0 }] }), history: async () => { throw failure; } });
  assert.deepEqual(result.ledger, [{ balance: 0 }]);
  assert.match(result.errors[0], /HTTP 403/);
  assert.match(result.errors[0], /history\/:id/);
  assert.doesNotMatch(requestError(failure), /123|private/);
  await assert.rejects(loadSections({ ledger: async () => { throw failure; } }), (error) => error === failure);
});

test("history uses authorized bulk history and scoped ledger, excluding other assignments", async () => {
  const original = client.defaults.adapter;
  const calls = [];
  client.defaults.adapter = async (config) => {
    calls.push(config);
    const data = config.url.endsWith("/ledger")
      ? [{ studentId: 10, studentFeeId: 100 }, { studentId: 10, studentFeeId: 100 }, { studentId: 20, studentFeeId: 200 }]
      : config.url === "/api/v1/students"
        ? { items: [{ studentId: 10, boardId: 2 }, { studentId: 20, boardId: 2 }], totalPages: 1 }
      : { 10: [{ feePaymentId: 1, studentId: 10, studentFeeId: 100, amount: 30 }, { feePaymentId: 2, studentId: 10, studentFeeId: 999, amount: 40 }], 20: [{ feePaymentId: 3, studentId: 20, studentFeeId: 200, amount: 50 }] };
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    const params = { campusId: 1, boardId: 2, academicYearId: 3 };
    const result = await loadPaymentHistory(params, undefined, () => true);
    assert.deepEqual(calls[0].params, params);
    assert.deepEqual(calls.map((call) => call.url), ["/api/v1/fees/ledger", "/api/v1/students", "/api/v1/fees/bulk-history"]);
    assert.deepEqual(JSON.parse(calls[2].data), [10, 20]);
    assert.deepEqual(result.payments.map((row) => row.feePaymentId), [1, 3]);
    assert.deepEqual(result.errors, []);
  } finally {
    client.defaults.adapter = original;
  }
});

test("board scoping reads all student pages and excludes another board's ledger rows", async () => {
  const original = client.defaults.adapter;
  const pages = [];
  client.defaults.adapter = async (config) => {
    let data;
    if (config.url.endsWith("/ledger")) {
      data = [{ studentId: 10, studentFeeId: 100 }, { studentId: 20, studentFeeId: 200 }, { studentId: 30, studentFeeId: 300 }];
    } else {
      pages.push(config.params.pageNumber);
      assert.equal(config.params.boardId, 2);
      data = { items: config.params.pageNumber === 1 ? [{ studentId: 10, boardId: 2 }, { studentId: 30, boardId: 9 }] : [{ studentId: 20, boardId: 2 }], totalPages: 2 };
    }
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    const rows = await loadScopedLedger({ boardId: 2 });
    assert.deepEqual(pages, [1, 2]);
    assert.deepEqual(rows.map((row) => row.studentFeeId), [100, 200]);
  } finally {
    client.defaults.adapter = original;
  }
});

test("board verification failure does not return an unscoped ledger", async () => {
  const original = client.defaults.adapter;
  client.defaults.adapter = async (config) => {
    if (!config.url.endsWith("/ledger")) throw { config, response: { status: 403 } };
    return { data: [{ studentId: 10, studentFeeId: 100 }], status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    await assert.rejects(loadScopedLedger({ boardId: 2 }), (error) => error.response.status === 403);
  } finally {
    client.defaults.adapter = original;
  }
});

test("canceled context stops issuing history requests", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadPaymentHistory({ campusId: 1 }, controller.signal));
});

test("display adapters use backend payroll and fee fields without inventing missing values", async () => {
  const { normalizePayment, normalizeDue, normalizePayroll, formatMoney } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/pages/AccountantPages.jsx");
  assert.equal(normalizePayment({ PaidAmount: 0, Collected: 45 }).amount, 45);
  assert.equal(normalizePayment({ Amount: 0, PaidAmount: 45 }).amount, 0);
  assert.equal(normalizePayment({ TransactionReference: "test-ref" }).transaction, "test-ref");
  assert.equal(normalizeDue({ BalanceAmount: 0 }).amount, 0);
  const payroll = normalizePayroll({ PayrollMonth: 10, PayrollYear: 2026, NetSalary: 100, PayslipStatus: "On Hold" });
  assert.equal(payroll.month, "10 / 2026");
  assert.equal(payroll.status, "On Hold");
  assert.equal(formatMoney(undefined), "-");
  assert.equal(normalizePayment({}).amount, undefined);
});

});

await describe("Fee Management - ledger", async () => {

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
after(() => server.close());
const { ledgerDetailEndpoint, ledgerPage, loadLedgerDetails } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/services/accountantService.js");
const { default: client } = await server.ssrLoadModule("/src/api/axios.js");
const { FeePagination } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/components/AccountantUI.jsx");
const withAdapter = async (adapter, work) => {
  const original = client.defaults.adapter;
  client.defaults.adapter = adapter;
  try { await work(); } finally { client.defaults.adapter = original; }
};
const response = (config, data) => ({ data, config, status: 200, statusText: "OK", headers: {} });
const students = Array.from({ length: 13 }, (_, i) => ({ studentId: 101 + i, studentFeeId: 501 + i, studentName: `Student ${i + 1}`, admissionNumber: `ADM-${i + 1}`, groupName: i < 8 ? "MPC" : "BIPC", sectionName: i % 2 ? "A" : "B", paymentPlan: i % 2 ? "Monthly" : "Full Payment", status: i % 2 ? "Paid" : "Pending" }));

test("View uses the selected student ID, never a fee ID in the student endpoint", () => {
  assert.equal(ledgerDetailEndpoint(students[0]), "/api/v1/fees/students/101/fee-details");
  assert.equal(ledgerDetailEndpoint({ StudentId: "102", StudentFeeId: 999 }), "/api/v1/fees/students/102/fee-details");
  assert.equal(ledgerDetailEndpoint({ studentFeeId: 501 }), "/api/v1/fees/student-fees/501");
});

test("invalid IDs never cause a request or a guessed student ID", async () => {
  await withAdapter(() => { assert.fail("Invalid IDs must not contact an API"); }, async () => {
    for (const studentId of [0, -1, "undefined", ":id", "1/fees", 1.5, 2147483648]) {
      await assert.rejects(loadLedgerDetails({ studentId, studentFeeId: 501 }), /ID is invalid/);
    }
    for (const studentFeeId of [null, "", ":id", -1]) await assert.rejects(loadLedgerDetails({ studentFeeId }), /no valid identifier/);
  });
});

test("first and different students load their own returned details without invented values", async () => {
  const calls = [];
  const signal = new AbortController().signal;
  await withAdapter(async (config) => {
    calls.push(config);
    const studentId = Number(config.url.match(/students\/(\d+)/)[1]);
    return response(config, { Data: { StudentId: studentId, AdmissionNumber: `ADM-${studentId - 100}`, Breakdown: [{ FeeType: "Tuition", Payable: 500 }], Schedules: [{ DueDate: "2026-10-30", Amount: 500 }], TotalPayable: 500, TotalPaid: 0, OutstandingBalance: 500, PaymentPlan: "Monthly", FeeStatus: "Pending" } });
  }, async () => {
    for (const row of [students[0], students[6]]) {
      const detail = await loadLedgerDetails(row, signal);
      assert.equal(detail.StudentId, row.studentId);
      assert.equal(detail.AdmissionNumber, row.admissionNumber);
      assert.equal(detail.Breakdown[0].Payable, 500);
      assert.equal(detail.Schedules[0].DueDate, "2026-10-30");
      assert.equal(detail.TotalPaid, 0);
    }
    assert.deepEqual(calls.map((config) => [config.method, config.url]), [["get", "/api/v1/fees/students/101/fee-details"], ["get", "/api/v1/fees/students/107/fee-details"]]);
    assert.ok(calls.every((config) => config.signal === signal));
  });
});

test("wrong-student, empty and unsuccessful responses are never shown as fee details", async () => {
  for (const data of [null, {}, [], { success: false }, { studentId: 999 }, { studentId: 101, admissionNumber: "OTHER" }]) {
    await withAdapter(async (config) => response(config, data), async () => {
      await assert.rejects(loadLedgerDetails(students[0]), /not returned|do not match|unsuccessful/);
    });
  }
});

test("400 validation is preserved; authorization and missing-record errors never trigger another endpoint", async () => {
  const previousWindow = globalThis.window;
  const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  globalThis.window = { location: { pathname: "/login" }, localStorage: storage, sessionStorage: storage };
  try {
    for (const status of [400, 401, 403, 404, 500]) {
      let calls = 0;
      const failure = Object.assign(new Error("Request failed"), { response: { status, data: { message: "Validation failed", errors: { StudentId: ["Student ID was not found."] } } }, config: { url: "/api/v1/fees/students/101/fee-details" } });
      await withAdapter(async () => { calls += 1; throw failure; }, async () => {
        if (status === 400) await assert.rejects(loadLedgerDetails(students[0]), /HTTP 400.*Validation failed.*Student ID was not found/);
        else await assert.rejects(loadLedgerDetails(students[0]), (error) => error === failure);
        assert.equal(calls, 1);
      });
    }
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("ledger pages contain five rows with no skipped or duplicate records", () => {
  const pages = [1, 2, 3].map((page) => ledgerPage(students, page));
  assert.deepEqual(pages.map((page) => page.rows.length), [5, 5, 3]);
  assert.deepEqual(pages.map(({ start, end, total, pages }) => [start, end, total, pages]), [[1, 5, 13, 3], [6, 10, 13, 3], [11, 13, 13, 3]]);
  assert.deepEqual(pages.flatMap((page) => page.rows.map((row) => row.studentId)), students.map((row) => row.studentId));
  assert.equal(ledgerPage(students, 99).current, 3);
  assert.equal(ledgerPage(students, 0).current, 1);
});

test("all four filters and search are applied before five-row pagination", () => {
  assert.equal(ledgerPage(students, 1, "", { groupName: "MPC" }).total, 8);
  const filters = { groupName: "MPC", sectionName: "A", paymentPlan: "Monthly", status: "Paid" };
  assert.deepEqual(ledgerPage(students, 1, "", filters).rows.map((row) => row.studentId), [102, 104, 106, 108]);
  assert.equal(ledgerPage(students, 1, "ADM-8", filters).rows[0].studentId, 108);
  assert.equal(ledgerPage(students, 1, "Student 8", filters).total, 1);
  assert.deepEqual(ledgerPage(students, 9, "not found"), { rows: [], total: 0, pages: 1, current: 1, start: 0, end: 0 });
});

test("Admin-style Previous/Next controls reflect the first, middle, last and empty pages", () => {
  for (const [rows, number, disabled] of [[students, 1, 1], [students, 2, 0], [students, 3, 1], [[], 1, 2]]) {
    const page = ledgerPage(rows, number);
    const html = renderToStaticMarkup(createElement(FeePagination, { page, onPage: () => {} }));
    assert.equal((html.match(/disabled=""/g) || []).length, disabled);
    assert.match(html, new RegExp(`Page ${page.current} of ${page.pages}`));
    assert.match(html, /cms-fee-pagination/);
  }
});

test("returning from details retains ledger state, while search and filter changes reset the page", async () => {
  const source = await readFile(new URL("../pages/AccountantFeeManagement.jsx", import.meta.url), "utf8");
  assert.match(source, /if \(detailRow\) return <FeeDetails[^\n]*onClose=\{\(\) => setDetailRow\(null\)\}/);
  assert.match(source, /const changeFilter = .*setPageNumber\(1\)/);
  assert.match(source, /setSearch\(value\); setPageNumber\(1\)/);
  assert.match(source, /rowsOf\(readFee\(state.data, "breakdown"\)\)/);
  assert.match(source, /"outstandingBalance"/);
});

});

await describe("Fee Management - requests", async () => {
const { pageOf } = feeView;
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
after(() => server.close());
const { checkedFeeRows, loadSetupRecords, loadFeeOverview } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/services/accountantService.js");
const { default: client } = await server.ssrLoadModule("/src/api/axios.js");

const withAdapter = async (adapter, work) => {
  const original = client.defaults.adapter;
  client.defaults.adapter = async (config) => ({ data: await adapter(config), status: 200, statusText: "OK", headers: {}, config });
  try { await work(); } finally { client.defaults.adapter = original; }
};

test("master requests match Admin and preserve shared configured types", async () => {
  await withAdapter((config) => {
    assert.equal(config.url, "/api/v1/fees/types");
    assert.equal(config.params, undefined);
    return { Data: { $values: [{ FeeTypeId: 1, FeeTypeName: "Tuition", CampusId: null }, { FeeTypeId: 2, FeeTypeName: "Exam", CampusId: 1 }, { FeeTypeId: 3, CampusId: 9 }] } };
  }, async () => {
    const result = await loadSetupRecords("types", "/api/v1/fees/types", { campusId: 1, boardId: 2, academicYearId: 3 });
    assert.deepEqual(result.rows.map((row) => row.FeeTypeId), [1, 2]);
  });
});

test("failed/malformed envelopes are never presented as an empty master list", () => {
  assert.throws(() => checkedFeeRows({ success: false, data: [] }), /unsuccessful/);
  assert.throws(() => checkedFeeRows({ data: { Status: false, Data: [] } }), /unsuccessful/);
  assert.throws(() => checkedFeeRows({ unexpected: [] }), /unrecognized/);
  assert.deepEqual(checkedFeeRows({ success: true, data: [] }), []);
  assert.deepEqual(checkedFeeRows({ data: { Items: [{ feeTypeId: 1 }] } }), [{ feeTypeId: 1 }]);
});

test("structure list matches Admin's campus request without dropping other returned boards or years", async () => {
  const records = [
    { feeStructureId: 1, boardId: 2, academicYearId: 3, academicLevelId: 1 },
    { feeStructureId: 2, boardId: 2, academicYearId: 3, academicLevelId: 2 },
    { feeStructureId: 3, boardId: 4, academicYearId: 5 },
    { feeStructureId: 4, boardId: null, academicYearId: null },
  ];
  await withAdapter((config) => {
    assert.equal(config.url, "/api/v1/fees/structures");
    assert.deepEqual(config.params, { campusId: 1 });
    return { Data: { Items: records } };
  }, async () => {
    const result = await loadSetupRecords("structures", "/api/v1/fees/structures", { campusId: 1, boardId: 2, academicYearId: 3 });
    assert.deepEqual(result.rows, records);
    assert.equal(result.rows.length, 4);
  });
});

test("permission denial remains an error and does not retry a broader request", async () => {
  let calls = 0;
  await withAdapter((config) => { calls += 1; throw { config, response: { status: 403 } }; }, async () => {
    await assert.rejects(loadSetupRecords("types", "/api/v1/fees/types", {}), (error) => error.response.status === 403);
    assert.equal(calls, 1);
  });
});

test("transport uses documented server paging and requires its total count", async () => {
  await withAdapter((config) => {
    assert.deepEqual(config.params, { campusId: 1, pageNumber: 2, pageSize: 5, search: "North" });
    return { items: [{ pickupPointId: 11 }], totalCount: 11 };
  }, async () => {
    assert.deepEqual(await loadSetupRecords("transport", "/api/v1/transport/pickup-points", { campusId: 1 }, undefined, { page: 2, search: "North" }), { rows: [{ pickupPointId: 11 }], total: 11 });
  });
  await withAdapter(() => ({ items: [] }), async () => {
    await assert.rejects(loadSetupRecords("transport", "/api/v1/transport/pickup-points", {}, undefined, { page: 1, search: "" }), /totalCount/);
  });
});

test("overview preserves a successful dashboard when dues are denied", async () => {
  await withAdapter((config) => {
    if (config.url.endsWith("/due")) throw { config, response: { status: 403 } };
    return { totalCollected: 1200, groupWiseCollection: [] };
  }, async () => {
    const result = await loadFeeOverview({ campusId: 1 });
    assert.equal(result.dashboard.totalCollected, 1200);
    assert.equal(result.due, null);
    assert.match(result.errors.due, /permission.*HTTP 403/);
  });
});

test("overview reports unsuccessful dashboard envelopes rather than inventing totals", async () => {
  await withAdapter((config) => config.url.endsWith("/due") ? [] : { success: false, data: {} }, async () => {
    const result = await loadFeeOverview({});
    assert.equal(result.dashboard, null);
    assert.match(result.errors.dashboard, /unsuccessful/);
  });
});

test("fee table and pagination render the Admin classes with ten rows and correct boundaries", async () => {
  const { FeeTable, FeePagination } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/components/AccountantUI.jsx");
  const records = Array.from({ length: 23 }, (_, index) => ({ studentName: `Test Student ${index + 1}` }));
  const first = pageOf(records, 1);
  const html = renderToStaticMarkup(createElement(FeeTable, { rows: first.rows, columns: [{ label: "Student", value: (row) => row.studentName }] }));
  assert.match(html, /cms-table cms-fee-table/);
  assert.equal((html.match(/<tbody><tr>|<\/tr><tr>/g) || []).length, 10);
  assert.doesNotMatch(html, /Test Student 11/);
  const nav = renderToStaticMarkup(createElement(FeePagination, { page: first, onPage: () => {} }));
  assert.match(nav, /cms-fee-pagination/);
  assert.match(nav, /disabled="">Previous/);
  assert.match(nav, /Page 1 of 3/);
  const last = renderToStaticMarkup(createElement(FeePagination, { page: pageOf(records, 3), onPage: () => {} }));
  assert.match(last, /Showing 21-23 of 23 records/);
  assert.match(last, /disabled="">Next/);
});

test("loading, permission errors, and empty results render distinct table states", async () => {
  const { FeeTable } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/components/AccountantUI.jsx");
  const props = { rows: [], columns: [{ label: "Name", value: () => "" }], empty: "No fee types found." };
  const loading = renderToStaticMarkup(createElement(FeeTable, { ...props, loading: true }));
  assert.match(loading, /accountant-fee-skeleton/);
  assert.doesNotMatch(loading, /No fee types found/);
  const denied = renderToStaticMarkup(createElement(FeeTable, { ...props, error: "Permission denied" }));
  assert.match(denied, /role="alert">Permission denied/);
  assert.doesNotMatch(denied, /No fee types found/);
  assert.match(renderToStaticMarkup(createElement(FeeTable, props)), /No fee types found/);
});

test("overview renders Admin summary, chart and tabs without zero-filled missing metrics", async () => {
  const { default: Overview } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/components/AccountantFeeOverview.jsx");
  const html = renderToStaticMarkup(createElement(Overview, { params: {} }));
  assert.equal((html.match(/class="cms-fee-stat-value">-</g) || []).length, 4);
  for (const label of ["Group-wise Collection", "Fee Management Overview", "Overdue Fees", "Upcoming Fee Schedules", "Recent Payments"]) assert.ok(html.includes(label), label);
  assert.match(html, /cms-fee-stat-grid/);
  assert.match(html, /cms-fee-overview-tabs/);
});

});

await describe("Fee Management - setup", async () => {

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
after(() => server.close());
const setup = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/services/accountantService.js");
const { can } = await server.ssrLoadModule("/src/features/rolesPermissions/permissionUtils.jsx");
const { default: client } = await server.ssrLoadModule("/src/api/axios.js");
const permissions = (matrix) => ({ loading: false, error: "", canView: (module, screen) => can(module, "view", matrix, { role: "Accountant" }, screen), canDo: (module, action, screen) => can(module, action, matrix, { role: "Accountant" }, screen) });
const feePermissions = (actions) => permissions([{ module: "fee-management", screenId: "fee-structure", actions }]);
const guard = (access) => (action, method, endpoint) => setup.requireSetupAction(access, action, method, endpoint);
const withAdapter = async (adapter, work) => {
  const original = client.defaults.adapter;
  client.defaults.adapter = async (config) => ({ data: await adapter(config), status: 200, statusText: "OK", headers: {}, config });
  try { await work(); } finally { client.defaults.adapter = original; }
};

test("view-only roles never acquire create/edit/delete access", () => {
  for (const kind of ["types", "structures", "scholarships", "fine"]) {
    const access = setup.feeSetupAccess(feePermissions(["view"]), kind);
    assert.equal(access.view, true);
    assert.equal(access.create, false);
    assert.equal(access.edit, false);
    assert.equal(access.delete, false);
  }
  assert.equal(setup.feeSetupAccess(feePermissions(["view", "create", "edit", "delete"]), "types").create, true);
  assert.equal(setup.feeSetupAccess(feePermissions([]), "types").view, false);
  const loading = { ...feePermissions(["view", "create"]), loading: true };
  assert.equal(setup.feeSetupAccess(loading, "types").create, false);
});

test("hostel permissions are isolated and transport fares use Fee Setup permissions", () => {
  const hostel = permissions([{ module: "fee-management", screenId: "hostel-fees", actions: ["view", "edit"] }]);
  assert.equal(setup.feeSetupAccess(hostel, "hostel").edit, true);
  const transport = permissions([{ module: "transport", screenId: "routes", actions: ["view", "manage-routes", "edit"] }]);
  const access = setup.feeSetupAccess(feePermissions(["view", "create", "edit", "delete"]), "transport");
  assert.deepEqual([access.view, access.create, access.edit, access.delete], [true, true, true, false]);
  assert.equal(setup.feeSetupAccess(transport, "transport").view, false);
  const readOnly = setup.feeSetupAccess(feePermissions(["view"]), "transport");
  assert.deepEqual([readOnly.view, readOnly.create, readOnly.edit, readOnly.delete], [true, false, false, false]);
  assert.throws(() => setup.requireSetupAction(readOnly, "create", "POST", "/api/v1/transport/pickup-points"), /fee-management:fee-structure:create/);
  assert.throws(() => setup.requireSetupAction(readOnly, "edit", "PUT", "/api/v1/transport/pickup-points/1"), /fee-management:fee-structure:edit/);
});

test("unauthorized writes are blocked before contacting any endpoint", async () => {
  let calls = 0;
  await withAdapter(() => { calls += 1; return {}; }, async () => {
    const access = setup.feeSetupAccess(feePermissions(["view"]), "types");
    await assert.rejects(setup.saveSetupRecord("types", { feeTypeName: "Test", category: "Academic", status: "Active" }, null, {}, guard(access)), /fee-management:fee-structure:create.*POST/);
    await assert.rejects(setup.deleteSetupRecord("types", { feeTypeId: 7 }, guard(access)), /fee-management:fee-structure:delete.*DELETE/);
    assert.equal(calls, 0);
  });
});

test("authorized master creation, editing and deletion use the existing contracts", async () => {
  const calls = [];
  await withAdapter((config) => { calls.push(config); return { success: true, data: { feeTypeId: 7 } }; }, async () => {
    const access = setup.feeSetupAccess(feePermissions(["view", "create", "edit", "delete"]), "types");
    const draft = { feeTypeName: "  Tuition Fee  ", category: "Academic", status: "Active" };
    await setup.saveSetupRecord("types", draft, null, {}, guard(access));
    await setup.saveSetupRecord("types", { ...draft, status: "Inactive" }, { feeTypeId: 7 }, {}, guard(access));
    await setup.deleteSetupRecord("types", { feeTypeId: 7 }, guard(access));
    assert.deepEqual(calls.map((config) => [config.method, config.url]), [["post", "/api/v1/fees/types"], ["put", "/api/v1/fees/types/7"], ["delete", "/api/v1/fees/types/7"]]);
    assert.deepEqual(JSON.parse(calls[0].data), { FeeTypeName: "Tuition Fee", FeeTypeCode: "TUITION_FEE", Category: "Academic", IsActive: true });
    assert.equal(JSON.parse(calls[1].data).IsActive, false);
  });
});

test("all simple fee setup payloads retain the documented fields", () => {
  assert.deepEqual(setup.setupPayload("scholarships", { scholarshipName: " Merit ", discountType: "Fixed", discountValue: "500", status: "Active" }), { ScholarshipName: "Merit", DiscountType: "Fixed", DiscountValue: 500, IsActive: true });
  assert.deepEqual(setup.setupPayload("fine", { fineRuleName: " Late ", applicableFeeId: "3", fineType: "Percentage", fineAmount: "5", gracePeriod: "2", status: "Active" }), { fineRuleName: "Late", applicableFeeId: 3, fineType: "Percentage", fineAmount: 5, gracePeriod: 2, status: "Active" });
  const hostel = setup.setupPayload("hostel", { hostelId: "1", roomTypeId: "2", feeFrequency: "Annual", hostelFeeAmount: "500", securityDeposit: "20", effectiveDate: "2026-10-16", status: "Inactive" });
  assert.equal(hostel.hostelFeeAmount, 500);
  assert.equal(hostel.feeFrequency, "Annual");
  const transport = setup.setupPayload("transport", { routeId: "1", pickupPointName: " Stop ", landmark: "A", sequenceNo: "2", pickupTime: "07:30", dropTime: "16:15", distanceFromStart: "4", monthlyFee: "500", status: "Inactive" });
  assert.equal(transport.pickupPointName, "Stop");
  assert.equal(transport.pickupTime, "07:30:00");
  assert.equal(transport.monthlyFee, 500);
  assert.equal(transport.status, false);
});

test("validation rejects duplicates, invalid percentages, missing selections and non-positive fees", () => {
  assert.match(setup.validateSetupDraft("types", { feeTypeName: "Tuition" }, [{ feeTypeId: 7, feeTypeName: "TUITION" }], null), /already exists/);
  assert.match(setup.validateSetupDraft("scholarships", { scholarshipName: "Merit", discountType: "Percentage", discountValue: "101" }, [], null), /percentages/);
  assert.match(setup.validateSetupDraft("fine", { fineRuleName: "Late", applicableFeeId: "", fineAmount: "5" }, [], null), /Applicable/);
  assert.match(setup.validateSetupDraft("hostel", { hostelId: "1", roomTypeId: "2", hostelFeeAmount: "-1" }, [], null), /valid hostel/);
  assert.match(setup.validateSetupDraft("transport", { routeId: "", pickupPointName: "Stop" }, [], null), /Select route/);
});

const structure = { boardId: "1", academicYearId: "2", groupId: "3", programId: "4", yearFeeMode: "different", incrementType: "percentage", incrementValue: "10", status: "Active", items: [{ feeTypeId: 7, feeTypeName: "Course Fee", rule: "Mandatory", amount: "1000", isActive: true }] };

test("structure creation leaves paired-year generation to a single existing server request", async () => {
  const calls = [];
  const access = setup.feeSetupAccess(feePermissions(["view", "create"]), "structures");
  assert.equal(setup.validateSetupDraft("structures", structure, [], null), "");
  assert.deepEqual(setup.structureDraftPreview(structure), { first: 1000, increment: 100, second: 1100 });
  await withAdapter((config) => { calls.push(config); return { feeStructureId: 8, pairedStructureId: 9 }; }, async () => {
    await setup.saveSetupRecord("structures", structure, null, { campusId: 1 }, guard(access));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/v1/fees/structures");
    assert.deepEqual(JSON.parse(calls[0].data), { campusId: 1, boardId: 1, academicYearId: 2, groupId: 3, programId: 4, yearFeeMode: "different", incrementType: "percentage", incrementValue: 10, items: [{ feeTypeId: 7, rule: "Mandatory", amount: 1000 }] });
  });
});

test("five-record fee pages filter before paging and clamp after data changes", () => {
  const records = Array.from({ length: 23 }, (_, index) => ({ feeTypeId: index + 1, feeTypeName: `Fee ${index + 1}`, status: index % 2 ? "Inactive" : "Active" }));
  const seen = [];
  for (let number = 1; number <= 5; number++) {
    const page = feeView.pageOf(records, number, "", "", 5);
    assert(page.rows.length <= 5);
    seen.push(...page.rows.map(row => row.feeTypeId));
  }
  assert.deepEqual(seen, records.map(row => row.feeTypeId));
  const filtered = feeView.pageOf(records, 2, "fee 1", "Active", 5);
  assert.equal(filtered.total, 6);
  assert.deepEqual(filtered.rows.map(row => row.feeTypeId), [19]);
  assert.deepEqual(feeView.pageOf([], 5, "", "", 5), { rows: [], total: 0, pages: 1, current: 1, start: 0, end: 0 });
  assert.equal(feeView.pageOf(records.slice(0, 7), 5, "", "", 5).current, 2);
  assert.equal(feeView.pageOf(records, 5, "", "", 5).start, 21);
});

test("numbered fee navigation supports direct selection and correct boundaries", async () => {
  const { FeePagination } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/components/AccountantUI.jsx");
  const nodes = node => node && typeof node === "object" ? [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)] : [];
  const records = Array.from({ length: 23 }, () => ({}));
  let selected = 1;
  const render = () => nodes(FeePagination({ page: feeView.pageOf(records, selected, "", "", 5), onPage: number => { selected = number; }, numbered: true }));
  assert.equal(render().find(node => node.props?.children === "Previous").props.disabled, true);
  render().find(node => node.props?.["aria-label"] === "Page 5 of 5").props.onClick();
  assert.equal(selected, 5);
  assert.equal(render().find(node => node.props?.children === "Next").props.disabled, true);
  render().find(node => node.props?.children === "Previous").props.onClick();
  assert.equal(selected, 4);
  render().find(node => node.props?.children === "Next").props.onClick();
  assert.equal(selected, 5);
});

test("outside year controls configure new structures and display saved pairs without changing them", async () => {
  const source = await readFile(new URL("../pages/AccountantFeeManagement.jsx", import.meta.url), "utf8");
  const { code } = await transformWithOxc(source.slice(source.indexOf("function YearConfiguration"), source.indexOf("function SetupRecords")), "YearConfiguration.jsx", { jsx: { runtime: "classic" } });
  const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }) };
  const context = vm.createContext({ React, ...feeView, structureDraftPreview: setup.structureDraftPreview });
  vm.runInContext(`${code};globalThis.Component=YearConfiguration`, context);
  const structures = [{ feeStructureId: 8, pairedStructureId: 9, yearFeeMode: "different", incrementType: "fixed", incrementValue: 500, totalAmount: 1000 }, { feeStructureId: 9, pairedStructureId: 8, academicLevelId: 2, totalAmount: 1500 }];
  const props = { structures, selectedId: "", settings: { yearFeeMode: "same", incrementType: "percentage", incrementValue: "" }, canCreate: true, firstYearTotal: 1000, isAdding: false,
    onChange: settings => { props.settings = settings; }, onSelect: id => { props.selectedId = id; } };
  const nodes = node => node && typeof node === "object" ? [node, ...(node.props?.children || []).flatMap(nodes)] : [];
  const render = () => nodes(context.Component(props));
  assert.equal(render().find(node => node.type === "fieldset").props.disabled, false);
  render().filter(node => node.props?.name === "accountant-year-mode")[1].props.onChange();
  render().find(node => node.props?.id === "accountant-year-increment").props.onChange({ target: { value: "10" } });
  assert.equal(props.settings.yearFeeMode, "different");
  assert.equal(setup.structureDraftPreview({ ...props.settings, items: structure.items }).second, 1100);
  const amounts = render().filter(node => node.type === "dd").map(node => node.props.children.join(""));
  assert(amounts.includes(feeView.feeMoney(1100)));
  render().find(node => node.type === "select").props.onChange({ target: { value: "8" } });
  assert.equal(render().find(node => node.type === "fieldset").props.disabled, true);
  assert(render().filter(node => node.type === "dd").some(node => node.props.children.join("") === feeView.feeMoney(1500)));
  props.selectedId = "9";
  assert(render().filter(node => node.type === "dd").some(node => node.props.children.join("") === feeView.feeMoney(1000)));
  props.selectedId = ""; props.canCreate = false;
  assert.equal(render().find(node => node.type === "fieldset").props.disabled, true);
  assert.equal(structures[0].incrementValue, 500);
});

test("structure modal uses outside configuration for creation only and preserves edit requests", async () => {
  const source = await readFile(new URL("../components/AccountantFeeSetupModal.jsx", import.meta.url), "utf8");
  assert(!source.includes("Fee Configuration by Year"));
  const { code } = await transformWithOxc(source.slice(source.indexOf("function SetupEditor"), source.indexOf("function ViewRecord")), "SetupEditor.jsx", { jsx: { runtime: "classic" } });
  const calls = [];
  const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }) };
  const context = vm.createContext({ React, ...setup, useState: value => [typeof value === "function" ? value() : value, () => {}], useRef: value => ({ current: value }), useEffect: effect => effect(),
    Modal: "Modal", StructureFields: "StructureFields", SimpleFields: "SimpleFields", FeeNotice: "FeeNotice", requestError: error => error.message });
  vm.runInContext(`${code};globalThis.Component=SetupEditor`, context);
  const saved = { feeStructureId: 8, ...structure, structureName: "Saved", items: [{ ...structure.items[0], feeStructureComponentId: 22 }] };
  const nodes = node => node && typeof node === "object" ? [node, ...(node.props?.children || []).flatMap(nodes)] : [];
  const yearSettings = { yearFeeMode: "different", incrementType: "fixed", incrementValue: "250" };
  const access = setup.feeSetupAccess(feePermissions(["view", "create", "edit"]), "structures");
  await withAdapter(config => { calls.push(config); return { feeStructureId: 8 }; }, async () => {
    for (const row of [null, saved]) {
      let total;
      const tree = context.Component({ kind: "structures", row, rows: [], params: {}, data: { detail: row, lookups: { types: [{ feeTypeId: 7, feeTypeName: "Course Fee" }] } }, authorize: guard(access), onSaved() {}, onClose() {}, yearSettings, onDraftTotalChange: value => { total = value; } });
      const fields = nodes(tree).find(node => node.type === "StructureFields");
      if (!row) {
        assert.equal(fields.props.draft.yearFeeMode, "different");
        assert.equal(fields.props.draft.incrementValue, "250");
        Object.assign(fields.props.draft, structure, yearSettings);
      } else {
        assert.equal(fields.props.draft.incrementType, "percentage");
        assert.equal(total, 1000);
      }
      await nodes(tree).find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
    }
  });
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(calls[0].data).incrementValue, 250);
  assert.equal(calls[1].method, "put");
  assert(!Object.hasOwn(JSON.parse(calls[1].data), "yearFeeMode"));
});

test("structure dropdowns keep Admin field order and select the first returned program", async () => {
  const source = await readFile(new URL("../components/AccountantFeeSetupModal.jsx", import.meta.url), "utf8");
  const { code } = await transformWithOxc(source.slice(source.indexOf("const categories"), source.indexOf("function SetupEditor")), "StructureFields.jsx", { jsx: { runtime: "classic" } });
  const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }), Fragment: "Fragment" };
  let index = 0;
  const data = [{ loading: false, data: [{ groupId: 3, groupName: "Group" }] }, { loading: false, data: [{ id: 4, name: "Regular" }, { id: 5, name: "Other" }] }];
  const context = vm.createContext({ React, ...feeView, structureDraftPreview: setup.structureDraftPreview, useCallback: fn => fn, useEffect: fn => fn(), useFinancePage: () => data[index++], FeeLoadState: "LoadState", FeeTable: "FeeTable" });
  vm.runInContext(`${code};globalThis.Component=StructureFields`, context);
  const draft = { ...structure, programId: "" };
  const props = { draft, update: (key, value) => { draft[key] = value; }, lookups: { boards: [], years: [] }, params: {} };
  const tree = context.Component(props);
  const fields = tree.props.children[0].props.children;
  assert.deepEqual(fields.filter(Boolean).map(node => node.props.label), ["Board", "Academic Year", "Group", "Program"]);
  assert.equal(draft.programId, 4);
  draft.programId = "5"; index = 0; context.Component(props);
  assert.equal(draft.programId, "5");
  data[1] = { loading: true, data: null }; draft.programId = ""; index = 0;
  assert.equal(context.Component(props).props.children[0].props.children[3].props.disabled, true);
  assert.equal(draft.programId, "");
});

test("unchanged server-generated zero components are preserved, not re-saved", async () => {
  const row = { feeStructureId: 8, boardId: 1, academicYearId: 2, groupId: 3, programId: 4, isActive: true, items: [{ feeStructureComponentId: 22, feeTypeId: 7, feeTypeName: "Admission Fee", rule: "Mandatory", amount: 0, isActive: true }] };
  const draft = setup.setupDraft("structures", row, { types: [] }, {});
  assert.equal(setup.validateSetupDraft("structures", draft, [row], row), "");
  const calls = [];
  await withAdapter((config) => { calls.push(config); return row; }, async () => {
    await setup.saveSetupRecord("structures", draft, row, {}, guard(setup.feeSetupAccess(feePermissions(["view", "edit"]), "structures")));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/v1/fees/structures/8");
  });
});

test("permission revocation stops subsequent structure item updates", async () => {
  const access = setup.feeSetupAccess(feePermissions(["view", "edit"]), "structures");
  let calls = 0;
  const draft = { ...structure, items: [{ ...structure.items[0], itemId: 22, original: { rule: "Mandatory", amount: 500, isActive: true } }] };
  await withAdapter(() => { calls += 1; access.edit = false; return { feeStructureId: 8 }; }, async () => {
    await assert.rejects(setup.saveSetupRecord("structures", draft, { feeStructureId: 8 }, {}, guard(access)), (error) => error.feeSaveUncertain && /Permission required/.test(error.message));
    assert.equal(calls, 1);
  });
});

test("backend denials do not become fake successes or trigger alternate endpoints", async () => {
  let calls = 0;
  await withAdapter((config) => { calls += 1; throw { config, response: { status: 403 } }; }, async () => {
    const access = setup.feeSetupAccess(feePermissions(["view", "create"]), "types");
    await assert.rejects(setup.saveSetupRecord("types", { feeTypeName: "Test", category: "Academic", status: "Active" }, null, {}, guard(access)), (error) => error.response.status === 403);
    assert.equal(calls, 1);
  });
  await withAdapter(() => ({ success: false }), async () => {
    await assert.rejects(setup.deleteSetupRecord("types", { feeTypeId: 7 }, guard(setup.feeSetupAccess(feePermissions(["view", "delete"]), "types"))), /unsuccessful/);
  });
});

test("lookup pagination loads every page and view-only details avoid unrelated lookups", async () => {
  const calls = [];
  await withAdapter((config) => {
    calls.push(config.url);
    if (config.url.endsWith("/routes")) return { items: [{ routeId: config.params.pageNumber }], totalPages: 2 };
    return { feeTypeId: 7, feeTypeName: "Tuition" };
  }, async () => {
    assert.equal((await setup.loadFeeOptions("/api/v1/transport/routes", {}, undefined)).length, 2);
    const result = await setup.loadSetupEditor("types", { feeTypeId: 7 }, {}, undefined, true);
    assert.equal(result.detail.feeTypeName, "Tuition");
    assert.deepEqual(calls, ["/api/v1/transport/routes", "/api/v1/transport/routes", "/api/v1/fees/types/7"]);
  });
});

test("a failing structure detail route can use the authorized items response, but never bypasses a denial", async () => {
  const row = { feeStructureId: 8, structureName: "Saved", boardId: 1, academicYearId: 2, groupId: 3, programId: 4 };
  const item = { feeStructureComponentId: 22, feeTypeId: 7, feeTypeName: "Tuition", amount: 1000, rule: "Mandatory", isActive: true };
  await withAdapter((config) => {
    if (config.url.endsWith("/8")) throw { config, response: { status: 500 } };
    return [item];
  }, async () => {
    const result = await setup.loadSetupEditor("structures", row, {}, undefined, true);
    assert.equal(result.detail.structureName, "Saved");
    assert.deepEqual(result.detail.items, [item]);
    assert.match(result.warnings[0], /HTTP 500/);
  });
  await withAdapter((config) => {
    if (config.url.endsWith("/8")) throw { config, response: { status: 403 } };
    return [item];
  }, async () => {
    await assert.rejects(setup.loadSetupEditor("structures", row, {}, undefined, true), (error) => error.response.status === 403);
  });
});

test("editing rejects saved components without their backend IDs", () => {
  const row = { feeStructureId: 8, boardId: 1, academicYearId: 2, groupId: 3, programId: 4, items: [{ feeTypeId: 7, feeTypeName: "Tuition", amount: 1000, isActive: true }] };
  const draft = setup.setupDraft("structures", row, { types: [] }, {});
  assert.match(setup.validateSetupDraft("structures", draft, [row], row), /component IDs/);
});

});

await describe("Fee Management - views and routes", async () => {
const { feeMoney, pageOf, readFee, scopedStructures, scopedFeeMasters, savedYearSummary, splitFeeSchedules } = feeView;
const ledger = Array.from({ length: 25 }, (_, index) => ({
  studentFeeId: index + 1, studentName: `Student ${index + 1}`, admissionNumber: `ADM-${index + 1}`,
  status: index < 12 ? "Paid" : "Pending", balance: index < 12 ? 0 : 100,
}));

test("ledger pagination includes paid accounts and limits each page to ten", () => {
  const first = pageOf(ledger, 1);
  assert.equal(first.rows.length, 10);
  assert.equal(first.total, 25);
  assert.equal(first.pages, 3);
  assert.equal(first.start, 1);
  assert.equal(first.end, 10);
  assert.equal(first.rows[0].balance, 0);
  const second = pageOf(ledger, 2);
  assert.deepEqual(second.rows.map((row) => row.studentFeeId), Array.from({ length: 10 }, (_, index) => index + 11));
  const last = pageOf(ledger, 3);
  assert.equal(last.rows.length, 5);
  assert.equal(last.start, 21);
  assert.equal(last.end, 25);
});

test("search and status filtering happen before pagination", () => {
  const search = pageOf(ledger, 1, "  STUDENT 2 ");
  assert.equal(search.total, 7);
  assert.equal(search.rows[0].studentFeeId, 2);
  assert.equal(pageOf(ledger, 1, "ADM-25").rows[0].studentFeeId, 25);
  const filtered = pageOf(ledger, 2, "", "Pending");
  assert.equal(filtered.total, 13);
  assert.deepEqual(filtered.rows.map((row) => row.studentFeeId), [23, 24, 25]);
});

test("empty results and out-of-range pages stay valid", () => {
  assert.deepEqual(pageOf(ledger, 8, "missing"), { rows: [], total: 0, pages: 1, current: 1, start: 0, end: 0 });
  assert.equal(pageOf(ledger, 999).current, 3);
  assert.equal(pageOf(ledger, -2).current, 1);
});

test("field adapters preserve zero and missing values and accept API casing", () => {
  assert.equal(readFee({ TotalPaid: 0 }, "totalPaid"), 0);
  assert.equal(readFee({ IsActive: false }, "isActive"), false);
  assert.equal(feeMoney(undefined), "-");
  assert.equal(feeMoney(null), "-");
  assert.equal(feeMoney("invalid"), "-");
  assert.match(feeMoney(0), /0/);
});

test("fee structures respect selected board and academic year", () => {
  const rows = [{ boardId: 2, academicYearId: 3 }, { BoardId: 2, AcademicYearId: 4 }, { boardId: 9, academicYearId: 3 }];
  assert.deepEqual(scopedStructures(rows, { boardId: 2, academicYearId: 3 }), [rows[0]]);
  assert.deepEqual(scopedStructures(rows, {}), rows);
});

test("fee masters preserve shared records while excluding another explicit context", () => {
  const shared = { feeTypeId: 1, campusId: null, boardId: null, academicYearId: null };
  const scoped = { FeeTypeId: 2, CampusId: 1, BoardId: 2, AcademicYearId: 3 };
  const other = { feeTypeId: 3, campusId: 9, boardId: 2, academicYearId: 3 };
  assert.deepEqual(scopedFeeMasters([shared, scoped, other], { campusId: 1, boardId: 2, academicYearId: 3 }), [shared, scoped]);
});

test("year summaries use saved totals and do not calculate missing fees", () => {
  const first = { feeStructureId: 1, academicLevelId: 1, totalAmount: 12000, pairedStructureId: 2 };
  const second = { feeStructureId: 2, academicLevelId: 2, totalAmount: 15000, pairedStructureId: 1 };
  assert.deepEqual(savedYearSummary(first, [first, second]), { first: 12000, second: 15000 });
  assert.deepEqual(savedYearSummary(second, [first, second]), { first: 12000, second: 15000 });
  assert.deepEqual(savedYearSummary({ totalAmount: 12000, yearFeeMode: "same" }, []), { first: 12000, second: undefined });
});

test("overview separates overdue and upcoming without treating paid schedules as due", () => {
  const old = { dueDate: "2026-10-01", balance: 10, status: "Due" };
  const today = { dueDate: "2026-10-16", amount: 20, status: "Pending" };
  const paid = { dueDate: "2026-10-01", balance: 0, status: "Paid" };
  assert.deepEqual(splitFeeSchedules([old, today, paid], "2026-10-16"), { overdue: [old], upcoming: [today] });
});

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("every active accountant sidebar destination has a registered portal route", async () => {
  const routes = await read("../AccountantPortalRoutes.jsx");
  const layout = await read("../layout/AccountantLayout.jsx");
  const paths = [...routes.matchAll(/<Route path="([^"]+)"/g)].map((match) => match[1]).filter((path) => path !== "*");
  const destinations = [...layout.matchAll(/to: "([^"]+)"/g)].map((match) => match[1]);
  const registered = [{ path: "/accountant-dashboard", children: [{ index: true }, ...paths.map((path) => ({ path }))] }];
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(destinations.includes("/accountant-dashboard/my-attendance"));
  destinations.forEach((destination) => assert.ok(matchRoutes(registered, destination), destination));
});

test("dashboard and nested page links remain inside valid accountant destinations", async () => {
  const dashboard = await read("../AccountantDashboard.jsx");
  const pages = (await Promise.all(["../pages/AccountantPayments.jsx", "../pages/AccountantPayroll.jsx", "../pages/AccountantAttendanceImpact.jsx", "../pages/AccountantReports.jsx", "../pages/AccountantProfile.jsx"].map(read))).join("\n");
  const fees = await read("../pages/AccountantFeeManagement.jsx");
  for (const source of [dashboard, pages, fees]) {
    for (const [, destination] of source.matchAll(/\bto="([^"]+)"/g)) {
      assert.ok(destination.startsWith("/accountant-dashboard/"), destination);
    }
  }
  assert.match(dashboard, /to="\/accountant-dashboard\/fees\?tab=ledger"/);
  assert.match(pages, /to="\/accountant-dashboard\/payroll\/attendance-impact"/);
  assert.equal(resolvePath("/accountant-dashboard/payroll", "/accountant-dashboard/payroll/attendance-impact").pathname, "/accountant-dashboard/payroll");
  assert.match(fees, /setSearch\(value\); setPageNumber\(1\)/);
  assert.match(fees, /const changeFilter = .*setPageNumber\(1\)/);
});

test("new fee views only read data and gate access using existing permissions", async () => {
  const source = await read("../pages/AccountantFeeManagement.jsx");
  assert.doesNotMatch(source, /apiClient\.(post|put|patch|delete)\(/);
  assert.match(source, /permissions\.canView\("fee-management", screen\)/);
  assert.match(source, /permissions\.loading/);
  assert.match(source, /VITE_USE_MOCK_DATA/);
  for (const label of ["Overview", "Fee Setup", "Student Fee Ledger", "Fee Types", "Fee Structure", "Hostel Fees", "Transport Fees", "Scholarships", "Fine"]) assert.ok(source.includes(`"${label}"`), label);
});



});

await describe("Fee Management - collection", async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
  after(() => server.close());
  const service = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/services/accountantService.js");
  const { default: client } = await server.ssrLoadModule("/src/api/axios.js");
  const account = { studentId: 10, studentFeeId: 100, studentName: "Actual Student", admissionNumber: "ADM10", outstandingBalance: 1000, schedules: [{ feeInstallmentId: 7, balanceAmount: 400, feeSchedule: "First", dueDate: "2026-10-25" }] };
  const draft = { target: "schedules", feeInstallmentIds: [7], amount: "200", discount: "10", fine: "5", paymentDate: "2026-10-25", paymentMode: "UPI", transactionReference: "REAL-REFERENCE", note: "Partial installment" };
  const saved = { feePaymentId: 50, studentId: 10, studentFeeId: 100, studentName: "Actual Student", admissionNumber: "ADM10", amount: 195, paymentMethod: "UPI", paymentDate: "2026-10-25", receiptNumber: "ACTUAL-50", status: "Success" };
  const withAdapter = async (adapter, work) => {
    const original = client.defaults.adapter;
    client.defaults.adapter = async config => ({ data: await adapter(config), status: 200, headers: {}, config });
    try { await work(); } finally { client.defaults.adapter = original; }
  };

  test("collection requires verified create permission, never merely the Accountant role", async () => {
    const permissions = { loading: false, error: "", isAccountant: true, canDo: () => false };
    assert.equal(service.feeCollectionAccess(permissions), false);
    assert.equal(service.feeCollectionAccess({ ...permissions, canDo: () => true }), true);
    assert.equal(service.feeCollectionAccess({ ...permissions, loading: true, canDo: () => true }), false);
    assert.equal(service.feeCollectionAccess({ ...permissions, error: "Denied", canDo: () => true }), false);
    let calls = 0;
    await withAdapter(() => { calls++; return saved; }, async () => {
      await assert.rejects(service.collectStudentPayment(account, draft, () => false), /create permission/);
    });
    assert.equal(calls, 0);
  });

  test("payment validation covers schedules, references, dates, balances and net payment", () => {
    for (const patch of [{ amount: "0" }, { amount: "-1" }, { amount: "Infinity" }, { amount: "401" }, { fine: "900" }, { fine: "-1" }, { discount: "999" }, { discount: "NaN" }, { transactionReference: " " }, { paymentMode: "Invented" }, { paymentDate: "2026-02-30" }, { feeInstallmentIds: [999] }, { feeInstallmentIds: [] }]) {
      assert.throws(() => service.paymentPayload(account, { ...draft, ...patch }), undefined, JSON.stringify(patch));
    }
    assert.throws(() => service.paymentPayload({ ...account, outstandingBalance: null }, draft), /current outstanding/);
    assert.throws(() => service.paymentPayload({ ...account, studentId: null }, draft), /IDs/);
    for (const paymentMode of ["Cash", "UPI", "Card", "Net Banking", "Cheque"]) {
      assert.equal(service.paymentPayload(account, { ...draft, paymentMode }).paymentMode, paymentMode);
    }
    assert.deepEqual(service.paymentPayload(account, { ...draft, target: "full", amount: "1000", fine: "0", discount: "0" }).feeInstallmentIds, []);
    assert.deepEqual(service.paymentPayload({ ...account, schedules: [] }, { ...draft, target: "partial" }).feeInstallmentIds, []);
  });

  test("confirmed collection uses the existing POST once and returns actual receipt values", async () => {
    const calls = [];
    await withAdapter(config => { calls.push(config); return { status: true, data: saved }; }, async () => {
      assert.deepEqual(await service.collectStudentPayment(account, draft, () => true), saved);
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "/api/v1/fees/collect");
    assert.equal(calls[0].method, "post");
    assert.deepEqual(JSON.parse(calls[0].data), { studentId: 10, studentFeeId: 100, feeInstallmentIds: [7], amount: 200, paymentDate: "2026-10-25T00:00:00.000Z", paymentMode: "UPI", receiptNumber: "", discount: 10, fine: 5, transactionReference: "REAL-REFERENCE", note: "Partial installment" });
  });

  test("denied payments never use alternate routes; unknown outcomes require reconciliation", async () => {
    for (const status of [403, 500, null]) {
      let calls = 0;
      await withAdapter(config => { calls++; throw { config, ...(status ? { response: { status } } : {}) }; }, async () => {
        await assert.rejects(service.collectStudentPayment(account, draft, () => true), error => Boolean(error.feeSaveUncertain) === (status !== 403));
      });
      assert.equal(calls, 1);
    }
    for (const response of [{}, { ...saved, studentId: 20 }, { success: false }, { ...saved, amount: null }, { ...saved, status: "Failed" }]) {
      await withAdapter(() => response, async () => {
        await assert.rejects(service.collectStudentPayment(account, draft, () => true), error => error.feeSaveUncertain === true);
      });
    }
  });

  test("collection reads scoped real balances and rejects a different returned fee account", async () => {
    await withAdapter(config => {
      assert.deepEqual(config.params, { campusId: 1 });
      return [{ studentId: 10, studentFeeId: 100, payable: 1200, paid: 200, balance: 1000 }];
    }, async () => {
      const [row] = await service.loadCollectionAccounts({ campusId: 1 });
      assert.equal(row.totalPayable, 1200); assert.equal(row.totalPaid, 200); assert.equal(row.balance, 1000);
    });
    await withAdapter(() => ({ ...account, studentFeeId: 999 }), async () => {
      await assert.rejects(service.loadCollectionDetails(account), /does not match/);
    });
  });

  test("history uses its authorized bulk contract and reports absent or forbidden data", async () => {
    for (const outcome of ["success", "missing", "denied"]) {
      const calls = [];
      await withAdapter(config => {
        calls.push(config.url);
        if (config.url.endsWith("/ledger")) return [account];
        if (outcome === "denied") throw { config, response: { status: 403 } };
        return outcome === "success" ? { 10: [saved] } : {};
      }, async () => {
        const result = await service.loadPaymentHistory({}, undefined, () => true);
        assert.equal(result.payments.length, outcome === "success" ? 1 : 0);
        assert.equal(result.errors.length, outcome === "success" ? 0 : 1);
        assert.deepEqual(calls, ["/api/v1/fees/ledger", "/api/v1/fees/bulk-history"]);
      });
    }
    let calls = 0;
    await withAdapter(() => { calls++; return {}; }, async () => {
      await assert.rejects(service.loadPaymentHistory({}, undefined, () => false), /bulk-history/);
    });
    assert.equal(calls, 0);
  });

  const source = await readFile(new URL("../pages/AccountantFeeManagement.jsx", import.meta.url), "utf8");
  const nodes = node => node && typeof node === "object" ? [node, ...(node.props?.children || []).flat(Infinity).flatMap(nodes)] : [];
  const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }), Fragment: "Fragment" };
  async function mount(name, bindings, props) {
    const start = name === "PaymentReceipt" ? "const amountToWords" : `function ${name}`;
    const end = name === "CollectPayment" ? "const amountToWords" : name === "PaymentReceipt" ? "export function FeeReceiptActions" : name === "FeeReceiptActions" ? "export function SavedPaymentReceipt" : name === "SavedPaymentReceipt" ? "function FeeDetails" : "function FeeLedger";
    const { code } = await transformWithOxc(source.slice(source.indexOf(start), source.indexOf(end)).replace(/^export /gm, ""), "Collection.jsx", { jsx: { runtime: "classic" } });
    let cursor = 0, hooks = [], tree, effects = [];
    const context = vm.createContext({ React, ...feeView, ...service, PAYMENT_METHODS: ["Cash", "UPI", "Card", "Net Banking", "Cheque"], Modal: "Modal", FeeNotice: "FeeNotice", FeeLoadState: "LoadState", FeeTable: "FeeTable", FeeBadge: "FeeBadge", Link: "Link", ArrowLeft: "ArrowLeft", ChevronDown: "ChevronDown", Eye: "Eye", History: "History", WalletCards: "WalletCards", Printer: "Printer", COLLEGE_NAME: "Pirnav College", collegeLogo: "/logo.png", AbortController, DOMException, useEffectivePermissions: () => ({ loading: false, canView: () => true, canDo: () => true }), field: () => ({}), CollectPayment: function CollectPayment() {}, PaymentReceipt: function PaymentReceipt() {},
      useState: initial => { const index = cursor++; hooks[index] ??= { value: typeof initial === "function" ? initial() : initial }; return [hooks[index].value, value => { hooks[index].value = typeof value === "function" ? value(hooks[index].value) : value; }]; },
      useRef: initial => { const index = cursor++; return hooks[index] ??= { current: initial }; }, useCallback: fn => fn, useEffect: effect => { effects.push(effect); }, ...bindings });
    vm.runInContext(`${code};globalThis.Component=${name}`, context);
    const render = () => { cursor = 0; effects = []; tree = context.Component(props); return nodes(tree); };
    return { render, all: () => nodes(tree), runEffects: () => effects.map(effect => effect()) };
  }

  test("modal blocks double clicks and repeat submissions after an unconfirmed response", async () => {
    let calls = 0, resolve, successful = 0;
    const view = await mount("CollectPayment", { collectStudentPayment: () => { calls++; return new Promise(done => { resolve = done; }); } }, { account, authorize: () => true, onClose() {}, onSaved: () => { successful++; } });
    const form = view.render().find(node => node.type === "form");
    const first = form.props.onSubmit({ preventDefault() {} });
    await form.props.onSubmit({ preventDefault() {} });
    assert.equal(calls, 1); resolve(saved); await first; assert.equal(successful, 1);
    const denied = await mount("CollectPayment", { collectStudentPayment: async () => { calls++; throw { feeSaveUncertain: true, code: "ACCOUNTANT_DATA_ERROR", message: "Unconfirmed" }; } }, { account, authorize: () => true, onClose() {}, onSaved() { throw new Error("Must not succeed"); } });
    await denied.render().find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
    const updated = denied.render();
    assert.equal(updated.find(node => node.type === "fieldset").props.disabled, true);
    await updated.find(node => node.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(calls, 2);
  });

  test("confirmed payment refreshes detail and list once, with actual saved receipt data", async () => {
    let detailReloads = 0, listReloads = 0, events = 0;
    const state = { data: account, loading: false, error: "", reload: () => { detailReloads++; } };
    const view = await mount("FeeDetails", { useFinancePage: () => state, window: { dispatchEvent: () => { events++; } }, Event: function Event() {} }, { row: account, collection: true, authorize: () => true, onClose() {}, onCollected: () => { listReloads++; } });
    view.render().find(node => node.type === "button" && node.props.children.includes(" Collect Payment")).props.onClick();
    const modal = view.render().find(node => typeof node.type === "function" && node.type.name === "CollectPayment");
    modal.props.onSaved(saved);
    const receipt = view.render().find(node => typeof node.type === "function" && node.type.name === "PaymentReceipt");
    assert.equal(receipt.props.payment, saved);
    assert.equal(receipt.props.payment.amount, 195);
    assert.deepEqual([detailReloads, listReloads, events], [1, 1, 1]);
    const blocked = await mount("FeeDetails", { useFinancePage: () => state }, { row: account, collection: true, authorize: () => false, onClose() {} });
    assert(!blocked.render().some(node => node.type === "button" && node.props.children.includes(" Collect Payment")));
  });

  test("navigation and history retain existing routes and do not call restricted receipt routes", async () => {
    assert(source.includes('["collection", "Fee Collection"]'));
    const payments = await readFile(new URL("../pages/AccountantPayments.jsx", import.meta.url), "utf8");
    assert(!payments.includes("apiEndpoints.fee.payments"));
    assert(!payments.includes("apiEndpoints.fee.collection"));
    assert(payments.includes("disburseClaimPayment(disburseModal.claimId"));
    assert(payments.includes('pageOf(feeRows, feePageNumber, "", "", 5)'));
    assert(!source.includes("receiptByNumber"));
  });

  test("receipt renders confirmed values and prints only its own document without a retrieval request", async () => {
    let printed = 0, cloned;
    const printDocument = { open() {}, write() {}, close() {}, images: [], body: { appendChild: node => { cloned = node; }, getBoundingClientRect() {} }, head: { appendChild() {} }, createElement: () => ({}), importNode: node => node };
    const frame = { style: {}, setAttribute() {}, contentWindow: { document: printDocument, addEventListener() {}, removeEventListener() {}, focus() {}, print: () => { printed++; } }, remove() {} };
    const view = await mount("PaymentReceipt", { window: { setTimeout, clearTimeout }, document: { baseURI: "http://localhost:5173/", querySelectorAll: () => [], createElement: () => frame, body: { appendChild() {} } } }, { payment: saved, account, onClose() {} });
    const all = view.render();
    assert(all.some(node => node.type === "span" && node.props.children.includes("ACTUAL-50")));
    assert(all.some(node => node.type === "td" && node.props.children.includes(feeView.feeMoney(195))));
    const receipt = all.find(node => node.props?.ref);
    const actualNode = { receiptOnly: true };
    receipt.props.ref.current = actualNode;
    const printButton = nodes(all[0].props.footer).find(node => node.type === "button" && node.props.children.includes("Print Receipt"));
    await printButton.props.onClick();
    assert.equal(printed, 1); assert.equal(cloned, actualNode);
    assert(!source.includes("dangerouslySetInnerHTML"));
  });

  test("saved receipts require view permission and use the selected payment ID with GET only", async () => {
    assert.equal(service.feeReceiptAccess({ loading: false, canView: () => true }), true);
    assert.equal(service.feeReceiptAccess({ loading: true, canView: () => true }), false);
    assert.equal(service.feeReceiptAccess({ isAccountant: true, canView: () => false }), false);
    const calls = [];
    await withAdapter(config => { calls.push(config); return saved; }, async () => {
      assert.equal((await service.loadSavedFeePayment(saved, undefined, () => true)).receiptNumber, "ACTUAL-50");
      await assert.rejects(service.loadSavedFeePayment(saved, undefined, () => false), /view permission/);
    });
    assert.deepEqual(calls.map(config => [config.method, config.url]), [["get", "/api/v1/fees/payments/50"]]);
    assert(!("groupName" in saved));
  });

  test("saved receipts reject mismatched identities, wrong receipt numbers and incomplete data", async () => {
    for (const mutation of [{ feePaymentId: 51 }, { studentId: 11 }, { studentFeeId: 101 }, { receiptNumber: "OTHER" }, { studentName: "" }, { admissionNumber: "" }, { amount: null }, { amount: 0 }, { paymentDate: "invalid" }, { paymentMethod: "" }, { status: "Failed" }]) {
      await withAdapter(() => ({ ...saved, ...mutation }), async () => {
        await assert.rejects(service.loadSavedFeePayment(saved, undefined, () => true), /does not match|incomplete/);
      });
    }
    await withAdapter(() => ({ ...saved, receiptNumber: "RESTORED-50" }), async () => {
      assert.equal((await service.loadSavedFeePayment({ ...saved, receiptNumber: "" }, undefined, () => true)).receiptNumber, "RESTORED-50");
    });
    let calls = 0;
    await withAdapter(() => { calls++; return saved; }, async () => {
      await assert.rejects(service.loadSavedFeePayment({ ...saved, feePaymentId: undefined }, undefined, () => true), /identifiers/);
      await assert.rejects(service.loadSavedFeePayment({ ...saved, status: "Pending" }, undefined, () => true), /not confirmed/);
    });
    assert.equal(calls, 0);
  });

  test("historical receipt requests stop on denied, missing, failed or cancelled reads", async () => {
    for (const status of [401, 403, 404, 500]) {
      let calls = 0;
      await withAdapter(config => { calls++; throw { config, response: { status } }; }, async () => {
        await assert.rejects(service.loadSavedFeePayment(saved, undefined, () => true));
      });
      assert.equal(calls, 1);
    }
    const controller = new AbortController(); controller.abort();
    await assert.rejects(service.loadSavedFeePayment(saved, controller.signal, () => true), /abort/i);
  });

  test("both actions pass the raw saved transaction and never collect another payment", async () => {
    const selected = [];
    const view = await mount("FeeReceiptActions", {}, { payment: saved, allowed: true, onSelect: value => selected.push(value) });
    const buttons = view.render().filter(node => node.type === "button");
    assert.deepEqual(buttons.map(button => button.props["aria-label"]), ["View Receipt", "Print Receipt"]);
    buttons.forEach(button => button.props.onClick());
    assert.equal(selected[0].payment, saved); assert.equal(selected[1].payment, saved);
    assert.equal(selected[0].autoPrint, false); assert.equal(selected[1].autoPrint, true);
    const blocked = await mount("FeeReceiptActions", {}, { payment: { ...saved, status: "Failed" }, onSelect() {} });
    assert(blocked.render().filter(node => node.type === "button").every(button => button.props.disabled));
  });

  test("historical receipts use fresh payment details without a current-account fallback", async () => {
    const state = { data: saved, loading: false, error: "", reload() {} };
    const view = await mount("SavedPaymentReceipt", { useFinancePage: () => state }, { payment: saved, autoPrint: true, onClose() {} });
    const receipt = view.render()[0];
    assert.equal(receipt.props.payment, saved); assert.equal(receipt.props.account, null); assert.equal(receipt.props.autoPrint, true);
    state.data = { ...saved, feePaymentId: 51, receiptNumber: "ACTUAL-51" };
    assert.equal(view.render()[0].props.payment.receiptNumber, "ACTUAL-51");
    state.data = null; state.loading = true;
    assert(!view.render().some(node => node.props?.payment));
    state.loading = false; state.error = "Not found";
    assert(view.render().some(node => node.type === "FeeNotice"));
  });

  test("direct print waits for styles and fonts after the selected receipt mounts, and blocks rapid duplicate clicks", async () => {
    let printed = 0, receiptClone, linkClone, afterPrint, removed = 0, finishPrint, readyFonts;
    const printStarted = new Promise(resolve => { finishPrint = resolve; });
    const fontsReady = new Promise(resolve => { readyFonts = resolve; });
    const printDocument = { open() {}, write() {}, close() {}, images: [], fonts: { ready: fontsReady },
      body: { appendChild: node => { receiptClone = node; }, getBoundingClientRect() {} },
      head: { appendChild(node) { if (node.tagName === "LINK") linkClone = node; } }, createElement: () => ({}), importNode: node => ({ ...node }) };
    const frame = { style: {}, setAttribute() {}, contentWindow: { document: printDocument, addEventListener: (event, callback) => { afterPrint = callback; }, removeEventListener() {}, focus() {}, print() { printed++; finishPrint(); } }, remove() { removed++; } };
    const view = await mount("PaymentReceipt", { window: { setTimeout, clearTimeout }, document: { baseURI: "http://localhost:5173/", querySelectorAll: () => [{ tagName: "LINK", href: "/receipt.css" }], createElement: () => frame, body: { appendChild() {} } } }, { payment: saved, account: null, autoPrint: true, onClose() {} });
    const all = view.render();
    all.find(node => node.props?.ref).props.ref.current = { receiptOnly: true, receiptNumber: saved.receiptNumber };
    const cleanups = view.runEffects();
    assert.equal(printed, 0);
    assert(!all.some(node => node.type === "Modal"));
    assert(all.some(node => node.props?.["aria-hidden"] === "true" && node.props.style?.left === "-10000px"));
    // A second print effect while preparation is pending must share the guard.
    view.runEffects();
    assert.equal(printed, 0);
    linkClone.onload(); readyFonts();
    await printStarted;
    assert.equal(printed, 1); assert.equal(receiptClone.receiptOnly, true); assert.equal(receiptClone.receiptNumber, "ACTUAL-50");
    afterPrint(); assert.equal(removed, 1);
    cleanups.forEach(cleanup => { if (typeof cleanup === "function") cleanup(); });
  });

  test("View never auto-prints, and View/Print share exactly the same receipt template", async () => {
    let unexpectedPrints = 0;
    const bindings = { document: { createElement() { unexpectedPrints++; throw new Error("View must not print"); } } };
    const viewed = await mount("PaymentReceipt", bindings, { payment: saved, account: null, onClose() {} });
    const visible = viewed.render(); viewed.runEffects();
    assert(visible.some(node => node.type === "Modal"));
    assert.equal(unexpectedPrints, 0);
    const direct = await mount("PaymentReceipt", {}, { payment: saved, account: null, autoPrint: true, onClose() {} });
    const hidden = direct.render();
    assert(!hidden.some(node => node.type === "Modal"));
    const template = all => all.find(node => node.props?.className === "cms-fee-receipt cms-fee-receipt-print");
    assert.deepEqual(JSON.parse(JSON.stringify(template(visible))), JSON.parse(JSON.stringify(template(hidden))));
    assert(nodes(visible[0].props.footer).some(node => node.props?.children?.includes("Print Receipt")));
  });

  test("direct printing never renders a modal while loading, denied, or failed", async () => {
    const state = { data: null, loading: true, error: "", reload() {} };
    const view = await mount("SavedPaymentReceipt", { useFinancePage: () => state }, { payment: saved, autoPrint: true, onClose() {} });
    assert(!view.render().some(node => node.type === "Modal"));
    state.loading = false; state.error = "Permission denied";
    assert(!view.render().some(node => node.type === "Modal"));
    assert(view.render().some(node => node.type === "FeeNotice"));
  });

  test("saved academic fields use flat and nested response labels without current student or navbar substitutions", async () => {
    const academic = { Group: { GroupId: 2, GroupName: "Historical BiPC" }, Program: { ProgramName: "Historical Program" }, Section: { SectionName: "Old A" }, AcademicYear: { AcademicYearName: "2024-2025" }, Campus: { CampusName: "Old Campus" }, student: { groupName: "Wrong current group" } };
    const view = await mount("PaymentReceipt", {}, { payment: { ...saved, ...academic }, account: null, onClose() {} });
    const values = view.render().filter(node => node.type === "td").flatMap(node => node.props.children);
    for (const value of ["Historical BiPC", "Historical Program", "Old A", "2024-2025", "Old Campus"]) assert(values.includes(value), value);
    assert(!values.includes("Wrong current group"));
    const flat = await mount("PaymentReceipt", {}, { payment: { ...saved, groupName: "MPC", programName: "Regular", sectionName: "A", academicYearName: "2025-2026", campusName: "Saved Campus" }, account: null, onClose() {} });
    const flatValues = flat.render().filter(node => node.type === "td").flatMap(node => node.props.children);
    for (const value of ["MPC", "Regular", "A", "2025-2026", "Saved Campus"]) assert(flatValues.includes(value));
    const missing = await mount("PaymentReceipt", {}, { payment: { ...saved, group: { groupId: 2 }, campus: { campusId: 3 }, academicYear: {} }, account: null, onClose() {} });
    assert(missing.render().filter(node => node.type === "td").some(node => node.props.children.includes("-")));
    assert(missing.render().filter(node => node.type === "td").flatMap(node => node.props.children).every(value => typeof value !== "object"));
  });

  test("account transactions load saved bulk history when details omit it and retain only the selected fee account", async () => {
    const calls = [];
    await withAdapter(config => { calls.push(config); return { 10: [saved, { ...saved, feePaymentId: 51, studentFeeId: 101 }] }; }, async () => {
      const rows = await service.loadFeeAccountPayments(account, undefined, () => true);
      assert.deepEqual(rows.map(row => row.feePaymentId), [50]);
    });
    assert.deepEqual(calls.map(config => [config.method, config.url, JSON.parse(config.data)]), [["post", "/api/v1/fees/bulk-history", [10]]]);
    await assert.rejects(service.loadFeeAccountPayments(account, undefined, () => false), /create permission/);
    await withAdapter(() => { throw new Error("No extra request expected"); }, async () => {
      assert.equal((await service.loadFeeAccountPayments({ ...account, paymentHistory: [saved] })).length, 1);
    });
    await withAdapter(() => ({ 10: [{ ...saved, studentId: 11 }] }), async () => {
      await assert.rejects(service.loadFeeAccountPayments(account, undefined, () => true), /mismatched/);
    });
  });

  test("history keeps scoped data and pagination while exposing shared receipt actions", async () => {
    const payments = await readFile(new URL("../pages/AccountantPayments.jsx", import.meta.url), "utf8");
    assert(payments.includes("loadPaymentHistory(campusParams, signal"));
    assert(payments.includes('pageOf(feeRows, feePageNumber, "", "", 5)'));
    assert(payments.includes('String(b.date).localeCompare(String(a.date))'));
    assert(payments.includes("receiptSelection?.scope === receiptScope"));
    assert(payments.includes("<FeeReceiptActions payment={row.payment}"));
    assert(source.includes("loadFeeAccountPayments(state.data, signal"));
    assert(!payments.includes("Historical receipt retrieval is unavailable"));
  });

});

await describe("Leave", async () => {
const { accountantCategoryEligibility, accountantLeaveCategoryLabel, accountantLeaveTypeForCategory, getAccountantLeaveCategoryStats, getAccountantLeaveTypeLabel, getApplicableAccountantLeaveCategories, parseAccountantLeaveCategories } = leaveHelpers;
const raw = [
  { leaveCategoryId: 10, categoryCode: "MDCL", categoryName: "Medical", annualQuota: 10, applicableStaffType: "Teaching Staff Only", displayOrder: 1 },
  { leaveCategoryId: 11, categoryCode: "CL", categoryName: "Casual Leave", annualQuota: 12, applicableStaffType: "All Staff", displayOrder: 2 },
  { leaveCategoryId: 12, categoryCode: "SL", categoryName: "Sick Leave", annualQuota: 10, applicableStaffType: "All Staff", displayOrder: 3, requiresProof: true },
  { leaveCategoryId: 13, categoryCode: "EL", categoryName: "Earned Leave", annualQuota: 15, applicableStaffType: "Teaching Staff Only", displayOrder: 4 },
  { leaveCategoryId: 14, categoryCode: "ML", categoryName: "Maternity Leave", annualQuota: 17, applicableStaffType: "All Staff", displayOrder: 5 },
  { leaveCategoryId: 15, categoryCode: "CO", categoryName: "Compensatory Off", annualQuota: 5, applicableStaffType: "Non-Teaching Staff", displayOrder: 6 },
].map(category => ({ ...category, isActive: true }));
const parsed = categories => parseAccountantLeaveCategories({ data: { status: true, data: categories } });
const catalog = parsed(raw);
const available = categories => getApplicableAccountantLeaveCategories(categories, "Non-Teaching");
const approved = extra => ({ status: "Approved", totalDays: 1, ...extra });
const stats = (code, leaves = [], categories = catalog, historyAvailable = true) => getAccountantLeaveCategoryStats(categories.find(c => c.categoryCode === code), categories, leaves, historyAvailable);

test("parses nested API data and dynamically selects CL, SL, ML, CO in Admin order", () => {
  assert.deepEqual(available([...catalog].reverse()).map(c => c.categoryCode), ["CL", "SL", "ML", "CO"]);
  assert.deepEqual(available(catalog).map(c => stats(c.categoryCode).text), ["0 / 12 Days", "0 / 10 Days", "0 / 17 Days", "0 / 5 Days"]);
  assert.equal(catalog.find(c => c.categoryCode === "SL").requiresProof, true);
});

test("preserves PascalCase values, zero quotas, display order and proof flags", () => {
  const result = parseAccountantLeaveCategories({ data: { Status: true, Data: [{ LeaveCategoryId: 8, CategoryName: "Custom", CategoryCode: "NEW", AnnualQuota: 0, ApplicableStaffType: "All Staff", IsActive: true, DisplayOrder: 2, RequiresProof: true, AllowCarryForward: true }] } });
  assert.equal(result[0].annualQuota, 0);
  assert.equal(result[0].requiresProof, true);
  assert.equal(result[0].allowCarryForward, true);
  assert.equal(getAccountantLeaveCategoryStats(result[0], result, []).text, "0 / 0 Days");
});

test("empty response is genuine empty; failed and malformed responses remain errors", () => {
  assert.deepEqual(parsed([]), []);
  assert.throws(() => parseAccountantLeaveCategories({ data: { status: false, message: "Denied" } }), /Denied/);
  assert.throws(() => parseAccountantLeaveCategories({ data: { status: true, data: {} } }), /invalid/);
});

test("teaching-only and inactive categories are excluded by applicability, not names", () => {
  const changed = catalog.map(c => c.categoryCode === "CO" ? { ...c, isActive: false } : c);
  assert.deepEqual(available(changed).map(c => c.categoryCode), ["CL", "SL", "ML"]);
  assert(!available(catalog).some(c => ["MDCL", "EL", "OD"].includes(c.categoryCode)));
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "Teaching Staff Only" }, "non teaching"), false);
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "Non-Teaching Staff" }, "Teaching"), false);
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "Teaching Staff Only" }, null), null);
  assert.equal(accountantCategoryEligibility({ applicableStaffType: "Unknown" }, "Non-Teaching"), null);
});

test("new eligible categories and name/quota/order changes appear on the next mapping", () => {
  const changed = catalog.map(c => c.categoryCode === "CL" ? { ...c, categoryName: "Personal Leave", annualQuota: 14, displayOrder: 9 } : c);
  changed.push({ leaveCategoryId: 20, categoryCode: "NEW", categoryName: "Study Leave", annualQuota: 2.5, applicableStaffType: "Non-Teaching Staff", isActive: true, displayOrder: 1 });
  const result = available(changed);
  assert.equal(result[0].categoryCode, "NEW");
  assert.equal(result.at(-1).categoryName, "Personal Leave");
  assert.equal(stats("CL", [], changed).text, "0 / 14 Days");
  assert.equal(accountantLeaveCategoryLabel(result.at(-1)), "Personal Leave (CL)");
  assert.equal(result.length, 5);
});

test("a changed audience removes a category; OD appears only if actually configured", () => {
  const changed = catalog.map(c => c.categoryCode === "ML" ? { ...c, applicableStaffType: "Teaching Staff Only" } : c);
  changed.push({ leaveCategoryId: 21, categoryCode: "OD", categoryName: "On-Duty", annualQuota: 3, applicableStaffType: "All Staff", isActive: true });
  assert.deepEqual(available(changed).map(c => c.categoryCode), ["CL", "SL", "CO", "OD"]);
});

test("unknown quotas do not become zero; fractional approved usage is supported", () => {
  for (const annualQuota of [null, undefined, "", " ", false, "invalid", -1, NaN, Infinity]) {
    const category = { ...catalog[1], annualQuota };
    const result = getAccountantLeaveCategoryStats(category, catalog, []);
    assert.equal(result.text, "0 / -- Days");
    assert.equal(result.policyRemaining, null);
  }
  assert.equal(stats("CL", [approved({ leaveCategoryId: 11, totalDays: 2.5 })]).text, "2.5 / 12 Days");
});

test("usage matches stable IDs even when name or legacy enum is different", () => {
  const leaves = [approved({ leaveCategoryId: 15, leaveType: "Other", totalDays: 2 }), approved({ leaveCategoryId: 14, leaveType: "Casual", totalDays: 3 })];
  assert.equal(stats("CO", leaves).used, 2);
  assert.equal(stats("ML", leaves).used, 3);
  assert.equal(stats("CL", leaves).used, 0);
});

test("unclassified Other history never silently becomes zero for CO or custom leave", () => {
  const result = stats("CO", [approved({ leaveType: "Other", totalDays: 2 })]);
  assert.equal(result.text, "-- / 5 Days");
  assert.equal(result.policyRemaining, null);
});

test("unambiguous legacy Maternity usage is supported; ambiguous Sick/Medical is unavailable", () => {
  assert.equal(stats("ML", [approved({ leaveType: "Maternity", totalDays: 3 })]).used, 3);
  assert.equal(stats("SL", [approved({ leaveType: "Sick", totalDays: 2 })]).used, null);
  assert.equal(stats("SL", [approved({ leaveCategoryId: 12, totalDays: 2 })]).used, 2);
});

test("only approved requests contribute and invalid/history-error usage stays unknown", () => {
  const leaves = ["Pending", "Rejected", "Cancelled"].map(status => ({ status, leaveCategoryId: 11, totalDays: 3 }));
  assert.equal(stats("CL", leaves).used, 0);
  assert.equal(stats("CL", [approved({ leaveCategoryId: 11, totalDays: null })]).used, null);
  assert.equal(stats("CL", [], catalog, false).text, "-- / 12 Days");
  assert.equal(stats("CL", [approved({})]).used, null);
});

test("history labels follow current Admin names when an ID is present", () => {
  const changed = catalog.map(c => c.categoryCode === "CO" ? { ...c, categoryName: "Rest Day" } : c);
  assert.equal(getAccountantLeaveTypeLabel({ leaveCategoryId: 15, leaveType: "Other" }, changed), "Rest Day");
  assert.equal(getAccountantLeaveTypeLabel({ leaveType: "Other" }, changed), "Other");
});

test("submission enum contract is preserved for ML and custom CO categories", () => {
  assert.equal(accountantLeaveTypeForCategory(catalog.find(c => c.categoryCode === "ML")), "Maternity");
  assert.equal(accountantLeaveTypeForCategory(catalog.find(c => c.categoryCode === "CO")), "Other");
  assert.equal(accountantLeaveTypeForCategory(catalog.find(c => c.categoryCode === "CL")), "Casual");
});

test("duplicate IDs do not produce duplicate cards; unspecified order remains stable", () => {
  const result = parsed([raw[1], raw[1], { ...raw[2], displayOrder: undefined }]);
  assert.equal(result.length, 2);
  assert.deepEqual(available(result).map(c => c.categoryCode), ["CL", "SL"]);
});

});

await describe("Payroll", async () => {

const source = fs.readFileSync(new URL("../pages/AccountantPayroll.jsx", import.meta.url), "utf8").replace(/^[\s\S]*?(?=const RECORDS_PER_PAGE)/, "").replace("export default function", "function");
const { code } = await transformWithOxc(source, "Payroll.jsx", { jsx: { runtime: "classic" } });
const records = count => Array.from({ length: count }, (_, index) => ({ staffName: `Staff ${index + 1}`, month: "October", amount: 10000 + index, status: index % 2 ? "Pending" : "Paid" }));

function renderPayroll(rows) {
  let hooks = [], cursor = 0, effects = [], tree;
  const props = { records: rows, formatAmount: amount => `INR ${amount}` };
  const context = vm.createContext({
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }), Fragment: "Fragment" },
    StudentDataTable: "PayrollTable",
    useState: initial => {
      const index = cursor++;
      hooks[index] ??= { value: initial };
      return [hooks[index].value, value => { hooks[index].value = typeof value === "function" ? value(hooks[index].value) : value; }];
    },
    useEffect: (fn, deps) => {
      const index = cursor++;
      if (!hooks[index] || deps.some((dep, position) => dep !== hooks[index].deps[position])) effects.push(() => { hooks[index] = { deps }; fn(); });
    },
  });
  vm.runInContext(`${code};globalThis.Component=AccountantPayrollRecords`, context);
  const render = () => { cursor = 0; effects = []; tree = context.Component(props); effects.forEach(fn => fn()); };
  const nodes = node => node && typeof node === "object" ? [node, ...(node.props?.children || []).flatMap(nodes)] : [];
  const text = node => typeof node === "string" || typeof node === "number" ? String(node) : (node?.props?.children || []).map(text).join("");
  const all = () => nodes(tree);
  const button = label => all().find(node => node.type === "button" && (node.props["aria-label"] === label || text(node) === label));
  render();
  return {
    table: () => all().find(node => node.type === "PayrollTable").props,
    all, button, text: () => text(tree),
    click: label => { const control = button(label); assert(control && !control.props.disabled); control.props.onClick(); render(); },
    replace: rows => { props.records = rows; render(); },
  };
}

test("23 records support Next, Previous, direct page selection, counts and boundary buttons", () => {
  const view = renderPayroll(records(23));
  assert.equal(view.table().rows.length, 5);
  assert.equal(view.table().rows[0]["Staff Member"], "Staff 1");
  assert(view.text().includes("Showing 1–5 of 23 records"));
  assert.equal(view.button("Previous").props.disabled, true);
  assert.equal(view.button("Page 1").props["aria-current"], "page");
  view.click("Next");
  assert.equal(view.table().rows[0]["Staff Member"], "Staff 6");
  view.click("Previous");
  assert.equal(view.table().rows[0]["Staff Member"], "Staff 1");
  view.click("Page 5");
  assert.equal(view.table().rows.length, 3);
  assert.equal(view.table().rows[0]["Staff Member"], "Staff 21");
  assert(view.text().includes("Showing 21–23 of 23 records"));
  assert.equal(view.button("Next").props.disabled, true);
  assert.equal(view.button("Page 5").props["aria-current"], "page");
});

test("every record appears once, preserving source order, amounts, columns and status mapping", () => {
  const source = records(23), snapshot = JSON.stringify(source), view = renderPayroll(source), seen = [];
  for (let page = 1; page <= 5; page++) {
    view.click(`Page ${page}`);
    for (const row of view.table().rows) seen.push(row["Staff Member"]);
  }
  assert.deepEqual(seen, source.map(row => row.staffName));
  assert.equal(new Set(seen).size, 23);
  assert.equal(JSON.stringify(source), snapshot);
  assert.equal(JSON.stringify(view.table().columns), JSON.stringify(["Staff Member", "Month", "Net Amount", "Status"]));
  assert.equal(JSON.stringify(view.table().statusColumns), "[3]");
  assert.equal(view.table().rows[0]["Net Amount"], "INR 10020");
  assert.equal(view.table().rows[0].Status, "Paid");
});

test("empty and single-page tables retain their empty state and omit navigation", () => {
  for (const count of [0, 1, 5]) {
    const view = renderPayroll(records(count));
    assert.equal(view.table().rows.length, count);
    assert.equal(view.table().empty, "No payroll records available.");
    assert.equal(view.all().some(node => node.type === "nav"), false);
    assert.equal(view.text().includes("Showing"), count > 0);
  }
  assert(renderPayroll(records(6)).button("Next"));
});

test("shrinking results clamp the selected page without an empty or stale page", () => {
  const view = renderPayroll(records(23));
  view.click("Page 5"); view.replace(records(7));
  assert.equal(view.table().rows.length, 2);
  assert.equal(view.button("Page 2").props["aria-current"], "page");
  assert(view.text().includes("Showing 6–7 of 7 records"));
  view.replace(records(23));
  assert.equal(view.button("Page 2").props["aria-current"], "page");
  view.replace([]); view.replace(records(23));
  assert.equal(view.button("Page 1").props["aria-current"], "page");
});

});

await describe("Profile - data", async () => {
const { maskProfileValue, profileCollections, profileDate, profileDocumentUrl, profileJson, profileValue, validateProfileDocument } = profileHelpers;
test("maps actual profile aliases and preserves zero values without dummy defaults", () => {
  assert.equal(profileValue({ MiddleName: "Example" }, "middleName"), "Example");
  assert.equal(profileValue({ Experience: 0 }, "experience"), 0);
  assert.equal(profileValue({}, "bankName"), "");
});
test("reads nested and JSON bank, experience and document data", () => {
  const result = profileCollections({ BankDetailsJson: '{"bankName":"Bank"}', ExperienceJson: '[{"institution":"Employer"}]', DocumentsJson: '[{"type":"Certificate","url":"/uploads/cert.pdf"}]' });
  assert.equal(result.bank.bankName, "Bank");
  assert.equal(result.experience[0].institution, "Employer");
  assert.equal(result.documents[0].type, "Certificate");
  assert.equal(profileCollections({ bankDetails: { bankName: "Nested" } }).bank.bankName, "Nested");
  assert.equal(profileCollections({ ExperienceList: [{ organization: "Employer" }] }).experience[0].organization, "Employer");
  assert.equal(profileCollections({ DocumentsList: [{ type: "Resume" }] }).documents[0].type, "Resume");
});
test("invalid JSON and missing collections do not fabricate records or crash", () => {
  assert.deepEqual(profileCollections({ experienceJson: "broken", documentsJson: "broken" }), { bank: {}, experience: [], documents: [] });
  assert.equal(profileJson("broken", null), null);
});
test("handles document maps from the staff API", () => {
  assert.deepEqual(profileCollections({ documents: { Certificate: "/uploads/cert.pdf" } }).documents, [{ type: "Certificate", url: "/uploads/cert.pdf", name: "Certificate" }]);
});
test("masks sensitive account and identity fields", () => {
  const masked = maskProfileValue("123456789012");
  assert(masked.endsWith("9012"));
  assert(!masked.includes("12345678"));
  assert.equal(maskProfileValue(null), "");
});
test("document URLs stay on the configured backend and reject unsafe schemes", () => {
  const base = "https://college.example";
  assert.equal(profileDocumentUrl("/uploads/cert.pdf", base), `${base}/uploads/cert.pdf`);
  for (const path of ["javascript:alert(1)", "data:text/html,test", "https://unrelated.example/file", "https://user:secret@college.example/file", "//unrelated.example/file"]) assert.equal(profileDocumentUrl(path, base), "");
});
test("document validation enforces the existing API's types and size limit", () => {
  assert.equal(validateProfileDocument({ name: "proof.pdf", size: 1024 }, "Certificate"), "");
  assert.equal(validateProfileDocument({ name: "photo.PNG", size: 1024 }, "Identity"), "");
  assert(validateProfileDocument({ name: "unsafe.exe", size: 1024 }, "Certificate"));
  assert(validateProfileDocument({ name: "large.pdf", size: 11 * 1024 * 1024 }, "Certificate"));
  assert(validateProfileDocument({ name: "empty.pdf", size: 0 }, "Certificate"));
  assert(validateProfileDocument(null, "Certificate"));
  assert(validateProfileDocument({ name: "proof.pdf", size: 1024 }, " "));
});
test("invalid or missing dates remain unavailable", () => {
  assert.equal(profileDate("not-a-date"), "");
  assert.equal(profileDate(null), "");
  assert(profileDate("2026-10-22").includes("2026"));
});

});

await describe("Profile - editing", async () => {
const { editableProfileFields, profileContactPayload, profileDraftRequests, updateProfileField, validateProfileDraft } = profileHelpers;
const staff = { id: 42, firstName: "Example", lastName: "Accountant", mobile: "9876543210", email: "example@college.test", currentAddress: "Saved address", alternateMobile: "9876543211", staffType: "Non-Teaching", departmentId: 7, bankDetails: { bankName: "Saved bank", accountNumber: "123456789012", basicSalary: 23456, panNumber: "ABCDE1234F" }, panNumber: "ABCDE1234F", experienceList: [{ organization: "Saved employer", designation: "Accountant", fromDate: "2020-01-01", toDate: "2022-01-01", totalYears: 2, roles: "Accounts" }] };
const form = source => ({ firstName: source.firstName, lastName: source.lastName, mobile: source.mobile, email: source.email, ...editableProfileFields(source) });

test("unchanged profiles produce no section writes or invented missing values", () => {
  assert.deepEqual(profileDraftRequests(staff, form(staff)), []);
  assert.equal(editableProfileFields(null).bank.bankName, "");
  assert.deepEqual(editableProfileFields(null).experience, []);
});
test("bank edits keep other sensitive bank fields and omit official employment fields", () => {
  const draft = updateProfileField(form(staff), "bank.bankName", "Updated bank");
  const requests = profileDraftRequests(staff, draft);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].sectionName, "Bank");
  assert.equal(requests[0].bank.basicSalary, 23456);
  assert.equal(requests[0].bank.accountNumber, staff.bankDetails.accountNumber);
  assert(!JSON.stringify(requests).includes("departmentId"));
  assert(!JSON.stringify(requests).includes("staffType"));
  assert.equal(staff.bankDetails.bankName, "Saved bank");
});
test("personal and address writes contain only changed supported fields", () => {
  let draft = updateProfileField(form(staff), "personal.maritalStatus", "Married");
  draft = updateProfileField(draft, "address.currentAddress", "New address");
  assert.deepEqual(profileDraftRequests(staff, draft), [{ sectionName: "Personal", personal: { maritalStatus: "Married" } }, { sectionName: "Address", address: { currentAddress: "New address" } }]);
  assert.equal(form(staff).address.currentAddress, "Saved address", "Cancel can reconstruct the saved baseline");
});
test("experience uses the backend organization/totalYears/roles schema", () => {
  const draft = form(staff);
  draft.experience[0].roles = "Payroll and accounts";
  const [request] = profileDraftRequests(staff, draft);
  assert.equal(request.sectionName, "Experience");
  assert.equal(request.experience[0].organization, "Saved employer");
  assert.equal(request.experience[0].totalYears, 2);
  assert.equal(request.experience[0].roles, "Payroll and accounts");
  assert.equal(staff.experienceList[0].roles, "Accounts");
});
test("validates changed identifiers and experience dates without blocking unchanged legacy data", () => {
  const legacy = { ...staff, panNumber: "legacy", bankDetails: { ...staff.bankDetails, ifscCode: "legacy" } };
  assert.equal(validateProfileDraft(legacy, form(legacy)), "");
  const draft = updateProfileField(form(staff), "bank.ifscCode", "invalid");
  assert(validateProfileDraft(staff, draft).includes("IFSC"));
  draft.bank.ifscCode = "SBIN0001234";
  assert.equal(validateProfileDraft(staff, draft), "");
  draft.experience[0].toDate = "2019-01-01";
  assert(validateProfileDraft(staff, draft).includes("end date"));
  draft.experience = [];
  assert(validateProfileDraft(staff, draft).includes("final experience"));
});
test("contact settings payload preserves existing address and emergency details", () => {
  const draft = form(staff); draft.mobile = "9876543212";
  assert.deepEqual(profileContactPayload(staff, draft), { fullName: "Example Accountant", mobile: "9876543212", personalEmail: staff.email, address: staff.currentAddress, emergencyContact: staff.alternateMobile });
});
test("bank writes cannot overwrite a simultaneous personal PAN change with the old bank PAN", () => {
  let draft = updateProfileField(form(staff), "personal.panNumber", "pqrst1234a");
  draft = updateProfileField(draft, "bank.bankName", "New bank");
  assert.equal(draft.personal.panNumber, "PQRST1234A");
  const requests = profileDraftRequests(staff, draft);
  assert.equal(requests[1].bank.panNumber, "PQRST1234A");
});

});

await describe("Profile - workflow", async () => {
const data = profileHelpers;
const { editableProfileFields, updateProfileField } = profileHelpers;
test("Accountant steps retain edits, manage documents, open photo options and preserve password modal", async () => {
  const source = fs.readFileSync(new URL("../pages/AccountantProfile.jsx", import.meta.url), "utf8").replace(/^[\s\S]*?(?=const steps =)/, "").replace("export default function", "function");
  const { code } = await transformWithOxc(source, "View.jsx", { jsx: { runtime: "classic" } });
  let hooks = [], cursor = 0, pending = [], listeners = {}, clicks = 0, confirmed = false;
  const useState = initial => {
    const index = cursor++;
    hooks[index] ??= { value: initial };
    return [hooks[index].value, input => { hooks[index].value = typeof input === "function" ? input(hooks[index].value) : input; }];
  };
  const useRef = initial => { const index = cursor++; return hooks[index] ?? (hooks[index] = { current: initial }); };
  const useEffect = (fn, deps) => {
    const index = cursor++;
    if (!hooks[index] || deps.some((input, position) => input !== hooks[index].deps[position])) pending.push(() => { hooks[index]?.cleanup?.(); hooks[index] = { deps, cleanup: fn() }; });
  };
  const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }), Fragment: "Fragment" };
  const document = { activeElement: { focus() {} }, body: { style: { overflow: "" } }, getElementById: () => ({ reportValidity: () => true }), addEventListener: (key, fn) => { listeners[key] = fn; }, removeEventListener: key => { delete listeners[key]; } };
  const calls = [];
  const apiClient = {
    post: async (url, payload) => { calls.push(["POST", url, payload]); return { data: { status: true } }; },
    delete: async url => { calls.push(["DELETE", url]); return { data: { status: true } }; },
  };
  const context = vm.createContext({
    React, useState, useRef, useEffect, useId: () => ":field:", createPortal: input => input, document,
    window: { confirm: () => confirmed }, FormData, apiClient,
    apiEndpoints: { faculty: { uploadDocument: id => `staff/${id}/documents/upload`, deleteDocument: (id, type) => `staff/${id}/documents/${encodeURIComponent(type)}` } },
    getApiErrorMessage: error => error.message, env: { apiBaseUrl: "https://college.example" }, ...data, value: data.profileValue,
    AccountantProfilePhotoEditor: "PhotoEditor", AccountantProfilePhotoActions: "PhotoActions",
    ...Object.fromEntries(["Camera", "Check", "ChevronLeft", "ChevronRight", "Edit3", "Lock", "Save", "X"].map(key => [key, key])),
  });
  vm.runInContext(`${code};globalThis.Component=AccountantProfileContent`, context);
  const staff = { bankDetails: { bankName: "Bank", accountNumber: "123456789012" }, documents: [{ type: "Resume", url: "/uploads/resume.pdf" }] };
  const props = {
    staff, staffId: 42, display: { fullName: "Actual Accountant", employeeId: "MNT42" }, initials: "AA",
    fileInputRef: { current: { click() { clicks++; } } },
    form: { firstName: "Actual", lastName: "Accountant", email: "a@example.com", mobile: "9876543210", ...editableProfileFields(staff) },
    onChange: field => event => { props.form = updateProfileField(props.form, field, event.target.value); },
    resetPassword() {}, onDocumentsChanged: async () => { staff.documents = []; }, EditableField: "EditableField", securityForm: React.createElement("form"), editing: false,
  };
  let tree;
  const render = () => { cursor = 0; pending = []; tree = context.Component(props); pending.forEach(fn => fn()); };
  const nodes = node => node && typeof node === "object" ? [node, ...(node.props?.children || []).flatMap(nodes)] : [];
  const text = node => typeof node === "string" ? node : (node?.props?.children || []).map(text).join(" ");
  const find = predicate => nodes(tree).find(predicate);
  const button = label => find(node => node.type === "button" && text(node).trim() === label);
  const field = label => find(node => node.type === "EditableField" && node.props.label === label);
  render();
  const protectedField = find(node => typeof node.type === "function" && node.props.label === "Employee / Staff ID");
  assert.equal(protectedField.type(protectedField.props).props.children[1].props.disabled, true);
  button("Bank Info").props.onClick(); render();
  assert.equal(field("Bank Name").props.editing, false);
  assert(!field("Account Number").props.value.includes("12345678"));
  props.editing = true; render();
  assert.equal(field("Bank Name").props.editing, true);
  field("Bank Name").props.onChange({ target: { value: "Draft bank" } }); render();
  button("Next").props.onClick(); render();
  field("Current Address").props.onChange({ target: { value: "Draft address" } }); render();
  assert.equal(field("City").props.editing, true);
  button("Next").props.onClick(); render(); button("Add Experience").props.onClick(); render();
  field("Employer (1)").props.onChange({ target: { value: "Draft employer" } }); render();
  field("Designation (1)").props.onChange({ target: { value: "Accountant" } }); render();
  button("Next").props.onClick(); render();
  await button("Remove").props.onClick(); assert.equal(calls.length, 0);
  confirmed = true; await button("Remove").props.onClick(); render();
  assert.equal(calls[0][1], "staff/42/documents/Resume");
  find(node => node.props?.id === "accountant-document-type").props.onChange({ target: { value: "Certificate" } }); render();
  find(node => node.props?.id === "accountant-document-file").props.onChange({ target: { files: [new File(["proof"], "proof.pdf", { type: "application/pdf" })], value: "" } }); render();
  await button("Upload Document").props.onClick(); render();
  assert.equal(calls[1][2].get("DocumentType"), "Certificate"); assert.equal(calls[1][2].get("File").name, "proof.pdf");
  button("Next").props.onClick(); render();
  for (const draft of ["Draft bank", "Draft address", "Draft employer"]) assert(text(tree).includes(draft));
  button("Previous").props.onClick(); render(); button("Previous").props.onClick(); render();
  assert.equal(field("Employer (1)").props.value, "Draft employer");
  find(node => node.props?.["aria-label"] === "Change profile photo").props.onClick(); render();
  assert.equal(clicks, 0, "Camera opens the action menu before the file picker");
  find(node => node.type === "PhotoActions").props.onUpload(); assert.equal(clicks, 1);
  const select = file => { find(node => node.type === "input" && node.props.accept === "image/*").props.onChange({ target: { files: [file], value: "" } }); render(); };
  select(new File(["bad"], "bad.txt", { type: "text/plain" })); assert(text(tree).includes("valid image"));
  select({ name: "large.png", type: "image/png", size: 6 * 1024 * 1024 }); assert(text(tree).includes("5 MB"));
  select(new File(["image"], "image.png", { type: "image/png" })); assert(find(node => node.type === "PhotoEditor"));
  find(node => node.type === "PhotoEditor").props.onClose(); render(); assert.equal(find(node => node.type === "PhotoEditor"), undefined);
  button("Change Password").props.onClick(); render(); assert(find(node => node.props?.role === "dialog"));
  listeners.keydown({ key: "Escape" }); render(); assert.equal(find(node => node.props?.role === "dialog"), undefined);
});

});

await describe("Attendance", async () => {
const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
test("personal attendance never queries the student or administrative staff register", async () => {
  const source = await read("../pages/AccountantMyAttendance.jsx");
  assert.match(source, /getAuthUser\(\)/);
  assert.match(source, /Check In/);
  assert.match(source, /Check Out/);
  assert.equal((source.match(/<button[^>]+ disabled /g) || []).length, 2);
  assert.doesNotMatch(source, /apiClient\.|attendanceService\.|\/api\//);
  assert.match(source, /authorized personal staff attendance API/);
});
});
