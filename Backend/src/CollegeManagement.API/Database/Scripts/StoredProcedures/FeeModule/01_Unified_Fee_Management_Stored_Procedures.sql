-- ====================================================================================
-- CMS_Inter — Unified Fee Management Module Schema & Stored Procedures
-- Database: CollegeManagement (MySQL 8.0)
-- Collation: utf8mb4_unicode_ci
-- Architecture: 100% Stored Procedures & Dapper, 0% Inline SQL, 0% EF Core Business CRUD
-- ====================================================================================

USE CollegeManagement;

-- 1. Ensure FeeStructures table supports multi-year configurations & FeeStructureComponents links directly to FeeTypes
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

DELIMITER //
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

DELIMITER //
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

DELIMITER //
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

DELIMITER //
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

DELIMITER //
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
    DECLARE v_FirstLevelId INT DEFAULT NULL;
    DECLARE v_SecondLevelId INT DEFAULT NULL;
    DECLARE v_FirstLevelOrder INT DEFAULT 1;
    DECLARE v_FirstYearId INT;
    DECLARE v_SecondYearId INT;
    DECLARE v_Mode VARCHAR(50);
    DECLARE v_IncType VARCHAR(50);
    DECLARE v_IncValue DECIMAL(15,2);
    DECLARE v_IsMultiYear BOOLEAN DEFAULT FALSE;
    DECLARE v_ItemCount INT DEFAULT 0;
    DECLARE v_Idx INT DEFAULT 0;
    DECLARE v_FeeTypeId INT;
    DECLARE v_FeeTypeExists INT DEFAULT 0;
    DECLARE v_Rule VARCHAR(20);
    DECLARE v_Amount DECIMAL(15,2);
    DECLARE v_Category VARCHAR(50);
    DECLARE v_FirstYearTotal DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_IncrementRupees DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_TargetNonAdmFeeTypeId INT DEFAULT 0;
    DECLARE v_MaxNonAdmAmount DECIMAL(15,2) DEFAULT -1.00;
    DECLARE v_FallbackMaxFeeTypeId INT DEFAULT 0;
    DECLARE v_MaxOverallAmount DECIMAL(15,2) DEFAULT -1.00;
    DECLARE v_EffectiveTargetFeeTypeId INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_BoardId IS NULL OR p_BoardId <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid BoardId is required.';
    END IF;
    IF p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid AcademicYearId is required.';
    END IF;
    IF p_GroupId IS NULL OR p_GroupId <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid GroupId is required.';
    END IF;

    IF p_ItemsJson IS NULL OR NOT JSON_VALID(p_ItemsJson) OR JSON_LENGTH(p_ItemsJson) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'At least one fee type item is required.';
    END IF;

    SET v_Mode = NULLIF(LOWER(TRIM(COALESCE(p_YearFeeMode, ''))), '');
    IF v_Mode IS NOT NULL AND v_Mode NOT IN ('same', 'different') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'YearFeeMode must be same or different.';
    END IF;

    IF v_Mode = 'different' THEN
        SET v_IncType = LOWER(TRIM(COALESCE(p_IncrementType, '')));
        SET v_IncValue = p_IncrementValue;
        IF v_IncType NOT IN ('percentage', 'fixed') THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'IncrementType must be percentage or fixed for Different Fees mode.';
        END IF;
        IF v_IncValue IS NULL OR v_IncValue < 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid non-negative IncrementValue is required for Different Fees mode.';
        END IF;
        SET v_IsMultiYear = TRUE;
    ELSEIF v_Mode = 'same' THEN
        SET v_IncType = NULL;
        SET v_IncValue = NULL;
        SET v_IsMultiYear = TRUE;
    ELSE
        SET v_IncType = NULL;
        SET v_IncValue = NULL;
    END IF;

    -- Resolve and validate 1st-year AcademicLevelId
    IF p_AcademicLevelId IS NOT NULL THEN
        IF p_AcademicLevelId <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AcademicLevelId must be greater than zero.';
        END IF;
        SELECT AcademicLevelId INTO v_FirstLevelId
        FROM AcademicLevels
        WHERE AcademicLevelId = p_AcademicLevelId AND IsActive = 1
        LIMIT 1;
        IF v_FirstLevelId IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Specified AcademicLevelId was not found or is inactive.';
        END IF;
    ELSE
        SELECT NULLIF(g.AcademicLevelId, 0) INTO v_FirstLevelId
        FROM `Groups` g
        WHERE g.GroupId = p_GroupId
        LIMIT 1;

        IF v_FirstLevelId IS NULL THEN
            SELECT bal.AcademicLevelId INTO v_FirstLevelId
            FROM BoardAcademicLevels bal
            INNER JOIN AcademicLevels al ON al.AcademicLevelId = bal.AcademicLevelId
            WHERE bal.BoardId = p_BoardId AND bal.IsActive = 1 AND al.IsActive = 1
            ORDER BY al.DisplayOrder ASC, bal.AcademicLevelId ASC
            LIMIT 1;
        END IF;

        SET v_FirstLevelId = COALESCE(v_FirstLevelId, 1);
    END IF;

    SELECT DisplayOrder INTO v_FirstLevelOrder
    FROM AcademicLevels
    WHERE AcademicLevelId = v_FirstLevelId
    LIMIT 1;

    IF v_FirstLevelOrder IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Resolved AcademicLevelId does not exist in AcademicLevels.';
    END IF;

    SELECT GroupName INTO v_GroupName FROM `Groups` WHERE GroupId = p_GroupId LIMIT 1;
    IF p_ProgramId IS NOT NULL AND p_ProgramId > 0 THEN
        SELECT ProgramName INTO v_ProgramName FROM Programs WHERE ProgramId = p_ProgramId LIMIT 1;
    END IF;

    SET v_BaseName = CASE
        WHEN v_ProgramName IS NOT NULL AND v_ProgramName != '' THEN CONCAT(COALESCE(v_GroupName, 'Group'), ' (', v_ProgramName, ')')
        ELSE COALESCE(v_GroupName, CONCAT('Group ', p_GroupId))
    END;

    SET v_FinalName1 = CASE
        WHEN p_StructureName IS NOT NULL AND TRIM(p_StructureName) != '' THEN TRIM(p_StructureName)
        WHEN v_IsMultiYear = TRUE THEN CONCAT(v_BaseName, ' - 1st Year')
        ELSE CONCAT('Fee Structure ', v_BaseName)
    END;

    START TRANSACTION;

    IF EXISTS (
        SELECT 1 FROM FeeStructures
        WHERE BoardId = p_BoardId
          AND AcademicYearId = p_AcademicYearId
          AND AcademicLevelId = v_FirstLevelId
          AND GroupId = p_GroupId
          AND COALESCE(ProgramId, 0) = COALESCE(NULLIF(p_ProgramId, 0), 0)
          AND StructureName = v_FinalName1
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CONFLICT: A fee structure already exists for this Board, Academic Year, Level, Group, Program, and Name.';
    END IF;

    INSERT INTO FeeStructures (
        CampusId, BoardId, AcademicYearId, AcademicLevelId, GroupId, ProgramId,
        StructureName, Description, YearFeeMode, IncrementType, IncrementValue, IsActive, CreatedAt
    )
    VALUES (
        NULLIF(p_CampusId, 0), p_BoardId, p_AcademicYearId, v_FirstLevelId, p_GroupId, NULLIF(p_ProgramId, 0),
        v_FinalName1, p_Description, v_Mode, v_IncType, v_IncValue, 1, CURRENT_TIMESTAMP(6)
    );

    SET v_FirstYearId = LAST_INSERT_ID();
    SET v_ItemCount = JSON_LENGTH(p_ItemsJson);

    WHILE v_Idx < v_ItemCount DO
        SET v_FeeTypeId = CAST(COALESCE(
            NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJson, CONCAT('$[', v_Idx, '].feeTypeId'))), 'null'),
            NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJson, CONCAT('$[', v_Idx, '].FeeTypeId'))), 'null'),
            0
        ) AS SIGNED);

        SET v_Rule = COALESCE(
            NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJson, CONCAT('$[', v_Idx, '].rule'))), 'null'),
            NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJson, CONCAT('$[', v_Idx, '].Rule'))), 'null'),
            'Mandatory'
        );

        SET v_Amount = CAST(COALESCE(
            NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJson, CONCAT('$[', v_Idx, '].amount'))), 'null'),
            NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_ItemsJson, CONCAT('$[', v_Idx, '].Amount'))), 'null'),
            0
        ) AS DECIMAL(15,2));

        IF v_FeeTypeId IS NULL OR v_FeeTypeId <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Each fee item must specify a valid FeeTypeId.';
        END IF;
        IF v_Amount IS NULL OR v_Amount <= 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Each fee item must have an amount greater than zero.';
        END IF;

        SET v_FeeTypeExists = 0;
        SET v_Category = NULL;
        SELECT COUNT(*), MAX(Category) INTO v_FeeTypeExists, v_Category
        FROM FeeTypes
        WHERE FeeTypeId = v_FeeTypeId;

        IF v_FeeTypeExists = 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Referenced FeeTypeId does not exist in FeeTypes.';
        END IF;

        IF EXISTS (SELECT 1 FROM FeeStructureComponents WHERE FeeStructureId = v_FirstYearId AND FeeTypeId = v_FeeTypeId) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CONFLICT: Duplicate FeeTypeId in fee structure items.';
        END IF;

        INSERT INTO FeeStructureComponents (
            FeeStructureId, FeeTypeId, Amount, DefaultAmount, IsMandatory, IsActive, CreatedAt
        )
        VALUES (
            v_FirstYearId, v_FeeTypeId, v_Amount, v_Amount,
            CASE WHEN LOWER(TRIM(v_Rule)) = 'mandatory' THEN 1 ELSE 0 END,
            1, CURRENT_TIMESTAMP(6)
        );

        SET v_FirstYearTotal = v_FirstYearTotal + v_Amount;

        IF LOWER(TRIM(COALESCE(v_Category, ''))) <> 'admission' AND v_Amount > v_MaxNonAdmAmount THEN
            SET v_MaxNonAdmAmount = v_Amount;
            SET v_TargetNonAdmFeeTypeId = v_FeeTypeId;
        END IF;
        IF v_Amount > v_MaxOverallAmount THEN
            SET v_MaxOverallAmount = v_Amount;
            SET v_FallbackMaxFeeTypeId = v_FeeTypeId;
        END IF;

        SET v_Idx = v_Idx + 1;
    END WHILE;

    SET v_EffectiveTargetFeeTypeId = COALESCE(NULLIF(v_TargetNonAdmFeeTypeId, 0), v_FallbackMaxFeeTypeId);

    -- If Multi-Year configuration is requested, generate paired 2nd-Year Structure
    IF v_IsMultiYear = TRUE THEN
        -- Resolve next level for the board cleanly
        SELECT bal.AcademicLevelId INTO v_SecondLevelId
        FROM BoardAcademicLevels bal
        INNER JOIN AcademicLevels al ON al.AcademicLevelId = bal.AcademicLevelId
        WHERE bal.BoardId = p_BoardId
          AND bal.IsActive = 1
          AND al.IsActive = 1
          AND al.DisplayOrder > v_FirstLevelOrder
        ORDER BY al.DisplayOrder ASC, bal.AcademicLevelId ASC
        LIMIT 1;

        IF v_SecondLevelId IS NULL THEN
            SET v_SecondLevelId = CASE v_FirstLevelId
                WHEN 1 THEN 2
                WHEN 3 THEN 4
                WHEN 5 THEN 6
                WHEN 7 THEN 8
                ELSE (SELECT AcademicLevelId FROM AcademicLevels WHERE IsActive = 1 AND DisplayOrder > v_FirstLevelOrder ORDER BY DisplayOrder ASC LIMIT 1)
            END;
        END IF;

        SET v_SecondLevelId = COALESCE(v_SecondLevelId, 2);

        IF v_Mode = 'different' AND v_IncValue IS NOT NULL AND v_IncValue > 0 THEN
            IF v_IncType = 'percentage' THEN
                SET v_IncrementRupees = ROUND((v_FirstYearTotal * v_IncValue) / 100.0, 2);
            ELSE
                SET v_IncrementRupees = ROUND(v_IncValue, 2);
            END IF;
        END IF;

        SET v_FinalName2 = CASE
            WHEN p_StructureName IS NOT NULL AND TRIM(p_StructureName) != '' THEN
                CASE WHEN LOCATE('1st Year', TRIM(p_StructureName)) > 0
                    THEN REPLACE(TRIM(p_StructureName), '1st Year', '2nd Year')
                    ELSE CONCAT(TRIM(p_StructureName), ' - 2nd Year')
                END
            ELSE CONCAT(v_BaseName, ' - 2nd Year')
        END;

        IF EXISTS (
            SELECT 1 FROM FeeStructures
            WHERE BoardId = p_BoardId
              AND AcademicYearId = p_AcademicYearId
              AND AcademicLevelId = v_SecondLevelId
              AND GroupId = p_GroupId
              AND COALESCE(ProgramId, 0) = COALESCE(NULLIF(p_ProgramId, 0), 0)
              AND StructureName = v_FinalName2
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CONFLICT: A 2nd-year fee structure already exists for this combination.';
        END IF;

        INSERT INTO FeeStructures (
            CampusId, BoardId, AcademicYearId, AcademicLevelId, GroupId, ProgramId,
            StructureName, Description, YearFeeMode, IncrementType, IncrementValue, PairedStructureId, IsActive, CreatedAt
        )
        VALUES (
            NULLIF(p_CampusId, 0), p_BoardId, p_AcademicYearId, v_SecondLevelId, p_GroupId, NULLIF(p_ProgramId, 0),
            v_FinalName2, p_Description, v_Mode, v_IncType, v_IncValue, v_FirstYearId, 1, CURRENT_TIMESTAMP(6)
        );

        SET v_SecondYearId = LAST_INSERT_ID();
        UPDATE FeeStructures SET PairedStructureId = v_SecondYearId WHERE FeeStructureId = v_FirstYearId;

        -- First-year total + increment: keep all 1st-year components intact and add increment to the largest non-Admission component
        INSERT INTO FeeStructureComponents (
            FeeStructureId, FeeTypeId, Amount, DefaultAmount, IsMandatory, IsActive, CreatedAt
        )
        SELECT
            v_SecondYearId,
            fsc.FeeTypeId,
            fsc.Amount + CASE WHEN v_Mode = 'different' AND fsc.FeeTypeId = v_EffectiveTargetFeeTypeId THEN v_IncrementRupees ELSE 0.00 END,
            fsc.Amount + CASE WHEN v_Mode = 'different' AND fsc.FeeTypeId = v_EffectiveTargetFeeTypeId THEN v_IncrementRupees ELSE 0.00 END,
            fsc.IsMandatory,
            1,
            CURRENT_TIMESTAMP(6)
        FROM FeeStructureComponents fsc
        WHERE fsc.FeeStructureId = v_FirstYearId
          AND fsc.IsActive = 1
        ORDER BY fsc.FeeStructureComponentId ASC;
    END IF;

    COMMIT;

    CALL sp_FeeStructure_GetById(v_FirstYearId);
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
    CALL sp_FeeStructure_Create(NULL, p_BoardId, p_AcademicYearId, NULL, p_GroupId, p_ProgramId, NULL, NULL, NULL, NULL, NULL, JSON_ARRAY());
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetFeeStructures;
DROP PROCEDURE IF EXISTS sp_FeeStructure_GetAll;
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
        fs.Description,
        fs.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        fs.YearFeeMode,
        fs.IncrementType,
        fs.IncrementValue,
        CASE WHEN pair_fs.FeeStructureId IS NOT NULL AND pair_fs.IsActive = 1 THEN fs.PairedStructureId ELSE NULL END AS PairedStructureId,
        CASE
            WHEN pair_fs.FeeStructureId IS NOT NULL AND pair_fs.IsActive = 1 AND COALESCE(al_pair.DisplayOrder, pair_fs.AcademicLevelId) > COALESCE(al.DisplayOrder, fs.AcademicLevelId)
                THEN COALESCE(pair_comp.TotalAmount, 0.00)
            WHEN pair_fs.FeeStructureId IS NOT NULL AND pair_fs.IsActive = 1 AND COALESCE(al.DisplayOrder, fs.AcademicLevelId) > COALESCE(al_pair.DisplayOrder, pair_fs.AcademicLevelId)
                THEN COALESCE(comp.TotalAmount, 0.00)
            ELSE NULL
        END AS SecondYearTotalAmount,
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
    LEFT JOIN FeeStructures pair_fs ON pair_fs.FeeStructureId = fs.PairedStructureId
    LEFT JOIN AcademicLevels al_pair ON al_pair.AcademicLevelId = pair_fs.AcademicLevelId
    LEFT JOIN (
        SELECT FeeStructureId, SUM(Amount) AS TotalAmount
        FROM FeeStructureComponents
        WHERE IsActive = 1
        GROUP BY FeeStructureId
    ) comp ON comp.FeeStructureId = fs.FeeStructureId
    LEFT JOIN (
        SELECT FeeStructureId, SUM(Amount) AS TotalAmount
        FROM FeeStructureComponents
        WHERE IsActive = 1
        GROUP BY FeeStructureId
    ) pair_comp ON pair_comp.FeeStructureId = pair_fs.FeeStructureId
    WHERE fs.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR fs.CampusId IS NULL OR fs.CampusId = p_CampusId)
    ORDER BY fs.FeeStructureId DESC;

    -- Result Set 2: Fee Structure Components
    SELECT
        fsc.FeeStructureComponentId,
        fsc.FeeStructureId,
        fsc.FeeTypeId,
        COALESCE(ft.FeeTypeName, '') AS FeeTypeName,
        COALESCE(ft.Category, '') AS Category,
        CASE WHEN fsc.IsMandatory = 1 THEN 'Mandatory' ELSE 'Optional' END AS Rule,
        fsc.Amount,
        fsc.IsActive
    FROM FeeStructureComponents fsc
    INNER JOIN FeeStructures fs ON fs.FeeStructureId = fsc.FeeStructureId
    INNER JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeTypeId
    WHERE fs.IsActive = 1
      AND fsc.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR fs.CampusId IS NULL OR fs.CampusId = p_CampusId)
    ORDER BY fsc.FeeStructureId ASC, fsc.FeeStructureComponentId ASC;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_GetFeeStructures(IN p_CampusId INT)
