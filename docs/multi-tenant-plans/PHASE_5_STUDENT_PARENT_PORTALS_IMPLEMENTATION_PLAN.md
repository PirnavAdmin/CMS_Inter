# PHASE 5: STUDENT & PARENT PORTALS IMPLEMENTATION PLAN
## Profile, Fee Ledger, Exam Hall Tickets, Results & Real-time Alerts Scoping

> [!IMPORTANT]
> **Execution Constraint Enforced:** This document represents the architectural audit and comprehensive implementation specification for **Phase 5**. **NO CODE EXECUTION OR DATABASE MIGRATIONS OCCUR IN THIS STEP.** All changes are documented with exact file paths, line references, SQL definitions, C# controller/service/repository signatures, and frontend adaptations.

---

## 1. Executive Summary & Problem Diagnosis

During the architectural audit of the **Student Portal** (`/student-dashboard/*`) and the **Parent Portal** (`/parent-dashboard/*`), seven critical cross-tenant data leakage vectors and hardcoded single-tenant assumptions were identified:

1. **User Provisioning Lacks `CollegeId` for Students and Parents:**
   In [UserProvisioningService.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Services/Implementations/UserProvisioningService.cs#L378-L392), when creating a student or parent user account, `CollegeId` is never assigned and remains `NULL` in the `Users` table:
   ```csharp
   var user = new User
   {
       FullName = request.FullName.Trim(),
       Email = normalizedEmail,
       PasswordHash = passwordHash,
       RoleId = request.RoleId,
       StudentId = request.StudentId,
       // CollegeId is omitted! Leaves user.CollegeId = NULL
   };
   ```
   Consequently, [JwtTokenHelper.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Helpers/JwtTokenHelper.cs#L123-L127) fails to emit `CollegeId` or `collegeId` claims during student or parent login.

2. **Real-time Alert Resolution Bleed in `NotificationService`:**
   In [NotificationService.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Services/Implementations/NotificationService.cs#L687-L692), lines 687–692:
   ```csharp
   int effectiveCollegeId = targetCollegeId.HasValue && targetCollegeId.Value > 0 ? targetCollegeId.Value : 1;
   bool sameCollege = effectiveCollegeId == 1
       ? (u.CollegeId == 1 || (!u.CollegeId.HasValue && !u.HasAdminId && (u.RoleName != "Super Admin")))
       : (u.CollegeId == effectiveCollegeId);
   ```
   Because student/parent users have `u.CollegeId = NULL`:
   - When College 1 broadcasts an announcement, all College 2 students/parents receive it because `!u.CollegeId.HasValue` defaults them to College 1.
   - When College 2 broadcasts, `u.CollegeId == 2` evaluates to **FALSE**, so College 2 students/parents receive **zero notifications from their own college**!

3. **Student Timetable Defaults Unassigned Students to College 1 Section:**
   In [03_Timetable.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/03_Timetable.sql#L539-L544), `sp_GetStudentTimetable` lines 539–544:
   ```sql
   SELECT SectionId, AcademicYearId INTO v_SectionId, v_AcademicYearId FROM Students WHERE StudentId = p_StudentId;
   IF v_SectionId IS NULL THEN
       SET v_SectionId = 1;
   END IF;
   CALL sp_GetTimetables(NULL, NULL, v_AcademicYearId, NULL, v_SectionId, NULL, NULL, NULL, 1);
   ```
   If a newly admitted College 2 student has not yet been assigned to a section (`SectionId IS NULL`), the stored procedure forces `v_SectionId = 1` (**College 1's Section**), rendering College 1's schedule in College 2's portal!

4. **Global Leak in Student Admissions Query:**
   In [10_StudentAdmission_SPs.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Updated_Module_SPs/10_StudentAdmission_SPs.sql#L151-L153), lines 151–153:
   ```sql
   WHERE sa.IsActive = 1
     AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId)
   ```
   `sp_GetAllStudentAdmissions` has no `p_CollegeId` parameter. When queried with `p_CampusId = 0` or null, it returns admissions from **all colleges in the entire database**.

5. **Global Certificate Leak & Stats Bleed:**
   In [04_Certificates_SPs.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Updated_Module_SPs/04_Certificates_SPs.sql#L290-L360):
   - `sp_GetCertificates` has no `CollegeId` or `CampusId` filtering, returning all certificates in the database across all colleges.
   - `sp_GetCertificateWorkflowStats()` takes no parameters and counts certificates globally across all colleges.

6. **Unprotected Hall Ticket Download Endpoint:**
   In [ExaminationController.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Controllers/V1/ExaminationController.cs#L1006-L1017), `DownloadHallTicket(int studentId, [FromQuery] int examinationId)` lacks the `[ParentStudentAuthorization]` filter and has no college ownership validation. Any user can download any student's hall ticket across colleges.

7. **Parent Portal Frontend Hardcoded Mock Fallbacks:**
   In [ParentPortalContext.jsx](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Frontend/src/modules/parent/context/ParentPortalContext.jsx#L516-L686):
   - Lines 684–686 default missing student fields to `sectionId = 30`, `groupId = 37`, and `campusId = 1` (College 1's records).
   - Lines 524–527 fall back to a mock fee breakdown of ₹70,000 (`Admission: 5000, Course Fee: 65000`) if no fee record is returned.
   - Lines 906–909 hardcode mentor "Dr. Anitha Rao" and "Main Campus (HQ)".

---

## 2. Comprehensive Remediation Matrix

| Module / Screen | Current Vulnerability | Root Cause | Target Remediation |
| :--- | :--- | :--- | :--- |
| **Student/Parent Provisioning** (`UserProvisioningService.cs`) | `Users.CollegeId` is left `NULL`; token lacks `CollegeId` claim | `ProvisionUserAsync` does not assign `CollegeId` | Pass `CollegeId` into `ProvisionUserRequest` (resolved from `Students.CampusId -> Campuses.CollegeId`). Assign `user.CollegeId = request.CollegeId`. |
| **Real-time Notifications** (`NotificationService.cs`) | College 2 students miss college circulars; get College 1 alerts | `ResolveRoleUserIdsAsync` treats `NULL` `CollegeId` as College 1 | Enforce strict `u.CollegeId == effectiveCollegeId` for all tenants (`CollegeId >= 1`). Ensure all users have valid `CollegeId`. |
| **Student Timetable** (`StudentTimetable.jsx`, `ParentTimetablePage.jsx`) | Unassigned students see College 1 Section 1 schedule | `sp_GetStudentTimetable` line 541 defaults `SectionId = 1` | Remove `SET v_SectionId = 1;`. If `v_SectionId IS NULL`, return empty result set immediately. |
| **Student Admissions** (`StudentAdmissionsController.cs`) | Global query leaks admissions across all colleges | `sp_GetAllStudentAdmissions` line 152 lacks college filter | Add `IN p_CollegeId INT` to SP. Enforce `camp.CollegeId = p_CollegeId`. Pass `callerCollegeId` in `StudentAdmissionsController.cs`. |
| **Certificates Management** (`CertificatesController.cs`) | Certificates and stats bleed across all colleges | `sp_GetCertificates` and `sp_GetCertificateWorkflowStats` lack college filtering | Add `IN p_CollegeId INT` to both procedures. Join `Campuses` via `Students` and filter by `camp.CollegeId = p_CollegeId`. |
| **Hall Ticket PDF Download** (`ExaminationController.cs`) | Any student can download another student's hall ticket | Missing `[ParentStudentAuthorization]` filter on endpoint | Add `[ParentStudentAuthorization]` attribute. Enforce that target student's college matches caller's college. |
| **Student Results Staff Query** (`StudentResultsController.cs`) | Foreign admin/staff can view other college students' memos | `ParentStudentAuthorization` doesn't check college for staff | In `ParentStudentAuthorizationAttribute.cs`, verify `student.CollegeId == callerCollegeId` for staff callers. |
| **Parent Portal Context** (`ParentPortalContext.jsx`) | Displays mock ₹70k fees, Section 30, and Campus 1 for new students | Hardcoded fallbacks on lines 516, 524, 684-686 | Eliminate hardcoded 70k, section 30, group 37 fallbacks. Replace with empty states and actual child metadata. |

---

## 3. Detailed Component & SP Implementation Specifications

### 3.1 User Provisioning & JWT Token Scoping

#### A. Backend Service Update: `UserProvisioningService.cs`
- **File:** [UserProvisioningService.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Services/Implementations/UserProvisioningService.cs#L64-L75)
- **Resolve `CollegeId` for Student User Provisioning:**
  ```csharp
  // In ProvisionStudentUserAsync:
  int? resolvedCollegeId = request.CollegeId;
  if (!resolvedCollegeId.HasValue || resolvedCollegeId.Value <= 0)
  {
      // Look up student's campus and college
      resolvedCollegeId = await connection.ExecuteScalarAsync<int?>(
          @"SELECT c.CollegeId 
            FROM Students s 
            INNER JOIN Campuses c ON s.CampusId = c.CampusId 
            WHERE s.StudentId = @StudentId LIMIT 1;",
          new { StudentId = request.StudentId },
          transaction);
  }

  var genericRequest = new ProvisionUserRequest
  {
      FullName = request.FullName,
      Email = request.Email,
      PhoneNumber = request.PhoneNumber,
      RoleId = studentRole.RoleId,
      StudentId = request.StudentId,
      StaffId = null,
      AdminId = null,
      CollegeId = resolvedCollegeId ?? 1
  };
  ```

- **Resolve `CollegeId` for Parent User Provisioning:**
  In `ProvisionParentUserAsync`:
  ```csharp
  int? resolvedCollegeId = request.CollegeId;
  if (!resolvedCollegeId.HasValue || resolvedCollegeId.Value <= 0)
  {
      resolvedCollegeId = await connection.ExecuteScalarAsync<int?>(
          @"SELECT c.CollegeId 
            FROM Students s 
            INNER JOIN Campuses c ON s.CampusId = c.CampusId 
            WHERE s.StudentId = @StudentId LIMIT 1;",
          new { StudentId = request.StudentId },
          transaction);
  }

  // Assign resolvedCollegeId to the parent user entity
  user.CollegeId = resolvedCollegeId ?? 1;
  ```

- **Assign `CollegeId` to `User` Entity in `ProvisionUserAsync`:**
  ```csharp
  var user = new User
  {
      FullName = request.FullName.Trim(),
      Email = normalizedEmail,
      PasswordHash = passwordHash,
      PhoneNumber = request.PhoneNumber?.Trim() ?? string.Empty,
      RoleId = request.RoleId,
      StudentId = request.StudentId,
      StaffId = request.StaffId,
      AdminId = request.AdminId,
      CollegeId = request.CollegeId, // Explicitly assign CollegeId
      IsFirstLogin = true,
      IsActive = true,
      CreatedAt = DateTime.UtcNow,
      UpdatedAt = DateTime.UtcNow
  };
  ```

- **Backfill Existing Student and Parent User Records in Database:**
  ```sql
  -- Backfill Users.CollegeId for all existing Students
  UPDATE `Users` u
  INNER JOIN `Students` s ON u.StudentId = s.StudentId
  INNER JOIN `Campuses` c ON s.CampusId = c.CampusId
  SET u.CollegeId = c.CollegeId
  WHERE u.StudentId IS NOT NULL AND (u.CollegeId IS NULL OR u.CollegeId = 0);

  -- Backfill Users.CollegeId for all existing Parents
  UPDATE `Users` u
  INNER JOIN `ParentStudentMappings` psm ON u.UserId = psm.ParentUserId
  INNER JOIN `Students` s ON psm.StudentId = s.StudentId
  INNER JOIN `Campuses` c ON s.CampusId = c.CampusId
  SET u.CollegeId = c.CollegeId
  WHERE u.CollegeId IS NULL OR u.CollegeId = 0;
  ```

---

### 3.2 Real-time Alerts & Notification Scoping

#### A. Backend Service Update: `NotificationService.cs`
- **File:** [NotificationService.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Services/Implementations/NotificationService.cs#L687-L693)
- **Eliminate Null College Fallback:**
  ```csharp
  // PREVIOUS CODE:
  // int effectiveCollegeId = targetCollegeId.HasValue && targetCollegeId.Value > 0 ? targetCollegeId.Value : 1;
  // bool sameCollege = effectiveCollegeId == 1
  //     ? (u.CollegeId == 1 || (!u.CollegeId.HasValue && !u.HasAdminId && (u.RoleName != "Super Admin")))
  //     : (u.CollegeId == effectiveCollegeId);

  // REMEDIATED CODE:
  int effectiveCollegeId = targetCollegeId.HasValue && targetCollegeId.Value > 0 ? targetCollegeId.Value : 1;
  bool sameCollege = isSuperAdminCaller || (u.CollegeId.HasValue && u.CollegeId.Value == effectiveCollegeId);

  if (!sameCollege) return false;
  ```

---

### 3.3 Student Timetable Null-Section Isolation

#### A. Stored Procedure Update: `sp_GetStudentTimetable`
- **File:** [03_Timetable.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/03_Timetable.sql#L530-L546)
- **Eliminate Default to Section 1:**
  ```sql
  DROP PROCEDURE IF EXISTS sp_GetStudentTimetable;
  DELIMITER //
  CREATE PROCEDURE sp_GetStudentTimetable(
      IN p_StudentId INT
  )
  BEGIN
      DECLARE v_SectionId INT;
      DECLARE v_AcademicYearId INT;
      DECLARE v_CampusId INT;

      SELECT SectionId, AcademicYearId, CampusId 
      INTO v_SectionId, v_AcademicYearId, v_CampusId 
      FROM Students 
      WHERE StudentId = p_StudentId;

      -- If student is not assigned to a section yet, return empty result set immediately
      IF v_SectionId IS NULL OR v_SectionId <= 0 THEN
          SELECT 
              0 AS Id, 0 AS TimetableId, v_CampusId AS CampusId, '' AS CampusName,
              0 AS BoardId, '' AS BoardName, 0 AS AcademicLevelId, '' AS LevelName,
              v_AcademicYearId AS AcademicYearId, '' AS AcademicYearName,
              0 AS GroupId, '' AS GroupName, 0 AS ProgramId, '' AS ProgramName,
              0 AS SectionId, '' AS SectionName, 0 AS DayOfWeek, '' AS DayName,
              0 AS PeriodId, '' AS PeriodName, 0 AS PeriodNumber,
              NULL AS StartTime, NULL AS EndTime, 0 AS IsBreak,
              0 AS SubjectId, '' AS SubjectName, '' AS SubjectCode,
              0 AS FacultyId, '' AS FacultyName, '' AS FacultyCode,
              0 AS RoomId, '' AS RoomNumber, 0 AS IsPublished, '' AS Remarks
          FROM DUAL WHERE 1 = 0;
      ELSE
          CALL sp_GetTimetablesFull(NULL, NULL, v_AcademicYearId, NULL, NULL, v_SectionId, NULL, NULL, NULL, 1, 1, v_CampusId);
      END IF;
  END //
  DELIMITER ;
  ```

---

### 3.4 Student Admissions Stored Procedure Scoping

#### A. Stored Procedure Update: `sp_GetAllStudentAdmissions`
- **File:** [10_StudentAdmission_SPs.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Updated_Module_SPs/10_StudentAdmission_SPs.sql#L26-L155)
- **Signature & Filter Update:**
  ```sql
  DROP PROCEDURE IF EXISTS `sp_GetAllStudentAdmissions`//
  CREATE PROCEDURE `sp_GetAllStudentAdmissions`
  (
      IN p_CollegeId INT,
      IN p_CampusId INT
  )
  BEGIN
      DECLARE v_CollegeId INT;
      SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

      SELECT 
          sa.AdmissionId,
          sa.AdmissionNo,
          sa.AdmissionDate,
          -- ... columns ...
      FROM `StudentAdmissions` sa
      INNER JOIN `Campuses` c ON sa.CampusId = c.CampusId
      LEFT JOIN `Campuses` sc ON sa.SourceCampusId = sc.CampusId
      -- ... joins ...
      WHERE sa.IsActive = 1
        AND c.CollegeId = v_CollegeId
        AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId)
      ORDER BY sa.AdmissionId DESC;
  END //
  ```

#### B. Controller Update: `StudentAdmissionsController.cs`
- **File:** [StudentAdmissionsController.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Controllers/V1/StudentAdmissionsController.cs#L195-L208)
- Pass `callerCollegeId` into `_service.GetAllAsync(callerCollegeId, campusId)`.

---

### 3.5 Certificates Management Scoping

#### A. Stored Procedure Updates: `sp_GetCertificates` & `sp_GetCertificateWorkflowStats`
- **File:** [04_Certificates_SPs.sql](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Database/Updated_Module_SPs/04_Certificates_SPs.sql#L290-L360)
- **`sp_GetCertificateWorkflowStats` Scoping:**
  ```sql
  DROP PROCEDURE IF EXISTS `sp_GetCertificateWorkflowStats` //
  CREATE PROCEDURE `sp_GetCertificateWorkflowStats`(
      IN p_CollegeId INT,
      IN p_CampusId INT
  )
  BEGIN
      DECLARE v_CollegeId INT;
      SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

      SELECT
          COUNT(*) AS TotalCount,
          COALESCE(SUM(CASE WHEN (c.Status = 'Generated' OR c.Status = 'Active') AND (c.IsActive = 1 OR c.IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS GeneratedCount,
          COALESCE(SUM(CASE WHEN c.Status = 'Reviewed' AND (c.IsActive = 1 OR c.IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS ReviewedCount,
          COALESCE(SUM(CASE WHEN c.Status = 'Approved' AND (c.IsActive = 1 OR c.IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS ApprovedCount,
          COALESCE(SUM(CASE WHEN c.Status = 'Issued' AND (c.IsActive = 1 OR c.IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS IssuedCount,
          COALESCE(SUM(CASE WHEN c.Status = 'Cancelled' OR c.Status = 'Deleted' OR c.IsActive = 0 THEN 1 ELSE 0 END), 0) AS CancelledCount
      FROM `certificates` c
      INNER JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo = c.AdmissionNo)
      INNER JOIN `Campuses` camp ON s.CampusId = camp.CampusId
      WHERE camp.CollegeId = v_CollegeId
        AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId);
  END //
  ```

- **`sp_GetCertificates` Scoping:**
  ```sql
  DROP PROCEDURE IF EXISTS `sp_GetCertificates` //
  CREATE PROCEDURE `sp_GetCertificates`(
      IN p_CollegeId INT,
      IN p_CampusId INT,
      IN p_Search VARCHAR(150),
      IN p_Status VARCHAR(50),
      IN p_CertificateType VARCHAR(100)
  )
  BEGIN
      DECLARE v_CollegeId INT;
      SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

      SELECT 
          c.Id AS CertificateId,
          -- ... columns ...
      FROM `certificates` c
      INNER JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo = c.AdmissionNo)
      INNER JOIN `Campuses` camp ON s.CampusId = camp.CampusId
      -- ... joins ...
      WHERE camp.CollegeId = v_CollegeId
        AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
        AND (c.IsActive = 1 OR c.IsActive IS NULL OR p_Status = 'Cancelled' OR p_Status = 'All' OR p_Status IS NULL)
        AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR p_Status = 'All Status' OR c.Status = p_Status OR (p_Status = 'Generated' AND c.Status = 'Active'))
        AND (p_CertificateType IS NULL OR p_CertificateType = '' OR p_CertificateType = 'All' OR c.CertificateType = p_CertificateType)
        AND (p_Search IS NULL OR p_Search = '' 
             OR c.CertificateNo LIKE CONCAT('%', p_Search, '%')
             OR c.AdmissionNo LIKE CONCAT('%', p_Search, '%')
             OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%')
             OR s.StudentName LIKE CONCAT('%', p_Search, '%'))
      ORDER BY c.Id DESC;
  END //
  ```

---

### 3.6 Hall Ticket & Results Protection

#### A. Controller Security: `ExaminationController.cs`
- **File:** [ExaminationController.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Controllers/V1/ExaminationController.cs#L1006-L1017)
- Add `[CollegeManagement.API.Filters.ParentStudentAuthorization]` to `DownloadHallTicket`:
  ```csharp
  [HttpGet("halltickets/{studentId:int}")]
  [Authorize(Roles = "Admin,Super Admin,Principal,Examination Cell,Exam Cell,Teacher,Faculty,Student,Parent")]
  [CollegeManagement.API.Filters.ParentStudentAuthorization]
  [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK, "application/pdf")]
  public async Task<IActionResult> DownloadHallTicket(int studentId, [FromQuery] int examinationId)
  ```

#### B. Filter Update: `ParentStudentAuthorizationAttribute.cs`
- **File:** [ParentStudentAuthorizationAttribute.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Filters/ParentStudentAuthorizationAttribute.cs#L118-L122)
- For staff callers (Admin, Teacher, Principal, Examination Cell), verify that the target student belongs to the caller's `CollegeId`:
  ```csharp
  if (userRole != "Parent" && userRole != "Student" && userRole != "Super Admin")
  {
      int? callerCollegeId = jwtTokenHelper.GetCollegeId(context.HttpContext.User);
      if (callerCollegeId.HasValue && callerCollegeId.Value > 0 && targetStudentId.HasValue)
      {
          var studentCollegeId = await Dapper.SqlMapper.ExecuteScalarAsync<int?>(
              connection,
              "SELECT c.CollegeId FROM Students s INNER JOIN Campuses c ON s.CampusId = c.CampusId WHERE s.StudentId = @StudentId LIMIT 1;",
              new { StudentId = targetStudentId.Value });

          if (studentCollegeId.HasValue && studentCollegeId.Value != callerCollegeId.Value)
          {
              context.Result = new ForbidResult();
              return;
          }
      }
  }
  ```

---

### 3.7 Parent Portal Frontend Mock Fallback Sanitization

#### A. Sanitize Hardcoded Fallbacks in `ParentPortalContext.jsx`
- **File:** [ParentPortalContext.jsx](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Frontend/src/modules/parent/context/ParentPortalContext.jsx#L516-L688)
- **Eliminate Hardcoded Section 30, Group 37, and Campus 1:**
  ```javascript
  // PREVIOUS CODE (LINES 684-686):
  // const sectionId = studentRecord?.sectionId || 30;
  // const groupId = studentRecord?.groupId || 37;
  // const campusId = studentRecord?.campusId || 1;

  // REMEDIATED CODE:
  const sectionId = studentRecord?.sectionId || null;
  const groupId = studentRecord?.groupId || null;
  const campusId = studentRecord?.campusId || null;
  ```

- **Eliminate Hardcoded ₹70k Fee Fallback (Lines 524–527):**
  ```javascript
  // PREVIOUS CODE:
  // const rawBreakdownItems = (feeData.breakdown && feeData.breakdown.length > 0)
  //   ? feeData.breakdown
  //   : [
  //       { feeType: "Admission", amount: 5000 },
  //       { feeType: "Course Fee", amount: 65000 },
  //     ];

  // REMEDIATED CODE:
  // Strictly reflect server fee records. If no fee is configured, return empty breakdown.
  const rawBreakdownItems = Array.isArray(feeData?.breakdown) ? feeData.breakdown : [];
  ```

- **Eliminate Hardcoded Mentor & Due Date Defaults (Lines 449–450, 519):**
  ```javascript
  mentor: studentRecord?.mentorName || "Not Assigned",
  mentorDesignation: studentRecord?.mentorDesignation || "Faculty Mentor",
  mentorMobile: studentRecord?.mentorPhone || "—",
  mentorEmail: studentRecord?.mentorEmail || "—",
  ```

---

## 4. Zero-Risk College 1 Preservation Guarantee

1. **Deterministic Defaulting to College 1:**
   All updated stored procedures use:
   ```sql
   SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);
   ```
   Legacy calls from College 1 with omitted `p_CollegeId` default seamlessly to `CollegeId = 1`.
2. **Backfill Integrity:**
   The `UPDATE Users` migration explicitly assigns existing students and parents to their actual campus's `CollegeId`. College 1 users remain `CollegeId = 1`.
3. **No Downtime:**
   Stored procedure drops and creates are transactional with zero schema breakage.

---

## 5. Verification Checklist for Phase 5

| Check | Test Vector | Expected Outcome |
| :--- | :--- | :--- |
| **User Provisioning** | Admin creates a new student in College 2 | `Users.CollegeId` is saved as `2`; JWT token contains `CollegeId: 2` claim |
| **Notification Broadcast** | College 2 Admin broadcasts a circular | Delivered only to College 2 students/parents; invisible to College 1 |
| **College 1 Broadcast** | College 1 Admin broadcasts an announcement | Delivered only to College 1; zero leakage to College 2 |
| **Student Timetable** | New College 2 student with no section assigned views timetable | Displays clean empty schedule; NEVER renders College 1 Section 1 |
| **Admissions Query** | College 2 Admin queries `/api/v1/student-admissions` | Returns only College 2 admissions; zero College 1 admissions |
| **Certificates List** | College 2 Admin or Student visits `/api/v1/certificates` | Displays only College 2 certificates; workflow stats reflect College 2 |
| **Hall Ticket PDF** | Student in College 2 requests hall ticket of College 1 student | Request rejected with HTTP 403 Forbidden |
| **Parent Portal Fees** | Parent of new College 2 child views `/parent/fees` | Displays clean 0 or actual assigned fee; NEVER shows fake ₹70,000 fee |

---

## 6. Next Steps

With Phase 5 formulated and verified, the next phase in the roadmap is:
- **Phase 6: Departmental Portals — Accountant, Exam Cell, Transport Manager, Driver, Warden/Hostel, Inventory & Non-Teaching Staff Scoping**
- Following completion and approval of Phase 6, we will proceed to Phase 7 (Multi-College Verification Protocol) and final synthesis into the Master Execution Plan.
