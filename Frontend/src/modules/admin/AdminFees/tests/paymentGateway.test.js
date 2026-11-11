import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createServer, transformWithOxc } from "vite";
import {
  collectionPayload,
  gatewayData,
  pendingInstallments,
  startPaymentPolling,
  settlementState,
  backendOverdue,
  canReversePayment,
  gatewayTransactionIdFor,
  hasPaymentReversalRole,
  isReversedPayment,
  mobilePaymentLinkFor,
  reversalPayload,
  PAYMENT_CONFIG_DEFAULTS,
  PAYMENT_CONFIG_SECTIONS,
  normalizePaymentConfig,
  paymentConfigErrors,
  paymentConfigPayload,
} from "../services/paymentGatewaySession.js";

await describe("Admin payment gateway", async () => {
  const account = {
    id: "41",
    studentId: 11,
    assignmentId: 41,
    balance: 700,
    studentName: "Fixture Student",
    admissionNo: "TEST-11",
    group: "Test Group",
    section: "A",
    installments: [
      { feeInstallmentId: 101, no: 1, amount: 400, paid: 100, balance: 300, status: "Partial" },
      { feeInstallmentId: 102, no: 2, amount: 400, paid: 0, balance: 400, status: "Pending" },
      { feeInstallmentId: 103, no: 3, amount: 200, paid: 200, balance: 0, status: "Paid" },
    ],
  };
  const order = { orderId: "order_fixture", studentFeeId: 41, amount: 300 };
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  const paid = { ...order, isPaid: true, status: "Captured", receiptNumber: "TEST-REC" };
  const paymentSettings = {
    ...PAYMENT_CONFIG_DEFAULTS, campusId: 2, bankName: "Fixture Bank", accountHolderName: "Fixture College",
    accountNumber: "0012345678", confirmAccountNumber: "0012345678", ifscCode: "ABCD0123456",
    enableCounterUpiQr: true, payeeVpa: "fixture@bank", payeeName: "Fixture College",
    enableRazorpay: true, razorpayKeyId: "rzp_test_fixture", hasRazorpayKeySecret: true,
    hasRazorpayWebhookSecret: true,
  };

  test("configuration rejects default/cross-campus responses and never loads saved secrets", () => {
    const normalized = normalizePaymentConfig({ data: { ...paymentSettings, razorpayKeySecret: "DO-NOT-LOAD", razorpayWebhookSecret: "DO-NOT-LOAD" } }, 2);
    assert.equal(normalized.accountNumber, "0012345678");
    assert.equal(normalized.razorpayKeySecret, "");
    assert.equal(normalized.razorpayWebhookSecret, "");
    assert.equal(normalized.confirmAccountNumber, "");
    assert.throws(() => normalizePaymentConfig({ ...paymentSettings, campusId: null }, 2), /this campus/);
    assert.throws(() => normalizePaymentConfig(paymentSettings, 3), /this campus/);
    assert.throws(() => normalizePaymentConfig({ ...paymentSettings, accountNumber: 12345678 }, 2), /strings/);
    assert.throws(() => normalizePaymentConfig({ ...paymentSettings, pollingIntervalMs: 0 }, 2), /polling/);
    assert.throws(() => normalizePaymentConfig({ ...paymentSettings, enableCounterUpiQr: "true" }, 2), /incomplete/);
  });
  test("configuration validates bank, UPI, secrets and network ranges and whitelists update fields", () => {
    const form = { ...paymentSettings, razorpayKeySecret: "new-fixture-secret", razorpayWebhookSecret: "new-fixture-hook" };
    assert.deepEqual(paymentConfigErrors(form), {});
    const payload = paymentConfigPayload({ ...form, webhookUrl: "READ-ONLY", updatedAt: "READ-ONLY", id: 7 }, 2);
    assert.equal(payload.accountNumber, "0012345678");
    for (const field of ["confirmAccountNumber", "webhookUrl", "updatedAt", "id", "hasRazorpayKeySecret", "hasRazorpayWebhookSecret"]) assert.equal(Object.hasOwn(payload, field), false);
    assert.ok(paymentConfigErrors({ ...form, confirmAccountNumber: "wrong" }).confirmAccountNumber);
    assert.ok(paymentConfigErrors({ ...form, ifscCode: "bad" }).ifscCode);
    assert.ok(paymentConfigErrors({ ...form, payeeVpa: "bad" }).payeeVpa);
    assert.ok(paymentConfigErrors({ ...form, pollingIntervalMs: 499 }).pollingIntervalMs);
    assert.ok(paymentConfigErrors({ ...form, baseAppUrl: "javascript:bad" }).baseAppUrl);
    assert.ok(paymentConfigErrors({ ...form, isLiveMode: true }).razorpayKeyId);
    assert.ok(paymentConfigErrors(paymentSettings).razorpayKeySecret);
    assert.throws(() => paymentConfigPayload(paymentSettings, 2), /Correct/);
    const blank = paymentConfigPayload({ ...form, enableRazorpay: false, hasRazorpayKeySecret: false, hasRazorpayWebhookSecret: false, razorpayKeySecret: "", razorpayWebhookSecret: "" }, 2);
    assert.equal(Object.hasOwn(blank, "razorpayKeySecret"), false);
  });

  test("normalizes direct/wrapped/cased responses and rejects unsuccessful envelopes", () => {
    assert.equal(gatewayData({ Data: { IsPaid: false, Amount: 0 } }).isPaid, false);
    assert.equal(gatewayData({ success: true, data: { receiptNumber: "R" } }).success, true);
    assert.deepEqual(gatewayData({ data: { items: [] } }), { items: [] });
    assert.throws(() => gatewayData({ success: false, message: "Denied" }), /Denied/);
    assert.throws(() => gatewayData({ data: { Success: false, Message: "Invalid" } }), /Invalid/);
    assert.throws(() => gatewayData(null), /Invalid/);
  });
  test("full, individual, multiple and partial payments retain actual unpaid installment IDs", () => {
    assert.deepEqual(collectionPayload(account, "schedules", ["101", "102"], "650"), {
      studentId: 11,
      studentFeeId: 41,
      feeInstallmentIds: [101, 102],
      amount: 650,
    });
    assert.equal(collectionPayload(account, "schedules", ["101"], 125).amount, 125);
    assert.deepEqual(collectionPayload(account, "full", ["103"], 700).feeInstallmentIds, []);
    assert.equal(pendingInstallments(account).length, 2);
  });
  test("rejects overpayments, settled/missing/invalid IDs, empty selections and invalid amounts", () => {
    for (const [target, ids, amount] of [
      ["full", [], 701],
      ["schedules", [101], 301],
      ["schedules", [103], 10],
      ["schedules", [999], 10],
      ["schedules", ["bad"], 10],
      ["schedules", [], 10],
      ["full", [], 0],
      ["full", [], NaN],
      ["full", [], 1.001],
    ])
      assert.throws(() => collectionPayload(account, target, ids, amount));
    assert.throws(() => collectionPayload({ ...account, studentId: 0 }, "full", [], 1));
  });
  test("only backend settlement of the exact order and amount succeeds", () => {
    assert.equal(settlementState(paid, order), "SUCCESS");
    assert.equal(settlementState({ ...order, status: "Created", isPaid: false }, order), "PENDING");
    assert.equal(settlementState({ ...paid, isPaid: false }, order), "PENDING");
    assert.equal(settlementState({ ...paid, status: "Failed" }, order), "FAILED");
    assert.throws(() => settlementState({ ...paid, orderId: "other" }, order), /different order/);
    assert.throws(() => settlementState({ ...paid, amount: 301 }, order), /amount/);
    assert.throws(() => settlementState({ ...paid, studentFeeId: 42 }, order), /different fee/);
  });

  function fakeClock() {
    let time = 0,
      id = 0;
    const jobs = new Map();
    return {
      now: () => time,
      schedule: (fn, delay) => {
        jobs.set(++id, { fn, at: time + delay });
        return id;
      },
      unschedule: (key) => jobs.delete(key),
      advance: async (ms) => {
        const end = time + ms;
        for (;;) {
          const next = [...jobs]
            .filter(([, job]) => job.at <= end)
            .sort((a, b) => a[1].at - b[1].at)[0];
          if (!next) break;
          time = next[1].at;
          jobs.delete(next[0]);
          next[1].fn();
          await flush();
        }
        time = end;
      },
      jobs,
    };
  }
  test("polling waits 1200ms after a probe, never overlaps and settles once", async () => {
    const clock = fakeClock();
    let calls = 0,
      resolve,
      successes = 0;
    const stop = startPaymentPolling({
      order,
      ...clock,
      probe: () => {
        calls++;
        return new Promise((done) => {
          resolve = done;
        });
      },
      onUpdate() {},
      onSuccess: () => {
        successes++;
      },
    });
    await clock.advance(5000);
    assert.equal(calls, 1);
    resolve({ ...order, status: "Created" });
    await flush();
    await clock.advance(1199);
    assert.equal(calls, 1);
    await clock.advance(1);
    assert.equal(calls, 2);
    resolve(paid);
    await flush();
    await clock.advance(5000);
    assert.equal(successes, 1);
    assert.equal(calls, 2);
    assert.equal(clock.jobs.size, 0);
    stop();
  });
  test("cleanup aborts in-flight polling and discards stale success", async () => {
    const clock = fakeClock();
    let resolve,
      signal,
      updates = 0;
    const stop = startPaymentPolling({
      order,
      ...clock,
      probe: (value) => {
        signal = value;
        return new Promise((done) => {
          resolve = done;
        });
      },
      onUpdate: () => {
        updates++;
      },
      onSuccess: () => {
        throw new Error("stale success");
      },
    });
    stop();
    assert.equal(signal.aborted, true);
    resolve(paid);
    await flush();
    await clock.advance(2000);
    assert.equal(updates, 0);
    assert.equal(clock.jobs.size, 0);
  });
  test("expiry aborts even a hung request and cannot become successful afterward", async () => {
    const clock = fakeClock();
    let resolve, signal, status;
    startPaymentPolling({
      order: { ...order, expiresAt: 1000 },
      ...clock,
      probe: (value) => {
        signal = value;
        return new Promise((done) => {
          resolve = done;
        });
      },
      onUpdate: (value) => {
        status = value.status;
      },
      onSuccess: () => assert.fail("Expired session settled"),
    });
    await clock.advance(1000);
    assert.equal(status, "TIMEOUT");
    assert.equal(signal.aborted, true);
    resolve(paid);
    await flush();
    assert.equal(status, "TIMEOUT");
  });
  test("transient errors retry, authorization/contract failures stop", async () => {
    const clock = fakeClock();
    let calls = 0,
      last;
    startPaymentPolling({
      order,
      ...clock,
      probe: async () => {
        calls++;
        if (calls === 1) throw { code: "ERR_NETWORK", message: "offline" };
        return { ...order, status: "Failed" };
      },
      onUpdate: (value) => {
        last = value;
      },
      onSuccess: () => assert.fail(),
    });
    await flush();
    assert.equal(last.status, "PENDING");
    await clock.advance(1200);
    assert.equal(last.status, "FAILED");
    startPaymentPolling({
      order,
      ...clock,
      probe: async () => {
        throw { response: { status: 403 }, message: "Forbidden" };
      },
      onUpdate: (value) => {
        last = value;
      },
      onSuccess: () => assert.fail(),
    });
    await flush();
    assert.equal(last.status, "ERROR");
    assert.equal(clock.jobs.size, 0);
  });

  const root = fileURLToPath(new URL("../../../../../", import.meta.url));
  const server = await createServer({
    configFile: false,
    root,
    resolve: { alias: { "@": path.join(root, "src") } },
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  after(() => server.close());
  const { default: client, getApiErrorMessage } = await server.ssrLoadModule("/src/api/axios.js");
  const { feePaymentGatewayApi: api, getPaymentGatewayConfigApi, updatePaymentGatewayConfigApi } = await server.ssrLoadModule(
    "/src/api/feePaymentGatewayApi.js",
  );
  const originalAdapter = client.defaults.adapter;
  after(() => {
    client.defaults.adapter = originalAdapter;
    delete globalThis.window;
  });
  const storage = {
    getItem: (key) => (key === "token" ? "parent-fixture-session" : null),
    removeItem() {},
  };
  globalThis.window = {
    localStorage: storage,
    sessionStorage: storage,
    location: { pathname: "/dashboard/fee-structure" },
    setTimeout,
  };
  const adapter = (work) => {
    client.defaults.adapter = async (config) => ({
      data: await work(config),
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    });
  };
  test("gateway calls authenticate with the shared client, bypass loader, and avoid mock responses", async () => {
    let call;
    adapter((config) => {
      call = config;
      return { success: true, ...order };
    });
    const controller = new AbortController();
    await api.createOrder(
      { ...collectionPayload(account, "schedules", [101], 300), paymentMethod: "UPI_QR" },
      controller.signal,
    );
    assert.equal(call.url, "/api/v1/fee-payments/gateway/create-order");
    assert.equal(call.headers.Authorization, "Bearer parent-fixture-session");
    assert.equal(call.skipGlobalLoader, true);
    assert.equal(call.__globalLoadingTracked, undefined);
    assert.equal(call.requireRealBackend, true);
    assert.equal(call.skipNetworkRetry, true);
    assert.deepEqual(JSON.parse(call.data).feeInstallmentIds, [101]);
    assert.equal(call.signal, controller.signal);
    await api.status(41, "order a/b", controller.signal);
    assert.equal(call.url, "/api/v1/fee-payments/gateway/status/41");
    assert.deepEqual(call.params, { orderId: "order a/b" });
  });
  test("payment mutation network failures are not automatically replayed or mocked", async () => {
    let count = 0;
    client.defaults.adapter = async (config) => {
      count++;
      throw { config, code: "ERR_NETWORK", message: "Network Error" };
    };
    await assert.rejects(api.submitUtr({ studentId: 11, studentFeeId: 41, amount: 100 }));
    assert.equal(count, 1);
  });
  test("configuration API scopes real authenticated requests, strips response fields and retains HTTP failures", async () => {
    let call;
    adapter((config) => { call = config; return { Data: paymentSettings }; });
    const signal = new AbortController().signal;
    await getPaymentGatewayConfigApi(2, signal);
    assert.equal(call.url, "/api/v1/fee-payments/gateway/config");
    assert.deepEqual(call.params, { campusId: 2 });
    assert.equal(call.signal, signal);
    assert.equal(call.requireRealBackend, true);
    assert.equal(call.skipNetworkRetry, true);
    assert.equal(call.skipErrorLog, true);
    assert.equal(call.headers.Authorization, "Bearer parent-fixture-session");
    adapter((config) => { call = config; return { success: true }; });
    await updatePaymentGatewayConfigApi({ ...paymentSettings, razorpayKeySecret: "fixture-only", razorpayWebhookSecret: "fixture-only" }, signal);
    assert.equal(JSON.parse(call.data).campusId, 2);
    assert.equal(Object.hasOwn(JSON.parse(call.data), "webhookUrl"), false);
    await updatePaymentGatewayConfigApi({ ...paymentSettings, bankName: "", accountNumber: "" }, signal, "advanced");
    assert.equal(call.url, "/api/v1/fee-payments/gateway/config");
    assert.equal(JSON.parse(call.data).bankName, "");
    assert.equal(Object.hasOwn(JSON.parse(call.data), "razorpayKeySecret"), false);
    assert.equal(Object.hasOwn(JSON.parse(call.data), "razorpayWebhookSecret"), false);
    for (const status of [400, 401, 403, 404, 409, 500]) {
      client.defaults.adapter = async (config) => { throw { config, response: { status, data: { message: "Fixture rejection" } } }; };
      await assert.rejects(getPaymentGatewayConfigApi(2), (error) => error.response.status === status);
    }
  });
  test("wrapped UTR submission/approval requires explicit backend acknowledgment", async () => {
    adapter(() => ({ success: true, data: { message: "Submitted" } }));
    assert.equal((await api.submitUtr({})).success, true);
    adapter(() => ({}));
    await assert.rejects(api.approveUtr({}), /not acknowledged/);
    adapter(() => ({ success: false, message: "UTR duplicate" }));
    await assert.rejects(api.submitUtr({}), /UTR duplicate/);
  });
  test("pending queue accepts actual arrays and wrappers and rejects malformed collections", async () => {
    let call;
    adapter((config) => {
      call = config;
      return { Data: { Items: [{ Id: 9, Amount: 100, Status: "PendingVerification" }] } };
    });
    const rows = await api.pendingUtrs({ campusId: 2, academicYearId: 3 });
    assert.equal(rows[0].id, 9);
    assert.deepEqual(call.params, { campusId: 2, academicYearId: 3 });
    adapter(() => ({}));
    await assert.rejects(api.pendingUtrs({}), /transaction list/);
  });
  test("CSV export preserves/adds UTF-8 BOM, backend filename, scope and revokes URL", async () => {
    const originalUrl = URL.createObjectURL,
      originalRevoke = URL.revokeObjectURL;
    const originalTimeout = window.setTimeout;
    let downloaded, filename, revoked;
    globalThis.document = {
      createElement: () => ({
        set download(value) {
          filename = value;
        },
        click() {},
        remove() {},
      }),
      body: { appendChild() {} },
    };
    URL.createObjectURL = (blob) => {
      downloaded = blob;
      return "blob:fixture";
    };
    URL.revokeObjectURL = (url) => {
      revoked = url;
    };
    window.setTimeout = (fn) => fn();
    try {
      for (const input of ["\ufeffStudent,Amount\nFixture,300", "Student,Amount\nFixture,300"]) {
        client.defaults.adapter = async (config) => {
          assert.equal(config.responseType, "blob");
          assert.deepEqual(config.params, { campusId: 2, academicYearId: 3 });
          return {
            data: new Blob([input], { type: "text/csv" }),
            headers: {
              "content-type": "text/csv",
              "content-disposition": "attachment; filename*=UTF-8''Actual%20Ledger.csv",
            },
            config,
            status: 200,
          };
        };
        await api.exportLedger({ campusId: 2, academicYearId: 3 });
        const bytes = new Uint8Array(await downloaded.arrayBuffer());
        assert.deepEqual([...bytes.slice(0, 3)], [239, 187, 191]);
        assert.notEqual(bytes[3], 239);
        assert.equal(filename, "Actual Ledger.csv");
        assert.equal(revoked, "blob:fixture");
      }
      adapter(() => new Blob(["<html>error</html>"], { type: "text/html" }));
      await assert.rejects(api.exportLedger({}), /CSV file/);
    } finally {
      URL.createObjectURL = originalUrl;
      URL.revokeObjectURL = originalRevoke;
      window.setTimeout = originalTimeout;
      delete globalThis.document;
    }
  });

  // Execute component event handlers with mocked APIs; no real financial requests.
  const React = {
    Fragment: "Fragment",
    createElement: (type, props, ...children) => ({
      type,
      props: { ...props, children: children.flat(Infinity) },
    }),
  };
  const nodes = (node) =>
    node && typeof node === "object"
      ? [node, ...(node.props?.children || []).flat(Infinity).flatMap(nodes)]
      : [];
  async function mount(source, name, bindings, props) {
    const { code } = await transformWithOxc(
      source.replace(/^import[\s\S]*?;\r?$/gm, "").replace(/^export (default )?/gm, ""),
      `${name}.jsx`,
      { jsx: { runtime: "classic" } },
    );
    let cursor = 0,
      hooks = [],
      pending = [],
      tree;
    const context = vm.createContext({
      React,
      AbortController,
      clearTimeout,
      setTimeout,
      window: { setTimeout, clearTimeout },
      collectionPayload,
      backendOverdue,
      canReversePayment,
      gatewayTransactionIdFor,
      hasPaymentReversalRole,
      isReversedPayment,
      mobilePaymentLinkFor,
      reversalPayload,
      PAYMENT_CONFIG_DEFAULTS,
  PAYMENT_CONFIG_SECTIONS,
      paymentConfigErrors,
      paymentConfigPayload,
      getPaymentGatewayConfigApi: async () => paymentSettings,
      pendingInstallments,
      gatewayData,
      getApiErrorMessage,
      formatCurrency: (value) => `INR ${value}`,
      formatDate: (value) => String(value || "-"),
      todayISO: () => "2026-11-09",
      COLLEGE_NAME: "Fixture College",
      Modal: "Modal",
      SkeletonRow: "SkeletonRow",
      Check: "Check",
      X: "X",
      RefreshCw: "RefreshCw",
      CheckCircle: "CheckCircle",
      Copy: "Copy",
      CreditCard: "CreditCard",
      QrCode: "QrCode",
      ChevronDown: "ChevronDown",
      PAYMENT_METHODS: ["Cash", "UPI", "Card", "Net Banking", "Cheque"],
      useState: (initial) => {
        const index = cursor++;
        if (!hooks[index])
          hooks[index] = { value: typeof initial === "function" ? initial() : initial };
        return [
          hooks[index].value,
          (value) => {
            hooks[index].value = typeof value === "function" ? value(hooks[index].value) : value;
          },
        ];
      },
      useRef: (initial) => {
        const index = cursor++;
        return (hooks[index] ||= { current: initial });
      },
      useCallback: (fn) => fn,
      useEffect: (fn, deps) => {
        const index = cursor++,
          previous = hooks[index];
        if (!previous || !deps || deps.some((value, key) => value !== previous.deps?.[key]))
          pending.push(() => {
            previous?.cleanup?.();
            hooks[index] = { deps, cleanup: fn() };
          });
      },
      ...bindings,
    });
    vm.runInContext(`${code};globalThis.Component=${name}`, context);
    return {
      render: () => {
        cursor = 0;
        pending = [];
        tree = context.Component(props);
        for (const effect of pending) effect();
        return nodes(tree);
      },
      unmount: () => {
        for (const hook of hooks) hook?.cleanup?.();
      },
    };
  }
  const gatewaySource = await readFile(
    new URL("../components/GatewayPaymentPanel.jsx", import.meta.url),
    "utf8",
  );
  const configSource = await readFile(new URL("../../AdminSettings/PaymentGatewayConfigPage.jsx", import.meta.url), "utf8");
  const configBindings = {
    Building2: "Building2", Clock: "Clock", Eye: "Eye", EyeOff: "EyeOff", RefreshCw: "RefreshCw", Save: "Save", ConfirmDialog: "ConfirmDialog",
  };
  const configFixture = () => normalizePaymentConfig({ ...paymentSettings, enableRazorpay: false, hasRazorpayKeySecret: false, hasRazorpayWebhookSecret: false }, 2);
  test("saved bank card masks details and selection never activates, adds or overwrites an account", async () => {
    let writes = 0;
    const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: async () => configFixture(),
      updatePaymentGatewayConfigApi: async () => { writes++; },
    }, { campusId: 2, campusName: "Fixture", editable: true });
    view.render(); await flush();
    const count = () => view.render().find((node) => Object.hasOwn(node.props, "data-bank-account-count")).props.children[0];
    assert.equal(count(), 1);
    let tree = view.render();
    const add = tree.find((node) => node.type === "button" && node.props.children.includes("+ Add Bank Account"));
    assert.equal(add.props.disabled, true); assert.equal(add.props.onClick, undefined);
    tree.find((node) => node.props.id === "payment-config-bankName").props.onChange({ target: { value: "Unsaved Bank" } });
    tree = view.render(); tree.find((node) => node.props.name === "payment-bank-view").props.onChange();
    tree = view.render();
    assert.equal(tree.find((node) => node.props.name === "payment-bank-view").props.checked, true);
    assert.ok(tree.some((node) => node.props.className?.includes("cms-payment-bank-card is-selected")));
    const details = tree.find((node) => node.props.id === "payment-bank-details");
    const detailText = nodes(details).flatMap((node) => node.props.children.filter((value) => typeof value === "string")).join(" ");
    assert.ok(detailText.includes("XXXXXXXX5678")); assert.equal(detailText.includes(paymentSettings.accountNumber), false);
    assert.ok(detailText.includes(paymentSettings.bankName)); assert.equal(detailText.includes("Unsaved Bank"), false);
    assert.ok(detailText.includes("Not reported by the backend"));
    assert.equal(tree.find((node) => node.type === "button" && node.props.children.includes("Set as Active Receiving Account")).props.disabled, true);
    assert.equal(tree.find((node) => node.props.id === "payment-config-bankName").props.value, "Unsaved Bank");
    assert.equal(tree.find((node) => node.props.id === "payment-config-accountNumber").props.type, "password");
    assert.equal(tree.find((node) => node.props.id === "payment-config-confirmAccountNumber").props.value, "");
    assert.equal(count(), 1); assert.equal(writes, 0);
    view.unmount();
  });
  test("configured count excludes drafts and updates only after confirmed configuration save", async () => {
    let persisted = { ...PAYMENT_CONFIG_DEFAULTS, campusId: 2 }, finish;
    const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: async () => persisted,
      updatePaymentGatewayConfigApi: (form) => new Promise((resolve) => { finish = () => { persisted = form; resolve({ success: true }); }; }),
    }, { campusId: 2, campusName: "Fixture", editable: true });
    const count = () => view.render().find((node) => Object.hasOwn(node.props, "data-bank-account-count")).props.children[0];
    view.render(); await flush(); assert.equal(count(), 0);
    for (const [key, value] of Object.entries({ bankName: "Fixture Bank", accountHolderName: "Fixture College", accountNumber: "0012345678", confirmAccountNumber: "0012345678", ifscCode: "ABCD0123456" })) {
      view.render().find((node) => node.props.id === `payment-config-${key}`).props.onChange({ target: { value } }); view.render();
    }
    assert.equal(count(), 0);
    view.render().find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    view.render().find((node) => node.type === "ConfirmDialog").props.onConfirm();
    assert.equal(count(), 0); finish(); await flush(); assert.equal(count(), 1);
    view.unmount();
  });
  test("bank overview hides stale data after refresh failure and isolates campus details", async () => {
    let fail = false;
    const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: async () => { if (fail) throw { response: { status: 404 } }; return configFixture(); },
    }, { campusId: 2, campusName: "Campus Two", editable: true });
    view.render(); await flush(); view.render().find((node) => node.props.name === "payment-bank-view").props.onChange();
    assert.ok(view.render().some((node) => node.props.id === "payment-bank-details"));
    fail = true; view.render().find((node) => node.type === "button" && node.props.children.includes(" Refresh")).props.onClick();
    view.render(); await flush();
    assert.equal(view.render().find((node) => Object.hasOwn(node.props, "data-bank-account-count")).props.children[0], "Unavailable");
    assert.equal(view.render().some((node) => node.props.name === "payment-bank-view"), false);
    view.unmount();
    const other = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: async () => ({ ...configFixture(), campusId: 3, bankName: "Other Campus Bank", accountNumber: "XXXX4321" }),
    }, { campusId: 3, campusName: "Campus Three", editable: true });
    other.render(); await flush(); other.render().find((node) => node.props.name === "payment-bank-view").props.onChange();
    const tree = other.render();
    const cardText = nodes(tree.find((node) => node.type === "label" && node.props.className?.includes("cms-payment-bank-card"))).flatMap((node) => node.props.children.filter((value) => typeof value === "string")).join(" ");
    assert.ok(cardText.includes("Other Campus Bank")); assert.ok(cardText.includes("XXXXXXXX4321"));
    assert.equal(cardText.includes(paymentSettings.bankName), false);
    assert.equal(tree.find((node) => node.props.id === "payment-config-confirmAccountNumber").props.value, "");
    other.unmount();
  });
  test("a masked account number cannot be replayed to the replacement-style config endpoint", async () => {
    let writes = 0;
    const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: async () => ({ ...configFixture(), accountNumber: "XXXXXXXX5678" }),
      updatePaymentGatewayConfigApi: async () => { writes++; return { success: true }; },
    }, { campusId: 2, campusName: "Fixture", editable: true });
    view.render(); await flush(); view.render().find((node) => node.props.id === "payment-tab-advanced").props.onClick();
    view.render().find((node) => node.type === "form").props.onSubmit({ preventDefault() {} }); await flush();
    assert.equal(writes, 0);
    assert.ok(view.render().some((node) => node.props.role === "alert" && node.props.children.join("").includes("masked or incomplete")));
    view.render().find((node) => node.props.id === "payment-tab-bank").props.onClick();
    assert.equal(view.render().find((node) => node.props.id === "payment-config-accountNumber").props.value, "XXXXXXXX5678");
    assert.equal(view.render().find((node) => node.props.id === "payment-config-confirmAccountNumber").props.value, "");
    view.unmount();
  });
  test("configuration UI requires account confirmation, guards duplicate save, and reloads persisted settings", async () => {
    let reads = 0, writes = 0, persisted = configFixture(), finish;
    const view = await mount(configSource, "CampusPaymentConfig", {
      ...configBindings,
      getPaymentGatewayConfigApi: async () => { reads++; return persisted; },
      updatePaymentGatewayConfigApi: (form) => { assert.equal(form.campusId, 2); writes++; persisted = { ...form }; return new Promise((resolve) => { finish = resolve; }); },
    }, { campusId: 2, campusName: "Fixture Campus", editable: true });
    view.render(); await flush();
    let tree = view.render();
    assert.equal(tree.find((node) => node.type === "button" && node.props.type === "submit").props.disabled, false);
    assert.equal(tree.find((node) => node.props.id === "payment-config-accountNumber").props.type, "password");
    tree.find((node) => node.props.id === "payment-config-confirmAccountNumber").props.onChange({ target: { value: "0012345678" } });
    tree = view.render();
    tree.find((node) => node.props.id === "payment-config-bankName").props.onChange({ target: { value: "Replacement Fixture Bank" } });
    tree = view.render(); tree.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    tree = view.render();
    const confirm = tree.find((node) => node.type === "ConfirmDialog");
    assert.match(confirm.props.message, /receiving bank account/);
    assert.equal(writes, 0);
    confirm.props.onConfirm(); confirm.props.onConfirm();
    assert.equal(writes, 1);
    finish({ success: true }); await flush();
    assert.equal(reads, 2);
    assert.equal(view.render().find((node) => node.props.id === "payment-config-bankName").props.value, "Replacement Fixture Bank");
    assert.ok(view.render().some((node) => node.props.role === "status" && node.props.children.join("").includes("settings saved successfully.")));
    view.unmount();
  });
  test("each tab saves only its changes, preserves other persisted values and retains other drafts", async () => {
    for (const [section, key, value] of [["bank", "bankName", "New Bank"], ["upi", "payeeName", "New Payee"], ["razorpay", "razorpayKeyId", "rzp_test_replacement"], ["advanced", "pollingIntervalMs", "1800"]]) {
      let persisted = normalizePaymentConfig(paymentSettings, 2), submitted, selectedSection;
      const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
        getPaymentGatewayConfigApi: async () => persisted,
        updatePaymentGatewayConfigApi: async (form, _signal, selected) => {
          selectedSection = selected; submitted = paymentConfigPayload(form, 2, selected);
          persisted = normalizePaymentConfig({ ...persisted, ...submitted }, 2);
          return { success: true };
        },
      }, { campusId: 2, campusName: "Fixture", editable: true });
      view.render(); await flush();
      const tab = (id) => { view.render().find((node) => node.props.id === `payment-tab-${id}`).props.onClick(); view.render(); };
      const change = (id, val) => { view.render().find((node) => node.props.id === `payment-config-${id}`).props.onChange({ target: { value: val } }); view.render(); };
      const otherTab = section === "bank" ? "advanced" : "bank";
      const otherKey = section === "bank" ? "frontendPort" : "bankName";
      tab(otherTab); change(otherKey, ""); tab(section); change(key, value);
      if (section === "bank") change("confirmAccountNumber", paymentSettings.accountNumber);
      view.render().find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
      const confirmation = view.render().find((node) => node.type === "ConfirmDialog");
      if (confirmation) confirmation.props.onConfirm();
      await flush();
      assert.equal(selectedSection, section); assert.equal(String(submitted[key]), value);
      assert.equal(submitted[otherKey], paymentSettings[otherKey]);
      assert.equal(Object.hasOwn(submitted, "razorpayKeySecret"), false);
      assert.equal(Object.hasOwn(submitted, "razorpayWebhookSecret"), false);
      assert.ok(view.render().some((node) => node.props.role === "status" && node.props.children.join("").includes("settings saved successfully.")));
      tab(otherTab); assert.equal(view.render().find((node) => node.props.id === `payment-config-${otherKey}`).props.value, "");
      view.unmount();
    }
  });
  test("section validation isolates hidden fields and permits omission of stored secrets", () => {
    const blank = { ...PAYMENT_CONFIG_DEFAULTS, campusId: 2 };
    assert.deepEqual(paymentConfigErrors(blank, "advanced"), {});
    assert.deepEqual(paymentConfigErrors(blank, "upi"), {});
    assert.ok(paymentConfigErrors({ ...blank, enableCounterUpiQr: true }, "upi").payeeVpa);
    assert.ok(paymentConfigErrors({ ...blank, enableRazorpay: true }, "razorpay").razorpayKeySecret);
    assert.deepEqual(paymentConfigErrors(paymentSettings, "razorpay"), {});
    assert.throws(() => paymentConfigPayload(blank, 2, "unknown"), /Unknown/);
  });
  test("reload mismatches or lost secret-presence flags cannot report a section save as successful", async () => {
    for (const mismatch of [{ pollingIntervalMs: 1200 }, { hasRazorpayKeySecret: false }]) {
      let persisted = normalizePaymentConfig(paymentSettings, 2);
      const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
        getPaymentGatewayConfigApi: async () => persisted,
        updatePaymentGatewayConfigApi: async (form) => { persisted = { ...form, ...mismatch }; return { success: true }; },
      }, { campusId: 2, campusName: "Fixture", editable: true });
      view.render(); await flush(); view.render().find((node) => node.props.id === "payment-tab-advanced").props.onClick();
      view.render().find((node) => node.props.id === "payment-config-pollingIntervalMs").props.onChange({ target: { value: "1800" } });
      view.render().find((node) => node.type === "form").props.onSubmit({ preventDefault() {} }); await flush();
      assert.ok(view.render().some((node) => node.props.role === "alert"));
      assert.equal(view.render().some((node) => node.props.role === "status" && node.props.children.join("").includes("settings saved successfully.")), false);
      assert.equal(view.render().find((node) => node.props.id === "payment-config-pollingIntervalMs").props.value, "1800");
      view.unmount();
    }
  });
  test("backend combined-DTO rejection retains the section draft without false success", async () => {
    let writes = 0;
    const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: async () => ({ ...PAYMENT_CONFIG_DEFAULTS, campusId: 2 }),
      updatePaymentGatewayConfigApi: async (form, _signal, section) => {
        writes++; assert.equal(section, "advanced"); assert.equal(form.payeeVpa, "");
        throw { response: { status: 400, data: { message: "PayeeVpa is required by the combined DTO." } } };
      },
    }, { campusId: 2, campusName: "Fixture", editable: true });
    view.render(); await flush(); view.render().find((node) => node.props.id === "payment-tab-advanced").props.onClick();
    view.render().find((node) => node.props.id === "payment-config-pollingIntervalMs").props.onChange({ target: { value: "1800" } });
    view.render().find((node) => node.type === "form").props.onSubmit({ preventDefault() {} }); await flush();
    assert.equal(writes, 1);
    assert.equal(view.render().find((node) => node.props.id === "payment-config-pollingIntervalMs").props.value, "1800");
    assert.ok(view.render().some((node) => node.props.role === "alert" && node.props.children.join("").includes("PayeeVpa")));
    assert.equal(view.render().some((node) => node.props.role === "status" && node.props.children.join("").includes("settings saved successfully.")), false);
    view.unmount();
  });
  test("configuration rejects failed loads, cancels stale campus reads and never enables saving", async () => {
    let resolve, signal;
    const view = await mount(configSource, "CampusPaymentConfig", {
      ...configBindings,
      getPaymentGatewayConfigApi: (_campusId, value) => { signal = value; return new Promise((done) => { resolve = done; }); },
    }, { campusId: 2, campusName: "Old Campus", editable: true });
    view.render(); view.unmount(); assert.equal(signal.aborted, true);
    resolve(configFixture()); await flush();
    const failed = await mount(configSource, "CampusPaymentConfig", {
      ...configBindings,
      getPaymentGatewayConfigApi: async () => { throw { response: { status: 404 } }; },
    }, { campusId: 3, campusName: "New Campus", editable: true });
    failed.render(); await flush();
    const tree = failed.render();
    assert.equal(tree.find((node) => node.type === "fieldset").props.disabled, false);
    assert.equal(tree.find((node) => node.type === "button" && node.props.type === "submit").props.disabled, true);
    assert.ok(tree.some((node) => node.props.role === "alert" && node.props.children.join("").includes("404")));
    assert.equal(tree.find((node) => node.props.id === "payment-config-accountNumber").props.value, "");
    failed.unmount();
  });
  test("all four configuration tabs retain editable drafts after 404, with protected fixed fields and password visibility", async () => {
    let writes = 0;
    const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: async () => { throw { response: { status: 404 } }; },
      updatePaymentGatewayConfigApi: async () => { writes++; },
    }, { campusId: 2, campusName: "Fixture Campus", editable: true });
    view.render(); await flush();
    const change = (key, value) => {
      let tree = view.render();
      assert.equal(tree.find((node) => node.type === "fieldset").props.disabled, false);
      tree.find((node) => node.props.id === `payment-config-${key}`).props.onChange({ target: { value } });
      tree = view.render();
      assert.equal(tree.find((node) => node.props.id === `payment-config-${key}`).props.value, key === "ifscCode" ? value.toUpperCase() : value);
    };
    const tab = (key) => { view.render().find((node) => node.props.id === `payment-tab-${key}`).props.onClick(); return view.render(); };
    for (const [key, value] of Object.entries({ bankName: "Fixture Bank", accountHolderName: "Fixture College", accountNumber: "0012345678", confirmAccountNumber: "0012345678", ifscCode: "abcd0123456", branchName: "Test Branch", accountType: "Savings" })) change(key, value);
    change("bankName", "Fixture Ban"); change("bankName", ""); change("bankName", "Pasted Fixture Bank");
    let tree = view.render();
    tree.find((node) => node.type === "input" && node.props.type === "checkbox").props.onChange({ target: { checked: true } });
    assert.equal(view.render().find((node) => node.type === "input" && node.props.type === "checkbox").props.checked, true);
    tree = tab("upi"); assert.equal(tree.find((node) => node.props.id === "payment-config-currency").props.readOnly, true);
    for (const [key, value] of Object.entries({ payeeVpa: "fixture@bank", payeeName: "Fixture College", mcc: "8220" })) change(key, value);
    view.render().find((node) => node.type === "input" && node.props.type === "checkbox").props.onChange({ target: { checked: true } });
    tab("razorpay");
    for (const [key, value] of Object.entries({ razorpayKeyId: "rzp_test_fixture", razorpayKeySecret: "fixture-input-only", razorpayWebhookSecret: "fixture-hook-only" })) change(key, value);
    tree = view.render(); assert.equal(tree.find((node) => node.props.id === "payment-webhook").props.readOnly, true);
    tree.find((node) => node.props["aria-label"] === "Show Razorpay Key Secret").props.onClick();
    assert.equal(view.render().find((node) => node.props.id === "payment-config-razorpayKeySecret").props.type, "text");
    view.render().find((node) => node.props["aria-label"] === "Hide Razorpay Key Secret").props.onClick();
    assert.equal(view.render().find((node) => node.props.id === "payment-config-razorpayKeySecret").props.type, "password");
    tree = view.render(); tree.find((node) => node.props.name === "payment-mode" && !node.props.checked).props.onChange();
    assert.equal(view.render().filter((node) => node.props.name === "payment-mode")[1].props.checked, true);
    tab("advanced");
    for (const [key, value] of Object.entries({ pollingIntervalMs: "1500", monitoringTimeoutSeconds: "900", baseAppUrl: "https://app.example.test", frontendPort: "5174" })) change(key, value);
    tree = tab("bank"); assert.equal(tree.find((node) => node.props.id === "payment-config-bankName").props.value, "Pasted Fixture Bank");
    change("ifscCode", "bad"); tree = view.render(); tree.find((node) => node.props.id === "payment-config-ifscCode").props.onBlur();
    assert.ok(view.render().some((node) => node.props.id === "payment-error-ifscCode"));
    tree = view.render(); tree.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(writes, 0);
    assert.ok(view.render().some((node) => node.props.role === "alert" && node.props.children.join("").includes("404")));
    tree = tab("razorpay"); assert.equal(tree.find((node) => node.props.id === "payment-config-razorpayKeySecret").props.value, "fixture-input-only");
    view.unmount();
  });
  test("currency stays read-only INR with the supported-currency hint and unchanged payload contract", async () => {
    let resolve;
    const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: () => new Promise((done) => { resolve = done; }),
    }, { campusId: 2, campusName: "Fixture", editable: true });
    view.render().find((node) => node.props.id === "payment-tab-upi").props.onClick();
    const input = () => view.render().find((node) => node.props.id === "payment-config-currency");
    assert.equal(input().props.value, "INR");
    assert.equal(input().props.readOnly, true);
    assert.equal(input().props.type, "text");
    assert.equal(input().props["aria-required"], false);
    const label = view.render().find((node) => node.type === "label" && node.props.htmlFor === "payment-config-currency");
    assert.equal(nodes(label).some((node) => node.props.className === "req"), false);
    assert.equal(input().props["aria-describedby"], "payment-currency-hint");
    assert.equal(view.render().find((node) => node.props.id === "payment-currency-hint").props.children.join(""), "Currently supported currency: INR (Indian Rupees).");
    resolve(configFixture()); await flush();
    assert.equal(input().props.value, "INR");
    assert.throws(() => paymentConfigPayload({ ...configFixture(), confirmAccountNumber: "0012345678", currency: "USD" }, 2), /Correct/);
    view.render().find((node) => node.props.id === "payment-tab-bank").props.onClick(); view.render();
    view.render().find((node) => node.props.id === "payment-tab-upi").props.onClick();
    assert.equal(input().props.value, "INR");
    assert.equal(view.render().some((node) => node.props.id === "payment-error-currency"), false);
    assert.equal(paymentConfigPayload({ ...configFixture(), confirmAccountNumber: "0012345678", currency: "INR" }, 2).currency, "INR");
    view.unmount();
  });
  test("mandatory label markers and accessible requirements match existing rules across all four tabs", async () => {
    const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: async () => ({ ...configFixture(), enableCounterUpiQr: false }),
    }, { campusId: 2, campusName: "Fixture", editable: true });
    view.render(); await flush();
    const tab = (key) => { view.render().find((node) => node.props.id === `payment-tab-${key}`).props.onClick(); view.render(); };
    const check = (key, required) => {
      const tree = view.render();
      const label = tree.find((node) => node.type === "label" && node.props.htmlFor === `payment-config-${key}`);
      const markers = nodes(label).filter((node) => node.props.className === "req");
      assert.equal(markers.length, required ? 1 : 0, key);
      if (required) { assert.equal(markers[0].props.children.join(""), "*"); assert.equal(markers[0].props["aria-hidden"], "true"); }
      assert.equal(tree.find((node) => node.props.id === `payment-config-${key}`).props["aria-required"], required, key);
    };
    const toggle = (name, enabled) => {
      const label = view.render().find((node) => node.type === "label" && node.props.children.join("").includes(name));
      nodes(label).find((node) => node.type === "input").props.onChange({ target: { checked: enabled } }); view.render();
    };
    for (const key of ["bankName", "accountHolderName", "accountNumber", "confirmAccountNumber", "ifscCode", "accountType"]) check(key, true);
    check("branchName", false);
    tab("upi"); check("currency", false); check("mcc", false); check("payeeVpa", false); check("payeeName", false);
    toggle("Enable Dynamic UPI QR", true); check("payeeVpa", true); check("payeeName", true); check("mcc", false);
    toggle("Enable Dynamic UPI QR", false); check("payeeVpa", false); check("payeeName", false);
    tab("razorpay");
    for (const key of ["razorpayKeyId", "razorpayKeySecret", "razorpayWebhookSecret"]) check(key, false);
    toggle("Enable Razorpay", true);
    for (const key of ["razorpayKeyId", "razorpayKeySecret", "razorpayWebhookSecret"]) check(key, true);
    toggle("Enable Razorpay", false); check("razorpayKeyId", false);
    tab("advanced"); for (const key of ["pollingIntervalMs", "monitoringTimeoutSeconds", "frontendPort"]) check(key, true);
    check("baseAppUrl", false); view.unmount();
    const stored = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: async () => ({ ...configFixture(), hasRazorpayKeySecret: true, hasRazorpayWebhookSecret: true }),
    }, { campusId: 2, campusName: "Fixture", editable: true });
    stored.render(); await flush(); stored.render().find((node) => node.props.id === "payment-tab-razorpay").props.onClick();
    const tree = stored.render();
    assert.equal(tree.find((node) => node.props.id === "payment-config-razorpayKeyId").props["aria-required"], false);
    for (const key of ["razorpayKeySecret", "razorpayWebhookSecret"]) assert.equal(tree.find((node) => node.props.id === `payment-config-${key}`).props["aria-required"], false);
    stored.unmount();
  });
  test("UPI enablement requires valid payee details; disabling clears stale required errors without erasing values", async () => {
    let writes = 0;
    const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: async () => ({ ...configFixture(), confirmAccountNumber: "0012345678", enableCounterUpiQr: false, payeeVpa: "", payeeName: "" }),
      updatePaymentGatewayConfigApi: async () => { writes++; return { success: true }; },
    }, { campusId: 2, campusName: "Fixture", editable: true });
    view.render(); await flush(); view.render().find((node) => node.props.id === "payment-tab-upi").props.onClick();
    const input = (key) => view.render().find((node) => node.props.id === `payment-config-${key}`);
    const toggle = (enabled) => {
      const label = view.render().find((node) => node.type === "label" && node.props.children.join("").includes("Enable Dynamic UPI QR"));
      nodes(label).find((node) => node.type === "input").props.onChange({ target: { checked: enabled } }); view.render();
    };
    toggle(true); input("payeeVpa").props.onBlur(); input("payeeName").props.onBlur();
    assert.ok(view.render().some((node) => node.props.id === "payment-error-payeeVpa"));
    assert.ok(view.render().some((node) => node.props.id === "payment-error-payeeName"));
    input("payeeVpa").props.onChange({ target: { value: "invalid-vpa" } }); input("payeeVpa").props.onBlur();
    input("payeeName").props.onChange({ target: { value: "   " } }); input("payeeName").props.onBlur();
    view.render().find((node) => node.type === "form").props.onSubmit({ preventDefault() {} }); view.render();
    assert.equal(writes, 0);
    input("payeeVpa").props.onChange({ target: { value: "" } }); input("payeeVpa").props.onBlur();
    toggle(false);
    assert.equal(view.render().some((node) => ["payment-error-payeeVpa", "payment-error-payeeName"].includes(node.props.id)), false);
    assert.equal(input("payeeName").props.value, "   ");
    input("payeeVpa").props.onChange({ target: { value: "retained@bank" } });
    input("payeeName").props.onChange({ target: { value: "Retained Payee" } });
    toggle(true); toggle(false);
    assert.equal(input("payeeVpa").props.value, "retained@bank");
    assert.equal(input("payeeName").props.value, "Retained Payee");
    assert.equal(paymentConfigErrors({ ...configFixture(), enableCounterUpiQr: false, payeeVpa: "", payeeName: "   " }).payeeName, undefined);
    assert.equal(paymentConfigErrors({ ...configFixture(), enableCounterUpiQr: false, payeeVpa: "", payeeName: "   " }).payeeVpa, undefined);
    view.unmount();
  });
  test("an explicit scoped empty configuration supports initial save and confirmed reload; a route 404 does not", async () => {
    let persisted = { ...PAYMENT_CONFIG_DEFAULTS, campusId: 2 }, reads = 0, writes = 0;
    const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: async () => { reads++; return normalizePaymentConfig(persisted, 2); },
      updatePaymentGatewayConfigApi: async (form) => { assert.equal(form.campusId, 2); persisted = { ...form }; writes++; return { success: true }; },
    }, { campusId: 2, campusName: "Fixture", editable: true });
    view.render(); await flush();
    assert.equal(view.render().find((node) => node.type === "button" && node.props.type === "submit").props.disabled, false);
    for (const [key, value] of Object.entries({ bankName: "Fixture Bank", accountHolderName: "Fixture College", accountNumber: "0012345678", confirmAccountNumber: "0012345678", ifscCode: "ABCD0123456" })) {
      view.render().find((node) => node.props.id === `payment-config-${key}`).props.onChange({ target: { value } }); view.render();
    }
    view.render().find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    view.render().find((node) => node.type === "ConfirmDialog").props.onConfirm(); await flush();
    assert.equal(writes, 1); assert.equal(reads, 2);
    assert.equal(view.render().find((node) => node.props.id === "payment-config-bankName").props.value, "Fixture Bank");
    assert.ok(view.render().some((node) => node.props.role === "status" && node.props.children.join("").includes("settings saved successfully.")));
    view.unmount();
    const unavailable = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: async () => { throw { response: { status: 404 } }; },
      updatePaymentGatewayConfigApi: async () => { writes++; },
    }, { campusId: 2, campusName: "Fixture", editable: true });
    unavailable.render(); await flush();
    const tree = unavailable.render();
    assert.equal(tree.find((node) => node.type === "button" && node.props.type === "submit").props.disabled, true);
    tree.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(writes, 1);
    assert.equal(tree.some((node) => node.props.role === "status" && node.props.children.join("").includes("settings saved successfully.")), false);
    unavailable.unmount();
  });
  test("loading and refreshed configuration cannot overwrite typing or a retained campus draft", async () => {
    const drafts = new Map(); let resolve;
    const props = { campusId: 2, campusName: "Fixture", editable: true, drafts };
    const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: () => new Promise((done) => { resolve = done; }),
    }, props);
    let tree = view.render(); assert.equal(tree.find((node) => node.type === "fieldset").props.disabled, false);
    tree.find((node) => node.props.id === "payment-config-bankName").props.onChange({ target: { value: "Unsaved Campus Two" } }); view.render();
    resolve(configFixture()); await flush();
    assert.equal(view.render().find((node) => node.props.id === "payment-config-bankName").props.value, "Unsaved Campus Two");
    assert.equal(view.render().find((node) => node.props.id === "payment-config-accountNumber").props.value, "0012345678");
    view.unmount();
    const other = await mount(configSource, "CampusPaymentConfig", { ...configBindings, getPaymentGatewayConfigApi: async () => { throw { response: { status: 404 } }; } }, { ...props, campusId: 3 });
    other.render(); await flush(); assert.equal(other.render().find((node) => node.props.id === "payment-config-bankName").props.value, ""); other.unmount();
    const back = await mount(configSource, "CampusPaymentConfig", { ...configBindings, getPaymentGatewayConfigApi: async () => configFixture() }, props);
    back.render(); await flush(); tree = back.render();
    assert.equal(tree.find((node) => node.props.id === "payment-config-bankName").props.value, "Unsaved Campus Two");
    tree.find((node) => node.type === "button" && node.props.children.includes(" Refresh")).props.onClick(); back.render(); await flush();
    assert.equal(back.render().find((node) => node.props.id === "payment-config-bankName").props.value, "Unsaved Campus Two");
    back.unmount();
  });
  test("server/network failures keep fields editable, authorization failures keep them protected", async () => {
    for (const error of [{ response: { status: 500 } }, { code: "ERR_NETWORK", message: "Network Error" }, { response: { status: 401 } }, { response: { status: 403 } }]) {
      const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings, getPaymentGatewayConfigApi: async () => { throw error; } }, { campusId: 2, campusName: "Fixture", editable: true });
      view.render(); await flush(); const tree = view.render();
      assert.equal(tree.find((node) => node.type === "fieldset").props.disabled, [401, 403].includes(error.response?.status));
      assert.equal(tree.find((node) => node.type === "button" && node.props.type === "submit").props.disabled, true); view.unmount();
    }
  });
  test("failed saves preserve all entered values and secrets without reporting success", async () => {
    let writes = 0;
    const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings,
      getPaymentGatewayConfigApi: async () => ({ ...configFixture(), confirmAccountNumber: "0012345678" }),
      updatePaymentGatewayConfigApi: async () => { writes++; throw { response: { status: 500 } }; },
    }, { campusId: 2, campusName: "Fixture", editable: true });
    view.render(); await flush(); view.render().find((node) => node.props.id === "payment-tab-razorpay").props.onClick();
    view.render().find((node) => node.props.id === "payment-config-razorpayKeySecret").props.onChange({ target: { value: "fixture-secret-draft" } });
    let tree = view.render(); tree.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} }); await flush(); tree = view.render();
    assert.equal(writes, 1);
    assert.equal(tree.find((node) => node.props.id === "payment-config-razorpayKeySecret").props.value, "fixture-secret-draft");
    assert.equal(tree.find((node) => node.type === "fieldset").props.disabled, false);
    assert.equal(tree.find((node) => node.type === "button" && node.props.type === "submit").props.disabled, true);
    assert.ok(tree.some((node) => node.props.role === "alert")); view.unmount();
  });
  test("read-only configuration cannot submit and enabling live mode requires explicit confirmation", async () => {
    let writes = 0;
    const view = await mount(configSource, "CampusPaymentConfig", { ...configBindings, getPaymentGatewayConfigApi: async () => configFixture(), updatePaymentGatewayConfigApi: async () => { writes++; } }, { campusId: 2, campusName: "Fixture", editable: false });
    view.render(); await flush(); let tree = view.render();
    assert.equal(tree.find((node) => node.type === "fieldset").props.disabled, true);
    tree.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(writes, 0); view.unmount();
    const live = await mount(configSource, "CampusPaymentConfig", { ...configBindings, getPaymentGatewayConfigApi: async () => ({ ...configFixture(), confirmAccountNumber: "0012345678" }) }, { campusId: 2, campusName: "Fixture", editable: true });
    live.render(); await flush(); tree = live.render();
    tree.find((node) => node.props.id === "payment-tab-razorpay").props.onClick(); tree = live.render();
    tree.find((node) => node.type === "input" && node.props.name === "payment-mode" && !node.props.checked).props.onChange(); tree = live.render();
    tree.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} }); tree = live.render();
    assert.match(tree.find((node) => node.type === "ConfirmDialog").props.message, /Production mode/);
    live.unmount();
  });
  test("QR/Card configuration failures never load checkout or create orders", async () => {
    for (const mode of ["UPI_QR", "RAZORPAY"]) {
      let created = 0, checkout = 0;
      const view = await mount(gatewaySource, "GatewayPaymentPanel", {
        getPaymentGatewayConfigApi: async () => { throw { response: { status: 404 }, message: "Unavailable" }; },
        feePaymentGatewayApi: { createOrder: async () => { created++; } },
        loadRazorpayCheckout: async () => { checkout++; },
        usePaymentPolling: () => ({ status: "IDLE", secondsLeft: 0 }),
      }, { mode, campusId: 2, account, target: "schedules", selectedIds: [101], amount: 300, onSaved() {}, onPending() {}, onLockChange() {} });
      view.render().find((node) => node.type === "button").props.onClick(); await flush();
      assert.equal(created, 0); assert.equal(checkout, 0);
      assert.equal(view.render().find((node) => node.type === "button").props.disabled, true);
      view.unmount();
    }
  });
  test("configuration access uses accounting roles, Settings permissions and explicit assigned campuses", async () => {
    const permissions = { loading: false, error: "", isSuperOrAdmin: false, canView: () => true, canDo: () => false };
    const base = {
      ...configBindings,
      useEffectivePermissions: () => permissions,
      useCampusContext: () => ({ selectedCampusId: "2", selectedCampus: { campusId: 2, name: "Fixture" } }),
      getAuthItem: () => "Principal", getAuthUser: () => ({ role: "Principal", assignedCampusIds: [2] }),
      hasRole: () => false, DashboardLayout: "DashboardLayout", Navigate: "Navigate",
    };
    const view = await mount(configSource, "PaymentGatewayConfigPage", base, { embedded: true });
    let tree = view.render();
    assert.equal(tree.find((node) => typeof node.type === "function" && node.type.name === "CampusPaymentConfig").props.editable, false);
    view.unmount();
    const denied = await mount(configSource, "PaymentGatewayConfigPage", { ...base, getAuthUser: () => ({ role: "Student", campusId: 2 }), getAuthItem: () => "Student" }, { embedded: true });
    assert.ok(denied.render().some((node) => node.props.role === "alert")); denied.unmount();
    const unassigned = await mount(configSource, "PaymentGatewayConfigPage", { ...base, getAuthUser: () => ({ role: "Principal", assignedCampusIds: [3] }) }, { embedded: true });
    assert.ok(unassigned.render().some((node) => node.props.role === "alert" && node.props.children.join("").includes("permitted campus"))); unassigned.unmount();
    const accountant = await mount(configSource, "PaymentGatewayConfigPage", { ...base, hasRole: () => true }, {});
    tree = accountant.render(); assert.equal(tree.find((node) => node.type === "Navigate").props.to, "/accountant-dashboard/settings/payment-gateway"); accountant.unmount();
    const admin = await mount(configSource, "PaymentGatewayConfigPage", { ...base, Link: "Link" }, {});
    const layout = admin.render().find((node) => node.type === "DashboardLayout");
    assert.equal(layout.props.actions.type, "Link");
    assert.equal(layout.props.actions.props.to, "/dashboard/settings");
    assert.ok(layout.props.actions.props.children.join("").includes("Back to Settings"));
    const routes = await readFile(new URL("../../../../routes/AppRoutes.jsx", import.meta.url), "utf8");
    assert.ok(routes.includes('path="/dashboard/settings"'));
    admin.unmount();
  });
  test("QR creation is explicit, duplicate clicks create one order, only actual QR is rendered", async () => {
    let calls = 0,
      resolve,
      success,
      submitted = 0;
    const view = await mount(
      gatewaySource,
      "GatewayPaymentPanel",
      {
        feePaymentGatewayApi: {
          createOrder: () => {
            calls++;
            return new Promise((done) => {
              resolve = done;
            });
          },
        },
        usePaymentPolling: (_order, _attempt, callback) => {
          success = callback;
          return { status: "PENDING", secondsLeft: 600 };
        },
      },
      {
        mode: "UPI_QR",
        account,
        target: "schedules",
        selectedIds: [101],
        amount: 300,
        onSaved: () => {
          submitted++;
        },
        onPending() {},
        onLockChange() {},
      },
    );
    const first = view.render();
    assert.equal(calls, 0);
    const button = first.find((node) => node.type === "button");
    button.props.onClick();
    button.props.onClick();
    await flush();
    assert.equal(calls, 1);
    resolve({
      ...order,
      currency: "INR",
      qrCodeBase64: "data:image/png;base64,AAAA",
      upiUri: "upi://pay?fixture",
    });
    await flush();
    const rendered = view.render();
    assert.equal(
      rendered.find((node) => node.type === "img").props.src,
      "data:image/png;base64,AAAA",
    );
    assert.equal(submitted, 0);
    view.unmount();
    success(paid);
    await flush();
    assert.equal(submitted, 0);
  });
  test("QR displays resolved campus, routing mode and payee, and rejects cross-campus order resolution", async () => {
    let sentPayload;
    const view = await mount(
      gatewaySource,
      "GatewayPaymentPanel",
      {
        getPaymentGatewayConfigApi: async () => paymentSettings,
        feePaymentGatewayApi: {
          createOrder: async (payload) => {
            sentPayload = payload;
            return {
              ...order,
              currency: "INR",
              qrCodeBase64: "data:image/png;base64,AAAA",
              upiUri: "upi://pay?pa=college@hdfcbank",
              qrMode: "DIRECT_VPA_QR",
              resolvedCampusId: 2,
              resolvedCampusName: "Main Campus",
              payeeVpa: "college@hdfcbank",
              payeeName: "College Trust",
            };
          },
        },
        usePaymentPolling: () => ({ status: "PENDING", secondsLeft: 600 }),
      },
      {
        mode: "UPI_QR",
        campusId: 2,
        account: { ...account, campusId: 2 },
        target: "schedules",
        selectedIds: [101],
        amount: 300,
        onSaved() {},
        onPending() {},
        onLockChange() {},
      },
    );
    view.render().find((node) => node.type === "button").props.onClick();
    await flush();
    assert.equal(sentPayload.campusId, 2);
    const tree = view.render();
    assert.ok(
      tree.some(
        (node) =>
          node.props?.role === "status" &&
          node.props.children.join("").includes("College Trust (college@hdfcbank)"),
      ),
    );
    view.unmount();

    const mismatchView = await mount(
      gatewaySource,
      "GatewayPaymentPanel",
      {
        getPaymentGatewayConfigApi: async () => paymentSettings,
        feePaymentGatewayApi: {
          createOrder: async () => ({
            ...order,
            currency: "INR",
            qrCodeBase64: "data:image/png;base64,AAAA",
            upiUri: "upi://pay?pa=other@hdfcbank",
            resolvedCampusId: 9,
          }),
        },
        usePaymentPolling: () => ({ status: "PENDING", secondsLeft: 600 }),
      },
      {
        mode: "UPI_QR",
        campusId: 2,
        account: { ...account, campusId: 2 },
        target: "schedules",
        selectedIds: [101],
        amount: 300,
        onSaved() {},
        onPending() {},
        onLockChange() {},
      },
    );
    mismatchView.render().find((node) => node.type === "button").props.onClick();
    await flush();
    const mismatchTree = mismatchView.render();
    assert.equal(mismatchTree.some((node) => node.type === "img"), false);
    assert.ok(
      mismatchTree.some(
        (node) =>
          node.props?.role === "alert" &&
          node.props.children.join("").includes("different campus payment account"),
      ),
    );
    mismatchView.unmount();
  });
  test("Direct Bank VPA QR allows inline UTR entry and immediate approval without leaving modal", async () => {
    let submittedPayload, approvedPayload, savedPayment, timeoutFn;
    const view = await mount(
      gatewaySource,
      "GatewayPaymentPanel",
      {
        getPaymentGatewayConfigApi: async () => paymentSettings,
        feePaymentGatewayApi: {
          createOrder: async () => ({
            ...order,
            orderId: "order_direct_inline_1",
            currency: "INR",
            qrCodeBase64: "data:image/png;base64,AAAA",
            upiUri: "upi://pay?pa=college@okicici",
            qrMode: "DIRECT_VPA_QR",
            requiresManualUtr: true,
            payeeVpa: "college@okicici",
            payeeName: "College Trust",
          }),
          submitUtr: async (payload) => {
            submittedPayload = payload;
            return { success: true, transactionId: 501 };
          },
          approveUtr: async (payload) => {
            approvedPayload = payload;
            return { success: true, receiptNumber: "REC-501", amount: 300, feePaymentId: 888 };
          },
        },
        usePaymentPolling: () => ({ status: "MANUAL_UTR", secondsLeft: 0 }),
        window: { setTimeout: (fn) => { timeoutFn = fn; return 1; } },
      },
      {
        mode: "UPI_QR",
        campusId: 2,
        account: { ...account, campusId: 2 },
        target: "schedules",
        selectedIds: [101],
        amount: 300,
        onSaved: (p) => { savedPayment = p; },
        onPending() {},
        onLockChange() {},
      },
    );
    view.render().find((node) => node.type === "button").props.onClick();
    await flush();
    let tree = view.render();
    const utrInput = tree.find((node) => node.props?.id === "gateway-inline-utr");
    assert.ok(utrInput);
    utrInput.props.onChange({ target: { value: "431512345678" } });
    tree = view.render();
    await tree.find((node) => node.type === "button" && Array.isArray(node.props?.children) && node.props.children.includes("Verify & Credit Payment Now")).props.onClick();
    await flush();
    assert.equal(submittedPayload.orderId, "order_direct_inline_1");
    assert.deepEqual(Array.from(submittedPayload.feeInstallmentIds), [101]);
    assert.equal(submittedPayload.utrNumber, "431512345678");
    assert.equal(approvedPayload.transactionId, 501);
    assert.equal(approvedPayload.action, "Approve");
    timeoutFn();
    assert.equal(savedPayment.receiptNo, "REC-501");
    assert.equal(savedPayment.gatewayConfirmed, true);
    view.unmount();
  });
  test("Razorpay uses returned public order, rupees-to-paise conversion and backend verify", async () => {
    let options,
      verification,
      completed = 0,
      callback;
    const view = await mount(
      gatewaySource,
      "GatewayPaymentPanel",
      {
        loadRazorpayCheckout: async () =>
          class {
            constructor(value) {
              options = value;
            }
            on() {}
            open() {}
            close() {}
          },
        feePaymentGatewayApi: {
          createOrder: async () => ({ ...order, currency: "INR", keyId: "public_fixture" }),
          verify: async (payload) => {
            verification = payload;
            return { success: true, receiptNumber: "TEST-R", amount: 300 };
          },
        },
        usePaymentPolling: () => ({ status: "PENDING", secondsLeft: 600 }),
        window: {
          setTimeout: (fn) => {
            callback = fn;
            return 1;
          },
        },
      },
      {
        mode: "RAZORPAY",
        account,
        target: "schedules",
        selectedIds: [101],
        amount: 300,
        onSaved: () => {
          completed++;
        },
        onPending() {},
        onLockChange() {},
      },
    );
    view
      .render()
      .find((node) => node.type === "button")
      .props.onClick();
    await flush();
    assert.equal(options.key, "public_fixture");
    assert.equal(options.order_id, order.orderId);
    assert.equal(options.amount, 30000);
    await options.handler({
      razorpay_order_id: order.orderId,
      razorpay_payment_id: "pay_fixture",
      razorpay_signature: "signature_fixture",
    });
    await flush();
    assert.equal(verification.studentFeeId, 41);
    assert.equal(verification.amount, 300);
    assert.equal(completed, 0);
    callback();
    assert.equal(completed, 1);
    view.unmount();
  });
  test("pending Razorpay verification does not open a receipt", async () => {
    let options;
    const view = await mount(
      gatewaySource,
      "GatewayPaymentPanel",
      {
        loadRazorpayCheckout: async () =>
          class {
            constructor(value) {
              options = value;
            }
            on() {}
            open() {}
            close() {}
          },
        feePaymentGatewayApi: {
          createOrder: async () => ({ ...order, keyId: "public_fixture", currency: "INR" }),
          verify: async () => ({ success: true, status: "Pending" }),
        },
        usePaymentPolling: () => ({ status: "PENDING", secondsLeft: 600 }),
      },
      {
        mode: "RAZORPAY",
        account,
        target: "schedules",
        selectedIds: [101],
        amount: 300,
        onSaved: () => assert.fail(),
        onPending() {},
        onLockChange() {},
      },
    );
    view
      .render()
      .find((node) => node.type === "button")
      .props.onClick();
    await flush();
    await options.handler({
      razorpay_order_id: order.orderId,
      razorpay_payment_id: "pay_fixture",
      razorpay_signature: "signature_fixture",
    });
    await flush();
    assert(
      view
        .render()
        .some((node) =>
          node.props?.children?.includes(
            "Verification is pending. Awaiting confirmed backend settlement.",
          ),
        ),
    );
    view.unmount();
  });
  test("UTR submission is pending, guards duplicates, and uses documented account-level contract", async () => {
    let calls = 0,
      pending = 0,
      payload;
    const view = await mount(
      gatewaySource,
      "GatewayPaymentPanel",
      {
        feePaymentGatewayApi: {
          submitUtr: async (data) => {
            calls++;
            payload = data;
            return { success: true };
          },
        },
        usePaymentPolling: () => ({ status: "IDLE" }),
      },
      {
        mode: "BANK_TRANSFER",
        account,
        target: "full",
        selectedIds: [],
        amount: 250,
        onSaved: () => assert.fail("UTR must not settle"),
        onPending: () => {
          pending++;
        },
        onLockChange() {},
      },
    );
    let tree = view.render();
    tree
      .find((node) => node.props?.id === "gateway-utrNumber")
      .props.onChange({ target: { value: "UTR9988776655" } });
    tree = view.render();
    const button = tree.find((node) => node.type === "button");
    button.props.onClick();
    button.props.onClick();
    await flush();
    assert.equal(calls, 1);
    assert.equal(pending, 1);
    assert.equal(payload.amount, 250);
    assert.equal(payload.feeInstallmentIds, undefined);
    assert(view.render().find((node) => node.type === "button").props.disabled);
    view.unmount();

    let scheduleCalls = 0,
      schedulePayload;
    const scheduleView = await mount(
      gatewaySource,
      "GatewayPaymentPanel",
      {
        feePaymentGatewayApi: {
          submitUtr: async (data) => {
            scheduleCalls++;
            schedulePayload = data;
            return { success: true };
          },
        },
        usePaymentPolling: () => ({ status: "IDLE" }),
      },
      {
        mode: "BANK_TRANSFER",
        account,
        target: "schedules",
        selectedIds: ["101"],
        amount: 300,
        onSaved: () => assert.fail("UTR must not settle"),
        onPending() {},
        onLockChange() {},
      },
    );
    scheduleView
      .render()
      .find((node) => node.props?.id === "gateway-utrNumber")
      .props.onChange({ target: { value: "UTR668064537699" } });
    scheduleView.render().find((node) => node.type === "button").props.onClick();
    await flush();
    assert.equal(scheduleCalls, 1);
    assert.equal(schedulePayload.amount, 300);
    assert.deepEqual(schedulePayload.feeInstallmentIds, [101]);
    scheduleView.unmount();
  });

  const pageSource = await readFile(new URL("../FeeManagementPage.jsx", import.meta.url), "utf8");
  const helpers = pageSource.slice(
    pageSource.indexOf("const read ="),
    pageSource.indexOf("const normalizeBackendPaymentPlan"),
  );
  const cashSource =
    helpers +
    pageSource.slice(
      pageSource.indexOf("function CollectPaymentModal"),
      pageSource.indexOf("/* ------------------------------- Receipt"),
    );
  const read = (item, ...keys) =>
    keys.map((key) => item?.[key]).find((value) => value != null && value !== "");
  test("collection modal retains four methods and multiple schedule selection for cash", async () => {
    let payload,
      resolve,
      calls = 0,
      savedCount = 0;
    const view = await mount(
      cashSource,
      "CollectPaymentModal",
      {
        GatewayPaymentPanel: "GatewayPanel",
        apiEndpoints: { fee: { collect: "/api/v1/fees/collect" } },
        apiClient: {
          post: async (_url, body, config) => {
            calls++;
            payload = body;
            assert.equal(config.skipNetworkRetry, true);
            return new Promise((done) => {
              resolve = done;
            });
          },
        },
      },
      {
        account,
        onClose() {},
        onPending() {},
        onSaved: () => {
          savedCount++;
        },
      },
    );
    let tree = view.render();
    assert.equal(tree.filter((node) => node.props?.role === "tab").length, 4);
    tree
      .find((node) => node.props?.role === "tab" && node.props.children.includes("Cash / Manual"))
      .props.onClick();
    tree = view.render();
    const checks = tree.filter((node) => node.props?.className === "cms-fee-pay-checkbox");
    checks[2].props.onChange();
    tree = view.render();
    assert.equal(tree.find((node) => node.props?.id === "collect-amount").props.value, "700");
    tree
      .find((node) => node.props?.id === "collect-amount")
      .props.onChange({ target: { value: "650" } });
    tree
      .find((node) => node.props?.id === "collect-discount")
      .props.onChange({ target: { value: "10" } });
    tree
      .find((node) => node.props?.id === "collect-fine")
      .props.onChange({ target: { value: "5" } });
    tree = view.render();
    const save = tree[0].props.footer.props.children.find(
      (node) => node?.props?.onClick && node.props.children.includes("Save Payment"),
    );
    const first = save.props.onClick();
    save.props.onClick();
    assert.equal(calls, 1);
    assert.deepEqual(Array.from(payload.feeInstallmentIds), [101, 102]);
    assert.equal(payload.amount, 650);
    assert.equal(payload.discount, 10);
    assert.equal(payload.fine, 5);
    assert.equal(payload.paymentMode, "Cash");
    resolve({
      data: {
        feePaymentId: 99,
        receiptNumber: "ACTUAL-99",
        amount: 645,
        status: "Paid",
        paymentDate: "2026-11-09",
      },
    });
    await first;
    assert.equal(savedCount, 1);
    await save.props.onClick();
    assert.equal(calls, 1);
    view.unmount();
  });
  test("cash rejects unconfirmed results and negative adjustments without inventing receipts", async () => {
    let calls = 0,
      successful = 0;
    const view = await mount(
      cashSource,
      "CollectPaymentModal",
      {
        GatewayPaymentPanel: "GatewayPanel",
        apiEndpoints: { fee: { collect: "/api/v1/fees/collect" } },
        apiClient: {
          post: async () => {
            calls++;
            return { data: { success: true } };
          },
        },
      },
      {
        account,
        onClose() {},
        onPending() {},
        onSaved: () => {
          successful++;
        },
      },
    );
    view
      .render()
      .find((node) => node.props?.role === "tab" && node.props.children.includes("Cash / Manual"))
      .props.onClick();
    let tree = view.render();
    tree
      .find((node) => node.props?.id === "collect-discount")
      .props.onChange({ target: { value: "-1" } });
    tree = view.render();
    const saveButton = (all) =>
      all[0].props.footer.props.children.find((node) =>
        node?.props?.children?.includes("Save Payment"),
      );
    await saveButton(tree).props.onClick();
    assert.equal(calls, 0);
    view
      .render()
      .find((node) => node.props?.id === "collect-discount")
      .props.onChange({ target: { value: "0" } });
    await saveButton(view.render()).props.onClick();
    assert.equal(calls, 1);
    assert.equal(successful, 0);
    assert(view.render().some((node) => node.type === "fieldset" && node.props.disabled));
    view.unmount();
  });

  const queueSource = await readFile(
    new URL("../components/OfflineUtrQueueTab.jsx", import.meta.url),
    "utf8",
  );
  const queueRow = {
    id: 89,
    studentName: "Fixture Student",
    admissionNo: "TEST-11",
    amount: 250,
    utrNumber: "UTRFIXTURE",
    bankName: "Fixture Bank",
    date: "2026-11-09",
    status: "PendingVerification",
  };
  test("UTR queue scopes reads, requires rejection reason, and prevents duplicate reviews", async () => {
    let params,
      payload,
      writes = 0,
      refresh = 0,
      resolve;
    const view = await mount(
      queueSource,
      "OfflineUtrQueueTab",
      {
        feePaymentGatewayApi: {
          pendingUtrs: async (scope) => {
            params = scope;
            return [queueRow];
          },
          approveUtr: async (data) => {
            writes++;
            payload = data;
            return new Promise((done) => {
              resolve = done;
            });
          },
        },
      },
      {
        scope: { campusId: 2, academicYearId: 3 },
        canView: true,
        canReview: true,
        onSettled: () => {
          refresh++;
        },
        onToast() {},
        Pagination: "Pagination",
      },
    );
    view.render();
    await flush();
    let tree = view.render();
    assert.equal(params.campusId, 2);
    assert.equal(params.academicYearId, 3);
    tree
      .find((node) => node.type === "button" && node.props.children.includes("Reject"))
      .props.onClick();
    tree = view.render();
    let review = tree.find((node) => node.type === "Modal");
    await review.props.footer.props.children[1].props.onClick();
    assert.equal(writes, 0);
    view
      .render()
      .find((node) => node.props?.id === "utr-review-reason")
      .props.onChange({ target: { value: "Not in bank statement" } });
    review = view.render().find((node) => node.type === "Modal");
    const first = review.props.footer.props.children[1].props.onClick();
    review.props.footer.props.children[1].props.onClick();
    assert.equal(writes, 1);
    assert.equal(payload.reason, "Not in bank statement");
    assert.equal(payload.transactionId, 89);
    resolve({ success: true });
    await first;
    assert.equal(refresh, 0);
    view.unmount();
  });
  test("UTR approval refreshes settlement records; denied users cannot review", async () => {
    let writes = 0,
      refreshed = 0;
    const bindings = {
      feePaymentGatewayApi: {
        pendingUtrs: async () => [queueRow],
        approveUtr: async () => {
          writes++;
          return { success: true, receiptNumber: "R89" };
        },
      },
    };
    const props = {
      scope: { campusId: 2 },
      canView: true,
      canReview: true,
      onSettled: () => {
        refreshed++;
      },
      onToast() {},
      Pagination: "Pagination",
    };
    const view = await mount(queueSource, "OfflineUtrQueueTab", bindings, props);
    view.render();
    await flush();
    view
      .render()
      .find((node) => node.type === "button" && node.props.children.includes("Approve & Credit"))
      .props.onClick();
    const review = view.render().find((node) => node.type === "Modal");
    await review.props.footer.props.children[1].props.onClick();
    assert.equal(writes, 1);
    assert.equal(refreshed, 1);
    view.unmount();
    const denied = await mount(queueSource, "OfflineUtrQueueTab", bindings, {
      ...props,
      canReview: false,
    });
    denied.render();
    await flush();
    const button = denied
      .render()
      .find((node) => node.type === "button" && node.props.children.includes("Approve & Credit"));
    assert.equal(button.props.disabled, true);
    button.props.onClick();
    const blockedReview = denied.render().find((node) => node.type === "Modal");
    await blockedReview.props.footer.props.children[1].props.onClick();
    assert.equal(writes, 1);
    denied.unmount();
  });

  const captured = {
    id: "fee-row-99",
    feePaymentId: 99,
    gatewayTransactionId: 142,
    gatewayStatus: "Captured",
    status: "Paid",
    amount: 300,
    studentName: "Fixture Student",
    studentId: 11,
    admissionNo: "TEST-11",
    receiptNo: "TEST-REC",
    orderId: "order_fixture",
    method: "UPI",
    reference: "pay_fixture",
  };

  test("reversal eligibility uses only accounting roles, captured status and explicit gateway primary IDs", () => {
    for (const role of ["Admin", "Super Admin", "SuperAdmin", "Principal", "Accountant", "Finance"])
      assert(hasPaymentReversalRole({ role }));
    for (const role of ["Student", "Parent", "Teacher", "FinanceAssistant", "AdminGuest"])
      assert.equal(hasPaymentReversalRole({ role }), false);
    assert(hasPaymentReversalRole({ roles: [{ roleName: "Finance" }] }));
    assert(canReversePayment(captured, true));
    assert.equal(canReversePayment(captured, false), false);
    for (const status of ["Created", "Pending", "Failed", "Reversed", "Refunded", "Paid"])
      assert.equal(canReversePayment({ ...captured, gatewayStatus: status }, true), false);
    for (const row of [
      { id: 142 },
      { feePaymentId: 142 },
      { receiptId: 142 },
      { transactionId: "pay_fixture" },
      { gatewayTransactionId: 0 },
    ])
      assert.equal(gatewayTransactionIdFor(row), null);
    assert.equal(gatewayTransactionIdFor({ TransactionId: 142 }), 142);
    assert.equal(canReversePayment({ ...captured, isReversed: true }, true), false);
    assert.throws(() => reversalPayload({ transactionId: 142, reason: "....." }), /meaningful/);
    assert.throws(() => reversalPayload({ transactionId: 142, reason: "why" }), /5 characters/);
  });

  test("reversal API sends the documented payload, cannot use mock success or replay a network failure", async () => {
    let call,
      calls = 0;
    adapter((config) => {
      call = config;
      return { success: true, data: { receiptNumber: "TEST-REC", amount: 300 } };
    });
    const result = await api.reverse({ transactionId: 142, reason: "  Duplicate collection  " });
    assert.equal(result.success, true);
    assert.equal(call.url, "/api/v1/fee-payments/gateway/reverse");
    assert.deepEqual(JSON.parse(call.data), { transactionId: 142, reason: "Duplicate collection" });
    assert.equal(call.skipNetworkRetry, true);
    assert.equal(call.requireRealBackend, true);
    client.defaults.adapter = async (config) => {
      calls++;
      throw { config, code: "ERR_NETWORK", message: "Network Error" };
    };
    await assert.rejects(api.reverse({ transactionId: 142, reason: "Duplicate collection" }));
    assert.equal(calls, 1);
    adapter(() => ({ success: false, message: "Only captured payments can be reversed" }));
    await assert.rejects(
      api.reverse({ transactionId: 142, reason: "Duplicate collection" }),
      /Only captured/,
    );
  });

  const reversalSource = await readFile(
    new URL("../components/PaymentReversalModal.jsx", import.meta.url),
    "utf8",
  );
  const reversalConfirm = (tree) => tree[0].props.footer.props.children[1];
  test("reversal requires explicit confirmation and a reason; duplicate clicks submit exactly once", async () => {
    let calls = 0,
      resolve,
      refreshed = 0,
      closed = 0,
      payload;
    const view = await mount(
      reversalSource,
      "PaymentReversalModal",
      {
        feePaymentGatewayApi: {
          reverse: async (data) => {
            calls++;
            payload = data;
            return new Promise((done) => {
              resolve = done;
            });
          },
        },
      },
      {
        transaction: captured,
        authorized: true,
        onClose: () => {
          closed++;
        },
        onSuccess: () => {
          refreshed++;
        },
        onAttemptState() {},
      },
    );
    let tree = view.render();
    assert.equal(calls, 0);
    assert(tree.some((node) => node.props?.role === "alert"));
    await reversalConfirm(tree).props.onClick();
    assert.equal(calls, 0);
    tree = view.render();
    tree
      .find((node) => node.props?.id === "payment-reversal-reason")
      .props.onChange({ target: { value: "Duplicate collection" } });
    const button = reversalConfirm(view.render());
    const first = button.props.onClick();
    button.props.onClick();
    assert.equal(calls, 1);
    assert.equal(payload.transactionId, 142);
    assert.equal(refreshed, 0);
    resolve({ success: true, receiptNumber: "TEST-REC", amount: 300 });
    await first;
    await button.props.onClick();
    assert.equal(calls, 1);
    assert.equal(refreshed, 1);
    assert.equal(closed, 1);
    view.unmount();
  });
  test("reversal preserves backend validation errors and blocks uncertain outcomes", async () => {
    let calls = 0,
      state;
    const bindings = {
      feePaymentGatewayApi: {
        reverse: async () => {
          calls++;
          throw { response: { status: 400, data: { message: "Already reversed on server" } } };
        },
      },
    };
    const props = {
      transaction: captured,
      authorized: true,
      onClose() {},
      onSuccess: () => assert.fail("unconfirmed reversal"),
      onAttemptState: (_id, value) => {
        state = value;
      },
    };
    const view = await mount(reversalSource, "PaymentReversalModal", bindings, props);
    view
      .render()
      .find((node) => node.props?.id === "payment-reversal-reason")
      .props.onChange({ target: { value: "Duplicate collection" } });
    await reversalConfirm(view.render()).props.onClick();
    assert.equal(calls, 1);
    assert.equal(state, "rejected");
    assert(
      view.render().some((node) => node.props?.children?.includes("Already reversed on server")),
    );
    view.unmount();
    const uncertainView = await mount(
      reversalSource,
      "PaymentReversalModal",
      {
        feePaymentGatewayApi: {
          reverse: async () => {
            calls++;
            throw { code: "ERR_NETWORK", message: "Network Error" };
          },
        },
      },
      props,
    );
    uncertainView
      .render()
      .find((node) => node.props?.id === "payment-reversal-reason")
      .props.onChange({ target: { value: "Duplicate collection" } });
    await reversalConfirm(uncertainView.render()).props.onClick();
    assert.equal(state, "uncertain");
    const button = reversalConfirm(uncertainView.render());
    assert(button.props.disabled);
    await button.props.onClick();
    assert.equal(calls, 2);
    uncertainView.unmount();
    const denied = await mount(reversalSource, "PaymentReversalModal", bindings, {
      ...props,
      authorized: false,
    });
    await reversalConfirm(denied.render()).props.onClick();
    assert.equal(calls, 2);
    denied.unmount();
  });
  test("unmount aborts an in-flight reversal and discards stale success", async () => {
    let signal,
      resolve,
      success = 0;
    const view = await mount(
      reversalSource,
      "PaymentReversalModal",
      {
        feePaymentGatewayApi: {
          reverse: (_data, value) => {
            signal = value;
            return new Promise((done) => {
              resolve = done;
            });
          },
        },
      },
      {
        transaction: captured,
        authorized: true,
        onClose() {},
        onSuccess: () => {
          success++;
        },
        onAttemptState() {},
      },
    );
    view
      .render()
      .find((node) => node.props?.id === "payment-reversal-reason")
      .props.onChange({ target: { value: "Duplicate collection" } });
    const first = reversalConfirm(view.render()).props.onClick();
    view.unmount();
    assert(signal.aborted);
    resolve({ success: true, amount: 300 });
    await first;
    assert.equal(success, 0);
  });

  test("mobile links must match the fee account/order; exact backend URLs are retained", () => {
    const link =
      "https://fees.example.test/student/fees/pay/41?orderId=order_fixture&token=a%2Bb%3D";
    assert.equal(mobilePaymentLinkFor(link, order), link);
    for (const value of [
      undefined,
      "javascript:alert(1)",
      "//example.test/pay",
      "http://localhost:5173/student/fees/pay/41?orderId=order_fixture",
      "http://127.0.0.1/student/fees/pay/41?orderId=order_fixture",
      link.replace("/41?", "/42?"),
      link.replace("order_fixture", "other"),
      link + "&orderId=other",
      link.replace("https://", "https://user:password@"),
    ])
      assert.equal(mobilePaymentLinkFor(value, order), "");
  });
  test("mobile clipboard copies exactly the backend URL and reports denied clipboard access", async () => {
    const link =
      "https://fees.example.test/student/fees/pay/41?orderId=order_fixture&token=a%2Bb%3D";
    let copied,
      rejectCopy = false;
    const view = await mount(
      gatewaySource,
      "GatewayPaymentPanel",
      {
        navigator: {
          clipboard: {
            writeText: async (value) => {
              if (rejectCopy) throw new Error("Denied");
              copied = value;
            },
          },
        },
        feePaymentGatewayApi: {
          createOrder: async () => ({
            ...order,
            currency: "INR",
            qrCodeBase64: "data:image/png;base64,AAAA",
            upiUri: "upi://pay?fixture",
            paymentLink: link,
          }),
        },
        usePaymentPolling: () => ({ status: "PENDING", secondsLeft: 600 }),
      },
      {
        mode: "UPI_QR",
        account,
        target: "schedules",
        selectedIds: [101],
        amount: 300,
        onSaved() {},
        onPending() {},
        onLockChange() {},
      },
    );
    view
      .render()
      .find((node) => node.type === "button")
      .props.onClick();
    await flush();
    let tree = view.render();
    assert.equal(tree.find((node) => node.props?.id === "gateway-mobile-link").props.value, link);
    await tree
      .find(
        (node) =>
          node.type === "button" && node.props.children.includes("Copy Mobile Payment Link"),
      )
      .props.onClick();
    assert.equal(copied, link);
    assert(
      view.render().some((node) => node.props?.children?.includes("Mobile payment link copied.")),
    );
    rejectCopy = true;
    tree = view.render();
    await tree
      .find(
        (node) =>
          node.type === "button" && node.props.children.includes("Copy Mobile Payment Link"),
      )
      .props.onClick();
    assert(
      view
        .render()
        .some(
          (node) =>
            node.props?.role === "alert" &&
            node.props.children.some((value) =>
              String(value).includes("Clipboard access was denied"),
            ),
        ),
    );
    view.unmount();
  });
  test("repeated or settled installment rows never double-count selected outstanding balances", () => {
    const duplicate = {
      ...account,
      installments: [
        account.installments[0],
        account.installments[0],
        account.installments[1],
        account.installments[2],
      ],
    };
    assert.equal(pendingInstallments(duplicate).length, 2);
    assert.deepEqual(
      collectionPayload(duplicate, "schedules", [101, 101, 102], 700).feeInstallmentIds,
      [101, 102],
    );
    assert.throws(() => collectionPayload(duplicate, "schedules", [101, 102], 701), /balance/);
    assert.equal(
      pendingInstallments({
        installments: [account.installments[0], { ...account.installments[0], status: "Paid" }],
      }).length,
      0,
    );
    assert.equal(
      pendingInstallments({
        installments: [account.installments[0], { ...account.installments[0], balance: 290 }],
      }).length,
      0,
    );
  });
  const { deriveAccount } = await server.ssrLoadModule("/src/data/feeManagementData.js");
  const normalizationContext = vm.createContext({
    deriveAccount,
    COLLEGE_NAME: "Fixture College",
    todayISO: () => "2026-11-09",
    formatDate: String,
    formatCurrency: String,
    gatewayTransactionIdFor,
    isReversedPayment,
  });
  vm.runInContext(
    pageSource.slice(
      pageSource.indexOf("const getCollection ="),
      pageSource.indexOf("const printFeeTarget ="),
    ) +
      ";globalThis.normalizers = { normalizeTransactionRows, normalizeFeeAccountRows, normalizeReceipt, paymentHistoryIdentity, applyFineRulesToAccount };",
    normalizationContext,
  );
  const normalizers = normalizationContext.normalizers;
  test("backend installment balances and overdue statuses survive Admin normalization", () => {
    const raw = {
      studentId: 11,
      studentFeeId: 41,
      totalPayable: 200,
      totalPaid: 20,
      balance: 170,
      status: "Overdue",
      installments: [
        {
          feeInstallmentId: 101,
          amount: 200,
          paidAmount: 20,
          balanceAmount: 170,
          dueDate: "2099-01-01",
          status: "Overdue",
        },
      ],
    };
    const [normalized] = normalizers.normalizeFeeAccountRows([raw]);
    assert.equal(normalized.installments[0].balance, 170);
    assert.equal(normalized.installments[0].status, "Overdue");
    assert(backendOverdue(normalized));
    const [pending] = normalizers.normalizeFeeAccountRows([
      {
        ...raw,
        status: "Pending",
        installments: [{ ...raw.installments[0], status: "Pending", dueDate: "2000-01-01" }],
      },
    ]);
    assert.equal(pending.installments[0].status, "Pending");
    assert.equal(backendOverdue(pending), false);
    const withFine = normalizers.applyFineRulesToAccount({ ...pending, feeItems: [{ id: "7", type: "Course Fee", payableAmount: 200 }] }, [{ id: "fine-rule", feeTypeId: "7", feeTypeName: "Course Fee", status: "Active", fineAmount: 10, fineType: "Fixed Amount", gracePeriod: 0 }]);
    assert.equal(withFine.totalFine, 10);
    assert.equal(withFine.feeStatus, "Pending");
  });
  test("gateway IDs stay distinct from fee payment IDs and reversed receipts remain historical", () => {
    const [row] = normalizers.normalizeTransactionRows([
      { feePaymentId: 99, transactionId: 142, status: "Captured", amount: 300 },
    ]);
    assert.equal(row.feePaymentId, 99);
    assert.equal(row.gatewayTransactionId, 142);
    assert(canReversePayment(row, true));
    const [withoutGateway] = normalizers.normalizeTransactionRows([
      { feePaymentId: 99, id: 142, status: "Captured", amount: 300 },
    ]);
    assert.equal(canReversePayment(withoutGateway, true), false);
    const receipt = normalizers.normalizeReceipt(
      { receiptNumber: "TEST-REC", amount: 300, status: "Paid" },
      { ...row, status: "Reversed", isReversed: true },
    );
    assert.equal(receipt.status, "Reversed");
    assert.equal(receipt.amount, 300);
  });

  test("history hides Reverse for unauthorized, settled or unrelated-ID rows and preserves receipt actions", async () => {
    let chosen;
    const historySource = pageSource.slice(
      pageSource.indexOf("function HistoryTab"),
      pageSource.indexOf("/* -------------------------------- Page"),
    );
    const bindings = {
      PAGE_SIZE: 5,
      pageItems: (items, page) => items.slice((page - 1) * 5, page * 5),
      paymentHistoryIdentity: normalizers.paymentHistoryIdentity,
      formatFeeDate: String,
      feeScheduleLabel: String,
      Printer: "Printer",
      Search3DIcon: "SearchIcon",
      ReceiptText: "ReceiptText",
      PaymentStatusBadge: "PaymentBadge",
      TablePagination: "Pagination",
    };
    const props = {
      transactions: [captured],
      onReceipt() {},
      reversalAuthorized: false,
      onReverse: (row) => {
        chosen = row;
      },
    };
    const denied = await mount(historySource, "HistoryTab", bindings, props);
    assert(
      !denied
        .render()
        .some((node) => node.type === "button" && node.props.children.includes("Reverse Payment")),
    );
    denied.unmount();
    const allowed = await mount(historySource, "HistoryTab", bindings, {
      ...props,
      reversalAuthorized: true,
    });
    let tree = allowed.render();
    assert(tree.some((node) => node.props?.title === "View receipt"));
    tree
      .find((node) => node.type === "button" && node.props.children.includes("Reverse Payment"))
      .props.onClick();
    assert.equal(chosen.gatewayTransactionId, 142);
    allowed.unmount();
    for (const transaction of [
      { ...captured, isReversed: true, status: "Reversed" },
      { ...captured, gatewayTransactionId: null },
      { ...captured, gatewayStatus: "Captured", status: "Failed" },
    ]) {
      const view = await mount(historySource, "HistoryTab", bindings, {
        ...props,
        transactions: [transaction],
        reversalAuthorized: true,
      });
      tree = view.render();
      assert(
        !tree.some(
          (node) => node.type === "button" && node.props.children.includes("Reverse Payment"),
        ),
      );
      assert(tree.some((node) => node.props?.title === "View receipt"));
      view.unmount();
    }
  });
  test("student fee details warn only on explicit backend overdue status", async () => {
    const source = pageSource.slice(
      pageSource.indexOf("function StudentFeeAccountScreen"),
      pageSource.indexOf("/* ----------------------------- Student ledger"),
    );
    const bindings = {
      Printer: "Printer",
      WalletCards: "WalletCards",
      Eye: "Eye",
      AlertCircle: "AlertCircle",
      StatusBadge: "StatusBadge",
      PaymentStatusBadge: "PaymentStatusBadge",
      feeScheduleLabel: String,
    };
    const base = {
      ...account,
      feeItems: [],
      transactions: [],
      backendFeeStatus: "Pending",
      installments: [
        { ...account.installments[0], dueDate: "2000-01-01", backendStatus: "Pending" },
      ],
    };
    const pendingView = await mount(source, "StudentFeeAccountScreen", bindings, {
      account: base,
      onClose() {},
      onCollect() {},
      onReceipt() {},
    });
    assert(
      !pendingView.render().some((node) => node.props?.className === "cms-fee-overdue-warning"),
    );
    pendingView.unmount();
    const overdueView = await mount(source, "StudentFeeAccountScreen", bindings, {
      account: { ...base, backendFeeStatus: "Overdue" },
      onClose() {},
      onCollect() {},
      onReceipt() {},
    });
    assert(
      overdueView.render().some((node) => node.props?.className === "cms-fee-overdue-warning"),
    );
    overdueView.unmount();
  });

  test("mismatched reversal confirmation does not update balances or report success", async () => {
    let state;
    const view = await mount(
      reversalSource,
      "PaymentReversalModal",
      { feePaymentGatewayApi: { reverse: async () => ({ success: true, amount: 301 }) } },
      {
        transaction: captured,
        authorized: true,
        onClose() {},
        onSuccess: () => assert.fail("mismatched reversal"),
        onAttemptState: (_id, value) => {
          state = value;
        },
      },
    );
    view
      .render()
      .find((node) => node.props?.id === "payment-reversal-reason")
      .props.onChange({ target: { value: "Duplicate collection" } });
    await reversalConfirm(view.render()).props.onClick();
    assert.equal(state, "uncertain");
    assert(reversalConfirm(view.render()).props.disabled);
    view.unmount();
  });

  test("legacy Accountant requests retain their existing mock and retry configuration", async () => {
    // No requireRealBackend flag: the pre-existing mock-session adapter still applies.
    let networkCalls = 0;
    adapter(() => {
      networkCalls++;
      return {};
    });
    const response = await client.get("/api/v1/fees/collection");
    assert.equal(networkCalls, 0);
    assert.equal(response.config.requireRealBackend, undefined);
  });
});
