# Updated College Management Backend

This ZIP contains the backend updated against the frontend screens shared in the conversation.

## Main changes

1. **Group / Course Management**
   - Fixed GET list repository to use `sp_GetAllGroups`.
   - Removed server-side pagination from Groups; search and filters remain supported.
   - Group response supports Board, Academic Year, Academic Level, Group Name, Group Code, Total Subjects and Status.

2. **Student Admission**
   - Supports the 7-step admission data already represented by the backend:
     Admission, Student Details, Parent Details, Address, Previous School, Academic Details and Documents.
   - Create validates Board -> Academic Year -> Group -> Section mapping.
   - Fixed the `Sequence contains no elements` risk from `QueryFirst` by using `QueryFirstOrDefault` with a clear error when no row is returned.
   - Implemented admission Update.
   - Added Verify, Reject, Delete and Generate Admission Number procedures.

3. **Approve Admission -> Student**
   - Added `Students.AdmissionId`.
   - Added a unique database index and FK from `Students.AdmissionId` to `StudentAdmissions.AdmissionId`.
   - `sp_ApproveAdmission` creates the Student record exactly once.
   - Re-approving the same admission does not create a duplicate student.

## Database step (IMPORTANT)

After restoring/opening the project, run this file against the same MySQL database used by the API:

`Database/99_FixFrontendRelationsAndAdmissionFlow.sql`

Run it after the existing database scripts/migrations. It creates/updates the stored procedures and the Student-Admisssion relation.

If you use EF migrations, the project also contains:

`Migrations/20260809100000_FixFrontendRelationsAndAdmissionFlow.cs`

The migration adds the `Students.AdmissionId` column/index/FK. The SQL patch file must still be executed because it contains the MySQL stored procedures and uses `DELIMITER` syntax intended for MySQL Workbench.

## API flow

Frontend Admission Form
 -> POST `/api/v1/admissions`
 -> `StudentAdmissionRepository.CreateAsync`
 -> `sp_CreateAdmission`
 -> `StudentAdmissions`

Admin approves admission
 -> POST `/api/v1/admissions/{id}/approve`
 -> `sp_ApproveAdmission`
 -> `Students` row created with `AdmissionId`
 -> `StudentAdmissions.Status = Approved`

Group screen
 -> GET `/api/v1/groups?search=...&board=...&academicYearId=...&academicLevel=...&isActive=...`
 -> `sp_GetAllGroups`
 -> Groups + AcademicYears + Subject count (no pagination)
