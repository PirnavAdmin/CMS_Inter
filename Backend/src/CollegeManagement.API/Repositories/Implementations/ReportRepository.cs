using System;
using System.Collections.Generic;
using System.Data;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Models.Reports;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations;

public class ReportRepository : IReportRepository
{
    private readonly AppDbContext _context;

    public ReportRepository(AppDbContext context)
    {
        _context = context;
    }

    private IDbConnection Connection => _context.Database.GetDbConnection();

    private static (DateTime? From, DateTime? To) NormalizeDateRange(DateTime? from, DateTime? to)
    {
        DateTime? nFrom = from.HasValue ? from.Value.Date : null;
        DateTime? nTo = to.HasValue ? to.Value.Date.AddDays(1).AddTicks(-1) : null;
        return (nFrom, nTo);
    }

    private static DynamicParameters CreateReportParameters(ReportFilterModel f)
    {
        var (fromDate, toDate) = NormalizeDateRange(f.FromDate, f.ToDate);
        var p = new DynamicParameters();
        p.Add("p_CampusId", f.CampusId.HasValue && f.CampusId.Value > 0 ? f.CampusId.Value : null, DbType.Int32);
        p.Add("p_BoardId", f.BoardId.HasValue && f.BoardId.Value > 0 ? f.BoardId.Value : null, DbType.Int32);
        p.Add("p_AcademicYearId", f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0 ? f.AcademicYearId.Value : null, DbType.Int32);
        p.Add("p_AcademicLevelId", f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0 ? f.AcademicLevelId.Value : null, DbType.Int32);
        p.Add("p_GroupId", f.GroupId.HasValue && f.GroupId.Value > 0 ? f.GroupId.Value : null, DbType.Int32);
        p.Add("p_SectionId", f.SectionId.HasValue && f.SectionId.Value > 0 ? f.SectionId.Value : null, DbType.Int32);
        p.Add("p_FromDate", fromDate, DbType.DateTime);
        p.Add("p_ToDate", toDate, DbType.DateTime);
        return p;
    }

    private async Task<IReadOnlyList<T>> QuerySpAsync<T>(string procedure, DynamicParameters parameters, CancellationToken ct)
    {
        var conn = Connection;
        if (conn.State != ConnectionState.Open)
        {
<<<<<<< HEAD
            if (conn is System.Data.Common.DbConnection dbConn)
=======
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
        var admQuery = _context.StudentAdmissions.AsNoTracking().Where(a => a.Status == "Approved" || a.Status == "Request Approved" || a.Status == "Admitted" || a.Status == "Active" || a.Status == null || a.Status == "");
        if (f.CampusId.HasValue && f.CampusId.Value > 0) admQuery = admQuery.Where(a => a.CampusId == f.CampusId.Value);
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
        if (f.CampusId.HasValue && f.CampusId.Value > 0) stuQuery = stuQuery.Where(s => s.CampusId == f.CampusId.Value);
        if (f.BoardId.HasValue && f.BoardId.Value > 0) stuQuery = stuQuery.Where(s => s.BoardId == f.BoardId.Value);
        if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) stuQuery = stuQuery.Where(s => s.AcademicYearId == f.AcademicYearId.Value);
        if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) stuQuery = stuQuery.Where(s => s.AcademicLevelId == f.AcademicLevelId.Value);
        if (f.GroupId.HasValue && f.GroupId.Value > 0) stuQuery = stuQuery.Where(s => s.GroupId == f.GroupId.Value);
        if (f.SectionId.HasValue && f.SectionId.Value > 0) stuQuery = stuQuery.Where(s => s.SectionId == f.SectionId.Value);
        var strengthCount = await stuQuery.CountAsync(ct);

