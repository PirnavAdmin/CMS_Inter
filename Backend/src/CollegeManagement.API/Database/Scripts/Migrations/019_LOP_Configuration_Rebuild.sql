-- ====================================================================================================
-- Migration 019: LOP (Loss of Pay) Configuration End-to-End Rebuild & Payroll Integration
-- Safe, idempotent migration script for CollegeManagement (MySQL 8.0 / Aiven).
-- ====================================================================================================

DROP PROCEDURE IF EXISTS `sp_Tmp_AddColIfMissing`;
CREATE PROCEDURE `sp_Tmp_AddColIfMissing`(
    IN p_TableName VARCHAR(64),
    IN p_ColName VARCHAR(64),
    IN p_ColDef TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_TableName AND COLUMN_NAME = p_ColName
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_TableName, '` ADD COLUMN `', p_ColName, '` ', p_ColDef);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END;

DROP PROCEDURE IF EXISTS `sp_Tmp_AddIdxIfMissing`;
CREATE PROCEDURE `sp_Tmp_AddIdxIfMissing`(
    IN p_TableName VARCHAR(64),
    IN p_IdxName VARCHAR(64),
    IN p_IdxCols VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_TableName AND INDEX_NAME = p_IdxName
    ) THEN
        SET @ddl = CONCAT('CREATE INDEX `', p_IdxName, '` ON `', p_TableName, '` (', p_IdxCols, ')');
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END;

