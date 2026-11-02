import InventoryRecordScreen from "../components/InventoryRecordScreen.jsx";
export default function InventoryCategoriesPage() {
  return (
    <InventoryRecordScreen
      kind="categories"
      title="Categories"
      columns={[
        { key: "name", label: "Category" },
        { key: "code", label: "Code" },
        { key: "department", label: "Department" },
        { key: "description", label: "Description" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
