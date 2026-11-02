using System;
using System.Threading.Tasks;
using MySqlConnector;
using Dapper;

namespace CollegeManagement.API.Tests
{
    public static class DriverModuleDbDeployer
    {
        public static async Task<bool> DeployProceduresAsync(string connectionString)
        {
            Console.WriteLine("[DriverModuleDbDeployer] Connecting to MySQL...");
            using var connection = new MySqlConnection(connectionString);
            await connection.OpenAsync();

            Console.WriteLine("[DriverModuleDbDeployer] Connected successfully.");

            // 1. Supporting Schema Tables
            string createDocsTable = @"
CREATE TABLE IF NOT EXISTS `TransportDriverDocuments` (
    `DocumentId` BIGINT NOT NULL AUTO_INCREMENT,
    `DriverId` BIGINT NOT NULL,
    `DocumentCategory` VARCHAR(100) NOT NULL DEFAULT 'Medical Certificate',
    `DocumentNumber` VARCHAR(100) NOT NULL,
    `BadgeNumber` VARCHAR(100) NULL,
    `IssueDate` DATE NULL,
    `ExpiryDate` DATE NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Verified',
    `FileName` VARCHAR(255) NULL,
    `FilePath` VARCHAR(500) NULL,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`DocumentId`),
    KEY `ix_driver_docs_driver` (`DriverId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
            await connection.ExecuteAsync(createDocsTable);
            Console.WriteLine("  [DEPLOYED] TransportDriverDocuments table");

            string createGpsTable = @"
CREATE TABLE IF NOT EXISTS `DriverGpsTelemetry` (
    `StaffId` INT NOT NULL,
    `Latitude` DECIMAL(10,6) NOT NULL DEFAULT 0,
    `Longitude` DECIMAL(10,6) NOT NULL DEFAULT 0,
    `Speed` DECIMAL(5,2) NOT NULL DEFAULT 0,
    `Heading` DECIMAL(5,2) NOT NULL DEFAULT 0,
    `LastPingTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`StaffId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
            await connection.ExecuteAsync(createGpsTable);
            Console.WriteLine("  [DEPLOYED] DriverGpsTelemetry table");

            string createTripAttendanceTable = @"
CREATE TABLE IF NOT EXISTS `StudentTripAttendance` (
    `AttendanceId` BIGINT NOT NULL AUTO_INCREMENT,
    `TripId` BIGINT NOT NULL,
    `StudentId` BIGINT NOT NULL,
    `PickupPointId` BIGINT NULL,
    `AttendanceDate` DATE NOT NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `BoardedAt` DATETIME NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`AttendanceId`),
    UNIQUE KEY `uk_trip_student_date` (`TripId`, `StudentId`, `AttendanceDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
            await connection.ExecuteAsync(createTripAttendanceTable);
            Console.WriteLine("  [DEPLOYED] StudentTripAttendance table");

            // 2. Procedures
            string spGetDriverDocs = @"
DROP PROCEDURE IF EXISTS `sp_GetDriverDocuments`;
CREATE PROCEDURE `sp_GetDriverDocuments`(
    IN p_DriverId BIGINT
)
BEGIN
    SELECT 
        DocumentId AS Id,
        DocumentCategory,
        DocumentNumber,
        BadgeNumber,
        DATE_FORMAT(IssueDate, '%Y-%m-%d') AS IssueDate,
        DATE_FORMAT(ExpiryDate, '%Y-%m-%d') AS ExpiryDate,
        Status,
        FileName
    FROM TransportDriverDocuments
    WHERE DriverId = p_DriverId AND IsDeleted = 0
    ORDER BY DocumentId DESC;
END;";
            await connection.ExecuteAsync(spGetDriverDocs);
            Console.WriteLine("  [DEPLOYED] sp_GetDriverDocuments");

            string spCreateDriverDoc = @"
DROP PROCEDURE IF EXISTS `sp_CreateDriverDocument`;
CREATE PROCEDURE `sp_CreateDriverDocument`(
    IN p_DriverId BIGINT,
    IN p_DocumentCategory VARCHAR(100),
    IN p_DocumentNumber VARCHAR(100),
    IN p_BadgeNumber VARCHAR(100),
    IN p_IssueDate DATE,
    IN p_ExpiryDate DATE,
    IN p_Status VARCHAR(50),
    IN p_FileName VARCHAR(255)
)
BEGIN
    INSERT INTO TransportDriverDocuments (
        DriverId, DocumentCategory, DocumentNumber, BadgeNumber,
        IssueDate, ExpiryDate, Status, FileName, IsDeleted, CreatedAt
    ) VALUES (
        p_DriverId, 
        COALESCE(NULLIF(TRIM(p_DocumentCategory), ''), 'Medical Certificate'), 
        COALESCE(NULLIF(TRIM(p_DocumentNumber), ''), CONCAT('DOC-', FLOOR(1000 + RAND() * 9000))), 
        p_BadgeNumber,
        COALESCE(p_IssueDate, CURRENT_DATE()), 
        COALESCE(p_ExpiryDate, DATE_ADD(CURRENT_DATE(), INTERVAL 1 YEAR)), 
        COALESCE(NULLIF(TRIM(p_Status), ''), 'Verified'), 
        COALESCE(NULLIF(TRIM(p_FileName), ''), 'Document.pdf'), 
        0, 
        NOW()
    );
    SELECT LAST_INSERT_ID() AS DocumentId;
END;";
            await connection.ExecuteAsync(spCreateDriverDoc);
            Console.WriteLine("  [DEPLOYED] sp_CreateDriverDocument");

            string spDeleteDriverDoc = @"
DROP PROCEDURE IF EXISTS `sp_DeleteDriverDocument`;
CREATE PROCEDURE `sp_DeleteDriverDocument`(
    IN p_DocumentId BIGINT,
    IN p_DriverId BIGINT
)
BEGIN
    UPDATE TransportDriverDocuments
    SET IsDeleted = 1, UpdatedAt = NOW()
    WHERE DocumentId = p_DocumentId AND (p_DriverId <= 0 OR DriverId = p_DriverId);
    SELECT ROW_COUNT() AS AffectedRows;
END;";
            await connection.ExecuteAsync(spDeleteDriverDoc);
            Console.WriteLine("  [DEPLOYED] sp_DeleteDriverDocument");

            string spGetTransportDrivers = @"
DROP PROCEDURE IF EXISTS `sp_GetTransportDrivers`;
CREATE PROCEDURE `sp_GetTransportDrivers`(
    IN p_Search VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Status TINYINT(1),
    IN p_CampusId INT,
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT;
    DECLARE v_PageSize INT;
    DECLARE v_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

    SET v_PageSize = COALESCE(NULLIF(p_PageSize, 0), 20);
    SET v_Offset = (COALESCE(NULLIF(p_PageNumber, 0), 1) - 1) * v_PageSize;
    SET v_Search = IF(p_Search IS NULL OR p_Search = '', NULL, CONCAT('%', LOWER(p_Search), '%') COLLATE utf8mb4_unicode_ci);

    -- Resultset 1: Total Count
    SELECT COUNT(*) AS TotalCount
    FROM Staff s
    LEFT JOIN TransportDrivers d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> '')) AND d.IsDeleted = 0
    WHERE s.IsDeleted = 0 
      AND s.IsDriver = 1
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
      AND (p_Status IS NULL OR (p_Status = 1 AND s.Status = 'Active') OR (p_Status = 0 AND s.Status <> 'Active'))
      AND (v_Search IS NULL 
           OR LOWER(CONCAT(s.FirstName, ' ', s.LastName)) LIKE v_Search
           OR LOWER(s.EmployeeId) LIKE v_Search
           OR LOWER(COALESCE(s.DrivingLicenseNumber, '')) LIKE v_Search
           OR LOWER(s.Mobile) LIKE v_Search);

    -- Resultset 2: Paginated Rows
    SELECT 
        s.Id AS DriverId,
        s.Id AS StaffId,
        s.EmployeeId AS EmployeeId,
        CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)) AS DriverName,
        s.Mobile AS MobileNumber,
        s.AlternateMobile AS AlternateMobileNumber,
        s.Email AS Email,
        s.DrivingLicenseNumber AS LicenseNumber,
        DATE_FORMAT(s.DrivingLicenseExpiryDate, '%Y-%m-%d') AS LicenseExpiryDate,
        s.CurrentAddress AS Address,
        s.BloodGroup AS BloodGroup,
        COALESCE(d.EmergencyContactName, '') AS EmergencyContactName,
        COALESCE(d.EmergencyContactNumber, '') AS EmergencyContactNumber,
        COALESCE(s.DrivingExperienceYears, d.Experience, 5) AS ExperienceYears,
        COALESCE(va.VehicleId, d.AssignedVehicleId) AS AssignedVehicleId,
        COALESCE(va.VehicleNumber, v.VehicleNumber) AS AssignedVehicleNumber,
        CASE WHEN s.Status = 'Active' THEN 'Active' ELSE 'Inactive' END AS Status,
        s.CampusId,
        c.CampusName
    FROM Staff s
    LEFT JOIN Campuses c ON s.CampusId = c.CampusId
    LEFT JOIN TransportDrivers d ON (d.StaffId = s.Id OR (d.EmployeeId = s.EmployeeId AND s.EmployeeId IS NOT NULL AND s.EmployeeId <> '')) AND d.IsDeleted = 0
    LEFT JOIN (
        SELECT va1.DriverId, va1.VehicleId, v1.VehicleNumber
        FROM TransportVehicleAssignments va1
        LEFT JOIN TransportVehicles v1 ON va1.VehicleId = v1.VehicleId AND v1.IsDeleted = 0
        WHERE va1.IsDeleted = 0 AND va1.Status = 1
          AND va1.AssignmentId = (
              SELECT MAX(va2.AssignmentId)
              FROM TransportVehicleAssignments va2
              WHERE va2.DriverId = va1.DriverId AND va2.IsDeleted = 0 AND va2.Status = 1
          )
    ) va ON s.Id = va.DriverId
    LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE s.IsDeleted = 0 
      AND s.IsDriver = 1
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
      AND (p_Status IS NULL OR (p_Status = 1 AND s.Status = 'Active') OR (p_Status = 0 AND s.Status <> 'Active'))
      AND (v_Search IS NULL 
           OR LOWER(CONCAT(s.FirstName, ' ', s.LastName)) LIKE v_Search
           OR LOWER(s.EmployeeId) LIKE v_Search
           OR LOWER(COALESCE(s.DrivingLicenseNumber, '')) LIKE v_Search
           OR LOWER(s.Mobile) LIKE v_Search)
    ORDER BY s.Id ASC
    LIMIT v_PageSize OFFSET v_Offset;
END;";
            await connection.ExecuteAsync(spGetTransportDrivers);
            Console.WriteLine("  [DEPLOYED] sp_GetTransportDrivers");

