import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout.jsx";
import { Field, useForm } from "@/components/common/Ui.jsx";
import {
  clearPasswordResetContext,
  getPasswordRecoveryErrorMessage,
  readPasswordResetContext,
  resetPasswordForAccount,
} from "@/features/auth/services/authService.js";
import PasswordRequirements from "@/features/auth/components/PasswordRequirements.jsx";
import { validateStrongPassword } from "@/features/auth/passwordPolicy.js";

const fields = [
  { name: "password", label: "New Password", type: "password", required: true, full: true },
  { name: "confirmPassword", label: "Confirm Password", type: "password", required: true, full: true },
];

export default function ResetPassword() {
  const { values, errors, setValue, validate } = useForm(fields, {});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const storedContext = readPasswordResetContext();
  const email = String(location.state?.email || storedContext?.email || "").trim();
  const accountType = location.state?.accountType || storedContext?.accountType || "";
  const otp = String(location.state?.otp || "").trim();
  const hasValidContext = Boolean(email && otp && ["admin", "user"].includes(accountType));

  useEffect(() => {
    if (hasValidContext) return;
    if (email && ["admin", "user"].includes(accountType)) {
      navigate("/verify-otp", { replace: true, state: { email, accountType } });
    } else {
      navigate("/forgot-password", { replace: true });
    }
  }, [accountType, email, hasValidContext, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;
    if (!hasValidContext) {
      setFormError("Please verify your OTP before resetting your password.");
      return;
    }
    const passwordError = validateStrongPassword(values.password);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }
    if (values.password !== values.confirmPassword) {
      setFormError("Password and Confirm Password must match.");
      return;
    }
    setBusy(true);
    try {
      await resetPasswordForAccount({ email, otp, password: values.password, confirmPassword: values.confirmPassword, accountType });
      clearPasswordResetContext();
      navigate("/login", { replace: true });
    } catch (error) {
      setFormError(getPasswordRecoveryErrorMessage(error, "Unable to reset password. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create new password" subtitle="Set a secure password for your Pirnav College account.">
      <form onSubmit={submit} noValidate>
        {formError ? <div className="cms-alert-error" role="alert">{formError}</div> : null}
        <div className="cms-form-grid">
          {fields.map((f) => (
            <div key={f.name} className="auth-field-with-guidance">
              <Field field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />
              {f.name === "password" ? <PasswordRequirements password={values.password} /> : null}
            </div>
          ))}
        </div>
        <button type="submit" className="cms-btn cms-btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={busy}>{busy ? "Resetting..." : "Reset Password"}</button>
      </form>
      <div className="cms-auth-links"><Link to="/login" onClick={clearPasswordResetContext}>Back to login</Link></div>
    </AuthLayout>
  );
}


