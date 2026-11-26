# CMS Inter: Complete Multi-Tenant Portal Audit & Phase-Wise Implementation Roadmap

## 1. Executive Summary & Root Cause Analysis

### The Problem
When a new college is onboarded via the Super Admin portal, the new college administrator logs into a system that should be pristine and fresh. However, an architectural audit revealed an inconsistency across the application:
* **Fresh Modules:** Certain modules (Students, Staff, Transport, Hostel) filter queries strictly by `CampusId`. Because the newly provisioned HQ campus had 0 records, these screens generated cleanly with 0 records.
* **Leaking Modules:** Other critical foundational modules (Departments, Designations, Boards, Academic Years, Leave Categories, Fine Rules) had queries and stored procedures that omitted `CollegeId` or contained unscoped fallbacks. As a result, stored procedures like `sp_GetDepartments`, `sp_GetDesignations`, and `sp_GetBoards` performed unconstrained `SELECT *` queries across the entire database, pulling in existing data created by College 1 (`Pirnav Junior College`).

### The Solution: Universal `CollegeId` Integration
Integrating `CollegeId` across every module alongside `CampusId`, `BoardId`, and `AcademicYearId` establishes a strict multi-tenant boundary:
1. **Legal Tenant Boundary:** `CollegeId` represents the top-level institutional tenant.
2. **Branch Boundary:** `CampusId` represents physical branches belonging to that college.
3. **Academic Dimensions:** `BoardId` represents curriculum, and `AcademicYearId` represents the active academic timeline.
4. **Clean Slate Guarantee:** Every newly onboarded college starts with an empty, isolated slate. No query can physically return another college's rows.
5. **Zero Harm to Existing Data:** All existing records (`CollegeId = 1`) remain untouched and isolated.

---

## 2. Complete Inventory of All 12 Portals in CMS Inter

The CMS Inter platform consists of **12 distinct user portals**:

| Portal # | Portal Name | Primary Base Route | Primary Target Role(s) | Description |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Super Admin Portal** | `/super-admin/*` | Super Admin | Platform-wide college onboarding, subscription plans, platform billing, global user oversight. |
| **2** | **College Admin Portal** | `/dashboard/*` | Admin, College Admin | Core institutional management covering all 36 academic, administrative, and operational modules. |
| **3** | **Principal Portal** | `/principal-dashboard/*` | Principal | Academic oversight, staff leaves approval, executive reports, student enquiries. |
| **4** | **Faculty / Teacher Portal** | `/faculty-dashboard/*` | Teacher, Lecturer | Timetable schedule, student attendance marking, assignments, study materials, marks entry. |
| **5** | **Student Portal** | `/student-dashboard/*` | Student | My timetable, student daily attendance, fee dues/receipts, hall tickets, exam results, assignments. |
| **6** | **Parent Portal** | `/parent-dashboard/*` | Parent | Child progress tracking, online fee payment, attendance monitoring, report cards, announcements. |
| **7** | **Accountant Portal** | `/accountant-dashboard/*` | Accountant | Fee collection counter, manual receipts, dues follow-up, daybook, fee concessions, ledger entries. |
| **8** | **Exam Cell Portal** | `/exam-cell-dashboard/*` | Exam Cell Coordinator | Exam master, schedules, hall ticket generation, invigilator duty roster, marks capture, result processing. |
| **9** | **Transport Manager & Driver Portal** | `/transport-manager/*`, `/driver-dashboard/*` | Transport Manager, Driver | Routes, stops, bus assignments, maintenance logs, student allocations, GPS telemetry, driver attendance. |
| **10** | **Hostel & Warden Portal** | `/warden-dashboard/*` | Warden, Hostel Admin | Hostel blocks, rooms, bed allocations, nightly roll-call attendance, outpass/leave approvals, complaints. |
| **11** | **Inventory Portal** | `/inventory-dashboard/*` | Inventory Store Manager | Categories, stock items, suppliers, purchase orders, material consumption & transaction logs. |
| **12** | **Non-Teaching Staff Portal** | `/non-teaching-dashboard/*` | Clerk, Lab Assistant, Peon | Punch-in/out attendance, leave applications, assigned tasks, service tickets, payslips & reimbursements. |

