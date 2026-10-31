-- ====================================================================================
-- CMS_Inter — Unified Fee Management Module Schema & Stored Procedures
-- Database: CollegeManagement (MySQL 8.0)
-- Collation: utf8mb4_unicode_ci
-- Architecture: 100% Stored Procedures & Dapper, 0% Inline SQL, 0% EF Core Business CRUD
-- ====================================================================================

USE CollegeManagement;

-- 1. Ensure FeeStructures table supports multi-year configurations if missing
ALTER TABLE FeeStructures ADD COLUMN IF NOT EXISTS YearFeeMode VARCHAR(50) NULL;
ALTER TABLE FeeStructures ADD COLUMN IF NOT EXISTS IncrementType VARCHAR(50) NULL;
ALTER TABLE FeeStructures ADD COLUMN IF NOT EXISTS IncrementValue DECIMAL(15,2) NULL;
ALTER TABLE FeeStructures ADD COLUMN IF NOT EXISTS PairedStructureId INT NULL;

-- ------------------------------------------------------------------------------------
-- SECTION 1: FEE TYPES
-- ------------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_CreateFeeType;
DROP PROCEDURE IF EXISTS sp_FeeType_Create;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeType_Create(
    IN p_FeeTypeName VARCHAR(100),
    IN p_Category VARCHAR(50),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    DECLARE v_Code VARCHAR(30);
    DECLARE v_NewId INT;

    SET v_Code = UPPER(CONCAT(
        SUBSTRING(REGEXP_REPLACE(p_Category, '[^a-zA-Z0-9]', ''), 1, 4),
        '-',
        FLOOR(1000 + (RAND() * 9000))
    ));

    INSERT INTO FeeTypes (
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
        v_Code,
        TRIM(p_FeeTypeName),
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

CREATE PROCEDURE sp_CreateFeeType(
    IN p_FeeTypeName VARCHAR(100),
    IN p_Category VARCHAR(50),
    IN p_IsActive BOOLEAN
)
BEGIN
    CALL sp_FeeType_Create(p_FeeTypeName, p_Category, NULL, NULL, NULL, p_IsActive);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetFeeTypes;
DROP PROCEDURE IF EXISTS sp_FeeType_GetAll;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeType_GetAll(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        ft.FeeTypeId,
        ft.FeeTypeCode,
        ft.FeeTypeName,
        ft.Category,
        ft.CampusId,
        ft.BoardId,
        ft.AcademicYearId,
        ft.IsActive,
        ft.CreatedAt,
        ft.UpdatedAt
    FROM FeeTypes ft
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR ft.CampusId IS NULL OR ft.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR ft.BoardId IS NULL OR ft.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR ft.AcademicYearId IS NULL OR ft.AcademicYearId = p_AcademicYearId)
    ORDER BY ft.Category ASC, ft.FeeTypeName ASC;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetFeeTypes(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    CALL sp_FeeType_GetAll(p_CampusId, p_BoardId, p_AcademicYearId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetFeeTypeById;
DROP PROCEDURE IF EXISTS sp_FeeType_GetById;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeType_GetById(
    IN p_FeeTypeId INT
)
BEGIN
    SELECT 
        FeeTypeId,
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

CREATE PROCEDURE sp_GetFeeTypeById(IN p_FeeTypeId INT)
BEGIN
    CALL sp_FeeType_GetById(p_FeeTypeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateFeeType;
DROP PROCEDURE IF EXISTS sp_FeeType_Update;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeType_Update(
    IN p_FeeTypeId INT,
    IN p_FeeTypeName VARCHAR(100),
    IN p_Category VARCHAR(50),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    UPDATE FeeTypes
    SET 
        FeeTypeName = TRIM(p_FeeTypeName),
        Category = TRIM(p_Category),
        CampusId = NULLIF(p_CampusId, 0),
        BoardId = NULLIF(p_BoardId, 0),
        AcademicYearId = NULLIF(p_AcademicYearId, 0),
        IsActive = COALESCE(p_IsActive, IsActive),
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE FeeTypeId = p_FeeTypeId;

    SELECT 
        FeeTypeId,
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

CREATE PROCEDURE sp_UpdateFeeType(
    IN p_FeeTypeId INT,
    IN p_FeeTypeName VARCHAR(100),
    IN p_Category VARCHAR(50),
    IN p_IsActive BOOLEAN
)
BEGIN
    CALL sp_FeeType_Update(p_FeeTypeId, p_FeeTypeName, p_Category, NULL, NULL, NULL, p_IsActive);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeleteFeeType;
DROP PROCEDURE IF EXISTS sp_FeeType_Delete;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeType_Delete(
    IN p_FeeTypeId INT
)
BEGIN
    UPDATE FeeTypes
    SET IsActive = 0,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE FeeTypeId = p_FeeTypeId;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

CREATE PROCEDURE sp_DeleteFeeType(IN p_FeeTypeId INT)
BEGIN
    CALL sp_FeeType_Delete(p_FeeTypeId);
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- SECTION 2: FEE STRUCTURES & COMPONENTS
-- ------------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_CreateFeeStructure;
DROP PROCEDURE IF EXISTS sp_FeeStructure_Create;
DELIMITER //
CREATE PROCEDURE sp_FeeStructure_Create(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_StructureName VARCHAR(150),
    IN p_Description VARCHAR(500),
    IN p_YearFeeMode VARCHAR(50),
    IN p_IncrementType VARCHAR(50),
    IN p_IncrementValue DECIMAL(15,2),
    IN p_ItemsJson JSON
)
BEGIN
    DECLARE v_GroupName VARCHAR(100);
    DECLARE v_ProgramName VARCHAR(100);
    DECLARE v_BaseName VARCHAR(150);
    DECLARE v_FinalName1 VARCHAR(150);
    DECLARE v_FinalName2 VARCHAR(150);
    DECLARE v_FirstYearId INT;
    DECLARE v_SecondYearId INT;
    DECLARE v_ItemCount INT DEFAULT 0;
    DECLARE v_Idx INT DEFAULT 0;
    DECLARE v_FeeTypeId INT;
    DECLARE v_Rule VARCHAR(20);
    DECLARE v_Amount DECIMAL(15,2);
    DECLARE v_SecondYearAmount DECIMAL(15,2);
    DECLARE v_IncrementRupees DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_IsMultiYear BOOLEAN DEFAULT FALSE;
    DECLARE v_FirstYearTotal DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_Category VARCHAR(50);
    DECLARE v_TuitionId INT DEFAULT 0;
    DECLARE v_MaxCompAmount DECIMAL(15,2) DEFAULT 0.00;

    -- Resolve Group and Program names for default structure title
    SELECT GroupName INTO v_GroupName FROM `Groups` WHERE GroupId = p_GroupId LIMIT 1;
    IF p_ProgramId IS NOT NULL AND p_ProgramId > 0 THEN
        SELECT ProgramName INTO v_ProgramName FROM Programs WHERE ProgramId = p_ProgramId LIMIT 1;
    END IF;

    SET v_BaseName = CASE 
        WHEN v_ProgramName IS NOT NULL AND v_ProgramName != '' THEN CONCAT(COALESCE(v_GroupName, 'Group'), ' (', v_ProgramName, ')')
        ELSE COALESCE(v_GroupName, CONCAT('Group ', p_GroupId))
    END;

    IF LOWER(TRIM(COALESCE(p_YearFeeMode, ''))) IN ('same', 'different') THEN
        SET v_IsMultiYear = TRUE;
    END IF;

    SET v_FinalName1 = CASE
        WHEN p_StructureName IS NOT NULL AND TRIM(p_StructureName) != '' THEN TRIM(p_StructureName)
        WHEN v_IsMultiYear = TRUE THEN CONCAT(v_BaseName, ' - 1st Year')
        ELSE CONCAT('Fee Structure ', v_BaseName)
    END;

    -- Insert 1st Year Fee Structure
    INSERT INTO FeeStructures (
        CampusId,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        ProgramId,
        StructureName,
        Description,
        YearFeeMode,
        IncrementType,
        IncrementValue,
        IsActive,
        CreatedAt
    )
    VALUES (
        NULLIF(p_CampusId, 0),
        p_BoardId,
        p_AcademicYearId,
        COALESCE(NULLIF(p_AcademicLevelId, 0), 1),
        p_GroupId,
        NULLIF(p_ProgramId, 0),
        v_FinalName1,
        p_Description,
        p_YearFeeMode,
        p_IncrementType,
        p_IncrementValue,
        1,
        CURRENT_TIMESTAMP(6)
    );

    SET v_FirstYearId = LAST_INSERT_ID();

    -- Parse and Insert Components from JSON
    IF p_ItemsJson IS NOT NULL AND JSON_VALID(p_ItemsJson) THEN
        SET v_ItemCount = JSON_LENGTH(p_ItemsJson);
        WHILE v_Idx < v_ItemCount DO
            SET v_FeeTypeId = JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJson, CONCAT('$[', v_Idx, '].feeTypeId')));
            SET v_Rule = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJson, CONCAT('$[', v_Idx, '].rule'))), 'Mandatory');
            SET v_Amount = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJson, CONCAT('$[', v_Idx, '].amount'))) AS DECIMAL(15,2));

            IF v_FeeTypeId IS NOT NULL AND v_Amount > 0 THEN
                INSERT INTO FeeStructureComponents (
                    FeeStructureId,
                    FeeComponentId,
                    Amount,
                    DefaultAmount,
                    IsMandatory,
                    IsActive,
                    CreatedAt
                )
                VALUES (
                    v_FirstYearId,
                    v_FeeTypeId,
                    v_Amount,
                    v_Amount,
                    CASE WHEN LOWER(v_Rule) = 'mandatory' THEN 1 ELSE 0 END,
                    1,
                    CURRENT_TIMESTAMP(6)
                );

                SET v_FirstYearTotal = v_FirstYearTotal + v_Amount;
                IF v_Amount > v_MaxCompAmount THEN
                    SET v_MaxCompAmount = v_Amount;
                    SET v_TuitionId = v_FeeTypeId;
                END IF;
            END IF;
            SET v_Idx = v_Idx + 1;
        END WHILE;
    END IF;

    -- If Multi-Year configuration is requested, generate 2nd Year Structure
    IF v_IsMultiYear = TRUE THEN
        SET v_FinalName2 = CONCAT(v_BaseName, ' - 2nd Year');

        IF LOWER(TRIM(p_YearFeeMode)) = 'different' AND p_IncrementValue IS NOT NULL AND p_IncrementValue > 0 THEN
            IF LOWER(TRIM(COALESCE(p_IncrementType, ''))) = 'percentage' THEN
                SET v_IncrementRupees = ROUND((v_FirstYearTotal * p_IncrementValue) / 100.0, 2);
            ELSE
                SET v_IncrementRupees = p_IncrementValue;
            END IF;
        END IF;

        INSERT INTO FeeStructures (
            CampusId,
            BoardId,
            AcademicYearId,
            AcademicLevelId,
            GroupId,
            ProgramId,
            StructureName,
            Description,
            YearFeeMode,
            IncrementType,
            IncrementValue,
            PairedStructureId,
            IsActive,
            CreatedAt
        )
        VALUES (
            NULLIF(p_CampusId, 0),
            p_BoardId,
            p_AcademicYearId,
            2,
            p_GroupId,
            NULLIF(p_ProgramId, 0),
            v_FinalName2,
            p_Description,
            p_YearFeeMode,
            p_IncrementType,
            p_IncrementValue,
            v_FirstYearId,
            1,
            CURRENT_TIMESTAMP(6)
        );

        SET v_SecondYearId = LAST_INSERT_ID();
        UPDATE FeeStructures SET PairedStructureId = v_SecondYearId WHERE FeeStructureId = v_FirstYearId;

        -- Copy and adjust components for 2nd Year
        SET v_Idx = 0;
        IF p_ItemsJson IS NOT NULL AND JSON_VALID(p_ItemsJson) THEN
            WHILE v_Idx < v_ItemCount DO
                SET v_FeeTypeId = JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJson, CONCAT('$[', v_Idx, '].feeTypeId')));
                SET v_Rule = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJson, CONCAT('$[', v_Idx, '].rule'))), 'Mandatory');
                SET v_Amount = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJson, CONCAT('$[', v_Idx, '].amount'))) AS DECIMAL(15,2));

                SELECT Category INTO v_Category FROM FeeTypes WHERE FeeTypeId = v_FeeTypeId LIMIT 1;

                SET v_SecondYearAmount = v_Amount;
                IF LOWER(TRIM(p_YearFeeMode)) = 'different' AND LOWER(TRIM(COALESCE(v_Category, ''))) = 'admission' THEN
                    SET v_SecondYearAmount = 0.00;
                ELSEIF v_FeeTypeId = v_TuitionId AND v_IncrementRupees > 0 THEN
                    SET v_SecondYearAmount = v_SecondYearAmount + v_IncrementRupees;
                END IF;

                IF v_SecondYearAmount > 0 THEN
                    INSERT INTO FeeStructureComponents (
                        FeeStructureId,
                        FeeComponentId,
                        Amount,
                        DefaultAmount,
                        IsMandatory,
                        IsActive,
                        CreatedAt
                    )
                    VALUES (
                        v_SecondYearId,
                        v_FeeTypeId,
                        v_SecondYearAmount,
                        v_SecondYearAmount,
                        CASE WHEN LOWER(v_Rule) = 'mandatory' THEN 1 ELSE 0 END,
                        1,
                        CURRENT_TIMESTAMP(6)
                    );
                END IF;
                SET v_Idx = v_Idx + 1;
            END WHILE;
        END IF;
    END IF;

    -- Return 1st Year Structure ID
    SELECT v_FirstYearId AS FeeStructureId, v_SecondYearId AS SecondYearStructureId;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_CreateFeeStructure(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT
)
BEGIN
    CALL sp_FeeStructure_Create(NULL, p_BoardId, p_AcademicYearId, 1, p_GroupId, p_ProgramId, NULL, NULL, NULL, NULL, NULL, NULL);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetFeeStructures;
