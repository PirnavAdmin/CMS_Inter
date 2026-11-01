import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Children, Fragment, createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let DataTable;
let PaginatedTable;
let Pagination;
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  DataTable = (await server.ssrLoadModule("/src/components/common/DataTable.jsx")).default;
  PaginatedTable = (await server.ssrLoadModule("/src/components/common/PaginatedTable.jsx")).default;
  Pagination = (await server.ssrLoadModule("/src/components/common/Ui.jsx")).Pagination;
});
after(async () => server?.close());

const records = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, name: `Record ${index + 1}` }));
const rows = records.map((record) => h("tr", { key: record.id }, h("td", null, record.name)));
const bodyRows = (html) => (html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1].match(/<tr\b/g) || []).length;

test("shared data tables show five records and retain the complete total", () => {
  const html = renderToStaticMarkup(h(DataTable, { columns: [{ key: "name", label: "Name" }], rows: records }));
  assert.equal(bodyRows(html), 5);
  assert.match(html, /of 12 records/);
  assert.doesNotMatch(html, />Record 6</);
  assert.equal(records.length, 12);
});

test("custom tables paginate nested fragments without dropping the total", () => {
  const html = renderToStaticMarkup(h(PaginatedTable, { className: "existing-table" },
    h("tbody", null, h(Fragment, null, rows))));
  assert.equal(bodyRows(html), 5);
  assert.match(html, /existing-table/);
  assert.match(html, /of 12 records/);
});

test("empty tables keep their empty state and report zero records", () => {
  const html = renderToStaticMarkup(h(PaginatedTable, null,
    h("tbody", null, h("tr", null, h("td", { colSpan: 4 }, "No records")))));
  assert.match(html, /No records/);
  assert.match(html, /of 0 records/);
});

test("already-paged tables do not acquire a second pager", () => {
  const html = renderToStaticMarkup(h(PaginatedTable, { paginate: false }, h("tbody", null, rows.slice(5, 10))));
  assert.equal(bodyRows(html), 5);
  assert.match(html, /Record 6/);
  assert.doesNotMatch(html, /aria-label="Pagination"/);
});

test("shared pager advances, goes back, and clamps the last page", () => {
  const changes = [];
  const buttons = (page) => Children.toArray(Pagination({ currentPage: page, totalRecords: 12, onPageChange: (next) => changes.push(next) }).props.children)
    .filter((child) => child?.type === "button");
  const first = buttons(1);
  assert.equal(first[0].props.disabled, true);
  first.at(-1).props.onClick();
  const second = buttons(2);
  second[0].props.onClick();
  second.at(-1).props.onClick();
  assert.deepEqual(changes, [2, 1, 3]);
  assert.equal(buttons(99).at(-1).props.disabled, true);
});
