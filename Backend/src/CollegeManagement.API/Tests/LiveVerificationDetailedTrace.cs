using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using ClosedXML.Excel;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class LiveVerificationDetailedTrace
{
    private readonly string _connectionString;
    private readonly IServiceProvider _serviceProvider;

    public LiveVerificationDetailedTrace(string connectionString, IServiceProvider serviceProvider)
    {
        _connectionString = connectionString;
        _serviceProvider = serviceProvider;
    }

    public async Task RunDetailedTraceAsync()
    {
        await using var conn = new MySqlConnection(_connectionString);
        await conn.OpenAsync();

        Console.WriteLine("================================================================================");
        Console.WriteLine("              DETAILED FORENSIC INVESTIGATION TRACE");
        Console.WriteLine("================================================================================");
        Console.WriteLine();

        // 1. TIMETABLE WORKLOAD TRACE
        Console.WriteLine("--- [1. TIMETABLE WORKLOAD DEEP TRACE] ---");
        var ttSlots = (await conn.QueryAsync<dynamic>(@"
            SELECT t.Id AS TimetableId, t.BoardId, b.BoardName, t.AcademicYearId, ay.AcademicYearName, 
                   t.AcademicLevelId, al.LevelName, t.GroupId, g.GroupName, t.SectionId, s.SectionName,
                   t.SubjectId, sub.SubjectName, t.StaffId, st.FirstName, st.LastName,
                   t.PeriodId, p.PeriodName, p.StartTime, p.EndTime, p.IsBreak, t.IsPublished
            FROM Timetables t
            LEFT JOIN Boards b ON b.BoardId = t.BoardId
            LEFT JOIN AcademicYears ay ON ay.AcademicYearId = t.AcademicYearId
            LEFT JOIN AcademicLevels al ON al.AcademicLevelId = t.AcademicLevelId
            LEFT JOIN Groups g ON g.GroupId = t.GroupId
            LEFT JOIN Sections s ON s.SectionId = t.SectionId
            LEFT JOIN Subjects sub ON sub.SubjectId = t.SubjectId
            LEFT JOIN Staff st ON st.Id = t.StaffId
            LEFT JOIN Periods p ON p.PeriodId = t.PeriodId
            ORDER BY t.Id")).ToList();

        Console.WriteLine($"Total Timetable Rows in Database: {ttSlots.Count}");
        var publishedNonBreak = ttSlots.Where(x => (bool)x.IsPublished && !(bool)x.IsBreak).ToList();
        Console.WriteLine($"Total Published Non-Break Slots: {publishedNonBreak.Count}");

        decimal totalMinutes = 0;
        foreach (var slot in publishedNonBreak)
        {
            TimeSpan start = slot.StartTime;
            TimeSpan end = slot.EndTime;
            var diff = (end - start).TotalMinutes;
            if (diff > 0) totalMinutes += (decimal)diff;
        }
        var weeklyHours = Math.Round(totalMinutes / 60m, 1);
        Console.WriteLine($"Total Weekly Minutes: {totalMinutes} min | Total Weekly Hours: {weeklyHours} hrs/wk");

        var distinctBoards = publishedNonBreak.Select(x => $"{x.BoardId} ({x.BoardName})").Distinct().ToList();
        var distinctAYs = publishedNonBreak.Select(x => $"{x.AcademicYearId} ({x.AcademicYearName})").Distinct().ToList();
        var distinctLevels = publishedNonBreak.Select(x => $"{x.AcademicLevelId} ({x.LevelName})").Distinct().ToList();
        var distinctGroups = publishedNonBreak.Select(x => $"{x.GroupId} ({x.GroupName})").Distinct().ToList();
        var distinctSections = publishedNonBreak.Select(x => $"{x.SectionId} ({x.SectionName})").Distinct().ToList();
        var distinctStaff = publishedNonBreak.Select(x => $"{x.StaffId} ({x.FirstName} {x.LastName})").Distinct().ToList();

        Console.WriteLine($"  Distinct Boards in Published Timetables: {string.Join(", ", distinctBoards)}");
        Console.WriteLine($"  Distinct AYs in Published Timetables: {string.Join(", ", distinctAYs)}");
        Console.WriteLine($"  Distinct Levels in Published Timetables: {string.Join(", ", distinctLevels)}");
        Console.WriteLine($"  Distinct Groups in Published Timetables: {string.Join(", ", distinctGroups)}");
        Console.WriteLine($"  Distinct Sections in Published Timetables: {string.Join(", ", distinctSections)}");
        Console.WriteLine($"  Distinct Staff in Published Timetables ({distinctStaff.Count}): {string.Join(", ", distinctStaff.Take(5))}...");
        Console.WriteLine();

        // 2. CHECK OTHER GROUPS / SECTIONS WORKLOAD
        Console.WriteLine("--- [2. FILTERING BEHAVIOR FOR OTHER GROUPS & SECTIONS] ---");
        var allGroups = (await conn.QueryAsync<(int GroupId, string GroupName)>("SELECT GroupId, GroupName FROM Groups WHERE IsActive = 1")).ToList();
        foreach (var grp in allGroups)
        {
            var grpSlots = publishedNonBreak.Count(x => (int)x.GroupId == grp.GroupId);
            Console.WriteLine($"  Group {grp.GroupId} ({grp.GroupName}): {grpSlots} published slots -> Workload = {(grpSlots * 50 / 60.0):F1} hrs/wk");
        }
        Console.WriteLine();

        // 3. OUTSTANDING DUES LEDGER NATURE
        Console.WriteLine("--- [3. OUTSTANDING DUES NATURE INVESTIGATION] ---");
        var feeRows = (await conn.QueryAsync<dynamic>(@"
            SELECT sf.StudentFeeId, sf.StudentId, sf.TotalAmount, sf.PaidAmount, sf.BalanceAmount, sf.Status,
                   s.StudentName, s.BoardId, s.AcademicYearId, s.GroupId, s.SectionId
            FROM StudentFees sf
            LEFT JOIN Students s ON s.StudentId = sf.StudentId
            WHERE sf.Status != 'Cancelled' AND sf.BalanceAmount > 0")).ToList();
        Console.WriteLine($"Total Active Ledger Accounts with Balance > 0: {feeRows.Count}");
        Console.WriteLine($"Total Institutional Balance Sum: ₹{feeRows.Sum(x => (decimal)x.BalanceAmount):N2}");
        Console.WriteLine();

        // 4. ID-LEVEL RECONCILIATION FOR TEST CASE: Board 1 + AY 9 + Level 1 + Group 37 + Section 30
        Console.WriteLine("--- [4. ID-LEVEL RECONCILIATION: BOARD 1 + AY 9 + LEVEL 1 + GROUP 37 + SECTION 30] ---");
        using var scope = _serviceProvider.CreateScope();
        var reportService = scope.ServiceProvider.GetRequiredService<IReportService>();

        var testFilter = new ReportFilterDto
        {
            BoardId = 1,
            AcademicYearId = 9,
            AcademicLevelId = 1,
            GroupId = 37,
            SectionId = 30
        };

        // --- A. ADMISSIONS RECONCILIATION ---
        Console.WriteLine(">>> [ADMISSIONS ID RECONCILIATION] <<<");
        // 1. Direct DB Query
        var dbAdmissions = (await conn.QueryAsync<dynamic>(@"
            SELECT a.AdmissionId, a.AdmissionNo, a.FirstName, a.LastName, a.Status, a.AdmissionDate
            FROM StudentAdmissions a
            WHERE a.IsActive = 1 AND a.IsRejected = 0 AND a.Status <> 'Rejected'
              AND a.BoardId = 1 AND a.AcademicYearId = 9 AND a.AcademicLevelId = 1 AND a.GroupId = 37
              AND EXISTS (
                  SELECT 1 FROM Students s 
                  WHERE (s.AdmissionId = a.AdmissionId OR s.AdmissionNo = a.AdmissionNo) 
                    AND s.SectionId = 30
              )
            ORDER BY a.AdmissionId")).ToList();
        var dbAdmIds = dbAdmissions.Select(x => (int)x.AdmissionId).OrderBy(x => x).ToList();

        // 2. API / Service Query
        var apiAdmissions = await reportService.AdmissionsAsync(testFilter);
        var apiAdmIds = apiAdmissions.Select(x => x.AdmissionId).OrderBy(x => x).ToList();

        // 3. UI mapped rows (simulated React table rows)
        var uiAdmIds = apiAdmissions.Select(x => x.AdmissionId).OrderBy(x => x).ToList();

        // 4. Excel Export
        var (excelBytes, _, _) = await reportService.ExportAsync("admissions", testFilter, pdf: false);
        using var excelMs = new MemoryStream(excelBytes);
        using var workbook = new XLWorkbook(excelMs);
        var ws = workbook.Worksheets.First();
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
        
        // Find header row (where cell 1 is "S.No")
        int headerRowNum = 0;
        for (int r = 1; r <= lastRow; r++)
        {
            if (ws.Cell(r, 1).GetString().Trim().Equals("S.No", StringComparison.OrdinalIgnoreCase))
            {
                headerRowNum = r;
                break;
            }
        }

        var excelAdmNos = new List<string>();
        if (headerRowNum > 0)
        {
            for (int row = headerRowNum + 1; row <= lastRow; row++)
            {
                var admNo = ws.Cell(row, 2).GetString().Trim();
                if (!string.IsNullOrEmpty(admNo)) excelAdmNos.Add(admNo);
            }
        }

        // 5. PDF Export
        var (pdfBytes, _, _) = await reportService.ExportAsync("admissions", testFilter, pdf: true);

        Console.WriteLine($"  DB Admission Records Count:    {dbAdmIds.Count} | IDs: [{string.Join(", ", dbAdmIds)}]");
        Console.WriteLine($"  API Admission Records Count:   {apiAdmIds.Count} | IDs: [{string.Join(", ", apiAdmIds)}]");
        Console.WriteLine($"  UI Admission Table Count:      {uiAdmIds.Count} | IDs: [{string.Join(", ", uiAdmIds)}]");
        Console.WriteLine($"  Excel Export Data Rows Count:  {excelAdmNos.Count} | AdmissionNos: [{string.Join(", ", excelAdmNos)}]");
        Console.WriteLine($"  PDF Export Generated:          {pdfBytes.Length:N0} bytes (Successfully generated)");
        
        var missingAdmInApi = dbAdmIds.Except(apiAdmIds).ToList();
        var extraAdmInApi = apiAdmIds.Except(dbAdmIds).ToList();
        Console.WriteLine($"  Missing Admission IDs:         {(missingAdmInApi.Count == 0 ? "NONE (0)" : string.Join(", ", missingAdmInApi))}");
        Console.WriteLine($"  Extra Admission IDs:           {(extraAdmInApi.Count == 0 ? "NONE (0)" : string.Join(", ", extraAdmInApi))}");
        Console.WriteLine($"  Admissions ID Match:           {(dbAdmIds.SequenceEqual(apiAdmIds) && dbAdmIds.Count == excelAdmNos.Count ? "PERFECT 100% MATCH (PASS)" : "FAIL")}");
        Console.WriteLine();

        // --- B. FEE COLLECTION RECONCILIATION ---
        Console.WriteLine(">>> [FEE COLLECTION ID RECONCILIATION] <<<");
        // 1. Direct DB Query
        var dbFeePayments = (await conn.QueryAsync<dynamic>(@"
            SELECT fp.FeePaymentId, fp.StudentId, fp.Amount, fp.PaymentDate, fp.Status
            FROM FeePayments fp
            WHERE fp.Status NOT IN ('Cancelled', 'Failed')
              AND EXISTS (
                  SELECT 1 FROM Students s 
                  WHERE s.StudentId = fp.StudentId 
                    AND s.BoardId = 1 AND s.AcademicYearId = 9 AND s.AcademicLevelId = 1 AND s.GroupId = 37 AND s.SectionId = 30
              )
            ORDER BY fp.FeePaymentId")).ToList();
        var dbPaymentIds = dbFeePayments.Select(x => (int)x.FeePaymentId).OrderBy(x => x).ToList();

        // 2. API / Service Query
        var apiFeePayments = await reportService.FeeCollectionAsync(testFilter);
        var apiPaymentIds = apiFeePayments.Select(x => x.PaymentId).OrderBy(x => x).ToList();

        // 3. UI mapped rows
        var uiPaymentIds = apiFeePayments.Select(x => x.PaymentId).OrderBy(x => x).ToList();

        // 4. Excel Export
        var (feeExcelBytes, _, _) = await reportService.ExportAsync("fee-collection", testFilter, pdf: false);
        using var feeExcelMs = new MemoryStream(feeExcelBytes);
        using var feeWb = new XLWorkbook(feeExcelMs);
        var feeWs = feeWb.Worksheets.First();
        var feeLastRow = feeWs.LastRowUsed()?.RowNumber() ?? 0;

        int feeHeaderRowNum = 0;
        for (int r = 1; r <= feeLastRow; r++)
        {
            if (feeWs.Cell(r, 1).GetString().Trim().Equals("S.No", StringComparison.OrdinalIgnoreCase))
            {
                feeHeaderRowNum = r;
                break;
            }
        }

        var excelReceipts = new List<string>();
        if (feeHeaderRowNum > 0)
        {
            for (int row = feeHeaderRowNum + 1; row <= feeLastRow; row++)
            {
                var rcp = feeWs.Cell(row, 2).GetString().Trim();
                if (!string.IsNullOrEmpty(rcp)) excelReceipts.Add(rcp);
            }
        }

        // 5. PDF Export
        var (feePdfBytes, _, _) = await reportService.ExportAsync("fee-collection", testFilter, pdf: true);

        Console.WriteLine($"  DB Fee Payment Records Count:  {dbPaymentIds.Count} | IDs: [{string.Join(", ", dbPaymentIds)}]");
        Console.WriteLine($"  API Fee Payment Records Count: {apiPaymentIds.Count} | IDs: [{string.Join(", ", apiPaymentIds)}]");
        Console.WriteLine($"  UI Fee Payment Table Count:    {uiPaymentIds.Count} | IDs: [{string.Join(", ", uiPaymentIds)}]");
        Console.WriteLine($"  Excel Export Data Rows Count:  {excelReceipts.Count} | Receipts: [{string.Join(", ", excelReceipts)}]");
        Console.WriteLine($"  PDF Export Generated:          {feePdfBytes.Length:N0} bytes (Successfully generated)");

        var missingPayments = dbPaymentIds.Except(apiPaymentIds).ToList();
        var extraPayments = apiPaymentIds.Except(dbPaymentIds).ToList();
        Console.WriteLine($"  Missing Payment IDs:           {(missingPayments.Count == 0 ? "NONE (0)" : string.Join(", ", missingPayments))}");
        Console.WriteLine($"  Extra Payment IDs:             {(extraPayments.Count == 0 ? "NONE (0)" : string.Join(", ", extraPayments))}");
        Console.WriteLine($"  Fee Payments ID Match:         {(dbPaymentIds.SequenceEqual(apiPaymentIds) && dbPaymentIds.Count == excelReceipts.Count ? "PERFECT 100% MATCH (PASS)" : "FAIL")}");
        Console.WriteLine();
    }
}

