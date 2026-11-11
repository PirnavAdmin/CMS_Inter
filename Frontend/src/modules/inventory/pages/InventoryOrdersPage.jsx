import { useState } from "react";
import { Modal } from "@/shared/components/Ui.jsx";
import { useInventory } from "../InventoryDataContext.jsx";
import InventoryTable from "../components/InventoryTable.jsx";
export default function InventoryOrdersPage() {
  const { state, save, cancelOrder } = useInventory();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <div className="ip-page-head">
        <div>
          <h1>Purchase Orders</h1>
          <p>Prepare and track replenishment requests. Receive delivered stock through Stock In.</p>
        </div>
      </div>
      <InventoryTable
        title="Purchase Orders"
        rows={state.orders}
        onAdd={() => {
          setError("");
          setOpen(true);
        }}
        addLabel="New Order"
        columns={[
          { key: "number", label: "Order Number" },
          { key: "item", label: "Item" },
          { key: "supplier", label: "Supplier" },
          { key: "quantity", label: "Quantity" },
          { key: "status", label: "Status" },
          {
            key: "actions",
            label: "Actions",
            exportable: false,
            render: (r) => (
              <button
                className="cms-btn cms-btn-ghost"
                disabled={r.status !== "Pending"}
                onClick={async () => {
                  if (window.confirm("Cancel this order?")) {
                    try {
                      await cancelOrder(r.id);
                    } catch (err) {
                      setError(err?.message || "Failed to cancel order.");
                    }
                  }
                }}
              >
                Cancel
              </button>
            ),
          },
        ]}
      />
      {error && (
        <p className="ip-error" role="status">
          {error}
        </p>
      )}
      {open && (
        <Modal title="New Purchase Order" onClose={() => setOpen(false)}>
          <form
            className="ip-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              try {
                await save("orders", {
                  itemId: Number(f.itemId),
                  supplierId: Number(f.supplierId),
                  quantity: Number(f.quantity),
                  remarks: f.remarks?.trim() || null,
                });
                setOpen(false);
              } catch (failure) {
                setError(failure?.message || "Failed to create purchase order.");
              }
            }}
          >
            <label>
              Item
              <select name="itemId" required>
                <option value="">Select Item</option>
                {state.items
                  .filter((i) => i.status === "Active")
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Supplier
              <select name="supplierId" required>
                <option value="">Select Supplier</option>
                {state.suppliers
                  .filter((s) => s.status === "Active")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Quantity
              <input name="quantity" type="number" min="1" required />
            </label>
            <label>
              Remarks
              <input name="remarks" type="text" placeholder="Optional notes" />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="cms-btn cms-btn-primary">Create Order</button>
          </form>
        </Modal>
      )}
    </>
  );
}