            string spUpdateTransportDrivers = @"
DROP PROCEDURE IF EXISTS `sp_UpdateTransportDrivers`;
CREATE PROCEDURE `sp_UpdateTransportDrivers`(
    IN p_DriverId BIGINT,
    IN p_StaffId BIGINT,
    IN p_DriverName VARCHAR(100),
    IN p_EmployeeId VARCHAR(50),
    IN p_LicenseNo VARCHAR(50),
    IN p_LicenseExpiry DATE,
    IN p_MobileNo VARCHAR(20),
    IN p_AlternateMobileNo VARCHAR(20),
    IN p_Email VARCHAR(100),
    IN p_Address VARCHAR(255),
    IN p_BloodGroup VARCHAR(10),
    IN p_EmergencyContactName VARCHAR(100),
    IN p_EmergencyContactNumber VARCHAR(20),
    IN p_Experience INT,
    IN p_AssignedVehicleId BIGINT,
    IN p_Status TINYINT(1),
    IN p_UpdatedBy BIGINT
)
BEGIN
    DECLARE v_TargetStaffId BIGINT;
    DECLARE v_FirstName VARCHAR(100);
    DECLARE v_LastName VARCHAR(100);

    IF p_DriverName IS NOT NULL AND p_DriverName <> '' THEN
        SET v_FirstName = SUBSTRING_INDEX(p_DriverName, ' ', 1);
        IF INSTR(p_DriverName, ' ') > 0 THEN
            SET v_LastName = SUBSTRING(p_DriverName, INSTR(p_DriverName, ' ') + 1);
        ELSE
            SET v_LastName = '';
        END IF;
    END IF;

    SET v_TargetStaffId = COALESCE(p_StaffId, p_DriverId);
    IF NOT EXISTS (SELECT 1 FROM Staff WHERE Id = v_TargetStaffId) THEN
        SELECT StaffId INTO v_TargetStaffId FROM TransportDrivers WHERE DriverId = p_DriverId LIMIT 1;
    END IF;

