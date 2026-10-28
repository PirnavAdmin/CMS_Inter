import { useMemo, useRef, useState } from "react";
import { Field, Modal } from "@/shared/components/Ui.jsx";
import { formInitial, formSections } from "../inventoryFields.js";
import { money, validateRecord } from "../inventoryModel.js";
import { useDialogFocus } from "./InventoryUi.jsx";

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
  const receiptInput = useRef(null);
  const receiptVersion = useRef(0);
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
    setTouched((t) => ({ ...t, [name]: true }));
    setValues((current) => {
      if (name === "paymentMethod") {
        receiptVersion.current += 1;
        if (receiptInput.current) receiptInput.current.value = "";
        return { ...current, paymentMethod: value, number: "", cashReceipt: null };
      }
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
    try {
      await onSave(values);
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
              {section.fields.map((field) =>
                field.name === "cashReceipt" ? (
                  <div className="inventory-cash-receipt" key={field.name}>
                    <label htmlFor="inventory-cash-receipt">Cash Receipt Image (Optional)</label>
                    <input
                      ref={receiptInput}
                      id="inventory-cash-receipt"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={saving}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        const version = ++receiptVersion.current;
                        change("cashReceipt", null);
                        if (!file) return;
                        if (
                          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
                          file.size > 5 * 1024 * 1024
                        ) {
                          setSaveError("Choose a JPG, PNG, or WebP image up to 5 MB.");
                          event.target.value = "";
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (receiptVersion.current === version)
                            change("cashReceipt", {
                              name: file.name,
                              dataUrl: reader.result,
                              ...(state.serverBacked ? { file } : {}),
                            });
                        };
                        reader.onerror = () => {
                          if (receiptVersion.current === version)
                            setSaveError("Unable to read this image. Please choose it again.");
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    {values.cashReceipt && (
                      <div className="inventory-receipt-preview">
                        <img src={values.cashReceipt.dataUrl} alt="Selected cash receipt" />
                        <span>{values.cashReceipt.name}</span>
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost"
                          onClick={() => {
                            receiptVersion.current += 1;
                            change("cashReceipt", null);
                            if (receiptInput.current) receiptInput.current.value = "";
                          }}
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Field
                    key={field.name}
                    field={field}
                    value={values[field.name]}
                    error={touched[field.name] ? errors[field.name] : ""}
                    onChange={change}
                    onBlur={(name) => setTouched((t) => ({ ...t, [name]: true }))}
                  />
                ),
              )}
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
              receiptVersion.current += 1;
              if (receiptInput.current) receiptInput.current.value = "";
              setSaveError("");
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
