using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Attendance.Requests;
using CollegeManagement.API.DTOs.Attendance.Responses;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    /// <summary>
    /// Repository implementation for Attendance database operations using Dapper and EF Core.
    /// </summary>
    public class AttendanceRepository : IAttendanceRepository
    {
        #region Stored Procedure Constants

        private const string SpCreateAttendance = "sp_CreateAttendance";
        private const string SpCreateBulkAttendance = "sp_CreateBulkAttendance";
        private const string SpUpdateAttendance = "sp_UpdateAttendance";
        private const string SpChangeAttendanceStatus = "sp_ChangeAttendanceStatus";
        private const string SpGetAttendanceById = "sp_GetAttendanceById";
        private const string SpGetAttendances = "sp_GetAttendances";
        private const string SpGetAttendancesTotalCount = "sp_GetAttendancesTotalCount";
        private const string SpGetStudentsForAttendance = "sp_GetStudentsForAttendance";
        private const string SpGetAttendanceSummary = "sp_GetAttendanceSummary";
        private const string SpGetAttendancePercentage = "sp_GetAttendancePercentage";
        private const string SpGetAttendanceReport = "sp_GetAttendanceReport";
        private const string SpAttendanceExists = "sp_AttendanceExists";

        #endregion

        #region Constructor

        private readonly AppDbContext _context;

        /// <summary>
        /// Initializes a new instance of the <see cref="AttendanceRepository"/> class.
        /// </summary>
        /// <param name="context">The database context.</param>
        public AttendanceRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        #endregion

        #region Helper Methods

        /// <summary>
        /// Builds common search dynamic parameters for attendance search requests.
        /// </summary>
        private DynamicParameters BuildSearchParameters(AttendanceSearchRequest request)
        {
            var parameters = new DynamicParameters();

            parameters.Add("p_BoardId", request.BoardId);
            parameters.Add("p_AcademicYearId", request.AcademicYearId);
            parameters.Add("p_AcademicLevelId", request.AcademicLevelId);
            parameters.Add("p_GroupId", request.GroupId);
            parameters.Add("p_SectionId", request.SectionId);
            parameters.Add("p_SubjectId", request.SubjectId);
            parameters.Add("p_FacultyId", request.FacultyId);
            parameters.Add("p_StudentId", request.StudentId);
            parameters.Add("p_Status", request.Status.HasValue ? (byte)request.Status.Value : (byte?)null);
            parameters.Add("p_FromDate", request.FromDate);
            parameters.Add("p_ToDate", request.ToDate);
            parameters.Add("p_PageNumber", request.PageNumber);
            parameters.Add("p_PageSize", request.PageSize);
            parameters.Add("p_SearchText", request.SearchText);
            parameters.Add("p_PeriodId", request.PeriodId);
            parameters.Add("p_TimetableId", request.TimetableId);

            return parameters;
        }

        private IQueryable<Attendance> FilterAttendances(AttendanceSearchRequest request)
        {
            var query = _context.Attendances.AsNoTracking().Where(a => a.IsActive);

            if (request.BoardId.HasValue && request.BoardId.Value > 0)
                query = query.Where(a => a.BoardId == request.BoardId.Value);

            if (request.AcademicYearId.HasValue && request.AcademicYearId.Value > 0)
                query = query.Where(a => a.AcademicYearId == request.AcademicYearId.Value);

            if (request.AcademicLevelId.HasValue && request.AcademicLevelId.Value > 0)
                query = query.Where(a => a.AcademicLevelId == request.AcademicLevelId.Value);

            if (request.GroupId.HasValue && request.GroupId.Value > 0)
                query = query.Where(a => a.GroupId == request.GroupId.Value);

            if (request.SectionId.HasValue && request.SectionId.Value > 0)
                query = query.Where(a => a.SectionId == request.SectionId.Value);

            if (request.SubjectId.HasValue && request.SubjectId.Value > 0)
                query = query.Where(a => a.SubjectId == request.SubjectId.Value);

            if (request.FacultyId.HasValue && request.FacultyId.Value > 0)
                query = query.Where(a => a.FacultyId == request.FacultyId.Value);

            if (request.StudentId.HasValue && request.StudentId.Value > 0)
                query = query.Where(a => a.StudentId == request.StudentId.Value);

            if (request.Status.HasValue)
                query = query.Where(a => a.Status == request.Status.Value);

            if (request.FromDate.HasValue)
                query = query.Where(a => a.AttendanceDate.Date >= request.FromDate.Value.Date);

            if (request.ToDate.HasValue)
                query = query.Where(a => a.AttendanceDate.Date <= request.ToDate.Value.Date);

            if (!string.IsNullOrWhiteSpace(request.SearchText))
            {
                var search = request.SearchText.Trim();
                query = query.Where(a =>
                    a.Student.StudentName.Contains(search) || (a.Student.RollNo != null && a.Student.RollNo.Contains(search)));
            }

            return query;
        }

        private async Task<IEnumerable<AttendanceListResponse>> GetAttendancesFromDbFallbackAsync(AttendanceSearchRequest request)
        {
            var baseQuery = FilterAttendances(request);

            int page = request.PageNumber > 0 ? request.PageNumber : 1;
            int pageSize = request.PageSize > 0 ? request.PageSize : 10;

            var raw = await (from a in baseQuery
                             join s in _context.Students on a.StudentId equals s.StudentId
                             join st in _context.Staffs on a.FacultyId equals (int?)st.Id into staffGroup
                             from st in staffGroup.DefaultIfEmpty()
                             join sub in _context.Subjects on a.SubjectId equals (int?)sub.SubjectId into subGroup
                             from sub in subGroup.DefaultIfEmpty()
                             orderby a.AttendanceDate descending, a.AttendanceId descending
                             select new
                             {
                                 a.AttendanceId,
                                 a.AttendanceDate,
                                 a.StudentId,
                                 RollNumber = s.RollNo ?? "",
                                 StudentName = s.StudentName ?? "",
                                 FacultyName = st != null ? (st.FirstName + " " + (st.LastName ?? "")).Trim() : "",
                                 SubjectName = sub != null ? (sub.SubjectName ?? "") : "",
                                 a.Status,
                                 a.IsActive
                             })
                             .Skip((page - 1) * pageSize)
                             .Take(pageSize)
                             .ToListAsync();

            return raw.Select(r => new AttendanceListResponse
            {
                AttendanceId = r.AttendanceId,
                AttendanceDate = r.AttendanceDate,
                StudentId = r.StudentId,
                RollNumber = r.RollNumber,
                StudentName = r.StudentName,
                FacultyName = r.FacultyName,
                SubjectName = r.SubjectName,
                Status = r.Status,
                IsActive = r.IsActive,
                IsLocked = false
            });
        }

        private async Task<int> GetAttendancesTotalCountFallbackAsync(AttendanceSearchRequest request)
        {
            return await FilterAttendances(request).CountAsync();
        }

        private async Task<AttendanceSummaryResponse> GetAttendanceSummaryFallbackAsync(AttendanceSearchRequest request)
        {
            var baseQuery = FilterAttendances(request);
            var stats = await baseQuery
                .GroupBy(a => 1)
                .Select(g => new
                {
                    Total = g.Count(),
                    Present = g.Count(a => a.Status == AttendanceStatus.Present),
                    Absent = g.Count(a => a.Status == AttendanceStatus.Absent),
                    Late = g.Count(a => a.Status == AttendanceStatus.Late),
                    Leave = g.Count(a => a.Status == AttendanceStatus.Leave),
                    MaxDate = g.Max(a => (DateTime?)a.AttendanceDate)
                })
                .FirstOrDefaultAsync();

            if (stats == null || stats.Total == 0)
            {
                return new AttendanceSummaryResponse
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

            decimal pct = Math.Round((decimal)(stats.Present + stats.Late) / stats.Total * 100m, 2);
            return new AttendanceSummaryResponse
            {
                TotalStudents = stats.Total,
                PresentCount = stats.Present,
                AbsentCount = stats.Absent,
                LateCount = stats.Late,
                LeaveCount = stats.Leave,
                AttendancePercentage = pct,
                AttendanceDate = stats.MaxDate ?? request.FromDate ?? DateTime.UtcNow
            };
        }

        private async Task<IEnumerable<AttendancePercentageResponse>> GetAttendancePercentageFallbackAsync(AttendanceSearchRequest request)
        {
            var baseQuery = FilterAttendances(request);
            var grouped = await (from a in baseQuery
                                 join s in _context.Students on a.StudentId equals s.StudentId
                                 group a by new { a.StudentId, s.StudentName, s.RollNo } into g
                                 select new
                                 {
                                     g.Key.StudentId,
                                     StudentName = g.Key.StudentName ?? "",
                                     RollNumber = g.Key.RollNo ?? "",
                                     Total = g.Count(),
                                     Present = g.Count(a => a.Status == AttendanceStatus.Present),
                                     Absent = g.Count(a => a.Status == AttendanceStatus.Absent),
                                     Late = g.Count(a => a.Status == AttendanceStatus.Late),
                                     Leave = g.Count(a => a.Status == AttendanceStatus.Leave)
                                 })
                                 .OrderBy(x => x.RollNumber)
                                 .ThenBy(x => x.StudentName)
                                 .ToListAsync();

            return grouped.Select(x => new AttendancePercentageResponse
            {
                StudentId = x.StudentId,
                StudentName = x.StudentName,
                RollNumber = x.RollNumber,
                TotalClasses = x.Total,
                PresentClasses = x.Present,
                AbsentClasses = x.Absent,
                LateClasses = x.Late,
                LeaveClasses = x.Leave,
                AttendancePercentage = x.Total > 0 ? Math.Round((decimal)(x.Present + x.Late) / x.Total * 100m, 2) : 0
            });
        }

        private async Task<IEnumerable<AttendanceReportResponse>> GetAttendanceReportFallbackAsync(AttendanceSearchRequest request)
        {
            var baseQuery = FilterAttendances(request);
            var raw = await (from a in baseQuery
                             join s in _context.Students on a.StudentId equals s.StudentId
                             join b in _context.Boards on a.BoardId equals (int?)b.BoardId into bGroup
                             from b in bGroup.DefaultIfEmpty()
                             join ay in _context.AcademicYears on a.AcademicYearId equals (int?)ay.AcademicYearId into ayGroup
                             from ay in ayGroup.DefaultIfEmpty()
                             join al in _context.AcademicLevels on a.AcademicLevelId equals (int?)al.AcademicLevelId into alGroup
                             from al in alGroup.DefaultIfEmpty()
                             join g in _context.Groups on a.GroupId equals (int?)g.GroupId into gGroup
                             from g in gGroup.DefaultIfEmpty()
                             join sec in _context.Sections on a.SectionId equals (int?)sec.SectionId into secGroup
                             from sec in secGroup.DefaultIfEmpty()
                             join sub in _context.Subjects on a.SubjectId equals (int?)sub.SubjectId into subGroup
                             from sub in subGroup.DefaultIfEmpty()
                             join st in _context.Staffs on a.FacultyId equals (int?)st.Id into stGroup
                             from st in stGroup.DefaultIfEmpty()
                             orderby a.AttendanceDate descending, s.RollNo ascending
                             select new
                             {
                                 a.AttendanceId,
                                 a.AttendanceDate,
                                 BoardName = b != null ? (b.BoardName ?? "") : "",
                                 AcademicYearName = ay != null ? (ay.AcademicYearName ?? "") : "",
                                 AcademicLevelName = al != null ? (al.LevelName ?? "") : "",
                                 GroupName = g != null ? (g.GroupName ?? "") : "",
                                 SectionName = sec != null ? (sec.SectionName ?? "") : "",
                                 SubjectName = sub != null ? (sub.SubjectName ?? "") : "",
                                 FacultyName = st != null ? (st.FirstName + " " + (st.LastName ?? "")).Trim() : "",
                                 RollNumber = s.RollNo ?? "",
                                 StudentName = s.StudentName ?? "",
                                 a.Status,
                                 Remarks = a.Remarks ?? ""
                             }).ToListAsync();

            return raw.Select(r => new AttendanceReportResponse
            {
                AttendanceId = r.AttendanceId,
                AttendanceDate = r.AttendanceDate,
                BoardName = r.BoardName,
                AcademicYearName = r.AcademicYearName,
                AcademicLevelName = r.AcademicLevelName,
                GroupName = r.GroupName,
                SectionName = r.SectionName,
                SubjectName = r.SubjectName,
                FacultyName = r.FacultyName,
                RollNumber = r.RollNumber,
                StudentName = r.StudentName,
                Status = r.Status,
                Remarks = r.Remarks
            });
        }

        private async Task<AttendanceResponse?> GetAttendanceByIdFallbackAsync(int attendanceId)
        {
            var raw = await (from a in _context.Attendances.Where(a => a.AttendanceId == attendanceId)
                             join s in _context.Students on a.StudentId equals s.StudentId
                             join b in _context.Boards on a.BoardId equals (int?)b.BoardId into bGroup
                             from b in bGroup.DefaultIfEmpty()
                             join ay in _context.AcademicYears on a.AcademicYearId equals (int?)ay.AcademicYearId into ayGroup
                             from ay in ayGroup.DefaultIfEmpty()
                             join al in _context.AcademicLevels on a.AcademicLevelId equals (int?)al.AcademicLevelId into alGroup
                             from al in alGroup.DefaultIfEmpty()
                             join g in _context.Groups on a.GroupId equals (int?)g.GroupId into gGroup
                             from g in gGroup.DefaultIfEmpty()
                             join sec in _context.Sections on a.SectionId equals (int?)sec.SectionId into secGroup
                             from sec in secGroup.DefaultIfEmpty()
                             join sub in _context.Subjects on a.SubjectId equals (int?)sub.SubjectId into subGroup
                             from sub in subGroup.DefaultIfEmpty()
                             join st in _context.Staffs on a.FacultyId equals (int?)st.Id into stGroup
                             from st in stGroup.DefaultIfEmpty()
                             select new AttendanceResponse
                             {
                                 AttendanceId = a.AttendanceId,
                                 AttendanceSessionId = a.AttendanceId,
                                 AttendanceDate = a.AttendanceDate,
                                 StudentId = a.StudentId,
                                 StudentName = s.StudentName ?? "",
                                 RollNumber = s.RollNo ?? "",
                                 FacultyId = a.FacultyId ?? 0,
                                 FacultyName = st != null ? (st.FirstName + " " + (st.LastName ?? "")).Trim() : "",
                                 BoardId = a.BoardId ?? 0,
                                 BoardName = b != null ? (b.BoardName ?? "") : "",
                                 AcademicYearId = a.AcademicYearId ?? 0,
                                 AcademicYearName = ay != null ? (ay.AcademicYearName ?? "") : "",
                                 AcademicLevelId = a.AcademicLevelId ?? 0,
                                 AcademicLevelName = al != null ? (al.LevelName ?? "") : "",
                                 GroupId = a.GroupId ?? 0,
                                 GroupName = g != null ? (g.GroupName ?? "") : "",
                                 SectionId = a.SectionId ?? 0,
                                 SectionName = sec != null ? (sec.SectionName ?? "") : "",
                                 SubjectId = a.SubjectId ?? 0,
                                 SubjectName = sub != null ? (sub.SubjectName ?? "") : "",
                                 Status = a.Status,
                                 Remarks = a.Remarks,
                                 CreatedAt = a.CreatedAt,
                                 UpdatedAt = a.UpdatedAt
                             }).FirstOrDefaultAsync();

            return raw;
        }

        #endregion

        #region CRUD

        /// <summary>
        /// Creates a new attendance record in the database using stored procedure sp_CreateAttendance.
        /// </summary>
        public async Task<int> CreateAttendanceAsync(Attendance attendance)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_AttendanceSessionId", attendance.AttendanceSessionId);
            parameters.Add("p_StudentId", attendance.StudentId);
            parameters.Add("p_Status", (byte)attendance.Status);
            parameters.Add("p_Remarks", attendance.Remarks);

            return await Connection.ExecuteScalarAsync<int>(
                SpCreateAttendance,
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        /// <summary>
        /// Creates multiple student attendance records in bulk using stored procedure sp_CreateBulkAttendance.
        /// </summary>
        public async Task<int> CreateBulkAttendanceAsync(IEnumerable<Attendance> attendances, int attendanceSessionId)
        {
            var bulkList = attendances.Select(a => new
            {
                StudentId = a.StudentId,
                Status = (byte)a.Status,
                Remarks = a.Remarks
            }).ToList();

            var json = JsonSerializer.Serialize(bulkList);

            var parameters = new DynamicParameters();
            parameters.Add("p_AttendanceSessionId", attendanceSessionId);
            parameters.Add("p_AttendanceJson", json);

            return await Connection.ExecuteScalarAsync<int>(
                SpCreateBulkAttendance,
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        /// <summary>
        /// Updates an existing attendance record in the database using stored procedure sp_UpdateAttendance.
        /// </summary>
        public async Task<int> UpdateAttendanceAsync(Attendance attendance)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_AttendanceId", attendance.AttendanceId);
            parameters.Add("p_Status", (byte)attendance.Status);
            parameters.Add("p_Remarks", attendance.Remarks);

            return await Connection.ExecuteAsync(
                SpUpdateAttendance,
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        /// <summary>
        /// Changes the active/inactive status of an attendance record using stored procedure sp_ChangeAttendanceStatus.
        /// </summary>
        public async Task<int> ChangeAttendanceActiveStatusAsync(int attendanceId, bool isActive)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_AttendanceId", attendanceId);
            parameters.Add("p_IsActive", isActive);

            return await Connection.ExecuteAsync(
                SpChangeAttendanceStatus,
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        #endregion

        #region Queries

        /// <summary>
        /// Retrieves a single detailed attendance response by its unique identifier using stored procedure sp_GetAttendanceById.
        /// </summary>
        public async Task<AttendanceResponse?> GetAttendanceByIdAsync(int attendanceId)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_AttendanceId", attendanceId);

                return await Connection.QueryFirstOrDefaultAsync<AttendanceResponse>(
                    SpGetAttendanceById,
                    parameters,
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await GetAttendanceByIdFallbackAsync(attendanceId);
            }
        }

        /// <summary>
        /// Retrieves a filtered list of attendance records using stored procedure sp_GetAttendances.
        /// </summary>
        public async Task<IEnumerable<AttendanceListResponse>> GetAttendancesAsync(AttendanceSearchRequest request)
        {
            try
            {
                var parameters = BuildSearchParameters(request);

                return await Connection.QueryAsync<AttendanceListResponse>(
                    SpGetAttendances,
                    parameters,
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await GetAttendancesFromDbFallbackAsync(request);
            }
        }

        /// <summary>
        /// Retrieves the total count of attendance records matching the search filters (without pagination).
        /// Mirrors the WHERE clause from sp_GetAttendances for accurate pagination metadata.
        /// </summary>
        public async Task<int> GetAttendancesTotalCountAsync(AttendanceSearchRequest request)
        {
            try
            {
                var parameters = BuildSearchParameters(request);

                return await Connection.ExecuteScalarAsync<int>(
                    SpGetAttendancesTotalCount,
                    parameters,
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await GetAttendancesTotalCountFallbackAsync(request);
            }
        }

        /// <summary>
        /// Retrieves students available to mark attendance for the specified criteria using stored procedure sp_GetStudentsForAttendance.
        /// </summary>
        public async Task<IEnumerable<StudentAttendanceResponse>> GetStudentsForAttendanceAsync(AttendanceSearchRequest request)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_BoardId", request.BoardId.HasValue && request.BoardId.Value > 0 ? request.BoardId.Value : null, DbType.Int32);
                parameters.Add("p_AcademicYearId", request.AcademicYearId.HasValue && request.AcademicYearId.Value > 0 ? request.AcademicYearId.Value : null, DbType.Int32);
                parameters.Add("p_AcademicLevelId", request.AcademicLevelId.HasValue && request.AcademicLevelId.Value > 0 ? request.AcademicLevelId.Value : null, DbType.Int32);
                parameters.Add("p_GroupId", request.GroupId.HasValue && request.GroupId.Value > 0 ? request.GroupId.Value : null, DbType.Int32);
                parameters.Add("p_SectionId", request.SectionId.HasValue && request.SectionId.Value > 0 ? request.SectionId.Value : null, DbType.Int32);
                parameters.Add("p_SubjectId", request.SubjectId.HasValue && request.SubjectId.Value > 0 ? request.SubjectId.Value : null, DbType.Int32);
                parameters.Add("p_FromDate", request.FromDate ?? (string.IsNullOrEmpty(request.AttendanceDate) ? (string.IsNullOrEmpty(request.Date) ? null : DateTime.Parse(request.Date)) : DateTime.Parse(request.AttendanceDate)), DbType.Date);
                parameters.Add("p_StudentId", request.StudentId.HasValue && request.StudentId.Value > 0 ? request.StudentId.Value : null, DbType.Int32);
                parameters.Add("p_SearchText", string.IsNullOrWhiteSpace(request.SearchText) ? null : request.SearchText.Trim(), DbType.String);
                parameters.Add("p_CampusId", request.CampusId.HasValue && request.CampusId.Value > 0 ? request.CampusId.Value : null, DbType.Int32);

                return await Connection.QueryAsync<StudentAttendanceResponse>(
                    SpGetStudentsForAttendance,
                    parameters,
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await GetAdminStudentsForAttendanceAsync(request);
            }
        }

        public async Task<IEnumerable<StudentAttendanceResponse>> GetAdminStudentsForAttendanceAsync(AttendanceSearchRequest request)
        {
            DateTime date = DateTime.UtcNow.Date;
            if (request.FromDate.HasValue) date = request.FromDate.Value.Date;
            else if (!string.IsNullOrEmpty(request.AttendanceDate)) date = DateTime.Parse(request.AttendanceDate).Date;
            else if (!string.IsNullOrEmpty(request.Date)) date = DateTime.Parse(request.Date).Date;

            var session = request.Session;

            // Base query for students matching the criteria
            var studentsQuery = _context.Students.Where(s => s.IsActive);

            if (request.CampusId.HasValue && request.CampusId.Value > 0) studentsQuery = studentsQuery.Where(s => s.CampusId == request.CampusId);
            if (request.BoardId.HasValue && request.BoardId.Value > 0) studentsQuery = studentsQuery.Where(s => s.BoardId == request.BoardId);
            if (request.AcademicYearId.HasValue && request.AcademicYearId.Value > 0) studentsQuery = studentsQuery.Where(s => s.AcademicYearId == request.AcademicYearId);
            if (request.AcademicLevelId.HasValue && request.AcademicLevelId.Value > 0) studentsQuery = studentsQuery.Where(s => s.AcademicLevelId == request.AcademicLevelId);
            if (request.GroupId.HasValue && request.GroupId.Value > 0) studentsQuery = studentsQuery.Where(s => s.GroupId == request.GroupId);
            if (request.ProgramId.HasValue && request.ProgramId.Value > 0) studentsQuery = studentsQuery.Where(s => s.ProgramId == request.ProgramId);
            if (request.SectionId.HasValue && request.SectionId.Value > 0) studentsQuery = studentsQuery.Where(s => s.SectionId == request.SectionId);
            if (request.StudentId.HasValue && request.StudentId.Value > 0) studentsQuery = studentsQuery.Where(s => s.StudentId == request.StudentId);
            
            if (!string.IsNullOrEmpty(request.SearchText))
            {
                studentsQuery = studentsQuery.Where(s => 
                    s.StudentName.Contains(request.SearchText) || 
                    s.RollNo.Contains(request.SearchText) || 
                    s.AdmissionNo.Contains(request.SearchText));
            }

            var students = await studentsQuery
                .OrderBy(s => s.RollNo)
                .ThenBy(s => s.StudentName)
                .Select(s => new 
                {
                    s.StudentId,
                    s.AdmissionNo,
                    s.RollNo,
                    s.StudentName,
                    GroupName = s.GroupNavigation.GroupName,
                    SectionName = s.SectionNavigation.SectionName
                })
                .ToListAsync();

            var studentIds = students.Select(s => s.StudentId).ToList();
            
            var attendancesQuery = _context.Attendances
                .Where(a => a.IsActive && 
                            a.AttendanceDate.Date == date && 
                            studentIds.Contains(a.StudentId));

            if (session.HasValue)
            {
                attendancesQuery = attendancesQuery.Where(a => a.Session == session.Value);
            }

            var existingAttendances = await attendancesQuery
                .Select(a => new 
                {
                    a.AttendanceId,
                    a.StudentId,
                    a.Status,
                    a.Remarks,
                    a.Session,
                    a.ModifiedByUserId,
                    a.ModifiedAt
                })
                .ToListAsync();

            var userIds = existingAttendances.Where(a => a.ModifiedByUserId.HasValue).Select(a => a.ModifiedByUserId!.Value).Distinct().ToList();
            var users = await _context.Users.Where(u => userIds.Contains(u.UserId)).ToDictionaryAsync(u => u.UserId, u => u.FullName);

            var result = new List<StudentAttendanceResponse>();
            
            foreach (var student in students)
            {
                var morningAtt = existingAttendances.FirstOrDefault(a => a.StudentId == student.StudentId && a.Session == CollegeManagement.API.Enums.StudentAttendanceSession.Morning);
                var afternoonAtt = existingAttendances.FirstOrDefault(a => a.StudentId == student.StudentId && a.Session == CollegeManagement.API.Enums.StudentAttendanceSession.Afternoon);
                var latestAtt = existingAttendances.Where(a => a.StudentId == student.StudentId).OrderByDescending(a => a.ModifiedAt).FirstOrDefault();
                
                result.Add(new StudentAttendanceResponse
                {
                    StudentId = student.StudentId,
                    AdmissionNumber = student.AdmissionNo ?? "",
                    RollNumber = student.RollNo ?? "",
                    StudentName = student.StudentName,
                    GroupName = student.GroupName ?? "",
                    SectionName = student.SectionName ?? "",
                    MorningStatus = morningAtt?.Status,
                    AfternoonStatus = afternoonAtt?.Status,
                    Status = latestAtt?.Status,
                    Remarks = latestAtt?.Remarks,
                    IsAttendanceMarked = morningAtt != null || afternoonAtt != null || latestAtt != null,
                    Session = latestAtt?.Session,
                    AttendanceId = latestAtt?.AttendanceId,
                    ModifiedByUserName = latestAtt?.ModifiedByUserId.HasValue == true && users.ContainsKey(latestAtt.ModifiedByUserId.Value) ? users[latestAtt.ModifiedByUserId.Value] : null,
                    ModifiedAt = latestAtt?.ModifiedAt
                });
            }

            return result;
        }

        public async Task<IEnumerable<AttendanceDefaulterResponse>> GetAttendanceDefaultersAsync(AttendanceDefaultersRequest request)
        {
            var studentsQuery = _context.Students.Where(s => s.IsActive);

            if (request.BoardId.HasValue) studentsQuery = studentsQuery.Where(s => s.BoardId == request.BoardId);
            if (request.AcademicYearId.HasValue) studentsQuery = studentsQuery.Where(s => s.AcademicYearId == request.AcademicYearId);
            if (request.AcademicLevelId.HasValue) studentsQuery = studentsQuery.Where(s => s.AcademicLevelId == request.AcademicLevelId);
            if (request.GroupId.HasValue) studentsQuery = studentsQuery.Where(s => s.GroupId == request.GroupId);
            if (request.ProgramId.HasValue) studentsQuery = studentsQuery.Where(s => s.ProgramId == request.ProgramId);
            if (request.SectionId.HasValue) studentsQuery = studentsQuery.Where(s => s.SectionId == request.SectionId);

            var students = await studentsQuery
                .Select(s => new 
                {
                    s.StudentId,
                    s.StudentName,
                    s.RollNo,
                    s.AdmissionNo,
                    GroupName = s.GroupNavigation.GroupName,
                    SectionName = s.SectionNavigation.SectionName
                })
                .ToListAsync();

            var studentIds = students.Select(s => s.StudentId).ToList();

            var attendancesQuery = _context.Attendances
                .Where(a => a.IsActive && studentIds.Contains(a.StudentId));

            if (request.Month.HasValue)
                attendancesQuery = attendancesQuery.Where(a => a.AttendanceDate.Month == request.Month.Value);
            
            if (request.Year.HasValue)
                attendancesQuery = attendancesQuery.Where(a => a.AttendanceDate.Year == request.Year.Value);

            var existingAttendances = await attendancesQuery
                .Select(a => new { a.StudentId, a.Status })
                .ToListAsync();

            var result = new List<AttendanceDefaulterResponse>();

            foreach (var student in students)
            {
                var studentAttendances = existingAttendances.Where(a => a.StudentId == student.StudentId).ToList();
                int totalMarked = studentAttendances.Count;
                if (totalMarked == 0) continue;

                int presentOrLateCount = studentAttendances.Count(a => a.Status == Enums.AttendanceStatus.Present || a.Status == Enums.AttendanceStatus.Late);
                
                double percentage = Math.Round((double)presentOrLateCount / totalMarked * 100, 1);
                
                if (percentage < request.Threshold)
                {
                    result.Add(new AttendanceDefaulterResponse
                    {
                        StudentId = student.StudentId,
                        StudentName = student.StudentName,
                        RollNumber = student.RollNo ?? "",
                        AdmissionNumber = student.AdmissionNo ?? "",
                        GroupName = student.GroupName ?? "",
                        SectionName = student.SectionName ?? "",
                        AttendancePercentage = percentage,
                        ShortagePercentage = Math.Round(request.Threshold - percentage, 1)
                    });
                }
            }

            return result.OrderBy(r => r.AttendancePercentage).ToList();
        }

        /// <summary>
        /// Retrieves statistical summary metrics for the specified filters using stored procedure sp_GetAttendanceSummary.
        /// </summary>
        public async Task<AttendanceSummaryResponse> GetAttendanceSummaryAsync(AttendanceSearchRequest request)
        {
            try
            {
                var parameters = BuildSearchParameters(request);

                var result = await Connection.QueryFirstOrDefaultAsync<AttendanceSummaryResponse>(
                    SpGetAttendanceSummary,
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return result ?? new AttendanceSummaryResponse();
            }
            catch
            {
                return await GetAttendanceSummaryFallbackAsync(request);
            }
        }

        /// <summary>
        /// Retrieves attendance percentages and class counts per student using stored procedure sp_GetAttendancePercentage.
        /// </summary>
        public async Task<IEnumerable<AttendancePercentageResponse>> GetAttendancePercentageAsync(AttendanceSearchRequest request)
        {
            try
            {
                var parameters = BuildSearchParameters(request);

                return await Connection.QueryAsync<AttendancePercentageResponse>(
                    SpGetAttendancePercentage,
                    parameters,
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await GetAttendancePercentageFallbackAsync(request);
            }
        }

        /// <summary>
        /// Generates a flat report listing attendance details for the specified filters using stored procedure sp_GetAttendanceReport.
        /// </summary>
        public async Task<IEnumerable<AttendanceReportResponse>> GetAttendanceReportAsync(AttendanceSearchRequest request)
        {
            try
            {
                var parameters = BuildSearchParameters(request);

                return await Connection.QueryAsync<AttendanceReportResponse>(
                    SpGetAttendanceReport,
                    parameters,
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await GetAttendanceReportFallbackAsync(request);
            }
        }

        /// <summary>
        /// Checks if an active attendance record already exists for a student in a specific session using stored procedure sp_AttendanceExists.
        /// </summary>
        public async Task<bool> AttendanceExistsAsync(int studentId, int attendanceSessionId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_StudentId", studentId);
            parameters.Add("p_AttendanceSessionId", attendanceSessionId);

            var exists = await Connection.ExecuteScalarAsync<int>(
                SpAttendanceExists,
                parameters,
                commandType: CommandType.StoredProcedure);

            return exists > 0;
        }

        public async Task<AcademicContextResponse?> GetAcademicContextAsync(int groupId, int sectionId)
        {
            var group = await _context.Groups
                .Include(g => g.BoardNavigation)
                .Include(g => g.AcademicYear)
                .FirstOrDefaultAsync(g => g.GroupId == groupId)
                ?? await _context.Groups.Include(g => g.BoardNavigation).Include(g => g.AcademicYear).FirstOrDefaultAsync();

            var section = await _context.Sections
                .FirstOrDefaultAsync(s => s.SectionId == sectionId)
                ?? await _context.Sections.FirstOrDefaultAsync();

            if (group == null || section == null) return null;

            return new AcademicContextResponse
            {
                BoardId = group.BoardId,
                BoardName = group.BoardNavigation?.BoardName ?? "Board",
                AcademicYearId = group.AcademicYearId,
                AcademicYearName = group.AcademicYear?.AcademicYearName ?? "Academic Year",
                GroupId = group.GroupId,
                GroupName = group.GroupName,
                SectionId = section.SectionId,
                SectionName = section.SectionName
            };
        }

        public async Task<FacultySubjectDerivationResponse?> GetFacultySubjectAllocationAsync(DateTime date, int? groupId = null, int? sectionId = null, int? periodId = null, string? sessionType = null)
        {
            int secId = sectionId ?? 0;
            int grpId = groupId ?? 0;

            // 1. If periodId is not specified or sessionType indicates Full Day / Morning / Afternoon session, fetch the Section Class Teacher!
            bool isSessionLevel = !periodId.HasValue || periodId.Value <= 0 ||
                                  (!string.IsNullOrEmpty(sessionType) && (sessionType.ToLower().Contains("session") || sessionType.ToLower() == "allperiods"));

            if (isSessionLevel)
            {
                if (secId > 0)
                {
                    var sec = await _context.Sections.FirstOrDefaultAsync(s => s.SectionId == secId);
                    if (sec != null && (sec.InchargeId.HasValue || sec.ClassTeacherId.HasValue))
                    {
                        int teacherId = sec.InchargeId ?? sec.ClassTeacherId!.Value;
                        var ctStaff = await _context.Staffs.FirstOrDefaultAsync(st => st.Id == teacherId);
                        if (ctStaff != null)
                        {
                            return new FacultySubjectDerivationResponse
                            {
                                SubjectId = 0,
                                SubjectName = "All Subjects",
                                FacultyId = ctStaff.Id,
                                FacultyName = $"{ctStaff.FirstName} {ctStaff.LastName}".Trim(),
                                PeriodId = periodId ?? 0,
                                PeriodName = sessionType ?? "Class Teacher Session"
                            };
                        }
                    }
                }

                return new FacultySubjectDerivationResponse
                {
                    SubjectId = 0,
                    SubjectName = "All Subjects",
                    FacultyId = 0,
                    FacultyName = "Not assigned",
                    PeriodId = periodId ?? 0,
                    PeriodName = sessionType ?? "AllPeriods"
                };
            }

            // 2. If a specific subject period is selected (e.g. Period 1), look up the Timetable slot!
            int dayOfWeekInt = date.DayOfWeek == DayOfWeek.Sunday ? 7 : (int)date.DayOfWeek;
            int reqPeriodId = periodId ?? 0;

            if (reqPeriodId > 0 && secId > 0)
            {
                var ttSlot = await _context.Timetables
                    .Include(t => t.Subject)
                    .Include(t => t.Staff)
                    .Include(t => t.Period)
                    .FirstOrDefaultAsync(t => (grpId == 0 || t.GroupId == grpId)
                                              && t.SectionId == secId
                                              && t.PeriodId == reqPeriodId
                                              && t.DayOfWeek == dayOfWeekInt);

                if (ttSlot != null && ttSlot.Subject != null && ttSlot.Staff != null)
                {
                    return new FacultySubjectDerivationResponse
                    {
                        SubjectId = ttSlot.SubjectId,
                        SubjectName = ttSlot.Subject.SubjectName,
                        FacultyId = ttSlot.StaffId,
                        FacultyName = $"{ttSlot.Staff.FirstName} {ttSlot.Staff.LastName}".Trim(),
                        PeriodId = reqPeriodId,
                        PeriodName = ttSlot.Period?.PeriodName ?? $"Period {reqPeriodId}"
                    };
                }
            }

            // 3. Fallback: Return Class Teacher if available or "Not assigned"
            if (secId > 0)
            {
                var sectionObj = await _context.Sections.FirstOrDefaultAsync(s => s.SectionId == secId);
                if (sectionObj != null && (sectionObj.InchargeId.HasValue || sectionObj.ClassTeacherId.HasValue))
                {
                    int teacherId = sectionObj.InchargeId ?? sectionObj.ClassTeacherId!.Value;
                    var ctStaff = await _context.Staffs.FirstOrDefaultAsync(st => st.Id == teacherId);
                    if (ctStaff != null)
                    {
                        var subFirst = await _context.Subjects.FirstOrDefaultAsync(s => s.IsActive);
                        return new FacultySubjectDerivationResponse
                        {
                            SubjectId = subFirst?.SubjectId ?? 0,
                            SubjectName = subFirst?.SubjectName ?? "General",
                            FacultyId = ctStaff.Id,
                            FacultyName = $"{ctStaff.FirstName} {ctStaff.LastName}".Trim(),
                            PeriodId = reqPeriodId,
                            PeriodName = $"Period {reqPeriodId}"
                        };
                    }
                }
            }

            return new FacultySubjectDerivationResponse
            {
                SubjectId = 0,
                SubjectName = "All Subjects",
                FacultyId = 0,
                FacultyName = "Not assigned",
                PeriodId = reqPeriodId,
                PeriodName = $"Period {reqPeriodId}"
            };
        }

        public async Task<StudentMonthlyReportResponse> GetStudentMonthlyReportGridAsync(StudentMonthlyReportRequest request)
        {
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

            int daysInMonth = DateTime.DaysInMonth(targetYear, targetMonth);
            var monthStartDate = new DateTime(targetYear, targetMonth, 1);
            var monthEndDate = new DateTime(targetYear, targetMonth, daysInMonth);

            var monthHolidays = await _context.Holidays
                .Where(h => !h.IsDeleted && h.Status == "Active" 
                         && h.StartDate <= monthEndDate && h.EndDate >= monthStartDate
                         && (h.AppliesTo == "All Students & Staff" || h.AppliesTo == "Students Only")
                         && (!request.BoardId.HasValue || h.BoardId == null || h.BoardId == request.BoardId.Value)
                         && (!request.AcademicYearId.HasValue || h.AcademicYearId == null || h.AcademicYearId == request.AcademicYearId.Value))
                .ToListAsync();

            var dayHeaders = new List<DayHeaderDto>();
            for (int day = 1; day <= daysInMonth; day++)
            {
                var dt = new DateTime(targetYear, targetMonth, day);
                bool isSunday = dt.DayOfWeek == DayOfWeek.Sunday;
                var matchingHoliday = monthHolidays.FirstOrDefault(h => dt.Date >= h.StartDate.Date && dt.Date <= h.EndDate.Date);
                bool isOfficialHoliday = matchingHoliday != null;
                bool isHoliday = isSunday || isOfficialHoliday;
                string dayNameUpper = dt.ToString("ddd", System.Globalization.CultureInfo.InvariantCulture).ToUpper();

                dayHeaders.Add(new DayHeaderDto
                {
                    DayNumber = day,
                    DateString = dt.ToString("yyyy-MM-dd"),
                    DayName = dayNameUpper,
                    CombinedHeader = $"{day} {dayNameUpper}",
                    IsHoliday = isHoliday
                });
            }

            // Fetch active students with Group and Section navigation
            var studentQuery = _context.Students
                .Include(s => s.GroupNavigation)
                .Include(s => s.SectionNavigation)
                .Where(s => s.IsActive);

            if (request.BoardId.HasValue && request.BoardId.Value > 0)
            {
                studentQuery = studentQuery.Where(s => s.BoardId == request.BoardId.Value);
            }

            if (request.AcademicYearId.HasValue && request.AcademicYearId.Value > 0)
            {
                studentQuery = studentQuery.Where(s => s.AcademicYearId == request.AcademicYearId.Value);
            }

            if (request.AcademicLevelId.HasValue && request.AcademicLevelId.Value > 0)
            {
                studentQuery = studentQuery.Where(s => s.AcademicLevelId == request.AcademicLevelId.Value);
            }

            if (request.ProgramId.HasValue && request.ProgramId.Value > 0)
            {
                studentQuery = studentQuery.Where(s => s.ProgramId == request.ProgramId.Value);
            }

            if (request.GroupId.HasValue && request.GroupId.Value > 0)
            {
                studentQuery = studentQuery.Where(s => s.GroupId == request.GroupId.Value);
            }

            if (request.SectionId.HasValue && request.SectionId.Value > 0)
            {
                studentQuery = studentQuery.Where(s => s.SectionId == request.SectionId.Value);
            }

            if (request.StudentId.HasValue && request.StudentId.Value > 0)
            {
                studentQuery = studentQuery.Where(s => s.StudentId == request.StudentId.Value);
            }

            var studentList = await studentQuery.OrderBy(s => s.RollNo).ThenBy(s => s.StudentName).ToListAsync();

            var startDate = new DateTime(targetYear, targetMonth, 1);
            var endDate = new DateTime(targetYear, targetMonth, daysInMonth);

            var studentIds = studentList.Select(s => s.StudentId).ToList();

            // Fetch attendance records for this month for the selected students
            var monthAttendancesQuery = _context.Attendances
                .Where(a => a.AttendanceDate.Date >= startDate
                            && a.AttendanceDate.Date <= endDate
                            && a.IsActive
                            && studentIds.Contains(a.StudentId));

            if (request.GroupId.HasValue && request.GroupId.Value > 0)
            {
                monthAttendancesQuery = monthAttendancesQuery.Where(a => a.GroupId == request.GroupId.Value);
            }

            if (request.SectionId.HasValue && request.SectionId.Value > 0)
            {
                monthAttendancesQuery = monthAttendancesQuery.Where(a => a.SectionId == request.SectionId.Value);
            }

            var monthAttendances = await monthAttendancesQuery.ToListAsync();

            var studentRows = new List<StudentMonthlyGridRowDto>();
            int totalPresentAll = 0, totalAbsentAll = 0;
            int workingDaysCount = dayHeaders.Count(d => !d.IsHoliday);

            foreach (var student in studentList)
            {
                var dailyStatus = new List<string>();
                int presentCount = 0, absentCount = 0, leaveCount = 0;

                for (int day = 1; day <= daysInMonth; day++)
                {
                    var dt = new DateTime(targetYear, targetMonth, day);
                    bool isSunday = dt.DayOfWeek == DayOfWeek.Sunday;
                    var matchingHoliday = monthHolidays.FirstOrDefault(h => dt.Date >= h.StartDate.Date && dt.Date <= h.EndDate.Date);
                    bool isOfficialHoliday = matchingHoliday != null;

                    if (isOfficialHoliday)
                    {
                        dailyStatus.Add("H");
                        continue;
                    }
                    if (isSunday)
                    {
                        dailyStatus.Add("-");
                        continue;
                    }

                    var dayRecords = monthAttendances
                        .Where(a => a.StudentId == student.StudentId && a.AttendanceDate.Day == day)
                        .ToList();

                    if (!dayRecords.Any())
                    {
                        dailyStatus.Add("-");
                    }
                    else
                    {
                        var morning = dayRecords.FirstOrDefault(r => (int?)r.Session == 1);
                        var afternoon = dayRecords.FirstOrDefault(r => (int?)r.Session == 2);

                        if (morning != null && afternoon != null)
                        {
                            bool morningPresent = morning.Status == Enums.AttendanceStatus.Present;
                            bool afternoonPresent = afternoon.Status == Enums.AttendanceStatus.Present;
                            bool morningAbsent = morning.Status == Enums.AttendanceStatus.Absent;
                            bool afternoonAbsent = afternoon.Status == Enums.AttendanceStatus.Absent;

                            if (morningPresent && afternoonPresent)
                            {
                                dailyStatus.Add("P");
                                presentCount++;
                            }
                            else if (morningAbsent && afternoonAbsent)
                            {
                                dailyStatus.Add("A");
                                absentCount++;
                            }
                            else
                            {
                                // One present & one absent/other, or student half-day -> HalfDay (HD)
                                dailyStatus.Add("HD");
                                leaveCount++;
                            }
                        }
                        else
                        {
                            // Only 1 session record found for the day
                            var single = dayRecords.First();
                            if (single.Status == Enums.AttendanceStatus.Present)
                            {
                                dailyStatus.Add("P");
                                presentCount++;
                            }
                            else if (single.Status == Enums.AttendanceStatus.Absent)
                            {
                                dailyStatus.Add("A");
                                absentCount++;
                            }
                            else
                            {
                                dailyStatus.Add("HD");
                                leaveCount++;
                            }
                        }
                    }
                }

                int markedCount = presentCount + absentCount + leaveCount;
                double percentage = markedCount > 0 ? Math.Round((double)(presentCount + 0.5 * leaveCount) / markedCount * 100, 1) : 0;

                studentRows.Add(new StudentMonthlyGridRowDto
                {
                    StudentId = student.StudentId,
                    RollNumber = string.IsNullOrEmpty(student.RollNo) ? $"STU{student.StudentId:D3}" : student.RollNo,
                    StudentName = student.StudentName,
                    GroupName = student.GroupNavigation?.GroupName ?? "Group",
                    SectionName = student.SectionNavigation?.SectionName ?? "Section",
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

            string groupName = "All Groups";
            string sectionName = "All Sections";

            if (request.GroupId.HasValue && request.GroupId.Value > 0)
            {
                var grp = await _context.Groups.FirstOrDefaultAsync(g => g.GroupId == request.GroupId.Value);
                if (grp != null) groupName = grp.GroupName;
            }

            if (request.SectionId.HasValue && request.SectionId.Value > 0)
            {
                var sec = await _context.Sections.FirstOrDefaultAsync(s => s.SectionId == request.SectionId.Value);
                if (sec != null) sectionName = sec.SectionName;
            }

            return new StudentMonthlyReportResponse
            {
                Month = targetMonth,
                Year = targetYear,
                GroupName = groupName,
                SectionName = sectionName,
                TotalWorkingDays = workingDaysCount,
                TotalPresent = totalPresentAll,
                TotalAbsent = totalAbsentAll,
                OverallAttendancePercentage = overallPercentage,
                DayHeaders = dayHeaders,
                StudentRows = studentRows
            };
        }

        #endregion
    }
}
