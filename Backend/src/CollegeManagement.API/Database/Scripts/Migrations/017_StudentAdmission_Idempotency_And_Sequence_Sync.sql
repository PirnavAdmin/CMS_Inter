-- =============================================================================
-- Migration 017: Student Admission Persistent Idempotency & Sequence Sync
-- Creates StudentAdmissionIdempotencyRecords table and hardened stored procedures
-- =============================================================================

CREATE TABLE IF NOT EXISTS `StudentAdmissionIdempotencyRecords` (
    `Id` BIGINT NOT NULL AUTO_INCREMENT,
    `IdempotencyKey` VARCHAR(128) NOT NULL,
    `CampusId` INT NULL,
    `CreatedByUserId` INT NULL,
    `RequestHash` CHAR(64) NOT NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    `AdmissionId` INT NULL,
    `AdmissionNo` VARCHAR(50) NULL,
    `HttpStatusCode` INT NULL,
    `ResponseJson` LONGTEXT NULL,
    `ErrorMessage` VARCHAR(1000) NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `ExpiresAt` DATETIME(6) NOT NULL,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UX_AdmissionIdempotency_Key` (`IdempotencyKey`),
    KEY `IX_AdmissionIdempotency_AdmissionId` (`AdmissionId`),
    KEY `IX_AdmissionIdempotency_CreatedAt` (`CreatedAt`),
    KEY `IX_AdmissionIdempotency_Hash_Created` (`RequestHash`, `CreatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER //

-- =============================================================================
-- 1. TRY BEGIN / RECLAIM ADMISSION IDEMPOTENCY LOCK
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_TryBeginAdmissionIdempotency`//
CREATE PROCEDURE `sp_TryBeginAdmissionIdempotency`
(
    IN p_IdempotencyKey VARCHAR(128),
    IN p_CampusId INT,
    IN p_CreatedByUserId INT,
    IN p_RequestHash CHAR(64),
    IN p_ExpiresAt DATETIME(6)
)
BEGIN
    DECLARE v_Inserted INT DEFAULT 0;
    DECLARE v_Reclaimed INT DEFAULT 0;

    INSERT IGNORE INTO `StudentAdmissionIdempotencyRecords`
    (
        `IdempotencyKey`,
        `CampusId`,
        `CreatedByUserId`,
        `RequestHash`,
        `Status`,
        `CreatedAt`,
        `UpdatedAt`,
        `ExpiresAt`
    )
    VALUES
    (
        TRIM(p_IdempotencyKey),
        p_CampusId,
        p_CreatedByUserId,
        p_RequestHash,
        'IN_PROGRESS',
        UTC_TIMESTAMP(6),
        UTC_TIMESTAMP(6),
        p_ExpiresAt
    );

    SET v_Inserted = ROW_COUNT();

    IF v_Inserted = 0 THEN
        -- Reclaim only if same payload hash previously failed with transient 5xx or abandoned in-progress (> 5 min)
        UPDATE `StudentAdmissionIdempotencyRecords`
        SET `Status` = 'IN_PROGRESS',
            `ErrorMessage` = NULL,
            `HttpStatusCode` = NULL,
            `UpdatedAt` = UTC_TIMESTAMP(6),
            `ExpiresAt` = p_ExpiresAt
        WHERE `IdempotencyKey` = TRIM(p_IdempotencyKey)
          AND `RequestHash` = p_RequestHash
          AND `AdmissionId` IS NULL
          AND (
              (`Status` = 'FAILED' AND COALESCE(`HttpStatusCode`, 500) >= 500)
              OR (`Status` = 'IN_PROGRESS' AND `UpdatedAt` < DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 5 MINUTE))
          );

        SET v_Reclaimed = ROW_COUNT();
    END IF;

    SELECT
        IF(v_Inserted = 1 OR v_Reclaimed = 1, 1, 0) AS LockAcquired,
        `Id`,
        `IdempotencyKey`,
        `CampusId`,
        `CreatedByUserId`,
        `RequestHash`,
        `Status`,
        `AdmissionId`,
        `AdmissionNo`,
        `HttpStatusCode`,
        `ResponseJson`,
        `ErrorMessage`,
        `CreatedAt`,
        `UpdatedAt`,
        `ExpiresAt`
    FROM `StudentAdmissionIdempotencyRecords`
    WHERE `IdempotencyKey` = TRIM(p_IdempotencyKey)
    LIMIT 1;
END //

-- =============================================================================
-- 2. COMPLETE ADMISSION IDEMPOTENCY RECORD (RUNS INSIDE ADMISSION TX)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_CompleteAdmissionIdempotency`//
CREATE PROCEDURE `sp_CompleteAdmissionIdempotency`
(
    IN p_IdempotencyKey VARCHAR(128),
    IN p_AdmissionId INT,
    IN p_AdmissionNo VARCHAR(50),
    IN p_HttpStatusCode INT,
    IN p_ResponseJson LONGTEXT
)
BEGIN
    UPDATE `StudentAdmissionIdempotencyRecords`
    SET `Status` = 'COMPLETED',
        `AdmissionId` = p_AdmissionId,
        `AdmissionNo` = NULLIF(TRIM(p_AdmissionNo), ''),
        `HttpStatusCode` = COALESCE(p_HttpStatusCode, 201),
        `ResponseJson` = p_ResponseJson,
        `ErrorMessage` = NULL,
        `UpdatedAt` = UTC_TIMESTAMP(6)
    WHERE `IdempotencyKey` = TRIM(p_IdempotencyKey);

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 3. FAIL ADMISSION IDEMPOTENCY RECORD (RUNS AFTER TX ROLLBACK)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_FailAdmissionIdempotency`//
CREATE PROCEDURE `sp_FailAdmissionIdempotency`
(
    IN p_IdempotencyKey VARCHAR(128),
    IN p_HttpStatusCode INT,
    IN p_ErrorMessage VARCHAR(1000)
)
BEGIN
    UPDATE `StudentAdmissionIdempotencyRecords`
    SET `Status` = 'FAILED',
        `AdmissionId` = NULL,
        `AdmissionNo` = NULL,
        `HttpStatusCode` = COALESCE(p_HttpStatusCode, 500),
        `ResponseJson` = NULL,
        `ErrorMessage` = LEFT(p_ErrorMessage, 1000),
        `UpdatedAt` = UTC_TIMESTAMP(6)
    WHERE `IdempotencyKey` = TRIM(p_IdempotencyKey)
      AND `Status` != 'COMPLETED';

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 4. GET ADMISSION IDEMPOTENCY / RECOVERY RECORD
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetAdmissionIdempotencyRecord`//
CREATE PROCEDURE `sp_GetAdmissionIdempotencyRecord`
(
    IN p_IdempotencyKey VARCHAR(128)
)
BEGIN
    SELECT
        `Id`,
        `IdempotencyKey`,
        `CampusId`,
        `CreatedByUserId`,
        `RequestHash`,
        `Status`,
        `AdmissionId`,
        `AdmissionNo`,
        `HttpStatusCode`,
        `ResponseJson`,
        `ErrorMessage`,
        `CreatedAt`,
        `UpdatedAt`,
        `ExpiresAt`
    FROM `StudentAdmissionIdempotencyRecords`
    WHERE `IdempotencyKey` = TRIM(p_IdempotencyKey)
    LIMIT 1;
END //

DELIMITER ;
