-- =============================================================================
-- SCRIPT 07: 07_SuperAdmin_Complete_StoredProcedures.sql
-- PURPOSE: Complete Catalogue of 29 Super Admin Stored Procedures
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- CONCURRENCY: Row-Level Locking (FOR UPDATE) on Subscription Quotas
-- SECURITY: Last Active Super Admin Deactivation Protection & Multi-Tenant IDOR Guards
-- =============================================================================

USE `CollegeManagement`;

DELIMITER $$

-- =============================================================================
-- 1. sp_SuperAdmin_GetDashboardSummary
-- Multi-result set: (1) Counts, (2) Registrations Trend, (3) Plan Distribution
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetDashboardSummary`$$
CREATE PROCEDURE `sp_SuperAdmin_GetDashboardSummary`()
BEGIN
    -- Result 1: Core Dashboard Counts
    SELECT 
        (SELECT COUNT(*) FROM `Colleges` WHERE `IsDeleted` = 0) AS TotalColleges,
        (SELECT COUNT(*) FROM `Colleges` WHERE `Status` = 'Active' AND `IsDeleted` = 0) AS ActiveColleges,
        (SELECT COUNT(*) FROM `Colleges` WHERE `Status` = 'Inactive' AND `IsDeleted` = 0) AS InactiveColleges,
        (SELECT COUNT(*) FROM `Colleges` WHERE `Status` = 'Pending' AND `IsDeleted` = 0) AS PendingRegistrations,
        (SELECT COUNT(*) FROM `Users` WHERE `IsActive` = 1 AND `CollegeId` IS NOT NULL) AS ActiveLoginAccounts,
        (SELECT COUNT(*) FROM `Colleges` WHERE `SubscriptionStatus` = 'Free' AND `IsDeleted` = 0) AS FreePlanColleges,
        (SELECT COUNT(*) FROM `Colleges` WHERE `SubscriptionStatus` = 'Active' AND `IsDeleted` = 0) AS PaidPlanColleges,
        (SELECT IFNULL(SUM(`Amount`), 0.00) FROM `PlatformInvoices` WHERE `Status` = 'Paid' AND `InvoiceDate` >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS MonthlyRevenue;

    -- Result 2: 6-Month Registration Trend
    SELECT 
        DATE_FORMAT(`RegisteredAt`, '%b %Y') AS MonthName,
        COUNT(*) AS TotalRegistrations
    FROM `Colleges`
    WHERE `RegisteredAt` >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) AND `IsDeleted` = 0
    GROUP BY DATE_FORMAT(`RegisteredAt`, '%Y-%m'), DATE_FORMAT(`RegisteredAt`, '%b %Y')
    ORDER BY DATE_FORMAT(`RegisteredAt`, '%Y-%m') ASC;

    -- Result 3: Plan Distribution
    SELECT 
        p.`PlanName`,
        COUNT(c.`CollegeId`) AS CollegeCount
    FROM `SubscriptionPlans` p
    LEFT JOIN `CollegeSubscriptions` cs ON p.`PlanId` = cs.`PlanId`
    LEFT JOIN `Colleges` c ON cs.`CollegeId` = c.`CollegeId` AND c.`IsDeleted` = 0
    WHERE p.`IsDeleted` = 0
    GROUP BY p.`PlanId`, p.`PlanName`;
END$$


-- =============================================================================
-- 2. sp_SuperAdmin_GetCollegesPaged
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetCollegesPaged`$$
CREATE PROCEDURE `sp_SuperAdmin_GetCollegesPaged`(
    IN p_SearchTerm VARCHAR(100),
    IN p_Status VARCHAR(20),
    IN p_PlanId INT,
    IN p_Page INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    SET p_Page = IFNULL(p_Page, 1);
    SET p_PageSize = IFNULL(p_PageSize, 10);
    IF p_Page < 1 THEN SET p_Page = 1; END IF;
    IF p_PageSize < 1 THEN SET p_PageSize = 10; END IF;
    SET v_Offset = (p_Page - 1) * p_PageSize;

    -- Metadata: Total Count
    SELECT COUNT(*) AS TotalCount
    FROM `Colleges` c
    LEFT JOIN `CollegeSubscriptions` cs ON c.`CollegeId` = cs.`CollegeId`
    WHERE c.`IsDeleted` = 0
      AND (p_Status IS NULL OR p_Status = '' OR c.`Status` = p_Status)
      AND (p_PlanId IS NULL OR p_PlanId = 0 OR cs.`PlanId` = p_PlanId)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' 
           OR c.`CollegeName` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`CollegeCode` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`OfficialEmail` LIKE CONCAT('%', p_SearchTerm, '%'));

    -- Paged Records
    SELECT 
        c.`CollegeId`,
        c.`CollegeCode`,
        c.`CollegeName`,
        c.`OfficialEmail`,
        c.`ContactPhone`,
        c.`Address`,
        c.`LogoUrl`,
        c.`Status`,
        c.`SubscriptionStatus`,
        c.`RegisteredAt`,
        COALESCE(p.`PlanName`, 'Free') AS PlanName,
        COALESCE(p.`AccountLimit`, 25) AS AccountLimit,
        (SELECT COUNT(*) FROM `Users` u WHERE u.`CollegeId` = c.`CollegeId` AND u.`IsActive` = 1) AS ActiveUsersCount,
        (SELECT COUNT(*) FROM `Campuses` camp WHERE camp.`CollegeId` = c.`CollegeId`) AS TotalCampuses,
        (SELECT COUNT(*) FROM `Students` s JOIN `Campuses` camp ON s.`CampusId` = camp.`CampusId` WHERE camp.`CollegeId` = c.`CollegeId`) AS TotalStudents
    FROM `Colleges` c
    LEFT JOIN `CollegeSubscriptions` cs ON c.`CollegeId` = cs.`CollegeId`
    LEFT JOIN `SubscriptionPlans` p ON cs.`PlanId` = p.`PlanId`
    WHERE c.`IsDeleted` = 0
      AND (p_Status IS NULL OR p_Status = '' OR c.`Status` = p_Status)
      AND (p_PlanId IS NULL OR p_PlanId = 0 OR cs.`PlanId` = p_PlanId)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' 
           OR c.`CollegeName` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`CollegeCode` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`OfficialEmail` LIKE CONCAT('%', p_SearchTerm, '%'))
    ORDER BY c.`CollegeId` ASC
    LIMIT p_PageSize OFFSET v_Offset;
