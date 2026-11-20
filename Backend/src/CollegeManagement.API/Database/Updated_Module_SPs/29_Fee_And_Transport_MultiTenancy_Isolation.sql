-- =============================================================================
-- MIGRATION: 29_Fee_And_Transport_MultiTenancy_Isolation.sql
-- PURPOSE:
--   1. Add CollegeId, CampusId, BoardId, AcademicYearId to Fee & Transport tables
--   2. Enforce composite tenant indexes
--   3. Update Stored Procedures to return CollegeId, CampusId, BoardId, AcademicYearId
-- =============================================================================

USE `CollegeManagement`;

-- 1. FeeStructures
ALTER TABLE `FeeStructures` ADD COLUMN IF NOT EXISTS `CollegeId` INT NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS `IX_FeeStructures_Tenant_Context` ON `FeeStructures` (`CollegeId`, `CampusId`, `BoardId`, `AcademicYearId`);

-- 2. FeeTypes
ALTER TABLE `FeeTypes` ADD COLUMN IF NOT EXISTS `CollegeId` INT NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS `IX_FeeTypes_Tenant` ON `FeeTypes` (`CollegeId`, `CampusId`);

-- 3. Scholarships
ALTER TABLE `Scholarships` ADD COLUMN IF NOT EXISTS `CollegeId` INT NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS `IX_Scholarships_Tenant` ON `Scholarships` (`CollegeId`, `CampusId`, `BoardId`, `AcademicYearId`);

-- 4. TransportVehicles
ALTER TABLE `TransportVehicles` ADD COLUMN IF NOT EXISTS `CollegeId` INT NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS `IX_TransportVehicles_Tenant_Campus` ON `TransportVehicles` (`CollegeId`, `CampusId`);

-- 5. TransportRoutes
ALTER TABLE `TransportRoutes` ADD COLUMN IF NOT EXISTS `CollegeId` INT NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS `IX_TransportRoutes_Tenant_Campus` ON `TransportRoutes` (`CollegeId`, `CampusId`);

-- 6. TransportDrivers & TransportAttendants
ALTER TABLE `TransportDrivers` ADD COLUMN IF NOT EXISTS `CollegeId` INT NOT NULL DEFAULT 1;
ALTER TABLE `TransportDrivers` ADD COLUMN IF NOT EXISTS `CampusId` INT NULL;
ALTER TABLE `TransportAttendants` ADD COLUMN IF NOT EXISTS `CollegeId` INT NOT NULL DEFAULT 1;
ALTER TABLE `TransportAttendants` ADD COLUMN IF NOT EXISTS `CampusId` INT NULL;

-- 7. TransportVehicleAssignments
ALTER TABLE `TransportVehicleAssignments` ADD COLUMN IF NOT EXISTS `CollegeId` INT NOT NULL DEFAULT 1;
ALTER TABLE `TransportVehicleAssignments` ADD COLUMN IF NOT EXISTS `CampusId` INT NULL;
ALTER TABLE `TransportVehicleAssignments` ADD COLUMN IF NOT EXISTS `AcademicYearId` INT NULL;
ALTER TABLE `TransportVehicleAssignments` ADD COLUMN IF NOT EXISTS `BoardId` INT NULL;
CREATE INDEX IF NOT EXISTS `IX_TVA_Tenant_Context` ON `TransportVehicleAssignments` (`CollegeId`, `CampusId`, `AcademicYearId`);

-- 8. StudentTransportAssignments
ALTER TABLE `StudentTransportAssignments` ADD COLUMN IF NOT EXISTS `CollegeId` INT NOT NULL DEFAULT 1;
ALTER TABLE `StudentTransportAssignments` ADD COLUMN IF NOT EXISTS `CampusId` INT NULL;
ALTER TABLE `StudentTransportAssignments` ADD COLUMN IF NOT EXISTS `BoardId` INT NULL;

-- -----------------------------------------------------------------------------
-- STORED PROCEDURES
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_FeeStructure_GetAll;
DELIMITER //
CREATE PROCEDURE sp_FeeStructure_GetAll(
    IN p_CampusId INT
)
BEGIN
    SELECT
        fs.FeeStructureId,
        fs.CollegeId,
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