---

## 3. Deep-Dive Line-by-Line Audit: College Admin Portal (All 36 Modules)

The College Admin Portal (`/dashboard/*`) is the central operational hub. Below is the complete audit of every module, mapping frontend screens, backend controllers, stored procedures, current multi-tenancy status, and the exact remediation required.

### Category A: Institutional & Organizational Masters

#### 1. Campus Management
* **Frontend Screen(s):** `/dashboard/campus-configuration` (`CampusManagementPage.jsx`)
* **Backend Controller:** `CampusController.cs`
* **Repository / Methods:** `CampusRepository.cs` (`GetCampuses`, `GetCampusById`, `CreateCampus`, `UpdateCampus`)
* **Stored Procedures:** `sp_GetCampuses`, `sp_CreateCampus`, `sp_UpdateCampus`
* **Current Multi-Tenancy Status:**  **Scoped.** Table `Campuses` has `CollegeId`. Controller filters by authenticated user's `CollegeId`.
* **Action Required:** None. Working correctly.

#### 2. Department Management
* **Frontend Screen(s):** `/dashboard/departments` (`DepartmentManagementPage.jsx`)
* **Backend Controller:** `DepartmentController.cs`
* **Repository / Methods:** `DepartmentRepository.cs` (`GetDepartmentsAsync`, `GetSummaryAsync`, `CreateDepartmentAsync`)
* **Stored Procedures:** `sp_GetDepartments`, `sp_GetDepartmentSummary`, `sp_CreateDepartment`
* **Current Multi-Tenancy Status:** ❌ **LEAKING.** Table `Departments` has `CollegeId`, but `sp_GetDepartments` lacks `p_CollegeId` parameter and executes unconstrained `SELECT * FROM Departments WHERE IsActive = 1`.
* **Action Required:** 
  1. Add `IN p_CollegeId INT` to `sp_GetDepartments` and filter `WHERE (p_CollegeId IS NULL OR CollegeId = p_CollegeId)`.
  2. Scope `sp_GetDepartmentSummary` to count only rows for the requesting college.

#### 3. Designation Management
* **Frontend Screen(s):** `/dashboard/designations` (`DesignationManagementPage.jsx`)
* **Backend Controller:** `DesignationController.cs`
* **Repository / Methods:** `DesignationRepository.cs` (`GetDesignationsAsync`, `CreateDesignationAsync`)
* **Stored Procedures:** `sp_GetDesignations`, `sp_CreateDesignation`
* **Current Multi-Tenancy Status:** ❌ **LEAKING.** `sp_GetDesignations` does not filter by `CollegeId`. Returns College 1's designations to all colleges.
* **Action Required:** Add `IN p_CollegeId INT` to `sp_GetDesignations` and filter `WHERE (p_CollegeId IS NULL OR CollegeId = p_CollegeId)`.

#### 4. Leave Categories & LOP Policies
* **Frontend Screen(s):** `/dashboard/leave-categories`, `/dashboard/lop-configuration` (`LeaveCategoryPage.jsx`, `LOPConfigurationPage.jsx`)
* **Backend Controller:** `LeaveCategoryController.cs`, `LopConfigurationController.cs`
* **Repository / Methods:** `LeaveCategoryRepository.cs` (`GetLeaveCategoriesAsync`), `LopConfigurationRepository.cs`
* **Stored Procedures:** `sp_GetLeaveCategories`, `sp_CreateLeaveCategory`, `sp_GetLopPolicies`
* **Current Multi-Tenancy Status:** ❌ **LEAKING.** `sp_GetLeaveCategories` takes 0 parameters and dumps all categories from the entire table.
* **Action Required:** Pass `p_CollegeId` from token and filter `WHERE (p_CollegeId IS NULL OR CollegeId = p_CollegeId)`.

#### 5. ID & Number Series Configuration
* **Frontend Screen(s):** `/dashboard/settings/number-series` (`NumberSeriesPage.jsx`)
* **Backend Controller:** `NumberSeriesController.cs`
* **Repository / Methods:** `NumberSeriesRepository.cs`, `SuperAdminRepository.cs`
* **Stored Procedures:** Direct EF Core / Dapper queries on `NumberSeriesConfigurations`
* **Current Multi-Tenancy Status:**  **Fixed.** Scoped by composite key `(CollegeId, SeriesCode, CampusId)`. Format patterns updated to dynamic `{PREFIX}`.
* **Action Required:** None. Working correctly.

