import React from "react";
import TransportManagerDrawer from "../components/TransportManagerDrawer.jsx";
import TransportManagerStatusBadge from "../components/TransportManagerStatusBadge.jsx";
import { Bus, KeyRound, Wrench, ShieldCheck, Calendar, Edit, FileText } from "lucide-react";

export default function TransportManagerVehicleDetails({
  isOpen,
  onClose,
  vehicle,
  assignment,
  maintenanceList = [],
  onEdit,
}) {
  if (!vehicle) return null;

  return (
    <TransportManagerDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Vehicle Specification & Fitness"
      subtitle={`Registration: ${vehicle.registrationNumber || "N/A"}`}
      width="520px"
    >
      <div className="tm-vehicle-detail">
        <div className="tm-vehicle-detail__header">
          <div className="tm-vehicle-detail__icon-wrap">
            <Bus size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 className="tm-vehicle-detail__number">{vehicle.vehicleNumber}</h4>
            <p className="tm-vehicle-detail__reg">Reg No: {vehicle.registrationNumber}</p>
            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
              <TransportManagerStatusBadge condition={vehicle.condition} />
              <TransportManagerStatusBadge status={vehicle.status} />
            </div>
          </div>
          {onEdit && (
            <button
              type="button"
              className="tm-btn tm-btn--secondary tm-btn--sm"
              onClick={() => {
                onClose();
                onEdit(vehicle);
              }}
            >
              <Edit size={14} /> Edit
            </button>
          )}
        </div>

        {/* Assigned Driver & Route */}
        <div className="tm-detail-section">
          <h5 className="tm-detail-section__title">Current Assignment</h5>
          {assignment ? (
            <div className="tm-assignment-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "var(--cms-text-primary, #0f172a)" }}>
                  Driver: {assignment.driverName}
                </span>
                <TransportManagerStatusBadge status="In Service" />
              </div>
              <div className="tm-detail-field">
                <span className="tm-detail-field__label">Route</span>
                <span className="tm-detail-field__value">{assignment.routeName}</span>
              </div>
              <div className="tm-detail-field">
                <span className="tm-detail-field__label">Schedule & Shift</span>
                <span className="tm-detail-field__value">
                  {assignment.morningTripTime} (Morning) / {assignment.eveningTripTime} (Evening)
                </span>
              </div>
              <div className="tm-detail-field">
                <span className="tm-detail-field__label">Bus Attendant</span>
                <span className="tm-detail-field__value">{assignment.attendantName}</span>
              </div>
            </div>
          ) : (
            <div className="tm-assignment-card" style={{ textAlign: "center", color: "#64748b" }}>
              Vehicle is currently unassigned to any driver or route.
            </div>
          )}
        </div>

        {/* Technical Specs */}
        <div className="tm-detail-section">
          <h5 className="tm-detail-section__title">Technical Specifications</h5>
          <div className="tm-detail-grid">
            <div className="tm-detail-field">
              <span className="tm-detail-field__label">Vehicle Type</span>
              <span className="tm-detail-field__value">{vehicle.vehicleType}</span>
            </div>
            <div className="tm-detail-field">
              <span className="tm-detail-field__label">Passenger Capacity</span>
              <span className="tm-detail-field__value">{vehicle.capacity} Seats</span>
            </div>
            <div className="tm-detail-field">
              <span className="tm-detail-field__label">AC / Climate Control</span>
              <span className="tm-detail-field__value">{vehicle.isAC ? "AC Equipped" : "Non-AC"}</span>
            </div>
            <div className="tm-detail-field">
              <span className="tm-detail-field__label">GPS Device ID</span>
              <span className="tm-detail-field__value">{vehicle.gpsDeviceId || "Not Installed"}</span>
            </div>
            <div className="tm-detail-field">
              <span className="tm-detail-field__label">Chassis Number</span>
              <span className="tm-detail-field__value">{vehicle.chassisNumber || "N/A"}</span>
            </div>
            <div className="tm-detail-field">
              <span className="tm-detail-field__label">Engine Number</span>
              <span className="tm-detail-field__value">{vehicle.engineNumber || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Regulatory Documents & Expiry */}
        <div className="tm-detail-section">
          <h5 className="tm-detail-section__title">Compliance & Document Validity</h5>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div className="tm-document-card">
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Fitness Certificate</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Due: {vehicle.fitnessExpiry || "No certificate on file"}
                </div>
              </div>
              <TransportManagerStatusBadge
                condition={
                  !vehicle.fitnessExpiry
                    ? "Needs Inspection"
                    : new Date(vehicle.fitnessExpiry) < new Date()
                    ? "Maintenance Required"
                    : "Operational"
                }
              />
            </div>

            <div className="tm-document-card">
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Insurance Policy</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Due: {vehicle.insuranceExpiry || "No policy on file"}
                </div>
              </div>
              <TransportManagerStatusBadge
                condition={
                  !vehicle.insuranceExpiry || new Date(vehicle.insuranceExpiry) < new Date()
                    ? "Needs Inspection"
                    : "Operational"
                }
              />
            </div>

            <div className="tm-document-card">
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Pollution Control (PUC)</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Due: {vehicle.pollutionExpiry || "No PUC on file"}
                </div>
              </div>
              <TransportManagerStatusBadge
                status={vehicle.pollutionExpiry ? "Active" : "Pending"}
              />
            </div>
          </div>
        </div>

        {/* Recent Maintenance History */}
        <div className="tm-detail-section">
          <h5 className="tm-detail-section__title">Recent Maintenance Records</h5>
          {maintenanceList.length === 0 ? (
            <p style={{ fontSize: "0.825rem", color: "#64748b", margin: 0 }}>
              No maintenance work orders recorded for this vehicle.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {maintenanceList.slice(0, 3).map((m) => (
                <div key={m.id} className="tm-document-card">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{m.category}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      Date: {m.serviceDate || "N/A"} • Cost: ₹{m.cost.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <TransportManagerStatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </TransportManagerDrawer>
  );
}
