/**
 * Transport Manager Domain Models & Normalizers
 * Aligned with backend models in apiEndpoints.transport.*
 */

export const VEHICLE_CONDITIONS = {
  OPERATIONAL: "Operational",
  NEEDS_INSPECTION: "Needs Inspection",
  MAINTENANCE_REQUIRED: "Maintenance Required",
  UNDER_MAINTENANCE: "Under Maintenance",
  OUT_OF_SERVICE: "Out of Service",
};

export const normalizeVehicle = (v) => {
  if (!v) return null;
  const id = v.vehicleId ?? v.id;
  const isAc = Boolean(v.isAC ?? v.isAc ?? false);
  const rawStatus = v.status ?? (v.isActive ? "Active" : "Inactive");
  const fitnessExpiry = v.fitnessExpiry ? String(v.fitnessExpiry).split("T")[0] : "";
  const insuranceExpiry = v.insuranceExpiry ? String(v.insuranceExpiry).split("T")[0] : "";
  const pollutionExpiry = v.pollutionExpiry ? String(v.pollutionExpiry).split("T")[0] : "";

  // Derive authoritative condition
  let condition = VEHICLE_CONDITIONS.OPERATIONAL;
  const now = new Date();
  const fitnessDate = fitnessExpiry ? new Date(fitnessExpiry) : null;
  const insuranceDate = insuranceExpiry ? new Date(insuranceExpiry) : null;

  if (rawStatus === "Under Maintenance" || v.underMaintenance) {
    condition = VEHICLE_CONDITIONS.UNDER_MAINTENANCE;
  } else if (rawStatus === "Out of Service" || rawStatus === "Inactive") {
    condition = VEHICLE_CONDITIONS.OUT_OF_SERVICE;
  } else if (fitnessDate && fitnessDate < now) {
    condition = VEHICLE_CONDITIONS.MAINTENANCE_REQUIRED;
  } else if (fitnessDate && (fitnessDate - now) / (1000 * 60 * 60 * 24) <= 30) {
    condition = VEHICLE_CONDITIONS.NEEDS_INSPECTION;
  } else if (insuranceDate && insuranceDate < now) {
    condition = VEHICLE_CONDITIONS.NEEDS_INSPECTION;
  }

  return {
    id: Number(id) || id,
    vehicleNumber: v.vehicleNumber || v.vehicleName || "",
    registrationNumber: v.registrationNumber || v.vehicleRegistrationNo || "",
    vehicleType: v.vehicleType || "Bus",
    capacity: Number(v.capacity || 40),
    isAC: isAc,
    gpsDeviceId: v.gpsDeviceId || "",
    chassisNumber: v.chassisNumber || "",
    engineNumber: v.engineNumber || "",
    insuranceExpiry,
    pollutionExpiry,
    fitnessExpiry,
    status: typeof rawStatus === "boolean" ? (rawStatus ? "Active" : "Inactive") : rawStatus || "Active",
    condition,
    driverId: v.driverId ?? v.assignedDriverId ?? null,
    driverName: v.driverName ?? v.assignedDriverName ?? "",
    routeId: v.routeId ?? null,
    routeName: v.routeName ?? "",
  };
};

export const normalizeDriver = (d) => {
  if (!d) return null;
  const id = d.driverId ?? d.staffId ?? d.id;
  const licenseExpiry = d.licenceExpiry ?? d.licenseExpiryDate ?? d.licenseExpiry ?? "";

  return {
    id: Number(id) || id,
    transportDriverId: Number(d.driverId) > 0 ? Number(d.driverId) : null,
    driverName: d.driverName || d.fullName || d.name || "",
    employeeId: d.employeeId || d.driverCode || d.empId || "",
    mobileNumber: d.mobileNumber || d.mobile || d.phone || "",
    email: d.email || "",
    licenseNumber: d.licenceNumber || d.licenseNumber || "",
    licenseExpiryDate: licenseExpiry ? String(licenseExpiry).split("T")[0] : "",
    address: d.address || d.currentAddress || "",
    experience: Number(d.experience || d.experienceYears || 0),
    status: d.status === true || d.status === 1 || /^active$/i.test(String(d.status || "")) ? "Active" : "Inactive",
    assignedVehicleId: d.vehicleId ?? d.assignedVehicleId ?? null,
    assignedVehicleNumber: d.vehicleNumber ?? d.assignedVehicleNumber ?? "",
    assignedRouteName: d.routeName ?? d.assignedRouteName ?? "",
  };
};

export const normalizeAssignment = (va) => {
  if (!va) return null;
  const id = va.assignmentId ?? va.id;

  return {
    id: Number(id) || id,
    routeId: Number(va.routeId ?? va.RouteId ?? va.route?.routeId ?? 0),
    routeName: va.routeName || va.RouteName || va.route?.routeName || (typeof va.route === "string" ? va.route : "") || "Route",
    vehicleId: Number(va.vehicleId ?? va.VehicleId ?? va.vehicle?.vehicleId ?? 0),
    vehicleNumber: va.vehicleNumber || va.VehicleNumber || va.busNumber || va.vehicle?.vehicleNumber || "Vehicle",
    driverId: Number(va.driverId ?? va.DriverId ?? va.driver?.driverId ?? 0),
    driverName: va.driverName || va.DriverName || va.driver?.driverName || (typeof va.driver === "string" ? va.driver : "") || "Unassigned Driver",
    attendantId: va.attendantId ? Number(va.attendantId) : null,
    attendantName: va.attendantName || va.AttendantName || va.busAttendantName || "Unassigned",
    morningTripTime: va.morningTripTime || "07:00 AM",
    eveningTripTime: va.eveningTripTime || "03:45 PM",
    effectiveFrom: va.effectiveFrom ? String(va.effectiveFrom).split("T")[0] : "",
    status: va.status === true || va.status === 1 || va.status === "Active" ? "Active" : "Inactive",
    shift: va.shift || "Regular",
  };
};

export const normalizeMaintenance = (m) => {
  if (!m) return null;
  const id = m.maintenanceId ?? m.id;
  const isCompleted = m.status === true || m.status === 1 || m.status === "Completed" || m.status === "Resolved";

  return {
    id: Number(id) || id,
    vehicleId: Number(m.vehicleId ?? 0),
    vehicleNumber: m.vehicleNumber || m.busNumber || "",
    category: m.serviceType || m.category || "General Maintenance",
    serviceDate: m.serviceDate ? String(m.serviceDate).split("T")[0] : "",
    cost: Number(m.cost || 0),
    vendor: m.vendorCenter || m.vendor || "",
    nextDueDate: m.nextServiceDue ? String(m.nextServiceDue).split("T")[0] : (m.nextDueDate ? String(m.nextDueDate).split("T")[0] : ""),
    status: isCompleted ? "Completed" : "Scheduled",
    notes: m.remarks || m.notes || "",
  };
};
