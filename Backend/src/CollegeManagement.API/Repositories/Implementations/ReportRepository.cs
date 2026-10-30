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
            if (conn is System.Data.Common.DbConnection dbConn)
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
        var p = new DynamicParameters();
        p.Add("p_BoardId", boardId.HasValue && boardId.Value > 0 ? boardId.Value : null, DbType.Int32);
        return QuerySpAsync<ReportFilterAcademicYearDto>("sp_Report_Filter_AcademicYears", p, ct);
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
