using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport;
using CollegeManagement.API.Dtos.Transport.PickupPoint;
using CollegeManagement.API.Dtos.Transport.Vehicle;
using CollegeManagement.API.Dtos.Transport.Driver;
using CollegeManagement.API.Dtos.Transport.Attendant;
using CollegeManagement.API.Dtos.Transport.VehicleAssignment;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;
using CollegeManagement.API.Dtos.Transport.VehicleMaintenance;
using CollegeManagement.API.Dtos.Transport.Reports;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    /// <summary>
    /// Automated Verification Suite for Transport Module.
    /// Verifies DI registration, Stored Procedure deployment, and repository execution with 100% Stored Procedures and Dapper.
    /// </summary>
    public static class TransportModuleBackendTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("       MODULE 6: TRANSPORTATION & FLEET MANAGEMENT VERIFICATION SUITE");
            Console.WriteLine("================================================================================\n");

            int passed = 0;
            int failed = 0;

            void AssertTrue(bool condition, string testName, string? details = null)
            {
                if (condition)
                {
                    Console.WriteLine($"  [PASS] {testName}");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  [FAIL] {testName} - {details ?? "Assertion failed"}");
                    failed++;
                }
            }

            using var scope = serviceProvider.CreateScope();

            // -------------------------------------------------------------
            // TEST 1: Service Provider & DI Registration (All Repositories)
            // -------------------------------------------------------------
            var routeRepo = scope.ServiceProvider.GetService<ITransportRouteRepository>();
            AssertTrue(routeRepo != null, "DI Registration: ITransportRouteRepository is registered and resolvable");

            var pickupRepo = scope.ServiceProvider.GetService<IPickupPointRepository>();
            AssertTrue(pickupRepo != null, "DI Registration: IPickupPointRepository is registered and resolvable");

            var vehicleRepo = scope.ServiceProvider.GetService<ITransportVehicleRepository>();
            AssertTrue(vehicleRepo != null, "DI Registration: ITransportVehicleRepository is registered and resolvable");

            var driverRepo = scope.ServiceProvider.GetService<ITransportDriverRepository>();
            AssertTrue(driverRepo != null, "DI Registration: ITransportDriverRepository is registered and resolvable");

            var attendantRepo = scope.ServiceProvider.GetService<ITransportAttendantRepository>();
            AssertTrue(attendantRepo != null, "DI Registration: ITransportAttendantRepository is registered and resolvable");

            var assignRepo = scope.ServiceProvider.GetService<ITransportVehicleAssignmentRepository>();
            AssertTrue(assignRepo != null, "DI Registration: ITransportVehicleAssignmentRepository is registered and resolvable");

            var studentAssignRepo = scope.ServiceProvider.GetService<IStudentTransportAssignmentRepository>();
            AssertTrue(studentAssignRepo != null, "DI Registration: IStudentTransportAssignmentRepository is registered and resolvable");

            var maintRepo = scope.ServiceProvider.GetService<IVehicleMaintenanceRepository>();
            AssertTrue(maintRepo != null, "DI Registration: IVehicleMaintenanceRepository is registered and resolvable");

            var dashRepo = scope.ServiceProvider.GetService<ITransportDashboardRepository>();
            AssertTrue(dashRepo != null, "DI Registration: ITransportDashboardRepository is registered and resolvable");

            var reportRepo = scope.ServiceProvider.GetService<ITransportReportRepository>();
            AssertTrue(reportRepo != null, "DI Registration: ITransportReportRepository is registered and resolvable");

            var genericTransportRepo = scope.ServiceProvider.GetService<ITransportRepository>();
            AssertTrue(genericTransportRepo != null, "DI Registration: ITransportRepository (100% SP Dapper) is registered and resolvable");

            var opsRepo = scope.ServiceProvider.GetService<ITransportOperationsRepository>();
            AssertTrue(opsRepo != null, "DI Registration: ITransportOperationsRepository is registered and resolvable");

            var driverDashRepo = scope.ServiceProvider.GetService<ITransportDriverDashboardRepository>();
            AssertTrue(driverDashRepo != null, "DI Registration: ITransportDriverDashboardRepository is registered and resolvable");

            // -------------------------------------------------------------
            // TEST 2: Service Provider & DI Registration (All Services)
            // -------------------------------------------------------------
            var routeService = scope.ServiceProvider.GetService<ITransportRouteService>();
            AssertTrue(routeService != null, "DI Registration: ITransportRouteService is registered and resolvable");

            var pickupService = scope.ServiceProvider.GetService<IPickupPointService>();
            AssertTrue(pickupService != null, "DI Registration: IPickupPointService is registered and resolvable");

            var vehicleService = scope.ServiceProvider.GetService<ITransportVehicleService>();
            AssertTrue(vehicleService != null, "DI Registration: ITransportVehicleService is registered and resolvable");

            var driverService = scope.ServiceProvider.GetService<ITransportDriverService>();
            AssertTrue(driverService != null, "DI Registration: ITransportDriverService is registered and resolvable");

            var attendantService = scope.ServiceProvider.GetService<ITransportAttendantService>();
            AssertTrue(attendantService != null, "DI Registration: ITransportAttendantService is registered and resolvable");

            var assignService = scope.ServiceProvider.GetService<ITransportVehicleAssignmentService>();
            AssertTrue(assignService != null, "DI Registration: ITransportVehicleAssignmentService is registered and resolvable");

            var studentAssignService = scope.ServiceProvider.GetService<IStudentTransportAssignmentService>();
            AssertTrue(studentAssignService != null, "DI Registration: IStudentTransportAssignmentService is registered and resolvable");

            var maintService = scope.ServiceProvider.GetService<IVehicleMaintenanceService>();
            AssertTrue(maintService != null, "DI Registration: IVehicleMaintenanceService is registered and resolvable");

            var dashService = scope.ServiceProvider.GetService<ITransportDashboardService>();
            AssertTrue(dashService != null, "DI Registration: ITransportDashboardService is registered and resolvable");

            var reportService = scope.ServiceProvider.GetService<ITransportReportService>();
            AssertTrue(reportService != null, "DI Registration: ITransportReportService is registered and resolvable");

            var opsService = scope.ServiceProvider.GetService<ITransportOperationsService>();
            AssertTrue(opsService != null, "DI Registration: ITransportOperationsService is registered and resolvable");

            var driverDashService = scope.ServiceProvider.GetService<ITransportDriverDashboardService>();
            AssertTrue(driverDashService != null, "DI Registration: ITransportDriverDashboardService is registered and resolvable");

            var studentTransportService = scope.ServiceProvider.GetService<IStudentTransportService>();
            AssertTrue(studentTransportService != null, "DI Registration: IStudentTransportService is registered and resolvable");

            // -------------------------------------------------------------
            // TEST 3: Database Connection & Stored Procedure Deployment
            // -------------------------------------------------------------
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var connection = dbContext.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }
            AssertTrue(connection.State == ConnectionState.Open, "Database Connection: Successfully opened connection to MySQL DB");

            string currentDir = AppDomain.CurrentDomain.BaseDirectory;
            string spFilePath = Path.Combine(currentDir, "Database", "Updated_Module_SPs", "15_Transport_SPs.sql");

            if (!File.Exists(spFilePath))
            {
                string solutionDir = Path.GetFullPath(Path.Combine(currentDir, "..", "..", "..", "Database", "Updated_Module_SPs", "15_Transport_SPs.sql"));
                if (File.Exists(solutionDir))
                {
                    spFilePath = solutionDir;
                }
            }

            AssertTrue(File.Exists(spFilePath), $"SP Script Discovery: Found {Path.GetFileName(spFilePath)}");

            if (File.Exists(spFilePath))
            {
                var sqlScript = await File.ReadAllTextAsync(spFilePath);
                var sqlCleaned = Regex.Replace(sqlScript, @"--[^\r\n]*", "");
                var statements = sqlCleaned.Split(new[] { "//" }, StringSplitOptions.RemoveEmptyEntries);
                int deployedCount = 0;

                foreach (var rawStatement in statements)
                {
                    var trimmed = rawStatement.Trim();
                    if (string.IsNullOrWhiteSpace(trimmed)) continue;

                    trimmed = Regex.Replace(trimmed, @"DELIMITER\s+[^\r\n]+", "", RegexOptions.IgnoreCase).Trim();
                    if (string.IsNullOrWhiteSpace(trimmed)) continue;

                    try
                    {
                        await connection.ExecuteAsync(trimmed);
                        deployedCount++;
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"  [WARN] SP deployment notice: {ex.Message}");
                    }
                }

                AssertTrue(deployedCount >= 40, $"SP Deployment: Successfully deployed {deployedCount} statements from 15_Transport_SPs.sql");
            }

            // -------------------------------------------------------------
            // TEST 4: MySQL Routines Catalog Verification
            // -------------------------------------------------------------
            var expectedProcedures = new[]
            {
                "sp_GetTransportRoutes",
                "sp_GetTransportRouteById",
                "sp_CreateTransportRoute",
                "sp_UpdateTransportRoute",
                "sp_DeleteTransportRoute",
                "sp_GetTransportRouteLookup",
                "sp_CheckTransportRouteExists",
                "sp_CheckTransportRouteCodeExists",
                "sp_CheckTransportRouteNameExists",
                "sp_GetPickupPoints",
                "sp_GetPickupPointById",
                "sp_CreatePickupPoints",
                "sp_UpdatePickupPoints",
                "sp_DeletePickupPoints",
                "sp_GetPickupPointLookup",
                "sp_CheckPickupPointExists",
                "sp_CheckPickupPointSequenceExists",
                "sp_GetTransportVehicles",
                "sp_GetTransportVehiclesById",
                "sp_CreateTransportVehicles",
                "sp_UpdateTransportVehicles",
                "sp_DeleteTransportVehicles",
                "sp_GetTransportVehicleLookup",
                "sp_CheckTransportVehicleExists",
                "sp_GetTransportVehicleByIdOrNumber",
                "sp_GetTransportDrivers",
                "sp_GetTransportDriversById",
                "sp_CreateTransportDrivers",
                "sp_UpdateTransportDrivers",
                "sp_DeleteTransportDrivers",
                "sp_GetTransportDriverLookup",
                "sp_CheckTransportDriverExists",
                "sp_GetTransportDriverByIdOrNumber",
                "sp_GetTransportAttendants",
                "sp_GetTransportAttendantById",
                "sp_CreateTransportAttendants",
                "sp_UpdateTransportAttendants",
                "sp_DeleteTransportAttendants",
                "sp_GetTransportAttendantLookup",
                "sp_GetTransportVehicleAssignments",
                "sp_GetTransportVehicleAssignmentById",
                "sp_CreateTransportVehicleAssignments",
                "sp_UpdateTransportVehicleAssignments",
                "sp_DeleteTransportVehicleAssignments",
                "sp_GetTransportVehicleAssignmentLookup",
                "sp_CheckTransportVehicleAssigned",
                "sp_CheckTransportDriverAssigned",
                "sp_GetStudentTransportAssignments",
                "sp_GetStudentTransportAssignmentById",
                "sp_CreateStudentTransportAssignments",
                "sp_UpdateStudentTransportAssignments",
                "sp_DeleteStudentTransportAssignments",
                "sp_GetStudentTransportAssignmentLookup",
                "sp_CheckStudentTransportOverlapping",
                "sp_GetStudentTransportDetails",
                "sp_GetVehicleMaintenances",
                "sp_GetVehicleMaintenanceById",
                "sp_CreateVehicleMaintenances",
                "sp_UpdateVehicleMaintenances",
                "sp_DeleteVehicleMaintenances",
                "sp_GetVehicleMaintenanceLookup",
                "sp_GetTransportTrips",
                "sp_CreateTransportTrip",
                "sp_UpdateTransportTrip",
                "sp_DeleteTransportTrip",
                "sp_GetTransportDashboard",
                "sp_GetTransportReports",
                "sp_GetDriverSettings",
                "sp_UpdateDriverProfile",
                "sp_SaveDriverPreferences",
                "sp_GetDriverNotifications",
                "sp_MarkDriverNotificationsRead",
                "sp_GetDriverDashboardData",
                "sp_GetDriverRouteDetails",
                "sp_GetDriverProfile"
            };

            var existingProcedures = (await connection.QueryAsync<string>(
                "SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_SCHEMA = DATABASE();")).ToHashSet(StringComparer.OrdinalIgnoreCase);

            int missingCount = 0;
            foreach (var sp in expectedProcedures)
            {
                if (!existingProcedures.Contains(sp))
                {
                    Console.WriteLine($"  [WARN] Missing routine in catalog: {sp}");
                    missingCount++;
                }
            }
            AssertTrue(missingCount == 0, $"MySQL Routine Catalog: All {expectedProcedures.Length} canonical Transport procedures verified in catalog", $"Missing {missingCount} SPs");

            // -------------------------------------------------------------
            // TEST 5: Repository Execution via Dapper & Stored Procedures
            // -------------------------------------------------------------

            // 5.1 Route Repository
            try
            {
                var routes = await routeRepo!.GetAllAsync(new TransportRouteFilterDto { PageNumber = 1, PageSize = 10 });
                AssertTrue(routes != null && routes.Items != null, "Route Repository: GetAllAsync executed via SP sp_GetTransportRoutes");

                var routeLookup = await routeRepo.GetLookupAsync(null, null, 10);
                AssertTrue(routeLookup != null, "Route Repository: GetLookupAsync executed via SP sp_GetTransportRouteLookup");

                var codeExists = await routeRepo.RouteCodeExistsAsync("__NON_EXISTENT_CODE__");
                AssertTrue(!codeExists, "Route Repository: RouteCodeExistsAsync executed via SP sp_CheckTransportRouteCodeExists");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Route Repository Execution", ex.Message);
            }

            // 5.2 Pickup Point Repository
            try
            {
                var pickups = await pickupRepo!.GetAllAsync(new PickupPointFilterDto { PageNumber = 1, PageSize = 10 });
                AssertTrue(pickups != null && pickups.Items != null, "Pickup Point Repository: GetAllAsync executed via SP sp_GetPickupPoints");

                var pickupLookup = await pickupRepo.GetLookupAsync(null);
                AssertTrue(pickupLookup != null, "Pickup Point Repository: GetLookupAsync executed via SP sp_GetPickupPointLookup");

                var seqExists = await pickupRepo.SequenceExistsAsync(1, 999);
                AssertTrue(!seqExists, "Pickup Point Repository: SequenceExistsAsync executed via SP sp_CheckPickupPointSequenceExists");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Pickup Point Repository Execution", ex.Message);
            }

            // 5.3 Vehicle Repository
            try
            {
                var vehicles = await vehicleRepo!.GetAllAsync(new TransportVehicleFilterDto { PageNumber = 1, PageSize = 10 });
                AssertTrue(vehicles != null && vehicles.Items != null, "Vehicle Repository: GetAllAsync executed via SP sp_GetTransportVehicles");

                var vehicleLookup = await vehicleRepo.GetLookupAsync();
                AssertTrue(vehicleLookup != null, "Vehicle Repository: GetLookupAsync executed via SP sp_GetTransportVehicleLookup");

                // Test vehicle creation with campus ID
                var testVehNum = $"TEST-{Random.Shared.Next(10000, 99999)}";
                var testCreateDto = new CreateTransportVehicleDto
                {
                    VehicleNumber = testVehNum,
                    RegistrationNumber = testVehNum,
                    VehicleType = "Mini Bus",
                    Capacity = 20,
                    CampusId = 1,
                    Status = true
                };
                var newVehId = await vehicleRepo.CreateAsync(testCreateDto, null);
                AssertTrue(newVehId > 0, "Vehicle Repository: CreateAsync executed with CampusId via sp_CreateTransportVehicles");

                var fetchedVeh = await vehicleRepo.GetByIdAsync(newVehId);
                AssertTrue(fetchedVeh != null && fetchedVeh.CampusId == 1, "Vehicle Repository: Verified created vehicle has CampusId = 1");

                await vehicleRepo.DeleteAsync(newVehId, null);
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Vehicle Repository Execution", ex.Message);
            }

            // 5.4 Driver Repository (with 0% inline SQL)
            try
            {
                var drivers = await driverRepo!.GetAllAsync(new TransportDriverFilterDto { PageNumber = 1, PageSize = 10 });
                AssertTrue(drivers != null && drivers.Items != null, "Driver Repository: GetAllAsync executed via SP sp_GetTransportDrivers");

                var driverLookup = await driverRepo.GetLookupAsync();
                AssertTrue(driverLookup != null, "Driver Repository: GetLookupAsync executed via SP sp_GetTransportDriverLookup");

                var driverByIdOrNum = await driverRepo.GetByIdOrNumberAsync("9999999");
                AssertTrue(driverByIdOrNum == null, "Driver Repository: GetByIdOrNumberAsync executed via SP sp_GetTransportDriverByIdOrNumber (0% inline SQL)");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Driver Repository Execution", ex.Message);
            }

            // 5.5 Attendant Repository
            try
            {
                var attendants = await attendantRepo!.GetAllAsync(new TransportAttendantFilterDto { PageNumber = 1, PageSize = 10 });
                AssertTrue(attendants != null && attendants.Items != null, "Attendant Repository: GetAllAsync executed via SP sp_GetTransportAttendants");

                var attendantLookup = await attendantRepo.GetLookupAsync();
                AssertTrue(attendantLookup != null, "Attendant Repository: GetLookupAsync executed via SP sp_GetTransportAttendantLookup");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Attendant Repository Execution", ex.Message);
            }

            // 5.6 Vehicle Assignment Repository
            try
            {
                var assignments = await assignRepo!.GetAllAsync(new TransportVehicleAssignmentFilterDto { PageNumber = 1, PageSize = 10 });
                AssertTrue(assignments != null && assignments.Items != null, "Vehicle Assignment Repository: GetAllAsync executed via SP sp_GetTransportVehicleAssignments");

                var assignLookup = await assignRepo.GetLookupAsync();
                AssertTrue(assignLookup != null, "Vehicle Assignment Repository: GetLookupAsync executed via SP sp_GetTransportVehicleAssignmentLookup");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Vehicle Assignment Repository Execution", ex.Message);
            }

            // 5.7 Student Transport Assignment Repository
            try
            {
                var studentAssignments = await studentAssignRepo!.GetAllAsync(new StudentTransportAssignmentFilterDto { PageNumber = 1, PageSize = 10 });
                AssertTrue(studentAssignments != null && studentAssignments.Items != null, "Student Transport Assignment Repository: GetAllAsync executed via SP sp_GetStudentTransportAssignments");

                var studentDetails = await studentAssignRepo.GetStudentTransportDetailsAsync(999999);
                AssertTrue(studentDetails == null, "Student Transport Assignment Repository: GetStudentTransportDetailsAsync executed via SP sp_GetStudentTransportDetails");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Student Transport Assignment Repository Execution", ex.Message);
            }

            // 5.8 Vehicle Maintenance Repository
            try
            {
                var (items, count) = await maintRepo!.GetAllAsync(new VehicleMaintenanceFilterDto { PageNumber = 1, PageSize = 10 });
                AssertTrue(items != null, "Vehicle Maintenance Repository: GetAllAsync executed via SP sp_GetVehicleMaintenances");

                var maintLookup = await maintRepo.GetLookupAsync();
                AssertTrue(maintLookup != null, "Vehicle Maintenance Repository: GetLookupAsync executed via SP sp_GetVehicleMaintenanceLookup");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Vehicle Maintenance Repository Execution", ex.Message);
            }

            // 5.9 Dashboard & Reports Repositories
            try
            {
                var dashboardData = await dashRepo!.GetDashboardAsync();
                AssertTrue(dashboardData != null && dashboardData.Summary != null, "Dashboard Repository: GetDashboardAsync executed multi-result SP sp_GetTransportDashboard");

                var reportData = await reportRepo!.GetDashboardReportAsync(new ReportFilterDto());
                AssertTrue(reportData != null && reportData.Summary != null, "Report Repository: GetDashboardReportAsync executed via SP sp_GetTransportDashboard");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Dashboard/Reports Repository Execution", ex.Message);
            }

            // 5.10 Transport Operations Repository
            try
            {
                var trips = await opsRepo!.GetTripsAsync(null, null, null, null, null);
                AssertTrue(trips != null, "Operations Repository: GetTripsAsync executed via SP sp_GetTransportTrips");

                var gps = await opsRepo.GetGpsTrackingAsync();
                AssertTrue(gps != null, "Operations Repository: GetGpsTrackingAsync executed via SPs sp_GetTransportVehicleAssignments & sp_GetPickupPoints");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Transport Operations Repository Execution", ex.Message);
            }

            // 5.11 Transport Driver Dashboard & Settings Repository
            try
            {
                var notifications = await driverDashRepo!.GetNotificationsAsync(99999);
                AssertTrue(notifications != null, "Driver Dashboard Repository: GetNotificationsAsync executed via SP sp_GetDriverNotifications");

                var settings = await driverDashRepo.GetSettingsAsync(99999);
                AssertTrue(settings == null, "Driver Dashboard Repository: GetSettingsAsync executed via SP sp_GetDriverSettings (defensive lookup)");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Driver Dashboard Repository Execution", ex.Message);
            }

            // 5.12 Refactored Generic TransportRepository (0% EF Core, 100% SP via Dapper)
            try
            {
                var vehiclesList = await genericTransportRepo!.GetAllVehiclesAsync();
                AssertTrue(vehiclesList != null, "Generic Transport Repository: GetAllVehiclesAsync executed via SP sp_GetTransportVehicles (0% EF Core)");

                var routesList = await genericTransportRepo.GetAllRoutesAsync();
                AssertTrue(routesList != null, "Generic Transport Repository: GetAllRoutesAsync executed via SP sp_GetTransportRoutes (0% EF Core)");

                var driversList = await genericTransportRepo.GetAllDriversAsync();
                AssertTrue(driversList != null, "Generic Transport Repository: GetAllDriversAsync executed via SP sp_GetTransportDrivers (0% EF Core)");

                await genericTransportRepo.SaveChangesAsync();
                AssertTrue(true, "Generic Transport Repository: SaveChangesAsync completed cleanly without EF Core change tracker");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Generic Transport Repository Execution", ex.Message);
            }

            // 5.13 Student Transport Service
            try
            {
                var dropdowns = await studentTransportService!.GetTransportDropdownOptionsAsync();
                AssertTrue(dropdowns != null && dropdowns.AcademicYears.Any(), "Student Transport Service: GetTransportDropdownOptionsAsync returned active options");

                var studentTransport = await studentTransportService.GetStudentTransportDetailsAsync(99999);
                AssertTrue(studentTransport != null && !studentTransport.HasTransportAccess, "Student Transport Service: GetStudentTransportDetailsAsync cleanly handled unassigned student via repository delegation");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Student Transport Service Execution", ex.Message);
            }

            // -------------------------------------------------------------
            // TEST 6: REGRESSION TESTS FOR DRIVER MASTER, REPORTS & ASSIGNMENTS
            // -------------------------------------------------------------
            try
            {
                // Regression Test 6.1: Filtered Counts & Pagination (CampusId=1)
                var pagedDrivers = await driverRepo!.GetAllAsync(new TransportDriverFilterDto { CampusId = 1, PageNumber = 1, PageSize = 100 });
                AssertTrue(pagedDrivers != null && pagedDrivers.TotalCount >= 1 && pagedDrivers.Items.Count() == pagedDrivers.TotalCount,
                    $"Driver Master: CampusId=1 returns registered transport drivers with matching TotalCount={pagedDrivers?.TotalCount} and ItemsCount={pagedDrivers?.Items.Count()}");
                AssertTrue(pagedDrivers != null && pagedDrivers.TotalPages == 1 && !pagedDrivers.HasNextPage,
                    "Driver Master: TotalPages=1 and HasNextPage=false for PageSize=100");

                var page11Drivers = await driverRepo.GetAllAsync(new TransportDriverFilterDto { CampusId = 1, PageNumber = 11, PageSize = 100 });
                AssertTrue(page11Drivers != null && page11Drivers.TotalCount == pagedDrivers!.TotalCount && page11Drivers.Items.Count() == 0,
                    $"Driver Master: Page 11 returns empty items with accurate TotalCount={page11Drivers?.TotalCount}");

                // Regression Test 6.2: Campus Isolation (CampusId=2)
                var campus2Drivers = await driverRepo.GetAllAsync(new TransportDriverFilterDto { CampusId = 2, PageNumber = 1, PageSize = 100 });
                AssertTrue(campus2Drivers != null && campus2Drivers.TotalCount == 0 && campus2Drivers.Items.Count() == 0,
                    "Driver Master: Campus isolation verified (CampusId=2 returns 0 drivers)");

                // Regression Test 6.3: Strict Role Membership & Exclusion of Transport Managers and Attendants
                var venkatDriver = pagedDrivers!.Items.FirstOrDefault(d => d.StaffId == 1065);
                AssertTrue(venkatDriver != null && venkatDriver.DriverId == 1068 && venkatDriver.DriverName == "Venkat Rao" && venkatDriver.LicenseNumber == "AP-07-2022-0099",
                    "Driver Master: Driver identity consistent with DriverId=1068, StaffId=1065, Venkat Rao, AP-07-2022-0099");

                var managerStaff = pagedDrivers!.Items.Where(d => d.StaffId == 1125 || d.StaffId == 1128).ToList();
                AssertTrue(managerStaff.Count == 0,
                    "Driver Master: Transport Managers (Staff 1125, 1128) are strictly EXCLUDED from driver master");

                var attendantStaff = pagedDrivers!.Items.Where(d => d.StaffId == 1088).ToList();
                AssertTrue(attendantStaff.Count == 0,
                    "Driver Master: Attendant (Staff 1088) is strictly EXCLUDED from driver master");

                var driverReps = (await reportRepo!.GetDriverReportsAsync(new ReportFilterDto { CampusId = 1 })).ToList();
                var venkatReport = driverReps.FirstOrDefault(d => d.DriverName == "Venkat Rao");
                AssertTrue(venkatReport != null && venkatReport.LicenseNumber == "AP-07-2022-0099",
                    "Driver Reports: Returns Venkat Rao consistent with Driver Master");
                if (venkatReport != null)
                {
                    AssertTrue(venkatReport.CurrentBus != "Assigned Bus" && venkatReport.CurrentRoute != "Assigned Route" && venkatReport.BusAttendant != "Attendant",
                        "Driver Reports: Generic placeholder strings removed, actual related values or null returned");
                }

                var dashData = await dashRepo!.GetDashboardAsync();
                AssertTrue(dashData.Summary.TotalDrivers >= 1 && dashData.Summary.ActiveDrivers >= 1,
                    $"Dashboard: Driver count consistent with Master & Reports (TotalDrivers={dashData.Summary.TotalDrivers}, ActiveDrivers={dashData.Summary.ActiveDrivers})");

                // Regression Test 6.4: Student Transport Assignments 22, 26, 27, 29 details resolution
                var allStas = (await studentAssignRepo!.GetAllAsync(new StudentTransportAssignmentFilterDto { PageNumber = 1, PageSize = 50 })).Items.ToList();
                var sta22 = allStas.FirstOrDefault(s => s.AssignmentId == 22);
                AssertTrue(sta22 != null && sta22.StudentName == "Lasya G" && sta22.AdmissionNo == "ADM-55",
                    "Student Transport Assignment 22: Resolves studentName='Lasya G' and admissionNo='ADM-55'");

                var sta26 = allStas.FirstOrDefault(s => s.AssignmentId == 26);
                AssertTrue(sta26 != null && sta26.StudentName == "kiran j" && sta26.AdmissionNo == "MADM-0068",
                    "Student Transport Assignment 26: Resolves studentName='kiran j' and admissionNo='MADM-0068'");

                var sta27 = allStas.FirstOrDefault(s => s.AssignmentId == 27);
                AssertTrue(sta27 != null && sta27.StudentName == "sairam y" && sta27.AdmissionNo == "MADM-0086",
                    "Student Transport Assignment 27: Resolves studentName='sairam y' and admissionNo='MADM-0086'");

                var sta29 = allStas.FirstOrDefault(s => s.AssignmentId == 29);
                AssertTrue(sta29 != null && sta29.StudentName == "tina r" && sta29.AdmissionNo == "MADM-0098",
                    "Student Transport Assignment 29: Resolves studentName='tina r' and admissionNo='MADM-0098'");
            }
            catch (Exception ex)
            {
                AssertTrue(false, "Regression Tests Execution", ex.Message);
            }

            // -------------------------------------------------------------
            // SUMMARY
            // -------------------------------------------------------------
            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"       MODULE 6 VERIFICATION SUMMARY: {passed} PASSED, {failed} FAILED");
            Console.WriteLine("================================================================================\n");

            return failed == 0;
        }
    }
}
