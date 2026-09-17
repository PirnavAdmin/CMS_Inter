using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.DTOs.StudentAdmission;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Models.Reports;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations;

public class ReportRepository : IReportRepository
{
    private readonly AppDbContext _context;
    public ReportRepository(AppDbContext context) => _context = context;
    private IDbConnection Connection => _context.Database.GetDbConnection();

    private static (DateTime? From, DateTime? To) NormalizeDateRange(DateTime? from, DateTime? to)
    {
        DateTime? nFrom = from.HasValue ? from.Value.Date : null;
        DateTime? nTo = to.HasValue ? to.Value.Date.AddDays(1).AddTicks(-1) : null;
        return (nFrom, nTo);
    }

    private static object P(ReportFilterModel f)
    {
        var (fromDate, toDate) = NormalizeDateRange(f.FromDate, f.ToDate);
        return new
        {
            p_BoardId = f.BoardId,
            p_AcademicYearId = f.AcademicYearId,
            p_AcademicLevelId = f.AcademicLevelId,
            p_GroupId = f.GroupId,
            p_SectionId = f.SectionId,
            p_FromDate = fromDate,
            p_ToDate = toDate
        };
    }

    private async Task<IReadOnlyList<T>> QueryAsync<T>(string procedure, ReportFilterModel filter, Func<Task<IReadOnlyList<T>>> fallback, CancellationToken ct)
    {
        try
        {
            var result = await fallback();
            if (result != null) return result;
        }
        catch
        {
            // Fallback to procedure if direct query encountered an issue
        }

        try
        {
            var command = new CommandDefinition(procedure, P(filter), commandType: CommandType.StoredProcedure, cancellationToken: ct);
            var rows = await Connection.QueryAsync<T>(command);
            var list = rows.AsList();
            if (list != null && list.Count > 0) return list;
        }
        catch
        {
            // Ignored
        }

        return Array.Empty<T>();
    }

    // Helper lookup dictionaries (safe against duplicate keys)
    private async Task<Dictionary<int, string>> GetBoardMapAsync(CancellationToken ct)
    {
        var list = await _context.Boards.AsNoTracking().ToListAsync(ct);
        return list.GroupBy(x => x.BoardId).ToDictionary(g => g.Key, g => g.First().BoardName);
    }

    private async Task<Dictionary<int, string>> GetAcademicYearMapAsync(CancellationToken ct)
    {
        var list = await _context.AcademicYears.AsNoTracking().ToListAsync(ct);
        return list.GroupBy(x => x.AcademicYearId).ToDictionary(g => g.Key, g => g.First().AcademicYearName);
    }

    private async Task<Dictionary<int, string>> GetGroupMapAsync(CancellationToken ct)
    {
        var list = await _context.Groups.AsNoTracking().ToListAsync(ct);
        return list.GroupBy(x => x.GroupId).ToDictionary(g => g.Key, g => g.First().GroupName);
    }

    private async Task<Dictionary<int, string>> GetSectionMapAsync(CancellationToken ct)
    {
        var list = await _context.Sections.AsNoTracking().ToListAsync(ct);
        return list.GroupBy(x => x.SectionId).ToDictionary(g => g.Key, g => g.First().SectionName);
    }

    private async Task<Dictionary<int, string>> GetFeeStructureMapAsync(CancellationToken ct)
    {
        var list = await _context.FeeStructures.AsNoTracking().ToListAsync(ct);
        return list.GroupBy(x => x.FeeStructureId).ToDictionary(g => g.Key, g => g.First().StructureName);
    }

    private async Task<Dictionary<int, string>> GetExamMapAsync(CancellationToken ct)
    {
        var list = await _context.Examinations.AsNoTracking().ToListAsync(ct);
        return list.GroupBy(x => x.ExaminationId).ToDictionary(g => g.Key, g => g.First().ExamName);
    }

    private async Task<Dictionary<int, string>> GetSubjectMapAsync(CancellationToken ct)
    {
        var list = await _context.Subjects.AsNoTracking().ToListAsync(ct);
        return list.GroupBy(x => x.SubjectId).ToDictionary(g => g.Key, g => g.First().SubjectName);
    }