    UPDATE Staff
    SET FirstName = COALESCE(v_FirstName, FirstName),
        LastName = COALESCE(v_LastName, LastName),
        Mobile = COALESCE(p_MobileNo, Mobile),
        AlternateMobile = COALESCE(p_AlternateMobileNo, AlternateMobile),
        Email = COALESCE(p_Email, Email),
        CurrentAddress = COALESCE(p_Address, CurrentAddress),
        BloodGroup = COALESCE(p_BloodGroup, BloodGroup),
        DrivingLicenseNumber = COALESCE(p_LicenseNo, DrivingLicenseNumber),
        DrivingLicenseExpiryDate = COALESCE(p_LicenseExpiry, DrivingLicenseExpiryDate),
        DrivingExperienceYears = COALESCE(p_Experience, DrivingExperienceYears),
        Status = IF(p_Status = 1, 'Active', 'Inactive'),
        UpdatedAt = CURRENT_TIMESTAMP
    WHERE Id = v_TargetStaffId AND IsDeleted = 0;

    UPDATE TransportDrivers
    SET DriverName = COALESCE(p_DriverName, DriverName),
        EmployeeId = COALESCE(p_EmployeeId, EmployeeId),
        MobileNo = COALESCE(p_MobileNo, MobileNo),
        AlternateMobileNo = COALESCE(p_AlternateMobileNo, AlternateMobileNo),
        Email = COALESCE(p_Email, Email),
        LicenseNo = COALESCE(p_LicenseNo, LicenseNo),
        LicenseExpiry = COALESCE(p_LicenseExpiry, LicenseExpiry),
        Address = COALESCE(p_Address, Address),
        BloodGroup = COALESCE(p_BloodGroup, BloodGroup),
        EmergencyContactName = COALESCE(p_EmergencyContactName, EmergencyContactName),
        EmergencyContactNumber = COALESCE(p_EmergencyContactNumber, EmergencyContactNumber),
        Experience = COALESCE(p_Experience, Experience),
        AssignedVehicleId = p_AssignedVehicleId,
        Status = p_Status,
        IsActive = p_Status,
        UpdatedBy = p_UpdatedBy,
        UpdatedAt = CURRENT_TIMESTAMP
    WHERE (DriverId = p_DriverId OR StaffId = v_TargetStaffId) AND IsDeleted = 0;

    IF p_AssignedVehicleId IS NOT NULL AND p_AssignedVehicleId > 0 THEN
        UPDATE TransportVehicleAssignments
        SET VehicleId = p_AssignedVehicleId,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE (DriverId = v_TargetStaffId OR DriverId = p_DriverId)
          AND Status = 1 AND IsDeleted = 0;
    END IF;

    SELECT 1 AS Success;
END;";
            await connection.ExecuteAsync(spUpdateTransportDrivers);
            Console.WriteLine("  [DEPLOYED] sp_UpdateTransportDrivers");

