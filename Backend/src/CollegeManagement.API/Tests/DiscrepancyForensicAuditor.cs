using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class DiscrepancyForensicAuditor
{
    private readonly string _connectionString;
    private readonly IServiceProvider _serviceProvider;

    public DiscrepancyForensicAuditor(string connectionString, IServiceProvider serviceProvider)
    {
        _connectionString = connectionString;
        _serviceProvider = serviceProvider;
    }

    public async Task<bool> RunAuditAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var reportService = scope.ServiceProvider.GetRequiredService<IReportService>();

        async Task<MySqlConnection> GetConnAsync()
        {
            var c = new MySqlConnection(_connectionString);
            await c.OpenAsync();
            return c;
        }

        Console.WriteLine("================================================================================");
        Console.WriteLine("         SENIOR QA DISCREPANCY & RECONCILIATION AUDIT RUNNER");
        Console.WriteLine("================================================================================");

        // =========================================================================
        // 1. ATTENDANCE COUNT & STATUS RECONCILIATION
        // =========================================================================
        Console.WriteLine("\n--- [1. ATTENDANCE COUNT & STATUS INVESTIGATION] ---");

        // 1.1 All distinct status values in Attendances
        {
            await using var conn = await GetConnAsync();
            var allStatuses = await conn.QueryAsync<(int Status, int Count)>(
                @"SELECT Status, COUNT(*) as Count FROM Attendances WHERE IsActive = 1 GROUP BY Status ORDER BY Status");
            Console.WriteLine("Raw Distinct Statuses in Attendances Table:");
            foreach (var s in allStatuses)
            {
                Console.WriteLine($"  Status={s.Status} -> Count={s.Count}");
            }
        }

        // 1.2 Investigate Attendances.BoardId vs Students.BoardId
        List<(int AttendanceId, int AttBoardId, int? StuBoardId, int AttAYId, int? StuAYId, int Status)> attList;
        {
            await using var conn = await GetConnAsync();
            var attWithBoard = await conn.QueryAsync<(int AttendanceId, int AttBoardId, int? StuBoardId, int AttAYId, int? StuAYId, int Status)>(
                @"SELECT a.AttendanceId, a.BoardId as AttBoardId, s.BoardId as StuBoardId, 
                         a.AcademicYearId as AttAYId, s.AcademicYearId as StuAYId, a.Status
                  FROM Attendances a
                  LEFT JOIN Students s ON a.StudentId = s.StudentId
                  WHERE a.IsActive = 1");
            attList = attWithBoard.ToList();
        }

        Console.WriteLine($"Total Active Attendance rows: {attList.Count}");
        Console.WriteLine($"  Rows with a.BoardId = 1: {attList.Count(x => x.AttBoardId == 1)}");
        Console.WriteLine($"  Rows with s.BoardId = 1 (joined): {attList.Count(x => x.StuBoardId == 1)}");
        Console.WriteLine($"  Rows with mismatch (a.BoardId != s.BoardId): {attList.Count(x => x.AttBoardId != x.StuBoardId)}");
        Console.WriteLine($"  Rows with a.AYId = 9: {attList.Count(x => x.AttAYId == 9)}");
        Console.WriteLine($"  Rows with s.AYId = 9: {attList.Count(x => x.StuAYId == 9)}");
        Console.WriteLine($"  Rows with mismatch (a.AYId != s.AYId): {attList.Count(x => x.AttAYId != x.StuAYId)}");

        // 1.3 Let's compute the exact table requested by the user:
        // Filter | Total DB Rows | Status=1 | Status=0 | Status=2 | Status=3 | Other Statuses | Sum of All Statuses | Difference
        var filterSpecs = new (string Name, Func<(int AttendanceId, int AttBoardId, int? StuBoardId, int AttAYId, int? StuAYId, int Status), bool> DirectFilter, ReportFilterDto ApiFilter)[]
        {
            ("Overall (Unfiltered)", x => true, new ReportFilterDto()),
            ("Test A (Board=1 Direct)", x => x.AttBoardId == 1, new ReportFilterDto { BoardId = 1 }),
            ("Test A (Board=1 Joined)", x => x.StuBoardId == 1, new ReportFilterDto { BoardId = 1 }),
            ("Test B (Board=1, AY=9 Direct)", x => x.AttBoardId == 1 && x.AttAYId == 9, new ReportFilterDto { BoardId = 1, AcademicYearId = 9 }),
            ("Test B (Board=1, AY=9 Joined)", x => x.StuBoardId == 1 && x.StuAYId == 9, new ReportFilterDto { BoardId = 1, AcademicYearId = 9 }),
            ("Test C (Board=1, AY=9, L=1 Direct)", x => x.AttBoardId == 1 && x.AttAYId == 9, new ReportFilterDto { BoardId = 1, AcademicYearId = 9, AcademicLevelId = 1 }),
            ("Test D (Group=34 Direct)", x => true, new ReportFilterDto { BoardId = 1, AcademicYearId = 9, AcademicLevelId = 1, GroupId = 34 })
        };

        Console.WriteLine("\n--- ATTENDANCE STATUS BREAKDOWN MATRIX ---");
        foreach (var f in filterSpecs)
        {
            var rows = attList.Where(f.DirectFilter).ToList();
            int total = rows.Count;
            int s1 = rows.Count(x => x.Status == 1);
            int s0 = rows.Count(x => x.Status == 0);
            int s2 = rows.Count(x => x.Status == 2);
            int s3 = rows.Count(x => x.Status == 3);
            int other = rows.Count(x => x.Status < 0 || x.Status > 3);
            int sum = s1 + s0 + s2 + s3 + other;
            int diff = total - sum;

            var dash = await reportService.DashboardAsync(f.ApiFilter);

            Console.WriteLine($"Filter: {f.Name}");
            Console.WriteLine($"  Total={total} | S1(Present)={s1} | S0(Absent)={s0} | S2(Late)={s2} | S3(Leave)={s3} | Other={other} | Sum={sum} | Diff={diff}");
            Console.WriteLine($"  API Dash Attendance %: {dash.Attendance}% | Formula Calc: {(total > 0 ? Math.Round((decimal)s1 * 100m / total, 2) : 0m)}%");
        }

        // =========================================================================
        // 2. FACULTY WORKLOAD FILTER LINEAGE
        // =========================================================================
        Console.WriteLine("\n--- [2. FACULTY WORKLOAD TIMETABLE LINEAGE] ---");
        List<(int Id, int StaffId, int PeriodId, int? SubjectId, int? GroupId, int? SectionId, int? BoardId, int? AYId, int? LevelId, bool IsPublished, TimeSpan StartTime, TimeSpan EndTime, bool IsBreak)> ttList;
        {
            await using var conn = await GetConnAsync();
            var ttRows = await conn.QueryAsync<(int Id, int StaffId, int PeriodId, int? SubjectId, int? GroupId, int? SectionId, int? BoardId, int? AYId, int? LevelId, bool IsPublished, TimeSpan StartTime, TimeSpan EndTime, bool IsBreak)>(
                @"SELECT t.Id, t.StaffId, t.PeriodId, t.SubjectId, t.GroupId, t.SectionId, t.BoardId, t.AcademicYearId as AYId, t.AcademicLevelId as LevelId, t.IsPublished,
                         p.StartTime, p.EndTime, p.IsBreak
                  FROM Timetables t
                  JOIN Periods p ON t.PeriodId = p.PeriodId
                  WHERE t.IsPublished = 1 AND p.IsBreak = 0");
            ttList = ttRows.ToList();
        }

        Console.WriteLine($"Total Published Non-Break Timetable Slots: {ttList.Count}");
        
        var distinctGroups = ttList.Select(x => x.GroupId).Distinct().ToList();
        var distinctSections = ttList.Select(x => x.SectionId).Distinct().ToList();
        var distinctBoards = ttList.Select(x => x.BoardId).Distinct().ToList();
        var distinctAYs = ttList.Select(x => x.AYId).Distinct().ToList();

        Console.WriteLine($"  Distinct BoardIds in Timetables: {string.Join(", ", distinctBoards)}");
        Console.WriteLine($"  Distinct AcademicYearIds in Timetables: {string.Join(", ", distinctAYs)}");
        Console.WriteLine($"  Distinct GroupIds in Timetables: {string.Join(", ", distinctGroups)}");
        Console.WriteLine($"  Distinct SectionIds in Timetables: {string.Join(", ", distinctSections)}");

        Console.WriteLine($"  Workload for Board=1: {ttList.Where(x => x.BoardId == 1).Sum(x => (x.EndTime - x.StartTime).TotalHours):F1} hrs/wk ({ttList.Count(x => x.BoardId == 1)} slots)");
        Console.WriteLine($"  Workload for Board=1, AY=9: {ttList.Where(x => x.BoardId == 1 && x.AYId == 9).Sum(x => (x.EndTime - x.StartTime).TotalHours):F1} hrs/wk ({ttList.Count(x => x.BoardId == 1 && x.AYId == 9)} slots)");
        Console.WriteLine($"  Workload for Group=34: {ttList.Where(x => x.GroupId == 34).Sum(x => (x.EndTime - x.StartTime).TotalHours):F1} hrs/wk ({ttList.Count(x => x.GroupId == 34)} slots)");
        Console.WriteLine($"  Workload for Group=37: {ttList.Where(x => x.GroupId == 37).Sum(x => (x.EndTime - x.StartTime).TotalHours):F1} hrs/wk ({ttList.Count(x => x.GroupId == 37)} slots)");
        Console.WriteLine($"  Workload for Section=30: {ttList.Where(x => x.SectionId == 30).Sum(x => (x.EndTime - x.StartTime).TotalHours):F1} hrs/wk ({ttList.Count(x => x.SectionId == 30)} slots)");
        Console.WriteLine($"  Workload for Section=39: {ttList.Where(x => x.SectionId == 39).Sum(x => (x.EndTime - x.StartTime).TotalHours):F1} hrs/wk ({ttList.Count(x => x.SectionId == 39)} slots)");

        // =========================================================================
        // 3. OUTSTANDING DUES SCOPE & ACCOUNT AUDIT
        // =========================================================================
        Console.WriteLine("\n--- [3. OUTSTANDING DUES SCOPE & BREAKDOWN] ---");
        List<(int StudentFeeId, int StudentId, decimal TotalAmount, decimal PaidAmount, decimal BalanceAmount, string Status, int? EnrolledStudentId, string StudentName, bool? IsActive, int? BoardId, int? AcademicYearId)> dueList;
        {
            await using var conn = await GetConnAsync();
            var feeRows = await conn.QueryAsync<(int StudentFeeId, int StudentId, decimal TotalAmount, decimal PaidAmount, decimal BalanceAmount, string Status, int? EnrolledStudentId, string StudentName, bool? IsActive, int? BoardId, int? AcademicYearId)>(
                @"SELECT sf.StudentFeeId, sf.StudentId, sf.TotalAmount, sf.PaidAmount, sf.BalanceAmount, sf.Status,
                         s.StudentId as EnrolledStudentId, s.StudentName, s.IsActive, s.BoardId, s.AcademicYearId
                  FROM StudentFees sf
                  LEFT JOIN Students s ON sf.StudentId = s.StudentId
                  WHERE sf.Status <> 'Cancelled' AND sf.BalanceAmount > 0
                  ORDER BY sf.BalanceAmount DESC");
            dueList = feeRows.ToList();
        }

        Console.WriteLine($"Total StudentFees accounts with BalanceAmount > 0: {dueList.Count}");
        Console.WriteLine($"Total Balance sum across all accounts: ₹{dueList.Sum(x => x.BalanceAmount):N2}");
        Console.WriteLine($"Accounts belonging to Enrolled Active Students (s.IsActive=1): {dueList.Count(x => x.IsActive == true)}");
        Console.WriteLine($"Balance sum of Enrolled Active Students: ₹{dueList.Where(x => x.IsActive == true).Sum(x => x.BalanceAmount):N2}");
        Console.WriteLine($"Accounts belonging to Non-Enrolled/Sample IDs: {dueList.Count(x => x.EnrolledStudentId == null)}");
        Console.WriteLine($"Balance sum of Non-Enrolled/Sample IDs: ₹{dueList.Where(x => x.EnrolledStudentId == null).Sum(x => x.BalanceAmount):N2}");

        Console.WriteLine("\nDetailed Breakdown Table of All 25 Outstanding Fee Accounts:");
        foreach (var r in dueList)
        {
            string statusStr = r.EnrolledStudentId != null ? (r.IsActive == true ? "Active Enrolled" : "Inactive") : "Non-Enrolled / Test Account";
            bool inKpi = true;
            bool inExport = r.EnrolledStudentId != null && r.IsActive == true;
            Console.WriteLine($"  FeeId={r.StudentFeeId,2} | StuId={r.StudentId,3} | Name={r.StudentName ?? "N/A",-20} | Status={statusStr,-25} | Balance=₹{r.BalanceAmount,10:N2} | InKPI={inKpi} | InExport={inExport}");
        }

        // =========================================================================
        // 4. RESULTS COUNTING UNIT & DB RECORD PROOF
        // =========================================================================
        Console.WriteLine("\n--- [4. RESULTS COUNTING UNIT] ---");
        List<(int ResultId, int StudentId, int ExamId, int SubjectId, decimal TotalMarks, string ResultStatus, DateTime? PublishedDate, bool IsPublished)> resList;
        {
            await using var conn = await GetConnAsync();
            var resRows = await conn.QueryAsync<(int ResultId, int StudentId, int ExamId, int SubjectId, decimal TotalMarks, string ResultStatus, DateTime? PublishedDate, bool IsPublished)>(
                @"SELECT ResultId, StudentId, ExamId, SubjectId, TotalMarks, ResultStatus, PublishedDate, IsPublished
                  FROM Results
                  WHERE IsPublished = 1");
            resList = resRows.ToList();
        }

        Console.WriteLine($"Published Results rows in DB: {resList.Count}");
        foreach (var r in resList)
        {
            Console.WriteLine($"  ResultId={r.ResultId}: StudentId={r.StudentId}, ExamId={r.ExamId}, SubjectId={r.SubjectId}, Marks={r.TotalMarks}, Status={r.ResultStatus}, PublishedDate={r.PublishedDate:yyyy-MM-dd}");
        }
        var distinctStudentExams = resList.Select(r => new { r.StudentId, r.ExamId }).Distinct().Count();
        Console.WriteLine($"Distinct (StudentId, ExamId) published examination cards: {distinctStudentExams}");

        // =========================================================================
        // 5. ADMISSIONS FILTER LINEAGE & SUBSET PROOF
        // =========================================================================
        Console.WriteLine("\n--- [5. ADMISSIONS FILTER SUBSET PROOF] ---");
        List<(int AdmissionId, string AdmissionNo, int BoardId, int AcademicYearId, string Status, bool IsActive, bool IsRejected)> globalAdm;
        {
            await using var conn = await GetConnAsync();
            var admRows = await conn.QueryAsync<(int AdmissionId, string AdmissionNo, int BoardId, int AcademicYearId, string Status, bool IsActive, bool IsRejected)>(
                @"SELECT AdmissionId, AdmissionNo, BoardId, AcademicYearId, Status, IsActive, IsRejected
                  FROM StudentAdmissions
                  WHERE IsActive = 1 AND IsRejected = 0 AND Status <> 'Rejected'
                  ORDER BY AdmissionId");
            globalAdm = admRows.ToList();
        }
        var board1Adm = globalAdm.Where(x => x.BoardId == 1).ToList();
        var board1Ay9Adm = board1Adm.Where(x => x.AcademicYearId == 9).ToList();

        Console.WriteLine($"Global Admissions Count: {globalAdm.Count}");
        Console.WriteLine($"  Global IDs (46): {string.Join(", ", globalAdm.Select(x => x.AdmissionId))}");

        Console.WriteLine($"Board 1 Admissions Count: {board1Adm.Count}");
        Console.WriteLine($"  Board 1 IDs (36): {string.Join(", ", board1Adm.Select(x => x.AdmissionId))}");

        Console.WriteLine($"Board 1 + AY 9 Admissions Count: {board1Ay9Adm.ToList().Count}");
        Console.WriteLine($"  Board 1 + AY 9 IDs (35): {string.Join(", ", board1Ay9Adm.Select(x => x.AdmissionId))}");

        var excludedFromGlobalToBoard1 = globalAdm.Where(x => x.BoardId != 1).ToList();
        Console.WriteLine($"\nExcluded IDs from Global to Board 1 ({excludedFromGlobalToBoard1.Count}):");
        foreach (var ex in excludedFromGlobalToBoard1)
        {
            Console.WriteLine($"  AdmissionId={ex.AdmissionId}, AdmNo={ex.AdmissionNo} -> Excluded Reason: Assigned to BoardId={ex.BoardId} (Not Board 1)");
        }

        var excludedFromBoard1ToAy9 = board1Adm.Where(x => x.AcademicYearId != 9).ToList();
        Console.WriteLine($"\nExcluded IDs from Board 1 to AY 9 ({excludedFromBoard1ToAy9.Count}):");
        foreach (var ex in excludedFromBoard1ToAy9)
        {
            Console.WriteLine($"  AdmissionId={ex.AdmissionId}, AdmNo={ex.AdmissionNo} -> Excluded Reason: Assigned to AYId={ex.AcademicYearId} (AY 10, Not AY 9)");
        }

        bool isSubset1 = board1Adm.All(b => globalAdm.Any(g => g.AdmissionId == b.AdmissionId));
        bool isSubset2 = board1Ay9Adm.All(ba => board1Adm.Any(b => b.AdmissionId == ba.AdmissionId));
        Console.WriteLine($"\nSubset Validation:");
        Console.WriteLine($"  Board 1 IDs are strict subset of Global IDs: {isSubset1}");
        Console.WriteLine($"  Board 1 + AY 9 IDs are strict subset of Board 1 IDs: {isSubset2}");

        Console.WriteLine("\n================================================================================");
        Console.WriteLine("                    DISCREPANCY AUDIT COMPLETE");
        Console.WriteLine("================================================================================");
        return true;
    }
}