-- 1. Extend LopPolicies with Campus/StaffType Scoping, Timing Sync, Absence/HalfDay Rules & Formula Basis
CALL `sp_Tmp_AddColIfMissing`('LopPolicies', 'CampusId', 'INT NULL');
CALL `sp_Tmp_AddColIfMissing`('LopPolicies', 'StaffType', 'VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''All''');
CALL `sp_Tmp_AddColIfMissing`('LopPolicies', 'UseShiftTimingConfig', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL `sp_Tmp_AddColIfMissing`('LopPolicies', 'AbsentLopEnabled', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL `sp_Tmp_AddColIfMissing`('LopPolicies', 'AbsentPenaltyDays', 'DECIMAL(3,1) NOT NULL DEFAULT 1.0');
CALL `sp_Tmp_AddColIfMissing`('LopPolicies', 'CountUnmarkedWorkingDaysAsAbsent', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL `sp_Tmp_AddColIfMissing`('LopPolicies', 'HalfDayLopEnabled', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL `sp_Tmp_AddColIfMissing`('LopPolicies', 'HalfDayPenaltyDays', 'DECIMAL(3,1) NOT NULL DEFAULT 0.5');
CALL `sp_Tmp_AddColIfMissing`('LopPolicies', 'DeductionComponent', 'VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''Gross''');
CALL `sp_Tmp_AddColIfMissing`('LopPolicies', 'RoundingMode', 'VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''Exact''');
CALL `sp_Tmp_AddColIfMissing`('LopPolicies', 'MaxLopDaysPerMonth', 'DECIMAL(4,1) NULL');
CALL `sp_Tmp_AddColIfMissing`('LopPolicies', 'AutoApplyToPayroll', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL `sp_Tmp_AddIdxIfMissing`('LopPolicies', 'IX_LopPolicies_Campus_StaffType', '`CampusId`, `StaffType`');

-- Ensure at least one Global Default policy exists
INSERT INTO `LopPolicies` (
    `IsEnabled`, `AppliesTo`, `ShiftStart`, `GraceMinutes`, `AllowedLateLogins`,
    `LateLoginsPerPenalty`, `PenaltyDays`, `Basis`, `EffectiveFrom`,
    `MissedCheckoutLopEnabled`, `AllowedMissedCheckouts`, `MissedCheckoutsPerPenalty`, `MissedCheckoutPenaltyDays`,
    `CampusId`, `StaffType`, `UseShiftTimingConfig`, `AbsentLopEnabled`, `AbsentPenaltyDays`,
    `CountUnmarkedWorkingDaysAsAbsent`, `HalfDayLopEnabled`, `HalfDayPenaltyDays`,
    `DeductionComponent`, `RoundingMode`, `MaxLopDaysPerMonth`, `AutoApplyToPayroll`, `CreatedAt`
)
SELECT
    1, 'All college staff — all departments', '09:00', 10, 2,
    3, 0.5, 'calendar', DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m'),
    1, 0, 1, 0.5,
    NULL, 'All', 1, 1, 1.0,
    1, 1, 0.5,
    'Gross', 'Exact', NULL, 1, UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM `LopPolicies`);

-- 2. Extend LopStaffRecords with Campus, Basis Component, Source Tracking & Breakdown
CALL `sp_Tmp_AddColIfMissing`('LopStaffRecords', 'CampusId', 'INT NULL');
CALL `sp_Tmp_AddColIfMissing`('LopStaffRecords', 'DeductionComponent', 'VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''Gross''');
CALL `sp_Tmp_AddColIfMissing`('LopStaffRecords', 'Source', 'VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''Manual''');
CALL `sp_Tmp_AddColIfMissing`('LopStaffRecords', 'LatePenaltyDays', 'DECIMAL(4,1) NOT NULL DEFAULT 0.0');
CALL `sp_Tmp_AddColIfMissing`('LopStaffRecords', 'MissedCheckoutPenaltyDays', 'DECIMAL(4,1) NOT NULL DEFAULT 0.0');
CALL `sp_Tmp_AddColIfMissing`('LopStaffRecords', 'AbsentDays', 'DECIMAL(4,1) NOT NULL DEFAULT 0.0');
CALL `sp_Tmp_AddColIfMissing`('LopStaffRecords', 'HalfDays', 'INT NOT NULL DEFAULT 0');
CALL `sp_Tmp_AddColIfMissing`('LopStaffRecords', 'Status', 'VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ''Active''');
CALL `sp_Tmp_AddColIfMissing`('LopStaffRecords', 'UpdatedByUserId', 'INT NULL');
CALL `sp_Tmp_AddIdxIfMissing`('LopStaffRecords', 'IX_LopStaffRecords_Month_Campus_Status', '`Month`, `CampusId`, `IsDeleted`, `Status`');
CALL `sp_Tmp_AddIdxIfMissing`('LopStaffRecords', 'IX_LopStaffRecords_StaffId_Month', '`StaffId`, `Month`, `IsDeleted`');

DROP PROCEDURE IF EXISTS `sp_Tmp_AddColIfMissing`;
DROP PROCEDURE IF EXISTS `sp_Tmp_AddIdxIfMissing`;

-- Backfill CampusId on existing LopStaffRecords from Staff if any
UPDATE `LopStaffRecords` r
INNER JOIN `Staff` s ON CAST(r.`StaffId` AS UNSIGNED) = s.`Id`
SET r.`CampusId` = s.`CampusId`
WHERE r.`CampusId` IS NULL;

-- 3. Stored Procedures for LOP Configuration
DROP PROCEDURE IF EXISTS `sp_LopPolicy_Get`;
CREATE PROCEDURE `sp_LopPolicy_Get`()
BEGIN
    SELECT
        PolicyId,
        CampusId,
        StaffType,
        IsEnabled AS Enabled,
        AppliesTo,
        ShiftStart,
        GraceMinutes,
        AllowedLateLogins,
        LateLoginsPerPenalty,
        PenaltyDays,
        Basis,
        EffectiveFrom,
        MissedCheckoutLopEnabled,
        AllowedMissedCheckouts,
        MissedCheckoutsPerPenalty,
        MissedCheckoutPenaltyDays,
        UseShiftTimingConfig,
        AbsentLopEnabled,
        AbsentPenaltyDays,
        CountUnmarkedWorkingDaysAsAbsent,
        HalfDayLopEnabled,
        HalfDayPenaltyDays,
        DeductionComponent,
        RoundingMode,
        MaxLopDaysPerMonth,
        AutoApplyToPayroll,
        CreatedAt,
        UpdatedAt
    FROM `LopPolicies`
    ORDER BY (CampusId IS NULL) DESC, (StaffType = 'All') DESC, PolicyId DESC
    LIMIT 1;
END;

DROP PROCEDURE IF EXISTS `sp_LopPolicy_GetByScope`;
CREATE PROCEDURE `sp_LopPolicy_GetByScope`(
    IN p_CampusId INT,
    IN p_StaffType VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE v_StaffType VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    SET v_StaffType = COALESCE(NULLIF(TRIM(p_StaffType), ''), 'All');

    SELECT
        PolicyId,
        CampusId,
        StaffType,
        IsEnabled AS Enabled,
        AppliesTo,
        ShiftStart,
        GraceMinutes,
        AllowedLateLogins,
        LateLoginsPerPenalty,
        PenaltyDays,
        Basis,
        EffectiveFrom,
        MissedCheckoutLopEnabled,
        AllowedMissedCheckouts,
        MissedCheckoutsPerPenalty,
        MissedCheckoutPenaltyDays,
        UseShiftTimingConfig,
        AbsentLopEnabled,
        AbsentPenaltyDays,
        CountUnmarkedWorkingDaysAsAbsent,
        HalfDayLopEnabled,
        HalfDayPenaltyDays,
        DeductionComponent,
        RoundingMode,
        MaxLopDaysPerMonth,
        AutoApplyToPayroll,
        CreatedAt,
        UpdatedAt
    FROM `LopPolicies`
    WHERE (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId OR CampusId IS NULL OR CampusId = 0)
      AND (StaffType = v_StaffType OR StaffType = 'All')
    ORDER BY
        CASE WHEN CampusId = p_CampusId THEN 1 ELSE 0 END DESC,
        CASE WHEN StaffType = v_StaffType THEN 1 ELSE 0 END DESC,
        PolicyId DESC
    LIMIT 1;
END;

DROP PROCEDURE IF EXISTS `sp_LopPolicy_GetAll`;
CREATE PROCEDURE `sp_LopPolicy_GetAll`()
BEGIN
    SELECT
        lp.PolicyId,
        lp.CampusId,
        COALESCE(c.CampusName, 'Global Default (All Campuses)') AS CampusName,
        lp.StaffType,
        lp.IsEnabled AS Enabled,
        lp.AppliesTo,
        lp.ShiftStart,
        lp.GraceMinutes,
        lp.AllowedLateLogins,
        lp.LateLoginsPerPenalty,
        lp.PenaltyDays,
        lp.Basis,
        lp.EffectiveFrom,
        lp.MissedCheckoutLopEnabled,
        lp.AllowedMissedCheckouts,
        lp.MissedCheckoutsPerPenalty,
        lp.MissedCheckoutPenaltyDays,
        lp.UseShiftTimingConfig,
        lp.AbsentLopEnabled,
        lp.AbsentPenaltyDays,
        lp.CountUnmarkedWorkingDaysAsAbsent,
        lp.HalfDayLopEnabled,
        lp.HalfDayPenaltyDays,
        lp.DeductionComponent,
        lp.RoundingMode,
        lp.MaxLopDaysPerMonth,
        lp.AutoApplyToPayroll,
        lp.CreatedAt,
        lp.UpdatedAt
    FROM `LopPolicies` lp
    LEFT JOIN `Campuses` c ON c.CampusId = lp.CampusId
    ORDER BY (lp.CampusId IS NULL) DESC, lp.CampusId ASC, (lp.StaffType = 'All') DESC, lp.PolicyId DESC;
END;

DROP PROCEDURE IF EXISTS `sp_LopPolicy_Save`;
CREATE PROCEDURE `sp_LopPolicy_Save`(
    IN p_CampusId INT,
    IN p_StaffType VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_IsEnabled TINYINT,
    IN p_ShiftStart VARCHAR(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_GraceMinutes INT,
    IN p_AllowedLateLogins INT,
    IN p_LateLoginsPerPenalty INT,
    IN p_PenaltyDays DECIMAL(5,2),
    IN p_Basis VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_EffectiveFrom VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_UpdatedByUserId INT,
    IN p_MissedCheckoutLopEnabled TINYINT,
    IN p_AllowedMissedCheckouts INT,
    IN p_MissedCheckoutsPerPenalty INT,
    IN p_MissedCheckoutPenaltyDays DECIMAL(5,2),
    IN p_UseShiftTimingConfig TINYINT,
    IN p_AbsentLopEnabled TINYINT,
    IN p_AbsentPenaltyDays DECIMAL(5,2),
    IN p_CountUnmarkedWorkingDaysAsAbsent TINYINT,
    IN p_HalfDayLopEnabled TINYINT,
    IN p_HalfDayPenaltyDays DECIMAL(5,2),
    IN p_DeductionComponent VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_RoundingMode VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_MaxLopDaysPerMonth DECIMAL(5,2),
    IN p_AutoApplyToPayroll TINYINT
)
BEGIN
    DECLARE v_PolicyId INT DEFAULT NULL;
    DECLARE v_NormCampusId INT DEFAULT NULL;
    DECLARE v_StaffType VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_AppliesTo VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_CampusName VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

    SET v_NormCampusId = IF(p_CampusId IS NULL OR p_CampusId <= 0, NULL, p_CampusId);
    SET v_StaffType = COALESCE(NULLIF(TRIM(p_StaffType), ''), 'All');

    IF v_NormCampusId IS NOT NULL THEN
        SELECT CampusName INTO v_CampusName FROM `Campuses` WHERE CampusId = v_NormCampusId LIMIT 1;
        SET v_AppliesTo = CONCAT(COALESCE(v_CampusName, CONCAT('Campus #', v_NormCampusId)), ' — ', IF(v_StaffType = 'All', 'All staff', CONCAT(v_StaffType, ' staff')));
    ELSE
        SET v_AppliesTo = IF(v_StaffType = 'All', 'All college staff — all departments', CONCAT('All campuses — ', v_StaffType, ' staff'));
    END IF;

    SELECT PolicyId INTO v_PolicyId
    FROM `LopPolicies`
    WHERE ((v_NormCampusId IS NULL AND (CampusId IS NULL OR CampusId = 0)) OR CampusId = v_NormCampusId)
      AND StaffType = v_StaffType
    ORDER BY PolicyId DESC
    LIMIT 1;

    IF v_PolicyId IS NOT NULL THEN
        UPDATE `LopPolicies`
        SET IsEnabled = COALESCE(p_IsEnabled, 1),
            AppliesTo = v_AppliesTo,
            ShiftStart = COALESCE(NULLIF(TRIM(p_ShiftStart), ''), '09:00'),
            GraceMinutes = COALESCE(p_GraceMinutes, 10),
            AllowedLateLogins = COALESCE(p_AllowedLateLogins, 2),
            LateLoginsPerPenalty = GREATEST(1, COALESCE(p_LateLoginsPerPenalty, 3)),
            PenaltyDays = COALESCE(p_PenaltyDays, 0.5),
            Basis = COALESCE(NULLIF(TRIM(p_Basis), ''), 'calendar'),
            EffectiveFrom = COALESCE(NULLIF(TRIM(p_EffectiveFrom), ''), DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m')),
            MissedCheckoutLopEnabled = COALESCE(p_MissedCheckoutLopEnabled, 1),
            AllowedMissedCheckouts = COALESCE(p_AllowedMissedCheckouts, 0),
            MissedCheckoutsPerPenalty = GREATEST(1, COALESCE(p_MissedCheckoutsPerPenalty, 1)),
            MissedCheckoutPenaltyDays = COALESCE(p_MissedCheckoutPenaltyDays, 0.5),
            UseShiftTimingConfig = COALESCE(p_UseShiftTimingConfig, 1),
            AbsentLopEnabled = COALESCE(p_AbsentLopEnabled, 1),
            AbsentPenaltyDays = COALESCE(p_AbsentPenaltyDays, 1.0),
            CountUnmarkedWorkingDaysAsAbsent = COALESCE(p_CountUnmarkedWorkingDaysAsAbsent, 1),
            HalfDayLopEnabled = COALESCE(p_HalfDayLopEnabled, 1),
            HalfDayPenaltyDays = COALESCE(p_HalfDayPenaltyDays, 0.5),
            DeductionComponent = COALESCE(NULLIF(TRIM(p_DeductionComponent), ''), 'Gross'),
            RoundingMode = COALESCE(NULLIF(TRIM(p_RoundingMode), ''), 'Exact'),
            MaxLopDaysPerMonth = p_MaxLopDaysPerMonth,
            AutoApplyToPayroll = COALESCE(p_AutoApplyToPayroll, 1),
            UpdatedByUserId = p_UpdatedByUserId,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE PolicyId = v_PolicyId;
    ELSE
        INSERT INTO `LopPolicies` (
            CampusId, StaffType, IsEnabled, AppliesTo, ShiftStart, GraceMinutes, AllowedLateLogins,
            LateLoginsPerPenalty, PenaltyDays, Basis, EffectiveFrom,
            MissedCheckoutLopEnabled, AllowedMissedCheckouts, MissedCheckoutsPerPenalty, MissedCheckoutPenaltyDays,
            UseShiftTimingConfig, AbsentLopEnabled, AbsentPenaltyDays, CountUnmarkedWorkingDaysAsAbsent,
            HalfDayLopEnabled, HalfDayPenaltyDays, DeductionComponent, RoundingMode, MaxLopDaysPerMonth,
            AutoApplyToPayroll, UpdatedByUserId, CreatedAt, UpdatedAt
        ) VALUES (
            v_NormCampusId, v_StaffType, COALESCE(p_IsEnabled, 1), v_AppliesTo,
            COALESCE(NULLIF(TRIM(p_ShiftStart), ''), '09:00'), COALESCE(p_GraceMinutes, 10), COALESCE(p_AllowedLateLogins, 2),
            GREATEST(1, COALESCE(p_LateLoginsPerPenalty, 3)), COALESCE(p_PenaltyDays, 0.5),
            COALESCE(NULLIF(TRIM(p_Basis), ''), 'calendar'), COALESCE(NULLIF(TRIM(p_EffectiveFrom), ''), DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m')),
            COALESCE(p_MissedCheckoutLopEnabled, 1), COALESCE(p_AllowedMissedCheckouts, 0),
            GREATEST(1, COALESCE(p_MissedCheckoutsPerPenalty, 1)), COALESCE(p_MissedCheckoutPenaltyDays, 0.5),
            COALESCE(p_UseShiftTimingConfig, 1), COALESCE(p_AbsentLopEnabled, 1), COALESCE(p_AbsentPenaltyDays, 1.0),
            COALESCE(p_CountUnmarkedWorkingDaysAsAbsent, 1), COALESCE(p_HalfDayLopEnabled, 1), COALESCE(p_HalfDayPenaltyDays, 0.5),
            COALESCE(NULLIF(TRIM(p_DeductionComponent), ''), 'Gross'), COALESCE(NULLIF(TRIM(p_RoundingMode), ''), 'Exact'),
            p_MaxLopDaysPerMonth, COALESCE(p_AutoApplyToPayroll, 1), p_UpdatedByUserId, UTC_TIMESTAMP(), UTC_TIMESTAMP()
        );
        SET v_PolicyId = LAST_INSERT_ID();
    END IF;

    SELECT
        PolicyId,
        CampusId,
        StaffType,
        IsEnabled AS Enabled,
        AppliesTo,
        ShiftStart,
        GraceMinutes,
        AllowedLateLogins,
        LateLoginsPerPenalty,
        PenaltyDays,
        Basis,
        EffectiveFrom,
        MissedCheckoutLopEnabled,
        AllowedMissedCheckouts,
        MissedCheckoutsPerPenalty,
        MissedCheckoutPenaltyDays,
        UseShiftTimingConfig,
        AbsentLopEnabled,
        AbsentPenaltyDays,
        CountUnmarkedWorkingDaysAsAbsent,
        HalfDayLopEnabled,
        HalfDayPenaltyDays,
        DeductionComponent,
        RoundingMode,
        MaxLopDaysPerMonth,
        AutoApplyToPayroll,
        CreatedAt,
        UpdatedAt
    FROM `LopPolicies`
    WHERE PolicyId = v_PolicyId;
END;

DROP PROCEDURE IF EXISTS `sp_LopPolicy_DeleteOverride`;
CREATE PROCEDURE `sp_LopPolicy_DeleteOverride`(
    IN p_PolicyId INT
)
BEGIN
    DELETE FROM `LopPolicies`
    WHERE PolicyId = p_PolicyId
      AND NOT ((CampusId IS NULL OR CampusId = 0) AND StaffType = 'All');

    SELECT ROW_COUNT() AS AffectedRows;
END;

DROP PROCEDURE IF EXISTS `sp_LopStaffRecords_GetAll`;
CREATE PROCEDURE `sp_LopStaffRecords_GetAll`(
    IN p_Month VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_SearchTerm VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT,
    IN p_Source VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    SELECT
        r.Id,
        r.StaffId,
        r.EmployeeId,
        r.StaffName AS Name,
        r.Department,
        COALESCE(r.CampusId, s.CampusId) AS CampusId,
        COALESCE(c.CampusName, 'Main Campus') AS CampusName,
        r.Month,
        r.MonthlySalary,
        r.LopDays,
        r.Basis,
        COALESCE(r.DeductionComponent, 'Gross') AS DeductionComponent,
        r.PeriodDays,
        r.Deduction,
        r.SalaryAfterLop,
        r.Reason,
        COALESCE(r.Source, 'Manual') AS Source,
        COALESCE(r.LatePenaltyDays, 0.0) AS LatePenaltyDays,
        COALESCE(r.MissedCheckoutPenaltyDays, 0.0) AS MissedCheckoutPenaltyDays,
        COALESCE(r.AbsentDays, 0.0) AS AbsentDays,
        COALESCE(r.HalfDays, 0) AS HalfDays,
        COALESCE(r.Status, 'Active') AS Status,
        r.CreatedAt,
        r.UpdatedAt
    FROM `LopStaffRecords` r
    LEFT JOIN `Staff` s ON CAST(r.StaffId AS UNSIGNED) = s.Id
    LEFT JOIN `Campuses` c ON c.CampusId = COALESCE(r.CampusId, s.CampusId)
    WHERE r.IsDeleted = 0
      AND (p_Month IS NULL OR p_Month = '' OR r.Month = p_Month)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR COALESCE(r.CampusId, s.CampusId) = p_CampusId)
      AND (p_Source IS NULL OR p_Source = '' OR COALESCE(r.Source, 'Manual') = p_Source)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR (
          r.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR
          r.StaffName LIKE CONCAT('%', p_SearchTerm, '%') OR
          r.Department LIKE CONCAT('%', p_SearchTerm, '%') OR
          r.Reason LIKE CONCAT('%', p_SearchTerm, '%')
      ))
    ORDER BY r.Id DESC;
END;

DROP PROCEDURE IF EXISTS `sp_LopStaffRecord_GetById`;
CREATE PROCEDURE `sp_LopStaffRecord_GetById`(
    IN p_Id INT
)
BEGIN
    SELECT
        r.Id,
        r.StaffId,
        r.EmployeeId,
        r.StaffName AS Name,
        r.Department,
        COALESCE(r.CampusId, s.CampusId) AS CampusId,
        COALESCE(c.CampusName, 'Main Campus') AS CampusName,
        r.Month,
        r.MonthlySalary,
        r.LopDays,
        r.Basis,
        COALESCE(r.DeductionComponent, 'Gross') AS DeductionComponent,
        r.PeriodDays,
        r.Deduction,
        r.SalaryAfterLop,
        r.Reason,
        COALESCE(r.Source, 'Manual') AS Source,
        COALESCE(r.LatePenaltyDays, 0.0) AS LatePenaltyDays,
        COALESCE(r.MissedCheckoutPenaltyDays, 0.0) AS MissedCheckoutPenaltyDays,
        COALESCE(r.AbsentDays, 0.0) AS AbsentDays,
        COALESCE(r.HalfDays, 0) AS HalfDays,
        COALESCE(r.Status, 'Active') AS Status,
        r.CreatedAt,
        r.UpdatedAt
    FROM `LopStaffRecords` r
    LEFT JOIN `Staff` s ON CAST(r.StaffId AS UNSIGNED) = s.Id
    LEFT JOIN `Campuses` c ON c.CampusId = COALESCE(r.CampusId, s.CampusId)
    WHERE r.Id = p_Id AND r.IsDeleted = 0
    LIMIT 1;
END;

DROP PROCEDURE IF EXISTS `sp_LopStaffRecords_GetKpis`;
CREATE PROCEDURE `sp_LopStaffRecords_GetKpis`(
    IN p_Month VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    SELECT
        COUNT(DISTINCT CASE WHEN COALESCE(r.Status, 'Active') <> 'Waived' THEN r.StaffId END) AS StaffWithLop,
        COALESCE(SUM(CASE WHEN COALESCE(r.Status, 'Active') <> 'Waived' THEN r.LopDays ELSE 0 END), 0) AS TotalLopDays,
        COALESCE(SUM(CASE WHEN COALESCE(r.Status, 'Active') <> 'Waived' THEN r.Deduction ELSE 0 END), 0) AS TotalDeduction
    FROM `LopStaffRecords` r
    LEFT JOIN `Staff` s ON CAST(r.StaffId AS UNSIGNED) = s.Id
    WHERE r.IsDeleted = 0
      AND (p_Month IS NULL OR p_Month = '' OR r.Month = p_Month)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR COALESCE(r.CampusId, s.CampusId) = p_CampusId);
END;

DROP PROCEDURE IF EXISTS `sp_LopStaffRecord_Save`;
CREATE PROCEDURE `sp_LopStaffRecord_Save`(
    IN p_StaffId INT,
    IN p_EmployeeId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_StaffName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Department VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT,
    IN p_Month VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_MonthlySalary DECIMAL(12,2),
    IN p_LopDays DECIMAL(5,2),
    IN p_Basis VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_DeductionComponent VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_PeriodDays INT,
    IN p_Deduction DECIMAL(12,2),
    IN p_SalaryAfterLop DECIMAL(12,2),
    IN p_Reason VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Source VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_LatePenaltyDays DECIMAL(4,1),
    IN p_MissedCheckoutPenaltyDays DECIMAL(4,1),
    IN p_AbsentDays DECIMAL(4,1),
    IN p_HalfDays INT,
    IN p_Status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CreatedByUserId INT
)
BEGIN
    DECLARE v_ExistingId INT DEFAULT NULL;
    DECLARE v_Source VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    SET v_Source = COALESCE(NULLIF(TRIM(p_Source), ''), 'Manual');

    IF v_Source = 'AutoAttendance' THEN
        SELECT Id INTO v_ExistingId
        FROM `LopStaffRecords`
        WHERE CAST(StaffId AS UNSIGNED) = p_StaffId
          AND Month = p_Month
          AND Source = 'AutoAttendance'
          AND IsDeleted = 0
        ORDER BY Id DESC
        LIMIT 1;
    END IF;

    IF v_ExistingId IS NOT NULL THEN
        UPDATE `LopStaffRecords`
        SET CampusId = p_CampusId,
            MonthlySalary = p_MonthlySalary,
            LopDays = p_LopDays,
            Basis = p_Basis,
            DeductionComponent = COALESCE(NULLIF(TRIM(p_DeductionComponent), ''), 'Gross'),
            PeriodDays = p_PeriodDays,
            Deduction = p_Deduction,
            SalaryAfterLop = p_SalaryAfterLop,
            Reason = p_Reason,
            LatePenaltyDays = COALESCE(p_LatePenaltyDays, 0.0),
            MissedCheckoutPenaltyDays = COALESCE(p_MissedCheckoutPenaltyDays, 0.0),
            AbsentDays = COALESCE(p_AbsentDays, 0.0),
            HalfDays = COALESCE(p_HalfDays, 0),
            Status = IF(Status = 'Waived', 'Waived', COALESCE(NULLIF(TRIM(p_Status), ''), 'Active')),
            UpdatedByUserId = p_CreatedByUserId,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE Id = v_ExistingId;

        SELECT v_ExistingId;
    ELSE
        INSERT INTO `LopStaffRecords` (
            StaffId, EmployeeId, StaffName, Department, CampusId, Month, MonthlySalary,
            LopDays, Basis, DeductionComponent, PeriodDays, Deduction, SalaryAfterLop,
            Reason, Source, LatePenaltyDays, MissedCheckoutPenaltyDays, AbsentDays, HalfDays,
            Status, IsDeleted, CreatedAt, CreatedByUserId
        ) VALUES (
            CAST(p_StaffId AS CHAR), p_EmployeeId, p_StaffName, p_Department, p_CampusId, p_Month, p_MonthlySalary,
            p_LopDays, p_Basis, COALESCE(NULLIF(TRIM(p_DeductionComponent), ''), 'Gross'), p_PeriodDays, p_Deduction, p_SalaryAfterLop,
            p_Reason, v_Source, COALESCE(p_LatePenaltyDays, 0.0), COALESCE(p_MissedCheckoutPenaltyDays, 0.0),
            COALESCE(p_AbsentDays, 0.0), COALESCE(p_HalfDays, 0),
            COALESCE(NULLIF(TRIM(p_Status), ''), 'Active'), 0, UTC_TIMESTAMP(), p_CreatedByUserId
        );

        SELECT LAST_INSERT_ID();
    END IF;
END;

DROP PROCEDURE IF EXISTS `sp_LopStaffRecord_Update`;
CREATE PROCEDURE `sp_LopStaffRecord_Update`(
    IN p_Id INT,
    IN p_LopDays DECIMAL(5,2),
    IN p_Basis VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_DeductionComponent VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_PeriodDays INT,
    IN p_Deduction DECIMAL(12,2),
    IN p_SalaryAfterLop DECIMAL(12,2),
    IN p_Reason VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_UpdatedByUserId INT
)
BEGIN
    UPDATE `LopStaffRecords`
    SET LopDays = p_LopDays,
        Basis = p_Basis,
        DeductionComponent = COALESCE(NULLIF(TRIM(p_DeductionComponent), ''), DeductionComponent),
        PeriodDays = p_PeriodDays,
        Deduction = p_Deduction,
        SalaryAfterLop = p_SalaryAfterLop,
        Reason = p_Reason,
        Status = COALESCE(NULLIF(TRIM(p_Status), ''), Status),
        UpdatedAt = UTC_TIMESTAMP(),
        UpdatedByUserId = p_UpdatedByUserId
    WHERE Id = p_Id AND IsDeleted = 0;

    SELECT ROW_COUNT();
END;

DROP PROCEDURE IF EXISTS `sp_LopStaffRecord_UpdateStatus`;
CREATE PROCEDURE `sp_LopStaffRecord_UpdateStatus`(
    IN p_Id INT,
    IN p_Status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Reason VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_UpdatedByUserId INT
)
BEGIN
    UPDATE `LopStaffRecords`
    SET Status = p_Status,
        Reason = COALESCE(NULLIF(TRIM(p_Reason), ''), Reason),
        UpdatedAt = UTC_TIMESTAMP(),
        UpdatedByUserId = p_UpdatedByUserId
    WHERE Id = p_Id AND IsDeleted = 0;

    SELECT ROW_COUNT();
END;

DROP PROCEDURE IF EXISTS `sp_LopStaffRecord_Delete`;
CREATE PROCEDURE `sp_LopStaffRecord_Delete`(
    IN p_Id INT,
    IN p_DeletedByUserId INT
)
BEGIN
    UPDATE `LopStaffRecords`
    SET IsDeleted = 1,
        UpdatedByUserId = p_DeletedByUserId,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_Id;

    SELECT ROW_COUNT();
END;

DROP PROCEDURE IF EXISTS `sp_LopStaffList_Get`;
CREATE PROCEDURE `sp_LopStaffList_Get`(
    IN p_CampusId INT
)
BEGIN
    SELECT
        CAST(s.Id AS CHAR) AS StaffId,
        s.EmployeeId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS Name,
        COALESCE(NULLIF(TRIM(d.DepartmentName), ''), 'General') AS Department,
        s.DepartmentId,
        COALESCE(NULLIF(TRIM(s.StaffType), ''), 'Teaching') AS StaffType,
        s.CampusId,
        COALESCE(c.CampusName, 'Unassigned') AS CampusName,
        s.JoiningDate,
        CASE WHEN pst.Id IS NOT NULL THEN 1 ELSE 0 END AS HasSalaryStructure,
        COALESCE(pst.StructureName, '') AS SalaryStructureName,
        COALESCE(pst.BasicPay, 0.00) AS BasicPay,
        COALESCE(
            pst.BasicPay + pst.HRA + pst.DA + pst.ConveyanceAllowance + pst.MedicalAllowance + pst.OtherAllowance,
            0.00
        ) AS Salary
    FROM `Staff` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN (
        SELECT pss1.StaffId, pss1.SalaryStructureId
        FROM `payroll_staff_salaries` pss1
        INNER JOIN (
            SELECT StaffId, MAX(Id) AS MaxId
            FROM `payroll_staff_salaries`
            WHERE Status = 'Active'
            GROUP BY StaffId
        ) latest ON latest.MaxId = pss1.Id
    ) pss ON pss.StaffId = s.Id
    LEFT JOIN `payroll_salary_structures` pst ON pst.Id = pss.SalaryStructureId
    WHERE s.IsDeleted = 0
      AND (s.Status = 'Active' OR s.Status IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
    ORDER BY s.FirstName, s.LastName;
END;

-- 4. Update Payroll Stored Procedures so LOP Days & Deduction Apply to Payslips E2E
DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_Generate`;
CREATE PROCEDURE `sp_PayrollPayslip_Generate`(
    IN p_StaffId INT,
    IN p_PayrollMonth INT,
    IN p_PayrollYear INT,
    IN p_LopDays DECIMAL(18,2),
    IN p_LopDeduction DECIMAL(18,2)
)
BEGIN
    DECLARE v_StructureId INT;
    DECLARE v_BasicPay DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_HRA DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_DA DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Conveyance DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Medical DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Other DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_PF DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_PT DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_TDS DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_ESI DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Insurance DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Gross DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_LopDays DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_LopDeduction DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Deductions DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_Net DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_PayslipId INT DEFAULT NULL;
    DECLARE v_BonusAmount DECIMAL(18,2) DEFAULT 0.00;
    DECLARE v_AdvanceDeduction DECIMAL(18,2) DEFAULT 0.00;

    SET v_LopDays = GREATEST(0.00, COALESCE(p_LopDays, 0.00));
    SET v_LopDeduction = GREATEST(0.00, COALESCE(p_LopDeduction, 0.00));

    SELECT
        pss.`Id`, pss.`BasicPay`, pss.`HRA`, pss.`DA`,
        pss.`ConveyanceAllowance`, pss.`MedicalAllowance`, pss.`OtherAllowance`,
        pss.`PF`, pss.`ProfessionalTax`, pss.`TDS`, pss.`ESI`, pss.`InsuranceOtherDeduction`
    INTO
        v_StructureId, v_BasicPay, v_HRA, v_DA,
        v_Conveyance, v_Medical, v_Other,
        v_PF, v_PT, v_TDS, v_ESI, v_Insurance
    FROM `payroll_staff_salaries` psa
    JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE psa.`StaffId` = p_StaffId AND psa.`Status` = 'Active'
    ORDER BY psa.`Id` DESC
    LIMIT 1;

    IF v_StructureId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Staff does not have an active salary structure assigned.';
    END IF;

    SELECT COALESCE(SUM(`Amount`), 0.00) INTO v_BonusAmount
    FROM `payroll_bonuses`
    WHERE `StaffId` = p_StaffId
      AND `BonusMonth` = p_PayrollMonth
      AND `BonusYear` = p_PayrollYear
      AND `Status` = 'Approved';

    SELECT COALESCE(SUM(`MonthlyDeduction`), 0.00) INTO v_AdvanceDeduction
    FROM `payroll_advances`
    WHERE `StaffId` = p_StaffId
      AND `Status` = 'Approved'
      AND ((`StartYear` < p_PayrollYear) OR (`StartYear` = p_PayrollYear AND `StartMonth` <= p_PayrollMonth));

    SET v_Gross = v_BasicPay + v_HRA + v_DA + v_Conveyance + v_Medical + v_Other + v_BonusAmount;
    SET v_Deductions = v_PF + v_PT + v_TDS + v_ESI + v_Insurance + v_AdvanceDeduction + v_LopDeduction;
    SET v_Net = GREATEST(0.00, v_Gross - v_Deductions);

    SELECT `PayslipId` INTO v_PayslipId
    FROM `payroll_payslips`
    WHERE `StaffId` = p_StaffId AND `PayrollMonth` = p_PayrollMonth AND `PayrollYear` = p_PayrollYear
    LIMIT 1;

    IF v_PayslipId IS NOT NULL THEN
        UPDATE `payroll_payslips`
        SET `SalaryStructureId` = v_StructureId,
            `BasicPay` = v_BasicPay, `HRA` = v_HRA, `DA` = v_DA,
            `ConveyanceAllowance` = v_Conveyance, `MedicalAllowance` = v_Medical, `OtherAllowance` = v_Other + v_BonusAmount,
            `PF` = v_PF, `ProfessionalTax` = v_PT, `TDS` = v_TDS, `ESI` = v_ESI, `InsuranceOtherDeduction` = v_Insurance + v_AdvanceDeduction,
            `LopDays` = v_LopDays, `LopDeduction` = v_LopDeduction,
            `GrossSalary` = v_Gross, `TotalDeductions` = v_Deductions, `NetSalary` = v_Net,
            `PayslipStatus` = 'Generated', `GeneratedAt` = NOW()
        WHERE `PayslipId` = v_PayslipId;
    ELSE
        INSERT INTO `payroll_payslips` (
            `StaffId`, `SalaryStructureId`, `PayrollMonth`, `PayrollYear`,
            `BasicPay`, `HRA`, `DA`, `ConveyanceAllowance`, `MedicalAllowance`, `OtherAllowance`,
            `PF`, `ProfessionalTax`, `TDS`, `ESI`, `InsuranceOtherDeduction`,
            `LopDays`, `LopDeduction`,
            `GrossSalary`, `TotalDeductions`, `NetSalary`, `PayslipStatus`, `GeneratedAt`
        ) VALUES (
            p_StaffId, v_StructureId, p_PayrollMonth, p_PayrollYear,
            v_BasicPay, v_HRA, v_DA, v_Conveyance, v_Medical, v_Other + v_BonusAmount,
            v_PF, v_PT, v_TDS, v_ESI, v_Insurance + v_AdvanceDeduction,
            v_LopDays, v_LopDeduction,
            v_Gross, v_Deductions, v_Net, 'Generated', NOW()
        );
        SET v_PayslipId = LAST_INSERT_ID();
    END IF;

    SELECT v_PayslipId AS Id;
END;

DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_GetHistory`;
CREATE PROCEDURE `sp_PayrollPayslip_GetHistory`(
    IN p_PayrollMonth INT,
    IN p_PayrollYear INT,
    IN p_StaffType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    SELECT
        pp.`PayslipId`,
        pp.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`StaffType`,
        s.`DepartmentId`,
        COALESCE(d.`DepartmentName`, '') AS `DepartmentName`,
        s.`DesignationId`,
        COALESCE(s.`Designation`, '') AS `Designation`,
        pp.`PayrollMonth`,
        pp.`PayrollYear`,
        pp.`SalaryStructureId`,
        COALESCE(pss.`StructureName`, '') AS `StructureName`,
        pp.`BasicPay`,
        pp.`HRA`,
        pp.`DA`,
        pp.`ConveyanceAllowance`,
        pp.`MedicalAllowance`,
        pp.`OtherAllowance`,
        pp.`PF`,
        pp.`ProfessionalTax`,
        pp.`TDS`,
        pp.`ESI`,
        pp.`InsuranceOtherDeduction`,
        COALESCE(pp.`LopDays`, 0.00) AS `LopDays`,
        COALESCE(pp.`LopDeduction`, 0.00) AS `LopDeduction`,
        pp.`GrossSalary`,
        pp.`TotalDeductions`,
        pp.`NetSalary`,
        pp.`PayslipStatus`,
        pp.`GeneratedAt`
    FROM `payroll_payslips` pp
    INNER JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = pp.`SalaryStructureId`
    WHERE (s.`IsDeleted` = 0 OR s.`IsDeleted` IS NULL)
      AND (p_PayrollMonth IS NULL OR p_PayrollMonth = 0 OR pp.`PayrollMonth` = p_PayrollMonth)
      AND (p_PayrollYear IS NULL OR p_PayrollYear = 0 OR pp.`PayrollYear` = p_PayrollYear)
      AND (p_StaffType IS NULL OR p_StaffType = '' OR s.`StaffType` = p_StaffType)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.`CampusId` = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' OR
           s.`EmployeeId` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           CONCAT(s.`FirstName`, ' ', s.`LastName`) LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY pp.`PayrollYear` DESC, pp.`PayrollMonth` DESC, pp.`PayslipId` DESC;
END;

DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_GetById`;
CREATE PROCEDURE `sp_PayrollPayslip_GetById`(
    IN p_PayslipId INT
)
BEGIN
    SELECT
        pp.`PayslipId`,
        pp.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`StaffType`,
        s.`DepartmentId`,
        COALESCE(d.`DepartmentName`, '') AS `DepartmentName`,
        s.`DesignationId`,
        COALESCE(s.`Designation`, '') AS `Designation`,
        pp.`PayrollMonth`,
        pp.`PayrollYear`,
        pp.`SalaryStructureId`,
        COALESCE(pss.`StructureName`, '') AS `StructureName`,
        pp.`BasicPay`,
        pp.`HRA`,
        pp.`DA`,
        pp.`ConveyanceAllowance`,
        pp.`MedicalAllowance`,
        pp.`OtherAllowance`,
        pp.`PF`,
        pp.`ProfessionalTax`,
        pp.`TDS`,
        pp.`ESI`,
        pp.`InsuranceOtherDeduction`,
        COALESCE(pp.`LopDays`, 0.00) AS `LopDays`,
        COALESCE(pp.`LopDeduction`, 0.00) AS `LopDeduction`,
        pp.`GrossSalary`,
        pp.`TotalDeductions`,
        pp.`NetSalary`,
        pp.`PayslipStatus`,
        pp.`GeneratedAt`
    FROM `payroll_payslips` pp
    INNER JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = pp.`SalaryStructureId`
    WHERE pp.`PayslipId` = p_PayslipId;
END;

DROP PROCEDURE IF EXISTS `sp_PayrollPayslip_GetEmailDetails`;
CREATE PROCEDURE `sp_PayrollPayslip_GetEmailDetails`(
    IN p_PayslipId INT
)
BEGIN
    SELECT
        pp.`PayslipId`,
        pp.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        COALESCE(s.`Email`, '') AS `Email`,
        pp.`PayrollMonth`,
        pp.`PayrollYear`,
        COALESCE(pp.`LopDays`, 0.00) AS `LopDays`,
        COALESCE(pp.`LopDeduction`, 0.00) AS `LopDeduction`,
        pp.`GrossSalary`,
        pp.`TotalDeductions`,
        pp.`NetSalary`,
        pp.`PayslipStatus`
    FROM `payroll_payslips` pp
    INNER JOIN `Staffs` s ON s.`Id` = pp.`StaffId`
    WHERE pp.`PayslipId` = p_PayslipId;
END;
