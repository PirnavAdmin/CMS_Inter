import { useInventory } from "../InventoryDataContext.jsx";
export default function InventoryProfilePage() {
  const { state, update } = useInventory();
  return (
    <>
      <div className="ip-page-head">
        <div>
          <h1>My Profile</h1>
          <p>Your store assignment and contact information.</p>
        </div>
      </div>
      <section className="ip-card">
        <p role="status">
          Profile details are loaded from the employee record. Self-service name and phone updates
          require a dedicated backend endpoint.
        </p>
        <form
          className="ip-form"
          onSubmit={(e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            update(
              (s) => ({ ...s, profile: { ...s.profile, name: f.name, phone: f.phone } }),
              "Profile updated",
            );
          }}
        >
          <label>
            Employee ID
            <input value={state.profile.employeeId} readOnly />
          </label>
          <label>
            Name
            <input name="name" defaultValue={state.profile.name} required />
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
          <button className="cms-btn cms-btn-primary">Save Profile</button>
        </form>
      </section>
    </>
  );
}