#### 6. Roles & Permissions Management
* **Frontend Screen(s):** `/dashboard/settings/roles-permissions` (`RolesPermissionsPage.jsx`)
* **Backend Controller:** `RoleManagementController.cs`
* **Repository / Methods:** `RoleRepository.cs`, `PermissionRepository.cs`
* **Stored Procedures:** `sp_GetRolesWithPermissions`, `sp_SaveRolePermissions`
* **Current Multi-Tenancy Status:** ⚠️ **Global/Shared.** System roles (Admin, Teacher, Student) are shared across colleges.
* **Action Required:** Ensure college admins cannot modify global system roles; custom roles created by an admin must store `CollegeId`.

---

### Category B: Academic Curriculum & Time Dimension Masters

#### 7. Board Management
* **Frontend Screen(s):** `/dashboard/board` (`BoardManagementPage.jsx`)
* **Backend Controller:** `BoardController.cs`
* **Repository / Methods:** `BoardRepository.cs` (`GetBoardsAsync`, `CreateBoardAsync`)
* **Stored Procedures:** `sp_GetBoards`, `sp_CreateBoard`, `sp_GetBoardById`
* **Current Multi-Tenancy Status:** ❌ **LEAKING.** Table `Boards` has `CollegeId`, but `sp_GetBoards` does not filter by `p_CollegeId`.
* **Action Required:** 
  1. Add `IN p_CollegeId INT` to `sp_GetBoards` and filter `WHERE (b.CollegeId = p_CollegeId OR b.CollegeId IS NULL)`.
  2. In `sp_CreateBoard`, ensure `CollegeId` is saved from the calling admin's token.

#### 8. Academic Year Management
* **Frontend Screen(s):** `/dashboard/academic-year` (`AcademicYearPage.jsx`)
* **Backend Controller:** `AcademicYearsController.cs`
* **Repository / Methods:** `AcademicYearRepository.cs` (`GetPagedAsync`, `GetForExportAsync`, `AddAsync`)
* **Stored Procedures:** EF Core queries on `AcademicYears`
* **Current Multi-Tenancy Status:**  **Fixed.** Unscoped fallback removed. Query now enforces `query.Where(x => x.CollegeId == effectiveCollegeId.Value)`.
* **Action Required:** None. Working correctly.

#### 9. Academic Programs & Streams
* **Frontend Screen(s):** `/dashboard/programs` (`ProgramPage.jsx`)
* **Backend Controller:** `ProgramController.cs`
* **Repository / Methods:** `ProgramRepository.cs`
* **Stored Procedures:** `sp_GetPrograms`, `sp_CreateProgram`
* **Current Multi-Tenancy Status:** ⚠️ **Inherited via Board.** Needs explicit verification that programs link to boards owned by the college.
* **Action Required:** Add `p_CollegeId` parameter to `sp_GetPrograms`.

#### 10. Course Groups Management
* **Frontend Screen(s):** `/dashboard/groups` (`GroupManagementPage.jsx`)
* **Backend Controller:** `GroupsController.cs`
* **Repository / Methods:** `GroupRepository.cs` (`GetGroupsPagedAsync`)
* **Stored Procedures:** `sp_GetGroupsPaged`, `sp_CreateGroup`
* **Current Multi-Tenancy Status:**  **Scoped.** Table `Groups` has `CollegeId`. `GroupRepository.cs` passes `p_CollegeId = cid`.
* **Action Required:** None.

#### 11. Subject Management
* **Frontend Screen(s):** `/dashboard/subjects` (`SubjectManagementPage.jsx`)
* **Backend Controller:** `SubjectsController.cs`
* **Repository / Methods:** `SubjectRepository.cs` (`GetSubjectsPagedAsync`, `GetByBoardIdAsync`)
* **Stored Procedures:** `sp_GetSubjectsPaged`, `sp_GetSubjectsByBoardId`, `sp_CreateSubject`
* **Current Multi-Tenancy Status:**  **Scoped.** Table `Subjects` has `CollegeId`. `SubjectRepository.cs` passes `p_CollegeId = collegeId`.
* **Action Required:** Ensure `sp_GetSubjectsByBoardId` also validates that the board belongs to the requesting college.

