import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { getAuthUser } from "@/modules/auth/authStorage.js";
import { getApiErrorMessage } from "@/api/apiClient.js";
import {
  loadInventoryApi,
  saveInventoryApi,
  inventoryAction,
} from "@/modules/admin/AdminInventory/inventoryApi.js";
import {
  loadProfile,
  loadLeaveCategories,
  loadLeaves,
  loadLeaveBalance,
  submitLeave,
  loadPayslips,
} from "./data/inventoryUserApi.js";
const Context = createContext(null);
const initial = () => ({
  items: [],
  categories: [],
  suppliers: [],
  movements: [],
  orders: [],
  activities: [],
  nextId: 1,
  serverBacked: true,
  profile: {
    name: getAuthUser()?.fullName || getAuthUser()?.name || "",
    email: getAuthUser()?.email || "",
    phone: "",
    department: "",
    employeeId: "",
  },
  readNotifications: [],
  preferences: { lowStock: true, orderUpdates: true },
  leaves: [],
  leaveCategories: [],
  leaveEntitlements: {},
  payslips: [],
});
export function InventoryDataProvider({ children }) {
  const [state, setState] = useState(initial),
    [message, setMessage] = useState(""),
    [errors, setErrors] = useState({}),
    [loading, setLoading] = useState(true);
  const stateRef = useRef(state),
    mounted = useRef(false),
    pending = useRef(false),
    writing = useRef(false);
  const apply = (operation) =>
    setState((current) => {
      const next = operation(current);
      stateRef.current = next;
      return next;
    });
  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    const tasks = {
      inventory: loadInventoryApi,
      profile: loadProfile,
      leaveCategories: loadLeaveCategories,
      leaves: loadLeaves,
      leaveBalance: loadLeaveBalance,
    };
    try {
      const results = await Promise.allSettled(Object.values(tasks).map((fn) => fn()));
      if (!mounted.current) return;
      const failures = {};
      const patch = {};
      Object.keys(tasks).forEach((key, index) => {
        const result = results[index];
        if (result.status === "rejected") failures[key] = getApiErrorMessage(result.reason);
        else if (key === "inventory") Object.assign(patch, result.value);
        else patch[key] = result.value;
      });
      if (patch.profile) {
        try {
          patch.payslips = await loadPayslips(patch.profile);
        } catch (e) {
          failures.payslips = getApiErrorMessage(e);
        }
      }
      if (!mounted.current) return;
      apply((s) => ({ ...s, ...patch }));
      setErrors(failures);
    } finally {
      pending.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    refresh();
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = setInterval(visible, 120000);
    window.addEventListener("focus", visible);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      window.removeEventListener("focus", visible);
    };
  }, [refresh]);
  const perform = async (operation, text = "Changes saved to server") => {
    if (writing.current) throw new Error("A save is already in progress.");
    writing.current = true;
    try {
      const value = await operation();
      setMessage(text);
      await refresh();
      return value;
    } catch (e) {
      setMessage(getApiErrorMessage(e));
      throw e;
    } finally {
      writing.current = false;
    }
  };
  const save = (kind, values) => perform(() => saveInventoryApi(kind, values));
  const remove = async (kind, record) => {
    const deactivate =
      kind !== "items" ||
      record.quantity > 0 ||
      stateRef.current.movements.some((m) => m.itemId === record.id);
    if (window.confirm(`${deactivate ? "Deactivate" : "Delete"} ${record.name}?`))
      try {
        await perform(() =>
          inventoryAction(
            `${kind}/${encodeURIComponent(record.id)}${deactivate ? "/deactivate" : ""}`,
            deactivate ? "patch" : "delete",
          ),
        );
      } catch {
        /* Message shown by provider. */
      }
  };
  const update = (operation) => {
    const next = operation(stateRef.current);
    if (next.readNotifications !== stateRef.current.readNotifications) {
      apply((s) => ({ ...s, readNotifications: next.readNotifications }));
      setMessage("Marked read for this session");
      return true;
    }
    setMessage(
      "This action needs an Inventory employee API. See SERVER_INTEGRATION.md. No changes were saved.",
    );
    return false;
  };
  return (
    <Context.Provider
      value={{
        state,
        loading,
        errors,
        refresh,
        save,
        remove,
        update,
        message,
        dismiss: () => setMessage(""),
        reverse: (id) =>
          perform(() => inventoryAction(`movements/${encodeURIComponent(id)}/reverse`)),
        returnItem: (id) =>
          perform(() => inventoryAction(`movements/${encodeURIComponent(id)}/return`)),
        applyLeave: (values) =>
          perform(
            () => submitLeave(values, stateRef.current.leaveCategories),
            "Leave application submitted",
          ),
        reset: () => refresh(),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useInventory = () => useContext(Context);
