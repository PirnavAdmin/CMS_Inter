using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.DTOs.Attendance.Requests;
using CollegeManagement.API.DTOs.Attendance.Responses;
using CollegeManagement.API.DTOs.Common;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using MiniExcelLibs;

namespace CollegeManagement.API.Services.Implementations
{
    /// <summary>
    /// Service implementation for managing Attendance operations and business validations.
    /// Strictly adheres to Controller -> Service -> Repository -> Dapper -> Stored Procedure flow.
    /// Zero inline SQL, zero EF Core CRUD operations.
    /// </summary>
    public class AttendanceService : IAttendanceService
    {
        private readonly IAttendanceRepository _repository;
        private readonly IMapper _mapper;
        private readonly IAttendanceCacheService _attendanceCache;

        public AttendanceService(
            IAttendanceRepository repository,
            IMapper mapper,
            IAttendanceCacheService attendanceCache)
        {
            _repository = repository;
            _mapper = mapper;
            _attendanceCache = attendanceCache;
        }

        #region CRUD & Bulk Operations

        public async Task<int> CreateAttendanceAsync(
            CreateAttendanceRequest request,
            bool isAdmin,
            string userName,
            int? userId = null,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                throw new ValidationException("Request body cannot be null.");
            }

            int sessionId = 0;

            if (!isAdmin && request.SectionId > 0)
            {
                var sessionResult = await _repository.GetOrCreateSessionAsync(
                    1,
                    request.AttendanceDate,
                    request.PeriodId,
                    request.SectionId,
                    request.SubjectId,
                    request.FacultyId,
                    request.BoardId,
                    request.AcademicYearId,
                    request.AcademicLevelId,
                    request.GroupId,
                    request.TimetableId,
                    cancellationToken);

                if (sessionResult.IsLocked)
                {
                    throw new ValidationException("This attendance session is locked and cannot be modified.");
                }

                sessionId = sessionResult.SessionId;

                if (sessionId > 0)
                {
                    var exists = await _repository.AttendanceExistsAsync(request.StudentId, sessionId, cancellationToken);
                    if (exists)
                    {
                        throw new ConflictException($"Attendance has already been marked for Student ID {request.StudentId} in session {sessionId}.");
                    }
                }
            }

            var attendance = _mapper.Map<Attendance>(request);
            if (sessionId > 0)
            {
                attendance.AttendanceSessionId = sessionId;
            }
            attendance.ModifiedByUserId = userId;

            var id = await _repository.CreateAttendanceAsync(attendance, cancellationToken);
            _attendanceCache.InvalidateAll();
            return id;
        }

        public async Task<int> CreateBulkAttendanceAsync(
            BulkAttendanceRequest request,
            bool isAdmin,
            string userName,
            int? userId = null,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                throw new ValidationException("Request body cannot be null.");
            }
            if (request.Students == null || !request.Students.Any())
            {
                throw new ValidationException("Students collection cannot be empty.");
            }

            int sessionId = 0;

            if (request.SectionId > 0)
            {
                var sessionResult = await _repository.GetOrCreateSessionAsync(
                    1,
                    request.AttendanceDate,
                    request.PeriodId,
                    request.SectionId,
                    request.SubjectId,
                    request.FacultyId,
                    request.BoardId,
                    request.AcademicYearId,
                    request.AcademicLevelId,
                    request.GroupId,
                    request.TimetableId,
                    cancellationToken);

                if (sessionResult.IsLocked)
                {
                    throw new ValidationException("This attendance session is locked and cannot be modified.");
                }

                sessionId = sessionResult.SessionId;
            }

            var attendances = request.Students.Select(item => new Attendance
            {
                StudentId = item.StudentId,
                Status = item.Status,
                Remarks = item.Remarks,
                AttendanceDate = request.AttendanceDate,
                BoardId = request.BoardId,
                AcademicYearId = request.AcademicYearId,
                AcademicLevelId = request.AcademicLevelId,
                GroupId = request.GroupId,
                SectionId = request.SectionId,
                SubjectId = request.SubjectId,
                FacultyId = request.FacultyId,
                Session = request.Session,
                AttendanceSessionId = sessionId > 0 ? sessionId : null,
                ModifiedByUserId = userId,
                IsActive = true
            }).ToList();

