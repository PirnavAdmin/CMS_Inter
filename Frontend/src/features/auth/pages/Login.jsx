import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout.jsx";
import { Field, useForm } from "@/components/common/Ui.jsx";
import { getApiErrorMessage } from "@/api/axios.js";
import { clearPasswordResetContext, loginUser } from "@/features/auth/services/authService.js";
import { getCurrentUserPermissions } from "@/features/rolesPermissions/rolesPermissions.service.js";
import { clearAuthSession, saveAuthSession } from "@/features/authStorage.js";
import { isExamCellRole } from "@/Dashboard/ExamCellDashboard/navigation.js";
import { isWardenRole, isTransportManagerRole } from "@/routes/ProtectedRoute.jsx";
import { useCampusImages } from "../../campusImages.js";
import { getCampusContent } from "../../campusContent.js";

const fields = [
  {
    name: "email",
    label: "Email or Mobile",
    type: "text",
    required: true,
    placeholder: "Admin@CMS.com",
    autoComplete: "username",
    full: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    required: true,
    placeholder: "Password",
    autoComplete: "current-password",
    full: true,
  },
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
  const content = getCampusContent(useCampusImages());
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
      try {
        const permsRes = await getCurrentUserPermissions();
        if (permsRes?.data && Array.isArray(permsRes.data)) {
          result.user.permissions = permsRes.data;
          saveAuthSession({ token: result.token, user: result.user, role: result.user.role }, remember);
        }
      } catch (e) {
        console.warn("Could not load user permissions at login:", e?.message);
      }
      if (remember) saveRememberedCredentials({ emailOrMobile, password });

      const isTransportManager =
        isTransportManagerRole(result.user?.role, result.user) ||
        result.roleType === "transport_manager" ||
        String(result.user?.role || "").toLowerCase().includes("transport") ||
        String(result.user?.designation || "").toLowerCase().includes("transport");
      const isWarden =
        !isTransportManager &&
        (isWardenRole(result.user?.role, result.user) ||
          result.roleType === "warden" ||
          String(result.user?.role || "").toLowerCase().includes("warden") ||
          String(result.user?.designation || "").toLowerCase().includes("warden"));
      const userRole = String(result.user?.role || "").toLowerCase();
      const isInventory = userRole.includes("inventory") || userRole === "store manager" || userRole === "storekeeper";
      const isExamCell = !isWarden && !isTransportManager && (isExamCellRole(userRole) || result.roleType === "examcell");
      const isPrincipal = !isWarden && !isTransportManager && (userRole === "principal" || userRole.includes("principal"));
      const isNonTeaching =
        !isWarden &&
        !isTransportManager &&
        !isExamCell &&
        (userRole === "non_teaching_staff" ||
          userRole === "non-teaching" ||
          userRole === "non-teaching-staff" ||
          userRole === "nonteaching" ||
          result.roleType === "non_teaching" ||
          String(result.user?.staffType || "").toLowerCase() === "non-teaching");
      const isFacultyOrStaff =
        !isWarden &&
        !isTransportManager &&
        !isNonTeaching &&
        (userRole === "faculty" ||
        userRole === "teacher" ||
        userRole === "staff" ||
        userRole === "hod" ||
        userRole.includes("faculty") ||
        userRole.includes("teacher") ||
        userRole.includes("staff") ||
        userRole.includes("lecturer"));
      const isParent =
        !isWarden &&
        !isTransportManager &&
        (userRole === "parent" ||
        userRole.includes("parent") ||
        result.roleType === "parent");
      const isAccountant =
        !isWarden &&
        !isTransportManager &&
        (userRole.includes("accountant") || userRole.includes("accounting") || userRole === "finance" || userRole === "cashier");

      if (isTransportManager) {
        navigate("/transport-manager/overview", { replace: true });
      } else if (isWarden) {
        navigate("/warden-dashboard", { replace: true });
      } else if (isInventory) {
        navigate("/inventory-dashboard", { replace: true });
      } else if (userRole.includes("driver")) {
        navigate("/driver", { replace: true });
      } else if (isNonTeaching) {
        navigate("/non-teaching-dashboard", { replace: true });
      } else if (isExamCell) {
        navigate("/exam-cell-dashboard", { replace: true });
      } else if (result.user.isAdmin || userRole.includes("admin")) {
        navigate("/dashboard", { replace: true });
      } else if (isPrincipal) {
        navigate("/principal-dashboard", { replace: true });
      } else if (isFacultyOrStaff) {
        navigate("/faculty-dashboard", { replace: true });
      } else if (isParent) {
        navigate("/parent-dashboard", { replace: true });
      } else if (isAccountant) {
        navigate("/accountant-dashboard", { replace: true });
      } else {
        navigate(result.user.isAdmin ? "/dashboard" : "/student-dashboard", { replace: true });
      }
    } catch (loginError) {
      clearAuthSession();
      const status = Number(loginError?.response?.status || 0);
      const serverMessage =
        loginError?.response?.data?.message ||
        loginError?.response?.data?.Message ||
        loginError?.response?.data?.error ||
        loginError?.response?.data?.Error ||
        loginError?.response?.data?.detail ||
        (typeof loginError?.response?.data === "string" ? loginError.response.data : null) ||
        loginError?.message;

      const displayMessage =
        serverMessage &&
        serverMessage !== "Error" &&
        !serverMessage.startsWith("Authentication failed because")
          ? serverMessage
          : [400, 401, 403].includes(status) || loginError?.code === "INVALID_CREDENTIALS"
          ? "Invalid Email or Password"
          : getApiErrorMessage(loginError) || "Unable to sign in right now. Please try again.";

      setError(displayMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={content.loginHeading} subtitle={content.loginDescription}>
      <form
        className={busy ? "auth-login-form is-busy" : "auth-login-form"}
        onSubmit={submit}
        noValidate
        autoComplete="on"
        aria-busy={busy}
      >
        {error ? (
          <div className="cms-alert-error" role="alert">
            {error}
          </div>
        ) : null}
        <fieldset className="auth-login-fieldset" disabled={busy}>
          <div className="cms-form-grid">
            {fields.map((f) => (
              <Field
                key={f.name}
                field={f}
                value={values[f.name]}
                error={errors[f.name]}
                onChange={setValue}
              />
            ))}
          </div>
          <div className="cms-auth-row">
            <label className="cms-check" htmlFor="remember-me">
              <input
                id="remember-me"
                name="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => {
                  setRemember(e.target.checked);
                  if (!e.target.checked) saveRememberedCredentials(null);
                }}
              />
              <span>Remember me</span>
            </label>
            <Link
              to="/forgot-password"
              state={{ email: String(values.email || "").trim() }}
              className={busy ? "is-disabled" : ""}
              aria-disabled={busy}
              tabIndex={busy ? -1 : undefined}
              onClick={(event) => {
                if (busy) {
                  event.preventDefault();
                  return;
                }
                clearPasswordResetContext();
              }}
            >
              Forgot password?
            </Link>
          </div>
          <button type="submit" className="cms-btn cms-btn-primary auth-submit-btn" disabled={busy}>
            {busy ? "Signing in..." : content.loginButton}
          </button>
        </fieldset>
      </form>
    </AuthLayout>
  );
}