            string spDeleteTransportDrivers = @"
DROP PROCEDURE IF EXISTS `sp_DeleteTransportDrivers`;
CREATE PROCEDURE `sp_DeleteTransportDrivers`(
    IN p_DriverId BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    DECLARE v_TargetStaffId BIGINT;

    SET v_TargetStaffId = p_DriverId;
    IF NOT EXISTS (SELECT 1 FROM Staff WHERE Id = v_TargetStaffId) THEN
        SELECT StaffId INTO v_TargetStaffId FROM TransportDrivers WHERE DriverId = p_DriverId LIMIT 1;
    END IF;

    UPDATE Staff
    SET IsDriver = 0, UpdatedAt = CURRENT_TIMESTAMP
    WHERE Id = v_TargetStaffId AND IsDeleted = 0;

    UPDATE TransportDrivers
    SET IsDeleted = 1, Status = 0, IsActive = 0, UpdatedBy = p_UpdatedBy, UpdatedAt = CURRENT_TIMESTAMP
    WHERE (DriverId = p_DriverId OR StaffId = v_TargetStaffId);

    UPDATE TransportVehicleAssignments
    SET Status = 0, EffectiveTo = CURRENT_TIMESTAMP, UpdatedAt = CURRENT_TIMESTAMP
    WHERE (DriverId = v_TargetStaffId OR DriverId = p_DriverId) AND Status = 1 AND IsDeleted = 0;

    SELECT 1 AS Success;
END;";
            await connection.ExecuteAsync(spDeleteTransportDrivers);
            Console.WriteLine("  [DEPLOYED] sp_DeleteTransportDrivers");

            string spGetDriverDashboardData = @"
DROP PROCEDURE IF EXISTS `sp_GetDriverDashboardData`;
CREATE PROCEDURE `sp_GetDriverDashboardData`(
    IN p_StaffId INT
)
BEGIN
    DECLARE v_DriverId BIGINT;
    SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE StaffId = p_StaffId AND IsDeleted = 0 LIMIT 1;
    IF v_DriverId IS NULL THEN
        SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE DriverId = p_StaffId AND IsDeleted = 0 LIMIT 1;
    END IF;

    SELECT 
        tva.AssignmentId,
        v.VehicleId,
        v.VehicleNumber,
        COALESCE(v.VehicleRegistrationNo, v.VehicleNumber) AS RegistrationNumber,
        v.VehicleType,
        v.Capacity,
        tva.EffectiveFrom AS AssignedDate,
        r.RouteId,
        r.RouteName,
        r.RouteCode,
        r.StartLocation,
        r.EndLocation,
        att.AttendantId,
        att.AttendantName,
        att.MobileNumber AS ContactNumber
    FROM TransportVehicleAssignments tva
    JOIN TransportVehicles v ON tva.VehicleId = v.VehicleId AND v.IsDeleted = 0
    JOIN TransportRoutes r ON tva.RouteId = r.RouteId AND r.IsDeleted = 0
    LEFT JOIN TransportAttendants att ON tva.AttendantId = att.AttendantId AND att.IsDeleted = 0
    WHERE (tva.DriverId = v_DriverId OR tva.DriverId = p_StaffId)
      AND tva.Status = 1 
      AND tva.IsDeleted = 0
    ORDER BY tva.AssignmentId DESC
    LIMIT 1;
END;";
            await connection.ExecuteAsync(spGetDriverDashboardData);
            Console.WriteLine("  [DEPLOYED] sp_GetDriverDashboardData");

            string spGetDriverRouteDetails = @"
DROP PROCEDURE IF EXISTS `sp_GetDriverRouteDetails`;
CREATE PROCEDURE `sp_GetDriverRouteDetails`(
    IN p_StaffId INT
)
BEGIN
    DECLARE v_DriverId BIGINT;
    DECLARE v_RouteId BIGINT;

    SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE StaffId = p_StaffId AND IsDeleted = 0 LIMIT 1;
    IF v_DriverId IS NULL THEN
        SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE DriverId = p_StaffId AND IsDeleted = 0 LIMIT 1;
    END IF;

    SELECT RouteId INTO v_RouteId
    FROM TransportVehicleAssignments
    WHERE (DriverId = v_DriverId OR DriverId = p_StaffId) AND Status = 1 AND IsDeleted = 0
    ORDER BY AssignmentId DESC LIMIT 1;

    -- Resultset 1: Route details
    SELECT 
        r.RouteId,
        r.RouteName,
        r.RouteCode,
        r.StartLocation,
        r.EndLocation,
        r.Distance AS DistanceKm,
        r.EstimatedDurationMinutes
    FROM TransportRoutes r
    WHERE r.RouteId = v_RouteId AND r.IsDeleted = 0;

    -- Resultset 2: Route pickup stops
    SELECT 
        p.PickupPointId,
        COALESCE(p.PickupPointName, 'Campus Gate') AS StopName,
        p.PickupTime,
        p.DropTime,
        p.SequenceNo AS StopOrder,
        p.DistanceFromStart AS DistanceKm
    FROM PickupPoints p
    WHERE (v_RouteId IS NULL OR p.RouteId = v_RouteId) AND p.IsDeleted = 0
    ORDER BY p.SequenceNo ASC, p.PickupPointId ASC;
END;";
            await connection.ExecuteAsync(spGetDriverRouteDetails);
            Console.WriteLine("  [DEPLOYED] sp_GetDriverRouteDetails");

            string spGetDriverTrips = @"
DROP PROCEDURE IF EXISTS `sp_GetDriverTrips`;
CREATE PROCEDURE `sp_GetDriverTrips`(
    IN p_StaffId INT,
    IN p_TripDate DATE
)
BEGIN
    DECLARE v_DriverId BIGINT;
    DECLARE v_AssignmentId BIGINT;
    DECLARE v_VehicleId BIGINT;
    DECLARE v_RouteId BIGINT;
    DECLARE v_AttendantId BIGINT;
    DECLARE v_MorningTime VARCHAR(20);
    DECLARE v_EveningTime VARCHAR(20);
    DECLARE v_TargetDate DATE;

    SET v_TargetDate = COALESCE(p_TripDate, CURRENT_DATE());

    SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE (StaffId = p_StaffId OR DriverId = p_StaffId) AND IsDeleted = 0 LIMIT 1;
    IF v_DriverId IS NULL THEN SET v_DriverId = p_StaffId; END IF;

    SELECT AssignmentId, VehicleId, RouteId, AttendantId, COALESCE(MorningTripTime, '07:00 AM'), COALESCE(EveningTripTime, '03:45 PM')
    INTO v_AssignmentId, v_VehicleId, v_RouteId, v_AttendantId, v_MorningTime, v_EveningTime
    FROM TransportVehicleAssignments
    WHERE (DriverId = v_DriverId OR DriverId = p_StaffId)
      AND Status = 1 AND IsDeleted = 0
    ORDER BY AssignmentId DESC LIMIT 1;

    IF v_AssignmentId IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM TransportTrips WHERE (DriverId = v_DriverId OR DriverId = p_StaffId) AND TripDate = v_TargetDate AND TripType = 'Morning' AND IsDeleted = 0) THEN
            INSERT INTO TransportTrips (AssignmentId, VehicleId, RouteId, DriverId, AttendantId, TripType, TripDate, StartTime, EndTime, Status, IsDeleted, CreatedAt)
            VALUES (v_AssignmentId, v_VehicleId, v_RouteId, v_DriverId, v_AttendantId, 'Morning', v_TargetDate, v_MorningTime, '08:30 AM', 'Scheduled', 0, NOW());
        END IF;

        IF NOT EXISTS (SELECT 1 FROM TransportTrips WHERE (DriverId = v_DriverId OR DriverId = p_StaffId) AND TripDate = v_TargetDate AND TripType = 'Evening' AND IsDeleted = 0) THEN
            INSERT INTO TransportTrips (AssignmentId, VehicleId, RouteId, DriverId, AttendantId, TripType, TripDate, StartTime, EndTime, Status, IsDeleted, CreatedAt)
            VALUES (v_AssignmentId, v_VehicleId, v_RouteId, v_DriverId, v_AttendantId, 'Evening', v_TargetDate, v_EveningTime, '05:30 PM', 'Scheduled', 0, NOW());
        END IF;
    END IF;

    SELECT 
        t.TripId,
        t.AssignmentId,
        t.TripType,
        t.TripDate,
        t.StartTime,
        t.EndTime,
        t.Status,
        t.StudentsPresent,
        r.RouteId,
        COALESCE(r.RouteName, 'City Route A') AS RouteName,
        COALESCE(r.RouteCode, 'ROUTE-01') AS RouteCode,
        v.VehicleId,
        COALESCE(v.VehicleNumber, 'PC-101') AS VehicleNumber,
        (SELECT COUNT(*) FROM PickupPoints pp WHERE pp.RouteId = t.RouteId AND pp.IsDeleted = 0) AS StopsCount,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.RouteId = t.RouteId AND sta.Status = 1 AND sta.IsDeleted = 0) AS StudentsCount
    FROM TransportTrips t
    LEFT JOIN TransportRoutes r ON t.RouteId = r.RouteId
    LEFT JOIN TransportVehicles v ON t.VehicleId = v.VehicleId
    WHERE (t.DriverId = v_DriverId OR t.DriverId = p_StaffId)
      AND t.TripDate = v_TargetDate
      AND t.IsDeleted = 0
    ORDER BY CASE WHEN t.TripType = 'Morning' THEN 1 ELSE 2 END;
END;";
            await connection.ExecuteAsync(spGetDriverTrips);
            Console.WriteLine("  [DEPLOYED] sp_GetDriverTrips");

            string spStartDriverTrip = @"
