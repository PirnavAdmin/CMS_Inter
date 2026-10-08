DROP PROCEDURE IF EXISTS `sp_GetTransportReports`;
DELIMITER $$
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
            sta.AdmissionNo,
            COALESCE(st.StudentName, 'Student') AS StudentName,
            COALESCE(g.GroupName, 'N/A') AS ClassName,
            COALESCE(sec.SectionName, 'N/A') AS ClassSection,
            r.RouteName,
            pp.StopName AS PickupPointName,
            v.VehicleNumber,
            sta.TransportType AS FeePlan,
            COALESCE(pp.MonthlyFee, 1200.00) AS MonthlyFee,
            (COALESCE(pp.MonthlyFee, 1200.00) * 12) AS AnnualFee,
            CASE WHEN sta.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM StudentTransportAssignments sta
        LEFT JOIN Students st ON sta.AdmissionNo = st.AdmissionNo
        LEFT JOIN Sections sec ON st.SectionId = sec.SectionId
        LEFT JOIN StudentGroups g ON st.GroupId = g.GroupId
        LEFT JOIN TransportRoutes r ON sta.RouteId = r.RouteId
        LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId
        LEFT JOIN TransportVehicleAssignments tva ON sta.VehicleAssignmentId = tva.AssignmentId
        LEFT JOIN TransportVehicles v ON tva.VehicleId = v.VehicleId
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
            d.EmployeeId,
            d.DriverName,
            d.MobileNo AS MobileNumber,
            d.LicenseNo AS LicenseNumber,
            d.LicenseExpiry AS LicenseExpiryDate,
            CASE WHEN d.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportDrivers d
        WHERE d.IsDeleted = 0
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND d.Status = 1) 
               OR (p_Status = 'Inactive' AND d.Status = 0))
        ORDER BY d.DriverName ASC;

    -- 4. Route Report
    ELSEIF p_ReportType = 'route-reports' OR p_ReportType = 'route' THEN
        SELECT 
            r.RouteId,
            r.RouteCode,
            r.RouteName,
            r.StartLocation,
            r.EndLocation,
            r.DistanceKm,
            r.EstimatedDurationMinutes,
            COUNT(DISTINCT pp.PickupPointId) AS TotalPickupPoints,
            COUNT(DISTINCT sta.StudentTransportAssignmentId) AS StudentsAssigned,
            CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportRoutes r
        LEFT JOIN PickupPoints pp ON r.RouteId = pp.RouteId AND pp.IsDeleted = 0
        LEFT JOIN StudentTransportAssignments sta ON r.RouteId = sta.RouteId AND sta.IsDeleted = 0
        WHERE r.IsDeleted = 0
          AND (p_RouteId IS NULL OR r.RouteId = p_RouteId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND r.Status = 1) 
               OR (p_Status = 'Inactive' AND r.Status = 0))
        GROUP BY r.RouteId, r.RouteCode, r.RouteName, r.StartLocation, r.EndLocation, r.DistanceKm, r.EstimatedDurationMinutes, r.Status
        ORDER BY r.RouteName ASC;

    END IF;
END $$
DELIMITER ;
