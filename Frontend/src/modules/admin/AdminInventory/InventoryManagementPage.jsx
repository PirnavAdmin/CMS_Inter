import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Navigate, useLocation, useSearchParams } from "react-router-dom";
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
import DashboardLayout from "@/shared/layouts/DashboardLayout/DashboardLayout.jsx";
import { ConfirmDialog, Toast } from "@/shared/components/Ui.jsx";
import { getAuthUser } from "@/modules/auth/authStorage.js";
import { validateRecord } from "./inventoryModel.js";
import { getApiErrorMessage } from "@/api/apiClient.js";
import { loadInventoryApi, saveInventoryApi, inventoryAction } from "./inventoryApi.js";
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
    serverBacked: true,
  });
  const stateRef = useRef(state);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const requestVersion = useRef(0);
  const writing = useRef(false);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError("");
    try {
      const next = await loadInventoryApi();
      if (version !== requestVersion.current) return;
      stateRef.current = next;
      setState(next);
    } catch (error) {
      if (version === requestVersion.current) setLoadError(getApiErrorMessage(error));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);
  const [modal, setModal] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromPath = location.pathname.slice(BASE.length).replace(/^\/+|\/+$/g, "");
  const tabFromQuery = searchParams.get("tab") || "";
  const tab = tabFromPath || tabFromQuery;
  const active = TABS.find(([slug]) => slug === tab);
  const user = getAuthUser();
  const userName = user?.fullName || user?.name || user?.username || "Store Administrator";

  const getCardSlug = (kind, record) => {
    if (kind === "items") return record ? "edit-item" : "add-item";
    if (kind === "suppliers") return record ? "edit-supplier" : "add-supplier";
    if (kind === "categories") return record ? "edit-category" : "add-category";
    return kind;
  };

  const closeModal = useCallback(() => {
    setModal(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("card");
      next.delete("id");
      next.delete("itemId");
      return next;
    });
  }, [setSearchParams]);

  const closeConfirmation = useCallback(() => setConfirmation(null), []);
  const closeToast = useCallback(() => setNotice(null), []);
  const notify = (message, type = "success") => setNotice({ message, type });

  const open = (kind, record = null, itemId = null) => {
    const canonical = record && stateRef.current[kind]?.find((value) => value.id === record.id);
    const activeRecord = canonical || record;
    setModal({ kind, record: activeRecord, itemId });

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const cardSlug = getCardSlug(kind, activeRecord);
      next.set("card", cardSlug);
      if (activeRecord?.id != null) {
        next.set("id", String(activeRecord.id));
      } else {
        next.delete("id");
      }
      if (itemId != null) {
        next.set("itemId", String(itemId));
      } else {
        next.delete("itemId");
      }
      return next;
    });
  };

  // Restore open card from searchParams on page load or refresh
  useEffect(() => {
    const cardParam = searchParams.get("card");
    if (!cardParam) {
      if (modal && !writing.current) {
        setModal(null);
      }
      return;
    }

    const idParam = searchParams.get("id");
    const itemIdParam = searchParams.get("itemId");

    let kind = cardParam;
    let isEdit = false;
    if (cardParam === "add-item") kind = "items";
    else if (cardParam === "edit-item") { kind = "items"; isEdit = true; }
    else if (cardParam === "add-supplier") kind = "suppliers";
    else if (cardParam === "edit-supplier") { kind = "suppliers"; isEdit = true; }
    else if (cardParam === "add-category") kind = "categories";
    else if (cardParam === "edit-category") { kind = "categories"; isEdit = true; }

    const findRecord = () => {
      if (!idParam) return null;
      if (kind === "item-detail" || (kind === "items" && isEdit)) {
        return state.items.find((i) => String(i.id) === String(idParam));
      }
      if (kind === "movement-detail" || kind === "stock-in" || kind === "stock-out") {
        return state.movements.find((m) => String(m.id) === String(idParam));
      }
      if (kind === "supplier-detail" || (kind === "suppliers" && isEdit)) {
        return state.suppliers.find((s) => String(s.id) === String(idParam));
      }
      if (kind === "category-detail" || (kind === "categories" && isEdit)) {
        return state.categories.find((c) => String(c.id) === String(idParam));
      }
      return null;
    };

    const targetRecord = findRecord();
    const itemId = itemIdParam ? (Number(itemIdParam) || itemIdParam) : null;

    if (!idParam || targetRecord) {
      setModal((curr) => {
        if (
          curr?.kind === kind &&
          curr?.record?.id === targetRecord?.id &&
          curr?.itemId === itemId
        ) {
          return curr;
        }
        return { kind, record: targetRecord, itemId };
      });
    }
  }, [searchParams, state.items, state.movements, state.suppliers, state.categories]);

  const commit = async (operation, message) => {
    if (writing.current) return false;
    writing.current = true;
    try {
      await operation();
      notify(message);
      await refresh();
      return true;
    } catch (error) {
      notify(getApiErrorMessage(error), "error");
      return false;
    } finally {
      writing.current = false;
    }
  };
  useEffect(() => {
    refresh();
    return () => {
      requestVersion.current += 1;
    };
  }, [refresh]);
  useEffect(() => {
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
      return;
    }
    if (
      await commit(
        () => saveInventoryApi(kind, values),
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
        : "This item has no stock or transaction history. Delete it from inventory?",
      confirmLabel: deactivate ? "Deactivate" : "Delete",
      danger: true,
      onConfirm: () => {
        commit(
          () =>
            inventoryAction(
              `${kind}/${encodeURIComponent(record.id)}${deactivate ? "/deactivate" : ""}`,
              deactivate ? "patch" : "delete",
            ),
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
          () => inventoryAction(`movements/${encodeURIComponent(movement.id)}/reverse`),
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
          () => inventoryAction(`movements/${encodeURIComponent(movement.id)}/return`),
          "Full return recorded. Stock balance updated.",
        );
        closeConfirmation();
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
        !tab ? (
          <>
            <button className="cms-btn cms-btn-ghost" onClick={refresh}>
              <RefreshCw size={15} /> Refresh Dashboard
            </button>
            <button className="cms-btn cms-btn-primary" onClick={() => open("items")}>
              <Plus size={16} /> Add Item
            </button>
          </>
        ) : null
      }
    >
      <div className="inventory-module">
        <div className="inventory-demo-banner">
          <span>
            <Boxes size={18} /> Inventory · Changes saved to the backend · Weighted-average
            valuation
          </span>
          <button className="cms-btn cms-btn-ghost" onClick={refresh}>
            <RotateCcw size={15} /> Reload Inventory
          </button>
        </div>
        <nav className="inventory-tabs" aria-label="Inventory sections">
          {TABS.map(([slug, label, Icon]) => (
            <NavLink
              key={slug || "dashboard"}
              to={`${BASE}${slug ? `/${slug}` : ""}`}
              end
              className={({ isActive }) => `inventory-tab${isActive || tab === slug ? " active" : ""}`}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        {loading && (
          <p role="status">Loading inventory from the server...</p>
        )}
        {loadError && (
          <div role="alert" className="cms-alert-error">
            Inventory could not be loaded. {loadError}
          </div>
        )}
          <div key={tab} aria-busy={loading}>
            {!tab && <InventoryDashboard {...shared} />}
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
