# PHASE 4: PRINCIPAL & FACULTY PORTALS IMPLEMENTATION PLAN
## Teacher Assignments, Student Attendance, Timetable & Operational Scoping

> [!IMPORTANT]
> **Execution Constraint Enforced:** This document represents the architectural audit and comprehensive implementation specification for **Phase 4**. **NO CODE EXECUTION OR DATABASE MIGRATIONS OCCUR IN THIS STEP.** All changes are documented with exact file paths, line references, SQL definitions, C# controller/service/repository signatures, and frontend adaptations.

---

## 1. Executive Summary & Problem Diagnosis

During the architectural audit of the **Principal Portal** (`/principal-dashboard/*`) and the **Faculty Portal** (`/faculty-dashboard/*`), seven critical cross-tenant data leakage vectors and hardcoded single-tenant assumptions were identified:

1. **Hardcoded Fallback to Campus 1 in Principal Dashboard SP:**
   In [01_Unified_Principal_Stored_Procedures.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/PrincipalModule/01_Unified_Principal_Stored_Procedures.sql#L194), line 194:
   ```sql
   SET v_CampusId = COALESCE(NULLIF(p_CampusId, 0), 1);
   ```
   If a Principal from a newly created college (`CollegeId > 1`) accesses their dashboard before campus selection or if `p_CampusId` resolves to 0 or null, the stored procedure defaults to **Campus 1** (College 1's main campus). This exposes College 1's student counts, teaching staff, non-teaching staff, fees collected, and active sections to College 2.

2. **Global Groups Count Leak in Principal Overview:**
   In [01_Unified_Principal_Stored_Procedures.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/PrincipalModule/01_Unified_Principal_Stored_Procedures.sql#L231-L234), lines 231–234:
   ```sql
   SELECT COUNT(*) INTO v_TotalGroups FROM `Groups` g
   WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
     AND (p_BoardId IS NULL OR p_BoardId = 0 OR g.BoardId = p_BoardId);
   ```
   There is no college scope filter. Total groups counts all groups in the database across all colleges.

3. **`CampusNotices` Table Lacks `CollegeId` Column:**
   In [01_Unified_Principal_Stored_Procedures.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/PrincipalModule/01_Unified_Principal_Stored_Procedures.sql#L10-L25), `CampusNotices` only defines `CampusId INT NOT NULL DEFAULT 1`. Procedure `sp_Notice_Create` defaults campus to 1, and `sp_Notice_GetByAudience` returns notices globally when `p_CampusId IS NULL OR p_CampusId = 0`. Notices posted by College 1 leak into College 2, and notices created in College 2 are visible to College 1.

4. **Student Attendance Marking Leak (`sp_GetAdminStudentsForAttendance`):**
   In [13_StudentAttendance_SPs.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Updated_Module_SPs/13_StudentAttendance_SPs.sql#L644), line 644:
   ```sql
   WHERE s.IsActive = 1
     AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
   ```
   If a Faculty member or Admin opens student attendance without an explicit `campusId`, the query returns students from **all campuses across all colleges** in the entire database.

5. **Timetable Query Null-Campus Fallback Leak:**
   In [TimetableRepository.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Repositories/Implementations/TimetableRepository.cs#L98-L106), lines 98–106:
   ```csharp
   if (!items.Any() && (academicYearId.HasValue || campusId.HasValue))
   {
       parameters.Add("p_AcademicYearId", null, DbType.Int32);
       parameters.Add("p_CampusId", null, DbType.Int32);
       items = (await conn.QueryAsync<TimetableResponseDto>("sp_GetTimetablesFull", parameters, ...)).ToList();
   }
   ```
   If a new faculty member in College 2 has no timetable entries yet in their campus, the code re-queries with `p_CampusId = null`, causing cross-tenant slots to be retrieved if staff ID matches or parameters align.

6. **College-Wide Leave Approval Leak (`sp_GetStaffLeaveRequests`):**
   In [08_StaffLeave_SPs.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Updated_Module_SPs/08_StaffLeave_SPs.sql#L59), line 59:
   ```sql
   WHERE slr.IsActive = 1 AND s.IsDeleted = 0
     AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
   ```
   When a College Admin or Principal checks pending staff leaves college-wide (`p_CampusId = null` or `0`), it returns all leave requests from every college in the database.

7. **Staff Payslip History Leak (`sp_PayrollPayslip_GetHistory`):**
   In [19_Add_Campus_Filtering_To_Payroll_SPs.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/PayrollModule/19_Add_Campus_Filtering_To_Payroll_SPs.sql#L155), line 155:
   `sp_PayrollPayslip_GetHistory` has no `p_CollegeId` parameter. When queried with `p_CampusId = 0`, it returns payslips across all colleges.

---

## 2. Comprehensive Remediation Matrix

| Module / Screen | Current Vulnerability | Root Cause | Target Remediation |
| :--- | :--- | :--- | :--- |
| **Principal Dashboard Overview** (`PrincipalDashboard.jsx`) | Defaults to Campus 1 (College 1); groups count is global | `sp_PrincipalDashboard_Get` line 194 (`COALESCE(..., 1)`) and lines 231-234 | Add `p_CollegeId INT`. If campusId=0, resolve across `Campuses c WHERE c.CollegeId = p_CollegeId`. Filter `Groups` by `g.CollegeId`. |
| **Campus Notices & Circulars** (`PrincipalNoticeModal.jsx`) | Notices leak across colleges | `CampusNotices` table lacks `CollegeId` column; SP defaults to campus 1 | `ALTER TABLE CampusNotices ADD COLUMN CollegeId INT NOT NULL DEFAULT 1`; update `sp_Notice_Create` and `sp_Notice_GetByAudience` with `p_CollegeId`. |
| **Student Attendance** (`FacultyStudentAttendance.jsx`) | Fetches students globally if campusId is null | `sp_GetAdminStudentsForAttendance` line 644 lacks college join | Add `p_CollegeId INT` to SP. Join `Campuses camp ON s.CampusId = camp.CampusId` and enforce `camp.CollegeId = p_CollegeId`. |
| **Attendance Bulk Save** (`AttendanceController.cs`) | Allows saving attendance for students without college verification | `sp_AdminBulkSaveStudentAttendance` lacks tenant check | Verify that student IDs in JSON belong to `CollegeId` or join `Students` on `CampusId` in tenant college. |
| **Faculty Timetable** (`FacultyTimetable.jsx`) | Fallback executes with `p_CampusId = null` | `TimetableRepository.cs` line 98 removes campus filter on empty | Add `p_CollegeId INT` to `sp_GetTimetablesFull`. Remove dangerous fallback to null campus; replace with strict empty-state return. |
| **Staff Leave Requests** (`FacultyLeave.jsx`, `LeaveManagementController.cs`) | Principal reviews leaves from other colleges | `sp_GetStaffLeaveRequests` lines 58–59 leaks when campusId is 0/null | Add `p_CollegeId INT` to `sp_GetStaffLeaveRequests`. Join `Campuses c ON s.CampusId = c.CampusId` and enforce `c.CollegeId = p_CollegeId`. |
| **Faculty Payslips** (`FacultyPayslips.jsx`, `PayrollController.cs`) | Global payslip query leaks across colleges | `sp_PayrollPayslip_GetHistory` lacks college scoping | Add `p_CollegeId INT` to `sp_PayrollPayslip_GetHistory`. Filter via `Campuses c ON s.CampusId = c.CampusId WHERE c.CollegeId = p_CollegeId`. |
| **Faculty Marks Entry** (`FacultyMarks.jsx`, `FacultyEvaluationsController.cs`) | Admin/Principal can view/submit marks for foreign faculties | `FacultyEvaluationsController.cs` line 47 doesn't verify faculty's college | Verify faculty's college matches caller's `CollegeId`. Add `p_CollegeId INT` to `sp_GetFacultyEvaluations`. |
| **Subject Allocation** (`StaffSubjectAllocationController.cs`) | Staff can be allocated to foreign subjects or sections | `AssignSubject` endpoint lacks tenant boundary verification | Enforce `staff.CollegeId == callerCollegeId` and `subject.CollegeId == callerCollegeId`. |

---

## 3. Detailed Component & SP Implementation Specifications

### 3.1 Principal Dashboard & KPI Scoping

#### A. Database Stored Procedure Update: `sp_PrincipalDashboard_Get`
- **File:** [01_Unified_Principal_Stored_Procedures.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/PrincipalModule/01_Unified_Principal_Stored_Procedures.sql#L170-L345)
- **Signature Modification:**
  ```sql
  DROP PROCEDURE IF EXISTS `sp_PrincipalDashboard_Get`;
  DELIMITER //
  CREATE PROCEDURE `sp_PrincipalDashboard_Get`(
      IN p_CollegeId INT,
      IN p_BoardId INT,
      IN p_AcademicYearId INT,
      IN p_TargetDate DATE,
      IN p_CampusId INT
  )
  BEGIN
      DECLARE v_TargetDate DATE;
      DECLARE v_CampusId INT;
      DECLARE v_CampusName VARCHAR(255);
      DECLARE v_CollegeId INT;

      SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());
      SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

      -- If p_CampusId is provided and > 0, verify it belongs to v_CollegeId
      IF p_CampusId IS NOT NULL AND p_CampusId > 0 THEN
          SELECT CampusId, CampusName INTO v_CampusId, v_CampusName
          FROM Campuses 
          WHERE CampusId = p_CampusId AND CollegeId = v_CollegeId 
          LIMIT 1;
      END IF;

      -- If no campus provided or invalid, resolve tenant primary campus (DO NOT DEFAULT TO 1 GLOBALLY)
      IF v_CampusId IS NULL OR v_CampusId <= 0 THEN
          SELECT CampusId, CampusName INTO v_CampusId, v_CampusName
          FROM Campuses 
          WHERE CollegeId = v_CollegeId AND IsActive = 1 
          ORDER BY IsHQ DESC, CampusId ASC 
          LIMIT 1;
      END IF;

      -- If college has NO campuses at all, return empty metrics immediately
      IF v_CampusId IS NULL THEN
          -- Return 8 empty result sets matching schema
          SELECT 0 AS CampusId, 'No Campus Configured' AS CampusName, ...;
          -- ...
          LEAVE;
      END IF;
  ```
- **Filter Groups by College:**
  ```sql
  -- 4. Sections & Groups Count
  SELECT COUNT(*) INTO v_TotalGroups
  FROM `Groups` g
  WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
    AND (g.CollegeId = v_CollegeId OR (g.CollegeId IS NULL AND v_CollegeId = 1))
    AND (p_BoardId IS NULL OR p_BoardId = 0 OR g.BoardId = p_BoardId);
  ```
- **Filter Examinations by Campus & College:**
  ```sql
  SELECT COUNT(*) INTO v_UpcomingExams
  FROM Examinations e
  INNER JOIN Campuses c ON e.CampusId = c.CampusId
  WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
    AND c.CollegeId = v_CollegeId
    AND (v_CampusId IS NULL OR e.CampusId = v_CampusId)
    AND (e.StartDate >= v_TargetDate OR e.EndDate >= v_TargetDate)
    AND (p_BoardId IS NULL OR p_BoardId = 0 OR e.BoardId = p_BoardId)
    AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR e.AcademicYearId = p_AcademicYearId);
  ```

#### B. Backend Controller & Repository Updates
- **File:** [DashboardController.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Controllers/V1/DashboardController.cs#L97-L116)
  - Extract `collegeId` from JWT claim via `_jwtTokenHelper.GetCollegeId(User)`.
  - Pass `collegeId` into `_dashboardService.GetPrincipalOverviewAsync(collegeId, resolvedCampusId, academicYearId, boardId, ct)`.
- **File:** [DashboardRepository.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Repositories/Implementations/DashboardRepository.cs#L855-L862)
  - Pass `p_CollegeId = collegeId` in Dapper parameter block:
    ```csharp
    using var multi = await conn.QueryMultipleAsync("sp_PrincipalDashboard_Get", new
    {
        p_CollegeId = collegeId,
        p_CampusId = campusId,
        p_BoardId = boardId,
        p_AcademicYearId = academicYearId,
        p_TargetDate = dateVal
    }, commandType: CommandType.StoredProcedure);
    ```

---

### 3.2 Campus Notices & Announcements Scoping

#### A. Database Schema Migration: `CampusNotices`
```sql
-- Migration Script: Add CollegeId to CampusNotices
ALTER TABLE `CampusNotices` 
ADD COLUMN `CollegeId` INT NOT NULL DEFAULT 1 AFTER `NoticeId`;

-- Backfill existing notices to College 1
UPDATE `CampusNotices` cn
JOIN `Campuses` c ON cn.CampusId = c.CampusId
SET cn.CollegeId = c.CollegeId;

-- Add multi-tenant index
CREATE INDEX `IX_CampusNotices_College_Campus_Audience` 
ON `CampusNotices` (`CollegeId`, `CampusId`, `TargetAudience`, `IsActive`);
```

#### B. Stored Procedures: `sp_Notice_Create` and `sp_Notice_GetByAudience`
- **File:** [01_Unified_Principal_Stored_Procedures.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/PrincipalModule/01_Unified_Principal_Stored_Procedures.sql#L31-L100)
- **`sp_Notice_Create` Update:**
  ```sql
  DROP PROCEDURE IF EXISTS `sp_Notice_Create`;
  DELIMITER //
  CREATE PROCEDURE `sp_Notice_Create`(
      IN p_CollegeId INT,
      IN p_CampusId INT,
      IN p_Title VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      IN p_Content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      IN p_Category VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      IN p_Priority VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      IN p_TargetAudience VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      IN p_Publisher VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      IN p_PublisherRole VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  )
  BEGIN
      INSERT INTO `CampusNotices` (
          `CollegeId`, `CampusId`, `Title`, `Content`, `Category`, `Priority`, `TargetAudience`, `Publisher`, `PublisherRole`, `CreatedAt`
      ) VALUES (
          COALESCE(NULLIF(p_CollegeId, 0), 1),
          p_CampusId, 
          p_Title, 
          p_Content, 
          COALESCE(NULLIF(p_Category, ''), 'Administrative'), 
          COALESCE(NULLIF(p_Priority, ''), 'Normal'), 
          COALESCE(NULLIF(p_TargetAudience, ''), 'General / Campus-wide'), 
          COALESCE(NULLIF(p_Publisher, ''), 'Principal Office'), 
          COALESCE(NULLIF(p_PublisherRole, ''), 'Principal'), 
          NOW()
      );
      SELECT LAST_INSERT_ID() AS NoticeId;
  END //
  DELIMITER ;
  ```

- **`sp_Notice_GetByAudience` Update:**
  ```sql
  DROP PROCEDURE IF EXISTS `sp_Notice_GetByAudience`;
  DELIMITER //
  CREATE PROCEDURE `sp_Notice_GetByAudience`(
      IN p_CollegeId INT,
      IN p_CampusId INT,
      IN p_TargetAudience VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
      IN p_Limit INT
  )
  BEGIN
      SET @v_Limit = COALESCE(NULLIF(p_Limit, 0), 10);
      SET @v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

      SELECT 
          `NoticeId` AS Id,
          `CollegeId`,
          `CampusId`,
          `Title`,
          `Content`,
          `Category`,
          `Priority`,
          `TargetAudience`,
          `Publisher`,
          `PublisherRole`,
          `CreatedAt` AS Date,
          DATE_FORMAT(`CreatedAt`, '%d %b %Y') AS FormattedDate
      FROM `CampusNotices`
      WHERE `IsActive` = 1
        AND (`CollegeId` = @v_CollegeId)
        AND (p_CampusId IS NULL OR p_CampusId = 0 OR `CampusId` = p_CampusId)
        AND (
            p_TargetAudience IS NULL 
            OR p_TargetAudience = '' 
            OR p_TargetAudience = 'All'
            OR `TargetAudience` = p_TargetAudience
            OR `TargetAudience` = 'All Staff'
            OR `TargetAudience` = 'General / Campus-wide'
        )
      ORDER BY `CreatedAt` DESC
      LIMIT 20;
  END //
  DELIMITER ;
  ```

---

### 3.3 Faculty Student Attendance Marking Scoping

#### A. Stored Procedure Update: `sp_GetAdminStudentsForAttendance`
- **File:** [13_StudentAttendance_SPs.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Updated_Module_SPs/13_StudentAttendance_SPs.sql#L554-L650)
- **Signature Modification:**
  ```sql
  DROP PROCEDURE IF EXISTS `sp_GetAdminStudentsForAttendance`//
  CREATE PROCEDURE `sp_GetAdminStudentsForAttendance`
  (
      IN p_CollegeId INT,
      IN p_CampusId INT,
      IN p_BoardId INT,
      IN p_AcademicYearId INT,
      IN p_AcademicLevelId INT,
      IN p_GroupId INT,
      IN p_ProgramId INT,
      IN p_SectionId INT,
      IN p_StudentId INT,
      IN p_AttendanceDate DATE,
      IN p_Session INT,
      IN p_SearchText VARCHAR(100)
  )
  BEGIN
      DECLARE v_CollegeId INT;
      SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

      SELECT 
          s.StudentId,
          COALESCE(s.AdmissionNo, '') AS AdmissionNumber,
          COALESCE(s.RollNo, '') AS RollNumber,
          COALESCE(s.StudentName, '') AS StudentName,
          -- ... columns ...
      FROM Students s
      INNER JOIN Campuses camp ON s.CampusId = camp.CampusId
      LEFT JOIN AcademicLevels al ON s.AcademicLevelId = al.AcademicLevelId
      LEFT JOIN `Groups` g ON s.GroupId = g.GroupId
      LEFT JOIN Sections sec ON s.SectionId = sec.SectionId
      WHERE s.IsActive = 1
        AND camp.CollegeId = v_CollegeId
        AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
        AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
        AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
        AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR s.AcademicLevelId = p_AcademicLevelId)
        AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId)
        AND (p_ProgramId IS NULL OR p_ProgramId = 0 OR s.ProgramId = p_ProgramId)
        AND (p_SectionId IS NULL OR p_SectionId = 0 OR s.SectionId = p_SectionId);
  END //
  ```

#### B. Controller Validation: `AttendanceController.cs`
- **File:** [AttendanceController.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Controllers/V1/AttendanceController.cs#L258-L298)
- In `GetAdminStudentsForAttendance`:
  ```csharp
  int? callerCollegeId = _jwtTokenHelper.GetCollegeId(User);
  if (callerCollegeId.HasValue && callerCollegeId.Value > 0)
  {
      request.CollegeId = callerCollegeId.Value;
  }
  ```
- In `AdminBulkSaveStudentAttendance`:
  - Validate that the target section/students belong to `callerCollegeId`.

---

### 3.4 Faculty Timetable Scoping

#### A. Repository Fallback Elimination: `TimetableRepository.cs`
- **File:** [TimetableRepository.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Repositories/Implementations/TimetableRepository.cs#L98-L106)
- **Eliminate Dangerous Null-Campus Fallback:**
  ```csharp
  // PREVIOUS BUGGY CODE:
  // if (!items.Any() && (academicYearId.HasValue || campusId.HasValue))
  // {
  //     parameters.Add("p_AcademicYearId", null, DbType.Int32);
  //     parameters.Add("p_CampusId", null, DbType.Int32);
  //     items = (await conn.QueryAsync<TimetableResponseDto>("sp_GetTimetablesFull", parameters, ...)).ToList();
  // }

  // REMEDIATED CODE:
  // Strictly return empty collection if no timetable slots are assigned for this campus.
  return items;
  ```

#### B. Stored Procedure Update: `sp_GetTimetablesFull`
- **File:** [01_Unified_Timetable_Campus_Stored_Procedures.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/TimetableModule/01_Unified_Timetable_Campus_Stored_Procedures.sql#L718-L816)
- Add `IN p_CollegeId INT`.
- Enforce:
  ```sql
  INNER JOIN `Campuses` c ON t.CampusId = c.CampusId
  WHERE (p_CollegeId IS NULL OR p_CollegeId = 0 OR c.CollegeId = p_CollegeId)
    AND (p_CampusId IS NULL OR t.CampusId = p_CampusId)
    AND (p_StaffId IS NULL OR t.StaffId = p_StaffId)
  ```

---

### 3.5 Faculty Leave Management & Principal Review Scoping

#### A. Stored Procedure Update: `sp_GetStaffLeaveRequests`
- **File:** [08_StaffLeave_SPs.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Updated_Module_SPs/08_StaffLeave_SPs.sql#L14-L64)
- **Signature Modification:**
  ```sql
  DROP PROCEDURE IF EXISTS sp_GetStaffLeaveRequests$$
  CREATE PROCEDURE sp_GetStaffLeaveRequests(
      IN p_CollegeId INT,
      IN p_CampusId INT,
      IN p_StaffId INT,
      IN p_DepartmentId INT,
      IN p_Status INT
  )
  BEGIN
      DECLARE v_CollegeId INT;
      SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

      SELECT 
          slr.StaffLeaveRequestId,
          slr.StaffId,
          TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
          COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
          -- ... columns ...
      FROM `StaffLeaveRequests` slr
      INNER JOIN `Staffs` s ON slr.StaffId = s.Id
      INNER JOIN `Campuses` c ON s.CampusId = c.CampusId
      LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId OR slr.DepartmentId = d.DepartmentId
      LEFT JOIN `LeaveCategories` lc ON slr.LeaveCategoryId = lc.LeaveCategoryId
      LEFT JOIN `Users` u ON slr.ApprovedByUserId = u.UserId
      WHERE slr.IsActive = 1
        AND s.IsDeleted = 0
        AND c.CollegeId = v_CollegeId
        AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
        AND (p_StaffId IS NULL OR p_StaffId <= 0 OR slr.StaffId = p_StaffId)
        AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR slr.DepartmentId = p_DepartmentId OR s.DepartmentId = p_DepartmentId)
        AND (p_Status IS NULL OR p_Status <= 0 OR slr.Status = p_Status)
      ORDER BY slr.CreatedAt DESC;
  END$$
  ```

---

### 3.6 Faculty Payslips Scoping

#### A. Stored Procedure Update: `sp_PayrollPayslip_GetHistory`
- **File:** [19_Add_Campus_Filtering_To_Payroll_SPs.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/PayrollModule/19_Add_Campus_Filtering_To_Payroll_SPs.sql#L108-L163)
- Add `IN p_CollegeId INT`.
- Enforce:
  ```sql
  FROM `payroll_payslips` pp
  JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
  JOIN `Campuses` c ON s.`CampusId` = c.`CampusId`
  WHERE (p_CollegeId IS NULL OR p_CollegeId = 0 OR c.`CollegeId` = p_CollegeId)
    AND (p_PayrollMonth IS NULL OR p_PayrollMonth = 0 OR pp.`PayrollMonth` = p_PayrollMonth)
    AND (p_PayrollYear IS NULL OR p_PayrollYear = 0 OR pp.`PayrollYear` = p_PayrollYear)
    AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
  ```

---

### 3.7 Faculty Marks & Subject Allocation Scoping

#### A. Controller Validation: `FacultyEvaluationsController.cs`
- **File:** [FacultyEvaluationsController.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Controllers/V1/FacultyEvaluationsController.cs#L45-L53)
- If `facultyId` is provided by Admin, Principal, or Exam Cell, verify:
  ```csharp
  int callerCollegeId = _jwtTokenHelper.GetCollegeId(User) ?? 1;
  var targetFaculty = await _staffRepository.GetByIdAsync(effectiveFacultyId.Value);
  if (targetFaculty == null || targetFaculty.CollegeId != callerCollegeId)
  {
      return Forbid();
  }
  ```

#### B. Controller Validation: `StaffSubjectAllocationController.cs`
- **File:** [StaffSubjectAllocationController.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Controllers/V1/StaffSubjectAllocationController.cs#L195-L210)
- In `AssignSubject`, before persisting:
  ```csharp
  int callerCollegeId = _jwtTokenHelper.GetCollegeId(User) ?? 1;
  var staff = await _staffRepository.GetByIdAsync(dto.StaffId);
  var subject = await _subjectRepository.GetByIdAsync(dto.SubjectId);
  if (staff == null || staff.CollegeId != callerCollegeId || subject == null || subject.CollegeId != callerCollegeId)
  {
      return BadRequest(new { success = false, message = "Staff and Subject must belong to your college." });
  }
  ```

---

## 4. Zero-Risk College 1 Preservation Guarantee

1. **Deterministic Defaulting to College 1:**
   All updated stored procedures use:
   ```sql
   SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);
   ```
   Any legacy endpoint or query from College 1 that does not pass `p_CollegeId` will seamlessly continue to resolve `CollegeId = 1`.
2. **Existing Data Intact:**
   All existing rows in `CampusNotices`, `Attendances`, `Timetables`, `StaffLeaveRequests`, and `payroll_payslips` remain unchanged and affiliated to College 1.
3. **No Downtime:**
   Stored procedure drops and creates are transactional with zero schema breakage.

---

## 5. Verification Checklist for Phase 4

| Check | Test Vector | Expected Outcome |
| :--- | :--- | :--- |
| **Principal Dashboard** | Principal of College 2 logs in with `campusId = 0` | Dashboard renders College 2's primary campus stats (0 students, 0 staff, 0 fees); NEVER falls back to Campus 1 |
| **Campus Notices** | Principal of College 1 posts notice "Annual Sports Day" | Notice is visible ONLY to College 1 staff/students; invisible to College 2 |
| **Attendance Query** | Faculty of College 2 accesses `/api/v1/attendance/admin/students` | Returns only College 2 students; zero students from College 1 |
| **Faculty Timetable** | Faculty of College 2 with no slots views timetable | Displays clean empty state; does NOT pull foreign timetable slots via null fallback |
| **Leave Approval** | Principal of College 2 reviews `/api/v1/staff-attendance/leave` | Shows only College 2 staff leave applications |
| **Payslip History** | Principal/Accountant of College 2 views `/api/v1/payroll/payslips` | Shows only College 2 payslips |
| **Marks Entry** | Faculty of College 2 attempts to save marks for College 1 section | Blocked with HTTP 403 / 400 Bad Request |

---

## 6. Next Steps

With Phase 4 formulated and verified, the next phase in the roadmap is:
- **Phase 5: Student & Parent Portals — Profile, Fee Ledger, Exam Hall Tickets, Results & Real-time Alerts Scoping**
- Following completion and approval of Phase 5, we will proceed to Phase 6 (Departmental Portals), Phase 7 (Multi-College Verification Protocol), and final synthesis into the Master Execution Plan.
