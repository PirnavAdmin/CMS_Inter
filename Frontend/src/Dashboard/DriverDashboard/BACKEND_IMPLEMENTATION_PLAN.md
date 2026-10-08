# Driver assignments and notifications

## Confirmed gaps in the checked-in backend

`Controllers/V1/TransportDriverDashboardController.cs` resolves the JWT staff ID to `TransportDrivers.StaffId`, but its dashboard/profile actions return only a driver ID or empty data. They never query `TransportVehicleAssignments`. Admin assignments are saved through `TransportVehicleAssignmentService` and its repository; no driver notification is created. These gaps explain why a saved admin assignment is not returned to the driver.

The frontend now reads authenticated driver responses, supports the assignment DTO below, refreshes on focus and every 30 seconds while visible, and persists notification read state through the proposed API. It does not request the admin assignment list or match drivers by name. Missing endpoints/data are displayed as unavailable. This is frontend preparation; backend work below is still required before live assignments and notifications work.

## 1. Return the driver's current assignment

Implement a shared driver query service used by dashboard, profile, route, trips, and student endpoints. Resolve `StaffId` from the validated JWT, then find `TransportDrivers.StaffId`. Do not accept a driver ID from the browser to select another account's records.

Query `TransportVehicleAssignments` by the resolved `DriverId`, `Status == true`, `IsDeleted == false`, and the effective date interval (`EffectiveFrom <= campusToday` and `EffectiveTo == null || EffectiveTo >= campusToday`). Join Vehicle and Route; query the attendant separately because `TransportVehicleAssignment.Attendant` is currently NotMapped. Count active student assignments. Compare effective dates using the campus timezone (Asia/Kolkata), with explicit inclusive end-date semantics. Reject overlapping active assignments for the same driver in admin writes; do not silently choose an arbitrary row.

Use `TransportVehicleAssignmentDto` field names in `assignment`. Return real database values; remove DTO defaults for trip timings, capacity, campus, and academic year where they imply data that was never saved. Missing assignment is `assignment: null`. Missing telemetry/trip/alert information is null, rather than an invented online status or active trip.

Dashboard contract (`GET /api/v1/transport/driver/dashboard`):

```json
{
  "success": true,
  "data": {
    "driverProfile": {
      "name": "<staff name>", "employeeId": "<employee code>", "email": "<staff email>"
    },
    "assignment": {
      "assignmentId": 123, "driverId": 456,
      "vehicleId": 789, "vehicleNumber": "<saved bus number>",
      "vehicleName": "<saved vehicle name>", "vehicleCapacity": 30,
      "routeId": 100, "routeName": "<saved route name>",
      "attendantName": "<saved attendant name>", "assignedStudents": 0,
      "morningTripTime": "<saved time>", "eveningTripTime": "<saved time>",
      "effectiveFrom": "2026-10-07", "effectiveTo": null, "shift": null
    },
    "todaySchedule": [], "routeDetails": { "stops": [] },
    "morningTrip": null, "eveningTrip": null, "gpsStatus": null, "alerts": null
  }
}
```

Profile contract: `{ "success": true, "data": { "profile": { ...real staff/contact/license fields }, "assignment": { ...same DTO }, "documents": [] } }`. Never report a profile contact update as successful without saving it. The existing profile page can read this envelope.

## 2. Persist driver notifications when admin changes data

Add a notification entity, DbSet, EF configuration, and migration with: Id, RecipientStaffId (FK), Type, Title, Message, AssignmentId (nullable), CreatedAtUtc, ReadAtUtc (nullable), ChangedByUserId, and a unique EventId for idempotency. Index recipient plus created time, and unread lookup. Store enough event detail to explain the change after the assignment is edited/deleted.

Update `Services/Implementations/Transport/TransportVehicleAssignmentService.cs`, its repository transaction boundaries, and the actual admin driver/staff profile update service. Insert notification records in the same transaction as successful create, update, reassign, disable, or delete. Notify the affected driver on vehicle, route, attendant, timings, effective-date, or profile changes. On reassignment notify both the previous driver (removed) and new driver (assigned). A future assignment should say when it becomes effective. Do not generate notifications for no-op updates or rolled-back writes. Changes to linked vehicles/routes/staff should also identify and notify affected drivers where relevant.

## 3. Add authenticated notification endpoints

All endpoints use the JWT StaffId and authorize Driver/Bus Driver:

| Endpoint | Contract |
| --- | --- |
| `GET /api/v1/transport/driver/notifications` | `{ "success": true, "data": { "items": [{ "id": 1, "type": "AssignmentUpdated", "title": "Vehicle assignment updated", "message": "<actual change>", "createdAt": "<UTC ISO timestamp>", "isRead": false, "assignmentId": 123 }] } }` |
| `POST /api/v1/transport/driver/notifications/read-all` | Update only this staff member's unread records; `{ "success": true, "data": { "updatedCount": 1 } }` |

Use a bounded default list (e.g. latest 50) and add cursor pagination for history. Return meaningful 401/403/404 and validation responses. Enforce ownership on any later single-notification read endpoint. Review the admin assignment controller's current AllowAnonymous attribute and apply admin/transport management authorization before deployment.

## 4. Delivery and verification

The current frontend uses 30-second polling; notification delivery remains available after logout/login because events are persisted on the server. For immediate updates, add authenticated SignalR groups keyed by StaffId and a transactional outbox worker. Publish an invalidation event after commit so the frontend refetches assignment/profile/notifications; retain polling for reconnect recovery. Do not rely solely on websocket delivery.

Verify with two drivers: assign the saved bus to driver A, assert A receives the assignment and one unread notification while B receives neither; update route/timings/profile, refresh and verify changed values; reassign A to B and verify removal/addition notifications; test future/expired/disabled/deleted assignments, overlap rejection, persisted read state, failed writes, duplicate requests, and cross-account access denial. Test both an existing TransportDriver record and a staff account lacking one, and reconcile StaffId/DriverId mappings rather than matching by names or employee codes.

Backend files were inspected only and were not edited in this task.
