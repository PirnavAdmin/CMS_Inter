import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
after(() => server.close());
const { rowsOf, unwrap, loadSections, loadPaymentHistory, loadScopedLedger, requestError } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/accountantData.js");
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

test("history uses scoped ledger and supported student routes, excluding other assignments", async () => {
  const original = client.defaults.adapter;
  const calls = [];
  client.defaults.adapter = async (config) => {
    calls.push(config);
    const data = config.url.endsWith("/ledger")
      ? [{ studentId: 10, studentFeeId: 100 }, { studentId: 10, studentFeeId: 100 }, { studentId: 20, studentFeeId: 200 }]
      : config.url === "/api/v1/students"
        ? { items: [{ studentId: 10, boardId: 2 }, { studentId: 20, boardId: 2 }], totalPages: 1 }
      : config.url.endsWith("/10")
        ? [{ feePaymentId: 1, studentFeeId: 100, amount: 30 }, { feePaymentId: 2, studentFeeId: 999, amount: 40 }]
        : [{ feePaymentId: 3, studentFeeId: 200, amount: 50 }];
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    const params = { campusId: 1, boardId: 2, academicYearId: 3 };
    const result = await loadPaymentHistory(params);
    assert.deepEqual(calls[0].params, params);
    assert.deepEqual(calls.map((call) => call.url), ["/api/v1/fees/ledger", "/api/v1/students", "/api/v1/fees/history/10", "/api/v1/fees/history/20"]);
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
