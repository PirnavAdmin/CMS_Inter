import React, { useState, useMemo } from "react";
import {
  KeyRound,
  Plus,
  RefreshCw,
  ArrowRight,
  Filter,
  Bus,
  Users,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useTransportManager } from "../TransportManagerContext.jsx";
import TransportManagerPageHeader from "../components/TransportManagerPageHeader.jsx";
import TransportManagerDataTable from "../components/TransportManagerDataTable.jsx";
import TransportManagerStatusBadge from "../components/TransportManagerStatusBadge.jsx";
import TransportManagerModal from "../components/TransportManagerModal.jsx";
import TransportManagerAlert from "../components/TransportManagerAlert.jsx";
import {
  createVehicleAssignment,
  reassignDriver,
} from "../services/transportAssignmentApi.js";
import { validateAssignmentForm } from "../utils/transportManagerValidation.js";
import "../styles/TransportManagerAssignments.css";

const emptyForm = {
  vehicleId: "",
  driverId: "",
  routeId: "1",
  morningTripTime: "07:00 AM",
  eveningTripTime: "03:45 PM",
  effectiveFrom: new Date().toISOString().split("T")[0],
  shift: "Morning",
  status: "Active",
};

export default function TransportManagerAssignments() {
  const { vehicles, drivers, assignments, loading, refreshAll, showToast } =
    useTransportManager();

  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal states: null | 'new' | 'reassign'
  const [modalMode, setModalMode] = useState(null);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Quick stats
  const activeAssignments = useMemo(
    () => assignments.filter((a) => a.status === "Active"),
    [assignments]
  );
  const assignedDriverIds = useMemo(
    () => new Set(activeAssignments.map((a) => String(a.driverId))),
    [activeAssignments]
  );
  const assignedVehicleIds = useMemo(
    () => new Set(activeAssignments.map((a) => String(a.vehicleId))),
    [activeAssignments]
  );

  const availableDrivers = useMemo(
    () => drivers.filter((d) => d.status === "Active" && !assignedDriverIds.has(String(d.id))),
    [drivers, assignedDriverIds]
  );

  const availableVehicles = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          v.status === "Active" &&
          v.condition !== "Under Maintenance" &&
          v.condition !== "Out of Service" &&
          !assignedVehicleIds.has(String(v.id))
      ),
    [vehicles, assignedVehicleIds]
  );

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    if (statusFilter === "ALL") return assignments;
    return assignments.filter((a) => a.status === statusFilter);
  }, [assignments, statusFilter]);

  const handleOpenNew = () => {
    setModalMode("new");
    setActiveAssignment(null);
    setForm({
      ...emptyForm,
      effectiveFrom: new Date().toISOString().split("T")[0],
      vehicleId: availableVehicles[0]?.id ? String(availableVehicles[0].id) : "",
      driverId: availableDrivers[0]?.id ? String(availableDrivers[0].id) : "",
    });
    setFormErrors({});
    setErrorMsg("");
  };

  const handleOpenReassign = (assignment) => {
    setModalMode("reassign");
    setActiveAssignment(assignment);
    setForm({
      vehicleId: String(assignment.vehicleId),
      driverId: "", // user selects new driver
      routeId: String(assignment.routeId || 1),
      morningTripTime: assignment.morningTripTime || "07:00 AM",
      eveningTripTime: assignment.eveningTripTime || "03:45 PM",
      effectiveFrom: new Date().toISOString().split("T")[0],
      shift: assignment.shift || "Morning",
      status: "Active",
    });
    setFormErrors({});
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEdit = modalMode === "reassign";

    const { isValid, errors } = validateAssignmentForm({
      vehicleId: form.vehicleId,
      driverId: form.driverId,
      routeId: form.routeId,
      effectiveFrom: form.effectiveFrom,
      existingAssignments: assignments,
      isEdit,
      currentAssignmentId: activeAssignment?.id,
      vehicles,
      drivers,
    });

    if (!isValid) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      if (isEdit) {
        await reassignDriver(activeAssignment.id, form);
        showToast("Driver reassigned to vehicle successfully.", "success");
      } else {
        await createVehicleAssignment(form);
        showToast("New driver–vehicle assignment created successfully.", "success");
      }
      setModalMode(null);
      refreshAll();
    } catch (err) {
      setErrorMsg(err.message || "Assignment failed. Please check parameters.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProposedDriver = useMemo(() => {
    if (!form.driverId) return null;
    return drivers.find((d) => String(d.id) === String(form.driverId));
  }, [drivers, form.driverId]);

  const columns = [
    {
      header: "Vehicle & Route",
      key: "vehicleNumber",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--cms-text-primary, #0f172a)" }}>
            {row.vehicleNumber}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--cms-text-secondary, #64748b)" }}>
            Route: {row.routeName}
          </div>
        </div>
      ),
    },
    {
      header: "Assigned Driver",
      key: "driverName",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.driverName}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--cms-text-secondary, #64748b)" }}>
            Driver ID: {row.driverId}
          </div>
        </div>
      ),
    },
    {
      header: "Trip Timings & Shift",
      key: "shift",
      render: (row) => (
        <div>
          <div>{row.shift}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--cms-text-secondary, #64748b)" }}>
            {row.morningTripTime} - {row.eveningTripTime}
          </div>
        </div>
      ),
    },
    {
      header: "Effective Date",
      key: "effectiveFrom",
      render: (row) => <span>{row.effectiveFrom || "Current Term"}</span>,
    },
    {
      header: "Status",
      key: "status",
      render: (row) => <TransportManagerStatusBadge status={row.status} />,
    },
    {
      header: "Actions",
      key: "actions",
      render: (row) => (
        <button
          type="button"
          className="tm-btn tm-btn--secondary tm-btn--sm"
          onClick={() => handleOpenReassign(row)}
          title="Change or Reassign Driver for this Vehicle"
        >
          <RefreshCw size={14} /> Change Driver
        </button>
      ),
    },
  ];

  return (
    <div className="tm-assignments-page">
      <TransportManagerPageHeader
        title="Driver–Vehicle Assignments"
        subtitle="Operational roster linking eligible drivers to roadworthy fleet vehicles and routes"
        actions={
          <button type="button" className="tm-btn tm-btn--primary" onClick={handleOpenNew}>
            <Plus size={16} /> New Assignment
          </button>
        }
      />

      {/* Quick Summary Cards */}
      <div className="tm-assignment-quick-stats">
        <div className="tm-quick-stat-box">
          <div className="tm-quick-stat-box__icon" style={{ background: "#dcfce7", color: "#16a34a" }}>
            <CheckCircle size={22} />
          </div>
          <div className="tm-quick-stat-box__meta">
            <span className="tm-quick-stat-box__label">Active Assignments</span>
            <span className="tm-quick-stat-box__value">{activeAssignments.length}</span>
          </div>
        </div>

        <div className="tm-quick-stat-box">
          <div className="tm-quick-stat-box__icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <Users size={22} />
          </div>
          <div className="tm-quick-stat-box__meta">
            <span className="tm-quick-stat-box__label">Available Active Drivers</span>
            <span className="tm-quick-stat-box__value">{availableDrivers.length}</span>
          </div>
        </div>

        <div className="tm-quick-stat-box">
          <div className="tm-quick-stat-box__icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            <Bus size={22} />
          </div>
          <div className="tm-quick-stat-box__meta">
            <span className="tm-quick-stat-box__label">Available Unassigned Buses</span>
            <span className="tm-quick-stat-box__value">{availableVehicles.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="tm-filter-bar">
        <div className="tm-filter-group">
          <Filter size={16} color="#64748b" />
          <span className="tm-filter-label">Filter:</span>
        </div>

        <div className="tm-filter-group">
          <span className="tm-filter-label">Status:</span>
          <select
            className="tm-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Assignments</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <TransportManagerDataTable
        columns={columns}
        data={filteredAssignments}
        loading={loading}
        searchable
        searchPlaceholder="Search assignments by vehicle, driver name, or route..."
        searchKeys={["vehicleNumber", "driverName", "routeName"]}
        emptyTitle="No assignments found"
        emptySubtitle="No active or inactive assignments match the selected filter."
      />

      {/* Assignment & Reassignment Modal */}
      <TransportManagerModal
        isOpen={Boolean(modalMode)}
        onClose={() => setModalMode(null)}
        title={modalMode === "reassign" ? "Change Driver Assignment" : "New Driver–Vehicle Assignment"}
        subtitle={
          modalMode === "reassign"
            ? `Reassigning vehicle ${activeAssignment?.vehicleNumber}`
            : "Assign an available driver to an eligible fleet bus"
        }
      >
        <form onSubmit={handleSubmit}>
          {errorMsg && (
            <TransportManagerAlert type="danger" message={errorMsg} onClose={() => setErrorMsg("")} />
          )}

          {/* Reassignment Comparison Preview */}
          {modalMode === "reassign" && (
            <div className="tm-assignment-reassign-preview">
              <div className="tm-assignment-reassign-side">
                <span className="tm-assignment-reassign-label">Current Driver</span>
                <span className="tm-assignment-reassign-name">
                  {activeAssignment?.driverName || "Driver"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Vehicle: {activeAssignment?.vehicleNumber}
                </span>
              </div>

              <ArrowRight size={20} color="#2563eb" />

              <div className="tm-assignment-reassign-side">
                <span className="tm-assignment-reassign-label">Proposed New Driver</span>
                <span className="tm-assignment-reassign-name" style={{ color: "#2563eb" }}>
                  {selectedProposedDriver ? selectedProposedDriver.driverName : "Select Below..."}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {selectedProposedDriver ? `Emp ID: ${selectedProposedDriver.employeeId}` : "--"}
                </span>
              </div>
            </div>
          )}

          {/* Vehicle Selection */}
          <div className="tm-form-group">
            <label className="tm-form-label">Vehicle *</label>
            {modalMode === "reassign" ? (
              <input
                type="text"
                className="tm-form-input"
                value={`${activeAssignment?.vehicleNumber} (${activeAssignment?.routeName})`}
                disabled
              />
            ) : (
              <select
                className="tm-form-select"
                value={form.vehicleId}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                required
              >
                <option value="">-- Select an Available Vehicle --</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.vehicleNumber} ({v.registrationNumber}) - {v.capacity} Seats ({v.condition})
                  </option>
                ))}
              </select>
            )}
            {formErrors.vehicleId && (
              <span className="tm-form-error">{formErrors.vehicleId}</span>
            )}
          </div>

          {/* Driver Selection */}
          <div className="tm-form-group">
            <label className="tm-form-label">
              {modalMode === "reassign" ? "Select New Driver *" : "Driver *"}
            </label>
            <select
              className="tm-form-select"
              value={form.driverId}
              onChange={(e) => setForm({ ...form, driverId: e.target.value })}
              required
            >
              <option value="">-- Select an Eligible Active Driver --</option>
              {availableDrivers.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.driverName} (Emp ID: {d.employeeId || "N/A"}) - Exp: {d.experience}y
                </option>
              ))}
              {modalMode === "reassign" && activeAssignment && (
                <option value={String(activeAssignment.driverId)} disabled>
                  {activeAssignment.driverName} (Currently Assigned)
                </option>
              )}
            </select>
            {formErrors.driverId && (
              <span className="tm-form-error">{formErrors.driverId}</span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="tm-form-group">
              <label className="tm-form-label">Effective Start Date *</label>
              <input
                type="date"
                className="tm-form-input"
                value={form.effectiveFrom}
                onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                required
              />
              {formErrors.effectiveFrom && (
                <span className="tm-form-error">{formErrors.effectiveFrom}</span>
              )}
            </div>

            <div className="tm-form-group">
              <label className="tm-form-label">Shift</label>
              <select
                className="tm-form-select"
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value })}
              >
                <option value="Morning">Morning Shift</option>
                <option value="Evening">Evening Shift</option>
                <option value="Full Day">Full Day</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="tm-form-group">
              <label className="tm-form-label">Morning Trip Time</label>
              <input
                type="text"
                className="tm-form-input"
                value={form.morningTripTime}
                onChange={(e) => setForm({ ...form, morningTripTime: e.target.value })}
              />
            </div>

            <div className="tm-form-group">
              <label className="tm-form-label">Evening Trip Time</label>
              <input
                type="text"
                className="tm-form-input"
                value={form.eveningTripTime}
                onChange={(e) => setForm({ ...form, eveningTripTime: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button
              type="button"
              className="tm-btn tm-btn--secondary"
              onClick={() => setModalMode(null)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="tm-btn tm-btn--primary" disabled={submitting}>
              {submitting
                ? "Processing..."
                : modalMode === "reassign"
                ? "Confirm Reassignment"
                : "Create Assignment"}
            </button>
          </div>
        </form>
      </TransportManagerModal>
    </div>
  );
}
