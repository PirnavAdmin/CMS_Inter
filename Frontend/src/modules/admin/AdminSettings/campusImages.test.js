import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const source = await readFile(new URL("./campusImages.js", import.meta.url), "utf8");
const flush = () => new Promise((resolve) => setImmediate(resolve));

function fixture({ response = { dashboardLogo: "/uploads/landing/saved.png" }, failure, cacheFailure = false } = {}) {
  const events = new EventTarget();
  const writes = [];
  const calls = [];
  const state = [];
  const effects = [];
  let cursor = 0;
  const context = vm.createContext({
    console: { warn() {}, error() {} }, Event,
    CustomEvent: class extends Event { constructor(type, options) { super(type); this.detail = options.detail; } },
    window: events, localStorage: { setItem() {} },
    useCampusContext: () => ({ selectedCampusId: 7 }),
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
    },
    useEffect: (effect) => effects.push(effect),
    getAuthUser: () => ({}), getAuthToken: () => "test-token",
    landingPageApi: {
      async saveConfig(payload) { calls.push(payload); if (failure) throw new Error(failure); return response; },
      async getConfig() { return response; },
    },
    indexedDB: {
      open() {
        const request = {};
        queueMicrotask(() => {
          if (cacheFailure) return request.onerror();
          request.result = {
            close() {},
            transaction() {
              const transaction = { objectStore: () => ({ put(value, key) { writes.push({ value, key }); queueMicrotask(() => transaction.oncomplete()); } }) };
              return transaction;
            },
          };
          request.onsuccess();
        });
        return request;
      },
    },
  });
  vm.runInContext(source.replace(/^import .*;\r?\n/gm, "").replace(/^export /gm, ""), context);
  return { context, events, writes, calls, state, effects, render: () => { cursor = 0; return context.useCampusImages(); } };
}

test("save caches, returns and broadcasts the persisted logo, preserving browser-only fields", async () => {
  const f = fixture();
  let event;
  f.events.addEventListener("campus-images-changed", (value) => { event = value; });
  const saved = await f.context.saveCampusImages(7, { dashboardLogo: "/uploads/landing/saved.png", loginThemePalette: "olive" }, { requirePersisted: true });
  assert.equal(saved.dashboardLogo, "/uploads/landing/saved.png");
  assert.equal(saved.loginThemePalette, "olive");
  assert.equal(f.writes[0].value, saved);
  assert.equal(event.detail.images, saved);
  assert.equal(event.detail.campusId, 7);
  assert.equal(f.calls[0].campusId, 7);
  assert.equal(Object.hasOwn(f.calls[0], "resetDashboardLogo"), false);
});

test("failed or unconfirmed saves do not cache or broadcast successful configuration", async () => {
  for (const options of [{ failure: "Save failed" }, { response: null }, { response: { success: true } }]) {
    const f = fixture(options);
    let notifications = 0;
    f.events.addEventListener("campus-images-changed", () => notifications++);
    await assert.rejects(f.context.saveCampusImages(7, {}, { requirePersisted: true }));
    assert.equal(f.writes.length, 0);
    assert.equal(notifications, 0);
  }
});

test("a backend response retaining a different logo is not reported as a successful upload save", async () => {
  const f = fixture();
  await assert.rejects(f.context.saveCampusImages(7, { dashboardLogo: "/new.png" }, { requirePersisted: true }), /did not confirm/);
  assert.equal(f.writes.length, 0);
});

test("header saves block unsupported reset and local previews, and retain failed drafts", async () => {
  const page = await readFile(new URL("./CampusImagesConfigurationPage.jsx", import.meta.url), "utf8");
  const handler = page.slice(page.indexOf("  const saveHeader ="), page.indexOf("  const renderImageCards ="));
  for (const mode of ["reset", "local", "failure", "text"]) {
    const calls = [];
    const errors = [];
    const draft = { dashboardTitle: "College", dashboardLogo: mode === "local" ? "data:image/png;base64,preview" : "/saved.png" };
    let closed = false;
    const context = vm.createContext({
      saveLock: { current: false }, uploading: 0, headerDraft: draft, selectedCampusId: 7,
      resetHeaderLogo: mode === "reset", getAuthToken: () => "test-token",
      setHeaderError: (message) => errors.push(message), pageScope: "7:landing", scope: { current: "7:landing" },
      getHeaderBrand: ({ dashboardTitle }) => ({ dashboardTitle }),
      readCampusImages: async () => ({ dashboardLogo: "/saved.png" }),
      saveCampusImages: async (campusId, configuration) => { calls.push(configuration); if (mode === "failure") throw new Error("Network failed"); return configuration; },
      setBusy() {}, setText() {}, setImages() {}, setResetHeaderLogo() {}, setMessage() {},
      setHeaderDraft(value) { closed = value === null; }, headerRequest: { current: 0 },
      queueMicrotask() {}, configureButton: { current: null },
    });
    vm.runInContext(handler.replace("const saveHeader =", "globalThis.saveHeader ="), context);
    await context.saveHeader();
    if (mode === "text") {
      assert.equal(calls[0].dashboardLogo, "/saved.png");
      assert.equal(Object.hasOwn(calls[0], "resetDashboardLogo"), false);
      assert.equal(closed, true);
    } else {
      assert.equal(closed, false);
      assert.equal(context.headerDraft, draft);
      assert.ok(errors.at(-1));
      assert.equal(calls.length, mode === "failure" ? 1 : 0);
    }
  }
});