#### 12. Section Management & Roll Allocation
* **Frontend Screen(s):** `/dashboard/sections`, `/dashboard/section-roll-allocation` (`SectionsPage.jsx`, `SectionRollAllocationPage.jsx`)
* **Backend Controller:** `SectionsController.cs`, `SectionRollAllocationController.cs`
* **Repository / Methods:** `SectionRepository.cs`, `SectionRollAllocationRepository.cs`
* **Stored Procedures:** `sp_GetSectionsPaged`, `sp_CreateSection`, `sp_AllocateRollNumbers`
* **Current Multi-Tenancy Status:**  **Scoped.** Filtered strictly by `CampusId`, `BoardId`, and `AcademicYearId`.
* **Action Required:** None.

#### 13. Academic Calendar & Events
* **Frontend Screen(s):** `/dashboard/academic-calendar` (`AcademicCalendarPage.jsx`)
* **Backend Controller:** `AcademicCalendarController.cs`
* **Repository / Methods:** `AcademicCalendarRepository.cs`
* **Stored Procedures:** `sp_GetAcademicCalendarEventsPaged`, `sp_CreateAcademicCalendarEvent`
* **Current Multi-Tenancy Status:**  **Scoped.** Events are scoped by `CampusId`, `BoardId`, and `AcademicYearId`.
* **Action Required:** Add `CollegeId` validation on event creation.

---

### Category C: People Management (Staff & Students)

#### 14. Teaching Staff Management
* **Frontend Screen(s):** `/dashboard/teaching-staff`, `/dashboard/add-staff` (`StaffManagementPage.jsx`)
* **Backend Controller:** `StaffController.cs`
* **Repository / Methods:** `StaffRepository.cs` (`GetStaffPagedAsync`, `CreateStaffAsync`, `GenerateNextEmployeeIdAsync`)
* **Stored Procedures:** `sp_GetStaffPaged`, `sp_CreateStaff`, `sp_GetStaffDetails`
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped strictly by `s.CampusId` belonging to the authenticated college's campuses (`collegeCampuses.Contains(...)`).
* **Action Required:** None.

#### 15. Non-Teaching Staff Management
* **Frontend Screen(s):** `/dashboard/non-teaching-staff` (`StaffManagementPage.jsx` with filter)
* **Backend Controller:** `StaffController.cs`, `NonTeachingDepartmentController.cs`
* **Repository / Methods:** `StaffRepository.cs`, `NonTeachingRepository.cs`
* **Stored Procedures:** `sp_GetNonTeachingStaffPaged`
* **Current Multi-Tenancy Status:**  **Scoped.** Uses same campus-isolated query as Teaching staff.
* **Action Required:** None.

#### 16. Staff Subject Allocation
* **Frontend Screen(s):** `/dashboard/staff-subject-allocation` (`StaffSubjectAllocationPage.jsx`)
* **Backend Controller:** `StaffSubjectAllocationController.cs`
* **Repository / Methods:** `StaffSubjectAllocationRepository.cs`
* **Stored Procedures:** `sp_GetStaffSubjectAllocations`, `sp_AllocateStaffSubject`
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped by `AcademicYearId`, `BoardId`, and `CampusId`.
* **Action Required:** None.

#### 17. Staff Campus Transfers
* **Frontend Screen(s):** `/dashboard/staff-transfers` (`StaffTransfersPage.jsx`)
* **Backend Controller:** `StaffTransfersController.cs`
* **Repository / Methods:** `StaffRepository.cs` (`TransferStaffAsync`)
* **Stored Procedures:** `sp_TransferStaffBetweenCampuses`
* **Current Multi-Tenancy Status:**  **Scoped.** Validates that both source and target campuses belong to the user's `CollegeId`.
* **Action Required:** None.

