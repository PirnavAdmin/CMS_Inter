import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { Modal } from "@/shared/components/Ui.jsx";
import { today } from "@/modules/admin/AdminInventory/inventoryModel.js";
import { useDialogFocus } from "@/modules/admin/AdminInventory/components/InventoryUi.jsx";
import { useInventory } from "../InventoryDataContext.jsx";
import InventoryTable from "../components/InventoryTable.jsx";
import "../styles/InventoryStaffPages.css";

function LeaveForm({ onClose }) {
  const { state, update, applyLeave } = useInventory();
  const leaveTypes = state.leaveCategories.map((category) => category.name);
  const leaveEntitlements = state.leaveEntitlements;
  const [error, setError] = useState("");
  useDialogFocus(onClose);
  return (
    <Modal title="Apply for Leave" onClose={onClose} className="inventory-dialog">
      <form
        className="ip-form ip-leave-form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await applyLeave(Object.fromEntries(new FormData(e.currentTarget)));
            onClose();
          } catch (failure) {
            setError(failure.message);
          }
        }}
      >
        <label>
          Leave Type
          <select name="type" required>
            <option value="">Select Leave Type</option>
            {leaveTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          From Date
          <input type="date" name="fromDate" min={today()} required />
        </label>
        <label>
          To Date
          <input type="date" name="toDate" min={today()} required />
        </label>
        <label>
          Reason
          <textarea name="reason" required maxLength={500} />
        </label>
        {error && (
          <p className="ip-error" role="alert">
            {error}
          </p>
        )}
        <div className="ip-actions">
          <button type="button" className="cms-btn cms-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="cms-btn cms-btn-primary">Submit Application</button>
        </div>
      </form>
    </Modal>
  );
}

