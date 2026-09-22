import { useSyncExternalStore } from "react";

// Shared in-memory store. Holds rows for BOTH mock-data modules (no
// config.api) and API-backed modules. For API-backed modules, the page
// that fetches data (ListPage) must call setRows() after fetching so that
// getRow()/FormPage edit-prefill can find the record too.
const state = {};
const listeners = new Set();

const keyOf = (slug, secondary) => (secondary ? `${slug}::secondary` : slug);

export function configFor(config, secondary) {
  if (!config) return null;
  return secondary ? config.secondary : config;
}

function apiFor(config, secondary) {
  const cfg = configFor(config, secondary);
  return cfg?.api || null;
}

export function getRows(slug, secondary, config) {
  const k = keyOf(slug, secondary);
  if (!state[k]) {
    const cfg = configFor(config, secondary);
    state[k] = cfg?.api ? [] : cfg?.rows || [];
  }
  return state[k];
}

function set(slug, secondary, rows) {
  state[keyOf(slug, secondary)] = rows;
  listeners.forEach((fn) => fn());
}

// Lets a page (e.g. ListPage after an API fetch) push rows into the shared
// store, so getRow()/edit forms can find them too.

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useRows(slug, secondary, config) {
  const read = () => getRows(slug, secondary, config);
  return useSyncExternalStore(subscribe, read, read);
}

export function getRow(slug, secondary, id, config) {
  return getRows(slug, secondary, config).find((r) => String(r.id) === String(id)) || null;
}

export async function addRow(slug, secondary, values, config) {
  const api = apiFor(config, secondary);
  if (api?.create) {
    const res = await api.create(values);
    const created = api.mapRow ? api.mapRow(res.data) : { id: Date.now(), ...values };
    set(slug, secondary, [created, ...getRows(slug, secondary, config)]);
    return created;
  }
  const id = values.id ?? values.boardId ?? values.BoardId ?? Date.now();
  const created = values.created ?? values.createdDate ?? new Date().toISOString().split("T")[0];
  const row = { ...values, id, created };
  set(slug, secondary, [row, ...getRows(slug, secondary, config)]);
  return row;
}

export async function updateRow(slug, secondary, id, values, config) {
  const api = apiFor(config, secondary);
  if (api?.update) {
    const res = await api.update(id, values);
    const updated = api.mapRow ? api.mapRow(res.data) : values;
    set(
      slug,
      secondary,
      getRows(slug, secondary, config).map((r) => (String(r.id) === String(id) ? { ...r, ...updated } : r)),
    );
    return updated;
  }
  set(
    slug,
    secondary,
    getRows(slug, secondary, config).map((r) => (String(r.id) === String(id) ? { ...r, ...values } : r)),
  );
}

export async function deleteRow(slug, secondary, id, config) {
  const api = apiFor(config, secondary);
  if (api?.delete) {
    await api.delete(id);
  }
  set(slug, secondary, getRows(slug, secondary, config).filter((r) => String(r.id) !== String(id)));
}