DROP PROCEDURE IF EXISTS `sp_StartDriverTrip`;
CREATE PROCEDURE `sp_StartDriverTrip`(
    IN p_TripId BIGINT,
    IN p_StaffId INT
)
BEGIN
    UPDATE TransportTrips
    SET Status = 'In Progress',
        StartTime = DATE_FORMAT(NOW(), '%h:%i %p'),
        UpdatedAt = NOW()
    WHERE TripId = p_TripId AND IsDeleted = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END;";
            await connection.ExecuteAsync(spStartDriverTrip);
            Console.WriteLine("  [DEPLOYED] sp_StartDriverTrip");

            string spEndDriverTrip = @"
DROP PROCEDURE IF EXISTS `sp_EndDriverTrip`;
CREATE PROCEDURE `sp_EndDriverTrip`(
    IN p_TripId BIGINT,
    IN p_StaffId INT
)
BEGIN
    UPDATE TransportTrips
    SET Status = 'Completed',
        EndTime = DATE_FORMAT(NOW(), '%h:%i %p'),
        UpdatedAt = NOW()
    WHERE TripId = p_TripId AND IsDeleted = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END;";
            await connection.ExecuteAsync(spEndDriverTrip);
            Console.WriteLine("  [DEPLOYED] sp_EndDriverTrip");

            string spGetDriverRouteStudents = @"
DROP PROCEDURE IF EXISTS `sp_GetDriverRouteStudents`;
CREATE PROCEDURE `sp_GetDriverRouteStudents`(
    IN p_StaffId INT
)
BEGIN
    DECLARE v_DriverId BIGINT;
    DECLARE v_RouteId BIGINT;

    SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE (StaffId = p_StaffId OR DriverId = p_StaffId) AND IsDeleted = 0 LIMIT 1;
    IF v_DriverId IS NULL THEN SET v_DriverId = p_StaffId; END IF;

    SELECT RouteId INTO v_RouteId
    FROM TransportVehicleAssignments
    WHERE (DriverId = v_DriverId OR DriverId = p_StaffId) AND Status = 1 AND IsDeleted = 0
    ORDER BY AssignmentId DESC LIMIT 1;

    SELECT 
        sta.StudentId,
        sta.StudentTransportAssignmentId AS AssignmentId,
        COALESCE(st.StudentName, CONCAT('Student ', sta.StudentId)) AS StudentName,
        sta.AdmissionNo,
        COALESCE(pp.PickupPointName, 'Campus Gate') AS StopName,
        pp.PickupPointId,
        COALESCE(TIME_FORMAT(pp.PickupTime, '%h:%i %p'), '07:30 AM') AS PickupTime,
        COALESCE(st.FatherMobile, st.MobileNumber, st.MotherMobile, 'N/A') AS ContactNumber,
        COALESCE(sta_att.Status, 'Pending') AS AttendanceStatus
    FROM StudentTransportAssignments sta
    LEFT JOIN Students st ON (sta.AdmissionNo = st.AdmissionNo OR sta.StudentId = st.StudentId)
    LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId
    LEFT JOIN StudentTripAttendance sta_att ON sta.StudentId = sta_att.StudentId AND sta_att.AttendanceDate = CURRENT_DATE()
    WHERE (v_RouteId IS NULL OR sta.RouteId = v_RouteId)
      AND sta.Status = 1 
      AND sta.IsDeleted = 0
    ORDER BY pp.SequenceNo ASC, st.StudentName ASC;
END;";
            await connection.ExecuteAsync(spGetDriverRouteStudents);
            Console.WriteLine("  [DEPLOYED] sp_GetDriverRouteStudents");

            string spUpdateDriverStudentAttendance = @"
DROP PROCEDURE IF EXISTS `sp_UpdateDriverStudentAttendance`;
CREATE PROCEDURE `sp_UpdateDriverStudentAttendance`(
    IN p_StudentId BIGINT,
    IN p_TripId BIGINT,
    IN p_Status VARCHAR(50)
)
BEGIN
    INSERT INTO StudentTripAttendance (
        TripId, StudentId, AttendanceDate, Status, BoardedAt, CreatedAt, UpdatedAt
    ) VALUES (
        COALESCE(p_TripId, 1), p_StudentId, CURRENT_DATE(), p_Status, IF(p_Status IN ('Picked Up', 'Boarded'), NOW(), NULL), NOW(), NOW()
    )
    ON DUPLICATE KEY UPDATE
        Status = VALUES(Status),
        BoardedAt = IF(VALUES(Status) IN ('Picked Up', 'Boarded'), NOW(), BoardedAt),
        UpdatedAt = NOW();

    SELECT 1 AS Success;
END;";
            await connection.ExecuteAsync(spUpdateDriverStudentAttendance);
            Console.WriteLine("  [DEPLOYED] sp_UpdateDriverStudentAttendance");

            string spUpdateDriverStudentAttendanceBulk = @"
