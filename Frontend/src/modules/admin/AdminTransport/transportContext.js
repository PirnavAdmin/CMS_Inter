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
  // Routes are fetched with CampusId. Some route list DTOs omit CampusId, so
  // keep those API-scoped rows while still rejecting an explicit mismatch.
  const routes = records.routes.filter((row) => compatible(row, ['campusId']));
  // Resolve legacy vehicles through known route/assignment campus links.
  // Never assume that a vehicle with no campus belongs to the selected campus.
  const routeCampuses = new Map(records.routes.map((route) => [
    id(transportValue(route, 'routeId', 'id')), id(transportValue(route, 'campusId')),
  ]));
  const linkedCampuses = new Map();
  for (const assignment of records.assignments) {
    const status = transportValue(assignment, 'status', 'isActive');
    if (status != null && ![true, 1, 'true', '1', 'active', 'assigned'].includes(typeof status === 'string' ? status.toLowerCase() : status)) continue;
    const vehicle = id(transportValue(assignment, 'vehicleId'));
    const owner = id(transportValue(assignment, 'campusId')) || routeCampuses.get(id(transportValue(assignment, 'routeId')));
    if (!vehicle || !owner) continue;
    if (!linkedCampuses.has(vehicle)) linkedCampuses.set(vehicle, new Set());
    linkedCampuses.get(vehicle).add(owner);
  }
  const vehicles = records.vehicles.filter((row) => {
    if (!campus) return false;
    const explicit = transportValue(row, 'campusId') ?? transportValue(transportValue(row, 'campus'), 'campusId', 'id');
    if (explicit != null) return id(explicit) === campus;
    const owners = new Set(linkedCampuses.get(id(transportValue(row, 'vehicleId', 'id'))) || []);
    const routeCampus = routeCampuses.get(id(transportValue(row, 'routeId', 'assignedRouteId')));
    if (routeCampus) owners.add(routeCampus);
    // Conflicting relationships cannot establish a single owning campus.
    return owners.size === 1 && owners.has(campus);
  });
  const staff = records.staff.filter((row) => {
    const assignments = transportValue(row, 'assignedCampuses', 'staffCampusAssignments');
    if (Array.isArray(assignments) && assignments.length) return assignments.some((assignment) =>
      assignment.isActive !== false && !['Inactive', 'Transferred'].includes(assignment.status)
      && id(transportValue(assignment, 'campusId', 'id')) === campus);
    const campusIds = transportValue(row, 'assignedCampusIds');
    if (Array.isArray(campusIds) && campusIds.length) return campusIds.some((value) => id(value) === campus);
    // Staff is fetched with CampusId; reject explicit conflicts if present.
    return compatible(row, ['campusId']);
  });
  const routeIds = ids(routes, 'routeId', 'id'), vehicleIds = ids(vehicles, 'vehicleId', 'id');
  const staffIds = ids(staff, 'staffId', 'id', 'facultyId'), employees = ids(staff, 'employeeId');
  const linkedStaff = (row) => contains(staffIds, row, 'staffId') || contains(employees, row, 'employeeId');
  // Drivers are requested with CampusId. Some driver DTOs omit campus and
  // staff links; preserve those results while rejecting explicit conflicts.
  const drivers = records.drivers.filter((row) => compatible(row, ['campusId']));
  const attendants = records.attendants.filter((row) => compatible(row, ['campusId']));
  const pickups = records.pickups.filter((row) => compatible(row, ['campusId']) && (routeIds.size === 0 || contains(routeIds, row, 'routeId')));
  const assignments = records.assignments.filter((row) => (routeIds.size === 0 || contains(routeIds, row, 'routeId')) && (vehicleIds.size === 0 || contains(vehicleIds, row, 'vehicleId')));
  const assignmentIds = ids(assignments, 'assignmentId', 'id');
  const students = records.students || [];
  const studentAssignments = (records.studentAssignments || []).filter((row) => compatible(row, ['campusId', 'boardId', 'academicYearId'])).map((row) => ({
    ...row,
    studentName: transportValue(row, 'studentName') || '',
    admissionNo: transportValue(row, 'admissionNo', 'admissionNumber') || '',
  }));
  return {
    routes,
    vehicles,
    staff,
    drivers,
    attendants,
    pickups,
    assignments,
    students,
    studentAssignments,
    trips: records.trips.filter((row) => (routeIds.size === 0 || contains(routeIds, row, 'routeId')) && (vehicleIds.size === 0 || contains(vehicleIds, row, 'vehicleId'))),
    gps: records.gps.filter((row) => compatible(row, ['campusId'])),
    maintenance: records.maintenance.filter((row) => vehicleIds.size === 0 || contains(vehicleIds, row, 'vehicleId')),
  };
}

export async function getAllTransportPages(client, url, params = {}, signal) {
  const all = []; let previous = '';
  const pageSize = Number(params.PageSize) || 100;
  for (let page = 1; page <= 1000; page++) {
    if (signal?.aborted) throw new DOMException('Transport request cancelled.', 'AbortError');
    const response = await client.get(url, { params: { ...params, PageNumber: page, PageSize: pageSize }, signal });
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
    const hasNextPage = data?.hasNextPage ?? data?.HasNextPage ?? response.data?.hasNextPage ?? response.data?.HasNextPage;
    const hasMorePages = hasNextPage != null
      ? Boolean(hasNextPage)
      : totalPages != null
        ? page < Number(totalPages)
        : batch.length > 0 && (total != null ? all.length < Number(total) : batch.length >= pageSize);

    if (hasMorePages && batch.length > 0) previous = fingerprint;
    if (hasMorePages && batch.length === 0) {
      previous = '';
      continue;
    }

    if (!hasMorePages || !batch.length) {
      // Preserve any rows fetched when the backend's totals exceed the actual
      // rows it returned, while still following explicit next-page metadata.
      if (total != null && all.length < Number(total)) {
        return { ...response, data: all, paginationIncomplete: true, reportedTotal: Number(total) };
      }
      return { ...response, data: all };
    }
  }
  throw new Error('Transport data exceeds the supported pagination limit.');
}

export function scopeTransportReport(tab, rows, records, filters = {}) {
  if (!Array.isArray(rows)) return [];
  return rows;
}
