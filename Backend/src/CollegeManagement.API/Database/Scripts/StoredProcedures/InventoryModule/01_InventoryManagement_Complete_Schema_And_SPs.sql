-- =============================================================================
-- MODULE: INVENTORY MANAGEMENT
-- SCRIPT: 01_InventoryManagement_Complete_Schema_And_SPs.sql
-- PURPOSE: Complete Database Schema, Seed Data, and Stored Procedures for College Inventory Management
-- DATABASE: u819242402_CLM_System (MariaDB 11.x / MySQL 8.x)
-- =============================================================================

USE `u819242402_CLM_System`;

ALTER TABLE IF EXISTS `InventoryCategories` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
ALTER TABLE IF EXISTS `InventorySuppliers` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
ALTER TABLE IF EXISTS `InventorySupplierCategories` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
ALTER TABLE IF EXISTS `InventoryItems` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
ALTER TABLE IF EXISTS `InventoryTransactions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
ALTER TABLE IF EXISTS `InventoryActivities` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;

-- =============================================================================
-- SECTION 1: CREATE TABLES
-- =============================================================================

-- 1. Inventory Categories
CREATE TABLE IF NOT EXISTS `InventoryCategories` (
    `CategoryId` INT AUTO_INCREMENT PRIMARY KEY,
    `Code` VARCHAR(50) NOT NULL,
    `Name` VARCHAR(100) NOT NULL,
    `Description` TEXT NULL,
    `Department` VARCHAR(100) NOT NULL DEFAULT 'Administration',
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `UQ_InvCategories_Code` (`Code`),
    UNIQUE KEY `UQ_InvCategories_Name` (`Name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- 2. Inventory Suppliers