test("a confirmed database save still synchronizes when IndexedDB is unavailable", async () => {
  const f = fixture({ cacheFailure: true });
  let event;
  f.events.addEventListener("campus-images-changed", (value) => { event = value; });
  const saved = await f.context.saveCampusImages(7, {}, { requirePersisted: true });
  assert.equal(event.detail.images, saved);
});

test("confirmed save updates the hook immediately and invalidates an older GET", async () => {
  const f = fixture();
  let resolveOld;
  f.context.landingPageApi.getConfig = () => new Promise((resolve) => { resolveOld = resolve; });
  f.render();
  const cleanup = f.effects[0]();
  await f.context.saveCampusImages(7, {}, { requirePersisted: true });
  assert.equal(f.render().dashboardLogo, "/uploads/landing/saved.png");
  resolveOld({ dashboardLogo: "/old.png" });
  await flush();
  assert.equal(f.render().dashboardLogo, "/uploads/landing/saved.png");
  assert.equal(f.writes.at(-1).value.dashboardLogo, "/uploads/landing/saved.png");
  f.events.dispatchEvent(new f.context.CustomEvent("campus-images-changed", { detail: { campusId: 8, images: { dashboardLogo: "/other-campus.png" } } }));
  assert.equal(f.render().dashboardLogo, "/uploads/landing/saved.png");
  cleanup();
});

test("save API unwraps the configuration and rejects an explicit failure response", async () => {
  const apiSource = await readFile(new URL("../../../api/landingPageApi.js", import.meta.url), "utf8");
  const context = vm.createContext({ apiClient: { put: async () => ({ data: { success: true, data: { dashboardLogo: null } } }) }, apiEndpoints: { landingPage: { saveConfig: "/config" } }, console: { error() {} } });
  vm.runInContext(apiSource.replace(/^import .*;\r?\n/gm, "").replace("export const landingPageApi =", "globalThis.landingPageApi =").replace("export default landingPageApi;", ""), context);
  assert.equal((await context.landingPageApi.saveConfig({})).dashboardLogo, null);
  context.apiClient.put = async () => ({ data: { success: false, message: "Rejected" } });
  await assert.rejects(context.landingPageApi.saveConfig({}), /Rejected/);
});

test("failed branding uploads return uncached errors while profile fallback stays unchanged", async () => {
  const viteSource = await readFile(new URL("../../../../vite.config.js", import.meta.url), "utf8");
  const factory = vm.runInNewContext(viteSource.slice(viteSource.indexOf("function examCellShieldPlugin("), viteSource.indexOf("export default")) + ";examCellShieldPlugin", {
    console, Buffer, fetch: async () => ({ status: 404 }),
  });
  let middleware;
  factory("https://example.invalid").configureServer({ middlewares: { use(handler) { middleware = handler; } } });
  for (const url of ["/uploads/landing/missing.png?branding=dashboard-v2", "/uploads/legacy-logo.png?branding=dashboard-v2", "/uploads/admin-photos/missing.png"]) {
    let status, headers, body;
    await middleware({ url, method: "GET", headers: {} }, { writeHead(value, values) { status = value; headers = values; }, end(value) { body = value; } }, () => assert.fail("Unexpected middleware fallthrough"));
    if (url.includes("branding=dashboard-v2")) {
      assert.equal(status, 404);
      assert.equal(headers["Cache-Control"], "no-store");
      assert.doesNotMatch(body, /<svg/);
    } else {
      assert.equal(status, 200);
      assert.match(body, /<svg/);
    }
  }
});
