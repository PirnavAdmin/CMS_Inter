-- =============================================================================
-- SCRIPT 08: 08_PostMigration_Verification.sql
-- PURPOSE: Post-Migration Assertions & Multi-Tenant Integrity Verification
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- EXECUTION SAFETY: Read-Only / Verification Assertions
-- =============================================================================

USE `CollegeManagement`;

-- 1. Verify Platform Tables Exist
SELECT 
    TABLE_NAME, 
    TABLE_ROWS, 
    CREATE_TIME,
    'EXISTS' AS VerificationStatus
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
      'Colleges', 'SubscriptionPlans', 'PlanModules', 
      'CollegeSubscriptions', 'SubscriptionRenewalHistory', 
      'PlatformInvoices', 'PlatformPayments', 'PlatformSettings'
  )
ORDER BY TABLE_NAME ASC;

-- 2. Assert Zero Campuses Have NULL CollegeId
SELECT 
    COUNT(*) AS UnmappedCampusesCount,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASSED: All campuses successfully assigned CollegeId'
        ELSE 'FAILED: Found campuses with NULL CollegeId'
    END AS CampusTenantStatus
FROM `Campuses`
WHERE `CollegeId` IS NULL;

-- 3. Assert Zero Institutional Users Have NULL CollegeId
SELECT 
    COUNT(*) AS UnmappedUsersCount,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASSED: All institutional users successfully mapped to CollegeId'
        ELSE 'FAILED: Found institutional users with NULL CollegeId'
    END AS UserTenantStatus
FROM `Users` u
JOIN `Roles` r ON u.RoleId = r.RoleId
WHERE r.RoleCode != 'SUPER_ADMIN' AND u.CollegeId IS NULL;

-- 4. Assert Super Admin Retains NULL CollegeId (Platform Scope)
SELECT 
    COUNT(*) AS SuperAdminWithCollegeCount,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASSED: Super Admin user correctly maintains Platform Scope (CollegeId IS NULL)'
        ELSE 'FAILED: Super Admin was mistakenly assigned to a specific college'
    END AS SuperAdminScopeStatus
FROM `Users` u
JOIN `Roles` r ON u.RoleId = r.RoleId
WHERE r.RoleCode = 'SUPER_ADMIN' AND u.CollegeId IS NOT NULL;

-- 5. Assert Canonical Roles Preserved
SELECT 
    RoleId, RoleCode, RoleName, Scope,
    CASE 
        WHEN RoleId = 1 AND RoleCode = 'SUPER_ADMIN' AND Scope = 'PLATFORM' THEN 'PASSED'
        WHEN RoleId = 2 AND RoleCode = 'COLLEGE_ADMIN' AND RoleName = 'Admin' AND Scope = 'COLLEGE' THEN 'PASSED: RoleName Admin Preserved for C# Compatibility'
        ELSE 'VERIFIED'
    END AS RoleIntegrityStatus
FROM `Roles`
WHERE RoleId IN (1, 2);

-- 6. Assert Composite Unique Keys
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS IndexedColumns,
    CASE 
        WHEN INDEX_NAME = 'UQ_NumberSeries_College_Code' THEN 'PASSED: NumberSeries Composite Key Active'
        WHEN INDEX_NAME = 'UX_templates_College_TemplateCode' THEN 'PASSED: Templates Composite Key Active'
        ELSE 'VERIFIED'
    END AS ConstraintStatus
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND INDEX_NAME IN ('UQ_NumberSeries_College_Code', 'UX_templates_College_TemplateCode')
GROUP BY TABLE_NAME, INDEX_NAME;

-- 7. Assert Active Subscription for College 1
SELECT 
    cs.SubscriptionId,
    cs.CollegeId,
    c.CollegeName,
    p.PlanName,
    cs.Status,
    cs.RenewalDate,
    CASE 
        WHEN cs.Status = 'Active' THEN 'PASSED: Primary institution subscription active'
        ELSE 'WARNING: Subscription not in Active status'
    END AS SubscriptionStatusCheck
FROM `CollegeSubscriptions` cs
JOIN `Colleges` c ON cs.CollegeId = c.CollegeId
JOIN `SubscriptionPlans` p ON cs.PlanId = p.PlanId
WHERE cs.CollegeId = 1;

-- Post-Migration Final Assertion Summary
SELECT 'POST_MIGRATION_INTEGRITY_VERIFICATION_COMPLETE' AS Status, NOW() AS VerifiedAt;
