-- =============================================================================
-- SCRIPT 01: 01_SuperAdmin_Core_Tables.sql
-- PURPOSE: Create Core Platform Tables for Multi-Tenant Super Admin Module
-- ENVIRONMENT: MySQL 8.0 / CollegeManagement
-- EXECUTION SAFETY: DDL / Creates 8 New Independent Platform Tables
-- =============================================================================

USE `CollegeManagement`;

-- 1. COLLEGES TABLE (Institutional Tenants)
CREATE TABLE IF NOT EXISTS `Colleges` (
    `CollegeId` INT NOT NULL AUTO_INCREMENT,
    `CollegeCode` VARCHAR(50) NOT NULL,
    `CollegeName` VARCHAR(150) NOT NULL,
    `OfficialEmail` VARCHAR(150) NOT NULL,
    `ContactPhone` VARCHAR(50) NULL,
    `Address` VARCHAR(500) NULL,
    `LogoUrl` VARCHAR(500) NULL,
    `Status` ENUM('Pending', 'Active', 'Inactive', 'Suspended') NOT NULL DEFAULT 'Active',
    `CurrentPlanId` INT NULL,
    `SubscriptionStatus` ENUM('Free', 'Active', 'Expiring Soon', 'Expired', 'Cancelled') NOT NULL DEFAULT 'Free',
    `SubscriptionStartDate` DATE NULL,
    `RenewalDate` DATE NULL,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `DeletedAt` DATETIME(6) NULL,
    `CreatedBy` INT NULL,
    `UpdatedBy` INT NULL,
    `RegisteredAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`CollegeId`),
    UNIQUE KEY `UQ_Colleges_CollegeCode` (`CollegeCode`),
    UNIQUE KEY `UQ_Colleges_OfficialEmail` (`OfficialEmail`),
    KEY `IX_Colleges_Status_IsDeleted` (`Status`, `IsDeleted`),
    KEY `IX_Colleges_CurrentPlanId` (`CurrentPlanId`),
    KEY `IX_Colleges_RenewalDate` (`RenewalDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS `SubscriptionPlans` (
    `PlanId` INT NOT NULL AUTO_INCREMENT,
    `PlanName` VARCHAR(100) NOT NULL,
    `Description` VARCHAR(500) NULL,
    `Price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `DurationDays` INT NOT NULL DEFAULT 30,
    `AccountLimit` INT NOT NULL DEFAULT 25,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` INT NULL,
    `UpdatedBy` INT NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`PlanId`),
    UNIQUE KEY `UQ_SubscriptionPlans_PlanName` (`PlanName`),
    KEY `IX_SubscriptionPlans_IsActive_IsDeleted` (`IsActive`, `IsDeleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. PLAN MODULES TABLE (Feature Gating Matrix)
CREATE TABLE IF NOT EXISTS `PlanModules` (
    `PlanModuleId` INT NOT NULL AUTO_INCREMENT,
    `PlanId` INT NOT NULL,
    `ModuleName` VARCHAR(100) NOT NULL,
    `IsEnabled` TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (`PlanModuleId`),
    UNIQUE KEY `UQ_PlanModules_Plan_Module` (`PlanId`, `ModuleName`),
    CONSTRAINT `FK_PlanModules_SubscriptionPlans` FOREIGN KEY (`PlanId`) REFERENCES `SubscriptionPlans` (`PlanId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. COLLEGE SUBSCRIPTIONS TABLE (Single Active Subscription Invariant)
CREATE TABLE IF NOT EXISTS `CollegeSubscriptions` (
    `SubscriptionId` INT NOT NULL AUTO_INCREMENT,
    `CollegeId` INT NOT NULL,
    `PlanId` INT NOT NULL,
    `StartDate` DATE NOT NULL,
    `RenewalDate` DATE NULL,
    `Status` ENUM('Free', 'Active', 'Expiring Soon', 'Expired', 'Cancelled') NOT NULL DEFAULT 'Active',
    `AutoRenew` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`SubscriptionId`),
    UNIQUE KEY `UQ_CollegeSubscriptions_CollegeId` (`CollegeId`),
    KEY `IX_CollegeSubscriptions_PlanId` (`PlanId`),
    KEY `IX_CollegeSubscriptions_Status` (`Status`),
    CONSTRAINT `FK_CollegeSubscriptions_Colleges` FOREIGN KEY (`CollegeId`) REFERENCES `Colleges` (`CollegeId`) ON DELETE CASCADE,
    CONSTRAINT `FK_CollegeSubscriptions_Plans` FOREIGN KEY (`PlanId`) REFERENCES `SubscriptionPlans` (`PlanId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. SUBSCRIPTION RENEWAL HISTORY
CREATE TABLE IF NOT EXISTS `SubscriptionRenewalHistory` (
    `RenewalHistoryId` INT NOT NULL AUTO_INCREMENT,
    `CollegeId` INT NOT NULL,
    `PlanId` INT NOT NULL,
    `PreviousRenewalDate` DATE NULL,
    `NewRenewalDate` DATE NOT NULL,
    `AmountPaid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `InvoiceNumber` VARCHAR(100) NULL,
    `RenewedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `PerformedBy` VARCHAR(150) NULL,
    PRIMARY KEY (`RenewalHistoryId`),
    KEY `IX_RenewalHistory_CollegeId` (`CollegeId`),
    CONSTRAINT `FK_RenewalHistory_Colleges` FOREIGN KEY (`CollegeId`) REFERENCES `Colleges` (`CollegeId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. PLATFORM INVOICES TABLE (Segregated B2B SaaS Billing Ledger)
CREATE TABLE IF NOT EXISTS `PlatformInvoices` (
    `InvoiceId` INT NOT NULL AUTO_INCREMENT,
    `InvoiceNumber` VARCHAR(100) NOT NULL,
    `CollegeId` INT NOT NULL,
    `PlanId` INT NOT NULL,
    `Amount` DECIMAL(12,2) NOT NULL,
    `InvoiceDate` DATE NOT NULL,
    `DueDate` DATE NOT NULL,
    `Status` ENUM('Paid', 'Pending', 'Void', 'Overdue') NOT NULL DEFAULT 'Pending',
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`InvoiceId`),
    UNIQUE KEY `UQ_PlatformInvoices_InvoiceNumber` (`InvoiceNumber`),
    KEY `IX_PlatformInvoices_CollegeId` (`CollegeId`),
    CONSTRAINT `FK_PlatformInvoices_Colleges` FOREIGN KEY (`CollegeId`) REFERENCES `Colleges` (`CollegeId`) ON DELETE CASCADE,
    CONSTRAINT `FK_PlatformInvoices_Plans` FOREIGN KEY (`PlanId`) REFERENCES `SubscriptionPlans` (`PlanId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. PLATFORM PAYMENTS TABLE (Audit Immutable: ON DELETE RESTRICT on Invoices)
CREATE TABLE IF NOT EXISTS `PlatformPayments` (
    `PaymentId` INT NOT NULL AUTO_INCREMENT,
    `PaymentIdentifier` VARCHAR(100) NOT NULL,
    `InvoiceId` INT NOT NULL,
    `CollegeId` INT NOT NULL,
    `Amount` DECIMAL(12,2) NOT NULL,
    `PaymentDate` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `PaymentMethod` VARCHAR(50) NOT NULL DEFAULT 'Manual/Bank Transfer',
    `Status` ENUM('Paid', 'Pending Verification', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending Verification',
    `TransactionReference` VARCHAR(150) NULL,
    `Notes` VARCHAR(500) NULL,
    PRIMARY KEY (`PaymentId`),
    UNIQUE KEY `UQ_PlatformPayments_PaymentIdentifier` (`PaymentIdentifier`),
    KEY `IX_PlatformPayments_CollegeId` (`CollegeId`),
    CONSTRAINT `FK_PlatformPayments_Invoices` FOREIGN KEY (`InvoiceId`) REFERENCES `PlatformInvoices` (`InvoiceId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_PlatformPayments_Colleges` FOREIGN KEY (`CollegeId`) REFERENCES `Colleges` (`CollegeId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. PLATFORM SETTINGS TABLE (Central SaaS Parameters)
CREATE TABLE IF NOT EXISTS `PlatformSettings` (
    `SettingId` INT NOT NULL AUTO_INCREMENT,
    `SettingKey` VARCHAR(100) NOT NULL,
    `SettingValue` LONGTEXT NOT NULL,
    `DataType` VARCHAR(30) NOT NULL DEFAULT 'String',
    `Description` VARCHAR(500) NULL,
    `UpdatedBy` VARCHAR(150) NULL,
    `UpdatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`SettingId`),
    UNIQUE KEY `UQ_PlatformSettings_Key` (`SettingKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
