-- =============================================================================
-- SCRIPT: 10C_RemoveRedundantStudentIndexes.sql
-- PURPOSE: Phase 8D.4 Remove Duplicate Unique Indexes on Students Table
-- AUTHOR: Antigravity Team
-- DATE: 2026-08-24
-- TARGET DATABASE: u819242402_CLM_System (srv1061.hstgr.io / MariaDB 11.8+)
--
-- STATUS: PREPARED FOR REVIEW ONLY (DO NOT EXECUTE AUTOMATICALLY)
--
-- RATIONALE:
-- `UK_Students_AdmissionNo`, `UK_Students_RollNo`, and `UK_Students_Email` already
-- enforce business key uniqueness. The duplicate `IX_Students_AdmissionNo`,
-- `IX_Students_RollNo`, and `IX_Students_Email` indexes are redundant and should be
-- dropped to optimize write throughput and eliminate index bloat.
--
-- INSTRUCTIONS FOR MANUAL EXECUTION (MySQL Workbench):
-- 1. Open MySQL Workbench and connect to u819242402_CLM_System.
-- 2. Open this script (File -> Open SQL Script).
-- 3. Execute the entire script (Ctrl + Shift + Enter).
-- 4. Verify post-cleanup index checks at the end of the script.
-- =============================================================================

USE `u819242402_CLM_System`;
SET SQL_SAFE_UPDATES = 0;

-- =============================================================================
-- STEP 1: PRE-FLIGHT CHECK
-- =============================================================================
SELECT '--- STEP 1: PRE-FLIGHT CHECK ---' AS Info;

SELECT COUNT(*) AS CurrentStudentCount FROM `Students`;

-- =============================================================================
-- STEP 2: DROP REDUNDANT DUPLICATE UNIQUE INDEXES ONLY
-- =============================================================================
SELECT '--- STEP 2: DROPPING REDUNDANT DUPLICATE UNIQUE INDEXES ---' AS Info;

DROP INDEX IF EXISTS `IX_Students_AdmissionNo` ON `Students`;
DROP INDEX IF EXISTS `IX_Students_RollNo` ON `Students`;
DROP INDEX IF EXISTS `IX_Students_Email` ON `Students`;

-- =============================================================================
-- STEP 3: POST-DEPLOYMENT INDEX VERIFICATION
-- =============================================================================
SELECT '--- STEP 3: POST-CLEANUP INDEX VERIFICATION ---' AS Info;

-- 1. Verify all remaining active indexes on Students
SHOW INDEX FROM `Students`;

-- 2. Verify that dropped indexes no longer exist
SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'Students'
  AND INDEX_NAME IN ('IX_Students_AdmissionNo', 'IX_Students_RollNo', 'IX_Students_Email');

-- 3. Confirm that primary unique constraints are intact
SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'Students'
  AND INDEX_NAME IN ('PRIMARY', 'UK_Students_AdmissionNo', 'UK_Students_RollNo', 'UK_Students_Email');

SELECT '10C_RemoveRedundantStudentIndexes.sql COMPLETED AND VERIFIED' AS Status;
