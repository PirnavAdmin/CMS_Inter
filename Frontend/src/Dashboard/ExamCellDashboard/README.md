# Exam Cell Portal

Entry route: `/exam-cell-dashboard`. The existing login redirects recognized
`ExamCell` / `Exam Cell` / `Examination Cell` roles to this portal. Authentication,
token expiry, campus, board, academic year and theme use the existing shared systems.
The server must authorize the Exam Cell account for each existing module API.

Login uses the existing authentication API with a real Exam Cell account.
Local preview credentials are no longer supported.

## Isolation

All portal UI lives in this folder. The only shared changes are route registration,
role guards and the login destination. Existing Admin, Faculty and Student pages,
styles and endpoint declarations are untouched.

The original admin screens combine their workflow with the administrator shell.
Their Exam Cell versions replace that shell with a content-only adapter, retain
the existing services, response mappings and validations, and reference existing
module styles. Extracting shared screen logic would require modifying the original
screens, which was excluded from this task. Future workflow changes should keep
these isolated implementations in sync.

## Integrations and limits

- Exams and timetable: existing examination creation, scheduling, conflict checks,
  editing, exports and publishing workflows.
- Hall allocation: examination schedules, scheduling context, real room capacity
  and slot availability. Manual assignment uses the timetable workflow. Automatic
  allocation and seating-plan printing are disabled because no API was found.
  Seat counts remain unavailable when the schedule response does not provide them.
- Hall tickets: documented batch generation and student PDF download. The API
  requires `examinationId` and `batchId`; no batch lookup or selected-student
  generation contract exists in the project. The UI makes this limitation explicit.
- Marks entry and verification: existing evaluation workflows, draft/submit,
  verification, approval/rejection and mark validations.
- Results and publication: existing readiness, processing, section results,
  publication confirmation, memo, rank and export flows. Dashboard readiness comes
  from the readiness endpoint, rather than inferring approval from processed counts.
- Attendance: existing student attendance, session statuses, monthly reports,
  defaulters, detail view and timing configuration.
- Certificates, promotions and holidays: existing module flows and services.
  Holidays start with empty data, rather than the administrator screen's samples.
- Reports: existing result analytics, rank list and server Excel/PDF exports.
- Profile: authenticated staff/employee lookup; personal, bank, address and
  experience section drafts, document upload and submission for review. Editing
  requires a linked staff identity from the login response.
- Check-in/check-out: live integration with staff attendance API (`/api/v1/staff-attendance/load`, `/api/v1/staff-attendance/update`, `/api/v1/staff-attendance/monthly-report`, `/api/v1/attendance-timing-config/effective`, `/api/v1/staff-attendance/leave`). Real punches persist, show timing & grace calculations, and reflect directly in staff attendance records.
- Notifications: unavailable until an existing notification integration is provided.

## Validation

Production build and role-guard checks pass. Server rendering checks cover all
screens and both examination/marks tab entry points. Existing admin module hashes
were verified unchanged. New components pass lint; isolated copies retain existing
hook dependency warnings. Authenticated backend writes and visual browser testing
require an Exam Cell account and running backend.
