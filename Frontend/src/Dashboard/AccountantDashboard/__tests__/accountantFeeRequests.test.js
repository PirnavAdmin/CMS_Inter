import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { pageOf } from "../utils/feeViewData.js";

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
after(() => server.close());
const { checkedFeeRows, loadSetupRecords, loadFeeOverview } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/api/accountantFeeRequests.js");
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
    assert.deepEqual(config.params, { campusId: 1, pageNumber: 2, pageSize: 10, search: "North" });
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
  const { FeeTable, FeePagination } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/components/AccountantFeeUI.jsx");
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
  const { FeeTable } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/components/AccountantFeeUI.jsx");
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
