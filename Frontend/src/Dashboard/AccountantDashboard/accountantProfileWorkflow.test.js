import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { transformWithOxc } from "vite";
import * as data from "./accountantProfileData.js";
import { editableProfileFields, updateProfileField } from "./accountantProfileEditing.js";

test("Accountant steps retain edits, manage documents, open photo options and preserve password modal", async () => {
  const source = fs.readFileSync(new URL("./pages/AccountantProfileContent.jsx", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "").replace("export default function", "function");
  const { code } = await transformWithOxc(source, "View.jsx", { jsx: { runtime: "classic" } });
  let hooks = [], cursor = 0, pending = [], listeners = {}, clicks = 0, confirmed = false;
  const useState = initial => {
    const index = cursor++;
    hooks[index] ??= { value: initial };
    return [hooks[index].value, input => { hooks[index].value = typeof input === "function" ? input(hooks[index].value) : input; }];
  };
  const useRef = initial => { const index = cursor++; return hooks[index] ?? (hooks[index] = { current: initial }); };
  const useEffect = (fn, deps) => {
    const index = cursor++;
    if (!hooks[index] || deps.some((input, position) => input !== hooks[index].deps[position])) pending.push(() => { hooks[index]?.cleanup?.(); hooks[index] = { deps, cleanup: fn() }; });
  };
  const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }), Fragment: "Fragment" };
  const document = { activeElement: { focus() {} }, body: { style: { overflow: "" } }, getElementById: () => ({ reportValidity: () => true }), addEventListener: (key, fn) => { listeners[key] = fn; }, removeEventListener: key => { delete listeners[key]; } };
  const calls = [];
  const apiClient = {
    post: async (url, payload) => { calls.push(["POST", url, payload]); return { data: { status: true } }; },
    delete: async url => { calls.push(["DELETE", url]); return { data: { status: true } }; },
  };
  const context = vm.createContext({
    React, useState, useRef, useEffect, useId: () => ":field:", createPortal: input => input, document,
    window: { confirm: () => confirmed }, FormData, apiClient,
    apiEndpoints: { faculty: { uploadDocument: id => `staff/${id}/documents/upload`, deleteDocument: (id, type) => `staff/${id}/documents/${encodeURIComponent(type)}` } },
    getApiErrorMessage: error => error.message, env: { apiBaseUrl: "https://college.example" }, ...data, value: data.profileValue,
    AccountantProfilePhotoEditor: "PhotoEditor", AccountantProfilePhotoActions: "PhotoActions",
    ...Object.fromEntries(["Camera", "Check", "ChevronLeft", "ChevronRight", "Edit3", "Lock", "Save", "X"].map(key => [key, key])),
  });
  vm.runInContext(`${code};globalThis.Component=AccountantProfileContent`, context);
  const staff = { bankDetails: { bankName: "Bank", accountNumber: "123456789012" }, documents: [{ type: "Resume", url: "/uploads/resume.pdf" }] };
  const props = {
    staff, staffId: 42, display: { fullName: "Actual Accountant", employeeId: "MNT42" }, initials: "AA",
    fileInputRef: { current: { click() { clicks++; } } },
    form: { firstName: "Actual", lastName: "Accountant", email: "a@example.com", mobile: "9876543210", ...editableProfileFields(staff) },
    onChange: field => event => { props.form = updateProfileField(props.form, field, event.target.value); },
    resetPassword() {}, onDocumentsChanged: async () => { staff.documents = []; }, EditableField: "EditableField", securityForm: React.createElement("form"), editing: false,
  };
  let tree;
  const render = () => { cursor = 0; pending = []; tree = context.Component(props); pending.forEach(fn => fn()); };
  const nodes = node => node && typeof node === "object" ? [node, ...(node.props?.children || []).flatMap(nodes)] : [];
  const text = node => typeof node === "string" ? node : (node?.props?.children || []).map(text).join(" ");
  const find = predicate => nodes(tree).find(predicate);
  const button = label => find(node => node.type === "button" && text(node).trim() === label);
  const field = label => find(node => node.type === "EditableField" && node.props.label === label);
  render();
  const protectedField = find(node => typeof node.type === "function" && node.props.label === "Employee / Staff ID");
  assert.equal(protectedField.type(protectedField.props).props.children[1].props.disabled, true);
  button("Bank Info").props.onClick(); render();
  assert.equal(field("Bank Name").props.editing, false);
  assert(!field("Account Number").props.value.includes("12345678"));
  props.editing = true; render();
  assert.equal(field("Bank Name").props.editing, true);
  field("Bank Name").props.onChange({ target: { value: "Draft bank" } }); render();
  button("Next").props.onClick(); render();
  field("Current Address").props.onChange({ target: { value: "Draft address" } }); render();
  assert.equal(field("City").props.editing, true);
  button("Next").props.onClick(); render(); button("Add Experience").props.onClick(); render();
  field("Employer (1)").props.onChange({ target: { value: "Draft employer" } }); render();
  field("Designation (1)").props.onChange({ target: { value: "Accountant" } }); render();
  button("Next").props.onClick(); render();
  await button("Remove").props.onClick(); assert.equal(calls.length, 0);
  confirmed = true; await button("Remove").props.onClick(); render();
  assert.equal(calls[0][1], "staff/42/documents/Resume");
  find(node => node.props?.id === "accountant-document-type").props.onChange({ target: { value: "Certificate" } }); render();
  find(node => node.props?.id === "accountant-document-file").props.onChange({ target: { files: [new File(["proof"], "proof.pdf", { type: "application/pdf" })], value: "" } }); render();
  await button("Upload Document").props.onClick(); render();
  assert.equal(calls[1][2].get("DocumentType"), "Certificate"); assert.equal(calls[1][2].get("File").name, "proof.pdf");
  button("Next").props.onClick(); render();
  for (const draft of ["Draft bank", "Draft address", "Draft employer"]) assert(text(tree).includes(draft));
  button("Previous").props.onClick(); render(); button("Previous").props.onClick(); render();
  assert.equal(field("Employer (1)").props.value, "Draft employer");
  find(node => node.props?.["aria-label"] === "Change profile photo").props.onClick(); render();
  assert.equal(clicks, 0, "Camera opens the action menu before the file picker");
  find(node => node.type === "PhotoActions").props.onUpload(); assert.equal(clicks, 1);
  const select = file => { find(node => node.type === "input" && node.props.accept === "image/*").props.onChange({ target: { files: [file], value: "" } }); render(); };
  select(new File(["bad"], "bad.txt", { type: "text/plain" })); assert(text(tree).includes("valid image"));
  select({ name: "large.png", type: "image/png", size: 6 * 1024 * 1024 }); assert(text(tree).includes("5 MB"));
  select(new File(["image"], "image.png", { type: "image/png" })); assert(find(node => node.type === "PhotoEditor"));
  find(node => node.type === "PhotoEditor").props.onClose(); render(); assert.equal(find(node => node.type === "PhotoEditor"), undefined);
  button("Change Password").props.onClick(); render(); assert(find(node => node.props?.role === "dialog"));
  listeners.keydown({ key: "Escape" }); render(); assert.equal(find(node => node.props?.role === "dialog"), undefined);
});
