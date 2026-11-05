-- =====================================================================================
-- Migration Script: 05_StaffTransfers_And_Lifecycle.sql
-- Modules: Global Teaching Staff, Campus Transfers, First-Time Onboarding, Dynamic HR Documents
-- Target Engine: MySQL 8.0 (InnoDB, utf8mb4)
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. Create StaffTransfers Table
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `StaffTransfers` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `TransferOrderNumber` VARCHAR(100) NOT NULL,
    `StaffId` INT NOT NULL,
    `FromCampusId` INT NOT NULL,
    `ToCampusId` INT NOT NULL,
    `FromDepartmentId` INT NULL,
    `ToDepartmentId` INT NULL,
    `FromDesignationId` INT NULL,
    `ToDesignationId` INT NULL,
    `TransferType` VARCHAR(50) NOT NULL DEFAULT 'Permanent', -- 'Permanent', 'Deputation', 'Temporary'
    `Reason` VARCHAR(255) NOT NULL,
    `RequestedByUserId` INT NOT NULL,
    `ApprovedByUserId` INT NULL,
    `RequestDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `EffectiveDate` DATE NOT NULL,
    `RelievingDate` DATE NULL,
    `JoiningDate` DATE NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'PendingApproval', -- 'PendingApproval', 'Approved', 'Rejected', 'Completed', 'Cancelled'
    `ApprovalRemarks` TEXT NULL,
    `GeneratedDocumentId` INT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UQ_StaffTransfers_OrderNo` (`TransferOrderNumber`),
    INDEX `IX_StaffTransfers_StaffId` (`StaffId`),
    INDEX `IX_StaffTransfers_FromCampus` (`FromCampusId`),
    INDEX `IX_StaffTransfers_ToCampus` (`ToCampusId`),
    INDEX `IX_StaffTransfers_Status` (`Status`),
    CONSTRAINT `FK_StaffTransfers_Staff` FOREIGN KEY (`StaffId`) REFERENCES `Staff` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_StaffTransfers_FromCampus` FOREIGN KEY (`FromCampusId`) REFERENCES `Campuses` (`CampusId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_StaffTransfers_ToCampus` FOREIGN KEY (`ToCampusId`) REFERENCES `Campuses` (`CampusId`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------------------
-- 2. Enhance StaffCampusAssignments Table
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `UpgradeStaffCampusAssignments`;
DELIMITER //
CREATE PROCEDURE `UpgradeStaffCampusAssignments`()
BEGIN
    -- Drop conflicting unique index if it exists
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'StaffCampusAssignments' 
          AND INDEX_NAME = 'IX_StaffCampusAssignments_StaffId_CampusId'
    ) THEN
        ALTER TABLE `StaffCampusAssignments` DROP INDEX `IX_StaffCampusAssignments_StaffId_CampusId`;
    END IF;

    -- Add AssignmentType
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'StaffCampusAssignments' AND COLUMN_NAME = 'AssignmentType') THEN
        ALTER TABLE `StaffCampusAssignments` ADD COLUMN `AssignmentType` VARCHAR(50) NOT NULL DEFAULT 'Primary' AFTER `CampusId`;
    END IF;

    -- Add DepartmentId
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'StaffCampusAssignments' AND COLUMN_NAME = 'DepartmentId') THEN
        ALTER TABLE `StaffCampusAssignments` ADD COLUMN `DepartmentId` INT NULL AFTER `AssignmentType`;
    END IF;

    -- Add DesignationId
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'StaffCampusAssignments' AND COLUMN_NAME = 'DesignationId') THEN
        ALTER TABLE `StaffCampusAssignments` ADD COLUMN `DesignationId` INT NULL AFTER `DepartmentId`;
    END IF;

    -- Add StartDate
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'StaffCampusAssignments' AND COLUMN_NAME = 'StartDate') THEN
        ALTER TABLE `StaffCampusAssignments` ADD COLUMN `StartDate` DATE NOT NULL DEFAULT (CURRENT_DATE) AFTER `AssignedDate`;
    END IF;

    -- Add EndDate
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'StaffCampusAssignments' AND COLUMN_NAME = 'EndDate') THEN
        ALTER TABLE `StaffCampusAssignments` ADD COLUMN `EndDate` DATE NULL AFTER `StartDate`;
    END IF;

    -- Add Status
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'StaffCampusAssignments' AND COLUMN_NAME = 'Status') THEN
        ALTER TABLE `StaffCampusAssignments` ADD COLUMN `Status` VARCHAR(50) NOT NULL DEFAULT 'Active' AFTER `IsActive`;
    END IF;

    -- Add TransferId
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'StaffCampusAssignments' AND COLUMN_NAME = 'TransferId') THEN
        ALTER TABLE `StaffCampusAssignments` ADD COLUMN `TransferId` INT NULL AFTER `Status`;
    END IF;

    -- Add Composite non-unique index for fast effective-date range queries
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'StaffCampusAssignments' 
          AND INDEX_NAME = 'IX_StaffCampus_Staff_Campus_Dates'
    ) THEN
        ALTER TABLE `StaffCampusAssignments` ADD INDEX `IX_StaffCampus_Staff_Campus_Dates` (`StaffId`, `CampusId`, `StartDate`, `IsActive`);
    END IF;
END //
DELIMITER ;
CALL `UpgradeStaffCampusAssignments`();
DROP PROCEDURE IF EXISTS `UpgradeStaffCampusAssignments`;

-- -------------------------------------------------------------------------------------
-- 3. Data Backfill: Ensure every active staff has at least one active primary assignment
-- -------------------------------------------------------------------------------------
INSERT INTO `StaffCampusAssignments` (`StaffId`, `CampusId`, `AssignmentType`, `DepartmentId`, `DesignationId`, `IsPrimary`, `StartDate`, `IsActive`, `Status`)
SELECT 
    s.Id, 
    s.CampusId, 
    'Primary', 
    s.DepartmentId, 
    s.DesignationId, 
    1, 
    COALESCE(s.JoiningDate, CURDATE()), 
    1, 
    'Active'
FROM `Staff` s
LEFT JOIN `StaffCampusAssignments` sca 
    ON sca.StaffId = s.Id AND sca.CampusId = s.CampusId AND sca.IsActive = 1
WHERE sca.Id IS NULL 
  AND s.CampusId IS NOT NULL 
  AND s.CampusId > 0 
  AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL);

-- -------------------------------------------------------------------------------------
-- 4. Seed Number Series Configurations for HR Documents
-- -------------------------------------------------------------------------------------
INSERT INTO `NumberSeriesConfigurations` 
    (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `IsActive`)
VALUES 
    (
        'OFFER_LETTER_NO', 
        'Staff Offer Letter Number', 
        'PC-OL', 
        'PC-OL/{YEAR}/{SEQ}', 
        4, 
        1, 
        0, 
        'Official serial numbering sequence for institutional faculty & staff offer letters.', 
        1
    ),
    (
        'TRANSFER_ORDER_NO', 
        'Staff Transfer Order Number', 
        'TRF', 
        'TRF/{YEAR}/{SEQ}', 
        4, 
        1, 
        0, 
        'Official serial numbering sequence for inter-campus faculty and staff transfer orders.', 
        1
    )
ON DUPLICATE KEY UPDATE 
    `SeriesName` = VALUES(`SeriesName`),
    `FormatPattern` = VALUES(`FormatPattern`),
    `Description` = VALUES(`Description`),
    `IsActive` = VALUES(`IsActive`);

-- -------------------------------------------------------------------------------------
-- 5. Seed Templates for OfferLetter and TransferOrder
-- -------------------------------------------------------------------------------------
INSERT INTO `templates` 
    (`TemplateCode`, `Title`, `Category`, `ContentBody`, `PlaceholdersJson`, `IsActive`, `Version`, `CreatedAt`, `UpdatedAt`)
VALUES 
    (
        'OFFER_LETTER_STANDARD',
        'Official Staff Appointment & Offer Letter',
        'OfferLetter',
        '<div class="doc-body" style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 24px;">
            <div style="text-align: center; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px;">
                <h1 style="color: #065f46; margin: 0; font-size: 24px;">PIRNAV EDUCATIONAL SOCIETY</h1>
                <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">OFFICIAL LETTER OF APPOINTMENT</p>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px;">
                <div><strong>Ref No:</strong> {{OfferLetterNumber}}</div>
                <div><strong>Date:</strong> {{DateOfJoining}}</div>
            </div>
            <p>Dear <strong>{{StaffName}}</strong>,</p>
            <p>We are pleased to offer you the position of <strong>{{Designation}}</strong> in the Department of <strong>{{Department}}</strong> at our <strong>{{PrimaryCampus}}</strong> campus with permanent Employee ID <strong>{{EmployeeId}}</strong>.</p>
            <p>Your appointment takes effect from your official reporting date of <strong>{{DateOfJoining}}</strong>. You will be reporting directly to the <strong>{{ReportingAuthority}}</strong>.</p>
            <h3 style="color: #065f46; font-size: 16px; margin-top: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Compensation & Benefits</h3>
            <p>Your gross monthly salary will be <strong>{{GrossSalary}}</strong> subject to statutory deductions as applicable under institutional and statutory regulations.</p>
            <h3 style="color: #065f46; font-size: 16px; margin-top: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">Terms & Conditions</h3>
            <p>{{TermsAndConditions}}</p>
            <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                <div>
                    <p style="margin: 0;">_______________________</p>
                    <p style="margin: 2px 0 0; font-weight: bold;">Authorized Signatory</p>
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Pirnav Educational Institutions</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0;">_______________________</p>
                    <p style="margin: 2px 0 0; font-weight: bold;">Employee Acceptance</p>
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Signature & Date</p>
                </div>
            </div>
        </div>',
        '["{{StaffName}}", "{{EmployeeId}}", "{{Designation}}", "{{Department}}", "{{PrimaryCampus}}", "{{DateOfJoining}}", "{{OfferLetterNumber}}", "{{GrossSalary}}", "{{ReportingAuthority}}", "{{TermsAndConditions}}"]',
        1,
        1,
        NOW(),
        NOW()
    ),
    (
        'STAFF_TRANSFER_ORDER_STANDARD',
        'Official Staff Campus Transfer Order',
        'TransferOrder',
        '<div class="doc-body" style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 24px;">
            <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
                <h1 style="color: #1e40af; margin: 0; font-size: 24px;">PIRNAV EDUCATIONAL SOCIETY</h1>
                <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">OFFICE OF CENTRAL HUMAN RESOURCES & ADMINISTRATION</p>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px;">
                <div><strong>Order No:</strong> {{TransferOrderNumber}}</div>
                <div><strong>Date:</strong> {{EffectiveDate}}</div>
            </div>
            <div style="text-align: center; margin: 16px 0;">
                <h2 style="font-size: 18px; color: #1e40af; text-transform: uppercase; margin: 0; text-decoration: underline;">STAFF RELOCATION & TRANSFER ORDER</h2>
            </div>
            <p>In accordance with organizational requirements and institutional realignment, the management hereby orders the relocation of the following employee:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
                <tr><td style="padding: 6px; border: 1px solid #cbd5e1; width: 35%;"><strong>Employee Name:</strong></td><td style="padding: 6px; border: 1px solid #cbd5e1;">{{StaffName}}</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>Permanent Employee ID:</strong></td><td style="padding: 6px; border: 1px solid #cbd5e1;">{{EmployeeId}}</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>Designation:</strong></td><td style="padding: 6px; border: 1px solid #cbd5e1;">{{Designation}}</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>Relieving Campus (From):</strong></td><td style="padding: 6px; border: 1px solid #cbd5e1;">{{FromCampus}}</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>Reporting Campus (To):</strong></td><td style="padding: 6px; border: 1px solid #cbd5e1;">{{ToCampus}}</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>Effective Cut-off Date:</strong></td><td style="padding: 6px; border: 1px solid #cbd5e1;">{{EffectiveDate}}</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>Transfer Type:</strong></td><td style="padding: 6px; border: 1px solid #cbd5e1;">{{TransferType}}</td></tr>
                <tr><td style="padding: 6px; border: 1px solid #cbd5e1;"><strong>Reason / Remarks:</strong></td><td style="padding: 6px; border: 1px solid #cbd5e1;">{{TransferReason}}</td></tr>
            </table>
            <p>The employee is instructed to complete the academic and administrative duty handover at <strong>{{FromCampus}}</strong> on or before <strong>{{RelievingDate}}</strong> and report to the Principal at <strong>{{ToCampus}}</strong> on <strong>{{JoiningDate}}</strong>.</p>
            <p>Accumulated service experience, provident fund entitlements, and permanent employee credentials remain unchanged and fully preserved.</p>
            <div style="margin-top: 40px; display: flex; justify-content: space-between;">
                <div>
                    <p style="margin: 0;">_______________________</p>
                    <p style="margin: 2px 0 0; font-weight: bold;">Director of Human Resources</p>
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Central Administration</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0;">_______________________</p>
                    <p style="margin: 2px 0 0; font-weight: bold;">Registrar / Secretary</p>
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Pirnav Educational Society</p>
                </div>
            </div>
        </div>',
        '["{{TransferOrderNumber}}", "{{StaffName}}", "{{EmployeeId}}", "{{Designation}}", "{{FromCampus}}", "{{ToCampus}}", "{{EffectiveDate}}", "{{RelievingDate}}", "{{JoiningDate}}", "{{TransferType}}", "{{TransferReason}}"]',
        1,
        1,
        NOW(),
        NOW()
    )
ON DUPLICATE KEY UPDATE 
    `Title` = VALUES(`Title`),
    `ContentBody` = VALUES(`ContentBody`),
    `PlaceholdersJson` = VALUES(`PlaceholdersJson`),
    `IsActive` = VALUES(`IsActive`);

-- -------------------------------------------------------------------------------------
-- 6. Deploy Updated sp_Staff_GetAssignedCampuses with Strict IsActive = 1 check
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Staff_GetAssignedCampuses`;
DELIMITER //
CREATE PROCEDURE `sp_Staff_GetAssignedCampuses`(
    IN p_UserId INT,
    IN p_StaffId INT
)
BEGIN
    DECLARE v_StaffId INT;
    DECLARE v_PrimaryCampusId INT;

    SET v_StaffId = p_StaffId;

    IF (v_StaffId IS NULL OR v_StaffId <= 0) AND (p_UserId IS NOT NULL AND p_UserId > 0) THEN
        SELECT s.Id, s.CampusId 
        INTO v_StaffId, v_PrimaryCampusId
        FROM `Users` u
        LEFT JOIN `Staff` s ON s.Id = u.StaffId OR (s.Email = u.Email AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL))
        WHERE u.UserId = p_UserId
        LIMIT 1;
    ELSEIF v_StaffId IS NOT NULL AND v_StaffId > 0 THEN
        SELECT CampusId INTO v_PrimaryCampusId FROM `Staff` WHERE Id = v_StaffId LIMIT 1;
    END IF;

    -- Result Set 1: Identification & Primary Campus
    SELECT 
        COALESCE(v_StaffId, 0) AS StaffId, 
        COALESCE(v_PrimaryCampusId, 1) AS PrimaryCampusId;

    -- Result Set 2: Authorized Campus IDs (Strictly active assignments)
    SELECT DISTINCT CampusId 
    FROM (
        SELECT v_PrimaryCampusId AS CampusId WHERE v_PrimaryCampusId IS NOT NULL AND v_PrimaryCampusId > 0
        UNION
        SELECT CampusId 
        FROM `StaffCampusAssignments` 
        WHERE StaffId = v_StaffId 
          AND CampusId > 0 
          AND IsActive = 1
          AND (EndDate IS NULL OR EndDate >= CURDATE())
    ) AS CombinedCampuses
    WHERE CampusId IS NOT NULL AND CampusId > 0;
END //
DELIMITER ;