#### 18. Student Admissions & Enquiries
* **Frontend Screen(s):** `/dashboard/admissions`, `/dashboard/enquiries` (`AdmissionPage.jsx`, `EnquiryManagementPage.jsx`)
* **Backend Controller:** `StudentAdmissionsController.cs`, `EnquiryController.cs`
* **Repository / Methods:** `StudentAdmissionRepository.cs`, `EnquiryRepository.cs`
* **Stored Procedures:** `sp_GetStudentAdmissionsPaged`, `sp_CreateStudentAdmission`
* **Current Multi-Tenancy Status:**  **Scoped.** Table `StudentAdmissions` has `CampusId`, `BoardId`, `AcademicYearId`. Intercepted by `TenantIsolationActionFilter`.
* **Action Required:** None.

#### 19. Student Directory & Strength Reports
* **Frontend Screen(s):** `/dashboard/students`, `/dashboard/student-strength` (`StudentsPage.jsx`, `StudentStrengthReportPage.jsx`)
* **Backend Controller:** `StudentsController.cs`
* **Repository / Methods:** `StudentRepository.cs` (`GetStudentsPagedAsync`, `GetStudentStrengthReportAsync`)
* **Stored Procedures:** `sp_GetStudentsPaged`, `sp_GetStudentStrengthReport`
* **Current Multi-Tenancy Status:**  **Scoped.** Resolves `CollegeId` from campus or token claims.
* **Action Required:** None.

#### 20. Student Promotions & Campus Transfers
* **Frontend Screen(s):** `/dashboard/promotion`, `/dashboard/campus-transfers` (`PromotionPage.jsx`, `CampusTransfersPage.jsx`)
* **Backend Controller:** `PromotionsController.cs`, `CampusTransfersController.cs`
* **Repository / Methods:** `PromotionRepository.cs`, `CampusTransferRepository.cs`
* **Stored Procedures:** `sp_PromoteStudents`, `sp_TransferStudentCampus`
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped by source/target campus and academic years.
* **Action Required:** None.

---

### Category D: Financial & Fee Management

#### 21. Fee Master, Structures & Types
* **Frontend Screen(s):** `/dashboard/fee-management` (`FeeManagementPage.jsx`)
* **Backend Controller:** `FeeController.cs`
* **Repository / Methods:** `FeeRepository.cs` (`GetFeeStructuresAsync`, `GetFeeTypesAsync`, `CreateFeeStructureAsync`)
* **Stored Procedures:** `sp_GetFeeStructures`, `sp_GetFeeTypes`, `sp_CreateFeeStructure`
* **Current Multi-Tenancy Status:**  **Scoped.** `FeeRepository.cs` resolves `collegeId = ResolveCollegeId()` and passes `p_CollegeId` to procedures.
* **Action Required:** None.

#### 22. Fine Rules Management
* **Frontend Screen(s):** `/dashboard/fine-rules` (`FineRulePage.jsx`)
* **Backend Controller:** `FineRuleController.cs`
* **Repository / Methods:** `FineRuleRepository.cs` (`GetAllAsync`, `CreateAsync`)
* **Stored Procedures:** `sp_FineRule_GetAll`, `sp_FineRule_Create`
* **Current Multi-Tenancy Status:** ❌ **LEAKING.** `sp_FineRule_GetAll` passes `p_CampusId = campusId ?? 0` without `CollegeId`. If campusId is 0, returns all fine rules across all colleges.
* **Action Required:** Pass `p_CollegeId` from token and filter `WHERE CollegeId = p_CollegeId`.

#### 23. Fee Collections & Payment Counter
* **Frontend Screen(s):** `/dashboard/fee-collections`, `/dashboard/due-fees` (`FeeCollectionPage.jsx`, `DueFeesPage.jsx`)
* **Backend Controller:** `FeeController.cs`
* **Repository / Methods:** `FeeRepository.cs` (`CollectStudentFeeAsync`, `GetStudentFeeSummaryAsync`)
* **Stored Procedures:** `sp_CollectStudentFee`, `sp_GetStudentFeeSummary`
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped strictly by student admission and campus bank account.
* **Action Required:** None.

