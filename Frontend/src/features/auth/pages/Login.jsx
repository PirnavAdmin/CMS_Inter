import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout.jsx";
import { Field, useForm } from "@/components/common/Ui.jsx";
import { getApiErrorMessage } from "@/api/axios.js";
import { clearPasswordResetContext, loginUser } from "@/features/auth/services/authService.js";
import { clearAuthSession, saveAuthSession } from "@/features/authStorage.js";

const fields = [
  { name: "email", label: "Email or Mobile", type: "text", required: true, placeholder: "Admin@CMS.com", autoComplete: "username", full: true },
  { name: "password", label: "Password", type: "password", required: true, placeholder: "Password", autoComplete: "current-password", full: true },
];

const REMEMBER_KEY = "pirnav-remember-credentials";
const LEGACY_REMEMBER_KEY = "pirnav-remember-email";

function saveRememberedCredentials(credentials) {
  try {
    if (credentials) {
      window.localStorage.setItem(REMEMBER_KEY, JSON.stringify(credentials));
    } else {
      window.localStorage.removeItem(REMEMBER_KEY);
    }
    window.localStorage.removeItem(LEGACY_REMEMBER_KEY);
  } catch {
    /* storage unavailable */
  }
}

export default function Login() {
  const { values, errors, setValue, validate } = useForm(fields, {});
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(REMEMBER_KEY) || "null");
      if (typeof saved?.emailOrMobile === "string" && typeof saved?.password === "string") {
        setValue("email", saved.emailOrMobile);
        setValue("password", saved.password);
        setRemember(true);
      } else {
        const savedEmail = window.localStorage.getItem(LEGACY_REMEMBER_KEY);
        if (savedEmail) {
          setValue("email", savedEmail);
          setRemember(true);
        }
      }
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    // Password managers can populate the DOM without dispatching the input
    // event React uses to update controlled field state. Read the submitted
    // controls so the credentials visible to the user are the ones we send.
    const submitted = new FormData(e.currentTarget);
    const emailOrMobile = String(submitted.get("email") || values.email || "").trim();
    const password = String(submitted.get("password") || values.password || "").trim();
    if (!emailOrMobile || !password) {
      validate();
      return;
    }

    if (!remember) saveRememberedCredentials(null);

    setBusy(true);
    // A login attempt must not inherit authorization from an older session.
    clearAuthSession();
    try {
      const result = await loginUser({ emailOrMobile, password });
      if (!result.token) throw new Error("The login response did not include an access token.");
      saveAuthSession({ token: result.token, user: result.user, role: result.user.role }, remember);
      if (remember) saveRememberedCredentials({ emailOrMobile, password });

      const userRole = String(result.user.role || "").toLowerCase();
      const isFacultyOrStaff =
        userRole === "faculty" ||
        userRole === "teacher" ||
        userRole === "staff" ||
        userRole === "hod" ||
        userRole.includes("faculty") ||
        userRole.includes("teacher") ||
        userRole.includes("staff") ||
        userRole.includes("lecturer");

      if (isFacultyOrStaff) {
        navigate("/faculty-dashboard", { replace: true });
      } else if (userRole.includes("driver")) {
        navigate("/driver", { replace: true });
      } else {
        navigate(result.user.isAdmin ? "/dashboard" : "/student-dashboard", { replace: true });
      }
    } catch (loginError) {
      clearAuthSession();
      const status = Number(loginError?.response?.status || 0);
      setError(
        [400, 401, 403].includes(status) || loginError?.code === "INVALID_CREDENTIALS"
          ? "Invalid username or password. Please try again."
          : getApiErrorMessage(loginError) || "Unable to sign in right now. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to the Pirnav College management system.">
      <form className={busy ? "auth-login-form is-busy" : "auth-login-form"} onSubmit={submit} noValidate autoComplete="on" aria-busy={busy}>
        {error ? <div className="cms-alert-error" role="alert">{error}</div> : null}
        <fieldset className="auth-login-fieldset" disabled={busy}>
          <div className="cms-form-grid">
            {fields.map((f) => (
              <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={setValue} />
            ))}
          </div>
          <div className="cms-auth-row">
            <label className="cms-check" htmlFor="remember-me">
              <input id="remember-me" name="remember" type="checkbox" checked={remember} onChange={(e) => {
                setRemember(e.target.checked);
                if (!e.target.checked) saveRememberedCredentials(null);
              }} />
              <span>Remember me</span>
            </label>
            <Link
              to="/forgot-password"
              state={{ email: String(values.email || "").trim() }}
              className={busy ? "is-disabled" : ""}
              aria-disabled={busy}
              tabIndex={busy ? -1 : undefined}
              onClick={(event) => {
                if (busy) { event.preventDefault(); return; }
                clearPasswordResetContext();
              }}
            >Forgot password?</Link>
          </div>
          <button type="submit" className="cms-btn cms-btn-primary auth-submit-btn" disabled={busy}>
            {busy ? "Signing in..." : "Login"}
          </button>
        </fieldset>
      </form>
    </AuthLayout>
  );
}





