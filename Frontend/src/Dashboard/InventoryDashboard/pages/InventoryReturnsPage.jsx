import { useState } from "react";
import { useInventory } from "../InventoryDataContext.jsx";
import { enrichMovement } from "@/components/pages/InventoryManagement/inventoryModel.js";
import InventoryTable from "../components/InventoryTable.jsx";
export default function InventoryReturnsPage() {
  const { state, returnItem } = useInventory();
  const [error, setError] = useState("");
  const rows = state.movements
    .filter((m) => m.returnable && m.type === "Stock Out")
    .map((m) => ({
      ...enrichMovement(state, m),
      returned: state.movements.some((r) => r.returnOf === m.id),
    }));
  return (
    <>
      <div className="ip-page-head">
        <div>
          <h1>Returnable Items</h1>
          <p>Track issued assets and record their return to the store.</p>
        </div>
      </div>
      {error && (
        <p className="ip-error" role="alert">
          {error}
        </p>
      )}
      <InventoryTable
        title="Returnable Items"
        rows={rows}
        columns={[
          { key: "item", label: "Item" },
          { key: "recipient", label: "Recipient" },
          { key: "department", label: "Department" },
          { key: "quantity", label: "Quantity" },
          { key: "expectedReturnDate", label: "Due Date" },
          {
            key: "returned",
            label: "Return Status",
            render: (r) =>
              r.returned ? "Returned" : r.status === "Reversed" ? "Reversed" : "Awaiting Return",
          },
          {
            key: "actions",
            label: "Actions",
            exportable: false,
            render: (r) => (
              <button
                className="cms-btn cms-btn-ghost"
                disabled={r.returned || r.status !== "Posted"}
                onClick={async () => {
                  if (window.confirm("Confirm full return of these items?")) {
                    try {
                      await returnItem(r.id);
                      setError("");
                    } catch (e) {
                      setError(e.message);
                    }
                  }
                }}
              >
                Record Return
              </button>
            ),
          },
        ]}
      />
    </>
  );
}
