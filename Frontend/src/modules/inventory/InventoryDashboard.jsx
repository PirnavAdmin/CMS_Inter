import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute.jsx";
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
import "@/modules/admin/AdminInventory/InventoryManagement.css";
import "./InventoryDashboard.css";
export default function InventoryDashboard() {
  if (!inventorySession()) return <Navigate to="/login" replace />;
  return (
    <InventoryDataProvider>
      <InventoryLayout>
        <Routes>
          <Route path="leave" element={<ProtectedRoute requiredModule="staff-leave-management"><InventoryLeavePage /></ProtectedRoute>} />
          <Route path="payslips" element={<ProtectedRoute requiredModule="payroll"><InventoryPayslipsPage /></ProtectedRoute>} />
          <Route index element={<InventoryHomePage />} />
          <Route path="items" element={<ProtectedRoute requiredModule="inventory-management"><InventoryItemsPage /></ProtectedRoute>} />
          <Route path="stock-in" element={<ProtectedRoute requiredModule="inventory-management"><InventoryStockInPage /></ProtectedRoute>} />
          <Route path="stock-out" element={<ProtectedRoute requiredModule="inventory-management"><InventoryStockOutPage /></ProtectedRoute>} />
          <Route path="suppliers" element={<ProtectedRoute requiredModule="inventory-management"><InventorySuppliersPage /></ProtectedRoute>} />
          <Route path="categories" element={<ProtectedRoute requiredModule="inventory-management"><InventoryCategoriesPage /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute requiredModule="inventory-management"><InventoryOrdersPage /></ProtectedRoute>} />
          <Route path="returns" element={<ProtectedRoute requiredModule="inventory-management"><InventoryReturnsPage /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute requiredModule="inventory-management"><InventoryReportsPage /></ProtectedRoute>} />
          <Route path="notifications" element={<InventoryNotificationsPage />} />
          <Route path="profile" element={<ProtectedRoute requiredModule="profile"><InventoryProfilePage /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute requiredModule="settings"><InventorySettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/inventory-dashboard" replace />} />
        </Routes>
      </InventoryLayout>
    </InventoryDataProvider>
  );
}
