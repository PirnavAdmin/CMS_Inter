# Phase 2 Implementation Plan: Admin Portal — Policy & Financial Scoping
## Modules: Leave Categories, LOP Policies, Fine Rules, Fee Types, Fee Structures, Scholarships & Concessions

---

## 1. Executive Summary & Phase 2 Objectives

Phase 2 establishes the operational rules, institutional HR policies, and financial billing engines for the College Admin Portal. When a new college administrator logs into the CMS, these modules govern how employee leaves, penalties, student fees, and institutional concessions operate.

### Core Objectives:
1. **Total Multi-Tenant Scoping:** Ensure that every query, rule, and calculation in these 6 financial & policy modules strictly checks the authenticated user's `CollegeId`.
2. **Elimination of Data Leakage:** Ensure that a newly created college starts with a 100% clean slate (0 leave categories, 0 LOP policies, 0 fine rules, 0 fee types, 0 fee structures, 0 scholarships).
3. **Database Schema & Index Hardening:** Convert single-column global unique constraints (such as `CategoryCode` in `LeaveCategories`) into composite tenant constraints `(CollegeId, CategoryCode)` so new colleges can define standard codes (e.g. `CL`, `SL`, `EL`) without throwing duplicate key errors.
4. **Zero Harm to Existing Data:** Existing financial structures and policies for `CollegeId = 1` (`Pirnav Junior College`) must remain 100% intact, functional, and unaffected.
5. **Planning & Audit Only:** No code or database changes will be executed until all 7 phase plans are finalized and approved.

---

