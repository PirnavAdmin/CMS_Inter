import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { transformWithOxc } from "vite";

const source = fs.readFileSync(new URL("../components/AccountantPayrollRecords.jsx", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "").replace("export default function", "function");
const { code } = await transformWithOxc(source, "Payroll.jsx", { jsx: { runtime: "classic" } });
const records = count => Array.from({ length: count }, (_, index) => ({ staffName: `Staff ${index + 1}`, month: "October", amount: 10000 + index, status: index % 2 ? "Pending" : "Paid" }));

function renderPayroll(rows) {
  let hooks = [], cursor = 0, effects = [], tree;
  const props = { records: rows, formatAmount: amount => `INR ${amount}` };
  const context = vm.createContext({
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }), Fragment: "Fragment" },
    StudentDataTable: "PayrollTable",
    useState: initial => {
      const index = cursor++;
      hooks[index] ??= { value: initial };
      return [hooks[index].value, value => { hooks[index].value = typeof value === "function" ? value(hooks[index].value) : value; }];
    },
    useEffect: (fn, deps) => {
      const index = cursor++;
      if (!hooks[index] || deps.some((dep, position) => dep !== hooks[index].deps[position])) effects.push(() => { hooks[index] = { deps }; fn(); });
    },
  });
  vm.runInContext(`${code};globalThis.Component=AccountantPayrollRecords`, context);
  const render = () => { cursor = 0; effects = []; tree = context.Component(props); effects.forEach(fn => fn()); };
  const nodes = node => node && typeof node === "object" ? [node, ...(node.props?.children || []).flatMap(nodes)] : [];
  const text = node => typeof node === "string" || typeof node === "number" ? String(node) : (node?.props?.children || []).map(text).join("");
  const all = () => nodes(tree);
  const button = label => all().find(node => node.type === "button" && (node.props["aria-label"] === label || text(node) === label));
  render();
  return {
    table: () => all().find(node => node.type === "PayrollTable").props,
    all, button, text: () => text(tree),
    click: label => { const control = button(label); assert(control && !control.props.disabled); control.props.onClick(); render(); },
    replace: rows => { props.records = rows; render(); },
  };
}

test("23 records support Next, Previous, direct page selection, counts and boundary buttons", () => {
  const view = renderPayroll(records(23));
  assert.equal(view.table().rows.length, 5);
  assert.equal(view.table().rows[0]["Staff Member"], "Staff 1");
  assert(view.text().includes("Showing 1–5 of 23 records"));
  assert.equal(view.button("Previous").props.disabled, true);
  assert.equal(view.button("Page 1").props["aria-current"], "page");
  view.click("Next");
  assert.equal(view.table().rows[0]["Staff Member"], "Staff 6");
  view.click("Previous");
  assert.equal(view.table().rows[0]["Staff Member"], "Staff 1");
  view.click("Page 5");
  assert.equal(view.table().rows.length, 3);
  assert.equal(view.table().rows[0]["Staff Member"], "Staff 21");
  assert(view.text().includes("Showing 21–23 of 23 records"));
  assert.equal(view.button("Next").props.disabled, true);
  assert.equal(view.button("Page 5").props["aria-current"], "page");
});

test("every record appears once, preserving source order, amounts, columns and status mapping", () => {
  const source = records(23), snapshot = JSON.stringify(source), view = renderPayroll(source), seen = [];
  for (let page = 1; page <= 5; page++) {
    view.click(`Page ${page}`);
    for (const row of view.table().rows) seen.push(row["Staff Member"]);
  }
  assert.deepEqual(seen, source.map(row => row.staffName));
  assert.equal(new Set(seen).size, 23);
  assert.equal(JSON.stringify(source), snapshot);
  assert.equal(JSON.stringify(view.table().columns), JSON.stringify(["Staff Member", "Month", "Net Amount", "Status"]));
  assert.equal(JSON.stringify(view.table().statusColumns), "[3]");
  assert.equal(view.table().rows[0]["Net Amount"], "INR 10020");
  assert.equal(view.table().rows[0].Status, "Paid");
});

test("empty and single-page tables retain their empty state and omit navigation", () => {
  for (const count of [0, 1, 5]) {
    const view = renderPayroll(records(count));
    assert.equal(view.table().rows.length, count);
    assert.equal(view.table().empty, "No payroll records available.");
    assert.equal(view.all().some(node => node.type === "nav"), false);
    assert.equal(view.text().includes("Showing"), count > 0);
  }
  assert(renderPayroll(records(6)).button("Next"));
});

test("shrinking results clamp the selected page without an empty or stale page", () => {
  const view = renderPayroll(records(23));
  view.click("Page 5"); view.replace(records(7));
  assert.equal(view.table().rows.length, 2);
  assert.equal(view.button("Page 2").props["aria-current"], "page");
  assert(view.text().includes("Showing 6–7 of 7 records"));
  view.replace(records(23));
  assert.equal(view.button("Page 2").props["aria-current"], "page");
  view.replace([]); view.replace(records(23));
  assert.equal(view.button("Page 1").props["aria-current"], "page");
});
