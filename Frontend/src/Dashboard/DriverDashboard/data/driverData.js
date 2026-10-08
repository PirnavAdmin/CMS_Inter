export function unwrapDriverData(response) {
  const payload = response?.data ?? {};
  if (payload.success === false) throw new Error(payload.message || "Driver request failed.");
  return payload.data ?? payload;
}

export function assignmentProfile(data = {}, profile = {}) {
  if (Object.hasOwn(data, "vehicle")) {
    return {
      ...profile,
      assignedVehicle: data.vehicle?.registrationNumber,
      vehicleRegistration: data.vehicle?.registrationNumber,
      vehicleModel: data.vehicle?.vehicleType,
      vehicleDetails: data.vehicle?.capacity != null ? `${data.vehicle.capacity} seats` : undefined,
      assignedRoute: data.route?.routeName,
    };
  }
  const assignment = data.assignment;
  if (!assignment) return profile;
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
