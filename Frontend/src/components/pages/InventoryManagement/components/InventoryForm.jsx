import { useMemo, useRef, useState } from "react";
import { Field, Modal } from "@/components/common/Ui.jsx";
import { formInitial, formSections } from "../inventoryFields.js";
import { money, validateRecord } from "../inventoryModel.js";
import { useDialogFocus } from "./InventoryUi.jsx";
import { getApiErrorMessage } from "@/api/apiClient.js";

export default function InventoryForm({ kind, record, itemId, state, user, onClose, onSave }) {
  const initial = useMemo(
    () => formInitial(kind, state, record, itemId, user),
    [kind, state, record, itemId, user],
  );
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const lock = useRef(false);
  useDialogFocus(onClose);
  const sections = formSections(kind, state, values);
  const errors = validateRecord(
    kind,
    values,
    state,
    sections.flatMap((s) => s.fields),
  );
  const item = state.items.find((i) => i.id === values.itemId);
  const supplier = state.suppliers.find((s) => s.id === values.supplierId);
  const movement = kind.startsWith("stock-");
  const title = movement
    ? kind === "stock-in"
      ? "Record Stock In"
      : "Record Stock Out"
    : `${record ? "Edit" : "Add"} ${kind === "items" ? "Item" : kind === "suppliers" ? "Supplier" : "Category"}`;
  const change = (name, value) => {
    setSaveError("");
    setTouched((t) => ({ ...t, [name]: true }));
    setValues((current) => {
      if (name === "itemId") {
        const selected = state.items.find((i) => i.id === value);
        return {
          ...current,
          itemId: value,
          unitCost: selected?.unitCost ?? 0,
          supplierId:
            state.suppliers.find((s) => s.id === selected?.supplierId && s.status === "Active")
              ?.id || "",
          department: selected?.department || "",
          location: selected?.location || "",
        };
      }
      return { ...current, [name]: value };
    });
  };
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current || Object.keys(errors).length) return;
    lock.current = true;
    setSaving(true);
    setSaveError("");
    try {
      await onSave(values);
    } catch (error) {
      setSaveError(getApiErrorMessage(error) || "The inventory server returned an empty error response. Check the failed save request in the browser Network tab.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      className="inventory-dialog inventory-form-dialog"
      closeOnOverlay={!saving}
    >
      <form onSubmit={submit} noValidate>
        {sections.map((section) => (
          <fieldset key={section.title}>
            <legend>{section.title}</legend>
            <div className="cms-form-grid">
              {section.fields.map((field) => (
                <Field
                  key={field.name}
                  field={field}
                  value={values[field.name]}
                  error={touched[field.name] ? errors[field.name] : ""}
                  onChange={change}
                  onBlur={(name) => setTouched((t) => ({ ...t, [name]: true }))}
                />
              ))}
            </div>
            {section.title === "Item Information" && movement && (
              <div className="inventory-note">
                Item code: {item?.code || "—"} · Category:{" "}
                {state.categories.find((c) => c.id === item?.categoryId)?.name || "—"} · Unit:{" "}
                {item?.unit || "—"} · Available stock: {item?.quantity ?? "—"}
                <br />
                Total amount: {money(Number(values.quantity || 0) * Number(values.unitCost || 0))}
              </div>
            )}
            {section.title === "Supplier Information" && movement && supplier && (
              <p className="inventory-note">
                Contact: {supplier.contact} · {supplier.phone} · {supplier.email || "No email"}
              </p>
            )}
            {section.title === "Stock Information" && (
              <p className="inventory-note">
                Opening value:{" "}
                {money(
                  Number(values.openingQty || 0) *
                    Number(values.id ? values.openingCost : values.unitCost || 0),
                )}
                . Valuation: moving weighted-average cost. Opening balances and unit cost are locked
                when editing; record stock changes through Stock In / Stock Out.
              </p>
            )}
          </fieldset>
        ))}
        {kind === "suppliers" && (
          <fieldset>
            <legend>Supplied Categories</legend>
            <div className="inventory-checks">
              {state.categories
                .filter((c) => c.status === "Active" || values.categoryIds?.includes(c.id))
                .map((c) => (
                  <label key={c.id}>
                    <input
                      type="checkbox"
                      checked={values.categoryIds?.includes(c.id) || false}
                      onChange={(event) =>
                        change(
                          "categoryIds",
                          event.target.checked
                            ? [...(values.categoryIds || []), c.id]
                            : values.categoryIds.filter((id) => id !== c.id),
                        )
                      }
                    />
                    {c.name}
                  </label>
                ))}
            </div>
          </fieldset>
        )}
        {saveError && (
          <p className="inventory-note" role="alert">
            {saveError}
          </p>
        )}
        {!!Object.keys(errors).length && (
          <p className="inventory-note" role="status">
            Complete the required fields and correct validation errors to save.
          </p>
        )}
        <div className="inventory-form-actions">
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={() => {
              setValues(initial);
              setTouched({});
            }}
            disabled={saving}
          >
            Reset
          </button>
          <button
            type="button"
            className="cms-btn cms-btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cms-btn cms-btn-primary"
            disabled={saving || !!Object.keys(errors).length}
          >
            {saving
              ? "Saving…"
              : movement
                ? `Save ${kind === "stock-in" ? "Stock In" : "Stock Out"}`
                : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
