import { useInventory } from "../InventoryDataContext.jsx";
export default function InventorySettingsPage() {
  const { state, update, reset } = useInventory();
  return (
    <>
      <div className="ip-page-head">
        <div>
          <h1>Settings</h1>
          <p>Manage your portal preferences.</p>
        </div>
      </div>
      <section className="ip-card">
        <p role="status">Saving preferences requires an inventory employee settings API.</p>
        <h2>Preferences</h2>
        {[
          ["lowStock", "Low stock notification badge"],
          ["orderUpdates", "Purchase order updates"],
        ].map(([k, label]) => (
          <label className="ip-setting" key={k}>
            <span>{label}</span>
            <input
              type="checkbox"
              checked={state.preferences[k]}
              disabled
              onChange={(e) =>
                update(
                  (s) => ({ ...s, preferences: { ...s.preferences, [k]: e.target.checked } }),
                  "Preference saved",
                )
              }
            />
          </label>
        ))}
      </section>
      <section className="ip-card">
        <h2>Server Data</h2>
        <p>Reload the current inventory records from the server.</p>
        <button
          className="cms-btn cms-btn-ghost"
          onClick={() => {
            reset();
          }}
        >
          Reload Inventory
        </button>
      </section>
    </>
  );
}
