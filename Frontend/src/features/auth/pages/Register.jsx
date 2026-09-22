import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout.jsx";
import { Field, useForm } from "@/components/common/Ui.jsx";
import { registerUser } from "@/features/auth/services/authService.js";
import { getApiErrorMessage } from "@/api/axios.js";
import PasswordRequirements from "@/features/auth/components/PasswordRequirements.jsx";
import { validateStrongPassword } from "@/features/auth/passwordPolicy.js";

const fields = [
  { name: "fullName", label: "Full Name", required: true, full: true },
  { name: "email", label: "Email Address", type: "email", required: true, full: true },
  { name: "mobile", label: "Mobile Number", type: "tel", required: true, full: true },
  { name: "password", label: "Password", type: "password", required: true, full: true },
  { name: "confirmPassword", label: "Confirm Password", type: "password", required: true, full: true },
];

export default function Register() {
  const { values, errors, setValue, validate } = useForm(fields, {});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    if (!validate()) return;
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
      const payload = {
        role: "student",
        fullName: String(values.fullName || "").trim(),
        email: String(values.email || "").trim(),
        mobileNumber: String(values.mobile || "").trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
      };
      const response = await registerUser(payload);
      const data = response.data || {};
      const status = data.status ?? data.Status;
      if (status === false) throw new Error(data.message || data.Message || "Registration failed.");
      setSuccess(data.message || data.Message || "Registration successful. Please login.");
      setTimeout(() => navigate("/login", { replace: true }), 700);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Register to access the Pirnav College portal." cardClass="auth-register-card">
      <form onSubmit={submit} noValidate>
        {formError ? <div className="cms-alert-error" role="alert">{formError}</div> : null}
        {success ? <div className="cms-alert-success" role="status">{success}</div> : null}
        <div className="cms-form-grid">
          {fields.map((f) => (
            <div key={f.name} className="auth-field-with-guidance">
              <Field field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />
              {f.name === "password" ? <PasswordRequirements password={values.password} /> : null}
            </div>
          ))}
        </div>
        <button type="submit" className="cms-btn cms-btn-primary auth-submit-btn" disabled={busy}>
          {busy ? "Creating account..." : "Register"}
        </button>
      </form>
      <div className="cms-auth-links">
        <span style={{ color: "var(--cms-muted)" }}>Already registered?</span>
        <Link to="/login">Login instead</Link>
      </div>
    </AuthLayout>
  );
}


