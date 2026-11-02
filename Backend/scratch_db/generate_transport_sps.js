const fs = require('fs');

const srcPath = 'Backend/src/CollegeManagement.API/Database/Transport_Management_Schema_And_Procedures.sql';
let srcContent = fs.readFileSync(srcPath, 'utf-8');

// Strip USE statement
srcContent = srcContent.replace(/USE\s+`[^`]+`;/gi, '');

// Fix sp_GetTransportDriversById to match StaffId or DriverId
srcContent = srcContent.replace(
  'WHERE d.DriverId = p_Id AND d.IsDeleted = 0',
  'WHERE (d.DriverId = p_Id OR d.StaffId = p_Id) AND d.IsDeleted = 0'
);

// Fix sp_GetTransportDriverByIdOrNumber to match StaffId or DriverId
srcContent = srcContent.replace(
  'AND (`DriverId` = p_SearchId OR LOWER(`LicenseNo`) = LOWER(p_SearchStr) OR LOWER(`DriverName`) = LOWER(p_SearchStr) OR LOWER(`MobileNo`) = LOWER(p_SearchStr))',
  'AND (`DriverId` = p_SearchId OR `StaffId` = p_SearchId OR LOWER(`LicenseNo`) = LOWER(p_SearchStr) OR LOWER(`DriverName`) = LOWER(p_SearchStr) OR LOWER(`MobileNo`) = LOWER(p_SearchStr))'
);

// Additional procedures to append
const additionalProcedures = `
-- -----------------------------------------------------------------------------
-- 13. ADDITIONAL CANONICAL STORED PROCEDURES (VALIDATION & SELF-SERVICE)
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS \`sp_CheckTransportRouteCodeExists\`;
DELIMITER //
CREATE PROCEDURE \`sp_CheckTransportRouteCodeExists\`(
    IN p_RouteCode VARCHAR(50),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) 
    FROM TransportRoutes 
    WHERE RouteCode = p_RouteCode 
      AND IsDeleted = 0 
      AND (p_ExcludeId IS NULL OR RouteId != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS \`sp_CheckTransportRouteNameExists\`;
DELIMITER //
CREATE PROCEDURE \`sp_CheckTransportRouteNameExists\`(
    IN p_RouteName VARCHAR(150),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) 
    FROM TransportRoutes 
    WHERE RouteName = p_RouteName 
      AND IsDeleted = 0 
      AND (p_ExcludeId IS NULL OR RouteId != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS \`sp_CheckPickupPointSequenceExists\`;
DELIMITER //
CREATE PROCEDURE \`sp_CheckPickupPointSequenceExists\`(
    IN p_RouteId BIGINT,
    IN p_SequenceNo INT,
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) 
    FROM PickupPoints 
    WHERE RouteId = p_RouteId 
      AND StopOrder = p_SequenceNo 
      AND IsDeleted = 0 
      AND (p_ExcludeId IS NULL OR PickupPointId != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS \`sp_GetDriverSettings\`;
DELIMITER //
CREATE PROCEDURE \`sp_GetDriverSettings\`(
    IN p_StaffId INT
)
BEGIN
    -- 1. Profile information from Staff
    SELECT 
        s.Id AS StaffId,
        CONCAT(s.FirstName, CASE WHEN s.LastName IS NOT NULL AND s.LastName != '' THEN CONCAT(' ', s.LastName) ELSE '' END) AS FullName,
        s.EmployeeId,
        COALESCE(d.DepartmentName, 'Not available') AS Department,
        COALESCE(des.DesignationName, s.Designation, 'Driver') AS Designation,
        s.Mobile,
        COALESCE(s.Email, '') AS PersonalEmail,
        COALESCE(s.CurrentAddress, '') AS Address
    FROM Staff s
    LEFT JOIN Departments d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON s.DesignationId = des.DesignationId
    WHERE s.Id = p_StaffId AND s.IsDeleted = 0
    LIMIT 1;

    -- 2. Preferences from DriverPreferences
    SELECT 
        COALESCE(p.EmailAttendanceAlerts, 1) AS EmailAttendanceAlerts,
        COALESCE(p.SmsUrgentAlerts, 0) AS SmsUrgentAlerts,
        COALESCE(p.TripReminders, 1) AS TripReminders,
        COALESCE(p.AutoLogoutMinutes, 30) AS AutoLogoutMinutes
    FROM DriverPreferences p
    WHERE p.StaffId = p_StaffId
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS \`sp_UpdateDriverProfile\`;
DELIMITER //
CREATE PROCEDURE \`sp_UpdateDriverProfile\`(
    IN p_StaffId INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Mobile VARCHAR(20),
    IN p_Email VARCHAR(150),
    IN p_Address VARCHAR(500)
)
BEGIN
    UPDATE Staff
    SET FirstName = p_FirstName,
        LastName = p_LastName,
        Mobile = p_Mobile,
        Email = p_Email,
        CurrentAddress = p_Address,
        UpdatedAt = CURRENT_TIMESTAMP
    WHERE Id = p_StaffId AND IsDeleted = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS \`sp_SaveDriverPreferences\`;
DELIMITER //
CREATE PROCEDURE \`sp_SaveDriverPreferences\`(
    IN p_StaffId INT,
    IN p_EmailAttendanceAlerts BOOLEAN,
    IN p_SmsUrgentAlerts BOOLEAN,
    IN p_TripReminders BOOLEAN,
    IN p_AutoLogoutMinutes INT
)
BEGIN
    INSERT INTO DriverPreferences (
        StaffId, EmailAttendanceAlerts, SmsUrgentAlerts, TripReminders, AutoLogoutMinutes, CreatedAtUtc, UpdatedAtUtc
    ) VALUES (
        p_StaffId, p_EmailAttendanceAlerts, p_SmsUrgentAlerts, p_TripReminders, p_AutoLogoutMinutes, UTC_TIMESTAMP(), UTC_TIMESTAMP()
    )
    ON DUPLICATE KEY UPDATE
        EmailAttendanceAlerts = VALUES(EmailAttendanceAlerts),
        SmsUrgentAlerts = VALUES(SmsUrgentAlerts),
        TripReminders = VALUES(TripReminders),
        AutoLogoutMinutes = VALUES(AutoLogoutMinutes),
        UpdatedAtUtc = UTC_TIMESTAMP();

    SELECT 1 AS Success;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS \`sp_GetDriverNotifications\`;
DELIMITER //
CREATE PROCEDURE \`sp_GetDriverNotifications\`(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        NotificationId,
        StaffId,
        Title,
        Message,
        NotificationType,
        ReadTime,
        CreatedTime
    FROM TransportDriverNotifications
    WHERE StaffId = p_StaffId AND (IsDeleted = 0 OR IsDeleted IS NULL)
    ORDER BY CreatedTime DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS \`sp_MarkDriverNotificationsRead\`;
DELIMITER //
CREATE PROCEDURE \`sp_MarkDriverNotificationsRead\`(
    IN p_StaffId INT
)
BEGIN
    UPDATE TransportDriverNotifications
    SET ReadTime = UTC_TIMESTAMP()
    WHERE StaffId = p_StaffId AND ReadTime IS NULL;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS \`sp_GetDriverDashboardData\`;
DELIMITER //
CREATE PROCEDURE \`sp_GetDriverDashboardData\`(
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
        v.VehicleRegistrationNo AS RegistrationNumber,
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
    WHERE tva.DriverId = v_DriverId 
      AND tva.Status = 1 
      AND tva.IsDeleted = 0
      AND tva.EffectiveFrom <= CURRENT_TIMESTAMP 
      AND (tva.EffectiveTo IS NULL OR tva.EffectiveTo >= CURRENT_TIMESTAMP)
    ORDER BY tva.AssignmentId DESC
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS \`sp_GetDriverRouteDetails\`;
DELIMITER //
CREATE PROCEDURE \`sp_GetDriverRouteDetails\`(
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
    WHERE DriverId = v_DriverId AND Status = 1 AND IsDeleted = 0
      AND EffectiveFrom <= CURRENT_TIMESTAMP AND (EffectiveTo IS NULL OR EffectiveTo >= CURRENT_TIMESTAMP)
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
        p.StopName,
        p.PickupTime,
        p.DropTime,
        p.StopOrder,
        p.DistanceFromSchool AS DistanceKm
    FROM PickupPoints p
    WHERE p.RouteId = v_RouteId AND p.IsDeleted = 0
    ORDER BY p.StopOrder ASC, p.PickupPointId ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS \`sp_GetDriverProfile\`;
DELIMITER //
CREATE PROCEDURE \`sp_GetDriverProfile\`(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        d.DriverId,
        COALESCE(d.StaffId, s.Id) AS StaffId,
        COALESCE(s.EmployeeId, d.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), d.DriverName) AS DriverName,
        COALESCE(s.DrivingLicenseNumber, d.LicenseNo) AS LicenseNumber,
        DATE_FORMAT(COALESCE(s.DrivingLicenseExpiryDate, d.LicenseExpiry), '%Y-%m-%d') AS LicenseExpiryDate,
        COALESCE(s.DrivingExperienceYears, d.Experience, 5) AS ExperienceYears,
        d.EmergencyContactNumber,
        COALESCE(s.BloodGroup, d.BloodGroup) AS BloodGroup,
        d.Status AS IsActive,
        COALESCE(s.CurrentAddress, d.Address) AS Address,
        COALESCE(s.Mobile, d.MobileNo) AS Mobile
    FROM TransportDrivers d
    LEFT JOIN Staff s ON d.StaffId = s.Id AND s.IsDeleted = 0
    WHERE (d.StaffId = p_StaffId OR d.DriverId = p_StaffId) AND d.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;
`;