#### 24. Campus Bank Accounts & Payment Gateway
* **Frontend Screen(s):** `/dashboard/settings/payment-gateway` (`PaymentGatewayConfigPage.jsx`)
* **Backend Controller:** `FeePaymentGatewayController.cs`
* **Repository / Methods:** `FeeRepository.cs`
* **Stored Procedures:** `sp_GetCampusBankAccounts`, `sp_SavePaymentGatewayConfig`
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped strictly by `CampusId` belonging to the college.
* **Action Required:** None.

---

### Category E: Academic Operations (Attendance, Timetable & Examinations)

#### 25. Student Attendance (Daily / Period-Wise)
* **Frontend Screen(s):** `/dashboard/mark-attendance`, `/dashboard/attendance-reports` (`AttendancePage.jsx`, `AttendanceReportsPage.jsx`)
* **Backend Controller:** `AttendanceController.cs`
* **Repository / Methods:** `AttendanceRepository.cs` (`GetStudentsForAttendanceAsync`, `SaveAttendanceAsync`)
* **Stored Procedures:** `sp_GetStudentsForAttendance`, `sp_AdminBulkSaveStudentAttendance`
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped strictly by `CampusId`, `BoardId`, `AcademicYearId`, and `SectionId`.
* **Action Required:** None.

#### 26. Staff Attendance & Regularization
* **Frontend Screen(s):** `/dashboard/staff-attendance` (`StaffAttendancePage.jsx`)
* **Backend Controller:** `StaffAttendanceController.cs`
* **Repository / Methods:** `StaffAttendanceRepository.cs`
* **Stored Procedures:** `sp_GetStaffAttendanceByCampus`, `sp_SaveStaffDailyAttendance`
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped strictly by `CampusId`.
* **Action Required:** None.

#### 27. Timetable Management & Substitutions
* **Frontend Screen(s):** `/dashboard/timetable`, `/dashboard/timetable-structure` (`TimetablePage.jsx`, `TimetableStructurePage.jsx`)
* **Backend Controller:** `TimetableController.cs`, `TimetableSubstitutionController.cs`
* **Repository / Methods:** `TimetableRepository.cs`, `TimetableSubstitutionRepository.cs`
* **Stored Procedures:** `sp_GetTimetablesPaged`, `sp_CreateTimetable`, `sp_PublishSectionTimetable`
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped strictly by `CampusId`, `SectionId`, `AcademicYearId`.
* **Action Required:** None.

#### 28. Examination Master & Schedules
* **Frontend Screen(s):** `/dashboard/examinations`, `/dashboard/create-exam` (`ExaminationPage.jsx`, `CreateExaminationPage.jsx`)
* **Backend Controller:** `ExaminationController.cs`
* **Repository / Methods:** `ExaminationRepository.cs` (`GetExaminationsAsync`, `CreateExaminationAsync`)
* **Stored Procedures:** `sp_GetExaminations`, `sp_CreateExamination`, `sp_GetExamSchedules`
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped by `CampusId`, `BoardId`, `AcademicYearId`. `TenantIsolationActionFilter` verifies exam ownership against `CollegeId`.
* **Action Required:** None.

#### 29. Hall Tickets & Invigilation
* **Frontend Screen(s):** `/dashboard/hall-tickets` (`HallTicketPage.jsx`)
* **Backend Controller:** `ExaminationController.cs`
* **Repository / Methods:** `ExaminationRepository.cs` (`GenerateHallTicketsAsync`, `AssignInvigilatorAsync`)
* **Stored Procedures:** `sp_GenerateHallTickets`, `sp_AssignInvigilator`
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped strictly by `ExaminationId` and student campus.
* **Action Required:** None.

#### 30. Marks Entry & Moderation
* **Frontend Screen(s):** `/dashboard/marks-entry` (`MarksEntryPage.jsx`)
* **Backend Controller:** `MarksController.cs`
* **Repository / Methods:** `MarksRepository.cs`
* **Stored Procedures:** `sp_GetStudentsForMarksEntry`, `sp_SaveStudentMarks`
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped strictly by `ExamScheduleId` and `SectionId`.
* **Action Required:** None.

#### 31. Results Processing & Revaluation
* **Frontend Screen(s):** `/dashboard/results`, `/dashboard/revaluation` (`ResultsPage.jsx`, `RevaluationPage.jsx`)
* **Backend Controller:** `ResultsController.cs`
* **Repository / Methods:** `ResultRepository.cs`
* **Stored Procedures:** `sp_GetResultsPaged`, `sp_PublishSectionResults`, `sp_ApplyRevaluation`
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped strictly by `ExaminationId` and `SectionId`.
* **Action Required:** None.