DROP PROCEDURE IF EXISTS sp_FeeStructure_GetAll;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeStructure_GetAll(
    IN p_CampusId INT
)
BEGIN
    -- Result Set 1: Fee Structures Header
    SELECT 
        fs.FeeStructureId,
        fs.CampusId,
        COALESCE(c.CampusName, CASE WHEN fs.CampusId IS NOT NULL THEN CONCAT('Campus ', fs.CampusId) ELSE 'All Campuses' END) AS CampusName,
        fs.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        fs.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        fs.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        fs.ProgramId,
        COALESCE(p.ProgramName, '') AS ProgramName,
        fs.StructureName,
        fs.AcademicLevelId,
        COALESCE(al.LevelName, CASE WHEN fs.AcademicLevelId = 2 THEN '2nd Year' ELSE '1st Year' END) AS AcademicLevelName,
        fs.YearFeeMode,
        fs.IncrementType,
        fs.IncrementValue,
        fs.PairedStructureId,
        COALESCE(comp.TotalAmount, 0.00) AS TotalAmount,
        fs.IsActive,
        fs.CreatedAt,
        fs.UpdatedAt
    FROM FeeStructures fs
    LEFT JOIN Campuses c ON c.CampusId = fs.CampusId
    LEFT JOIN Boards b ON b.BoardId = fs.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = fs.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = fs.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = fs.GroupId
    LEFT JOIN Programs p ON p.ProgramId = fs.ProgramId
    LEFT JOIN (
        SELECT FeeStructureId, SUM(Amount) AS TotalAmount
        FROM FeeStructureComponents
        WHERE IsActive = 1
        GROUP BY FeeStructureId
    ) comp ON comp.FeeStructureId = fs.FeeStructureId
    WHERE fs.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR fs.CampusId IS NULL OR fs.CampusId = p_CampusId)
    ORDER BY fs.FeeStructureId DESC;

    -- Result Set 2: Fee Structure Components
    SELECT 
        fsc.FeeStructureComponentId,
        fsc.FeeStructureId,
        fsc.FeeComponentId AS FeeTypeId,
        COALESCE(ft.FeeTypeName, '') AS FeeTypeName,
        COALESCE(ft.Category, '') AS Category,
        CASE WHEN fsc.IsMandatory = 1 THEN 'Mandatory' ELSE 'Optional' END AS Rule,
        fsc.Amount,
        fsc.IsActive
    FROM FeeStructureComponents fsc
    INNER JOIN FeeStructures fs ON fs.FeeStructureId = fsc.FeeStructureId
    LEFT JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeComponentId
    WHERE fs.IsActive = 1
      AND fsc.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR fs.CampusId IS NULL OR fs.CampusId = p_CampusId)
    ORDER BY fsc.FeeStructureId ASC, fsc.FeeStructureComponentId ASC;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetFeeStructures(IN p_CampusId INT)
