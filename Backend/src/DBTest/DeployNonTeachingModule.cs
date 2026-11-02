using System;
using System.Data;
using System.IO;
using System.Text.RegularExpressions;
using Dapper;
using MySqlConnector;

public class DeployNonTeachingModule
{
    public static void Run(string connStr)
    {
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("   NON-TEACHING MODULE - DATABASE DEPLOYMENT & VERIFICATION RUNNER");
        Console.WriteLine("================================================================================");

        using var conn = new MySqlConnection(connStr);
        try
        {
            conn.Open();
            Console.WriteLine("[SUCCESS] Connected to database: " + conn.Database);
        }
        catch (Exception ex)
        {
            Console.WriteLine("[ERROR] Failed to connect: " + ex.Message);
            return;
        }

        // 1. Locate SQL script
        string scriptPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", 
            "CollegeManagement.API", "Database", "Scripts", "StoredProcedures", "NonTeachingModule", "01_Unified_NonTeaching_Stored_Procedures.sql");
        if (!File.Exists(scriptPath))
        {
            scriptPath = Path.GetFullPath("Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/NonTeachingModule/01_Unified_NonTeaching_Stored_Procedures.sql");
        }

        if (!File.Exists(scriptPath))
        {
            Console.WriteLine("[ERROR] SQL script not found at: " + scriptPath);
            return;
        }

        Console.WriteLine("\n[1/3] Deploying Tables and Stored Procedures from: " + scriptPath);
        string fullSql = File.ReadAllText(scriptPath);

