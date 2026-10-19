import { useState } from "react";
import InventoryForm from "@/components/pages/InventoryManagement/components/InventoryForm.jsx";
import { Modal } from "@/components/common/Ui.jsx";
import {
  enrichItem,
  enrichMovement,
  money,
  canReverseMovement,
} from "@/components/pages/InventoryManagement/inventoryModel.js";
import { useInventory } from "../InventoryDataContext.jsx";
import InventoryTable from "./InventoryTable.jsx";
import {
  inventoryDetail,
  inventoryLedger,
} from "@/components/pages/InventoryManagement/inventoryApi.js";
export default function InventoryRecordScreen({ kind, title, columns }) {
  const { state, save, remove, reverse, returnItem } = useInventory();
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const [serverLedger, setServerLedger] = useState([]);
  const openRecord = async (record, form = false) => {
    try {
      setError("");
      let detail = record;
      if (kind === "items" || movement)
        detail = await inventoryDetail(movement ? "movements" : "items", record.id);
      if (kind === "items" && !form) setServerLedger(await inventoryLedger(record.id, {}));
      setModal({ record: detail, form });
    } catch (e) {
      setError(e.message);
    }
  };
  const [department, setDepartment] = useState("");
  const movement = kind.startsWith("stock-");
  const rows = (
    movement
      ? state.movements
          .filter((m) => m.type === (kind === "stock-in" ? "Stock In" : "Stock Out"))
          .map((m) => enrichMovement(state, m))
      : kind === "items"
        ? state.items.map((i) => enrichItem(state, i))
        : state[kind]
  ).filter((r) => !department || r.department === department);
  const act = async (operation) => {
    try {
      await operation();
      setModal(null);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <>
      <div className="ip-page-head">
        <div>
          <h1>{title}</h1>
          <p>Manage your college store records and transactions.</p>
        </div>
      </div>
      {error && (
        <p role="alert" className="ip-error">
          {error}
        </p>
      )}
      <InventoryTable
        title={title}
        rows={rows}
        columns={columns}
        onAdd={() => setModal({ form: true })}
        addLabel={`Add ${movement ? title : kind === "items" ? "Item" : kind === "suppliers" ? "Supplier" : "Category"}`}
        onView={(record) => openRecord(record)}
        onEdit={movement ? undefined : (record) => openRecord(record, true)}
        onDelete={movement ? undefined : (record) => remove(kind, record)}
        toolbarExtra={
          kind === "items" || movement ? (
            <select
              aria-label="Filter department"
              className="cms-btn cms-btn-ghost"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {[
                ...new Set(
                  rows
                    .concat(state.items)
                    .map((r) => r.department)
                    .filter(Boolean),
                ),
              ].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          ) : null
        }
      />
      {modal?.form && (
        <InventoryForm
          kind={kind}
          record={modal.record}
          state={state}
          user={state.profile.name}
          onClose={() => setModal(null)}
          onSave={async (values) => {
            await save(kind, values);
            setModal(null);
          }}
        />
      )}
      {modal && !modal.form && (
        <Modal
          title={modal.record.name || modal.record.number || "Record details"}
          onClose={() => setModal(null)}
          className="inventory-dialog"
        >
          <dl className="ip-detail">
            {Object.entries(modal.record)
              .filter(
                ([k, v]) =>
                  !["id", "categoryId", "supplierId", "itemId"].includes(k) &&
                  v != null &&
                  typeof v !== "object",
              )
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k.replace(/([A-Z])/g, " $1")}</dt>
                  <dd>{["unitCost", "total", "stockValue"].includes(k) ? money(v) : String(v)}</dd>
                </div>
              ))}
          </dl>
          {kind === "items" && (
            <InventoryTable
              title="Stock Ledger"
              rows={serverLedger}
              columns={[
                { key: "date", label: "Date" },
                { key: "number", label: "Transaction" },
                { key: "type", label: "Type" },
                { key: "quantityIn", label: "Quantity In" },
                { key: "quantityOut", label: "Quantity Out" },
                { key: "balance", label: "Running Balance" },
              ]}
            />
          )}
          {movement && modal.record.status === "Posted" && (
            <div className="ip-actions">
              <button
                className="cms-btn cms-btn-ghost"
                onClick={() => {
                  if (window.confirm("Reverse this movement?")) act(() => reverse(modal.record.id));
                }}
              >
                Reverse
              </button>
              {modal.record.returnable &&
                !state.movements.some((m) => m.returnOf === modal.record.id) && (
                  <button
                    className="cms-btn cms-btn-primary"
                    disabled={!canReverseMovement(state, modal.record)}
                    onClick={() => {
                      if (window.confirm("Record a full return?"))
                        act(() => returnItem(modal.record.id));
                    }}
                  >
                    Record Return
                  </button>
                )}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
