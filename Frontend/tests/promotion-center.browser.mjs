// Isolated browser regression checks. All /api requests are intercepted; no live
// student records are read or modified. Run with a Vite server and a headless
// Chromium CDP endpoint: node tests/promotion-center.browser.mjs <vite-url> <cdp-url>
import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { Buffer } from "node:buffer";
import { setTimeout } from "node:timers";
import { URL } from "node:url";
import { writeFile, mkdir } from "node:fs/promises";
const { fetch, WebSocket } = globalThis;
const base = process.argv[2] ?? "http://127.0.0.1:5174";
const cdp = process.argv[3] ?? "http://127.0.0.1:9223";
const tabs = await (await fetch(`${cdp}/json/list`)).json();
const ws = new WebSocket(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const requests = [];
const exceptions = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.text + ": " + result.exceptionDetails.exception?.description,
    );
  return result.result.value;
};
const waitFor = async (expression, message = expression) => {
  for (let count = 0; count < 180; count++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${message}`);
};
const click = async (label) => {
  await waitFor(
    `Array.from(document.querySelectorAll('button')).some(b=>b.offsetParent && b.textContent.trim()===${JSON.stringify(label)} && !b.disabled)`,
    `enabled button ${label}`,
  );
  return evaluate(
    `Array.from(document.querySelectorAll('button')).find(b=>b.offsetParent && b.textContent.trim()===${JSON.stringify(label)} && !b.disabled).click()`,
  );
};
const select = async (id, value) => {
  await waitFor(
    `!!document.getElementById(${JSON.stringify(id)}) && !document.getElementById(${JSON.stringify(id)}).disabled && Array.from(document.getElementById(${JSON.stringify(id)}).options).some(o=>o.value===${JSON.stringify(value)})`,
    `option ${id}=${value}`,
  );
  await evaluate(
    `(()=>{const e=document.getElementById(${JSON.stringify(id)});Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
};
const input = async (selector, value) =>
  evaluate(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  );
const board = { boardId: 91, boardName: "Verification Board", boardCode: "TEST", isActive: true };
const years = [
  { academicYearId: 901, academicYearName: "2030-2031", boardId: 91, isActive: true },
  { academicYearId: 902, academicYearName: "2031-2032", boardId: 91, isActive: true },
];
const levels = [
  { academicLevelId: 11, levelName: "Intermediate 1st Year" },
  { academicLevelId: 12, levelName: "Intermediate 2nd Year" },
];
const group = {
  groupId: 21,
  groupName: "Test Group",
  boardId: 91,
  academicYearId: 901,
  academicLevelId: 11,
  isActive: true,
};
const programs = [
  { programId: 31, programName: "Track One" },
  { programId: 32, programName: "Track Two" },
  { programId: 33, programName: "No Sections" },
  { programId: 34, programName: "Failure Track" },
];
let failSections = true;
let historyFails = false;
let allocationPartial = false;
let previewDenied = false;
let previewMalformed = false;
let promoted = [];
let rolledBack = false;
const student = (studentId, eligible = true) => ({
  studentId,
  studentName: `Test Student ${studentId}`,
  studentCode: `CODE-${studentId}`,
  admissionNo: `ADM-${studentId}`,
  academicYearId: 901,
  boardId: 91,
  academicLevel: levels[0].levelName,
  academicLevelId: 11,
  groupId: 21,
  groupName: group.groupName,
  programId: 31,
  programName: programs[0].programName,
  sectionId: 41,
  section: "Source A",
  sectionName: "Source A",
  isActive: true,
  eligibilityStatus: eligible ? "Eligible" : "Not Eligible",
  eligibilityReason: eligible ? "Backend eligibility result" : "Backend supplied restriction",
});
const historyRow = (studentId = 101, promotionId = 501) => ({
  promotionId,
  studentId,
  studentName: `Test Student ${studentId}`,
  admissionNo: `ADM-${studentId}`,
  sourceAcademicYear: "2030-2031",
  sourceAcademicLevel: levels[0].levelName,
  sourceGroup: group.groupName,
  sourceSection: "Source A",
  targetAcademicYear: "2031-2032",
  targetAcademicLevel: levels[1].levelName,
  targetGroup: group.groupName,
  targetSection: "Destination B",
  promotionDate: "2030-05-12T12:00:00Z",
  promotedBy: "Test Admin",
  promotionStatus: rolledBack ? "RolledBack" : "Promoted",
  rollbackStatus: rolledBack,
});
async function respond(event) {
  const url = new URL(event.request.url);
  const path = url.pathname;
  if (!path.startsWith("/api/"))
    return send("Fetch.continueRequest", { requestId: event.requestId });
  const query = Object.fromEntries(url.searchParams);
  const payload = event.request.postData ? JSON.parse(event.request.postData) : undefined;
  const log = { path, query, method: event.request.method, payload };
  requests.push(log);
  let data = [],
    status = 200;
  if (path === "/api/v1/boards") data = [board];
  else if (path === "/api/v1/academic-years/active") data = years;
  else if (path === "/api/v1/academic-years") data = { Data: years, Pagination: { TotalPages: 1 } };
  else if (path === "/api/v1/boards/academic-levels") data = levels;
  else if (path === "/api/v1/groups") data = [group];
  else if (path === "/api/v1/groups/21/programs") data = programs;
  else if (path === "/api/v1/Sections") {
    assert.ok(
      ["BoardId", "AcademicYearId", "AcademicLevelId", "GroupId", "ProgramId", "IsActive"].every(
        (key) => query[key],
      ),
      "Every sections request must be scoped",
    );
    if (query.ProgramId === "31") await sleep(450);
    if (query.ProgramId === "34" && failSections) {
      status = 503;
      data = { message: "Section service unavailable" };
    } else if (query.ProgramId === "33") data = [];
    else {
      const section = {
        sectionId: query.AcademicYearId === "902" ? 51 : query.ProgramId === "32" ? 42 : 41,
        sectionName:
          query.AcademicYearId === "902"
            ? "Destination B"
            : query.ProgramId === "32"
              ? "Source Track Two"
              : "Source A",
        boardId: 91,
        academicYearId: Number(query.AcademicYearId),
        academicLevelId: Number(query.AcademicLevelId),
        groupId: 21,
        programId: Number(query.ProgramId),
        isActive: true,
      };
      data = [
        section,
        { ...section, sectionId: 999, sectionName: "WRONG YEAR", academicYearId: 800 },
        { ...section, sectionId: 998, sectionName: "INACTIVE", isActive: false },
      ];
    }
  } else if (path.endsWith("/eligible-students")) {
    data = [student(101), student(102), student(103, false)].filter(
      (row) => !promoted.includes(row.studentId),
    );
  } else if (path.endsWith("/preview")) {
    await sleep(200);
    data = {
      totalSelected: payload.studentIds.length,
      eligibleCount: previewDenied ? 0 : payload.studentIds.length,
      notEligibleCount: previewDenied ? payload.studentIds.length : 0,
      students: payload.studentIds.map((studentId) => student(studentId, !previewDenied)),
    };
    if (previewMalformed) data = null;
  } else if (path === "/api/v1/promotions" && event.request.method === "POST") {
    await sleep(200);
    promoted.push(...payload.studentIds);
    data = {
      promotionBatchId: "TEST-BATCH",
      totalRequested: payload.studentIds.length,
      promotedCount: payload.studentIds.length,
      failedCount: 0,
      students: payload.studentIds.map((studentId) => ({ studentId, promotionStatus: "Promoted" })),
    };
  } else if (/\/promotions\/student\//.test(path)) {
    const studentId = Number(path.split("/").at(-1));
    promoted.push(studentId);
    data = historyRow(studentId);
  } else if (path === "/api/v1/students/search")
    data = [
      student(201),
      student(202),
      { ...student(203), programId: 32 },
      { ...student(204), academicLevelId: 12 },
    ];
  else if (path.endsWith("-allocation"))
    data = {
      updatedCount: allocationPartial ? 0 : payload.studentIds.length,
      failedCount: allocationPartial ? payload.studentIds.length : 0,
      students: payload.studentIds.map((studentId) => ({
        studentId,
        status: allocationPartial ? "Failed" : "Updated",
        message: allocationPartial ? "Backend rejected allocation" : "Saved",
      })),
    };
  else if (path.endsWith("/history")) {
    if (historyFails) {
      status = 500;
      data = { message: "History service unavailable" };
    } else data = [historyRow()];
  } else if (path.endsWith("/report"))
    data = {
      totalStudents: 9,
      eligibleStudents: 7,
      notEligibleStudents: 2,
      promotedStudents: rolledBack ? 0 : 1,
      notPromotedStudents: 8,
      rolledBackStudents: rolledBack ? 1 : 0,
      details: [historyRow()],
    };
  else if (path.endsWith("/rollback")) {
    rolledBack = true;
    data = { promotionId: payload.promotionId, rollbackStatus: "RolledBack" };
  }
  await send("Fetch.fulfillRequest", {
    requestId: event.requestId,
    responseCode: status,
    responseHeaders: [{ name: "Content-Type", value: "application/json" }],
    body: Buffer.from(JSON.stringify(data)).toString("base64"),
  });
}
ws.addEventListener("message", (message) => {
  const event = JSON.parse(message.data);
  if (event.id) {
    const task = pending.get(event.id);
    pending.delete(event.id);
    event.error ? task?.reject(new Error(event.error.message)) : task?.resolve(event.result);
  }
  if (event.method === "Fetch.requestPaused")
    respond(event.params).catch((error) => exceptions.push(error.message));
  if (event.method === "Runtime.exceptionThrown")
    exceptions.push(
      event.params.exceptionDetails.exception?.description ?? event.params.exceptionDetails.text,
    );
});
await send("Page.enable");
await send("Runtime.enable");
await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `localStorage.setItem('token','isolated-browser-fixture');localStorage.setItem('role','Admin');localStorage.setItem('user',JSON.stringify({role:'Admin',isAdmin:true,name:'Test Admin'}));localStorage.setItem('cms_selected_board',JSON.stringify({id:'91',name:'Verification Board'}));localStorage.setItem('cms_selected_academic_year',JSON.stringify({id:'901',label:'2030-2031',name:'2030-2031'}));`,
});
const navigate = async (path) => {
  await send("Page.navigate", { url: base + path });
  await waitFor(
    `document.querySelector('.promotion-page') && document.body.innerText.includes('Verification Board')`,
  );
  await sleep(350);
};
const source = async (prefix = "promote-source", program = "31") => {
  await select(`f-${prefix}-level`, "11");
  await select(`f-${prefix}-group`, "21");
  await select(`f-${prefix}-program`, program);
};
const reset = async (view = "promote") => {
  promoted = [];
  rolledBack = false;
  await navigate(`/dashboard/promotion?view=${view}`);
};
const screenshot = async (name) => {
  await sleep(650);
  await mkdir(".promotion-verification", { recursive: true });
  await writeFile(
    `.promotion-verification/${name}.png`,
    Buffer.from(
      (await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })).data,
      "base64",
    ),
  );
};
try {
  await reset();
  assert.equal(
    requests.filter((request) => request.path === "/api/v1/Sections").length,
    0,
    "No sections on initial load",
  );
  assert.equal(await evaluate(`document.querySelectorAll('.promotion-tabs button').length`), 3);
  await source();
  assert.equal(
    await evaluate(`document.getElementById('f-promote-source-section').disabled`),
    true,
    "Disabled while loading sections",
  );
  await select("f-promote-source-program", "32");
  await select("f-promote-source-section", "42");
  await sleep(600);
  assert.equal(
    await evaluate(`document.getElementById('f-promote-source-section').value`),
    "42",
    "Old response cannot overwrite new scope",
  );
  assert.equal(
    await evaluate(
      `document.getElementById('f-promote-source-section').textContent.includes('WRONG YEAR')`,
    ),
    false,
  );
  await select("f-promote-source-program", "33");
  await waitFor(
    `document.body.innerText.includes('No sections available for the selected program.')`,
  );
  await select("f-promote-source-program", "34");
  await waitFor(`document.body.innerText.includes('Unable to load section')`);
  failSections = false;
  await evaluate(
    `document.getElementById('f-promote-source-section').closest('.promotion-option-field').querySelector('button').click()`,
  );
  await waitFor(`!document.getElementById('f-promote-source-section').disabled`);
  await select("f-promote-source-program", "31");
  await select("f-promote-source-section", "41");
  await select("f-promote-target-section", "51");
  await click("Load Eligible Students");
  await waitFor(`document.body.innerText.includes('Test Student 103')`);
  assert.equal(
    await evaluate(
      `document.querySelector('input[aria-label="Select Test Student 103"]').disabled`,
    ),
    true,
  );
  await click("Select All Eligible");
  assert.equal(
    await evaluate(
      `document.querySelectorAll('.promotion-table input[type="checkbox"]:checked').length`,
    ),
    2,
  );
  const cohortCalls = requests.filter((request) =>
    request.path.endsWith("/eligible-students"),
  ).length;
  await click("Allocation");
  await click("Promote Students");
  assert.equal(
    await evaluate(
      `document.querySelectorAll('.promotion-table input[type="checkbox"]:checked').length`,
    ),
    2,
    "Selection survives switching workspaces",
  );
  await sleep(450);
  assert.equal(
    requests.filter((request) => request.path.endsWith("/eligible-students")).length,
    cohortCalls,
    "No cohort request loop",
  );
  await screenshot("promote-light");
  assert.equal(
    await evaluate(`getComputedStyle(document.querySelector('.promotion-selection-bar')).position`),
    "static",
    "Selection footer cannot overlap content",
  );
  assert.equal(
    await evaluate(
      `document.querySelector('.promotion-selection-bar').parentElement.querySelector('table') !== null`,
    ),
    true,
    "Selection footer belongs to the student card",
  );
  const initialSections = requests.filter(
    (request) => request.path === "/api/v1/Sections" && request.query.ProgramId !== "34",
  );
  assert.equal(
    new Set(initialSections.map((request) => JSON.stringify(request.query))).size,
    initialSections.length,
    "Identical section scopes are deduplicated",
  );
  assert.equal(
    requests.some((request) => request.path.endsWith("/eligible")),
    false,
    "Only one eligibility alias is called",
  );
  await evaluate(`document.documentElement.setAttribute('data-theme','dark')`);
  await screenshot("promote-dark");
  await evaluate(`document.documentElement.setAttribute('data-theme','light')`);
  previewDenied = true;
  await click("Preview Promotion");
  await waitFor(`!!document.querySelector('[role="dialog"]')`);
  assert.equal(
    await evaluate(
      `Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Confirm Promotion').disabled`,
    ),
    true,
    "Backend-denied preview blocks confirmation",
  );
  await click("Cancel");
  previewDenied = false;
  previewMalformed = true;
  await click("Preview Promotion");
  await waitFor(`document.body.innerText.includes('invalid preview')`);
  assert.equal(
    await evaluate(`!!document.querySelector('[role="dialog"]')`),
    false,
    "Malformed previews cannot be confirmed",
  );
  previewMalformed = false;
  await click("Preview Promotion");
  await waitFor(`!!document.querySelector('[role="dialog"]')`);
  assert.ok(
    await evaluate(
      `document.querySelector('[role="dialog"]').innerText.includes('Backend eligibility result')`,
    ),
  );
  await screenshot("preview-light");
  await evaluate(`document.documentElement.setAttribute('data-theme','dark')`);
  await screenshot("preview-dark");
  await evaluate(`document.documentElement.setAttribute('data-theme','light')`);
  await evaluate(
    `(()=>{const b=Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Confirm Promotion');b.click();b.click();})()`,
  );
  await waitFor(
    `document.body.innerText.includes('TEST-BATCH') && !document.querySelector('[role="dialog"]')`,
  );
  assert.equal(
    requests.filter((request) => request.path === "/api/v1/promotions" && request.method === "POST")
      .length,
    1,
    "Double click sends one mutation",
  );
  const bulk = requests.find((request) => request.path === "/api/v1/promotions").payload;
  assert.deepEqual(
    bulk,
    requests.filter((request) => request.path.endsWith("/preview")).at(-1).payload,
    "Confirm submits the exact previewed snapshot",
  );
  assert.equal(bulk.sourceSection, "Source A");
  assert.equal(bulk.targetSection, "Destination B");
  assert.equal(bulk.targetSectionId, 51);
  assert.equal(bulk.targetAcademicYearId, 902);
  assert.deepEqual(bulk.studentIds, [101, 102]);
  await reset();
  await source();
  await select("f-promote-source-section", "41");
  await select("f-promote-target-section", "51");
  await click("Load Eligible Students");
  await click("Promote");
  await click("Confirm Promotion");
  await waitFor(
    `!document.querySelector('[role="dialog"]') && document.body.innerText.includes('Promotion 501')`,
  );
  const single = requests.find((request) => request.path === "/api/v1/promotions/student/101");
  assert.equal(single.payload.targetSection, "Destination B");
  assert.equal(single.payload.targetProgramId, 31);
  assert.equal("targetSectionId" in single.payload, false);
  await reset("allocation");
  await source("allocation");
  await click("Load Students");
  await waitFor(`document.body.innerText.includes('Test Student 201')`);
  assert.equal(
    await evaluate(`document.body.innerText.includes('Test Student 203')`),
    false,
    "Allocation filters program IDs",
  );
  assert.equal(
    await evaluate(`document.body.innerText.includes('Test Student 204')`),
    false,
    "Allocation validates level IDs",
  );
  await click("Select All");
  await select("f-allocation-bulk-target", "32");
  await click("Apply to Selected");
  await click("Save Allocation");
  await waitFor(`document.body.innerText.includes('2 updated')`);
  assert.deepEqual(
    requests.find((request) => request.path.endsWith("/program-allocation")).payload,
    {
      studentIds: [201, 202],
      targetAcademicYearId: 901,
      targetAcademicLevelId: 11,
      targetAcademicLevel: levels[0].levelName,
      targetGroupId: 21,
      targetProgramId: 32,
    },
  );
  await click("Section Allocation");
  await click("Select All");
  await select("f-allocation-bulk-target", "41");
  await click("Apply to Selected");
  await click("Save Allocation");
  await waitFor(`document.body.innerText.includes('2 updated')`);
  await sleep(350);
  const allocation = requests.find((request) =>
    request.path.endsWith("/section-allocation"),
  ).payload;
  assert.equal(allocation.targetSectionId, 41);
  assert.equal(allocation.targetSection, "Source A");
  assert.equal(allocation.targetAcademicYearId, 901);
  await screenshot("allocation");
  await evaluate(`document.documentElement.setAttribute('data-theme','dark')`);
  await screenshot("allocation-dark");
  await evaluate(`document.documentElement.setAttribute('data-theme','light')`);
  allocationPartial = true;
  await click("Select All");
  await select("f-allocation-bulk-target", "41");
  await click("Apply to Selected");
  await click("Save Allocation");
  await waitFor(`document.body.innerText.includes('Backend rejected allocation')`);
  allocationPartial = false;
  historyFails = true;
  await reset("history");
  await waitFor(
    `document.body.innerText.includes('History service unavailable') && document.querySelector('.promotion-summary')`,
  );
  historyFails = false;
  await evaluate(`document.querySelector('button[aria-label="Refresh history"]').click()`);
  await waitFor(`document.body.innerText.includes('Test Student 101')`);
  await screenshot("history");
  assert.deepEqual(
    await evaluate(
      `Array.from(document.querySelectorAll('.promotion-summary strong')).map(e=>Number(e.textContent))`,
    ),
    [9, 7, 2, 1, 8, 0],
    "Report cards display authoritative values",
  );
  await evaluate(`document.documentElement.setAttribute('data-theme','dark')`);
  await screenshot("history-dark");
  await evaluate(`document.documentElement.setAttribute('data-theme','light')`);
  await click("Rollback");
  await waitFor(`!!document.getElementById('promotion-rollback-reason')`);
  await input("#promotion-rollback-reason", "Regression test reason");
  await screenshot("rollback-light");
  await evaluate(`document.documentElement.setAttribute('data-theme','dark')`);
  await screenshot("rollback-dark");
  await evaluate(`document.documentElement.setAttribute('data-theme','light')`);
  await click("Confirm Rollback");
  await waitFor(
    `!document.querySelector('[role="dialog"]') && document.body.innerText.includes('RolledBack')`,
  );
  assert.equal(
    requests.find((request) => request.path.endsWith("/rollback")).payload.reason,
    "Regression test reason",
  );
  assert.ok(requests.filter((request) => request.path.endsWith("/report")).length >= 2);
  for (const [old, view] of [
    ["eligible", "promote"],
    ["single", "promote"],
    ["allocation", "allocation"],
    ["history", "history"],
    ["report", "history"],
  ]) {
    await navigate(`/dashboard/promotions/${old}`);
    assert.equal(
      await evaluate("location.pathname + location.search"),
      `/dashboard/promotion?view=${view}`,
    );
  }
  await reset();
  await source();
  await select("f-promote-source-section", "41");
  await click("Load Eligible Students");
  await click("Select All Eligible");
  await select("f-promote-source-group", "");
  assert.equal(
    await evaluate(`document.getElementById('f-promote-source-program').value`),
    "",
    "Group change clears program",
  );
  assert.equal(
    await evaluate(`document.getElementById('f-promote-source-section').value`),
    "",
    "Group change clears section",
  );
  assert.equal(
    await evaluate(
      `document.querySelectorAll('.promotion-table input[type="checkbox"]:checked').length`,
    ),
    0,
    "Group change clears selected students",
  );
  assert.equal(
    await evaluate(`document.body.innerText.includes('Test Student 101')`),
    false,
    "Group change clears loaded cohort",
  );
  await select("f-promote-source-group", "21");
  await select("f-promote-source-program", "31");
  await select("f-promote-source-section", "41");
  await click("Load Eligible Students");
  await click("Select All Eligible");
  await evaluate(`document.querySelector('button[aria-label="Select Academic Year"]').click()`);
  await click("2031-2032");
  await waitFor(`document.getElementById('f-promote-source-level').value === ''`);
  assert.equal(
    await evaluate(
      `document.querySelectorAll('.promotion-table input[type="checkbox"]:checked').length`,
    ),
    0,
    "Year change clears selections",
  );
  await send("Page.reload");
  await waitFor(`!!document.querySelector('.promotion-page')`);
  await waitFor(
    `document.getElementById('f-promote-source-level') && !document.getElementById('f-promote-source-level').disabled`,
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: 600,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate(`document.querySelector('button[aria-label="Close sidebar"]')?.click()`);
  await screenshot("promotion-narrow");
  assert.equal(
    await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    true,
    "No page-level horizontal overflow",
  );
  assert.deepEqual(exceptions, []);
  const sections = requests.filter((request) => request.path === "/api/v1/Sections");
  await writeFile(".promotion-verification/network.json", JSON.stringify(requests, null, 2));
  console.log(
    `PASS: 15 scenario groups, ${requests.length} intercepted API requests, ${sections.length} scoped section requests; no browser exceptions. Fixtures only; no live writes.`,
  );
} catch (error) {
  console.error("Browser exceptions:", exceptions);
  console.error("Recent requests:", requests.slice(-5));
  throw error;
} finally {
  ws.close();
}
