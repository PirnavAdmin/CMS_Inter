import InventoryRecordScreen from "../components/InventoryRecordScreen.jsx";
export default function InventorySuppliersPage() {
  return (
    <InventoryRecordScreen
      kind="suppliers"
      title="Suppliers"
      columns={[
        { key: "name", label: "Supplier" },
        { key: "code", label: "Code" },
        { key: "contact", label: "Contact Person" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
