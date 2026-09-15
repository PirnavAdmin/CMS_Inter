import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout.jsx";
import { Field, useForm } from "@/components/common/Ui.jsx";
import {
  clearPasswordResetContext,
  getPasswordRecoveryErrorMessage,
  requestPasswordReset,
  savePasswordResetContext,
} from "@/features/auth/services/authService.js";

const fields = [{ name: "email", label: "Registered Email", type: "email", required: true, full: true }];

export default function ForgotPassword() {
  const location = useLocation();
  const { values, errors, setValue, validate } = useForm(fields, { email: location.state?.email || "" });
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    clearPasswordResetContext();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!validate()) return;
    setBusy(true);
    try {
      const email = String(values.email || "").trim();
      const result = await requestPasswordReset({ email });
      savePasswordResetContext({ email, accountType: result.accountType });
      setSent(true);
      navigate("/verify-otp", { state: { email, accountType: result.accountType } });
    } catch (error) {
      setFormError(getPasswordRecoveryErrorMessage(error, "Unable to send OTP. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your registered email to receive an OTP.">
      {formError ? <div className="cms-alert-error" role="alert">{formError}</div> : null}
      {sent ? (
        <div className="cms-empty" role="status">An OTP has been sent to {values.email}.</div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="cms-form-grid">
            {fields.map((f) => <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />)}
          </div>
          <button type="submit" className="cms-btn cms-btn-primary" style={{ width: "100%", marginTop: 18 }} disabled={busy}>{busy ? "Sending..." : "Send OTP"}</button>
        </form>
      )}
      <div className="cms-auth-links">
        <Link to="/login">Back to login</Link>
        <Link to="/register">Create an account</Link>
      </div>
    </AuthLayout>
  );
}