---

### Category F: Auxiliary Services, Documents & Facilities

#### 32. Transport Management
* **Frontend Screen(s):** `/dashboard/transport` (`TransportManagementPage.jsx`)
* **Backend Controller:** `TransportRouteController.cs`, `TransportVehicleController.cs`, `TransportOperationsController.cs`
* **Repository / Methods:** Direct EF Core queries via `TransportService`
* **Stored Procedures:** None (EF Core queries with `CampusId` and `CollegeId`)
* **Current Multi-Tenancy Status:**  **Scoped.** Filter DTOs enforce `CampusId` and `CollegeId`.
* **Action Required:** None.

#### 33. Hostel Management
* **Frontend Screen(s):** `/dashboard/hostel` (`HostelPage.jsx`)
* **Backend Controller:** `HostelController.cs`
* **Repository / Methods:** Direct EF Core queries on `hostel_blocks`, `hostel_beds`
* **Stored Procedures:** None (EF Core queries with `CampusId` and `CollegeId`)
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped strictly by `CampusId`.
* **Action Required:** None.

#### 34. Inventory Management
* **Frontend Screen(s):** `/dashboard/inventory` (`InventoryDashboard.jsx`)
* **Backend Controller:** `InventoryController.cs`
* **Repository / Methods:** `InventoryRepository.cs`
* **Stored Procedures:** EF Core queries on `InventoryItems`, `InventoryCategories`, `InventorySuppliers`
* **Current Multi-Tenancy Status:**  **Scoped.** All inventory tables have direct `CollegeId` column.
* **Action Required:** Verify `InventoryController.cs` extracts `CollegeId` from user claims for all queries.

#### 35. Certificates & Document Templates
* **Frontend Screen(s):** `/dashboard/certificates`, `/dashboard/templates` (`CertificatesPage.jsx`, `TemplatesPage.jsx`)
* **Backend Controller:** `CertificatesController.cs`, `SettingsTemplatesController.cs`
* **Repository / Methods:** `CertificateRepository.cs`, `TemplateRepository.cs`
* **Stored Procedures:** `sp_GetCertificatesPaged`, `sp_GetTemplates`
* **Current Multi-Tenancy Status:**  **Scoped.** Scoped by `CampusId` and `CollegeId`.
* **Action Required:** None.

#### 36. Payroll & Reimbursements
* **Frontend Screen(s):** `/dashboard/payroll`, `/dashboard/reimbursements` (`AdminPayrollPage.jsx`, `AdminReimbursementsPage.jsx`)
* **Backend Controller:** `StaffController.cs` (payroll endpoints)
* **Repository / Methods:** Direct EF Core queries on `payroll_salary_structures`, `reimbursement_claims`
* **Current Multi-Tenancy Status:**  **Scoped.** Tables have both `CampusId` and `CollegeId`.
* **Action Required:** None.

---

## 4. Phase-Wise Implementation Roadmap