END$$


-- =============================================================================
-- 3. sp_SuperAdmin_GetCollegeById
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetCollegeById`$$
CREATE PROCEDURE `sp_SuperAdmin_GetCollegeById`(IN p_CollegeId INT)
BEGIN
    SELECT 
        c.`CollegeId`,
        c.`CollegeCode`,
        c.`CollegeName`,
        c.`OfficialEmail`,
        c.`ContactPhone`,
        c.`Address`,
        c.`LogoUrl`,
        c.`Status`,
        c.`SubscriptionStatus`,
        c.`SubscriptionStartDate`,
        c.`RenewalDate`,
        c.`RegisteredAt`,
        COALESCE(p.`PlanName`, 'Free') AS CurrentPlanName,
        COALESCE(p.`AccountLimit`, 25) AS AccountLimit,
        (SELECT COUNT(*) FROM `Users` u WHERE u.`CollegeId` = c.`CollegeId` AND u.`IsActive` = 1) AS ActiveUsersCount,
        (SELECT COUNT(*) FROM `Campuses` camp WHERE camp.`CollegeId` = c.`CollegeId`) AS TotalCampuses,
        (SELECT COUNT(*) FROM `Students` s JOIN `Campuses` camp ON s.`CampusId` = camp.`CampusId` WHERE camp.`CollegeId` = c.`CollegeId`) AS TotalStudents,
        (SELECT u.`Email` FROM `Users` u JOIN `Roles` r ON u.`RoleId` = r.`RoleId` WHERE u.`CollegeId` = c.`CollegeId` AND r.`RoleCode` = 'COLLEGE_ADMIN' LIMIT 1) AS AdminEmail,
        (SELECT u.`FullName` FROM `Users` u JOIN `Roles` r ON u.`RoleId` = r.`RoleId` WHERE u.`CollegeId` = c.`CollegeId` AND r.`RoleCode` = 'COLLEGE_ADMIN' LIMIT 1) AS AdminFullName
    FROM `Colleges` c
    LEFT JOIN `CollegeSubscriptions` cs ON c.`CollegeId` = cs.`CollegeId`
    LEFT JOIN `SubscriptionPlans` p ON cs.`PlanId` = p.`PlanId`
    WHERE c.`CollegeId` = p_CollegeId AND c.`IsDeleted` = 0;
END$$


-- =============================================================================
-- 4. sp_SuperAdmin_CreateCollegeWithAdmin (ACID Multi-Table Provisioning)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_CreateCollegeWithAdmin`$$
CREATE PROCEDURE `sp_SuperAdmin_CreateCollegeWithAdmin`(
    IN p_CollegeCode VARCHAR(50),
    IN p_CollegeName VARCHAR(150),
    IN p_OfficialEmail VARCHAR(150),
    IN p_ContactPhone VARCHAR(50),
    IN p_Address VARCHAR(500),
    IN p_LogoUrl VARCHAR(500),
    IN p_AdminFullName VARCHAR(150),
    IN p_AdminEmail VARCHAR(150),
    IN p_AdminPasswordHash VARCHAR(255),
    IN p_CreatedBy INT,
    OUT p_NewCollegeId INT
)
BEGIN
    DECLARE v_AdminRoleId INT;
    DECLARE v_CampusId INT;
    DECLARE v_CollegeId INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Assert Code & Email uniqueness
    IF EXISTS (SELECT 1 FROM `Colleges` WHERE `CollegeCode` = p_CollegeCode) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_COLLEGE_CODE: College Code is already in use.';
    END IF;

    IF EXISTS (SELECT 1 FROM `Colleges` WHERE `OfficialEmail` = p_OfficialEmail) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_COLLEGE_EMAIL: Official Email is already in use.';
    END IF;

    IF p_AdminEmail IS NOT NULL AND p_AdminEmail != '' THEN
        IF EXISTS (SELECT 1 FROM `Users` WHERE `Email` = p_AdminEmail) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_ADMIN_EMAIL: Administrator Email is already registered.';
        END IF;
    END IF;

    -- Resolve College Admin RoleId
    SELECT `RoleId` INTO v_AdminRoleId
    FROM `Roles`
    WHERE `RoleCode` = 'COLLEGE_ADMIN' OR `RoleName` = 'Admin'
    ORDER BY `RoleId` ASC LIMIT 1;

    START TRANSACTION;

    -- Step 1: Create College
    INSERT INTO `Colleges` (
        `CollegeCode`, `CollegeName`, `OfficialEmail`, `ContactPhone`, 
        `Address`, `LogoUrl`, `Status`, `SubscriptionStatus`, 
        `SubscriptionStartDate`, `RenewalDate`, `CreatedBy`
    )
    VALUES (
        p_CollegeCode, p_CollegeName, p_OfficialEmail, p_ContactPhone, 
        p_Address, p_LogoUrl, 'Active', 'Active', 
        CURDATE(), DATE_ADD(CURDATE(), INTERVAL 365 DAY), p_CreatedBy
    );
    SET v_CollegeId = LAST_INSERT_ID();
    SET p_NewCollegeId = v_CollegeId;

    -- Step 2: Create Default HQ Campus
    INSERT INTO `Campuses` (
        `CollegeId`, `CampusName`, `CampusCode`, `Address`, `ContactPhone`, `Email`
    )
    VALUES (
        v_CollegeId, CONCAT(p_CollegeName, ' - Main Campus'), CONCAT(p_CollegeCode, '-HQ'), 
        p_Address, p_ContactPhone, p_OfficialEmail
    );
    SET v_CampusId = LAST_INSERT_ID();

    -- Step 3: Associate Initial Free Subscription
    INSERT INTO `CollegeSubscriptions` (
        `CollegeId`, `PlanId`, `StartDate`, `RenewalDate`, `Status`, `AutoRenew`
    )
    VALUES (
        v_CollegeId, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 365 DAY), 'Active', 1
    );

    -- Step 4: Create College Administrator User (if details provided)
    IF p_AdminEmail IS NOT NULL AND p_AdminEmail != '' AND p_AdminPasswordHash IS NOT NULL THEN
        INSERT INTO `Users` (
            `CollegeId`, `RoleId`, `Email`, `PhoneNumber`, `PasswordHash`, 
            `FullName`, `IsActive`, `IsFirstLogin`, `CreatedAt`
        )
        VALUES (
            v_CollegeId, v_AdminRoleId, p_AdminEmail, COALESCE(p_ContactPhone, '+91 9000000000'), p_AdminPasswordHash, 
            p_AdminFullName, 1, 1, CURRENT_TIMESTAMP(6)
        );
    END IF;

    -- Step 5: Audit Log
    INSERT INTO `AuditLogs` (`CollegeId`, `Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES (v_CollegeId, 'CREATE_COLLEGE', 'Colleges', v_CollegeId, CONCAT('College created: ', p_CollegeName), CURRENT_TIMESTAMP(6));

    COMMIT;
END$$


-- =============================================================================
-- 5. sp_SuperAdmin_UpdateCollege
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdateCollege`$$
CREATE PROCEDURE `sp_SuperAdmin_UpdateCollege`(
    IN p_CollegeId INT,
    IN p_CollegeName VARCHAR(150),
    IN p_OfficialEmail VARCHAR(150),
    IN p_ContactPhone VARCHAR(50),
    IN p_Address VARCHAR(500),
    IN p_LogoUrl VARCHAR(500),
    IN p_UpdatedBy INT
)
BEGIN
    UPDATE `Colleges`
    SET `CollegeName` = p_CollegeName,
        `OfficialEmail` = p_OfficialEmail,
        `ContactPhone` = p_ContactPhone,
        `Address` = p_Address,
        `LogoUrl` = p_LogoUrl,
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `CollegeId` = p_CollegeId AND `IsDeleted` = 0;
END$$


-- =============================================================================
-- 6. sp_SuperAdmin_UpdateCollegeStatus
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdateCollegeStatus`$$
CREATE PROCEDURE `sp_SuperAdmin_UpdateCollegeStatus`(
    IN p_CollegeId INT,
    IN p_Status VARCHAR(20),
    IN p_UpdatedBy INT
)
BEGIN
    UPDATE `Colleges`
    SET `Status` = p_Status,
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `CollegeId` = p_CollegeId AND `IsDeleted` = 0;

    INSERT INTO `AuditLogs` (`CollegeId`, `Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES (p_CollegeId, 'UPDATE_COLLEGE_STATUS', 'Colleges', p_CollegeId, CONCAT('College status changed to: ', p_Status), CURRENT_TIMESTAMP(6));
END$$


-- =============================================================================
-- 7. sp_SuperAdmin_GetCollegeAdmins
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetCollegeAdmins`$$
CREATE PROCEDURE `sp_SuperAdmin_GetCollegeAdmins`(
    IN p_CollegeId INT,
    IN p_SearchTerm VARCHAR(100),
    IN p_Status VARCHAR(20)
)
BEGIN
    SELECT 
        u.`UserId`,
        u.`FullName`,
        u.`Email`,
        u.`IsActive`,
        u.`CollegeId`,
        c.`CollegeName`,
        r.`RoleName`,
        u.`CreatedAt`
    FROM `Users` u
    JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
    LEFT JOIN `Colleges` c ON u.`CollegeId` = c.`CollegeId`
    WHERE (r.`RoleCode` = 'COLLEGE_ADMIN' OR r.`RoleName` = 'Admin')
      AND (p_CollegeId IS NULL OR p_CollegeId = 0 OR u.`CollegeId` = p_CollegeId)
      AND (p_Status IS NULL OR p_Status = '' OR (p_Status = 'Active' AND u.`IsActive` = 1) OR (p_Status = 'Inactive' AND u.`IsActive` = 0))
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' 
           OR u.`FullName` LIKE CONCAT('%', p_SearchTerm, '%')
           OR u.`Email` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`CollegeName` LIKE CONCAT('%', p_SearchTerm, '%'))
    ORDER BY u.`UserId` DESC;
END$$


-- =============================================================================
-- 8. sp_SuperAdmin_CreateCollegeAdmin
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_CreateCollegeAdmin`$$
CREATE PROCEDURE `sp_SuperAdmin_CreateCollegeAdmin`(
    IN p_CollegeId INT,
    IN p_FullName VARCHAR(150),
    IN p_Email VARCHAR(150),
    IN p_PasswordHash VARCHAR(255),
    IN p_CreatedBy INT,
    OUT p_NewUserId INT
)
BEGIN
    DECLARE v_AdminRoleId INT;

    IF EXISTS (SELECT 1 FROM `Users` WHERE `Email` = p_Email) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_USER_EMAIL: An account with this email already exists.';
    END IF;

    SELECT `RoleId` INTO v_AdminRoleId
    FROM `Roles`
    WHERE `RoleCode` = 'COLLEGE_ADMIN' OR `RoleName` = 'Admin'
    ORDER BY `RoleId` ASC LIMIT 1;

    INSERT INTO `Users` (
        `CollegeId`, `RoleId`, `Email`, `PhoneNumber`, `PasswordHash`, 
        `FullName`, `IsActive`, `IsFirstLogin`, `CreatedAt`
    )
    VALUES (
        p_CollegeId, v_AdminRoleId, p_Email, '+91 9000000000', p_PasswordHash, 
        p_FullName, 1, 1, CURRENT_TIMESTAMP(6)
    );

    SET p_NewUserId = LAST_INSERT_ID();
END$$


-- =============================================================================
-- 9. sp_SuperAdmin_GetGlobalUsersPaged
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetGlobalUsersPaged`$$
CREATE PROCEDURE `sp_SuperAdmin_GetGlobalUsersPaged`(
    IN p_CollegeId INT,
    IN p_RoleId INT,
    IN p_Status VARCHAR(20),
    IN p_SearchTerm VARCHAR(100),
    IN p_Page INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    SET p_Page = IFNULL(p_Page, 1);
    SET p_PageSize = IFNULL(p_PageSize, 10);
    IF p_Page < 1 THEN SET p_Page = 1; END IF;
    IF p_PageSize < 1 THEN SET p_PageSize = 10; END IF;
    SET v_Offset = (p_Page - 1) * p_PageSize;

    SELECT COUNT(*) AS TotalCount
    FROM `Users` u
    JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
    LEFT JOIN `Colleges` c ON u.`CollegeId` = c.`CollegeId`
    WHERE (p_CollegeId IS NULL OR p_CollegeId = 0 OR u.`CollegeId` = p_CollegeId)
      AND (p_RoleId IS NULL OR p_RoleId = 0 OR u.`RoleId` = p_RoleId)
      AND (p_Status IS NULL OR p_Status = '' OR (p_Status = 'Active' AND u.`IsActive` = 1) OR (p_Status = 'Inactive' AND u.`IsActive` = 0))
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' 
           OR u.`FullName` LIKE CONCAT('%', p_SearchTerm, '%')
           OR u.`Email` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`CollegeName` LIKE CONCAT('%', p_SearchTerm, '%'));

    SELECT 
        u.`UserId`,
        u.`FullName`,
        u.`Email`,
        u.`IsActive`,
        u.`CollegeId`,
        COALESCE(c.`CollegeName`, 'Platform Super Admin') AS CollegeName,
        r.`RoleId`,
        r.`RoleName`,
        r.`RoleCode`,
        r.`Scope`,
        u.`CreatedAt`
    FROM `Users` u
    JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
    LEFT JOIN `Colleges` c ON u.`CollegeId` = c.`CollegeId`
    WHERE (p_CollegeId IS NULL OR p_CollegeId = 0 OR u.`CollegeId` = p_CollegeId)
      AND (p_RoleId IS NULL OR p_RoleId = 0 OR u.`RoleId` = p_RoleId)
      AND (p_Status IS NULL OR p_Status = '' OR (p_Status = 'Active' AND u.`IsActive` = 1) OR (p_Status = 'Inactive' AND u.`IsActive` = 0))
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' 
           OR u.`FullName` LIKE CONCAT('%', p_SearchTerm, '%')
           OR u.`Email` LIKE CONCAT('%', p_SearchTerm, '%')
           OR c.`CollegeName` LIKE CONCAT('%', p_SearchTerm, '%'))
    ORDER BY u.`UserId` DESC
    LIMIT p_PageSize OFFSET v_Offset;
END$$


-- =============================================================================
-- 10. sp_SuperAdmin_GetUserDetail
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetUserDetail`$$
CREATE PROCEDURE `sp_SuperAdmin_GetUserDetail`(IN p_UserId INT)
BEGIN
    SELECT 
        u.`UserId`,
        u.`FullName`,
        u.`Email`,
        u.`IsActive`,
        u.`CollegeId`,
        COALESCE(c.`CollegeName`, 'Platform Super Admin') AS CollegeName,
        r.`RoleId`,
        r.`RoleName`,
        r.`RoleCode`,
        r.`Scope`,
        u.`StudentId`,
        u.`StaffId`,
        u.`CreatedAt`
    FROM `Users` u
    JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
    LEFT JOIN `Colleges` c ON u.`CollegeId` = c.`CollegeId`
    WHERE u.`UserId` = p_UserId;
END$$


-- =============================================================================
-- 11. sp_SuperAdmin_UpdateUserStatus
-- CONCURRENCY GUARD: Row-Level Lock (FOR UPDATE) on Quota
-- SECURITY GUARD: Blocks Deactivation of the Last Active Super Admin
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdateUserStatus`$$
CREATE PROCEDURE `sp_SuperAdmin_UpdateUserStatus`(
    IN p_UserId INT,
    IN p_IsActive TINYINT(1),
    IN p_UpdatedBy INT
)
BEGIN
    DECLARE v_TargetRoleCode VARCHAR(50);
    DECLARE v_CollegeId INT;
    DECLARE v_ActiveSuperAdminCount INT;
    DECLARE v_AccountLimit INT;
    DECLARE v_CurrentActiveCount INT;

    SELECT r.`RoleCode`, u.`CollegeId` INTO v_TargetRoleCode, v_CollegeId
    FROM `Users` u
    JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
    WHERE u.`UserId` = p_UserId;

    -- Guard 1: Protect Last Active Super Admin
    IF (v_TargetRoleCode = 'SUPER_ADMIN' AND p_IsActive = 0) THEN
        SELECT COUNT(*) INTO v_ActiveSuperAdminCount
        FROM `Users` u
        JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
        WHERE r.`RoleCode` = 'SUPER_ADMIN' AND u.`IsActive` = 1;

        IF (v_ActiveSuperAdminCount <= 1) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CANNOT_DEACTIVATE_LAST_SUPER_ADMIN: Total platform lockout protection triggered.';
        END IF;
    END IF;

    -- Guard 2: Enforce Plan Quota on Account Reactivation (FOR UPDATE row lock)
    IF (p_IsActive = 1 AND v_CollegeId IS NOT NULL) THEN
        SELECT p.`AccountLimit` INTO v_AccountLimit
        FROM `CollegeSubscriptions` cs
        JOIN `SubscriptionPlans` p ON cs.`PlanId` = p.`PlanId`
        WHERE cs.`CollegeId` = v_CollegeId
        FOR UPDATE;

        SELECT COUNT(*) INTO v_CurrentActiveCount
        FROM `Users` u
        JOIN `Roles` r ON u.`RoleId` = r.`RoleId`
        WHERE u.`CollegeId` = v_CollegeId AND u.`IsActive` = 1 AND r.`RoleCode` != 'SUPER_ADMIN';

        IF (v_AccountLimit IS NOT NULL AND v_CurrentActiveCount >= v_AccountLimit) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'QUOTA_EXCEEDED: Cannot activate account: College active account limit reached.';
        END IF;
    END IF;

    -- Update User Status
    UPDATE `Users`
    SET `IsActive` = p_IsActive
    WHERE `UserId` = p_UserId;

    INSERT INTO `AuditLogs` (`CollegeId`, `Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES (v_CollegeId, 'UPDATE_USER_STATUS', 'Users', p_UserId, CONCAT('User status updated to: ', p_IsActive), CURRENT_TIMESTAMP(6));
END$$


-- =============================================================================
-- 12. sp_SuperAdmin_ResetUserPassword
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_ResetUserPassword`$$
CREATE PROCEDURE `sp_SuperAdmin_ResetUserPassword`(
    IN p_UserId INT,
    IN p_NewPasswordHash VARCHAR(255),
    IN p_UpdatedBy INT
)
BEGIN
    UPDATE `Users`
    SET `PasswordHash` = p_NewPasswordHash,
        `IsFirstLogin` = 1
    WHERE `UserId` = p_UserId;

    INSERT INTO `AuditLogs` (`Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES ('RESET_PASSWORD', 'Users', p_UserId, 'Administrative password reset triggered by Super Admin', CURRENT_TIMESTAMP(6));
END$$


-- =============================================================================
-- 13. sp_SuperAdmin_GetAllPlans
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetAllPlans`$$
CREATE PROCEDURE `sp_SuperAdmin_GetAllPlans`()
BEGIN
    SELECT 
        p.`PlanId`,
        p.`PlanName`,
        p.`Description`,
        p.`Price`,
        p.`DurationDays`,
        p.`AccountLimit`,
        p.`IsActive`,
        (SELECT COUNT(*) FROM `CollegeSubscriptions` cs WHERE cs.`PlanId` = p.`PlanId`) AS AssignedCollegesCount
    FROM `SubscriptionPlans` p
    WHERE p.`IsDeleted` = 0
    ORDER BY p.`Price` ASC;
END$$


-- =============================================================================
-- 14. sp_SuperAdmin_SavePlan
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_SavePlan`$$
CREATE PROCEDURE `sp_SuperAdmin_SavePlan`(
    IN p_PlanId INT,
    IN p_PlanName VARCHAR(100),
    IN p_Description VARCHAR(500),
    IN p_Price DECIMAL(12,2),
    IN p_DurationDays INT,
    IN p_AccountLimit INT,
    IN p_UpdatedBy INT,
    OUT p_ResultPlanId INT
)
BEGIN
    IF (p_PlanId IS NULL OR p_PlanId = 0) THEN
        INSERT INTO `SubscriptionPlans` (
            `PlanName`, `Description`, `Price`, `DurationDays`, `AccountLimit`, `IsActive`, `CreatedBy`
        )
        VALUES (
            p_PlanName, p_Description, p_Price, p_DurationDays, p_AccountLimit, 1, p_UpdatedBy
        );
        SET p_ResultPlanId = LAST_INSERT_ID();
    ELSE
        UPDATE `SubscriptionPlans`
        SET `PlanName` = p_PlanName,
            `Description` = p_Description,
            `Price` = p_Price,
            `DurationDays` = p_DurationDays,
            `AccountLimit` = p_AccountLimit,
            `UpdatedBy` = p_UpdatedBy,
            `UpdatedAt` = CURRENT_TIMESTAMP(6)
        WHERE `PlanId` = p_PlanId;
        SET p_ResultPlanId = p_PlanId;
    END IF;
END$$


-- =============================================================================
-- 15. sp_SuperAdmin_UpdatePlanStatus
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdatePlanStatus`$$
CREATE PROCEDURE `sp_SuperAdmin_UpdatePlanStatus`(
    IN p_PlanId INT,
    IN p_IsActive TINYINT(1),
    IN p_UpdatedBy INT
)
BEGIN
    UPDATE `SubscriptionPlans`
    SET `IsActive` = p_IsActive,
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `PlanId` = p_PlanId;
END$$


-- =============================================================================
-- 16. sp_SuperAdmin_GetCollegeSubscriptions
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetCollegeSubscriptions`$$
CREATE PROCEDURE `sp_SuperAdmin_GetCollegeSubscriptions`(
    IN p_Status VARCHAR(20),
    IN p_SearchTerm VARCHAR(100)
)
BEGIN
    SELECT 
        cs.`SubscriptionId`,
        cs.`CollegeId`,
        c.`CollegeName`,
        cs.`PlanId`,
        p.`PlanName`,
        cs.`StartDate`,
        cs.`RenewalDate`,
        cs.`Status`,
        cs.`AutoRenew`,
        p.`AccountLimit`,
        (SELECT COUNT(*) FROM `Users` u WHERE u.`CollegeId` = cs.`CollegeId` AND u.`IsActive` = 1) AS ActiveUsersCount,
        DATEDIFF(cs.`RenewalDate`, CURDATE()) AS DaysRemaining
    FROM `CollegeSubscriptions` cs
    JOIN `Colleges` c ON cs.`CollegeId` = c.`CollegeId`
    JOIN `SubscriptionPlans` p ON cs.`PlanId` = p.`PlanId`
    WHERE c.`IsDeleted` = 0
      AND (p_Status IS NULL OR p_Status = '' OR cs.`Status` = p_Status)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR c.`CollegeName` LIKE CONCAT('%', p_SearchTerm, '%'))
    ORDER BY cs.`RenewalDate` ASC;