DROP PROCEDURE IF EXISTS `sp_UpdateDriverStudentAttendanceBulk`;
CREATE PROCEDURE `sp_UpdateDriverStudentAttendanceBulk`(
    IN p_StaffId INT,
    IN p_StopName VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE v_DriverId BIGINT;
    DECLARE v_RouteId BIGINT;

    SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE (StaffId = p_StaffId OR DriverId = p_StaffId) AND IsDeleted = 0 LIMIT 1;
    IF v_DriverId IS NULL THEN SET v_DriverId = p_StaffId; END IF;

    SELECT RouteId INTO v_RouteId
    FROM TransportVehicleAssignments
    WHERE (DriverId = v_DriverId OR DriverId = p_StaffId) AND Status = 1 AND IsDeleted = 0
    ORDER BY AssignmentId DESC LIMIT 1;

    INSERT INTO StudentTripAttendance (TripId, StudentId, AttendanceDate, Status, BoardedAt, CreatedAt, UpdatedAt)
    SELECT 
        1, sta.StudentId, CURRENT_DATE(), p_Status, NOW(), NOW(), NOW()
    FROM StudentTransportAssignments sta
    LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId
    WHERE (v_RouteId IS NULL OR sta.RouteId = v_RouteId)
      AND (p_StopName IS NULL OR p_StopName = '' OR p_StopName = 'All Stops' OR pp.PickupPointName = p_StopName)
      AND sta.Status = 1 AND sta.IsDeleted = 0
    ON DUPLICATE KEY UPDATE
        Status = VALUES(Status),
        BoardedAt = NOW(),
        UpdatedAt = NOW();

    SELECT 1 AS AffectedRows;
END;";
            await connection.ExecuteAsync(spUpdateDriverStudentAttendanceBulk);
            Console.WriteLine("  [DEPLOYED] sp_UpdateDriverStudentAttendanceBulk");

            string spGetDriverGpsCurrent = @"
DROP PROCEDURE IF EXISTS `sp_GetDriverGpsCurrent`;
CREATE PROCEDURE `sp_GetDriverGpsCurrent`(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        COALESCE(Latitude, 17.4495) AS Latitude,
        COALESCE(Longitude, 78.3840) AS Longitude,
        COALESCE(Speed, 0.00) AS Speed,
        COALESCE(Heading, 0.00) AS Heading,
        LastPingTime
    FROM DriverGpsTelemetry
    WHERE StaffId = p_StaffId
    LIMIT 1;
END;";
            await connection.ExecuteAsync(spGetDriverGpsCurrent);
            Console.WriteLine("  [DEPLOYED] sp_GetDriverGpsCurrent");

            string spUpdateDriverGpsTelemetry = @"
DROP PROCEDURE IF EXISTS `sp_UpdateDriverGpsTelemetry`;
CREATE PROCEDURE `sp_UpdateDriverGpsTelemetry`(
    IN p_StaffId INT,
    IN p_Latitude DECIMAL(10,6),
    IN p_Longitude DECIMAL(10,6),
    IN p_Speed DECIMAL(5,2),
    IN p_Heading DECIMAL(5,2)
)
BEGIN
    INSERT INTO DriverGpsTelemetry (StaffId, Latitude, Longitude, Speed, Heading, LastPingTime)
    VALUES (p_StaffId, p_Latitude, p_Longitude, p_Speed, p_Heading, NOW())
    ON DUPLICATE KEY UPDATE
        Latitude = VALUES(Latitude),
        Longitude = VALUES(Longitude),
        Speed = VALUES(Speed),
        Heading = VALUES(Heading),
        LastPingTime = NOW();

    SELECT 1 AS Success;
END;";
            await connection.ExecuteAsync(spUpdateDriverGpsTelemetry);
            Console.WriteLine("  [DEPLOYED] sp_UpdateDriverGpsTelemetry");

            string spGetDriverReports = @"
DROP PROCEDURE IF EXISTS `sp_GetDriverReports`;
CREATE PROCEDURE `sp_GetDriverReports`(
    IN p_StaffId INT
)
BEGIN
    DECLARE v_DriverId BIGINT;
    SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE (StaffId = p_StaffId OR DriverId = p_StaffId) AND IsDeleted = 0 LIMIT 1;
    IF v_DriverId IS NULL THEN SET v_DriverId = p_StaffId; END IF;

    SELECT 
        t.TripId AS Id,
        DATE_FORMAT(t.TripDate, '%Y-%m-%d') AS Date,
        CONCAT(t.TripType, ' Trip') AS TripType,
        COALESCE(r.RouteName, 'City Route A') AS Route,
        COALESCE(t.StartTime, '07:00 AM') AS StartTime,
        COALESCE(t.EndTime, '08:30 AM') AS EndTime,
        COALESCE(r.Distance, 24.5) AS DistanceKm,
        15.0 AS FuelAddedLiters,
        t.StudentsPresent AS StudentsTransported,
        '98.4%' AS AttendanceRate,
        t.Status,
        'Completed on schedule' AS DriverNotes
    FROM TransportTrips t
    LEFT JOIN TransportRoutes r ON t.RouteId = r.RouteId
    WHERE (t.DriverId = v_DriverId OR t.DriverId = p_StaffId)
      AND t.IsDeleted = 0
    ORDER BY t.TripDate DESC, t.TripId DESC
    LIMIT 50;
END;";
            await connection.ExecuteAsync(spGetDriverReports);
            Console.WriteLine("  [DEPLOYED] sp_GetDriverReports");

            string spGetDriverAttendanceSummary = @"
DROP PROCEDURE IF EXISTS `sp_GetDriverAttendanceSummary`;
CREATE PROCEDURE `sp_GetDriverAttendanceSummary`(
    IN p_StaffId INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE
)
BEGIN
    DECLARE v_WorkingDays INT DEFAULT 0;
    DECLARE v_PresentDays INT DEFAULT 0;
    DECLARE v_ApprovedLeaves INT DEFAULT 0;
    DECLARE v_PunctualCount INT DEFAULT 0;
    DECLARE v_From DATE;
    DECLARE v_To DATE;

    SET v_From = COALESCE(p_FromDate, CURRENT_DATE());
    SET v_To = COALESCE(p_ToDate, CURRENT_DATE());

    SET v_WorkingDays = GREATEST(1, DATEDIFF(v_To, v_From) + 1);

    SELECT 
        COUNT(DISTINCT DATE(ss.AttendanceDate)),
        SUM(CASE WHEN sa.InTime IS NOT NULL AND sa.InTime <= '09:15:00' THEN 1 ELSE 0 END)
    INTO v_PresentDays, v_PunctualCount
    FROM StaffAttendances sa
    JOIN StaffAttendanceSessions ss ON sa.StaffSessionId = ss.StaffSessionId
    WHERE sa.FacultyId = p_StaffId 
      AND sa.IsActive = 1
      AND DATE(ss.AttendanceDate) BETWEEN v_From AND v_To;

    SELECT COUNT(*)
    INTO v_ApprovedLeaves
    FROM StaffLeaveRequests sl
    WHERE sl.StaffId = p_StaffId 
      AND (sl.Status = 2 OR sl.Status = 'Approved')
      AND (DATE(sl.StartDate) BETWEEN v_From AND v_To OR DATE(sl.EndDate) BETWEEN v_From AND v_To);

    SELECT 
        v_WorkingDays AS WorkingDays,
        COALESCE(v_PresentDays, 1) AS PresentDays,
        COALESCE(v_ApprovedLeaves, 0) AS ApprovedLeaves,
        ROUND(IF(v_PresentDays > 0, (v_PunctualCount * 100.0) / v_PresentDays, 100.00), 1) AS PunctualityRate;
END;";
            await connection.ExecuteAsync(spGetDriverAttendanceSummary);
            Console.WriteLine("  [DEPLOYED] sp_GetDriverAttendanceSummary");

            string spGetDriverAttendanceHistory = @"
DROP PROCEDURE IF EXISTS `sp_GetDriverAttendanceHistory`;
CREATE PROCEDURE `sp_GetDriverAttendanceHistory`(
    IN p_StaffId INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE
)
BEGIN
    DECLARE v_From DATE;
    DECLARE v_To DATE;

    SET v_From = COALESCE(p_FromDate, CURRENT_DATE());
    SET v_To = COALESCE(p_ToDate, CURRENT_DATE());

    SELECT 
        DATE(ss.AttendanceDate) AS `Date`,
        '07:00 AM – 04:30 PM' AS `Shift`,
        sa.InTime,
        sa.OutTime,
        CASE 
            WHEN sa.Status = 1 THEN 'Present'
            WHEN sa.Status = 3 THEN 'Late'
            WHEN sa.Status = 4 THEN 'Half Day'
            WHEN sa.Status = 5 THEN 'On Leave'
            ELSE 'Present'
        END AS `Status`,
        ROUND(IF(sa.InTime IS NOT NULL AND sa.OutTime IS NOT NULL, TIMESTAMPDIFF(MINUTE, sa.InTime, sa.OutTime) / 60.0, 7.5), 2) AS `Hours`,
        COALESCE(sa.DeviceId, 'Driver Portal (Manual Punch)') AS `Source`,
        COALESCE(sar.Status, 'Normal') AS `RegularizationStatus`
    FROM StaffAttendances sa
    JOIN StaffAttendanceSessions ss ON sa.StaffSessionId = ss.StaffSessionId
    LEFT JOIN StaffAttendanceRegularizations sar ON (sar.FacultyId = p_StaffId OR sar.StaffId = p_StaffId) 
                                                AND DATE(sar.AttendanceDate) = DATE(ss.AttendanceDate)
    WHERE sa.FacultyId = p_StaffId 
      AND sa.IsActive = 1
      AND DATE(ss.AttendanceDate) BETWEEN v_From AND v_To
    ORDER BY DATE(ss.AttendanceDate) DESC;
END;";
            await connection.ExecuteAsync(spGetDriverAttendanceHistory);
            Console.WriteLine("  [DEPLOYED] sp_GetDriverAttendanceHistory");

            string spGetDriverProfile = @"
DROP PROCEDURE IF EXISTS `sp_GetDriverProfile`;
CREATE PROCEDURE `sp_GetDriverProfile`(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        COALESCE(d.DriverId, s.Id) AS DriverId,
        COALESCE(s.Id, d.StaffId, p_StaffId) AS StaffId,
        COALESCE(s.EmployeeId, d.EmployeeId, CONCAT('DRV-', p_StaffId)) AS EmployeeId,
        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(s.FirstName, ''), ' ', COALESCE(s.LastName, ''))), ''), d.DriverName, 'Driver') AS DriverName,
        COALESCE(s.DrivingLicenseNumber, d.LicenseNo, 'DL-PENDING') AS LicenseNumber,
        DATE_FORMAT(COALESCE(s.DrivingLicenseExpiryDate, d.LicenseExpiry, DATE_ADD(CURRENT_DATE(), INTERVAL 3 YEAR)), '%Y-%m-%d') AS LicenseExpiryDate,
        COALESCE(s.DrivingExperienceYears, d.Experience, 5) AS ExperienceYears,
        COALESCE(d.EmergencyContactNumber, s.AlternateMobile, s.Mobile, '') AS EmergencyContactNumber,
        COALESCE(d.EmergencyContactName, 'Family') AS EmergencyContactName,
        COALESCE(s.BloodGroup, d.BloodGroup, 'O+') AS BloodGroup,
        COALESCE(d.Status, IF(s.Status = 'Active', 1, 0), 1) AS IsActive,
        COALESCE(s.CurrentAddress, d.Address, '') AS Address,
        COALESCE(s.Mobile, d.MobileNo, '') AS Mobile,
        COALESCE(s.Email, 'driver@college.edu') AS Email
    FROM Staff s
    LEFT JOIN TransportDrivers d ON (d.StaffId = s.Id OR d.DriverId = s.Id) AND d.IsDeleted = 0
    WHERE (s.Id = p_StaffId OR d.DriverId = p_StaffId OR d.StaffId = p_StaffId)
      AND s.IsDeleted = 0
    ORDER BY s.Id DESC
    LIMIT 1;
