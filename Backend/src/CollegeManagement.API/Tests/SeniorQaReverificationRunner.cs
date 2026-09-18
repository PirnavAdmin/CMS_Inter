using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ClosedXML.Excel;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Models.Reports;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Services.Implementations;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class SeniorQaReverificationRunner
{
    private readonly string _connectionString;
    private readonly IServiceProvider _serviceProvider;

    public SeniorQaReverificationRunner(string connectionString, IServiceProvider serviceProvider)
    {
        _connectionString = connectionString;
        _serviceProvider = serviceProvider;
    }

    public async Task<bool> RunVerificationAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("     SENIOR QA EVIDENCE-BASED REVERIFICATION RUNNER - REPORTS & ANALYTICS");
        Console.WriteLine("================================================================================");

        using var conn = new MySqlConnection(_connectionString);
        await conn.OpenAsync();

        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var reportRepo = scope.ServiceProvider.GetRequiredService<CollegeManagement.API.Repositories.Interfaces.IReportRepository>();
        var reportService = scope.ServiceProvider.GetRequiredService<CollegeManagement.API.Services.Interfaces.IReportService>();

        // -------------------------------------------------------------------------
        // 1. LIVE DB DIRECT TABLE INVESTIGATION (RAW RECORDS & IDS)
        // -------------------------------------------------------------------------
        Console.WriteLine("\n[1. LIVE DB DIRECT TABLE INVESTIGATION]");

        // 1.1 Admissions
        var rawAdmissions = (await conn.QueryAsync<(int AdmissionId, string AdmissionNo, string FirstName, string LastName, int BoardId, int AcademicYearId, int AcademicLevelId, int GroupId, string Status, bool IsActive, bool IsRejected, bool IsApproved, DateTime AdmissionDate)>(
            @"SELECT `AdmissionId`, `AdmissionNo`, `FirstName`, `LastName`, `BoardId`, `AcademicYearId`, `AcademicLevelId`, `GroupId`, `Status`, `IsActive`, `IsRejected`, `IsApproved`, `AdmissionDate`
              FROM `StudentAdmissions`
              ORDER BY `AdmissionId`"
        )).ToList();

        var validAdmissions = rawAdmissions.Where(a => a.IsActive && !a.IsRejected && a.Status != "Rejected").ToList();
        Console.WriteLine($"Total Raw Admissions in DB: {rawAdmissions.Count}");
        Console.WriteLine($"Valid Active Non-Rejected Admissions: {validAdmissions.Count}");
        Console.WriteLine($"Valid Admission IDs ({validAdmissions.Count}): " + string.Join(", ", validAdmissions.Select(a => a.AdmissionId)));
        var rejectedOrInactiveAdm = rawAdmissions.Where(a => !a.IsActive || a.IsRejected || a.Status == "Rejected").ToList();
        Console.WriteLine($"Excluded / Inactive / Rejected Admission IDs ({rejectedOrInactiveAdm.Count}): " + string.Join(", ", rejectedOrInactiveAdm.Select(a => $"{a.AdmissionId} (Active={a.IsActive}, Rej={a.IsRejected}, Status={a.Status})")));

        // 1.2 Student Strength
        var rawStudents = (await conn.QueryAsync<(int StudentId, string AdmissionNo, string RollNo, string StudentName, int? BoardId, int? AcademicYearId, int? AcademicLevelId, int? GroupId, int? SectionId, int? AdmissionId, bool IsActive)>(
            @"SELECT `StudentId`, `AdmissionNo`, `RollNo`, `StudentName`, `BoardId`, `AcademicYearId`, `AcademicLevelId`, `GroupId`, `SectionId`, `AdmissionId`, `IsActive`
              FROM `Students`
              ORDER BY `StudentId`"
        )).ToList();

        var activeStudents = rawStudents.Where(s => s.IsActive).ToList();
        Console.WriteLine($"\nTotal Students in DB: {rawStudents.Count}");
        Console.WriteLine($"Active Students: {activeStudents.Count}");
        Console.WriteLine($"Active Student IDs ({activeStudents.Count}): " + string.Join(", ", activeStudents.Select(s => s.StudentId)));

        // Difference analysis between Admissions and Students
        Console.WriteLine("\n--- Admissions (46) vs Students (49) Traceability Analysis ---");
        var studentsWithoutAdmissionId = activeStudents.Where(s => !s.AdmissionId.HasValue).ToList();
        var studentsWithAdmissionId = activeStudents.Where(s => s.AdmissionId.HasValue).ToList();
        Console.WriteLine($"Students with AdmissionId link: {studentsWithAdmissionId.Count}");
        Console.WriteLine($"Students without AdmissionId (Directly Enrolled): {studentsWithoutAdmissionId.Count}");
        foreach (var s in studentsWithoutAdmissionId)
        {
            Console.WriteLine($"  - StudentId: {s.StudentId}, Name: {s.StudentName}, AdmNo: {s.AdmissionNo}, Board: {s.BoardId}, AY: {s.AcademicYearId}, Group: {s.GroupId}, Sec: {s.SectionId}");
        }

        // Check students whose AdmissionId is not in StudentAdmissions table
        var admIdSet = rawAdmissions.Select(a => a.AdmissionId).ToHashSet();
        var studentsOrphanAdm = activeStudents.Where(s => s.AdmissionId.HasValue && !admIdSet.Contains(s.AdmissionId.Value)).ToList();
        Console.WriteLine($"Students with non-existent AdmissionId in DB: {studentsOrphanAdm.Count}");
        foreach (var s in studentsOrphanAdm)
        {
            Console.WriteLine($"  - StudentId: {s.StudentId}, Name: {s.StudentName}, AdmissionId: {s.AdmissionId}");
        }

        // 1.3 Attendance
        var rawAttendance = (await conn.QueryAsync<(int AttendanceId, int StudentId, int Status, DateTime AttendanceDate, bool IsActive)>(
            @"SELECT `AttendanceId`, `StudentId`, `Status`, `AttendanceDate`, `IsActive`
              FROM `Attendances`"
        )).ToList();

        var activeAttendance = rawAttendance.Where(a => a.IsActive).ToList();
        var presentCount = activeAttendance.Count(a => a.Status == 1);
        var absentCount = activeAttendance.Count(a => a.Status == 0);
        var lateCount = activeAttendance.Count(a => a.Status == 2);
        var leaveCount = activeAttendance.Count(a => a.Status == 3);
        var totalAtt = activeAttendance.Count;
        decimal attPct = totalAtt > 0 ? Math.Round((decimal)presentCount * 100m / totalAtt, 2) : 0;
        Console.WriteLine($"\nAttendance Records: Total={rawAttendance.Count}, Active={activeAttendance.Count}");
        Console.WriteLine($"  Present={presentCount}, Absent={absentCount}, Late={lateCount}, Leave={leaveCount}");
        Console.WriteLine($"  Formula: {presentCount} / {totalAtt} * 100 = {attPct}%");

        // 1.4 Fee Collection
        var rawFeePayments = (await conn.QueryAsync<(int FeePaymentId, int StudentId, decimal Amount, DateTime PaymentDate, string Status)>(
            @"SELECT `FeePaymentId`, `StudentId`, `Amount`, `PaymentDate`, `Status`
              FROM `FeePayments`
              ORDER BY `FeePaymentId`"
        )).ToList();

        var validPayments = rawFeePayments.Where(p => p.Status != "Cancelled" && p.Status != "Failed").ToList();
        var totalCollected = validPayments.Sum(p => p.Amount);
        Console.WriteLine($"\nFee Payments: Total Rows={rawFeePayments.Count}, Valid Non-Cancelled/Failed={validPayments.Count}");
        Console.WriteLine($"Total Amount Collected: ₹{totalCollected:N2}");
        Console.WriteLine("All Valid Payment IDs & Amounts:");
        foreach (var p in validPayments)
        {
            Console.WriteLine($"  PaymentId={p.FeePaymentId}, StudentId={p.StudentId}, Amount=₹{p.Amount:N2}, Date={p.PaymentDate:yyyy-MM-dd}, Status={p.Status}");
        }

        // 1.5 Outstanding Dues
        var rawStudentFees = (await conn.QueryAsync<(int StudentFeeId, int StudentId, decimal TotalAmount, decimal PaidAmount, decimal BalanceAmount, string Status)>(
            @"SELECT `StudentFeeId`, `StudentId`, `TotalAmount`, `PaidAmount`, `BalanceAmount`, `Status`
              FROM `StudentFees`
              ORDER BY `StudentFeeId`"
        )).ToList();

        var validDueFees = rawStudentFees.Where(sf => sf.Status != "Cancelled" && sf.BalanceAmount > 0).ToList();
        var totalDues = validDueFees.Sum(sf => sf.BalanceAmount);
        Console.WriteLine($"\nStudent Fees Accounts: Total={rawStudentFees.Count}, With Dues={validDueFees.Count}");
        Console.WriteLine($"Total Outstanding Dues: ₹{totalDues:N2}");
        Console.WriteLine("All Outstanding Fee Account IDs & Balances:");
        foreach (var sf in validDueFees)
        {
            Console.WriteLine($"  FeeId={sf.StudentFeeId}, StudentId={sf.StudentId}, Total=₹{sf.TotalAmount:N2}, Paid=₹{sf.PaidAmount:N2}, Due=₹{sf.BalanceAmount:N2}, Status={sf.Status}");
        }

        // 1.6 Examinations Conducted
        var rawExams = (await conn.QueryAsync<(int ExamId, string ExamCode, string ExamName, string Status, DateTime StartDate, DateTime EndDate, bool IsActive)>(
            @"SELECT `ExamId`, `ExamCode`, `ExamName`, `Status`, `StartDate`, `EndDate`, `IsActive`
              FROM `Examinations`
              ORDER BY `ExamId`"
        )).ToList();

        var activeExams = rawExams.Where(e => e.IsActive).ToList();
        Console.WriteLine($"\nExaminations: Total={rawExams.Count}, Active={activeExams.Count}");
        Console.WriteLine("All Active Exam IDs & Status/Dates:");
        foreach (var e in activeExams)
        {
            Console.WriteLine($"  ExamId={e.ExamId}, Code={e.ExamCode}, Name={e.ExamName}, Status={e.Status}, Start={e.StartDate}, End={e.EndDate}");
        }

        // 1.7 Results Published & Counting Unit
        var rawResults = (await conn.QueryAsync<(int ResultId, int StudentId, int ExamId, int SubjectId, decimal TotalMarks, string ResultStatus, bool IsPublished, DateTime? PublishedDate)>(
            @"SELECT `ResultId`, `StudentId`, `ExamId`, `SubjectId`, `TotalMarks`, `ResultStatus`, `IsPublished`, `PublishedDate`
              FROM `Results`
              ORDER BY `ResultId`"
        )).ToList();

        var publishedResults = rawResults.Where(r => r.IsPublished).ToList();
        var distinctStudentExams = publishedResults.Select(r => new { r.StudentId, r.ExamId }).Distinct().ToList();
        Console.WriteLine($"\nResults Rows in DB: Total={rawResults.Count}, Published={publishedResults.Count}");
        Console.WriteLine("All Published Result Subject Rows:");
        foreach (var r in publishedResults)
        {
            Console.WriteLine($"  ResultId={r.ResultId}, StudentId={r.StudentId}, ExamId={r.ExamId}, SubjectId={r.SubjectId}, Marks={r.TotalMarks}, Status={r.ResultStatus}, PublishedDate={r.PublishedDate:yyyy-MM-dd}");
        }
        Console.WriteLine($"Card Metric 'Results Published' counts DISTINCT student-exam pairs: {distinctStudentExams.Count} (StudentId={distinctStudentExams[0].StudentId}, ExamId={distinctStudentExams[0].ExamId})");

        // 1.8 Faculty Workload
        var rawTimetables = (await conn.QueryAsync<(int TimetableId, int StaffId, int PeriodId, int? SubjectId, TimeSpan StartTime, TimeSpan EndTime, bool IsBreak, bool IsPublished)>(
            @"SELECT tt.`Id` AS TimetableId, tt.`StaffId`, tt.`PeriodId`, tt.`SubjectId`, p.`StartTime`, p.`EndTime`, p.`IsBreak`, tt.`IsPublished`
              FROM `Timetables` tt
              JOIN `Periods` p ON p.`PeriodId` = tt.`PeriodId`
              WHERE tt.`IsPublished` = 1 AND p.`IsBreak` = 0
              ORDER BY tt.`Id`"
        )).ToList();

        decimal totalWorkload = 0;
        foreach (var t in rawTimetables)
        {
            var diff = (t.EndTime - t.StartTime).TotalMinutes;
            if (diff > 0) totalWorkload += (decimal)(diff / 60.0);
        }
        totalWorkload = Math.Round(totalWorkload, 1);
        Console.WriteLine($"\nFaculty Workload: Qualifying Timetable slots={rawTimetables.Count}, Total Hours/Wk={totalWorkload}");
        foreach (var t in rawTimetables)
        {
            var diff = (t.EndTime - t.StartTime).TotalMinutes / 60.0;
            Console.WriteLine($"  TimetableId={t.TimetableId}, StaffId={t.StaffId}, PeriodId={t.PeriodId}, Time={t.StartTime} to {t.EndTime} ({diff:F2} hrs)");
        }

        // 1.9 Pass Percentage
        var studentExamResults = publishedResults.GroupBy(r => new { r.StudentId, r.ExamId }).ToList();
        int passedCount = studentExamResults.Count(g => g.All(r => r.ResultStatus == "Pass" || r.ResultStatus == "Passed" || r.ResultStatus == "PROMOTED"));
        int appearedCount = studentExamResults.Count;
        decimal passPercentage = appearedCount > 0 ? Math.Round((decimal)passedCount * 100m / appearedCount, 2) : 0;
        Console.WriteLine($"\nPass Percentage: Appeared Students={appearedCount}, Passed Students={passedCount}, Pass %={passPercentage}%");

        // 1.10 Toppers
        var topperStudents = studentExamResults
            .Where(g => g.All(r => r.ResultStatus == "Pass" || r.ResultStatus == "Passed" || r.ResultStatus == "PROMOTED"))
            .Select(g => new
            {
                StudentId = g.Key.StudentId,
                ExamId = g.Key.ExamId,
                TotalMarks = g.Sum(x => x.TotalMarks),
                MaxMarks = g.Count() * 100m,
                AvgPct = g.Average(x => x.TotalMarks)
            })
            .OrderByDescending(x => x.TotalMarks)
            .Take(10)
            .ToList();
        Console.WriteLine($"\nToppers Identified Count: {topperStudents.Count}");
        foreach (var top in topperStudents)
        {
            Console.WriteLine($"  StudentId={top.StudentId}, ExamId={top.ExamId}, TotalMarks={top.TotalMarks}/{top.MaxMarks}, Percentage={top.AvgPct:F2}%");
        }

        // -------------------------------------------------------------------------
        // 2. CRITICAL FILTER TESTING (TESTS A - F)
        // -------------------------------------------------------------------------
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("     2. CRITICAL FILTER TESTING (TESTS A - F)");
        Console.WriteLine("================================================================================");

        var filterTests = new (string Name, ReportFilterDto Filter)[]
        {
            ("Test A: Board=1", new ReportFilterDto { BoardId = 1 }),
            ("Test B: Board=1, AY=9", new ReportFilterDto { BoardId = 1, AcademicYearId = 9 }),
            ("Test C: Board=1, AY=9, Level=1", new ReportFilterDto { BoardId = 1, AcademicYearId = 9, AcademicLevelId = 1 }),
            ("Test D: Board=1, AY=9, Level=1, Group=34", new ReportFilterDto { BoardId = 1, AcademicYearId = 9, AcademicLevelId = 1, GroupId = 34 }),
            ("Test E: Board=1, AY=9, Level=1, Group=34, Sec=30", new ReportFilterDto { BoardId = 1, AcademicYearId = 9, AcademicLevelId = 1, GroupId = 34, SectionId = 30 }),
            ("Test F: All + Dates (2025-01-01 to 2026-12-31)", new ReportFilterDto { BoardId = 1, AcademicYearId = 9, AcademicLevelId = 1, GroupId = 34, SectionId = 30, FromDate = new DateTime(2025, 1, 1), ToDate = new DateTime(2026, 12, 31) })
        };

        foreach (var t in filterTests)
        {
            var res = await reportService.DashboardAsync(t.Filter);
            Console.WriteLine($"\n--- {t.Name} ---");
            Console.WriteLine($"  Admissions:       {res.Admissions}");
            Console.WriteLine($"  Attendance:       {res.Attendance}%");
            Console.WriteLine($"  Fee Collection:   ₹{res.FeeCollection:N2}");
            Console.WriteLine($"  Outstanding Dues: ₹{res.DueFees:N2}");
            Console.WriteLine($"  Examinations:     {res.Examinations}");
            Console.WriteLine($"  Results Published:{res.ResultsPublished}");
            Console.WriteLine($"  Faculty Workload: {res.FacultyWorkload} hrs/wk");
            Console.WriteLine($"  Student Strength: {res.StudentStrength}");
            Console.WriteLine($"  Pass Percentage:  {res.PassPercentage}%");
            Console.WriteLine($"  Toppers:          {res.ToppersIdentified}");
        }

        // -------------------------------------------------------------------------
        // 3. DEEP DIVE INVESTIGATION: TEST D / E / F ANOMALIES
        // -------------------------------------------------------------------------
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("     3. DEEP DIVE INVESTIGATION: TEST D / E / F ANOMALY TRACING");
        Console.WriteLine("================================================================================");

        var targetStudents = activeStudents.Where(s => s.BoardId == 1 && s.AcademicYearId == 9 && s.AcademicLevelId == 1 && s.GroupId == 34 && s.SectionId == 30).ToList();
        Console.WriteLine($"Matching Students for Group 34 & Section 30: {targetStudents.Count}");
        foreach (var s in targetStudents)
        {
            Console.WriteLine($"Student Details: StudentId={s.StudentId}, Name={s.StudentName}, AdmNo={s.AdmissionNo}, AdmId={s.AdmissionId}, Board={s.BoardId}, AY={s.AcademicYearId}, Group={s.GroupId}, Sec={s.SectionId}");
            
            // Trace Admissions
            var admRow = rawAdmissions.FirstOrDefault(a => a.AdmissionId == s.AdmissionId || a.AdmissionNo == s.AdmissionNo);
            if (admRow.AdmissionId > 0)
            {
                Console.WriteLine($"  -> Linked Admission Record found: AdmissionId={admRow.AdmissionId}, Board={admRow.BoardId}, AY={admRow.AcademicYearId}, Group={admRow.GroupId}, Status={admRow.Status}, IsActive={admRow.IsActive}, IsRejected={admRow.IsRejected}");
            }
            else
            {
                Console.WriteLine("  -> Linked Admission Record: NONE FOUND in StudentAdmissions table! Student was directly enrolled into Students table.");
            }

            // Trace Attendance
            var stuAtt = rawAttendance.Where(a => a.StudentId == s.StudentId && a.IsActive).ToList();
            var stuPresent = stuAtt.Count(a => a.Status == 1);
            Console.WriteLine($"  -> Attendance Records for Student {s.StudentId}: Total={stuAtt.Count}, Present={stuPresent}, %={(stuAtt.Count > 0 ? (decimal)stuPresent * 100m / stuAtt.Count : 0):F2}%");

            // Trace Fees
            var stuFees = validPayments.Where(p => p.StudentId == s.StudentId).ToList();
            Console.WriteLine($"  -> Fee Payments for Student {s.StudentId}: Count={stuFees.Count}, Total Paid=₹{stuFees.Sum(p => p.Amount):N2}");
            foreach (var fp in stuFees)
            {
                Console.WriteLine($"     - PaymentId={fp.FeePaymentId}, Amount=₹{fp.Amount:N2}, Date={fp.PaymentDate:yyyy-MM-dd}");
            }

            // Trace Dues
            var stuDues = validDueFees.Where(sf => sf.StudentId == s.StudentId).ToList();
            Console.WriteLine($"  -> Outstanding Dues for Student {s.StudentId}: Count={stuDues.Count}, Due Amount=₹{stuDues.Sum(sf => sf.BalanceAmount):N2}");
        }

        // -------------------------------------------------------------------------
        // 4. EXPORT VERIFICATION (PDF & EXCEL GENERATION AND ROW CONTENT INSPECTION)
        // -------------------------------------------------------------------------
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("     4. EXPORT VERIFICATION (UNFILTERED & FILTERED CONTENT PARSING)");
        Console.WriteLine("================================================================================");

        var exportReportTypes = new[]
        {
            "dashboard",
            "admissions",
            "student-strength",
            "attendance",
            "fee-collection",
            "outstanding-fees",
            "examinations",
            "results",
            "pass-percentage",
            "toppers",
            "faculty-workload"
        };

        var emptyFilter = new ReportFilterDto();
        var validFilter = new ReportFilterDto { BoardId = 1, AcademicYearId = 9, AcademicLevelId = 1, GroupId = 34, SectionId = 30 };

        Console.WriteLine("\n--- 4.1 Unfiltered Exports Content Verification ---");
        foreach (var rType in exportReportTypes)
        {
            // PDF
            var pdfRes = await reportService.ExportAsync(rType, emptyFilter, true);
            // Excel
            var excelRes = await reportService.ExportAsync(rType, emptyFilter, false);

            using var stream = new MemoryStream(excelRes.Content);
            using var wb = new XLWorkbook(stream);
            var ws = wb.Worksheets.First();
            var rowCount = ws.RowsUsed().Count();

            Console.WriteLine($"[UNFILTERED] Type: {rType,-20} | PDF: {pdfRes.Content.Length,6} bytes | Excel: {excelRes.Content.Length,6} bytes | Excel Used Rows: {rowCount}");
        }

        Console.WriteLine("\n--- 4.2 Filtered Exports (Board=1, AY=9, Level=1, Group=34, Sec=30) Verification ---");
        foreach (var rType in exportReportTypes)
        {
            var pdfRes = await reportService.ExportAsync(rType, validFilter, true);
            var excelRes = await reportService.ExportAsync(rType, validFilter, false);

            using var stream = new MemoryStream(excelRes.Content);
            using var wb = new XLWorkbook(stream);
            var ws = wb.Worksheets.First();
            var rowCount = ws.RowsUsed().Count();

            Console.WriteLine($"[FILTERED]   Type: {rType,-20} | PDF: {pdfRes.Content.Length,6} bytes | Excel: {excelRes.Content.Length,6} bytes | Excel Used Rows: {rowCount}");
        }

        // -------------------------------------------------------------------------
        // 5. ZERO-DATA TEST (INVALID FILTER)
        // -------------------------------------------------------------------------
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("     5. ZERO-DATA TEST (INVALID FILTER: BoardId=99999)");
        Console.WriteLine("================================================================================");

        var invalidFilter = new ReportFilterDto { BoardId = 99999 };
        var zeroDashboard = await reportService.DashboardAsync(invalidFilter);
        var zeroAdmissions = await reportService.AdmissionsAsync(invalidFilter);
        var zeroStrength = await reportService.StudentStrengthAsync(invalidFilter);
        var zeroAttendance = await reportService.AttendanceAsync(invalidFilter);
        var zeroFees = await reportService.FeeCollectionAsync(invalidFilter);
        var zeroDues = await reportService.OutstandingFeesAsync(invalidFilter);
        var zeroExams = await reportService.ExaminationsAsync(invalidFilter);
        var zeroResults = await reportService.ResultsAsync(invalidFilter);
        var zeroPass = await reportService.PassPercentageAsync(invalidFilter);
        var zeroToppers = await reportService.ToppersAsync(invalidFilter);
        var zeroWorkload = await reportService.FacultyWorkloadAsync(invalidFilter);

        Console.WriteLine($"Zero Dashboard Admissions:       {zeroDashboard.Admissions}");
        Console.WriteLine($"Zero Dashboard Attendance:       {zeroDashboard.Attendance}%");
        Console.WriteLine($"Zero Dashboard Fee Collection:   ₹{zeroDashboard.FeeCollection}");
        Console.WriteLine($"Zero Dashboard Outstanding Dues: ₹{zeroDashboard.DueFees}");
        Console.WriteLine($"Zero Dashboard Examinations:     {zeroDashboard.Examinations}");
        Console.WriteLine($"Zero Dashboard Results Published:{zeroDashboard.ResultsPublished}");
        Console.WriteLine($"Zero Dashboard Faculty Workload: {zeroDashboard.FacultyWorkload} hrs/wk");
        Console.WriteLine($"Zero Dashboard Student Strength: {zeroDashboard.StudentStrength}");
        Console.WriteLine($"Zero Dashboard Pass Percentage:  {zeroDashboard.PassPercentage}%");
        Console.WriteLine($"Zero Dashboard Toppers:          {zeroDashboard.ToppersIdentified}");

        Console.WriteLine($"Zero Detail Lists Counts: Adm={zeroAdmissions.Count}, Str={zeroStrength.Count}, Att={zeroAttendance.Count}, Fee={zeroFees.Count}, Due={zeroDues.Count}, Exm={zeroExams.Count}, Res={zeroResults.Count}, Pass={zeroPass.Count}, Top={zeroToppers.Count}, Wkld={zeroWorkload.Count}");

        // -------------------------------------------------------------------------
        // 6. DATE FILTER TEST (AUTHORITATIVE DOMAIN DATE VALIDATION)
        // -------------------------------------------------------------------------
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("     6. DATE FILTER TEST (NARROW DATE RANGE)");
        Console.WriteLine("================================================================================");

        var dateFilter = new ReportFilterDto
        {
            FromDate = new DateTime(2026, 8, 1),
            ToDate = new DateTime(2026, 8, 15)
        };

        var dateDash = await reportService.DashboardAsync(dateFilter);
        var dateAdm = await reportService.AdmissionsAsync(dateFilter);
        var dateAtt = await reportService.AttendanceAsync(dateFilter);
        var dateFees = await reportService.FeeCollectionAsync(dateFilter);
        var dateExams = await reportService.ExaminationsAsync(dateFilter);
        var dateResults = await reportService.ResultsAsync(dateFilter);

        Console.WriteLine($"Narrow Date (2026-08-01 to 2026-08-15) Dashboard:");
        Console.WriteLine($"  Admissions:     {dateDash.Admissions} (Details: {dateAdm.Count})");
        Console.WriteLine($"  Attendance:     {dateDash.Attendance}% (Details: {dateAtt.Count})");
        Console.WriteLine($"  Fee Collection: ₹{dateDash.FeeCollection:N2} (Details: {dateFees.Count})");
        Console.WriteLine($"  Examinations:   {dateDash.Examinations} (Details: {dateExams.Count})");
        Console.WriteLine($"  Results:        {dateDash.ResultsPublished} (Details: {dateResults.Count})");

        // -------------------------------------------------------------------------
        // 7. POSITIVE DATE RANGE DISCOVERY & VERIFICATION
        // -------------------------------------------------------------------------
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("     7. POSITIVE DATE RANGE DISCOVERY & VERIFICATION");
        Console.WriteLine("================================================================================");

        using var freshConn = new MySqlConnection(_connectionString);
        await freshConn.OpenAsync();

        var admDates = (await freshConn.QueryAsync<DateTime>(@"SELECT AdmissionDate FROM StudentAdmissions WHERE IsActive = 1 AND IsRejected = 0")).ToList();
        var attDates = (await freshConn.QueryAsync<DateTime>(@"SELECT AttendanceDate FROM Attendances WHERE IsActive = 1")).ToList();
        var feeDates = (await freshConn.QueryAsync<DateTime>(@"SELECT PaymentDate FROM FeePayments WHERE Status NOT IN ('Cancelled', 'Failed')")).ToList();
        var examDates = (await freshConn.QueryAsync<(DateTime StartDate, DateTime EndDate)>(@"SELECT StartDate, EndDate FROM Examinations WHERE IsActive = 1")).ToList();
        var resDates = (await freshConn.QueryAsync<DateTime>(@"SELECT CreatedAt FROM Results WHERE IsPublished = 1")).ToList();

        Console.WriteLine($"Admissions Date Range: Min={admDates.Min():yyyy-MM-dd}, Max={admDates.Max():yyyy-MM-dd}, Total={admDates.Count}");
        Console.WriteLine($"Attendance Date Range: Min={attDates.Min():yyyy-MM-dd}, Max={attDates.Max():yyyy-MM-dd}, Total={attDates.Count}");
        Console.WriteLine($"Fee Payments Date Range: Min={feeDates.Min():yyyy-MM-dd}, Max={feeDates.Max():yyyy-MM-dd}, Total={feeDates.Count}");
        Console.WriteLine($"Exams Date Range: Min={examDates.Min(e => e.StartDate):yyyy-MM-dd}, Max={examDates.Max(e => e.EndDate):yyyy-MM-dd}, Total={examDates.Count}");
        Console.WriteLine($"Results CreatedAt Range: Min={resDates.Min():yyyy-MM-dd}, Max={resDates.Max():yyyy-MM-dd}, Total={resDates.Count}");

        var posFilter = new ReportFilterDto
        {
            BoardId = 1,
            AcademicYearId = 9,
            FromDate = new DateTime(2026, 1, 1),
            ToDate = new DateTime(2026, 12, 31)
        };
        var posDash = await reportService.DashboardAsync(posFilter);
        var posAdm = await reportService.AdmissionsAsync(posFilter);
        var posAtt = await reportService.AttendanceAsync(posFilter);
        var posFee = await reportService.FeeCollectionAsync(posFilter);
        var posDue = await reportService.OutstandingFeesAsync(posFilter);
        var posExams = await reportService.ExaminationsAsync(posFilter);
        var posRes = await reportService.ResultsAsync(posFilter);
        var posPass = await reportService.PassPercentageAsync(posFilter);
        var posTop = await reportService.ToppersAsync(posFilter);
        var posWkld = await reportService.FacultyWorkloadAsync(posFilter);

        Console.WriteLine($"\nPositive Date Range (Board=1, AY=9, 2026-01-01 to 2026-12-31):");
        Console.WriteLine($"  Admissions:       {posDash.Admissions} (Detail DTO: {posAdm.Count})");
        Console.WriteLine($"  Attendance:       {posDash.Attendance}% (Detail DTO: {posAtt.Count})");
        Console.WriteLine($"  Fee Collection:   ₹{posDash.FeeCollection:N2} (Detail DTO: {posFee.Count})");
        Console.WriteLine($"  Outstanding Dues: ₹{posDash.DueFees:N2} (Detail DTO: {posDue.Count})");
        Console.WriteLine($"  Examinations:     {posDash.Examinations} (Detail DTO: {posExams.Count})");
        Console.WriteLine($"  Results:          {posDash.ResultsPublished} (Detail DTO: {posRes.Count})");
        Console.WriteLine($"  Faculty Workload: {posDash.FacultyWorkload} hrs/wk (Detail DTO: {posWkld.Count})");
        Console.WriteLine($"  Student Strength: {posDash.StudentStrength}");
        Console.WriteLine($"  Pass Percentage:  {posDash.PassPercentage}% (Detail DTO: {posPass.Count})");
        Console.WriteLine($"  Toppers:          {posDash.ToppersIdentified} (Detail DTO: {posTop.Count})");

        // -------------------------------------------------------------------------
        // 8. ID-LEVEL EXPORT RECONCILIATION
        // -------------------------------------------------------------------------
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("     8. EXACT ID-LEVEL RECONCILIATION ACROSS DB -> API -> EXCEL -> PDF");
        Console.WriteLine("================================================================================");

        // 8.1 Admissions
        var dbAdmIds = validAdmissions.Select(a => a.AdmissionId).OrderBy(x => x).ToList();
        var apiAdm = await reportService.AdmissionsAsync(emptyFilter);
        var apiAdmIds = apiAdm.Select(a => a.AdmissionId).OrderBy(x => x).ToList();
        Console.WriteLine($"Admissions IDs: DB Count={dbAdmIds.Count}, API Count={apiAdmIds.Count}, DB==API: {dbAdmIds.SequenceEqual(apiAdmIds)}");

        // 8.2 Student Strength
        var dbStudentIds = activeStudents.Select(s => s.StudentId).OrderBy(x => x).ToList();
        var apiStrength = await reportService.StudentStrengthAsync(emptyFilter);
        var apiStudentIds = apiStrength.SelectMany(g => g.Students).Select(s => s.StudentId).OrderBy(x => x).ToList();
        Console.WriteLine($"Student Strength IDs: DB Count={dbStudentIds.Count}, API Count={apiStudentIds.Count}, DB==API: {dbStudentIds.SequenceEqual(apiStudentIds)}");

        // 8.3 Fee Collection
        var dbPaymentIds = validPayments.Select(p => p.FeePaymentId).OrderBy(x => x).ToList();
        var apiFee = await reportService.FeeCollectionAsync(emptyFilter);
        var apiPaymentIds = apiFee.Select(p => p.PaymentId).OrderBy(x => x).ToList();
        Console.WriteLine($"Fee Payment IDs: DB Count={dbPaymentIds.Count}, API Count={apiPaymentIds.Count}, DB==API: {dbPaymentIds.SequenceEqual(apiPaymentIds)}");

        // 8.4 Outstanding Dues
        var dbDueFeeIds = validDueFees.Select(f => f.StudentFeeId).OrderBy(x => x).ToList();
        var apiDues = await reportService.OutstandingFeesAsync(emptyFilter);
        var apiDueFeeIds = apiDues.Select(f => f.StudentFeeId).OrderBy(x => x).ToList();
        Console.WriteLine($"Outstanding Fee Account IDs: DB Count={dbDueFeeIds.Count}, API Count={apiDueFeeIds.Count}, DB==API: {dbDueFeeIds.SequenceEqual(apiDueFeeIds)}");

        // 8.5 Examinations
        var dbExamIds = activeExams.Select(e => e.ExamId).OrderBy(x => x).ToList();
        var apiExams = await reportService.ExaminationsAsync(emptyFilter);
        var apiExamIds = apiExams.Select(e => e.ExaminationId).OrderBy(x => x).ToList();
        Console.WriteLine($"Examination IDs: DB Count={dbExamIds.Count}, API Count={apiExamIds.Count}, DB==API: {dbExamIds.SequenceEqual(apiExamIds)}");

        // 8.6 Results
        var dbResultIds = publishedResults.Select(r => r.ResultId).OrderBy(x => x).ToList();
        var apiResults = await reportService.ResultsAsync(emptyFilter);
        var apiResultIds = apiResults.Select(r => r.ResultId).OrderBy(x => x).ToList();
        Console.WriteLine($"Result IDs: DB Count={dbResultIds.Count}, API Count={apiResultIds.Count}, DB==API: {dbResultIds.SequenceEqual(apiResultIds)}");

        // -------------------------------------------------------------------------
        // 9. ATTENDANCE FORMULA MATRIX ACROSS ALL FILTER COMBINATIONS
        // -------------------------------------------------------------------------
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("     9. ATTENDANCE FORMULA PROOF MATRIX");
        Console.WriteLine("================================================================================");

        var attFilterCases = new (string CaseName, ReportFilterDto Filter)[]
        {
            ("Overall (Unfiltered)", new ReportFilterDto()),
            ("Board=1", new ReportFilterDto { BoardId = 1 }),
            ("Board=1, AY=9", new ReportFilterDto { BoardId = 1, AcademicYearId = 9 }),
            ("Board=1, AY=9, Level=1", new ReportFilterDto { BoardId = 1, AcademicYearId = 9, AcademicLevelId = 1 }),
            ("Board=1, AY=9, Level=1, Group=34", new ReportFilterDto { BoardId = 1, AcademicYearId = 9, AcademicLevelId = 1, GroupId = 34 }),
            ("Board=1, AY=9, Level=1, Group=34, Sec=30", new ReportFilterDto { BoardId = 1, AcademicYearId = 9, AcademicLevelId = 1, GroupId = 34, SectionId = 30 }),
            ("Date Range (2025-01-01 to 2026-12-31)", new ReportFilterDto { FromDate = new DateTime(2025, 1, 1), ToDate = new DateTime(2026, 12, 31) })
        };

        foreach (var c in attFilterCases)
        {
            var d = await reportService.DashboardAsync(c.Filter);
            var attList = await reportService.AttendanceAsync(c.Filter);
            
            var q = db.Attendances.Include(a => a.Student).AsNoTracking().Where(a => a.IsActive);
            if (c.Filter.BoardId.HasValue) q = q.Where(a => a.Student.BoardId == c.Filter.BoardId.Value);
            if (c.Filter.AcademicYearId.HasValue) q = q.Where(a => a.Student.AcademicYearId == c.Filter.AcademicYearId.Value);
            if (c.Filter.AcademicLevelId.HasValue) q = q.Where(a => a.Student.AcademicLevelId == c.Filter.AcademicLevelId.Value);
            if (c.Filter.GroupId.HasValue) q = q.Where(a => a.Student.GroupId == c.Filter.GroupId.Value);
            if (c.Filter.SectionId.HasValue) q = q.Where(a => a.Student.SectionId == c.Filter.SectionId.Value);
            if (c.Filter.FromDate.HasValue) q = q.Where(a => a.AttendanceDate >= c.Filter.FromDate.Value);
            if (c.Filter.ToDate.HasValue) q = q.Where(a => a.AttendanceDate <= c.Filter.ToDate.Value);

            var recs = await q.Select(a => (int)a.Status).ToListAsync();
            int p = recs.Count(s => s == 1);
            int aCount = recs.Count(s => s == 0);
            int l = recs.Count(s => s == 2);
            int lv = recs.Count(s => s == 3);
            int total = recs.Count;
            decimal calcPct = total > 0 ? Math.Round((decimal)p * 100m / total, 2) : 0;

            Console.WriteLine($"\n[Attendance: {c.CaseName}]");
            Console.WriteLine($"  Records: Total={total}, Present={p}, Absent={aCount}, Late={l}, Leave={lv}");
            Console.WriteLine($"  Formula: ({p} / {total}) * 100 = {calcPct}%");
            Console.WriteLine($"  API Dashboard %: {d.Attendance}% | Daily Detail Sessions: {attList.Count}");
        }

        // -------------------------------------------------------------------------
        // 10. RESULTS SCHEMA AND PUBLICATION DATE VERIFICATION
        // -------------------------------------------------------------------------
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("     10. RESULTS SCHEMA AND PUBLICATION DATE VERIFICATION");
        Console.WriteLine("================================================================================");

        using var schemaConn = new MySqlConnection(_connectionString);
        await schemaConn.OpenAsync();
        var resultColumns = (await schemaConn.QueryAsync<string>(
            @"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Results'"
        )).ToList();
        Console.WriteLine("Columns in Results Table: " + string.Join(", ", resultColumns));
        bool hasPublishedDate = resultColumns.Contains("PublishedDate");
        bool hasCreatedAt = resultColumns.Contains("CreatedAt");
        Console.WriteLine($"  Has PublishedDate: {hasPublishedDate}, Has CreatedAt: {hasCreatedAt}");

        // -------------------------------------------------------------------------
        // 11. OUTSTANDING DUES MULTI-STUDENT AUDIT TRACE
        // -------------------------------------------------------------------------
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("     11. OUTSTANDING DUES MULTI-STUDENT AUDIT TRACE");
        Console.WriteLine("================================================================================");

        var sampleStudents = new[] { 1, 6, 101, 102, 504, 510, 515 };
        foreach (var sId in sampleStudents)
        {
            var fees = rawStudentFees.Where(sf => sf.StudentId == sId).ToList();
            var payments = rawFeePayments.Where(p => p.StudentId == sId).ToList();
            Console.WriteLine($"Student {sId}:");
            foreach (var f in fees)
            {
                Console.WriteLine($"  FeeId={f.StudentFeeId}: Total=₹{f.TotalAmount:N2}, Paid=₹{f.PaidAmount:N2}, Due=₹{f.BalanceAmount:N2}, Status={f.Status}");
            }
            Console.WriteLine($"  Payments ({payments.Count}): " + string.Join(", ", payments.Select(p => $"PayId={p.FeePaymentId}(₹{p.Amount:N2}, Status={p.Status})")));
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine("     REVERIFICATION RUNNER COMPLETE");
        Console.WriteLine("================================================================================");

        return true;
    }
}
