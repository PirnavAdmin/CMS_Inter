export const hasFieldVal = (val) => {
  if (val === null || val === undefined) return false;
  if (typeof val === "string") return val.trim().length > 0;
  if (typeof val === "number") return !Number.isNaN(val);
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.keys(val).length > 0;
  return Boolean(val);
};

/**
 * Institutional Mandatory Profile Checklist definition across all sections.
 * Every mandatory field must be complete before final submission is allowed.
 */
export const MANDATORY_PROFILE_FIELDS = [
  { key: "firstName", label: "First Name", step: 1, stepId: "personal", check: (d) => hasFieldVal(d.firstName) },
  { key: "lastName", label: "Last Name", step: 1, stepId: "personal", check: (d) => hasFieldVal(d.lastName) },
  { key: "gender", label: "Gender", step: 1, stepId: "personal", check: (d) => hasFieldVal(d.gender) },
  {
    key: "dob",
    label: "Date of Birth",
    step: 1,
    stepId: "personal",
    check: (d) => {
      const v = d.dob || d.dateOfBirth;
      return hasFieldVal(v) && !String(v).startsWith("0001-01-01");
    },
  },
  { key: "mobile", label: "Mobile Number", step: 1, stepId: "personal", check: (d) => hasFieldVal(d.mobile || d.phone) },
  { key: "email", label: "Email Address", step: 1, stepId: "personal", check: (d) => hasFieldVal(d.email) },
  {
    key: "aadhaar",
    label: "Aadhaar / National ID",
    step: 1,
    stepId: "personal",
    check: (d) => hasFieldVal(d.aadhaar) || hasFieldVal(d.pan || d.panNumber),
  },
  {
    key: "address",
    label: "Address (House/Street)",
    step: 2,
    stepId: "address",
    check: (d) => hasFieldVal(d.currentAddress) || hasFieldVal(d.permanentAddress) || hasFieldVal(d.houseNumber || d.address) || hasFieldVal(d.street),
  },
  { key: "city", label: "City / Town", step: 2, stepId: "address", check: (d) => hasFieldVal(d.city || d.cityVillage) },
  { key: "state", label: "State", step: 2, stepId: "address", check: (d) => hasFieldVal(d.state) },
  { key: "pincode", label: "Pincode", step: 2, stepId: "address", check: (d) => hasFieldVal(d.pin || d.pincode) },
  {
    key: "education",
    label: "Educational Qualification",
    step: 3,
    stepId: "education",
    check: (d) => {
      const eduList = Array.isArray(d.educationList) ? d.educationList : Array.isArray(d.education) ? d.education : [];
      return eduList.length > 0 || hasFieldVal(d.qualification || d.highestQualification);
    },
  },
  {
    key: "bankName",
    label: "Bank Name",
    step: 4,
    stepId: "bank",
    check: (d) => hasFieldVal(d.bankName || d.bankDetails?.bankName),
  },
  {
    key: "accountNumber",
    label: "Bank Account Number",
    step: 4,
    stepId: "bank",
    check: (d) => hasFieldVal(d.accountNumber || d.bankDetails?.accountNumber),
  },
  {
    key: "ifscCode",
    label: "Bank IFSC Code",
    step: 4,
    stepId: "bank",
    check: (d) => hasFieldVal(d.ifsc || d.ifscCode || d.bankDetails?.ifscCode),
  },
  {
    key: "emergencyContactName",
    label: "Emergency Contact Person",
    step: 6,
    stepId: "emergency",
    check: (d) => hasFieldVal(d.contactName || d.emergencyName || d.emergencyContactName || d.emergencyContact?.contactName),
  },
  {
    key: "emergencyContactMobile",
    label: "Emergency Contact Mobile",
    step: 6,
    stepId: "emergency",
    check: (d) => hasFieldVal(d.emergencyMobile || d.emergencyContactPhone || d.emergencyContact?.mobile),
  },
  {
    key: "documents",
    label: "Document / Certificate Upload",
    step: 5,
    stepId: "documents",
    check: (d) => {
      const rawDocs = Array.isArray(d.documents) ? d.documents : Array.isArray(d.documentsList) ? d.documentsList : [];
      const valid = rawDocs.filter((doc) => doc && (hasFieldVal(doc.type) || hasFieldVal(doc.name) || hasFieldVal(doc.url)));
      return valid.length >= 1 || hasFieldVal(d.photoUrl || d.profilePhoto || d.photoPath);
    },
  },
];

