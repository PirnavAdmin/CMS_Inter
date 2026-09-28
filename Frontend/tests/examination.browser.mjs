// Isolated CDP checks. Every /api request is fulfilled locally; no live writes.
import assert from "node:assert/strict";
import process from "node:process";
import console from "node:console";
import { Buffer } from "node:buffer";
import { setTimeout } from "node:timers";
import { URL } from "node:url";
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
const cancelledRequests = new Set();
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
  failCandidates = false,
  failHalls = false,
  failFaculty = false,
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
  const requestRecord = { path, method, query, payload, status: 0 };
  requests.push(requestRecord);
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
      examinationId: Math.max(...exams.map((e) => e.examinationId)) + 1,
      examCode: "EXAM-2030-0004",
      examName: payload.examName,
      startDate: payload.startDate,
      endDate: payload.endDate,
      examPattern: payload.examPattern,
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
  } else if (/\/examinations\/\d+\/eligible-subjects$/.test(path)) {
    status = 400;
    data = { message: "Parameter 'p_CampusId' not found in the collection." };
  } else if (/\/examinations\/\d+\/scheduling-context$/.test(path)) {
    data = { examinationId: Number(path.split("/").at(-2)), sectionIds: [31], sections: [{ sectionId: 31, sectionName: "MPC-1", eligibleStudentCount: 34 }], totalEligibleStudents: 34, requiredCapacity: 34 };
  } else if (/\/examinations\/\d+\/schedules$/.test(path)) {
    if (method === "POST") {
      data = {
        ...payload,
        examScheduleId: Math.max(...schedules.map((s) => s.examScheduleId)) + 1,
        subjectName: "Chemistry",
      };
      schedules.push(data);
    } else {
      status = 400;
      data = { message: "Parameter 'p_CampusId' not found in the collection." };
    }
  } else if (/\/examinations\/\d+$/.test(path)) {
    const eid = Number(path.split("/").at(-1));
    if (method === "PUT")
      exams = exams.map((e) => (e.examinationId === eid ? { ...e, ...payload } : e));
    if (method === "DELETE") exams = exams.filter((e) => e.examinationId !== eid);
    if (method === "GET") {
      status = 400;
      data = { message: "Parameter 'p_CampusId' not found in the collection." };
    } else data = exams.find((e) => e.examinationId === eid) || {};
  } else if (path.endsWith("/cancel")) {
    const eid = Number(path.split("/").at(-2));
    exams = exams.map((e) => (e.examinationId === eid ? { ...e, status: "CANCELLED" } : e));
    data = { status: "CANCELLED" };
  } else if (path.startsWith("/api/v1/students/group/")) {
    if (failCandidates) {
      status = 400;
      data = { message: "Parameter 'p_AcademicLevelId' not found in the collection." };
    } else data = Array.from({ length: count + 4 }, (_, i) => ({ studentId: i + 1 }));
  } else if (/\/students\/\d+$/.test(path)) {
    const sid = Number(path.split("/").at(-1));
    data = {
      studentId: sid,
      boardId: 91,
      academicYearId: sid === count + 1 ? 902 : 901,
      academicLevelId: sid === count + 2 ? 12 : 11,
      groupId: 21,
      programId: sid === count + 3 ? 32 : 31,
      isActive: sid !== count + 4,
    };
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
    if (
      failAvailability ||
      (failHalls && path.includes("available-halls")) ||
      (failFaculty && path.includes("available-invigilators")) ||
      path.includes("available-invigilators")
    ) {
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
  requestRecord.status = status;
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
      // React correctly aborts obsolete lookups. CDP cannot fulfil an intercepted
      // request after Chrome has reported its cancellation.
      if (
        error.message === "Invalid InterceptionId." &&
        cancelledRequests.has(event.params.networkId)
      )
        return;
      requestFailure = true;
      exceptions.push(error.message);
    });
  if (event.method === "Network.loadingFailed" && event.params.canceled)
    cancelledRequests.add(event.params.requestId);
  if (event.method === "Runtime.exceptionThrown")
    exceptions.push(
      event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text,
    );
});
await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
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
let scenarios = 0;
const passed = [];
const verify = (name, result) => {
  assert.ok(result, name);
  passed.push(name);
  scenarios++;
};
const text = () => evaluate("document.querySelector('.examination-center').innerText");
const closed = () => waitFor("!document.querySelector('.ec-dialog')");
const doubleSubmit = () =>
  evaluate(
    "(()=>{const f=document.querySelector('.ec-dialog form,.ec-wizard form');f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));})()",
  );
