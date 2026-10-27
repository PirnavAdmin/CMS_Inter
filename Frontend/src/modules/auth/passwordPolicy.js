export const PASSWORD_REQUIREMENTS = [
  { key: "length", label: "8 or more characters", test: (password) => password.length >= 8 },
  { key: "uppercase", label: "Uppercase letter", test: (password) => /[A-Z]/.test(password) },
  { key: "lowercase", label: "Lowercase letter", test: (password) => /[a-z]/.test(password) },
  { key: "number", label: "Number", test: (password) => /[0-9]/.test(password) },
  { key: "special", label: "Special character", test: (password) => /[^A-Za-z0-9]/.test(password) },
];

const PASSWORD_ERROR_MESSAGES = {
  length: "Password must be at least 8 characters.",
  uppercase: "Password must contain at least one uppercase letter.",
  lowercase: "Password must contain at least one lowercase letter.",
  number: "Password must contain at least one number.",
  special: "Password must contain at least one special character.",
};

export const passwordRequirementResults = (value = "") => {
  const password = String(value);
  return PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    satisfied: requirement.test(password),
  }));
};

export const validateStrongPassword = (value = "") => {
  const failedRequirement = passwordRequirementResults(value).find((requirement) => !requirement.satisfied);
  return failedRequirement ? PASSWORD_ERROR_MESSAGES[failedRequirement.key] : "";
};

export const passwordStrength = (value = "") => {
  const satisfiedCount = passwordRequirementResults(value).filter((requirement) => requirement.satisfied).length;
  if (satisfiedCount === PASSWORD_REQUIREMENTS.length) return "Strong";
  if (satisfiedCount >= 3) return "Medium";
  return "Weak";
};