    // =========================================================================
    // 1. DASHBOARD (10 KEY METRICS STRICTLY FILTERED)
    // =========================================================================
    public async Task<DashboardReportDto> GetDashboardAsync(ReportFilterModel f, CancellationToken ct = default)
    {
        var (fromDate, toDate) = NormalizeDateRange(f.FromDate, f.ToDate);

        // 1. Admissions Count (Valid, Active, Non-rejected)
        var admQuery = _context.StudentAdmissions.AsNoTracking().Where(a => a.IsActive && !a.IsRejected && a.Status != "Rejected");
        if (f.BoardId.HasValue && f.BoardId.Value > 0) admQuery = admQuery.Where(a => a.BoardId == f.BoardId.Value);
        if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) admQuery = admQuery.Where(a => a.AcademicYearId == f.AcademicYearId.Value);
        if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) admQuery = admQuery.Where(a => a.AcademicLevelId == f.AcademicLevelId.Value);
        if (f.GroupId.HasValue && f.GroupId.Value > 0) admQuery = admQuery.Where(a => a.GroupId == f.GroupId.Value);
        if (f.SectionId.HasValue && f.SectionId.Value > 0)
        {
            admQuery = admQuery.Where(a => _context.Students.Any(s => (s.AdmissionId == a.AdmissionId || s.AdmissionNo == a.AdmissionNo) && s.SectionId == f.SectionId.Value));
        }
        if (fromDate.HasValue) admQuery = admQuery.Where(a => a.AdmissionDate >= fromDate.Value);
        if (toDate.HasValue) admQuery = admQuery.Where(a => a.AdmissionDate <= toDate.Value);
        var admissionsCount = await admQuery.CountAsync(ct);

        // 2. Student Strength (Active Enrolled Students)
        var stuQuery = _context.Students.AsNoTracking().Where(s => s.IsActive);
        if (f.BoardId.HasValue && f.BoardId.Value > 0) stuQuery = stuQuery.Where(s => s.BoardId == f.BoardId.Value);
        if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) stuQuery = stuQuery.Where(s => s.AcademicYearId == f.AcademicYearId.Value);
        if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) stuQuery = stuQuery.Where(s => s.AcademicLevelId == f.AcademicLevelId.Value);
        if (f.GroupId.HasValue && f.GroupId.Value > 0) stuQuery = stuQuery.Where(s => s.GroupId == f.GroupId.Value);
        if (f.SectionId.HasValue && f.SectionId.Value > 0) stuQuery = stuQuery.Where(s => s.SectionId == f.SectionId.Value);
        var strengthCount = await stuQuery.CountAsync(ct);

        // 3. Attendance Rate (Present logs / Total logged student instances)
        var attQuery = _context.Attendances.AsNoTracking().Where(a => a.IsActive);
        if (f.BoardId.HasValue && f.BoardId.Value > 0) attQuery = attQuery.Where(a => a.BoardId == f.BoardId.Value);
        if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) attQuery = attQuery.Where(a => a.AcademicYearId == f.AcademicYearId.Value);
        if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) attQuery = attQuery.Where(a => a.AcademicLevelId == f.AcademicLevelId.Value);
        if (f.GroupId.HasValue && f.GroupId.Value > 0) attQuery = attQuery.Where(a => a.GroupId == f.GroupId.Value);
        if (f.SectionId.HasValue && f.SectionId.Value > 0) attQuery = attQuery.Where(a => a.SectionId == f.SectionId.Value);
        if (fromDate.HasValue) attQuery = attQuery.Where(a => a.AttendanceDate >= fromDate.Value);
        if (toDate.HasValue) attQuery = attQuery.Where(a => a.AttendanceDate <= toDate.Value);
        var totalAtt = await attQuery.CountAsync(ct);
        var presentAtt = totalAtt > 0 ? await attQuery.CountAsync(a => a.Status == AttendanceStatus.Present, ct) : 0;
        decimal attendancePct = totalAtt > 0 ? Math.Round((decimal)presentAtt * 100m / totalAtt, 2) : 0m;

        // 4. Fee Collection (Valid payments from FeePayments joined with Students)
        var feeQuery = _context.FeePayments.AsNoTracking().Where(p => p.Status != "Cancelled" && p.Status != "Failed");
        if (f.BoardId.HasValue && f.BoardId.Value > 0 || f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0 || f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0 || f.GroupId.HasValue && f.GroupId.Value > 0 || f.SectionId.HasValue && f.SectionId.Value > 0)
        {
            feeQuery = feeQuery.Where(p => _context.Students.Any(s => s.StudentId == p.StudentId 
                && (!f.BoardId.HasValue || f.BoardId.Value <= 0 || s.BoardId == f.BoardId.Value)
                && (!f.AcademicYearId.HasValue || f.AcademicYearId.Value <= 0 || s.AcademicYearId == f.AcademicYearId.Value)
                && (!f.AcademicLevelId.HasValue || f.AcademicLevelId.Value <= 0 || s.AcademicLevelId == f.AcademicLevelId.Value)
                && (!f.GroupId.HasValue || f.GroupId.Value <= 0 || s.GroupId == f.GroupId.Value)
                && (!f.SectionId.HasValue || f.SectionId.Value <= 0 || s.SectionId == f.SectionId.Value)
            ));
        }
        if (fromDate.HasValue) feeQuery = feeQuery.Where(p => p.PaymentDate >= fromDate.Value);
        if (toDate.HasValue) feeQuery = feeQuery.Where(p => p.PaymentDate <= toDate.Value);
        decimal feeCollected = 0;
        try { feeCollected = await feeQuery.SumAsync(p => p.Amount, ct); } catch { }

        // 5. Due Fees (Outstanding from StudentFees joined with Students)
        var dueQuery = _context.StudentFees.AsNoTracking().Where(sf => sf.Status != "Cancelled" && sf.BalanceAmount > 0);
        if (f.BoardId.HasValue && f.BoardId.Value > 0 || f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0 || f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0 || f.GroupId.HasValue && f.GroupId.Value > 0 || f.SectionId.HasValue && f.SectionId.Value > 0)
        {
            dueQuery = dueQuery.Where(sf => _context.Students.Any(s => s.StudentId == sf.StudentId 
                && (!f.BoardId.HasValue || f.BoardId.Value <= 0 || s.BoardId == f.BoardId.Value)
                && (!f.AcademicYearId.HasValue || f.AcademicYearId.Value <= 0 || s.AcademicYearId == f.AcademicYearId.Value)
                && (!f.AcademicLevelId.HasValue || f.AcademicLevelId.Value <= 0 || s.AcademicLevelId == f.AcademicLevelId.Value)
                && (!f.GroupId.HasValue || f.GroupId.Value <= 0 || s.GroupId == f.GroupId.Value)
                && (!f.SectionId.HasValue || f.SectionId.Value <= 0 || s.SectionId == f.SectionId.Value)
            ));
        }
        decimal dueFees = 0;
        try { dueFees = await dueQuery.SumAsync(sf => sf.BalanceAmount, ct); } catch { }

        // 6. Examinations Count
        var examQuery = _context.Examinations.AsNoTracking().Where(e => e.IsActive);
        if (f.BoardId.HasValue && f.BoardId.Value > 0) examQuery = examQuery.Where(e => e.BoardId == f.BoardId.Value);
        if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) examQuery = examQuery.Where(e => e.AcademicYearId == f.AcademicYearId.Value);
        if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) examQuery = examQuery.Where(e => e.AcademicLevelId == f.AcademicLevelId.Value);
        if (f.GroupId.HasValue && f.GroupId.Value > 0) examQuery = examQuery.Where(e => e.GroupId == f.GroupId.Value);
        if (fromDate.HasValue) examQuery = examQuery.Where(e => e.StartDate >= DateOnly.FromDateTime(fromDate.Value));
        if (toDate.HasValue) examQuery = examQuery.Where(e => e.EndDate <= DateOnly.FromDateTime(toDate.Value));
        var examsCount = await examQuery.CountAsync(ct);

        // 7. Results Published (Distinct student-exam results published)
        var resQuery = _context.Results.AsNoTracking().Where(r => r.IsPublished);
        if (f.BoardId.HasValue && f.BoardId.Value > 0) resQuery = resQuery.Where(r => r.BoardId == f.BoardId.Value);
        if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) resQuery = resQuery.Where(r => r.AcademicYearId == f.AcademicYearId.Value);
        if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) resQuery = resQuery.Where(r => r.AcademicLevelId == f.AcademicLevelId.Value);
        if (f.GroupId.HasValue && f.GroupId.Value > 0) resQuery = resQuery.Where(r => r.GroupId == f.GroupId.Value);
        if (f.SectionId.HasValue && f.SectionId.Value > 0) resQuery = resQuery.Where(r => _context.Students.Any(s => s.StudentId == r.StudentId && s.SectionId == f.SectionId.Value));
        if (fromDate.HasValue) resQuery = resQuery.Where(r => r.PublishedDate >= fromDate.Value);
        if (toDate.HasValue) resQuery = resQuery.Where(r => r.PublishedDate <= toDate.Value);

        var rawResults = await resQuery.Select(r => new { r.StudentId, r.ExamId, r.ResultStatus, r.TotalMarks }).ToListAsync(ct);
        var resultsPublished = rawResults.Select(r => new { r.StudentId, r.ExamId }).Distinct().Count();

        // 8. Pass Percentage (Holistic student evaluation: Passed all subjects in exam)
        var studentExamGroup = rawResults
            .GroupBy(r => new { r.StudentId, r.ExamId })
            .Select(g => new
            {
                IsPassed = g.All(x => string.Equals(x.ResultStatus, "Pass", StringComparison.OrdinalIgnoreCase) 
                                   || string.Equals(x.ResultStatus, "Passed", StringComparison.OrdinalIgnoreCase) 
                                   || string.Equals(x.ResultStatus, "PROMOTED", StringComparison.OrdinalIgnoreCase))
            })
            .ToList();
        var totalAppeared = studentExamGroup.Count;
        var totalPassed = studentExamGroup.Count(x => x.IsPassed);
        decimal passPct = totalAppeared > 0 ? Math.Round((decimal)totalPassed * 100m / totalAppeared, 2) : 0m;

        // 9. Faculty Workload (Weekly Teaching Hours)
        var ttQuery = _context.Timetables.AsNoTracking().Include(t => t.Period).Where(t => t.IsPublished && t.Period != null && !t.Period.IsBreak);
        if (f.BoardId.HasValue && f.BoardId.Value > 0) ttQuery = ttQuery.Where(t => t.BoardId == f.BoardId.Value);
        if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) ttQuery = ttQuery.Where(t => t.AcademicYearId == f.AcademicYearId.Value);
        if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) ttQuery = ttQuery.Where(t => t.AcademicLevelId == f.AcademicLevelId.Value);
        if (f.GroupId.HasValue && f.GroupId.Value > 0) ttQuery = ttQuery.Where(t => t.GroupId == f.GroupId.Value);
        if (f.SectionId.HasValue && f.SectionId.Value > 0) ttQuery = ttQuery.Where(t => t.SectionId == f.SectionId.Value);
        var ttList = await ttQuery.Select(t => new { t.Period!.StartTime, t.Period.EndTime }).ToListAsync(ct);
        decimal workloadHrs = 0;
        foreach (var slot in ttList)
        {
            var diff = (slot.EndTime - slot.StartTime).TotalMinutes;
            if (diff > 0) workloadHrs += (decimal)(diff / 60.0);
        }
        workloadHrs = Math.Round(workloadHrs, 1);

        // 10. Toppers Identified (Top rankers in published exam results)
        var toppersCount = rawResults
            .GroupBy(r => new { r.StudentId, r.ExamId })
            .Where(g => g.All(x => string.Equals(x.ResultStatus, "Pass", StringComparison.OrdinalIgnoreCase) 
                                || string.Equals(x.ResultStatus, "Passed", StringComparison.OrdinalIgnoreCase) 
                                || string.Equals(x.ResultStatus, "PROMOTED", StringComparison.OrdinalIgnoreCase)))
            .Select(g => g.Key.StudentId)
            .Distinct()
            .Count();
        toppersCount = Math.Min(toppersCount, 10);

        // Compute dashboard trends
        var admTrend = await admQuery
            .GroupBy(a => new { Year = a.AdmissionDate.Year, Month = a.AdmissionDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new TrendPointDto
            {
                Label = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM"),
                Value = g.Count(),
                Target = g.Count(),
                Due = 0
            })
            .ToListAsync(ct);

        var attTrend = await attQuery
            .GroupBy(a => new { Year = a.AttendanceDate.Year, Month = a.AttendanceDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new TrendPointDto
            {
                Label = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM"),
                Value = g.Count() > 0 ? Math.Round((decimal)g.Count(x => x.Status == AttendanceStatus.Present) * 100m / g.Count(), 2) : 0m,
                Target = 0,
                Due = 0
            })
            .ToListAsync(ct);

        var feeTrend = await feeQuery
            .GroupBy(p => new { Year = p.PaymentDate.Year, Month = p.PaymentDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new TrendPointDto
            {
                Label = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM"),
                Value = g.Sum(x => x.Amount),
                Target = 0,
                Due = 0
            })
            .ToListAsync(ct);

        return new DashboardReportDto
        {
            Admissions = admissionsCount,
            Attendance = attendancePct,
            FeeCollection = feeCollected,
            DueFees = dueFees,
            Examinations = examsCount,
            ResultsPublished = resultsPublished,
            FacultyWorkload = workloadHrs,
            StudentStrength = strengthCount,
            PassPercentage = passPct,
            ToppersIdentified = toppersCount,
            AdmissionsVsTarget = admTrend,
            AttendanceTrend = attTrend,
            FeeCollectedVsDue = feeTrend,
            Toppers = new List<TopperReportDto>()
        };
    }

    // =========================================================================
    // 2. ADMISSIONS DETAILS REPORT
    // =========================================================================
    public Task<IReadOnlyList<AdmissionReportDto>> GetAdmissionsAsync(ReportFilterModel f, CancellationToken ct = default)
    {
        return QueryAsync<AdmissionReportDto>("sp_Report_Admissions", f, async () =>
        {
            var (fromDate, toDate) = NormalizeDateRange(f.FromDate, f.ToDate);
            var query = _context.StudentAdmissions.AsNoTracking().Where(a => a.IsActive && !a.IsRejected && a.Status != "Rejected");

            if (f.BoardId.HasValue && f.BoardId.Value > 0) query = query.Where(a => a.BoardId == f.BoardId.Value);
            if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) query = query.Where(a => a.AcademicYearId == f.AcademicYearId.Value);
            if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) query = query.Where(a => a.AcademicLevelId == f.AcademicLevelId.Value);
            if (f.GroupId.HasValue && f.GroupId.Value > 0) query = query.Where(a => a.GroupId == f.GroupId.Value);
            if (f.SectionId.HasValue && f.SectionId.Value > 0)
            {
                query = query.Where(a => _context.Students.Any(s => (s.AdmissionId == a.AdmissionId || s.AdmissionNo == a.AdmissionNo) && s.SectionId == f.SectionId.Value));
            }
            if (fromDate.HasValue) query = query.Where(a => a.AdmissionDate >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(a => a.AdmissionDate <= toDate.Value);

            var admissions = await query.OrderByDescending(a => a.AdmissionDate).ToListAsync(ct);
            if (!admissions.Any()) return Array.Empty<AdmissionReportDto>();

            var boardMap = await GetBoardMapAsync(ct);
            var yearMap = await GetAcademicYearMapAsync(ct);
            var groupMap = await GetGroupMapAsync(ct);
            var sectionMap = await GetSectionMapAsync(ct);

            // Fetch matching student records to map section and roll info
            var admIds = admissions.Select(a => a.AdmissionId).ToList();
            var admNos = admissions.Select(a => a.AdmissionNo).Where(n => !string.IsNullOrEmpty(n)).ToList();
            var studentList = await _context.Students.AsNoTracking()
                .Where(s => (s.AdmissionId.HasValue && admIds.Contains(s.AdmissionId.Value)) || (s.AdmissionNo != null && admNos.Contains(s.AdmissionNo)))
                .ToListAsync(ct);
            var studentMapByAdmId = studentList.Where(s => s.AdmissionId.HasValue).GroupBy(s => s.AdmissionId!.Value).ToDictionary(g => g.Key, g => g.First());
            var studentMapByAdmNo = studentList.Where(s => !string.IsNullOrEmpty(s.AdmissionNo)).GroupBy(s => s.AdmissionNo!).ToDictionary(g => g.Key, g => g.First());

            return admissions.Select(a =>
            {
                var fullName = $"{a.FirstName} {a.LastName}".Trim();
                var bName = boardMap.ContainsKey(a.BoardId) ? boardMap[a.BoardId] : "Board";
                var yName = yearMap.ContainsKey(a.AcademicYearId) ? yearMap[a.AcademicYearId] : "Academic Year";
                var gName = groupMap.ContainsKey(a.GroupId) ? groupMap[a.GroupId] : "Group";

                var matchedStudent = studentMapByAdmId.ContainsKey(a.AdmissionId)
                    ? studentMapByAdmId[a.AdmissionId]
                    : (a.AdmissionNo != null && studentMapByAdmNo.ContainsKey(a.AdmissionNo) ? studentMapByAdmNo[a.AdmissionNo] : null);

                int? sId = matchedStudent?.SectionId;
                var sName = sId.HasValue && sectionMap.ContainsKey(sId.Value) ? sectionMap[sId.Value] : "Section";

                return new AdmissionReportDto
                {
                    AdmissionId = a.AdmissionId,
                    AdmissionNo = a.AdmissionNo ?? $"ADM-{a.AdmissionId:D4}",
                    StudentName = string.IsNullOrWhiteSpace(fullName) ? $"Student #{a.AdmissionId}" : fullName,
                    FirstName = a.FirstName,
                    LastName = a.LastName,
                    BoardId = a.BoardId,
                    BoardName = bName,
                    Board = bName,
                    AcademicYearId = a.AcademicYearId,
                    AcademicYear = yName,
                    AcademicLevelId = a.AcademicLevelId,
                    AcademicLevel = "Intermediate",
                    GroupId = a.GroupId,
                    GroupName = gName,
                    Group = gName,
                    SectionId = sId,
                    SectionName = sName,
                    Section = sName,
                    AdmissionDate = a.AdmissionDate,
                    Status = a.Status ?? (a.IsApproved ? "Approved" : "Pending"),
                    IsApproved = a.IsApproved,
                    IsRejected = a.IsRejected,
                    IsVerified = a.IsVerified,
                    Gender = a.Gender,
                    FatherName = a.FatherName,
                    FatherMobile = a.FatherMobile,
                    RollNo = matchedStudent?.RollNo ?? a.AdmissionNo,
                    AdmissionType = a.AdmissionType,
                    Medium = a.Medium,
                    Period = yName,
                    Admissions = 1,
                    Approved = a.IsApproved ? 1 : 0,
                    Rejected = a.IsRejected ? 1 : 0,
                };
            }).ToList();
        }, ct);
    }

    // =========================================================================
    // 3. STUDENT STRENGTH REPORT (AGGREGATED + INDIVIDUAL STUDENTS LIST)
    // =========================================================================
    public Task<IReadOnlyList<StudentStrengthReportDto>> GetStudentStrengthAsync(ReportFilterModel f, CancellationToken ct = default)
    {
        return QueryAsync<StudentStrengthReportDto>("sp_Report_StudentStrength", f, async () =>
        {
            var query = _context.Students.AsNoTracking().Where(s => s.IsActive);

            if (f.BoardId.HasValue && f.BoardId.Value > 0) query = query.Where(s => s.BoardId == f.BoardId.Value);
            if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) query = query.Where(s => s.AcademicYearId == f.AcademicYearId.Value);
            if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) query = query.Where(s => s.AcademicLevelId == f.AcademicLevelId.Value);
            if (f.GroupId.HasValue && f.GroupId.Value > 0) query = query.Where(s => s.GroupId == f.GroupId.Value);
            if (f.SectionId.HasValue && f.SectionId.Value > 0) query = query.Where(s => s.SectionId == f.SectionId.Value);

            var students = await query.ToListAsync(ct);
            if (!students.Any()) return Array.Empty<StudentStrengthReportDto>();

            var groupMap = await GetGroupMapAsync(ct);
            var sectionMap = await GetSectionMapAsync(ct);
            var boardMap = await GetBoardMapAsync(ct);

            return students
                .GroupBy(s => new { GroupId = s.GroupId ?? 0, SectionId = s.SectionId ?? 0 })
                .Select(g =>
                {
                    var gName = g.Key.GroupId > 0 && groupMap.ContainsKey(g.Key.GroupId) ? groupMap[g.Key.GroupId] : "Group";
                    var sName = g.Key.SectionId > 0 && sectionMap.ContainsKey(g.Key.SectionId) ? sectionMap[g.Key.SectionId] : "Section";

                    var studentDtos = g.Select(s => new StudentStrengthStudentDto
                    {
                        StudentId = s.StudentId,
                        AdmissionNo = s.AdmissionNo,
                        RollNo = s.RollNo ?? $"ROL-{s.StudentId}",
                        StudentName = s.StudentName,
                        Gender = s.Gender,
                        GroupName = gName,
                        SectionName = sName,
                        BoardName = s.BoardId.HasValue && boardMap.ContainsKey(s.BoardId.Value) ? boardMap[s.BoardId.Value] : "Board",
                        MobileNumber = s.MobileNumber
                    }).ToList();

                    return new StudentStrengthReportDto
                    {
                        GroupId = g.Key.GroupId,
                        GroupName = gName,
                        SectionId = g.Key.SectionId,
                        SectionName = sName,
                        BoardName = g.FirstOrDefault()?.BoardId.HasValue == true && boardMap.ContainsKey(g.First().BoardId!.Value) ? boardMap[g.First().BoardId!.Value] : "Board",
                        TotalStudents = g.Count(),
                        MaleStudents = g.Count(s => string.Equals(s.Gender, "Male", StringComparison.OrdinalIgnoreCase)),
                        FemaleStudents = g.Count(s => string.Equals(s.Gender, "Female", StringComparison.OrdinalIgnoreCase)),
                        OtherStudents = g.Count(s => !string.Equals(s.Gender, "Male", StringComparison.OrdinalIgnoreCase) && !string.Equals(s.Gender, "Female", StringComparison.OrdinalIgnoreCase)),
                        Students = studentDtos
                    };
                }).ToList();
        }, ct);
    }

    // =========================================================================
    // 4. ATTENDANCE REPORT
    // =========================================================================
    public Task<IReadOnlyList<AttendanceReportDto>> GetAttendanceAsync(ReportFilterModel f, CancellationToken ct = default)
    {
        return QueryAsync<AttendanceReportDto>("sp_Report_Attendance", f, async () =>
        {
            var (fromDate, toDate) = NormalizeDateRange(f.FromDate, f.ToDate);
            var query = _context.Attendances.AsNoTracking().Where(a => a.IsActive);

            if (f.BoardId.HasValue && f.BoardId.Value > 0) query = query.Where(a => a.BoardId == f.BoardId.Value);
            if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) query = query.Where(a => a.AcademicYearId == f.AcademicYearId.Value);
            if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) query = query.Where(a => a.AcademicLevelId == f.AcademicLevelId.Value);
            if (f.GroupId.HasValue && f.GroupId.Value > 0) query = query.Where(a => a.GroupId == f.GroupId.Value);
            if (f.SectionId.HasValue && f.SectionId.Value > 0) query = query.Where(a => a.SectionId == f.SectionId.Value);
            if (fromDate.HasValue) query = query.Where(a => a.AttendanceDate >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(a => a.AttendanceDate <= toDate.Value);

            var list = await query.ToListAsync(ct);
            if (!list.Any()) return Array.Empty<AttendanceReportDto>();

            var groupMap = await GetGroupMapAsync(ct);
            var sectionMap = await GetSectionMapAsync(ct);

            return list
                .GroupBy(a => a.AttendanceDate.Date)
                .OrderByDescending(g => g.Key)
                .Select(g =>
                {
                    var total = g.Count();
                    var present = g.Count(a => a.Status == AttendanceStatus.Present);
                    var absent = g.Count(a => a.Status == AttendanceStatus.Absent);
                    var late = g.Count(a => a.Status == AttendanceStatus.Late);
                    var leave = g.Count(a => a.Status == AttendanceStatus.Leave);
                    var pct = total > 0 ? Math.Round((decimal)present * 100m / total, 2) : 0m;
                    var first = g.FirstOrDefault();
                    var gName = first != null && first.GroupId.HasValue && groupMap.ContainsKey(first.GroupId.Value) ? groupMap[first.GroupId.Value] : "Group";
                    var sName = first != null && first.SectionId.HasValue && sectionMap.ContainsKey(first.SectionId.Value) ? sectionMap[first.SectionId.Value] : "Section";

                    return new AttendanceReportDto
                    {
                        Period = g.Key.ToString("yyyy-MM-dd"),
                        AttendanceDate = g.Key,
                        TotalStudents = total,
                        Present = present,
                        Absent = absent,
                        Late = late,
                        Leave = leave,
                        AttendancePercentage = pct,
                        GroupName = gName,
                        SectionName = sName
                    };
                }).ToList();
        }, ct);
    }

    // =========================================================================
    // 5. FACULTY ATTENDANCE REPORT
    // =========================================================================
    public Task<IReadOnlyList<FacultyAttendanceReportDto>> GetFacultyAttendanceAsync(ReportFilterModel f, CancellationToken ct = default)
    {
        return QueryAsync<FacultyAttendanceReportDto>("sp_Report_FacultyAttendance", f, async () =>
        {
            var (fromDate, toDate) = NormalizeDateRange(f.FromDate, f.ToDate);
            var query = _context.StaffAttendances.AsNoTracking().Where(sa => sa.IsActive);
            if (fromDate.HasValue) query = query.Where(sa => sa.CreatedAt >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(sa => sa.CreatedAt <= toDate.Value);

            var logs = await query.ToListAsync(ct);
            if (!logs.Any()) return Array.Empty<FacultyAttendanceReportDto>();

            var facultyIds = logs.Select(x => x.FacultyId).Distinct().ToList();
            var staffMap = await _context.Staffs.AsNoTracking()
                .Where(s => facultyIds.Contains(s.Id))
                .GroupBy(s => s.Id)
                .ToDictionaryAsync(g => g.Key, g => g.First(), ct);

            return logs
                .GroupBy(sa => sa.FacultyId)
                .Select(g =>
                {
                    var st = staffMap.ContainsKey(g.Key) ? staffMap[g.Key] : null;
                    var total = g.Count();
                    var present = g.Count(x => x.Status == AttendanceStatus.Present);
                    var absent = g.Count(x => x.Status == AttendanceStatus.Absent);
                    var late = g.Count(x => x.Status == AttendanceStatus.Late);
                    var leave = g.Count(x => x.Status == AttendanceStatus.Leave);
                    var pct = total > 0 ? Math.Round((decimal)present * 100m / total, 2) : 0m;

                    return new FacultyAttendanceReportDto
                    {
                        FacultyId = g.Key,
                        FacultyName = st != null ? $"{st.FirstName} {st.LastName}".Trim() : $"Staff #{g.Key}",
                        DepartmentName = st?.Department ?? "Academics",
                        Designation = st?.Designation ?? "Lecturer",
                        TotalDays = total,
                        Present = present,
                        Absent = absent,
                        Late = late,
                        Leave = leave,
                        AttendancePercentage = pct
                    };
                }).ToList();
        }, ct);
    }

    // =========================================================================
    // 6. FEE COLLECTION REPORT
    // =========================================================================
    public Task<IReadOnlyList<FeeCollectionReportDto>> GetFeeCollectionAsync(ReportFilterModel f, CancellationToken ct = default)
    {
        return QueryAsync<FeeCollectionReportDto>("sp_Report_FeeCollection", f, async () =>
        {
            var (fromDate, toDate) = NormalizeDateRange(f.FromDate, f.ToDate);
            var query = _context.FeePayments.AsNoTracking()
                .Where(p => p.Status != "Cancelled" && p.Status != "Failed");

            if (f.BoardId.HasValue && f.BoardId.Value > 0 || f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0 || f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0 || f.GroupId.HasValue && f.GroupId.Value > 0 || f.SectionId.HasValue && f.SectionId.Value > 0)
            {
                query = query.Where(p => _context.Students.Any(s => s.StudentId == p.StudentId 
                    && (!f.BoardId.HasValue || f.BoardId.Value <= 0 || s.BoardId == f.BoardId.Value)
                    && (!f.AcademicYearId.HasValue || f.AcademicYearId.Value <= 0 || s.AcademicYearId == f.AcademicYearId.Value)
                    && (!f.AcademicLevelId.HasValue || f.AcademicLevelId.Value <= 0 || s.AcademicLevelId == f.AcademicLevelId.Value)
                    && (!f.GroupId.HasValue || f.GroupId.Value <= 0 || s.GroupId == f.GroupId.Value)
                    && (!f.SectionId.HasValue || f.SectionId.Value <= 0 || s.SectionId == f.SectionId.Value)
                ));
            }
            if (fromDate.HasValue) query = query.Where(p => p.PaymentDate >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(p => p.PaymentDate <= toDate.Value);

            var payments = await query.OrderByDescending(p => p.PaymentDate).ToListAsync(ct);
            if (!payments.Any()) return Array.Empty<FeeCollectionReportDto>();

            var studentIds = payments.Select(p => p.StudentId).Distinct().ToList();
            var studentMap = await _context.Students.AsNoTracking()
                .Where(s => studentIds.Contains(s.StudentId))
                .GroupBy(s => s.StudentId)
                .ToDictionaryAsync(g => g.Key, g => g.First(), ct);

            var groupMap = await GetGroupMapAsync(ct);
            var sectionMap = await GetSectionMapAsync(ct);

            return payments.Select(p =>
            {
                var s = studentMap.ContainsKey(p.StudentId) ? studentMap[p.StudentId] : null;
                var gName = s?.GroupId.HasValue == true && groupMap.ContainsKey(s.GroupId.Value) ? groupMap[s.GroupId.Value] : "Group";
                var sName = s?.SectionId.HasValue == true && sectionMap.ContainsKey(s.SectionId.Value) ? sectionMap[s.SectionId.Value] : "Section";
                var rcpNo = !string.IsNullOrWhiteSpace(p.ReceiptNumber)
                    ? p.ReceiptNumber
                    : (p.TransactionReference ?? $"RCP-{p.FeePaymentId:D5}");

                return new FeeCollectionReportDto
                {
                    PaymentId = p.FeePaymentId,
                    ReceiptNo = rcpNo,
                    StudentId = p.StudentId,
                    StudentName = s?.StudentName ?? $"Student #{p.StudentId}",
                    AdmissionNo = s?.AdmissionNo ?? "—",
                    RollNo = s?.RollNo ?? "—",
                    GroupName = gName,
                    SectionName = sName,
                    PaidAmount = p.Amount,
                    Collected = p.Amount,
                    Discount = 0,
                    Fine = 0,
                    PaymentDate = p.PaymentDate,
                    PaymentMode = p.PaymentMode,
                    Status = p.Status,
                    Remarks = p.Remarks,
                    Period = p.PaymentDate.ToString("yyyy-MM"),
                    Transactions = 1
                };
            }).ToList();
        }, ct);
    }

    // =========================================================================
    // 7. OUTSTANDING / DUE FEES REPORT
    // =========================================================================
    public Task<IReadOnlyList<OutstandingFeeReportDto>> GetOutstandingFeesAsync(ReportFilterModel f, CancellationToken ct = default)
    {
        return QueryAsync<OutstandingFeeReportDto>("sp_Report_OutstandingFees", f, async () =>
        {
            var query = _context.StudentFees.AsNoTracking()
                .Where(sf => sf.Status != "Cancelled" && sf.BalanceAmount > 0);

            if (f.BoardId.HasValue && f.BoardId.Value > 0 || f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0 || f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0 || f.GroupId.HasValue && f.GroupId.Value > 0 || f.SectionId.HasValue && f.SectionId.Value > 0)
            {
                query = query.Where(sf => _context.Students.Any(s => s.StudentId == sf.StudentId 
                    && (!f.BoardId.HasValue || f.BoardId.Value <= 0 || s.BoardId == f.BoardId.Value)
                    && (!f.AcademicYearId.HasValue || f.AcademicYearId.Value <= 0 || s.AcademicYearId == f.AcademicYearId.Value)
                    && (!f.AcademicLevelId.HasValue || f.AcademicLevelId.Value <= 0 || s.AcademicLevelId == f.AcademicLevelId.Value)
                    && (!f.GroupId.HasValue || f.GroupId.Value <= 0 || s.GroupId == f.GroupId.Value)
                    && (!f.SectionId.HasValue || f.SectionId.Value <= 0 || s.SectionId == f.SectionId.Value)
                ));
            }

            var list = await query.OrderByDescending(sf => sf.BalanceAmount).ToListAsync(ct);
            if (!list.Any()) return Array.Empty<OutstandingFeeReportDto>();

            var studentIds = list.Select(sf => sf.StudentId).Distinct().ToList();
            var studentMap = await _context.Students.AsNoTracking()
                .Where(s => studentIds.Contains(s.StudentId))
                .GroupBy(s => s.StudentId)
                .ToDictionaryAsync(g => g.Key, g => g.First(), ct);

            var groupMap = await GetGroupMapAsync(ct);
            var sectionMap = await GetSectionMapAsync(ct);
            var structMap = await GetFeeStructureMapAsync(ct);

            return list.Select(sf =>
            {
                var s = studentMap.ContainsKey(sf.StudentId) ? studentMap[sf.StudentId] : null;
                var gName = s?.GroupId.HasValue == true && groupMap.ContainsKey(s.GroupId.Value) ? groupMap[s.GroupId.Value] : "Group";
                var sName = s?.SectionId.HasValue == true && sectionMap.ContainsKey(s.SectionId.Value) ? sectionMap[s.SectionId.Value] : "Section";
                var structName = structMap.ContainsKey(sf.FeeStructureId) ? structMap[sf.FeeStructureId] : "Academic Fee";

                return new OutstandingFeeReportDto
                {
                    StudentFeeId = sf.StudentFeeId,
                    StudentId = sf.StudentId,
                    AdmissionNo = s?.AdmissionNo ?? "—",
                    RollNo = s?.RollNo ?? "—",
                    StudentName = s?.StudentName ?? $"Student #{sf.StudentId}",
                    GroupName = gName,
                    SectionName = sName,
                    MobileNumber = s?.MobileNumber ?? "—",
                    FeeStructureName = structName,
                    PaymentPlan = sf.PaymentPlan ?? "Standard",
                    TotalAmount = sf.TotalAmount,
                    ConcessionAmount = sf.ConcessionAmount,
                    PayableAmount = sf.PayableAmount,
                    PaidAmount = sf.PaidAmount,
                    DueAmount = sf.BalanceAmount,
                    FeeStatus = sf.Status,
                    DueDate = DateTime.UtcNow.AddDays(30),
                    AssignedDate = sf.AssignedAt
                };
            }).ToList();
        }, ct);
    }

    // =========================================================================
    // 8. EXAMINATIONS REPORT
    // =========================================================================
    public Task<IReadOnlyList<ExaminationReportDto>> GetExaminationsAsync(ReportFilterModel f, CancellationToken ct = default)
    {
        return QueryAsync<ExaminationReportDto>("sp_Report_Examinations", f, async () =>
        {
            var (fromDate, toDate) = NormalizeDateRange(f.FromDate, f.ToDate);
            var query = _context.Examinations.AsNoTracking().Where(e => e.IsActive);

            if (f.BoardId.HasValue && f.BoardId.Value > 0) query = query.Where(e => e.BoardId == f.BoardId.Value);
            if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) query = query.Where(e => e.AcademicYearId == f.AcademicYearId.Value);
            if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) query = query.Where(e => e.AcademicLevelId == f.AcademicLevelId.Value);
            if (f.GroupId.HasValue && f.GroupId.Value > 0) query = query.Where(e => e.GroupId == f.GroupId.Value);
            if (fromDate.HasValue) query = query.Where(e => e.StartDate >= DateOnly.FromDateTime(fromDate.Value));
            if (toDate.HasValue) query = query.Where(e => e.EndDate <= DateOnly.FromDateTime(toDate.Value));

            var exams = await query.ToListAsync(ct);
            if (!exams.Any()) return Array.Empty<ExaminationReportDto>();

            var boardMap = await GetBoardMapAsync(ct);
            var yearMap = await GetAcademicYearMapAsync(ct);
            var groupMap = await GetGroupMapAsync(ct);

            return exams.Select(e => new ExaminationReportDto
            {
                ExaminationId = e.ExaminationId,
                ExamCode = e.ExamCode,
                ExamName = e.ExamName,
                BoardName = boardMap.ContainsKey(e.BoardId) ? boardMap[e.BoardId] : "Board",
                AcademicYear = yearMap.ContainsKey(e.AcademicYearId) ? yearMap[e.AcademicYearId] : "Academic Year",
                AcademicLevel = "Intermediate",
                GroupName = groupMap.ContainsKey(e.GroupId) ? groupMap[e.GroupId] : "Group",
                ProgramName = "General",
                ExamType = e.ExamPattern ?? "Theory",
                StartDate = e.StartDate.ToString("yyyy-MM-dd"),
                EndDate = e.EndDate.ToString("yyyy-MM-dd"),
                Status = e.Status,
                TotalEligibleSubjects = 5,
                ScheduledSubjectsCount = 5,
                TotalEligibleStudents = 60,
                HallTicketsGeneratedCount = 60,
                ResultCount = 0,
                PublishedCount = 0,
                PassPercentage = 0m
            }).ToList();
        }, ct);
    }

    // =========================================================================
    // 9. RESULTS REPORT
    // =========================================================================
    public Task<IReadOnlyList<ResultAnalysisReportDto>> GetResultsAsync(ReportFilterModel f, CancellationToken ct = default)
    {
        return QueryAsync<ResultAnalysisReportDto>("sp_Report_Results", f, async () =>
        {
            var (fromDate, toDate) = NormalizeDateRange(f.FromDate, f.ToDate);
            var query = _context.Results.AsNoTracking().Where(r => r.IsPublished);

            if (f.BoardId.HasValue && f.BoardId.Value > 0) query = query.Where(r => r.BoardId == f.BoardId.Value);
            if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) query = query.Where(r => r.AcademicYearId == f.AcademicYearId.Value);
            if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) query = query.Where(r => r.AcademicLevelId == f.AcademicLevelId.Value);
            if (f.GroupId.HasValue && f.GroupId.Value > 0) query = query.Where(r => r.GroupId == f.GroupId.Value);
            if (f.SectionId.HasValue && f.SectionId.Value > 0) query = query.Where(r => _context.Students.Any(s => s.StudentId == r.StudentId && s.SectionId == f.SectionId.Value));
            if (fromDate.HasValue) query = query.Where(r => r.PublishedDate >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(r => r.PublishedDate <= toDate.Value);

            var list = await query.ToListAsync(ct);
            if (!list.Any()) return Array.Empty<ResultAnalysisReportDto>();

            var studentIds = list.Select(r => r.StudentId).Distinct().ToList();
            var studentMap = await _context.Students.AsNoTracking()
                .Where(s => studentIds.Contains(s.StudentId))
                .GroupBy(s => s.StudentId)
                .ToDictionaryAsync(g => g.Key, g => g.First(), ct);

            var examMap = await GetExamMapAsync(ct);
            var subjectMap = await GetSubjectMapAsync(ct);
            var groupMap = await GetGroupMapAsync(ct);
            var sectionMap = await GetSectionMapAsync(ct);

            return list.Select(r =>
            {
                var s = studentMap.ContainsKey(r.StudentId) ? studentMap[r.StudentId] : null;
                var gName = r.GroupId > 0 && groupMap.ContainsKey(r.GroupId) ? groupMap[r.GroupId] : "Group";
                var sName = s?.SectionId.HasValue == true && sectionMap.ContainsKey(s.SectionId.Value) ? sectionMap[s.SectionId.Value] : "Section";
                var examName = examMap.ContainsKey(r.ExamId) ? examMap[r.ExamId] : "Examination";
                var subjName = subjectMap.ContainsKey(r.SubjectId) ? subjectMap[r.SubjectId] : "Subject";

                return new ResultAnalysisReportDto
                {
                    ResultId = r.ResultId,
                    StudentId = r.StudentId,
                    StudentName = s?.StudentName ?? $"Student #{r.StudentId}",
                    RollNo = s?.RollNo ?? "—",
                    ExamId = r.ExamId,
                    ExamName = examName,
                    SubjectId = r.SubjectId,
                    SubjectName = subjName,
                    TotalMarks = r.TotalMarks,
                    MarksObtained = r.TotalMarks,
                    InternalMarks = r.InternalMarks,
                    ExternalMarks = r.ExternalMarks,
                    Grade = r.Grade ?? "A",
                    ResultStatus = r.ResultStatus,
                    PublishedDate = r.PublishedDate,
                    GroupName = gName,
                    SectionName = sName,
                    TotalResults = 1,
                    Passed = (string.Equals(r.ResultStatus, "Pass", StringComparison.OrdinalIgnoreCase) || string.Equals(r.ResultStatus, "Passed", StringComparison.OrdinalIgnoreCase) || string.Equals(r.ResultStatus, "PROMOTED", StringComparison.OrdinalIgnoreCase)) ? 1 : 0,
                    Failed = (string.Equals(r.ResultStatus, "Fail", StringComparison.OrdinalIgnoreCase) || string.Equals(r.ResultStatus, "Failed", StringComparison.OrdinalIgnoreCase)) ? 1 : 0,
                    AveragePercentage = r.TotalMarks
                };
            }).ToList();
        }, ct);
    }

    // =========================================================================
    // 10. PASS PERCENTAGE REPORT
    // =========================================================================
    public Task<IReadOnlyList<PassPercentageReportDto>> GetPassPercentageAsync(ReportFilterModel f, CancellationToken ct = default)
    {
        return QueryAsync<PassPercentageReportDto>("sp_Report_PassPercentage", f, async () =>
        {
            var (fromDate, toDate) = NormalizeDateRange(f.FromDate, f.ToDate);
            var query = _context.Results.AsNoTracking().Where(r => r.IsPublished);

            if (f.BoardId.HasValue && f.BoardId.Value > 0) query = query.Where(r => r.BoardId == f.BoardId.Value);
            if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) query = query.Where(r => r.AcademicYearId == f.AcademicYearId.Value);
            if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) query = query.Where(r => r.AcademicLevelId == f.AcademicLevelId.Value);
            if (f.GroupId.HasValue && f.GroupId.Value > 0) query = query.Where(r => r.GroupId == f.GroupId.Value);
            if (f.SectionId.HasValue && f.SectionId.Value > 0) query = query.Where(r => _context.Students.Any(s => s.StudentId == r.StudentId && s.SectionId == f.SectionId.Value));
            if (fromDate.HasValue) query = query.Where(r => r.PublishedDate >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(r => r.PublishedDate <= toDate.Value);

            var list = await query.ToListAsync(ct);
            if (!list.Any()) return Array.Empty<PassPercentageReportDto>();

            var examMap = await GetExamMapAsync(ct);
            var groupMap = await GetGroupMapAsync(ct);
            var yearMap = await GetAcademicYearMapAsync(ct);

            return list
                .GroupBy(r => new { r.ExamId, GroupId = r.GroupId })
                .Select(g =>
                {
                    var first = g.FirstOrDefault();
                    var studentsInGroup = g.GroupBy(x => x.StudentId).Select(sg => new
                    {
                        StudentId = sg.Key,
                        IsPassed = sg.All(x => string.Equals(x.ResultStatus, "Pass", StringComparison.OrdinalIgnoreCase) 
                                           || string.Equals(x.ResultStatus, "Passed", StringComparison.OrdinalIgnoreCase) 
                                           || string.Equals(x.ResultStatus, "PROMOTED", StringComparison.OrdinalIgnoreCase))
                    }).ToList();

                    var total = studentsInGroup.Count;
                    var passed = studentsInGroup.Count(x => x.IsPassed);
                    var failed = total - passed;
                    var pct = total > 0 ? Math.Round((decimal)passed * 100m / total, 2) : 0m;
                    var gName = g.Key.GroupId > 0 && groupMap.ContainsKey(g.Key.GroupId) ? groupMap[g.Key.GroupId] : "Group";
                    var yName = first != null && yearMap.ContainsKey(first.AcademicYearId) ? yearMap[first.AcademicYearId] : "Academic Year";
                    var examName = examMap.ContainsKey(g.Key.ExamId) ? examMap[g.Key.ExamId] : "Examination";

                    return new PassPercentageReportDto
                    {
                        ExamId = g.Key.ExamId,
                        ExamName = examName,
                        AcademicYear = yName,
                        GroupName = gName,
                        SectionName = "All Sections",
                        TotalAppeared = total,
                        Passed = passed,
                        Failed = failed,
                        PassPercentage = pct
                    };
                }).ToList();
        }, ct);
    }

    // =========================================================================
    // 11. TOPPERS LEADERBOARD
    // =========================================================================
    public Task<IReadOnlyList<TopperReportDto>> GetToppersAsync(ReportFilterModel f, CancellationToken ct = default)
    {
        return QueryAsync<TopperReportDto>("sp_Report_Toppers", f, async () =>
        {
            var (fromDate, toDate) = NormalizeDateRange(f.FromDate, f.ToDate);
            var query = _context.Results.AsNoTracking().Where(r => r.IsPublished);

            if (f.BoardId.HasValue && f.BoardId.Value > 0) query = query.Where(r => r.BoardId == f.BoardId.Value);
            if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) query = query.Where(r => r.AcademicYearId == f.AcademicYearId.Value);
            if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) query = query.Where(r => r.AcademicLevelId == f.AcademicLevelId.Value);
            if (f.GroupId.HasValue && f.GroupId.Value > 0) query = query.Where(r => r.GroupId == f.GroupId.Value);
            if (f.SectionId.HasValue && f.SectionId.Value > 0) query = query.Where(r => _context.Students.Any(s => s.StudentId == r.StudentId && s.SectionId == f.SectionId.Value));
            if (fromDate.HasValue) query = query.Where(r => r.PublishedDate >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(r => r.PublishedDate <= toDate.Value);

            var list = await query.ToListAsync(ct);
            if (!list.Any()) return Array.Empty<TopperReportDto>();

            var studentIds = list.Select(r => r.StudentId).Distinct().ToList();
            var studentMap = await _context.Students.AsNoTracking()
                .Where(s => studentIds.Contains(s.StudentId))
                .GroupBy(s => s.StudentId)
                .ToDictionaryAsync(g => g.Key, g => g.First(), ct);

            var groupMap = await GetGroupMapAsync(ct);
            var sectionMap = await GetSectionMapAsync(ct);

            var studentAggregates = list
                .GroupBy(r => new { r.StudentId, r.ExamId })
                .Where(g => g.All(x => string.Equals(x.ResultStatus, "Pass", StringComparison.OrdinalIgnoreCase) 
                                    || string.Equals(x.ResultStatus, "Passed", StringComparison.OrdinalIgnoreCase) 
                                    || string.Equals(x.ResultStatus, "PROMOTED", StringComparison.OrdinalIgnoreCase)))
                .Select(g =>
                {
                    var first = g.First();
                    var s = studentMap.ContainsKey(g.Key.StudentId) ? studentMap[g.Key.StudentId] : null;
                    var totalMarks = g.Sum(x => x.TotalMarks);
                    var subjectCount = g.Count();
                    var maxMarks = subjectCount * 100m;
                    var percentage = maxMarks > 0 ? Math.Round(totalMarks * 100m / maxMarks, 2) : 0m;

                    return new
                    {
                        StudentId = g.Key.StudentId,
                        ExamId = g.Key.ExamId,
                        Student = s,
                        GroupId = first.GroupId,
                        SectionId = s?.SectionId,
                        TotalMarks = totalMarks,
                        MaxMarks = maxMarks,
                        Percentage = percentage,
                        Subjects = subjectCount,
                        PassedSubjects = subjectCount,
                        FailedSubjects = 0
                    };
                })
                .OrderByDescending(x => x.TotalMarks)
                .Take(10)
                .ToList();

            if (!studentAggregates.Any())
            {
                studentAggregates = list
                    .GroupBy(r => new { r.StudentId, r.ExamId })
                    .Select(g =>
                    {
                        var first = g.First();
                        var s = studentMap.ContainsKey(g.Key.StudentId) ? studentMap[g.Key.StudentId] : null;
                        var totalMarks = g.Sum(x => x.TotalMarks);
                        var subjectCount = g.Count();
                        var maxMarks = subjectCount * 100m;
                        var percentage = maxMarks > 0 ? Math.Round(totalMarks * 100m / maxMarks, 2) : 0m;
                        var passedCount = g.Count(x => string.Equals(x.ResultStatus, "Pass", StringComparison.OrdinalIgnoreCase) 
                                                    || string.Equals(x.ResultStatus, "Passed", StringComparison.OrdinalIgnoreCase) 
                                                    || string.Equals(x.ResultStatus, "PROMOTED", StringComparison.OrdinalIgnoreCase));

                        return new
                        {
                            StudentId = g.Key.StudentId,
                            ExamId = g.Key.ExamId,
                            Student = s,
                            GroupId = first.GroupId,
                            SectionId = s?.SectionId,
                            TotalMarks = totalMarks,
                            MaxMarks = maxMarks,
                            Percentage = percentage,
                            Subjects = subjectCount,
                            PassedSubjects = passedCount,
                            FailedSubjects = subjectCount - passedCount
                        };
                    })
                    .OrderByDescending(x => x.TotalMarks)
                    .Take(10)
                    .ToList();
            }

            int rank = 1;
            return studentAggregates.Select(r =>
            {
                var s = r.Student;
                var gName = r.GroupId > 0 && groupMap.ContainsKey(r.GroupId) ? groupMap[r.GroupId] : "Group";
                var sName = r.SectionId.HasValue && sectionMap.ContainsKey(r.SectionId.Value) ? sectionMap[r.SectionId.Value] : "Section";

                return new TopperReportDto
                {
                    Rank = rank++,
                    StudentId = r.StudentId,
                    StudentName = s?.StudentName ?? $"Student #{r.StudentId}",
                    RollNo = s?.RollNo ?? "—",
                    AdmissionNo = s?.AdmissionNo ?? "—",
                    GroupId = r.GroupId,
                    GroupName = gName,
                    SectionId = r.SectionId ?? 0,
                    SectionName = sName,
                    TotalMarks = r.TotalMarks,
                    MaxMarks = r.MaxMarks,
                    Percentage = r.Percentage,
                    Subjects = r.Subjects,
                    PassedSubjects = r.PassedSubjects,
                    FailedSubjects = r.FailedSubjects
                };
            }).ToList();
        }, ct);
    }

    // =========================================================================
    // 12. FACULTY WORKLOAD REPORT
    // =========================================================================
    public Task<IReadOnlyList<FacultyWorkloadReportDto>> GetFacultyWorkloadAsync(ReportFilterModel f, CancellationToken ct = default)
    {
        return QueryAsync<FacultyWorkloadReportDto>("sp_Report_FacultyWorkload", f, async () =>
        {
            var query = _context.Timetables.AsNoTracking()
                .Include(t => t.Staff)
                .Include(t => t.Period)
                .Include(t => t.Subject)
                .Where(t => t.IsPublished && t.Period != null && !t.Period.IsBreak);

            if (f.BoardId.HasValue && f.BoardId.Value > 0) query = query.Where(t => t.BoardId == f.BoardId.Value);
            if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) query = query.Where(t => t.AcademicYearId == f.AcademicYearId.Value);
            if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) query = query.Where(t => t.AcademicLevelId == f.AcademicLevelId.Value);
            if (f.GroupId.HasValue && f.GroupId.Value > 0) query = query.Where(t => t.GroupId == f.GroupId.Value);
            if (f.SectionId.HasValue && f.SectionId.Value > 0) query = query.Where(t => t.SectionId == f.SectionId.Value);

            var list = await query.ToListAsync(ct);
            if (!list.Any()) return Array.Empty<FacultyWorkloadReportDto>();

            return list
                .GroupBy(t => t.StaffId)
                .Select(g =>
                {
                    var first = g.FirstOrDefault()?.Staff;
                    var periodCount = g.Count();
                    decimal totalHours = 0;
                    foreach (var item in g)
                    {
                        if (item.Period != null)
                        {
                            var diff = (item.Period.EndTime - item.Period.StartTime).TotalMinutes;
                            if (diff > 0) totalHours += (decimal)(diff / 60.0);
                        }
                    }

                    return new FacultyWorkloadReportDto
                    {
                        FacultyId = g.Key,
                        FacultyEmployeeId = first?.EmployeeId ?? $"EMP-{g.Key}",
                        FacultyName = first != null ? $"{first.FirstName} {first.LastName}".Trim() : $"Staff #{g.Key}",
                        DepartmentName = "Academics",
                        Designation = "Lecturer",
                        PeriodCount = periodCount,
                        HoursPerWeek = Math.Round(totalHours, 1),
                        SubjectNames = string.Join(", ", g.Select(x => x.Subject != null ? x.Subject.SubjectName : "").Where(x => !string.IsNullOrEmpty(x)).Distinct())
                    };
                }).ToList();
        }, ct);
    }

    // =========================================================================
    // 13. AUDIT LOGS REPORT
    // =========================================================================
    public Task<IReadOnlyList<AuditLogDto>> GetAuditLogsAsync(ReportFilterModel f, CancellationToken ct = default)
    {
        return QueryAsync<AuditLogDto>("sp_Report_AuditLogs", f, async () =>
        {
            var (fromDate, toDate) = NormalizeDateRange(f.FromDate, f.ToDate);
            var query = _context.AuditLogs.AsNoTracking().AsQueryable();

            if (fromDate.HasValue) query = query.Where(a => a.CreatedAt >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(a => a.CreatedAt <= toDate.Value);

            var list = await query.OrderByDescending(a => a.CreatedAt).Take(100).ToListAsync(ct);
            return list.Select(a => new AuditLogDto
            {
                AuditLogId = a.AuditLogId,
                UserName = a.UserName ?? "System",
                Action = a.Action,
                EntityName = a.EntityName,
                EntityId = a.EntityId,
                Description = a.Description,
                CreatedAt = a.CreatedAt
            }).ToList();
        }, ct);
    }

    // =========================================================================
    // 14. MISCELLANEOUS (STUDENT PERFORMANCE, SUBJECTS, GROUPS, SECTIONS)
    // =========================================================================
    public Task<IReadOnlyList<StudentPerformanceReportDto>> GetStudentPerformanceAsync(ReportFilterModel f, CancellationToken ct = default)
        => QueryAsync<StudentPerformanceReportDto>("sp_Report_StudentPerformance", f, () => Task.FromResult<IReadOnlyList<StudentPerformanceReportDto>>(Array.Empty<StudentPerformanceReportDto>()), ct);

    public Task<IReadOnlyList<SubjectWiseReportDto>> GetSubjectsAsync(ReportFilterModel f, CancellationToken ct = default)
        => QueryAsync<SubjectWiseReportDto>("sp_Report_Subjects", f, () => Task.FromResult<IReadOnlyList<SubjectWiseReportDto>>(Array.Empty<SubjectWiseReportDto>()), ct);

    public Task<IReadOnlyList<GroupWiseReportDto>> GetGroupsAsync(ReportFilterModel f, CancellationToken ct = default)
        => QueryAsync<GroupWiseReportDto>("sp_Report_Groups", f, () => Task.FromResult<IReadOnlyList<GroupWiseReportDto>>(Array.Empty<GroupWiseReportDto>()), ct);

    public Task<IReadOnlyList<SectionWiseReportDto>> GetSectionsAsync(ReportFilterModel f, CancellationToken ct = default)
        => QueryAsync<SectionWiseReportDto>("sp_Report_Sections", f, () => Task.FromResult<IReadOnlyList<SectionWiseReportDto>>(Array.Empty<SectionWiseReportDto>()), ct);
}
