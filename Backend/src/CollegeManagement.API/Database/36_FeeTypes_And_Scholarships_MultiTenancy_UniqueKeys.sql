-- ==============================================================================
-- Migration: 36_FeeTypes_And_Scholarships_MultiTenancy_UniqueKeys.sql
-- Purpose:
--   1. Scope FeeTypes and Scholarships unique constraints to CollegeId instead of global uniqueness.
--   2. Backfill any FeeTypes row whose CampusId belongs to a different CollegeId.
--   3. Update sp_FeeType_Create, sp_FeeType_Update, and sp_Scholarship_Update to accept IN p_CollegeId INT
--      and enforce tenant-scoped uniqueness with clean CONFLICT errors.
-- ==============================================================================

USE `CollegeManagement`;

-- 1. Backfill stray campus-linked FeeTypes rows whose CollegeId did not match Campuses.CollegeId
UPDATE FeeTypes ft
INNER JOIN Campuses c ON c.CampusId = ft.CampusId
SET ft.CollegeId = c.CollegeId
WHERE ft.CampusId IS NOT NULL
  AND ft.CollegeId <> c.CollegeId;

-- 2. Replace global unique indexes on FeeTypes with CollegeId-scoped unique indexes
DROP PROCEDURE IF EXISTS sp_Migration_Align_FeeUniqueIndexes;
DELIMITER //
CREATE PROCEDURE sp_Migration_Align_FeeUniqueIndexes()
BEGIN
    -- FeeTypes: drop UX_FeeTypes_Name and UX_FeeTypes_Code if present
    IF EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'FeeTypes' AND index_name = 'UX_FeeTypes_Name'
    ) THEN
        ALTER TABLE `FeeTypes` DROP INDEX `UX_FeeTypes_Name`;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'FeeTypes' AND index_name = 'UX_FeeTypes_Code'
    ) THEN
        ALTER TABLE `FeeTypes` DROP INDEX `UX_FeeTypes_Code`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'FeeTypes' AND index_name = 'UX_FeeTypes_College_Name'
    ) THEN
        ALTER TABLE `FeeTypes` ADD UNIQUE KEY `UX_FeeTypes_College_Name` (`CollegeId`, `FeeTypeName`);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'FeeTypes' AND index_name = 'UX_FeeTypes_College_Code'
    ) THEN
        ALTER TABLE `FeeTypes` ADD UNIQUE KEY `UX_FeeTypes_College_Code` (`CollegeId`, `FeeTypeCode`);
    END IF;

    -- Scholarships: drop global UX_Scholarships_Name if present and add CollegeId-scoped index
    IF EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'Scholarships' AND index_name = 'UX_Scholarships_Name'
    ) THEN
        ALTER TABLE `Scholarships` DROP INDEX `UX_Scholarships_Name`;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'Scholarships' AND index_name = 'UX_Scholarships_College_Name'
    ) THEN
        ALTER TABLE `Scholarships` ADD UNIQUE KEY `UX_Scholarships_College_Name` (`CollegeId`, `ScholarshipName`);
    END IF;
END //
DELIMITER ;

CALL sp_Migration_Align_FeeUniqueIndexes();
DROP PROCEDURE IF EXISTS sp_Migration_Align_FeeUniqueIndexes;

