using System;
using System.Data;
using System.Linq;
using System.Collections.Generic;
using Dapper;
using MySql.Data.MySqlClient;

string connStr = "Server=collegemanagementdb-mysql-3069cc62-manikesandeep-1393.g.aivencloud.com;Port=19182;Database=CollegeManagement;User ID=avnadmin;Password=AVNS_jgPZED4pphZib4tvJID;SslMode=Required;Allow User Variables=True;";
using var conn = new MySqlConnection(connStr);
await conn.OpenAsync();

string createSpSql = @"
DROP PROCEDURE IF EXISTS `sp_GetTransportReports`;
CREATE PROCEDURE `sp_GetTransportReports`(
    IN p_ReportType VARCHAR(50),
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_Status VARCHAR(30)
)
BEGIN
    -- 1. Student Transport Report
    IF p_ReportType = 'student-transport-reports' OR p_ReportType = 'student' THEN
        SELECT 
            sta.StudentTransportAssignmentId,
            COALESCE(NULLIF(sta.AdmissionNo, ''), st.AdmissionNo, '') AS AdmissionNo,
            COALESCE(st.StudentName, 'Student') AS StudentName,
            COALESCE(g.GroupName, 'N/A') AS ClassName,
            COALESCE(sec.SectionName, 'N/A') AS ClassSection,
            COALESCE(r.RouteName, 'N/A') AS RouteName,
            COALESCE(pp.StopName, 'N/A') AS PickupPointName,
            COALESCE(v.VehicleNumber, 'Unassigned') AS VehicleNumber,
            COALESCE(d.DriverName, CONCAT(TRIM(stf.FirstName), ' ', TRIM(stf.LastName)), 'Assigned Driver') AS DriverName,
            COALESCE(sta.TransportType, 'TwoWay') AS FeePlan,
            COALESCE(pp.MonthlyFee, 1200.00) AS MonthlyFee,
            (COALESCE(pp.MonthlyFee, 1200.00) * 12) AS AnnualFee,
            CASE WHEN sta.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM StudentTransportAssignments sta
        LEFT JOIN Students st ON (sta.StudentId = st.StudentId OR (sta.AdmissionNo IS NOT NULL AND sta.AdmissionNo <> '' AND sta.AdmissionNo = st.AdmissionNo))
        LEFT JOIN Sections sec ON st.SectionId = sec.SectionId
        LEFT JOIN `Groups` g ON st.GroupId = g.GroupId
        LEFT JOIN TransportRoutes r ON sta.RouteId = r.RouteId
        LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId
        LEFT JOIN TransportVehicleAssignments tva ON sta.VehicleAssignmentId = tva.AssignmentId
        LEFT JOIN TransportVehicles v ON tva.VehicleId = v.VehicleId
        LEFT JOIN TransportDrivers d ON tva.DriverId = d.DriverId
        LEFT JOIN Staff stf ON (tva.DriverId = stf.Id OR d.StaffId = stf.Id)
        WHERE sta.IsDeleted = 0
          AND (p_RouteId IS NULL OR sta.RouteId = p_RouteId)
          AND (p_VehicleId IS NULL OR tva.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND sta.Status = 1) 
               OR (p_Status = 'Inactive' AND sta.Status = 0))
        ORDER BY st.StudentName ASC;

    -- 2. Vehicle Report
    ELSEIF p_ReportType = 'vehicle-reports' OR p_ReportType = 'vehicle' THEN
        SELECT 
            v.VehicleId,
            v.VehicleNumber,
            v.VehicleRegistrationNo AS RegistrationNumber,
            v.VehicleType,
            v.Capacity,
            CASE WHEN v.IsAC = 1 THEN 'Yes' ELSE 'No' END AS AC,
            v.GpsDeviceId,
            v.InsuranceExpiry,
            v.PollutionExpiry,
            v.FitnessExpiry,
            CASE WHEN v.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportVehicles v
        WHERE v.IsDeleted = 0
          AND (p_VehicleId IS NULL OR v.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND v.Status = 1) 
               OR (p_Status = 'Inactive' AND v.Status = 0))
        ORDER BY v.VehicleNumber ASC;

    -- 3. Driver Report
    ELSEIF p_ReportType = 'driver-reports' OR p_ReportType = 'driver' THEN
        SELECT 
            d.DriverId,
            COALESCE(s.EmployeeId, d.EmployeeId) AS EmployeeId,
            COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), d.DriverName) AS DriverName,
            COALESCE(s.Mobile, d.MobileNo) AS MobileNumber,
            COALESCE(s.DrivingLicenseNumber, d.LicenseNo) AS LicenseNumber,
            DATE_FORMAT(COALESCE(s.DrivingLicenseExpiryDate, d.LicenseExpiry), '%Y-%m-%d') AS LicenseExpiryDate,
            CASE WHEN d.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportDrivers d
        LEFT JOIN Staff s ON d.StaffId = s.Id AND s.IsDeleted = 0
        WHERE d.IsDeleted = 0
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND d.Status = 1) 
               OR (p_Status = 'Inactive' AND d.Status = 0))
        ORDER BY DriverName ASC;

    -- 4. Route Report
    ELSEIF p_ReportType = 'route-reports' OR p_ReportType = 'route' THEN
        SELECT 
            r.RouteId,
            r.RouteCode,
            r.RouteName,
            r.StartLocation,
            r.EndLocation,
            r.Distance AS TotalDistanceKm,
            r.NonAcBaseFare,
            r.AcBaseFare,
            (SELECT COUNT(*) FROM PickupPoints pp WHERE pp.RouteId = r.RouteId AND pp.IsDeleted = 0) AS PickupPointCount,
            (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.RouteId = r.RouteId AND sta.IsDeleted = 0) AS StudentCount,
            CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportRoutes r
        WHERE r.IsDeleted = 0
          AND (p_RouteId IS NULL OR r.RouteId = p_RouteId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND r.Status = 1) 
               OR (p_Status = 'Inactive' AND r.Status = 0))
        ORDER BY r.RouteName ASC;

    -- 5. Maintenance Report
    ELSEIF p_ReportType = 'maintenance-reports' OR p_ReportType = 'maintenance' THEN
        SELECT 
            m.MaintenanceId,
            m.VehicleId,
            v.VehicleNumber,
            m.ServiceType,
            m.ServiceDate,
            m.Cost,
            m.VendorCenter,
            m.NextServiceDue,
            CASE WHEN m.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM VehicleMaintenances m
        LEFT JOIN TransportVehicles v ON m.VehicleId = v.VehicleId
        WHERE m.IsDeleted = 0
          AND (p_VehicleId IS NULL OR m.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND m.Status = 1) 
               OR (p_Status = 'Inactive' AND m.Status = 0))
        ORDER BY m.ServiceDate DESC;

    -- 6. Trip Reports
    ELSEIF p_ReportType = 'trip-reports' OR p_ReportType = 'trip' THEN
        SELECT 
            t.TripId,
            v.VehicleNumber,
            r.RouteName,
            t.TripType,
            t.TripDate,
            t.StartTime,
            t.EndTime,
            t.StudentsPresent,
            t.Status
        FROM TransportTrips t
        LEFT JOIN TransportVehicles v ON t.VehicleId = v.VehicleId
        LEFT JOIN TransportRoutes r ON t.RouteId = r.RouteId
        WHERE t.IsDeleted = 0
          AND (p_RouteId IS NULL OR t.RouteId = p_RouteId)
          AND (p_VehicleId IS NULL OR t.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR t.Status = p_Status)
        ORDER BY t.TripDate DESC;

    -- 7. Transport Dashboard Report (Vehicle Assignments & Overall)
    ELSE
        SELECT 
            a.AssignmentId,
            v.VehicleNumber,
            r.RouteName,
            COALESCE(d.DriverName, CONCAT(TRIM(stf.FirstName), ' ', TRIM(stf.LastName)), 'Assigned Driver') AS DriverName,
            att.AttendantName,
            v.Capacity,
            (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents,
            a.MorningTripTime,
            a.EveningTripTime,
            a.EffectiveFrom,
            CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportVehicleAssignments a
        LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
        LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
        LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
        LEFT JOIN Staff stf ON (a.DriverId = stf.Id OR d.StaffId = stf.Id)
        LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
        WHERE a.IsDeleted = 0
          AND (p_RouteId IS NULL OR a.RouteId = p_RouteId)
          AND (p_VehicleId IS NULL OR a.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND a.Status = 1) 
               OR (p_Status = 'Inactive' AND a.Status = 0))
        ORDER BY a.EffectiveFrom DESC;
    END IF;
