-- =================================================================================
-- Migration Script: Omnichannel Payment Gateway & Multi-Installment Allocation Tables
-- Author: Advanced Agentic Engineer
-- Target: College Management System Fee Database
-- Safe, Idempotent Execution
-- =================================================================================

-- 1. Create PaymentGatewayTransactions table if not exists
CREATE TABLE IF NOT EXISTS `PaymentGatewayTransactions` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `StudentId` INT NOT NULL,
    `StudentFeeId` INT NOT NULL,
    `FeeInstallmentId` INT NULL,
    `FeeInstallmentIdsJson` VARCHAR(500) NULL,
    `OrderId` VARCHAR(100) NOT NULL,
    `GatewayPaymentId` VARCHAR(100) NULL,
    `UtrNumber` VARCHAR(50) NULL,
    `BankName` VARCHAR(200) NULL,
    `Amount` DECIMAL(18,2) NOT NULL,
    `Currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
    `PaymentMethod` VARCHAR(50) NOT NULL DEFAULT 'UPI_QR',
    `Status` VARCHAR(30) NOT NULL DEFAULT 'Created',
    `IdempotencyKey` VARCHAR(256) NULL,
    `RequestPayloadHash` VARCHAR(128) NULL,
    `RowVersion` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    `ReceiptNumber` VARCHAR(50) NULL,
    `FeePaymentId` INT NULL,
    `CollectedByUserId` INT NULL,
    `FailureReason` VARCHAR(500) NULL,
    `Remarks` VARCHAR(500) NULL,
    `UpiUri` VARCHAR(1000) NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `SettledAt` DATETIME(6) NULL,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UK_PaymentGateway_OrderId` (`OrderId`),
    KEY `IX_PaymentGateway_IdempotencyKey` (`IdempotencyKey`),
    KEY `IX_PaymentGateway_PayloadHash` (`RequestPayloadHash`),
    KEY `IX_PaymentGateway_UtrNumber` (`UtrNumber`),
    KEY `IX_PaymentGateway_Status` (`Status`),
    KEY `IX_PaymentGateway_StudentFeeId` (`StudentFeeId`),
    KEY `IX_PaymentGateway_StudentId` (`StudentId`),
    CONSTRAINT `FK_PaymentGateway_Student` FOREIGN KEY (`StudentId`) REFERENCES `Students` (`StudentId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_PaymentGateway_StudentFee` FOREIGN KEY (`StudentFeeId`) REFERENCES `StudentFees` (`StudentFeeId`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Idempotent column check for FeeInstallmentIdsJson in case table already existed
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'PaymentGatewayTransactions' 
      AND COLUMN_NAME = 'FeeInstallmentIdsJson');

SET @sql_stmt := IF(@col_exists = 0, 
    'ALTER TABLE `PaymentGatewayTransactions` ADD COLUMN `FeeInstallmentIdsJson` VARCHAR(500) NULL AFTER `FeeInstallmentId`;', 
    'SELECT 1;');
PREPARE stmt FROM @sql_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Create FeePaymentAllocations table for granular multi-installment tracking
CREATE TABLE IF NOT EXISTS `FeePaymentAllocations` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `FeePaymentId` INT NOT NULL,
    `FeeInstallmentId` INT NOT NULL,
    `AllocatedAmount` DECIMAL(18,2) NOT NULL,
    `AllocationDate` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`Id`),
    KEY `IX_FeePaymentAllocations_PaymentId` (`FeePaymentId`),
    KEY `IX_FeePaymentAllocations_InstallmentId` (`FeeInstallmentId`),
    CONSTRAINT `FK_FeePaymentAllocations_Payment` FOREIGN KEY (`FeePaymentId`) REFERENCES `FeePayments` (`FeePaymentId`) ON DELETE CASCADE,
    CONSTRAINT `FK_FeePaymentAllocations_Installment` FOREIGN KEY (`FeeInstallmentId`) REFERENCES `FeeInstallments` (`FeeInstallmentId`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create PaymentGatewayConfigs table for runtime bank account & gateway settings
CREATE TABLE IF NOT EXISTS `PaymentGatewayConfigs` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `CampusId` INT NULL,
    `BankName` VARCHAR(200) NULL,
    `AccountHolderName` VARCHAR(200) NULL,
    `AccountNumber` VARCHAR(50) NULL,
    `IfscCode` VARCHAR(20) NULL,
    `BranchName` VARCHAR(200) NULL,
    `AccountType` VARCHAR(50) NOT NULL DEFAULT 'Current',
    `PayeeVpa` VARCHAR(100) NOT NULL DEFAULT '',
    `PayeeName` VARCHAR(200) NOT NULL DEFAULT '',
    `Currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
    `Mcc` VARCHAR(10) NOT NULL DEFAULT '8220',
    `EnableCounterUpiQr` TINYINT(1) NOT NULL DEFAULT 0,
    `Provider` VARCHAR(50) NOT NULL DEFAULT 'Razorpay',
    `IsLiveMode` TINYINT(1) NOT NULL DEFAULT 0,
    `RazorpayKeyId` VARCHAR(100) NULL,
    `RazorpayKeySecret` VARCHAR(200) NULL,
    `RazorpayWebhookSecret` VARCHAR(200) NULL,
    `AutoCapture` TINYINT(1) NOT NULL DEFAULT 1,
    `EnableRazorpay` TINYINT(1) NOT NULL DEFAULT 0,
    `EnableOfflineUtr` TINYINT(1) NOT NULL DEFAULT 0,
    `PollingIntervalMs` INT NOT NULL DEFAULT 1200,
    `MonitoringTimeoutSeconds` INT NOT NULL DEFAULT 600,
    `BaseAppUrl` VARCHAR(255) NULL,
    `FrontendPort` INT NOT NULL DEFAULT 5173,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    `UpdatedByUserId` INT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_PaymentGatewayConfigs_CampusId` (`CampusId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Idempotent column checks for Razorpay Dynamic QR & Campus scoping on PaymentGatewayTransactions
SET @col_qr := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PaymentGatewayTransactions' AND COLUMN_NAME = 'GatewayQrCodeId');
SET @sql_qr := IF(@col_qr = 0, 'ALTER TABLE `PaymentGatewayTransactions` ADD COLUMN `GatewayQrCodeId` VARCHAR(100) NULL AFTER `OrderId`;', 'SELECT 1;');
PREPARE stmt FROM @sql_qr; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_cmp := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PaymentGatewayTransactions' AND COLUMN_NAME = 'CampusId');
SET @sql_cmp := IF(@col_cmp = 0, 'ALTER TABLE `PaymentGatewayTransactions` ADD COLUMN `CampusId` INT NULL AFTER `StudentFeeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmp; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exp := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PaymentGatewayTransactions' AND COLUMN_NAME = 'ExpiresAt');
SET @sql_exp := IF(@col_exp = 0, 'ALTER TABLE `PaymentGatewayTransactions` ADD COLUMN `ExpiresAt` DATETIME(6) NULL AFTER `SettledAt`;', 'SELECT 1;');
PREPARE stmt FROM @sql_exp; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_sync := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PaymentGatewayTransactions' AND COLUMN_NAME = 'LastGatewaySyncAtUtc');
SET @sql_sync := IF(@col_sync = 0, 'ALTER TABLE `PaymentGatewayTransactions` ADD COLUMN `LastGatewaySyncAtUtc` DATETIME(6) NULL AFTER `ExpiresAt`;', 'SELECT 1;');
PREPARE stmt FROM @sql_sync; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. Create PaymentLedgerEntries table for cloud-ready immutable DB audit ledger
CREATE TABLE IF NOT EXISTS `PaymentLedgerEntries` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `PaymentGatewayTransactionId` INT NULL,
    `FeePaymentId` INT NULL,
    `StudentId` INT NULL,
    `CampusId` INT NULL,
    `AcademicYearId` INT NULL,
    `EntryType` VARCHAR(30) NOT NULL DEFAULT 'Credit',
    `Amount` DECIMAL(18,2) NOT NULL,
    `StudentName` VARCHAR(200) NOT NULL,
    `AdmissionNo` VARCHAR(100) NOT NULL DEFAULT '',
    `Course` VARCHAR(200) NOT NULL DEFAULT '',
    `PaymentMethod` VARCHAR(50) NOT NULL,
    `ReferenceNumber` VARCHAR(150) NOT NULL DEFAULT '',
    `ReceiptNumber` VARCHAR(50) NOT NULL DEFAULT '',
    `Status` VARCHAR(30) NOT NULL DEFAULT 'Captured',
    `Remarks` VARCHAR(500) NULL,
    `PaymentDateUtc` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`Id`),
    KEY `IX_PaymentLedgerEntries_TxnId` (`PaymentGatewayTransactionId`),
    KEY `IX_PaymentLedgerEntries_Campus_Created` (`CampusId`, `CreatedAt`),
    KEY `IX_PaymentLedgerEntries_AcademicYearId` (`AcademicYearId`),
    KEY `IX_PaymentLedgerEntries_StudentId` (`StudentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