            var count = await _repository.CreateBulkAttendanceAsync(attendances, sessionId, cancellationToken);
            _attendanceCache.InvalidateAll();
            return count;
        }

        public async Task<int> UpdateAttendanceAsync(
            UpdateAttendanceRequest request,
            bool isAdmin,
            string userName,
            int? userId = null,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                throw new ValidationException("Request body cannot be null.");
            }

            var existing = await _repository.GetAttendanceByIdAsync(request.AttendanceId, cancellationToken);
            if (existing == null)
            {
                throw new NotFoundException($"Attendance record with ID {request.AttendanceId} was not found.");
            }

            var attendance = _mapper.Map<Attendance>(request);
            attendance.ModifiedByUserId = userId;

            var rows = await _repository.UpdateAttendanceAsync(attendance, cancellationToken);
            _attendanceCache.InvalidateAll();
            return rows;
        }

        public async Task<int> BulkUpdateAttendanceAsync(
            BulkUpdateAttendanceRequest request,
            bool isAdmin,
            string userName,
            int? userId = null,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                throw new ValidationException("Request body cannot be null.");
            }
            if (request.Updates == null || !request.Updates.Any())
            {
                throw new ValidationException("Updates collection cannot be empty.");
            }

            int affectedRows = 0;
            foreach (var update in request.Updates)
            {
                var existing = await _repository.GetAttendanceByIdAsync(update.AttendanceId, cancellationToken);
                if (existing == null)
                {
                    continue;
                }

                var attendance = new Attendance
                {
                    AttendanceId = update.AttendanceId,
                    AttendanceDate = existing.AttendanceDate,
                    StudentId = existing.StudentId,
                    FacultyId = existing.FacultyId,
                    BoardId = existing.BoardId,
                    AcademicYearId = existing.AcademicYearId,
                    AcademicLevelId = existing.AcademicLevelId,
                    GroupId = existing.GroupId,
                    SectionId = existing.SectionId,
                    SubjectId = existing.SubjectId,
                    Status = update.Status,
                    Remarks = update.Remarks,
                    ModifiedByUserId = userId
                };

                affectedRows += await _repository.UpdateAttendanceAsync(attendance, cancellationToken);
            }

            _attendanceCache.InvalidateAll();
            return affectedRows;
        }

        public async Task<int> AdminBulkSaveStudentAttendanceAsync(
            AdminBulkSaveStudentAttendanceRequest request,
            string userName,
            int? userId = null,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                throw new ValidationException("Request body cannot be null.");
            }
            if (request.Attendances == null || !request.Attendances.Any())
            {
                throw new ValidationException("Attendances list cannot be null or empty.");
            }

            var count = await _repository.AdminBulkSaveStudentAttendanceAsync(request, userName, userId, cancellationToken);
            _attendanceCache.InvalidateAll();
            return count;
        }

        public async Task<AttendanceResponse?> GetAttendanceByIdAsync(int attendanceId, CancellationToken cancellationToken = default)
        {
            return await _repository.GetAttendanceByIdAsync(attendanceId, cancellationToken);
        }

        public async Task<PagedResponse<AttendanceListResponse>> GetAttendancesAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            string cacheKey = _attendanceCache.GetCacheKey("GetAttendances", request);
            return await _attendanceCache.GetOrCreateAsync(cacheKey, async () =>
            {
                var items = await _repository.GetAttendancesAsync(request, cancellationToken);
                var totalCount = await _repository.GetAttendancesTotalCountAsync(request, cancellationToken);
                int pageNumber = request.PageNumber > 0 ? request.PageNumber : 1;
                int pageSize = request.PageSize > 0 ? request.PageSize : 10;

                return new PagedResponse<AttendanceListResponse>
                {
                    Items = items,
                    CurrentPage = pageNumber,
                    PageSize = pageSize,
                    TotalCount = totalCount,
                    TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                };
            });
        }

        public async Task<IEnumerable<StudentAttendanceResponse>> GetStudentsForAttendanceAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            return await _repository.GetStudentsForAttendanceAsync(request, cancellationToken);
        }

        public async Task<IEnumerable<StudentAttendanceResponse>> GetAdminStudentsForAttendanceAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            return await _repository.GetAdminStudentsForAttendanceAsync(request, cancellationToken);
        }

        public async Task<AttendanceSummaryResponse> GetAttendanceSummaryAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            return await _repository.GetAttendanceSummaryAsync(request, cancellationToken);
        }

        public async Task<IEnumerable<AttendanceDefaulterResponse>> GetAttendanceDefaultersAsync(AttendanceDefaultersRequest request, CancellationToken cancellationToken = default)
        {
            return await _repository.GetAttendanceDefaultersAsync(request, cancellationToken);
        }

        public async Task<IEnumerable<AttendancePercentageResponse>> GetAttendancePercentageAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            return await _repository.GetAttendancePercentageAsync(request, cancellationToken);
        }

        public async Task<IEnumerable<AttendanceReportResponse>> GetAttendanceReportAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            return await _repository.GetAttendanceReportAsync(request, cancellationToken);
        }

        public async Task<int> ChangeAttendanceActiveStatusAsync(int attendanceId, bool isActive, bool isAdmin, string userName, CancellationToken cancellationToken = default)
        {
            var result = await _repository.ChangeAttendanceActiveStatusAsync(attendanceId, isActive, cancellationToken);
            _attendanceCache.InvalidateAll();
            return result;
        }

        public async Task<bool> LockSessionAsync(int sessionId, int lockedByUserId, string userName, CancellationToken cancellationToken = default)
        {
            var result = await _repository.LockSessionAsync(sessionId, lockedByUserId, userName, cancellationToken);
            _attendanceCache.InvalidateAll();
            return result;
        }

        public async Task<bool> UnlockSessionAsync(int sessionId, string userName, CancellationToken cancellationToken = default)
        {
            var result = await _repository.UnlockSessionAsync(sessionId, userName, cancellationToken);
            _attendanceCache.InvalidateAll();
            return result;
        }

        public async Task<bool> DeleteAttendanceAsync(int attendanceId, bool isAdmin, string userName, CancellationToken cancellationToken = default)
        {
            var affected = await _repository.ChangeAttendanceActiveStatusAsync(attendanceId, false, cancellationToken);
            _attendanceCache.InvalidateAll();
            return affected > 0;
        }

        public async Task<AcademicContextResponse?> GetAcademicContextAsync(int groupId, int sectionId, CancellationToken cancellationToken = default)
        {
            return await _repository.GetAcademicContextAsync(groupId, sectionId, cancellationToken);
        }

        public async Task<FacultySubjectDerivationResponse?> GetFacultySubjectAllocationAsync(DateTime date, int? groupId = null, int? sectionId = null, int? periodId = null, string? sessionType = null, CancellationToken cancellationToken = default)
        {
            return await _repository.GetFacultySubjectAllocationAsync(date, groupId, sectionId, periodId, sessionType, cancellationToken);
        }

        #endregion

        #region Portal Operations

        public async Task<YearlyOverviewResponse> GetStudentYearlyOverviewAsync(int studentId, int academicYearId, CancellationToken cancellationToken = default)
        {
            return await _repository.GetStudentYearlyOverviewAsync(studentId, academicYearId, cancellationToken);
        }

        public async Task<IEnumerable<SubjectWiseAttendanceResponse>> GetStudentSubjectAttendanceAsync(int studentId, CancellationToken cancellationToken = default)
        {
            return await _repository.GetStudentSubjectAttendanceAsync(studentId, cancellationToken);
        }

        public async Task<IEnumerable<DailyPunchLogResponse>> GetStudentDailyPunchLogsAsync(int studentId, int month, int year, CancellationToken cancellationToken = default)
        {
            return await _repository.GetStudentDailyPunchLogsAsync(studentId, month, year, cancellationToken);
        }

        #endregion

        #region Matrix Grid & Reports

        public async Task<StudentMonthlyReportResponse> GetStudentMonthlyReportGridAsync(StudentMonthlyReportRequest request, CancellationToken cancellationToken = default)
        {
            return await _repository.GetStudentMonthlyReportGridAsync(request, cancellationToken);
        }

        public async Task<byte[]> ExportStudentMonthlyReportToCsvAsync(StudentMonthlyReportRequest request, CancellationToken cancellationToken = default)
        {
            var report = await _repository.GetStudentMonthlyReportGridAsync(request, cancellationToken);
            var sb = new StringBuilder();

            // Header line
            var headers = new List<string> { "Roll Number", "Student Name" };
            foreach (var h in report.DayHeaders)
            {
                headers.Add($"{h.DayNumber} ({h.DayName})");
            }
            headers.AddRange(new[] { "Present", "Absent", "Late", "Leave", "Percentage" });
            sb.AppendLine(string.Join(",", headers.Select(h => $"\"{h}\"")));

            // Rows
            foreach (var row in report.StudentRows)
            {
                var line = new List<string>
                {
                    $"\"{row.RollNumber}\"",
                    $"\"{row.StudentName}\""
                };
                foreach (var st in row.DailyStatus)
                {
                    line.Add($"\"{st}\"");
                }
                line.Add($"\"{row.PresentCount}\"");
                line.Add($"\"{row.AbsentCount}\"");
                line.Add($"\"{row.LateCount}\"");
                line.Add($"\"{row.LeaveCount}\"");
                line.Add($"\"{row.Percentage}%\".");
                sb.AppendLine(string.Join(",", line));
            }

            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> ExportStudentMonthlyReportToExcelAsync(StudentMonthlyReportRequest request, CancellationToken cancellationToken = default)
        {
            var report = await _repository.GetStudentMonthlyReportGridAsync(request, cancellationToken);
            var dataList = new List<Dictionary<string, object>>();

            foreach (var r in report.StudentRows)
            {
                var dict = new Dictionary<string, object>
                {
                    { "Roll Number", r.RollNumber },
                    { "Student Name", r.StudentName }
                };

                for (int i = 0; i < report.DayHeaders.Count; i++)
                {
                    var dh = report.DayHeaders[i];
                    dict[$"Day {dh.DayNumber} ({dh.DayName})"] = r.DailyStatus.Count > i ? r.DailyStatus[i] : "-";
                }

                dict["Present"] = r.PresentCount;
                dict["Absent"] = r.AbsentCount;
                dict["Late"] = r.LateCount;
                dict["Leave"] = r.LeaveCount;
                dict["Percentage"] = $"{r.Percentage}%";

                dataList.Add(dict);
            }

            using var ms = new MemoryStream();
            await ms.SaveAsAsync(dataList, sheetName: "Student Monthly Report");
            return ms.ToArray();
        }

        public async Task<PagedResponse<AttendanceAuditHistoryResponse>> GetAuditHistoryAsync(AuditHistorySearchRequest request, CancellationToken cancellationToken = default)
        {
            return await _repository.GetAuditHistoryAsync(request, cancellationToken);
        }

        #endregion

        #region Excel Import / Export

        public Task<byte[]> GenerateImportTemplateAsync(CancellationToken cancellationToken = default)
        {
            var dataList = new List<Dictionary<string, object>>
            {
                new Dictionary<string, object>
                {
                    { "Admission No", "ADM001" },
                    { "Attendance Date", DateTime.UtcNow.ToString("yyyy-MM-dd") },
                    { "Session", "Morning" },
                    { "Attendance Status", "Present" },
                    { "Remarks", "Regular entry" }
                }
            };

            using var ms = new MemoryStream();
            ms.SaveAs(dataList, sheetName: "Student Attendance");
            return Task.FromResult(ms.ToArray());
        }

        public async Task<object> ImportAttendanceFromExcelAsync(
            byte[] fileBytes,
            bool validateOnly,
            bool isAdmin,
            string userName,
            int? userId,
            CancellationToken cancellationToken = default)
        {
            using var ms = new MemoryStream(fileBytes);
            var rows = ms.Query(useHeaderRow: true, sheetName: "Student Attendance").ToList();

            var errors = new List<object>();
            int validCount = 0;
            int rowIndex = 1;

            var itemsToSave = new List<CreateAttendanceRequest>();

            foreach (var r in rows)
            {
                rowIndex++;
                var dict = r as IDictionary<string, object>;
                if (dict == null) continue;

                string? admNo = dict.ContainsKey("Admission No") ? dict["Admission No"]?.ToString() : null;
                string? dateStr = dict.ContainsKey("Attendance Date") ? dict["Attendance Date"]?.ToString() : null;
                string? sessionStr = dict.ContainsKey("Session") ? dict["Session"]?.ToString() : null;
                string? statusStr = dict.ContainsKey("Attendance Status") ? dict["Attendance Status"]?.ToString() : null;
                string? remarks = dict.ContainsKey("Remarks") ? dict["Remarks"]?.ToString() : null;

                if (string.IsNullOrWhiteSpace(admNo) || string.IsNullOrWhiteSpace(dateStr) || string.IsNullOrWhiteSpace(statusStr))
                {
                    errors.Add(new[] { rowIndex.ToString(), admNo ?? "", "", dateStr ?? "", "Missing required fields" });
                    continue;
                }

                if (!DateTime.TryParse(dateStr, out DateTime attDate))
                {
                    errors.Add(new[] { rowIndex.ToString(), admNo, "", dateStr, "Invalid Date format" });
                    continue;
                }

                if (!Enum.TryParse<AttendanceStatus>(statusStr, true, out var status))
                {
                    errors.Add(new[] { rowIndex.ToString(), admNo, "", dateStr, "Invalid Attendance Status" });
                    continue;
                }

                validCount++;
            }

            _attendanceCache.InvalidateAll();
            return new { total = rows.Count, valid = validCount, errors = errors };
        }

        #endregion
    }
}
