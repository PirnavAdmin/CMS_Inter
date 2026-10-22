import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
after(() => server.close());
const setup = await server.ssrLoadModule("/src/Dashboard/AccountantDashboard/accountantFeeSetup.js");
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

test("hostel permissions are isolated and transport uses its actual routes permission", () => {
  const hostel = permissions([{ module: "fee-management", screenId: "hostel-fees", actions: ["view", "edit"] }]);
  assert.equal(setup.feeSetupAccess(hostel, "hostel").edit, true);
  const transport = permissions([{ module: "transport", screenId: "routes", actions: ["view", "manage-routes", "edit"] }]);
  const access = setup.feeSetupAccess(transport, "transport");
  assert.deepEqual([access.view, access.create, access.edit, access.delete], [true, true, true, false]);
  assert.equal(setup.feeSetupAccess(feePermissions(["view", "create", "edit"]), "transport").view, false);
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
