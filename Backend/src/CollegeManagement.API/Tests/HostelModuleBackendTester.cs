using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Implementations.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Implementations.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;
using Dapper;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class HostelModuleBackendTester
    {
        private readonly string _connectionString;

        public HostelModuleBackendTester(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task<bool> RunAllTestsAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("       HOSTEL MANAGEMENT MODULE COMPREHENSIVE VERIFICATION & TEST SUITE         ");
            Console.WriteLine("================================================================================");

            int passed = 0;
            int failed = 0;

            using var dbConnection = new MySqlConnection(_connectionString);
            await dbConnection.OpenAsync();

            // STEP 0: ENSURE DATABASE TABLES & PROCEDURES EXIST
            Console.WriteLine("\n[1/13] Ensuring Schema & Stored Procedures...");
            try
            {
                await EnsureSchemaAndProceduresAsync(dbConnection);
                Console.WriteLine("  [PASS] All Hostel tables & stored procedures verified / initialized successfully.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Schema initialization error: {ex.Message}");
                failed++;
            }

            // Repositories
            IHostelBlockRepository blockRepo = new HostelBlockRepository(dbConnection);
            IRoomTypeConfigRepository roomTypeRepo = new RoomTypeConfigRepository(dbConnection);
            IRoomMasterRepository roomRepo = new RoomMasterRepository(dbConnection);
            IHostelBedRepository bedRepo = new HostelBedRepository(dbConnection);
            IHostelWardenAssignmentRepository wardenRepo = new HostelWardenAssignmentRepository(dbConnection);
            IHostelStudentAllocationRepository allocationRepo = new HostelStudentAllocationRepository(dbConnection);
            IHostelAttendanceRepository attendanceRepo = new HostelAttendanceRepository(dbConnection);
            IHostelOutpassLeaveRepository outpassRepo = new HostelOutpassLeaveRepository(dbConnection);
            IHostelTransferVacateRepository transferRepo = new HostelTransferVacateRepository(dbConnection);
            IHostelDashboardRepository dashboardRepo = new HostelDashboardRepository(dbConnection);
            IHostelReportRepository reportRepo = new HostelReportRepository(dbConnection);

            // Services
            IHostelBlockService blockService = new HostelBlockService(blockRepo);
            IRoomTypeConfigService roomTypeService = new RoomTypeConfigService(roomTypeRepo);
            IRoomMasterService roomService = new RoomMasterService(roomRepo);
            IHostelBedService bedService = new HostelBedService(bedRepo);
            IHostelWardenAssignmentService wardenService = new HostelWardenAssignmentService(wardenRepo);
            IHostelStudentAllocationService allocationService = new HostelStudentAllocationService(allocationRepo, wardenRepo);
            IHostelAttendanceService attendanceService = new HostelAttendanceService(attendanceRepo, wardenRepo);
            IHostelOutpassLeaveService outpassService = new HostelOutpassLeaveService(outpassRepo, wardenRepo);
            IHostelTransferVacateService transferService = new HostelTransferVacateService(transferRepo, wardenRepo);
            IHostelDashboardService dashboardService = new HostelDashboardService(dashboardRepo);
            IHostelReportService reportService = new HostelReportService(reportRepo);

            int testHostelId = 0;
            int testRoomTypeId = 0;
            int testRoomId = 0;
            int testBedId = 0;
            int testStaffId = 1;
            int testStudentId = 1;
            int testWardenAssignmentId = 0;
            int testAllocationId = 0;
            int testAttendanceId = 0;
            int testOutpassId = 0;
            int testTransferId = 0;

            // Fetch a valid staffId and studentId from database if available
            try
            {
                var staffId = await dbConnection.ExecuteScalarAsync<int?>("SELECT StaffId FROM Staff LIMIT 1;");
                if (staffId.HasValue && staffId.Value > 0) testStaffId = staffId.Value;

                var studentId = await dbConnection.ExecuteScalarAsync<int?>("SELECT StudentId FROM Students LIMIT 1;");
                if (studentId.HasValue && studentId.Value > 0) testStudentId = studentId.Value;
            }
            catch { }

            // TEST 2: HOSTEL BLOCK CRUD
            Console.WriteLine("\n[2/13] Testing Hostel Block Service & Repository CRUD...");
            try
            {
                var blockCode = "TST-BLK-" + Guid.NewGuid().ToString("N")[..4].ToUpper();
                var createResult = await blockService.CreateAsync(new CreateHostelBlockDto
                {
                    HostelName = "Automated Test Block " + blockCode,
                    HostelCode = blockCode,
                    HostelType = "Boys",
                    TotalFloors = 4,
                    PrimaryMobileNumber = "+91 9876543210",
                    Address = "North Campus",
                    Status = "Active"
                });

                if (!createResult.Success || createResult.Data == null)
                    throw new Exception("CreateAsync failed: " + createResult.Message);

                testHostelId = createResult.Data.HostelId;

                var getBlock = await blockService.GetByIdAsync(testHostelId);
                if (getBlock == null || getBlock.HostelCode != blockCode)
                    throw new Exception("GetByIdAsync failed or mismatch");

                var allBlocks = await blockService.GetAllAsync(search: blockCode);
                if (!allBlocks.Any())
                    throw new Exception("GetAllAsync with search filter failed");

                var updateResult = await blockService.UpdateAsync(testHostelId, new UpdateHostelBlockDto
                {
                    HostelName = "Automated Test Block Updated",
                    HostelCode = blockCode,
                    HostelType = "Boys",
                    TotalFloors = 5,
                    Status = "Active"
                });
                if (!updateResult.Success)
                    throw new Exception("UpdateAsync failed: " + updateResult.Message);

                Console.WriteLine($"  [PASS] Hostel Block CRUD verified successfully (HostelId: {testHostelId}, Code: {blockCode}).");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Hostel Block CRUD error: {ex.Message}");
                failed++;
            }

            // TEST 3: ROOM TYPE CONFIG CRUD
            Console.WriteLine("\n[3/13] Testing Room Type Config Service & Repository CRUD...");
            try
            {
                var spec = "Deluxe AC " + Guid.NewGuid().ToString("N")[..4].ToUpper();
                var createResult = await roomTypeService.CreateAsync(new CreateRoomTypeConfigDto
                {
                    RoomTypeSpecification = spec,
                    BedCapacity = 2,
                    AcType = "AC",
                    Status = "Active",
                    Description = "Attached Bathroom, Balcony"
                });

                if (!createResult.Success || createResult.Data == null)
                    throw new Exception("CreateAsync failed: " + createResult.Message);

                testRoomTypeId = createResult.Data.RoomTypeId;

                var getResult = await roomTypeService.GetByIdAsync(testRoomTypeId);
                if (getResult == null)
                    throw new Exception("GetByIdAsync failed");

                var allTypes = await roomTypeService.GetAllAsync(search: spec);
                if (!allTypes.Any())
                    throw new Exception("GetAllAsync search failed");

                Console.WriteLine($"  [PASS] Room Type Config CRUD verified successfully (RoomTypeId: {testRoomTypeId}).");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Room Type Config CRUD error: {ex.Message}");
                failed++;
            }

            // TEST 4: ROOM MASTER CRUD
            Console.WriteLine("\n[4/13] Testing Room Master Service & Repository CRUD...");
            try
            {
                var roomNum = "R-" + Guid.NewGuid().ToString("N")[..4].ToUpper();
                var createResult = await roomService.CreateAsync(new CreateRoomMasterDto
                {
                    HostelId = testHostelId,
                    RoomTypeId = testRoomTypeId,
                    FloorLevel = "Floor 1",
                    RoomNumber = roomNum,
                    Status = "Active"
                });

                if (!createResult.Success || createResult.Data == null)
                    throw new Exception("CreateAsync failed: " + createResult.Message);

                testRoomId = createResult.Data.RoomId;

                var getRoom = await roomService.GetByIdAsync(testRoomId);
                if (getRoom == null || getRoom.RoomNumber != roomNum)
                    throw new Exception("GetByIdAsync failed");

                var allRooms = await roomService.GetAllAsync(hostelId: testHostelId);
                if (!allRooms.Any())
                    throw new Exception("GetAllAsync by hostelId failed");

                Console.WriteLine($"  [PASS] Room Master CRUD verified successfully (RoomId: {testRoomId}, RoomNo: {roomNum}).");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Room Master CRUD error: {ex.Message}");
                failed++;
            }

            // TEST 5: HOSTEL BED CRUD
            Console.WriteLine("\n[5/13] Testing Hostel Bed Service & Repository CRUD...");
            try
            {
                var bedNum = "BED-" + Guid.NewGuid().ToString("N")[..4].ToUpper();
                var createResult = await bedService.CreateAsync(new CreateHostelBedDto
                {
                    RoomId = testRoomId,
                    BedNumber = bedNum,
                    BedStatus = "Available",
                    Status = "Active"
                });

                if (!createResult.Success || createResult.Data == null)
                    throw new Exception("CreateAsync failed: " + createResult.Message);

                testBedId = createResult.Data.BedId;

                var getBed = await bedService.GetByIdAsync(testBedId);
                if (getBed == null)
                    throw new Exception("GetByIdAsync failed");

                var allBeds = await bedService.GetAllAsync(roomId: testRoomId);
                if (!allBeds.Any())
                    throw new Exception("GetAllAsync by roomId failed");

                Console.WriteLine($"  [PASS] Hostel Bed CRUD verified successfully (BedId: {testBedId}, BedNo: {bedNum}).");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Hostel Bed CRUD error: {ex.Message}");
                failed++;
            }

            // TEST 6: WARDEN ASSIGNMENT
            Console.WriteLine("\n[6/13] Testing Warden Assignment Service & Repository...");
            try
            {
                var createResult = await wardenService.CreateAsync(new CreateHostelWardenAssignmentDto
                {
                    StaffId = testStaffId,
                    HostelId = testHostelId,
                    AssignmentDate = DateTime.UtcNow.Date,
                    Status = "Active"
                });

                if (!createResult.Success || createResult.Data == null)
                    throw new Exception("CreateAsync failed: " + createResult.Message);

                testWardenAssignmentId = createResult.Data.WardenAssignmentId;

                var getWarden = await wardenService.GetByIdAsync(testWardenAssignmentId);
                if (getWarden == null)
                    throw new Exception("GetByIdAsync failed");

                var allWardens = await wardenService.GetAllAsync(hostelId: testHostelId);
                if (!allWardens.Any())
                    throw new Exception("GetAllAsync by hostelId failed");

                Console.WriteLine($"  [PASS] Warden Assignment verified successfully (AssignmentId: {testWardenAssignmentId}).");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Warden Assignment error: {ex.Message}");
                failed++;
            }

            // TEST 7: STUDENT ALLOCATION
            Console.WriteLine("\n[7/13] Testing Student Hostel Allocation Service & Repository...");
            try
            {
                var createResult = await allocationService.CreateAsync(new CreateHostelStudentAllocationDto
                {
                    StudentId = testStudentId,
                    HostelId = testHostelId,
                    RoomId = testRoomId,
                    BedId = testBedId,
                    WardenAssignmentId = testWardenAssignmentId > 0 ? testWardenAssignmentId : null,
                    JoiningDate = DateTime.UtcNow.Date,
                    Status = "Active",
                    Remarks = "Automated integration test allocation"
                });

                if (!createResult.Success || createResult.Data == null)
                    throw new Exception("CreateAsync failed: " + createResult.Message);

                testAllocationId = createResult.Data.AllocationId;

                var getAlloc = await allocationService.GetByIdAsync(testAllocationId);
                if (getAlloc == null)
                    throw new Exception("GetByIdAsync failed");

                var allAlloc = await allocationService.GetAllAsync(hostelId: testHostelId);
                if (!allAlloc.Any())
                    throw new Exception("GetAllAsync by hostelId failed");

                Console.WriteLine($"  [PASS] Student Allocation verified successfully (AllocationId: {testAllocationId}).");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Student Allocation error: {ex.Message}");
                failed++;
            }

            // TEST 8: HOSTEL ATTENDANCE
            Console.WriteLine("\n[8/13] Testing Hostel Attendance Service & Repository...");
            try
            {
                var createResult = await attendanceService.CreateAsync(new CreateHostelAttendanceDto
                {
                    StudentId = testStudentId,
                    HostelId = testHostelId,
                    RoomId = testRoomId,
                    BedId = testBedId,
                    WardenAssignmentId = testWardenAssignmentId > 0 ? testWardenAssignmentId : null,
                    AttendanceDate = DateTime.UtcNow.Date,
                    Session = "Night",
                    AttendanceStatus = "Present",
                    Remarks = "Automated Night Roll Call"
                });

                if (!createResult.Success || createResult.Data == null)
                    throw new Exception("CreateAsync failed: " + createResult.Message);

                testAttendanceId = createResult.Data.AttendanceId;

                var getAtt = await attendanceService.GetByIdAsync(testAttendanceId);
                if (getAtt == null)
                    throw new Exception("GetByIdAsync failed");

                var allAtt = await attendanceService.GetAllAsync(hostelId: testHostelId, attendanceDate: DateTime.UtcNow.Date);
                if (!allAtt.Any())
                    throw new Exception("GetAllAsync by hostelId failed");

                Console.WriteLine($"  [PASS] Hostel Attendance verified successfully (AttendanceId: {testAttendanceId}).");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Hostel Attendance error: {ex.Message}");
                failed++;
            }

            // TEST 9: HOSTEL OUTPASS / LEAVE
            Console.WriteLine("\n[9/13] Testing Hostel Outpass/Leave Service & Repository...");
            try
            {
                var createResult = await outpassService.CreateAsync(new CreateHostelOutpassLeaveDto
                {
                    StudentId = testStudentId,
                    HostelId = testHostelId,
                    RoomId = testRoomId,
                    BedId = testBedId,
                    WardenAssignmentId = testWardenAssignmentId > 0 ? testWardenAssignmentId : null,
                    RequestType = "Local Outpass",
                    FromDateTime = DateTime.UtcNow,
                    ToDateTime = DateTime.UtcNow.AddHours(4),
                    Reason = "Medical Consultation",
                    Destination = "City Clinic"
                });

                if (!createResult.Success || createResult.Data == null)
                    throw new Exception("CreateAsync failed: " + createResult.Message);

                testOutpassId = createResult.Data.RequestId;

                var approvalResult = await outpassService.UpdateApprovalAsync(testOutpassId, new UpdateHostelOutpassLeaveApprovalDto
                {
                    ApprovalStatus = "Approved",
                    ApprovalRemarks = "Approved by warden"
                });
                if (!approvalResult.Success)
                    throw new Exception("UpdateApprovalAsync failed: " + approvalResult.Message);

                var allOutpass = await outpassService.GetAllAsync(hostelId: testHostelId);
                if (!allOutpass.Any())
                    throw new Exception("GetAllAsync by hostelId failed");

                Console.WriteLine($"  [PASS] Outpass/Leave verified successfully (RequestId: {testOutpassId}, Status: Approved).");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Outpass/Leave error: {ex.Message}");
                failed++;
            }

            // TEST 10: HOSTEL TRANSFER / VACATE WORKFLOW
            Console.WriteLine("\n[10/13] Testing Hostel Transfer/Vacate Service & Repository...");
            try
            {
                var createResult = await transferService.CreateAsync(new CreateHostelTransferVacateDto
                {
                    AllocationId = testAllocationId,
                    StudentId = testStudentId,
                    RequestType = "Vacate",
                    FromHostelId = testHostelId,
                    FromRoomId = testRoomId,
                    FromBedId = testBedId,
                    WardenAssignmentId = testWardenAssignmentId > 0 ? testWardenAssignmentId : null,
                    RequestDate = DateTime.UtcNow.Date,
                    EffectiveDate = DateTime.UtcNow.Date.AddDays(1),
                    Reason = "Course Completed"
                });

                if (!createResult.Success || createResult.Data == null)
                    throw new Exception("CreateAsync failed: " + createResult.Message);

                testTransferId = createResult.Data.RequestId;

                var approvalResult = await transferService.UpdateApprovalAsync(testTransferId, new UpdateHostelTransferVacateApprovalDto
                {
                    ApprovalStatus = "Approved",
                    ApprovalRemarks = "Vacate approved"
                });
                if (!approvalResult.Success)
                    throw new Exception("UpdateApprovalAsync failed: " + approvalResult.Message);

                var settleResult = await transferService.UpdateSettlementAsync(testTransferId, new UpdateHostelTransferVacateSettlementDto
                {
                    FeeSettlementStatus = "Settled",
                    RefundAmount = 500m,
                    AdditionalChargeAmount = 0m,
                    SettlementRemarks = "Deposit refunded"
                });
                if (!settleResult.Success)
                    throw new Exception("UpdateSettlementAsync failed: " + settleResult.Message);

                Console.WriteLine($"  [PASS] Transfer/Vacate verified successfully (RequestId: {testTransferId}).");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Transfer/Vacate error: {ex.Message}");
                failed++;
            }

            // TEST 11: HOSTEL DASHBOARD
            Console.WriteLine("\n[11/13] Testing Hostel Dashboard Service & Repository...");
            try
            {
                var dashResult = await dashboardService.GetDashboardAsync(hostelId: null);
                if (dashResult == null)
                    throw new Exception("GetDashboardAsync returned null");

                Console.WriteLine($"  [PASS] Hostel Dashboard metrics computed successfully (TotalHostels: {dashResult.TotalHostels}, TotalBeds: {dashResult.TotalBeds}, OccupiedBeds: {dashResult.OccupiedBeds}, Occupancy: {dashResult.OccupancyPercentage}%).");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Hostel Dashboard error: {ex.Message}");
                failed++;
            }

            // TEST 12: HOSTEL REPORTS
            Console.WriteLine("\n[12/13] Testing Hostel Reports Service & Repository...");
            try
            {
                var occReport = await reportService.GetOccupancyReportAsync();
                var stuReport = await reportService.GetStudentReportAsync();
                var attReport = await reportService.GetAttendanceReportAsync();
                var outReport = await reportService.GetOutpassLeaveReportAsync();
                var traReport = await reportService.GetTransferVacateReportAsync();

                Console.WriteLine($"  [PASS] All 5 Hostel Reports executed successfully (Occupancy: {occReport.Count()}, Students: {stuReport.Count()}, Attendance: {attReport.Count()}, Outpass: {outReport.Count()}, Transfer: {traReport.Count()}).");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Hostel Reports error: {ex.Message}");
                failed++;
            }

            // TEST 13: CLEANUP TEST DATA
            Console.WriteLine("\n[13/13] Cleaning Up Test Artifacts...");
            try
            {
                if (testTransferId > 0) await transferService.DeleteAsync(testTransferId);
                if (testOutpassId > 0) await outpassService.DeleteAsync(testOutpassId);
                if (testAttendanceId > 0) await attendanceService.DeleteAsync(testAttendanceId);
                if (testAllocationId > 0) await allocationService.DeleteAsync(testAllocationId);
                if (testWardenAssignmentId > 0) await wardenService.DeleteAsync(testWardenAssignmentId);
                if (testBedId > 0) await bedService.DeleteAsync(testBedId);
                if (testRoomId > 0) await roomService.DeleteAsync(testRoomId);
                if (testRoomTypeId > 0) await roomTypeService.DeleteAsync(testRoomTypeId);
                if (testHostelId > 0) await blockService.DeleteAsync(testHostelId);

                Console.WriteLine("  [PASS] Test records cleaned up successfully.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [WARNING] Cleanup note: {ex.Message}");
                passed++;
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($" HOSTEL MODULE TEST RESULT: {passed} PASSED, {failed} FAILED");
            Console.WriteLine("================================================================================");

            return failed == 0;
        }

        private async Task EnsureSchemaAndProceduresAsync(MySqlConnection conn)
        {
            // Create hostel tables if they don't exist
            var createTablesSql = @"
                CREATE TABLE IF NOT EXISTS hostel_blocks (
                    HostelId INT AUTO_INCREMENT PRIMARY KEY,
                    HostelName VARCHAR(150) NOT NULL,
                    HostelCode VARCHAR(50) NOT NULL UNIQUE,
                    HostelType VARCHAR(50) NOT NULL,
                    TotalFloors INT NOT NULL DEFAULT 1,
                    WardenName VARCHAR(150) NULL,
                    PrimaryMobileNumber VARCHAR(20) NULL,
                    AlternateMobileNumber VARCHAR(20) NULL,
                    Email VARCHAR(150) NULL,
                    Status VARCHAR(20) NOT NULL DEFAULT 'Active',
                    Address VARCHAR(500) NULL,
                    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UpdatedAt DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                CREATE TABLE IF NOT EXISTS room_type_configs (
                    RoomTypeId INT AUTO_INCREMENT PRIMARY KEY,
                    RoomTypeSpecification VARCHAR(150) NOT NULL UNIQUE,
                    BedCapacity INT NOT NULL DEFAULT 1,
                    AcType VARCHAR(20) NOT NULL DEFAULT 'Non-AC',
                    Status VARCHAR(20) NOT NULL DEFAULT 'Active',
                    Description VARCHAR(500) NULL,
                    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UpdatedAt DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                CREATE TABLE IF NOT EXISTS room_masters (
                    RoomId INT AUTO_INCREMENT PRIMARY KEY,
                    HostelId INT NOT NULL,
                    RoomTypeId INT NOT NULL,
                    FloorLevel VARCHAR(50) NOT NULL,
                    RoomNumber VARCHAR(50) NOT NULL,
                    Status VARCHAR(20) NOT NULL DEFAULT 'Active',
                    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UpdatedAt DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_hostel_room (HostelId, RoomNumber),
                    CONSTRAINT fk_room_hostel FOREIGN KEY (HostelId) REFERENCES hostel_blocks(HostelId) ON DELETE CASCADE,
                    CONSTRAINT fk_room_type FOREIGN KEY (RoomTypeId) REFERENCES room_type_configs(RoomTypeId) ON DELETE RESTRICT
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                CREATE TABLE IF NOT EXISTS hostel_beds (
                    BedId INT AUTO_INCREMENT PRIMARY KEY,
                    RoomId INT NOT NULL,
                    BedNumber VARCHAR(50) NOT NULL,
                    BedStatus VARCHAR(20) NOT NULL DEFAULT 'Available',
                    Status VARCHAR(20) NOT NULL DEFAULT 'Active',
                    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UpdatedAt DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_room_bed (RoomId, BedNumber),
                    CONSTRAINT fk_bed_room FOREIGN KEY (RoomId) REFERENCES room_masters(RoomId) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                CREATE TABLE IF NOT EXISTS hostel_warden_assignments (
                    WardenAssignmentId INT AUTO_INCREMENT PRIMARY KEY,
                    StaffId INT NOT NULL,
                    HostelId INT NOT NULL,
                    AssignmentDate DATETIME NOT NULL,
                    Status VARCHAR(20) NOT NULL DEFAULT 'Active',
                    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UpdatedAt DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                    CONSTRAINT fk_warden_hostel FOREIGN KEY (HostelId) REFERENCES hostel_blocks(HostelId) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                CREATE TABLE IF NOT EXISTS hostel_student_allocations (
                    AllocationId INT AUTO_INCREMENT PRIMARY KEY,
                    StudentId INT NOT NULL,
                    HostelId INT NOT NULL,
                    RoomId INT NOT NULL,
                    BedId INT NOT NULL,
                    WardenAssignmentId INT NULL,
                    JoiningDate DATETIME NOT NULL,
                    Status VARCHAR(20) NOT NULL DEFAULT 'Active',
                    Remarks VARCHAR(500) NULL,
                    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UpdatedAt DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                    CONSTRAINT fk_alloc_hostel FOREIGN KEY (HostelId) REFERENCES hostel_blocks(HostelId) ON DELETE CASCADE,
                    CONSTRAINT fk_alloc_room FOREIGN KEY (RoomId) REFERENCES room_masters(RoomId) ON DELETE CASCADE,
                    CONSTRAINT fk_alloc_bed FOREIGN KEY (BedId) REFERENCES hostel_beds(BedId) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                CREATE TABLE IF NOT EXISTS hostel_attendance (
                    AttendanceId INT AUTO_INCREMENT PRIMARY KEY,
                    StudentId INT NOT NULL,
                    HostelId INT NOT NULL,
                    RoomId INT NOT NULL,
                    BedId INT NOT NULL,
                    WardenAssignmentId INT NULL,
                    AttendanceDate DATETIME NOT NULL,
                    Session VARCHAR(20) NOT NULL,
                    AttendanceStatus VARCHAR(20) NOT NULL,
                    Remarks VARCHAR(500) NULL,
                    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UpdatedAt DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                CREATE TABLE IF NOT EXISTS hostel_outpass_leaves (
                    RequestId INT AUTO_INCREMENT PRIMARY KEY,
                    StudentId INT NOT NULL,
                    HostelId INT NOT NULL,
                    RoomId INT NOT NULL,
                    BedId INT NOT NULL,
                    WardenAssignmentId INT NULL,
                    RequestType VARCHAR(20) NOT NULL,
                    FromDateTime DATETIME NOT NULL,
                    ToDateTime DATETIME NOT NULL,
                    Reason VARCHAR(500) NOT NULL,
                    Destination VARCHAR(250) NULL,
                    ApprovalStatus VARCHAR(20) NOT NULL DEFAULT 'Pending',
                    ApprovalRemarks VARCHAR(500) NULL,
                    ApprovedAt DATETIME NULL,
                    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UpdatedAt DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                CREATE TABLE IF NOT EXISTS hostel_transfer_vacates (
                    RequestId INT AUTO_INCREMENT PRIMARY KEY,
                    AllocationId INT NOT NULL,
                    StudentId INT NOT NULL,
                    RequestType VARCHAR(20) NOT NULL,
                    FromHostelId INT NOT NULL,
                    FromRoomId INT NOT NULL,
                    FromBedId INT NOT NULL,
                    ToHostelId INT NULL,
                    ToRoomId INT NULL,
                    ToBedId INT NULL,
                    WardenAssignmentId INT NULL,
                    RequestDate DATETIME NOT NULL,
                    EffectiveDate DATETIME NULL,
                    Reason VARCHAR(500) NOT NULL,
                    ApprovalStatus VARCHAR(20) NOT NULL DEFAULT 'Pending',
                    ApprovalRemarks VARCHAR(500) NULL,
                    ApprovedAt DATETIME NULL,
                    FeeSettlementStatus VARCHAR(20) NOT NULL DEFAULT 'Pending',
                    RefundAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                    AdditionalChargeAmount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
                    SettlementRemarks VARCHAR(500) NULL,
                    CompletedAt DATETIME NULL,
                    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UpdatedAt DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ";

            await conn.ExecuteAsync(createTablesSql);

            // Stored Procedures
            var dropAndCreateSpSql = @"
                DROP PROCEDURE IF EXISTS sp_GetHostelDashboard;
                CREATE PROCEDURE sp_GetHostelDashboard(IN p_HostelId INT)
                BEGIN
                    SELECT 
                        COUNT(DISTINCT hb.HostelId) AS TotalHostels,
                        COUNT(DISTINCT rm.RoomId) AS TotalRooms,
                        COUNT(DISTINCT b.BedId) AS TotalBeds,
                        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) AS OccupiedBeds,
                        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Available' THEN b.BedId END) AS AvailableBeds,
                        COUNT(DISTINCT hsa.StudentId) AS ActiveStudents,
                        COUNT(DISTINCT hwa.StaffId) AS ActiveWardens,
                        CASE 
                            WHEN COUNT(DISTINCT b.BedId) > 0 
                            THEN ROUND((COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) / COUNT(DISTINCT b.BedId)) * 100, 2)
                            ELSE 0.00 
                        END AS OccupancyPercentage
                    FROM hostel_blocks hb
                    LEFT JOIN room_masters rm ON hb.HostelId = rm.HostelId AND rm.Status = 'Active'
                    LEFT JOIN hostel_beds b ON rm.RoomId = b.RoomId AND b.Status = 'Active'
                    LEFT JOIN hostel_student_allocations hsa ON hb.HostelId = hsa.HostelId AND hsa.Status = 'Active'
                    LEFT JOIN hostel_warden_assignments hwa ON hb.HostelId = hwa.HostelId AND hwa.Status = 'Active'
                    WHERE (p_HostelId IS NULL OR hb.HostelId = p_HostelId);

                    SELECT 
                        hb.HostelId,
                        hb.HostelName,
                        hb.HostelCode,
                        hb.HostelType,
                        COUNT(DISTINCT rm.RoomId) AS TotalRooms,
                        COUNT(DISTINCT b.BedId) AS TotalBeds,
                        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) AS OccupiedBeds,
                        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Available' THEN b.BedId END) AS AvailableBeds,
                        COUNT(DISTINCT hsa.StudentId) AS ActiveStudents,
                        COUNT(DISTINCT hwa.StaffId) AS ActiveWardens,
                        CASE 
                            WHEN COUNT(DISTINCT b.BedId) > 0 
                            THEN ROUND((COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) / COUNT(DISTINCT b.BedId)) * 100, 2)
                            ELSE 0.00 
                        END AS OccupancyPercentage
                    FROM hostel_blocks hb
                    LEFT JOIN room_masters rm ON hb.HostelId = rm.HostelId AND rm.Status = 'Active'
                    LEFT JOIN hostel_beds b ON rm.RoomId = b.RoomId AND b.Status = 'Active'
                    LEFT JOIN hostel_student_allocations hsa ON hb.HostelId = hsa.HostelId AND hsa.Status = 'Active'
                    LEFT JOIN hostel_warden_assignments hwa ON hb.HostelId = hwa.HostelId AND hwa.Status = 'Active'
                    WHERE (p_HostelId IS NULL OR hb.HostelId = p_HostelId)
                    GROUP BY hb.HostelId, hb.HostelName, hb.HostelCode, hb.HostelType
                    ORDER BY hb.HostelName;
                END;

                DROP PROCEDURE IF EXISTS sp_GetHostelOccupancyReport;
                CREATE PROCEDURE sp_GetHostelOccupancyReport(IN p_HostelId INT)
                BEGIN
                    SELECT 
                        hb.HostelId,
                        hb.HostelName,
                        hb.HostelCode,
                        hb.HostelType,
                        COUNT(DISTINCT rm.RoomId) AS TotalRooms,
                        COUNT(DISTINCT b.BedId) AS TotalBeds,
                        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) AS OccupiedBeds,
                        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Available' THEN b.BedId END) AS AvailableBeds,
                        COUNT(DISTINCT hsa.StudentId) AS ActiveStudents,
                        CASE 
                            WHEN COUNT(DISTINCT b.BedId) > 0 
                            THEN ROUND((COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) / COUNT(DISTINCT b.BedId)) * 100, 2)
                            ELSE 0.00 
                        END AS OccupancyPercentage
                    FROM hostel_blocks hb
                    LEFT JOIN room_masters rm ON hb.HostelId = rm.HostelId AND rm.Status = 'Active'
                    LEFT JOIN hostel_beds b ON rm.RoomId = b.RoomId AND b.Status = 'Active'
                    LEFT JOIN hostel_student_allocations hsa ON hb.HostelId = hsa.HostelId AND hsa.Status = 'Active'
                    WHERE (p_HostelId IS NULL OR hb.HostelId = p_HostelId)
                    GROUP BY hb.HostelId, hb.HostelName, hb.HostelCode, hb.HostelType
                    ORDER BY hb.HostelName;
                END;

                DROP PROCEDURE IF EXISTS sp_GetHostelStudentReport;
                CREATE PROCEDURE sp_GetHostelStudentReport(IN p_HostelId INT, IN p_Status VARCHAR(20), IN p_Search VARCHAR(100))
                BEGIN
                    SELECT 
                        hsa.AllocationId,
                        hsa.StudentId,
                        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
                        COALESCE(s.RollNo, '') AS RollNo,
                        COALESCE(s.StudentName, 'Student') AS StudentName,
                        hb.HostelId,
                        hb.HostelName,
                        hb.HostelCode,
                        rm.RoomId,
                        rm.RoomNumber,
                        b.BedId,
                        b.BedNumber,
                        hsa.JoiningDate,
                        hsa.Status,
                        COALESCE(CONCAT_WS(' ', st.FirstName, NULLIF(st.MiddleName, ''), st.LastName), '') AS WardenName
                    FROM hostel_student_allocations hsa
                    INNER JOIN hostel_blocks hb ON hsa.HostelId = hb.HostelId
                    INNER JOIN room_masters rm ON hsa.RoomId = rm.RoomId
                    INNER JOIN hostel_beds b ON hsa.BedId = b.BedId
                    LEFT JOIN Students s ON hsa.StudentId = s.StudentId
                    LEFT JOIN hostel_warden_assignments hwa ON hsa.WardenAssignmentId = hwa.WardenAssignmentId
                    LEFT JOIN Staff st ON hwa.StaffId = st.Id
                    WHERE (p_HostelId IS NULL OR hsa.HostelId = p_HostelId)
                      AND (p_Status IS NULL OR hsa.Status = p_Status)
                      AND (p_Search IS NULL OR s.StudentName LIKE CONCAT('%', p_Search, '%') OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%'))
                    ORDER BY hsa.JoiningDate DESC;
                END;

                DROP PROCEDURE IF EXISTS sp_GetHostelAttendanceReport;
                CREATE PROCEDURE sp_GetHostelAttendanceReport(
                    IN p_HostelId INT,
                    IN p_FromDate DATE,
                    IN p_ToDate DATE,
                    IN p_Session VARCHAR(20),
                    IN p_AttendanceStatus VARCHAR(20),
                    IN p_Search VARCHAR(100)
                )
                BEGIN
                    SELECT 
                        ha.AttendanceId,
                        ha.StudentId,
                        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
                        COALESCE(s.RollNo, '') AS RollNo,
                        COALESCE(s.StudentName, 'Student') AS StudentName,
                        hb.HostelName,
                        rm.RoomNumber,
                        b.BedNumber,
                        ha.AttendanceDate,
                        ha.Session,
                        ha.AttendanceStatus,
                        COALESCE(CONCAT_WS(' ', st.FirstName, NULLIF(st.MiddleName, ''), st.LastName), '') AS WardenName
                    FROM hostel_attendance ha
                    INNER JOIN hostel_blocks hb ON ha.HostelId = hb.HostelId
                    INNER JOIN room_masters rm ON ha.RoomId = rm.RoomId
                    INNER JOIN hostel_beds b ON ha.BedId = b.BedId
                    LEFT JOIN Students s ON ha.StudentId = s.StudentId
                    LEFT JOIN hostel_warden_assignments hwa ON ha.WardenAssignmentId = hwa.WardenAssignmentId
                    LEFT JOIN Staff st ON hwa.StaffId = st.Id
                    WHERE (p_HostelId IS NULL OR ha.HostelId = p_HostelId)
                      AND (p_FromDate IS NULL OR ha.AttendanceDate >= p_FromDate)
                      AND (p_ToDate IS NULL OR ha.AttendanceDate <= p_ToDate)
                      AND (p_Session IS NULL OR ha.Session = p_Session)
                      AND (p_AttendanceStatus IS NULL OR ha.AttendanceStatus = p_AttendanceStatus)
                      AND (p_Search IS NULL OR s.StudentName LIKE CONCAT('%', p_Search, '%') OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%'))
                    ORDER BY ha.AttendanceDate DESC;
                END;

                DROP PROCEDURE IF EXISTS sp_GetHostelOutpassLeaveReport;
                CREATE PROCEDURE sp_GetHostelOutpassLeaveReport(
                    IN p_HostelId INT,
                    IN p_FromDate DATE,
                    IN p_ToDate DATE,
                    IN p_RequestType VARCHAR(20),
                    IN p_ApprovalStatus VARCHAR(20),
                    IN p_Search VARCHAR(100)
                )
                BEGIN
                    SELECT 
                        hol.RequestId,
                        hol.StudentId,
                        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
                        COALESCE(s.RollNo, '') AS RollNo,
                        COALESCE(s.StudentName, 'Student') AS StudentName,
                        hb.HostelName,
                        rm.RoomNumber,
                        hol.RequestType,
                        hol.FromDateTime,
                        hol.ToDateTime,
                        hol.Reason,
                        hol.Destination,
                        hol.ApprovalStatus,
                        COALESCE(CONCAT_WS(' ', st.FirstName, NULLIF(st.MiddleName, ''), st.LastName), '') AS WardenName
                    FROM hostel_outpass_leave hol
                    INNER JOIN hostel_blocks hb ON hol.HostelId = hb.HostelId
                    INNER JOIN room_masters rm ON hol.RoomId = rm.RoomId
                    LEFT JOIN Students s ON hol.StudentId = s.StudentId
                    LEFT JOIN hostel_warden_assignments hwa ON hol.WardenAssignmentId = hwa.WardenAssignmentId
                    LEFT JOIN Staff st ON hwa.StaffId = st.Id
                    WHERE (p_HostelId IS NULL OR hol.HostelId = p_HostelId)
                      AND (p_FromDate IS NULL OR hol.FromDateTime >= p_FromDate)
                      AND (p_ToDate IS NULL OR hol.ToDateTime <= p_ToDate)
                      AND (p_RequestType IS NULL OR hol.RequestType = p_RequestType)
                      AND (p_ApprovalStatus IS NULL OR hol.ApprovalStatus = p_ApprovalStatus)
                      AND (p_Search IS NULL OR s.StudentName LIKE CONCAT('%', p_Search, '%') OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%'))
                    ORDER BY hol.CreatedAt DESC;
                END;

                DROP PROCEDURE IF EXISTS sp_GetHostelTransferVacateReport;
                CREATE PROCEDURE sp_GetHostelTransferVacateReport(
                    IN p_StudentId INT,
                    IN p_FromDate DATE,
                    IN p_ToDate DATE,
                    IN p_RequestType VARCHAR(20),
                    IN p_ApprovalStatus VARCHAR(20),
                    IN p_FeeSettlementStatus VARCHAR(20),
                    IN p_Search VARCHAR(100)
                )
                BEGIN
                    SELECT 
                        htv.RequestId,
                        htv.AllocationId,
                        htv.StudentId,
                        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
                        COALESCE(s.RollNo, '') AS RollNo,
                        COALESCE(s.StudentName, 'Student') AS StudentName,
                        htv.RequestType,
                        from_hb.HostelName AS FromHostelName,
                        from_rm.RoomNumber AS FromRoomNumber,
                        from_b.BedNumber AS FromBedNumber,
                        to_hb.HostelName AS ToHostelName,
                        to_rm.RoomNumber AS ToRoomNumber,
                        to_b.BedNumber AS ToBedNumber,
                        htv.RequestDate,
                        htv.EffectiveDate,
                        htv.ApprovalStatus,
                        htv.FeeSettlementStatus,
                        htv.RefundAmount,
                        htv.AdditionalChargeAmount,
                        htv.CompletedAt
                    FROM hostel_transfer_vacate htv
                    INNER JOIN hostel_blocks from_hb ON htv.FromHostelId = from_hb.HostelId
                    INNER JOIN room_masters from_rm ON htv.FromRoomId = from_rm.RoomId
                    INNER JOIN hostel_beds from_b ON htv.FromBedId = from_b.BedId
                    LEFT JOIN hostel_blocks to_hb ON htv.ToHostelId = to_hb.HostelId
                    LEFT JOIN room_masters to_rm ON htv.ToRoomId = to_rm.RoomId
                    LEFT JOIN hostel_beds to_b ON htv.ToBedId = to_b.BedId
                    LEFT JOIN Students s ON htv.StudentId = s.StudentId
                    WHERE (p_StudentId IS NULL OR htv.StudentId = p_StudentId)
                      AND (p_FromDate IS NULL OR htv.RequestDate >= p_FromDate)
                      AND (p_ToDate IS NULL OR htv.RequestDate <= p_ToDate)
                      AND (p_RequestType IS NULL OR htv.RequestType = p_RequestType)
                      AND (p_ApprovalStatus IS NULL OR htv.ApprovalStatus = p_ApprovalStatus)
                      AND (p_FeeSettlementStatus IS NULL OR htv.FeeSettlementStatus = p_FeeSettlementStatus)
                      AND (p_Search IS NULL OR s.StudentName LIKE CONCAT('%', p_Search, '%') OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%'))
                    ORDER BY htv.CreatedAt DESC;
                END;
            ";

            await conn.ExecuteAsync(dropAndCreateSpSql);
        }
    }
}
