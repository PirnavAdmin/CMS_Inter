-- =============================================================================
-- SCRIPT: 10A_ResetStudentsOnly.sql
-- PURPOSE: Phase 8C.4 Development Student Table Reset (Students Only)
-- AUTHOR: Antigravity Team
-- DATE: 2026-08-24
-- TARGET DATABASE: u819242402_CLM_System (srv1061.hstgr.io / MariaDB 11.8+)
--
-- STATUS: PREPARED FOR REVIEW ONLY (DO NOT EXECUTE AUTOMATICALLY)
--
-- INSTRUCTIONS FOR MANUAL EXECUTION (MySQL Workbench):
-- 1. Open MySQL Workbench, connect to u819242402_CLM_System.
-- 2. Execute this script (Ctrl + Shift + Enter).
-- 3. Verify that StudentCount = 0 and AUTO_INCREMENT = 1.
-- =============================================================================

USE `u819242402_CLM_System`;
SET SQL_SAFE_UPDATES = 0;

-- =============================================================================
-- STEP 1: SAFETY BACKUP OF CURRENT STUDENTS TABLE
-- =============================================================================
SELECT '--- STEP 1: CREATING SAFETY BACKUP TABLE `_Students_Backup_Phase8` ---' AS Info;

DROP TABLE IF EXISTS `_Students_Backup_Phase8`;
CREATE TABLE `_Students_Backup_Phase8` AS SELECT * FROM `Students`;

SELECT COUNT(*) AS BackedUpStudentRows FROM `_Students_Backup_Phase8`;

-- =============================================================================
-- STEP 2: TRUNCATE STUDENTS TABLE & RESET AUTO_INCREMENT ONLY
-- =============================================================================
SELECT '--- STEP 2: RESETTING `Students` TABLE ONLY ---' AS Info;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `Students`;

ALTER TABLE `Students` AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- STEP 3: POST-RESET VERIFICATION
-- =============================================================================
SELECT '--- STEP 3: VERIFYING POST-RESET STATUS ---' AS Info;

-- 1. Verify Students count is 0
SELECT COUNT(*) AS StudentCount
FROM `Students`;

-- 2. Verify AUTO_INCREMENT is reset to 1
SELECT 
    TABLE_NAME,
    AUTO_INCREMENT,
    TABLE_ROWS
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'Students';

SELECT 'STUDENTS TABLE RESET SCRIPT COMPLETED AND VERIFIED' AS Status;