BEGIN
    CALL sp_FeeStructure_GetAll(p_CampusId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetFeeStructureById;
DROP PROCEDURE IF EXISTS sp_FeeStructure_GetById;
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
        fs.Description,
        fs.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        fs.YearFeeMode,
        fs.IncrementType,
        fs.IncrementValue,
        CASE WHEN pair_fs.FeeStructureId IS NOT NULL AND (fs.IsActive = 0 OR pair_fs.IsActive = 1) THEN fs.PairedStructureId ELSE NULL END AS PairedStructureId,
        CASE
            WHEN pair_fs.FeeStructureId IS NOT NULL AND (fs.IsActive = 0 OR pair_fs.IsActive = 1) AND COALESCE(al_pair.DisplayOrder, pair_fs.AcademicLevelId) > COALESCE(al.DisplayOrder, fs.AcademicLevelId)
                THEN COALESCE(pair_comp.TotalAmount, 0.00)
            WHEN pair_fs.FeeStructureId IS NOT NULL AND (fs.IsActive = 0 OR pair_fs.IsActive = 1) AND COALESCE(al.DisplayOrder, fs.AcademicLevelId) > COALESCE(al_pair.DisplayOrder, pair_fs.AcademicLevelId)
                THEN COALESCE(comp.TotalAmount, 0.00)
            ELSE NULL
        END AS SecondYearTotalAmount,
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
    LEFT JOIN FeeStructures pair_fs ON pair_fs.FeeStructureId = fs.PairedStructureId
    LEFT JOIN AcademicLevels al_pair ON al_pair.AcademicLevelId = pair_fs.AcademicLevelId
    LEFT JOIN (
        SELECT FeeStructureId, SUM(Amount) AS TotalAmount
        FROM FeeStructureComponents
        WHERE IsActive = 1
        GROUP BY FeeStructureId
    ) comp ON comp.FeeStructureId = fs.FeeStructureId
    LEFT JOIN (
        SELECT FeeStructureId, SUM(Amount) AS TotalAmount
        FROM FeeStructureComponents
        WHERE IsActive = 1
        GROUP BY FeeStructureId
    ) pair_comp ON pair_comp.FeeStructureId = pair_fs.FeeStructureId
    WHERE fs.FeeStructureId = p_FeeStructureId;

    -- Result Set 2: Components
    SELECT
        fsc.FeeStructureComponentId,
        fsc.FeeStructureId,
        fsc.FeeTypeId,
        COALESCE(ft.FeeTypeName, '') AS FeeTypeName,
        COALESCE(ft.Category, '') AS Category,
        CASE WHEN fsc.IsMandatory = 1 THEN 'Mandatory' ELSE 'Optional' END AS Rule,
        fsc.Amount,
        fsc.IsActive
    FROM FeeStructureComponents fsc
    INNER JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeTypeId
    WHERE fsc.FeeStructureId = p_FeeStructureId
      AND fsc.IsActive = 1
    ORDER BY fsc.FeeStructureComponentId ASC;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_GetFeeStructureById(IN p_FeeStructureId INT)
BEGIN
    CALL sp_FeeStructure_GetById(p_FeeStructureId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateFeeStructure;
DROP PROCEDURE IF EXISTS sp_FeeStructure_Update;
DELIMITER //
CREATE PROCEDURE sp_FeeStructure_Update(
    IN p_FeeStructureId INT,
    IN p_CampusId INT,
    IN p_StructureName VARCHAR(150),
    IN p_Description VARCHAR(500),
    IN p_ProgramId INT,
    IN p_AcademicLevelId INT,
    IN p_YearFeeMode VARCHAR(50),
    IN p_IncrementType VARCHAR(50),
    IN p_IncrementValue DECIMAL(15,2),
    IN p_IsActive BOOLEAN
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;
    DECLARE v_CurBoardId INT;
    DECLARE v_CurYearId INT;
    DECLARE v_CurLevelId INT;
    DECLARE v_CurGroupId INT;
    DECLARE v_CurProgramId INT;
    DECLARE v_CurCampusId INT;
    DECLARE v_CurName VARCHAR(150);
    DECLARE v_CurMode VARCHAR(50);
    DECLARE v_CurIncType VARCHAR(50);
    DECLARE v_CurIncValue DECIMAL(15,2);
    DECLARE v_CurPairId INT;
    DECLARE v_NewProgramId INT;
    DECLARE v_NewCampusId INT;
    DECLARE v_NewLevelId INT;
    DECLARE v_NewName VARCHAR(150);
    DECLARE v_NextMode VARCHAR(50);
    DECLARE v_NextIncType VARCHAR(50);
    DECLARE v_NextIncValue DECIMAL(15,2);
    DECLARE v_BaseId INT;
    DECLARE v_PairId INT;
    DECLARE v_BaseLevelId INT;
    DECLARE v_PairLevelId INT;
    DECLARE v_BaseLevelOrder INT;
    DECLARE v_PairLevelOrder INT;
    DECLARE v_SecondLevelId INT DEFAULT NULL;
    DECLARE v_BaseTotal DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_IncrementRupees DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_TargetFeeTypeId INT DEFAULT 0;
    DECLARE v_PairName VARCHAR(150);
    DECLARE v_GroupName VARCHAR(100);
    DECLARE v_ProgramName VARCHAR(100);
    DECLARE v_DefaultBase VARCHAR(150);
    DECLARE v_PairRefs INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT COUNT(*), MAX(BoardId), MAX(AcademicYearId), MAX(AcademicLevelId), MAX(GroupId),
           MAX(ProgramId), MAX(CampusId), MAX(StructureName), MAX(YearFeeMode),
           MAX(IncrementType), MAX(IncrementValue), MAX(PairedStructureId)
    INTO v_Exists, v_CurBoardId, v_CurYearId, v_CurLevelId, v_CurGroupId,
         v_CurProgramId, v_CurCampusId, v_CurName, v_CurMode,
         v_CurIncType, v_CurIncValue, v_CurPairId
    FROM FeeStructures
    WHERE FeeStructureId = p_FeeStructureId
    FOR UPDATE;

    IF v_Exists = 0 THEN
        COMMIT;
        CALL sp_FeeStructure_GetById(0);
    ELSE
        IF p_ProgramId IS NOT NULL THEN
            IF p_ProgramId <= 0 OR NOT EXISTS (SELECT 1 FROM Programs WHERE ProgramId = p_ProgramId) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Referenced ProgramId does not exist.';
            END IF;
        END IF;

        IF p_AcademicLevelId IS NOT NULL THEN
            IF p_AcademicLevelId <= 0 OR NOT EXISTS (SELECT 1 FROM AcademicLevels WHERE AcademicLevelId = p_AcademicLevelId AND IsActive = 1) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Specified AcademicLevelId was not found or is inactive.';
            END IF;
        END IF;

        SET v_NewProgramId = COALESCE(p_ProgramId, v_CurProgramId);
        SET v_NewCampusId = COALESCE(NULLIF(p_CampusId, 0), v_CurCampusId);
        SET v_NewLevelId = COALESCE(p_AcademicLevelId, v_CurLevelId);
        SET v_NewName = COALESCE(NULLIF(TRIM(p_StructureName), ''), v_CurName);

        IF EXISTS (
            SELECT 1 FROM FeeStructures
            WHERE FeeStructureId <> p_FeeStructureId
              AND BoardId = v_CurBoardId
              AND AcademicYearId = v_CurYearId
              AND AcademicLevelId = v_NewLevelId
              AND GroupId = v_CurGroupId
              AND COALESCE(ProgramId, 0) = COALESCE(v_NewProgramId, 0)
              AND StructureName = v_NewName
        ) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CONFLICT: Another fee structure already exists for that combination.';
        END IF;

        UPDATE FeeStructures
        SET CampusId = v_NewCampusId,
            ProgramId = v_NewProgramId,
            AcademicLevelId = v_NewLevelId,
            StructureName = v_NewName,
            Description = COALESCE(p_Description, Description),
            IsActive = COALESCE(p_IsActive, IsActive),
            UpdatedAt = CURRENT_TIMESTAMP(6)
        WHERE FeeStructureId = p_FeeStructureId;

        -- Sync ProgramId & CampusId to paired partner if present and non-conflicting
        IF v_CurPairId IS NOT NULL AND (p_ProgramId IS NOT NULL OR (p_CampusId IS NOT NULL AND p_CampusId > 0)) THEN
            IF NOT EXISTS (
                SELECT 1
                FROM FeeStructures pf
                INNER JOIN FeeStructures dup
                    ON dup.FeeStructureId <> pf.FeeStructureId
                   AND dup.BoardId = pf.BoardId
                   AND dup.AcademicYearId = pf.AcademicYearId
                   AND dup.AcademicLevelId = pf.AcademicLevelId
                   AND dup.GroupId = pf.GroupId
                   AND COALESCE(dup.ProgramId, 0) = COALESCE(v_NewProgramId, 0)
                   AND dup.StructureName = pf.StructureName
                WHERE pf.FeeStructureId = v_CurPairId
            ) THEN
                UPDATE FeeStructures
                SET ProgramId = COALESCE(p_ProgramId, ProgramId),
                    CampusId = COALESCE(NULLIF(p_CampusId, 0), CampusId),
                    UpdatedAt = CURRENT_TIMESTAMP(6)
                WHERE FeeStructureId = v_CurPairId;
            ELSE
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CONFLICT: Updating ProgramId would duplicate an existing paired fee structure.';
            END IF;
        END IF;

        -- Sync year configuration if caller supplied any year config fields
        IF p_YearFeeMode IS NOT NULL OR p_IncrementType IS NOT NULL OR p_IncrementValue IS NOT NULL THEN
            SET v_NextMode = LOWER(TRIM(COALESCE(NULLIF(TRIM(p_YearFeeMode), ''), NULLIF(TRIM(v_CurMode), ''), '')));
            IF v_NextMode NOT IN ('same', 'different') THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'YearFeeMode must be same or different when configuring multi-year settings.';
            END IF;

            IF v_NextMode = 'different' THEN
                SET v_NextIncType = LOWER(TRIM(COALESCE(NULLIF(TRIM(p_IncrementType), ''), NULLIF(TRIM(v_CurIncType), ''), '')));
                SET v_NextIncValue = COALESCE(p_IncrementValue, v_CurIncValue);
                IF v_NextIncType NOT IN ('percentage', 'fixed') THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'IncrementType (percentage or fixed) is required for Different Fees mode.';
                END IF;
                IF v_NextIncValue IS NULL OR v_NextIncValue < 0 THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Non-negative IncrementValue is required for Different Fees mode.';
                END IF;
            ELSE
                SET v_NextIncType = NULL;
                SET v_NextIncValue = NULL;
            END IF;

            -- Identify 1st-year base structure vs 2nd-year paired structure
            IF v_CurPairId IS NOT NULL AND EXISTS (SELECT 1 FROM FeeStructures WHERE FeeStructureId = v_CurPairId) THEN
                SELECT al.DisplayOrder INTO v_BaseLevelOrder
                FROM AcademicLevels al WHERE al.AcademicLevelId = v_NewLevelId LIMIT 1;
                SELECT fs2.AcademicLevelId, COALESCE(al2.DisplayOrder, fs2.AcademicLevelId)
                INTO v_PairLevelId, v_PairLevelOrder
                FROM FeeStructures fs2
                LEFT JOIN AcademicLevels al2 ON al2.AcademicLevelId = fs2.AcademicLevelId
                WHERE fs2.FeeStructureId = v_CurPairId
                LIMIT 1;

                IF COALESCE(v_BaseLevelOrder, v_NewLevelId) <= COALESCE(v_PairLevelOrder, v_PairLevelId) THEN
                    SET v_BaseId = p_FeeStructureId;
                    SET v_PairId = v_CurPairId;
                ELSE
                    SET v_BaseId = v_CurPairId;
                    SET v_PairId = p_FeeStructureId;
                END IF;
            ELSE
                -- Check that unpaired structure is not already a 2nd-year level
                IF v_NewLevelId IN (2, 4, 6, 8) THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Year fee configuration cannot be applied to an unpaired 2nd-year structure.';
                END IF;
                SET v_BaseId = p_FeeStructureId;
                SET v_PairId = NULL;
            END IF;

            -- Safety guard: do not modify 2nd-year amounts if students/admissions are already assigned to v_PairId
            IF v_PairId IS NOT NULL THEN
                SELECT
                    (SELECT COUNT(*) FROM StudentFees WHERE FeeStructureId = v_PairId) +
                    (SELECT COUNT(*) FROM Students WHERE FeeStructureId = v_PairId) +
                    (SELECT COUNT(*) FROM StudentAdmissions WHERE FeeStructureId = v_PairId) +
                    (SELECT COUNT(*) FROM AdmissionFeeAssignments WHERE FeeStructureId = v_PairId)
                INTO v_PairRefs;

                IF v_PairRefs > 0 THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CONFLICT: Cannot update year configuration because students or admissions are already assigned to the 2nd-year fee structure.';
                END IF;
            END IF;

            -- Compute base total & target increment component from active 1st-year items
            SELECT COALESCE(SUM(Amount), 0.00) INTO v_BaseTotal
            FROM FeeStructureComponents
            WHERE FeeStructureId = v_BaseId AND IsActive = 1;

            IF v_BaseTotal <= 0 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot configure year pricing on a structure without active fee items.';
            END IF;

            SELECT fsc.FeeTypeId INTO v_TargetFeeTypeId
            FROM FeeStructureComponents fsc
            INNER JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeTypeId
            WHERE fsc.FeeStructureId = v_BaseId AND fsc.IsActive = 1
            ORDER BY CASE WHEN LOWER(TRIM(COALESCE(ft.Category, ''))) <> 'admission' THEN 0 ELSE 1 END ASC,
                     fsc.Amount DESC,
                     fsc.FeeStructureComponentId ASC
            LIMIT 1;

            IF v_NextMode = 'different' AND v_NextIncValue > 0 THEN
                IF v_NextIncType = 'percentage' THEN
                    SET v_IncrementRupees = ROUND((v_BaseTotal * v_NextIncValue) / 100.0, 2);
                ELSE
                    SET v_IncrementRupees = ROUND(v_NextIncValue, 2);
                END IF;
            ELSE
                SET v_IncrementRupees = 0.00;
            END IF;

            IF v_PairId IS NULL THEN
                SELECT AcademicLevelId INTO v_BaseLevelId FROM FeeStructures WHERE FeeStructureId = v_BaseId LIMIT 1;
                SELECT DisplayOrder INTO v_BaseLevelOrder FROM AcademicLevels WHERE AcademicLevelId = v_BaseLevelId LIMIT 1;

                SELECT bal.AcademicLevelId INTO v_SecondLevelId
                FROM BoardAcademicLevels bal
                INNER JOIN AcademicLevels al ON al.AcademicLevelId = bal.AcademicLevelId
                WHERE bal.BoardId = v_CurBoardId AND bal.IsActive = 1 AND al.IsActive = 1 AND al.DisplayOrder > COALESCE(v_BaseLevelOrder, v_BaseLevelId)
                ORDER BY al.DisplayOrder ASC, bal.AcademicLevelId ASC
                LIMIT 1;

                IF v_SecondLevelId IS NULL THEN
                    SET v_SecondLevelId = CASE v_BaseLevelId
                        WHEN 1 THEN 2
                        WHEN 3 THEN 4
                        WHEN 5 THEN 6
                        WHEN 7 THEN 8
                        ELSE COALESCE((SELECT AcademicLevelId FROM AcademicLevels WHERE IsActive = 1 AND DisplayOrder > COALESCE(v_BaseLevelOrder, v_BaseLevelId) ORDER BY DisplayOrder ASC LIMIT 1), 2)
                    END;
                END IF;

                SELECT GroupName INTO v_GroupName FROM `Groups` WHERE GroupId = v_CurGroupId LIMIT 1;
                IF v_NewProgramId IS NOT NULL AND v_NewProgramId > 0 THEN
                    SELECT ProgramName INTO v_ProgramName FROM Programs WHERE ProgramId = v_NewProgramId LIMIT 1;
                END IF;
                SET v_DefaultBase = CASE
                    WHEN v_ProgramName IS NOT NULL AND v_ProgramName != '' THEN CONCAT(COALESCE(v_GroupName, 'Group'), ' (', v_ProgramName, ')')
                    ELSE COALESCE(v_GroupName, CONCAT('Group ', v_CurGroupId))
                END;

                SELECT StructureName INTO v_CurName FROM FeeStructures WHERE FeeStructureId = v_BaseId LIMIT 1;
                SET v_PairName = CASE
                    WHEN v_CurName IS NOT NULL AND LOCATE('1st Year', v_CurName) > 0 THEN REPLACE(v_CurName, '1st Year', '2nd Year')
                    WHEN v_CurName IS NOT NULL AND TRIM(v_CurName) != '' THEN CONCAT(TRIM(v_CurName), ' - 2nd Year')
                    ELSE CONCAT(v_DefaultBase, ' - 2nd Year')
                END;

                IF EXISTS (
                    SELECT 1 FROM FeeStructures
                    WHERE BoardId = v_CurBoardId
                      AND AcademicYearId = v_CurYearId
                      AND AcademicLevelId = v_SecondLevelId
                      AND GroupId = v_CurGroupId
                      AND COALESCE(ProgramId, 0) = COALESCE(v_NewProgramId, 0)
                      AND StructureName = v_PairName
                ) THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CONFLICT: A paired 2nd-year structure already exists for this scope.';
                END IF;

                INSERT INTO FeeStructures (
                    CampusId, BoardId, AcademicYearId, AcademicLevelId, GroupId, ProgramId,
                    StructureName, Description, YearFeeMode, IncrementType, IncrementValue, PairedStructureId, IsActive, CreatedAt
                )
                SELECT
                    CampusId, BoardId, AcademicYearId, v_SecondLevelId, GroupId, ProgramId,
                    v_PairName, Description, v_NextMode, v_NextIncType, v_NextIncValue, v_BaseId, IsActive, CURRENT_TIMESTAMP(6)
                FROM FeeStructures
                WHERE FeeStructureId = v_BaseId;

                SET v_PairId = LAST_INSERT_ID();
            ELSE
                UPDATE FeeStructures
                SET YearFeeMode = v_NextMode,
                    IncrementType = v_NextIncType,
                    IncrementValue = v_NextIncValue,
                    UpdatedAt = CURRENT_TIMESTAMP(6)
                WHERE FeeStructureId = v_PairId;

                UPDATE FeeStructureComponents
                SET IsActive = 0,
                    UpdatedAt = CURRENT_TIMESTAMP(6)
                WHERE FeeStructureId = v_PairId;
            END IF;

            -- Upsert all active 1st-year components into 2nd-year structure using FirstYearTotal + Increment rule
            INSERT INTO FeeStructureComponents (
                FeeStructureId, FeeTypeId, Amount, DefaultAmount, DueDate, IsMandatory, IsActive, CreatedAt
            )
            SELECT
                v_PairId,
                src.FeeTypeId,
                src.Amount + CASE WHEN v_NextMode = 'different' AND src.FeeTypeId = v_TargetFeeTypeId THEN v_IncrementRupees ELSE 0.00 END,
                src.Amount + CASE WHEN v_NextMode = 'different' AND src.FeeTypeId = v_TargetFeeTypeId THEN v_IncrementRupees ELSE 0.00 END,
                src.DueDate,
                src.IsMandatory,
                1,
                CURRENT_TIMESTAMP(6)
            FROM FeeStructureComponents src
            WHERE src.FeeStructureId = v_BaseId AND src.IsActive = 1
            ON DUPLICATE KEY UPDATE
                Amount = VALUES(Amount),
                DefaultAmount = VALUES(DefaultAmount),
                DueDate = VALUES(DueDate),
                IsMandatory = VALUES(IsMandatory),
                IsActive = 1,
                UpdatedAt = CURRENT_TIMESTAMP(6);

            UPDATE FeeStructures
            SET YearFeeMode = v_NextMode,
                IncrementType = v_NextIncType,
                IncrementValue = v_NextIncValue,
                PairedStructureId = v_PairId,
                UpdatedAt = CURRENT_TIMESTAMP(6)
            WHERE FeeStructureId = v_BaseId;
        END IF;

        COMMIT;
        CALL sp_FeeStructure_GetById(p_FeeStructureId);
    END IF;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_UpdateFeeStructure(
    IN p_FeeStructureId INT,
    IN p_StructureName VARCHAR(150),
    IN p_Description VARCHAR(500),
    IN p_IsActive BOOLEAN
)
BEGIN
    CALL sp_FeeStructure_Update(p_FeeStructureId, NULL, p_StructureName, p_Description, NULL, NULL, NULL, NULL, NULL, p_IsActive);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeleteFeeStructure;
DROP PROCEDURE IF EXISTS sp_FeeStructure_Delete;
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

DELIMITER //
CREATE PROCEDURE sp_DeleteFeeStructure(IN p_FeeStructureId INT)
BEGIN
    CALL sp_FeeStructure_Delete(p_FeeStructureId);
END //
DELIMITER ;

-- ------------------------------------------------------------------------------------
-- SECTION 3: STRUCTURE COMPONENTS (ITEMS)
-- ------------------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_AddFeeStructureItem;
DROP PROCEDURE IF EXISTS sp_AddFeeStructureComponent;
DROP PROCEDURE IF EXISTS sp_FeeStructureComponent_Add;
DELIMITER //
CREATE PROCEDURE sp_FeeStructureComponent_Add(
    IN p_FeeStructureId INT,
    IN p_FeeTypeId INT,
    IN p_Rule VARCHAR(20),
    IN p_Amount DECIMAL(15,2)
)
BEGIN
    DECLARE v_ExistingId INT DEFAULT NULL;
    DECLARE v_ExistingActive BOOLEAN DEFAULT 0;
    DECLARE v_NewId INT;

    IF NOT EXISTS (SELECT 1 FROM FeeStructures WHERE FeeStructureId = p_FeeStructureId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Referenced FeeStructureId does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM FeeTypes WHERE FeeTypeId = p_FeeTypeId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Referenced FeeTypeId does not exist in FeeTypes.';
    END IF;

    SELECT FeeStructureComponentId, IsActive INTO v_ExistingId, v_ExistingActive
    FROM FeeStructureComponents
    WHERE FeeStructureId = p_FeeStructureId AND FeeTypeId = p_FeeTypeId
    LIMIT 1;

    IF v_ExistingId IS NOT NULL THEN
        IF v_ExistingActive = 1 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CONFLICT: This fee type already exists on the fee structure.';
        END IF;

        UPDATE FeeStructureComponents
        SET Amount = p_Amount,
            DefaultAmount = p_Amount,
            IsMandatory = CASE WHEN LOWER(TRIM(p_Rule)) = 'mandatory' THEN 1 ELSE 0 END,
            IsActive = 1,
            UpdatedAt = CURRENT_TIMESTAMP(6)
        WHERE FeeStructureComponentId = v_ExistingId;

        SET v_NewId = v_ExistingId;
    ELSE
        INSERT INTO FeeStructureComponents (
            FeeStructureId, FeeTypeId, Amount, DefaultAmount, IsMandatory, IsActive, CreatedAt
        )
        VALUES (
            p_FeeStructureId, p_FeeTypeId, p_Amount, p_Amount,
            CASE WHEN LOWER(TRIM(p_Rule)) = 'mandatory' THEN 1 ELSE 0 END,
            1, CURRENT_TIMESTAMP(6)
        );
        SET v_NewId = LAST_INSERT_ID();
    END IF;

    SELECT
        fsc.FeeStructureComponentId,
        fsc.FeeStructureId,
        fsc.FeeTypeId,
        COALESCE(ft.FeeTypeName, '') AS FeeTypeName,
        COALESCE(ft.Category, '') AS Category,
        CASE WHEN fsc.IsMandatory = 1 THEN 'Mandatory' ELSE 'Optional' END AS Rule,
        fsc.Amount,
        fsc.IsActive
    FROM FeeStructureComponents fsc
    INNER JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeTypeId
    WHERE fsc.FeeStructureComponentId = v_NewId;
END //
DELIMITER ;

DELIMITER //
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

DELIMITER //
CREATE PROCEDURE sp_AddFeeStructureComponent(
    IN p_FeeStructureId INT,
    IN p_FeeComponentId INT,
    IN p_Amount DECIMAL(15,2),
    IN p_DefaultAmount DECIMAL(15,2),
    IN p_DueDate DATETIME,
    IN p_IsMandatory BOOLEAN
)
BEGIN
    DECLARE v_ResolvedFeeTypeId INT DEFAULT NULL;
    SELECT FeeTypeId INTO v_ResolvedFeeTypeId FROM FeeTypes WHERE FeeTypeId = p_FeeComponentId LIMIT 1;
    IF v_ResolvedFeeTypeId IS NULL THEN
        SELECT FeeTypeId INTO v_ResolvedFeeTypeId FROM FeeComponents WHERE FeeComponentId = p_FeeComponentId LIMIT 1;
    END IF;

    INSERT INTO FeeStructureComponents (FeeStructureId, FeeTypeId, Amount, DefaultAmount, DueDate, IsMandatory, IsActive)
    VALUES (p_FeeStructureId, COALESCE(v_ResolvedFeeTypeId, p_FeeComponentId), p_Amount, COALESCE(p_DefaultAmount, p_Amount), p_DueDate, COALESCE(p_IsMandatory, 0), 1);

    SELECT * FROM FeeStructureComponents WHERE FeeStructureComponentId = LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetFeeStructureComponents;
DROP PROCEDURE IF EXISTS sp_GetFeeStructureItems;
DROP PROCEDURE IF EXISTS sp_FeeStructureComponent_GetAll;
DELIMITER //
CREATE PROCEDURE sp_FeeStructureComponent_GetAll(
    IN p_FeeStructureId INT
)
BEGIN
    SELECT
        fsc.FeeStructureComponentId,
        fsc.FeeStructureId,
        fsc.FeeTypeId,
        COALESCE(ft.FeeTypeName, '') AS FeeTypeName,
        COALESCE(ft.Category, '') AS Category,
        CASE WHEN fsc.IsMandatory = 1 THEN 'Mandatory' ELSE 'Optional' END AS Rule,
        fsc.Amount,
        fsc.IsActive
    FROM FeeStructureComponents fsc
    INNER JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeTypeId
    WHERE fsc.FeeStructureId = p_FeeStructureId
      AND fsc.IsActive = 1
    ORDER BY fsc.FeeStructureComponentId ASC;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_GetFeeStructureItems(IN p_FeeStructureId INT)
BEGIN
    CALL sp_FeeStructureComponent_GetAll(p_FeeStructureId);
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_GetFeeStructureComponents(IN p_FeeStructureId INT)
BEGIN
    SELECT
        fsc.FeeStructureComponentId,
        fsc.FeeStructureId,
        fsc.FeeTypeId AS FeeComponentId,
        ft.FeeTypeId,
        ft.FeeTypeCode,
        ft.FeeTypeName,
        ft.Category,
        ft.FeeTypeName AS ComponentName,
        fsc.Amount,
        fsc.DefaultAmount,
        fsc.DueDate,
        fsc.IsMandatory,
        fsc.IsActive,
        fsc.CreatedAt,
        fsc.UpdatedAt
    FROM FeeStructureComponents fsc
    INNER JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeTypeId
    WHERE fsc.FeeStructureId = p_FeeStructureId
    ORDER BY fsc.FeeStructureComponentId ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateFeeStructureItem;
DROP PROCEDURE IF EXISTS sp_FeeStructureComponent_Update;
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
        fsc.FeeTypeId,
        COALESCE(ft.FeeTypeName, '') AS FeeTypeName,
        COALESCE(ft.Category, '') AS Category,
        CASE WHEN fsc.IsMandatory = 1 THEN 'Mandatory' ELSE 'Optional' END AS Rule,
        fsc.Amount,
        fsc.IsActive
    FROM FeeStructureComponents fsc
    INNER JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeTypeId
    WHERE fsc.FeeStructureComponentId = p_FeeStructureComponentId;
END //
DELIMITER ;

DELIMITER //
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

DELIMITER //
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

DELIMITER //
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

DELIMITER //
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

DELIMITER //
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

DELIMITER //
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
    SELECT FeeInstallmentId, v_StudentFeeId AS StudentFeeId, FeePaymentPlanId, InstallmentNumber,
           CASE WHEN v_Installments <= 1 THEN p_PlanName ELSE CONCAT('Installment ', InstallmentNumber) END AS FeeSchedule,
           Amount, PaidAmount, BalanceAmount, DueDate, Status
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

DROP PROCEDURE IF EXISTS sp_StudentFee_GetDetailsById;
DROP PROCEDURE IF EXISTS sp_GetStudentFeeDetails;
DROP PROCEDURE IF EXISTS sp_GetStudentFeeDetailsByStudent;
DROP PROCEDURE IF EXISTS sp_StudentFee_GetDetailsByStudent;
DELIMITER //
CREATE PROCEDURE sp_StudentFee_GetDetailsById(
    IN p_StudentFeeId INT
)
BEGIN
    -- Result Set 1: Student Fee Summary
    SELECT
        sf.StudentFeeId,
        s.CampusId,
        COALESCE(c.CampusName, '') AS CampusName,
        s.StudentId,
        s.StudentName,
        s.AdmissionNo AS AdmissionNumber,
        COALESCE(s.RollNo, '') AS RollNumber,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        COALESCE(s.AdmissionDate, sf.AssignedAt) AS AdmissionDate,
        COALESCE(sf.TotalAmount, 0.00) AS OriginalFee,
        COALESCE(sf.ConcessionAmount, 0.00) AS Concession,
        COALESCE((
            SELECT SUM(fi.Amount)
            FROM FeeInstallments fi
            INNER JOIN FeePaymentPlans fpp ON fpp.FeePaymentPlanId = fi.FeePaymentPlanId
            WHERE fpp.StudentFeeId = sf.StudentFeeId AND fpp.IsActive = 1
        ), 0.00) AS ScheduledFees,
        COALESCE(sf.PayableAmount, 0.00) AS TotalPayable,
        COALESCE(sf.PaidAmount, 0.00) AS TotalPaid,
        COALESCE(sf.BalanceAmount, 0.00) AS OutstandingBalance,
        COALESCE(NULLIF(TRIM(sf.PaymentPlan), ''), 'Full Payment') AS PaymentPlan,
        COALESCE(sf.Status, 'Pending') AS FeeStatus,
        sf.FeeStructureId,
        COALESCE(fs.StructureName, '') AS StructureName,
        s.GroupId,
        s.ProgramId
    FROM StudentFees sf
    INNER JOIN Students s ON s.StudentId = sf.StudentId
    LEFT JOIN FeeStructures fs ON fs.FeeStructureId = sf.FeeStructureId
    LEFT JOIN Campuses c ON c.CampusId = s.CampusId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = COALESCE(NULLIF(fs.AcademicLevelId, 0), s.AcademicLevelId)
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN Sections sec ON sec.SectionId = s.SectionId
    WHERE sf.StudentFeeId = p_StudentFeeId
    LIMIT 1;

    -- Result Set 2: Fee Breakdown (Scoped strictly to p_StudentFeeId & mapped through FeeTypes)
    SELECT
        sfc.StudentFeeId,
        sfc.StudentFeeComponentId,
        sfc.FeeStructureComponentId,
        fsc.FeeTypeId,
        COALESCE(ft.FeeTypeName, '') AS FeeType,
        sfc.Amount,
        CASE
            WHEN sfc.ConcessionAmount > 0 OR (COALESCE(sf.ConcessionAmount, 0) > 0 AND COALESCE(sf.PayableAmount, 0) = 0) THEN (
                SELECT COALESCE(NULLIF(TRIM(sch.ScholarshipName), ''), NULLIF(TRIM(fc2.ConcessionType), ''))
                FROM FeeConcessions fc2
                LEFT JOIN Scholarships sch ON sch.ScholarshipId = fc2.ScholarshipId
                WHERE fc2.StudentFeeId = sfc.StudentFeeId AND fc2.Status = 'Applied'
                ORDER BY fc2.FeeConcessionId DESC
                LIMIT 1
            )
            ELSE NULL
        END AS ConcessionScheme,
        sfc.ConcessionAmount AS Discount,
        sfc.PayableAmount AS Payable
    FROM StudentFeeComponents sfc
    INNER JOIN StudentFees sf ON sf.StudentFeeId = sfc.StudentFeeId
    INNER JOIN FeeStructureComponents fsc ON fsc.FeeStructureComponentId = sfc.FeeStructureComponentId
    INNER JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeTypeId
    WHERE sfc.StudentFeeId = p_StudentFeeId
    ORDER BY sfc.StudentFeeComponentId ASC;

    -- Result Set 3: Payment Schedules (Scoped strictly to p_StudentFeeId active plan)
    SELECT
        fi.FeeInstallmentId,
        fpp.StudentFeeId,
        fi.FeePaymentPlanId,
        fi.InstallmentNumber,
        CASE
            WHEN COALESCE(fpp.NumberOfInstallments, 1) <= 1 AND COALESCE(fpp.PlanName, '') <> '' THEN fpp.PlanName
            ELSE CONCAT('Installment ', fi.InstallmentNumber)
        END AS FeeSchedule,
        fi.Amount,
        fi.PaidAmount,
        fi.BalanceAmount,
        fi.DueDate,
        fi.Status
    FROM FeeInstallments fi
    INNER JOIN FeePaymentPlans fpp ON fpp.FeePaymentPlanId = fi.FeePaymentPlanId
    WHERE fpp.StudentFeeId = p_StudentFeeId
      AND fpp.IsActive = 1
    ORDER BY fi.InstallmentNumber ASC;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_StudentFee_GetDetailsByStudent(
    IN p_StudentId INT
)
BEGIN
    DECLARE v_StudentFeeId INT DEFAULT 0;

    SELECT COALESCE(MAX(sf.StudentFeeId), 0) INTO v_StudentFeeId
    FROM StudentFees sf
    WHERE sf.StudentId = p_StudentId;

    CALL sp_StudentFee_GetDetailsById(v_StudentFeeId);
END //
DELIMITER ;

DELIMITER //
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
CREATE PROCEDURE sp_StudentFee_GetBulkDetails(
    IN p_StudentIdsJson JSON
)
BEGIN
    -- Result Set 1: Latest StudentFee Summary per student
    SELECT
        sf.StudentFeeId,
        s.CampusId,
        COALESCE(c.CampusName, '') AS CampusName,
        s.StudentId,
        s.StudentName,
        s.AdmissionNo AS AdmissionNumber,
        COALESCE(s.RollNo, '') AS RollNumber,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        COALESCE(s.AdmissionDate, sf.AssignedAt) AS AdmissionDate,
        COALESCE(sf.TotalAmount, 0.00) AS OriginalFee,
        COALESCE(sf.ConcessionAmount, 0.00) AS Concession,
        COALESCE((
            SELECT SUM(fi.Amount)
            FROM FeeInstallments fi
            INNER JOIN FeePaymentPlans fpp ON fpp.FeePaymentPlanId = fi.FeePaymentPlanId
            WHERE fpp.StudentFeeId = sf.StudentFeeId AND fpp.IsActive = 1
        ), 0.00) AS ScheduledFees,
        COALESCE(sf.PayableAmount, 0.00) AS TotalPayable,
        COALESCE(sf.PaidAmount, 0.00) AS TotalPaid,
        COALESCE(sf.BalanceAmount, 0.00) AS OutstandingBalance,
        COALESCE(NULLIF(TRIM(sf.PaymentPlan), ''), 'Full Payment') AS PaymentPlan,
        COALESCE(sf.Status, 'Pending') AS FeeStatus,
        sf.FeeStructureId,
        COALESCE(fs.StructureName, '') AS StructureName,
        s.GroupId,
        s.ProgramId
    FROM StudentFees sf
    INNER JOIN (
        SELECT StudentId, MAX(StudentFeeId) AS LatestStudentFeeId
        FROM StudentFees
        WHERE JSON_CONTAINS(p_StudentIdsJson, CAST(StudentId AS JSON))
        GROUP BY StudentId
    ) latest ON latest.LatestStudentFeeId = sf.StudentFeeId
    INNER JOIN Students s ON s.StudentId = sf.StudentId
    LEFT JOIN FeeStructures fs ON fs.FeeStructureId = sf.FeeStructureId
    LEFT JOIN Campuses c ON c.CampusId = s.CampusId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = COALESCE(NULLIF(fs.AcademicLevelId, 0), s.AcademicLevelId)
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN Sections sec ON sec.SectionId = s.SectionId
    ORDER BY s.StudentId ASC;

    -- Result Set 2: Fee Breakdown for selected accounts
    SELECT
        sfc.StudentFeeId,
        sfc.StudentFeeComponentId,
        sfc.FeeStructureComponentId,
        fsc.FeeTypeId,
        COALESCE(ft.FeeTypeName, '') AS FeeType,
        sfc.Amount,
        CASE
            WHEN sfc.ConcessionAmount > 0 OR (COALESCE(sf.ConcessionAmount, 0) > 0 AND COALESCE(sf.PayableAmount, 0) = 0) THEN (
                SELECT COALESCE(NULLIF(TRIM(sch.ScholarshipName), ''), NULLIF(TRIM(fc2.ConcessionType), ''))
                FROM FeeConcessions fc2
                LEFT JOIN Scholarships sch ON sch.ScholarshipId = fc2.ScholarshipId
                WHERE fc2.StudentFeeId = sfc.StudentFeeId AND fc2.Status = 'Applied'
                ORDER BY fc2.FeeConcessionId DESC
                LIMIT 1
            )
            ELSE NULL
        END AS ConcessionScheme,
        sfc.ConcessionAmount AS Discount,
        sfc.PayableAmount AS Payable
    FROM StudentFeeComponents sfc
    INNER JOIN (
        SELECT MAX(StudentFeeId) AS LatestStudentFeeId
        FROM StudentFees
        WHERE JSON_CONTAINS(p_StudentIdsJson, CAST(StudentId AS JSON))
        GROUP BY StudentId
    ) latest ON latest.LatestStudentFeeId = sfc.StudentFeeId
    INNER JOIN StudentFees sf ON sf.StudentFeeId = sfc.StudentFeeId
    INNER JOIN FeeStructureComponents fsc ON fsc.FeeStructureComponentId = sfc.FeeStructureComponentId
    INNER JOIN FeeTypes ft ON ft.FeeTypeId = fsc.FeeTypeId
    ORDER BY sfc.StudentFeeId ASC, sfc.StudentFeeComponentId ASC;

    -- Result Set 3: Payment Schedules for selected accounts
    SELECT
        fi.FeeInstallmentId,
        fpp.StudentFeeId,
        fi.FeePaymentPlanId,
        fi.InstallmentNumber,
        CASE
            WHEN COALESCE(fpp.NumberOfInstallments, 1) <= 1 AND COALESCE(fpp.PlanName, '') <> '' THEN fpp.PlanName
            ELSE CONCAT('Installment ', fi.InstallmentNumber)
        END AS FeeSchedule,
        fi.Amount,
        fi.PaidAmount,
        fi.BalanceAmount,
        fi.DueDate,
        fi.Status
    FROM FeeInstallments fi
    INNER JOIN FeePaymentPlans fpp ON fpp.FeePaymentPlanId = fi.FeePaymentPlanId
    INNER JOIN (
        SELECT MAX(StudentFeeId) AS LatestStudentFeeId
        FROM StudentFees
        WHERE JSON_CONTAINS(p_StudentIdsJson, CAST(StudentId AS JSON))
        GROUP BY StudentId
    ) latest ON latest.LatestStudentFeeId = fpp.StudentFeeId
    WHERE fpp.IsActive = 1
    ORDER BY fpp.StudentFeeId ASC, fi.InstallmentNumber ASC;
END //
DELIMITER ;

DELIMITER //
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
        CASE WHEN sf.BalanceAmount > 0 THEN next_due.NextDueDate ELSE NULL END AS NextDueDate
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
        WHERE fpp.IsActive = 1 AND fi.BalanceAmount > 0 AND fi.Status <> 'Paid'
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

DELIMITER //
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
    DECLARE v_PrevConcession DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_PaidAmount DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_ConcessionAmount DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_TotalConcession DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_NewPayable DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_NewBalance DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_NewStatus VARCHAR(30);
    DECLARE v_DiscountType VARCHAR(20);
    DECLARE v_DiscountVal DECIMAL(15,2);
    DECLARE v_SchemeName VARCHAR(100);
    DECLARE v_ConcessionId INT;
    DECLARE v_PlanId INT DEFAULT NULL;

    -- Distribution loop vars
    DECLARE v_CompCount INT DEFAULT 0;
    DECLARE v_CompIdx INT DEFAULT 0;
    DECLARE v_LastCompId INT DEFAULT 0;
    DECLARE v_CurCompId INT;
    DECLARE v_CurCompAmt DECIMAL(15,2);
    DECLARE v_CurCompPaid DECIMAL(15,2);
    DECLARE v_CurCompDisc DECIMAL(15,2);
    DECLARE v_CurCompPayable DECIMAL(15,2);
    DECLARE v_CurCompBal DECIMAL(15,2);
    DECLARE v_RemDisc DECIMAL(15,2);

    DECLARE v_InstCount INT DEFAULT 0;
    DECLARE v_InstIdx INT DEFAULT 0;
    DECLARE v_LastInstId INT DEFAULT 0;
    DECLARE v_CurInstId INT;
    DECLARE v_CurInstOrig DECIMAL(15,2);
    DECLARE v_CurInstPaid DECIMAL(15,2);
    DECLARE v_CurInstNewAmt DECIMAL(15,2);
    DECLARE v_CurInstBal DECIMAL(15,2);
    DECLARE v_CurInstDue DATETIME;
    DECLARE v_PlanOrigTotal DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_RemInstAmt DECIMAL(15,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT TotalAmount, ConcessionAmount, PaidAmount
    INTO v_TotalAmount, v_PrevConcession, v_PaidAmount
    FROM StudentFees
    WHERE StudentFeeId = p_StudentFeeId AND StudentId = p_StudentId
    FOR UPDATE;

    IF v_TotalAmount IS NULL OR v_TotalAmount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student fee record not found.';
    END IF;

    IF p_ScholarshipId IS NOT NULL AND p_ScholarshipId > 0 THEN
        SELECT ScholarshipName, DiscountType, DiscountValue
        INTO v_SchemeName, v_DiscountType, v_DiscountVal
        FROM Scholarships
        WHERE ScholarshipId = p_ScholarshipId
        LIMIT 1;
        IF v_DiscountType IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Referenced ScholarshipId does not exist.';
        END IF;
    ELSE
        SET v_SchemeName = NULLIF(TRIM(COALESCE(p_ScholarshipName, '')), '');
        SET v_DiscountType = COALESCE(NULLIF(TRIM(p_DiscountType), ''), 'Fixed');
        SET v_DiscountVal = COALESCE(p_DiscountValue, 0.00);
    END IF;

    IF LOWER(TRIM(v_DiscountType)) = 'percentage' THEN
        SET v_ConcessionAmount = ROUND((v_TotalAmount * v_DiscountVal) / 100.0, 2);
    ELSE
        SET v_ConcessionAmount = ROUND(v_DiscountVal, 2);
    END IF;

    SET v_ConcessionAmount = LEAST(GREATEST(0.00, v_ConcessionAmount), GREATEST(0.00, v_TotalAmount - v_PrevConcession));

    INSERT INTO FeeConcessions (
        StudentId, StudentFeeId, ScholarshipId, ConcessionType, Amount, Reason, Status, AppliedAt, ApprovedBy
    )
    VALUES (
        p_StudentId, p_StudentFeeId, NULLIF(p_ScholarshipId, 0),
        COALESCE(v_SchemeName, NULLIF(TRIM(COALESCE(p_ScholarshipName, '')), ''), v_DiscountType),
        v_ConcessionAmount, p_Reason, 'Applied', CURRENT_TIMESTAMP(6), p_ApprovedBy
    );

    SET v_ConcessionId = LAST_INSERT_ID();

    SELECT LEAST(v_TotalAmount, COALESCE(SUM(Amount), 0.00)) INTO v_TotalConcession
    FROM FeeConcessions
    WHERE StudentFeeId = p_StudentFeeId AND Status = 'Applied';

    SET v_NewPayable = GREATEST(0.00, v_TotalAmount - v_TotalConcession);
    SET v_NewBalance = GREATEST(0.00, v_NewPayable - v_PaidAmount);
    SET v_NewStatus = CASE WHEN v_NewBalance <= 0 THEN 'Paid' WHEN v_PaidAmount > 0 THEN 'PartiallyPaid' ELSE 'Pending' END;

    UPDATE StudentFees
    SET ConcessionAmount = v_TotalConcession,
        PayableAmount = v_NewPayable,
        BalanceAmount = v_NewBalance,
        Status = v_NewStatus,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentFeeId = p_StudentFeeId;

    -- Distribute v_TotalConcession proportionally across StudentFeeComponents (exact penny remainder on final component)
    SELECT COUNT(*) INTO v_CompCount FROM StudentFeeComponents WHERE StudentFeeId = p_StudentFeeId;
    SET v_RemDisc = v_TotalConcession;
    WHILE v_CompIdx < v_CompCount DO
        SET v_CompIdx = v_CompIdx + 1;
        SELECT StudentFeeComponentId, Amount, PaidAmount
        INTO v_CurCompId, v_CurCompAmt, v_CurCompPaid
        FROM StudentFeeComponents
        WHERE StudentFeeId = p_StudentFeeId AND StudentFeeComponentId > v_LastCompId
        ORDER BY StudentFeeComponentId ASC
        LIMIT 1;

        SET v_LastCompId = v_CurCompId;
        IF v_CompIdx = v_CompCount THEN
            SET v_CurCompDisc = LEAST(v_CurCompAmt, GREATEST(0.00, v_RemDisc));
        ELSE
            SET v_CurCompDisc = LEAST(v_CurCompAmt, ROUND((v_TotalConcession * v_CurCompAmt) / v_TotalAmount, 2));
        END IF;
        SET v_RemDisc = GREATEST(0.00, v_RemDisc - v_CurCompDisc);
        SET v_CurCompPayable = GREATEST(0.00, v_CurCompAmt - v_CurCompDisc);
        SET v_CurCompBal = GREATEST(0.00, v_CurCompPayable - v_CurCompPaid);

        UPDATE StudentFeeComponents
        SET ConcessionAmount = v_CurCompDisc,
            PayableAmount = v_CurCompPayable,
            BalanceAmount = v_CurCompBal,
            Status = CASE WHEN v_CurCompBal <= 0 THEN 'Paid' WHEN v_CurCompPaid > 0 THEN 'PartiallyPaid' ELSE 'Pending' END
        WHERE StudentFeeComponentId = v_CurCompId;
    END WHILE;

    -- Rebalance active PaymentPlan & FeeInstallments to v_NewPayable
    SELECT FeePaymentPlanId INTO v_PlanId
    FROM FeePaymentPlans
    WHERE StudentFeeId = p_StudentFeeId AND IsActive = 1
    ORDER BY FeePaymentPlanId DESC
    LIMIT 1;

    IF v_PlanId IS NOT NULL THEN
        UPDATE FeePaymentPlans
        SET TotalAmount = v_NewPayable,
            UpdatedAt = CURRENT_TIMESTAMP(6)
        WHERE FeePaymentPlanId = v_PlanId;

        SELECT COUNT(*), COALESCE(SUM(Amount), 0.00) INTO v_InstCount, v_PlanOrigTotal
        FROM FeeInstallments
        WHERE FeePaymentPlanId = v_PlanId;

        SET v_RemInstAmt = v_NewPayable;
        WHILE v_InstIdx < v_InstCount DO
            SET v_InstIdx = v_InstIdx + 1;
            SELECT FeeInstallmentId, Amount, PaidAmount, DueDate
            INTO v_CurInstId, v_CurInstOrig, v_CurInstPaid, v_CurInstDue
            FROM FeeInstallments
            WHERE FeePaymentPlanId = v_PlanId AND FeeInstallmentId > v_LastInstId
            ORDER BY FeeInstallmentId ASC
            LIMIT 1;

            SET v_LastInstId = v_CurInstId;
            IF v_InstIdx = v_InstCount THEN
                SET v_CurInstNewAmt = GREATEST(0.00, v_RemInstAmt);
            ELSEIF v_PlanOrigTotal > 0 THEN
                SET v_CurInstNewAmt = GREATEST(v_CurInstPaid, ROUND((v_NewPayable * v_CurInstOrig) / v_PlanOrigTotal, 2));
                SET v_CurInstNewAmt = LEAST(v_CurInstNewAmt, v_RemInstAmt);
            ELSE
                SET v_CurInstNewAmt = 0.00;
            END IF;
            SET v_RemInstAmt = GREATEST(0.00, v_RemInstAmt - v_CurInstNewAmt);
            SET v_CurInstBal = GREATEST(0.00, v_CurInstNewAmt - v_CurInstPaid);

            UPDATE FeeInstallments
            SET Amount = v_CurInstNewAmt,
                BalanceAmount = v_CurInstBal,
                Status = CASE
                    WHEN v_CurInstBal <= 0 THEN 'Paid'
                    WHEN v_CurInstPaid > 0 THEN 'PartiallyPaid'
                    WHEN v_CurInstDue < NOW() THEN 'Overdue'
                    ELSE 'Pending'
                END
            WHERE FeeInstallmentId = v_CurInstId;
        END WHILE;
    END IF;

    UPDATE Students s
    INNER JOIN StudentFees sf ON sf.StudentFeeId = p_StudentFeeId
    SET s.FeeAmount = sf.PayableAmount,
        s.FeePaid = sf.PaidAmount,
        s.FeeStatus = sf.Status,
        s.UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE s.StudentId = p_StudentId;

    COMMIT;

    SELECT
        FeeConcessionId,
        StudentId,
        StudentFeeId,
        ScholarshipId,
        ConcessionType AS ScholarshipName,
        v_DiscountType AS DiscountType,
        v_DiscountVal AS DiscountValue,
        Amount AS DiscountAmount,
        Reason,
        Status,
        AppliedAt
    FROM FeeConcessions
    WHERE FeeConcessionId = v_ConcessionId;
END //
DELIMITER ;

DELIMITER //
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
    DECLARE v_PayableAmount DECIMAL(15,2);
    DECLARE v_PrevPaid DECIMAL(15,2);
    DECLARE v_CurrentBalance DECIMAL(15,2);
    DECLARE v_NewTotalPaid DECIMAL(15,2);
    DECLARE v_NewBalance DECIMAL(15,2);
    DECLARE v_FinalAmount DECIMAL(15,2);
    DECLARE v_Discount DECIMAL(15,2);
    DECLARE v_Fine DECIMAL(15,2);
    DECLARE v_PaymentId INT;
    DECLARE v_Receipt VARCHAR(50);
    DECLARE v_Remarks VARCHAR(500);
    DECLARE v_PayDate DATETIME;
    DECLARE v_FirstInstId INT DEFAULT NULL;
    DECLARE v_AllocatedInstCount INT DEFAULT 0;
    DECLARE v_InstCount INT DEFAULT 0;
    DECLARE v_Idx INT DEFAULT 0;
    DECLARE v_InstId INT;
    DECLARE v_InstAmount DECIMAL(15,2);
    DECLARE v_InstPrevPaid DECIMAL(15,2);
    DECLARE v_InstBal DECIMAL(15,2);
    DECLARE v_InstNewPaid DECIMAL(15,2);
    DECLARE v_InstNewBal DECIMAL(15,2);
    DECLARE v_InstPay DECIMAL(15,2);
    DECLARE v_Remaining DECIMAL(15,2);
    DECLARE v_LoopGuard INT DEFAULT 0;

    -- Component waterfall tracking
    DECLARE v_RemCompPay DECIMAL(15,2) DEFAULT 0.00;
    DECLARE v_CompId INT;
    DECLARE v_CompPayable DECIMAL(15,2);
    DECLARE v_CompPrevPaid DECIMAL(15,2);
    DECLARE v_CompBal DECIMAL(15,2);
    DECLARE v_CompTake DECIMAL(15,2);
    DECLARE v_CompNewPaid DECIMAL(15,2);
    DECLARE v_CompNewBal DECIMAL(15,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_Discount = GREATEST(0.00, COALESCE(p_Discount, 0.00));
    SET v_Fine = GREATEST(0.00, COALESCE(p_Fine, 0.00));
    SET v_FinalAmount = p_Amount + v_Fine - v_Discount;

    IF v_FinalAmount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Final payment amount must be greater than zero.';
    END IF;

    START TRANSACTION;

    -- ATOMIC CONCURRENCY LOCK: Read scalar totals BEFORE updating (avoids left-to-right SET evaluation bugs)
    SELECT PayableAmount, PaidAmount, BalanceAmount
    INTO v_PayableAmount, v_PrevPaid, v_CurrentBalance
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

    SET v_Remarks = p_Note;
    IF v_Discount > 0 OR v_Fine > 0 THEN
        SET v_Remarks = CONCAT(
            COALESCE(p_Note, ''),
            CASE WHEN v_Discount > 0 THEN CONCAT(' | Discount: ', FORMAT(v_Discount, 2)) ELSE '' END,
            CASE WHEN v_Fine > 0 THEN CONCAT(' | Fine: ', FORMAT(v_Fine, 2)) ELSE '' END
        );
    END IF;

    IF p_ReceiptNumber IS NOT NULL AND TRIM(p_ReceiptNumber) != '' THEN
        SET v_Receipt = TRIM(p_ReceiptNumber);
    ELSE
        SET v_Receipt = CONCAT('FEE-', DATE_FORMAT(v_PayDate, '%Y%m%d'), '-', FLOOR(100000 + (RAND() * 900000)));
    END IF;

    IF p_FeeInstallmentIdsJson IS NOT NULL AND JSON_VALID(p_FeeInstallmentIdsJson) THEN
        SET v_InstCount = JSON_LENGTH(p_FeeInstallmentIdsJson);
    END IF;

    -- 1. Insert into FeePayments
    INSERT INTO FeePayments (
        StudentId, StudentFeeId, FeeInstallmentId, Amount, DiscountAmount, FineAmount,
        PaymentMode, TransactionReference, Remarks, PaymentDate, Status, ReceiptNumber, CollectedBy
    )
    VALUES (
        p_StudentId, p_StudentFeeId, NULL, v_FinalAmount, v_Discount, v_Fine,
        TRIM(p_PaymentMode), p_TransactionReference, v_Remarks, v_PayDate, 'Success', v_Receipt, p_CollectedBy
    );

    SET v_PaymentId = LAST_INSERT_ID();
    SET v_Remaining = v_FinalAmount;

    -- 2A. Allocate across explicitly requested installment IDs first (belonging to this StudentFeeId's active plan)
    IF v_InstCount > 0 THEN
        SET v_Idx = 0;
        WHILE v_Idx < v_InstCount AND v_Remaining > 0 DO
            SET v_InstId = CAST(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_FeeInstallmentIdsJson, CONCAT('$[', v_Idx, ']'))), 'null'), 0) AS UNSIGNED);

            IF v_InstId > 0 THEN
                SET v_InstAmount = NULL;
                SET v_InstPrevPaid = NULL;
                SET v_InstBal = NULL;
                SELECT fi.Amount, fi.PaidAmount, fi.BalanceAmount
                INTO v_InstAmount, v_InstPrevPaid, v_InstBal
                FROM FeeInstallments fi
                INNER JOIN FeePaymentPlans fpp ON fpp.FeePaymentPlanId = fi.FeePaymentPlanId
                WHERE fi.FeeInstallmentId = v_InstId
                  AND fpp.StudentFeeId = p_StudentFeeId
                  AND fpp.IsActive = 1
                FOR UPDATE;

                IF v_InstBal IS NOT NULL AND v_InstBal > 0 THEN
                    SET v_InstPay = LEAST(v_Remaining, v_InstBal);
                    SET v_InstNewPaid = LEAST(v_InstAmount, v_InstPrevPaid + v_InstPay);
                    SET v_InstNewBal = GREATEST(0.00, v_InstAmount - v_InstNewPaid);

                    UPDATE FeeInstallments
                    SET PaidAmount = v_InstNewPaid,
                        BalanceAmount = v_InstNewBal,
                        Status = CASE WHEN v_InstNewBal <= 0 THEN 'Paid' ELSE 'PartiallyPaid' END
                    WHERE FeeInstallmentId = v_InstId;

                    INSERT INTO FeePaymentAllocations (FeePaymentId, FeeInstallmentId, AllocatedAmount, AllocationDate, CreatedAt)
                    VALUES (v_PaymentId, v_InstId, v_InstPay, v_PayDate, CURRENT_TIMESTAMP(6));

                    IF v_AllocatedInstCount = 0 THEN
                        SET v_FirstInstId = v_InstId;
                    END IF;
                    SET v_AllocatedInstCount = v_AllocatedInstCount + 1;
                    SET v_Remaining = v_Remaining - v_InstPay;
                END IF;
            END IF;

            SET v_Idx = v_Idx + 1;
        END WHILE;
    END IF;

    -- 2B. Auto-waterfall any unallocated remainder (or lump-sum payments without explicit IDs) FIFO across unpaid installments
    SET v_LoopGuard = 0;
    WHILE v_Remaining > 0.005 AND v_LoopGuard < 200 DO
        SET v_LoopGuard = v_LoopGuard + 1;
        SET v_InstId = NULL;
        SET v_InstAmount = NULL;
        SET v_InstPrevPaid = NULL;
        SET v_InstBal = NULL;

        SELECT fi.FeeInstallmentId, fi.Amount, fi.PaidAmount, fi.BalanceAmount
        INTO v_InstId, v_InstAmount, v_InstPrevPaid, v_InstBal
        FROM FeeInstallments fi
        INNER JOIN FeePaymentPlans fpp ON fpp.FeePaymentPlanId = fi.FeePaymentPlanId
        WHERE fpp.StudentFeeId = p_StudentFeeId
          AND fpp.IsActive = 1
          AND fi.BalanceAmount > 0
        ORDER BY fi.DueDate ASC, fi.InstallmentNumber ASC, fi.FeeInstallmentId ASC
        LIMIT 1
        FOR UPDATE;

        IF v_InstId IS NULL THEN
            SET v_LoopGuard = 200;
        ELSE
            SET v_InstPay = LEAST(v_Remaining, v_InstBal);
            SET v_InstNewPaid = LEAST(v_InstAmount, v_InstPrevPaid + v_InstPay);
            SET v_InstNewBal = GREATEST(0.00, v_InstAmount - v_InstNewPaid);

            UPDATE FeeInstallments
            SET PaidAmount = v_InstNewPaid,
                BalanceAmount = v_InstNewBal,
                Status = CASE WHEN v_InstNewBal <= 0 THEN 'Paid' ELSE 'PartiallyPaid' END
            WHERE FeeInstallmentId = v_InstId;

            INSERT INTO FeePaymentAllocations (FeePaymentId, FeeInstallmentId, AllocatedAmount, AllocationDate, CreatedAt)
            VALUES (v_PaymentId, v_InstId, v_InstPay, v_PayDate, CURRENT_TIMESTAMP(6));

            IF v_AllocatedInstCount = 0 THEN
                SET v_FirstInstId = v_InstId;
            END IF;
            SET v_AllocatedInstCount = v_AllocatedInstCount + 1;
            SET v_Remaining = v_Remaining - v_InstPay;
        END IF;
    END WHILE;

    IF v_AllocatedInstCount = 1 AND v_FirstInstId IS NOT NULL THEN
        UPDATE FeePayments SET FeeInstallmentId = v_FirstInstId WHERE FeePaymentId = v_PaymentId;
    END IF;

    -- 3. Waterfall payment onto StudentFeeComponents so component balances stay synchronized
    SET v_RemCompPay = v_FinalAmount;
    SET v_LoopGuard = 0;
    WHILE v_RemCompPay > 0.005 AND v_LoopGuard < 200 DO
        SET v_LoopGuard = v_LoopGuard + 1;
        SET v_CompId = NULL;
        SET v_CompPayable = NULL;
        SET v_CompPrevPaid = NULL;
        SET v_CompBal = NULL;

        SELECT StudentFeeComponentId, PayableAmount, PaidAmount, BalanceAmount
        INTO v_CompId, v_CompPayable, v_CompPrevPaid, v_CompBal
        FROM StudentFeeComponents
        WHERE StudentFeeId = p_StudentFeeId AND BalanceAmount > 0
        ORDER BY StudentFeeComponentId ASC
        LIMIT 1
        FOR UPDATE;

        IF v_CompId IS NULL THEN
            SET v_LoopGuard = 200;
        ELSE
            SET v_CompTake = LEAST(v_RemCompPay, v_CompBal);
            SET v_CompNewPaid = LEAST(v_CompPayable, v_CompPrevPaid + v_CompTake);
            SET v_CompNewBal = GREATEST(0.00, v_CompPayable - v_CompNewPaid);

            UPDATE StudentFeeComponents
            SET PaidAmount = v_CompNewPaid,
                BalanceAmount = v_CompNewBal,
                Status = CASE WHEN v_CompNewBal <= 0 THEN 'Paid' ELSE 'PartiallyPaid' END
            WHERE StudentFeeComponentId = v_CompId;

            SET v_RemCompPay = v_RemCompPay - v_CompTake;
        END IF;
    END WHILE;

    -- 4. Update StudentFees balance using pre-read local variables
    SET v_NewTotalPaid = v_PrevPaid + v_FinalAmount;
    SET v_NewBalance = GREATEST(0.00, v_PayableAmount - v_NewTotalPaid);

    UPDATE StudentFees
    SET PaidAmount = v_NewTotalPaid,
        BalanceAmount = v_NewBalance,
        Status = CASE WHEN v_NewBalance <= 0 THEN 'Paid' ELSE 'PartiallyPaid' END,
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE StudentFeeId = p_StudentFeeId;

    -- 5. Sync Students table
    UPDATE Students s
    INNER JOIN StudentFees sf ON sf.StudentFeeId = p_StudentFeeId
    SET s.FeeAmount = sf.PayableAmount,
        s.FeePaid = sf.PaidAmount,
        s.FeeStatus = sf.Status,
        s.UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE s.StudentId = p_StudentId;

    -- 6. Insert FeeReceipt
    INSERT INTO FeeReceipts (FeePaymentId, ReceiptNumber, ReceiptDate, Remarks)
    VALUES (v_PaymentId, v_Receipt, v_PayDate, p_Note);

    COMMIT;

    -- 7. Return standard FeePaymentResponse
    SELECT
        fp.FeePaymentId,
        fp.StudentId,
        s.StudentName,
        s.AdmissionNo AS AdmissionNumber,
        fp.StudentFeeId,
        fp.FeeInstallmentId,
        fp.Amount,
        fp.DiscountAmount AS Discount,
        fp.FineAmount AS Fine,
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

DELIMITER //
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

DELIMITER //
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

DELIMITER //
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

DELIMITER //
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
        CASE
            WHEN sf.BalanceAmount > 0 THEN (
                SELECT MIN(fi.DueDate)
                FROM FeeInstallments fi
                INNER JOIN FeePaymentPlans fpp ON fpp.FeePaymentPlanId = fi.FeePaymentPlanId
                WHERE fpp.StudentFeeId = sf.StudentFeeId
                  AND fpp.IsActive = 1
                  AND fi.BalanceAmount > 0
                  AND fi.Status <> 'Paid'
            )
            ELSE NULL
        END AS NextDue,
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

DELIMITER //
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

DELIMITER //
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

DELIMITER //
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

DELIMITER //
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

DELIMITER //
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