## 2. Line-by-Line Architectural Audit of Phase 2 Modules

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PHASE 2 MODULE MAPPING                                 │
├─────────────────────────┬─────────────────────────┬────────────────────────────────────┤
│ 1. Leave Categories     │ 2. LOP Policies         │ 3. Fine Rules                      │
│ Table: LeaveCategories  │ Table: LopPolicies      │ Table: FineRules                   │
│ Controller: LeaveCat    │ Controller: LopConfig   │ Controller: FineRule               │
│ SP: sp_GetLeaveCats     │ SP: sp_LopPolicy_Get    │ SP: sp_FineRule_GetAll             │
├─────────────────────────┼─────────────────────────┼────────────────────────────────────┤
│ 4. Fee Types            │ 5. Fee Structures       │ 6. Scholarships & Concessions      │
│ Table: FeeTypes         │ Table: FeeStructures    │ Tables: Scholarships, Concessions  │
│ Controller: Fee         │ Controller: Fee         │ Controller: Fee                    │
│ SP: sp_FeeType_GetAll   │ SP: FeeStructure_GetAll │ SP: sp_Scholarship_GetAll          │
└─────────────────────────┴─────────────────────────┴────────────────────────────────────┘
```

---

### Module 2.1: Leave Categories Management

#### A. Frontend Architecture
* **Screen / Component:** [LeaveTypesPage.jsx](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Frontend/src/modules/admin/AdminLeave/LeaveTypesPage.jsx)
* **Store / Service:** `leaveCategoryStore.js` (`Frontend/src/modules/admin/AdminLeave/services/leaveCategoryStore.js`)
* **Route:** `/dashboard/leave-categories`
* **API Endpoints Called:**
  * `GET /api/v1/leave-categories` (retrieve leave categories)
  * `GET /api/v1/leave-categories/summary` (retrieve KPI metrics)
  * `POST /api/v1/leave-categories` (create category)
  * `PUT /api/v1/leave-categories/{id}` (update category)
  * `DELETE /api/v1/leave-categories/{id}` (delete category)
  * `POST /api/v1/leave-categories/reset` (reset to default categories)
* **Current State:** Frontend calls endpoints without appending `collegeId`, expecting backend token-based extraction.

#### B. Backend Architecture
* **Controller:** [LeaveCategoryController.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Controllers/V1/LeaveCategoryController.cs)
* **Repository:** [LeaveCategoryRepository.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Repositories/Implementations/LeaveCategoryRepository.cs)
* **Service:** `LeaveCategoryService.cs`
* **Vulnerability Identified:** `LeaveCategoryController.cs` has **zero `CollegeId` extraction**. It invokes `_service.GetAllAsync(ct)` which executes `sp_GetLeaveCategories` with 0 parameters.

#### C. Database Layer & Stored Procedures
* **Table:** `LeaveCategories`
  * Columns: `LeaveCategoryId (PK)`, `CategoryName`, `CategoryCode (VARCHAR(10) UNIQUE)`, `AnnualQuota`, `ApplicableStaffType`, `AllowCarryForward`, `RequiresProof`, `Description`, `IsActive`, `DisplayOrder`, `CreatedAt`, `UpdatedAt`, `CollegeId (INT, DEFAULT 1)`, `CampusId (NULLABLE)`.
* **Critical Index Flaw:** `CategoryCode` has a global single-column UNIQUE index. If College 2 attempts to create `CL` (Casual Leave), MySQL rejects the insert with `ER_DUP_ENTRY: Duplicate entry 'CL' for key 'CategoryCode'`.
* **Stored Procedures:**
  * `sp_GetLeaveCategories`: Takes 0 parameters. Runs `SELECT ... FROM LeaveCategories WHERE IsActive = 1 ORDER BY DisplayOrder`. Dumps all categories from College 1 into every college!
  * `sp_CreateLeaveCategory`: Does not accept `p_CollegeId`. MySQL assigns the column default `1`.

#### D. Required Changes for Module 2.1:
1. **Database Schema & Index:**
   ```sql
   -- Drop single-column unique index and add composite tenant unique index
   ALTER TABLE `LeaveCategories` DROP INDEX `CategoryCode`;
   ALTER TABLE `LeaveCategories` ADD UNIQUE INDEX `UQ_LeaveCategories_College_Code` (`CollegeId`, `CategoryCode`);
   ```
2. **`sp_GetLeaveCategories`**:
   - Add parameter: `IN p_CollegeId INT`.
   - Update WHERE clause:
     ```sql
     WHERE IsActive = 1 
       AND (CollegeId = p_CollegeId)
     ```
3. **`sp_CreateLeaveCategory`**:
   - Add parameter: `IN p_CollegeId INT`.
   - Update `INSERT INTO LeaveCategories (..., CollegeId) VALUES (..., p_CollegeId)`.
4. **`LeaveCategoryRepository.cs` & `LeaveCategoryController.cs`**:
   - Extract `CollegeId` from JWT claims (`IJwtTokenHelper.GetCollegeId(User)`).
   - Pass `p_CollegeId` to `sp_GetLeaveCategories`, `sp_CreateLeaveCategory`, and `sp_GetLeaveCategorySummary`.

---

### Module 2.2: LOP (Loss of Pay) Policies & Configurations

#### A. Frontend Architecture
* **Screen / Component:** [LOPConfigurationPage.jsx](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Frontend/src/modules/admin/AdminLOPConfiguration/LOPConfigurationPage.jsx)
* **Route:** `/dashboard/lop-configuration`
* **API Endpoints Called:**
  * `GET /api/v1/lop-configuration/policy` (get active LOP policy)
  * `POST /api/v1/lop-configuration/policy` (save/update LOP policy)
  * `GET /api/v1/lop-configuration/kpis` (get LOP impact metrics)
  * `GET /api/v1/lop-configuration/records` (get staff LOP penalty records)
  * `POST /api/v1/lop-configuration/records` (create manual LOP deduction)

#### B. Backend Architecture
* **Controller:** [LopConfigurationController.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Controllers/V1/LopConfigurationController.cs)
* **Repository:** `LopConfigurationRepository.cs` (`Backend/src/CollegeManagement.API/Repositories/Implementations/LopConfiguration/LopConfigurationRepository.cs`)
* **Service:** `LopConfigurationService.cs`

#### C. Database Layer & Stored Procedures
* **Table:** `LopPolicies`
  * Columns: `PolicyId (PK)`, `CampusId (NULLABLE)`, `CollegeId (INT, NULLABLE)`, `StaffType`, `IsEnabled`, `ShiftStart`, `GraceMinutes`, `AllowedLateLogins`, `PenaltyDays`, `MissedCheckoutLopEnabled`, `CreatedAt`, `UpdatedAt`.
* **Stored Procedures:**
  * `sp_LopPolicy_Get`: Has no parameters and returns `SELECT ... FROM LopPolicies LIMIT 1;`.
  * `sp_LopPolicy_GetByScope`: Parameter `(p_CampusId, p_StaffType)`. If `CampusId = p_CampusId` is false, it falls back to `CampusId IS NULL`, which returns College 1's global policy!
  * `sp_LopRecords_GetPaged`: Parameter `(p_CampusId, p_Month, p_Search, ...)`. Does not filter by `CollegeId`.

#### D. Required Changes for Module 2.2:
1. **`sp_LopPolicy_Get` & `sp_LopPolicy_GetByScope`**:
   - Add parameter: `IN p_CollegeId INT`.
   - Update WHERE clause:
     ```sql
     WHERE CollegeId = p_CollegeId
       AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId OR CampusId IS NULL)
       AND (StaffType = v_StaffType OR StaffType = 'All')
     ```
   - If no policy exists for `CollegeId`, return a clean default DTO with `IsEnabled = false`. Never return another college's policy.
2. **`sp_LopRecords_GetPaged`**:
   - Enforce `WHERE s.CampusId IN (SELECT CampusId FROM Campuses WHERE CollegeId = p_CollegeId)`.
3. **`LopConfigurationRepository.cs` & `LopConfigurationController.cs`**:
   - Extract `CollegeId` from JWT token and pass `p_CollegeId` to all policy and record procedures.

---

### Module 2.3: Fine Rules Management

#### A. Frontend Architecture
* **Screen / Component:** [FineRulePage.jsx](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Frontend/src/modules/admin/AdminFees/FineRulePage.jsx)
* **Route:** `/dashboard/fine-rules`
* **API Endpoints Called:**
  * `GET /api/v1/fine-rules` (get all fine rules)
  * `POST /api/v1/fine-rules` (create fine rule)
  * `PUT /api/v1/fine-rules/{id}` (update fine rule)
  * `DELETE /api/v1/fine-rules/{id}` (delete fine rule)

#### B. Backend Architecture
* **Controller:** [FineRuleController.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Controllers/V1/FineRuleController.cs)
* **Repository:** [FineRuleRepository.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Repositories/Implementations/FineRuleRepository.cs)
* **Service:** `FineRuleService.cs`

#### C. Database Layer & Stored Procedures
* **Table:** `FineRules`
  * Columns: `FineRuleId (PK)`, `FineRuleCode`, `FineRuleName`, `FineType`, `Amount`, `GracePeriodDays`, `ApplicableFeeTypeId`, `CampusId (NULLABLE)`, `BoardId (NULLABLE)`, `AcademicYearId (NULLABLE)`, `CollegeId (INT, NULLABLE)`, `IsActive`, `CreatedAt`, `UpdatedAt`.
* **Stored Procedures:**
  * `sp_FineRule_GetAll`: Takes `(p_CampusId, p_BoardId, p_AcademicYearId)`. **Does NOT accept `p_CollegeId`!**
  * Condition:
    ```sql
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR fr.CampusId IS NULL OR fr.CampusId = p_CampusId)
    ```
    Rules with `CampusId IS NULL` (institutional rules created by College 1) are returned to every college!
  * `sp_FineRule_Create`: Does not insert `CollegeId`.

#### D. Required Changes for Module 2.3:
1. **`sp_FineRule_GetAll`**:
   - Add parameter: `IN p_CollegeId INT`.
   - Update WHERE clause:
     ```sql
     WHERE fr.CollegeId = p_CollegeId
       AND (p_CampusId IS NULL OR p_CampusId = 0 OR fr.CampusId = p_CampusId OR fr.CampusId IS NULL)
       AND (p_BoardId IS NULL OR p_BoardId = 0 OR fr.BoardId = p_BoardId OR fr.BoardId IS NULL)
       AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR fr.AcademicYearId = p_AcademicYearId OR fr.AcademicYearId IS NULL)
     ```
2. **`sp_FineRule_Create`**:
   - Add parameter: `IN p_CollegeId INT`.
   - Update `INSERT INTO FineRules (..., CollegeId) VALUES (..., p_CollegeId)`.
3. **`FineRuleRepository.cs` & `FineRuleController.cs`**:
   - Pass `p_CollegeId = ResolveCollegeId()` on all repository calls.

---

### Module 2.4: Fee Types & Fee Categories

#### A. Frontend Architecture
* **Screen / Component:** [FeeManagementPage.jsx](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Frontend/src/modules/admin/AdminFees/FeeManagementPage.jsx) (Fee Types / Categories Tab)
* **Route:** `/dashboard/fee-management`
* **API Endpoints Called:**
  * `GET /api/v1/fee-types`
  * `POST /api/v1/fee-types`
  * `PUT /api/v1/fee-types/{id}`
  * `DELETE /api/v1/fee-types/{id}`

#### B. Database Layer & Stored Procedures
* **Table:** `FeeTypes`
  * Columns: `FeeTypeId (PK)`, `CollegeId (INT)`, `FeeTypeCode`, `FeeTypeName`, `Category`, `CampusId (NULLABLE)`, `BoardId (NULLABLE)`, `AcademicYearId (NULLABLE)`, `IsActive`, `CreatedAt`, `UpdatedAt`.
* **Stored Procedures:**
  * `sp_FeeType_GetAll`: Accepts `(p_CampusId, p_BoardId, p_AcademicYearId, p_CollegeId)` and correctly filters `AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR ft.CollegeId = p_CollegeId)`.
  * `sp_GetFeeTypes` (Wrapper procedure):
    ```sql
    CREATE PROCEDURE `sp_GetFeeTypes`(
        IN p_CampusId INT,
        IN p_BoardId INT,
        IN p_AcademicYearId INT
    )
    BEGIN
        CALL sp_FeeType_GetAll(p_CampusId, p_BoardId, p_AcademicYearId);
    END
    ```
    **Notice:** The wrapper procedure only takes 3 parameters and fails to pass `p_CollegeId` to `sp_FeeType_GetAll`!

#### C. Required Changes for Module 2.4:
1. **Update `sp_GetFeeTypes` Wrapper Procedure:**
   ```sql
   DROP PROCEDURE IF EXISTS `sp_GetFeeTypes`;
   CREATE PROCEDURE `sp_GetFeeTypes`(
       IN p_CampusId INT,
       IN p_BoardId INT,
       IN p_AcademicYearId INT,
       IN p_CollegeId INT
   )
   BEGIN
       CALL sp_FeeType_GetAll(p_CampusId, p_BoardId, p_AcademicYearId, p_CollegeId);
   END;
   ```
2. **Update `sp_FeeType_GetAll`**:
   - Ensure `WHERE ft.CollegeId = p_CollegeId` is mandatory when `p_CollegeId > 0`.
3. **`FeeRepository.cs`**:
   - In `CreateFeeTypeAsync`: Ensure `request.CollegeId` is resolved from JWT claims.

---

### Module 2.5: Fee Structures & Component Allocations

#### A. Frontend Architecture
* **Screen / Component:** [FeeManagementPage.jsx](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Frontend/src/modules/admin/AdminFees/FeeManagementPage.jsx) (Fee Structures Tab)
* **Route:** `/dashboard/fee-management`
* **API Endpoints Called:**
  * `GET /api/v1/fee-structures`
  * `POST /api/v1/fee-structures`
  * `PUT /api/v1/fee-structures/{id}`
  * `DELETE /api/v1/fee-structures/{id}`

#### B. Database Layer & Stored Procedures
* **Tables:** `FeeStructures`, `FeeStructureComponents`
  * Columns: `FeeStructureId (PK)`, `CollegeId (INT)`, `StructureName`, `CampusId`, `BoardId`, `AcademicYearId`, `AcademicLevelId`, `GroupId`, `ProgramId`, `YearFeeMode`, `IsActive`, `CreatedAt`, `UpdatedAt`.
* **Stored Procedures:**
  * `sp_FeeStructure_GetAll`: Already accepts `(p_CampusId, p_CollegeId)` and filters `fs.CollegeId = p_CollegeId`.
  * `sp_GetFeeStructures` (Wrapper procedure):
    ```sql
    CREATE PROCEDURE `sp_GetFeeStructures`(IN p_CampusId INT)
    BEGIN
        CALL sp_FeeStructure_GetAll(p_CampusId);
    END
    ```
    **Notice:** Only takes `p_CampusId` and omits `p_CollegeId`!

#### C. Required Changes for Module 2.5:
1. **Update `sp_GetFeeStructures` Wrapper Procedure:**
   ```sql
   DROP PROCEDURE IF EXISTS `sp_GetFeeStructures`;
   CREATE PROCEDURE `sp_GetFeeStructures`(
       IN p_CampusId INT,
       IN p_CollegeId INT
   )
   BEGIN
       CALL sp_FeeStructure_GetAll(p_CampusId, p_CollegeId);
   END;
   ```
2. **`TenantIsolationActionFilter.cs`**:
   - Retain entity-level IDOR validation: `_securityService.ValidateFeeStructureOwnershipAsync(targetFeeId.Value, collegeId.Value)`.

---

### Module 2.6: Scholarships & Fee Concessions

#### A. Frontend Architecture
* **Screen / Component:** [FeeManagementPage.jsx](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Frontend/src/modules/admin/AdminFees/FeeManagementPage.jsx) (Scholarships Tab)
* **Route:** `/dashboard/fee-management`
* **API Endpoints Called:**
  * `GET /api/v1/scholarships`
  * `POST /api/v1/scholarships`
  * `PUT /api/v1/scholarships/{id}`
  * `DELETE /api/v1/scholarships/{id}`
  * `POST /api/v1/fee-concessions/apply`

#### B. Database Layer & Stored Procedures
* **Tables:** `Scholarships`, `FeeConcessions`
  * Columns in `Scholarships`: `ScholarshipId (PK)`, `CollegeId (INT, DEFAULT 1)`, `ScholarshipName`, `DiscountType`, `DiscountValue`, `Description`, `CampusId (NULLABLE)`, `BoardId (NULLABLE)`, `AcademicYearId (NULLABLE)`, `IsActive`, `CreatedAt`, `UpdatedAt`.
* **Stored Procedures:**
  * `sp_Scholarship_GetAll`: Takes `(p_CampusId, p_BoardId, p_AcademicYearId)`. **Does NOT accept `p_CollegeId`!**
  * Queries `WHERE (CampusId IS NULL OR CampusId = p_CampusId)`. Leaks College 1's institutional scholarships to every college.
  * `sp_Scholarship_Create`: Inserts rows without specifying `CollegeId`, defaulting to `1`.

#### C. Required Changes for Module 2.6:
1. **`sp_Scholarship_GetAll`**:
   - Add parameter: `IN p_CollegeId INT`.
   - Update WHERE clause:
     ```sql
     WHERE CollegeId = p_CollegeId
       AND (p_CampusId IS NULL OR p_CampusId = 0 OR CampusId = p_CampusId OR CampusId IS NULL)
       AND (p_BoardId IS NULL OR p_BoardId = 0 OR BoardId = p_BoardId OR BoardId IS NULL)
       AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR AcademicYearId = p_AcademicYearId OR AcademicYearId IS NULL)
     ```
2. **`sp_Scholarship_Create`**:
   - Add parameter: `IN p_CollegeId INT`.
   - Update `INSERT INTO Scholarships (..., CollegeId) VALUES (..., p_CollegeId)`.
3. **`FeeRepository.cs`**:
   - In `GetScholarshipsAsync`: Pass `p_CollegeId = ResolveCollegeId()`.
   - In `CreateScholarshipAsync`: Pass `p_CollegeId = ResolveCollegeId()`.

---

## 3. Step-by-Step Implementation Sequence for Phase 2

When authorized to execute, Phase 2 will be deployed in this exact sequence:

### Step 2.1: Database DDL & Stored Procedure Deployment
1. **Index Hardening on `LeaveCategories`:** Drop global `CategoryCode` unique index and add composite `(CollegeId, CategoryCode)`.
2. **Deploy updated `sp_GetLeaveCategories` & `sp_CreateLeaveCategory`** with `IN p_CollegeId INT`.
3. **Deploy updated `sp_LopPolicy_Get` & `sp_LopPolicy_GetByScope`** with `IN p_CollegeId INT`.
4. **Deploy updated `sp_FineRule_GetAll` & `sp_FineRule_Create`** with `IN p_CollegeId INT`.
5. **Deploy updated `sp_GetFeeTypes` & `sp_FeeType_GetAll`** ensuring `p_CollegeId` is mandatory.
6. **Deploy updated `sp_GetFeeStructures` & `sp_FeeStructure_GetAll`** ensuring `p_CollegeId` is passed through.
7. **Deploy updated `sp_Scholarship_GetAll` & `sp_Scholarship_Create`** with `IN p_CollegeId INT`.

### Step 2.2: Backend C# Repositories & Controllers Scoping
1. Update `LeaveCategoryController.cs` & `LeaveCategoryRepository.cs` to resolve `CollegeId` from JWT claims and pass `p_CollegeId`.
2. Update `LopConfigurationController.cs` & `LopConfigurationRepository.cs` to pass `p_CollegeId`.
3. Update `FineRuleController.cs` & `FineRuleRepository.cs` to pass `p_CollegeId`.
4. Update `FeeRepository.cs` for scholarships to pass `p_CollegeId` on `sp_Scholarship_GetAll` and `sp_Scholarship_Create`.

### Step 2.3: Frontend State & Empty-State Validation
1. Verify `LeaveTypesPage.jsx` renders an empty table gracefully with an "Add Leave Category" button when a new college has 0 categories.
2. Verify `FineRulePage.jsx` displays an empty state with "No fine rules defined".
3. Verify `FeeManagementPage.jsx` displays empty states for Fee Types, Structures, and Scholarships cleanly.

---

## 4. Verification Protocol for Phase 2

### Test Suite A: Regression Verification on Existing College (`CollegeId = 1`)
* Log in as `Admin@CMS.com`.
* Verify all 6 existing leave categories (`CL`, `SL`, `EL`, `ML`, `CO`, `MDCL`) remain intact.
* Verify existing LOP policy, fine rules, fee types, and fee structures are 100% untouched.
* **Criterion:** 100% data fidelity preserved. Zero loss or modification of existing rows.

### Test Suite B: Tenant Isolation Verification on New College (`CollegeId = 2`)
* Log in as `Admin@narayana.com` (or create a new test college).
* Navigate to **Leave Categories**: Must show **0 categories**.
* Create a new category `Casual Leave` with code `CL`.
  * Confirm it saves successfully with `CollegeId = 2`.
  * Confirm no unique constraint collision occurs with College 1's `CL`.
* Navigate to **Fine Rules**: Must show **0 fine rules**.
* Navigate to **Fee Management**: Must show **0 fee types**, **0 fee structures**, and **0 scholarships**.
* Switch back to `Admin@CMS.com` (College 1). Confirm College 2's new `CL` leave category does NOT appear in College 1.
* **Criterion:** 100% clean isolation. Physical cross-tenant leakage is zero.

---

## 5. Artifact Status
* **Status:**  **AUDIT COMPLETE & PLAN FORMULATED**
* **Execution State:** **AWAITING USER REVIEW & PERMISSION TO PROCEED TO PHASE 3 AUDIT**
