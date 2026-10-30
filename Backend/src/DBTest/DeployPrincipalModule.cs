using System;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Dapper;
using MySqlConnector;

public class DeployPrincipalModule
{
    public static void Run(string connStr)
    {
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("   PRINCIPAL MODULE - DATABASE DEPLOYMENT & VERIFICATION RUNNER");
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
            "CollegeManagement.API", "Database", "Scripts", "StoredProcedures", "PrincipalModule", "01_Unified_Principal_Stored_Procedures.sql");
        if (!File.Exists(scriptPath))
        {
            scriptPath = Path.GetFullPath("Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/PrincipalModule/01_Unified_Principal_Stored_Procedures.sql");
        }

        if (!File.Exists(scriptPath))
        {
            Console.WriteLine("[ERROR] SQL script not found at: " + scriptPath);
            return;
        }

        Console.WriteLine("\n[1/3] Deploying Principal Stored Procedures from: " + scriptPath);
        string fullSql = File.ReadAllText(scriptPath);

        // Ensure CampusNotices table exists
        try
        {
            string tableSql = @"
            CREATE TABLE IF NOT EXISTS `CampusNotices` (
                `NoticeId` INT AUTO_INCREMENT PRIMARY KEY,
                `CampusId` INT NOT NULL DEFAULT 1,
                `Title` VARCHAR(255) NOT NULL,
                `Content` TEXT NOT NULL,
                `Category` VARCHAR(100) NOT NULL DEFAULT 'Administrative',
                `Priority` VARCHAR(50) NOT NULL DEFAULT 'Normal',
                `TargetAudience` VARCHAR(100) NOT NULL DEFAULT 'General / Campus-wide',
                `Publisher` VARCHAR(150) NOT NULL DEFAULT 'Principal Office',
                `PublisherRole` VARCHAR(100) NOT NULL DEFAULT 'Principal',
                `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
                `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                INDEX `IX_CampusNotices_Campus_Audience` (`CampusId`, `TargetAudience`, `IsActive`),
                INDEX `IX_CampusNotices_CreatedAt` (`CreatedAt` DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
            
            conn.Execute(tableSql);
            Console.WriteLine("  [PASS] Verified table `CampusNotices` in MySQL.");
        }
        catch (Exception ex)
        {
            Console.WriteLine("  [WARN] CampusNotices table check: " + ex.Message);
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

        // Test 1: sp_Notice_Create
        int testNoticeId = 0;
        try
        {
            testNoticeId = conn.QuerySingle<int>("sp_Notice_Create", new
            {
                p_CampusId = 1,
                p_Title = "Integration Test Circular",
                p_Content = "Automatic test for principal notices.",
                p_Category = "Administrative",
                p_Priority = "Normal",
                p_TargetAudience = "All Staff",
                p_Publisher = "Principal Desk",
                p_PublisherRole = "Principal"
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_Notice_Create executed. Generated NoticeId: {testNoticeId}");
            testPass++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_Notice_Create: {ex.Message}");
            testFail++;
        }

        // Test 2: sp_Notice_GetByAudience
        try
        {
            var notices = conn.Query<dynamic>("sp_Notice_GetByAudience", new
            {
                p_CampusId = 1,
                p_TargetAudience = "All Staff",
                p_Limit = 5
            }, commandType: CommandType.StoredProcedure).ToList();

            Console.WriteLine($"  [PASS] sp_Notice_GetByAudience executed! Records returned: {notices.Count}");
            testPass++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_Notice_GetByAudience: {ex.Message}");
            testFail++;
        }

        // Test 3: sp_Staff_GetAssignedCampuses
        try
        {
            using var multi = conn.QueryMultiple("sp_Staff_GetAssignedCampuses", new
            {
                p_UserId = 1,
                p_StaffId = 0
            }, commandType: CommandType.StoredProcedure);

            var meta = multi.ReadFirstOrDefault<dynamic>();
            var campusIds = multi.Read<int>().ToList();

            Console.WriteLine($"  [PASS] sp_Staff_GetAssignedCampuses executed. StaffId: {meta?.StaffId}, PrimaryCampusId: {meta?.PrimaryCampusId}, AuthorizedCampuses count: {campusIds.Count}");
            testPass++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_Staff_GetAssignedCampuses: {ex.Message}");
            testFail++;
        }

        // Test 4: sp_PrincipalDashboard_Get
        try
        {
            using var multi = conn.QueryMultiple("sp_PrincipalDashboard_Get", new
            {
                p_CampusId = 1,
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_TargetDate = DateTime.UtcNow.Date
            }, commandType: CommandType.StoredProcedure);

            var kpis = multi.ReadFirstOrDefault<dynamic>();
            var studentAtt = multi.ReadFirstOrDefault<dynamic>();
            var sectionBreakdown = multi.Read<dynamic>().ToList();
            var staffAtt = multi.ReadFirstOrDefault<dynamic>();
            var exams = multi.Read<dynamic>().ToList();
            var performance = multi.Read<dynamic>().ToList();
            var feeTrend = multi.Read<dynamic>().ToList();
            var dashboardNotices = multi.Read<dynamic>().ToList();

            Console.WriteLine($"  [PASS] sp_PrincipalDashboard_Get executed successfully!");
            Console.WriteLine($"         Campus: {kpis?.CampusName}, Students: {kpis?.TotalStudents}, Staff: {kpis?.TotalStaff}, ActiveClasses: {kpis?.TotalSections}");
            Console.WriteLine($"         Student Attendance: {studentAtt?.AttendancePercentage}%, Section Rows: {sectionBreakdown.Count}");
            Console.WriteLine($"         Staff Attendance: {staffAtt?.AttendancePercentage}%");
            Console.WriteLine($"         Upcoming Exams: {exams.Count}, Performance Streams: {performance.Count}");
            Console.WriteLine($"         Fee Collected: Rs. {kpis?.TotalCollected}, Daily Fee Rows: {feeTrend.Count}");
            Console.WriteLine($"         Campus Notices: {dashboardNotices.Count}");
            testPass++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_PrincipalDashboard_Get: {ex.Message}");
            testFail++;
        }

        Console.WriteLine("\n[3/3] PRINCIPAL MODULE VERIFICATION SUMMARY: Passed: " + testPass + " | Failed: " + testFail);
        Console.WriteLine("================================================================================");
    }
}
