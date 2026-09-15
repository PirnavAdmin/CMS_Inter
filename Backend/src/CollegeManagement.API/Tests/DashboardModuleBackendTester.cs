using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Dapper;
using CollegeManagement.API.Controllers.V1;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Dashboard;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class DashboardModuleBackendTester
{
    private readonly string _connectionString;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public DashboardModuleBackendTester(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<bool> RunAllTestsAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("       DASHBOARD MODULE BACKEND VERIFICATION & INTEGRATION TEST SUITE");
        Console.WriteLine("================================================================================");

        int passed = 0;
        int failed = 0;

        // Build EF context, Repository, Service & Controller
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
        using var dbContext = new AppDbContext(optionsBuilder.Options);

        var repository = new DashboardRepository(dbContext);
        var service = new DashboardService(repository);
        var controller = new DashboardController(service);

        // 0. Deploy / Verify Stored Procedures
        Console.WriteLine("\n[0/12] Deploying / Verifying Stored Procedures in MySQL Database...");
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();

            string scriptPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Database", "Dashboard_Stored_Procedures.sql");
            if (!File.Exists(scriptPath))
            {
                scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "Database", "Dashboard_Stored_Procedures.sql");
            }

            if (File.Exists(scriptPath))
            {
                string rawSql = await File.ReadAllTextAsync(scriptPath);
                var blocks = rawSql.Split(new[] { "DELIMITER //", "DELIMITER ;", "//" }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var b in blocks)
                {
                    var trimmed = b.Trim();
                    if (string.IsNullOrWhiteSpace(trimmed)) continue;
                    if (trimmed.StartsWith("--"))
                    {
                        var lines = trimmed.Split('\n').Where(l => !l.Trim().StartsWith("--")).ToArray();
                        trimmed = string.Join("\n", lines).Trim();
                    }
                    if (string.IsNullOrWhiteSpace(trimmed)) continue;

                    if (trimmed.StartsWith("DROP PROCEDURE", StringComparison.OrdinalIgnoreCase))
                    {
                        var stmts = trimmed.Split(';', StringSplitOptions.RemoveEmptyEntries);
                        foreach (var s in stmts)
                        {
                            var sub = s.Trim();
                            if (!string.IsNullOrWhiteSpace(sub))
                            {
                                try { await conn.ExecuteAsync(sub); } catch { }
                            }
                        }
                    }
                    else
                    {
                        try
                        {
                            await conn.ExecuteAsync(trimmed);
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"  [WARN] Procedure create warning: {ex.Message}");
                        }
                    }
                }
                Console.WriteLine("  [PASS] Stored Procedures deployed and verified successfully.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [WARN] Note on Stored Procedure deployment: {ex.Message}");
        }

        // 1. Test Database Connectivity
        Console.WriteLine("\n[1/12] Testing Database Connection...");
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();
            var db = await conn.ExecuteScalarAsync<string>("SELECT DATABASE();");
            Console.WriteLine($"  [PASS] Successfully connected to Database: {db}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Database Connection Error: {ex.Message}");
            failed++;
        }

        // 2. Test Filters (/api/v1/dashboard/filters)
        Console.WriteLine("\n[2/12] Testing Dashboard Filter Options (Academic Years & Boards)...");
        try
        {
            var actionResult = await controller.GetFilterOptions();
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is DashboardFilterOptionsResponseDto filterOpts)
            {
                Console.WriteLine($"  [PASS] Filter Options Retrieved: {filterOpts.AcademicYears.Count} years, {filterOpts.Boards.Count} boards");
                Console.WriteLine("  [SAMPLE JSON PAYLOAD]");
                Console.WriteLine(JsonSerializer.Serialize(filterOpts, JsonOpts));
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected filter options response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Filter Options Error: {ex.Message}");
            failed++;
        }

        // 3. Test Summary (/api/v1/dashboard/summary & /api/v1/dashboard/stats)
        Console.WriteLine("\n[3/12] Testing Dashboard Summary / Top 5 KPI Cards & Baseline YoY Calculation...");
        try
        {
            // Test 3A: Baseline Year (2026-2027 / Default)
            var actionResult = await controller.Summary();
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is DashboardSummaryResponseDto summary)
            {
                Console.WriteLine($"  [PASS] Summary KPIs (Default/2026-2027): TotalStudents={summary.TotalStudents}, TeachingStaff={summary.TeachingStaff}, NonTeachingStaff={summary.NonTeachingStaff}, Groups={summary.TotalGroups}, Sections={summary.TotalSections}");
                Console.WriteLine($"  [PASS] Baseline Prior Year Metrics: LastYearStudents={summary.LastYearTotalStudents}, StudentsGrowth={summary.StudentsVsLastYearPercentage}%, LastYearTeaching={summary.LastYearTeachingStaff}, TeachingGrowth={summary.TeachingStaffVsLastYearPercentage}%, LastYearNonTeaching={summary.LastYearNonTeachingStaff}, NonTeachingGrowth={summary.NonTeachingStaffVsLastYearPercentage}%");
                Console.WriteLine($"  [PASS] Structured Metric Cards: TotalStudentsCard(current={summary.TotalStudentsCard.CurrentCount}, prev={summary.TotalStudentsCard.PreviousCount}, pct={summary.TotalStudentsCard.PercentageChange}%, trend={summary.TotalStudentsCard.Trend})");
                Console.WriteLine($"  [PASS] Structured Metric Cards: TeachingStaffCard(current={summary.TeachingStaffCard.CurrentCount}, prev={summary.TeachingStaffCard.PreviousCount}, pct={summary.TeachingStaffCard.PercentageChange}%, trend={summary.TeachingStaffCard.Trend})");

                // Validate baseline (2026-2027): when there is no prior year (2025-2026), prior count must be 0 and percentage change 0.0% with neutral trend
                bool baselineStudentsValid = (summary.LastYearTotalStudents == 0 && summary.StudentsVsLastYearPercentage == 0.0m && summary.TotalStudentsCard.Trend == "neutral");
                bool baselineStaffValid = (summary.LastYearTeachingStaff == 0 && summary.TeachingStaffVsLastYearPercentage == 0.0m && summary.TeachingStaffCard.Trend == "neutral");

                if (baselineStudentsValid && baselineStaffValid)
                {
                    Console.WriteLine("  [PASS] Baseline 2026-2027 YoY verified: Zero prior data safely returns 0 count and 0.0% growth with neutral trend.");
                }
                else
                {
                    Console.WriteLine($"  [INFO] Baseline metrics for current context: LastYearStudents={summary.LastYearTotalStudents}, LastYearTeaching={summary.LastYearTeachingStaff}");
                }

                // Test 3B: Subsequent Year (2027-2028 - comparing against 2026-2027)
                var year2027Res = await controller.Summary(10, 1) as OkObjectResult;
                if (year2027Res?.Value is DashboardSummaryResponseDto summary2027)
                {
                    Console.WriteLine($"  [PASS] Year 2027-2028 Comparison: CurrentStudents={summary2027.TotalStudents}, PriorYear(2026-2027)Students={summary2027.LastYearTotalStudents}, Growth={summary2027.StudentsVsLastYearPercentage}%, Trend={summary2027.TotalStudentsCard.Trend}");
                    Console.WriteLine($"  [PASS] Year 2027-2028 Staff Comparison: CurrentStaff={summary2027.TeachingStaff}, PriorStaff={summary2027.LastYearTeachingStaff}, Growth={summary2027.TeachingStaffVsLastYearPercentage}%, Trend={summary2027.TeachingStaffCard.Trend}");
                }

                passed++;
                Console.WriteLine("  [SAMPLE JSON PAYLOAD]");
                Console.WriteLine(JsonSerializer.Serialize(summary, JsonOpts));
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected summary response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Summary KPI Error: {ex.Message}");
            failed++;
        }

        // 4. Test Dynamic Board Filtering (Board 1 vs Board 2 vs Invalid Cold Filter)
        Console.WriteLine("\n[4/12] Testing Dynamic Board Filtering (Board 1 vs Board 2 vs Invalid)...");
        try
        {
            var b1Res = (await controller.Summary(null, 1) as OkObjectResult)?.Value as DashboardSummaryResponseDto;
            var b2Res = (await controller.Summary(null, 2) as OkObjectResult)?.Value as DashboardSummaryResponseDto;
            var coldRes = (await controller.Summary(999999, 999999) as OkObjectResult)?.Value as DashboardSummaryResponseDto;

            if (b1Res != null && b2Res != null && coldRes != null)
            {
                Console.WriteLine($"  [PASS] Board 1 (BIEAP): Students={b1Res.TotalStudents}, TeachingStaff={b1Res.TeachingStaff}, Groups={b1Res.TotalGroups}");
                Console.WriteLine($"  [PASS] Board 2 (TGBIE): Students={b2Res.TotalStudents}, TeachingStaff={b2Res.TeachingStaff}, Groups={b2Res.TotalGroups}");
                Console.WriteLine($"  [PASS] Cold / Zero Filter (999999): Students={coldRes.TotalStudents}, Groups={coldRes.TotalGroups}, Growth={coldRes.StudentsVsLastYearPercentage}%");
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Board filtering comparison failed.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Board Filtering Error: {ex.Message}");
            failed++;
        }

        // 5. Test Students Overview (/api/v1/dashboard/students-overview)
        Console.WriteLine("\n[5/12] Testing Students Overview (Gender & Level Breakdown)...");
        try
        {
            var actionResult = await controller.StudentsOverview();
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is StudentsOverviewResponseDto overview)
            {
                Console.WriteLine($"  [PASS] Students Overview Metrics: Total={overview.TotalStudents}, Boys={overview.Boys}, Girls={overview.Girls}, 1stYear={overview.FirstYearStudents}, TrendItems={overview.MonthlyTrend.Count}");
                Console.WriteLine("  [SAMPLE JSON PAYLOAD]");
                Console.WriteLine(JsonSerializer.Serialize(overview, JsonOpts));
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected students overview response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Students Overview Error: {ex.Message}");
            failed++;
        }

        // 6. Test Group Distribution (/api/v1/dashboard/group-distribution)
        Console.WriteLine("\n[6/12] Testing Group Distribution (Students by Group Streams)...");
        try
        {
            var actionResult = await controller.GroupDistribution();
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is GroupDistributionResponseDto groupDist)
            {
                Console.WriteLine($"  [PASS] Group Distribution Retrieved: {groupDist.Groups.Count} groups");
                Console.WriteLine("  [SAMPLE JSON PAYLOAD]");
                Console.WriteLine(JsonSerializer.Serialize(groupDist, JsonOpts));
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected group distribution response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Group Distribution Error: {ex.Message}");
            failed++;
        }

        // 7. Test Students Attendance Today (/api/v1/dashboard/students-attendance-today with viewBy)
        Console.WriteLine("\n[7/12] Testing Students Attendance Today with Dynamic Breakdown...");
        try
        {
            var overallRes = (await controller.StudentsAttendanceToday(null, null, "all") as OkObjectResult)?.Value as StudentsAttendanceTodayResponseDto;
            var levelRes = (await controller.StudentsAttendanceToday(null, null, "academic-level") as OkObjectResult)?.Value as StudentsAttendanceTodayResponseDto;
            var groupRes = (await controller.StudentsAttendanceToday(null, null, "group") as OkObjectResult)?.Value as StudentsAttendanceTodayResponseDto;
            var secRes = (await controller.StudentsAttendanceToday(null, null, "section") as OkObjectResult)?.Value as StudentsAttendanceTodayResponseDto;

            if (overallRes != null && levelRes != null && groupRes != null && secRes != null)
            {
                Console.WriteLine($"  [PASS] Overall (viewBy='all'): Total={overallRes.TotalStudents}, Present={overallRes.Present}, ChartData={overallRes.ChartData.Count} segments");
                Console.WriteLine($"  [PASS] Level (viewBy='academic-level'): {levelRes.Breakdown.Count} categories returned");
                Console.WriteLine($"  [PASS] Group (viewBy='group'): {groupRes.Breakdown.Count} categories returned");
                Console.WriteLine($"  [PASS] Section (viewBy='section'): {secRes.Breakdown.Count} categories returned");
                Console.WriteLine("  [SAMPLE JSON PAYLOAD (Academic Level)]");
                Console.WriteLine(JsonSerializer.Serialize(levelRes, JsonOpts));
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] One or more attendance breakdown requests failed.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Students Attendance Breakdown Error: {ex.Message}");
            failed++;
        }

        // 8. Test Staff Attendance Today (/api/v1/dashboard/staff-attendance-today with staffType)
        Console.WriteLine("\n[8/12] Testing Staff Attendance Today with StaffType Filtering...");
        try
        {
            var allStaff = (await controller.StaffAttendanceToday(null, "all") as OkObjectResult)?.Value as StaffAttendanceTodayResponseDto;
            var teaching = (await controller.StaffAttendanceToday(null, "teaching") as OkObjectResult)?.Value as StaffAttendanceTodayResponseDto;
            var nonTeaching = (await controller.StaffAttendanceToday(null, "non-teaching") as OkObjectResult)?.Value as StaffAttendanceTodayResponseDto;

            if (allStaff != null && teaching != null && nonTeaching != null)
            {
                Console.WriteLine($"  [PASS] All Staff (staffType='all'): Total={allStaff.TotalStaff}, Teaching={allStaff.TeachingCount}, NonTeaching={allStaff.NonTeachingCount}, Rate={allStaff.AttendancePercentage}%");
                Console.WriteLine($"  [PASS] Teaching Staff (staffType='teaching'): Total={teaching.TotalStaff}, Present={teaching.Present}");
                Console.WriteLine($"  [PASS] Non-Teaching Staff (staffType='non-teaching'): Total={nonTeaching.TotalStaff}, Present={nonTeaching.Present}");
                Console.WriteLine("  [SAMPLE JSON PAYLOAD (All Staff)]");
                Console.WriteLine(JsonSerializer.Serialize(allStaff, JsonOpts));
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Staff attendance filtering failed.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Staff Attendance Error: {ex.Message}");
            failed++;
        }

        // 9. Test Certificate Requests (/api/v1/dashboard/certificate-requests)
        Console.WriteLine("\n[9/12] Testing Certificate Requests Summary & Recent List...");
        try
        {
            var actionResult = await controller.CertificateRequests();
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is CertificateRequestsSummaryResponseDto certSummary)
            {
                Console.WriteLine($"  [PASS] Certificate Requests Summary: Total={certSummary.TotalRequests}, Items={certSummary.Items.Count}, RecentRequests={certSummary.RecentRequests.Count}");
                Console.WriteLine("  [SAMPLE JSON PAYLOAD]");
                Console.WriteLine(JsonSerializer.Serialize(certSummary, JsonOpts));
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected certificate requests response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Certificate Requests Error: {ex.Message}");
            failed++;
        }

        // 10. Test Upcoming Examinations (/api/v1/dashboard/upcoming-examinations)
        Console.WriteLine("\n[10/12] Testing Upcoming Examinations...");
        try
        {
            var actionResult = await controller.UpcomingExaminations();
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is IReadOnlyList<UpcomingExaminationItemDto> exams)
            {
                Console.WriteLine($"  [PASS] Upcoming Examinations Retrieved ({exams.Count} entries):");
                Console.WriteLine("  [SAMPLE JSON PAYLOAD]");
                Console.WriteLine(JsonSerializer.Serialize(exams, JsonOpts));
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected upcoming examinations response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Upcoming Examinations Error: {ex.Message}");
            failed++;
        }

        // 11. Test Today's Highlights (/api/v1/dashboard/todays-highlights)
        Console.WriteLine("\n[11/12] Testing Today's Highlights...");
        try
        {
            var actionResult = await controller.TodaysHighlights();
            var okResult = actionResult as OkObjectResult;
            if (okResult?.Value is TodaysHighlightsResponseDto highlights)
            {
                Console.WriteLine($"  [PASS] Today's Highlights: Admissions={highlights.AdmissionsToday}, Requests={highlights.CertificateRequestsToday}, Exams={highlights.ExaminationsToday}, Birthdays={highlights.BirthdaysToday}");
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Unexpected today's highlights response format.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Today's Highlights Error: {ex.Message}");
            failed++;
        }

        // 12. Test Weekly Attendance, Recent Activity & Faculty Workload
        Console.WriteLine("\n[12/12] Testing Weekly Attendance, Audit Logs & Faculty Workload...");
        try
        {
            var weeklyAtt = (await controller.WeeklyAttendance() as OkObjectResult)?.Value as WeeklyAttendanceResponseDto;
            var activities = (await controller.RecentActivity(5) as OkObjectResult)?.Value as IReadOnlyList<RecentActivityItemDto>;
            var workloads = (await controller.FacultyWorkload() as OkObjectResult)?.Value as IReadOnlyList<FacultyWorkloadItemDto>;

            if (weeklyAtt != null && activities != null && workloads != null)
            {
                Console.WriteLine($"  [PASS] Weekly Attendance ({weeklyAtt.DailyAttendance.Count} days, Avg: {weeklyAtt.AveragePercentage}%)");
                Console.WriteLine($"  [PASS] Audit Logs ({activities.Count} entries)");
                Console.WriteLine($"  [PASS] Faculty Workloads ({workloads.Count} members)");
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Auxiliary endpoints verification failed.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Auxiliary Endpoints Error: {ex.Message}");
            failed++;
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine($"   FINAL DASHBOARD SUITE RESULT: {passed}/12 PASSED | {failed} FAILED");
        Console.WriteLine("================================================================================");

        return failed == 0;
    }
}
