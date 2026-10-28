-- =============================================================================
-- SCRIPT: 10A_ResetStudentDevelopmentData.sql
-- PURPOSE: Phase 8C.4 Complete Development Student Test Data Reset
-- AUTHOR: Antigravity Team
-- DATE: 2026-08-24
-- TARGET DATABASE: u819242402_CLM_System (srv1061.hstgr.io / MariaDB 11.8+)
--
-- STATUS: PREPARED FOR REVIEW ONLY (DO NOT EXECUTE AUTOMATICALLY)
--
-- INSTRUCTIONS FOR MANUAL EXECUTION (MySQL Workbench):
-- 1. Review the script.
-- 2. Open MySQL Workbench, connect to u819242402_CLM_System.
-- 3. Execute the entire script (Ctrl + Shift + Enter).
-- 4. Verify post-reset checks at the end of the script.
-- =============================================================================

USE `u819242402_CLM_System`;
SET SQL_SAFE_UPDATES = 0;

-- =============================================================================
-- STEP 1: SAFETY BACKUP OF STUDENTS & TRANSACTION DATA
-- =============================================================================
SELECT '--- STEP 1: CREATING BACKUP TABLES ---' AS Info;

DROP TABLE IF EXISTS `_Students_Backup_PreReset`;
CREATE TABLE `_Students_Backup_PreReset` AS SELECT * FROM `Students`;

DROP TABLE IF EXISTS `_Attendances_Backup_PreReset`;
CREATE TABLE `_Attendances_Backup_PreReset` AS SELECT * FROM `Attendances`;

DROP TABLE IF EXISTS `_Marks_Backup_PreReset`;
CREATE TABLE `_Marks_Backup_PreReset` AS SELECT * FROM `Marks`;

DROP TABLE IF EXISTS `_Results_Backup_PreReset`;
CREATE TABLE `_Results_Backup_PreReset` AS SELECT * FROM `Results`;

DROP TABLE IF EXISTS `_StudentFees_Backup_PreReset`;
CREATE TABLE `_StudentFees_Backup_PreReset` AS SELECT * FROM `StudentFees`;

DROP TABLE IF EXISTS `_AssignmentSubmissions_Backup_PreReset`;
CREATE TABLE `_AssignmentSubmissions_Backup_PreReset` AS SELECT * FROM `AssignmentSubmissions`;

DROP TABLE IF EXISTS `_PromotionHistories_Backup_PreReset`;
CREATE TABLE `_PromotionHistories_Backup_PreReset` AS SELECT * FROM `PromotionHistories`;

SELECT 
    (SELECT COUNT(*) FROM `_Students_Backup_PreReset`) AS BackedUpStudents,
    (SELECT COUNT(*) FROM `_Attendances_Backup_PreReset`) AS BackedUpAttendances,
    (SELECT COUNT(*) FROM `_Marks_Backup_PreReset`) AS BackedUpMarks,
    (SELECT COUNT(*) FROM `_Results_Backup_PreReset`) AS BackedUpResults,
    (SELECT COUNT(*) FROM `_StudentFees_Backup_PreReset`) AS BackedUpFees;

-- =============================================================================
-- STEP 2: CLEAR DOWNSTREAM MOCK TRANSACTION DATA IN TOPOLOGICAL ORDER
-- =============================================================================
SELECT '--- STEP 2: CLEARING DOWNSTREAM MOCK TEST DATA ---' AS Info;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE `Revaluations`;
TRUNCATE TABLE `Results`;
TRUNCATE TABLE `Marks`;
TRUNCATE TABLE `Attendances`;
TRUNCATE TABLE `AssignmentSubmissions`;
TRUNCATE TABLE `StudentFees`;
TRUNCATE TABLE `PromotionHistories`;
TRUNCATE TABLE `certificates`;

-- =============================================================================
-- STEP 3: RESET STUDENTS TABLE & AUTO_INCREMENT
-- =============================================================================
SELECT '--- STEP 3: RESETTING STUDENTS TABLE ---' AS Info;

TRUNCATE TABLE `Students`;
ALTER TABLE `Students` AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- STEP 4: VERIFY POST-RESET COUNTS (ALL MUST BE 0)
-- =============================================================================
SELECT '--- STEP 4: POST-RESET VERIFICATION ---' AS Info;

SELECT 
    (SELECT COUNT(*) FROM `Students`) AS Students_Count,
    (SELECT COUNT(*) FROM `Attendances`) AS Attendances_Count,
    (SELECT COUNT(*) FROM `Marks`) AS Marks_Count,
    (SELECT COUNT(*) FROM `Results`) AS Results_Count,
    (SELECT COUNT(*) FROM `Revaluations`) AS Revaluations_Count,
    (SELECT COUNT(*) FROM `StudentFees`) AS StudentFees_Count,
    (SELECT COUNT(*) FROM `AssignmentSubmissions`) AS AssignmentSubmissions_Count,
    (SELECT COUNT(*) FROM `PromotionHistories`) AS PromotionHistories_Count,
    (SELECT COUNT(*) FROM `certificates`) AS Certificates_Count;

SELECT 'DEVELOPMENT STUDENT DATA RESET COMPLETED SUCCESSFULLY' AS Status;
