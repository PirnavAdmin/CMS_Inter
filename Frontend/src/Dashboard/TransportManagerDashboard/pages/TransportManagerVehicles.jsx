import React, { useState, useMemo } from "react";
import { Bus, Plus, Eye, Edit, Filter, AlertTriangle } from "lucide-react";
import { useTransportManager } from "../TransportManagerContext.jsx";
import TransportManagerPageHeader from "../components/TransportManagerPageHeader.jsx";
import TransportManagerDataTable from "../components/TransportManagerDataTable.jsx";
import TransportManagerStatusBadge from "../components/TransportManagerStatusBadge.jsx";
import TransportManagerModal from "../components/TransportManagerModal.jsx";
import TransportManagerAlert from "../components/TransportManagerAlert.jsx";
import TransportManagerVehicleDetails from "./TransportManagerVehicleDetails.jsx";
import { createVehicle, updateVehicle } from "../services/transportVehicleApi.js";
import { validateVehicleForm } from "../utils/transportManagerValidation.js";
import { VEHICLE_CONDITIONS } from "../data/transportManagerModel.js";
import "../styles/TransportManagerVehicles.css";

const emptyVehicleForm = {
  vehicleNumber: "",
  registrationNumber: "",
  vehicleType: "Bus",
  capacity: "40",
  isAC: false,
  gpsDeviceId: "",
  chassisNumber: "",
  engineNumber: "",
  insuranceExpiry: "",
  pollutionExpiry: "",
  fitnessExpiry: "",
  status: "Active",
};