CREATE TABLE IF NOT EXISTS `InventorySuppliers` (
    `SupplierId` INT AUTO_INCREMENT PRIMARY KEY,
    `Code` VARCHAR(50) NOT NULL,
    `Name` VARCHAR(150) NOT NULL,
    `ContactPerson` VARCHAR(100) NOT NULL,
    `Phone` VARCHAR(20) NOT NULL,
    `AlternatePhone` VARCHAR(20) NULL,
    `Email` VARCHAR(100) NULL,
    `Gstin` VARCHAR(20) NULL,
    `Pan` VARCHAR(20) NULL,
    `Address1` VARCHAR(255) NULL,
    `Address2` VARCHAR(255) NULL,
    `City` VARCHAR(100) NULL,
    `State` VARCHAR(100) NULL,
    `PostalCode` VARCHAR(20) NULL,
    `Country` VARCHAR(50) NOT NULL DEFAULT 'India',
    `PaymentTerms` VARCHAR(100) NULL,
    `BankName` VARCHAR(100) NULL,
    `AccountHolder` VARCHAR(100) NULL,
    `AccountNumber` VARCHAR(100) NULL,
    `Ifsc` VARCHAR(50) NULL,
    `Notes` TEXT NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `UQ_InvSuppliers_Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- 3. Supplier Category Mapping (Many-to-Many)
CREATE TABLE IF NOT EXISTS `InventorySupplierCategories` (
    `SupplierId` INT NOT NULL,
    `CategoryId` INT NOT NULL,
    PRIMARY KEY (`SupplierId`, `CategoryId`),
    CONSTRAINT `FK_InvSupCat_Supplier` FOREIGN KEY (`SupplierId`) REFERENCES `InventorySuppliers` (`SupplierId`) ON DELETE CASCADE,
    CONSTRAINT `FK_InvSupCat_Category` FOREIGN KEY (`CategoryId`) REFERENCES `InventoryCategories` (`CategoryId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- 4. Inventory Items
CREATE TABLE IF NOT EXISTS `InventoryItems` (
    `ItemId` INT AUTO_INCREMENT PRIMARY KEY,
    `Code` VARCHAR(50) NOT NULL,
    `Name` VARCHAR(150) NOT NULL,
    `CategoryId` INT NOT NULL,
    `Unit` VARCHAR(50) NOT NULL DEFAULT 'Pieces',
    `Type` VARCHAR(50) NOT NULL DEFAULT 'Consumable',
    `Description` TEXT NULL,
    `Brand` VARCHAR(100) NULL,
    `Model` VARCHAR(100) NULL,
    `Sku` VARCHAR(100) NULL,
    `Department` VARCHAR(100) NULL,
    `Location` VARCHAR(100) NULL,
    `Rack` VARCHAR(100) NULL,
    `OpeningQuantity` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `OpeningCost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `Quantity` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `UnitCost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `MinStock` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `MaxStock` DECIMAL(12,2) NULL,
    `ReorderQty` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `IssueValue` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `SupplierId` INT NULL,
    `SupplierItemCode` VARCHAR(100) NULL,
    `PurchaseDate` DATE NULL,
    `LastPurchaseDate` DATE NULL,
    `WarrantyDate` DATE NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `Remarks` TEXT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `UQ_InvItems_Code` (`Code`),
    KEY `IX_InvItems_Category` (`CategoryId`),
    KEY `IX_InvItems_Supplier` (`SupplierId`),
    CONSTRAINT `FK_InvItems_Category` FOREIGN KEY (`CategoryId`) REFERENCES `InventoryCategories` (`CategoryId`),
    CONSTRAINT `FK_InvItems_Supplier` FOREIGN KEY (`SupplierId`) REFERENCES `InventorySuppliers` (`SupplierId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- 5. Inventory Stock Movements / Transactions
CREATE TABLE IF NOT EXISTS `InventoryTransactions` (
    `TransactionId` INT AUTO_INCREMENT PRIMARY KEY,
    `TransactionNumber` VARCHAR(50) NOT NULL,
    `Sequence` INT NOT NULL,
    `TransactionDate` DATE NOT NULL,
    `MovementType` VARCHAR(20) NOT NULL, -- 'Stock In', 'Stock Out'
    `ItemId` INT NOT NULL,
    `Quantity` DECIMAL(12,2) NOT NULL,
    `UnitCost` DECIMAL(12,2) NOT NULL,
    `TotalAmount` DECIMAL(14,2) NOT NULL,
    `PreviousUnitCost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Posted', -- 'Posted', 'Reversed', 'Correction', 'Returned'
    `PaymentMethod` VARCHAR(50) NULL DEFAULT 'Cash', -- 'Cash', 'Online Transaction'
    `PaymentTransactionNumber` VARCHAR(100) NULL,
    `CashReceiptPath` VARCHAR(500) NULL,
    `CorrectionOfId` INT NULL,
    `ReturnOfId` INT NULL,
    `SupplierId` INT NULL,
    `SupplierInvoice` VARCHAR(100) NULL,
    `InvoiceNumber` VARCHAR(100) NULL,
    `PurchaseOrderNumber` VARCHAR(100) NULL,
    `ReferenceNumber` VARCHAR(100) NULL,
    `Location` VARCHAR(100) NULL,
    `Condition` VARCHAR(50) NULL,
    `BatchNumber` VARCHAR(100) NULL,
    `ExpiryDate` DATE NULL,
    `IssueType` VARCHAR(50) NULL,
    `Department` VARCHAR(100) NULL,
    `RecipientName` VARCHAR(150) NULL,
    `RecipientId` VARCHAR(50) NULL,
    `Destination` VARCHAR(100) NULL,
    `Purpose` TEXT NULL,
    `ApprovedBy` VARCHAR(150) NULL,
    `IsReturnable` TINYINT(1) NOT NULL DEFAULT 0,
    `ExpectedReturnDate` DATE NULL,
    `PerformedBy` VARCHAR(150) NOT NULL,
    `Remarks` TEXT NULL,
    `CreatedByUserId` INT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `UQ_InvTxn_Number` (`TransactionNumber`),
    KEY `IX_InvTxn_Item_Date` (`ItemId`, `TransactionDate`, `Sequence`),
    KEY `IX_InvTxn_Status` (`Status`),
    CONSTRAINT `FK_InvTxn_Item` FOREIGN KEY (`ItemId`) REFERENCES `InventoryItems` (`ItemId`),
    CONSTRAINT `FK_InvTxn_Supplier` FOREIGN KEY (`SupplierId`) REFERENCES `InventorySuppliers` (`SupplierId`) ON DELETE SET NULL,
    CONSTRAINT `FK_InvTxn_Correction` FOREIGN KEY (`CorrectionOfId`) REFERENCES `InventoryTransactions` (`TransactionId`) ON DELETE SET NULL,
    CONSTRAINT `FK_InvTxn_Return` FOREIGN KEY (`ReturnOfId`) REFERENCES `InventoryTransactions` (`TransactionId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- 6. Inventory Activities
CREATE TABLE IF NOT EXISTS `InventoryActivities` (
    `ActivityId` INT AUTO_INCREMENT PRIMARY KEY,
    `ActivityDate` DATE NOT NULL,
    `ActivityText` VARCHAR(255) NOT NULL,
    `UserId` INT NULL,
    `UserName` VARCHAR(150) NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- =============================================================================
-- SECTION 2: SEED DEFAULT CATEGORIES AND SUPPLIERS IF EMPTY
-- =============================================================================

INSERT IGNORE INTO `InventoryCategories` (`Code`, `Name`, `Description`, `Department`, `Status`) VALUES
('CAT-001', 'IT Equipment', 'College computers, laptops, and networking items', 'Computer Science', 'Active'),
('CAT-002', 'Computer Accessories', 'Keyboards, mice, cables, and peripherals', 'Computer Science', 'Active'),
('CAT-003', 'Laboratory Equipment', 'Physics, Chemistry and Bio lab apparatus', 'Physics', 'Active'),
('CAT-004', 'Laboratory Chemicals', 'Acids, reagents and laboratory chemicals', 'Chemistry', 'Active'),
('CAT-005', 'Stationery', 'Paper, notebooks, markers and stationery', 'Administration', 'Active'),
('CAT-006', 'Classroom Supplies', 'Whiteboards, podiums, chalk and markers', 'Academic Office', 'Active'),
('CAT-007', 'Furniture', 'Desks, chairs, cupboards and benches', 'Administration', 'Active'),
('CAT-008', 'Electrical Equipment', 'Bulbs, wires, switches and fans', 'Maintenance', 'Active'),
('CAT-009', 'Sports Equipment', 'Cricket, football, badminton equipment', 'Sports', 'Active'),
('CAT-010', 'Library Supplies', 'Barcode labels, book covers, scanner accessories', 'Library', 'Active'),
('CAT-011', 'Cleaning Supplies', 'Sanitizers, cleaning liquids and mops', 'Maintenance', 'Active'),
('CAT-012', 'Safety Equipment', 'Fire extinguishers, first aid kits, masks', 'Administration', 'Active'),
('CAT-013', 'Maintenance Supplies', 'Tool sets, plumbing, repairs materials', 'Maintenance', 'Active'),
('CAT-014', 'Office Equipment', 'Printers, scanners, photocopiers', 'Administration', 'Active'),
('CAT-015', 'Other', 'General miscellaneous items', 'Administration', 'Active');

INSERT IGNORE INTO `InventorySuppliers` (`Code`, `Name`, `ContactPerson`, `Phone`, `Address1`, `City`, `State`, `PostalCode`, `Country`, `Status`) VALUES
('DDS-001', 'Deccan Digital Supplies', 'Ananya Rao', '9876501001', 'Plot 12, Tech Zone', 'Hyderabad', 'Telangana', '500081', 'India', 'Active'),
('VST-002', 'Vidya Scientific Traders', 'Kiran Shah', '9876501002', '45 Science Park', 'Vijayawada', 'Andhra Pradesh', '520002', 'India', 'Active'),
('CPO-003', 'Campus Paper & Office', 'Meera Nair', '9876501003', '78 Press Road', 'Visakhapatnam', 'Andhra Pradesh', '530003', 'India', 'Active'),
('GFF-004', 'Greenfield Furnishings', 'Arjun Patil', '9876501004', '22 Industrial Estate', 'Guntur', 'Andhra Pradesh', '522004', 'India', 'Active'),
('SCE-005', 'Safe Campus Essentials', 'Priya Reddy', '9876501005', '9 Safety Towers', 'Hyderabad', 'Telangana', '500034', 'India', 'Active');

-- =============================================================================
-- SECTION 3: STORED PROCEDURES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. sp_Inventory_GetDashboardSummary
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_GetDashboardSummary`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_GetDashboardSummary`()
BEGIN
    -- 1. KPIs
    SELECT 
        COUNT(i.ItemId) AS TotalItems,
        COALESCE(SUM(i.Quantity * i.UnitCost), 0.00) AS TotalStockValue,
        COUNT(CASE WHEN i.Status = 'Active' AND i.Quantity < i.MinStock THEN 1 END) AS LowStockCount,
        0 AS PendingOrdersCount
    FROM `InventoryItems` i;

    -- 2. Recent Stock Movements (8)
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
        t.Status,
        t.Department,
        t.RecipientName,
        COALESCE(s.Name, t.RecipientName, '—') AS Partner,
        t.ReferenceNumber,
        t.PerformedBy,
        t.Remarks,
        t.CreatedAt
    FROM `InventoryTransactions` t
    INNER JOIN `InventoryItems` i ON t.ItemId = i.ItemId
    LEFT JOIN `InventorySuppliers` s ON t.SupplierId = s.SupplierId
    ORDER BY t.TransactionDate DESC, t.Sequence DESC
    LIMIT 8;

    -- 3. Low Stock Items
    SELECT 
        i.ItemId,
        i.Code AS ItemCode,
        i.Name AS ItemName,
        c.Name AS CategoryName,
        i.Unit,
        i.Quantity AS CurrentStock,
        i.MinStock,
        i.UnitCost,
        (i.Quantity * i.UnitCost) AS StockValue,
        CASE 
            WHEN i.Quantity = 0 THEN 'Out of Stock'
            WHEN i.Quantity < i.MinStock THEN 'Low Stock'
            ELSE 'In Stock'
        END AS StockStatus,
        s.Name AS PreferredSupplier
    FROM `InventoryItems` i
    INNER JOIN `InventoryCategories` c ON i.CategoryId = c.CategoryId
    LEFT JOIN `InventorySuppliers` s ON i.SupplierId = s.SupplierId
    WHERE i.Status = 'Active' AND i.Quantity < i.MinStock
    ORDER BY i.Quantity ASC
    LIMIT 20;

    -- 4. Category Value Distribution
    SELECT 
        c.CategoryId,
        c.Name AS CategoryName,
        COUNT(i.ItemId) AS ItemCount,
        COALESCE(SUM(i.Quantity * i.UnitCost), 0.00) AS TotalStockValue
    FROM `InventoryCategories` c
    LEFT JOIN `InventoryItems` i ON c.CategoryId = i.CategoryId
    GROUP BY c.CategoryId, c.Name
    HAVING COUNT(i.ItemId) > 0
    ORDER BY TotalStockValue DESC;

    -- 5. Recent Activities
    SELECT 
        ActivityId,
        ActivityDate,
        ActivityText,
        UserName,
        CreatedAt
    FROM `InventoryActivities`
    ORDER BY CreatedAt DESC
    LIMIT 10;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. sp_Inventory_GetItems
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_GetItems`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_GetItems`(
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_CategoryId INT,
    IN p_Department VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_SupplierId INT,
    IN p_Status VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_StockStatus VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
)
BEGIN
    SELECT 
        i.ItemId,
        i.Code,
        i.Name,
        i.CategoryId,
        c.Name AS CategoryName,
        i.Unit,
        i.Type,
        i.Description,
        i.Brand,
        i.Model,
        i.Sku,
        i.Department,
        i.Location,
        i.Rack,
        i.OpeningQuantity,
        i.OpeningCost,
        i.Quantity,
        i.UnitCost,
        (i.Quantity * i.UnitCost) AS StockValue,
        i.MinStock,
        i.MaxStock,
        i.ReorderQty,
        i.IssueValue,
        i.SupplierId,
        s.Name AS SupplierName,
        i.SupplierItemCode,
        i.PurchaseDate,
        i.LastPurchaseDate,
        i.WarrantyDate,
        i.Status,
        CASE 
            WHEN i.Quantity = 0 THEN 'Out of Stock'
            WHEN i.Quantity < i.MinStock THEN 'Low Stock'
            ELSE 'In Stock'
        END AS StockStatus,
        i.Remarks,
        i.CreatedAt,
        i.UpdatedAt
    FROM `InventoryItems` i
    INNER JOIN `InventoryCategories` c ON i.CategoryId = c.CategoryId
    LEFT JOIN `InventorySuppliers` s ON i.SupplierId = s.SupplierId
    WHERE (p_CategoryId IS NULL OR p_CategoryId <= 0 OR i.CategoryId = p_CategoryId)
      AND (p_SupplierId IS NULL OR p_SupplierId <= 0 OR i.SupplierId = p_SupplierId)
      AND (p_Department IS NULL OR p_Department = '' OR i.Department = p_Department)
      AND (p_Status IS NULL OR p_Status = '' OR i.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = '' OR (
            i.Name LIKE CONCAT('%', p_Search, '%') OR
            i.Code LIKE CONCAT('%', p_Search, '%') OR
            c.Name LIKE CONCAT('%', p_Search, '%') OR
            COALESCE(s.Name, '') LIKE CONCAT('%', p_Search, '%')
      ))
      AND (p_StockStatus IS NULL OR p_StockStatus = '' OR (
            (p_StockStatus = 'Out of Stock' AND i.Quantity = 0) OR
            (p_StockStatus = 'Low Stock' AND i.Quantity > 0 AND i.Quantity < i.MinStock) OR
            (p_StockStatus = 'In Stock' AND i.Quantity >= i.MinStock)
      ))
    ORDER BY i.Name ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. sp_Inventory_GetItemById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_GetItemById`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_GetItemById`(
    IN p_ItemId INT
)
BEGIN
    SELECT 
        i.ItemId,
        i.Code,
        i.Name,
        i.CategoryId,
        c.Name AS CategoryName,
        i.Unit,
        i.Type,
        i.Description,
        i.Brand,
        i.Model,
        i.Sku,
        i.Department,
        i.Location,
        i.Rack,
        i.OpeningQuantity,
        i.OpeningCost,
        i.Quantity,
        i.UnitCost,
        (i.Quantity * i.UnitCost) AS StockValue,
        i.MinStock,
        i.MaxStock,
        i.ReorderQty,
        i.IssueValue,
        i.SupplierId,
        s.Name AS SupplierName,
        i.SupplierItemCode,
        i.PurchaseDate,
        i.LastPurchaseDate,
        i.WarrantyDate,
        i.Status,
        CASE 
            WHEN i.Quantity = 0 THEN 'Out of Stock'
            WHEN i.Quantity < i.MinStock THEN 'Low Stock'
            ELSE 'In Stock'
        END AS StockStatus,
        i.Remarks,
        i.CreatedAt,
        i.UpdatedAt
    FROM `InventoryItems` i
    INNER JOIN `InventoryCategories` c ON i.CategoryId = c.CategoryId
    LEFT JOIN `InventorySuppliers` s ON i.SupplierId = s.SupplierId
    WHERE i.ItemId = p_ItemId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. sp_Inventory_GetItemLedger
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_GetItemLedger`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_GetItemLedger`(
    IN p_ItemId INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE
)
BEGIN
    SELECT 
        t.TransactionId,
        t.TransactionNumber,
        t.Sequence,
        t.TransactionDate,
        t.MovementType,
        t.Quantity,
        CASE WHEN t.MovementType = 'Stock In' THEN t.Quantity ELSE 0.00 END AS QuantityIn,
        CASE WHEN t.MovementType = 'Stock Out' THEN t.Quantity ELSE 0.00 END AS QuantityOut,
        ((SELECT OpeningQuantity FROM `InventoryItems` WHERE ItemId = p_ItemId) + 
         SUM(CASE WHEN t.MovementType = 'Stock In' THEN t.Quantity ELSE -t.Quantity END) 
         OVER (ORDER BY t.TransactionDate ASC, t.Sequence ASC)) AS RunningBalance,
        t.UnitCost,
        t.TotalAmount,
        t.ReferenceNumber,
        t.Department,
        t.RecipientName,
        COALESCE(s.Name, t.RecipientName, '—') AS Partner,
        t.PerformedBy,
        t.Status,
        t.CorrectionOfId,
        t.ReturnOfId,
        t.Remarks
    FROM `InventoryTransactions` t
    LEFT JOIN `InventorySuppliers` s ON t.SupplierId = s.SupplierId
    WHERE t.ItemId = p_ItemId
    ORDER BY t.TransactionDate ASC, t.Sequence ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. sp_Inventory_PostMovement
-- Atomic moving weighted-average transaction calculation
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_PostMovement`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_PostMovement`(
    IN p_MovementType VARCHAR(20),       -- 'Stock In' or 'Stock Out'
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
    IN p_UserId INT,
    IN p_PaymentMethod VARCHAR(50),
    IN p_PaymentTransactionNumber VARCHAR(100),
    IN p_CashReceiptPath VARCHAR(500)
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

    IF p_TransactionDate < DATE(v_ItemCreatedAt) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction date cannot precede item creation.';
    END IF;

    -- Check latest movement date
    SELECT MAX(TransactionDate) INTO v_LatestMovementDate
    FROM `InventoryTransactions`
    WHERE ItemId = p_ItemId;

    IF v_LatestMovementDate IS NOT NULL AND p_TransactionDate < v_LatestMovementDate THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction date cannot precede the latest movement for this item.';
    END IF;

    -- Movement calculations
    IF p_MovementType = 'Stock In' THEN
        IF p_UnitCost < 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unit cost must be non-negative.';
        END IF;

        SET v_NewQty = v_CurrentQty + p_Quantity;
        -- Moving weighted-average formula
        SET v_NewCost = ((v_CurrentQty * v_CurrentCost) + (p_Quantity * p_UnitCost)) / v_NewQty;
        SET v_TotalAmount = p_Quantity * p_UnitCost;

        UPDATE `InventoryItems`
        SET Quantity = v_NewQty,
            UnitCost = v_NewCost,
            LastPurchaseDate = p_TransactionDate,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE ItemId = p_ItemId;

    ELSEIF p_MovementType = 'Stock Out' THEN
        IF p_Quantity > v_CurrentQty THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock available for this issue.';
        END IF;

        SET v_NewQty = v_CurrentQty - p_Quantity;
        -- Outbound transactions take current weighted average cost
        SET p_UnitCost = v_CurrentCost;
        SET v_NewCost = v_CurrentCost;
        SET v_TotalAmount = p_Quantity * v_CurrentCost;

        UPDATE `InventoryItems`
        SET Quantity = v_NewQty,
            UpdatedAt = CURRENT_TIMESTAMP
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
        `PaymentMethod`, `PaymentTransactionNumber`, `CashReceiptPath`,
        `SupplierId`, `SupplierInvoice`, `InvoiceNumber`, `PurchaseOrderNumber`,
        `ReferenceNumber`, `Location`, `Condition`, `BatchNumber`, `ExpiryDate`,
        `IssueType`, `Department`, `RecipientName`, `RecipientId`, `Destination`,
        `Purpose`, `ApprovedBy`, `IsReturnable`, `ExpectedReturnDate`, `PerformedBy`,
        `Remarks`, `CreatedByUserId`
    ) VALUES (
        v_TxnNumber, v_NextSeq, p_TransactionDate, p_MovementType, p_ItemId,
        p_Quantity, p_UnitCost, v_TotalAmount, v_CurrentCost, 'Posted',
        COALESCE(p_PaymentMethod, 'Cash'), p_PaymentTransactionNumber, p_CashReceiptPath,
        p_SupplierId, p_SupplierInvoice, p_InvoiceNumber, p_PurchaseOrderNumber,
        p_ReferenceNumber, p_Location, p_Condition, p_BatchNumber, p_ExpiryDate,
        p_IssueType, p_Department, p_RecipientName, p_RecipientId, p_Destination,
        p_Purpose, p_ApprovedBy, COALESCE(p_IsReturnable, 0), p_ExpectedReturnDate, p_PerformedBy,
        p_Remarks, p_UserId
    );

    SET v_NewTxnId = LAST_INSERT_ID();

    -- Log activity
    INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`)
    VALUES (CURRENT_DATE(), CONCAT(p_MovementType, ': ', p_Quantity, ' ', v_ItemUnit, ' of ', v_ItemName), p_UserId, p_PerformedBy);

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
-- 6. sp_Inventory_ReverseMovement
-- Reverses the latest unreturned posted movement with a compensating correction record
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
    DECLARE v_OpeningCost DECIMAL(12,2);
    DECLARE v_RevertedQty DECIMAL(12,2);
    DECLARE v_RevertedCost DECIMAL(12,2);
    DECLARE v_CorrectionType VARCHAR(20);
    DECLARE v_NextSeq INT;
    DECLARE v_NewTxnNumber VARCHAR(50);
    DECLARE v_CorrectionOfId INT;
    DECLARE v_ReturnOfId INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Lock and retrieve target transaction
    SELECT ItemId, MovementType, Status, Quantity, UnitCost, TotalAmount, PreviousUnitCost, TransactionNumber, CorrectionOfId, ReturnOfId
    INTO v_ItemId, v_MovementType, v_Status, v_Quantity, v_UnitCost, v_TotalAmount, v_PreviousUnitCost, v_TxnNumber, v_CorrectionOfId, v_ReturnOfId
    FROM `InventoryTransactions`
    WHERE TransactionId = p_TransactionId FOR UPDATE;

    IF v_ItemId IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Movement does not exist.';
    END IF;

    -- Lock affected item
    SELECT Quantity, UnitCost, OpeningCost 
    INTO v_CurrentQty, v_CurrentCost, v_OpeningCost
    FROM `InventoryItems`
    WHERE ItemId = v_ItemId FOR UPDATE;

    -- Reversal eligibility checks
    IF v_Status != 'Posted' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only posted movements can be reversed.';
    END IF;

    IF v_CorrectionOfId IS NOT NULL OR v_ReturnOfId IS NOT NULL OR v_Status = 'Correction' OR v_Status = 'Returned' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A return or correction movement cannot be reversed.';
    END IF;

    SELECT TransactionId INTO v_LatestTxnId
    FROM `InventoryTransactions`
    WHERE ItemId = v_ItemId
    ORDER BY TransactionDate DESC, Sequence DESC, TransactionId DESC
    LIMIT 1;

    IF v_LatestTxnId != p_TransactionId THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only the latest unreturned movement for an item can be reversed.';
    END IF;

    IF EXISTS (SELECT 1 FROM `InventoryTransactions` WHERE ReturnOfId = p_TransactionId) THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot reverse an issue that has already been returned.';
    END IF;

    IF v_MovementType = 'Stock In' THEN
        SET v_RevertedQty = v_CurrentQty - v_Quantity;
        IF v_RevertedQty < 0 THEN
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reversal would produce negative stock.';
        END IF;

        SET v_RevertedCost = CASE 
            WHEN v_RevertedQty > 0 THEN ((v_CurrentQty * v_CurrentCost) - v_TotalAmount) / v_RevertedQty
            ELSE v_PreviousUnitCost
        END;
        SET v_CorrectionType = 'Stock Out';

    ELSE -- Stock Out reversal
        SET v_RevertedQty = v_CurrentQty + v_Quantity;
        SET v_RevertedCost = v_CurrentCost;
        SET v_CorrectionType = 'Stock In';
    END IF;

    -- Update Item balance and valuation
    UPDATE `InventoryItems`
    SET Quantity = v_RevertedQty,
        UnitCost = v_RevertedCost,
        UpdatedAt = CURRENT_TIMESTAMP
    WHERE ItemId = v_ItemId;

    -- Mark original transaction as Reversed
    UPDATE `InventoryTransactions`
    SET Status = 'Reversed'
    WHERE TransactionId = p_TransactionId;

    -- Insert compensating Correction transaction
    SELECT COALESCE(MAX(Sequence), 0) + 1 INTO v_NextSeq FROM `InventoryTransactions`;
    SET v_NewTxnNumber = CONCAT('INV-TXN-', LPAD(v_NextSeq, 6, '0'));

    INSERT INTO `InventoryTransactions` (
        `TransactionNumber`, `Sequence`, `TransactionDate`, `MovementType`, `ItemId`,
        `Quantity`, `UnitCost`, `TotalAmount`, `PreviousUnitCost`, `Status`,
        `CorrectionOfId`, `PerformedBy`, `Remarks`, `Purpose`, `CreatedByUserId`
    ) VALUES (
        v_NewTxnNumber, v_NextSeq, CURRENT_DATE(), v_CorrectionType, v_ItemId,
        v_Quantity, v_UnitCost, v_TotalAmount, v_CurrentCost, 'Correction',
        p_TransactionId, p_PerformedBy, CONCAT('Reversal of ', v_TxnNumber), 'Transaction reversal', p_UserId
    );

    -- Audit activity log
    INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`)
    VALUES (CURRENT_DATE(), CONCAT('Reversed ', v_TxnNumber), p_UserId, p_PerformedBy);

    COMMIT;

    SELECT 
        v_NewTxnNumber AS CorrectionTransactionNumber,
        v_RevertedQty AS UpdatedQuantity,
        v_RevertedCost AS UpdatedUnitCost;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. sp_Inventory_RecordReturn
-- Records a full return of an issued returnable item
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
    DECLARE v_Quantity DECIMAL(12,2);
    DECLARE v_UnitCost DECIMAL(12,2);
    DECLARE v_TotalAmount DECIMAL(14,2);
    DECLARE v_IsReturnable TINYINT(1);
    DECLARE v_TxnNumber VARCHAR(50);
    DECLARE v_CurrentQty DECIMAL(12,2);
    DECLARE v_CurrentCost DECIMAL(12,2);
    DECLARE v_NewQty DECIMAL(12,2);
    DECLARE v_NewCost DECIMAL(12,2);
    DECLARE v_NextSeq INT;
    DECLARE v_NewTxnNumber VARCHAR(50);

    SELECT ItemId, MovementType, Status, Quantity, UnitCost, TotalAmount, IsReturnable, TransactionNumber
    INTO v_ItemId, v_MovementType, v_Status, v_Quantity, v_UnitCost, v_TotalAmount, v_IsReturnable, v_TxnNumber
    FROM `InventoryTransactions`
    WHERE TransactionId = p_TransactionId;

    IF v_ItemId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction not found.';
    END IF;

    IF v_MovementType != 'Stock Out' OR v_IsReturnable != 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only returnable issues can be returned.';
    END IF;

    IF v_Status != 'Posted' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only posted issues can be returned.';
    END IF;

    IF EXISTS (SELECT 1 FROM `InventoryTransactions` WHERE ReturnOfId = p_TransactionId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This issue has already been returned.';
    END IF;

    SELECT Quantity, UnitCost INTO v_CurrentQty, v_CurrentCost
    FROM `InventoryItems`
    WHERE ItemId = v_ItemId FOR UPDATE;

    SET v_NewQty = v_CurrentQty + v_Quantity;
    SET v_NewCost = ((v_CurrentQty * v_CurrentCost) + v_TotalAmount) / v_NewQty;

    -- Update Item
    UPDATE `InventoryItems`
    SET Quantity = v_NewQty,
        UnitCost = v_NewCost,
        UpdatedAt = CURRENT_TIMESTAMP
    WHERE ItemId = v_ItemId;

    -- Insert Stock In return record
    SELECT COALESCE(MAX(Sequence), 0) + 1 INTO v_NextSeq FROM `InventoryTransactions`;
    SET v_NewTxnNumber = CONCAT('INV-TXN-', LPAD(v_NextSeq, 6, '0'));

    INSERT INTO `InventoryTransactions` (
        `TransactionNumber`, `Sequence`, `TransactionDate`, `MovementType`, `ItemId`,
        `Quantity`, `UnitCost`, `TotalAmount`, `PreviousUnitCost`, `Status`,
        `ReturnOfId`, `ReferenceNumber`, `PerformedBy`, `Remarks`, `Purpose`, `CreatedByUserId`
    ) VALUES (
        v_NewTxnNumber, v_NextSeq, CURRENT_DATE(), 'Stock In', v_ItemId,
        v_Quantity, v_UnitCost, v_TotalAmount, v_CurrentCost, 'Returned',
        p_TransactionId, v_TxnNumber, p_PerformedBy, CONCAT('Full return of ', v_TxnNumber), 'Item return', p_UserId
    );

    -- Log Activity
    INSERT INTO `InventoryActivities` (`ActivityDate`, `ActivityText`, `UserId`, `UserName`)
    VALUES (CURRENT_DATE(), CONCAT('Recorded return of ', v_TxnNumber), p_UserId, p_PerformedBy);

    SELECT 
        v_NewTxnNumber AS ReturnTransactionNumber,
        v_NewQty AS UpdatedQuantity,
        v_NewCost AS UpdatedUnitCost;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 8. sp_Inventory_GetReport
-- Dynamically powers all 8 audited analytical reports
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Inventory_GetReport`;
DELIMITER //
CREATE PROCEDURE `sp_Inventory_GetReport`(
    IN p_ReportType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_DateFrom DATE,
    IN p_DateTo DATE,
    IN p_ItemId INT,
    IN p_CategoryId INT,
    IN p_Department VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_SupplierId INT,
    IN p_MovementType VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci,
    IN p_StockStatus VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
)
BEGIN
    IF p_ReportType = 'Stock Summary' THEN
        SELECT 
            i.ItemId,
            i.Code AS ItemCode,
            i.Name AS ItemName,
            c.Name AS Category,
            i.Unit,
            -- Opening stock calculation before p_DateFrom
            (i.OpeningQuantity + COALESCE((
                SELECT SUM(CASE WHEN t.MovementType = 'Stock In' THEN t.Quantity ELSE -t.Quantity END)
                FROM `InventoryTransactions` t
                WHERE t.ItemId = i.ItemId AND p_DateFrom IS NOT NULL AND t.TransactionDate < p_DateFrom
            ), 0.00)) AS OpeningStock,
            -- Received in period
            COALESCE((
                SELECT SUM(t.Quantity)
                FROM `InventoryTransactions` t
                WHERE t.ItemId = i.ItemId AND t.MovementType = 'Stock In'
                  AND (p_DateFrom IS NULL OR t.TransactionDate >= p_DateFrom)
                  AND (p_DateTo IS NULL OR t.TransactionDate <= p_DateTo)
            ), 0.00) AS ReceivedStock,
            -- Issued in period
            COALESCE((
                SELECT SUM(t.Quantity)
                FROM `InventoryTransactions` t
                WHERE t.ItemId = i.ItemId AND t.MovementType = 'Stock Out'
                  AND (p_DateFrom IS NULL OR t.TransactionDate >= p_DateFrom)
                  AND (p_DateTo IS NULL OR t.TransactionDate <= p_DateTo)
            ), 0.00) AS IssuedStock,
            i.Quantity AS CurrentStock,
            i.MinStock,
            i.UnitCost,
            (i.Quantity * i.UnitCost) AS StockValue,
            CASE 
                WHEN i.Quantity = 0 THEN 'Out of Stock'
                WHEN i.Quantity < i.MinStock THEN 'Low Stock'
                ELSE 'In Stock'
            END AS StockStatus,
            i.Status AS ItemStatus
        FROM `InventoryItems` i
        INNER JOIN `InventoryCategories` c ON i.CategoryId = c.CategoryId
        WHERE (p_ItemId IS NULL OR p_ItemId <= 0 OR i.ItemId = p_ItemId)
          AND (p_CategoryId IS NULL OR p_CategoryId <= 0 OR i.CategoryId = p_CategoryId)
          AND (p_Department IS NULL OR p_Department = '' OR i.Department = p_Department)
          AND (p_SupplierId IS NULL OR p_SupplierId <= 0 OR i.SupplierId = p_SupplierId);

    ELSEIF p_ReportType = 'Stock Movement Report' THEN
        SELECT 
            t.TransactionNumber,
            t.TransactionDate AS Date,
            i.Name AS ItemName,
            i.Code AS ItemCode,
            t.MovementType,
            t.Quantity,
            t.UnitCost,
            t.TotalAmount AS TotalValue,
            COALESCE(s.Name, t.RecipientName, '—') AS Partner,
            t.Department,
            t.ReferenceNumber,
            t.PerformedBy,
            t.Status
        FROM `InventoryTransactions` t
        INNER JOIN `InventoryItems` i ON t.ItemId = i.ItemId
        LEFT JOIN `InventorySuppliers` s ON t.SupplierId = s.SupplierId
        WHERE (p_DateFrom IS NULL OR t.TransactionDate >= p_DateFrom)
          AND (p_DateTo IS NULL OR t.TransactionDate <= p_DateTo)
          AND (p_ItemId IS NULL OR p_ItemId <= 0 OR t.ItemId = p_ItemId)
          AND (p_MovementType IS NULL OR p_MovementType = '' OR t.MovementType = p_MovementType)
          AND (p_Department IS NULL OR p_Department = '' OR t.Department = p_Department)
          AND (p_SupplierId IS NULL OR p_SupplierId <= 0 OR t.SupplierId = p_SupplierId)
        ORDER BY t.TransactionDate DESC, t.Sequence DESC;

    ELSEIF p_ReportType = 'Low Stock Report' THEN
        SELECT 
            i.ItemId,
            i.Code AS ItemCode,
            i.Name AS Item,
            c.Name AS Category,
            i.Quantity AS CurrentStock,
            i.MinStock,
            GREATEST(i.ReorderQty, i.MinStock - i.Quantity) AS SuggestedReorder,
            COALESCE(s.Name, '—') AS PreferredSupplier
        FROM `InventoryItems` i
        INNER JOIN `InventoryCategories` c ON i.CategoryId = c.CategoryId
        LEFT JOIN `InventorySuppliers` s ON i.SupplierId = s.SupplierId
        WHERE i.Status = 'Active' AND i.Quantity < i.MinStock
        ORDER BY i.Quantity ASC;

    ELSEIF p_ReportType = 'Department-wise Issue Report' THEN
        SELECT 
            t.TransactionDate AS Date,
            i.Name AS Item,
            t.Quantity,
            t.Department,
            t.RecipientName AS Recipient,
            t.Purpose,
            t.PerformedBy AS IssuedBy,
            t.TotalAmount AS IssueValue,
            t.Status
        FROM `InventoryTransactions` t
        INNER JOIN `InventoryItems` i ON t.ItemId = i.ItemId
        WHERE t.MovementType = 'Stock Out'
          AND t.Status = 'Posted'
          AND t.CorrectionOfId IS NULL
          AND (p_DateFrom IS NULL OR t.TransactionDate >= p_DateFrom)
          AND (p_DateTo IS NULL OR t.TransactionDate <= p_DateTo)
          AND (p_Department IS NULL OR p_Department = '' OR t.Department = p_Department)
        ORDER BY t.TransactionDate DESC;

    ELSEIF p_ReportType = 'Supplier Purchase Report' THEN
        SELECT 
            t.TransactionDate AS Date,
            s.Name AS Supplier,
            COALESCE(t.SupplierInvoice, t.InvoiceNumber, '—') AS InvoiceNumber,
            i.Name AS Item,
            t.Quantity AS QuantityReceived,
            t.UnitCost,
            t.TotalAmount,
            t.Status
        FROM `InventoryTransactions` t
        INNER JOIN `InventoryItems` i ON t.ItemId = i.ItemId
        INNER JOIN `InventorySuppliers` s ON t.SupplierId = s.SupplierId
        WHERE t.MovementType = 'Stock In'
          AND t.Status = 'Posted'
          AND t.ReturnOfId IS NULL
          AND t.CorrectionOfId IS NULL
          AND (p_DateFrom IS NULL OR t.TransactionDate >= p_DateFrom)
          AND (p_DateTo IS NULL OR t.TransactionDate <= p_DateTo)
          AND (p_SupplierId IS NULL OR p_SupplierId <= 0 OR t.SupplierId = p_SupplierId)
        ORDER BY t.TransactionDate DESC;

    ELSEIF p_ReportType = 'Category-wise Inventory Value' THEN
        SELECT 
            c.CategoryId,
            c.Name AS Category,
            COUNT(i.ItemId) AS NumberOfItems,
            COALESCE(SUM(i.Quantity * i.UnitCost), 0.00) AS StockValue,
            COUNT(CASE WHEN i.Status = 'Active' AND i.Quantity < i.MinStock THEN 1 END) AS MinimumStockAlerts
        FROM `InventoryCategories` c
        LEFT JOIN `InventoryItems` i ON c.CategoryId = i.CategoryId
        GROUP BY c.CategoryId, c.Name
        HAVING COUNT(i.ItemId) > 0
        ORDER BY StockValue DESC;

    ELSEIF p_ReportType = 'Expiry / Warranty Report' THEN
        -- Combines Item warranties and Stock In batch expirations
        SELECT 
            i.Name AS Item,
            i.Code AS ItemCode,
            COALESCE(i.Sku, '—') AS BatchOrSku,
            'Warranty' AS RecordType,
            i.WarrantyDate AS ExpiryWarrantyDate,
            DATEDIFF(i.WarrantyDate, CURRENT_DATE()) AS DaysRemaining,
            CASE 
                WHEN DATEDIFF(i.WarrantyDate, CURRENT_DATE()) < 0 THEN 'Expired'
                WHEN DATEDIFF(i.WarrantyDate, CURRENT_DATE()) <= 30 THEN 'Expiring Soon'
                ELSE 'Valid'
            END AS Status
        FROM `InventoryItems` i
        WHERE i.WarrantyDate IS NOT NULL
          AND (p_DateFrom IS NULL OR i.WarrantyDate >= p_DateFrom)
          AND (p_DateTo IS NULL OR i.WarrantyDate <= p_DateTo)

        UNION ALL

        SELECT 
            i.Name AS Item,
            i.Code AS ItemCode,
            COALESCE(t.BatchNumber, '—') AS BatchOrSku,
            'Expiry' AS RecordType,
            t.ExpiryDate AS ExpiryWarrantyDate,
            DATEDIFF(t.ExpiryDate, CURRENT_DATE()) AS DaysRemaining,
            CASE 
                WHEN DATEDIFF(t.ExpiryDate, CURRENT_DATE()) < 0 THEN 'Expired'
                WHEN DATEDIFF(t.ExpiryDate, CURRENT_DATE()) <= 30 THEN 'Expiring Soon'
                ELSE 'Valid'
            END AS Status
        FROM `InventoryTransactions` t
        INNER JOIN `InventoryItems` i ON t.ItemId = i.ItemId
        WHERE t.ExpiryDate IS NOT NULL AND t.Status = 'Posted'
          AND (p_DateFrom IS NULL OR t.ExpiryDate >= p_DateFrom)
          AND (p_DateTo IS NULL OR t.ExpiryDate <= p_DateTo)
        ORDER BY ExpiryWarrantyDate ASC;

    ELSEIF p_ReportType = 'Returnable Items Report' THEN
        SELECT 
            t.TransactionId,
            t.TransactionNumber,
            t.TransactionDate AS IssueDate,
            i.Name AS Item,
            t.Quantity,
            t.RecipientName AS Recipient,
            t.Department,
            t.ExpectedReturnDate,
            CASE 
                WHEN t.Status = 'Reversed' THEN 'Reversed'
                WHEN EXISTS (SELECT 1 FROM `InventoryTransactions` r WHERE r.ReturnOfId = t.TransactionId) THEN 'Returned'
                WHEN t.ExpectedReturnDate < CURRENT_DATE() THEN 'Overdue'
                ELSE 'Awaiting Return'
            END AS ReturnStatus
        FROM `InventoryTransactions` t
        INNER JOIN `InventoryItems` i ON t.ItemId = i.ItemId
        WHERE t.MovementType = 'Stock Out' AND t.IsReturnable = 1
        ORDER BY t.TransactionDate DESC;
    END IF;
END //
DELIMITER ;
