-- =============================================================================
-- Migration 31: Multi-Account Bank Support for Campus Payment Gateways
-- Allows colleges to store, manage, and switch multiple receiving bank accounts
-- per campus, designating one active receiving account for fee collection.
-- =============================================================================

CREATE TABLE IF NOT EXISTS `CampusBankAccounts` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `CampusId` INT NOT NULL,
    `BankName` VARCHAR(200) NOT NULL,
    `AccountHolderName` VARCHAR(200) NOT NULL,
    `AccountNumber` VARCHAR(50) NOT NULL,
    `IfscCode` VARCHAR(20) NOT NULL,
    `BranchName` VARCHAR(200) NULL,
    `AccountType` VARCHAR(50) NOT NULL DEFAULT 'Current',
    `IsActive` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    `CreatedByUserId` INT NULL,
    `UpdatedByUserId` INT NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_CampusBankAccounts_CampusId` (`CampusId`),
    KEY `IX_CampusBankAccounts_Campus_Active` (`CampusId`, `IsActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed / Backfill existing bank accounts from PaymentGatewayConfigs if any exist and not yet migrated
INSERT INTO `CampusBankAccounts` (
    `CampusId`, 
    `BankName`, 
    `AccountHolderName`, 
    `AccountNumber`, 
    `IfscCode`, 
    `BranchName`, 
    `AccountType`, 
    `IsActive`, 
    `CreatedAt`
)
SELECT 
    pgc.`CampusId`, 
    TRIM(pgc.`BankName`), 
    TRIM(pgc.`AccountHolderName`), 
    TRIM(pgc.`AccountNumber`), 
    UPPER(TRIM(pgc.`IfscCode`)), 
    TRIM(pgc.`BranchName`), 
    IF(TRIM(pgc.`AccountType`) = 'Savings', 'Savings', 'Current'), 
    1, 
    CURRENT_TIMESTAMP(6)
FROM `PaymentGatewayConfigs` pgc
WHERE pgc.`CampusId` IS NOT NULL
  AND pgc.`BankName` IS NOT NULL AND TRIM(pgc.`BankName`) <> ''
  AND pgc.`AccountNumber` IS NOT NULL AND TRIM(pgc.`AccountNumber`) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM `CampusBankAccounts` cba WHERE cba.`CampusId` = pgc.`CampusId`
  );