/**
 * Returns a list of all missing mandatory profile fields for the staff member.
 */
export function getMissingMandatoryFields(data) {
  if (!data || typeof data !== "object") {
    return MANDATORY_PROFILE_FIELDS.map((f) => ({ key: f.key, label: f.label, step: f.step, stepId: f.stepId }));
  }

  const missing = [];
  for (const field of MANDATORY_PROFILE_FIELDS) {
    if (!field.check(data)) {
      missing.push({ key: field.key, label: field.label, step: field.step, stepId: field.stepId });
    }
  }

  // Conditional: Driving license required ONLY if staff is driver
  const isDriver = data.isDriver === true ||
    String(data.designation || "").toLowerCase().includes("driver") ||
    String(data.role || "").toLowerCase().includes("driver");
  if (isDriver) {
    if (!hasFieldVal(data.drivingLicenseNumber)) {
      missing.push({
        key: "drivingLicenseNumber",
        label: "Driving License Number",
        step: 1,
        stepId: "personal",
      });
    }
  }

  return missing;
}

/**
 * Checks if every single mandatory profile field is completed.
 */
export function isAllMandatoryFieldsComplete(data) {
  return getMissingMandatoryFields(data).length === 0;
}

/**
 * Exact 1:1 mirror of Backend StaffService.CalculateCompletionPercentage(Staff)
 * Reaches 100% when all mandatory profile fields and onboarding sections are completed.
 */
export function calculateStaffProfileCompletion(data) {
  if (!data || typeof data !== "object") return 0;

  if (data._isDetailedLoaded === false || (!hasFieldVal(data.firstName) && !hasFieldVal(data.lastName))) {
    const serverPct = Number(data.profileCompletionPercentage ?? data.profileCompletion ?? 0);
    if (serverPct > 0) return Math.min(100, Math.max(0, serverPct));
  }

  const totalMandatory = MANDATORY_PROFILE_FIELDS.length;
  const missing = getMissingMandatoryFields(data);
  const completedCount = totalMandatory - missing.length;

  if (missing.length === 0) {
    return 100;
  }

  const pct = Math.round((completedCount / totalMandatory) * 100);
  return Math.min(95, Math.max(10, pct));
}

export const LOCKED_ONBOARDING_STATUSES = new Set([
  "pendinglink",
  "linksent",
  "inprogress",
  "draft",
  "needscorrection",
  "changes required",
  "onboarding discontinued",
  "submitted",
  "pendingapproval",
  "underverification",
]);

export const UNLOCKED_ONBOARDING_STATUSES = new Set([
  "completed",
  "approved",
  "active",
]);

/**
 * Unlocks portal modules once staff has reached approved/completed status.
 * Modules remain strictly locked during pending approval, verification, or draft stages.
 */
export function isStaffPortalUnlocked(profileStatus, isOnboardedFlag = false) {
  const statusClean = String(profileStatus || "").trim().toLowerCase();
  if (UNLOCKED_ONBOARDING_STATUSES.has(statusClean)) return true;
  if (LOCKED_ONBOARDING_STATUSES.has(statusClean)) return false;
  if (!statusClean) return isOnboardedFlag === true;
  return isOnboardedFlag === true;
}