export default function TransportManagerVehicles() {
  const { vehicles, assignments, maintenance, loading, refreshAll, showToast } =
    useTransportManager();

  const [conditionFilter, setConditionFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Drawer / modal states
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [form, setForm] = useState(emptyVehicleForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Map active assignments to vehicles
  const vehicleAssignmentMap = useMemo(() => {
    const map = new Map();
    assignments
      .filter((a) => a.status === "Active")
      .forEach((a) => {
        map.set(String(a.vehicleId), a);
      });
    return map;
  }, [assignments]);

  // Enriched vehicles
  const enrichedVehicles = useMemo(() => {
    return vehicles.map((v) => {
      const activeAssignment = vehicleAssignmentMap.get(String(v.id));
      return {
        ...v,
        currentDriver: activeAssignment?.driverName || "Unassigned",
        assignedRoute: activeAssignment?.routeName || "--",
        isAssigned: Boolean(activeAssignment),
      };
    });
  }, [vehicles, vehicleAssignmentMap]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return enrichedVehicles.filter((v) => {
      if (conditionFilter !== "ALL" && v.condition !== conditionFilter) return false;
      if (typeFilter !== "ALL" && v.vehicleType !== typeFilter) return false;
      return true;
    });
  }, [enrichedVehicles, conditionFilter, typeFilter]);

  const handleOpenDetails = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailsOpen(true);
  };

  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingVehicleId(null);
    setForm(emptyVehicleForm);
    setFormErrors({});
    setErrorMsg("");
  };

  const handleOpenEdit = (vehicle) => {
    setModalMode("edit");
    setEditingVehicleId(vehicle.id);
    setForm({
      vehicleNumber: vehicle.vehicleNumber || "",
      registrationNumber: vehicle.registrationNumber || "",
      vehicleType: vehicle.vehicleType || "Bus",
      capacity: String(vehicle.capacity || 40),
      isAC: Boolean(vehicle.isAC),
      gpsDeviceId: vehicle.gpsDeviceId || "",
      chassisNumber: vehicle.chassisNumber || "",
      engineNumber: vehicle.engineNumber || "",
      insuranceExpiry: vehicle.insuranceExpiry || "",
      pollutionExpiry: vehicle.pollutionExpiry || "",
      fitnessExpiry: vehicle.fitnessExpiry || "",
      status: vehicle.status || "Active",
    });
    setFormErrors({});
    setErrorMsg("");
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const isEdit = modalMode === "edit";

    const { isValid, errors } = validateVehicleForm(
      form,
      vehicles,
      isEdit,
      editingVehicleId
    );

    if (!isValid) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      if (isEdit) {
        await updateVehicle(editingVehicleId, form);
        showToast("Vehicle updated successfully.", "success");
      } else {
        await createVehicle(form);
        showToast("New vehicle registered successfully.", "success");
      }
      setModalMode(null);
      refreshAll();
    } catch (err) {
      setErrorMsg(err.message || "Operation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: "Vehicle No. & Type",
      key: "vehicleNumber",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--cms-text-primary, #0f172a)" }}>
            {row.vehicleNumber}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--cms-text-secondary, #64748b)" }}>
            {row.vehicleType} • {row.isAC ? "AC" : "Non-AC"} ({row.capacity} Seats)
          </div>
        </div>
      ),
    },
    {
      header: "Registration No.",
      key: "registrationNumber",
      render: (row) => (
        <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
          {row.registrationNumber || "--"}
        </span>
      ),
    },
    {
      header: "Condition",
      key: "condition",
      render: (row) => <TransportManagerStatusBadge condition={row.condition} />,
    },
    {
      header: "Assigned Driver",
      key: "currentDriver",
      render: (row) => (
        <div>
          <span
            style={{
              fontWeight: row.isAssigned ? 600 : 400,
              color: row.isAssigned ? "var(--cms-text-primary, #0f172a)" : "#94a3b8",
            }}
          >
            {row.currentDriver}
          </span>
          {row.isAssigned && (
            <div style={{ fontSize: "0.75rem", color: "var(--cms-text-secondary, #64748b)" }}>
              Route: {row.assignedRoute}
            </div>
          )}
        </div>
      ),
    },
    {
      header: "Fitness Due",
      key: "fitnessExpiry",
      render: (row) => {
        const isExpired = row.fitnessExpiry && new Date(row.fitnessExpiry) < new Date();
        return (
          <span style={{ color: isExpired ? "#dc2626" : "inherit", fontWeight: isExpired ? 600 : 400 }}>
            {row.fitnessExpiry || "N/A"}
          </span>
        );
      },
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
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            className="tm-btn tm-btn--secondary tm-btn--sm"
            onClick={() => handleOpenDetails(row)}
            title="View Vehicle Specs"
          >
            <Eye size={14} /> Specs
          </button>
          <button
            type="button"
            className="tm-btn tm-btn--secondary tm-btn--sm"
            onClick={() => handleOpenEdit(row)}
            title="Edit Vehicle Details"
          >
            <Edit size={14} /> Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="tm-vehicles-page">
      <TransportManagerPageHeader
        title="Vehicles & Bus Fleet"
        subtitle="Manage buses, seating capacity, condition tracking, regulatory document expiry, and technical specs"
        actions={
          <button type="button" className="tm-btn tm-btn--primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Register Vehicle
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="tm-filter-bar">
        <div className="tm-filter-group">
          <Filter size={16} color="#64748b" />
          <span className="tm-filter-label">Filter:</span>
        </div>

        <div className="tm-filter-group">
          <span className="tm-filter-label">Condition:</span>
          <select
            className="tm-filter-select"
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
          >
            <option value="ALL">All Conditions</option>
            <option value={VEHICLE_CONDITIONS.OPERATIONAL}>Operational</option>
            <option value={VEHICLE_CONDITIONS.NEEDS_INSPECTION}>Needs Inspection</option>
            <option value={VEHICLE_CONDITIONS.MAINTENANCE_REQUIRED}>Maintenance Required</option>
            <option value={VEHICLE_CONDITIONS.UNDER_MAINTENANCE}>Under Maintenance</option>
            <option value={VEHICLE_CONDITIONS.OUT_OF_SERVICE}>Out of Service</option>
          </select>
        </div>

        <div className="tm-filter-group">
          <span className="tm-filter-label">Type:</span>
          <select
            className="tm-filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="Bus">Bus</option>
            <option value="Mini-Bus">Mini-Bus</option>
            <option value="Van">Van</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <TransportManagerDataTable
        columns={columns}
        data={filteredVehicles}
        loading={loading}
        searchable
        searchPlaceholder="Search vehicles by number, registration, or driver..."
        searchKeys={["vehicleNumber", "registrationNumber", "currentDriver"]}
        emptyTitle="No vehicles found"
        emptySubtitle="No vehicles match the selected condition or type filter."
      />

      {/* Vehicle Details Drawer */}
      <TransportManagerVehicleDetails
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        vehicle={selectedVehicle}
        assignment={selectedVehicle ? vehicleAssignmentMap.get(String(selectedVehicle.id)) : null}
        maintenanceList={
          selectedVehicle
            ? maintenance.filter((m) => String(m.vehicleId) === String(selectedVehicle.id))
            : []
        }
        onEdit={handleOpenEdit}
      />

      {/* Register / Edit Vehicle Modal */}
      <TransportManagerModal
        isOpen={Boolean(modalMode)}
        onClose={() => setModalMode(null)}
        title={modalMode === "edit" ? "Edit Vehicle Details" : "Register New Vehicle"}
        subtitle={
          modalMode === "edit"
            ? `Update specifications and status for ${form.vehicleNumber}`
            : "Enter official vehicle registration and capacity specifications"
        }
      >
        <form onSubmit={handleSubmitForm}>
          {errorMsg && (
            <TransportManagerAlert type="danger" message={errorMsg} onClose={() => setErrorMsg("")} />
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="tm-form-group">
              <label className="tm-form-label">Vehicle Name / Number *</label>
              <input
                type="text"
                className="tm-form-input"
                placeholder="e.g. Bus-01"
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                required
              />
              {formErrors.vehicleNumber && (
                <span className="tm-form-error">{formErrors.vehicleNumber}</span>
              )}
            </div>

            <div className="tm-form-group">
              <label className="tm-form-label">Registration Number *</label>
              <input
                type="text"
                className="tm-form-input"
                placeholder="e.g. AP-09-XY-1234"
                value={form.registrationNumber}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                required
              />
              {formErrors.registrationNumber && (
                <span className="tm-form-error">{formErrors.registrationNumber}</span>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div className="tm-form-group">
              <label className="tm-form-label">Vehicle Type</label>
              <select
                className="tm-form-select"
                value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
              >
                <option value="Bus">Bus</option>
                <option value="Mini-Bus">Mini-Bus</option>
                <option value="Van">Van</option>
              </select>
            </div>

            <div className="tm-form-group">
              <label className="tm-form-label">Seating Capacity *</label>
              <input
                type="number"
                min="1"
                max="120"
                className="tm-form-input"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                required
              />
              {formErrors.capacity && (
                <span className="tm-form-error">{formErrors.capacity}</span>
              )}
            </div>

            <div className="tm-form-group">
              <label className="tm-form-label">AC Climate</label>
              <select
                className="tm-form-select"
                value={form.isAC ? "yes" : "no"}
                onChange={(e) => setForm({ ...form, isAC: e.target.value === "yes" })}
              >
                <option value="no">Non-AC</option>
                <option value="yes">AC Equipped</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="tm-form-group">
              <label className="tm-form-label">Fitness Certificate Expiry</label>
              <input
                type="date"
                className="tm-form-input"
                value={form.fitnessExpiry}
                onChange={(e) => setForm({ ...form, fitnessExpiry: e.target.value })}
              />
              {formErrors.fitnessExpiry && (
                <span className="tm-form-error">{formErrors.fitnessExpiry}</span>
              )}
            </div>

            <div className="tm-form-group">
              <label className="tm-form-label">Insurance Expiry</label>
              <input
                type="date"
                className="tm-form-input"
                value={form.insuranceExpiry}
                onChange={(e) => setForm({ ...form, insuranceExpiry: e.target.value })}
              />
              {formErrors.insuranceExpiry && (
                <span className="tm-form-error">{formErrors.insuranceExpiry}</span>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="tm-form-group">
              <label className="tm-form-label">GPS Device ID</label>
              <input
                type="text"
                className="tm-form-input"
                placeholder="GPS-XXXX"
                value={form.gpsDeviceId}
                onChange={(e) => setForm({ ...form, gpsDeviceId: e.target.value })}
              />
            </div>

            <div className="tm-form-group">
              <label className="tm-form-label">Operational Status</label>
              <select
                className="tm-form-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="Active">Active / In Service</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Inactive">Inactive / Out of Service</option>
              </select>
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
              {submitting ? "Saving..." : modalMode === "edit" ? "Save Changes" : "Register Vehicle"}
            </button>
          </div>
        </form>
      </TransportManagerModal>
    </div>
  );
}