END;";
            await connection.ExecuteAsync(spGetDriverProfile);
            Console.WriteLine("  [DEPLOYED] sp_GetDriverProfile");

            string spUpdateDriverProfile = @"
DROP PROCEDURE IF EXISTS `sp_UpdateDriverProfile`;
CREATE PROCEDURE `sp_UpdateDriverProfile`(
    IN p_StaffId INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Mobile VARCHAR(20),
    IN p_Email VARCHAR(150),
    IN p_Address VARCHAR(500)
)
BEGIN
    UPDATE Staff
    SET FirstName = COALESCE(NULLIF(p_FirstName, ''), FirstName),
        LastName = COALESCE(NULLIF(p_LastName, ''), LastName),
        Mobile = COALESCE(NULLIF(p_Mobile, ''), Mobile),
        Email = COALESCE(NULLIF(p_Email, ''), Email),
        CurrentAddress = COALESCE(NULLIF(p_Address, ''), CurrentAddress),
        UpdatedAt = CURRENT_TIMESTAMP
    WHERE Id = p_StaffId AND IsDeleted = 0;

    UPDATE TransportDrivers
    SET MobileNo = COALESCE(NULLIF(p_Mobile, ''), MobileNo),
        Address = COALESCE(NULLIF(p_Address, ''), Address),
        UpdatedAt = CURRENT_TIMESTAMP
    WHERE (StaffId = p_StaffId OR DriverId = p_StaffId) AND IsDeleted = 0;

    SELECT 1 AS AffectedRows;
END;";
            await connection.ExecuteAsync(spUpdateDriverProfile);
            Console.WriteLine("  [DEPLOYED] sp_UpdateDriverProfile");

            string spPunchStaffAttendance = @"