export const FACULTY_INDIAN_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "IndusInd Bank",
  "Bank of India",
  "Central Bank of India",
  "Indian Bank",
  "Indian Overseas Bank",
  "UCO Bank",
  "Bank of Maharashtra",
  "Punjab & Sind Bank",
  "Federal Bank",
  "IDBI Bank",
  "YES Bank",
  "South Indian Bank",
  "Karur Vysya Bank",
  "City Union Bank",
  "Bandhan Bank",
  "RBL Bank",
  "AU Small Finance Bank",
  "Equitas Small Finance Bank",
  "Ujjivan Small Finance Bank",
  "Jana Small Finance Bank",
  "Andhra Pragathi Grameena Bank",
  "Chaitanya Godavari Grameena Bank",
  "Telangana Grameena Bank",
  "Andhra Pradesh Grameena Vikas Bank",
  "Other Banks",
];

export const BANK_RULES_MAP = {
  "state bank of india": { minLen: 11, maxLen: 17, ifscPrefixes: ["SBIN0"], sampleIfsc: "SBIN0001234" },
  "sbi": { minLen: 11, maxLen: 17, ifscPrefixes: ["SBIN0"], sampleIfsc: "SBIN0001234" },
  "hdfc bank": { minLen: 14, maxLen: 14, ifscPrefixes: ["HDFC0"], sampleIfsc: "HDFC0001234" },
  "hdfc": { minLen: 14, maxLen: 14, ifscPrefixes: ["HDFC0"], sampleIfsc: "HDFC0001234" },
  "icici bank": { minLen: 12, maxLen: 12, ifscPrefixes: ["ICIC0"], sampleIfsc: "ICIC0001234" },
  "icici": { minLen: 12, maxLen: 12, ifscPrefixes: ["ICIC0"], sampleIfsc: "ICIC0001234" },
  "punjab national bank": { minLen: 16, maxLen: 16, ifscPrefixes: ["PUNB0"], sampleIfsc: "PUNB0001234" },
  "pnb": { minLen: 16, maxLen: 16, ifscPrefixes: ["PUNB0"], sampleIfsc: "PUNB0001234" },
  "bank of baroda": { minLen: 14, maxLen: 14, ifscPrefixes: ["BARB0"], sampleIfsc: "BARB0001234" },
  "bob": { minLen: 14, maxLen: 14, ifscPrefixes: ["BARB0"], sampleIfsc: "BARB0001234" },
  "canara bank": { minLen: 13, maxLen: 13, ifscPrefixes: ["CNRB0"], sampleIfsc: "CNRB0001234" },
  "union bank of india": { minLen: 15, maxLen: 15, ifscPrefixes: ["UBIN0"], sampleIfsc: "UBIN0001234" },
  "axis bank": { minLen: 15, maxLen: 15, ifscPrefixes: ["UTIB0"], sampleIfsc: "UTIB0001234" },
  "kotak mahindra bank": { minLen: 10, maxLen: 14, ifscPrefixes: ["KKBK0"], sampleIfsc: "KKBK0001234" },
  "indusind bank": { minLen: 12, maxLen: 12, ifscPrefixes: ["INDB0"], sampleIfsc: "INDB0001234" },
  "bank of india": { minLen: 15, maxLen: 15, ifscPrefixes: ["BKID0"], sampleIfsc: "BKID0001234" },
  "central bank of india": { minLen: 10, maxLen: 10, ifscPrefixes: ["CBIN0"], sampleIfsc: "CBIN0001234" },
  "indian bank": { minLen: 9, maxLen: 12, ifscPrefixes: ["IDIB0"], sampleIfsc: "IDIB0001234" },
  "indian overseas bank": { minLen: 15, maxLen: 15, ifscPrefixes: ["IOBA0"], sampleIfsc: "IOBA0001234" },
  "uco bank": { minLen: 14, maxLen: 14, ifscPrefixes: ["UCBA0"], sampleIfsc: "UCBA0001234" },
  "bank of maharashtra": { minLen: 11, maxLen: 11, ifscPrefixes: ["MAHB0"], sampleIfsc: "MAHB0001234" },
  "punjab & sind bank": { minLen: 14, maxLen: 14, ifscPrefixes: ["PSIB0"], sampleIfsc: "PSIB0001234" },
  "federal bank": { minLen: 14, maxLen: 14, ifscPrefixes: ["FDRL0"], sampleIfsc: "FDRL0001234" },
  "idbi bank": { minLen: 12, maxLen: 16, ifscPrefixes: ["IBKL0"], sampleIfsc: "IBKL0001234" },
  "yes bank": { minLen: 15, maxLen: 15, ifscPrefixes: ["YESB0"], sampleIfsc: "YESB0001234" },
  "south indian bank": { minLen: 16, maxLen: 16, ifscPrefixes: ["SIBL0"], sampleIfsc: "SIBL0001234" },
  "karur vysya bank": { minLen: 16, maxLen: 16, ifscPrefixes: ["KVBL0"], sampleIfsc: "KVBL0001234" },
  "city union bank": { minLen: 15, maxLen: 15, ifscPrefixes: ["CIUB0"], sampleIfsc: "CIUB0001234" },
  "bandhan bank": { minLen: 14, maxLen: 14, ifscPrefixes: ["BDBL0"], sampleIfsc: "BDBL0001234" },
  "rbl bank": { minLen: 12, maxLen: 12, ifscPrefixes: ["RATN0"], sampleIfsc: "RATN0001234" },
  "au small finance bank": { minLen: 16, maxLen: 16, ifscPrefixes: ["AUBL0"], sampleIfsc: "AUBL0001234" },
  "equitas small finance bank": { minLen: 12, maxLen: 12, ifscPrefixes: ["ESFB0"], sampleIfsc: "ESFB0001234" },
  "ujjivan small finance bank": { minLen: 16, maxLen: 16, ifscPrefixes: ["UJVN0"], sampleIfsc: "UJVN0001234" },
  "jana small finance bank": { minLen: 14, maxLen: 16, ifscPrefixes: ["JSFB0"], sampleIfsc: "JSFB0001234" },
  "andhra pragathi grameena bank": { minLen: 11, maxLen: 11, ifscPrefixes: ["APGB0"], sampleIfsc: "APGB0001234" },
  "chaitanya godavari grameena bank": { minLen: 11, maxLen: 15, ifscPrefixes: ["ANDC0", "CGGB0", "UBIN0"], sampleIfsc: "CGGB0001234" },
  "telangana grameena bank": { minLen: 11, maxLen: 11, ifscPrefixes: ["SBIN0", "TGB00", "TGBX0", "IDIB0"], sampleIfsc: "SBIN0RRBTGB" },
  "andhra pradesh grameena vikas bank": { minLen: 11, maxLen: 11, ifscPrefixes: ["APGV0", "SBIN0"], sampleIfsc: "APGV0001234" },
};

