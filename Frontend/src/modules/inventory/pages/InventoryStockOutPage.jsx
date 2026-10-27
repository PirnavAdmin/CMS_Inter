import InventoryRecordScreen from "../components/InventoryRecordScreen.jsx";
export default function InventoryStockOutPage() {
  return (
    <InventoryRecordScreen
      kind="stock-out"
      title="Stock Out"
      columns={[
        { key: "number", label: "Transaction Number" },
        { key: "date", label: "Date" },
        { key: "item", label: "Item" },
        { key: "quantity", label: "Quantity" },
        { key: "department", label: "Department" },
        { key: "recipient", label: "Recipient" },
        { key: "performedBy", label: "Issued By" },
      ]}
    />
  );
}
