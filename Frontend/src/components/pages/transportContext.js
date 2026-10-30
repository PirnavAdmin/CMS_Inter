// Transport resources are campus-wide; only student membership is board/year-specific.
export const transportValue = (row, ...keys) => keys.flatMap((key) => [key, key[0].toUpperCase() + key.slice(1)])
  .map((key) => row?.[key]).find((value) => value != null && value !== '');
const id = (value) => String(value ?? '').trim();
const ids = (rows, ...keys) => new Set(rows.map((row) => id(transportValue(row, ...keys))).filter(Boolean));
const contains = (set, row, ...keys) => set.has(id(transportValue(row, ...keys)));
export function scopeTransportRecords(records, context) {
  const campus = id(context.campusId);
  const exactCampus = (row) => campus && id(transportValue(row, 'campusId')) === campus;
  const compatible = (row, fields) => fields.every((key) => {
    const actual = transportValue(row, key);
    return !context[key] || actual == null || id(actual) === id(context[key]);
  });
  const routes = records.routes.filter(exactCampus);
  const vehicles = records.vehicles.filter(exactCampus);
  const staff = records.staff.filter(exactCampus);
  const routeIds = ids(routes, 'routeId', 'id'), vehicleIds = ids(vehicles, 'vehicleId', 'id');
  const staffIds = ids(staff, 'staffId', 'id', 'facultyId'), employees = ids(staff, 'employeeId');
  const linkedStaff = (row) => contains(staffIds, row, 'staffId') || contains(employees, row, 'employeeId');
  const drivers = records.drivers.filter((row) => compatible(row, ['campusId']) && (exactCampus(row) || linkedStaff(row) || contains(vehicleIds, row, 'assignedVehicleId')));
  const attendants = records.attendants.filter((row) => compatible(row, ['campusId']) && (exactCampus(row) || linkedStaff(row) || contains(vehicleIds, row, 'assignedVehicleId')));
  const pickups = records.pickups.filter((row) => compatible(row, ['campusId']) && contains(routeIds, row, 'routeId'));
  const assignments = records.assignments.filter((row) => contains(routeIds, row, 'routeId') && contains(vehicleIds, row, 'vehicleId'));
  const assignmentIds = ids(assignments, 'assignmentId', 'id');
  // /students supports these filters. Explicit conflicting IDs are still rejected.
  const students = context.boardId && context.academicYearId ? records.students.filter((row) => compatible(row, ['campusId', 'boardId', 'academicYearId'])) : [];
  const studentIds = ids(students, 'studentId', 'id'), admissions = ids(students, 'admissionNo', 'admissionNumber');
  const studentAssignments = records.studentAssignments.filter((row) => {
    const studentId = transportValue(row, 'studentId');
    const member = studentId != null ? studentIds.has(id(studentId)) : contains(admissions, row, 'admissionNo', 'admissionNumber');
    const vehicle = transportValue(row, 'vehicleId'), assignment = transportValue(row, 'vehicleAssignmentId');
    return member && compatible(row, ['campusId', 'boardId', 'academicYearId']) && contains(routeIds, row, 'routeId')
      && (vehicle == null || vehicleIds.has(id(vehicle))) && (assignment == null || Number(assignment) === 0 || assignmentIds.has(id(assignment)));
  });
  return { routes, vehicles, staff, drivers, attendants, pickups, assignments, students, studentAssignments,
    trips: records.trips.filter((row) => contains(routeIds, row, 'routeId') && contains(vehicleIds, row, 'vehicleId')),
    gps: records.gps.filter((row) => contains(vehicleIds, row, 'vehicleId', 'id')),
    maintenance: records.maintenance.filter((row) => contains(vehicleIds, row, 'vehicleId')) };
}

