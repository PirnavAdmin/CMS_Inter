-- =====================================================================================
-- File: Number_Series_Configurations.sql
-- Module: Settings -> ID & Number Series Configuration
-- Target Items: Employee ID, Admission No., Certificate Number, Receipt No.
-- Description: Table DDL, Initial Seed Data, and Stored Procedures for Number Series
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Table Creation: NumberSeriesConfigurations
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `NumberSeriesConfigurations` (
    `Id` INT AUTO_INCREMENT PRIMARY KEY,
    `SeriesCode` VARCHAR(50) NOT NULL UNIQUE,
    `SeriesName` VARCHAR(100) NOT NULL,
    `Prefix` VARCHAR(20) NOT NULL,
    `FormatPattern` VARCHAR(100) NOT NULL,
    `NumberLength` INT NOT NULL DEFAULT 4,
    `StartNumber` INT NOT NULL DEFAULT 1,
    `CurrentSequence` INT NOT NULL DEFAULT 0,
    `Description` VARCHAR(500) NULL,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_numseries_code` (`SeriesCode`),
    INDEX `idx_numseries_active` (`IsActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- 2. Database Seeding: Initial Mock Data for the 4 Target Series
-- Matching UI Dashboard & Edit Screen states
-- -------------------------------------------------------------------------------------
INSERT IGNORE INTO `NumberSeriesConfigurations` 
    (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `IsActive`)
VALUES 
    (
        'EMPLOYEE_ID', 
        'Employee ID', 
        'PCTCH', 
        'PCTCH{SEQ}', 
        4, 
        1, 
        39, 
        'Configure employee ID format for teaching and non-teaching staff.', 
        1
    ),
    (
        'ADMISSION_NO', 
        'Admission No.', 
        'ADM', 
        'ADM-{SEQ}', 
        2, 
        1, 
        17, 
        'Configure admission number format for students.', 
        1
    ),
    (
        'CERTIFICATE_NO', 
        'Certificate Number', 
        'CND', 
        'CND-{YEAR}-{RANDOM}', 
        6, 
        1, 
        1, 
        'Configure certificate number format for generated certificates.', 
        1
    ),
    (
        'RECEIPT_NO', 
        'Receipt No.', 
        'FEE', 
        'FEE-{YYYYMMDD}-{SEQ}', 
        6, 
        1, 
        11, 
        'Configure receipt number format for fee collections.', 
        1
    );

-- -------------------------------------------------------------------------------------
-- 3. Stored Procedure: sp_GetNumberSeriesConfigurations
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetNumberSeriesConfigurations`;
DELIMITER $$
CREATE PROCEDURE `sp_GetNumberSeriesConfigurations`()
BEGIN
    SELECT 
        `Id`,
        `SeriesCode`,
        `SeriesName`,
        `Prefix`,
        `FormatPattern`,
        `NumberLength`,
        `StartNumber`,
        `CurrentSequence`,
        `Description`,
        `IsActive`,
        `CreatedAt`,
        `UpdatedAt`
    FROM `NumberSeriesConfigurations`
    WHERE `IsActive` = 1
    ORDER BY `Id` ASC;
END $$
DELIMITER ;

-- -------------------------------------------------------------------------------------
-- 4. Stored Procedure: sp_GetNumberSeriesByCode
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetNumberSeriesByCode`;
DELIMITER $$
CREATE PROCEDURE `sp_GetNumberSeriesByCode`(
    IN p_SeriesCode VARCHAR(50)
)
BEGIN
    SELECT 
        `Id`,
        `SeriesCode`,
        `SeriesName`,
        `Prefix`,
        `FormatPattern`,
        `NumberLength`,
        `StartNumber`,
        `CurrentSequence`,
        `Description`,
        `IsActive`,
        `CreatedAt`,
        `UpdatedAt`
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = p_SeriesCode
    LIMIT 1;
END $$
DELIMITER ;

-- -------------------------------------------------------------------------------------
-- 5. Stored Procedure: sp_UpdateNumberSeriesByCode
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateNumberSeriesByCode`;
DELIMITER $$
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
    SET 
        `Prefix` = p_Prefix,
        `FormatPattern` = p_FormatPattern,
        `NumberLength` = p_NumberLength,
        `StartNumber` = p_StartNumber,
        `Description` = p_Description,
        `UpdatedAt` = CURRENT_TIMESTAMP
    WHERE `SeriesCode` = p_SeriesCode;

    SELECT 
        `Id`,
        `SeriesCode`,
        `SeriesName`,
        `Prefix`,
        `FormatPattern`,
        `NumberLength`,
        `StartNumber`,
        `CurrentSequence`,
        `Description`,
        `IsActive`,
        `CreatedAt`,
        `UpdatedAt`
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = p_SeriesCode
    LIMIT 1;
END $$
DELIMITER ;

-- -------------------------------------------------------------------------------------
-- 6. Stored Procedure: sp_GenerateNextNumberSeries (Atomic sequence increment)
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GenerateNextNumberSeries`;
DELIMITER $$
CREATE PROCEDURE `sp_GenerateNextNumberSeries`(
    IN p_SeriesCode VARCHAR(50)
)
BEGIN
    DECLARE v_CurrentSeq INT DEFAULT 0;
    DECLARE v_StartNum INT DEFAULT 1;
    DECLARE v_NextSeq INT DEFAULT 1;

    -- Row level locking for concurrency safety
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
    SET 
        `CurrentSequence` = v_NextSeq,
        `UpdatedAt` = CURRENT_TIMESTAMP
    WHERE `SeriesCode` = p_SeriesCode;

    SELECT 
        `Id`,
        `SeriesCode`,
        `SeriesName`,
        `Prefix`,
        `FormatPattern`,
        `NumberLength`,
        `StartNumber`,
        `CurrentSequence`,
        `Description`,
        `IsActive`,
        `CreatedAt`,
        `UpdatedAt`
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = p_SeriesCode
    LIMIT 1;
END $$
DELIMITER ;
