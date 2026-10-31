# Final Student Admission / Student Management Update

This package is aligned to the Student Admission screens supplied in the conversation and the Student Management profile screens.

## What is included

- Student Admission 7-step contract.
- Student Email + Student Mobile Number, with `Email` / `MobileNumber` request aliases retained for existing frontend payloads.
- Separate Father, Mother and Guardian contact fields.
- Father/Mother occupation fields.
- Admission Quota.
- Address Line 1, Address Line 2, City, District, State and Pincode.
- Previous School, Previous Board, Year/Marks represented by `PreviousPercentage`.
- Academic Level, Group, Section, Medium, Second Language and optional Roll Number.
- Documents: Transfer Certificate, Marks Memo, Aadhaar Copy, Caste Certificate, Income Certificate and Remarks.
- Hall Ticket Number and TC Number are not part of the Admission DTO/model/UI contract.
- Group -> Subject relation uses `GroupId`; Group `TotalSubjects` is calculated from active Subjects.
- Admission approval creates exactly one Student using the Admission record.
- Student profile reads the approved Admission-derived data.
- Student profile contains separate parent contact fields.
- MySQL stored procedures are installed by migration `20260809160000_SyncStudentAdmissionFrontendFields`.
- The legacy Period/Room migration is intentionally empty so an existing `Periods` table does not cause `Table 'Periods' already exists`.

## Database update

Open Package Manager Console in Visual Studio and run:

```powershell
Update-Database
```

Or with EF CLI:

```bash
dotnet ef database update
```

Do not manually run the old `Periods` CREATE TABLE script.

## Important flow

```text
Student Admission
      |
      | POST /api/v1/admissions
      v
StudentAdmissions
      |
      | POST /api/v1/admissions/{id}/approve
      v
Students (created once, linked by AdmissionId)
      |
      | GET /api/v1/students/{id}/profile
      v
Student Management Profile
```

## Group / Subject relation

```text
Board
  -> Academic Year
      -> Academic Level
          -> Group (GroupId)
              -> Subjects (GroupId)
              -> Sections (GroupId)
                  -> Students (GroupId + SectionId)
```

`TotalSubjects` for a Group is the count of active Subjects having that `GroupId`.
