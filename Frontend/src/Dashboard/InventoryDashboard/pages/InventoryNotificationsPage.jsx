import { useInventory } from "../InventoryDataContext.jsx";
export default function InventoryNotificationsPage() {
  const { state, update } = useInventory();
  const alerts = state.items.filter((i) => i.status === "Active" && i.quantity < i.minStock);
  return (
    <>
      <div className="ip-page-head">
        <div>
          <h1>Notifications</h1>
          <p>Stock alerts and store updates.</p>
        </div>
        <button
          className="cms-btn cms-btn-ghost"
          onClick={() =>
            update(
              (s) => ({
                ...s,
                readNotifications: [
                  ...alerts.map((i) => i.id),
                  ...s.orders.filter((o) => o.status === "Pending").map((o) => o.id),
                ],
              }),
              "All alerts marked as read",
            )
          }
        >
          Mark All Read
        </button>
      </div>
      <section className="ip-card">
        {alerts.map((i) => (
          <div className="ip-list-row" key={i.id}>
            <div>
              <strong>
                {i.quantity === 0 ? "Out of Stock" : "Low Stock"}: {i.name}
              </strong>
              <p>
                {i.quantity} {i.unit} available. Minimum level: {i.minStock}.
              </p>
            </div>
            <button
              className="cms-btn cms-btn-ghost"
              disabled={state.readNotifications.includes(i.id)}
              onClick={() =>
                update(
                  (s) => ({ ...s, readNotifications: [...s.readNotifications, i.id] }),
                  "Alert marked as read",
                )
              }
            >
              {state.readNotifications.includes(i.id) ? "Read" : "Mark Read"}
            </button>
          </div>
        ))}
        {state.orders
          .filter((o) => o.status === "Pending")
          .map((o) => (
            <div className="ip-list-row" key={o.id}>
              <div>
                <strong>Pending Purchase Order: {o.number}</strong>
                <p>
                  {o.item} · {o.quantity} units awaiting receipt.
                </p>
              </div>
              <button
                className="cms-btn cms-btn-ghost"
                disabled={state.readNotifications.includes(o.id)}
                onClick={() =>
                  update(
                    (s) => ({ ...s, readNotifications: [...s.readNotifications, o.id] }),
                    "Order notification marked as read",
                  )
                }
              >
                {state.readNotifications.includes(o.id) ? "Read" : "Mark Read"}
              </button>
            </div>
          ))}
        {!alerts.length && !state.orders.some((o) => o.status === "Pending") && (
          <p>No stock alerts. Your store is up to date.</p>
        )}
      </section>
    </>
  );
}
