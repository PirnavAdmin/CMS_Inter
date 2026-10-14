import { DEPARTMENTS, ISSUE_TYPES, UNITS } from "./data/inventoryMockData.js";
import { today } from "./inventoryModel.js";

const text = (name, label, required = false, type = "text") => ({ name, label, required, type });
const number = (name, label, required = false, disabled = false) => ({
  ...text(name, label, required, "number"),
  min: 0,
  step: "any",
  disabled,
});
const select = (name, label, options, required = false) => ({
  ...text(name, label, required, "select"),
  options,
});
const date = (name, label, required = false) => text(name, label, required, "date");
const status = () => select("status", "Status", ["Active", "Inactive"], true);
export function recordOptions(records, currentId) {
  return records
    .filter((r) => r.status === "Active" || r.id === currentId)
    .map((r) => ({
      value: r.id,
      label: `${r.name}${r.status === "Inactive" ? " (Inactive)" : ""}`,
    }));
}
export function formInitial(kind, state, record, itemId, user) {
  if (record) return { ...record };
  if (kind === "items") {
    let codeNumber = state.nextId;
    let code = `INV-${String(codeNumber).padStart(4, "0")}`;
    while (state.items.some((item) => item.code.toLowerCase() === code.toLowerCase())) {
      codeNumber += 1;
      code = `INV-${String(codeNumber).padStart(4, "0")}`;
    }
    return {
      name: "",
      code,
      categoryId: "",
      unit: "Pieces",
      type: "Consumable",
      openingQty: 0,
      minStock: 0,
      unitCost: 0,
      maxStock: "",
      reorderQty: 0,
      status: "Active",
      supplierId: "",
      purchaseDate: "",
      warrantyDate: "",
    };
  }
  if (kind === "categories")
    return { name: "", code: "", status: "Active", department: "Administration" };
  if (kind === "suppliers")
    return {
      name: "",
      code: "",
      contact: "",
      phone: "",
      country: "India",
      status: "Active",
      categoryIds: [],
    };
  const item = state.items.find((i) => i.id === itemId);
  return {
    date: today(),
    number: `INV-TXN-${String(state.nextId).padStart(6, "0")}`,
    itemId: item?.id || "",
    quantity: "",
    unitCost: item?.unitCost ?? 0,
    supplierId:
      state.suppliers.find((s) => s.id === item?.supplierId && s.status === "Active")?.id || "",
    department: item?.department || "",
    location: item?.location || "",
    performedBy: user,
    recipient: "",
    purpose: "",
    issueType: "Academic Department",
    condition: "Good",
    returnable: false,
    expectedReturnDate: "",
  };
}
export function formSections(kind, state, values) {
  const categories = recordOptions(state.categories, values.categoryId);
  const suppliers = recordOptions(state.suppliers, kind === "items" ? values.supplierId : null);
  if (kind === "items" && !values.id)
    return [
      {
        title: "Item Information",
        fields: [
          text("name", "Item Name", true),
          select("categoryId", "Category", categories, true),
          select("unit", "Unit of Measurement", UNITS, true),
          select("type", "Item Type", ["Asset", "Consumable", "Returnable"]),
          text("brand", "Brand"),
          select("department", "Department", DEPARTMENTS),
          text("location", "Storage Location"),
          text("rack", "Rack / Shelf Number"),
        ],
      },
    ];
  if (kind === "items")
    return [
      {
        title: "Item Information",
        fields: [
          text("name", "Item Name", true),
          text("code", "Item Code", true),
          select("categoryId", "Category", categories, true),
          text("description", "Description", false, "textarea"),
          select("unit", "Unit of Measurement", UNITS, true),
          select("type", "Item Type", ["Asset", "Consumable", "Returnable"]),
          text("brand", "Brand"),
          text("model", "Model Number"),
          text("sku", "Barcode / SKU"),
          select("department", "Department", DEPARTMENTS),
          text("location", "Storage Location"),
          text("rack", "Rack / Shelf Number"),
        ],
      },
      {
        title: "Stock Information",
        fields: [
          number("openingQty", "Opening Stock Quantity", false, !!values.id),
          number("minStock", "Minimum Stock Level", true),
          number("maxStock", "Maximum Stock Level"),
          number("reorderQty", "Reorder Quantity"),
          number("unitCost", "Unit Cost (₹)", true, !!values.id),
          number("issueValue", "Selling / Issue Value (₹)"),
        ],
      },
      {
        title: "Supplier Information",
        fields: [
          select("supplierId", "Preferred Supplier", suppliers),
          text("supplierItemCode", "Supplier Item Code"),
          { ...date("lastPurchaseDate", "Last Purchase Date"), disabled: !!values.id },
        ],
      },
      {
        title: "Additional Information",
        fields: [
          date("purchaseDate", "Purchase Date"),
          date("warrantyDate", "Warranty Expiry Date"),
          status(),
          text("remarks", "Remarks", false, "textarea"),
        ],
      },
    ];
  if (kind === "suppliers")
    return [
      {
        title: "Supplier Information",
        fields: [
          text("name", "Supplier Name", true),
          text("code", "Supplier Code", true),
          text("contact", "Contact Person", true),
          text("phone", "Phone", true, "tel"),
          text("alternatePhone", "Alternate Phone", false, "tel"),
          text("email", "Email", false, "email"),
          text("gstin", "GSTIN"),
          text("pan", "PAN"),
          text("address1", "Address Line 1"),
          text("address2", "Address Line 2"),
          text("city", "City"),
          text("state", "State"),
          text("postalCode", "Postal Code"),
          text("country", "Country"),
          text("paymentTerms", "Payment Terms"),
          status(),
        ],
      },
      {
        title: "Optional Bank Information",
        fields: [
          text("bank", "Bank Name"),
          text("accountHolder", "Account Holder"),
          text("accountNumber", "Account Number"),
          text("ifsc", "IFSC"),
          text("notes", "Notes", false, "textarea"),
        ],
      },
    ];
  if (kind === "categories")
    return [
      {
        title: "Category Information",
        fields: [
          text("name", "Category Name", true),
          text("code", "Category Code", true),
          text("description", "Description", false, "textarea"),
          select("department", "Responsible Department", DEPARTMENTS),
          status(),
        ],
      },
    ];
  const isIn = kind === "stock-in";
  return [
    {
      title: "Transaction Information",
      fields: [
        { ...text("number", "Transaction Number"), disabled: true },
        date("date", isIn ? "Transaction Date" : "Issue Date", true),
        text("reference", "Reference Number"),
        ...(isIn
          ? [text("purchaseOrder", "Purchase Order Number"), text("invoice", "Invoice Number")]
          : [text("approvedBy", "Approved By")]),
        text("performedBy", isIn ? "Received By" : "Issued By", true),
        text("remarks", "Remarks", false, "textarea"),
      ],
    },
    {
      title: "Item Information",
      fields: [
        select("itemId", "Item", recordOptions(state.items), true),
        {
          ...number("quantity", isIn ? "Quantity Received" : "Quantity Issued", true),
          min: 0.000001,
        },
        number("unitCost", "Unit Cost (₹)", true, !isIn),
      ],
    },
    ...(isIn
      ? [
          {
            title: "Supplier Information",
            fields: [
              select("supplierId", "Supplier", suppliers, true),
              text("supplierInvoice", "Supplier Invoice Number"),
            ],
          },
          {
            title: "Receiving Information",
            fields: [
              text("location", "Received At / Storage Location"),
              select("department", "Department", DEPARTMENTS),
              select("condition", "Condition", ["New", "Good", "Used", "Damaged"]),
              text("batch", "Batch Number"),
              date("expiryDate", "Expiry Date"),
            ],
          },
        ]
      : [
          {
            title: "Issue Destination",
            fields: [
              select("issueType", "Issue To Type", ISSUE_TYPES, true),
              select("department", "Department", DEPARTMENTS, true),
              text("recipient", "Recipient Name", true),
              text("recipientId", "Employee / Student ID"),
              text("destination", "Classroom / Laboratory / Office"),
              text("purpose", "Purpose of Issue", true),
              {
                ...text("returnable", "Returnable Item", false, "checkbox"),
                placeholder: "Record as returnable",
              },
              ...(values.returnable
                ? [date("expectedReturnDate", "Expected Return Date", true)]
                : []),
              select("condition", "Issue Condition", ["New", "Good", "Used", "Damaged"]),
            ],
          },
        ]),
  ];
}
