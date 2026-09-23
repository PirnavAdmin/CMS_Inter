// Isolated CDP checks. Every /api request is fulfilled locally; no live writes.
import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { Buffer } from "node:buffer";
import { setTimeout } from "node:timers";
import { URL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
const { fetch, WebSocket } = globalThis;
const base = process.argv[2] || "http://127.0.0.1:5174",
  cdp = process.argv[3] || "http://127.0.0.1:9223";
const tabs = await (await fetch(`${cdp}/json/list`)).json();
const ws = new WebSocket(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map(),
  requests = [],
  exceptions = [];
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
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${expression}`);
};
const click = async (text) => {
  const find = `[...document.querySelectorAll('button')].find(b=>b.offsetParent && b.textContent.trim()===${JSON.stringify(text)} && !b.disabled)`;
  await waitFor(find);
  await evaluate(`${find}.click()`);
};
const byLabel = (label) =>
  `[...document.querySelectorAll('label.ec-field')].find(e=>e.querySelector('span')?.textContent===${JSON.stringify(label)})?.querySelector('input,select,textarea')`;
const field = async (label, value) => {
  await waitFor(byLabel(label));
  await evaluate(
    `(()=>{const e=${byLabel(label)};Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`,
  );
};
const check = async (label) => {
  const selector = `[...document.querySelectorAll('label')].find(e=>e.textContent.trim()===${JSON.stringify(label)})?.querySelector('input[type=checkbox]')`;
  await waitFor(selector);
  await evaluate(`${selector}.click()`);
};
const ariaClick = async (label) => {
  await waitFor(`document.querySelector('[aria-label="${label}"]')`);
  await evaluate(`document.querySelector('[aria-label="${label}"]').click()`);
};
const board = { boardId: 91, boardName: "Verification Board", boardCode: "TEST", isActive: true };
const years = [{ academicYearId: 901, academicYearName: "2030-2031", boardId: 91, isActive: true }];
const levels = [
  { academicLevelId: 11, levelName: "First Year" },
  { academicLevelId: 12, levelName: "Second Year" },
];
const groups = [
  { groupId: 21, groupName: "MPC", boardId: 91, isActive: true },
  { groupId: 22, groupName: "BiPC", boardId: 91, isActive: true },
];
let exams = [
  {
    examinationId: 101,
    examCode: "EXAM-2030-0001",
    examName: "Regular Fixture",
    boardId: 91,
    academicYearId: 901,
    academicLevelId: 11,
    academicLevelName: "First Year",
    groupId: 21,
    groupName: "MPC",
    programId: 31,
    programName: "JEE",
    examType: "Unit Test",
    assessmentTypeId: 1,
    startDate: "2030-09-01",
    endDate: "2030-09-05",
    status: "DRAFT",
    examPattern: "Regular Academic Pattern",
    description: "Fixture",
  },
  {
    examinationId: 102,
    examCode: "EXAM-2030-0002",
    examName: "Objective Fixture",
    boardId: 91,
    academicYearId: 901,
    academicLevelId: 11,
    groupId: 22,
    programId: 33,
    startDate: "2030-09-01",
    endDate: "2030-09-01",
    status: "DRAFT",
    examPattern: "Objective Combined Pattern",
  },
  {
    examinationId: 103,
    examCode: "EXAM-2030-0003",
    examName: "Completed Fixture",
    boardId: 91,
    academicYearId: 901,
    academicLevelId: 11,
    groupId: 21,
    programId: 31,
    startDate: "2030-09-01",
    endDate: "2030-09-01",
    status: "COMPLETED",
  },
];
let schedules = [
  {
    examScheduleId: 501,
    examinationId: 101,
    subjectId: 111,
    subjectName: "Physics",
    examDate: "2030-09-01",
    startTime: "10:00:00",
    endTime: "12:00:00",
    roomId: 41,
    hall: "A1",
    invigilatorId: 61,
    invigilator: "Teacher A",
    scheduleMode: "SUBJECT_WISE",
    examMode: "Written",
    maxMarks: 100,
    passingMarks: 35,
  },
  {
    examScheduleId: 502,
    examinationId: 102,
    subjectId: 0,
    subjectName: "Objective sitting",
    examDate: "2030-09-01",
    startTime: "10:00:00",
    endTime: "12:00:00",
    roomId: 42,
    hall: "B1",
    invigilatorId: 62,
    invigilator: "Teacher B",
    scheduleMode: "PATTERN_WISE",
    examMode: "Objective",
    maxMarks: 100,
    passingMarks: 35,
  },
];
let count = 30,
  failAvailability = false,
  conflict = false,
  delayOld = false,
  requestFailure = false;
const halls = [
  {
    roomId: 41,
    roomName: "Hall A",
    roomCode: "A1",
    capacity: 60,
    roomType: "Exam Hall",
    isActive: true,
    isAvailable: true,
  },
  {
    roomId: 42,
    roomName: "Hall B",
    roomCode: "B1",
    capacity: 50,
    roomType: "Classroom",
    isActive: true,
    isAvailable: true,
  },
  {
    roomId: 43,
    roomName: "Hall C",
    roomCode: "C1",
    capacity: 120,
    roomType: "Exam Hall",
    isActive: true,
    isAvailable: true,
  },
];
const faculty = [61, 62, 63, 64].map((facultyId, i) => ({
  facultyId,
  facultyName: `Teacher ${String.fromCharCode(65 + i)}`,
  employeeId: `T${facultyId}`,
  isActive: true,
  isAvailable: true,
}));
async function respond(event) {
  const url = new URL(event.request.url),
    path = url.pathname,
    method = event.request.method;
  if (!path.startsWith("/api/"))
    return send("Fetch.continueRequest", { requestId: event.requestId });
  const query = Object.fromEntries(url.searchParams),
    payload = event.request.postData ? JSON.parse(event.request.postData) : null;
  requests.push({ path, method, query, payload });
  if (path.endsWith("/export/excel")) {
    return send("Fetch.fulfillRequest", {
      requestId: event.requestId,
      responseCode: 200,
      responseHeaders: [
        {
          name: "Content-Type",
          value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
      body: Buffer.from("isolated download fixture; not a workbook validation").toString("base64"),
    });
  }
  let data = [],
    status = 200;
  if (path === "/api/v1/boards") data = [board];
  else if (path.includes("academic-years")) data = years;
  else if (path === "/api/v1/boards/academic-levels") data = levels;
  else if (path === "/api/v1/groups") data = groups;
  else if (/groups\/\d+\/programs/.test(path))
    data = path.includes("/21/")
      ? [
          { programId: 31, programName: "JEE", isActive: true },
          { programId: 32, programName: "Regular", isActive: true },
        ]
      : [{ programId: 33, programName: "NEET", isActive: true }];
  else if (path === "/api/v1/subjects/context")
    data = [
      {
        subjectId: Number(query.academicLevelId) * 10 + 1 + (query.groupId === "22" ? 1000 : 0),
        subjectName: query.groupId === "22" ? "Biology" : "Physics",
        boardId: 91,
        groupId: Number(query.groupId),
        academicLevelId: Number(query.academicLevelId),
        isActive: true,
        language: false,
      },
      {
        subjectId: Number(query.academicLevelId) * 10 + 2,
        subjectName: "English",
        boardId: 91,
        groupId: Number(query.groupId),
        academicLevelId: Number(query.academicLevelId),
        isActive: true,
        language: true,
      },
    ];
  else if (path.endsWith("/examinations/types"))
    data = [{ assessmentTypeId: 1, name: "Unit Test" }];
  else if (path.endsWith("/examinations/patterns"))
    data = [
      { patternId: 1, patternName: "Regular Academic Pattern" },
      { patternId: 2, patternName: "Objective Combined Pattern" },
      { patternId: 3, patternName: "NEET Pattern" },
    ];
  else if (path === "/api/v1/examinations" && method === "POST") {
    await sleep(100);
    data = {
      ...exams[0],
      examinationId: 104,
      examCode: "EXAM-2030-0004",
      examName: payload.examName,
      startDate: payload.startDate,
      endDate: payload.endDate,
    };
    exams.push(data);
  } else if (path === "/api/v1/examinations") data = exams;
  else if (/\/examinations\/\d+\/schedules\/\d+$/.test(path)) {
    const sid = Number(path.split("/").at(-1));
    if (method === "PUT") {
      if (conflict) {
        status = 409;
        data = {
          message:
            conflict === "faculty"
              ? "Teacher A is already assigned during this period."
              : "Hall A is already assigned during this period.",
        };
      } else {
        schedules = schedules.map((s) => (s.examScheduleId === sid ? { ...s, ...payload } : s));
        data = schedules.find((s) => s.examScheduleId === sid);
      }
    } else if (method === "DELETE") {
      schedules = schedules.filter((s) => s.examScheduleId !== sid);
      data = {};
    }
  } else if (/\/examinations\/\d+\/schedules$/.test(path))
    data = schedules.filter((s) => s.examinationId === Number(path.split("/").at(-2)));
  else if (/\/examinations\/\d+$/.test(path)) {
    const eid = Number(path.split("/").at(-1));
    if (method === "PUT")
      exams = exams.map((e) => (e.examinationId === eid ? { ...e, ...payload } : e));
    if (method === "DELETE") exams = exams.filter((e) => e.examinationId !== eid);
    data = exams.find((e) => e.examinationId === eid) || {};
  } else if (path.endsWith("/cancel")) {
    const eid = Number(path.split("/").at(-2));
    exams = exams.map((e) => (e.examinationId === eid ? { ...e, status: "CANCELLED" } : e));
    data = { status: "CANCELLED" };
  } else if (path === "/api/v1/students/search")
    data = [
      ...Array.from({ length: count }, (_, i) => ({
        studentId: i + 1,
        groupId: Number(query.groupId),
        academicLevelId: 11,
        programId: query.groupId === "21" ? 31 : 33,
        isActive: true,
      })),
      { studentId: 9991, groupId: 21, academicLevelId: 12, programId: 31, isActive: true },
      { studentId: 9992, groupId: 21, academicLevelId: 11, programId: 32, isActive: true },
    ];
  else if (path === "/api/v1/staff/dropdown")
    data = faculty.map((f) => ({ ...f, staffType: "Teaching" }));
  else if (path.includes("available-halls") || path.includes("available-invigilators")) {
    if (delayOld && query.startTime === "13:00:00") await sleep(900);
    if (failAvailability) {
      status = 500;
      data = { message: "Fixture availability unavailable" };
    } else {
      const overlapping = schedules.filter(
        (s) =>
          s.examScheduleId !== Number(query.excludeScheduleId) &&
          s.examDate === query.date &&
          query.startTime < s.endTime &&
          s.startTime < query.endTime,
      );
      data = path.includes("available-halls")
        ? halls.filter((h) => !overlapping.some((s) => s.roomId === h.roomId))
        : faculty.filter((f) => !overlapping.some((s) => s.invigilatorId === f.facultyId));
      if (query.startTime === "13:00:00") data = data.slice(0, 1);
    }
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
    respond(event.params).catch((error) => {
      requestFailure = true;
      exceptions.push(error.message);
    });
  if (event.method === "Runtime.exceptionThrown")
    exceptions.push(
      event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text,
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
  source: `localStorage.clear();localStorage.setItem('token','isolated-browser-fixture');localStorage.setItem('role','Admin');localStorage.setItem('user',JSON.stringify({role:'Admin',isAdmin:true,name:'Test Admin'}));localStorage.setItem('cms_selected_board',JSON.stringify({id:'91',name:'Verification Board'}));localStorage.setItem('cms_selected_academic_year',JSON.stringify({id:'901',label:'2030-2031',name:'2030-2031'}));`,
});
const navigate = async (path = "/dashboard/examinations") => {
  await send("Page.navigate", { url: base + path });
  await waitFor("document.querySelector('.examination-center')");
  await sleep(300);
};
const screenshot = async (name) => {
  await sleep(500);
  await mkdir(".examination-verification", { recursive: true });
  await writeFile(
    `.examination-verification/${name}.png`,
    Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"),
  );
};
let scenarios = 0;
try {
  await navigate();
  await waitFor("document.body.innerText.includes('Regular Fixture')");
  assert.equal(requests.filter((r) => r.path.includes("available-")).length, 0);
  scenarios++;
  await screenshot("exams-desktop");
  await field("Search exams", "Objective Fixture");
  assert.ok(
    !(await evaluate(
      "document.querySelector('.ec-list-table').innerText.includes('Regular Fixture')",
    )),
  );
  await field("Search exams", "no matching examination");
  await screenshot("empty-search");
  await field("Search exams", "");
  scenarios++;
  await ariaClick("Schedule Regular Fixture");
  await click("Edit / reschedule");
  await waitFor("document.querySelector('.ec-dialog')?.innerText.includes('2 available halls')");
  assert.ok(await evaluate(`${byLabel("Hall 1")}.innerText.includes('Hall A')`));
  assert.ok(!(await evaluate(`${byLabel("Hall 1")}.innerText.includes('Hall B')`)));
  assert.ok(
    await evaluate(
      "document.querySelector('.ec-dialog').innerText.includes('Confirmed active candidates: 30')",
    ),
  );
  assert.ok(
    requests
      .filter((r) => r.path.includes("available-"))
      .every((r) => r.query.excludeScheduleId === "501"),
  );
  scenarios++;
  const beforePut = requests.filter((r) => r.method === "PUT").length;
  await evaluate(
    "document.querySelector('.ec-dialog form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));document.querySelector('.ec-dialog form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));",
  );
  await waitFor("!document.querySelector('.ec-dialog')");
  assert.equal(requests.filter((r) => r.method === "PUT").length - beforePut, 1);
  scenarios++;
  await click("Edit / reschedule");
  await waitFor("document.querySelector('.ec-dialog')?.innerText.includes('2 available halls')");
  delayOld = true;
  await field("End time", "16:00");
  await field("Start time", "13:00");
  await sleep(150);
  await field("Start time", "14:00");
  await waitFor("document.querySelector('.ec-dialog')?.innerText.includes('3 available halls')");
  await sleep(1100);
  assert.ok(
    await evaluate("document.querySelector('.ec-dialog').innerText.includes('3 available halls')"),
  );
  assert.ok(
    await evaluate(
      "document.querySelector('.ec-dialog').innerText.includes('4 available invigilators')",
    ),
  );
  delayOld = false;
  scenarios++;
  await click("Auto allocate");
  assert.ok(await evaluate(`${byLabel("Hall 1")}.value==='41'`));
  await screenshot("schedule-editor");
  failAvailability = true;
  await click("Refresh availability");
  await waitFor(
    "document.querySelector('.ec-dialog')?.innerText.includes('Fixture availability unavailable')",
  );
  assert.equal(schedules[0].roomId, 41);
  assert.equal(schedules[0].startTime, "10:00:00");
  failAvailability = false;
  await click("Retry availability");
  await waitFor("document.querySelector('.ec-dialog')?.innerText.includes('3 available halls')");
  scenarios++;
  conflict = true;
  await click("Save supported changes");
  await waitFor(
    "document.querySelector('.ec-dialog')?.innerText.includes('Hall A is already assigned during this period.')",
  );
  assert.equal(schedules[0].startTime, "10:00:00");
  const afterHallConflict = requests.filter((r) => r.method === "PUT").length;
  await waitFor("document.querySelector('.ec-dialog')?.innerText.includes('3 available halls')");
  conflict = "faculty";
  const availabilityBefore = requests.filter((r) => r.path.includes("available-")).length;
  await click("Save supported changes");
  await waitFor(
    "document.querySelector('.ec-dialog')?.innerText.includes('Teacher A is already assigned during this period.')",
  );
  await sleep(500);
  assert.equal(requests.filter((r) => r.method === "PUT").length, afterHallConflict + 1);
  assert.ok(requests.filter((r) => r.path.includes("available-")).length > availabilityBefore);
  assert.equal(schedules[0].startTime, "10:00:00");
  scenarios++;
  conflict = false;
  await click("Close");
  scenarios++;
  count = 110;
  await click("Edit / reschedule");
  await waitFor(
    "document.querySelector('.ec-dialog')?.innerText.includes('Confirmed active candidates: 110')",
  );
  await waitFor("document.querySelector('.ec-dialog')?.innerText.includes('2 available halls')");
  await click("Auto allocate");
  assert.equal(await evaluate("document.querySelectorAll('.ec-dialog .ec-scope-panel').length"), 2);
  assert.ok(
    await evaluate(
      "[...document.querySelectorAll('.ec-dialog button')].find(b=>b.textContent==='Save supported changes').disabled",
    ),
  );
  scenarios++;
  await click("Close");
  count = 61;
  await click("Edit / reschedule");
  await waitFor(
    "document.querySelector('.ec-dialog')?.innerText.includes('Confirmed active candidates: 61')",
  );
  await waitFor("document.querySelector('.ec-dialog')?.innerText.includes('2 available halls')");
  await click("Auto allocate");
  assert.ok(
    await evaluate(
      "[...document.querySelectorAll('.ec-dialog button')].find(b=>b.textContent==='Save supported changes').disabled",
    ),
  );
  await click("Close");
  count = 30;
  scenarios++;
  await click("Exams");
  await click("Create examination");
  await field("Exam name", "Created Fixture");
  await field("Exam category", "Regular");
  await field("Exam type", "1");
  await field("Start date", "2030-09-01");
  await field("End date", "2030-09-05");
  await click("Continue");
  await check("First Year");
  await check("JEE");
  await click("Continue");
  await waitFor(`${byLabel("Exam pattern")}.options.length>1`);
  await field("Exam pattern", "Regular Academic Pattern");
  await check("Physics");
  await click("Continue");
  await check("I have reviewed the configuration and understand the persistence limitation.");
  await evaluate(
    "document.querySelector('.ec-wizard form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));document.querySelector('.ec-wizard form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));",
  );
  await waitFor(
    "document.querySelector('[role=alert]')?.innerText.includes('BACKEND CONTRACT BLOCKER')",
  );
  const creates = requests.filter((r) => r.method === "POST" && r.path === "/api/v1/examinations");
  assert.equal(creates.length, 1);
  assert.deepEqual(creates[0].payload.programIds, [31]);
  assert.ok(!("examCode" in creates[0].payload));
  assert.deepEqual(creates[0].payload.selectedSubjectIds, [111]);
  scenarios++;
  await click("Return to Exams");
  await navigate();
  await ariaClick("Review Created Fixture");
  await waitFor("document.body.innerText.includes('BACKEND CONTRACT BLOCKER')");
  assert.ok(
    await evaluate("document.body.innerText.includes('selected subjects were not returned')"),
  );
  scenarios++;
  await click("Exams");
  await click("Create examination");
  await field("Exam name", "Objective Draft");
  await field("Exam category", "Objective");
  await field("Exam type", "1");
  await field("Start date", "2030-09-01");
  await click("Continue");
  await check("First Year");
  await check("JEE");
  await click("BiPC · 0 programs");
  await check("NEET");
  await click("Continue");
  await waitFor("document.querySelectorAll('select').length>=2");
  await evaluate(
    "document.querySelectorAll('.ec-scope-panel select').forEach((e,i)=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,i === 0 ? 'Objective Combined Pattern' : 'NEET Pattern');e.dispatchEvent(new Event('change',{bubbles:true}));})",
  );
  await waitFor("document.querySelectorAll('.ec-choices label').length===2");
  assert.ok(
    !(await evaluate("document.querySelector('.ec-wizard').innerText.includes('English')")),
  );
  await evaluate(
    "[...document.querySelectorAll('button')].filter(b=>b.textContent==='Include all non-language subjects').forEach(b=>b.click())",
  );
  await click("Continue");
  assert.ok(
    await evaluate(
      "document.querySelector('.ec-wizard').innerText.includes('JEE') && document.querySelector('.ec-wizard').innerText.includes('NEET')",
    ),
  );
  assert.ok(
    await evaluate(
      "document.querySelector('.ec-wizard').innerText.includes('Creation is blocked')",
    ),
  );
  const reviewText = await evaluate("document.querySelector('.ec-wizard').innerText");
  assert.ok(
    reviewText.includes("Biology") &&
      reviewText.includes("Physics") &&
      reviewText.includes("NEET Pattern"),
  );
  await screenshot("objective-review");
  await evaluate("document.documentElement.setAttribute('data-theme','dark')");
  await screenshot("objective-review-dark");
  scenarios++;
  await send("Emulation.setDeviceMetricsOverride", {
    width: 650,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate("document.querySelector('[aria-label=\"Close sidebar\"]')?.click()");
  await screenshot("review-small");
  assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth+1"));
  scenarios++;
  await navigate();
  await ariaClick("Review Completed Fixture");
  await waitFor("document.body.innerText.includes('Schedule, hall')");
  assert.ok(
    !(await evaluate(
      "[...document.querySelectorAll('.ec-workspace button')].some(b=>b.textContent==='Edit examination')",
    )),
  );
  scenarios++;
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await click("Exams");
  await ariaClick("Schedule Objective Fixture");
  await click("Edit / reschedule");
  await waitFor(
    "document.querySelector('.ec-dialog')?.innerText.includes('Objective rescheduling needs')",
  );
  assert.ok(
    await evaluate(
      "[...document.querySelectorAll('.ec-dialog button')].find(b=>b.textContent==='Save supported changes').disabled",
    ),
  );
  await click("Close");
  scenarios++;
  await click("Exams");
  await evaluate("document.documentElement.setAttribute('data-theme','dark')");
  await screenshot("exams-dark");
  await ariaClick("Edit Regular Fixture");
  await field("Description", "Verified metadata edit");
  const editsBefore = requests.filter(
    (r) => r.method === "PUT" && !r.path.includes("schedules"),
  ).length;
  await evaluate(
    "const form=document.querySelector('.ec-dialog form'); form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})); form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));",
  );
  await waitFor("!document.querySelector('.ec-dialog')");
  assert.equal(
    requests.filter((r) => r.method === "PUT" && !r.path.includes("schedules")).length -
      editsBefore,
    1,
  );
  assert.equal(exams[0].description, "Verified metadata edit");
  scenarios++;
  await ariaClick("Schedule Regular Fixture");
  await click("Edit / reschedule");
  await waitFor("document.querySelector('.ec-dialog')?.innerText.includes('2 available halls')");
  await screenshot("schedule-editor-dark");
  failAvailability = true;
  await click("Refresh availability");
  await waitFor(
    "document.querySelector('.ec-dialog')?.innerText.includes('Fixture availability unavailable')",
  );
  await screenshot("availability-error-dark");
  failAvailability = false;
  await click("Close");
  await click("Exams");
  await ariaClick("Review Created Fixture");
  await click("Cancel examination");
  await click("Confirm");
  await waitFor("!document.querySelector('.ec-dialog')");
  assert.equal(exams.find((e) => e.examinationId === 104).status, "CANCELLED");
  await ariaClick("Review Created Fixture");
  await waitFor("document.querySelector('.ec-workspace')?.innerText.includes('CANCELLED')");
  assert.ok(
    !(await evaluate(
      "[...document.querySelectorAll('.ec-workspace button')].some(b=>b.textContent==='Edit examination')",
    )),
  );
  await screenshot("cancelled-review-dark");
  await evaluate(
    "window.__printCalls=0;window.print=()=>window.__printCalls++;window.__downloads=[];HTMLAnchorElement.prototype.click=function(){window.__downloads.push(this.download)}",
  );
  await click("Print");
  assert.equal(await evaluate("window.__printCalls"), 1);
  await click("Export Excel");
  await waitFor("window.__downloads.length===1");
  assert.equal(await evaluate("window.__downloads[0]"), "Examination-104.xlsx");
  scenarios++;
  await click("Delete examination");
  const deletesBefore = requests.filter((r) => r.method === "DELETE").length;
  await evaluate(
    "(()=>{const b=[...document.querySelectorAll('.ec-dialog button')].find(b=>b.textContent==='Confirm');b.click();b.click();})()",
  );
  await waitFor("!document.querySelector('.ec-dialog')");
  assert.equal(requests.filter((r) => r.method === "DELETE").length - deletesBefore, 1);
  assert.ok(!exams.some((e) => e.examinationId === 104));
  scenarios++;
  await navigate("/dashboard/examinations/add");
  await waitFor("document.querySelector('.ec-wizard')");
  await evaluate("document.documentElement.setAttribute('data-theme','dark')");
  await screenshot("create-dark");
  scenarios++;
  const steady = requests.length;
  await sleep(900);
  assert.equal(requests.length, steady);
  assert.equal(requestFailure, false);
  assert.deepEqual(exceptions, []);
  scenarios++;
  await writeFile(".examination-verification/network.json", JSON.stringify(requests, null, 2));
  console.log(
    JSON.stringify(
      {
        scenarios,
        requests: requests.length,
        createRequests: requests.filter((r) => r.method === "POST").length,
        scheduleUpdates: requests.filter((r) => r.method === "PUT" && r.path.includes("schedules"))
          .length,
        exceptions,
      },
      null,
      2,
    ),
  );
} finally {
  await send("Fetch.disable");
  ws.close();
}
