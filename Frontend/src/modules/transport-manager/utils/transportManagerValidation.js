/**
 * Transport Manager Validation Utility
 * Validates vehicle, driver, assignment, and maintenance forms before submission
 */

export const validateVehicleForm = (values, existingVehicles = [], isEdit = false, currentId = null) => {
  const errors = {};

  if (!values.vehicleNumber || !String(values.vehicleNumber).trim()) {
    errors.vehicleNumber = "Vehicle number is required.";
  }

  if (!values.registrationNumber || !String(values.registrationNumber).trim()) {
    errors.registrationNumber = "Registration number is required.";
  } else {
    const regTrimmed = String(values.registrationNumber).trim().toUpperCase();
    const duplicate = existingVehicles.find(
      (v) =>
        String(v.registrationNumber || "").trim().toUpperCase() === regTrimmed &&
        (!isEdit || String(v.id) !== String(currentId))
    );
    if (duplicate) {
      errors.registrationNumber = "Vehicle registration number is already registered.";
    }
  }

  const capacityNum = Number(values.capacity);
  if (!values.capacity || isNaN(capacityNum) || capacityNum <= 0 || capacityNum > 120) {
    errors.capacity = "Valid seating capacity between 1 and 120 is required.";
  }

  if (values.insuranceExpiry && isNaN(Date.parse(values.insuranceExpiry))) {
    errors.insuranceExpiry = "Valid insurance expiry date is required.";
  }

  if (values.fitnessExpiry && isNaN(Date.parse(values.fitnessExpiry))) {
    errors.fitnessExpiry = "Valid fitness certificate expiry date is required.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateAssignmentForm = ({
  vehicleId,
  driverId,
  routeId,
  effectiveFrom,
  existingAssignments = [],
  isEdit = false,
  currentAssignmentId = null,
  vehicles = [],
  drivers = [],
}) => {
  const errors = {};

  if (!vehicleId || isNaN(Number(vehicleId)) || Number(vehicleId) <= 0) {
    errors.vehicleId = "An eligible vehicle must be selected.";
  } else {
    const vehicle = vehicles.find((v) => String(v.id) === String(vehicleId));
    if (vehicle && (vehicle.status === "Inactive" || vehicle.status === "Under Maintenance" || vehicle.status === "Out of Service")) {
      errors.vehicleId = `Selected vehicle is currently ${vehicle.status} and cannot be assigned.`;
    }
  }

  if (!driverId || isNaN(Number(driverId)) || Number(driverId) <= 0) {
    errors.driverId = "An active, eligible driver must be selected.";
  } else {
    const driver = drivers.find((d) => String(d.id) === String(driverId));
    if (driver && driver.status !== "Active") {
      errors.driverId = `Driver is currently ${driver.status} and ineligible for assignment.`;
    }
  }

  if (!routeId || isNaN(Number(routeId)) || Number(routeId) <= 0) {
    errors.routeId = "Route is required.";
  }

  if (effectiveFrom && isNaN(Date.parse(effectiveFrom))) {
    errors.effectiveFrom = "Valid effective start date is required.";
  }

  // Conflict check: driver already actively assigned to another vehicle
  if (driverId) {
    const conflictingDriver = existingAssignments.find(
      (a) =>
        String(a.driverId) === String(driverId) &&
        a.status === "Active" &&
        (!isEdit || String(a.id) !== String(currentAssignmentId))
    );
    if (conflictingDriver) {
      errors.driverId = `This driver is already actively assigned to vehicle ${conflictingDriver.vehicleNumber || "another vehicle"}.`;
    }
  }

  // Conflict check: vehicle already assigned to another driver
  if (vehicleId) {
    const conflictingVehicle = existingAssignments.find(
      (a) =>
        String(a.vehicleId) === String(vehicleId) &&
        a.status === "Active" &&
        (!isEdit || String(a.id) !== String(currentAssignmentId))
    );
    if (conflictingVehicle) {
      errors.vehicleId = `This vehicle already has an active driver assignment (${conflictingVehicle.driverName || "Driver"}).`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateMaintenanceForm = (values) => {
  const errors = {};

  if (!values.vehicleId || isNaN(Number(values.vehicleId))) {
    errors.vehicleId = "Vehicle is required.";
  }

  if (!values.category || !String(values.category).trim()) {
    errors.category = "Maintenance category/service type is required.";
  }

  if (values.cost && (isNaN(Number(values.cost)) || Number(values.cost) < 0)) {
    errors.cost = "Estimated or actual cost must be a non-negative number.";
  }

  if (!values.serviceDate || isNaN(Date.parse(values.serviceDate))) {
    errors.serviceDate = "Valid service date is required.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
