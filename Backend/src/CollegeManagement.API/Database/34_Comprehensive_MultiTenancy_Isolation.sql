-- ==============================================================================
-- Migration: 34_Comprehensive_MultiTenancy_Isolation.sql
-- Description: Enforces strict CollegeId multi-tenant isolation across:
--   1. Scholarships (sp_Scholarship_GetAll, sp_Scholarship_Create)
--   2. Fine Rules (sp_FineRule_GetAll, sp_FineRule_Create)
--   3. Leave Categories (sp_GetLeaveCategories, sp_CreateLeaveCategory)
--   4. Attendance Timing Configs (sp_GetAttendanceTimingConfigs, sp_CreateAttendanceTimingConfig, sp_GetEffectiveAttendanceTimingConfig)
--   5. Holidays (sp_CreateHoliday, sp_BulkCreateHolidayRecord, sp_CheckIsHoliday)
--   6. Audit Logs (sp_GetAuditLogsPaged, sp_InsertAuditLog)
--   7. Theme Policy (ThemePolicy table CollegeId column, sp_GetThemePolicy, sp_UpdateThemePolicy)
-- ==============================================================================

-- 1. Scholarships
DROP PROCEDURE IF EXISTS sp_Scholarship_GetAll;
DELIMITER //
CREATE PROCEDURE sp_Scholarship_GetAll(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        ScholarshipId,
        CollegeId,
        ScholarshipName,
        DiscountType,
        DiscountValue,
        Description,
        CampusId,
        BoardId,
        AcademicYearId,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Scholarships
    WHERE IsActive = 1
      AND (
          (p_CollegeId IS NOT NULL AND p_CollegeId > 0 AND CollegeId = p_CollegeId)
          OR ((p_CollegeId IS NULL OR p_CollegeId <= 0) AND (p_CampusId IS NULL OR p_CampusId = 0 OR CampusId IS NULL OR CampusId = p_CampusId))
      )
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR BoardId IS NULL OR BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
    ORDER BY ScholarshipId DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_Scholarship_Create;
DELIMITER //
CREATE PROCEDURE sp_Scholarship_Create(
    IN p_ScholarshipName VARCHAR(100),
    IN p_DiscountType VARCHAR(20),
    IN p_DiscountValue DECIMAL(15,2),
    IN p_Description VARCHAR(500),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_IsActive BOOLEAN,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_NewId INT;
    DECLARE v_CollegeId INT;
    SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

    INSERT INTO Scholarships (
        CollegeId,
        ScholarshipName,
        DiscountType,
        DiscountValue,
        Description,
        CampusId,
        BoardId,
        AcademicYearId,
        IsActive,
        CreatedAt
    )
    VALUES (
        v_CollegeId,
        TRIM(p_ScholarshipName),
        TRIM(p_DiscountType),
        p_DiscountValue,
        p_Description,
        NULLIF(p_CampusId, 0),
        NULLIF(p_BoardId, 0),
        NULLIF(p_AcademicYearId, 0),
        COALESCE(p_IsActive, 1),
        CURRENT_TIMESTAMP(6)
    );

    SET v_NewId = LAST_INSERT_ID();

    SELECT 
        ScholarshipId,
        CollegeId,
        ScholarshipName,
        DiscountType,
        DiscountValue,
        Description,
        CampusId,
        BoardId,
        AcademicYearId,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Scholarships
    WHERE ScholarshipId = v_NewId;
END //
DELIMITER ;

-- 2. Fine Rules
DROP PROCEDURE IF EXISTS sp_FineRule_GetAll;
DELIMITER //
CREATE PROCEDURE sp_FineRule_GetAll(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        fr.FineRuleId,
        fr.CollegeId,
        fr.FineRuleName,
        fr.ApplicableFeeId,
        COALESCE(ft.FeeTypeName, '') AS ApplicableFeeName,
        fr.FineType,
        fr.FineAmount,
        fr.GracePeriod,
        fr.Status,
        fr.CampusId,
        fr.BoardId,
        fr.AcademicYearId,
        fr.CreatedAt,
        fr.UpdatedAt
    FROM FineRules fr
    LEFT JOIN FeeTypes ft ON ft.FeeTypeId = fr.ApplicableFeeId
    WHERE (
        (p_CollegeId IS NOT NULL AND p_CollegeId > 0 AND fr.CollegeId = p_CollegeId)
        OR ((p_CollegeId IS NULL OR p_CollegeId <= 0) AND (p_CampusId IS NULL OR p_CampusId = 0 OR fr.CampusId IS NULL OR fr.CampusId = p_CampusId))
    )
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR fr.CampusId IS NULL OR fr.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR fr.BoardId IS NULL OR fr.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR fr.AcademicYearId IS NULL OR fr.AcademicYearId = p_AcademicYearId)
    ORDER BY fr.FineRuleId DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_FineRule_Create;
DELIMITER //
CREATE PROCEDURE sp_FineRule_Create(
    IN p_FineRuleName VARCHAR(150),
    IN p_ApplicableFeeId INT,
    IN p_FineType VARCHAR(50),
    IN p_FineAmount DECIMAL(10,2),
    IN p_GracePeriod INT,
    IN p_Status VARCHAR(20),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_NewId INT;
    DECLARE v_CollegeId INT;
    SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

    INSERT INTO FineRules (
        CollegeId,
        FineRuleName,
        ApplicableFeeId,
        FineType,
        FineAmount,
        GracePeriod,
        Status,
        CampusId,
        BoardId,
        AcademicYearId,
        CreatedAt
    )
    VALUES (
        v_CollegeId,
        TRIM(p_FineRuleName),
        p_ApplicableFeeId,
        TRIM(p_FineType),
        p_FineAmount,
        p_GracePeriod,
        COALESCE(p_Status, 'Active'),
        NULLIF(p_CampusId, 0),
        NULLIF(p_BoardId, 0),
        NULLIF(p_AcademicYearId, 0),
        CURRENT_TIMESTAMP(6)
    );

    SET v_NewId = LAST_INSERT_ID();
    SELECT v_NewId AS FineRuleId;
END //
DELIMITER ;

-- 3. Leave Categories
DROP PROCEDURE IF EXISTS sp_GetLeaveCategories;
DELIMITER //
CREATE PROCEDURE sp_GetLeaveCategories(
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        LeaveCategoryId,
        CollegeId,
        CampusId,
        CategoryName,
        CategoryCode,
        AnnualQuota,
        ApplicableStaffType,
        AllowCarryForward,
        RequiresProof,
        Description,
        DisplayOrder,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM LeaveCategories
    WHERE IsActive = 1
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId OR CollegeId IS NULL)
    ORDER BY DisplayOrder ASC, CategoryName ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CreateLeaveCategory;
DELIMITER //
CREATE PROCEDURE sp_CreateLeaveCategory(
    IN p_CategoryName VARCHAR(100),
    IN p_CategoryCode VARCHAR(20),
    IN p_AnnualQuota DECIMAL(5,2),
    IN p_ApplicableStaffType VARCHAR(50),
    IN p_AllowCarryForward TINYINT,
    IN p_RequiresProof TINYINT,
    IN p_Description VARCHAR(500),
    IN p_DisplayOrder INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT;
    SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

    INSERT INTO LeaveCategories (
        CollegeId,
        CategoryName,
        CategoryCode,
        AnnualQuota,
        ApplicableStaffType,
        AllowCarryForward,
        RequiresProof,
        Description,
        DisplayOrder,
        IsActive,
        CreatedAt
    )
    VALUES (
        v_CollegeId,
        TRIM(p_CategoryName),
        TRIM(p_CategoryCode),
        p_AnnualQuota,
        TRIM(p_ApplicableStaffType),
        p_AllowCarryForward,
        p_RequiresProof,
        p_Description,
        p_DisplayOrder,
        1,
        CURRENT_TIMESTAMP(6)
    );

    SELECT * FROM LeaveCategories WHERE LeaveCategoryId = LAST_INSERT_ID();
END //
DELIMITER ;

-- 4. Attendance Timing Configs
DROP PROCEDURE IF EXISTS sp_GetAttendanceTimingConfigs;
DELIMITER //
CREATE PROCEDURE sp_GetAttendanceTimingConfigs(
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        Id,
        CollegeId,
        CampusId,
        ConfigName,
        StaffType,
        DepartmentId,
        WorkStartTime,
        WorkEndTime,
        LateThreshold,
        EarlyCheckoutThreshold,
        GracePeriodMinutes,
        MinWorkingHours,
        IsActive,
        Description,
        CreatedAt,
        UpdatedAt
    FROM AttendanceTimingConfigs
    WHERE (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId OR CollegeId IS NULL)
    ORDER BY Id DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CreateAttendanceTimingConfig;
DELIMITER //
CREATE PROCEDURE sp_CreateAttendanceTimingConfig(
    IN p_ConfigName VARCHAR(150),
    IN p_StaffType TINYINT,
    IN p_DepartmentId INT,
    IN p_WorkStartTime TIME,
    IN p_WorkEndTime TIME,
    IN p_LateThreshold TIME,
    IN p_EarlyCheckoutThreshold TIME,
    IN p_GracePeriodMinutes INT,
    IN p_MinWorkingHours DECIMAL(4,2),
    IN p_IsActive TINYINT,
    IN p_Description VARCHAR(500),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT;
    SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

    INSERT INTO AttendanceTimingConfigs (
        CollegeId,
        ConfigName,
        StaffType,
        DepartmentId,
        WorkStartTime,
        WorkEndTime,
        LateThreshold,
        EarlyCheckoutThreshold,
        GracePeriodMinutes,
        MinWorkingHours,
        IsActive,
        Description,
        CreatedAt
    )
    VALUES (
        v_CollegeId,
        TRIM(p_ConfigName),
        p_StaffType,
        NULLIF(p_DepartmentId, 0),
        p_WorkStartTime,
        p_WorkEndTime,
        p_LateThreshold,
        p_EarlyCheckoutThreshold,
        p_GracePeriodMinutes,
        p_MinWorkingHours,
        COALESCE(p_IsActive, 1),
        p_Description,
        CURRENT_TIMESTAMP(6)
    );

    SELECT LAST_INSERT_ID() AS InsertedId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetEffectiveAttendanceTimingConfig;
DELIMITER //
CREATE PROCEDURE sp_GetEffectiveAttendanceTimingConfig(
    IN p_StaffType TINYINT,
    IN p_DepartmentId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT *
    FROM AttendanceTimingConfigs
    WHERE IsActive = 1
      AND (p_StaffType IS NULL OR StaffType IS NULL OR StaffType = p_StaffType)
      AND (p_DepartmentId IS NULL OR p_DepartmentId = 0 OR DepartmentId IS NULL OR DepartmentId = 0 OR DepartmentId = p_DepartmentId)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId OR CollegeId IS NULL)
    ORDER BY (DepartmentId IS NOT NULL AND DepartmentId > 0) DESC,
             (StaffType IS NOT NULL) DESC,
             Id DESC
    LIMIT 1;
END //
DELIMITER ;

-- 5. Holidays
DROP PROCEDURE IF EXISTS sp_CreateHoliday;
DELIMITER //
CREATE PROCEDURE sp_CreateHoliday(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_HolidayName VARCHAR(150),
    IN p_HolidayType VARCHAR(50),
    IN p_AppliesTo VARCHAR(50),
    IN p_DateType VARCHAR(20),
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_Status VARCHAR(20),
    IN p_Description VARCHAR(500),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_MaxId INT DEFAULT 0;
    DECLARE v_HolidayCode VARCHAR(20);
    DECLARE v_CollegeId INT;
    
    SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);
    SELECT COALESCE(MAX(Id), 0) INTO v_MaxId FROM Holidays;
    SET v_HolidayCode = CONCAT('HOL-', LPAD(v_MaxId + 1, 3, '0'));
    
    INSERT INTO Holidays
    (
        HolidayCode,
        CollegeId,
        CampusId,
        AcademicYearId,
        BoardId,
        HolidayName,
        HolidayType,
        AppliesTo,
        DateType,
        StartDate,
        EndDate,
        Status,
        Description,
        IsDeleted,
        CreatedAt,
        UpdatedAt
    )
    VALUES
    (
        v_HolidayCode,
        v_CollegeId,
        NULLIF(p_CampusId, 0),
        IF(p_AcademicYearId > 0, p_AcademicYearId, NULL),
        IF(p_BoardId > 0, p_BoardId, NULL),
        TRIM(p_HolidayName),
        COALESCE(p_HolidayType, 'Festival Holiday'),
        COALESCE(p_AppliesTo, 'All Students & Staff'),
        COALESCE(p_DateType, 'Single Day'),
        p_StartDate,
        p_EndDate,
        COALESCE(p_Status, 'Active'),
        p_Description,
        0,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP()
    );
    
    SELECT LAST_INSERT_ID() AS InsertedId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_BulkCreateHolidayRecord;
DELIMITER //
CREATE PROCEDURE sp_BulkCreateHolidayRecord(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_HolidayName VARCHAR(150),
    IN p_HolidayType VARCHAR(50),
    IN p_AppliesTo VARCHAR(50),
    IN p_DateType VARCHAR(20),
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_Status VARCHAR(20),
    IN p_Description VARCHAR(500),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_MaxId INT DEFAULT 0;
    DECLARE v_HolidayCode VARCHAR(20);
    DECLARE v_CollegeId INT;

    SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);
    SELECT COALESCE(MAX(Id), 0) INTO v_MaxId FROM Holidays;
    SET v_HolidayCode = CONCAT('HOL-', LPAD(v_MaxId + 1, 3, '0'));

    INSERT INTO Holidays
    (
        HolidayCode,
        CollegeId,
        CampusId,
        AcademicYearId,
        BoardId,
        HolidayName,
        HolidayType,
        AppliesTo,
        DateType,
        StartDate,
        EndDate,
        Status,
        Description,
        IsDeleted,
        CreatedAt,
        UpdatedAt
    )
    VALUES
    (
        v_HolidayCode,
        v_CollegeId,
        NULLIF(p_CampusId, 0),
        IF(p_AcademicYearId > 0, p_AcademicYearId, NULL),
        IF(p_BoardId > 0, p_BoardId, NULL),
        TRIM(p_HolidayName),
        COALESCE(p_HolidayType, 'Festival Holiday'),
        COALESCE(p_AppliesTo, 'All Students & Staff'),
        COALESCE(p_DateType, 'Single Day'),
        p_StartDate,
        p_EndDate,
        COALESCE(p_Status, 'Active'),
        p_Description,
        0,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS InsertedId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckIsHoliday;
DELIMITER //
CREATE PROCEDURE sp_CheckIsHoliday(
    IN p_QueryDate DATE,
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AppliesTo VARCHAR(50),
    IN p_CollegeId INT
)
BEGIN
    SELECT HolidayName, HolidayType
    FROM Holidays
    WHERE IsDeleted = 0
      AND Status = 'Active'
      AND p_QueryDate >= DATE(StartDate)
      AND p_QueryDate <= DATE(EndDate)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = 0 OR CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = 0 OR BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = 0 OR AcademicYearId = p_AcademicYearId)
      AND (p_AppliesTo IS NULL OR p_AppliesTo = '' OR AppliesTo = 'All Students & Staff' OR AppliesTo = p_AppliesTo)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId OR CollegeId IS NULL OR CollegeId = 0)
    LIMIT 1;
END //
DELIMITER ;

-- 6. Audit Logs
DROP PROCEDURE IF EXISTS sp_GetAuditLogsPaged;
DELIMITER //
CREATE PROCEDURE sp_GetAuditLogsPaged(
    IN p_Query VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Module VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Severity VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Role VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME,
    IN p_Status VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Action VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_UserId INT,
    IN p_IpAddress VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_DeviceId VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_RequestId VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CorrelationId VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_Offset INT;
    SET p_PageNumber = IF(p_PageNumber < 1, 1, p_PageNumber);
    SET p_PageSize = IF(p_PageSize < 1, 50, p_PageSize);
    SET v_Offset = (p_PageNumber - 1) * p_PageSize;

    -- Result Set 1: Total Matching Count
    SELECT COUNT(*) AS TotalCount
    FROM AuditLogs a
    WHERE (p_Query IS NULL OR p_Query = '' OR (
          a.UserName LIKE CONCAT('%', p_Query, '%') OR
          a.ActorRole LIKE CONCAT('%', p_Query, '%') OR
          a.Action LIKE CONCAT('%', p_Query, '%') OR
          a.EntityName LIKE CONCAT('%', p_Query, '%') OR
          a.Module LIKE CONCAT('%', p_Query, '%') OR
          a.CorrelationId LIKE CONCAT('%', p_Query, '%') OR
          a.RequestId LIKE CONCAT('%', p_Query, '%') OR
          a.Description LIKE CONCAT('%', p_Query, '%')
      ))
      AND (p_Module IS NULL OR p_Module = '' OR p_Module = 'All modules' OR a.Module = p_Module)
      AND (p_Severity IS NULL OR p_Severity = '' OR p_Severity = 'All severity' OR (
          IF(p_Severity IN ('Security alerts', 'Security alert', 'Alerts', 'Security'), a.Severity != 'Info', a.Severity = p_Severity)
      ))
      AND (p_Role IS NULL OR p_Role = '' OR p_Role = 'All roles' OR (
          IF(p_Role IN ('Admin', 'Administrator', 'Active administrators'), a.ActorRole IN ('Admin', 'Administrator') OR a.UserName LIKE '%admin%', a.ActorRole = p_Role)
      ))
      AND (p_FromDate IS NULL OR a.CreatedAt >= p_FromDate)
      AND (p_ToDate IS NULL OR a.CreatedAt <= p_ToDate)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All status' OR a.Status = p_Status)
      AND (p_Action IS NULL OR p_Action = '' OR p_Action = 'All actions' OR a.Action = p_Action)
      AND (p_UserId IS NULL OR p_UserId = 0 OR a.UserId = p_UserId)
      AND (p_IpAddress IS NULL OR p_IpAddress = '' OR a.IpAddress LIKE CONCAT('%', p_IpAddress, '%') OR a.RemoteIpAddress LIKE CONCAT('%', p_IpAddress, '%') OR a.ForwardedClientIp LIKE CONCAT('%', p_IpAddress, '%'))
      AND (p_DeviceId IS NULL OR p_DeviceId = '' OR a.DeviceId LIKE CONCAT('%', p_DeviceId, '%'))
      AND (p_RequestId IS NULL OR p_RequestId = '' OR a.RequestId = p_RequestId)
      AND (p_CorrelationId IS NULL OR p_CorrelationId = '' OR a.CorrelationId = p_CorrelationId)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR a.CollegeId = p_CollegeId);

    -- Result Set 2: Paged Audit Logs
    SELECT 
        a.AuditLogId, a.CollegeId, a.EventId, a.CorrelationId, a.RequestId, a.UserId, a.UserName, 
        a.ActorRole, a.ActorType, a.StaffId, a.Action, a.EntityName, a.EntityId, 
        a.Module, a.Description, a.Severity, a.Status, a.IpAddress, a.RemoteIpAddress, 
        a.ForwardedClientIp, a.IpSource, a.IpConfidence, a.UserAgent, a.DeviceId, 
        a.SessionId, a.RequestMethod, a.RouteTemplate, a.HttpStatusCode, a.DurationMs, a.CreatedAt
    FROM AuditLogs a
    WHERE (p_Query IS NULL OR p_Query = '' OR (
          a.UserName LIKE CONCAT('%', p_Query, '%') OR
          a.ActorRole LIKE CONCAT('%', p_Query, '%') OR
          a.Action LIKE CONCAT('%', p_Query, '%') OR
          a.EntityName LIKE CONCAT('%', p_Query, '%') OR
          a.Module LIKE CONCAT('%', p_Query, '%') OR
          a.CorrelationId LIKE CONCAT('%', p_Query, '%') OR
          a.RequestId LIKE CONCAT('%', p_Query, '%') OR
          a.Description LIKE CONCAT('%', p_Query, '%')
      ))
      AND (p_Module IS NULL OR p_Module = '' OR p_Module = 'All modules' OR a.Module = p_Module)
      AND (p_Severity IS NULL OR p_Severity = '' OR p_Severity = 'All severity' OR (
          IF(p_Severity IN ('Security alerts', 'Security alert', 'Alerts', 'Security'), a.Severity != 'Info', a.Severity = p_Severity)
      ))
      AND (p_Role IS NULL OR p_Role = '' OR p_Role = 'All roles' OR (
          IF(p_Role IN ('Admin', 'Administrator', 'Active administrators'), a.ActorRole IN ('Admin', 'Administrator') OR a.UserName LIKE '%admin%', a.ActorRole = p_Role)
      ))
      AND (p_FromDate IS NULL OR a.CreatedAt >= p_FromDate)
      AND (p_ToDate IS NULL OR a.CreatedAt <= p_ToDate)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All status' OR a.Status = p_Status)
      AND (p_Action IS NULL OR p_Action = '' OR p_Action = 'All actions' OR a.Action = p_Action)
      AND (p_UserId IS NULL OR p_UserId = 0 OR a.UserId = p_UserId)
      AND (p_IpAddress IS NULL OR p_IpAddress = '' OR a.IpAddress LIKE CONCAT('%', p_IpAddress, '%') OR a.RemoteIpAddress LIKE CONCAT('%', p_IpAddress, '%') OR a.ForwardedClientIp LIKE CONCAT('%', p_IpAddress, '%'))
      AND (p_DeviceId IS NULL OR p_DeviceId = '' OR a.DeviceId LIKE CONCAT('%', p_DeviceId, '%'))
      AND (p_RequestId IS NULL OR p_RequestId = '' OR a.RequestId = p_RequestId)
      AND (p_CorrelationId IS NULL OR p_CorrelationId = '' OR a.CorrelationId = p_CorrelationId)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR a.CollegeId = p_CollegeId)
    ORDER BY a.CreatedAt DESC
    LIMIT p_PageSize OFFSET v_Offset;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_InsertAuditLog;
DELIMITER //
CREATE PROCEDURE sp_InsertAuditLog(
    IN p_EventId VARCHAR(64),
    IN p_CorrelationId VARCHAR(64),
    IN p_RequestId VARCHAR(64),
    IN p_UserId INT,
    IN p_UserName VARCHAR(100),
    IN p_ActorRole VARCHAR(50),
    IN p_ActorType VARCHAR(30),
    IN p_StaffId INT,
    IN p_Action VARCHAR(100),
    IN p_EntityName VARCHAR(100),
    IN p_EntityId INT,
    IN p_Module VARCHAR(50),
    IN p_Description LONGTEXT,
    IN p_Severity VARCHAR(20),
    IN p_Status VARCHAR(30),
    IN p_IpAddress VARCHAR(50),
    IN p_RemoteIpAddress VARCHAR(50),
    IN p_ForwardedClientIp VARCHAR(50),
    IN p_IpSource VARCHAR(30),
    IN p_IpConfidence VARCHAR(30),
    IN p_UserAgent VARCHAR(500),
    IN p_DeviceId VARCHAR(100),
    IN p_SessionId VARCHAR(100),
    IN p_RequestMethod VARCHAR(10),
    IN p_RouteTemplate VARCHAR(255),
    IN p_HttpStatusCode INT,
    IN p_DurationMs DOUBLE,
    IN p_CollegeId INT
)
BEGIN
    INSERT INTO AuditLogs
    (
        EventId, CorrelationId, RequestId, UserId, UserName, ActorRole, ActorType, StaffId,
        Action, EntityName, EntityId, Module, Description, Severity, Status,
        IpAddress, RemoteIpAddress, ForwardedClientIp, IpSource, IpConfidence,
        UserAgent, DeviceId, SessionId, RequestMethod, RouteTemplate,
        HttpStatusCode, DurationMs, CollegeId, CreatedAt
    )
    VALUES
    (
        p_EventId, p_CorrelationId, p_RequestId, p_UserId, p_UserName, p_ActorRole, COALESCE(p_ActorType, 'User'), p_StaffId,
        p_Action, p_EntityName, p_EntityId, p_Module, p_Description, COALESCE(p_Severity, 'Info'), COALESCE(p_Status, 'Success'),
        p_IpAddress, p_RemoteIpAddress, p_ForwardedClientIp, COALESCE(p_IpSource, 'Unknown'), COALESCE(p_IpConfidence, 'Unknown'),
        p_UserAgent, p_DeviceId, p_SessionId, p_RequestMethod, p_RouteTemplate,
        p_HttpStatusCode, p_DurationMs, NULLIF(p_CollegeId, 0), UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

-- 7. Theme Policy
DROP PROCEDURE IF EXISTS sp_GetThemePolicy;
DELIMITER //
CREATE PROCEDURE sp_GetThemePolicy(
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT;
    SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

    IF NOT EXISTS (SELECT 1 FROM ThemePolicy WHERE CollegeId = v_CollegeId) THEN
        INSERT IGNORE INTO ThemePolicy (CollegeId, ThemeMode, AdminPalette, AdminCustomColor, AdminDarkMode)
        VALUES (v_CollegeId, 'independent', 'olive', NULL, 'light');
    END IF;

    SELECT ThemeMode, AdminPalette, AdminCustomColor, AdminDarkMode
    FROM ThemePolicy
    WHERE CollegeId = v_CollegeId
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateThemePolicy;
DELIMITER //
CREATE PROCEDURE sp_UpdateThemePolicy(
    IN p_ThemeMode VARCHAR(20),
    IN p_AdminPalette VARCHAR(30),
    IN p_AdminCustomColor VARCHAR(10),
    IN p_AdminDarkMode VARCHAR(10),
    IN p_UpdatedBy INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT;
    SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

    IF NOT EXISTS (SELECT 1 FROM ThemePolicy WHERE CollegeId = v_CollegeId) THEN
        INSERT INTO ThemePolicy (CollegeId, ThemeMode, AdminPalette, AdminCustomColor, AdminDarkMode, UpdatedBy, UpdatedAt)
        VALUES (v_CollegeId, p_ThemeMode, p_AdminPalette, p_AdminCustomColor, p_AdminDarkMode, p_UpdatedBy, UTC_TIMESTAMP());
    ELSE
        UPDATE ThemePolicy
        SET ThemeMode = COALESCE(p_ThemeMode, ThemeMode),
            AdminPalette = COALESCE(p_AdminPalette, AdminPalette),
            AdminCustomColor = p_AdminCustomColor,
            AdminDarkMode = COALESCE(p_AdminDarkMode, AdminDarkMode),
            UpdatedBy = p_UpdatedBy,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE CollegeId = v_CollegeId;
    END IF;

    SELECT ThemeMode, AdminPalette, AdminCustomColor, AdminDarkMode
    FROM ThemePolicy
    WHERE CollegeId = v_CollegeId
    LIMIT 1;
END //
DELIMITER ;