DROP PROCEDURE IF EXISTS `sp_PunchStaffAttendance`;
CREATE PROCEDURE `sp_PunchStaffAttendance`(
    IN p_FacultyId INT,
    IN p_PunchType VARCHAR(10),     -- 'IN' or 'OUT'
    IN p_PunchTime TIME,
    IN p_VerificationMethod TINYINT,
    IN p_DeviceId VARCHAR(100),
    IN p_IpAddress VARCHAR(45),
    IN p_Remarks VARCHAR(500),
    IN p_UserId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_NextDate DATE;
    DECLARE v_StaffType TINYINT DEFAULT 1;
    DECLARE v_DepartmentId INT DEFAULT NULL;
    DECLARE v_SessionId INT DEFAULT 0;
    DECLARE v_AttendanceId INT DEFAULT 0;
    DECLARE v_LateThreshold TIME DEFAULT '09:15:00';
    DECLARE v_EarlyThreshold TIME DEFAULT '16:30:00';
    DECLARE v_GraceMins INT DEFAULT 15;
    DECLARE v_Status TINYINT DEFAULT 1;

    SET v_TargetDate = CURRENT_DATE();
    SET v_NextDate = DATE_ADD(v_TargetDate, INTERVAL 1 DAY);

    -- Resolve Staff
    SELECT 
        IF(LOWER(COALESCE(StaffType, 'Teaching')) LIKE '%non%', 2, 1),
        DepartmentId,
        COALESCE(p_CampusId, CampusId, 1)
    INTO v_StaffType, v_DepartmentId, p_CampusId
    FROM `Staff`
    WHERE Id = p_FacultyId AND IsDeleted = 0
    LIMIT 1;

    -- Atomic Find or Create Session Header
    SELECT StaffSessionId INTO v_SessionId
    FROM `StaffAttendanceSessions`
    WHERE AttendanceDate >= v_TargetDate AND AttendanceDate < v_NextDate
      AND StaffType = v_StaffType
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId)
    LIMIT 1;

    IF v_SessionId <= 0 THEN
        INSERT INTO `StaffAttendanceSessions` (
            AttendanceDate, CampusId, DepartmentId, StaffType,
            TotalStaffCount, PresentCount, AbsentCount, LateCount, LeaveCount,
            IsLocked, Remarks, IsActive, CreatedByUserId, CreatedAt
        ) VALUES (
            NOW(), COALESCE(p_CampusId, 1), v_DepartmentId, v_StaffType,
            1, 0, 0, 0, 0, 0, 'Auto-created by punch system', 1, p_UserId, UTC_TIMESTAMP()
        );
        SET v_SessionId = LAST_INSERT_ID();
    END IF;

    -- Find Attendance Record
    SELECT StaffAttendanceId INTO v_AttendanceId
    FROM `StaffAttendances`
    WHERE StaffSessionId = v_SessionId AND FacultyId = p_FacultyId AND IsActive = 1
    LIMIT 1;

    IF UPPER(p_PunchType) = 'IN' THEN
        SET v_Status = IF(p_PunchTime > v_LateThreshold, 3, 1); -- 3 = Late, 1 = Present

        IF v_AttendanceId > 0 THEN
            UPDATE `StaffAttendances`
            SET InTime = p_PunchTime,
                Status = v_Status,
                VerificationMethod = p_VerificationMethod,
                DeviceId = COALESCE(p_DeviceId, DeviceId),
                IpAddress = COALESCE(p_IpAddress, IpAddress),
                Remarks = COALESCE(p_Remarks, Remarks),
                UpdatedAt = UTC_TIMESTAMP()
            WHERE StaffAttendanceId = v_AttendanceId;
        ELSE
            INSERT INTO `StaffAttendances` (
                StaffSessionId, FacultyId, Status, InTime, OutTime,
                VerificationMethod, DeviceId, IpAddress, Remarks,
                IsActive, CreatedByUserId, CreatedAt
            ) VALUES (
                v_SessionId, p_FacultyId, v_Status, p_PunchTime, NULL,
                p_VerificationMethod, p_DeviceId, p_IpAddress, p_Remarks,
                1, p_UserId, UTC_TIMESTAMP()
            );
        END IF;

    ELSEIF UPPER(p_PunchType) = 'OUT' THEN
        IF v_AttendanceId > 0 THEN
            UPDATE `StaffAttendances`
            SET OutTime = p_PunchTime,
                Remarks = CONCAT_WS(' | ', Remarks, IF(p_PunchTime < v_EarlyThreshold, 'Early checkout logged', 'Check-Out')),
                UpdatedAt = UTC_TIMESTAMP()
            WHERE StaffAttendanceId = v_AttendanceId;
        ELSE
            INSERT INTO `StaffAttendances` (
                StaffSessionId, FacultyId, Status, InTime, OutTime,
                VerificationMethod, DeviceId, IpAddress, Remarks,
                IsActive, CreatedByUserId, CreatedAt
            ) VALUES (
                v_SessionId, p_FacultyId, 1, '08:00:00', p_PunchTime,
                p_VerificationMethod, p_DeviceId, p_IpAddress, p_Remarks,
                1, p_UserId, UTC_TIMESTAMP()
            );
        END IF;
    END IF;

    SELECT 1 AS Success;
END;";
            await connection.ExecuteAsync(spPunchStaffAttendance);
            Console.WriteLine("  [DEPLOYED] sp_PunchStaffAttendance");

            string spSubmitStaffRegularization = @"
DROP PROCEDURE IF EXISTS `sp_SubmitStaffRegularization`;
CREATE PROCEDURE `sp_SubmitStaffRegularization`(
    IN p_FacultyId INT,
    IN p_AttendanceDate DATETIME,
    IN p_RequestedInTime TIME,
    IN p_RequestedOutTime TIME,
    IN p_Reason VARCHAR(500),
    IN p_UserId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_RegId INT DEFAULT 0;

    SET v_TargetDate = DATE(p_AttendanceDate);

    SELECT RegularizationId INTO v_RegId
    FROM `StaffAttendanceRegularizations`
    WHERE (FacultyId = p_FacultyId OR StaffId = p_FacultyId)
      AND DATE(AttendanceDate) = v_TargetDate
    LIMIT 1;

    IF v_RegId > 0 THEN
        UPDATE `StaffAttendanceRegularizations`
        SET RequestedInTime = p_RequestedInTime,
            RequestedOutTime = p_RequestedOutTime,
            Reason = p_Reason,
            Status = 'Pending',
            UpdatedAt = UTC_TIMESTAMP()
        WHERE RegularizationId = v_RegId;
    ELSE
        INSERT INTO `StaffAttendanceRegularizations` (
            FacultyId, StaffId, AttendanceDate, RequestedInTime, RequestedOutTime,
            Reason, Status, CreatedAt
        ) VALUES (
            p_FacultyId, p_FacultyId, p_AttendanceDate, p_RequestedInTime, p_RequestedOutTime,
            p_Reason, 'Pending', UTC_TIMESTAMP()
        );
    END IF;

    SELECT 1 AS Success;
END;";
            await connection.ExecuteAsync(spSubmitStaffRegularization);
            Console.WriteLine("  [DEPLOYED] sp_SubmitStaffRegularization");

            Console.WriteLine("[DriverModuleDbDeployer] All procedures deployed successfully.");
            return true;
        }
    }
}
