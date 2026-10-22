import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { matchRoutes, resolvePath } from "react-router-dom";
import { feeMoney, pageOf, readFee, scopedStructures, scopedFeeMasters, savedYearSummary, splitFeeSchedules } from "../utils/feeViewData.js";

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
  const pages = await read("../pages/AccountantPages.jsx");
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

test("personal attendance never queries the student or administrative staff register", async () => {
  const source = await read("../pages/AccountantMyAttendance.jsx");
  assert.match(source, /getAuthUser\(\)/);
  assert.match(source, /Check In/);
  assert.match(source, /Check Out/);
  assert.equal((source.match(/<button[^>]+ disabled /g) || []).length, 2);
  assert.doesNotMatch(source, /apiClient\.|attendanceService\.|\/api\//);
  assert.match(source, /authorized personal staff attendance API/);
});