-- 3. Update FeeType CRUD stored procedures to accept and scope by p_CollegeId
DROP PROCEDURE IF EXISTS sp_CreateFeeType;
DROP PROCEDURE IF EXISTS sp_FeeType_Create;
DELIMITER //
CREATE PROCEDURE sp_FeeType_Create(
    IN p_FeeTypeName VARCHAR(100),
    IN p_Category VARCHAR(50),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_IsActive BOOLEAN,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_Code VARCHAR(30);
    DECLARE v_NewId INT;
    DECLARE v_CollegeId INT;
    DECLARE v_TrimmedName VARCHAR(100);
    DECLARE v_Attempt INT DEFAULT 0;

    SET v_TrimmedName = TRIM(p_FeeTypeName);
    SET v_CollegeId = COALESCE(
        NULLIF(p_CollegeId, 0),
        (SELECT CollegeId FROM Campuses WHERE CampusId = NULLIF(p_CampusId, 0) LIMIT 1),
        1
    );

    IF EXISTS (
        SELECT 1
        FROM FeeTypes
        WHERE CollegeId = v_CollegeId
          AND LOWER(FeeTypeName) = LOWER(v_TrimmedName)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CONFLICT: A fee type with this name already exists.';
    END IF;

    REPEAT
        SET v_Attempt = v_Attempt + 1;
        SET v_Code = UPPER(CONCAT(
            COALESCE(NULLIF(SUBSTRING(REGEXP_REPLACE(p_Category, '[^a-zA-Z0-9]', ''), 1, 4), ''), 'FEE'),
            '-',
            FLOOR(1000 + (RAND() * 9000))
        ));
    UNTIL v_Attempt >= 10 OR NOT EXISTS (
        SELECT 1 FROM FeeTypes WHERE CollegeId = v_CollegeId AND FeeTypeCode = v_Code
    )
    END REPEAT;

    INSERT INTO FeeTypes (
        CollegeId,
        FeeTypeCode,
        FeeTypeName,
        Category,
        CampusId,
        BoardId,
        AcademicYearId,
        IsActive,
        CreatedAt
    )
    VALUES (
        v_CollegeId,
        v_Code,
        v_TrimmedName,
        TRIM(p_Category),
        NULLIF(p_CampusId, 0),
        NULLIF(p_BoardId, 0),
        NULLIF(p_AcademicYearId, 0),
        COALESCE(p_IsActive, 1),
        CURRENT_TIMESTAMP(6)
    );

    SET v_NewId = LAST_INSERT_ID();

    SELECT
        FeeTypeId,
        CollegeId,
        FeeTypeCode,
        FeeTypeName,
        Category,
        CampusId,
        BoardId,
        AcademicYearId,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM FeeTypes
    WHERE FeeTypeId = v_NewId;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_CreateFeeType(
    IN p_FeeTypeName VARCHAR(100),
    IN p_Category VARCHAR(50),
    IN p_IsActive BOOLEAN
)
BEGIN
    CALL sp_FeeType_Create(p_FeeTypeName, p_Category, NULL, NULL, NULL, p_IsActive, 1);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateFeeType;
DROP PROCEDURE IF EXISTS sp_FeeType_Update;
DELIMITER //
CREATE PROCEDURE sp_FeeType_Update(
    IN p_FeeTypeId INT,
    IN p_FeeTypeName VARCHAR(100),
    IN p_Category VARCHAR(50),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_IsActive BOOLEAN,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT;
    DECLARE v_TrimmedName VARCHAR(100);

    SET v_TrimmedName = TRIM(p_FeeTypeName);
    SELECT CollegeId INTO v_CollegeId FROM FeeTypes WHERE FeeTypeId = p_FeeTypeId LIMIT 1;

    IF v_CollegeId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fee type not found.';
    END IF;

    IF p_CollegeId IS NOT NULL AND p_CollegeId > 0 AND v_CollegeId <> p_CollegeId THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fee type does not belong to the active college.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM FeeTypes
        WHERE CollegeId = v_CollegeId
          AND FeeTypeId <> p_FeeTypeId
          AND LOWER(FeeTypeName) = LOWER(v_TrimmedName)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CONFLICT: A fee type with this name already exists.';
    END IF;

    UPDATE FeeTypes
    SET
        FeeTypeName = v_TrimmedName,
        Category = TRIM(p_Category),
        CampusId = NULLIF(p_CampusId, 0),
        BoardId = NULLIF(p_BoardId, 0),
        AcademicYearId = NULLIF(p_AcademicYearId, 0),
        IsActive = COALESCE(p_IsActive, IsActive),
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE FeeTypeId = p_FeeTypeId
      AND CollegeId = v_CollegeId;

    SELECT
        FeeTypeId,
        CollegeId,
        FeeTypeCode,
        FeeTypeName,
        Category,
        CampusId,
        BoardId,
        AcademicYearId,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM FeeTypes
    WHERE FeeTypeId = p_FeeTypeId;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_UpdateFeeType(
    IN p_FeeTypeId INT,
    IN p_FeeTypeName VARCHAR(100),
    IN p_Category VARCHAR(50),
    IN p_IsActive BOOLEAN
)
BEGIN
    CALL sp_FeeType_Update(p_FeeTypeId, p_FeeTypeName, p_Category, NULL, NULL, NULL, p_IsActive, NULL);
END //
DELIMITER ;

-- 4. Update sp_Scholarship_Update to accept and scope by p_CollegeId
DROP PROCEDURE IF EXISTS sp_Scholarship_Update;
DELIMITER //
CREATE PROCEDURE sp_Scholarship_Update(
    IN p_ScholarshipId INT,
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
    DECLARE v_CollegeId INT;
    DECLARE v_TrimmedName VARCHAR(100);

    SET v_TrimmedName = TRIM(p_ScholarshipName);
    SELECT CollegeId INTO v_CollegeId FROM Scholarships WHERE ScholarshipId = p_ScholarshipId LIMIT 1;

    IF v_CollegeId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Scholarship not found.';
    END IF;

    IF p_CollegeId IS NOT NULL AND p_CollegeId > 0 AND v_CollegeId <> p_CollegeId THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Scholarship does not belong to the active college.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM Scholarships
        WHERE CollegeId = v_CollegeId
          AND ScholarshipId <> p_ScholarshipId
          AND LOWER(ScholarshipName) = LOWER(v_TrimmedName)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CONFLICT: A scholarship with this name already exists.';
    END IF;

    UPDATE Scholarships
    SET
        ScholarshipName = v_TrimmedName,
        DiscountType = TRIM(p_DiscountType),
        DiscountValue = p_DiscountValue,
        Description = p_Description,
        CampusId = NULLIF(p_CampusId, 0),
        BoardId = NULLIF(p_BoardId, 0),
        AcademicYearId = NULLIF(p_AcademicYearId, 0),
        IsActive = COALESCE(p_IsActive, IsActive),
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE ScholarshipId = p_ScholarshipId
      AND CollegeId = v_CollegeId;

    CALL sp_Scholarship_GetById(p_ScholarshipId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateScholarship;
DELIMITER //
CREATE PROCEDURE sp_UpdateScholarship(
    IN p_ScholarshipId INT,
    IN p_ScholarshipName VARCHAR(100),
    IN p_DiscountType VARCHAR(20),
    IN p_DiscountValue DECIMAL(15,2),
    IN p_Description VARCHAR(500),
    IN p_IsActive BOOLEAN
)
BEGIN
    CALL sp_Scholarship_Update(p_ScholarshipId, p_ScholarshipName, p_DiscountType, p_DiscountValue, p_Description, NULL, NULL, NULL, p_IsActive, NULL);
END //
DELIMITER ;
