-- =========================================================================
-- MODULE: Settings_SPs
-- Generated on: 2026-09-23T10:39:03.298Z
-- =========================================================================

USE `u819242402_CLM_System`;

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_CreateAttendanceTimingConfig` //
CREATE PROCEDURE `sp_CreateAttendanceTimingConfig`(
    IN p_ConfigName VARCHAR(100),
    IN p_StaffType TINYINT UNSIGNED,
    IN p_DepartmentId INT,
    IN p_WorkStartTime TIME,
    IN p_WorkEndTime TIME,
    IN p_LateThreshold TIME,
    IN p_EarlyCheckoutThreshold TIME,
    IN p_GracePeriodMinutes INT,
    IN p_MinWorkingHours DECIMAL(4, 2),
    IN p_IsActive TINYINT(1),
    IN p_Description VARCHAR(500)
)
BEGIN
    INSERT INTO `AttendanceTimingConfigs`
    (`ConfigName`, `StaffType`, `DepartmentId`, `WorkStartTime`, `WorkEndTime`, `LateThreshold`, `EarlyCheckoutThreshold`, `GracePeriodMinutes`, `MinWorkingHours`, `IsActive`, `Description`, `CreatedAt`)
    VALUES
    (TRIM(p_ConfigName), p_StaffType, IF(p_DepartmentId > 0, p_DepartmentId, NULL), p_WorkStartTime, p_WorkEndTime, p_LateThreshold, p_EarlyCheckoutThreshold, COALESCE(p_GracePeriodMinutes, 5), COALESCE(p_MinWorkingHours, 7.00), COALESCE(p_IsActive, 1), p_Description, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `sp_DeleteAttendanceTimingConfig` //
CREATE PROCEDURE `sp_DeleteAttendanceTimingConfig`(
    IN p_Id INT
)
BEGIN
    DELETE FROM `AttendanceTimingConfigs` WHERE `Id` = p_Id;
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_GenerateNextNumberSeries` //
CREATE PROCEDURE `sp_GenerateNextNumberSeries`(
    IN p_SeriesCode VARCHAR(50)
)
BEGIN
    DECLARE v_CurrentSeq INT;
    DECLARE v_StartNum INT;
    DECLARE v_NextSeq INT;

    SELECT `CurrentSequence`, `StartNumber`
    INTO v_CurrentSeq, v_StartNum
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = p_SeriesCode
    FOR UPDATE;

    IF v_CurrentSeq < v_StartNum THEN
        SET v_NextSeq = v_StartNum;
    ELSE
        SET v_NextSeq = v_CurrentSeq + 1;
    END IF;

    UPDATE `NumberSeriesConfigurations`
    SET `CurrentSequence` = v_NextSeq,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `SeriesCode` = p_SeriesCode;

    SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
           `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
           `IsActive`, `CreatedAt`, `UpdatedAt`
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = p_SeriesCode;
END //

DROP PROCEDURE IF EXISTS `sp_GetAttendanceTimingConfigById` //
CREATE PROCEDURE `sp_GetAttendanceTimingConfigById`(
    IN p_Id INT
)
BEGIN
    SELECT * 
    FROM `AttendanceTimingConfigs` 
    WHERE Id = p_Id 
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetAttendanceTimingConfigs` //
CREATE PROCEDURE `sp_GetAttendanceTimingConfigs`()
BEGIN
    SELECT * 
    FROM `AttendanceTimingConfigs` 
    ORDER BY Id ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetEffectiveAttendanceTimingConfig` //
CREATE PROCEDURE `sp_GetEffectiveAttendanceTimingConfig`(
    IN p_StaffType TINYINT UNSIGNED,
    IN p_DepartmentId INT
)
BEGIN
    SELECT * 
    FROM `AttendanceTimingConfigs`
    WHERE IsActive = 1
      AND (p_StaffType IS NULL OR StaffType = p_StaffType OR StaffType IS NULL)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR DepartmentId = p_DepartmentId OR DepartmentId IS NULL)
    ORDER BY 
      (CASE WHEN StaffType = p_StaffType AND DepartmentId = p_DepartmentId THEN 1
            WHEN DepartmentId = p_DepartmentId AND StaffType IS NULL THEN 2
            WHEN StaffType = p_StaffType AND DepartmentId IS NULL THEN 3
            WHEN StaffType IS NULL AND DepartmentId IS NULL THEN 4
            ELSE 5 END) ASC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetNumberSeriesByCode` //
CREATE PROCEDURE `sp_GetNumberSeriesByCode`(
        IN p_SeriesCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    )