We will execute the complete project remediation in structured phases, starting with the **College Admin Portal**, followed by the remaining portals.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PHASE-WISE IMPLEMENTATION ROADMAP                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 1: Admin Portal — Master Data Scoping (Departments, Designations, Boards)       │
│ PHASE 2: Admin Portal — Policy & Financial Scoping (Leave Categories, Fine Rules)      │
│ PHASE 3: Admin Portal — Frontend Empty-State & Board Affiliation Cleanups              │
│ PHASE 4: Principal & Faculty Portals — Tenant Verification                             │
│ PHASE 5: Student & Parent Portals — Tenant Verification                                │
│ PHASE 6: Accountant, Exam Cell, Transport & Hostel Portals — Tenant Verification       │
│ PHASE 7: Comprehensive Multi-College End-to-End Test (College 1 vs College 2)          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Admin Portal — Master Data Scoping (Immediate Priority)
* **Goal:** Completely eliminate the leak of College 1's Departments, Designations, and Boards into any newly created college.
* **Tasks:**
  1. Update `sp_GetDepartments` to accept `IN p_CollegeId INT` and enforce `WHERE (p_CollegeId IS NULL OR d.CollegeId = p_CollegeId)`.
  2. Update `sp_GetDepartmentSummary` to count only rows matching `CollegeId = p_CollegeId`.
  3. Update `sp_GetDesignations` to accept `IN p_CollegeId INT` and enforce `WHERE (p_CollegeId IS NULL OR des.CollegeId = p_CollegeId)`.
  4. Update `sp_GetBoards` to accept `IN p_CollegeId INT` and filter `WHERE (b.CollegeId = p_CollegeId OR b.CollegeId IS NULL)`.
  5. Update `sp_CreateBoard` to save the active admin's `CollegeId`.
  6. In [DepartmentRepository.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Repositories/Implementations/DepartmentRepository.cs), [DesignationRepository.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Repositories/Implementations/DesignationRepository.cs), and [BoardRepository.cs](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Backend/src/CollegeManagement.API/Repositories/Implementations/BoardRepository.cs), pass `p_CollegeId = ResolveCollegeId()`.

### Phase 2: Admin Portal — Policy & Financial Scoping
* **Goal:** Ensure Leave Categories, LOP Policies, and Fine Rules are strictly college-isolated.
* **Tasks:**
  1. Update `sp_GetLeaveCategories` to accept `p_CollegeId INT` and filter `WHERE (p_CollegeId IS NULL OR CollegeId = p_CollegeId)`.
  2. Update `sp_FineRule_GetAll` to accept `p_CollegeId INT` and filter `WHERE (p_CollegeId IS NULL OR CollegeId = p_CollegeId)`.
  3. Update `sp_FeeType_GetAll` to enforce `CollegeId = p_CollegeId`.

### Phase 3: Admin Portal — Frontend Empty-State Handling
* **Goal:** Ensure that when a brand-new college logs in with 0 departments or 0 boards, the frontend displays clear empty-state prompts without freezing or falling back to other colleges.
* **Tasks:**
  1. Verify [AcademicContext.jsx](file:///c:/Users/gumma/Desktop/CMS_%20Inter/Frontend/src/context/AcademicContext.jsx) gracefully prompts the user to add a Board when none is affiliated yet.
  2. Ensure all UI dropdowns (Department, Designation, Board, Academic Year) handle empty lists cleanly.

### Phase 4: Principal & Faculty Portals — Tenant Verification
* **Goal:** Verify that when Principals or Faculty log in under a new college, their timetable, attendance marking, and leave requests strictly reflect their college.
* **Tasks:**
  1. Audit `PrincipalDashboard.jsx` and `FacultyPortalRoutes.jsx`.
  2. Verify faculty subject allocation and student attendance marking endpoints enforce `CollegeId` / `CampusId`.

### Phase 5: Student & Parent Portals — Tenant Verification
* **Goal:** Verify that Students and Parents only see information (fees, results, attendance) from their specific college.
* **Tasks:**
  1. Audit Student/Parent authentication token resolution.
  2. Verify fee payment receipts, exam hall tickets, and results endpoints enforce student ownership.

### Phase 6: Accountant, Exam Cell, Transport & Hostel Portals
* **Goal:** Verify specialized departmental portals for complete multi-tenant hygiene.
* **Tasks:**
  1. Verify Accountant fee collection counter scopes to campus bank accounts for `CollegeId`.
  2. Verify Exam Cell mark capture and result publication rosters.
  3. Verify Transport routes, vehicles, and Hostel blocks.

### Phase 7: Comprehensive Multi-College End-to-End Verification
* **Goal:** Mathematically prove that data cannot leak between colleges.
* **Test Protocol:**
  1. Log into existing college (`Admin@CMS.com`, `CollegeId = 1`). Confirm 100% of data (students, staff, departments, boards, fees) is intact.
  2. Log into new college (`Admin@narayana.com` or newly created college, `CollegeId = 2`).
  3. Confirm every single screen starts completely fresh with 0 cross-college records.
  4. Create a Department, a Board, an Academic Year, and admit a Student in College 2.
  5. Switch back to College 1 and verify that College 1 does NOT see College 2's new records.
