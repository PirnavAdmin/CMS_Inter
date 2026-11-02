import { useState } from "react";
import { useInventory } from "../InventoryDataContext.jsx";
import { updateProfileContact } from "../data/inventoryUserApi.js";

export default function InventoryProfilePage() {
  const { state, refresh } = useInventory();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <>
      <div className="ip-page-head">
        <div>
          <h1>My Profile</h1>
          <p>Your store assignment and contact information.</p>
        </div>
      </div>
      <section className="ip-card">
        {msg && <p role="status" style={{ color: "#16a34a", marginBottom: 12 }}>{msg}</p>}
        {err && <p className="ip-error" role="alert" style={{ color: "#dc2626", marginBottom: 12 }}>{err}</p>}
        <form
          className="ip-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            setSaving(true);
            setMsg("");
            setErr("");
            try {
              await updateProfileContact({ phone: f.phone });
              setMsg("Contact phone updated successfully.");
              await refresh();
            } catch (ex) {
              setErr(ex.message || "Failed to update contact phone.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <label>
            Employee ID
            <input value={state.profile.employeeId} readOnly />
          </label>
          <label>
            Name
            <input name="name" defaultValue={state.profile.name} readOnly />
          </label>
          <label>
            Email
            <input value={state.profile.email} readOnly />
          </label>
          <label>
            Department
            <input value={state.profile.department} readOnly />
          </label>
          <label>
            Phone
            <input
              name="phone"
              type="tel"
              pattern="[0-9+ ()-]{10,16}"
              defaultValue={state.profile.phone}
              required
            />
          </label>
          <button className="cms-btn cms-btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Contact Info"}
          </button>
        </form>
      </section>
    </>
  );
}