const DEFAULT_BANK_RULE = { minLen: 9, maxLen: 18, ifscPrefixes: [], sampleIfsc: "SBIN0001234" };

export function getBankFieldConstraints(bankName) {
  const key = String(bankName || "").trim().toLowerCase();
  const matched = BANK_RULES_MAP[key];
  if (matched) return { ...matched, bankLabel: String(bankName).trim(), isKnownBank: true };
  return { ...DEFAULT_BANK_RULE, bankLabel: key ? String(bankName).trim() : "Bank", isKnownBank: false };
}

export function validateBankField(field, value, bankValues = {}) {
  const bankName = String(bankValues.bankName || "").trim();
  const rule = getBankFieldConstraints(bankName);
  const val = String(value ?? "").trim();

  switch (field) {
    case "bankName": {
      const hasBankInputs = Boolean(
        String(bankValues.accountNumber || "").trim() ||
        String(bankValues.ifsc || bankValues.ifscCode || "").trim()
      );
      if (hasBankInputs && !val) {
        return "Please select a Bank Name.";
      }
      return "";
    }
    case "accountHolder": {
      if (!val) return "";
      if (!/^[A-Za-z.\s]+$/.test(val)) {
        return "Account holder name should contain letters, spaces, or periods only.";
      }
      if (val.length < 2) {
        return "Account holder name must be at least 2 characters.";
      }
      return "";
    }
    case "accountNumber": {
      if (!val) return "";
      if (!/^\d+$/.test(val)) {
        return "Account number must contain numeric digits only.";
      }
      if (val.length >= 4 && /^(\d)\1+$/.test(val)) {
        return "Please enter a valid account number (repeated digits not allowed).";
      }
      if (val.length < rule.minLen || val.length > rule.maxLen) {
        const expected = rule.minLen === rule.maxLen ? `${rule.minLen}` : `${rule.minLen}–${rule.maxLen}`;
        return `${rule.bankLabel} account number must be ${expected} digits (${val.length} entered).`;
      }
      return "";
    }
    case "ifsc": {
      if (!val) return "";
      const clean = val.toUpperCase();
      if (!/^[A-Z0-9]+$/.test(clean)) {
        return "IFSC code must contain letters and numbers only.";
      }
      if (clean.length <= 4) {
        if (!/^[A-Z]+$/.test(clean)) {
          return `First 4 characters of IFSC must be letters (e.g. ${rule.sampleIfsc}).`;
        }
        if (
          clean.length === 4 &&
          rule.ifscPrefixes.length > 0 &&
          !rule.ifscPrefixes.some((p) => p.slice(0, 4) === clean.slice(0, 4))
        ) {
          return `${rule.bankLabel} IFSC must start with ${rule.ifscPrefixes.join(" or ")}.`;
        }
        return `IFSC code must be 11 characters (${clean.length}/11).`;
      }
      if (clean[4] !== "0") {
        return "5th character of an Indian IFSC code must be '0'.";
      }
      if (
        rule.ifscPrefixes.length > 0 &&
        !rule.ifscPrefixes.some((p) => clean.startsWith(p))
      ) {
        return `${rule.bankLabel} IFSC must start with ${rule.ifscPrefixes.join(" or ")}.`;
      }
      if (clean.length !== 11) {
        return `IFSC code must be 11 characters (${clean.length}/11).`;
      }
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean)) {
        return `Invalid IFSC format (e.g. ${rule.sampleIfsc}).`;
      }
      return "";
    }
    case "branch": {
      if (!val) return "";
      if (val.length < 2) {
        return "Branch name must be at least 2 characters.";
      }
      return "";
    }
    case "uanNumber": {
      if (!val) return "";
      if (!/^\d+$/.test(val)) {
        return "UAN number must contain 12 numeric digits only.";
      }
      if (val.length >= 6 && /^(\d)\1+$/.test(val)) {
        return "Please enter a valid 12-digit UAN number.";
      }
      if (val.length !== 12) {
        return `UAN number must be 12 digits (${val.length}/12).`;
      }
      return "";
    }
    default:
      return "";
  }
}

export function validateAllBankFields(bankValues = {}) {
  const errors = {};
  const bankMsg = validateBankField("bankName", bankValues.bankName, bankValues);
  const holderMsg = validateBankField("accountHolder", bankValues.accountHolder ?? bankValues.accountHolderName, bankValues);
  const accMsg = validateBankField("accountNumber", bankValues.accountNumber, bankValues);
  const ifscMsg = validateBankField("ifsc", bankValues.ifsc ?? bankValues.ifscCode, bankValues);
  const branchMsg = validateBankField("branch", bankValues.branch ?? bankValues.branchName, bankValues);
  const uanMsg = validateBankField("uanNumber", bankValues.uanNumber ?? bankValues.pfNumber, bankValues);

  if (bankMsg) errors.bankName = bankMsg;
  if (holderMsg) errors.accountHolder = holderMsg;
  if (accMsg) errors.accountNumber = accMsg;
  if (ifscMsg) errors.ifsc = ifscMsg;
  if (branchMsg) errors.branch = branchMsg;
  if (uanMsg) errors.uanNumber = uanMsg;
  return errors;
}
