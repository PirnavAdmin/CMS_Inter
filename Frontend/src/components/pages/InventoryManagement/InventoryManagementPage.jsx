import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  LayoutDashboard,
  List,
  Plus,
  RefreshCw,
  RotateCcw,
  Tags,
  Truck,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout.jsx";
import { ConfirmDialog, Toast } from "@/components/common/Ui.jsx";
import { getAuthUser } from "@/features/authStorage.js";
import {
  loadInventoryApi,
  saveInventoryApi,
  inventoryAction,
  inventoryDetail,
  normalizeInventory,
} from "./inventoryApi.js";
import { getApiErrorMessage } from "@/api/apiClient.js";
import { validateRecord } from "./inventoryModel.js";
import { formSections } from "./inventoryFields.js";
import InventoryForm from "./components/InventoryForm.jsx";
import InventoryDetails from "./components/InventoryDetails.jsx";
import {
  InventoryDashboard,
  InventoryItems,
  InventoryMasters,
  InventoryMovements,
  InventoryReports,
} from "./components/InventoryScreens.jsx";
import { useDialogFocus } from "./components/InventoryUi.jsx";
import "./InventoryManagement.css";

const BASE = "/dashboard/inventory-management";
const TABS = [
  ["", "Dashboard", LayoutDashboard, "Manage college inventory, stock, supplies and assets."],
  ["items", "Items", List, "View and manage all college inventory items."],
  [
    "stock-in",
    "Stock In",
    ArrowDownToLine,
    "Record newly received stock from suppliers or other college departments.",
  ],
  [
    "stock-out",
    "Stock Out",
    ArrowUpFromLine,
    "Issue inventory items to classrooms, laboratories, departments and staff.",
  ],
  [
    "suppliers",
    "Suppliers",
    Truck,
    "Manage vendors supplying materials and equipment to the college.",
  ],
  ["categories", "Categories", Tags, "Organize college inventory by material and equipment type."],
  [
    "reports",
    "Reports",
    BarChart3,
    "Review stock levels, inventory value and college material movements.",
  ],
];
function InventoryConfirmation({ config, onClose }) {
  useDialogFocus(onClose);
  return <ConfirmDialog {...config} onCancel={onClose} />;
}
export default function InventoryManagementPage() {
  const [state, setState] = useState({
    items: [],
    categories: [],
    suppliers: [],
    movements: [],
    orders: [],
    activities: [],
    nextId: 1,
  });
  const stateRef = useRef(state);
  const [notice, setNotice] = useState(null);
  const requestVersion = useRef(0);
  const mutationLock = useRef(false);
  const [modal, setModal] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [revision, setRevision] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const tab = location.pathname.slice(BASE.length).replace(/^\/+|\/+$/g, "");
  const active = TABS.find(([slug]) => slug === tab);
  const user = getAuthUser();
  const userName = user?.fullName || user?.name || user?.username || "Demo Store Administrator";
  const closeModal = useCallback(() => setModal(null), []);
  const closeConfirmation = useCallback(() => setConfirmation(null), []);
  const closeToast = useCallback(() => setNotice(null), []);
  const notify = (message, type = "success") => setNotice({ message, type });
  const open = async (kind, record = null, itemId = null) => {
    try {
      const collection =
        kind === "item-detail" || kind === "items"
          ? "items"
          : kind === "movement-detail"
            ? "movements"
            : null;
      if (record && collection) {
        const detail = await inventoryDetail(collection, record.id);
        const next = {
          ...stateRef.current,
          [collection]: stateRef.current[collection].map((r) => (r.id === detail.id ? detail : r)),
        };
        stateRef.current = next;
        setState(next);
        record = detail;
      }
      setModal({ kind, record, itemId });
    } catch (error) {
      notify(getApiErrorMessage(error), "error");
    }
  };
  const go = (slug, scope) =>
    navigate(`${BASE}${slug ? `/${slug}` : ""}${scope ? `?scope=${scope}` : ""}`);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const next = await loadInventoryApi();
      if (version === requestVersion.current) {
        stateRef.current = next;
        setState(next);
      }
      return true;
    } catch (error) {
      if (version === requestVersion.current)
        setNotice({ message: getApiErrorMessage(error), type: "error" });
      return false;
    }
  }, []);
  const commit = async (operation, message) => {
    if (mutationLock.current) return false;
    mutationLock.current = true;
    try {
      await operation();
      notify(message);
      await refresh();
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error), "error");
      return false;
    } finally {
      mutationLock.current = false;
    }
  };
  useEffect(() => {
    refresh();
    return () => {
      requestVersion.current += 1;
    };
  }, [refresh]);
  useEffect(() => {
    setModal(null);
    setConfirmation(null);
  }, [location.pathname]);
  const save = async (values) => {
    const kind = modal.kind;
    const errors = validateRecord(
      kind,
      values,
      stateRef.current,
      formSections(kind, stateRef.current, values).flatMap((s) => s.fields),
    );
    if (Object.keys(errors).length) {
      notify(Object.values(errors)[0], "error");
      throw new Error(Object.values(errors)[0]);
    }
    if (mutationLock.current) return;
    mutationLock.current = true;
    try {
      const saved = await saveInventoryApi(kind, values);
      if (!kind.startsWith("stock-")) {
        const record = normalizeInventory(saved, kind);
        if (!record.id)
          throw new Error(
            "The server saved the record but returned no record ID. Reload inventory to verify it before retrying.",
          );
        const next = {
          ...stateRef.current,
          [kind]: [...stateRef.current[kind].filter((r) => r.id !== record.id), record],
        };
        stateRef.current = next;
        setState(next);
      }
      closeModal();
      notify(kind.startsWith("stock-") ? "Stock transaction posted." : "Inventory record saved.");
      await refresh();
    } catch (error) {
      const message = getApiErrorMessage(error);
      notify(message, "error");
      throw new Error(message);
    } finally {
      mutationLock.current = false;
    }
  };
  const remove = (kind, record) => {
    const blocked =
      kind === "items" &&
      (record.quantity > 0 || state.movements.some((m) => m.itemId === record.id));
    const deactivate = kind !== "items" || blocked;
    setConfirmation({
      title: `${deactivate ? "Deactivate" : "Delete"} ${record.name}?`,
      message: deactivate
        ? `${blocked ? "This item has stock or transaction history and cannot be deleted. " : ""}Deactivation preserves existing stock and historical references. It will no longer be selectable for new transactions or records.`
        : "This item has no stock or transaction history. Delete it from inventory? Deleting items with history could affect inventory records.",
      confirmLabel: deactivate ? "Deactivate" : "Delete",
      danger: true,
      onConfirm: async () => {
        const succeeded = await commit(
          () =>
            inventoryAction(
              `${kind}/${encodeURIComponent(record.id)}${deactivate ? "/deactivate" : ""}`,
              deactivate ? "patch" : "delete",
            ),
          `${record.name} ${deactivate ? "deactivated" : "deleted"}.`,
        );
        if (succeeded) closeConfirmation();
      },
    });
  };
  const correct = (movement) =>
    setConfirmation({
      title: `Reverse ${movement.number}?`,
      message:
        "A compensating stock movement will be added to the ledger. Only the latest unreturned movement for this item can be reversed, to preserve later quantities and costs.",
      confirmLabel: "Reverse Transaction",
      danger: true,
      onConfirm: async () => {
        const succeeded = await commit(
          () => inventoryAction(`movements/${encodeURIComponent(movement.id)}/reverse`),
          "Transaction reversed. Correction recorded in the ledger.",
        );
        if (succeeded) closeConfirmation();
      },
    });
  const returnItem = (movement) =>
    setConfirmation({
      title: "Record full return?",
      message: `Confirm that all ${movement.quantity} units from ${movement.number} have physically returned. This adds a receipt at the original issue cost. Expected return dates alone never add stock.`,
      confirmLabel: "Record Return",
      onConfirm: async () => {
        const succeeded = await commit(
          () => inventoryAction(`movements/${encodeURIComponent(movement.id)}/return`),
          "Full return recorded. Stock balance updated.",
        );
        if (succeeded) closeConfirmation();
      },
    });
  const resetDemo = () => {
    setRevision((value) => value + 1);
    refresh();
  };
  if (!active) return <Navigate to={BASE} replace />;
  const shared = { state, open, refresh };
  return (
    <DashboardLayout
      title="Inventory Management"
      subtitle={active[3]}
      breadcrumb={[
        { label: "Academic" },
        { label: "Inventory Management" },
        ...(tab ? [{ label: active[1] }] : []),
      ]}
      actions={
        <>
          <button className="cms-btn cms-btn-ghost" onClick={refresh}>
            <RefreshCw size={15} /> Refresh Dashboard
          </button>
          <button className="cms-btn cms-btn-primary" onClick={() => open("items")}>
            <Plus size={16} /> Add Item
          </button>
        </>
      }
    >
      <div className="inventory-module">
        <div className="inventory-demo-banner">
          <span>
            <Boxes size={18} /> Server inventory · Changes saved to the backend · Weighted-average
            valuation
          </span>
          <button className="cms-btn cms-btn-ghost" onClick={resetDemo}>
            <RotateCcw size={15} /> Reload Inventory
          </button>
        </div>
        <nav className="inventory-tabs" aria-label="Inventory sections">
          {TABS.map(([slug, label, Icon]) => (
            <NavLink
              key={slug || "dashboard"}
              to={`${BASE}${slug ? `/${slug}` : ""}`}
              end
              className={({ isActive }) => `inventory-tab${isActive ? " active" : ""}`}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div key={`${tab}-${revision}`}>
          {!tab && <InventoryDashboard {...shared} navigate={go} />}
          {tab === "items" && <InventoryItems {...shared} remove={remove} />}
          {(tab === "stock-in" || tab === "stock-out") && (
            <InventoryMovements
              {...shared}
              type={tab === "stock-in" ? "Stock In" : "Stock Out"}
              all={new URLSearchParams(location.search).get("scope") === "all"}
              correct={correct}
              returnItem={returnItem}
            />
          )}
          {(tab === "suppliers" || tab === "categories") && (
            <InventoryMasters {...shared} kind={tab} remove={remove} />
          )}
          {tab === "reports" && <InventoryReports {...shared} returnItem={returnItem} />}
        </div>
      </div>
      {modal &&
        (modal.kind.endsWith("-detail") ? (
          <InventoryDetails
            key={`${modal.kind}-${modal.record.id}`}
            {...modal}
            state={state}
            onClose={closeModal}
          />
        ) : (
          <InventoryForm
            key={`${modal.kind}-${modal.record?.id || modal.itemId || "new"}`}
            {...modal}
            state={state}
            user={userName}
            onClose={closeModal}
            onSave={save}
          />
        ))}
      {confirmation && <InventoryConfirmation config={confirmation} onClose={closeConfirmation} />}
      {notice && <Toast {...notice} onClose={closeToast} />}
    </DashboardLayout>
  );
}