try {
  await navigate();
  await waitFor("document.body.innerText.includes('Regular Fixture')");
  verify("list loads", (await text()).includes("Completed Fixture"));
  await field("Search exams", "Objective Fixture");
  verify("search filters rows", !(await evaluate("document.querySelector('.ec-list-table').innerText.includes('Regular Fixture')")));
  await field("Search exams", "");
  await field("Status", "COMPLETED");
  verify("status filter", !(await evaluate("document.querySelector('.ec-list-table').innerText.includes('Regular Fixture')")));
  await field("Status", "");
  await ariaClick("Review Regular Fixture");
  await waitFor("document.body.innerText.includes('Schedule, hall and invigilator allocation')");
  verify("review uses list record", (await text()).includes("Regular Fixture") && (await text()).includes("EXAM-2030-0001"));
  verify("saved schedule limitation localized", (await text()).includes("Existing schedule details are temporarily unavailable from the server."));
  await click("Open Scheduling");
  await waitFor("document.body.innerText.includes('active students across')");
  verify("scheduling context loads", requests.some((r) => r.method === "GET" && r.path === "/api/v1/examinations/101/scheduling-context"));
  verify("unknown saved subjects not invented", (await text()).includes("Exact saved subject selection is unavailable"));
  await field("Examination", "102");
  await waitFor("document.body.innerText.includes('Objective Fixture')");
  verify("selector changes scope", requests.some((r) => r.method === "GET" && r.path === "/api/v1/examinations/102/scheduling-context"));
  await click("Exams");
  await click("Create examination");
  verify("wizard opens", await evaluate("!!document.querySelector('.ec-wizard')"));
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
  await waitFor("document.querySelectorAll('.ec-scope-panel select').length===2");
  await evaluate("document.querySelectorAll('.ec-scope-panel select').forEach((e,i)=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,i?'NEET Pattern':'Objective Combined Pattern');e.dispatchEvent(new Event('change',{bubbles:true}));})");
  await check("Physics");
  verify("Objective checkbox toggles", await evaluate("[...document.querySelectorAll('label')].find(e=>e.textContent.trim()==='Physics').querySelector('input').checked"));
  await evaluate("[...document.querySelectorAll('label')].find(e=>e.textContent.trim()==='Physics').click()");
  verify("Objective subject card toggles", !(await evaluate("[...document.querySelectorAll('label')].find(e=>e.textContent.trim()==='Physics').querySelector('input').checked")));
  await evaluate("[...document.querySelectorAll('button')].filter(b=>b.textContent==='Include all non-language subjects').forEach(b=>b.click())");
  verify("include all excludes languages", !(await text()).includes("English"));
  await click("Previous");
  await click("Continue");
  verify("Objective Back and Next preserves choices", await evaluate("[...document.querySelectorAll('.ec-choices input')].every(e=>e.checked)"));
  await click("Back to Exams");
  verify("wizard cancels", !(await evaluate("!!document.querySelector('.ec-wizard')")));
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
  await field("Exam pattern", "Regular Academic Pattern");
  await check("Physics");
  await click("Continue");
  await check("I have reviewed the examination details.");
  await doubleSubmit();
  await waitFor("!document.querySelector('.ec-wizard') && document.querySelector('.ec-workspace')?.innerText.includes('Created Fixture')");
  await waitFor("document.querySelector('.ec-workspace')?.innerText.includes('Physics')");
  verify("create sends one POST", requests.filter((r) => r.method === "POST" && r.path === "/api/v1/examinations").length === 1);
  verify("created exam verified by list", requests.filter((r) => r.method === "GET" && r.path === "/api/v1/examinations").length >= 2);
  verify("created subjects use exact visit plan", (await text()).includes("Physics") && !(await text()).includes("English"));
  verify("created schedule state is visit-only", (await text()).includes("0 sessions saved in this visit"));
  await click("Schedule");
  await waitFor("document.querySelector('.ec-dialog')");
  verify("invigilator backend limitation localized", await evaluate("document.querySelector('.ec-dialog').innerText.includes('Invigilator availability is currently unavailable.')"));
  verify("no automatic invigilator 500", !requests.some((r) => r.path.includes("available-invigilators")));
  await waitFor("document.querySelector('.ec-dialog').innerText.includes('Confirmed active candidates: 30')");
  verify("candidates still load", true);
  await click("Cancel");
  await closed();
  verify("editor Cancel closes", true);
  await click("Schedule");
  await ariaClick("Close");
  await closed();
  verify("editor X closes", true);
  await click("Schedule");
  await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");
  await closed();
  verify("editor Escape closes", true);
  await click("Schedule");
  await evaluate("document.querySelector('.cms-overlay').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))");
  await closed();
  verify("editor overlay closes", true);
  const broken = requests.filter((r) => r.method === "GET" && (/\/examinations\/\d+$/.test(r.path) || /\/examinations\/\d+\/(schedules|eligible-subjects)$/.test(r.path)));
  verify("no broken detail schedule or eligible GET", broken.length === 0);
  verify("normal flow has zero 400", requests.filter((r) => r.status === 400).length === 0);
  verify("normal flow has zero 500", requests.filter((r) => r.status === 500).length === 0);
  const contextCount = requests.filter((r) => r.path === "/api/v1/examinations/101/scheduling-context").length;
  verify("no duplicate context request", contextCount === 1);
  failCandidates = true;
  await click("Schedule");
  await waitFor("document.querySelector('.ec-dialog').innerText.includes('Unable to load candidates')");
  await field("Start time", "10:00");
  await field("End time", "12:00");
  await waitFor(`${byLabel("Hall")}?.options.length>1`);
  verify("candidate error leaves halls available", await evaluate(`${byLabel("Hall")}.options.length>1`));
  failCandidates = false;
  await click("Retry candidates");
  await waitFor("document.querySelector('.ec-dialog').innerText.includes('Confirmed active candidates: 30')");
  verify("candidate retry recovers", true);
  failHalls = true;
  await click("Refresh availability");
  await waitFor("document.querySelector('.ec-dialog').innerText.includes('Unable to load halls')");
  verify("hall error leaves candidates visible", await evaluate("document.querySelector('.ec-dialog').innerText.includes('Confirmed active candidates: 30')"));
  failHalls = false;
  await click("Retry halls");
  await waitFor(`${byLabel("Hall")}?.options.length>1`);
  verify("hall retry recovers", true);
  await click("Cancel");
  await closed();
  const steady = requests.length;
  await sleep(800);
  verify("no idle request loop", requests.length === steady);
  assert.deepEqual(exceptions, [], "Browser exceptions");
  verify("no browser exceptions", !requestFailure && exceptions.length === 0);
  console.log(JSON.stringify({ scenarios, passed, requests: requests.length, status400: requests.filter((r) => r.status === 400).length, status500: requests.filter((r) => r.status === 500).length, exceptions }, null, 2));} finally {
  await send("Fetch.disable");
  ws.close();
}
