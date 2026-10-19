import InventoryRecordScreen from "../components/InventoryRecordScreen.jsx";
export default function InventoryItemsPage() {
  return (
    <InventoryRecordScreen
      kind="items"
      title="Inventory Items"
      columns={[
        { key: "name", label: "Item Name" },
        { key: "category", label: "Category" },
        { key: "unit", label: "Unit" },
        { key: "type", label: "Item Type" },
        { key: "brand", label: "Brand" },
        { key: "department", label: "Department" },
        { key: "location", label: "Storage Location" },
        { key: "rack", label: "Rack / Shelf" },
      ]}
    />
  );
}