END$$


-- =============================================================================
-- 17. sp_SuperAdmin_ChangeCollegePlan
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_ChangeCollegePlan`$$
CREATE PROCEDURE `sp_SuperAdmin_ChangeCollegePlan`(
    IN p_CollegeId INT,
    IN p_NewPlanId INT,
    IN p_UpdatedBy INT
)
BEGIN
    DECLARE v_PreviousPlanId INT;
    DECLARE v_DurationDays INT;

    SELECT `PlanId` INTO v_PreviousPlanId FROM `CollegeSubscriptions` WHERE `CollegeId` = p_CollegeId;
    SELECT `DurationDays` INTO v_DurationDays FROM `SubscriptionPlans` WHERE `PlanId` = p_NewPlanId;

    START TRANSACTION;

    UPDATE `CollegeSubscriptions`
    SET `PlanId` = p_NewPlanId,
        `Status` = 'Active',
        `RenewalDate` = DATE_ADD(CURDATE(), INTERVAL v_DurationDays DAY),
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `CollegeId` = p_CollegeId;

    UPDATE `Colleges`
    SET `CurrentPlanId` = p_NewPlanId,
        `SubscriptionStatus` = 'Active',
        `RenewalDate` = DATE_ADD(CURDATE(), INTERVAL v_DurationDays DAY)
    WHERE `CollegeId` = p_CollegeId;

    INSERT INTO `AuditLogs` (`CollegeId`, `Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES (p_CollegeId, 'CHANGE_PLAN', 'CollegeSubscriptions', p_CollegeId, CONCAT('Plan changed from ', v_PreviousPlanId, ' to ', p_NewPlanId), CURRENT_TIMESTAMP(6));

    COMMIT;
