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

  if (data._isDetailedLoaded === false || (!hasFieldVal(data.firstName) && !hasFieldVal(data.lastName))) {
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
