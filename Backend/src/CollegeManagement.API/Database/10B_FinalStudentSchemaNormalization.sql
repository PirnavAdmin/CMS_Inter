-- =============================================================================
-- SCRIPT: 10B_FinalStudentSchemaNormalization.sql
-- PURPOSE: Phase 8D.3 Final Compatible Student Schema Normalization & Index Optimization
-- AUTHOR: Antigravity Team
-- DATE: 2026-08-24
-- TARGET DATABASE: u819242402_CLM_System (srv1061.hstgr.io / MariaDB 11.8+)
--
-- STATUS: PREPARED FOR REVIEW ONLY (DO NOT EXECUTE AUTOMATICALLY)
--
-- ARCHITECTURAL NOTE:
-- Legacy text columns (`Board`, `AcademicLevel`, `Section`) are INTENTIONALLY RETAINED
-- in `Students` for cross-module backward compatibility with:
--   - Admissions: sp_CreateStudent, sp_AllocateStudentSection
--   - Promotions: sp_PromoteStudents, sp_RollbackPromotions, PromotionRepository.cs
--   - Certificates: sp_GenerateStudyCertificate, sp_GenerateBonafideCertificate, sp_GenerateTCCertificate
-- Student Management operates 100% on normalized integer IDs (BoardId, AcademicYearId,
-- AcademicLevelId, GroupId, SectionId).
--
-- INSTRUCTIONS FOR MANUAL EXECUTION (MySQL Workbench):
-- 1. Open MySQL Workbench and connect to u819242402_CLM_System.
-- 2. Open this script (File -> Open SQL Script).
-- 3. Execute the entire script (Ctrl + Shift + Enter).
-- 4. Verify post-deployment index checks at the end of the script.
-- =============================================================================

USE `u819242402_CLM_System`;
SET SQL_SAFE_UPDATES = 0;

-- =============================================================================
-- STEP 1: PRE-FLIGHT DIAGNOSTICS & SAFETY CHECKS
-- =============================================================================
SELECT '--- STEP 1: PRE-FLIGHT CHECK (VERIFYING EMPTY STUDENTS TABLE) ---' AS Info;

SELECT COUNT(*) AS CurrentStudentCount FROM `Students`;

-- =============================================================================
-- STEP 2: CREATE BUSINESS UNIQUE INDEXES & COMPOSITE QUERY INDEXES
-- =============================================================================
SELECT '--- STEP 2: CREATING BUSINESS UNIQUE & COMPOSITE QUERY INDEXES ---' AS Info;

-- 2.1 Unique Business Key Indexes
CREATE UNIQUE INDEX IF NOT EXISTS `IX_Students_AdmissionNo` ON `Students` (`AdmissionNo`);
CREATE UNIQUE INDEX IF NOT EXISTS `IX_Students_RollNo` ON `Students` (`RollNo`);
CREATE UNIQUE INDEX IF NOT EXISTS `IX_Students_Email` ON `Students` (`Email`);

-- 2.2 Composite Query Indexes (Optimized for sp_GetAllStudents & sp_SearchStudents)
CREATE INDEX IF NOT EXISTS `IX_Students_Board_Year_Level` ON `Students` (`BoardId`, `AcademicYearId`, `AcademicLevelId`);
CREATE INDEX IF NOT EXISTS `IX_Students_Group_Section` ON `Students` (`GroupId`, `SectionId`);
CREATE INDEX IF NOT EXISTS `IX_Students_AcademicFilter` ON `Students` (`BoardId`, `AcademicYearId`, `AcademicLevelId`, `GroupId`, `SectionId`, `IsActive`);

-- =============================================================================
-- STEP 3: POST-DEPLOYMENT INDEX & SCHEMA VERIFICATION
-- =============================================================================
SELECT '--- STEP 3: POST-DEPLOYMENT INDEX & SCHEMA VERIFICATION ---' AS Info;

-- 1. Verify retained legacy columns still exist for cross-module compatibility
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'Students'
  AND COLUMN_NAME IN ('Board', 'AcademicLevel', 'Section');

-- 2. Verify all active indexes on Students
SHOW INDEX FROM `Students`;

-- 3. Verify Students row count remains 0
SELECT COUNT(*) AS FinalStudentCount FROM `Students`;

SELECT '10B_FinalStudentSchemaNormalization.sql COMPLETED AND VERIFIED' AS Status;
