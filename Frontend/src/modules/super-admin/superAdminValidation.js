export const isValidSuperAdminEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());

export const isValidIndianMobile = (value) => /^\d{10}$/.test(String(value ?? "").trim());

export const isValidContactPhone = (value) => {
  const phone = String(value ?? "").trim();
  const digits = phone.replace(/\D/g, "");
  return /^[+\d().\s-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15;
};

export const isStrongSuperAdminPassword = (value) => {
  const password = String(value ?? "");
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9\s]/.test(password);
};

export const isValidNonNegativeAmount = (value) => /^(?:\d+)(?:\.\d{1,2})?$/.test(String(value ?? "")) && Number.isFinite(Number(value)) && Number(value) >= 0;

export const isPositiveWholeNumber = (value, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= max;

/**
 * Normalizes college or campus names to standard Title Case formatting.
 * Strictly eliminates inconsistent uppercase letters in the middle of words (e.g. "MeDha Junior ColLege" -> "Medha Junior College").
 * Preserves Roman numerals (e.g. II, III) and legitimate short acronyms (e.g. IIT, NIT, CMS).
 */
export const formatProperCollegeName = (value) => {
  if (!value || typeof value !== "string") return "";
  return value
    .split(/(\s+|-)/)
    .map((token) => {
      if (!token || /^\s+$/.test(token) || token === "-") return token;
      // Roman numerals (I, II, III, IV, V, VI, VII, VIII, IX, X)
      if (/^(X|IX|IV|V?I{1,3})$/i.test(token)) return token.toUpperCase();
      // Legitimate short acronyms (2-4 uppercase letters, e.g. IIT, NIT, CMS)
      if (/^[A-Z]{2,4}$/.test(token) && !/^(AND|FOR|THE|OF|IN|AT|TO|BY)$/i.test(token)) return token;
      // Standard Title Case: First char uppercase, subsequent chars lowercase
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join("");
};

/**
 * Validates whether a college or campus name has irregular capitalization,
 * such as uppercase letters in the middle of words (e.g. "MeDha", "ColLege"),
 * or words starting with lowercase letters (e.g. "narayana", "junior college").
 */
export const validateCollegeNameCapitalization = (value) => {
  const str = String(value ?? "").trim();
  if (!str) return "College name is required.";
  if (str.length < 2) return "College name must be at least 2 characters.";
  
  // Detect lowercase letter followed immediately by uppercase letter (e.g., MeDha, ColLege)
  if (/[a-z][A-Z]/.test(str)) {
    return "College name cannot contain uppercase letters in the middle of words (e.g., use 'Medha Junior College' instead of 'MeDha Junior ColLege').";
  }

  // Tokenize into individual words separated by spaces or hyphens
  const words = str.split(/[\s-]+/).filter(Boolean);
  const minorWords = new Set(["and", "of", "the", "for", "in", "at", "to", "by", "&"]);

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    // Check if word contains uppercase letter in the middle
    if (/^[A-Z][a-z]+[A-Z]/.test(w) || /[a-z]+[A-Z]/.test(w)) {
      return `Word "${w}" contains uppercase letters in the middle. Please use standard capitalization (e.g., "${w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()}").`;
    }
    // Check if the first word or any non-minor word starts with lowercase
    if (i === 0 || !minorWords.has(w.toLowerCase())) {
      if (/^[a-z]/.test(w)) {
        return `Each word in the college name must start with a capital letter (e.g., "${w.charAt(0).toUpperCase() + w.slice(1)}" instead of "${w}").`;
      }
    }
  }

  return "";
};
