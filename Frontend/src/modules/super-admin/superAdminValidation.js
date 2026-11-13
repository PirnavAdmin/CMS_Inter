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
