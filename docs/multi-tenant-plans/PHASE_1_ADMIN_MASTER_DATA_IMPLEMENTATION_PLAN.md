# Phase 1 Implementation Plan: Admin Portal — Master Data Scoping
## Modules: Departments, Designations, Boards, Programs, Course Groups & Subjects

---

## 1. Executive Summary & Phase 1 Objectives

Phase 1 establishes the root foundational masters of the College Admin Portal. When a new college administrator logs in, these 6 modules define the organizational and academic identity of the institution.

### Core Objectives:
1. **Total Multi-Tenant Scoping:** Ensure that every query, insert, update, and summary card in these 6 modules strictly checks the authenticated user's `CollegeId`.
2. **Elimination of Data Leakage:** Ensure that a newly created college starts with a 100% fresh, clean slate (0 departments, 0 designations, 0 custom boards, 0 groups, 0 subjects).
3. **Zero Harm to Existing Data:** Existing data belonging to `CollegeId = 1` (`Pirnav Junior College`) must remain 100% intact, functional, and unaffected.
4. **No Code Execution Yet:** This document is the **architectural blueprint**. Execution will only begin once all 7 phase plans are finalized and approved.

---

## 2. Line-by-Line Architectural Audit of Phase 1 Modules

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PHASE 1 MODULE MAPPING                                 │
├─────────────────────────┬─────────────────────────┬────────────────────────────────────┤
│ 1. Departments          │ 2. Designations         │ 3. Boards                          │
│ Table: Departments      │ Table: Designations     │ Tables: Boards, CampusBoards       │
│ Controller: Department  │ Controller: Designation │ Controller: Board                  │
│ SP: sp_GetDepartments   │ SP: sp_GetDesignations  │ SP: sp_GetBoards, sp_CreateBoard   │
├─────────────────────────┼─────────────────────────┼────────────────────────────────────┤
│ 4. Academic Programs    │ 5. Course Groups        │ 6. Subjects                        │
│ Table: Programs         │ Table: Groups           │ Table: Subjects                    │
│ Controller: Program     │ Controller: Groups      │ Controller: Subjects               │
│ SP: sp_GetPrograms      │ SP: sp_GetAllGroups     │ SP: sp_GetAllSubjects, ByBoardId   │
└─────────────────────────┴─────────────────────────┴────────────────────────────────────┘
```

---

### Module 1.1: Department Management

#### A. Frontend Architecture
* **Screen / Component:** [DepartmentManagementPage.jsx](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Frontend/src/modules/admin/AdminDepartments/DepartmentManagementPage.jsx)
* **Route:** `/dashboard/departments`
* **API Endpoints Called:**
  * `GET /api/v1/departments` (list departments)
  * `GET /api/v1/departments/summary` (KPI counts)
  * `POST /api/v1/departments` (create department)
  * `PUT /api/v1/departments/{id}` (update department)
  * `DELETE /api/v1/departments/{id}` (delete department)
* **Current State:** The frontend already extracts `authUser.collegeId` and appends `collegeId` in query parameters (`deptParams.collegeId = authUser.collegeId`).
* **Vulnerability Identified:** The summary card at the top of the page calls `/api/v1/departments/summary`, which triggers `sp_GetDepartmentSummary`. This stored procedure takes no arguments and counts all departments and staff in the entire database, displaying College 1's counts on College 2's dashboard.

#### B. Backend Architecture
* **Controller:** [DepartmentController.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Controllers/V1/DepartmentController.cs)
* **Repository:** [DepartmentRepository.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Repositories/Implementations/DepartmentRepository.cs)
* **Service:** `DepartmentService.cs`
* **Current Implementation:** `DepartmentController` has a `ResolveCollegeId()` helper that extracts the token claim. However, in `DepartmentRepository.cs`, `ResolveCollegeId()` has a fallback:
  ```csharp
  // DepartmentRepository.cs line 136:
  : (ResolveCollegeId() ?? 1)
  ```
  If a token claim is missing or formatted unexpectedly, it silently falls back to `CollegeId = 1`.

#### C. Database Layer & Stored Procedures
* **Table:** `Departments`
  * Columns: `DepartmentId (PK)`, `DepartmentCode`, `DepartmentName`, `StaffType`, `Description`, `CampusId (FK, NULLABLE)`, `CollegeId (INT, NULLABLE)`, `IsActive`, `CreatedAt`, `UpdatedAt`.
* **Stored Procedures:**
  * `sp_GetDepartments`: Contains a conditional fallback:
    ```sql
    WHERE (
        (v_CollegeId IS NOT NULL AND d.CollegeId = v_CollegeId)
        OR (v_CollegeId IS NULL AND (p_CampusId IS NULL OR d.CampusId = p_CampusId))
    )
    AND (p_CampusId IS NULL OR d.CampusId = p_CampusId OR d.CampusId IS NULL)
    ```
    If `v_CollegeId` is NULL, all institutional rows where `CampusId IS NULL` (which belong to College 1) leak into the result!
  * `sp_GetDepartmentSummary`: Counts all departments and staff globally across the entire database without any tenant filter.

#### D. Required Changes for Module 1.1:
1. **`sp_GetDepartments`**:
   - Enforce mandatory tenant scoping:
     ```sql
     WHERE d.CollegeId = v_CollegeId
       AND (p_CampusId IS NULL OR d.CampusId = p_CampusId OR d.CampusId IS NULL)
       AND (p_IncludeInactive = 1 OR d.IsActive = 1)
     ```
   - If `v_CollegeId` is NULL or invalid, return 0 rows (empty set). Never fall back to global rows.
2. **`sp_GetDepartmentSummary`**:
   - Add parameters: `IN p_CollegeId INT, IN p_CampusId INT`.
   - Update queries:
     ```sql
     SELECT 
         COUNT(*) AS TotalDepartments,
         COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDepartments,
         COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDepartments,
         (SELECT COUNT(*) FROM `Designations` WHERE CollegeId = p_CollegeId AND IsActive = 1) AS TotalDesignations,
         (SELECT COUNT(*) FROM `Staff` s 
          INNER JOIN `Campuses` c ON s.CampusId = c.CampusId 
          WHERE c.CollegeId = p_CollegeId AND s.IsDeleted = 0) AS TotalStaff
     FROM `Departments`
     WHERE CollegeId = p_CollegeId;
     ```
3. **`DepartmentRepository.cs`**:
   - Remove any fallback to `1`. Throw an `UnauthorizedAccessException` if `CollegeId` cannot be resolved.

---

### Module 1.2: Designation Management

#### A. Frontend Architecture
* **Screen / Component:** [DepartmentManagementPage.jsx](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Frontend/src/modules/admin/AdminDepartments/DepartmentManagementPage.jsx) (Designations Tab)
* **Route:** `/dashboard/designations`
* **API Endpoints Called:**
  * `GET /api/v1/designations`
  * `GET /api/v1/designations/summary`
  * `POST /api/v1/designations`
  * `PUT /api/v1/designations/{id}`
  * `DELETE /api/v1/designations/{id}`

#### B. Backend Architecture
* **Controller:** [DesignationController.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Controllers/V1/DesignationController.cs)
* **Repository:** [DesignationRepository.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Repositories/Implementations/DesignationRepository.cs)
* **Service:** `DesignationService.cs`

#### C. Database Layer & Stored Procedures
* **Table:** `Designations`
  * Columns: `Id (PK)`, `Name`, `DepartmentId (FK)`, `StaffType`, `IsActive`, `CampusId (NULLABLE)`, `CollegeId (INT, NULLABLE)`, `CreatedAt`, `UpdatedAt`.
* **Stored Procedures:**
  * `sp_GetDesignations`: Like `sp_GetDepartments`, permits `v_CollegeId IS NULL` to return global designations.
  * `sp_CreateDesignation`: Must explicitly insert `CollegeId`.
  * `sp_GetDesignationSummary`: Must count designations and staff strictly matching `CollegeId = p_CollegeId`.

#### D. Required Changes for Module 1.2:
1. **`sp_GetDesignations`**:
   - Enforce `WHERE des.CollegeId = v_CollegeId`.
2. **`sp_CreateDesignation`**:
   - Accept `IN p_CollegeId INT` and store `CollegeId = p_CollegeId`.
3. **`sp_GetDesignationSummary`**:
   - Filter `WHERE CollegeId = p_CollegeId`.
4. **`DesignationRepository.cs`**:
   - Ensure `p_CollegeId` is always supplied from `ResolveCollegeId()`. Remove any hardcoded `= 1` fallback.

---

### Module 1.3: Board Management

#### A. Frontend Architecture
* **Screen / Component:** `BoardManagementPage.jsx` (`Frontend/src/modules/admin/AdminBoards/BoardManagementPage.jsx`)
* **Route:** `/dashboard/board`
* **API Endpoints Called:**
  * `GET /api/v1/boards` (paged list)
  * `GET /api/v1/boards/{id}` (single board details)
  * `POST /api/v1/boards` (create board)
  * `PUT /api/v1/boards/{id}` (update board)
  * `DELETE /api/v1/boards/{id}` (delete board)
* **Vulnerability Identified:** Every board created in the system currently gets displayed to every other college because `sp_GetBoards` does not accept `CollegeId`.

#### B. Backend Architecture
* **Controller:** [BoardController.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Controllers/V1/BoardController.cs)
* **Repository:** [BoardRepository.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Repositories/Implementations/BoardRepository.cs)
* **Service:** `BoardService.cs`

#### C. Database Layer & Stored Procedures
* **Table:** `Boards`
  * Columns: `BoardId (PK)`, `BoardCode`, `BoardType`, `BoardName`, `Description`, `CountryId`, `StateId`, `GradingSystemId`, `IsActive`, `RowVersion`, `CollegeId (INT, NULLABLE, DEFAULT 1)`, `CreatedAt`, `UpdatedAt`.
* **Stored Procedures:**
  * `sp_GetBoards`: Parameters:
    `p_Search, p_Status, p_CountryId, p_StateId, p_SortBy, p_SortOrder, p_PageNumber, p_PageSize`.
    **Notice: `p_CollegeId` is completely missing!**
  * `sp_CreateBoard`:
    `IN p_BoardCode, IN p_BoardType, IN p_BoardName, IN p_Description, IN p_CountryId, IN p_StateId, IN p_GradingSystemId, IN p_IsActive`.
    **Notice: `p_CollegeId` is not inserted! It defaults to 1 in MySQL!**

#### D. Required Changes for Module 1.3:
1. **`sp_GetBoards`**:
   - Add parameter: `IN p_CollegeId INT`.
   - Update WHERE clause:
     ```sql
     WHERE (b.CollegeId = p_CollegeId OR (b.CollegeId IS NULL AND b.IsActive = 1))
       AND (p_Status IS NULL OR b.IsActive = p_Status)
     ```
   - This ensures custom boards created by a college are only visible to that college, while any global/system standard board with `CollegeId IS NULL` remains universally available.
2. **`sp_CreateBoard`**:
   - Add parameter: `IN p_CollegeId INT`.
   - Update `INSERT INTO Boards (..., CollegeId) VALUES (..., p_CollegeId)`.
3. **`BoardRepository.cs`**:
   - In `GetBoardsAsync`: Pass `parameters.Add("p_CollegeId", ResolveCollegeId(), DbType.Int32);`.
   - In `CreateBoardAsync`: Pass `parameters.Add("p_CollegeId", board.CollegeId ?? ResolveCollegeId(), DbType.Int32);`.
4. **`BoardController.cs`**:
   - Extract `CollegeId` from JWT token and pass it down through `IBoardService`.

---

### Module 1.4: Academic Programs & Streams

#### A. Frontend Architecture
* **Screen / Component:** `ProgramPage.jsx` (`Frontend/src/modules/admin/AdminCourses/ProgramPage.jsx`)
* **Route:** `/dashboard/programs`
* **API Endpoints Called:**
  * `GET /api/v1/programs`
  * `POST /api/v1/programs`
  * `PUT /api/v1/programs/{id}`
  * `DELETE /api/v1/programs/{id}`

#### B. Database Layer & Stored Procedures
* **Table:** `Programs`
  * Columns: `ProgramId (PK)`, `ProgramName`, `IsActive`, `CreatedAt`, `UpdatedAt`.
* **Live Data Inspection:** Currently contains standard streams (`Regular`, `JEE`, `NEET`, `CA Foundation`, `EAPCET`, etc.) and some custom ones.
* **Stored Procedures:**
  * `sp_GetPrograms`: `SELECT ProgramId, ProgramName, IsActive, CreatedAt, UpdatedAt FROM Programs;`

#### C. Required Changes for Module 1.4:
1. **Add `CollegeId` column to `Programs` table:**
   ```sql
   ALTER TABLE `Programs` ADD COLUMN `CollegeId` INT NULL AFTER `IsActive`;
   ALTER TABLE `Programs` ADD INDEX `IX_Programs_CollegeId` (`CollegeId`);
   ```
   * Existing standard rows (`Regular`, `JEE`, `NEET`) will have `CollegeId = NULL` (shared/system defaults).
   * Any new program created by an admin will have `CollegeId = @CollegeId`.
2. **Update `sp_GetPrograms`**:
   - Add `IN p_CollegeId INT`.
   - Filter: `WHERE (CollegeId IS NULL OR CollegeId = p_CollegeId)`.
3. **Update `sp_CreateProgram`**:
   - Insert `CollegeId = p_CollegeId`.
4. **Update `ProgramRepository.cs` & `ProgramController.cs`**:
   - Pass resolved `CollegeId` from token.

---

### Module 1.5: Course Groups Management

#### A. Frontend Architecture
* **Screen / Component:** `GroupManagementPage.jsx` (`Frontend/src/modules/admin/AdminCourses/GroupManagementPage.jsx`)
* **Route:** `/dashboard/groups`
* **API Endpoints Called:**
  * `GET /api/v1/groups`
  * `POST /api/v1/groups`
  * `PUT /api/v1/groups/{id}`
  * `DELETE /api/v1/groups/{id}`

#### B. Database Layer & Stored Procedures
* **Table:** `Groups`
  * Columns: `GroupId (PK)`, `BoardId (FK)`, `GroupName`, `GroupCode`, `Description`, `CollegeId (INT, NULLABLE)`, `IsActive`, `CreatedAt`, `UpdatedAt`.
* **Stored Procedures:**
  * `sp_GetAllGroups`: **Already accepts `IN p_CollegeId INT`** and filters:
    `AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR g.CollegeId = p_CollegeId)`.
  * `sp_CreateGroup`: Inserts `CollegeId = p_CollegeId`.

#### C. Backend Audit & Required Changes for Module 1.5:
* In [GroupRepository.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Repositories/Implementations/GroupRepository.cs):
  Lines 63-71 currently contain:
  ```csharp
  if (int.TryParse(claim, out int cid) && cid > 0)
      collegeId = cid;
  else
      collegeId = 1; // Unsafe hardcoded fallback
  ```
* **Required Change:**
  - Remove `collegeId = 1;`.
  - Replace with strict resolution. If no token claim is present, throw an `UnauthorizedAccessException`.

---

### Module 1.6: Subject Management

#### A. Frontend Architecture
* **Screen / Component:** `SubjectManagementPage.jsx` (`Frontend/src/modules/admin/AdminSubjects/SubjectManagementPage.jsx`)
* **Route:** `/dashboard/subjects`
* **API Endpoints Called:**
  * `GET /api/v1/subjects`
  * `GET /api/v1/subjects/board/{boardId}`
  * `GET /api/v1/subjects/group/{groupId}`
  * `POST /api/v1/subjects`
  * `PUT /api/v1/subjects/{id}`
  * `DELETE /api/v1/subjects/{id}`

#### B. Database Layer & Stored Procedures
* **Table:** `Subjects`
  * Columns: `SubjectId (PK)`, `BoardId (FK)`, `GroupId (FK, NULLABLE)`, `AcademicLevelId (FK)`, `SubjectName`, `SubjectCode`, `CollegeId (INT, NULLABLE)`, `IsActive`, `CreatedAt`, `UpdatedAt`.
* **Stored Procedures:**
  * `sp_GetAllSubjects`:
    * Current flaw: Lines 40-45 filter `AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR g.CollegeId = p_CollegeId)`.
    * If a subject is mapped to a board but not yet assigned to a group (`s.GroupId IS NULL`), `g.CollegeId` is NULL, causing the subject to disappear or leak!
    * **Fix:** Filter directly on `s.CollegeId = p_CollegeId`!
  * `sp_GetSubjectsByBoardId`:
    * Current flaw: `WHERE s.BoardId = p_BoardId` with **no `CollegeId` filter**!
    * **Fix:** Add `IN p_CollegeId INT` and filter `WHERE s.BoardId = p_BoardId AND (p_CollegeId IS NULL OR s.CollegeId = p_CollegeId)`.

#### C. Backend Audit & Required Changes for Module 1.6:
* In [SubjectRepository.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Repositories/Implementations/SubjectRepository.cs):
  * Pass `p_CollegeId` directly to `sp_GetSubjectsByBoardId` and `sp_GetSubjectsByGroupId`.
  * Ensure `sp_CreateSubject` persists `CollegeId = p_CollegeId`.

---

## 3. Step-by-Step Implementation Sequence for Phase 1

When authorized to execute, Phase 1 will be implemented in this exact non-destructive order:

### Step 1.1: Database DDL & Stored Procedure Deployment
1. Verify/Add `CollegeId` column on `Programs` table with index.
2. Deploy updated `sp_GetDepartments` & `sp_GetDepartmentSummary` with strict `p_CollegeId`.
3. Deploy updated `sp_GetDesignations` & `sp_GetDesignationSummary` with strict `p_CollegeId`.
4. Deploy updated `sp_GetBoards` & `sp_CreateBoard` with `p_CollegeId`.
5. Deploy updated `sp_GetPrograms` & `sp_CreateProgram` with `p_CollegeId`.
6. Deploy updated `sp_GetAllSubjects` & `sp_GetSubjectsByBoardId` filtering on `s.CollegeId`.

### Step 1.2: Backend C# Repositories & Controllers Scoping
1. Update `DepartmentRepository.cs` & `DepartmentController.cs`: Eliminate `= 1` fallback.
2. Update `DesignationRepository.cs` & `DesignationController.cs`: Eliminate `= 1` fallback.
3. Update `BoardRepository.cs` & `BoardController.cs`: Inject `ResolveCollegeId()` and pass `p_CollegeId`.
4. Update `ProgramRepository.cs` & `ProgramController.cs`: Inject `ResolveCollegeId()` and pass `p_CollegeId`.
5. Update `GroupRepository.cs`: Remove `collegeId = 1;` fallback.
6. Update `SubjectRepository.cs`: Pass `p_CollegeId` to `sp_GetSubjectsByBoardId`.

### Step 1.3: Frontend State & Empty-State Validation
1. Verify `DepartmentManagementPage.jsx` correctly shows an empty table (not loading forever, not crashing) when a new college has 0 departments.
2. Verify `BoardManagementPage.jsx` shows an empty list with an "Add Board" CTA when a new college has no custom boards.
3. Verify `GroupManagementPage.jsx` and `SubjectManagementPage.jsx` prompt the user cleanly without throwing exceptions.

---

## 4. Verification Protocol for Phase 1

Once executed, Phase 1 will be verified against two strict test suites:

### Test Suite A: Regression Verification on Existing College (`CollegeId = 1`)
* Log in as `Admin@CMS.com`.
* Navigate to **Departments**: Verify all 53 existing departments are present.
* Navigate to **Designations**: Verify all 30 existing designations are present.
* Navigate to **Boards**: Verify all existing boards (`BIEAP`, `TGBIE`, `PUC-KA`, etc.) are present.
* Navigate to **Groups & Subjects**: Verify all existing groups and subjects are intact.
* **Criterion:** 100% data fidelity preserved. Zero loss or modification of existing rows.

### Test Suite B: Tenant Isolation Verification on New College (`CollegeId = 2`)
* Log in as `Admin@narayana.com` (or create a new test college).
* Navigate to **Departments**: Must show **0 departments** (pristine empty state).
* Navigate to **Designations**: Must show **0 designations**.
* Navigate to **Boards**: Must show **0 custom boards** (or only universal system templates).
* Navigate to **Groups & Subjects**: Must show **0 groups** and **0 subjects**.
* Create a test department `Computer Engineering` in College 2.
* Switch back to `Admin@CMS.com` (College 1). Confirm `Computer Engineering` **does NOT appear** in College 1.
* **Criterion:** 100% clean isolation. Physical cross-tenant leakage is zero.

---

## 5. Artifact Status
* **Status:**  **AUDIT COMPLETE & PLAN FORMULATED**
* **Execution State:** **AWAITING USER REVIEW & PERMISSION TO PROCEED TO PHASE 2 AUDIT**
