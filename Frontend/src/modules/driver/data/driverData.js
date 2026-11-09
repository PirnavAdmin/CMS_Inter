export function toTitleCase(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
}

export function formatIndianPhoneNumber(phone) {
  if (!phone || typeof phone !== "string") return phone || "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

export function normalizeStudentData(student, index = 0) {
  if (!student) return null;
  const rawStop = student.stop || student.stopName || "";
  const stopLower = rawStop.toLowerCase();
  let normalizedStop = "Campus Main Gate";
  let pickupPointId = student.pickupPointId ?? (index + 1);

  if (stopLower.includes("tarnaka")) {
    normalizedStop = "Tarnaka Metro";
    pickupPointId = 1;
  } else if (stopLower.includes("habsiguda")) {
    normalizedStop = "Habsiguda Crossroads";
    pickupPointId = 2;
  } else if (stopLower.includes("nacharam")) {
    normalizedStop = "Nacharam IDA";
    pickupPointId = 3;
  } else if (stopLower.includes("campus") || stopLower.includes("gate")) {
    normalizedStop = "Campus Main Gate";
    pickupPointId = 4;
  } else if (rawStop) {
    normalizedStop = toTitleCase(rawStop);
  }

  const rawPhone = student.parentPhone || student.contact || student.contactNumber || "";
  const formattedPhone = formatIndianPhoneNumber(rawPhone);

  const rollNumber =
    student.rollNo ||
    student.rollNumber ||
    student.admissionNo ||
    (index === 0 ? "MADM-0066" : index === 1 ? "MAUM-0088" : `MADM-${String(student.id || index + 1).padStart(4, "0")}`);

  const seatBadge = student.seatNo || student.seat || `S-${String(index + 1).padStart(2, "0")}`;
  const studentName = toTitleCase(student.name || student.studentName || (index === 0 ? "Sri R" : index === 1 ? "Bala Laxmi" : `Student ${index + 1}`));
  const parentName = toTitleCase(student.parentName || (index === 0 ? "Guardian" : index === 1 ? "Sri" : "Parent / Guardian"));

  return {
    ...student,
    id: student.id ?? student.studentId ?? index + 1,
    studentId: student.id ?? student.studentId ?? index + 1,
    pickupPointId,
    name: studentName,
    studentName: studentName,
    rollNo: rollNumber,
    rollNumber: rollNumber,
    admissionNo: rollNumber,
    parentName,
    parentPhone: formattedPhone,
    contact: formattedPhone,
    contactNumber: formattedPhone,
    stop: normalizedStop,
    stopName: normalizedStop,
    seatNo: seatBadge,
    seat: seatBadge,
    class: student.class || student.academicClass || "Regular - REG-1",
    academicClass: student.academicClass || student.class || "Regular - REG-1",
    status: student.status || "Pending",
  };
}

export function unwrapDriverData(response) {
  const payload = response?.data ?? {};
  if (payload.success === false) throw new Error(payload.message || "Driver request failed.");
  return payload.data ?? payload;
}

export function formatTime12Hour(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return timeStr || "";
  const trimmed = timeStr.trim();
  if (trimmed.toLowerCase().includes("am") || trimmed.toLowerCase().includes("pm")) return trimmed;
  const parts = trimmed.split(":");
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, "0");
    if (isNaN(h)) return trimmed;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
  }
  return trimmed;
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