DROP PROCEDURE IF EXISTS sp_FeeType_GetAll;
DELIMITER //
CREATE PROCEDURE sp_FeeType_GetAll(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        ft.FeeTypeId,
        ft.CollegeId,
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

DROP PROCEDURE IF EXISTS sp_Scholarship_GetAll;
DELIMITER //
CREATE PROCEDURE sp_Scholarship_GetAll(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        ScholarshipId,
        CollegeId,
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

DROP PROCEDURE IF EXISTS sp_GetTransportVehicles;
DELIMITER //
CREATE PROCEDURE sp_GetTransportVehicles(
    IN p_Search VARCHAR(100),
    IN p_VehicleType VARCHAR(50),
    IN p_Status TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        v.VehicleId,
        v.CollegeId,
        v.VehicleNumber,
        COALESCE(v.VehicleRegistrationNo, v.VehicleNumber) AS RegistrationNumber,
        COALESCE(v.VehicleName, v.VehicleNumber) AS VehicleName,
        v.VehicleType,
        v.Make AS Manufacturer,
        v.Model,
        v.ChassisNumber,
        v.EngineNumber,
        v.GpsDeviceId,
        v.InsuranceNumber,
        v.InsuranceExpiry,
        v.PollutionExpiry,
        v.FitnessExpiry,
        v.Capacity,
        v.IsAC,
        CASE WHEN v.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        v.CreatedAt,
        v.CampusId,
        c.CampusName
    FROM TransportVehicles v
    LEFT JOIN Campuses c ON v.CampusId = c.CampusId
    WHERE v.IsDeleted = 0
      AND (
          p_CampusId IS NULL OR p_CampusId <= 0 
          OR v.CampusId IS NULL OR v.CampusId = p_CampusId
      )
      AND (
          p_Status IS NULL 
          OR (p_Status = 1 AND v.Status = 1)
          OR (p_Status = 0 AND v.Status = 0)
      )
      AND (
          p_VehicleType IS NULL OR p_VehicleType = '' 
          OR LOWER(v.VehicleType) = LOWER(p_VehicleType)
      )
      AND (
          p_Search IS NULL OR p_Search = ''
          OR LOWER(v.VehicleNumber) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.VehicleRegistrationNo, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.VehicleName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.VehicleType, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.GpsDeviceId, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
      )
    ORDER BY v.VehicleNumber ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetTransportVehicleAssignments;
DELIMITER //
CREATE PROCEDURE sp_GetTransportVehicleAssignments(
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_DriverId BIGINT,
    IN p_Status TINYINT(1),
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        a.AssignmentId,
        a.CollegeId,
        a.CampusId,
        COALESCE(c.CampusName, 'Main Campus') AS BranchName,
        a.AcademicYearId,
        COALESCE(ay.AcademicYearName, '2026-2027') AS AcademicYear,
        a.BoardId,
        a.RouteId,
        r.RouteName,
        r.RouteCode AS RouteNumber,
        a.VehicleId,
        v.VehicleNumber,
        COALESCE(v.VehicleName, v.VehicleNumber) AS VehicleName,
        v.Capacity AS VehicleCapacity,
        a.DriverId,
        COALESCE(CONCAT(TRIM(s_drv.FirstName), ' ', TRIM(s_drv.LastName)), d.DriverName, 'Unassigned') AS DriverName,
        COALESCE(s_drv.Mobile, d.MobileNo) AS DriverMobile,
        d.LicenseNo AS DriverLicenseNumber,
        a.AttendantId,
        COALESCE(CONCAT(TRIM(s_att.FirstName), ' ', TRIM(s_att.LastName)), att.AttendantName, 'Unassigned') AS AttendantName,
        att.MobileNumber AS AttendantContactNumber,
        a.EffectiveFrom,
        a.EffectiveTo,
        a.Shift,
        a.MorningTripTime,
        a.EveningTripTime,
        a.Remarks,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents,
        a.CreatedAt
    FROM TransportVehicleAssignments a
    LEFT JOIN Campuses c ON c.CampusId = a.CampusId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = a.AcademicYearId
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN Staff s_drv ON (d.StaffId = s_drv.Id OR a.DriverId = s_drv.Id) AND s_drv.IsDeleted = 0
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    LEFT JOIN Staff s_att ON (att.StaffId = s_att.Id OR a.AttendantId = s_att.Id) AND s_att.IsDeleted = 0
    WHERE a.IsDeleted = 0
      AND (p_RouteId IS NULL OR a.RouteId = p_RouteId)
      AND (p_VehicleId IS NULL OR a.VehicleId = p_VehicleId)
      AND (p_DriverId IS NULL OR a.DriverId = p_DriverId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(v.VehicleNumber) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(d.DriverName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(att.AttendantName, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(CONCAT(TRIM(s_drv.FirstName), ' ', TRIM(s_drv.LastName))) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(CONCAT(TRIM(s_att.FirstName), ' ', TRIM(s_att.LastName))) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY a.EffectiveFrom DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetTransportVehicleAssignmentById;
DELIMITER //
CREATE PROCEDURE sp_GetTransportVehicleAssignmentById(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        a.AssignmentId,
        a.CollegeId,
        a.CampusId,
        COALESCE(c.CampusName, 'Main Campus') AS BranchName,
        a.AcademicYearId,
        COALESCE(ay.AcademicYearName, '2026-2027') AS AcademicYear,
        a.BoardId,
        a.RouteId,
        r.RouteName,
        r.RouteCode AS RouteNumber,
        a.VehicleId,
        v.VehicleNumber,
        COALESCE(v.VehicleName, v.VehicleNumber) AS VehicleName,
        v.Capacity AS VehicleCapacity,
        a.DriverId,
        COALESCE(CONCAT(TRIM(s_drv.FirstName), ' ', TRIM(s_drv.LastName)), d.DriverName, 'Unassigned') AS DriverName,
        COALESCE(s_drv.Mobile, d.MobileNo) AS DriverMobile,
        d.LicenseNo AS DriverLicenseNumber,
        a.AttendantId,
        COALESCE(CONCAT(TRIM(s_att.FirstName), ' ', TRIM(s_att.LastName)), att.AttendantName, 'Unassigned') AS AttendantName,
        att.MobileNumber AS AttendantContactNumber,
        a.EffectiveFrom,
        a.EffectiveTo,
        a.Shift,
        a.MorningTripTime,
        a.EveningTripTime,
        a.Remarks,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents,
        a.CreatedAt
    FROM TransportVehicleAssignments a
    LEFT JOIN Campuses c ON c.CampusId = a.CampusId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = a.AcademicYearId
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN Staff s_drv ON (d.StaffId = s_drv.Id OR a.DriverId = s_drv.Id) AND s_drv.IsDeleted = 0
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    LEFT JOIN Staff s_att ON (att.StaffId = s_att.Id OR a.AttendantId = s_att.Id) AND s_att.IsDeleted = 0
    WHERE a.AssignmentId = p_Id AND a.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;
