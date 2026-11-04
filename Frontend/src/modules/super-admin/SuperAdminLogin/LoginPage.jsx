import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { getPlatformSession, loginPreview, previewEnabled } from "../superAdminSession.js";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!previewEnabled) return <Navigate to="/login" replace/>;
  if (getPlatformSession()) return <Navigate to="/super-admin/dashboard" replace/>;
  const submit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    try { await loginPreview(form.email, form.password); navigate("/super-admin/dashboard", { replace: true }); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <main className="sa-login-page"><section className="sa-login-card"><GraduationCap size={44}/><span className="sa-login-eyebrow">PIRNAV CMS · PLATFORM</span><h1>Super Admin</h1><p>Sign in to your local development workspace.</p><div className="sa-login-notice"><ShieldCheck size={20}/><span>Development preview only. No production authentication or backend access is granted.</span></div><form onSubmit={submit}>{error ? <p role="alert" className="cms-alert-error">{error}</p> : null}<label>Email<input type="email" autoComplete="username" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })}/></label><label>Password<input type="password" autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })}/></label><button className="cms-btn cms-btn-primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Open Preview Dashboard"}</button></form><Link to="/login">Back to college login</Link></section></main>;
}
