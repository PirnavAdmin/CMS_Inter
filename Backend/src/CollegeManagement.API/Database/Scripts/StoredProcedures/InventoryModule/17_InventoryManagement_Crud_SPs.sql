-- =============================================================================
-- MODULE: INVENTORY MANAGEMENT
-- SCRIPT: 17_InventoryManagement_Crud_SPs.sql
-- PURPOSE: 100% Stored Procedures for Item, Category, Supplier, and Movement CRUD
-- DATABASE: u819242402_CLM_System (MariaDB 11.x / MySQL 8.x)
-- ARCHITECTURE: 100% Stored Procedures & Dapper, 0% Inline SQL, 0% EF Core CRUD
-- =============================================================================

USE `u819242402_CLM_System`;

-- -----------------------------------------------------------------------------
-- 1. sp_Inventory_CreateItem
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_CreateItem`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_CreateItem`(
    IN p_Code VARCHAR(50),
    IN p_Name VARCHAR(150),
    IN p_CategoryId INT,
    IN p_Unit VARCHAR(50),
    IN p_Type VARCHAR(50),
    IN p_Description TEXT,
    IN p_Brand VARCHAR(100),
    IN p_Model VARCHAR(100),
    IN p_Sku VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_Location VARCHAR(100),
    IN p_Rack VARCHAR(100),
    IN p_OpeningQuantity DECIMAL(12,2),
    IN p_OpeningCost DECIMAL(12,2),
    IN p_MinStock DECIMAL(12,2),
    IN p_MaxStock DECIMAL(12,2),
    IN p_ReorderQty DECIMAL(12,2),
    IN p_IssueValue DECIMAL(12,2),
    IN p_SupplierId INT,
    IN p_SupplierItemCode VARCHAR(100),
    IN p_PurchaseDate DATE,
    IN p_WarrantyDate DATE,
    IN p_Status VARCHAR(20),
    IN p_Remarks TEXT,
    IN p_UserId INT,
    IN p_UserName VARCHAR(150)
)
BEGIN
    DECLARE v_CleanCode VARCHAR(50);
    DECLARE v_CleanName VARCHAR(150);
    DECLARE v_Exists INT DEFAULT 0;
    DECLARE v_NewItemId INT;

    SET v_CleanCode = TRIM(p_Code);
    SET v_CleanName = TRIM(p_Name);

    -- Check unique code
    SELECT COUNT(*) INTO v_Exists
    FROM `InventoryItems`
    WHERE LOWER(Code) = LOWER(v_CleanCode);

    IF v_Exists > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This item code already exists.';
    END IF;

    -- Insert new item
    INSERT INTO `InventoryItems` (
        `Code`, `Name`, `CategoryId`, `Unit`, `Type`, `Description`,
        `Brand`, `Model`, `Sku`, `Department`, `Location`, `Rack`,
        `OpeningQuantity`, `OpeningCost`, `Quantity`, `UnitCost`,
        `MinStock`, `MaxStock`, `ReorderQty`, `IssueValue`,
        `SupplierId`, `SupplierItemCode`, `PurchaseDate`, `WarrantyDate`,
        `Status`, `Remarks`, `CreatedAt`, `UpdatedAt`
    ) VALUES (
        v_CleanCode, v_CleanName, p_CategoryId, COALESCE(p_Unit, 'Pieces'), COALESCE(p_Type, 'Consumable'), p_Description,
        p_Brand, p_Model, p_Sku, p_Department, p_Location, p_Rack,
        COALESCE(p_OpeningQuantity, 0.00), COALESCE(p_OpeningCost, 0.00),
        COALESCE(p_OpeningQuantity, 0.00), COALESCE(p_OpeningCost, 0.00),
        COALESCE(p_MinStock, 0.00), p_MaxStock, COALESCE(p_ReorderQty, 0.00), COALESCE(p_IssueValue, 0.00),
        p_SupplierId, p_SupplierItemCode, p_PurchaseDate, p_WarrantyDate,
        COALESCE(p_Status, 'Active'), p_Remarks, NOW(), NOW()
    );

    SET v_NewItemId = LAST_INSERT_ID();

    -- Log Activity
    INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`, `CreatedAt`)
    VALUES (CURRENT_DATE(), CONCAT('Created item: ', v_CleanName), p_UserId, p_UserName, NOW());

    -- Return Generated Id
    SELECT v_NewItemId AS ItemId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. sp_Inventory_UpdateItem
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_UpdateItem`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_UpdateItem`(
    IN p_ItemId INT,
    IN p_Code VARCHAR(50),
    IN p_Name VARCHAR(150),
    IN p_CategoryId INT,
    IN p_Unit VARCHAR(50),
    IN p_Type VARCHAR(50),
    IN p_Description TEXT,
    IN p_Brand VARCHAR(100),
    IN p_Model VARCHAR(100),
    IN p_Sku VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_Location VARCHAR(100),
    IN p_Rack VARCHAR(100),
    IN p_MinStock DECIMAL(12,2),
    IN p_MaxStock DECIMAL(12,2),
    IN p_ReorderQty DECIMAL(12,2),
    IN p_IssueValue DECIMAL(12,2),
    IN p_SupplierId INT,
    IN p_SupplierItemCode VARCHAR(100),
    IN p_PurchaseDate DATE,
    IN p_WarrantyDate DATE,
    IN p_Status VARCHAR(20),
    IN p_Remarks TEXT,
    IN p_UserId INT,
    IN p_UserName VARCHAR(150)
)
BEGIN
    DECLARE v_CleanCode VARCHAR(50);
    DECLARE v_CleanName VARCHAR(150);
    DECLARE v_ItemExists INT DEFAULT 0;
    DECLARE v_CodeTaken INT DEFAULT 0;

    SET v_CleanCode = TRIM(p_Code);
    SET v_CleanName = TRIM(p_Name);

    -- Check item exists
    SELECT COUNT(*) INTO v_ItemExists
    FROM `InventoryItems`
    WHERE `ItemId` = p_ItemId;

    IF v_ItemExists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Item not found.';
    END IF;

    -- Check unique code
    SELECT COUNT(*) INTO v_CodeTaken
    FROM `InventoryItems`
    WHERE `ItemId` != p_ItemId AND LOWER(Code) = LOWER(v_CleanCode);

    IF v_CodeTaken > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This item code already exists.';
    END IF;

    -- Update record
    UPDATE `InventoryItems`
    SET `Code` = v_CleanCode,
        `Name` = v_CleanName,
        `CategoryId` = p_CategoryId,
        `Unit` = COALESCE(p_Unit, Unit),
        `Type` = COALESCE(p_Type, Type),
        `Description` = p_Description,
        `Brand` = p_Brand,
        `Model` = p_Model,
        `Sku` = p_Sku,
        `Department` = p_Department,
        `Location` = p_Location,
        `Rack` = p_Rack,
        `MinStock` = COALESCE(p_MinStock, 0.00),
        `MaxStock` = p_MaxStock,
        `ReorderQty` = COALESCE(p_ReorderQty, 0.00),
        `IssueValue` = COALESCE(p_IssueValue, 0.00),
        `SupplierId` = p_SupplierId,
        `SupplierItemCode` = p_SupplierItemCode,
        `PurchaseDate` = p_PurchaseDate,
        `WarrantyDate` = p_WarrantyDate,
        `Status` = COALESCE(p_Status, Status),
        `Remarks` = p_Remarks,
        `UpdatedAt` = NOW()
    WHERE `ItemId` = p_ItemId;

    -- Log Activity
    INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`, `CreatedAt`)
    VALUES (CURRENT_DATE(), CONCAT('Updated item: ', v_CleanName), p_UserId, p_UserName, NOW());

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. sp_Inventory_DeleteItem
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_DeleteItem`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_DeleteItem`(
    IN p_ItemId INT,
    IN p_UserId INT,
    IN p_UserName VARCHAR(150)
)
BEGIN
    DECLARE v_ItemExists INT DEFAULT 0;
    DECLARE v_Quantity DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_Name VARCHAR(150);
    DECLARE v_TxnCount INT DEFAULT 0;

    SELECT COUNT(*), COALESCE(MAX(Quantity), 0.00), MAX(Name)
    INTO v_ItemExists, v_Quantity, v_Name
    FROM `InventoryItems`
    WHERE `ItemId` = p_ItemId;

    IF v_ItemExists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Item not found.';
    END IF;

    IF v_Quantity > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Items with available stock cannot be deleted. Deactivate the item instead.';
    END IF;

    SELECT COUNT(*) INTO v_TxnCount
    FROM `InventoryTransactions`
    WHERE `ItemId` = p_ItemId;

    IF v_TxnCount > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Items with transaction history cannot be deleted. Deactivate the item instead.';
    END IF;

    DELETE FROM `InventoryItems` WHERE `ItemId` = p_ItemId;

    -- Log Activity
    INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`, `CreatedAt`)
    VALUES (CURRENT_DATE(), CONCAT('Deleted item: ', v_Name), p_UserId, p_UserName, NOW());

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. sp_Inventory_DeactivateItem
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_DeactivateItem`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_DeactivateItem`(
    IN p_ItemId INT,
    IN p_UserId INT,
    IN p_UserName VARCHAR(150)
)
BEGIN
    DECLARE v_ItemExists INT DEFAULT 0;
    DECLARE v_Name VARCHAR(150);

    SELECT COUNT(*), MAX(Name)
    INTO v_ItemExists, v_Name
    FROM `InventoryItems`
    WHERE `ItemId` = p_ItemId;

    IF v_ItemExists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Item not found.';
    END IF;

    UPDATE `InventoryItems`
    SET `Status` = 'Inactive',
        `UpdatedAt` = NOW()
    WHERE `ItemId` = p_ItemId;

    -- Log Activity
    INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`, `CreatedAt`)
    VALUES (CURRENT_DATE(), CONCAT('Deactivated item: ', v_Name), p_UserId, p_UserName, NOW());

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. sp_Inventory_GetCategories
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_GetCategories`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_GetCategories`(
    IN p_IncludeInactive TINYINT(1)
)
BEGIN
    SELECT 
        c.CategoryId,
        c.Code,
        c.Name,
        c.Description,
        c.Department,
        c.Status,
        COUNT(i.ItemId) AS `Count`,
        COALESCE(SUM(i.Quantity * i.UnitCost), 0.00) AS `Value`,
        SUM(CASE WHEN i.Status = 'Active' AND i.Quantity < i.MinStock THEN 1 ELSE 0 END) AS Alerts,
        c.CreatedAt,
        c.UpdatedAt
    FROM `InventoryCategories` c
    LEFT JOIN `InventoryItems` i ON c.CategoryId = i.CategoryId
    WHERE (p_IncludeInactive = 1 OR c.Status = 'Active')
    GROUP BY c.CategoryId, c.Code, c.Name, c.Description, c.Department, c.Status, c.CreatedAt, c.UpdatedAt
    ORDER BY c.Name ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 6. sp_Inventory_SaveCategory
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_SaveCategory`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_SaveCategory`(
    IN p_CategoryId INT,
    IN p_Code VARCHAR(50),
    IN p_Name VARCHAR(100),
    IN p_Description TEXT,
    IN p_Department VARCHAR(100),
    IN p_Status VARCHAR(20),
    IN p_UserId INT,
    IN p_UserName VARCHAR(150)
)
BEGIN
    DECLARE v_CleanCode VARCHAR(50);
    DECLARE v_CleanName VARCHAR(100);
    DECLARE v_CodeTaken INT DEFAULT 0;
    DECLARE v_NameTaken INT DEFAULT 0;
    DECLARE v_TargetId INT;

    SET v_CleanCode = TRIM(p_Code);
    SET v_CleanName = TRIM(p_Name);

    -- Check Code Uniqueness
    SELECT COUNT(*) INTO v_CodeTaken
    FROM `InventoryCategories`
    WHERE (p_CategoryId IS NULL OR p_CategoryId <= 0 OR CategoryId != p_CategoryId)
      AND LOWER(Code) = LOWER(v_CleanCode);

    IF v_CodeTaken > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This category code already exists.';
    END IF;

    -- Check Name Uniqueness
    SELECT COUNT(*) INTO v_NameTaken
    FROM `InventoryCategories`
    WHERE (p_CategoryId IS NULL OR p_CategoryId <= 0 OR CategoryId != p_CategoryId)
      AND LOWER(Name) = LOWER(v_CleanName);

    IF v_NameTaken > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This category name already exists.';
    END IF;

    IF p_CategoryId IS NOT NULL AND p_CategoryId > 0 THEN
        -- Update
        UPDATE `InventoryCategories`
        SET `Code` = v_CleanCode,
            `Name` = v_CleanName,
            `Description` = p_Description,
            `Department` = COALESCE(p_Department, Department),
            `Status` = COALESCE(p_Status, Status),
            `UpdatedAt` = NOW()
        WHERE `CategoryId` = p_CategoryId;

        SET v_TargetId = p_CategoryId;

        -- Log Activity
        INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`, `CreatedAt`)
        VALUES (CURRENT_DATE(), CONCAT('Updated category: ', v_CleanName), p_UserId, p_UserName, NOW());
    ELSE
        -- Insert
        INSERT INTO `InventoryCategories` (
            `Code`, `Name`, `Description`, `Department`, `Status`, `CreatedAt`, `UpdatedAt`
        ) VALUES (
            v_CleanCode, v_CleanName, p_Description, COALESCE(p_Department, 'Administration'),
            COALESCE(p_Status, 'Active'), NOW(), NOW()
        );

        SET v_TargetId = LAST_INSERT_ID();

        -- Log Activity
        INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`, `CreatedAt`)
        VALUES (CURRENT_DATE(), CONCAT('Created category: ', v_CleanName), p_UserId, p_UserName, NOW());
    END IF;

    SELECT v_TargetId AS CategoryId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. sp_Inventory_DeactivateCategory
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_DeactivateCategory`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_DeactivateCategory`(
    IN p_CategoryId INT,
    IN p_UserId INT,
    IN p_UserName VARCHAR(150)
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;
    DECLARE v_Name VARCHAR(100);

    SELECT COUNT(*), MAX(Name) INTO v_Exists, v_Name
    FROM `InventoryCategories`
    WHERE `CategoryId` = p_CategoryId;

    IF v_Exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Category not found.';
    END IF;

    UPDATE `InventoryCategories`
    SET `Status` = 'Inactive',
        `UpdatedAt` = NOW()
    WHERE `CategoryId` = p_CategoryId;

    -- Log Activity
    INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`, `CreatedAt`)
    VALUES (CURRENT_DATE(), CONCAT('Deactivated category: ', v_Name), p_UserId, p_UserName, NOW());

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 8. sp_Inventory_GetSuppliers
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_GetSuppliers`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_GetSuppliers`(
    IN p_IncludeInactive TINYINT(1)
)
BEGIN
    SELECT 
        s.SupplierId,
        s.Code,
        s.Name,
        s.ContactPerson,
        s.Phone,
        s.AlternatePhone,
        s.Email,
        s.Gstin,
        s.Pan,
        s.Address1,
        s.Address2,
        s.City,
        s.State,
        s.PostalCode,
        s.Country,
        s.PaymentTerms,
        s.BankName,
        s.AccountHolder,
        s.AccountNumber,
        s.Ifsc,
        s.Notes,
        s.Status,
        s.CreatedAt,
        s.UpdatedAt,
        COALESCE(tx.TotalPurchases, 0.00) AS TotalPurchases,
        sc_agg.CategoryIdsString,
        sc_agg.SuppliedCategoriesString
    FROM `InventorySuppliers` s
    LEFT JOIN (
        SELECT 
            sc.SupplierId,
            GROUP_CONCAT(DISTINCT sc.CategoryId ORDER BY sc.CategoryId) AS CategoryIdsString,
            GROUP_CONCAT(DISTINCT c.Name ORDER BY c.Name SEPARATOR ', ') AS SuppliedCategoriesString
        FROM `InventorySupplierCategories` sc
        JOIN `InventoryCategories` c ON sc.CategoryId = c.CategoryId
        GROUP BY sc.SupplierId
    ) sc_agg ON s.SupplierId = sc_agg.SupplierId
    LEFT JOIN (
        SELECT 
            SupplierId,
            SUM(TotalAmount) AS TotalPurchases
        FROM `InventoryTransactions`
        WHERE MovementType = 'Stock In' AND Status = 'Posted' AND SupplierId IS NOT NULL
        GROUP BY SupplierId
    ) tx ON s.SupplierId = tx.SupplierId
    WHERE (p_IncludeInactive = 1 OR s.Status = 'Active')
    ORDER BY s.Name ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 9. sp_Inventory_SaveSupplier
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_SaveSupplier`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_SaveSupplier`(
    IN p_SupplierId INT,
    IN p_Code VARCHAR(50),
    IN p_Name VARCHAR(150),
    IN p_ContactPerson VARCHAR(100),
    IN p_Phone VARCHAR(20),
    IN p_AlternatePhone VARCHAR(20),
    IN p_Email VARCHAR(100),
    IN p_Gstin VARCHAR(20),
    IN p_Pan VARCHAR(20),
    IN p_Address1 VARCHAR(255),
    IN p_Address2 VARCHAR(255),
    IN p_City VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_PostalCode VARCHAR(20),
    IN p_Country VARCHAR(50),
    IN p_PaymentTerms VARCHAR(100),
    IN p_BankName VARCHAR(100),
    IN p_AccountHolder VARCHAR(100),
    IN p_AccountNumber VARCHAR(100),
    IN p_Ifsc VARCHAR(50),
    IN p_Notes TEXT,
    IN p_Status VARCHAR(20),
    IN p_CategoryIds TEXT,
    IN p_UserId INT,
    IN p_UserName VARCHAR(150)
)
BEGIN
    DECLARE v_CleanCode VARCHAR(50);
    DECLARE v_CleanName VARCHAR(150);
    DECLARE v_CodeTaken INT DEFAULT 0;
    DECLARE v_TargetId INT;
    DECLARE v_Remaining TEXT;
    DECLARE v_CurrentVal VARCHAR(50);
    DECLARE v_CatId INT;

    SET v_CleanCode = TRIM(p_Code);
    SET v_CleanName = TRIM(p_Name);

    -- Check Code Uniqueness
    SELECT COUNT(*) INTO v_CodeTaken
    FROM `InventorySuppliers`
    WHERE (p_SupplierId IS NULL OR p_SupplierId <= 0 OR SupplierId != p_SupplierId)
      AND LOWER(Code) = LOWER(v_CleanCode);

    IF v_CodeTaken > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'This supplier code already exists.';
    END IF;

    IF p_SupplierId IS NOT NULL AND p_SupplierId > 0 THEN
        -- Update
        UPDATE `InventorySuppliers`
        SET `Code` = v_CleanCode,
            `Name` = v_CleanName,
            `ContactPerson` = TRIM(p_ContactPerson),
            `Phone` = TRIM(p_Phone),
            `AlternatePhone` = TRIM(p_AlternatePhone),
            `Email` = TRIM(p_Email),
            `Gstin` = TRIM(p_Gstin),
            `Pan` = TRIM(p_Pan),
            `Address1` = TRIM(p_Address1),
            `Address2` = TRIM(p_Address2),
            `City` = TRIM(p_City),
            `State` = TRIM(p_State),
            `PostalCode` = TRIM(p_PostalCode),
            `Country` = CASE WHEN TRIM(p_Country) = '' OR p_Country IS NULL THEN 'India' ELSE TRIM(p_Country) END,
            `PaymentTerms` = TRIM(p_PaymentTerms),
            `BankName` = TRIM(p_BankName),
            `AccountHolder` = TRIM(p_AccountHolder),
            `AccountNumber` = TRIM(p_AccountNumber),
            `Ifsc` = TRIM(p_Ifsc),
            `Notes` = p_Notes,
            `Status` = COALESCE(p_Status, Status),
            `UpdatedAt` = NOW()
        WHERE `SupplierId` = p_SupplierId;

        SET v_TargetId = p_SupplierId;

        -- Log Activity
        INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`, `CreatedAt`)
        VALUES (CURRENT_DATE(), CONCAT('Updated supplier: ', v_CleanName), p_UserId, p_UserName, NOW());
    ELSE
        -- Insert
        INSERT INTO `InventorySuppliers` (
            `Code`, `Name`, `ContactPerson`, `Phone`, `AlternatePhone`,
            `Email`, `Gstin`, `Pan`, `Address1`, `Address2`,
            `City`, `State`, `PostalCode`, `Country`, `PaymentTerms`,
            `BankName`, `AccountHolder`, `AccountNumber`, `Ifsc`,
            `Notes`, `Status`, `CreatedAt`, `UpdatedAt`
        ) VALUES (
            v_CleanCode, v_CleanName, TRIM(p_ContactPerson), TRIM(p_Phone), TRIM(p_AlternatePhone),
            TRIM(p_Email), TRIM(p_Gstin), TRIM(p_Pan), TRIM(p_Address1), TRIM(p_Address2),
            TRIM(p_City), TRIM(p_State), TRIM(p_PostalCode), CASE WHEN TRIM(p_Country) = '' OR p_Country IS NULL THEN 'India' ELSE TRIM(p_Country) END, TRIM(p_PaymentTerms),
            TRIM(p_BankName), TRIM(p_AccountHolder), TRIM(p_AccountNumber), TRIM(p_Ifsc),
            p_Notes, COALESCE(p_Status, 'Active'), NOW(), NOW()
        );

        SET v_TargetId = LAST_INSERT_ID();

        -- Log Activity
        INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`, `CreatedAt`)
        VALUES (CURRENT_DATE(), CONCAT('Created supplier: ', v_CleanName), p_UserId, p_UserName, NOW());
    END IF;

    -- Update Categories Junction Table
    DELETE FROM `InventorySupplierCategories` WHERE `SupplierId` = v_TargetId;

    IF p_CategoryIds IS NOT NULL AND TRIM(p_CategoryIds) != '' THEN
        SET v_Remaining = CONCAT(TRIM(p_CategoryIds), ',');
        WHILE LENGTH(v_Remaining) > 0 DO
            SET v_CurrentVal = TRIM(SUBSTRING_INDEX(v_Remaining, ',', 1));
            SET v_Remaining = SUBSTRING(v_Remaining, LENGTH(v_CurrentVal) + 2);
            IF v_CurrentVal != '' THEN
                SET v_CatId = CAST(v_CurrentVal AS UNSIGNED);
                IF v_CatId > 0 THEN
                    INSERT IGNORE INTO `InventorySupplierCategories` (`SupplierId`, `CategoryId`)
                    VALUES (v_TargetId, v_CatId);
                END IF;
            END IF;
        END WHILE;
    END IF;

    SELECT v_TargetId AS SupplierId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 10. sp_Inventory_DeactivateSupplier
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_DeactivateSupplier`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_DeactivateSupplier`(
    IN p_SupplierId INT,
    IN p_UserId INT,
    IN p_UserName VARCHAR(150)
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;
    DECLARE v_Name VARCHAR(150);

    SELECT COUNT(*), MAX(Name) INTO v_Exists, v_Name
    FROM `InventorySuppliers`
    WHERE `SupplierId` = p_SupplierId;

    IF v_Exists = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Supplier not found.';
    END IF;

    UPDATE `InventorySuppliers`
    SET `Status` = 'Inactive',
        `UpdatedAt` = NOW()
    WHERE `SupplierId` = p_SupplierId;

    -- Log Activity
    INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`, `CreatedAt`)
    VALUES (CURRENT_DATE(), CONCAT('Deactivated supplier: ', v_Name), p_UserId, p_UserName, NOW());

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 11. sp_Inventory_GetMovements
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_GetMovements`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_GetMovements`(
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_ItemId INT,
    IN p_CategoryId INT,
    IN p_Department VARCHAR(100),
    IN p_SupplierId INT,
    IN p_Type VARCHAR(50),
    IN p_Search VARCHAR(100),
    IN p_TransactionId INT,
    IN p_TransactionNumber VARCHAR(50)
)
BEGIN
    SELECT 
        t.TransactionId,
        t.TransactionNumber,
        t.Sequence,
        t.TransactionDate,
        t.MovementType,
        t.ItemId,
        i.Name AS ItemName,
        i.Code AS ItemCode,
        i.Unit,
        t.Quantity,
        t.UnitCost,
        t.TotalAmount,
        t.PreviousUnitCost,
        t.Status,
        t.CorrectionOfId,
        corr.TransactionNumber AS CorrectionOfNumber,
        t.ReturnOfId,
        ret.TransactionNumber AS ReturnOfNumber,
        t.SupplierId,
        s.Name AS SupplierName,
        t.SupplierInvoice,
        t.InvoiceNumber,
        t.PurchaseOrderNumber,
        t.ReferenceNumber,
        t.Location,
        t.Condition,
        t.BatchNumber,
        t.ExpiryDate,
        t.IssueType,
        t.Department,
        t.RecipientName,
        t.RecipientId,
        t.Destination,
        t.Purpose,
        t.ApprovedBy,
        t.IsReturnable,
        t.ExpectedReturnDate,
        t.PerformedBy,
        COALESCE(s.Name, t.RecipientName, '—') AS Partner,
        t.Remarks,
        t.CreatedAt
    FROM `InventoryTransactions` t
    JOIN `InventoryItems` i ON t.ItemId = i.ItemId
    LEFT JOIN `InventorySuppliers` s ON t.SupplierId = s.SupplierId
    LEFT JOIN `InventoryTransactions` corr ON t.CorrectionOfId = corr.TransactionId
    LEFT JOIN `InventoryTransactions` ret ON t.ReturnOfId = ret.TransactionId
    WHERE (p_TransactionId IS NULL OR p_TransactionId <= 0 OR t.TransactionId = p_TransactionId)
      AND (p_TransactionNumber IS NULL OR TRIM(p_TransactionNumber) = '' OR t.TransactionNumber = TRIM(p_TransactionNumber))
      AND (p_FromDate IS NULL OR t.TransactionDate >= p_FromDate)
      AND (p_ToDate IS NULL OR t.TransactionDate <= p_ToDate)
      AND (p_ItemId IS NULL OR p_ItemId <= 0 OR t.ItemId = p_ItemId)
      AND (p_CategoryId IS NULL OR p_CategoryId <= 0 OR i.CategoryId = p_CategoryId)
      AND (p_Department IS NULL OR TRIM(p_Department) = '' OR t.Department = TRIM(p_Department))
      AND (p_SupplierId IS NULL OR p_SupplierId <= 0 OR t.SupplierId = p_SupplierId)
      AND (p_Type IS NULL OR TRIM(p_Type) = '' OR t.MovementType = TRIM(p_Type))
      AND (p_Search IS NULL OR TRIM(p_Search) = '' OR (
          t.TransactionNumber LIKE CONCAT('%', TRIM(p_Search), '%') OR
          i.Name LIKE CONCAT('%', TRIM(p_Search), '%') OR
          i.Code LIKE CONCAT('%', TRIM(p_Search), '%') OR
          (t.RecipientName IS NOT NULL AND t.RecipientName LIKE CONCAT('%', TRIM(p_Search), '%')) OR
          (s.Name IS NOT NULL AND s.Name LIKE CONCAT('%', TRIM(p_Search), '%')) OR
          (t.ReferenceNumber IS NOT NULL AND t.ReferenceNumber LIKE CONCAT('%', TRIM(p_Search), '%')) OR
          t.PerformedBy LIKE CONCAT('%', TRIM(p_Search), '%')
      ))
    ORDER BY t.TransactionDate DESC, t.Sequence DESC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 12. sp_Inventory_PostMovement
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_PostMovement`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_PostMovement`(
    IN p_MovementType VARCHAR(20),
    IN p_ItemId INT,
    IN p_Quantity DECIMAL(12,2),
    IN p_UnitCost DECIMAL(12,2),
    IN p_TransactionDate DATE,
    IN p_SupplierId INT,
    IN p_SupplierInvoice VARCHAR(100),
    IN p_InvoiceNumber VARCHAR(100),
    IN p_PurchaseOrderNumber VARCHAR(100),
    IN p_ReferenceNumber VARCHAR(100),
    IN p_Location VARCHAR(100),
    IN p_Condition VARCHAR(50),
    IN p_BatchNumber VARCHAR(100),
    IN p_ExpiryDate DATE,
    IN p_IssueType VARCHAR(50),
    IN p_Department VARCHAR(100),
    IN p_RecipientName VARCHAR(150),
    IN p_RecipientId VARCHAR(50),
    IN p_Destination VARCHAR(100),
    IN p_Purpose TEXT,
    IN p_ApprovedBy VARCHAR(150),
    IN p_IsReturnable TINYINT(1),
    IN p_ExpectedReturnDate DATE,
    IN p_PerformedBy VARCHAR(150),
    IN p_Remarks TEXT,
    IN p_UserId INT
)
proc: BEGIN
    DECLARE v_CurrentQty DECIMAL(12,2);
    DECLARE v_CurrentCost DECIMAL(12,2);
    DECLARE v_ItemStatus VARCHAR(20);
    DECLARE v_ItemName VARCHAR(150);
    DECLARE v_ItemUnit VARCHAR(50);
    DECLARE v_ItemCreatedAt DATETIME;
    DECLARE v_LatestMovementDate DATE;
    DECLARE v_NewQty DECIMAL(12,2);
    DECLARE v_NewCost DECIMAL(12,2);
    DECLARE v_TotalAmount DECIMAL(14,2);
    DECLARE v_NextSeq INT;
    DECLARE v_TxnNumber VARCHAR(50);
    DECLARE v_NewTxnId INT;

    -- Validate quantity
    IF p_Quantity <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Quantity must be greater than zero.';
    END IF;

    -- Validate Date not in future
    IF p_TransactionDate > CURRENT_DATE() THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction date cannot be in the future.';
    END IF;

    -- Get item
    SELECT Quantity, UnitCost, Status, Name, Unit, CreatedAt 
    INTO v_CurrentQty, v_CurrentCost, v_ItemStatus, v_ItemName, v_ItemUnit, v_ItemCreatedAt
    FROM `InventoryItems` 
    WHERE ItemId = p_ItemId FOR UPDATE;

    IF v_ItemName IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Item not found.';
    END IF;

    IF v_ItemStatus != 'Active' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot transact against an inactive item.';
    END IF;

    -- Movement calculations
    IF p_MovementType = 'Stock In' THEN
        IF p_UnitCost < 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unit cost must be non-negative.';
        END IF;

        SET v_NewQty = v_CurrentQty + p_Quantity;
        -- Moving weighted-average formula
        IF v_NewQty > 0 THEN
            SET v_NewCost = ((v_CurrentQty * v_CurrentCost) + (p_Quantity * p_UnitCost)) / v_NewQty;
        ELSE
            SET v_NewCost = p_UnitCost;
        END IF;
        SET v_TotalAmount = p_Quantity * p_UnitCost;

        UPDATE `InventoryItems`
        SET Quantity = v_NewQty,
            UnitCost = v_NewCost,
            LastPurchaseDate = p_TransactionDate,
            UpdatedAt = NOW()
        WHERE ItemId = p_ItemId;

    ELSEIF p_MovementType = 'Stock Out' THEN
        IF p_Quantity > v_CurrentQty THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock available for this issue.';
        END IF;

        SET v_NewQty = v_CurrentQty - p_Quantity;
        SET p_UnitCost = v_CurrentCost;
        SET v_NewCost = v_CurrentCost;
        SET v_TotalAmount = p_Quantity * v_CurrentCost;

        UPDATE `InventoryItems`
        SET Quantity = v_NewQty,
            UpdatedAt = NOW()
        WHERE ItemId = p_ItemId;

    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid movement type.';
    END IF;

    -- Get next sequence & transaction number
    SELECT COALESCE(MAX(Sequence), 0) + 1 INTO v_NextSeq FROM `InventoryTransactions`;
    SET v_TxnNumber = CONCAT('INV-TXN-', LPAD(v_NextSeq, 6, '0'));

    -- Insert transaction
    INSERT INTO `InventoryTransactions` (
        `TransactionNumber`, `Sequence`, `TransactionDate`, `MovementType`, `ItemId`,
        `Quantity`, `UnitCost`, `TotalAmount`, `PreviousUnitCost`, `Status`,
        `SupplierId`, `SupplierInvoice`, `InvoiceNumber`, `PurchaseOrderNumber`,
        `ReferenceNumber`, `Location`, `Condition`, `BatchNumber`, `ExpiryDate`,
        `IssueType`, `Department`, `RecipientName`, `RecipientId`, `Destination`,
        `Purpose`, `ApprovedBy`, `IsReturnable`, `ExpectedReturnDate`, `PerformedBy`,
        `Remarks`, `CreatedByUserId`
    ) VALUES (
        v_TxnNumber, v_NextSeq, p_TransactionDate, p_MovementType, p_ItemId,
        p_Quantity, p_UnitCost, v_TotalAmount, v_CurrentCost, 'Posted',
        p_SupplierId, p_SupplierInvoice, p_InvoiceNumber, p_PurchaseOrderNumber,
        p_ReferenceNumber, p_Location, p_Condition, p_BatchNumber, p_ExpiryDate,
        p_IssueType, p_Department, p_RecipientName, p_RecipientId, p_Destination,
        p_Purpose, p_ApprovedBy, COALESCE(p_IsReturnable, 0), p_ExpectedReturnDate, p_PerformedBy,
        p_Remarks, p_UserId
    );

    SET v_NewTxnId = LAST_INSERT_ID();

    -- Log activity
    INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`, `CreatedAt`)
    VALUES (CURRENT_DATE(), CONCAT(p_MovementType, ': ', p_Quantity, ' ', v_ItemUnit, ' of ', v_ItemName), p_UserId, p_PerformedBy, NOW());

    -- Return transaction result
    SELECT 
        v_NewTxnId AS TransactionId,
        v_TxnNumber AS TransactionNumber,
        v_NewQty AS UpdatedQuantity,
        v_NewCost AS UpdatedUnitCost,
        v_TotalAmount AS TotalAmount;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 13. sp_Inventory_ReverseMovement
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_ReverseMovement`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_ReverseMovement`(
    IN p_TransactionId INT,
    IN p_PerformedBy VARCHAR(150),
    IN p_UserId INT
)
BEGIN
    DECLARE v_ItemId INT;
    DECLARE v_MovementType VARCHAR(20);
    DECLARE v_Status VARCHAR(20);
    DECLARE v_Quantity DECIMAL(12,2);
    DECLARE v_UnitCost DECIMAL(12,2);
    DECLARE v_TotalAmount DECIMAL(14,2);
    DECLARE v_PreviousUnitCost DECIMAL(12,2);
    DECLARE v_TxnNumber VARCHAR(50);
    DECLARE v_LatestTxnId INT;
    DECLARE v_CurrentQty DECIMAL(12,2);
    DECLARE v_CurrentCost DECIMAL(12,2);
    DECLARE v_RevertedQty DECIMAL(12,2);
    DECLARE v_RevertedCost DECIMAL(12,2);
    DECLARE v_CorrectionType VARCHAR(20);
    DECLARE v_NextSeq INT;
    DECLARE v_NewTxnNumber VARCHAR(50);

    -- Find target transaction
    SELECT ItemId, MovementType, Status, Quantity, UnitCost, TotalAmount, PreviousUnitCost, TransactionNumber
    INTO v_ItemId, v_MovementType, v_Status, v_Quantity, v_UnitCost, v_TotalAmount, v_PreviousUnitCost, v_TxnNumber
    FROM `InventoryTransactions`
    WHERE TransactionId = p_TransactionId;

    IF v_TxnNumber IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction not found.';
    END IF;

    IF v_Status != 'Posted' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only posted transactions can be reversed.';
    END IF;

    -- Lock Item
    SELECT Quantity, UnitCost INTO v_CurrentQty, v_CurrentCost
    FROM `InventoryItems` WHERE ItemId = v_ItemId FOR UPDATE;

    IF v_MovementType = 'Stock In' THEN
        IF v_CurrentQty < v_Quantity THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot reverse: insufficient current stock available.';
        END IF;
        SET v_RevertedQty = v_CurrentQty - v_Quantity;
        SET v_RevertedCost = v_PreviousUnitCost;
        SET v_CorrectionType = 'Stock Out';

    ELSEIF v_MovementType = 'Stock Out' THEN
        SET v_RevertedQty = v_CurrentQty + v_Quantity;
        SET v_RevertedCost = v_CurrentCost;
        SET v_CorrectionType = 'Stock In';
    END IF;

    -- Update Item
    UPDATE `InventoryItems`
    SET Quantity = v_RevertedQty,
        UnitCost = v_RevertedCost,
        UpdatedAt = NOW()
    WHERE ItemId = v_ItemId;

    -- Mark original as reversed
    UPDATE `InventoryTransactions`
    SET Status = 'Reversed'
    WHERE TransactionId = p_TransactionId;

    -- Next sequence
    SELECT COALESCE(MAX(Sequence), 0) + 1 INTO v_NextSeq FROM `InventoryTransactions`;
    SET v_NewTxnNumber = CONCAT('INV-TXN-', LPAD(v_NextSeq, 6, '0'));

    -- Compensating Entry
    INSERT INTO `InventoryTransactions` (
        `TransactionNumber`, `Sequence`, `TransactionDate`, `MovementType`, `ItemId`,
        `Quantity`, `UnitCost`, `TotalAmount`, `PreviousUnitCost`, `Status`,
        `CorrectionOfId`, `PerformedBy`, `Remarks`, `Purpose`, `CreatedByUserId`, `CreatedAt`
    ) VALUES (
        v_NewTxnNumber, v_NextSeq, CURRENT_DATE(), v_CorrectionType, v_ItemId,
        v_Quantity, v_UnitCost, v_TotalAmount, v_CurrentCost, 'Correction',
        p_TransactionId, p_PerformedBy, CONCAT('Reversal of ', v_TxnNumber), 'Transaction reversal', p_UserId, NOW()
    );

    -- Log Activity
    INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`, `CreatedAt`)
    VALUES (CURRENT_DATE(), CONCAT('Reversed ', v_TxnNumber), p_UserId, p_PerformedBy, NOW());

    SELECT 
        v_NewTxnNumber AS CorrectionTransactionNumber,
        LAST_INSERT_ID() AS CorrectionTransactionId,
        v_RevertedQty AS UpdatedQuantity,
        v_RevertedCost AS UpdatedUnitCost;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 14. sp_Inventory_RecordReturn
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_RecordReturn`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_RecordReturn`(
    IN p_TransactionId INT,
    IN p_PerformedBy VARCHAR(150),
    IN p_UserId INT
)
BEGIN
    DECLARE v_ItemId INT;
    DECLARE v_MovementType VARCHAR(20);
    DECLARE v_Status VARCHAR(20);
    DECLARE v_IsReturnable TINYINT(1);
    DECLARE v_IssueQty DECIMAL(12,2);
    DECLARE v_IssueCost DECIMAL(12,2);
    DECLARE v_TxnNumber VARCHAR(50);
    DECLARE v_CurrentQty DECIMAL(12,2);
    DECLARE v_CurrentCost DECIMAL(12,2);
    DECLARE v_NewQty DECIMAL(12,2);
    DECLARE v_NewCost DECIMAL(12,2);
    DECLARE v_NextSeq INT;
    DECLARE v_NewTxnNumber VARCHAR(50);

    SELECT ItemId, MovementType, Status, IsReturnable, Quantity, UnitCost, TransactionNumber
    INTO v_ItemId, v_MovementType, v_Status, v_IsReturnable, v_IssueQty, v_IssueCost, v_TxnNumber
    FROM `InventoryTransactions`
    WHERE TransactionId = p_TransactionId;

    IF v_TxnNumber IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction not found.';
    END IF;

    IF v_MovementType != 'Stock Out' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Returns can only be recorded against Stock Out issues.';
    END IF;

    IF v_Status != 'Posted' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction is not in a returnable state.';
    END IF;

    -- Lock Item
    SELECT Quantity, UnitCost INTO v_CurrentQty, v_CurrentCost
    FROM `InventoryItems` WHERE ItemId = v_ItemId FOR UPDATE;

    SET v_NewQty = v_CurrentQty + v_IssueQty;
    SET v_NewCost = ((v_CurrentQty * v_CurrentCost) + (v_IssueQty * v_IssueCost)) / v_NewQty;

    -- Update Item
    UPDATE `InventoryItems`
    SET Quantity = v_NewQty,
        UnitCost = v_NewCost,
        UpdatedAt = NOW()
    WHERE ItemId = v_ItemId;

    -- Mark Issue as Returned
    UPDATE `InventoryTransactions`
    SET Status = 'Returned'
    WHERE TransactionId = p_TransactionId;

    -- Next sequence
    SELECT COALESCE(MAX(Sequence), 0) + 1 INTO v_NextSeq FROM `InventoryTransactions`;
    SET v_NewTxnNumber = CONCAT('INV-TXN-', LPAD(v_NextSeq, 6, '0'));

    -- Return Receipt
    INSERT INTO `InventoryTransactions` (
        `TransactionNumber`, `Sequence`, `TransactionDate`, `MovementType`, `ItemId`,
        `Quantity`, `UnitCost`, `TotalAmount`, `PreviousUnitCost`, `Status`,
        `ReturnOfId`, `PerformedBy`, `Remarks`, `Purpose`, `CreatedByUserId`, `CreatedAt`
    ) VALUES (
        v_NewTxnNumber, v_NextSeq, CURRENT_DATE(), 'Stock In', v_ItemId,
        v_IssueQty, v_IssueCost, (v_IssueQty * v_IssueCost), v_CurrentCost, 'Returned',
        p_TransactionId, p_PerformedBy, CONCAT('Return of ', v_TxnNumber), 'Return of issued item', p_UserId, NOW()
    );

    -- Log Activity
    INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`, `CreatedAt`)
    VALUES (CURRENT_DATE(), CONCAT('Recorded return of ', v_TxnNumber), p_UserId, p_PerformedBy, NOW());

    SELECT 
        v_NewTxnNumber AS ReturnTransactionNumber,
        LAST_INSERT_ID() AS ReturnTransactionId,
        v_NewQty AS UpdatedQuantity,
        v_NewCost AS UpdatedUnitCost;
END //
DELIMITER ;