END;
";

await conn.ExecuteAsync(createSpSql);
Console.WriteLine("sp_GetTransportReports created successfully!");

// Now test calling all report types using Stored Procedure!
string[] reportTypes = new[] { "student-transport-reports", "vehicle-reports", "driver-reports", "route-reports", "maintenance-reports", "trip-reports", "dashboard" };

foreach (var rep in reportTypes)
{
    try
    {
        var rows = (await conn.QueryAsync("sp_GetTransportReports", new { p_ReportType = rep, p_RouteId = (long?)null, p_VehicleId = (long?)null, p_Status = "" }, commandType: CommandType.StoredProcedure)).ToList();
        Console.WriteLine($"[VERIFIED] {rep}: {rows.Count} rows returned");
        if (rep == "student-transport-reports" && rows.Count > 0)
        {
            var first = (IDictionary<string, object>)rows[0];
            Console.WriteLine($"  Sample student row: StudentName={first["StudentName"]}, AdmissionNo={first["AdmissionNo"]}, RouteName={first["RouteName"]}, PickupPointName={first["PickupPointName"]}, VehicleNumber={first["VehicleNumber"]}, DriverName={first["DriverName"]}, FeePlan={first["FeePlan"]}, MonthlyFee={first["MonthlyFee"]}");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[FAILED] {rep}: {ex.Message}");
    }
}