export async function getAllTransportPages(client, url, params = {}, signal) {
  const all = []; let previous = '';
  for (let page = 1; page <= 1000; page++) {
    if (signal?.aborted) throw new DOMException('Transport request cancelled.', 'AbortError');
    const response = await client.get(url, { params: { ...params, PageNumber: page, PageSize: 100 }, signal });
    if (signal?.aborted) throw new DOMException('Transport request cancelled.', 'AbortError');
    let data = response.data;
    if (data?.success === false) throw new Error(data.message || 'Transport request failed.');
    for (let depth = 0; depth < 5 && data?.data && !Array.isArray(data); depth++) data = data.data;
    const batch = Array.isArray(data) ? data : data?.items ?? data?.Items ?? data?.records ?? data?.Records;
    if (!Array.isArray(batch)) throw new Error('The server returned an invalid transport list.');
    const fingerprint = JSON.stringify(batch);
    if (batch.length && fingerprint === previous) throw new Error('The server repeated a transport page.');
    all.push(...batch);
    const total = data?.totalCount ?? data?.TotalCount ?? data?.total ?? response.data?.totalCount;
    const totalPages = data?.totalPages ?? data?.TotalPages ?? response.data?.totalPages;
    if (!batch.length || (total != null ? all.length >= Number(total) : totalPages != null ? page >= Number(totalPages) : batch.length < 100)) return { ...response, data: all };
    previous = fingerprint;
  }
  throw new Error('Transport data exceeds the supported pagination limit.');
}

export function scopeTransportReport(tab, rows, records, filters = {}) {
  // Monthly aggregates have no resource identity; reproduce the existing grouping
  // from scoped service records instead of displaying the global server totals.
  if (tab === 'monthly-cost-reports') {
    const groups = new Map();
    records.maintenance.filter((row) => !filters.vehicleId || id(transportValue(row, 'vehicleId')) === id(filters.vehicleId)).forEach((row) => {
      const date = String(transportValue(row, 'serviceDate') || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      const key = date.slice(0, 7), year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
      const group = groups.get(key) || { year, month, monthName: new Date(year, month - 1, 1).toLocaleString('en-IN', { month: 'long' }), serviceCount: 0, totalCost: 0 };
      group.serviceCount++; group.totalCost += Number(transportValue(row, 'cost') || 0);
      groups.set(key, group);
    });
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row);
  }
  const matches = (row, collection, keys) => collection.find((item) => keys.some(([source, target]) => {
    const value = transportValue(row, source), other = transportValue(item, target);
    return value != null && other != null && id(value) === id(other);
  }));
  const studentMatch = (row) => {
    // A known assignment identity must not be rescued by another assignment
    // for the same student (which may belong to another campus or period).
    if (transportValue(row, 'assignmentId') != null) return matches(row, records.studentAssignments, [['assignmentId', 'assignmentId']]);
    return matches(row, records.studentAssignments, [['studentId', 'studentId'], ['admissionNo', 'admissionNo']]);
  };
  return rows.filter((row) => {
    if (tab === 'student-transport-reports') return Boolean(studentMatch(row));
    if (tab === 'route-reports') return Boolean(matches(row, records.routes, [['routeId', 'routeId'], ['routeCode', 'routeCode']]));
    if (tab === 'pickup-wise-reports') return Boolean(matches(row, records.pickups, [['pickupPointId', 'pickupPointId']]));
    return Boolean(matches(row, records.vehicles, [['vehicleId', 'vehicleId'], ['vehicleNumber', 'vehicleNumber'], ['registrationNumber', 'registrationNumber']]));
  }).map((row) => {
    if (!['pickup-wise-reports', 'seat-occupancy-reports'].includes(tab)) return row;
    const key = tab === 'pickup-wise-reports' ? 'pickupPointId' : 'vehicleId';
    const count = records.studentAssignments.filter((student) => id(transportValue(student, key)) === id(transportValue(row, key)) && /^(true|1|active)$/i.test(String(transportValue(student, 'status')))).length;
    const result = { ...row };
    for (const name of ['assignedStudents', 'totalStudents', 'studentsCount', 'studentCount']) if (Object.hasOwn(result, name)) result[name] = count;
    if (Object.hasOwn(result, 'availableSeats')) result.availableSeats = Math.max(0, Number(result.capacity || 0) - count);
    if (Object.hasOwn(result, 'occupancyPercentage')) result.occupancyPercentage = Number(result.capacity) > 0 ? Math.round(count / Number(result.capacity) * 10000) / 100 : 0;
    return result;
  });
}