        // 3. Attendance Rate (Present logs / Total logged student instances)
        var attQuery = _context.Attendances.AsNoTracking().Where(a => a.IsActive);
        if (f.CampusId.HasValue && f.CampusId.Value > 0) attQuery = attQuery.Where(a => _context.Students.Any(s => s.StudentId == a.StudentId && s.CampusId == f.CampusId.Value));
        if (f.BoardId.HasValue && f.BoardId.Value > 0) attQuery = attQuery.Where(a => a.BoardId == f.BoardId.Value);
        if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) attQuery = attQuery.Where(a => a.AcademicYearId == f.AcademicYearId.Value);
        if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) attQuery = attQuery.Where(a => a.AcademicLevelId == f.AcademicLevelId.Value);
        if (f.GroupId.HasValue && f.GroupId.Value > 0) attQuery = attQuery.Where(a => a.GroupId == f.GroupId.Value);
        if (f.SectionId.HasValue && f.SectionId.Value > 0) attQuery = attQuery.Where(a => a.SectionId == f.SectionId.Value);
        if (fromDate.HasValue) attQuery = attQuery.Where(a => a.AttendanceDate >= fromDate.Value);
        if (toDate.HasValue) attQuery = attQuery.Where(a => a.AttendanceDate <= toDate.Value);
        var totalAtt = await attQuery.CountAsync(ct);
        var presentAtt = totalAtt > 0 ? await attQuery.CountAsync(a => a.Status == AttendanceStatus.Present || a.Status == AttendanceStatus.Late, ct) : 0;
        decimal attendancePct = totalAtt > 0 ? Math.Round((decimal)presentAtt * 100m / totalAtt, 2) : 0m;

        // 4. Fee Collection (Valid payments from FeePayments joined with Students)
        var feeQuery = _context.FeePayments.AsNoTracking().Where(p => p.Status != "Cancelled" && p.Status != "Failed");
        feeQuery = feeQuery.Where(p => _context.Students.Any(s => s.StudentId == p.StudentId
            && (f.CampusId.HasValue && f.CampusId.Value > 0 ? s.CampusId == f.CampusId.Value : true)
            && (!f.BoardId.HasValue || f.BoardId.Value <= 0 || s.BoardId == f.BoardId.Value)
            && (!f.AcademicYearId.HasValue || f.AcademicYearId.Value <= 0 || s.AcademicYearId == f.AcademicYearId.Value)
            && (!f.AcademicLevelId.HasValue || f.AcademicLevelId.Value <= 0 || s.AcademicLevelId == f.AcademicLevelId.Value)
            && (!f.GroupId.HasValue || f.GroupId.Value <= 0 || s.GroupId == f.GroupId.Value)
            && (!f.SectionId.HasValue || f.SectionId.Value <= 0 || s.SectionId == f.SectionId.Value)
        ));
        if (fromDate.HasValue) feeQuery = feeQuery.Where(p => p.PaymentDate >= fromDate.Value);
        if (toDate.HasValue) feeQuery = feeQuery.Where(p => p.PaymentDate <= toDate.Value);
        decimal feeCollected = 0;
        try { feeCollected = await feeQuery.SumAsync(p => p.Amount, ct); } catch { }

        // 5. Due Fees (Outstanding from StudentFees joined with Active Enrolled Students)
        var dueQuery = _context.StudentFees.AsNoTracking().Where(sf => sf.Status != "Cancelled" && sf.BalanceAmount > 0);
        dueQuery = dueQuery.Where(sf => _context.Students.Any(s => s.StudentId == sf.StudentId && s.IsActive
            && (f.CampusId.HasValue && f.CampusId.Value > 0 ? s.CampusId == f.CampusId.Value : true)
            && (!f.BoardId.HasValue || f.BoardId.Value <= 0 || s.BoardId == f.BoardId.Value)
            && (!f.AcademicYearId.HasValue || f.AcademicYearId.Value <= 0 || s.AcademicYearId == f.AcademicYearId.Value)
            && (!f.AcademicLevelId.HasValue || f.AcademicLevelId.Value <= 0 || s.AcademicLevelId == f.AcademicLevelId.Value)
            && (!f.GroupId.HasValue || f.GroupId.Value <= 0 || s.GroupId == f.GroupId.Value)
            && (!f.SectionId.HasValue || f.SectionId.Value <= 0 || s.SectionId == f.SectionId.Value)
        ));
        decimal dueFees = 0;
        try { dueFees = await dueQuery.SumAsync(sf => sf.BalanceAmount, ct); } catch { }

        // 6. Examinations Count
        var examQuery = _context.Examinations.AsNoTracking().Where(e => e.IsActive);
        if (f.CampusId.HasValue && f.CampusId.Value > 0) examQuery = examQuery.Where(e => e.CampusId == null || e.CampusId == f.CampusId.Value);
        if (f.BoardId.HasValue && f.BoardId.Value > 0) examQuery = examQuery.Where(e => e.BoardId == f.BoardId.Value);
        if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) examQuery = examQuery.Where(e => e.AcademicYearId == f.AcademicYearId.Value);
        if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) examQuery = examQuery.Where(e => e.AcademicLevelId == f.AcademicLevelId.Value);
        if (f.GroupId.HasValue && f.GroupId.Value > 0) examQuery = examQuery.Where(e => e.GroupId == f.GroupId.Value);
        if (fromDate.HasValue) examQuery = examQuery.Where(e => e.EndDate >= DateOnly.FromDateTime(fromDate.Value));
        if (toDate.HasValue) examQuery = examQuery.Where(e => e.StartDate <= DateOnly.FromDateTime(toDate.Value));
        var examsCount = await examQuery.CountAsync(ct);

        // 7. Results Published (Published results count)
        var resQuery = _context.Results.AsNoTracking().Where(r => r.IsPublished);
        if (f.CampusId.HasValue && f.CampusId.Value > 0) resQuery = resQuery.Where(r => r.CampusId == f.CampusId.Value || _context.Students.Any(s => s.StudentId == r.StudentId && s.CampusId == f.CampusId.Value));
        if (f.BoardId.HasValue && f.BoardId.Value > 0) resQuery = resQuery.Where(r => r.BoardId == f.BoardId.Value);
        if (f.AcademicYearId.HasValue && f.AcademicYearId.Value > 0) resQuery = resQuery.Where(r => r.AcademicYearId == f.AcademicYearId.Value);
        if (f.AcademicLevelId.HasValue && f.AcademicLevelId.Value > 0) resQuery = resQuery.Where(r => r.AcademicLevelId == f.AcademicLevelId.Value);
        if (f.GroupId.HasValue && f.GroupId.Value > 0) resQuery = resQuery.Where(r => r.GroupId == f.GroupId.Value);
        if (f.SectionId.HasValue && f.SectionId.Value > 0) resQuery = resQuery.Where(r => _context.Students.Any(s => s.StudentId == r.StudentId && s.SectionId == f.SectionId.Value));
        if (fromDate.HasValue) resQuery = resQuery.Where(r => r.PublishedDate >= fromDate.Value);
        if (toDate.HasValue) resQuery = resQuery.Where(r => r.PublishedDate <= toDate.Value);

        var rawResults = await resQuery.Select(r => new { r.StudentId, r.ExamId, r.ResultStatus, r.TotalMarks }).ToListAsync(ct);
        var resultsPublished = rawResults.Select(r => r.ExamId).Distinct().Count();

        // 8. Pass Percentage (Holistic student evaluation: Passed all subjects in exam)
        var studentExamGroup = rawResults
            .GroupBy(r => new { r.StudentId, r.ExamId })
            .Select(g => new
>>>>>>> origin/main
            {
                await dbConn.OpenAsync(ct);
            }
            else
            {
                conn.Open();
            }
        }

        var command = new CommandDefinition(
            procedure,
            parameters,
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);

        var rows = await conn.QueryAsync<T>(command);
        return rows.AsList() ?? (IReadOnlyList<T>)Array.Empty<T>();
    }

    // =========================================================================
    // 1. DASHBOARD OVERVIEW METRICS (100% Stored Procedure)
    // =========================================================================
    public async Task<DashboardReportDto> GetDashboardAsync(ReportFilterModel filter, CancellationToken ct = default)
    {
        var conn = Connection;
        if (conn.State != ConnectionState.Open)
        {
            if (conn is System.Data.Common.DbConnection dbConn)
            {
                await dbConn.OpenAsync(ct);
            }
            else
            {
                conn.Open();
            }
        }

        var parameters = CreateReportParameters(filter);
        var command = new CommandDefinition(
            "sp_Report_Dashboard",
            parameters,
            commandType: CommandType.StoredProcedure,
            cancellationToken: ct);

        var result = await conn.QueryFirstOrDefaultAsync<DashboardReportDto>(command);
        return result ?? new DashboardReportDto();
    }

    // =========================================================================
    // 2. DETAILED REPORT QUERIES (100% MySQL Stored Procedures via Dapper)
    // =========================================================================
    public Task<IReadOnlyList<AdmissionReportDto>> GetAdmissionsAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<AdmissionReportDto>("sp_Report_Admissions", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<StudentStrengthReportDto>> GetStudentStrengthAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<StudentStrengthReportDto>("sp_Report_StudentStrength", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<AttendanceReportDto>> GetAttendanceAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<AttendanceReportDto>("sp_Report_Attendance", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<FacultyAttendanceReportDto>> GetFacultyAttendanceAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<FacultyAttendanceReportDto>("sp_Report_FacultyAttendance", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<FeeCollectionReportDto>> GetFeeCollectionAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<FeeCollectionReportDto>("sp_Report_FeeCollection", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<OutstandingFeeReportDto>> GetOutstandingFeesAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<OutstandingFeeReportDto>("sp_Report_DueFees", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<ExaminationReportDto>> GetExaminationsAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<ExaminationReportDto>("sp_Report_Examinations", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<ResultAnalysisReportDto>> GetResultsAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<ResultAnalysisReportDto>("sp_Report_Results", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<PassPercentageReportDto>> GetPassPercentageAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<PassPercentageReportDto>("sp_Report_PassPercentage", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<TopperReportDto>> GetToppersAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<TopperReportDto>("sp_Report_Toppers", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<FacultyWorkloadReportDto>> GetFacultyWorkloadAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<FacultyWorkloadReportDto>("sp_Report_FacultyWorkload", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<StudentPerformanceReportDto>> GetStudentPerformanceAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<StudentPerformanceReportDto>("sp_Report_StudentPerformance", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<SubjectWiseReportDto>> GetSubjectsAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<SubjectWiseReportDto>("sp_Report_Subjects", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<GroupWiseReportDto>> GetGroupsAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<GroupWiseReportDto>("sp_Report_Groups", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<SectionWiseReportDto>> GetSectionsAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<SectionWiseReportDto>("sp_Report_Sections", CreateReportParameters(filter), ct);

    public Task<IReadOnlyList<AuditLogDto>> GetAuditLogsAsync(ReportFilterModel filter, CancellationToken ct = default)
        => QuerySpAsync<AuditLogDto>("sp_Report_AuditLogs", CreateReportParameters(filter), ct);

    // =========================================================================
    // 3. CASCADING FILTER DROPDOWNS (100% Stored Procedures via Dapper)
    // =========================================================================
    public Task<IReadOnlyList<ReportFilterBoardDto>> GetFilterBoardsAsync(int? campusId, CancellationToken ct = default)
    {
        var p = new DynamicParameters();
        p.Add("p_CampusId", campusId.HasValue && campusId.Value > 0 ? campusId.Value : null, DbType.Int32);
        return QuerySpAsync<ReportFilterBoardDto>("sp_Report_Filter_Boards", p, ct);
    }

    public Task<IReadOnlyList<ReportFilterAcademicYearDto>> GetFilterAcademicYearsAsync(int? boardId, CancellationToken ct = default)
    {
<<<<<<< HEAD
        var p = new DynamicParameters();
        p.Add("p_BoardId", boardId.HasValue && boardId.Value > 0 ? boardId.Value : null, DbType.Int32);
        return QuerySpAsync<ReportFilterAcademicYearDto>("sp_Report_Filter_AcademicYears", p, ct);
=======
        return QueryAsync<OutstandingFeeReportDto>("sp_Report_OutstandingFees", f, async () =>
        {
            var query = _context.StudentFees.AsNoTracking()
                .Where(sf => sf.Status != "Cancelled" && sf.BalanceAmount > 0);

            query = query.Where(sf => _context.Students.Any(s => s.StudentId == sf.StudentId && s.IsActive
                && (f.CampusId.HasValue && f.CampusId.Value > 0 ? s.CampusId == f.CampusId.Value : true)
                && (!f.BoardId.HasValue || f.BoardId.Value <= 0 || s.BoardId == f.BoardId.Value)
                && (!f.AcademicYearId.HasValue || f.AcademicYearId.Value <= 0 || s.AcademicYearId == f.AcademicYearId.Value)
                && (!f.AcademicLevelId.HasValue || f.AcademicLevelId.Value <= 0 || s.AcademicLevelId == f.AcademicLevelId.Value)
                && (!f.GroupId.HasValue || f.GroupId.Value <= 0 || s.GroupId == f.GroupId.Value)
                && (!f.SectionId.HasValue || f.SectionId.Value <= 0 || s.SectionId == f.SectionId.Value)
            ));

            var list = await query.OrderByDescending(sf => sf.BalanceAmount).ToListAsync(ct);
            if (!list.Any()) return Array.Empty<OutstandingFeeReportDto>();

            var studentIds = list.Select(sf => sf.StudentId).Distinct().ToList();
            var studentList = await _context.Students.AsNoTracking()
                .Where(s => studentIds.Contains(s.StudentId))
                .ToListAsync(ct);
            var studentMap = studentList
                .GroupBy(s => s.StudentId)
                .ToDictionary(g => g.Key, g => g.First());

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
                    DueDate = sf.AssignedAt.AddDays(30),
                    AssignedDate = sf.AssignedAt
                };
            }).ToList();
        }, ct);
>>>>>>> origin/main
    }

    public Task<IReadOnlyList<ReportFilterAcademicLevelDto>> GetFilterAcademicLevelsAsync(int? boardId, CancellationToken ct = default)
    {
        var p = new DynamicParameters();
        p.Add("p_BoardId", boardId.HasValue && boardId.Value > 0 ? boardId.Value : null, DbType.Int32);
        return QuerySpAsync<ReportFilterAcademicLevelDto>("sp_Report_Filter_AcademicLevels", p, ct);
    }

    public Task<IReadOnlyList<ReportFilterGroupDto>> GetFilterGroupsAsync(int? boardId, int? academicYearId, int? academicLevelId, CancellationToken ct = default)
    {
        var p = new DynamicParameters();
        p.Add("p_BoardId", boardId.HasValue && boardId.Value > 0 ? boardId.Value : null, DbType.Int32);
        p.Add("p_AcademicYearId", academicYearId.HasValue && academicYearId.Value > 0 ? academicYearId.Value : null, DbType.Int32);
        p.Add("p_AcademicLevelId", academicLevelId.HasValue && academicLevelId.Value > 0 ? academicLevelId.Value : null, DbType.Int32);
        return QuerySpAsync<ReportFilterGroupDto>("sp_Report_Filter_Groups", p, ct);
    }

    public Task<IReadOnlyList<ReportFilterSectionDto>> GetFilterSectionsAsync(int? campusId, int? groupId, int? boardId, int? academicYearId, int? academicLevelId, CancellationToken ct = default)
    {
        var p = new DynamicParameters();
        p.Add("p_CampusId", campusId.HasValue && campusId.Value > 0 ? campusId.Value : null, DbType.Int32);
        p.Add("p_GroupId", groupId.HasValue && groupId.Value > 0 ? groupId.Value : null, DbType.Int32);
        p.Add("p_BoardId", boardId.HasValue && boardId.Value > 0 ? boardId.Value : null, DbType.Int32);
        p.Add("p_AcademicYearId", academicYearId.HasValue && academicYearId.Value > 0 ? academicYearId.Value : null, DbType.Int32);
        p.Add("p_AcademicLevelId", academicLevelId.HasValue && academicLevelId.Value > 0 ? academicLevelId.Value : null, DbType.Int32);
        return QuerySpAsync<ReportFilterSectionDto>("sp_Report_Filter_Sections", p, ct);
    }
}
