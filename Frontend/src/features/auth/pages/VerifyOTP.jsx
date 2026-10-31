import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout.jsx";
import { Field, Toast, useForm } from "@/components/common/Ui.jsx";
import {
  clearPasswordResetContext,
  getPasswordRecoveryErrorMessage,
  readPasswordResetContext,
  resendPasswordResetOtp,
  savePasswordResetContext,
  verifyPasswordResetOtp,
} from "@/features/auth/services/authService.js";

const fields = [
  { name: "otp", label: "OTP", required: true, full: true },
];

export default function VerifyOTP() {
  const { values, errors, setValue, validate } = useForm(fields, {});
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const storedContext = readPasswordResetContext();
  const email = String(location.state?.email || storedContext?.email || "").trim();
  const accountType = location.state?.accountType || storedContext?.accountType || "";
  const hasValidContext = Boolean(email && ["admin", "user"].includes(accountType));

  useEffect(() => {
    if (!hasValidContext) {
      navigate("/forgot-password", { replace: true });
      return;
    }
    savePasswordResetContext({ email, accountType });
  }, [accountType, email, hasValidContext, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setFormError("");
    if (!validate()) return;
    setBusy(true);
    try {
      if (!hasValidContext) {
        setFormError("Please request an OTP first.");
        return;
      }
      const otp = String(values.otp || "").trim();
      await verifyPasswordResetOtp({ email, otp, accountType });
      setSuccessMessage("OTP verified successfully.");
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      navigate("/reset-password", { state: { email, accountType, otp } });
    } catch (error) {
      setFormError(getPasswordRecoveryErrorMessage(error, "Unable to verify OTP. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (!hasValidContext) {
      navigate("/forgot-password");
      return;
    }
    setFormError("");
    setResending(true);
    try {
      await resendPasswordResetOtp({ email, accountType });
    } catch (error) {
      setFormError(getPasswordRecoveryErrorMessage(error, "Unable to resend OTP. Please try again."));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout title="Verify OTP" subtitle={email ? `Enter the OTP sent to ${email}.` : "Enter the OTP sent to your registered email."}>
      <form onSubmit={submit} noValidate>
        {formError ? <div className="cms-alert-error" role="alert">{formError}</div> : null}
        <div className="cms-form-grid">
          {fields.map((f) => <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />)}
        </div>
        <button type="submit" className="cms-btn cms-btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={busy}>{busy ? "Verifying..." : "Verify OTP"}</button>
      </form>
      <div className="cms-auth-links auth-secondary-actions"><button type="button" className="cms-btn cms-btn-ghost auth-resend-btn" onClick={resendOtp} disabled={resending}>{resending ? "Resending..." : "Resend OTP"}</button><Link to="/login" onClick={clearPasswordResetContext}>Back to login</Link></div>
      <Toast message={successMessage} type="success" onClose={() => setSuccessMessage("")} />
    </AuthLayout>
  );
}


