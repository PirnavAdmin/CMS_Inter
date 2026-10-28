# College Management API - Final Relations Update

## Database update

Run from Package Manager Console / terminal after selecting this project:

```powershell
Update-Database
```

or:

```bash
dotnet ef database update
```

The final migration is:

`20260809150000_FinalRelationsAndAdmissionFlow`

## Final admission flow

1. Create Student Admission.
2. Verify admission.
3. Approve admission.
4. `sp_ApproveAdmission` creates exactly one Student row linked by `AdmissionId`.
5. The approval response returns both `AdmissionId` and `StudentId`.
6. Student Profile reads the created Student record.

## Final relationships

- Student -> StudentAdmission (`AdmissionId`)
- Student -> Board (`BoardId`)
- Student -> AcademicYear (`AcademicYearId`)
- Student -> Group (`GroupId`)
- Student -> Section (`SectionId`)
- StudentAdmission -> Board / AcademicYear / Group / Section
- Subject -> Board (`BoardId`)
- Subject -> AcademicYear (`AcademicYearId`)
- Subject -> Group (`GroupId`)
- Section -> Board / AcademicYear / Group
- Group -> AcademicYear

Legacy text fields such as `Board`, `Group`, and `Section` are retained where older modules still use them, but new records are validated and stored using relational IDs.

## Subject Management

Subject CRUD now uses Dapper stored procedures. This removes the previous EF `FromSql`/`CALL` composition issue.

Supported subject fields include:

- BoardId / Board
- AcademicYearId
- GroupId / Group
- AcademicLevel
- SubjectName
- SubjectCode
- SubjectType
- Theory / Practical / Language / Elective
- InternalMarks / PracticalMarks / ExternalMarks / TotalMarks / PassingMarks
- IsActive

## Important

Do not manually run an older copy of `Database/99_FixFrontendRelationsAndAdmissionFlow.sql` after applying the final migration. The EF migration is the source of truth for the final stored procedures.
