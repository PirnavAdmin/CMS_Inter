import test from "node:test";
import assert from "node:assert/strict";
import { maskProfileValue, profileCollections, profileDate, profileDocumentUrl, profileJson, profileValue, validateProfileDocument } from "./accountantProfileData.js";

test("maps actual profile aliases and preserves zero values without dummy defaults", () => {
  assert.equal(profileValue({ MiddleName: "Example" }, "middleName"), "Example");
  assert.equal(profileValue({ Experience: 0 }, "experience"), 0);
  assert.equal(profileValue({}, "bankName"), "");
});
test("reads nested and JSON bank, experience and document data", () => {
  const result = profileCollections({ BankDetailsJson: '{"bankName":"Bank"}', ExperienceJson: '[{"institution":"Employer"}]', DocumentsJson: '[{"type":"Certificate","url":"/uploads/cert.pdf"}]' });
  assert.equal(result.bank.bankName, "Bank");
  assert.equal(result.experience[0].institution, "Employer");
  assert.equal(result.documents[0].type, "Certificate");
  assert.equal(profileCollections({ bankDetails: { bankName: "Nested" } }).bank.bankName, "Nested");
  assert.equal(profileCollections({ ExperienceList: [{ organization: "Employer" }] }).experience[0].organization, "Employer");
  assert.equal(profileCollections({ DocumentsList: [{ type: "Resume" }] }).documents[0].type, "Resume");
});
test("invalid JSON and missing collections do not fabricate records or crash", () => {
  assert.deepEqual(profileCollections({ experienceJson: "broken", documentsJson: "broken" }), { bank: {}, experience: [], documents: [] });
  assert.equal(profileJson("broken", null), null);
});
test("handles document maps from the staff API", () => {
  assert.deepEqual(profileCollections({ documents: { Certificate: "/uploads/cert.pdf" } }).documents, [{ type: "Certificate", url: "/uploads/cert.pdf", name: "Certificate" }]);
});
test("masks sensitive account and identity fields", () => {
  const masked = maskProfileValue("123456789012");
  assert(masked.endsWith("9012"));
  assert(!masked.includes("12345678"));
  assert.equal(maskProfileValue(null), "");
});
test("document URLs stay on the configured backend and reject unsafe schemes", () => {
  const base = "https://college.example";
  assert.equal(profileDocumentUrl("/uploads/cert.pdf", base), `${base}/uploads/cert.pdf`);
  for (const path of ["javascript:alert(1)", "data:text/html,test", "https://unrelated.example/file", "https://user:secret@college.example/file", "//unrelated.example/file"]) assert.equal(profileDocumentUrl(path, base), "");
});
test("document validation enforces the existing API's types and size limit", () => {
  assert.equal(validateProfileDocument({ name: "proof.pdf", size: 1024 }, "Certificate"), "");
  assert.equal(validateProfileDocument({ name: "photo.PNG", size: 1024 }, "Identity"), "");
  assert(validateProfileDocument({ name: "unsafe.exe", size: 1024 }, "Certificate"));
  assert(validateProfileDocument({ name: "large.pdf", size: 11 * 1024 * 1024 }, "Certificate"));
  assert(validateProfileDocument({ name: "empty.pdf", size: 0 }, "Certificate"));
  assert(validateProfileDocument(null, "Certificate"));
  assert(validateProfileDocument({ name: "proof.pdf", size: 1024 }, " "));
});
test("invalid or missing dates remain unavailable", () => {
  assert.equal(profileDate("not-a-date"), "");
  assert.equal(profileDate(null), "");
  assert(profileDate("2026-10-22").includes("2026"));
});
