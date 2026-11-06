-- =============================================================================
-- SCRIPT 00: 00_PreMigrationCheck.sql
-- PURPOSE: Pre-Migration Assertions & Environment Validation for Super Admin Module
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- EXECUTION SAFETY: Read-Only / Zero Side Effects
-- =============================================================================

USE `CollegeManagement`;

-- 1. Check Database Collation & Engine Compatibility
SELECT 
    @@character_set_database AS DatabaseCharset,
    @@collation_database AS DatabaseCollation,
    @@default_storage_engine AS DefaultStorageEngine;

-- 2. Assert Zero Orphaned Student Campus References
SELECT 
    COUNT(*) AS OrphanedStudentsCount,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASSED'
        ELSE 'FAILED: Found orphaned students with non-existent CampusId'
    END AS StudentCampusStatus
FROM `Students` s
LEFT JOIN `Campuses` c ON s.CampusId = c.CampusId
WHERE s.CampusId IS NOT NULL AND c.CampusId IS NULL;

-- 3. Assert Zero Orphaned Staff Campus Assignments
SELECT 
    COUNT(*) AS OrphanedStaffCount,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASSED'
        ELSE 'FAILED: Found orphaned staff with non-existent CampusId'
    END AS StaffCampusStatus
FROM `Staff` st
LEFT JOIN `Campuses` c ON st.CampusId = c.CampusId
WHERE st.CampusId IS NOT NULL AND c.CampusId IS NULL;

-- 4. Assert Zero Orphaned Student Admissions Campus References
SELECT 
    COUNT(*) AS OrphanedAdmissionsCount,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASSED'
        ELSE 'FAILED: Found orphaned admissions with non-existent CampusId'
    END AS AdmissionCampusStatus
FROM `StudentAdmissions` sa
LEFT JOIN `Campuses` c ON sa.CampusId = c.CampusId
WHERE sa.CampusId IS NOT NULL AND c.CampusId IS NULL;

-- 5. Assert Zero Duplicate Template Codes in Existing Data
-- Pre-requisite for adding composite UNIQUE KEY (CollegeId, TemplateCode)
SELECT 
    COUNT(*) - COUNT(DISTINCT `TemplateCode`) AS DuplicateTemplateCodesCount,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT `TemplateCode`) THEN 'PASSED'
        ELSE 'FAILED: Existing duplicate TemplateCodes found in templates table'
    END AS TemplateCodeUniquenessStatus
FROM `templates`;

-- 6. Assert Zero Duplicate Series Codes in NumberSeriesConfigurations
-- Pre-requisite for adding composite UNIQUE KEY (CollegeId, SeriesCode)
SELECT 
    COUNT(*) - COUNT(DISTINCT `SeriesCode`) AS DuplicateSeriesCodesCount,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT `SeriesCode`) THEN 'PASSED'
        ELSE 'FAILED: Existing duplicate SeriesCodes found in NumberSeriesConfigurations'
    END AS SeriesCodeUniquenessStatus
FROM `NumberSeriesConfigurations`;

-- 7. Assert Primary Campus Exists
SELECT 
    COUNT(*) AS ExistingCampusesCount,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASSED'
        ELSE 'FAILED: At least one campus must exist before multi-tenant migration'
    END AS PrimaryCampusStatus
FROM `Campuses`;

-- 8. Assert Canonical Roles Exist
SELECT 
    COUNT(CASE WHEN `RoleName` = 'Super Admin' THEN 1 END) AS SuperAdminRoleExists,
    COUNT(CASE WHEN `RoleName` = 'Admin' THEN 1 END) AS AdminRoleExists,
    CASE 
        WHEN COUNT(CASE WHEN `RoleName` = 'Super Admin' THEN 1 END) > 0 
         AND COUNT(CASE WHEN `RoleName` = 'Admin' THEN 1 END) > 0 THEN 'PASSED'
        ELSE 'FAILED: Canonical Super Admin or Admin role missing in Roles table'
    END AS CanonicalRoleStatus
FROM `Roles`;

-- Summary Pre-Migration Assertion Verification
SELECT 'PRE_MIGRATION_VALIDATION_COMPLETED' AS Status, NOW() AS ValidatedAt;
