-- =====================================================================================
-- SCRIPT 02: RECONCILE EXISTING CONTEXTUAL GROUPS TO MASTER GROUPS
-- =====================================================================================
-- IMPORTANT:
-- This script does NOT delete any existing Groups or GroupPrograms.
-- It establishes a safe link between existing groups and their canonical MasterGroup.
-- Ambiguous/variant rows (e.g. MPC_2, MPC2 created as manual workarounds) are identified
-- for manual administrative confirmation.
-- =====================================================================================

-- Step 1: Insert Canonical MasterGroups from Distinct (BoardId, Cleaned GroupName)
-- Board 1 (AP Board): MPC, BIPC, MBIPC, CEC
INSERT IGNORE INTO `MasterGroups` (`BoardId`, `GroupName`, `GroupCode`, `Description`, `IsActive`, `CreatedAt`)
SELECT 1, 'MPC', 'MPC', 'Mathematics, Physics, Chemistry (Permanent Master)', 1, UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM `MasterGroups` WHERE `BoardId` = 1 AND `GroupCode` = 'MPC');

INSERT IGNORE INTO `MasterGroups` (`BoardId`, `GroupName`, `GroupCode`, `Description`, `IsActive`, `CreatedAt`)
SELECT 1, 'BIPC', 'BIPC', 'Biology, Physics, Chemistry (Permanent Master)', 1, UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM `MasterGroups` WHERE `BoardId` = 1 AND `GroupCode` = 'BIPC');

INSERT IGNORE INTO `MasterGroups` (`BoardId`, `GroupName`, `GroupCode`, `Description`, `IsActive`, `CreatedAt`)
SELECT 1, 'MBIPC', 'MBIPC', 'Maths, Biology, Physics, Chemistry (Permanent Master)', 1, UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM `MasterGroups` WHERE `BoardId` = 1 AND `GroupCode` = 'MBIPC');

INSERT IGNORE INTO `MasterGroups` (`BoardId`, `GroupName`, `GroupCode`, `Description`, `IsActive`, `CreatedAt`)
SELECT 1, 'CEC', 'CEC', 'Civics, Economics, Commerce (Permanent Master)', 1, UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM `MasterGroups` WHERE `BoardId` = 1 AND `GroupCode` = 'CEC');

-- Board 2 (TS Board): MPC-T, BIPC, CEC, HEC
INSERT IGNORE INTO `MasterGroups` (`BoardId`, `GroupName`, `GroupCode`, `Description`, `IsActive`, `CreatedAt`)
SELECT 2, 'MPC-T', 'MPC-T', 'MPC Telangana (Permanent Master)', 1, UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM `MasterGroups` WHERE `BoardId` = 2 AND `GroupCode` = 'MPC-T');

INSERT IGNORE INTO `MasterGroups` (`BoardId`, `GroupName`, `GroupCode`, `Description`, `IsActive`, `CreatedAt`)
SELECT 2, 'BIPC', 'BIPC', 'BIPC Telangana (Permanent Master)', 1, UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM `MasterGroups` WHERE `BoardId` = 2 AND `GroupCode` = 'BIPC');

INSERT IGNORE INTO `MasterGroups` (`BoardId`, `GroupName`, `GroupCode`, `Description`, `IsActive`, `CreatedAt`)
SELECT 2, 'CEC', 'CEC', 'CEC Telangana (Permanent Master)', 1, UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM `MasterGroups` WHERE `BoardId` = 2 AND `GroupCode` = 'CEC');

INSERT IGNORE INTO `MasterGroups` (`BoardId`, `GroupName`, `GroupCode`, `Description`, `IsActive`, `CreatedAt`)
SELECT 2, 'HEC', 'HEC', 'HEC Telangana (Permanent Master)', 1, UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM `MasterGroups` WHERE `BoardId` = 2 AND `GroupCode` = 'HEC');

-- Board 16 (TN Board): BIPC
INSERT IGNORE INTO `MasterGroups` (`BoardId`, `GroupName`, `GroupCode`, `Description`, `IsActive`, `CreatedAt`)
SELECT 16, 'BIPC', 'BIPC', 'BIPC Tamil Nadu (Permanent Master)', 1, UTC_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM `MasterGroups` WHERE `BoardId` = 16 AND `GroupCode` = 'BIPC');

-- Step 2: Link Primary Existing Groups to their MasterGroup
UPDATE `Groups` g
INNER JOIN `MasterGroups` mg 
    ON mg.BoardId = g.BoardId 
   AND UPPER(TRIM(mg.GroupName)) = UPPER(TRIM(g.GroupName))
SET g.MasterGroupId = mg.MasterGroupId
WHERE g.MasterGroupId IS NULL;

-- Step 3: Populate MasterGroupPrograms Defaults from existing GroupPrograms
INSERT IGNORE INTO `MasterGroupPrograms` (`MasterGroupId`, `ProgramId`, `IsActive`, `CreatedAt`)
SELECT DISTINCT g.MasterGroupId, gp.ProgramId, 1, UTC_TIMESTAMP()
FROM `GroupPrograms` gp
INNER JOIN `Groups` g ON gp.GroupId = g.GroupId
WHERE g.MasterGroupId IS NOT NULL 
  AND gp.IsActive = 1;

-- Step 4: Verification and Reconciliation Query
-- Lists all groups and their linked master group, highlighting any unlinked or variant records
SELECT 
    g.GroupId,
    g.BoardId,
    b.BoardName,
    g.AcademicYearId,
    ay.AcademicYearName,
    g.AcademicLevelId,
    al.LevelName,
    g.GroupName,
    g.GroupCode,
    g.MasterGroupId,
    mg.GroupName AS MasterGroupName,
    mg.GroupCode AS MasterGroupCode,
    CASE 
        WHEN g.MasterGroupId IS NOT NULL THEN 'Reconciled'
        ELSE 'Ambiguous / Requires Admin Action'
    END AS ReconciliationStatus
FROM `Groups` g
LEFT JOIN `MasterGroups` mg ON g.MasterGroupId = mg.MasterGroupId
LEFT JOIN `Boards` b ON g.BoardId = b.BoardId
LEFT JOIN `AcademicYears` ay ON g.AcademicYearId = ay.AcademicYearId
LEFT JOIN `AcademicLevels` al ON g.AcademicLevelId = al.AcademicLevelId
ORDER BY g.BoardId, g.GroupName, g.GroupId;
