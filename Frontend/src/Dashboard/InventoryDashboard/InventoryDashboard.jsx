import { Navigate, Route, Routes } from "react-router-dom";
import { inventorySession } from "./data/inventorySession.js";
import { InventoryDataProvider } from "./InventoryDataContext.jsx";
import InventoryLayout from "./layout/InventoryLayout.jsx";
import InventoryHomePage from "./pages/InventoryHomePage.jsx";
import InventoryItemsPage from "./pages/InventoryItemsPage.jsx";
import InventoryStockInPage from "./pages/InventoryStockInPage.jsx";
import InventoryStockOutPage from "./pages/InventoryStockOutPage.jsx";
import InventorySuppliersPage from "./pages/InventorySuppliersPage.jsx";
import InventoryCategoriesPage from "./pages/InventoryCategoriesPage.jsx";
import InventoryOrdersPage from "./pages/InventoryOrdersPage.jsx";
import InventoryReturnsPage from "./pages/InventoryReturnsPage.jsx";
import InventoryReportsPage from "./pages/InventoryReportsPage.jsx";
import InventoryNotificationsPage from "./pages/InventoryNotificationsPage.jsx";
import InventoryProfilePage from "./pages/InventoryProfilePage.jsx";
import InventorySettingsPage from "./pages/InventorySettingsPage.jsx";
import InventoryLeavePage from "./pages/InventoryLeavePage.jsx";
import InventoryPayslipsPage from "./pages/InventoryPayslipsPage.jsx";
import "@/components/pages/InventoryManagement/InventoryManagement.css";
import "./InventoryDashboard.css";
export default function InventoryDashboard() {
  if (!inventorySession()) return <Navigate to="/login" replace />;
  return (
    <InventoryDataProvider>
      <InventoryLayout>
        <Routes>
          <Route path="leave" element={<InventoryLeavePage />} />
          <Route path="payslips" element={<InventoryPayslipsPage />} />
          <Route index element={<InventoryHomePage />} />
          <Route path="items" element={<InventoryItemsPage />} />
          <Route path="stock-in" element={<InventoryStockInPage />} />
          <Route path="stock-out" element={<InventoryStockOutPage />} />
          <Route path="suppliers" element={<InventorySuppliersPage />} />
          <Route path="categories" element={<InventoryCategoriesPage />} />
          <Route path="orders" element={<InventoryOrdersPage />} />
          <Route path="returns" element={<InventoryReturnsPage />} />
          <Route path="reports" element={<InventoryReportsPage />} />
          <Route path="notifications" element={<InventoryNotificationsPage />} />
          <Route path="profile" element={<InventoryProfilePage />} />
          <Route path="settings" element={<InventorySettingsPage />} />
          <Route path="*" element={<Navigate to="/inventory-dashboard" replace />} />
        </Routes>
      </InventoryLayout>
    </InventoryDataProvider>
  );
}