BEGIN
        SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
               `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
               `IsActive`, `CreatedAt`, `UpdatedAt`
        FROM `NumberSeriesConfigurations`
        WHERE `SeriesCode` = p_SeriesCode
        LIMIT 1;
    END //

DROP PROCEDURE IF EXISTS `sp_GetNumberSeriesConfigurations` //
CREATE PROCEDURE `sp_GetNumberSeriesConfigurations`()
BEGIN
    SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
           `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
           `IsActive`, `CreatedAt`, `UpdatedAt`
    FROM `NumberSeriesConfigurations`
    WHERE `IsActive` = 1
    ORDER BY `Id` ASC;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateAttendanceTimingConfig` //
CREATE PROCEDURE `sp_UpdateAttendanceTimingConfig`(
    IN p_Id INT,
    IN p_ConfigName VARCHAR(100),
    IN p_StaffType TINYINT UNSIGNED,
    IN p_DepartmentId INT,
    IN p_WorkStartTime TIME,
    IN p_WorkEndTime TIME,
    IN p_LateThreshold TIME,
    IN p_EarlyCheckoutThreshold TIME,
    IN p_GracePeriodMinutes INT,
    IN p_MinWorkingHours DECIMAL(4, 2),
    IN p_IsActive TINYINT(1),
    IN p_Description VARCHAR(500)
)
BEGIN
    UPDATE `AttendanceTimingConfigs`
    SET `ConfigName` = TRIM(p_ConfigName),
        `StaffType` = p_StaffType,
        `DepartmentId` = IF(p_DepartmentId > 0, p_DepartmentId, NULL),
        `WorkStartTime` = p_WorkStartTime,
        `WorkEndTime` = p_WorkEndTime,
        `LateThreshold` = p_LateThreshold,
        `EarlyCheckoutThreshold` = p_EarlyCheckoutThreshold,
        `GracePeriodMinutes` = COALESCE(p_GracePeriodMinutes, 5),
        `MinWorkingHours` = COALESCE(p_MinWorkingHours, 7.00),
        `IsActive` = COALESCE(p_IsActive, 1),
        `Description` = p_Description,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
    
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_UpdateNumberSeriesByCode` //
CREATE PROCEDURE `sp_UpdateNumberSeriesByCode`(
    IN p_SeriesCode VARCHAR(50),
    IN p_Prefix VARCHAR(20),
    IN p_FormatPattern VARCHAR(100),
    IN p_NumberLength INT,
    IN p_StartNumber INT,
    IN p_Description VARCHAR(500)
)
BEGIN
    UPDATE `NumberSeriesConfigurations`
    SET `Prefix` = p_Prefix,
        `FormatPattern` = p_FormatPattern,
        `NumberLength` = p_NumberLength,
        `StartNumber` = p_StartNumber,
        `Description` = p_Description,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `SeriesCode` = p_SeriesCode;
    
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `usp_AddAcademicYear` //
CREATE PROCEDURE `usp_AddAcademicYear`(
    IN p_AcademicYearName VARCHAR(50),
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_AdmissionStartDate DATE,
    IN p_AdmissionEndDate DATE,
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO AcademicYears (AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive)
    VALUES (p_AcademicYearName, p_StartDate, p_EndDate, p_AdmissionStartDate, p_AdmissionEndDate, p_IsActive);
    SELECT LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `usp_DeleteAcademicYear` //
CREATE PROCEDURE `usp_DeleteAcademicYear`(IN p_AcademicYearId INT)
BEGIN
    DELETE FROM AcademicYears WHERE AcademicYearId = p_AcademicYearId;
END //

DROP PROCEDURE IF EXISTS `usp_GetAcademicYearById` //
CREATE PROCEDURE `usp_GetAcademicYearById`(IN p_Id INT)
BEGIN
    SELECT AcademicYearId, AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive
    FROM AcademicYears
    WHERE AcademicYearId = p_Id;
END //

DROP PROCEDURE IF EXISTS `usp_GetActiveAcademicYear` //
CREATE PROCEDURE `usp_GetActiveAcademicYear`()
BEGIN
    SELECT AcademicYearId, AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive
    FROM AcademicYears
    WHERE IsActive = 1
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `usp_GetAllAcademicYears` //
CREATE PROCEDURE `usp_GetAllAcademicYears`()
BEGIN
    SELECT AcademicYearId, AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive
    FROM AcademicYears
    ORDER BY AcademicYearId DESC;
END //

DROP PROCEDURE IF EXISTS `usp_UpdateAcademicYear` //
CREATE PROCEDURE `usp_UpdateAcademicYear`(
    IN p_AcademicYearId INT,
    IN p_AcademicYearName VARCHAR(50),
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_AdmissionStartDate DATE,
    IN p_AdmissionEndDate DATE,
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE AcademicYears
    SET AcademicYearName = p_AcademicYearName,
        StartDate = p_StartDate,
        EndDate = p_EndDate,
        AdmissionStartDate = p_AdmissionStartDate,
        AdmissionEndDate = p_AdmissionEndDate,
        IsActive = p_IsActive
    WHERE AcademicYearId = p_AcademicYearId;
END //

DELIMITER ;
