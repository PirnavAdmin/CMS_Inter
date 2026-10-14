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
import { createDemoState } from "./data/inventoryMockData.js";
import {
  deactivateRecord,
  deleteItem,
  loadInventory,
  persistInventory,
  postMovement,
  recordReturn,
  reverseMovement,
  saveRecord,
  validateRecord,
} from "./inventoryModel.js";
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
  const [loaded] = useState(() => loadInventory());
  const [state, setState] = useState(loaded.state);
  const stateRef = useRef(state);
  const [notice, setNotice] = useState(
    loaded.warning ? { message: loaded.warning, type: "warning" } : null,
  );
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
  const open = (kind, record = null, itemId = null) => {
    const canonical = record && stateRef.current[kind]?.find((value) => value.id === record.id);
    setModal({ kind, record: canonical || record, itemId });
  };
  const go = (slug, scope) =>
    navigate(`${BASE}${slug ? `/${slug}` : ""}${scope ? `?scope=${scope}` : ""}`);
  const commit = (operation, message) => {
    try {
      const next = operation(stateRef.current);
      // Persist before applying the local mutation. Failed storage does not silently lose demo edits.
      persistInventory(next);
      stateRef.current = next;
      setState(next);
      notify(message);
      return true;
    } catch (error) {
      notify(error.message || "The local operation could not be saved.", "error");
      return false;
    }
  };
  useEffect(() => {
    try {
      persistInventory(loaded.state);
    } catch {
      setNotice({
        message: "Browser storage is unavailable. Enable local storage to save demo changes.",
        type: "warning",
      });
    }
  }, [loaded]);
  useEffect(() => {
    setModal(null);
    setConfirmation(null);
  }, [location.pathname]);
  const refresh = () => {
    const next = { ...stateRef.current };
    stateRef.current = next;
    setState(next);
    notify("Dashboard and tables recalculated from local demo data.");
  };
  const save = (values) => {
    const kind = modal.kind;
    const errors = validateRecord(
      kind,
      values,
      stateRef.current,
      formSections(kind, stateRef.current, values).flatMap((s) => s.fields),
    );
    if (Object.keys(errors).length) {
      notify(Object.values(errors)[0], "error");
      return;
    }
    if (
      commit(
        (current) =>
          kind.startsWith("stock-")
            ? postMovement(current, kind, values)
            : saveRecord(current, kind, values),
        kind.startsWith("stock-")
          ? "Stock transaction posted. Balances and reports updated."
          : "Inventory record saved.",
      )
    )
      closeModal();
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
        : "This item has no stock or transaction history. Delete it from the local demo? Deleting items with history could affect inventory records.",
      confirmLabel: deactivate ? "Deactivate" : "Delete",
      danger: true,
      onConfirm: () => {
        commit(
          (current) =>
            deactivate
              ? deactivateRecord(current, kind, record.id)
              : deleteItem(current, record.id),
          `${record.name} ${deactivate ? "deactivated" : "deleted"}.`,
        );
        closeConfirmation();
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
      onConfirm: () => {
        commit(
          (current) => reverseMovement(current, movement.id, userName),
          "Transaction reversed. Correction recorded in the ledger.",
        );
        closeConfirmation();
      },
    });
  const returnItem = (movement) =>
    setConfirmation({
      title: "Record full return?",
      message: `Confirm that all ${movement.quantity} units from ${movement.number} have physically returned. This adds a receipt at the original issue cost. Expected return dates alone never add stock.`,
      confirmLabel: "Record Return",
      onConfirm: () => {
        commit(
          (current) => recordReturn(current, movement.id, userName),
          "Full return recorded. Stock balance updated.",
        );
        closeConfirmation();
      },
    });
  const resetDemo = () =>
    setConfirmation({
      title: "Reset Demo Data?",
      message:
        "All inventory demo edits will be replaced with the original sample items, suppliers, categories and movements. Authentication storage is unaffected.",
      confirmLabel: "Reset Demo Data",
      danger: true,
      onConfirm: () => {
        commit(() => createDemoState(), "Original inventory demo dataset restored.");
        closeConfirmation();
        setRevision((value) => value + 1);
      },
    });
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
            <Boxes size={18} /> Local demo · Changes saved in this browser · Weighted-average
            valuation
          </span>
          <button className="cms-btn cms-btn-ghost" onClick={resetDemo}>
            <RotateCcw size={15} /> Reset Demo Data
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