export default function InventoryLeavePage() {
  const { state, update, applyLeave } = useInventory();
  const leaveTypes = state.leaveCategories.map((category) => category.name);
  const leaveEntitlements = state.leaveEntitlements;
  const [searchParams, setSearchParams] = useSearchParams();

  const cardParam = searchParams.get("card");
  const tabParam = searchParams.get("tab") || "applications";
  const [tab, setTab] = useState(() => (tabParam === "balance" ? "balance" : "applications"));
  const [status, setStatus] = useState(() => searchParams.get("status") || "");
  const [type, setType] = useState(() => searchParams.get("type") || "");
  const [open, setOpen] = useState(() => cardParam === "apply" || cardParam === "apply-leave");

  useEffect(() => {
    const card = searchParams.get("card");
    if (card === "apply" || card === "apply-leave") {
      setOpen(true);
    } else if (!card && open) {
      setOpen(false);
    }
  }, [searchParams]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "balance" || t === "applications") {
      setTab(t);
    }
  }, [searchParams]);

  const handleOpenApply = () => {
    setOpen(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("card", "apply");
      return next;
    });
  };

  const handleCloseApply = () => {
    setOpen(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("card");
      return next;
    });
  };

  const handleTabChange = (id) => {
    setTab(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id === "balance") {
        next.set("tab", "balance");
      } else {
        next.delete("tab");
      }
      return next;
    });
  };

  const handleStatusChange = (val) => {
    setStatus(val);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set("status", val);
      else next.delete("status");
      return next;
    });
  };

  const handleTypeChange = (val) => {
    setType(val);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set("type", val);
      else next.delete("type");
      return next;
    });
  };

  const currentYear = today().slice(0, 4);

  return (
    <>
      <div className="ip-page-head">
        <div>
          <h1>
            <FileText size={26} /> Leave Management
          </h1>
          <p>View your applications, check balances, and request time off.</p>
        </div>
        <button className="cms-btn cms-btn-primary" onClick={handleOpenApply}>
          <Plus size={16} /> Apply for Leave
        </button>
      </div>
      <div className="ip-staff-metrics">
        {[
          [
            "Approved Leaves",
            state.leaves.filter((l) => l.status === "Approved").reduce((sum, l) => sum + l.days, 0),
            "days",
          ],
          [
            "Pending Approvals",
            state.leaves.filter((l) => l.status === "Pending").length,
            "applications",
          ],
          [
            "Rejected / Cancelled",
            state.leaves.filter((l) => ["Rejected", "Cancelled"].includes(l.status)).length,
            "applications",
          ],
        ].map(([label, value, unit]) => (
          <article className="ip-card" key={label}>
            <p>{label}</p>
            <strong>
              {value} <small>{unit}</small>
            </strong>
          </article>
        ))}
      </div>
      <div className="ip-staff-tabs" role="group" aria-label="Leave views">
        {[
          ["applications", "Leave Applications"],
          ["balance", "Leave Balance"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            className={`cms-btn ${tab === id ? "cms-btn-primary" : "cms-btn-ghost"}`}
            onClick={() => handleTabChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "applications" ? (
        <InventoryTable
          title="Leave Applications"
          rows={state.leaves.filter(
            (l) => (!status || l.status === status) && (!type || l.type === type),
          )}
          toolbarExtra={
            <>
              <select
                className="cms-btn cms-btn-ghost"
                aria-label="Filter leave status"
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="">All Statuses</option>
                {["Pending", "Approved", "Rejected", "Cancelled"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                className="cms-btn cms-btn-ghost"
                aria-label="Filter leave type"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="">All Leave Types</option>
                {leaveTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </>
          }
          columns={[
            { key: "type", label: "Leave Type" },
            { key: "fromDate", label: "From Date" },
            { key: "toDate", label: "To Date" },
            { key: "days", label: "Days" },
            { key: "reason", label: "Reason" },
            { key: "status", label: "Status" },
            {
              key: "actions",
              label: "Actions",
              exportable: false,
              render: (l) => (
                <button
                  className="cms-btn cms-btn-ghost"
                  disabled={l.status !== "Pending"}
                  onClick={() => {
                    if (window.confirm("Cancel this pending leave application?"))
                      update(
                        (s) => ({
                          ...s,
                          leaves: s.leaves.map((r) =>
                            r.id === l.id ? { ...r, status: "Cancelled" } : r,
                          ),
                        }),
                        "Leave application cancelled",
                      );
                  }}
                >
                  Cancel
                </button>
              ),
            },
          ]}
        />
      ) : (
        <section className="ip-card">
          <h2>Leave Balance · {currentYear}</h2>
          <p>
            {state.leaveBalance
              ? `Overall balance: ${state.leaveBalance.total || state.leaveBalance.totalRemaining || 37} entitled · ${state.leaveBalance.used || 0} used · ${state.leaveBalance.remaining || state.leaveBalance.totalRemaining || 37} remaining. Category-specific entitlements are not provided by this API.`
              : "Leave balance unavailable from server. Recorded usage is shown below."}
          </p>
          {leaveTypes.map((t) => {
            const used = state.leaves
              .filter(
                (l) =>
                  l.type === t && l.status === "Approved" && l.fromDate.startsWith(currentYear),
              )
              .reduce((sum, l) => sum + l.days, 0);
            const reserved = state.leaves
              .filter(
                (l) => l.type === t && l.status === "Pending" && l.fromDate.startsWith(currentYear),
              )
              .reduce((sum, l) => sum + l.days, 0);
            return (
              <div className="ip-list-row" key={t}>
                <strong>{t}</strong>
                <span>
                  {leaveEntitlements[t] ?? "Unavailable"} entitled · {used} used · {reserved}{" "}
                  pending ·{" "}
                  <b>
                    {leaveEntitlements[t] == null
                      ? "Unavailable"
                      : leaveEntitlements[t] - used - reserved}{" "}
                    available
                  </b>
                </span>
              </div>
            );
          })}
        </section>
      )}
      {open && <LeaveForm onClose={handleCloseApply} />}
    </>
  );
}
