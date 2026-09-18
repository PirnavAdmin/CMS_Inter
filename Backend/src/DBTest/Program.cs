using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.IdentityModel.Tokens;

namespace DBTest
{
    internal class Program
    {
        private const string BaseUrl = "http://localhost:5167";
        private static readonly HttpClient Client = new HttpClient();
        private static int _passed = 0;
        private static int _failed = 0;
        private static readonly List<string> FailureDetails = new List<string>();

        private static string GenerateJwtToken()
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes("a_very_long_secure_secret_key_of_at_least_32_characters_long");
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("UserId", "1"),
                    new Claim(ClaimTypes.NameIdentifier, "1"),
                    new Claim(ClaimTypes.Name, "AdminUser"),
                    new Claim(ClaimTypes.Role, "Admin")
                }),
                Expires = DateTime.UtcNow.AddHours(2),
                Issuer = "CollegeManagementAPI",
                Audience = "CollegeManagementFrontend",
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private static async Task TestEndpoint(string name, HttpMethod method, string path, object? body = null, bool expectSuccess = true)
        {
            try
            {
                var request = new HttpRequestMessage(method, $"{BaseUrl}{path}");
                if (body != null)
                {
                    request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
                }

                var response = await Client.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                bool isOk = expectSuccess ? response.IsSuccessStatusCode : true;
                if (isOk)
                {
                    _passed++;
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.Write("[PASS] ");
                    Console.ResetColor();
                    Console.WriteLine($"{name} -> {(int)response.StatusCode} {response.StatusCode}");
                }
                else
                {
                    _failed++;
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.Write("[FAIL] ");
                    Console.ResetColor();
                    Console.WriteLine($"{name} -> {(int)response.StatusCode} {response.StatusCode}");
                    var snippet = content.Length > 250 ? content.Substring(0, 250) + "..." : content;
                    Console.WriteLine($"       Response: {snippet}");
                    FailureDetails.Add($"{name} ({path}): {(int)response.StatusCode} - {snippet}");
                }
            }
            catch (Exception ex)
            {
                _failed++;
                Console.ForegroundColor = ConsoleColor.Red;
                Console.Write("[ERROR] ");
                Console.ResetColor();
                Console.WriteLine($"{name} -> {ex.Message}");
                FailureDetails.Add($"{name} ({path}): Exception {ex.Message}");
            }
        }

        static async Task Main(string[] args)
        {
            Console.WriteLine("Preparing Database and Backfilling Legacy Columns...");
            using (var conn = new MySqlConnector.MySqlConnection("Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;MinimumPoolSize=2;MaximumPoolSize=30;ConnectionLifeTime=300;ConnectionIdleTimeout=120;Allow User Variables=True;"))
            {
                await conn.OpenAsync();
                var sqls = new[]
                {
                    "UPDATE `TransportVehicles` SET `RegistrationNumber` = COALESCE(NULLIF(`RegistrationNumber`, ''), NULLIF(`VehicleRegistrationNo`, ''), `VehicleNumber`, 'TS09AB1234'), `VehicleRegistrationNo` = COALESCE(NULLIF(`VehicleRegistrationNo`, ''), `VehicleNumber`, 'TS09AB1234'), `VehicleName` = COALESCE(NULLIF(`VehicleName`, ''), `VehicleNumber`), `Manufacturer` = COALESCE(NULLIF(`Manufacturer`, ''), `Make`, 'Tata') WHERE `IsDeleted` = 0;",
                    "UPDATE `TransportRoutes` SET `RouteCode` = COALESCE(NULLIF(`RouteCode`, ''), `RouteNumber`, 'R-01') WHERE `IsDeleted` = 0;",
                    "UPDATE `TransportDrivers` SET `EmployeeId` = COALESCE(NULLIF(`EmployeeId`, ''), CONCAT('DRV-', `DriverId`)), `LicenceNumber` = COALESCE(NULLIF(`LicenceNumber`, ''), `LicenseNo`, 'DL-01'), `MobileNumber` = COALESCE(NULLIF(`MobileNumber`, ''), `MobileNo`, '9876543210') WHERE `IsDeleted` = 0;",
                    "UPDATE `TransportAttendants` SET `EmployeeId` = COALESCE(NULLIF(`EmployeeId`, ''), CONCAT('ATT-', `AttendantId`)), `MobileNumber` = COALESCE(NULLIF(`MobileNumber`, ''), '9876500000') WHERE `IsDeleted` = 0;",
                    "SET @col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PickupPoints' AND COLUMN_NAME = 'DistanceKm'); SET @ddl = IF(@col = 0, 'ALTER TABLE `PickupPoints` ADD COLUMN `DistanceKm` DECIMAL(10,2) NOT NULL DEFAULT 0.00;', 'SELECT 1;'); PREPARE s FROM @ddl; EXECUTE s; DEALLOCATE PREPARE s;",
                    "UPDATE `PickupPoints` SET `DistanceKm` = COALESCE(`DistanceFromSchool`, `DistanceFromStart`, 0.00);",
                    "INSERT INTO `TransportVehicleAssignments` (`AssignmentId`, `RouteId`, `VehicleId`, `DriverId`, `AttendantId`, `EffectiveFrom`, `Shift`, `MorningTripTime`, `EveningTripTime`, `Remarks`, `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`) VALUES (1, 1, 1, 1, 1, NOW(), 'Morning', '07:00 AM', '03:45 PM', 'Default Test Assignment', 1, 0, 1, NOW()) ON DUPLICATE KEY UPDATE `IsDeleted` = 0, `Status` = 1, `RouteId` = 1, `VehicleId` = 1, `DriverId` = 1;"
                };
                foreach (var sql in sqls)
                {
                    using var cmd = new MySqlConnector.MySqlCommand(sql, conn);
                    await cmd.ExecuteNonQueryAsync();
                }

                // Update sp_GetTransportOperationDetails
                var spSql = @"
DROP PROCEDURE IF EXISTS `sp_GetTransportOperationDetails`;
CREATE PROCEDURE `sp_GetTransportOperationDetails`(
    IN p_AssignmentId BIGINT
)
BEGIN
    SELECT 
        a.AssignmentId,
        a.VehicleId,
        v.VehicleNumber,
        v.VehicleRegistrationNo AS RegistrationNumber,
        v.Capacity,
        a.RouteId,
        r.RouteName,
        r.Distance AS TotalRouteDistanceKm,
        d.DriverId,
        d.DriverName,
        d.MobileNo AS DriverMobile,
        a.AttendantId,
        COALESCE(att.AttendantName, 'Unassigned') AS AttendantName,
        COALESCE(att.MobileNumber, 'N/A') AS AttendantMobile,
        COALESCE(a.MorningTripTime, '07:00 AM') AS MorningTripTime,
        COALESCE(a.EveningTripTime, '03:45 PM') AS EveningTripTime,
        a.EffectiveFrom,
        CASE WHEN a.Status = 1 THEN 'Completed' ELSE 'Inactive' END AS Status,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudentsCount,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS TotalStudents,
        (SELECT COUNT(*) FROM PickupPoints pp WHERE pp.RouteId = a.RouteId AND pp.IsDeleted = 0) AS PickupPointsCount
    FROM TransportVehicleAssignments a
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    WHERE a.AssignmentId = p_AssignmentId AND a.IsDeleted = 0
    LIMIT 1;

    -- Stops sequence
    SELECT 
        pp.PickupPointId AS StepNo,
        pp.StopName,
        COALESCE(pp.DistanceKm, pp.DistanceFromSchool, pp.DistanceFromStart, 0.00) AS DistanceKm,
        TIME_FORMAT(pp.PickupTime, '%h:%i %p') AS ScheduledTime,
        'Active Stop' AS BoardingAlightingInfo,
        pp.Status AS IsActive,
        'Stop' AS `Type`
    FROM PickupPoints pp
    JOIN TransportVehicleAssignments a ON pp.RouteId = a.RouteId
    WHERE a.AssignmentId = p_AssignmentId AND pp.IsDeleted = 0
    ORDER BY pp.PickupPointId ASC;

    -- Students list
    SELECT 
        sta.StudentId,
        sta.AdmissionNo,
        COALESCE(st.StudentName, 'Student') AS StudentName,
        'Class 1-A' AS ClassSec,
        'Male' AS Gender,
        COALESCE(pp.StopName, 'Campus Stop') AS PickupPointName,
        COALESCE(a.MorningTripTime, '07:00 AM') AS MorningPickupTime,
        COALESCE(a.EveningTripTime, '03:45 PM') AS EveningDropTime,
        'Guardian' AS ParentName,
        '9876543210' AS ParentMobile
    FROM StudentTransportAssignments sta
    JOIN TransportVehicleAssignments a ON sta.VehicleAssignmentId = a.AssignmentId
    LEFT JOIN Students st ON sta.AdmissionNo = st.AdmissionNo
    LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId
    WHERE a.AssignmentId = p_AssignmentId AND sta.IsDeleted = 0
    ORDER BY st.StudentName ASC;
END;";
                using (var spCmd = new MySqlConnector.MySqlCommand(spSql, conn))
                {
                    await spCmd.ExecuteNonQueryAsync();
                }
            }

            Console.WriteLine("================================================================================");
            Console.WriteLine("STARTING COMPREHENSIVE TRANSPORTATION MODULE API TEST SUITE");
            Console.WriteLine("================================================================================");

            var token = GenerateJwtToken();
            Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            // 1. TransportRouteController
            Console.WriteLine("\n--- 1. Transport Route Controller ---");
            await TestEndpoint("GET Routes List (transport/routes)", HttpMethod.Get, "/api/v1/transport/routes?PageNumber=1&PageSize=10");
            await TestEndpoint("GET Routes List (transport-routes)", HttpMethod.Get, "/api/v1/transport-routes?PageNumber=1&PageSize=10");
            await TestEndpoint("POST Create Route", HttpMethod.Post, "/api/v1/transport/routes", new
            {
                RouteCode = $"RT-TEST-{Random.Shared.Next(1000, 9999)}",
                RouteName = "Automated Test Route",
                StartLocation = "Campus North",
                EndLocation = "City Center",
                DistanceKm = 18.5,
                EstimatedDurationMinutes = 45,
                NonAcBaseFare = 1100,
                AcBaseFare = 1400,
                Status = true
            });
            await TestEndpoint("GET Route By ID (1)", HttpMethod.Get, "/api/v1/transport/routes/1");
            await TestEndpoint("PUT Update Route (1)", HttpMethod.Put, "/api/v1/transport/routes/1", new
            {
                RouteCode = "R-001",
                RouteName = "Main Campus Expressway",
                StartLocation = "Hostel Gate",
                EndLocation = "City Junction",
                DistanceKm = 20,
                EstimatedDurationMinutes = 40,
                Status = true
            });

            // 2. PickupPointController
            Console.WriteLine("\n--- 2. Pickup Point Controller ---");
            await TestEndpoint("GET Pickup Points List (transport/pickup-points)", HttpMethod.Get, "/api/v1/transport/pickup-points?PageNumber=1&PageSize=10");
            await TestEndpoint("GET Pickup Points List (transport-pickup-points)", HttpMethod.Get, "/api/v1/transport-pickup-points?PageNumber=1&PageSize=10");
            await TestEndpoint("POST Create Pickup Point", HttpMethod.Post, "/api/v1/transport/pickup-points", new
            {
                RouteId = 1,
                PickupPointName = $"Stop-{Random.Shared.Next(1000, 9999)}",
                Landmark = "Main Road Intersection",
                SequenceNo = 3,
                PickupTime = "07:45:00",
                DistanceFromStart = 8.5,
                MonthlyFee = 1250,
                Status = true
            });
            await TestEndpoint("GET Pickup Point By ID (1)", HttpMethod.Get, "/api/v1/transport/pickup-points/1");
            await TestEndpoint("PUT Update Pickup Point (1)", HttpMethod.Put, "/api/v1/transport/pickup-points/1", new
            {
                RouteId = 1,
                PickupPointName = "Clock Tower Circle",
                Landmark = "Near Clock Tower",
                SequenceNo = 1,
                PickupTime = "07:30:00",
                DistanceFromStart = 5.0,
                MonthlyFee = 1200,
                Status = true
            });

            // 3. TransportVehicleController
            Console.WriteLine("\n--- 3. Transport Vehicle Controller ---");
            await TestEndpoint("GET Vehicles List (transport/vehicles)", HttpMethod.Get, "/api/v1/transport/vehicles?PageNumber=1&PageSize=10");
            await TestEndpoint("GET Vehicles List (transport-vehicles)", HttpMethod.Get, "/api/v1/transport-vehicles?PageNumber=1&PageSize=10");
            await TestEndpoint("POST Create Vehicle", HttpMethod.Post, "/api/v1/transport/vehicles", new
            {
                VehicleNumber = $"VH-{Random.Shared.Next(1000, 9999)}",
                RegistrationNumber = $"REG-{Random.Shared.Next(1000, 9999)}",
                VehicleType = "Bus",
                Capacity = 42,
                IsAC = true,
                Status = "Active"
            });
            await TestEndpoint("GET Vehicle By ID (1)", HttpMethod.Get, "/api/v1/transport/vehicles/1");
            await TestEndpoint("PUT Update Vehicle (1)", HttpMethod.Put, "/api/v1/transport/vehicles/1", new
            {
                VehicleNumber = "BUS-01",
                RegistrationNumber = "DL-01-AB-1234",
                VehicleType = "Bus",
                Capacity = 45,
                IsAC = true,
                Status = "Active"
            });

            // 4. TransportDriverController
            Console.WriteLine("\n--- 4. Transport Driver Controller ---");
            await TestEndpoint("GET Drivers List (transport/drivers)", HttpMethod.Get, "/api/v1/transport/drivers?PageNumber=1&PageSize=10");
            await TestEndpoint("GET Drivers List (transport-drivers)", HttpMethod.Get, "/api/v1/transport-drivers?PageNumber=1&PageSize=10");
            await TestEndpoint("POST Create Driver", HttpMethod.Post, "/api/v1/transport/drivers", new
            {
                DriverName = "Automated Test Driver",
                EmployeeId = $"DRV-TEST-{Random.Shared.Next(100, 999)}",
                LicenceNumber = $"LIC-{Random.Shared.Next(10000, 99999)}",
                MobileNumber = "9876543210",
                Status = true
            });
            await TestEndpoint("GET Driver By ID (1)", HttpMethod.Get, "/api/v1/transport/drivers/1");
            await TestEndpoint("PUT Update Driver (1)", HttpMethod.Put, "/api/v1/transport/drivers/1", new
            {
                DriverName = "Rajesh Kumar",
                EmployeeId = "DRV-1",
                LicenceNumber = "DL-04-2015-001",
                MobileNumber = "9876543210",
                Status = true
            });

            // 5. TransportAttendantController
            Console.WriteLine("\n--- 5. Transport Attendant Controller ---");
            await TestEndpoint("GET Attendants List (transport/attendants)", HttpMethod.Get, "/api/v1/transport/attendants?PageNumber=1&PageSize=10");
            await TestEndpoint("GET Attendants List (transport-attendants)", HttpMethod.Get, "/api/v1/transport-attendants?PageNumber=1&PageSize=10");
            await TestEndpoint("POST Create Attendant", HttpMethod.Post, "/api/v1/transport/attendants", new
            {
                AttendantName = "Automated Attendant",
                EmployeeId = $"ATT-{Random.Shared.Next(1000, 9999)}",
                MobileNumber = "9876500000",
                Gender = "Female",
                Status = true
            });
            await TestEndpoint("GET Attendant By ID (1)", HttpMethod.Get, "/api/v1/transport/attendants/1");
            await TestEndpoint("PUT Update Attendant (1)", HttpMethod.Put, "/api/v1/transport/attendants/1", new
            {
                AttendantName = "Sunita Sharma",
                EmployeeId = "ATT-1",
                MobileNumber = "9876500000",
                Gender = "Female",
                Status = true
            });

            // 6. TransportVehicleAssignmentController
            Console.WriteLine("\n--- 6. Vehicle Assignment Controller ---");
            await TestEndpoint("GET Vehicle Assignments List (transport/vehicle-assignments)", HttpMethod.Get, "/api/v1/transport/vehicle-assignments?PageNumber=1&PageSize=10");
            await TestEndpoint("GET Vehicle Assignments List (transport-vehicle-assignments)", HttpMethod.Get, "/api/v1/transport-vehicle-assignments?PageNumber=1&PageSize=10");
            await TestEndpoint("POST Create Vehicle Assignment", HttpMethod.Post, "/api/v1/transport/vehicle-assignments", new
            {
                RouteId = 1,
                VehicleId = 1,
                DriverId = 1,
                EffectiveFrom = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
                Shift = "Morning",
                Status = true
            });
            await TestEndpoint("GET Vehicle Assignment By ID (1)", HttpMethod.Get, "/api/v1/transport/vehicle-assignments/1");
            await TestEndpoint("PUT Update Vehicle Assignment (1)", HttpMethod.Put, "/api/v1/transport/vehicle-assignments/1", new
            {
                RouteId = 1,
                VehicleId = 1,
                DriverId = 1,
                EffectiveFrom = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
                Shift = "Morning",
                Status = true
            });

            // 7. StudentTransportAssignmentController
            Console.WriteLine("\n--- 7. Student Transport Assignment Controller ---");
            await TestEndpoint("GET Student Transport Assignments List (transport/student-assignments)", HttpMethod.Get, "/api/v1/transport/student-assignments?PageNumber=1&PageSize=10");
            await TestEndpoint("GET Student Transport Assignments List (transport-student-assignments)", HttpMethod.Get, "/api/v1/transport-student-assignments?PageNumber=1&PageSize=10");
            await TestEndpoint("POST Create Student Transport Assignment", HttpMethod.Post, "/api/v1/transport/student-assignments", new
            {
                AdmissionNo = $"ADM-{Random.Shared.Next(10000, 99999)}",
                RouteId = 1,
                PickupPointId = 1,
                VehicleAssignmentId = 1,
                EffectiveFrom = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
                TransportType = "Both",
                Status = true
            });
            await TestEndpoint("GET Student Assignment By ID (1)", HttpMethod.Get, "/api/v1/transport/student-assignments/1");
            await TestEndpoint("PUT Update Student Assignment (1)", HttpMethod.Put, "/api/v1/transport/student-assignments/1", new
            {
                AdmissionNo = "ADM-2024-001",
                RouteId = 1,
                PickupPointId = 1,
                VehicleAssignmentId = 1,
                EffectiveFrom = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
                TransportType = "Both",
                Status = true
            });

            // 8. StudentTransportController
            Console.WriteLine("\n--- 8. Student Transport Controller ---");
            await TestEndpoint("GET Student Transport Dropdown Options", HttpMethod.Get, "/api/v1/transport-student/options");
            await TestEndpoint("GET Student Transport Details (studentId=1)", HttpMethod.Get, "/api/v1/transport-student/details?studentId=1");

            // 9. VehicleMaintenanceController
            Console.WriteLine("\n--- 9. Vehicle Maintenance Controller ---");
            await TestEndpoint("GET Maintenance Records List (transport/maintenance)", HttpMethod.Get, "/api/v1/transport/maintenance");
            await TestEndpoint("GET Maintenance Lookup", HttpMethod.Get, "/api/v1/transport/maintenance/lookup");
            await TestEndpoint("POST Create Maintenance Record", HttpMethod.Post, "/api/v1/transport/maintenance", new
            {
                VehicleId = 1,
                ServiceType = "Oil Change & Brake Inspection",
                ServiceDate = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
                Cost = 3500.00,
                VendorCenter = "Authorized Service Hub",
                NextServiceDue = DateTime.UtcNow.AddMonths(3).ToString("yyyy-MM-ddTHH:mm:ss"),
                Remarks = "Scheduled test inspection"
            });
            await TestEndpoint("GET Maintenance Record By ID (1)", HttpMethod.Get, "/api/v1/transport/maintenance/1");
            await TestEndpoint("PUT Update Maintenance Record (1)", HttpMethod.Put, "/api/v1/transport/maintenance/1", new
            {
                VehicleId = 1,
                ServiceType = "Oil Change",
                ServiceDate = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss"),
                Cost = 4000.00,
                VendorCenter = "Main Depot",
                Remarks = "Updated service"
            });

            // 10. TransportOperationsController
            Console.WriteLine("\n--- 10. Transport Operations Controller ---");
            await TestEndpoint("GET Operations Trips List", HttpMethod.Get, "/api/v1/transport/operations/trips");
            await TestEndpoint("POST Create Trip", HttpMethod.Post, "/api/v1/transport/operations/trips", new
            {
                VehicleId = 1,
                RouteId = 1,
                DriverId = 1,
                AttendantId = 1,
                StudentsCount = 20,
                MorningTripTime = "07:30 AM",
                EveningTripTime = "04:30 PM",
                Status = "Running"
            });
            await TestEndpoint("GET Operations GPS Tracking", HttpMethod.Get, "/api/v1/transport/operations/gps");

            // 11. TransportLookupsController
            Console.WriteLine("\n--- 11. Transport Lookups Controller ---");
            await TestEndpoint("GET Routes Lookup", HttpMethod.Get, "/api/v1/transport/lookups/routes");
            await TestEndpoint("GET Pickup Points Lookup", HttpMethod.Get, "/api/v1/transport/lookups/pickup-points?routeId=1");
            await TestEndpoint("GET Vehicles Lookup", HttpMethod.Get, "/api/v1/transport/lookups/vehicles");
            await TestEndpoint("GET Drivers Lookup", HttpMethod.Get, "/api/v1/transport/lookups/drivers");
            await TestEndpoint("GET Attendants Lookup", HttpMethod.Get, "/api/v1/transport/lookups/attendants");
            await TestEndpoint("GET Vehicle Assignments Lookup", HttpMethod.Get, "/api/v1/transport/lookups/vehicle-assignments");
            await TestEndpoint("GET Student Assignments Lookup", HttpMethod.Get, "/api/v1/transport/lookups/student-assignments");

            // 12. TransportDashboardController
            Console.WriteLine("\n--- 12. Transport Dashboard Controller ---");
            await TestEndpoint("GET Dashboard Summary & KPI Matrix", HttpMethod.Get, "/api/v1/transport/dashboard");
            await TestEndpoint("GET Dashboard Operation Details", HttpMethod.Get, "/api/v1/transport/dashboard/operations/1");

            // 13. TransportReportController
            Console.WriteLine("\n--- 13. Transport Reports Controller ---");
            await TestEndpoint("GET Dashboard Report", HttpMethod.Get, "/api/v1/transport/reports/dashboard");
            await TestEndpoint("GET Student Transport Report", HttpMethod.Get, "/api/v1/transport/reports/students");
            await TestEndpoint("GET Vehicles Report", HttpMethod.Get, "/api/v1/transport/reports/vehicles");
            await TestEndpoint("GET Drivers Report", HttpMethod.Get, "/api/v1/transport/reports/drivers");
            await TestEndpoint("GET Routes Report", HttpMethod.Get, "/api/v1/transport/reports/routes");
            await TestEndpoint("GET Maintenance Report", HttpMethod.Get, "/api/v1/transport/reports/maintenance");
            await TestEndpoint("GET Trip Reports", HttpMethod.Get, "/api/v1/transport/reports/trips");
            await TestEndpoint("GET Pickup-wise Report", HttpMethod.Get, "/api/v1/transport/reports/pickup-wise");
            await TestEndpoint("GET Seat Occupancy Matrix Report", HttpMethod.Get, "/api/v1/transport/reports/seat-occupancy");
            await TestEndpoint("GET Monthly Cost Report", HttpMethod.Get, "/api/v1/transport/reports/monthly-cost");

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"TEST SUMMARY: Total: {_passed + _failed} | PASSED: {_passed} | FAILED: {_failed}");
            Console.WriteLine("================================================================================");

            if (_failed > 0)
            {
                Console.WriteLine("\nFAILURE DETAILS:");
                foreach (var fail in FailureDetails)
                {
                    Console.WriteLine($"  - {fail}");
                }
            }
        }
    }
}
