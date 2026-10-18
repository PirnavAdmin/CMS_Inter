import { Link } from "react-router-dom";
import { Boxes, IndianRupee, CircleAlert, ShoppingCart } from "lucide-react";
import { useInventory } from "../InventoryDataContext.jsx";
import {
  enrichMovement,
  money,
  stockValue,
} from "@/components/pages/InventoryManagement/inventoryModel.js";
import InventoryTable from "../components/InventoryTable.jsx";
export default function InventoryHomePage() {
  const { state } = useInventory();
  const low = state.items.filter((i) => i.status === "Active" && i.quantity < i.minStock);
  const stats = [
    ["Total Items", state.dashboard?.kpis?.totalItems ?? state.items.length, Boxes],
    ["Stock Value", money(state.dashboard?.kpis?.totalStockValue ?? state.items.reduce((sum, i) => sum + stockValue(i), 0)), IndianRupee],
    ["Low Stock Items", state.dashboard?.kpis?.lowStockCount ?? low.length, CircleAlert],
    ["Pending Orders", state.dashboard?.kpis?.pendingOrdersCount ?? "—", ShoppingCart],
  ];
  return (
    <>
      <div className="ip-page-head">
        <div>
          <h1>Inventory Dashboard</h1>
          <p>Welcome back. Here’s what’s happening in your college store.</p>
        </div>
        <Link className="cms-btn cms-btn-primary" to="/inventory-dashboard/stock-in">
          Receive Stock
        </Link>
      </div>
      <div className="ip-kpis">
        {stats.map(([label, value, Icon]) => (
          <article key={label}>
            <Icon size={22} />
            <p>{label}</p>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="ip-grid">
        <section className="ip-card">
          <h2>Quick Actions</h2>
          <div className="ip-quick">
            {[
              ["items", "Manage Items"],
              ["stock-in", "Receive Stock"],
              ["stock-out", "Issue Stock"],
              ["orders", "Purchase Orders"],
              ["reports", "View Reports"],
            ].map(([p, l]) => (
              <Link key={p} to={`/inventory-dashboard/${p}`}>
                {l} →
              </Link>
            ))}
          </div>
        </section>
        <section className="ip-card">
          <h2>Stock Needs Attention</h2>
          {low.slice(0, 4).map((i) => (
            <div className="ip-list-row" key={i.id}>
              <span>
                {i.name}
                <small>
                  Minimum: {i.minStock} {i.unit}
                </small>
              </span>
              <strong>{i.quantity} remaining</strong>
            </div>
          ))}
          {!low.length && <p>All stock levels are healthy.</p>}
        </section>
      </div>
      <h2>Recent Stock Movements</h2>
      <InventoryTable
        title="Recent Stock Movements"
        rows={state.movements
          .slice()
          .reverse()
          .slice(0, 10)
          .map((m) => enrichMovement(state, m))}
        columns={[
          { key: "date", label: "Date" },
          { key: "item", label: "Item" },
          { key: "type", label: "Movement" },
          { key: "quantity", label: "Quantity" },
          { key: "department", label: "Department" },
          { key: "performedBy", label: "Performed By" },
        ]}
      />
    </>
  );
}
