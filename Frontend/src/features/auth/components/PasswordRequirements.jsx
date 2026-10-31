import { passwordRequirementResults, passwordStrength } from "@/features/auth/passwordPolicy.js";

export default function PasswordRequirements({ password = "" }) {
  const requirements = passwordRequirementResults(password);
  const strength = passwordStrength(password);

  return (
    <div className="auth-password-requirements" aria-live="polite">
      <div className="auth-password-requirements-head">
        <span>Password must contain:</span>
        <strong className={`is-${strength.toLowerCase()}`}>{strength}</strong>
      </div>
      <ul>
        {requirements.map((requirement) => (
          <li key={requirement.key} className={requirement.satisfied ? "is-satisfied" : ""}>
            <span aria-hidden="true">{requirement.satisfied ? "✓" : "○"}</span>
            {requirement.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
