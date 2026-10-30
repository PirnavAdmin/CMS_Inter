# Final Repair Instructions

This build contains an idempotent repair migration for the current MySQL database.

## Important
Do NOT run `Add-Migration` for this repair.

Use Package Manager Console:

```powershell
Update-Database
```

The repair migration is:

`20260810113000_FinalRepairCertificatesReportsAndAdmissionSchema`

It repairs:
- `Certificates`
- `AuditLogs`
- `Students.AdmissionId`
- removes legacy `Students.PreviousHallTicketNumber`
- unique AdmissionId index and FK
- Reports & Analytics stored procedures
- Certificate stored procedures

If EF says **"No migrations were applied. The database is already up to date."** while `Certificates` is still missing, run:

`Database/99_FINAL_REPAIR_Certificates_Reports_Admission.sql`

directly in MySQL Workbench.

Then run:

`Database/100_VERIFY_FinalSchema.sql`

## Reports API
The Reports controller has one route only:

`/api/reports`

## Certificates API
The Certificates controller has one route only:

`/api/certificates`

The old duplicate `/api/v1/reports` and `/api/v1/certificates` aliases were removed so Swagger does not show the same module twice.

## Board DELETE
`DELETE /api/v1/boards/{boardId}` returning **204 No Content** is intentional and correct for a successful soft delete. It does not mean the delete failed. A failed/non-existing board returns 404.

## Student Admission -> Student Management
`Students.AdmissionId` is retained as the link between the admission record and the student profile. This is what allows the approved admission data to be used by Student Management.
