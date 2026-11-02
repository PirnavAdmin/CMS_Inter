import assert from "node:assert/strict";
import test from "node:test";
import { appendReferralFields, mapAdmissionReferral } from "./admissionReferral.js";

const campuses = [{ value: "1" }, { value: "2" }];

test("referrals use the destination campus, retain source, and discard a previewed number", () => {
  const values = { admissionNo: "PREVIEW-001", firstName: "Test", photo: { name: "photo.png" } };
  const result = mapAdmissionReferral(values, "1", true, "2", campuses);
  assert.equal(result.campus, 2);
  assert.equal(result.sourceCampusId, 1);
  assert.equal(result.isReferral, true);
  assert.equal(result.admissionNo, "");
  assert.equal(result.photo, values.photo);
  assert.equal(values.admissionNo, "PREVIEW-001");
});

test("normal admissions use the current campus and retain their number", () => {
  const result = mapAdmissionReferral({ admissionNo: "NORMAL-001" }, 1, false, "", campuses);
  assert.equal(result.campus, 1);
  assert.equal(result.sourceCampusId, null);
  assert.equal(result.isReferral, false);
  assert.equal(result.admissionNo, "NORMAL-001");
});

test("referrals reject the current campus, missing or invalid destinations", () => {
  for (const target of ["", "1", 1, "3", "2x", "2.5"]) {
    assert.throws(() => mapAdmissionReferral({}, 1, true, target, campuses));
  }
  assert.throws(() => mapAdmissionReferral({}, "", true, "2", campuses));
});

test("multipart referral fields bind an empty number, never the string null", () => {
  const data = new FormData();
  data.append("AdmissionNo", "STALE-001");
  data.append("CampusId", "1");
  data.append("FirstName", "Test");
  appendReferralFields(data, mapAdmissionReferral({}, 1, true, 2, campuses));
  assert.equal(data.get("AdmissionNo"), "");
  assert.equal(data.get("CampusId"), "2");
  assert.equal(data.get("SourceCampusId"), "1");
  assert.equal(data.get("IsReferral"), "true");
  assert.equal(data.get("FirstName"), "Test");
  assert.equal(data.getAll("AdmissionNo").length, 1);
});

test("normal multipart admissions do not acquire referral metadata", () => {
  const data = new FormData();
  data.append("AdmissionNo", "NORMAL-001");
  appendReferralFields(data, mapAdmissionReferral({}, 1, false, "", campuses));
  assert.equal(data.get("IsReferral"), "false");
  assert.equal(data.has("SourceCampusId"), false);
  assert.equal(data.get("AdmissionNo"), "NORMAL-001");
});
