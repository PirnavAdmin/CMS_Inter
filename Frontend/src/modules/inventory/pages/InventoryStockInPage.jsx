import InventoryRecordScreen from "../components/InventoryRecordScreen.jsx";
export default function InventoryStockInPage() {
  return (
    <InventoryRecordScreen
      kind="stock-in"
      title="Stock In"
      columns={[
        { key: "number", label: "Transaction Number" },
        { key: "date", label: "Date" },
        { key: "item", label: "Item" },
        { key: "type", label: "Movement" },
        { key: "quantity", label: "Quantity" },
        { key: "department", label: "Department" },
        { key: "performedBy", label: "Received By" },
      ]}
    />
  );
}
