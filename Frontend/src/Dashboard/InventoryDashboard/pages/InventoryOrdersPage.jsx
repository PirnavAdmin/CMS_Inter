import { useState } from "react";
import { Modal } from "@/components/common/Ui.jsx";
import { useInventory } from "../InventoryDataContext.jsx";
import InventoryTable from "../components/InventoryTable.jsx";
export default function InventoryOrdersPage() {
  const { state, update } = useInventory();
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
        onAdd={() =>
          setError(
            "Purchase order creation requires an inventory purchase-order API. No order was saved.",
          )
        }
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
                onClick={() => {
                  if (window.confirm("Cancel this order?"))
                    update((s) => ({
                      ...s,
                      orders: s.orders.map((o) =>
                        o.id === r.id ? { ...o, status: "Cancelled" } : o,
                      ),
                    }));
                }}
              >
                Cancel
              </button>
            ),
          },
        ]}
      />
      <p className="ip-error" role="status">
        {error ||
          "Purchase order list, creation, cancellation, and receipt tracking APIs are not available in the inventory specification."}
      </p>
      {open && (
        <Modal title="New Purchase Order" onClose={() => setOpen(false)}>
          <form
            className="ip-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              const item = state.items.find((i) => i.id === f.itemId);
              const supplier = state.suppliers.find((s) => s.id === f.supplierId);
              try {
                update((s) => ({
                  ...s,
                  nextId: s.nextId + 1,
                  orders: [
                    ...s.orders,
                    {
                      id: `order-${s.nextId}`,
                      number: `PO-${s.nextId}`,
                      itemId: item.id,
                      item: item.name,
                      supplierId: supplier.id,
                      supplier: supplier.name,
                      quantity: Number(f.quantity),
                      status: "Pending",
                    },
                  ],
                }));
                setOpen(false);
              } catch (failure) {
                setError(failure.message);
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
            {error && <p role="alert">{error}</p>}
            <button className="cms-btn cms-btn-primary">Create Order</button>
          </form>
        </Modal>
      )}
    </>
  );
}