BEGIN
    CALL sp_FeeStructure_GetAll(p_CampusId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetFeeStructureById;
DROP PROCEDURE IF EXISTS sp_FeeStructure_GetById;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeStructure_GetById(
    IN p_FeeStructureId INT
)
BEGIN
    -- Result Set 1: Header
    SELECT 
        fs.FeeStructureId,
        fs.CampusId,
        COALESCE(c.CampusName, CASE WHEN fs.CampusId IS NOT NULL THEN CONCAT('Campus ', fs.CampusId) ELSE 'All Campuses' END) AS CampusName,
        fs.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        fs.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        fs.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        fs.ProgramId,
        COALESCE(p.ProgramName, '') AS ProgramName,
        fs.StructureName,
        fs.AcademicLevelId,
        COALESCE(al.LevelName, CASE WHEN fs.AcademicLevelId = 2 THEN '2nd Year' ELSE '1st Year' END) AS AcademicLevelName,
        fs.YearFeeMode,
        fs.IncrementType,
        fs.IncrementValue,
        fs.PairedStructureId,
        COALESCE((SELECT SUM(Amount) FROM FeeStructureComponents WHERE FeeStructureId = fs.FeeStructureId AND IsActive = 1), 0.00) AS TotalAmount,
        fs.IsActive,
        fs.CreatedAt,
        fs.UpdatedAt
    FROM FeeStructures fs
    LEFT JOIN Campuses c ON c.CampusId = fs.CampusId
    LEFT JOIN Boards b ON b.BoardId = fs.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = fs.AcademicYearId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = fs.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = fs.GroupId
    LEFT JOIN Programs p ON p.ProgramId = fs.ProgramId
    WHERE fs.FeeStructureId = p_FeeStructureId;

    -- Result Set 2: Components
    SELECT 
        fsc.FeeStructureComponentId,
        fsc.FeeStructureId,
        fsc.FeeComponentId AS FeeTypeId,
        COALESCE(ft.FeeTypeName, '') AS FeeTypeName,
        COALESCE(ft.Category, '') AS Category,
        CASE WHEN fsc.IsMandatory = 1 THEN 'Mandatory' ELSE 'Optional' END AS Rule,
        fsc.Amount,
        fsc.IsActive
    FROM FeeStructureComponents fsc
    LEFT JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeComponentId
    WHERE fsc.FeeStructureId = p_FeeStructureId
      AND fsc.IsActive = 1
    ORDER BY fsc.FeeStructureComponentId ASC;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetFeeStructureById(IN p_FeeStructureId INT)
BEGIN
    CALL sp_FeeStructure_GetById(p_FeeStructureId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateFeeStructure;
DROP PROCEDURE IF EXISTS sp_FeeStructure_Update;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeStructure_Update(
    IN p_FeeStructureId INT,
    IN p_StructureName VARCHAR(150),
    IN p_Description VARCHAR(500),
    IN p_IsActive BOOLEAN
)
BEGIN
    UPDATE FeeStructures
    SET 
        StructureName = COALESCE(NULLIF(TRIM(p_StructureName), ''), StructureName),
        Description = p_Description,
        IsActive = COALESCE(p_IsActive, IsActive),
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE FeeStructureId = p_FeeStructureId;

    CALL sp_FeeStructure_GetById(p_FeeStructureId);
END //
DELIMITER ;

CREATE PROCEDURE sp_UpdateFeeStructure(
    IN p_FeeStructureId INT,
    IN p_StructureName VARCHAR(150),
    IN p_Description VARCHAR(500),
    IN p_IsActive BOOLEAN
)
BEGIN
    CALL sp_FeeStructure_Update(p_FeeStructureId, p_StructureName, p_Description, p_IsActive);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeleteFeeStructure;
DROP PROCEDURE IF EXISTS sp_FeeStructure_Delete;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeStructure_Delete(
    IN p_FeeStructureId INT
)
BEGIN
    UPDATE FeeStructures SET IsActive = 0, UpdatedAt = CURRENT_TIMESTAMP(6) WHERE FeeStructureId = p_FeeStructureId;
    UPDATE FeeStructureComponents SET IsActive = 0, UpdatedAt = CURRENT_TIMESTAMP(6) WHERE FeeStructureId = p_FeeStructureId;
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

CREATE PROCEDURE sp_DeleteFeeStructure(IN p_FeeStructureId INT)
BEGIN
    CALL sp_FeeStructure_Delete(p_FeeStructureId);
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- SECTION 3: STRUCTURE COMPONENTS (ITEMS)
-- ------------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_AddFeeStructureItem;
DROP PROCEDURE IF EXISTS sp_FeeStructureComponent_Add;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeStructureComponent_Add(
    IN p_FeeStructureId INT,
    IN p_FeeTypeId INT,
    IN p_Rule VARCHAR(20),
    IN p_Amount DECIMAL(15,2)
)
BEGIN
    DECLARE v_NewId INT;

    INSERT INTO FeeStructureComponents (
        FeeStructureId,
        FeeComponentId,
        Amount,
        DefaultAmount,
        IsMandatory,
        IsActive,
        CreatedAt
    )
    VALUES (
        p_FeeStructureId,
        p_FeeTypeId,
        p_Amount,
        p_Amount,
        CASE WHEN LOWER(TRIM(p_Rule)) = 'mandatory' THEN 1 ELSE 0 END,
        1,
        CURRENT_TIMESTAMP(6)
    );

    SET v_NewId = LAST_INSERT_ID();

    SELECT 
        fsc.FeeStructureComponentId,
        fsc.FeeStructureId,
        fsc.FeeComponentId AS FeeTypeId,
        COALESCE(ft.FeeTypeName, '') AS FeeTypeName,
        COALESCE(ft.Category, '') AS Category,
        CASE WHEN fsc.IsMandatory = 1 THEN 'Mandatory' ELSE 'Optional' END AS Rule,
        fsc.Amount,
        fsc.IsActive
    FROM FeeStructureComponents fsc
    LEFT JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeComponentId
    WHERE fsc.FeeStructureComponentId = v_NewId;
END //
DELIMITER ;

CREATE PROCEDURE sp_AddFeeStructureItem(
    IN p_FeeStructureId INT,
    IN p_FeeTypeId INT,
    IN p_Rule VARCHAR(20),
    IN p_Amount DECIMAL(15,2)
)
BEGIN
    CALL sp_FeeStructureComponent_Add(p_FeeStructureId, p_FeeTypeId, p_Rule, p_Amount);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetFeeStructureItems;
DROP PROCEDURE IF EXISTS sp_FeeStructureComponent_GetAll;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeStructureComponent_GetAll(
    IN p_FeeStructureId INT
)
BEGIN
    SELECT 
        fsc.FeeStructureComponentId,
        fsc.FeeStructureId,
        fsc.FeeComponentId AS FeeTypeId,
        COALESCE(ft.FeeTypeName, '') AS FeeTypeName,
        COALESCE(ft.Category, '') AS Category,
        CASE WHEN fsc.IsMandatory = 1 THEN 'Mandatory' ELSE 'Optional' END AS Rule,
        fsc.Amount,
        fsc.IsActive
    FROM FeeStructureComponents fsc
    LEFT JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeComponentId
    WHERE fsc.FeeStructureId = p_FeeStructureId
      AND fsc.IsActive = 1
    ORDER BY fsc.FeeStructureComponentId ASC;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetFeeStructureItems(IN p_FeeStructureId INT)
BEGIN
    CALL sp_FeeStructureComponent_GetAll(p_FeeStructureId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateFeeStructureItem;
DROP PROCEDURE IF EXISTS sp_FeeStructureComponent_Update;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeStructureComponent_Update(
    IN p_FeeStructureComponentId INT,
    IN p_Rule VARCHAR(20),
    IN p_Amount DECIMAL(15,2),
    IN p_IsActive BOOLEAN
)
BEGIN
    UPDATE FeeStructureComponents
    SET 
        IsMandatory = CASE WHEN LOWER(TRIM(p_Rule)) = 'mandatory' THEN 1 ELSE 0 END,
        Amount = p_Amount,
        DefaultAmount = p_Amount,
        IsActive = COALESCE(p_IsActive, IsActive),
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE FeeStructureComponentId = p_FeeStructureComponentId;

    SELECT 
        fsc.FeeStructureComponentId,
        fsc.FeeStructureId,
        fsc.FeeComponentId AS FeeTypeId,
        COALESCE(ft.FeeTypeName, '') AS FeeTypeName,
        COALESCE(ft.Category, '') AS Category,
        CASE WHEN fsc.IsMandatory = 1 THEN 'Mandatory' ELSE 'Optional' END AS Rule,
        fsc.Amount,
        fsc.IsActive
    FROM FeeStructureComponents fsc
    LEFT JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeComponentId
    WHERE fsc.FeeStructureComponentId = p_FeeStructureComponentId;
END //
DELIMITER ;

CREATE PROCEDURE sp_UpdateFeeStructureItem(
    IN p_FeeStructureComponentId INT,
    IN p_Rule VARCHAR(20),
    IN p_Amount DECIMAL(15,2),
    IN p_IsActive BOOLEAN
)
BEGIN
    CALL sp_FeeStructureComponent_Update(p_FeeStructureComponentId, p_Rule, p_Amount, p_IsActive);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeleteFeeStructureItem;
DROP PROCEDURE IF EXISTS sp_DeleteFeeStructureComponent;
DROP PROCEDURE IF EXISTS sp_FeeStructureComponent_Delete;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeStructureComponent_Delete(
    IN p_FeeStructureComponentId INT
)
BEGIN
    UPDATE FeeStructureComponents
    SET IsActive = 0,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE FeeStructureComponentId = p_FeeStructureComponentId;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

CREATE PROCEDURE sp_DeleteFeeStructureItem(IN p_FeeStructureComponentId INT)
BEGIN
    CALL sp_FeeStructureComponent_Delete(p_FeeStructureComponentId);
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_DeleteFeeStructureComponent(IN p_FeeStructureComponentId INT)
BEGIN
    CALL sp_FeeStructureComponent_Delete(p_FeeStructureComponentId);
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- SECTION 4: SCHOLARSHIPS
-- ------------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_CreateScholarship;
DROP PROCEDURE IF EXISTS sp_Scholarship_Create;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_Scholarship_Create(
    IN p_ScholarshipName VARCHAR(100),
    IN p_DiscountType VARCHAR(20),
    IN p_DiscountValue DECIMAL(15,2),
    IN p_Description VARCHAR(500),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    DECLARE v_NewId INT;

    INSERT INTO Scholarships (
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

CREATE PROCEDURE sp_CreateScholarship(
    IN p_ScholarshipName VARCHAR(100),
    IN p_DiscountType VARCHAR(20),
    IN p_DiscountValue DECIMAL(15,2),
    IN p_Description VARCHAR(500)
)
BEGIN
    CALL sp_Scholarship_Create(p_ScholarshipName, p_DiscountType, p_DiscountValue, p_Description, NULL, NULL, NULL, 1);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetScholarships;
DROP PROCEDURE IF EXISTS sp_Scholarship_GetAll;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_Scholarship_GetAll(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        ScholarshipId,
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
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR BoardId IS NULL OR BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
    ORDER BY ScholarshipId DESC;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetScholarships(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    CALL sp_Scholarship_GetAll(p_CampusId, p_BoardId, p_AcademicYearId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetScholarshipById;
DROP PROCEDURE IF EXISTS sp_Scholarship_GetById;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_Scholarship_GetById(IN p_ScholarshipId INT)
BEGIN
    SELECT 
        ScholarshipId,
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
    WHERE ScholarshipId = p_ScholarshipId;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetScholarshipById(IN p_ScholarshipId INT)
BEGIN
    CALL sp_Scholarship_GetById(p_ScholarshipId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateScholarship;
DROP PROCEDURE IF EXISTS sp_Scholarship_Update;
DELIMITER //
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
    IN p_IsActive BOOLEAN
)
BEGIN
    UPDATE Scholarships
    SET 
        ScholarshipName = TRIM(p_ScholarshipName),
        DiscountType = TRIM(p_DiscountType),
        DiscountValue = p_DiscountValue,
        Description = p_Description,
        CampusId = NULLIF(p_CampusId, 0),
        BoardId = NULLIF(p_BoardId, 0),
        AcademicYearId = NULLIF(p_AcademicYearId, 0),
        IsActive = COALESCE(p_IsActive, IsActive),
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE ScholarshipId = p_ScholarshipId;

    CALL sp_Scholarship_GetById(p_ScholarshipId);
END //
DELIMITER ;

CREATE PROCEDURE sp_UpdateScholarship(
    IN p_ScholarshipId INT,
    IN p_ScholarshipName VARCHAR(100),
    IN p_DiscountType VARCHAR(20),
    IN p_DiscountValue DECIMAL(15,2),
    IN p_Description VARCHAR(500),
    IN p_IsActive BOOLEAN
)
BEGIN
    CALL sp_Scholarship_Update(p_ScholarshipId, p_ScholarshipName, p_DiscountType, p_DiscountValue, p_Description, NULL, NULL, NULL, p_IsActive);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeleteScholarship;
DROP PROCEDURE IF EXISTS sp_Scholarship_Delete;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_Scholarship_Delete(IN p_ScholarshipId INT)
BEGIN
    UPDATE Scholarships SET IsActive = 0, UpdatedAt = CURRENT_TIMESTAMP(6) WHERE ScholarshipId = p_ScholarshipId;
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

CREATE PROCEDURE sp_DeleteScholarship(IN p_ScholarshipId INT)
BEGIN
    CALL sp_Scholarship_Delete(p_ScholarshipId);
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- SECTION 5: STUDENT FEE ASSIGNMENT & LEDGER
-- ------------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_AssignStudentFee;
DROP PROCEDURE IF EXISTS sp_StudentFee_Assign;
DELIMITER //
CREATE PROCEDURE sp_StudentFee_Assign(
    IN p_StudentId INT,
    IN p_FeeStructureId INT,
    IN p_PlanName VARCHAR(100),
    IN p_NumberOfInstallments INT
)
BEGIN
    DECLARE v_TotalAmount DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_StudentFeeId INT;
    DECLARE v_PlanId INT;
    DECLARE v_Installments INT;
    DECLARE v_BaseInstallment DECIMAL(15,2);
    DECLARE v_Remainder DECIMAL(15,2);
    DECLARE v_InstIdx INT DEFAULT 1;
    DECLARE v_CurrentInstAmount DECIMAL(15,2);
    DECLARE v_DueDate DATETIME;

    SET v_Installments = CASE WHEN p_NumberOfInstallments > 0 THEN p_NumberOfInstallments ELSE 1 END;
    IF p_PlanName IS NULL OR TRIM(p_PlanName) = '' THEN
        SET p_PlanName = CASE WHEN v_Installments > 1 THEN CONCAT(v_Installments, ' Installments') ELSE 'Full Payment' END;
    END IF;

    -- Calculate total from active structure components
    SELECT COALESCE(SUM(Amount), 0.00) INTO v_TotalAmount
    FROM FeeStructureComponents
    WHERE FeeStructureId = p_FeeStructureId AND IsActive = 1;

    -- Check if StudentFee already exists
    SELECT StudentFeeId INTO v_StudentFeeId
    FROM StudentFees
    WHERE StudentId = p_StudentId AND FeeStructureId = p_FeeStructureId
    LIMIT 1;

    IF v_StudentFeeId IS NULL THEN
        INSERT INTO StudentFees (
            StudentId,
            FeeStructureId,
            PaymentPlan,
            TotalAmount,
            ConcessionAmount,
            PayableAmount,
            PaidAmount,
            BalanceAmount,
            Status,
            AssignedAt
        )
        VALUES (
            p_StudentId,
            p_FeeStructureId,
            p_PlanName,
            v_TotalAmount,
            0.00,
            v_TotalAmount,
            0.00,
            v_TotalAmount,
            'Pending',
            CURRENT_TIMESTAMP(6)
        );
        SET v_StudentFeeId = LAST_INSERT_ID();
    ELSE
        UPDATE StudentFees
        SET TotalAmount = v_TotalAmount,
            PayableAmount = GREATEST(0.00, v_TotalAmount - ConcessionAmount),
            BalanceAmount = GREATEST(0.00, v_TotalAmount - ConcessionAmount - PaidAmount),
            PaymentPlan = p_PlanName,
            UpdatedAt = CURRENT_TIMESTAMP(6)
        WHERE StudentFeeId = v_StudentFeeId;
    END IF;

    -- Populate StudentFeeComponents
    DELETE FROM StudentFeeComponents WHERE StudentFeeId = v_StudentFeeId;
    INSERT INTO StudentFeeComponents (
        StudentFeeId,
        FeeStructureComponentId,
        Amount,
        ConcessionAmount,
        PayableAmount,
        PaidAmount,
        BalanceAmount,
        DueDate,
        Status
    )
    SELECT 
        v_StudentFeeId,
        FeeStructureComponentId,
        Amount,
        0.00,
        Amount,
        0.00,
        Amount,
        DueDate,
        'Pending'
    FROM FeeStructureComponents
    WHERE FeeStructureId = p_FeeStructureId AND IsActive = 1;

    -- Create or replace Payment Plan
    DELETE FROM FeePaymentPlans WHERE StudentFeeId = v_StudentFeeId;
    INSERT INTO FeePaymentPlans (
        StudentFeeId,
        PlanName,
        TotalAmount,
        NumberOfInstallments,
        IsActive,
        CreatedAt
    )
    VALUES (
        v_StudentFeeId,
        p_PlanName,
        v_TotalAmount,
        v_Installments,
        1,
        CURRENT_TIMESTAMP(6)
    );
    SET v_PlanId = LAST_INSERT_ID();

    -- Create FeeInstallments
    SET v_BaseInstallment = FLOOR(v_TotalAmount / v_Installments);
    SET v_Remainder = v_TotalAmount - (v_BaseInstallment * v_Installments);

    WHILE v_InstIdx <= v_Installments DO
        SET v_CurrentInstAmount = v_BaseInstallment + CASE WHEN v_InstIdx = 1 THEN v_Remainder ELSE 0.00 END;
        SET v_DueDate = DATE_ADD(NOW(), INTERVAL (v_InstIdx - 1) MONTH);

        INSERT INTO FeeInstallments (
            FeePaymentPlanId,
            InstallmentNumber,
            Amount,
            PaidAmount,
            BalanceAmount,
            DueDate,
            Status
        )
        VALUES (
            v_PlanId,
            v_InstIdx,
            v_CurrentInstAmount,
            0.00,
            v_CurrentInstAmount,
            v_DueDate,
            'Pending'
        );
        SET v_InstIdx = v_InstIdx + 1;
    END WHILE;

    -- Update Students table fee cache
    UPDATE Students
    SET FeeStructureId = p_FeeStructureId,
        PaymentPlan = p_PlanName,
        FeeAmount = v_TotalAmount,
        FeePaid = 0.00,
        FeeStatus = 'Pending',
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentId = p_StudentId;

    -- Result Set 1: Payment Plan
    SELECT FeePaymentPlanId, StudentFeeId, PlanName, TotalAmount, NumberOfInstallments, IsActive, CreatedAt
    FROM FeePaymentPlans WHERE FeePaymentPlanId = v_PlanId;

    -- Result Set 2: Schedules
    SELECT FeeInstallmentId, FeePaymentPlanId, InstallmentNumber, Amount, PaidAmount, BalanceAmount, DueDate, Status
    FROM FeeInstallments WHERE FeePaymentPlanId = v_PlanId ORDER BY InstallmentNumber ASC;

    -- Result Set 3: StudentFee
    SELECT 
        sf.StudentFeeId,
        sf.StudentId,
        s.StudentName,
        s.AdmissionNo AS AdmissionNumber,
        sf.FeeStructureId,
        fs.StructureName AS FeeStructureName,
        sf.PaymentPlan,
        sf.TotalAmount,
        sf.ConcessionAmount,
        sf.PayableAmount,
        sf.PaidAmount,
        sf.BalanceAmount,
        sf.Status,
        sf.AssignedAt
    FROM StudentFees sf
    INNER JOIN Students s ON s.StudentId = sf.StudentId
    INNER JOIN FeeStructures fs ON fs.FeeStructureId = sf.FeeStructureId
    WHERE sf.StudentFeeId = v_StudentFeeId;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_AssignStudentFee(
    IN p_StudentId INT,
    IN p_FeeStructureId INT,
    IN p_PlanName VARCHAR(100),
    IN p_NumberOfInstallments INT
)
BEGIN
    CALL sp_StudentFee_Assign(p_StudentId, p_FeeStructureId, p_PlanName, p_NumberOfInstallments);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetStudentFeeDetails;
DROP PROCEDURE IF EXISTS sp_GetStudentFeeDetailsByStudent;
DROP PROCEDURE IF EXISTS sp_StudentFee_GetDetailsByStudent;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_StudentFee_GetDetailsByStudent(
    IN p_StudentId INT
)
BEGIN
    -- Result Set 1: Student Fee Summary
    SELECT 
        sf.StudentFeeId,
        s.StudentId,
        s.StudentName,
        s.AdmissionNo AS AdmissionNumber,
        COALESCE(c.CampusName, '') AS CampusName,
        COALESCE(b.BoardName, '') AS BoardName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        sf.FeeStructureId,
        COALESCE(fs.StructureName, '') AS FeeStructureName,
        COALESCE(sf.PaymentPlan, 'Full Payment') AS PaymentPlan,
        COALESCE(sf.TotalAmount, 0.00) AS TotalAmount,
        COALESCE(sf.ConcessionAmount, 0.00) AS ConcessionAmount,
        COALESCE(sf.PayableAmount, 0.00) AS PayableAmount,
        COALESCE(sf.PaidAmount, 0.00) AS PaidAmount,
        COALESCE(sf.BalanceAmount, 0.00) AS BalanceAmount,
        COALESCE(sf.Status, 'Pending') AS Status,
        sf.AssignedAt
    FROM Students s
    LEFT JOIN StudentFees sf ON sf.StudentId = s.StudentId
    LEFT JOIN FeeStructures fs ON fs.FeeStructureId = sf.FeeStructureId
    LEFT JOIN Campuses c ON c.CampusId = s.CampusId
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN Sections sec ON sec.SectionId = s.SectionId
    WHERE s.StudentId = p_StudentId
    ORDER BY sf.StudentFeeId DESC
    LIMIT 1;

    -- Result Set 2: Fee Breakdown (Components)
    SELECT 
        sfc.StudentFeeComponentId,
        sfc.StudentFeeId,
        fsc.FeeComponentId AS FeeTypeId,
        COALESCE(ft.FeeTypeName, 'Fee Component') AS FeeTypeName,
        COALESCE(ft.Category, 'Academic') AS Category,
        sfc.Amount,
        sfc.ConcessionAmount,
        sfc.PayableAmount,
        sfc.PaidAmount,
        sfc.BalanceAmount,
        sfc.DueDate,
        sfc.Status
    FROM StudentFeeComponents sfc
    INNER JOIN StudentFees sf ON sf.StudentFeeId = sfc.StudentFeeId
    INNER JOIN FeeStructureComponents fsc ON fsc.FeeStructureComponentId = sfc.FeeStructureComponentId
    LEFT JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeComponentId
    WHERE sf.StudentId = p_StudentId
    ORDER BY sfc.StudentFeeComponentId ASC;

    -- Result Set 3: Payment Schedules (Installments)
    SELECT 
        fi.FeeInstallmentId,
        fi.FeePaymentPlanId,
        fi.InstallmentNumber,
        fi.Amount,
        fi.PaidAmount,
        fi.BalanceAmount,
        fi.DueDate,
        fi.Status
    FROM FeeInstallments fi
    INNER JOIN FeePaymentPlans fpp ON fpp.FeePaymentPlanId = fi.FeePaymentPlanId
    INNER JOIN StudentFees sf ON sf.StudentFeeId = fpp.StudentFeeId
    WHERE sf.StudentId = p_StudentId
    ORDER BY fi.InstallmentNumber ASC;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetStudentFeeDetailsByStudent(IN p_StudentId INT)
BEGIN
    CALL sp_StudentFee_GetDetailsByStudent(p_StudentId);
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_GetStudentFeeDetails(IN p_StudentId INT)
BEGIN
    CALL sp_StudentFee_GetDetailsByStudent(p_StudentId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetBulkStudentFeeDetails;
DROP PROCEDURE IF EXISTS sp_StudentFee_GetBulkDetails;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_StudentFee_GetBulkDetails(
    IN p_StudentIdsJson JSON
)
BEGIN
    -- Batch Details Header
    SELECT 
        sf.StudentFeeId,
        s.StudentId,
        s.StudentName,
        s.AdmissionNo AS AdmissionNumber,
        COALESCE(c.CampusName, '') AS CampusName,
        COALESCE(b.BoardName, '') AS BoardName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        sf.FeeStructureId,
        COALESCE(fs.StructureName, '') AS FeeStructureName,
        COALESCE(sf.PaymentPlan, 'Full Payment') AS PaymentPlan,
        COALESCE(sf.TotalAmount, 0.00) AS TotalAmount,
        COALESCE(sf.ConcessionAmount, 0.00) AS ConcessionAmount,
        COALESCE(sf.PayableAmount, 0.00) AS PayableAmount,
        COALESCE(sf.PaidAmount, 0.00) AS PaidAmount,
        COALESCE(sf.BalanceAmount, 0.00) AS BalanceAmount,
        COALESCE(sf.Status, 'Pending') AS Status,
        sf.AssignedAt
    FROM Students s
    LEFT JOIN StudentFees sf ON sf.StudentId = s.StudentId
    LEFT JOIN FeeStructures fs ON fs.FeeStructureId = sf.FeeStructureId
    LEFT JOIN Campuses c ON c.CampusId = s.CampusId
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN Sections sec ON sec.SectionId = s.SectionId
    WHERE JSON_CONTAINS(p_StudentIdsJson, CAST(s.StudentId AS JSON))
    ORDER BY s.StudentId ASC;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetBulkStudentFeeDetails(IN p_StudentIdsJson JSON)
BEGIN
    CALL sp_StudentFee_GetBulkDetails(p_StudentIdsJson);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetStudentFeeLedger;
DROP PROCEDURE IF EXISTS sp_StudentFee_GetLedger;
DELIMITER //
CREATE PROCEDURE sp_StudentFee_GetLedger(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_PaymentPlan VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Status VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Search VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_BoardId INT
)
BEGIN
    SELECT 
        sf.StudentFeeId,
        sf.StudentId,
        s.AdmissionNo AS AdmissionNumber,
        s.StudentName,
        s.CampusId,
        COALESCE(c.CampusName, '') AS CampusName,
        COALESCE(b.BoardName, '') AS BoardName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        COALESCE(s.RollNo, '') AS RollNumber,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        sf.FeeStructureId,
        COALESCE(fs.StructureName, '') AS FeeStructureName,
        COALESCE(sf.PaymentPlan, 'Full Payment') AS PaymentPlan,
        sf.PayableAmount AS TotalPayable,
        sf.PaidAmount AS TotalPaid,
        sf.BalanceAmount AS Balance,
        sf.ConcessionAmount AS Concession,
        0.00 AS Fine,
        sf.Status,
        next_due.NextDueDate
    FROM StudentFees sf
    INNER JOIN Students s ON s.StudentId = sf.StudentId
    LEFT JOIN FeeStructures fs ON fs.FeeStructureId = sf.FeeStructureId
    LEFT JOIN Campuses c ON c.CampusId = s.CampusId
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN Sections sec ON sec.SectionId = s.SectionId
    LEFT JOIN (
        SELECT fpp.StudentFeeId, MIN(fi.DueDate) AS NextDueDate
        FROM FeeInstallments fi
        INNER JOIN FeePaymentPlans fpp ON fpp.FeePaymentPlanId = fi.FeePaymentPlanId
        WHERE fi.BalanceAmount > 0
        GROUP BY fpp.StudentFeeId
    ) next_due ON next_due.StudentFeeId = sf.StudentFeeId
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR s.SectionId = p_SectionId)
      AND (p_PaymentPlan IS NULL OR TRIM(p_PaymentPlan) = '' OR sf.PaymentPlan = p_PaymentPlan)
      AND (p_Status IS NULL OR TRIM(p_Status) = '' OR sf.Status = p_Status)
      AND (
          p_Search IS NULL OR TRIM(p_Search) = '' OR
          s.StudentName LIKE CONCAT('%', TRIM(p_Search) COLLATE utf8mb4_unicode_ci, '%') OR
          s.AdmissionNo LIKE CONCAT('%', TRIM(p_Search) COLLATE utf8mb4_unicode_ci, '%') OR
          s.RollNo LIKE CONCAT('%', TRIM(p_Search) COLLATE utf8mb4_unicode_ci, '%')
      )
    ORDER BY sf.StudentFeeId DESC;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetStudentFeeLedger(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_PaymentPlan VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Status VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Search VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_BoardId INT
)
BEGIN
    CALL sp_StudentFee_GetLedger(p_CampusId, p_AcademicYearId, p_GroupId, p_SectionId, p_PaymentPlan, p_Status, p_Search, p_BoardId);
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- SECTION 6: FEE CONCESSION & SCHOLARSHIP APPLICATION
-- ------------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_ApplyFeeConcession;
DROP PROCEDURE IF EXISTS sp_FeeConcession_Apply;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeConcession_Apply(
    IN p_StudentId INT,
    IN p_StudentFeeId INT,
    IN p_ScholarshipId INT,
    IN p_ScholarshipName VARCHAR(100),
    IN p_DiscountType VARCHAR(20),
    IN p_DiscountValue DECIMAL(15,2),
    IN p_Reason VARCHAR(500),
    IN p_ApprovedBy INT
)
BEGIN
    DECLARE v_TotalAmount DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_ConcessionAmount DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_DiscountType VARCHAR(20);
    DECLARE v_DiscountVal DECIMAL(15,2);
    DECLARE v_ConcessionId INT;

    SELECT TotalAmount INTO v_TotalAmount FROM StudentFees WHERE StudentFeeId = p_StudentFeeId LIMIT 1;
    IF v_TotalAmount IS NULL OR v_TotalAmount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student fee record not found.';
    END IF;

    IF p_ScholarshipId IS NOT NULL AND p_ScholarshipId > 0 THEN
        SELECT DiscountType, DiscountValue INTO v_DiscountType, v_DiscountVal FROM Scholarships WHERE ScholarshipId = p_ScholarshipId LIMIT 1;
    ELSE
        SET v_DiscountType = COALESCE(p_DiscountType, 'Fixed');
        SET v_DiscountVal = COALESCE(p_DiscountValue, 0.00);
    END IF;

    IF LOWER(TRIM(v_DiscountType)) = 'percentage' THEN
        SET v_ConcessionAmount = ROUND((v_TotalAmount * v_DiscountVal) / 100.0, 2);
    ELSE
        SET v_ConcessionAmount = v_DiscountVal;
    END IF;

    SET v_ConcessionAmount = LEAST(v_ConcessionAmount, v_TotalAmount);

    INSERT INTO FeeConcessions (
        StudentId,
        StudentFeeId,
        ScholarshipId,
        ConcessionType,
        Amount,
        Reason,
        Status,
        AppliedAt,
        ApprovedBy
    )
    VALUES (
        p_StudentId,
        p_StudentFeeId,
        NULLIF(p_ScholarshipId, 0),
        COALESCE(p_ScholarshipName, v_DiscountType),
        v_ConcessionAmount,
        p_Reason,
        'Applied',
        CURRENT_TIMESTAMP(6),
        p_ApprovedBy
    );

    SET v_ConcessionId = LAST_INSERT_ID();

    -- Update StudentFees
    UPDATE StudentFees
    SET ConcessionAmount = v_ConcessionAmount,
        PayableAmount = GREATEST(0.00, TotalAmount - v_ConcessionAmount),
        BalanceAmount = GREATEST(0.00, TotalAmount - v_ConcessionAmount - PaidAmount),
        Status = CASE WHEN (TotalAmount - v_ConcessionAmount) <= PaidAmount THEN 'Paid' ELSE Status END,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentFeeId = p_StudentFeeId;

    -- Sync Students table
    UPDATE Students s
    INNER JOIN StudentFees sf ON sf.StudentFeeId = p_StudentFeeId
    SET s.FeeAmount = sf.PayableAmount,
        s.FeePaid = sf.PaidAmount,
        s.FeeStatus = sf.Status,
        s.UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE s.StudentId = p_StudentId;

    SELECT 
        FeeConcessionId,
        StudentId,
        StudentFeeId,
        ScholarshipId,
        ConcessionType,
        Amount,
        Reason,
        Status,
        AppliedAt,
        ApprovedBy
    FROM FeeConcessions
    WHERE FeeConcessionId = v_ConcessionId;
END //
DELIMITER ;

CREATE PROCEDURE sp_ApplyFeeConcession(
    IN p_StudentId INT,
    IN p_StudentFeeId INT,
    IN p_ScholarshipId INT,
    IN p_Amount DECIMAL(15,2),
    IN p_Reason VARCHAR(500),
    IN p_ApprovedBy INT
)
BEGIN
    CALL sp_FeeConcession_Apply(p_StudentId, p_StudentFeeId, p_ScholarshipId, NULL, 'Fixed', p_Amount, p_Reason, p_ApprovedBy);
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- SECTION 7: ATOMIC FEE COLLECTION & RECEIPTS (WITH FOR UPDATE LOCK)
-- ------------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_CollectFeePayment;
DROP PROCEDURE IF EXISTS sp_FeePayment_Collect;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeePayment_Collect(
    IN p_StudentId INT,
    IN p_StudentFeeId INT,
    IN p_FeeInstallmentIdsJson JSON,
    IN p_Amount DECIMAL(15,2),
    IN p_Discount DECIMAL(15,2),
    IN p_Fine DECIMAL(15,2),
    IN p_PaymentMode VARCHAR(30),
    IN p_TransactionReference VARCHAR(100),
    IN p_Note VARCHAR(500),
    IN p_PaymentDate DATETIME,
    IN p_ReceiptNumber VARCHAR(50),
    IN p_CollectedBy INT
)
BEGIN
    DECLARE v_CurrentBalance DECIMAL(15,2);
    DECLARE v_FinalAmount DECIMAL(15,2);
    DECLARE v_Discount DECIMAL(15,2);
    DECLARE v_Fine DECIMAL(15,2);
    DECLARE v_PaymentId INT;
    DECLARE v_Receipt VARCHAR(50);
    DECLARE v_Remarks VARCHAR(500);
    DECLARE v_PayDate DATETIME;
    DECLARE v_FirstInstId INT DEFAULT NULL;
    DECLARE v_InstCount INT DEFAULT 0;
    DECLARE v_Idx INT DEFAULT 0;
    DECLARE v_InstId INT;
    DECLARE v_InstBal DECIMAL(15,2);
    DECLARE v_InstPay DECIMAL(15,2);
    DECLARE v_Remaining DECIMAL(15,2);

    SET v_Discount = GREATEST(0.00, COALESCE(p_Discount, 0.00));
    SET v_Fine = GREATEST(0.00, COALESCE(p_Fine, 0.00));
    SET v_FinalAmount = p_Amount + v_Fine - v_Discount;

    IF v_FinalAmount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Final payment amount must be greater than zero.';
    END IF;

    -- ATOMIC CONCURRENCY LOCK: Lock the StudentFees row
    SELECT BalanceAmount INTO v_CurrentBalance
    FROM StudentFees
    WHERE StudentFeeId = p_StudentFeeId AND StudentId = p_StudentId
    FOR UPDATE;

    IF v_CurrentBalance IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student fee record not found.';
    END IF;

    IF v_FinalAmount > v_CurrentBalance THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Payment amount cannot exceed outstanding balance.';
    END IF;

    SET v_PayDate = COALESCE(p_PaymentDate, CURRENT_TIMESTAMP(6));

    -- Resolve Remarks
    SET v_Remarks = p_Note;
    IF v_Discount > 0 OR v_Fine > 0 THEN
        SET v_Remarks = CONCAT(
            COALESCE(p_Note, ''),
            CASE WHEN v_Discount > 0 THEN CONCAT(' | Discount: ', FORMAT(v_Discount, 2)) ELSE '' END,
            CASE WHEN v_Fine > 0 THEN CONCAT(' | Fine: ', FORMAT(v_Fine, 2)) ELSE '' END
        );
    END IF;

    -- Generate Receipt Number if missing
    IF p_ReceiptNumber IS NOT NULL AND TRIM(p_ReceiptNumber) != '' THEN
        SET v_Receipt = TRIM(p_ReceiptNumber);
    ELSE
        SET v_Receipt = CONCAT('FEE-', DATE_FORMAT(v_PayDate, '%Y%m%d'), '-', FLOOR(100000 + (RAND() * 900000)));
    END IF;

    -- Extract single or first installment ID if available
    IF p_FeeInstallmentIdsJson IS NOT NULL AND JSON_VALID(p_FeeInstallmentIdsJson) THEN
        SET v_InstCount = JSON_LENGTH(p_FeeInstallmentIdsJson);
        IF v_InstCount = 1 THEN
            SET v_FirstInstId = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_FeeInstallmentIdsJson, '$[0]')) AS UNSIGNED);
        END IF;
    END IF;

    -- 1. Insert into FeePayments
    INSERT INTO FeePayments (
        StudentId,
        StudentFeeId,
        FeeInstallmentId,
        Amount,
        PaymentMode,
        TransactionReference,
        Remarks,
        PaymentDate,
        Status,
        ReceiptNumber,
        CollectedBy
    )
    VALUES (
        p_StudentId,
        p_StudentFeeId,
        v_FirstInstId,
        v_FinalAmount,
        TRIM(p_PaymentMode),
        p_TransactionReference,
        v_Remarks,
        v_PayDate,
        'Success',
        v_Receipt,
        p_CollectedBy
    );

    SET v_PaymentId = LAST_INSERT_ID();

    -- 2. Distribute payment across installments if provided
    IF v_InstCount > 0 THEN
        SET v_Remaining = v_FinalAmount;
        SET v_Idx = 0;
        WHILE v_Idx < v_InstCount AND v_Remaining > 0 DO
            SET v_InstId = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_FeeInstallmentIdsJson, CONCAT('$[', v_Idx, ']'))) AS UNSIGNED);
            
            SELECT BalanceAmount INTO v_InstBal FROM FeeInstallments WHERE FeeInstallmentId = v_InstId FOR UPDATE;
            IF v_InstBal IS NOT NULL AND v_InstBal > 0 THEN
                SET v_InstPay = LEAST(v_Remaining, v_InstBal);
                UPDATE FeeInstallments
                SET PaidAmount = PaidAmount + v_InstPay,
                    BalanceAmount = GREATEST(0.00, Amount - (PaidAmount + v_InstPay)),
                    Status = CASE WHEN Amount <= (PaidAmount + v_InstPay) THEN 'Paid' ELSE 'PartiallyPaid' END
                WHERE FeeInstallmentId = v_InstId;
                SET v_Remaining = v_Remaining - v_InstPay;
            END IF;
            SET v_Idx = v_Idx + 1;
        END WHILE;
    END IF;

    -- 3. Update StudentFees balance
    UPDATE StudentFees
    SET PaidAmount = PaidAmount + v_FinalAmount,
        BalanceAmount = GREATEST(0.00, PayableAmount - (PaidAmount + v_FinalAmount)),
        Status = CASE WHEN PayableAmount <= (PaidAmount + v_FinalAmount) THEN 'Paid' ELSE 'PartiallyPaid' END,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentFeeId = p_StudentFeeId;

    -- 4. Sync Students table
    UPDATE Students s
    INNER JOIN StudentFees sf ON sf.StudentFeeId = p_StudentFeeId
    SET s.FeeAmount = sf.PayableAmount,
        s.FeePaid = sf.PaidAmount,
        s.FeeStatus = sf.Status,
        s.UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE s.StudentId = p_StudentId;

    -- 5. Insert FeeReceipt
    INSERT INTO FeeReceipts (
        FeePaymentId,
        ReceiptNumber,
        ReceiptDate,
        Remarks
    )
    VALUES (
        v_PaymentId,
        v_Receipt,
        v_PayDate,
        p_Note
    );

    -- 6. Return standard FeePaymentResponse
    SELECT 
        fp.FeePaymentId,
        fp.StudentId,
        s.StudentName,
        s.AdmissionNo AS AdmissionNumber,
        fp.StudentFeeId,
        fp.FeeInstallmentId,
        fp.Amount,
        fp.PaymentMode AS PaymentMethod,
        fp.TransactionReference,
        fp.Remarks,
        fp.PaymentDate,
        fp.Status,
        fp.ReceiptNumber
    FROM FeePayments fp
    INNER JOIN Students s ON s.StudentId = fp.StudentId
    WHERE fp.FeePaymentId = v_PaymentId;
END //
DELIMITER ;

CREATE PROCEDURE sp_CollectFeePayment(
    IN p_StudentId INT,
    IN p_StudentFeeId INT,
    IN p_FeeInstallmentId INT,
    IN p_Amount DECIMAL(15,2),
    IN p_Discount DECIMAL(15,2),
    IN p_Fine DECIMAL(15,2),
    IN p_PaymentMode VARCHAR(30),
    IN p_TransactionReference VARCHAR(100),
    IN p_Note VARCHAR(500),
    IN p_PaymentDate DATETIME,
    IN p_CollectedBy INT
)
BEGIN
    DECLARE v_InstJson JSON;
    IF p_FeeInstallmentId IS NOT NULL AND p_FeeInstallmentId > 0 THEN
        SET v_InstJson = JSON_ARRAY(p_FeeInstallmentId);
    ELSE
        SET v_InstJson = NULL;
    END IF;

    CALL sp_FeePayment_Collect(
        p_StudentId,
        p_StudentFeeId,
        v_InstJson,
        p_Amount,
        p_Discount,
        p_Fine,
        p_PaymentMode,
        p_TransactionReference,
        p_Note,
        p_PaymentDate,
        NULL,
        p_CollectedBy
    );
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetFeePaymentById;
DROP PROCEDURE IF EXISTS sp_FeePayment_GetById;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeePayment_GetById(IN p_FeePaymentId INT)
BEGIN
    SELECT 
        fp.FeePaymentId,
        fp.StudentId,
        s.StudentName,
        s.AdmissionNo AS AdmissionNumber,
        fp.StudentFeeId,
        fp.FeeInstallmentId,
        fp.Amount,
        fp.PaymentMode AS PaymentMethod,
        fp.TransactionReference,
        fp.Remarks,
        fp.PaymentDate,
        fp.Status,
        fp.ReceiptNumber
    FROM FeePayments fp
    INNER JOIN Students s ON s.StudentId = fp.StudentId
    WHERE fp.FeePaymentId = p_FeePaymentId;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetFeePaymentById(IN p_FeePaymentId INT)
BEGIN
    CALL sp_FeePayment_GetById(p_FeePaymentId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetPaymentHistoryByStudent;
DROP PROCEDURE IF EXISTS sp_FeePayment_GetHistoryByStudent;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeePayment_GetHistoryByStudent(IN p_StudentId INT)
BEGIN
    SELECT 
        fp.FeePaymentId,
        fp.StudentId,
        s.StudentName,
        s.AdmissionNo AS AdmissionNumber,
        fp.StudentFeeId,
        fp.FeeInstallmentId,
        fp.Amount,
        fp.PaymentMode AS PaymentMethod,
        fp.TransactionReference,
        fp.Remarks,
        fp.PaymentDate,
        fp.Status,
        fp.ReceiptNumber
    FROM FeePayments fp
    INNER JOIN Students s ON s.StudentId = fp.StudentId
    WHERE fp.StudentId = p_StudentId
    ORDER BY fp.FeePaymentId DESC;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetPaymentHistoryByStudent(IN p_StudentId INT)
BEGIN
    CALL sp_FeePayment_GetHistoryByStudent(p_StudentId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_FeePayment_GetBulkHistory;
DELIMITER //
CREATE PROCEDURE sp_FeePayment_GetBulkHistory(IN p_StudentIds TEXT)
BEGIN
    SELECT 
        fp.FeePaymentId,
        fp.StudentId,
        s.StudentName,
        s.AdmissionNo AS AdmissionNumber,
        fp.StudentFeeId,
        fp.FeeInstallmentId,
        fp.Amount,
        fp.PaymentMode AS PaymentMethod,
        fp.TransactionReference,
        fp.Remarks,
        fp.PaymentDate,
        fp.Status,
        fp.ReceiptNumber
    FROM FeePayments fp
    INNER JOIN Students s ON s.StudentId = fp.StudentId
    WHERE p_StudentIds IS NOT NULL 
      AND FIND_IN_SET(fp.StudentId, p_StudentIds)
    ORDER BY fp.FeePaymentId DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetFeeReceipt;
DROP PROCEDURE IF EXISTS sp_FeeReceipt_GetByNumber;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeReceipt_GetByNumber(IN p_ReceiptNumber VARCHAR(50))
BEGIN
    SELECT 
        fr.FeeReceiptId,
        fr.ReceiptNumber,
        fr.ReceiptDate,
        fr.Remarks,
        fp.FeePaymentId,
        fp.StudentId,
        s.StudentName,
        s.AdmissionNo AS AdmissionNumber,
        COALESCE(c.CampusName, '') AS CampusName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        fp.Amount,
        fp.PaymentMode,
        fp.TransactionReference,
        fp.PaymentDate,
        fp.Status
    FROM FeeReceipts fr
    INNER JOIN FeePayments fp ON fp.FeePaymentId = fr.FeePaymentId
    INNER JOIN Students s ON s.StudentId = fp.StudentId
    LEFT JOIN Campuses c ON c.CampusId = s.CampusId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN Sections sec ON sec.SectionId = s.SectionId
    WHERE fr.ReceiptNumber = TRIM(p_ReceiptNumber)
    LIMIT 1;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetFeeReceipt(IN p_ReceiptNumber VARCHAR(50))
BEGIN
    CALL sp_FeeReceipt_GetByNumber(p_ReceiptNumber);
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- SECTION 8: COLLECTION, DUE, DASHBOARD & REPORTS
-- ------------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_GetFeeCollection;
DROP PROCEDURE IF EXISTS sp_FeeCollection_Get;
DELIMITER //
CREATE PROCEDURE sp_FeeCollection_Get(
    IN p_CampusId INT,
    IN p_Search VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        sf.StudentFeeId,
        sf.StudentId,
        s.CampusId,
        COALESCE(c.CampusName, CASE WHEN s.CampusId IS NOT NULL THEN CONCAT('Campus ', s.CampusId) ELSE 'Main Campus' END) AS CampusName,
        s.AdmissionNo AS AdmissionNumber,
        s.StudentName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        sf.PayableAmount AS Payable,
        sf.PaidAmount AS Paid,
        sf.BalanceAmount AS Balance,
        (
            SELECT MIN(fi.DueDate)
            FROM FeeInstallments fi
            INNER JOIN FeePaymentPlans fpp ON fpp.FeePaymentPlanId = fi.FeePaymentPlanId
            WHERE fpp.StudentFeeId = sf.StudentFeeId
              AND fi.BalanceAmount > 0
        ) AS NextDue,
        sf.Status
    FROM StudentFees sf
    INNER JOIN Students s ON s.StudentId = sf.StudentId
    LEFT JOIN Campuses c ON c.CampusId = s.CampusId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN Sections sec ON sec.SectionId = s.SectionId
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (
          p_Search IS NULL OR TRIM(p_Search) = '' OR
          s.StudentName LIKE CONCAT('%', TRIM(p_Search) COLLATE utf8mb4_unicode_ci, '%') OR
          s.AdmissionNo LIKE CONCAT('%', TRIM(p_Search) COLLATE utf8mb4_unicode_ci, '%') OR
          s.RollNo LIKE CONCAT('%', TRIM(p_Search) COLLATE utf8mb4_unicode_ci, '%')
      )
    ORDER BY sf.StudentFeeId DESC;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetFeeCollection(
    IN p_CampusId INT,
    IN p_Search VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    CALL sp_FeeCollection_Get(p_CampusId, p_Search, p_BoardId, p_AcademicYearId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetDueFees;
DROP PROCEDURE IF EXISTS sp_FeeDue_Get;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeDue_Get(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        sf.StudentFeeId,
        sf.StudentId,
        s.CampusId,
        COALESCE(c.CampusName, '') AS CampusName,
        s.AdmissionNo AS AdmissionNumber,
        s.StudentName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(CONCAT('Installment ', fi.InstallmentNumber), 'Schedule Due') AS FeeSchedule,
        fi.DueDate,
        fi.Amount,
        fi.BalanceAmount AS Balance,
        fi.Status
    FROM FeeInstallments fi
    INNER JOIN FeePaymentPlans fpp ON fpp.FeePaymentPlanId = fi.FeePaymentPlanId
    INNER JOIN StudentFees sf ON sf.StudentFeeId = fpp.StudentFeeId
    INNER JOIN Students s ON s.StudentId = sf.StudentId
    LEFT JOIN Campuses c ON c.CampusId = s.CampusId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN Sections sec ON sec.SectionId = s.SectionId
    WHERE fi.BalanceAmount > 0
      AND fi.Status != 'Paid'
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
    ORDER BY fi.DueDate ASC;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetDueFees(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    CALL sp_FeeDue_Get(p_CampusId, p_BoardId, p_AcademicYearId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetFeeDashboard;
DROP PROCEDURE IF EXISTS sp_FeeDashboard_Get;
DELIMITER //
DELIMITER //
CREATE PROCEDURE sp_FeeDashboard_Get(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    -- Result Set 1: Overall KPI Summary
    SELECT 
        COALESCE(SUM(sf.PayableAmount), 0.00) AS TotalExpected,
        COALESCE(SUM(sf.PaidAmount), 0.00) AS TotalCollected,
        COALESCE(SUM(sf.BalanceAmount), 0.00) AS TotalOutstanding,
        ROUND(COALESCE(CASE WHEN SUM(sf.PayableAmount) > 0 THEN (SUM(sf.PaidAmount) / SUM(sf.PayableAmount)) * 100.0 ELSE 0.0 END, 0.0), 2) AS CollectionPercentage,
        COUNT(DISTINCT sf.StudentId) AS TotalStudents,
        COUNT(DISTINCT CASE WHEN sf.BalanceAmount > 0 AND sf.PaidAmount = 0 THEN sf.StudentId END) AS PendingStudents,
        COUNT(DISTINCT CASE WHEN sf.BalanceAmount > 0 AND EXISTS (
            SELECT 1 FROM FeePaymentPlans fpp 
            INNER JOIN FeeInstallments fi ON fi.FeePaymentPlanId = fpp.FeePaymentPlanId
            WHERE fpp.StudentFeeId = sf.StudentFeeId AND fi.BalanceAmount > 0 AND fi.DueDate < NOW()
        ) THEN sf.StudentId END) AS OverdueStudents
    FROM StudentFees sf
    INNER JOIN Students s ON s.StudentId = sf.StudentId
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId);

    -- Result Set 2: Group-Wise Collection Chart
    SELECT 
        COALESCE(g.GroupName, 'Unassigned') AS GroupName,
        COALESCE(SUM(sf.PayableAmount), 0.00) AS Expected,
        COALESCE(SUM(sf.PaidAmount), 0.00) AS Collected,
        COALESCE(SUM(sf.BalanceAmount), 0.00) AS Outstanding
    FROM StudentFees sf
    INNER JOIN Students s ON s.StudentId = sf.StudentId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
    GROUP BY g.GroupId, g.GroupName
    ORDER BY Expected DESC;

    -- Result Set 3: Upcoming Due Schedules
    SELECT 
        sf.StudentFeeId,
        sf.StudentId,
        s.CampusId,
        COALESCE(c.CampusName, '') AS CampusName,
        s.AdmissionNo AS AdmissionNumber,
        s.StudentName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(CONCAT('Installment ', fi.InstallmentNumber), 'Schedule Due') AS FeeSchedule,
        fi.DueDate,
        fi.Amount,
        fi.BalanceAmount AS Balance,
        fi.Status
    FROM FeeInstallments fi
    INNER JOIN FeePaymentPlans fpp ON fpp.FeePaymentPlanId = fi.FeePaymentPlanId
    INNER JOIN StudentFees sf ON sf.StudentFeeId = fpp.StudentFeeId
    INNER JOIN Students s ON s.StudentId = sf.StudentId
    LEFT JOIN Campuses c ON c.CampusId = s.CampusId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN Sections sec ON sec.SectionId = s.SectionId
    WHERE fi.BalanceAmount > 0
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
    ORDER BY fi.DueDate ASC
    LIMIT 10;

    -- Result Set 4: Recent Payments
    SELECT 
        fp.FeePaymentId,
        fp.StudentId,
        s.StudentName,
        s.AdmissionNo AS AdmissionNumber,
        fp.StudentFeeId,
        fp.FeeInstallmentId,
        fp.Amount,
        fp.PaymentMode AS PaymentMethod,
        fp.TransactionReference,
        fp.Remarks,
        fp.PaymentDate,
        fp.Status,
        fp.ReceiptNumber
    FROM FeePayments fp
    INNER JOIN Students s ON s.StudentId = fp.StudentId
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
    ORDER BY fp.FeePaymentId DESC
    LIMIT 10;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetFeeDashboard(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    CALL sp_FeeDashboard_Get(p_CampusId, p_BoardId, p_AcademicYearId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetDailyFeeReport;
DROP PROCEDURE IF EXISTS sp_FeeReport_Daily;
DELIMITER //
CREATE PROCEDURE sp_FeeReport_Daily(
    IN p_CampusId INT,
    IN p_ReportDate DATE
)
BEGIN
    DECLARE v_TargetDate DATE;
    SET v_TargetDate = COALESCE(p_ReportDate, CURDATE());

    -- Result Set 1: Daily Summary
    SELECT 
        v_TargetDate AS ReportDate,
        COALESCE(SUM(fp.Amount), 0.00) AS TotalAmount,
        COUNT(fp.FeePaymentId) AS TotalTransactions,
        COALESCE(SUM(CASE WHEN fp.PaymentMode = 'Cash' THEN fp.Amount ELSE 0 END), 0.00) AS CashAmount,
        COALESCE(SUM(CASE WHEN fp.PaymentMode = 'UPI' THEN fp.Amount ELSE 0 END), 0.00) AS UpiAmount,
        COALESCE(SUM(CASE WHEN fp.PaymentMode IN ('Card', 'Net Banking', 'Bank Transfer') THEN fp.Amount ELSE 0 END), 0.00) AS BankAmount,
        COALESCE(SUM(CASE WHEN fp.PaymentMode = 'Cheque' THEN fp.Amount ELSE 0 END), 0.00) AS ChequeAmount
    FROM FeePayments fp
    INNER JOIN Students s ON s.StudentId = fp.StudentId
    WHERE DATE(fp.PaymentDate) = v_TargetDate
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId);

    -- Result Set 2: Daily Transactions List
    SELECT 
        fp.FeePaymentId,
        fp.StudentId,
        s.StudentName,
        s.AdmissionNo AS AdmissionNumber,
        fp.StudentFeeId,
        fp.FeeInstallmentId,
        fp.Amount,
        fp.PaymentMode AS PaymentMethod,
        fp.TransactionReference,
        fp.Remarks,
        fp.PaymentDate,
        fp.Status,
        fp.ReceiptNumber
    FROM FeePayments fp
    INNER JOIN Students s ON s.StudentId = fp.StudentId
    WHERE DATE(fp.PaymentDate) = v_TargetDate
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
    ORDER BY fp.FeePaymentId DESC;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetDailyFeeReport(IN p_ReportDate DATE)
BEGIN
    CALL sp_FeeReport_Daily(NULL, p_ReportDate);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetMonthlyFeeReport;
DROP PROCEDURE IF EXISTS sp_FeeReport_Monthly;
DELIMITER //
CREATE PROCEDURE sp_FeeReport_Monthly(
    IN p_CampusId INT,
    IN p_Year INT,
    IN p_Month INT
)
BEGIN
    DECLARE v_Year INT;
    DECLARE v_Month INT;

    SET v_Year = COALESCE(p_Year, YEAR(CURDATE()));
    SET v_Month = COALESCE(p_Month, MONTH(CURDATE()));

    -- Result Set 1: Monthly Summary
    SELECT 
        v_Year AS `Year`,
        v_Month AS `Month`,
        COALESCE(SUM(fp.Amount), 0.00) AS TotalAmount,
        COUNT(fp.FeePaymentId) AS TotalTransactions,
        COALESCE(SUM(CASE WHEN fp.PaymentMode = 'Cash' THEN fp.Amount ELSE 0 END), 0.00) AS CashAmount,
        COALESCE(SUM(CASE WHEN fp.PaymentMode = 'UPI' THEN fp.Amount ELSE 0 END), 0.00) AS UpiAmount,
        COALESCE(SUM(CASE WHEN fp.PaymentMode IN ('Card', 'Net Banking', 'Bank Transfer') THEN fp.Amount ELSE 0 END), 0.00) AS BankAmount,
        COALESCE(SUM(CASE WHEN fp.PaymentMode = 'Cheque' THEN fp.Amount ELSE 0 END), 0.00) AS ChequeAmount
    FROM FeePayments fp
    INNER JOIN Students s ON s.StudentId = fp.StudentId
    WHERE YEAR(fp.PaymentDate) = v_Year
      AND MONTH(fp.PaymentDate) = v_Month
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId);

    -- Result Set 2: Daily Collection Breakdown
    SELECT 
        DATE(fp.PaymentDate) AS `Date`,
        COUNT(fp.FeePaymentId) AS TransactionsCount,
        COALESCE(SUM(fp.Amount), 0.00) AS Amount
    FROM FeePayments fp
    INNER JOIN Students s ON s.StudentId = fp.StudentId
    WHERE YEAR(fp.PaymentDate) = v_Year
      AND MONTH(fp.PaymentDate) = v_Month
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
    GROUP BY DATE(fp.PaymentDate)
    ORDER BY `Date` ASC;
END //
DELIMITER ;

CREATE PROCEDURE sp_GetMonthlyFeeReport(IN p_Year INT, IN p_Month INT)
BEGIN
    CALL sp_FeeReport_Monthly(NULL, p_Year, p_Month);
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- SECTION 9: FINE RULES (MIGRATING TO 100% STORED PROCEDURES)
-- ------------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_FineRule_Create;
DELIMITER //
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
    IN p_AcademicYearId INT
)
BEGIN
    DECLARE v_NewId INT;

    INSERT INTO FineRules (
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

DROP PROCEDURE IF EXISTS sp_FineRule_GetAll;
DELIMITER //
CREATE PROCEDURE sp_FineRule_GetAll(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        fr.FineRuleId,
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
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR fr.CampusId IS NULL OR fr.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR fr.BoardId IS NULL OR fr.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR fr.AcademicYearId IS NULL OR fr.AcademicYearId = p_AcademicYearId)
    ORDER BY fr.FineRuleId DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_FineRule_GetById;
DELIMITER //
CREATE PROCEDURE sp_FineRule_GetById(IN p_FineRuleId INT)
BEGIN
    SELECT 
        fr.FineRuleId,
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
    WHERE fr.FineRuleId = p_FineRuleId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_FineRule_Update;
DELIMITER //
CREATE PROCEDURE sp_FineRule_Update(
    IN p_FineRuleId INT,
    IN p_FineRuleName VARCHAR(150),
    IN p_ApplicableFeeId INT,
    IN p_FineType VARCHAR(50),
    IN p_FineAmount DECIMAL(10,2),
    IN p_GracePeriod INT,
    IN p_Status VARCHAR(20),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    UPDATE FineRules
    SET 
        FineRuleName = TRIM(p_FineRuleName),
        ApplicableFeeId = p_ApplicableFeeId,
        FineType = TRIM(p_FineType),
        FineAmount = p_FineAmount,
        GracePeriod = p_GracePeriod,
        Status = COALESCE(p_Status, Status),
        CampusId = NULLIF(p_CampusId, 0),
        BoardId = NULLIF(p_BoardId, 0),
        AcademicYearId = NULLIF(p_AcademicYearId, 0),
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE FineRuleId = p_FineRuleId;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_FineRule_Delete;
DELIMITER //
CREATE PROCEDURE sp_FineRule_Delete(IN p_FineRuleId INT)
BEGIN
    UPDATE FineRules
    SET Status = 'Inactive',
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE FineRuleId = p_FineRuleId;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- SECTION 10: PROMOTION & TRANSFER FEE TRANSITIONS
-- ------------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_FeeTransition_GetMatchingStructure;
DELIMITER //
CREATE PROCEDURE sp_FeeTransition_GetMatchingStructure(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT
)
BEGIN
    SELECT 
        fs.FeeStructureId,
        fs.CampusId,
        fs.BoardId,
        fs.AcademicYearId,
        fs.AcademicLevelId,
        fs.GroupId,
        fs.ProgramId,
        fs.StructureName,
        COALESCE((SELECT SUM(Amount) FROM FeeStructureComponents WHERE FeeStructureId = fs.FeeStructureId AND IsActive = 1), 0.00) AS TotalAmount
    FROM FeeStructures fs
    WHERE fs.IsActive = 1
      AND (p_BoardId <= 0 OR fs.BoardId = p_BoardId)
      AND fs.GroupId = p_GroupId
    ORDER BY 
        CASE WHEN p_ProgramId IS NOT NULL AND fs.ProgramId = p_ProgramId THEN 100 WHEN fs.ProgramId IS NULL THEN 10 ELSE 0 END DESC,
        CASE WHEN fs.AcademicYearId = p_AcademicYearId THEN 50 ELSE 0 END DESC,
        CASE WHEN p_AcademicLevelId IS NOT NULL AND fs.AcademicLevelId = p_AcademicLevelId THEN 30 ELSE 0 END DESC,
        CASE WHEN p_CampusId IS NOT NULL AND fs.CampusId = p_CampusId THEN 20 WHEN fs.CampusId IS NULL THEN 10 ELSE 0 END DESC
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_FeeTransition_ApplyTransfer;
DELIMITER //
CREATE PROCEDURE sp_FeeTransition_ApplyTransfer(
    IN p_StudentId INT,
    IN p_ToCampusId INT,
    IN p_DestinationFeeStructureId INT,
    IN p_TransferPaidCredit BOOLEAN,
    IN p_PerformedBy VARCHAR(100)
)
BEGIN
    DECLARE v_TargetStructureId INT;
    DECLARE v_CurrentFeeId INT;
    DECLARE v_PaidAmount DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_ConcessionAmount DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_CreditPaid DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_NewTotal DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_NewPayable DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_NewBalance DECIMAL(15,2) DEFAULT 0.00;

    SET v_TargetStructureId = p_DestinationFeeStructureId;

    -- If target structure not provided, resolve best match
    IF v_TargetStructureId IS NULL OR v_TargetStructureId <= 0 THEN
        SELECT fs.FeeStructureId INTO v_TargetStructureId
        FROM Students s
        INNER JOIN FeeStructures fs ON fs.GroupId = s.GroupId
        WHERE s.StudentId = p_StudentId
          AND fs.IsActive = 1
          AND (s.BoardId <= 0 OR fs.BoardId = s.BoardId)
        ORDER BY 
            CASE WHEN s.ProgramId IS NOT NULL AND fs.ProgramId = s.ProgramId THEN 100 ELSE 0 END DESC,
            CASE WHEN fs.AcademicYearId = s.AcademicYearId THEN 50 ELSE 0 END DESC,
            CASE WHEN fs.CampusId = p_ToCampusId THEN 20 ELSE 10 END DESC
        LIMIT 1;
    END IF;

    -- Calculate target structure total
    SELECT COALESCE(SUM(Amount), 0.00) INTO v_NewTotal
    FROM FeeStructureComponents
    WHERE FeeStructureId = v_TargetStructureId AND IsActive = 1;

    -- Find current student fee
    SELECT StudentFeeId, PaidAmount, ConcessionAmount INTO v_CurrentFeeId, v_PaidAmount, v_ConcessionAmount
    FROM StudentFees
    WHERE StudentId = p_StudentId
    ORDER BY StudentFeeId DESC
    LIMIT 1;

    IF v_CurrentFeeId IS NOT NULL THEN
        SET v_CreditPaid = CASE WHEN p_TransferPaidCredit = TRUE THEN v_PaidAmount ELSE 0.00 END;
        SET v_NewPayable = GREATEST(0.00, v_NewTotal - v_ConcessionAmount);
        SET v_NewBalance = GREATEST(0.00, v_NewPayable - v_CreditPaid);

        UPDATE StudentFees
        SET FeeStructureId = v_TargetStructureId,
            TotalAmount = v_NewTotal,
            PayableAmount = v_NewPayable,
            PaidAmount = v_CreditPaid,
            BalanceAmount = v_NewBalance,
            Status = CASE WHEN v_NewBalance = 0 THEN 'Paid' WHEN v_CreditPaid > 0 THEN 'Partial' ELSE 'Pending' END,
            UpdatedAt = CURRENT_TIMESTAMP(6)
        WHERE StudentFeeId = v_CurrentFeeId;

        -- Refresh components
        DELETE FROM StudentFeeComponents WHERE StudentFeeId = v_CurrentFeeId;
        INSERT INTO StudentFeeComponents (
            StudentFeeId,
            FeeStructureComponentId,
            Amount,
            ConcessionAmount,
            PayableAmount,
            PaidAmount,
            BalanceAmount,
            DueDate,
            Status
        )
        SELECT 
            v_CurrentFeeId,
            FeeStructureComponentId,
            Amount,
            0.00,
            Amount,
            0.00,
            Amount,
            DueDate,
            'Pending'
        FROM FeeStructureComponents
        WHERE FeeStructureId = v_TargetStructureId AND IsActive = 1;
    ELSE
        -- Assign fresh fee structure
        CALL sp_StudentFee_Assign(p_StudentId, v_TargetStructureId, 'Full Payment', 1);
    END IF;

    -- Update Students table
    UPDATE Students
    SET CampusId = p_ToCampusId,
        FeeStructureId = v_TargetStructureId,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentId = p_StudentId;

    SELECT 1 AS Success;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_FeeTransition_PreviewTransfer;
DELIMITER //
CREATE PROCEDURE sp_FeeTransition_PreviewTransfer(
    IN p_TransferId INT
)
BEGIN
    SELECT 
        t.TransferId,
        t.StudentId,
        s.StudentName,
        t.FromCampusId,
        COALESCE(cFrom.CampusName, CONCAT('Campus ', t.FromCampusId)) AS FromCampusName,
        t.ToCampusId,
        COALESCE(cTo.CampusName, CONCAT('Campus ', t.ToCampusId)) AS ToCampusName,
        sf.FeeStructureId AS CurrentFeeStructureId,
        fs.StructureName AS CurrentFeeStructureName,
        COALESCE(sf.TotalAmount, 0.00) AS CurrentTotalAmount,
        COALESCE(sf.PaidAmount, 0.00) AS CurrentPaidAmount,
        COALESCE(sf.BalanceAmount, 0.00) AS CurrentBalanceAmount
    FROM StudentCampusTransfers t
    INNER JOIN Students s ON s.StudentId = t.StudentId
    LEFT JOIN Campuses cFrom ON cFrom.CampusId = t.FromCampusId
    LEFT JOIN Campuses cTo ON cTo.CampusId = t.ToCampusId
    LEFT JOIN StudentFees sf ON sf.StudentId = t.StudentId
    LEFT JOIN FeeStructures fs ON fs.FeeStructureId = sf.FeeStructureId
    WHERE t.TransferId = p_TransferId
    ORDER BY sf.StudentFeeId DESC
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_FeeTransition_PreviewProgramAdjustment;
DELIMITER //
CREATE PROCEDURE sp_FeeTransition_PreviewProgramAdjustment(
    IN p_StudentId INT,
    IN p_TargetProgramId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.StudentName,
        s.CampusId,
        s.ProgramId AS CurrentProgramId,
        pCur.ProgramName AS CurrentProgramName,
        p_TargetProgramId AS TargetProgramId,
        pTar.ProgramName AS TargetProgramName,
        sf.FeeStructureId AS CurrentFeeStructureId,
        fs.StructureName AS CurrentFeeStructureName,
        COALESCE(sf.TotalAmount, 0.00) AS CurrentTotalAmount,
        COALESCE(sf.PaidAmount, 0.00) AS CurrentPaidAmount,
        COALESCE(sf.BalanceAmount, 0.00) AS CurrentBalanceAmount
    FROM Students s
    LEFT JOIN Programs pCur ON pCur.ProgramId = s.ProgramId
    LEFT JOIN Programs pTar ON pTar.ProgramId = p_TargetProgramId
    LEFT JOIN StudentFees sf ON sf.StudentId = s.StudentId
    LEFT JOIN FeeStructures fs ON fs.FeeStructureId = sf.FeeStructureId
    WHERE s.StudentId = p_StudentId
    ORDER BY sf.StudentFeeId DESC
    LIMIT 1;
END //
DELIMITER ;
