using System;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Dapper;
using MySqlConnector;

class DeployDashboardModule
{
    public static void Run(string connStr)
    {
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("   DASHBOARD MODULE - DATABASE DEPLOYMENT & VERIFICATION");
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

        // 1. Deploy Stored Procedures
        Console.WriteLine("\n[1/2] Deploying Unified Dashboard Stored Procedures from Dashboard_Stored_Procedures.sql...");
        string scriptPath = Path.Combine("..", "CollegeManagement.API", "Database", "Dashboard_Stored_Procedures.sql");
        if (!File.Exists(scriptPath))
        {
            scriptPath = Path.Combine("Backend", "src", "CollegeManagement.API", "Database", "Dashboard_Stored_Procedures.sql");
        }

        if (File.Exists(scriptPath))
        {
            string sql = File.ReadAllText(scriptPath);
            var spRegex = new Regex(@"(CREATE\s+PROCEDURE\s+`?([a-zA-Z0-9_]+)`?[\s\S]*?\bEND)\s*//", RegexOptions.IgnoreCase);
            var matches = spRegex.Matches(sql);

            Console.WriteLine($"  Found {matches.Count} stored procedures to deploy.");
            int deployedCount = 0;

            foreach (Match match in matches)
            {
                string createBody = match.Groups[1].Value.Trim();
                string spName = match.Groups[2].Value;

                try
                {
                    using var dropCmd = new MySqlCommand($"DROP PROCEDURE IF EXISTS `{spName}`;", conn);
                    dropCmd.ExecuteNonQuery();

                    using var createCmd = new MySqlCommand(createBody, conn);
                    createCmd.ExecuteNonQuery();

                    Console.WriteLine($"  [DEPLOYED] Stored Procedure: `{spName}`");
                    deployedCount++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  [FAILED] `{spName}`: {ex.Message}");
                }
            }

            Console.WriteLine($"\n[SUCCESS] Successfully deployed {deployedCount} of {matches.Count} Stored Procedures.");
        }
        else
        {
            Console.WriteLine("  [ERROR] Could not find SQL file at path: " + scriptPath);
        }

        // 2. Automated Verification via Dapper
        Console.WriteLine("\n[2/2] Running Automated Verification Tests via Dapper...");

        // Test 1: sp_GetDashboardFilters
        try
        {
            using var multi = conn.QueryMultiple("sp_GetDashboardFilters", commandType: CommandType.StoredProcedure);
            var years = multi.Read<dynamic>().ToList();
            var boards = multi.Read<dynamic>().ToList();
            Console.WriteLine($"  [PASS] sp_GetDashboardFilters: {years.Count} academic years, {boards.Count} boards");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDashboardFilters: {ex.Message}");
        }

        // Test 2: sp_GetDashboardKPIs with 4 parameters
        try
        {
            var kpis = conn.QueryFirstOrDefault<dynamic>("sp_GetDashboardKPIs", new
            {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_TargetDate = DateTime.UtcNow.Date,
                p_CampusId = (int?)null
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_GetDashboardKPIs: TotalStudents={kpis?.TotalStudents}, Teaching={kpis?.TeachingStaff}, NonTeaching={kpis?.NonTeachingStaff}, Groups={kpis?.TotalGroups}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDashboardKPIs: {ex.Message}");
        }

        // Test 3: sp_GetDashboardStudentsOverview
        try
        {
            using var multi = conn.QueryMultiple("sp_GetDashboardStudentsOverview", new
            {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_CampusId = (int?)null
            }, commandType: CommandType.StoredProcedure);

            var summary = multi.ReadFirstOrDefault<dynamic>();
            var trend = multi.Read<dynamic>().ToList();
            Console.WriteLine($"  [PASS] sp_GetDashboardStudentsOverview: Total={summary?.TotalStudents}, Boys={summary?.MaleStudents}, Girls={summary?.FemaleStudents}, TrendPeriods={trend.Count}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDashboardStudentsOverview: {ex.Message}");
        }

        // Test 4: sp_GetDashboardGroupDistribution
        try
        {
            var groups = conn.Query<dynamic>("sp_GetDashboardGroupDistribution", new
            {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_CampusId = (int?)null
            }, commandType: CommandType.StoredProcedure).ToList();

            Console.WriteLine($"  [PASS] sp_GetDashboardGroupDistribution: {groups.Count} groups retrieved");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDashboardGroupDistribution: {ex.Message}");
        }

        // Test 5: sp_GetDashboardStudentAttendance
        try
        {
            using var multi = conn.QueryMultiple("sp_GetDashboardStudentAttendance", new
            {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_TargetDate = DateTime.UtcNow.Date,
                p_ViewBy = "Overall",
                p_CampusId = (int?)null
            }, commandType: CommandType.StoredProcedure);

            var summary = multi.ReadFirstOrDefault<dynamic>();
            Console.WriteLine($"  [PASS] sp_GetDashboardStudentAttendance: Total={summary?.TotalStudents}, Present={summary?.Present}, Absent={summary?.Absent}, Pct={summary?.AttendancePercentage}%");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDashboardStudentAttendance: {ex.Message}");
        }

        // Test 6: sp_GetDashboardStaffAttendance
        try
        {
            var staff = conn.QueryFirstOrDefault<dynamic>("sp_GetDashboardStaffAttendance", new
            {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_TargetDate = DateTime.UtcNow.Date,
                p_StaffType = "all",
                p_CampusId = (int?)null
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_GetDashboardStaffAttendance: TotalStaff={staff?.TotalStaff}, Present={staff?.Present}, Absent={staff?.Absent}, Pct={staff?.AttendancePercentage}%");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDashboardStaffAttendance: {ex.Message}");
        }

        // Test 7: sp_GetDashboardCertificateRequests
        try
        {
            using var multi = conn.QueryMultiple("sp_GetDashboardCertificateRequests", new
            {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_Limit = 6,
                p_CampusId = (int?)null
            }, commandType: CommandType.StoredProcedure);

            var certSummary = multi.ReadFirstOrDefault<dynamic>();
            var certItems = multi.Read<dynamic>().ToList();
            Console.WriteLine($"  [PASS] sp_GetDashboardCertificateRequests: TotalRequests={certSummary?.TotalRequests}, RecentItems={certItems.Count}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDashboardCertificateRequests: {ex.Message}");
        }

        // Test 8: sp_GetDashboardUpcomingExaminations
        try
        {
            var exams = conn.Query<dynamic>("sp_GetDashboardUpcomingExaminations", new
            {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_TargetDate = DateTime.UtcNow.Date,
                p_Limit = 6,
                p_CampusId = (int?)null
            }, commandType: CommandType.StoredProcedure).ToList();

            Console.WriteLine($"  [PASS] sp_GetDashboardUpcomingExaminations: {exams.Count} upcoming exams");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDashboardUpcomingExaminations: {ex.Message}");
        }

        // Test 9: sp_GetDashboardTodaysHighlights
        try
        {
            var hl = conn.QueryFirstOrDefault<dynamic>("sp_GetDashboardTodaysHighlights", new
            {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_TargetDate = DateTime.UtcNow.Date,
                p_CampusId = (int?)null
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_GetDashboardTodaysHighlights: AdmissionsToday={hl?.AdmissionsToday}, CertificatesToday={hl?.CertificatesToday}, ExamsToday={hl?.ExamsToday}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDashboardTodaysHighlights: {ex.Message}");
        }

        // Test 10: sp_GetDashboardWeeklyAttendance
        try
        {
            var weekly = conn.Query<dynamic>("sp_GetDashboardWeeklyAttendance", new
            {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_StartDate = DateTime.UtcNow.Date.AddDays(-6),
                p_EndDate = DateTime.UtcNow.Date,
                p_CampusId = (int?)null
            }, commandType: CommandType.StoredProcedure).ToList();

            Console.WriteLine($"  [PASS] sp_GetDashboardWeeklyAttendance: {weekly.Count} daily attendance records");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDashboardWeeklyAttendance: {ex.Message}");
        }

        // Test 11: sp_GetDashboardFacultyWorkload
        try
        {
            var workload = conn.Query<dynamic>("sp_GetDashboardFacultyWorkload", new
            {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_CampusId = (int?)null
            }, commandType: CommandType.StoredProcedure).ToList();

            Console.WriteLine($"  [PASS] sp_GetDashboardFacultyWorkload: {workload.Count} faculty records");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDashboardFacultyWorkload: {ex.Message}");
        }

        // Test 12: sp_GetDashboardUpcomingHolidays
        try
        {
            var holidays = conn.Query<dynamic>("sp_GetDashboardUpcomingHolidays", new
            {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_Limit = 5,
                p_CampusId = (int?)null
            }, commandType: CommandType.StoredProcedure).ToList();

            Console.WriteLine($"  [PASS] sp_GetDashboardUpcomingHolidays: {holidays.Count} holidays");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDashboardUpcomingHolidays: {ex.Message}");
        }

        // Test 13: sp_GetDashboardRecentActivity
        try
        {
            var activity = conn.Query<dynamic>("sp_GetDashboardRecentActivity", new
            {
                p_Limit = 10,
                p_CampusId = (int?)null
            }, commandType: CommandType.StoredProcedure).ToList();

            Console.WriteLine($"  [PASS] sp_GetDashboardRecentActivity: {activity.Count} activities");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetDashboardRecentActivity: {ex.Message}");
        }

        Console.WriteLine("\n[COMPLETE] Dashboard Module Database Deployment & Verification Finished.");
    }
}
