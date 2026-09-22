# Final Module 17 & 18 Backend Update

This update aligns the backend with the supplied Intermediate College Management API specification.

## Module 17 - Certificate Management

Supported routes (both `/api/...` and `/api/v1/...`):

- POST `/certificates/bonafide`
- POST `/certificates/study`
- POST `/certificates/conduct`
- POST `/certificates/fee`
- POST `/certificates/tc`
- GET `/certificates/history`
- GET `/certificates/download/{id}`
- GET `/certificates/verify/{certificateNo}`
- POST `/certificates/reissue`
- PATCH `/certificates/{id}/cancel`

Additional workflow endpoints:

- GET `/certificates`
- GET `/certificates/{id}`
- POST `/certificates`
- PUT `/certificates/{id}`
- PATCH `/certificates/{id}/review`
- PATCH `/certificates/{id}/approve`
- PATCH `/certificates/{id}/issue`

All database operations use MySQL stored procedures.

## Module 18 - Reports & Analytics

Supported routes (both `/api/...` and `/api/v1/...`):

- GET `/reports/dashboard`
- GET `/reports/admissions`
- GET `/reports/student-strength`
- GET `/reports/attendance`
- GET `/reports/faculty-attendance`
- GET `/reports/fees/collection`
- GET `/reports/fees/outstanding`
- GET `/reports/examinations`
- GET `/reports/results`
- GET `/reports/pass-percentage`
- GET `/reports/toppers`
- GET `/reports/subjects`
- GET `/reports/groups`
- GET `/reports/sections`
- GET `/reports/faculty-workload`
- GET `/reports/student-performance`
- GET `/reports/audit-logs`
- GET `/reports/export/pdf?reportType=dashboard`
- GET `/reports/export/excel?reportType=dashboard`
- POST `/reports/custom`

All report data queries use MySQL stored procedures.

## Common report filters

- `boardId`
- `academicYearId`
- `academicLevelId`
- `groupId`
- `sectionId`
- `fromDate`
- `toDate`

## Database

A new migration is included:

`20260810100000_AddReportsAnalyticsAndCompleteCertificateProcedures`

It creates the `AuditLogs` table and installs/replaces all Module 17 and Module 18 stored procedures.

Run from Package Manager Console:

`Update-Database`
