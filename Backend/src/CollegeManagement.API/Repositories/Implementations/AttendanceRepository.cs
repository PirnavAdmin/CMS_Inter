using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Attendance.Requests;
using CollegeManagement.API.DTOs.Attendance.Responses;
using CollegeManagement.API.DTOs.Common;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    /// <summary>
    /// Repository implementation for Attendance database operations.
    /// Strictly 100% Stored Procedures & Dapper (0% EF Core business CRUD, 0% Inline SQL).
    /// </summary>
    public class AttendanceRepository : IAttendanceRepository
    {
        private readonly AppDbContext _context;

        public AttendanceRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        private async Task EnsureConnectionOpenAsync(CancellationToken cancellationToken = default)
        {
            if (Connection.State != ConnectionState.Open)
            {
                if (Connection is System.Data.Common.DbConnection dbConn)
                {
                    await dbConn.OpenAsync(cancellationToken);
                }
                else
                {
                    Connection.Open();
                }
            }
        }

        private DynamicParameters BuildSearchParameters(AttendanceSearchRequest request)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", request.CampusId ?? 0);
            parameters.Add("p_BoardId", request.BoardId ?? 0);
            parameters.Add("p_AcademicYearId", request.AcademicYearId ?? 0);
            parameters.Add("p_AcademicLevelId", request.AcademicLevelId ?? 0);
            parameters.Add("p_GroupId", request.GroupId ?? 0);
            parameters.Add("p_SectionId", request.SectionId ?? 0);
            parameters.Add("p_SubjectId", request.SubjectId ?? 0);
            parameters.Add("p_FacultyId", request.FacultyId ?? 0);
            parameters.Add("p_StudentId", request.StudentId ?? 0);
            parameters.Add("p_Status", request.Status.HasValue ? (byte)request.Status.Value : (byte?)null);
            parameters.Add("p_FromDate", request.FromDate);
            parameters.Add("p_ToDate", request.ToDate);
            parameters.Add("p_PageNumber", request.PageNumber > 0 ? request.PageNumber : 1);
            parameters.Add("p_PageSize", request.PageSize > 0 ? request.PageSize : 10);
            parameters.Add("p_SearchText", request.SearchText);
            parameters.Add("p_PeriodId", request.PeriodId ?? 0);
            parameters.Add("p_TimetableId", request.TimetableId ?? 0);
            return parameters;
        }

        // =====================================================================
        // CRUD & SEARCH (100% Stored Procedures)
        // =====================================================================

        public async Task<int> CreateAttendanceAsync(Attendance attendance, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            var parameters = new DynamicParameters();
            parameters.Add("p_AttendanceDate", attendance.AttendanceDate);
            parameters.Add("p_StudentId", attendance.StudentId);
            parameters.Add("p_FacultyId", attendance.FacultyId);
            parameters.Add("p_BoardId", attendance.BoardId);
            parameters.Add("p_AcademicYearId", attendance.AcademicYearId);
            parameters.Add("p_AcademicLevelId", attendance.AcademicLevelId);
            parameters.Add("p_GroupId", attendance.GroupId);
            parameters.Add("p_SectionId", attendance.SectionId);
            parameters.Add("p_SubjectId", attendance.SubjectId);
            parameters.Add("p_Status", (byte)attendance.Status);
            parameters.Add("p_Remarks", attendance.Remarks);

            return await Connection.ExecuteScalarAsync<int>(
                new CommandDefinition(
                    "sp_CreateAttendance",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<int> CreateBulkAttendanceAsync(IEnumerable<Attendance> attendances, int attendanceSessionId, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            var items = attendances.Select(a => new
            {
                AttendanceDate = a.AttendanceDate.ToString("yyyy-MM-dd HH:mm:ss"),
                a.StudentId,
                a.FacultyId,
                a.BoardId,
                a.AcademicYearId,
                a.AcademicLevelId,
                a.GroupId,
                a.SectionId,
                a.SubjectId,
                Status = (byte)a.Status,
                a.Remarks,
                IsActive = a.IsActive ? 1 : 0
            });

            var json = JsonSerializer.Serialize(items);
            var parameters = new DynamicParameters();
            parameters.Add("p_AttendanceJson", json);

            return await Connection.ExecuteAsync(
                new CommandDefinition(
                    "sp_CreateBulkAttendance",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<int> UpdateAttendanceAsync(Attendance attendance, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            var parameters = new DynamicParameters();
            parameters.Add("p_AttendanceId", attendance.AttendanceId);
            parameters.Add("p_AttendanceDate", attendance.AttendanceDate);
            parameters.Add("p_StudentId", attendance.StudentId);
            parameters.Add("p_FacultyId", attendance.FacultyId);
            parameters.Add("p_BoardId", attendance.BoardId);
            parameters.Add("p_AcademicYearId", attendance.AcademicYearId);
            parameters.Add("p_AcademicLevelId", attendance.AcademicLevelId);
            parameters.Add("p_GroupId", attendance.GroupId);
            parameters.Add("p_SectionId", attendance.SectionId);
            parameters.Add("p_SubjectId", attendance.SubjectId);
            parameters.Add("p_Status", (byte)attendance.Status);
            parameters.Add("p_Remarks", attendance.Remarks);

            return await Connection.ExecuteAsync(
                new CommandDefinition(
                    "sp_UpdateAttendance",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<AttendanceResponse?> GetAttendanceByIdAsync(int attendanceId, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            return await Connection.QueryFirstOrDefaultAsync<AttendanceResponse>(
                new CommandDefinition(
                    "sp_GetAttendanceById",
                    new { p_AttendanceId = attendanceId },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<IEnumerable<AttendanceListResponse>> GetAttendancesAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);
            var parameters = BuildSearchParameters(request);

            return await Connection.QueryAsync<AttendanceListResponse>(
                new CommandDefinition(
                    "sp_GetAttendances",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<int> GetAttendancesTotalCountAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);
            var parameters = BuildSearchParameters(request);

            return await Connection.ExecuteScalarAsync<int>(
                new CommandDefinition(
                    "sp_GetAttendancesTotalCount",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<AttendanceSummaryResponse> GetAttendanceSummaryAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);
            var parameters = BuildSearchParameters(request);

            var result = await Connection.QueryFirstOrDefaultAsync<AttendanceSummaryResponse>(
                new CommandDefinition(
                    "sp_GetAttendanceSummary",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));

            return result ?? new AttendanceSummaryResponse
            {
                TotalStudents = 0,
                PresentCount = 0,
                AbsentCount = 0,
                LateCount = 0,
                LeaveCount = 0,
                AttendancePercentage = 0,
                AttendanceDate = request.FromDate ?? DateTime.UtcNow
            };
        }

        public async Task<IEnumerable<AttendancePercentageResponse>> GetAttendancePercentageAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);
            var parameters = BuildSearchParameters(request);

            return await Connection.QueryAsync<AttendancePercentageResponse>(
                new CommandDefinition(
                    "sp_GetAttendancePercentage",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<IEnumerable<AttendanceReportResponse>> GetAttendanceReportAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);
            var parameters = BuildSearchParameters(request);

            return await Connection.QueryAsync<AttendanceReportResponse>(
                new CommandDefinition(
                    "sp_GetAttendanceReport",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<bool> AttendanceExistsAsync(int studentId, int attendanceSessionId, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            var count = await Connection.ExecuteScalarAsync<int>(
                new CommandDefinition(
                    "sp_AttendanceExists",
                    new { p_StudentId = studentId, p_AttendanceSessionId = attendanceSessionId },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));

            return count > 0;
        }

        public async Task<int> ChangeAttendanceActiveStatusAsync(int attendanceId, bool isActive, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            return await Connection.ExecuteAsync(
                new CommandDefinition(
                    "sp_ChangeAttendanceStatus",
                    new { p_AttendanceId = attendanceId, p_IsActive = isActive ? 1 : 0 },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<IEnumerable<StudentAttendanceResponse>> GetStudentsForAttendanceAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);
            var parameters = BuildSearchParameters(request);

            return await Connection.QueryAsync<StudentAttendanceResponse>(
                new CommandDefinition(
                    "sp_GetStudentsForAttendance",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        // =====================================================================
        // ADMIN SESSION-BASED ATTENDANCE (100% Stored Procedures)
        // =====================================================================

        public async Task<IEnumerable<StudentAttendanceResponse>> GetAdminStudentsForAttendanceAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            DateTime date = DateTime.UtcNow.Date;
            if (request.FromDate.HasValue) date = request.FromDate.Value.Date;
            else if (!string.IsNullOrEmpty(request.AttendanceDate) && DateTime.TryParse(request.AttendanceDate, out var dt1)) date = dt1.Date;
            else if (!string.IsNullOrEmpty(request.Date) && DateTime.TryParse(request.Date, out var dt2)) date = dt2.Date;

            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", request.CampusId ?? 0);
            parameters.Add("p_BoardId", request.BoardId ?? 0);
            parameters.Add("p_AcademicYearId", request.AcademicYearId ?? 0);
            parameters.Add("p_AcademicLevelId", request.AcademicLevelId ?? 0);
            parameters.Add("p_GroupId", request.GroupId ?? 0);
            parameters.Add("p_ProgramId", request.ProgramId ?? 0);
            parameters.Add("p_SectionId", request.SectionId ?? 0);
            parameters.Add("p_StudentId", request.StudentId ?? 0);
            parameters.Add("p_AttendanceDate", date);
            parameters.Add("p_Session", request.Session.HasValue ? (int)request.Session.Value : 0);
            parameters.Add("p_SearchText", request.SearchText ?? "");

            return await Connection.QueryAsync<StudentAttendanceResponse>(
                new CommandDefinition(
                    "sp_GetAdminStudentsForAttendance",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<int> AdminBulkSaveStudentAttendanceAsync(AdminBulkSaveStudentAttendanceRequest request, string userName, int? userId = null, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            var date = request.AttendanceDate.Date;
            var items = request.Attendances.Select(a => new
            {
                a.StudentId,
                MorningStatus = a.MorningStatus.HasValue ? (int)a.MorningStatus.Value : 0,
                AfternoonStatus = a.AfternoonStatus.HasValue ? (int)a.AfternoonStatus.Value : 0,
                Remarks = a.Remarks ?? ""
            });

            var json = JsonSerializer.Serialize(items);
            var parameters = new DynamicParameters();
            parameters.Add("p_AttendanceDate", date);
            parameters.Add("p_BoardId", request.BoardId ?? 0);
            parameters.Add("p_AcademicYearId", request.AcademicYearId ?? 0);
            parameters.Add("p_AcademicLevelId", request.AcademicLevelId ?? 0);
            parameters.Add("p_GroupId", request.GroupId ?? 0);
            parameters.Add("p_SectionId", request.SectionId ?? 0);
            parameters.Add("p_UserId", userId ?? 0);
            parameters.Add("p_UserName", userName ?? "Admin");
            parameters.Add("p_ItemsJson", json);

            return await Connection.ExecuteScalarAsync<int>(
                new CommandDefinition(
                    "sp_AdminBulkSaveStudentAttendance",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<IEnumerable<AttendanceDefaulterResponse>> GetAttendanceDefaultersAsync(AttendanceDefaultersRequest request, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", request.CampusId ?? 0);
            parameters.Add("p_BoardId", request.BoardId ?? 0);
            parameters.Add("p_AcademicYearId", request.AcademicYearId ?? 0);
            parameters.Add("p_AcademicLevelId", request.AcademicLevelId ?? 0);
            parameters.Add("p_GroupId", request.GroupId ?? 0);
            parameters.Add("p_ProgramId", request.ProgramId ?? 0);
            parameters.Add("p_SectionId", request.SectionId ?? 0);
            parameters.Add("p_Month", request.Month ?? 0);
            parameters.Add("p_Year", request.Year ?? 0);
            parameters.Add("p_Threshold", (decimal)request.Threshold);

            return await Connection.QueryAsync<AttendanceDefaulterResponse>(
                new CommandDefinition(
                    "sp_GetAttendanceDefaulters",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<AcademicContextResponse?> GetAcademicContextAsync(int groupId, int sectionId, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            return await Connection.QueryFirstOrDefaultAsync<AcademicContextResponse>(
                new CommandDefinition(
                    "sp_GetStudentAttendanceAcademicContext",
                    new { p_GroupId = groupId, p_SectionId = sectionId },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<FacultySubjectDerivationResponse?> GetFacultySubjectAllocationAsync(DateTime date, int? groupId = null, int? sectionId = null, int? periodId = null, string? sessionType = null, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            return await Connection.QueryFirstOrDefaultAsync<FacultySubjectDerivationResponse>(
                new CommandDefinition(
                    "sp_GetFacultySubjectDerivation",
                    new
                    {
                        p_Date = date.Date,
                        p_GroupId = groupId ?? 0,
                        p_SectionId = sectionId ?? 0,
                        p_PeriodId = periodId ?? 0,
                        p_SessionType = sessionType ?? "AllPeriods"
                    },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<StudentMonthlyReportResponse> GetStudentMonthlyReportGridAsync(StudentMonthlyReportRequest request, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            int targetMonth = request.Month.HasValue && request.Month.Value > 0 ? request.Month.Value : 0;
            int targetYear = request.Year.HasValue && request.Year.Value > 0 ? request.Year.Value : 0;

            if (targetMonth == 0 || targetYear == 0)
            {
                if (!string.IsNullOrEmpty(request.Date) && DateTime.TryParse(request.Date, out var parsedDt))
                {
                    targetMonth = parsedDt.Month;
                    targetYear = parsedDt.Year;
                }
                else
                {
                    targetMonth = DateTime.UtcNow.Month;
                    targetYear = DateTime.UtcNow.Year;
                }
            }

            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", request.CampusId ?? 0);
            parameters.Add("p_BoardId", request.BoardId ?? 0);
            parameters.Add("p_AcademicYearId", request.AcademicYearId ?? 0);
            parameters.Add("p_AcademicLevelId", request.AcademicLevelId ?? 0);
            parameters.Add("p_ProgramId", request.ProgramId ?? 0);
            parameters.Add("p_GroupId", request.GroupId ?? 0);
            parameters.Add("p_SectionId", request.SectionId ?? 0);
            parameters.Add("p_StudentId", request.StudentId ?? 0);
            parameters.Add("p_Month", targetMonth);
            parameters.Add("p_Year", targetYear);

            using var grid = await Connection.QueryMultipleAsync(
                new CommandDefinition(
                    "sp_GetStudentMonthlyReportGrid",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));

            var contextMeta = await grid.ReadFirstOrDefaultAsync<dynamic>();
            var students = (await grid.ReadAsync<dynamic>()).ToList();
            var attendances = (await grid.ReadAsync<dynamic>()).ToList();
            var holidays = (await grid.ReadAsync<dynamic>()).ToList();

            int daysInMonth = DateTime.DaysInMonth(targetYear, targetMonth);
            var dayHeaders = new List<DayHeaderDto>();

            for (int day = 1; day <= daysInMonth; day++)
            {
                var dt = new DateTime(targetYear, targetMonth, day);
                bool isSunday = dt.DayOfWeek == DayOfWeek.Sunday;
                bool isOfficialHoliday = holidays.Any(h => dt.Date >= ((DateTime)h.StartDate).Date && dt.Date <= ((DateTime)h.EndDate).Date);
                bool isHoliday = isSunday || isOfficialHoliday;

                dayHeaders.Add(new DayHeaderDto
                {
                    DayNumber = day,
                    DateString = dt.ToString("yyyy-MM-dd"),
                    DayName = dt.ToString("ddd", System.Globalization.CultureInfo.InvariantCulture).ToUpper(),
                    CombinedHeader = $"{day} {dt.ToString("ddd", System.Globalization.CultureInfo.InvariantCulture).ToUpper()}",
                    IsHoliday = isHoliday
                });
            }

            var studentRows = new List<StudentMonthlyGridRowDto>();
            int totalPresentAll = 0, totalAbsentAll = 0;
            int workingDaysCount = dayHeaders.Count(d => !d.IsHoliday);

            foreach (var student in students)
            {
                int studentId = (int)student.StudentId;
                var studentAttendances = attendances.Where(a => (int)a.StudentId == studentId).ToList();
                var dailyStatus = new List<string>();
                int presentCount = 0, absentCount = 0, leaveCount = 0;

                for (int day = 1; day <= daysInMonth; day++)
                {
                    var dt = new DateTime(targetYear, targetMonth, day);
                    var header = dayHeaders[day - 1];

                    if (header.IsHoliday)
                    {
                        dailyStatus.Add("H");
                        continue;
                    }

                    var dayRecords = studentAttendances.Where(a => ((DateTime)a.AttendanceDate).Date == dt.Date).ToList();
                    if (!dayRecords.Any())
                    {
                        dailyStatus.Add("-");
                        continue;
                    }

                    var morning = dayRecords.FirstOrDefault(r => r.Session == 1);
                    var afternoon = dayRecords.FirstOrDefault(r => r.Session == 2);

                    int morningStatus = morning != null ? (int)morning.Status : (int)dayRecords.First().Status;
                    int afternoonStatus = afternoon != null ? (int)afternoon.Status : morningStatus;

                    if (morningStatus == (int)AttendanceStatus.Present && afternoonStatus == (int)AttendanceStatus.Present)
                    {
                        dailyStatus.Add("P");
                        presentCount++;
                    }
                    else if (morningStatus == (int)AttendanceStatus.Absent && afternoonStatus == (int)AttendanceStatus.Absent)
                    {
                        dailyStatus.Add("A");
                        absentCount++;
                    }
                    else if (morningStatus == (int)AttendanceStatus.Leave || afternoonStatus == (int)AttendanceStatus.Leave)
                    {
                        dailyStatus.Add("L");
                        leaveCount++;
                    }
                    else
                    {
                        dailyStatus.Add("HD");
                        presentCount++;
                    }
                }

                double percentage = workingDaysCount > 0
                    ? Math.Round((double)presentCount / workingDaysCount * 100, 1)
                    : 0;

                studentRows.Add(new StudentMonthlyGridRowDto
                {
                    StudentId = studentId,
                    RollNumber = (string)(student.RollNo ?? ""),
                    StudentName = (string)(student.StudentName ?? ""),
                    GroupName = (string)(student.GroupName ?? ""),
                    SectionName = (string)(student.SectionName ?? ""),
                    DailyStatus = dailyStatus,
                    PresentCount = presentCount,
                    AbsentCount = absentCount,
                    HalfDayCount = leaveCount,
                    LeaveCount = leaveCount,
                    LateCount = 0,
                    Percentage = percentage
                });

                totalPresentAll += presentCount;
                totalAbsentAll += absentCount;
            }

            int totalStudents = studentRows.Count;
            int totalHalfDayAll = studentRows.Sum(r => r.HalfDayCount);
            int totalMarkedAll = totalPresentAll + totalAbsentAll + totalHalfDayAll;
            double overallPercentage = totalMarkedAll > 0
                ? Math.Round((double)(totalPresentAll + 0.5 * totalHalfDayAll) / totalMarkedAll * 100, 1)
                : 0;

            return new StudentMonthlyReportResponse
            {
                Month = targetMonth,
                Year = targetYear,
                GroupName = (string)(contextMeta?.GroupName ?? "All Groups"),
                SectionName = (string)(contextMeta?.SectionName ?? "All Sections"),
                TotalWorkingDays = workingDaysCount,
                TotalPresent = totalPresentAll,
                TotalAbsent = totalAbsentAll,
                OverallAttendancePercentage = overallPercentage,
                DayHeaders = dayHeaders,
                StudentRows = studentRows
            };
        }

        // =====================================================================
        // STUDENT & PARENT PORTAL ATTENDANCE (100% Stored Procedures)
        // =====================================================================

        public async Task<YearlyOverviewResponse> GetStudentYearlyOverviewAsync(int studentId, int academicYearId, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            using var multi = await Connection.QueryMultipleAsync(
                new CommandDefinition(
                    "sp_GetStudentAttendances",
                    new { p_StudentId = studentId, p_AcademicYearId = academicYearId },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));

            var yearInfo = await multi.ReadSingleOrDefaultAsync<dynamic>();
            if (yearInfo == null || yearInfo.StartDate == null || yearInfo.EndDate == null)
            {
                throw new KeyNotFoundException("No active Academic Year found in the system for this student.");
            }

            DateTime startDate = yearInfo.StartDate;
            DateTime endDate = yearInfo.EndDate;
            var records = (await multi.ReadAsync<Attendance>()).ToList();

            var response = new YearlyOverviewResponse();
            var months = new List<MonthlyOverviewItem>();

            var currentMonth = new DateTime(startDate.Year, startDate.Month, 1);
            var endMonth = new DateTime(endDate.Year, endDate.Month, 1);

            while (currentMonth <= endMonth)
            {
                var monthRecords = records.Where(r => r.AttendanceDate.Month == currentMonth.Month && r.AttendanceDate.Year == currentMonth.Year).ToList();
                var distinctDays = monthRecords.Select(r => r.AttendanceDate.Date).Distinct().ToList();
                int workingDays = distinctDays.Count;

                int presentDays = 0, absentDays = 0, halfDays = 0;

                foreach (var day in distinctDays)
                {
                    var dayRecords = monthRecords.Where(r => r.AttendanceDate.Date == day).ToList();
                    var morning = dayRecords.FirstOrDefault(r => r.Session == StudentAttendanceSession.Morning);
                    var afternoon = dayRecords.FirstOrDefault(r => r.Session == StudentAttendanceSession.Afternoon);

                    bool isMorningPresent = morning != null && morning.Status == AttendanceStatus.Present;
                    bool isAfternoonPresent = afternoon != null && afternoon.Status == AttendanceStatus.Present;
                    bool hasMorning = morning != null, hasAfternoon = afternoon != null;

                    if (isMorningPresent && isAfternoonPresent) presentDays++;
                    else if ((isMorningPresent && hasAfternoon && !isAfternoonPresent) || (isAfternoonPresent && hasMorning && !isMorningPresent)) halfDays++;
                    else if (isMorningPresent || isAfternoonPresent) presentDays++;
                    else absentDays++;
                }

                months.Add(new MonthlyOverviewItem
                {
                    MonthName = currentMonth.ToString("MMMM"),
                    Month = currentMonth.Month,
                    Year = currentMonth.Year,
                    WorkingDays = workingDays,
                    Present = presentDays,
                    Absent = absentDays,
                    HalfDays = halfDays,
                    AttendancePercentage = workingDays > 0 ? Math.Round(((presentDays + (halfDays * 0.5)) / workingDays) * 100, 2) : 0
                });

                currentMonth = currentMonth.AddMonths(1);
            }

            response.MonthlyRecords = months;
            response.TotalWorkingDays = months.Sum(m => m.WorkingDays);
            response.TotalPresent = months.Sum(m => m.Present);
            response.TotalAbsent = months.Sum(m => m.Absent);
            response.TotalHalfDays = months.Sum(m => m.HalfDays);
            response.OverallAttendancePercentage = response.TotalWorkingDays > 0
                ? Math.Round(((response.TotalPresent + (response.TotalHalfDays * 0.5)) / response.TotalWorkingDays) * 100, 2)
                : 0;

            return response;
        }

        public async Task<IEnumerable<SubjectWiseAttendanceResponse>> GetStudentSubjectAttendanceAsync(int studentId, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            return await Connection.QueryAsync<SubjectWiseAttendanceResponse>(
                new CommandDefinition(
                    "sp_GetStudentSubjectAttendance",
                    new { p_StudentId = studentId },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<IEnumerable<DailyPunchLogResponse>> GetStudentDailyPunchLogsAsync(int studentId, int month, int year, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            return await Connection.QueryAsync<DailyPunchLogResponse>(
                new CommandDefinition(
                    "sp_GetStudentDailyPunchLogs",
                    new { p_StudentId = studentId, p_Month = month, p_Year = year },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));
        }

        public async Task<bool> LockSessionAsync(int sessionId, int lockedByUserId, string userName, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            var parameters = new DynamicParameters();
            parameters.Add("p_SessionId", sessionId);
            parameters.Add("p_LockedBy", lockedByUserId);
            parameters.Add("p_UserName", userName);
            parameters.Add("p_Success", dbType: DbType.Int32, direction: ParameterDirection.Output);

            await Connection.ExecuteAsync(
                new CommandDefinition(
                    "sp_LockAttendanceSession",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));

            int result = parameters.Get<int>("p_Success");
            if (result == -1) throw new KeyNotFoundException($"Attendance session with ID {sessionId} was not found.");
            if (result == 0) throw new InvalidOperationException("This attendance session is already locked.");
            return result == 1;
        }

        public async Task<bool> UnlockSessionAsync(int sessionId, string userName, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            var parameters = new DynamicParameters();
            parameters.Add("p_SessionId", sessionId);
            parameters.Add("p_UserName", userName);
            parameters.Add("p_Success", dbType: DbType.Int32, direction: ParameterDirection.Output);

            await Connection.ExecuteAsync(
                new CommandDefinition(
                    "sp_UnlockAttendanceSession",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));

            int result = parameters.Get<int>("p_Success");
            if (result == -1) throw new KeyNotFoundException($"Attendance session with ID {sessionId} was not found.");
            return result == 1;
        }

        public async Task<PagedResponse<AttendanceAuditHistoryResponse>> GetAuditHistoryAsync(AuditHistorySearchRequest request, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            var parameters = new DynamicParameters();
            parameters.Add("p_FromDate", request.FromDate);
            parameters.Add("p_ToDate", request.ToDate);
            parameters.Add("p_UserId", request.UserId ?? 0);
            parameters.Add("p_StudentId", request.StudentId ?? 0);
            parameters.Add("p_FacultyId", request.FacultyId ?? 0);
            parameters.Add("p_EntityType", request.EntityType ?? "");
            parameters.Add("p_Action", request.Action ?? "");
            parameters.Add("p_PageNumber", request.PageNumber > 0 ? request.PageNumber : 1);
            parameters.Add("p_PageSize", request.PageSize > 0 ? request.PageSize : 10);

            using var multi = await Connection.QueryMultipleAsync(
                new CommandDefinition(
                    "sp_GetAttendanceAuditHistory",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));

            var totalCount = await multi.ReadSingleOrDefaultAsync<int>();
            var items = (await multi.ReadAsync<AttendanceAuditHistoryResponse>()).ToList();
            int pageNumber = request.PageNumber > 0 ? request.PageNumber : 1;
            int pageSize = request.PageSize > 0 ? request.PageSize : 10;

            return new PagedResponse<AttendanceAuditHistoryResponse>
            {
                Items = items,
                CurrentPage = pageNumber,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }

        public async Task<(int SessionId, bool IsLocked)> GetOrCreateSessionAsync(int campusId, DateTime attendanceDate, int? periodId, int sectionId, int? subjectId, int? facultyId, int? boardId, int? academicYearId, int? academicLevelId, int? groupId, int? timetableId, CancellationToken cancellationToken = default)
        {
            await EnsureConnectionOpenAsync(cancellationToken);

            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId);
            parameters.Add("p_AttendanceDate", attendanceDate);
            parameters.Add("p_PeriodId", periodId);
            parameters.Add("p_SectionId", sectionId);
            parameters.Add("p_SubjectId", subjectId);
            parameters.Add("p_FacultyId", facultyId);
            parameters.Add("p_BoardId", boardId);
            parameters.Add("p_AcademicYearId", academicYearId);
            parameters.Add("p_AcademicLevelId", academicLevelId);
            parameters.Add("p_GroupId", groupId);
            parameters.Add("p_TimetableId", timetableId);

            var result = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                new CommandDefinition(
                    "sp_GetOrCreateAttendanceSession",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken));

            if (result != null)
            {
                return ((int)result.AttendanceSessionId, (bool)(result.IsLocked == 1 || result.IsLocked == true));
            }

            return (0, false);
        }
    }
}
