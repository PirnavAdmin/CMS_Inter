import test from "node:test";
import assert from "node:assert/strict";
import { editableProfileFields, profileContactPayload, profileDraftRequests, updateProfileField, validateProfileDraft } from "./accountantProfileEditing.js";

const staff = { id: 42, firstName: "Example", lastName: "Accountant", mobile: "9876543210", email: "example@college.test", currentAddress: "Saved address", alternateMobile: "9876543211", staffType: "Non-Teaching", departmentId: 7, bankDetails: { bankName: "Saved bank", accountNumber: "123456789012", basicSalary: 23456, panNumber: "ABCDE1234F" }, panNumber: "ABCDE1234F", experienceList: [{ organization: "Saved employer", designation: "Accountant", fromDate: "2020-01-01", toDate: "2022-01-01", totalYears: 2, roles: "Accounts" }] };
const form = source => ({ firstName: source.firstName, lastName: source.lastName, mobile: source.mobile, email: source.email, ...editableProfileFields(source) });

test("unchanged profiles produce no section writes or invented missing values", () => {
  assert.deepEqual(profileDraftRequests(staff, form(staff)), []);
  assert.equal(editableProfileFields(null).bank.bankName, "");
  assert.deepEqual(editableProfileFields(null).experience, []);
});
test("bank edits keep other sensitive bank fields and omit official employment fields", () => {
  const draft = updateProfileField(form(staff), "bank.bankName", "Updated bank");
  const requests = profileDraftRequests(staff, draft);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].sectionName, "Bank");
  assert.equal(requests[0].bank.basicSalary, 23456);
  assert.equal(requests[0].bank.accountNumber, staff.bankDetails.accountNumber);
  assert(!JSON.stringify(requests).includes("departmentId"));
  assert(!JSON.stringify(requests).includes("staffType"));
  assert.equal(staff.bankDetails.bankName, "Saved bank");
});
test("personal and address writes contain only changed supported fields", () => {
  let draft = updateProfileField(form(staff), "personal.maritalStatus", "Married");
  draft = updateProfileField(draft, "address.currentAddress", "New address");
  assert.deepEqual(profileDraftRequests(staff, draft), [{ sectionName: "Personal", personal: { maritalStatus: "Married" } }, { sectionName: "Address", address: { currentAddress: "New address" } }]);
  assert.equal(form(staff).address.currentAddress, "Saved address", "Cancel can reconstruct the saved baseline");
});
test("experience uses the backend organization/totalYears/roles schema", () => {
  const draft = form(staff);
  draft.experience[0].roles = "Payroll and accounts";
  const [request] = profileDraftRequests(staff, draft);
  assert.equal(request.sectionName, "Experience");
  assert.equal(request.experience[0].organization, "Saved employer");
  assert.equal(request.experience[0].totalYears, 2);
  assert.equal(request.experience[0].roles, "Payroll and accounts");
  assert.equal(staff.experienceList[0].roles, "Accounts");
});
test("validates changed identifiers and experience dates without blocking unchanged legacy data", () => {
  const legacy = { ...staff, panNumber: "legacy", bankDetails: { ...staff.bankDetails, ifscCode: "legacy" } };
  assert.equal(validateProfileDraft(legacy, form(legacy)), "");
  const draft = updateProfileField(form(staff), "bank.ifscCode", "invalid");
  assert(validateProfileDraft(staff, draft).includes("IFSC"));
  draft.bank.ifscCode = "SBIN0001234";
  assert.equal(validateProfileDraft(staff, draft), "");
  draft.experience[0].toDate = "2019-01-01";
  assert(validateProfileDraft(staff, draft).includes("end date"));
  draft.experience = [];
  assert(validateProfileDraft(staff, draft).includes("final experience"));
});
test("contact settings payload preserves existing address and emergency details", () => {
  const draft = form(staff); draft.mobile = "9876543212";
  assert.deepEqual(profileContactPayload(staff, draft), { fullName: "Example Accountant", mobile: "9876543212", personalEmail: staff.email, address: staff.currentAddress, emergencyContact: staff.alternateMobile });
});
test("bank writes cannot overwrite a simultaneous personal PAN change with the old bank PAN", () => {
  let draft = updateProfileField(form(staff), "personal.panNumber", "pqrst1234a");
  draft = updateProfileField(draft, "bank.bankName", "New bank");
  assert.equal(draft.personal.panNumber, "PQRST1234A");
  const requests = profileDraftRequests(staff, draft);
  assert.equal(requests[1].bank.panNumber, "PQRST1234A");
});
