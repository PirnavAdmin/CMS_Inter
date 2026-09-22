using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class LiveReportsVerificationRunner
{
    private readonly string _connectionString;
    private readonly IServiceProvider _serviceProvider;

    public LiveReportsVerificationRunner(string connectionString, IServiceProvider serviceProvider)
    {
        _connectionString = connectionString;
        _serviceProvider = serviceProvider;
    }

    private async Task<MySqlConnection> GetConnAsync()
    {
        var conn = new MySqlConnection(_connectionString);
        await conn.OpenAsync();
        return conn;
    }

    public async Task<bool> RunAllTestsAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("          LIVE REPORTS & ANALYTICS FORENSIC VERIFICATION RUNNER");
        Console.WriteLine("================================================================================");
        Console.WriteLine();

        using var scope = _serviceProvider.CreateScope();
        var reportService = scope.ServiceProvider.GetRequiredService<IReportService>();

        var testCases = new (string Name, string Description, ReportFilterDto Filter)[]
        {
            (
                "TEST 1: BOARD ONLY",
                "Board = 1 (Board of Intermediate Education, AP), AY = None, Level = None, Group = None, Section = None",
                new ReportFilterDto { BoardId = 1 }
            ),
            (
                "TEST 2: BOARD + ACADEMIC YEAR",
                "Board = 1, AY = 9 (2026-2027), Level = None, Group = None, Section = None",
                new ReportFilterDto { BoardId = 1, AcademicYearId = 9 }
            ),
            (
                "TEST 3: BOARD + AY + ACADEMIC LEVEL",
                "Board = 1, AY = 9, Level = 1 (Intermediate 1st Year), Group = None, Section = None",
                new ReportFilterDto { BoardId = 1, AcademicYearId = 9, AcademicLevelId = 1 }
            ),
            (
                "TEST 4: BOARD + AY + LEVEL + GROUP",
                "Board = 1, AY = 9, Level = 1, Group = 37 (MPC), Section = None",
                new ReportFilterDto { BoardId = 1, AcademicYearId = 9, AcademicLevelId = 1, GroupId = 37 }
            ),
            (
                "TEST 5: BOARD + AY + LEVEL + GROUP + SECTION",
                "Board = 1, AY = 9, Level = 1, Group = 37 (MPC), Section = 30 (REG-1)",
                new ReportFilterDto { BoardId = 1, AcademicYearId = 9, AcademicLevelId = 1, GroupId = 37, SectionId = 30 }
            ),
            (
                "TEST 6: DATE RANGE (ACTIVE DATA)",
                "Board = 1, AY = 9, Level = 1, Group = 37, Sec = 30, From = 2026-08-01, To = 2026-09-01",
                new ReportFilterDto
                {
                    BoardId = 1,
                    AcademicYearId = 9,
                    AcademicLevelId = 1,
                    GroupId = 37,
                    SectionId = 30,
                    FromDate = new DateTime(2026, 8, 1),
                    ToDate = new DateTime(2026, 9, 1)
                }
            ),
            (
                "TEST 7: ZERO-DATA FILTER COMBINATION",
                "Board = 99999 (Non-existent Board)",
                new ReportFilterDto { BoardId = 99999 }
            )
        };

        bool allPassed = true;

        foreach (var tc in testCases)
        {
            Console.WriteLine("--------------------------------------------------------------------------------");
            Console.WriteLine($"[EXECUTING] {tc.Name}");
            Console.WriteLine($"Filter Context: {tc.Description}");
            Console.WriteLine("--------------------------------------------------------------------------------");

            var f = tc.Filter;
            DateTime? fromD = f.FromDate.HasValue ? f.FromDate.Value.Date : null;
            DateTime? toD = f.ToDate.HasValue ? f.ToDate.Value.Date.AddDays(1).AddTicks(-1) : null;

            // -------------------------------------------------------------
            // 1. Direct Live DB Calculations
            // -------------------------------------------------------------
            await using var conn = await GetConnAsync();

            // 1.1 Admissions DB
            var admSql = @"
                SELECT COUNT(*) 
                FROM StudentAdmissions a
                WHERE a.IsActive = 1 AND a.IsRejected = 0 AND (a.Status IS NULL OR a.Status != 'Rejected')
                  AND (@BoardId IS NULL OR a.BoardId = @BoardId)
                  AND (@AYId IS NULL OR a.AcademicYearId = @AYId)
                  AND (@LevelId IS NULL OR a.AcademicLevelId = @LevelId)
                  AND (@GroupId IS NULL OR a.GroupId = @GroupId)
                  AND (@SectionId IS NULL OR EXISTS (SELECT 1 FROM Students s WHERE (s.AdmissionId = a.AdmissionId OR s.AdmissionNo = a.AdmissionNo) AND s.SectionId = @SectionId))
                  AND (@FromDate IS NULL OR a.AdmissionDate >= @FromDate)
                  AND (@ToDate IS NULL OR a.AdmissionDate <= @ToDate)";
            var dbAdmissions = await conn.ExecuteScalarAsync<int>(admSql, new { BoardId = f.BoardId, AYId = f.AcademicYearId, LevelId = f.AcademicLevelId, GroupId = f.GroupId, SectionId = f.SectionId, FromDate = fromD, ToDate = toD });

            // 1.2 Attendance DB (Status Breakdown)
            var attStatusSql = @"
                SELECT a.Status, COUNT(*) as Cnt
                FROM Attendances a
                WHERE a.IsActive = 1
                  AND (@BoardId IS NULL OR a.BoardId = @BoardId)
                  AND (@AYId IS NULL OR a.AcademicYearId = @AYId)
                  AND (@LevelId IS NULL OR a.AcademicLevelId = @LevelId)
                  AND (@GroupId IS NULL OR a.GroupId = @GroupId)
                  AND (@SectionId IS NULL OR a.SectionId = @SectionId)
                  AND (@FromDate IS NULL OR a.AttendanceDate >= @FromDate)
                  AND (@ToDate IS NULL OR a.AttendanceDate <= @ToDate)
                GROUP BY a.Status";
            var attStatusRows = (await conn.QueryAsync<(int Status, int Cnt)>(attStatusSql, new { BoardId = f.BoardId, AYId = f.AcademicYearId, LevelId = f.AcademicLevelId, GroupId = f.GroupId, SectionId = f.SectionId, FromDate = fromD, ToDate = toD })).ToList();

            var totalAtt = attStatusRows.Sum(x => x.Cnt);
            var presentAtt = attStatusRows.FirstOrDefault(x => x.Status == (int)AttendanceStatus.Present).Cnt;
            var lateAtt = attStatusRows.FirstOrDefault(x => x.Status == (int)AttendanceStatus.Late).Cnt;
            var leaveAtt = attStatusRows.FirstOrDefault(x => x.Status == (int)AttendanceStatus.Leave).Cnt;
            var excusedAtt = attStatusRows.FirstOrDefault(x => x.Status == 4).Cnt;
            var absentAtt = attStatusRows.FirstOrDefault(x => x.Status == (int)AttendanceStatus.Absent).Cnt;
            decimal dbAttendancePct = totalAtt > 0 ? Math.Round((decimal)presentAtt * 100m / totalAtt, 2) : 0m;

            // 1.3 Fee Collection DB
            var feeSql = @"
                SELECT COALESCE(SUM(p.Amount), 0)
                FROM FeePayments p
                WHERE p.Status NOT IN ('Cancelled', 'Failed')
                  AND (@FromDate IS NULL OR p.PaymentDate >= @FromDate)
                  AND (@ToDate IS NULL OR p.PaymentDate <= @ToDate)
                  AND (@HasHierarchy = 0 OR EXISTS (
                      SELECT 1 FROM Students s 
                      WHERE s.StudentId = p.StudentId
                        AND (@BoardId IS NULL OR s.BoardId = @BoardId)
                        AND (@AYId IS NULL OR s.AcademicYearId = @AYId)
                        AND (@LevelId IS NULL OR s.AcademicLevelId = @LevelId)
                        AND (@GroupId IS NULL OR s.GroupId = @GroupId)
                        AND (@SectionId IS NULL OR s.SectionId = @SectionId)
                  ))";
            int hasHierarchy = (f.BoardId.HasValue || f.AcademicYearId.HasValue || f.AcademicLevelId.HasValue || f.GroupId.HasValue || f.SectionId.HasValue) ? 1 : 0;
            var dbFeeCollection = await conn.ExecuteScalarAsync<decimal>(feeSql, new { BoardId = f.BoardId, AYId = f.AcademicYearId, LevelId = f.AcademicLevelId, GroupId = f.GroupId, SectionId = f.SectionId, FromDate = fromD, ToDate = toD, HasHierarchy = hasHierarchy });

            // 1.4 Outstanding Dues DB
            var dueSql = @"
                SELECT COALESCE(SUM(sf.BalanceAmount), 0)
                FROM StudentFees sf
                WHERE sf.Status != 'Cancelled' AND sf.BalanceAmount > 0
                  AND (@HasHierarchy = 0 OR EXISTS (
                      SELECT 1 FROM Students s 
                      WHERE s.StudentId = sf.StudentId
                        AND (@BoardId IS NULL OR s.BoardId = @BoardId)
                        AND (@AYId IS NULL OR s.AcademicYearId = @AYId)
                        AND (@LevelId IS NULL OR s.AcademicLevelId = @LevelId)
                        AND (@GroupId IS NULL OR s.GroupId = @GroupId)
                        AND (@SectionId IS NULL OR s.SectionId = @SectionId)
                  ))";
            var dbDueFees = await conn.ExecuteScalarAsync<decimal>(dueSql, new { BoardId = f.BoardId, AYId = f.AcademicYearId, LevelId = f.AcademicLevelId, GroupId = f.GroupId, SectionId = f.SectionId, HasHierarchy = hasHierarchy });

            // 1.5 Examinations Conducted DB
            var examSql = @"
                SELECT COUNT(*)
                FROM Examinations e
                WHERE e.IsActive = 1
                  AND (@BoardId IS NULL OR e.BoardId = @BoardId)
                  AND (@AYId IS NULL OR e.AcademicYearId = @AYId)
                  AND (@LevelId IS NULL OR e.AcademicLevelId = @LevelId)
                  AND (@GroupId IS NULL OR e.GroupId = @GroupId)
                  AND (@FromDate IS NULL OR e.StartDate >= @FromDate)
                  AND (@ToDate IS NULL OR e.EndDate <= @ToDate)";
            var dbExams = await conn.ExecuteScalarAsync<int>(examSql, new { BoardId = f.BoardId, AYId = f.AcademicYearId, LevelId = f.AcademicLevelId, GroupId = f.GroupId, FromDate = fromD, ToDate = toD });

            // 1.6 Results Published DB
            var resSql = @"
                SELECT r.StudentId, r.ExamId, r.ResultStatus, r.TotalMarks
                FROM Results r
                WHERE r.IsPublished = 1
                  AND (@BoardId IS NULL OR r.BoardId = @BoardId)
                  AND (@AYId IS NULL OR r.AcademicYearId = @AYId)
                  AND (@LevelId IS NULL OR r.AcademicLevelId = @LevelId)
                  AND (@GroupId IS NULL OR r.GroupId = @GroupId)
                  AND (@SectionId IS NULL OR EXISTS (SELECT 1 FROM Students s WHERE s.StudentId = r.StudentId AND s.SectionId = @SectionId))
                  AND (@FromDate IS NULL OR r.PublishedDate >= @FromDate)
                  AND (@ToDate IS NULL OR r.PublishedDate <= @ToDate)";
            var dbResultsList = (await conn.QueryAsync<(int StudentId, int ExamId, string ResultStatus, decimal TotalMarks)>(resSql, new { BoardId = f.BoardId, AYId = f.AcademicYearId, LevelId = f.AcademicLevelId, GroupId = f.GroupId, SectionId = f.SectionId, FromDate = fromD, ToDate = toD })).ToList();

            var dbResultsPublished = dbResultsList.Select(r => new { r.StudentId, r.ExamId }).Distinct().Count();

            // 1.7 Faculty Workload DB
            var ttSql = @"
                SELECT p.StartTime, p.EndTime
                FROM Timetables t
                JOIN Periods p ON t.PeriodId = p.PeriodId
                WHERE t.IsPublished = 1 AND p.IsBreak = 0
                  AND (@BoardId IS NULL OR t.BoardId = @BoardId)
                  AND (@AYId IS NULL OR t.AcademicYearId = @AYId)
                  AND (@LevelId IS NULL OR t.AcademicLevelId = @LevelId)
                  AND (@GroupId IS NULL OR t.GroupId = @GroupId)
                  AND (@SectionId IS NULL OR t.SectionId = @SectionId)";
            var ttSlots = (await conn.QueryAsync<(TimeSpan StartTime, TimeSpan EndTime)>(ttSql, new { BoardId = f.BoardId, AYId = f.AcademicYearId, LevelId = f.AcademicLevelId, GroupId = f.GroupId, SectionId = f.SectionId })).ToList();

            decimal dbWorkloadHrs = 0;
            foreach (var slot in ttSlots)
            {
                var diff = (slot.EndTime - slot.StartTime).TotalMinutes;
                if (diff > 0) dbWorkloadHrs += (decimal)(diff / 60.0);
            }
            dbWorkloadHrs = Math.Round(dbWorkloadHrs, 1);

            // 1.8 Student Strength DB
            var stuSql = @"
                SELECT COUNT(*)
                FROM Students s
                WHERE s.IsActive = 1
                  AND (@BoardId IS NULL OR s.BoardId = @BoardId)
                  AND (@AYId IS NULL OR s.AcademicYearId = @AYId)
                  AND (@LevelId IS NULL OR s.AcademicLevelId = @LevelId)
                  AND (@GroupId IS NULL OR s.GroupId = @GroupId)
                  AND (@SectionId IS NULL OR s.SectionId = @SectionId)";
            var dbStrength = await conn.ExecuteScalarAsync<int>(stuSql, new { BoardId = f.BoardId, AYId = f.AcademicYearId, LevelId = f.AcademicLevelId, GroupId = f.GroupId, SectionId = f.SectionId });

            // 1.9 Pass Percentage DB
            var studentExamGroups = dbResultsList
                .GroupBy(r => new { r.StudentId, r.ExamId })
                .Select(g => new
                {
                    IsPassed = g.All(x => string.Equals(x.ResultStatus, "Pass", StringComparison.OrdinalIgnoreCase)
                                       || string.Equals(x.ResultStatus, "Passed", StringComparison.OrdinalIgnoreCase)
                                       || string.Equals(x.ResultStatus, "PROMOTED", StringComparison.OrdinalIgnoreCase))
                })
                .ToList();
            var totalAppeared = studentExamGroups.Count;
            var totalPassed = studentExamGroups.Count(x => x.IsPassed);
            decimal dbPassPct = totalAppeared > 0 ? Math.Round((decimal)totalPassed * 100m / totalAppeared, 2) : 0m;

            // 1.10 Toppers DB
            var dbToppers = dbResultsList
                .GroupBy(r => new { r.StudentId, r.ExamId })
                .Where(g => g.All(x => string.Equals(x.ResultStatus, "Pass", StringComparison.OrdinalIgnoreCase)
                                    || string.Equals(x.ResultStatus, "Passed", StringComparison.OrdinalIgnoreCase)
                                    || string.Equals(x.ResultStatus, "PROMOTED", StringComparison.OrdinalIgnoreCase)))
                .Select(g => g.Key.StudentId)
                .Distinct()
                .Count();
            dbToppers = Math.Min(dbToppers, 10);

            // -------------------------------------------------------------
            // 2. API Call (IReportService)
            // -------------------------------------------------------------
            var apiDto = await reportService.DashboardAsync(f);

            // -------------------------------------------------------------
            // 3. UI Visible Value Emulation
            // -------------------------------------------------------------
            var uiAdmissions = apiDto.Admissions.ToString();
            var uiAttendance = $"{apiDto.Attendance:F1}%";
            var uiFeeCollection = $"₹{apiDto.FeeCollection:N2}";
            var uiDueFees = $"₹{apiDto.DueFees:N2}";
            var uiExams = apiDto.Examinations.ToString();
            var uiResults = apiDto.ResultsPublished.ToString();
            var uiWorkload = $"{apiDto.FacultyWorkload:F1} hrs/wk";
            var uiStrength = apiDto.StudentStrength.ToString();
            var uiPassPct = $"{apiDto.PassPercentage:F1}%";
            var uiToppers = apiDto.ToppersIdentified.ToString();

            // -------------------------------------------------------------
            // 4. Comparison Matrix
            // -------------------------------------------------------------
            var metrics = new (string MetricName, object DbVal, object ApiVal, string UiVal, bool Match)[]
            {
                ("Total Admissions", dbAdmissions, apiDto.Admissions, uiAdmissions, dbAdmissions == apiDto.Admissions),
                ("Average Attendance", $"{dbAttendancePct}% ({presentAtt}/{totalAtt})", $"{apiDto.Attendance}%", uiAttendance, Math.Abs(dbAttendancePct - apiDto.Attendance) < 0.05m),
                ("Total Fee Collection", $"₹{dbFeeCollection:N2}", $"₹{apiDto.FeeCollection:N2}", uiFeeCollection, dbFeeCollection == apiDto.FeeCollection),
                ("Outstanding Due Fees", $"₹{dbDueFees:N2}", $"₹{apiDto.DueFees:N2}", uiDueFees, dbDueFees == apiDto.DueFees),
                ("Examinations Conducted", dbExams, apiDto.Examinations, uiExams, dbExams == apiDto.Examinations),
                ("Results Published", dbResultsPublished, apiDto.ResultsPublished, uiResults, dbResultsPublished == apiDto.ResultsPublished),
                ("Faculty Workload", $"{dbWorkloadHrs} hrs/wk ({ttSlots.Count} slots)", $"{apiDto.FacultyWorkload} hrs/wk", uiWorkload, dbWorkloadHrs == apiDto.FacultyWorkload),
                ("Student Strength", dbStrength, apiDto.StudentStrength, uiStrength, dbStrength == apiDto.StudentStrength),
                ("Pass Percentage", $"{dbPassPct}% ({totalPassed}/{totalAppeared})", $"{apiDto.PassPercentage}%", uiPassPct, dbPassPct == apiDto.PassPercentage),
                ("Toppers Identified", dbToppers, apiDto.ToppersIdentified, uiToppers, dbToppers == apiDto.ToppersIdentified)
            };

            Console.WriteLine(string.Format("{0,-24} | {1,-26} | {2,-18} | {3,-18} | {4,-6}", "Metric", "Live DB Value (Formula)", "API Value", "UI Display", "Status"));
            Console.WriteLine(new string('-', 100));

            bool tcPassed = true;
            foreach (var m in metrics)
            {
                var statusStr = m.Match ? "PASS" : "FAIL";
                if (!m.Match)
                {
                    tcPassed = false;
                    allPassed = false;
                }
                Console.WriteLine(string.Format("{0,-24} | {1,-26} | {2,-18} | {3,-18} | {4,-6}", m.MetricName, m.DbVal, m.ApiVal, m.UiVal, statusStr));
            }

            Console.WriteLine();
            Console.WriteLine($"Result for {tc.Name}: {(tcPassed ? "ALL 10 METRICS MATCH PERFECTLY (PASS)" : "DISCREPANCY DETECTED (FAIL)")}");
            Console.WriteLine();
        }

        Console.WriteLine("================================================================================");
        Console.WriteLine($"FINAL REVERIFICATION STATUS: {(allPassed ? "100% VERIFIED & PASSED" : "FAILED")}");
        Console.WriteLine("================================================================================");

        return allPassed;
    }
}
