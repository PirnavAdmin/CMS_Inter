export function unwrapDriverData(response) {
  const payload = response?.data ?? {};
  if (payload.success === false) throw new Error(payload.message || "Driver request failed.");
  return payload.data ?? payload;
}

export function assignmentProfile(data = {}, profile = {}) {
  if (Object.hasOwn(data, "assignedVehicle") || Object.hasOwn(data, "vehicle")) {
    const vehicle = Object.hasOwn(data, "assignedVehicle") ? data.assignedVehicle : data.vehicle;
    return {
      ...profile,
      assignedVehicle: typeof vehicle === "string" ? vehicle : vehicle?.vehicleNumber || vehicle?.registrationNumber,
      vehicleRegistration: vehicle?.registrationNumber,
      vehicleModel: vehicle?.vehicleName || vehicle?.vehicleType,
      vehicleDetails: vehicle?.capacity != null ? `${vehicle.capacity} seats` : undefined,
      assignedRoute: data.route?.routeName,
      assignedAttendant: data.attendant?.attendantName,
      attendantPhone: data.attendant?.contactNumber,
      assignmentId: data.assignmentId,
      shift: data.shift,
    };
  }
  const assignment = data.assignment;
  if (!assignment) {
    if (Object.hasOwn(data, "assignment") && assignment === null) return { ...profile, assignedVehicle: undefined, assignedRoute: undefined, vehicleModel: undefined, vehicleRegistration: undefined, vehicleDetails: undefined, assignedAttendant: undefined, assignmentId: undefined };
    return data.route?.routeName ? { ...profile, assignedRoute: data.route.routeName } : profile;
  }
  return {
    ...profile,
    assignedVehicle: assignment.vehicleNumber,
    vehicleModel: assignment.vehicleName,
    vehicleRegistration: assignment.registrationNumber || assignment.vehicleNumber,
    vehicleDetails: assignment.vehicleCapacity != null ? `${assignment.vehicleCapacity} seats` : undefined,
    assignedRoute: assignment.routeName,
    assignedAttendant: assignment.attendantName,
    shift: assignment.shift,
  };
}

export function normalizeDriverRoute(data = {}) {
  const route = data.route;
  if (!route) return null;
  return {
    ...route,
    routeName: route.routeName,
    routeCode: route.routeCode,
    startPoint: route.StartLocation ?? route.startLocation,
    endPoint: route.EndLocation ?? route.endLocation,
    distanceKm: route.DistanceKm ?? route.distanceKm,
    estimatedDurationMinutes: route.EstimatedDurationMinutes ?? route.estimatedDurationMinutes,
    stops: (data.pickupPoints || route.stops || []).map((point, index) => ({
      ...point,
      id: point.pickupPointId ?? point.id,
      name: point.stopName ?? point.name,
      stopNumber: point.stopNumber ?? index + 1,
    })),
  };
}