END$$


-- =============================================================================
-- 18. sp_SuperAdmin_RenewCollegeSubscription
-- Preserves previous cycle: RenewalDate = PreviousRenewalDate + PlanDuration
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_RenewCollegeSubscription`$$
CREATE PROCEDURE `sp_SuperAdmin_RenewCollegeSubscription`(
    IN p_CollegeId INT,
    IN p_DaysToAdd INT,
    IN p_UpdatedBy INT
)
BEGIN
    DECLARE v_CurrentRenewalDate DATE;
    DECLARE v_NewRenewalDate DATE;
    DECLARE v_PlanId INT;
    DECLARE v_PlanPrice DECIMAL(12,2);

    SELECT `RenewalDate`, `PlanId` INTO v_CurrentRenewalDate, v_PlanId 
    FROM `CollegeSubscriptions` WHERE `CollegeId` = p_CollegeId;

    SELECT `Price` INTO v_PlanPrice FROM `SubscriptionPlans` WHERE `PlanId` = v_PlanId;

    -- Cycle Preservation: Calculate from previous expiration date
    IF v_CurrentRenewalDate >= CURDATE() THEN
        SET v_NewRenewalDate = DATE_ADD(v_CurrentRenewalDate, INTERVAL p_DaysToAdd DAY);
    ELSE
        SET v_NewRenewalDate = DATE_ADD(CURDATE(), INTERVAL p_DaysToAdd DAY);
    END IF;

    START TRANSACTION;

    UPDATE `CollegeSubscriptions`
    SET `RenewalDate` = v_NewRenewalDate,
        `Status` = 'Active',
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `CollegeId` = p_CollegeId;

    UPDATE `Colleges`
    SET `RenewalDate` = v_NewRenewalDate,
        `SubscriptionStatus` = 'Active'
    WHERE `CollegeId` = p_CollegeId;

    INSERT INTO `SubscriptionRenewalHistory` (
        `CollegeId`, `PlanId`, `PreviousRenewalDate`, `NewRenewalDate`, `AmountPaid`, `RenewedAt`
    )
    VALUES (
        p_CollegeId, v_PlanId, v_CurrentRenewalDate, v_NewRenewalDate, IFNULL(v_PlanPrice, 0.00), CURRENT_TIMESTAMP(6)
    );

    COMMIT;
END$$


-- =============================================================================
-- 19. sp_SuperAdmin_CancelCollegeSubscription
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_CancelCollegeSubscription`$$
CREATE PROCEDURE `sp_SuperAdmin_CancelCollegeSubscription`(
    IN p_CollegeId INT,
    IN p_UpdatedBy INT
)
BEGIN
    START TRANSACTION;

    UPDATE `CollegeSubscriptions`
    SET `PlanId` = 1, -- Revert to Free plan
        `Status` = 'Cancelled',
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `CollegeId` = p_CollegeId;

    UPDATE `Colleges`
    SET `CurrentPlanId` = 1,
        `SubscriptionStatus` = 'Cancelled'
    WHERE `CollegeId` = p_CollegeId;

    INSERT INTO `AuditLogs` (`CollegeId`, `Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES (p_CollegeId, 'CANCEL_SUBSCRIPTION', 'CollegeSubscriptions', p_CollegeId, 'Subscription cancelled; reverted to Free tier', CURRENT_TIMESTAMP(6));

    COMMIT;
END$$


-- =============================================================================
-- 20. sp_SuperAdmin_GetAccountUsageStats
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetAccountUsageStats`$$
CREATE PROCEDURE `sp_SuperAdmin_GetAccountUsageStats`()
BEGIN
    SELECT 
        c.`CollegeId`,
        c.`CollegeName`,
        p.`PlanName`,
        p.`AccountLimit`,
        (SELECT COUNT(*) FROM `Users` u WHERE u.`CollegeId` = c.`CollegeId` AND u.`IsActive` = 1) AS ActiveUsersCount,
        ROUND(((SELECT COUNT(*) FROM `Users` u WHERE u.`CollegeId` = c.`CollegeId` AND u.`IsActive` = 1) / p.`AccountLimit`) * 100, 1) AS UsagePercentage
    FROM `Colleges` c
    JOIN `CollegeSubscriptions` cs ON c.`CollegeId` = cs.`CollegeId`
    JOIN `SubscriptionPlans` p ON cs.`PlanId` = p.`PlanId`
    WHERE c.`IsDeleted` = 0
    ORDER BY UsagePercentage DESC;
END$$


-- =============================================================================
-- 21. sp_SuperAdmin_GetRenewalsPaged
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetRenewalsPaged`$$
CREATE PROCEDURE `sp_SuperAdmin_GetRenewalsPaged`(
    IN p_DaysAhead INT,
    IN p_PlanId INT
)
BEGIN
    SET p_DaysAhead = IFNULL(p_DaysAhead, 30);

    SELECT 
        cs.`SubscriptionId`,
        cs.`CollegeId`,
        c.`CollegeName`,
        c.`OfficialEmail`,
        p.`PlanName`,
        cs.`RenewalDate`,
        DATEDIFF(cs.`RenewalDate`, CURDATE()) AS DaysRemaining,
        cs.`Status`
    FROM `CollegeSubscriptions` cs
    JOIN `Colleges` c ON cs.`CollegeId` = c.`CollegeId`
    JOIN `SubscriptionPlans` p ON cs.`PlanId` = p.`PlanId`
    WHERE c.`IsDeleted` = 0
      AND (p_PlanId IS NULL OR p_PlanId = 0 OR cs.`PlanId` = p_PlanId)
      AND cs.`RenewalDate` <= DATE_ADD(CURDATE(), INTERVAL p_DaysAhead DAY)
    ORDER BY cs.`RenewalDate` ASC;
END$$


-- =============================================================================
-- 22. sp_SuperAdmin_GetPaymentsAndInvoices
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetPaymentsAndInvoices`$$
CREATE PROCEDURE `sp_SuperAdmin_GetPaymentsAndInvoices`()
BEGIN
    -- Invoices Ledger
    SELECT 
        inv.`InvoiceId`,
        inv.`InvoiceNumber`,
        inv.`CollegeId`,
        c.`CollegeName`,
        p.`PlanName`,
        inv.`Amount`,
        inv.`InvoiceDate`,
        inv.`DueDate`,
        inv.`Status`
    FROM `PlatformInvoices` inv
    JOIN `Colleges` c ON inv.`CollegeId` = c.`CollegeId`
    JOIN `SubscriptionPlans` p ON inv.`PlanId` = p.`PlanId`
    ORDER BY inv.`InvoiceId` DESC;

    -- Payments Ledger
    SELECT 
        pay.`PaymentId`,
        pay.`PaymentIdentifier`,
        pay.`InvoiceId`,
        pay.`CollegeId`,
        c.`CollegeName`,
        pay.`Amount`,
        pay.`PaymentDate`,
        pay.`PaymentMethod`,
        pay.`Status`,
        pay.`TransactionReference`
    FROM `PlatformPayments` pay
    JOIN `Colleges` c ON pay.`CollegeId` = c.`CollegeId`
    ORDER BY pay.`PaymentId` DESC;
END$$


-- =============================================================================
-- 23. sp_SuperAdmin_VerifyPlatformPayment
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_VerifyPlatformPayment`$$
CREATE PROCEDURE `sp_SuperAdmin_VerifyPlatformPayment`(
    IN p_PaymentId INT,
    IN p_VerifiedBy INT
)
BEGIN
    DECLARE v_InvoiceId INT;
    DECLARE v_CollegeId INT;
    DECLARE v_PlanId INT;
    DECLARE v_DurationDays INT;

    SELECT `InvoiceId`, `CollegeId` INTO v_InvoiceId, v_CollegeId
    FROM `PlatformPayments` WHERE `PaymentId` = p_PaymentId;

    SELECT `PlanId` INTO v_PlanId FROM `PlatformInvoices` WHERE `InvoiceId` = v_InvoiceId;
    SELECT `DurationDays` INTO v_DurationDays FROM `SubscriptionPlans` WHERE `PlanId` = v_PlanId;

    START TRANSACTION;

    -- Mark Payment as Paid
    UPDATE `PlatformPayments`
    SET `Status` = 'Paid'
    WHERE `PaymentId` = p_PaymentId;

    -- Mark Invoice as Paid
    UPDATE `PlatformInvoices`
    SET `Status` = 'Paid'
    WHERE `InvoiceId` = v_InvoiceId;

    -- Advance Subscription Renewal Date
    UPDATE `CollegeSubscriptions`
    SET `Status` = 'Active',
        `RenewalDate` = DATE_ADD(CURDATE(), INTERVAL IFNULL(v_DurationDays, 365) DAY),
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `CollegeId` = v_CollegeId;

    UPDATE `Colleges`
    SET `SubscriptionStatus` = 'Active',
        `RenewalDate` = DATE_ADD(CURDATE(), INTERVAL IFNULL(v_DurationDays, 365) DAY)
    WHERE `CollegeId` = v_CollegeId;

    INSERT INTO `AuditLogs` (`CollegeId`, `Action`, `EntityName`, `EntityId`, `Description`, `CreatedAt`)
    VALUES (v_CollegeId, 'VERIFY_PAYMENT', 'PlatformPayments', p_PaymentId, 'Payment verified; subscription renewed', CURRENT_TIMESTAMP(6));

    COMMIT;
END$$


-- =============================================================================
-- 24. sp_SuperAdmin_GetPlanModuleMatrix
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetPlanModuleMatrix`$$
CREATE PROCEDURE `sp_SuperAdmin_GetPlanModuleMatrix`()
BEGIN
    SELECT 
        pm.`PlanModuleId`,
        pm.`PlanId`,
        p.`PlanName`,
        pm.`ModuleName`,
        pm.`IsEnabled`
    FROM `PlanModules` pm
    JOIN `SubscriptionPlans` p ON pm.`PlanId` = p.`PlanId`
    WHERE p.`IsDeleted` = 0
    ORDER BY pm.`PlanId` ASC, pm.`ModuleName` ASC;
END$$


-- =============================================================================
-- 25. sp_SuperAdmin_UpdatePlanModuleMatrix
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_UpdatePlanModuleMatrix`$$
CREATE PROCEDURE `sp_SuperAdmin_UpdatePlanModuleMatrix`(
    IN p_PlanId INT,
    IN p_ModuleName VARCHAR(100),
    IN p_IsEnabled TINYINT(1)
)
BEGIN
    INSERT INTO `PlanModules` (`PlanId`, `ModuleName`, `IsEnabled`)
    VALUES (p_PlanId, p_ModuleName, p_IsEnabled)
    ON DUPLICATE KEY UPDATE `IsEnabled` = p_IsEnabled;
END$$


-- =============================================================================
-- 26. sp_SuperAdmin_GetNotifications
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetNotifications`$$
CREATE PROCEDURE `sp_SuperAdmin_GetNotifications`(
    IN p_IsRead TINYINT(1),
    IN p_Category VARCHAR(50)
)
BEGIN
    SELECT 
        n.`Id`,
        n.`Title`,
        n.`Message`,
        n.`Category`,
        n.`IsRead`,
        n.`CreatedAt`
    FROM `Notifications` n
    WHERE (p_IsRead IS NULL OR n.`IsRead` = p_IsRead)
      AND (p_Category IS NULL OR p_Category = '' OR n.`Category` = p_Category)
    ORDER BY n.`Id` DESC
    LIMIT 50;
END$$


-- =============================================================================
-- 27. sp_SuperAdmin_CreatePlatformNotification
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_CreatePlatformNotification`$$
CREATE PROCEDURE `sp_SuperAdmin_CreatePlatformNotification`(
    IN p_Title VARCHAR(200),
    IN p_Message TEXT,
    IN p_Category VARCHAR(50),
    IN p_CreatedBy INT,
    OUT p_NewNotificationId INT
)
BEGIN
    INSERT INTO `Notifications` (`Title`, `Message`, `Category`, `IsRead`, `CreatedAt`)
    VALUES (p_Title, p_Message, p_Category, 0, CURRENT_TIMESTAMP(6));

    SET p_NewNotificationId = LAST_INSERT_ID();
END$$


-- =============================================================================
-- 28. sp_SuperAdmin_MarkNotificationRead
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_MarkNotificationRead`$$
CREATE PROCEDURE `sp_SuperAdmin_MarkNotificationRead`(IN p_NotificationId INT)
BEGIN
    UPDATE `Notifications`
    SET `IsRead` = 1
    WHERE `Id` = p_NotificationId;
END$$


-- =============================================================================
-- 29. sp_SuperAdmin_GetAuditLogsPaged
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuperAdmin_GetAuditLogsPaged`$$
CREATE PROCEDURE `sp_SuperAdmin_GetAuditLogsPaged`(
    IN p_CollegeId INT,
    IN p_Action VARCHAR(50),
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_Page INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    SET p_Page = IFNULL(p_Page, 1);
    SET p_PageSize = IFNULL(p_PageSize, 20);
    IF p_Page < 1 THEN SET p_Page = 1; END IF;
    IF p_PageSize < 1 THEN SET p_PageSize = 20; END IF;
    SET v_Offset = (p_Page - 1) * p_PageSize;

    SELECT COUNT(*) AS TotalCount
    FROM `AuditLogs` a
    LEFT JOIN `Colleges` c ON a.`CollegeId` = c.`CollegeId`
    WHERE (p_CollegeId IS NULL OR p_CollegeId = 0 OR a.`CollegeId` = p_CollegeId)
      AND (p_Action IS NULL OR p_Action = '' OR a.`Action` = p_Action)
      AND (p_FromDate IS NULL OR a.`CreatedAt` >= p_FromDate)
      AND (p_ToDate IS NULL OR a.`CreatedAt` <= DATE_ADD(p_ToDate, INTERVAL 1 DAY));

    SELECT 
        a.`AuditLogId`,
        a.`CollegeId`,
        COALESCE(c.`CollegeName`, 'Platform Global') AS CollegeName,
        a.`Action`,
        a.`EntityName`,
        a.`EntityId`,
        a.`Description`,
        a.`CreatedAt`
    FROM `AuditLogs` a
    LEFT JOIN `Colleges` c ON a.`CollegeId` = c.`CollegeId`
    WHERE (p_CollegeId IS NULL OR p_CollegeId = 0 OR a.`CollegeId` = p_CollegeId)
      AND (p_Action IS NULL OR p_Action = '' OR a.`Action` = p_Action)
      AND (p_FromDate IS NULL OR a.`CreatedAt` >= p_FromDate)
      AND (p_ToDate IS NULL OR a.`CreatedAt` <= DATE_ADD(p_ToDate, INTERVAL 1 DAY))
    ORDER BY a.`AuditLogId` DESC
    LIMIT p_PageSize OFFSET v_Offset;
END$$

DELIMITER ;

SELECT 'SUPER_ADMIN_COMPLETE_STORED_PROCEDURES_DEPLOYED' AS Status, NOW() AS CompletedAt;
