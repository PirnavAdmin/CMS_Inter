import assert from "node:assert/strict";
import { after, test } from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
after(() => server.close());
const { ledgerDetailEndpoint, ledgerPage, loadLedgerDetails } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/accountantFeeLedger.js");
const { default: client } = await server.ssrLoadModule("/src/api/axios.js");
const { FeePagination } = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/pages/AccountantFeeUI.jsx");
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
  const source = await readFile(new URL("./pages/AccountantFeeManagement.jsx", import.meta.url), "utf8");
  assert.match(source, /if \(detailRow\) return <FeeDetails[^\n]*onClose=\{\(\) => setDetailRow\(null\)\}/);
  assert.match(source, /const changeFilter = .*setPageNumber\(1\)/);
  assert.match(source, /setSearch\(value\); setPageNumber\(1\)/);
  assert.match(source, /rowsOf\(readFee\(state.data, "breakdown"\)\)/);
  assert.match(source, /"outstandingBalance"/);
});