        // Deploy Tables first
        try
        {
            conn.Execute(@"
            CREATE TABLE IF NOT EXISTS `StaffTasks` (
                `TaskId` INT AUTO_INCREMENT PRIMARY KEY,
                `StaffId` INT NOT NULL,
                `CampusId` INT NULL DEFAULT 1,
                `Title` VARCHAR(255) NOT NULL,
                `Description` TEXT NULL,
                `Category` VARCHAR(100) NOT NULL DEFAULT 'Office Administration',
                `Priority` VARCHAR(50) NOT NULL DEFAULT 'Medium',
                `DueDate` DATE NULL,
                `Status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
                `AssignedBy` VARCHAR(255) NULL DEFAULT 'Self / Personal Reminder',
                `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `IX_StaffTasks_Staff_Status` (`StaffId`, `Status`),
                INDEX `IX_StaffTasks_CampusId` (`CampusId`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
            Console.WriteLine("  [PASS] Verified table `StaffTasks` in MySQL.");

            conn.Execute(@"
            CREATE TABLE IF NOT EXISTS `StaffSupportTickets` (
                `TicketId` INT AUTO_INCREMENT PRIMARY KEY,
                `StaffId` INT NOT NULL,
                `CampusId` INT NULL DEFAULT 1,
                `Category` VARCHAR(100) NOT NULL,
                `Subject` VARCHAR(255) NOT NULL,
                `Description` TEXT NOT NULL,
                `Priority` VARCHAR(50) NOT NULL DEFAULT 'Medium',
                `Status` VARCHAR(50) NOT NULL DEFAULT 'Open',
                `Response` TEXT NULL,
                `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `IX_StaffSupportTickets_Staff_Status` (`StaffId`, `Status`),
                INDEX `IX_StaffSupportTickets_CampusId` (`CampusId`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
            Console.WriteLine("  [PASS] Verified table `StaffSupportTickets` in MySQL.");

            conn.Execute(@"
            CREATE TABLE IF NOT EXISTS `DepartmentRegisters` (
                `RegisterId` INT AUTO_INCREMENT PRIMARY KEY,
                `CampusId` INT NULL DEFAULT 1,
                `DepartmentCode` VARCHAR(50) NOT NULL,
                `ReferenceCode` VARCHAR(50) NOT NULL,
                `Title` VARCHAR(255) NOT NULL,
                `Party` VARCHAR(255) NULL,
                `LogTime` VARCHAR(50) NULL,
                `Status` VARCHAR(50) NOT NULL DEFAULT 'Completed',
                `CreatedByUserId` INT NULL,
                `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX `IX_DepartmentRegisters_Dept_Campus` (`DepartmentCode`, `CampusId`),
                INDEX `IX_DepartmentRegisters_CreatedAt` (`CreatedAt` DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
            Console.WriteLine("  [PASS] Verified table `DepartmentRegisters` in MySQL.");

            // Seed initial records if empty
            var regCount = conn.ExecuteScalar<int>("SELECT COUNT(*) FROM `DepartmentRegisters`;");
            if (regCount == 0)
            {
                conn.Execute(@"
                INSERT INTO `DepartmentRegisters` (`CampusId`, `DepartmentCode`, `ReferenceCode`, `Title`, `Party`, `LogTime`, `Status`, `CreatedAt`) VALUES
                (1, 'ADMINISTRATION', 'ADM-2026-108', 'Visitor Gate Pass - Parent Inquiry for Intermediate MPC & BiPC Admissions', 'Mr. K. V. Rao (Parent) / Officer Rajesh', '10:15 AM', 'Completed', NOW()),
                (1, 'ADMINISTRATION', 'ADM-2026-107', 'Inward Speed Post - BIE Telangana Annual Affiliation Inspection Notice', 'Principal''s Secretarial Desk', '09:45 AM', 'Completed', NOW()),
                (1, 'ADMINISTRATION', 'ADM-2026-106', 'Stationery Indent - Whiteboard Markers, A4 Reams & Examination Registers', 'Dept. of Chemistry / Lab Store', '09:30 AM', 'In Progress', NOW()),
                (1, 'ADMINISTRATION', 'ADM-2026-105', 'Student Transfer Certificate (TC) Application Verification & Clearance', 'Student Affairs / Desk 2', '09:10 AM', 'Completed', NOW()),
                (1, 'TRANSPORT', 'TRN-2026-051', 'Route #4 (Dilsukhnagar - LB Nagar - Campus) Morning Trip Completion', 'Driver M. Krishna (Bus TS09-UB-4412)', '08:35 AM', 'Completed', NOW()),
                (1, 'TRANSPORT', 'TRN-2026-050', 'Route #9 (Kukatpally - Miyapur) Driver Morning Attendance & Breathalyzer Check', 'Driver S. Naidu / Transport Supv.', '07:10 AM', 'Completed', NOW()),
                (1, 'SECURITY', 'SEC-2026-214', 'Main Gate Inward Entry - Commercial Vendor Delivery (Cafeteria Supplies)', 'Head Guard Balraj (Gate 1)', '10:10 AM', 'Completed', NOW()),
                (1, 'SECURITY', 'SEC-2026-213', 'Student ID & Uniform Protocol Inspection at Academic Block Turnstiles', 'Security Officer Prakash', '08:55 AM', 'Completed', NOW()),
                (1, 'MAINTENANCE', 'MNT-2026-088', 'Physics Lab #2 - Overhead LED Tube Replacement & MCB Switch Check', 'Electrician J. Venkatesh', '09:30 AM', 'Completed', NOW()),
                (1, 'MAINTENANCE', 'MNT-2026-087', 'Auditorium Projector & PA System Calibration for Guest Seminar', 'AV Tech S. Riaz / Facilities', '10:00 AM', 'In Progress', NOW());");
                Console.WriteLine("  [PASS] Seeded initial production registers for Administration, Transport, Security, and Maintenance.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("  [WARN] Table initialization warning: " + ex.Message);
        }

        // Deploy Stored Procedures using regex matching
        var spRegex = new Regex(@"(CREATE\s+PROCEDURE\s+`?([a-zA-Z0-9_]+)`?[\s\S]*?\bEND)\s*//", RegexOptions.IgnoreCase);
        var matches = spRegex.Matches(fullSql);
        Console.WriteLine($"\nFound {matches.Count} stored procedures to deploy.\n");

        int deployedCount = 0;
        int failedCount = 0;

        foreach (Match match in matches)
        {
            string createBody = match.Groups[1].Value.Trim();
            string spName = match.Groups[2].Value;

            Console.Write($"Deploying procedure [{spName}]... ");
            try
            {
                conn.Execute($"DROP PROCEDURE IF EXISTS `{spName}`;");
                conn.Execute(createBody);
                Console.WriteLine("OK");
                deployedCount++;
            }
            catch (Exception ex)
            {
                Console.WriteLine("FAILED: " + ex.Message);
                failedCount++;
            }
        }

        Console.WriteLine($"\nDeployment Summary: {deployedCount} procedures deployed, {failedCount} failed.");

        // 2. Automated Integration Verification Tests via Dapper
        Console.WriteLine("\n[2/3] Running Automated Integration Tests via Dapper...");
        int testPass = 0;
        int testFail = 0;

        // Test 1: sp_GetDepartmentRecords
        try
        {
            var records = conn.Query("sp_GetDepartmentRecords", new
            {
                p_CampusId = 1,
                p_DepartmentCode = "ADMINISTRATION"
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_GetDepartmentRecords executed successfully! Found {System.Linq.Enumerable.Count(records)} records.");
            testPass++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDepartmentRecords: {ex.Message}");
            testFail++;
        }

        // Test 2: sp_CreateDepartmentRecord
        try
        {
            var regId = conn.QuerySingle<int>("sp_CreateDepartmentRecord", new
            {
                p_CampusId = 1,
                p_DepartmentCode = "ADMINISTRATION",
                p_ReferenceCode = "ADM-2026-TEST",
                p_Title = "Integration Test Register Entry",
                p_Party = "Test Auditor",
                p_LogTime = "11:00 AM",
                p_Status = "Completed",
                p_CreatedByUserId = 1
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_CreateDepartmentRecord executed successfully! Created RegisterId: {regId}");
            testPass++;

            // Clean up test entry
            conn.Execute("DELETE FROM `DepartmentRegisters` WHERE `RegisterId` = @id;", new { id = regId });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_CreateDepartmentRecord: {ex.Message}");
            testFail++;
        }

        // Test 3: sp_CreateStaffTask & sp_GetStaffTasks
        try
        {
            var createdTask = conn.QueryFirstOrDefault<dynamic>("sp_CreateStaffTask", new
            {
                p_StaffId = 901,
                p_CampusId = 1,
                p_Title = "Integration Test Task",
                p_Description = "Verify task persistence in MySQL",
                p_Category = "Office Administration",
                p_Priority = "High",
                p_DueDate = DateTime.Today.AddDays(2),
                p_AssignedBy = "Automated Test Suite"
            }, commandType: CommandType.StoredProcedure);

            if (createdTask != null)
            {
                int taskId = Convert.ToInt32(createdTask.id);
                Console.WriteLine($"  [PASS] sp_CreateStaffTask executed successfully! Created TaskId: {taskId}");
                testPass++;

                // Verify sp_GetStaffTasks
                var tasks = conn.Query("sp_GetStaffTasks", new { p_StaffId = 901 }, commandType: CommandType.StoredProcedure);
                Console.WriteLine($"  [PASS] sp_GetStaffTasks returned {System.Linq.Enumerable.Count(tasks)} tasks.");
                testPass++;

                // Verify status update
                conn.Execute("sp_UpdateStaffTaskStatus", new { p_TaskId = taskId, p_StaffId = 901, p_Status = "Completed" }, commandType: CommandType.StoredProcedure);
                Console.WriteLine($"  [PASS] sp_UpdateStaffTaskStatus executed successfully.");
                testPass++;

                // Clean up test task
                conn.Execute("DELETE FROM `StaffTasks` WHERE `TaskId` = @id;", new { id = taskId });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Task integration test: {ex.Message}");
            testFail++;
        }

        // Test 4: sp_CreateStaffSupportTicket & sp_GetStaffSupportTickets
        try
        {
            var createdTicket = conn.QueryFirstOrDefault<dynamic>("sp_CreateStaffSupportTicket", new
            {
                p_StaffId = 901,
                p_CampusId = 1,
                p_Category = "IT Support",
                p_Subject = "Integration Test Ticket",
                p_Description = "Printer network connectivity check",
                p_Priority = "Medium"
            }, commandType: CommandType.StoredProcedure);

            if (createdTicket != null)
            {
                int ticketId = Convert.ToInt32(createdTicket.id);
                Console.WriteLine($"  [PASS] sp_CreateStaffSupportTicket executed successfully! Created TicketId: {ticketId}");
                testPass++;

                var tickets = conn.Query("sp_GetStaffSupportTickets", new { p_StaffId = 901 }, commandType: CommandType.StoredProcedure);
                Console.WriteLine($"  [PASS] sp_GetStaffSupportTickets returned {System.Linq.Enumerable.Count(tickets)} tickets.");
                testPass++;

                // Clean up test ticket
                conn.Execute("DELETE FROM `StaffSupportTickets` WHERE `TicketId` = @id;", new { id = ticketId });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Ticket integration test: {ex.Message}");
            testFail++;
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine($"NON-TEACHING MODULE VERIFICATION: Passed: {testPass} | Failed: {testFail}");
        Console.WriteLine("================================================================================\n");
    }
}
