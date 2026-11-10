const hasFieldVal = (val) => {
  if (val === null || val === undefined) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (typeof val === "number") return !Number.isNaN(val);
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.keys(val).length > 0;
  return Boolean(val);
};

/**
 * Exact 1:1 mirror of Backend StaffService.CalculateCompletionPercentage(Staff)
 * so Sidebar "Profile Progress %", Header "% Profile Completed", Modal progress bar,
 * and Backend 50% submission gate always agree.
 */
export function calculateStaffProfileCompletion(data) {
  if (!data || typeof data !== "object") return 30;

  if (!hasFieldVal(data.firstName) && !hasFieldVal(data.lastName)) {
    const serverPct = Number(data.profileCompletionPercentage ?? data.profileCompletion ?? 0);
    if (serverPct > 0) return Math.min(100, Math.max(30, serverPct));
  }

  let score = 0;

  // 1. Basic & Personal Details (20%)
  const dobVal = data.dob || data.dateOfBirth;
  if (
    hasFieldVal(data.firstName) &&
    hasFieldVal(data.lastName) &&
    hasFieldVal(data.gender) &&
    hasFieldVal(dobVal) &&
    !String(dobVal).startsWith("0001-01-01")
  ) {
    score += 15;
  }
  if (
    hasFieldVal(data.aadhaar) ||
    hasFieldVal(data.pan || data.panNumber) ||
    hasFieldVal(data.fatherOrHusbandName || data.guardianName)
  ) {
    score += 5;
  }

  // 2. Contact & Address (15%)
  if (
    hasFieldVal(data.currentAddress) ||
    hasFieldVal(data.permanentAddress) ||
    hasFieldVal(data.houseNumber || data.address) ||
    hasFieldVal(data.street || data.streetArea)
  ) {
    score += 8;
  }
  if (
    hasFieldVal(data.city || data.cityVillage) &&
    hasFieldVal(data.state) &&
    hasFieldVal(data.pin || data.pincode)
  ) {
    score += 7;
  }

  // 3. Educational Qualifications (15%)
  const eduList = Array.isArray(data.educationList)
    ? data.educationList
    : Array.isArray(data.education)
      ? data.education
      : [];
  if (eduList.length > 0 || hasFieldVal(data.qualification || data.highestQualification)) {
    score += 15;
  }

  // 4. Experience (10% — matches backend fresher rule)
  score += 10;

  // 5. Documents Upload (15%)
  const rawDocs = Array.isArray(data.documents)
    ? data.documents
    : Array.isArray(data.documentsList)
      ? data.documentsList
      : [];
  const validDocs = rawDocs.filter(
    (d) => d && (hasFieldVal(d.type) || hasFieldVal(d.name) || hasFieldVal(d.url)),
  );
  if (validDocs.length >= 2) {
    score += 15;
  } else if (validDocs.length === 1) {
    score += 8;
  }

  // 6. Bank Details (15%)
  const acctNo = data.accountNumber || data.bankDetails?.accountNumber;
  const ifscCode = data.ifsc || data.ifscCode || data.bankDetails?.ifscCode;
  if (hasFieldVal(acctNo) && hasFieldVal(ifscCode)) {
    score += 15;
  }

  // 7. Emergency Contact (10%)
  const emName =
    data.contactName ||
    data.emergencyName ||
    data.emergencyContactName ||
    data.emergencyContact?.contactName;
  const emMobile =
    data.emergencyMobile ||
    data.emergencyContactPhone ||
    data.emergencyContact?.mobile;
  if (hasFieldVal(emName) && hasFieldVal(emMobile)) {
    score += 10;
  }

  return Math.min(100, Math.max(30, score));
}

export const LOCKED_ONBOARDING_STATUSES = new Set([
  "pendinglink",
  "linksent",
  "inprogress",
  "draft",
  "needscorrection",
  "changes required",
  "onboarding discontinued",
]);

export const UNLOCKED_ONBOARDING_STATUSES = new Set([
  "completed",
  "approved",
  "submitted",
  "pendingapproval",
  "underverification",
]);

/**
 * Unlocks portal modules once staff has submitted their >=50% profile
 * (Completed, Approved, Submitted, PendingApproval, UnderVerification).
 */
export function isStaffPortalUnlocked(profileStatus, isOnboardedFlag = false) {
  const statusClean = String(profileStatus || "").trim().toLowerCase();
  if (UNLOCKED_ONBOARDING_STATUSES.has(statusClean)) return true;
  if (!statusClean) return isOnboardedFlag === true;
  if (LOCKED_ONBOARDING_STATUSES.has(statusClean)) return false;
  return isOnboardedFlag === true;
}