// Header for 15_Transport_SPs.sql
const header = `-- =============================================================================
-- MODULE 6: TRANSPORTATION MANAGEMENT CANONICAL STORED PROCEDURES
-- 100% STORED PROCEDURES - 0% INLINE SQL - 0% EF CORE BUSINESS CRUD
-- NON-DESTRUCTIVE EXECUTION: CREATE TABLE IF NOT EXISTS & DROP PROCEDURE IF EXISTS
-- =============================================================================

`;

const fullContent = header + srcContent + additionalProcedures;
const destPath = 'Backend/src/CollegeManagement.API/Database/Updated_Module_SPs/15_Transport_SPs.sql';
fs.writeFileSync(destPath, fullContent, 'utf-8');
console.log('Successfully wrote', fullContent.length, 'bytes to', destPath);

// Synchronize into 00_All_Modules_Consolidated_SPs.sql
const consolidatedPath = 'Backend/src/CollegeManagement.API/Database/Updated_Module_SPs/00_All_Modules_Consolidated_SPs.sql';
let consolidated = fs.readFileSync(consolidatedPath, 'utf-8');
const transportSectionTag = '-- MODULE 6: TRANSPORTATION MANAGEMENT CANONICAL STORED PROCEDURES';

if (!consolidated.includes(transportSectionTag)) {
  consolidated += '\n\n' + fullContent;
  fs.writeFileSync(consolidatedPath, consolidated, 'utf-8');
  console.log('Successfully synchronized Transport SPs into', consolidatedPath);
} else {
  console.log('Transport SPs already present in consolidated file.');
}
