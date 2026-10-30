using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Examination;
using CollegeManagement.API.DTOs.Examination.Requests;
using CollegeManagement.API.DTOs.Examination.Responses;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class ExaminationRepository : IExaminationRepository
    {
        private readonly AppDbContext _context;
        private readonly IExaminationExportService? _exportService;
        private readonly ILogger<ExaminationRepository>? _logger;

        static ExaminationRepository()
        {
            try
            {
                SqlMapper.AddTypeHandler(new Helpers.DateOnlyTypeHandler());
                SqlMapper.AddTypeHandler(new Helpers.NullableDateOnlyTypeHandler());
                SqlMapper.AddTypeHandler(new Helpers.TimeOnlyTypeHandler());
                SqlMapper.AddTypeHandler(new Helpers.NullableTimeOnlyTypeHandler());
            }
            catch
            {
                // Handlers already registered
            }
        }

        public ExaminationRepository(
            AppDbContext context,
            IExaminationExportService? exportService = null,
            ILogger<ExaminationRepository>? logger = null)
        {
            _context = context;
            _exportService = exportService;
            _logger = logger;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        #region Examination Methods

        public async Task<Examination> CreateExaminationAsync(Examination examination)
        {
            var p = new DynamicParameters();
            p.Add("p_ExamCode", examination.ExamCode);
            p.Add("p_ExamName", examination.ExamName);
            p.Add("p_BoardId", examination.BoardId);
            p.Add("p_AcademicYearId", examination.AcademicYearId);
            p.Add("p_AcademicLevelId", examination.AcademicLevelId);
            p.Add("p_GroupId", examination.GroupId);
            p.Add("p_ProgramId", examination.ProgramId);
            p.Add("p_AssessmentTypeId", examination.AssessmentTypeId);
            p.Add("p_StartDate", examination.StartDate.ToDateTime(TimeOnly.MinValue));
            p.Add("p_EndDate", examination.EndDate.ToDateTime(TimeOnly.MinValue));
            p.Add("p_Description", examination.Description);
            p.Add("p_ExamPattern", examination.ExamPattern ?? "REGULAR_ACADEMIC");
            p.Add("p_TotalMarks", examination.TotalMarks);
            p.Add("p_PassPercentage", examination.PassPercentage);
            p.Add("p_Status", examination.Status ?? "DRAFT");
            p.Add("p_CampusId", examination.CampusId > 0 ? examination.CampusId : 1);

            var newId = await Connection.ExecuteScalarAsync<int>(
                "sp_CreateExamination",
                p,
                commandType: CommandType.StoredProcedure);

            examination.ExaminationId = newId;
            return examination;
        }

        public async Task<Examination?> GetExaminationByIdAsync(int examinationId)
        {
            var p = new DynamicParameters();
            p.Add("p_ExaminationId", examinationId);
            p.Add("p_CampusId", 0);

            var row = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_GetExaminationById",
                p,
                commandType: CommandType.StoredProcedure);

            if (row == null) return null;

            var exam = new Examination
            {
                ExaminationId = (int)row.ExamId,
                CampusId = (int?)row.CampusId ?? 1,
                ExamCode = (string?)row.ExamCode,
                ExamName = (string)row.ExamName,
                BoardId = (int)row.BoardId,
                AcademicYearId = (int)row.AcademicYearId,
                AcademicLevelId = (int)row.AcademicLevelId,
                GroupId = (int)row.GroupId,
                ProgramId = (int?)row.ProgramId,
                AssessmentTypeId = (int)row.AssessmentTypeId,
                StartDate = row.StartDate is DateTime dtStart ? DateOnly.FromDateTime(dtStart) : (row.StartDate is DateOnly dStart ? dStart : DateOnly.FromDateTime(Convert.ToDateTime(row.StartDate))),
                EndDate = row.EndDate is DateTime dtEnd ? DateOnly.FromDateTime(dtEnd) : (row.EndDate is DateOnly dEnd ? dEnd : DateOnly.FromDateTime(Convert.ToDateTime(row.EndDate))),
                Description = (string?)row.Description,
                ExamPattern = (string?)row.ExamPattern,
                TotalMarks = (int?)row.TotalMarks,
                PassPercentage = row.PassPercentage != null ? Convert.ToDecimal(row.PassPercentage) : null,
                Status = (string)(row.Status ?? "DRAFT"),
                IsActive = Convert.ToBoolean(row.IsActive),
                CreatedAt = (DateTime)row.CreatedAt,
                UpdatedAt = (DateTime?)row.UpdatedAt,
                Board = new Board { BoardId = (int)row.BoardId, BoardName = (string)(row.BoardName ?? string.Empty) },
                AcademicYear = new AcademicYear { AcademicYearId = (int)row.AcademicYearId, AcademicYearName = (string)(row.AcademicYearName ?? row.AcademicYear ?? string.Empty) },
                AcademicLevel = new AcademicLevel { AcademicLevelId = (int)row.AcademicLevelId, LevelName = (string)(row.AcademicLevelName ?? row.AcademicLevel ?? string.Empty) },
                Group = new Group { GroupId = (int)row.GroupId, GroupName = (string)(row.GroupName ?? string.Empty) },
                Program = row.ProgramId != null ? new AcademicProgram { ProgramId = (int)row.ProgramId, ProgramName = (string)(row.ProgramName ?? string.Empty) } : null,
                AssessmentType = new AssessmentType { AssessmentTypeId = (int)row.AssessmentTypeId, AssessmentTypeName = (string)(row.ExamType ?? string.Empty) }
            };

            var pSchedules = new DynamicParameters();
            pSchedules.Add("p_ExaminationId", examinationId);
            pSchedules.Add("p_CampusId", (int?)row.CampusId ?? 0);

            try
            {
                var schedules = await Connection.QueryAsync<ExamSchedule, Subject, ExamSchedule>(
                    "sp_GetExamSchedulesByExamination",
                    (schedule, subject) =>
                    {
                        schedule.Subject = subject;
                        return schedule;
                    },
                    pSchedules,
                    splitOn: "SubjectName",
                    commandType: CommandType.StoredProcedure);

                exam.ExamSchedules = schedules
                    .Where(s => s.IsActive)
                    .GroupBy(s => s.SubjectId > 0 ? s.SubjectId : s.ExamScheduleId)
                    .Select(g => g.OrderByDescending(s => s.ExamScheduleId).First())
                    .ToList();
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "sp_GetExamSchedulesByExamination failed for Exam {Id}", examinationId);
                exam.ExamSchedules = new List<ExamSchedule>();
            }

            return exam;
        }

        public async Task<IEnumerable<Examination>> GetExaminationsAsync(ExaminationSearchRequestDto filter)
        {
            var p = new DynamicParameters();
            p.Add("p_BoardId", filter.BoardId > 0 ? filter.BoardId : null);
            p.Add("p_AcademicYearId", filter.AcademicYearId > 0 ? filter.AcademicYearId : null);
            p.Add("p_AcademicLevelId", filter.AcademicLevelId > 0 ? filter.AcademicLevelId : null);
            p.Add("p_GroupId", filter.GroupId > 0 ? filter.GroupId : null);
            p.Add("p_ProgramId", filter.ProgramId > 0 ? filter.ProgramId : null);
            p.Add("p_AssessmentTypeId", filter.AssessmentTypeId > 0 ? filter.AssessmentTypeId : null);
            p.Add("p_Status", string.IsNullOrWhiteSpace(filter.Status) ? null : filter.Status.Trim());
            p.Add("p_SearchTerm", string.IsNullOrWhiteSpace(filter.SearchTerm) ? null : filter.SearchTerm.Trim());
            p.Add("p_CampusId", filter.CampusId > 0 ? filter.CampusId : null);

            var rows = await Connection.QueryAsync<dynamic>(
                "sp_GetExaminations",
                p,
                commandType: CommandType.StoredProcedure);

            var list = new List<Examination>();
            foreach (var r in rows)
            {
                list.Add(new Examination
                {
                    ExaminationId = (int)r.ExamId,
                    CampusId = (int?)r.CampusId ?? 1,
                    ExamCode = (string?)r.ExamCode,
                    ExamName = (string)r.ExamName,
                    BoardId = (int)r.BoardId,
                    AcademicYearId = (int)r.AcademicYearId,
                    AcademicLevelId = (int)r.AcademicLevelId,
                    GroupId = (int)r.GroupId,
                    ProgramId = (int?)r.ProgramId,
                    AssessmentTypeId = (int)r.AssessmentTypeId,
                    StartDate = r.StartDate is DateTime dtStart ? DateOnly.FromDateTime(dtStart) : (r.StartDate is DateOnly dStart ? dStart : DateOnly.FromDateTime(Convert.ToDateTime(r.StartDate))),
                    EndDate = r.EndDate is DateTime dtEnd ? DateOnly.FromDateTime(dtEnd) : (r.EndDate is DateOnly dEnd ? dEnd : DateOnly.FromDateTime(Convert.ToDateTime(r.EndDate))),
                    Description = (string?)r.Description,
                    ExamPattern = (string?)r.ExamPattern,
                    TotalMarks = (int?)r.TotalMarks,
                    PassPercentage = r.PassPercentage != null ? Convert.ToDecimal(r.PassPercentage) : null,
                    Status = (string)(r.Status ?? "DRAFT"),
                    IsActive = Convert.ToBoolean(r.IsActive),
                    CreatedAt = (DateTime)r.CreatedAt,
                    UpdatedAt = (DateTime?)r.UpdatedAt,
                    Board = new Board { BoardId = (int)r.BoardId, BoardName = (string)(r.BoardName ?? string.Empty) },
                    AcademicYear = new AcademicYear { AcademicYearId = (int)r.AcademicYearId, AcademicYearName = (string)(r.AcademicYearName ?? r.AcademicYear ?? string.Empty) },
                    AcademicLevel = new AcademicLevel { AcademicLevelId = (int)r.AcademicLevelId, LevelName = (string)(r.AcademicLevelName ?? r.AcademicLevel ?? string.Empty) },
                    Group = new Group { GroupId = (int)r.GroupId, GroupName = (string)(r.GroupName ?? string.Empty) },
                    Program = r.ProgramId != null ? new AcademicProgram { ProgramId = (int)r.ProgramId, ProgramName = (string)(r.ProgramName ?? string.Empty) } : null,
                    AssessmentType = new AssessmentType { AssessmentTypeId = (int)r.AssessmentTypeId, AssessmentTypeName = (string)(r.ExamType ?? string.Empty) }
                });
            }

            return list;
        }

        public async Task<IEnumerable<ExaminationResponse>> GetExaminationResponsesAsync(ExaminationSearchRequestDto filter)
        {
            var p = new DynamicParameters();
            p.Add("p_BoardId", filter.BoardId > 0 ? filter.BoardId : null);
            p.Add("p_AcademicYearId", filter.AcademicYearId > 0 ? filter.AcademicYearId : null);
            p.Add("p_AcademicLevelId", filter.AcademicLevelId > 0 ? filter.AcademicLevelId : null);
            p.Add("p_GroupId", filter.GroupId > 0 ? filter.GroupId : null);
            p.Add("p_ProgramId", filter.ProgramId > 0 ? filter.ProgramId : null);
            p.Add("p_AssessmentTypeId", filter.AssessmentTypeId > 0 ? filter.AssessmentTypeId : null);
            p.Add("p_Status", string.IsNullOrWhiteSpace(filter.Status) ? null : filter.Status.Trim());
            p.Add("p_SearchTerm", string.IsNullOrWhiteSpace(filter.SearchTerm) ? null : filter.SearchTerm.Trim());
            p.Add("p_CampusId", filter.CampusId > 0 ? filter.CampusId : null);

            var rows = await Connection.QueryAsync<dynamic>(
                "sp_GetExaminations",
                p,
                commandType: CommandType.StoredProcedure);

            var list = new List<ExaminationResponse>();
            foreach (var r in rows)
            {
                var subjIdsRaw = (string?)r.AggregatedSubjectIds;
                var subjIds = !string.IsNullOrWhiteSpace(subjIdsRaw)
                    ? subjIdsRaw.Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
                                .Select(s => int.TryParse(s.Trim(), out int id) ? id : 0)
                                .Where(id => id > 0)
                                .ToList()
                    : new List<int>();

                list.Add(new ExaminationResponse
                {
                    ExaminationId = (int)r.ExamId,
                    CampusId = (int?)r.CampusId ?? 1,
                    ExamCode = (string?)r.ExamCode ?? string.Empty,
                    ExamName = (string)r.ExamName,
                    BoardId = (int)r.BoardId,
                    BoardName = (string)(r.BoardName ?? string.Empty),
                    AcademicYearId = (int)r.AcademicYearId,
                    AcademicYear = (string)(r.AcademicYearName ?? r.AcademicYear ?? string.Empty),
                    AcademicLevelId = (int)r.AcademicLevelId,
                    AcademicLevel = (string)(r.AcademicLevelName ?? r.AcademicLevel ?? string.Empty),
                    GroupId = (int)r.GroupId,
                    GroupName = (string)(r.GroupName ?? string.Empty),
                    ProgramId = (int?)r.ProgramId,
                    ProgramName = (string)(r.ProgramName ?? string.Empty),
                    AssessmentTypeId = (int)r.AssessmentTypeId,
                    ExamType = (string)(r.ExamType ?? string.Empty),
                    ExamPattern = (string)(r.ExamPattern ?? "REGULAR_ACADEMIC"),
                    StartDate = r.StartDate is DateTime dtStart ? DateOnly.FromDateTime(dtStart) : (r.StartDate is DateOnly dStart ? dStart : DateOnly.FromDateTime(Convert.ToDateTime(r.StartDate))),
                    EndDate = r.EndDate is DateTime dtEnd ? DateOnly.FromDateTime(dtEnd) : (r.EndDate is DateOnly dEnd ? dEnd : DateOnly.FromDateTime(Convert.ToDateTime(r.EndDate))),
                    TotalMarks = (int?)r.TotalMarks,
                    PassPercentage = r.PassPercentage != null ? Convert.ToDecimal(r.PassPercentage) : null,
                    Description = (string?)r.Description,
                    Status = (string)(r.Status ?? "DRAFT"),
                    IsActive = Convert.ToBoolean(r.IsActive),
                    CreatedAt = (DateTime)r.CreatedAt,
                    UpdatedAt = (DateTime?)r.UpdatedAt,
                    TotalEligibleSubjects = Convert.ToInt32(r.TotalEligibleSubjects ?? 0),
                    ScheduledSubjectsCount = Convert.ToInt32(r.ScheduledSubjectsCount ?? 0),
                    AllocatedSubjectIds = subjIds
                });
            }

            return list;
        }

        public async Task UpdateExaminationAsync(Examination examination)
        {
            var p = new DynamicParameters();
            p.Add("p_ExamId", examination.ExaminationId);
            p.Add("p_ExamName", examination.ExamName);
            p.Add("p_BoardId", examination.BoardId);
            p.Add("p_AcademicYearId", examination.AcademicYearId);
            p.Add("p_AcademicLevelId", examination.AcademicLevelId);
            p.Add("p_GroupId", examination.GroupId);
            p.Add("p_ProgramId", examination.ProgramId);
            p.Add("p_AssessmentTypeId", examination.AssessmentTypeId);
            p.Add("p_StartDate", examination.StartDate.ToDateTime(TimeOnly.MinValue));
            p.Add("p_EndDate", examination.EndDate.ToDateTime(TimeOnly.MinValue));
            p.Add("p_Description", examination.Description);
            p.Add("p_ExamPattern", examination.ExamPattern);
            p.Add("p_TotalMarks", examination.TotalMarks);
            p.Add("p_PassPercentage", examination.PassPercentage);
            p.Add("p_Status", examination.Status);
            p.Add("p_CampusId", examination.CampusId > 0 ? examination.CampusId : 1);

            await Connection.ExecuteAsync(
                "sp_UpdateExamination",
                p,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> DeleteExaminationAsync(Examination examination)
        {
            var rows = await Connection.ExecuteAsync(
                "sp_DeleteExamination",
                new { p_ExamId = examination.ExaminationId, p_CampusId = examination.CampusId > 0 ? examination.CampusId : 1 },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task UpdateExaminationStatusAsync(int examinationId, string status)
        {
            await Connection.ExecuteAsync(
                "sp_UpdateExaminationStatus",
                new { p_ExamId = examinationId, p_Status = status },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<List<int>> GetExaminationSubjectIdsAsync(int examinationId)
        {
            try
            {
                var subjectIds = await Connection.QueryAsync<int>(
                    "sp_GetExaminationSubjectIds",
                    new { p_ExamId = examinationId },
                    commandType: CommandType.StoredProcedure);
                return subjectIds.ToList();
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Failed to fetch ExaminationSubjects for Exam {ExamId}", examinationId);
                return new List<int>();
            }
        }

        public async Task SaveExaminationSubjectsAsync(int examinationId, IEnumerable<int> subjectIds)
        {
            if (examinationId <= 0) return;
            var list = subjectIds?.Where(id => id > 0).Distinct().ToList() ?? new List<int>();

            try
            {
                string json = JsonSerializer.Serialize(list);
                var p = new DynamicParameters();
                p.Add("p_ExamId", examinationId);
                p.Add("p_SubjectIdsJson", json);
                await Connection.ExecuteAsync(
                    "sp_SaveExaminationSubjects",
                    p,
                    commandType: CommandType.StoredProcedure);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Failed to save ExaminationSubjects for Exam {ExamId}", examinationId);
            }
        }

                public async Task<ExaminationSettingsDto> SaveExaminationSettingsAsync(ExaminationSettingsDto settings)
        {
            return await SaveExaminationSettingsAsync(settings.CampusId, settings);
        }

        public async Task<string> GenerateUniqueExamCodeAsync(int boardId, int academicYearId, int groupId, int? programId)
        {
            var p = new DynamicParameters();
            p.Add("p_BoardId", boardId);
            p.Add("p_AcademicYearId", academicYearId);
            p.Add("p_GroupId", groupId);
            p.Add("p_ProgramId", programId ?? 0);
            return await Connection.QueryFirstOrDefaultAsync<string>(
                "sp_GenerateUniqueExamCode",
                p,
                commandType: CommandType.StoredProcedure) ?? $"EXAM-{DateTime.UtcNow.Year}-{Guid.NewGuid().ToString()[..4].ToUpper()}";
        }

        #endregion

        #region Exam Schedule Methods

        public async Task<ExamSchedule> CreateExamScheduleAsync(ExamSchedule schedule)
        {
            var p = new DynamicParameters();
            p.Add("p_ExamId", schedule.ExaminationId);
            p.Add("p_SubjectId", schedule.SubjectId);
            p.Add("p_ExamDate", schedule.ExamDate.ToDateTime(TimeOnly.MinValue));
            p.Add("p_StartTime", schedule.StartTime.ToTimeSpan());
            p.Add("p_EndTime", schedule.EndTime.ToTimeSpan());
            p.Add("p_SessionId", schedule.SessionId);
            p.Add("p_ScheduleMode", schedule.ScheduleMode ?? "SUBJECT_WISE");
            p.Add("p_RoomId", schedule.RoomId);
            p.Add("p_InvigilatorId", schedule.InvigilatorId);
            p.Add("p_Hall", schedule.Hall ?? string.Empty);
            p.Add("p_Invigilator", schedule.Invigilator ?? string.Empty);
            p.Add("p_ExamMode", schedule.ExamMode ?? "Written");
            p.Add("p_MaxMarks", schedule.MaxMarks);
            p.Add("p_PassingMarks", schedule.PassingMarks);
            p.Add("p_CampusId", schedule.CampusId > 0 ? schedule.CampusId : 1);
            p.Add("p_PatternName", schedule.PatternName);
            p.Add("p_GroupId", schedule.GroupId);
            p.Add("p_IncludedSubjectIds", schedule.IncludedSubjectIds);

            var rawId = await Connection.ExecuteScalarAsync<object>(
                "sp_CreateExamSchedule",
                p,
                commandType: CommandType.StoredProcedure);

            schedule.ExamScheduleId = Convert.ToInt32(rawId);
            return schedule;
        }

        public async Task<ExamSchedule?> GetExamScheduleByIdAsync(int examScheduleId)
        {
            var p = new DynamicParameters();
            p.Add("p_ExamScheduleId", examScheduleId);
            p.Add("p_CampusId", 0);

            var schedules = await Connection.QueryAsync<ExamSchedule, Subject, ExamSchedule>(
                "sp_GetExamScheduleById",
                (schedule, subject) =>
                {
                    schedule.Subject = subject;
                    return schedule;
                },
                p,
                splitOn: "SubjectName",
                commandType: CommandType.StoredProcedure);

            return schedules.FirstOrDefault();
        }

        public async Task<IEnumerable<ExamSchedule>> GetExamSchedulesAsync(int? examinationId)
        {
            var p = new DynamicParameters();
            p.Add("p_ExaminationId", examinationId ?? 0);
            p.Add("p_CampusId", 0);

            var results = await Connection.QueryAsync<ExamSchedule, Subject, ExamSchedule>(
                "sp_GetExamSchedulesByExamination",
                (schedule, subject) =>
                {
                    schedule.Subject = subject;
                    return schedule;
                },
                p,
                splitOn: "SubjectName",
                commandType: CommandType.StoredProcedure);

            return results.Where(s => s.IsActive)
                .GroupBy(s => s.SubjectId > 0 ? s.SubjectId : s.ExamScheduleId)
                .Select(g => g.OrderByDescending(s => s.ExamScheduleId).First())
                .ToList();
        }

        public async Task UpdateExamScheduleAsync(ExamSchedule schedule)
        {
            var p = new DynamicParameters();
            p.Add("p_ScheduleId", schedule.ExamScheduleId);
            p.Add("p_SubjectId", schedule.SubjectId);
            p.Add("p_ExamDate", schedule.ExamDate.ToDateTime(TimeOnly.MinValue));
            p.Add("p_StartTime", schedule.StartTime.ToTimeSpan());
            p.Add("p_EndTime", schedule.EndTime.ToTimeSpan());
            p.Add("p_SessionId", schedule.SessionId);
            p.Add("p_ScheduleMode", schedule.ScheduleMode);
            p.Add("p_RoomId", schedule.RoomId);
            p.Add("p_InvigilatorId", schedule.InvigilatorId);
            p.Add("p_Hall", schedule.Hall);
            p.Add("p_Invigilator", schedule.Invigilator);
            p.Add("p_ExamMode", schedule.ExamMode);
            p.Add("p_MaxMarks", schedule.MaxMarks);
            p.Add("p_PassingMarks", schedule.PassingMarks);
            p.Add("p_CampusId", schedule.CampusId > 0 ? schedule.CampusId : 1);
            p.Add("p_PatternName", schedule.PatternName);
            p.Add("p_GroupId", schedule.GroupId);
            p.Add("p_IncludedSubjectIds", schedule.IncludedSubjectIds);

            await Connection.ExecuteAsync(
                "sp_UpdateExamSchedule",
                p,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> DeleteExamScheduleAsync(ExamSchedule schedule)
        {
            var rows = await Connection.ExecuteAsync(
                "sp_DeleteExamSchedule",
                new { p_ScheduleId = schedule.ExamScheduleId, p_CampusId = schedule.CampusId > 0 ? schedule.CampusId : 1 },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<bool> DeleteExamSchedulesByExamIdAsync(int examinationId)
        {
            var rows = await Connection.ExecuteAsync(
                "sp_DeleteExamSchedulesByExam",
                new { p_ExamId = examinationId },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<int> PublishExamSchedulesAsync(IEnumerable<int> scheduleIds)
        {
            var idsStr = string.Join(",", scheduleIds);
            return await Connection.ExecuteAsync(
                "sp_PublishExamSchedules",
                new { p_ScheduleIds = idsStr, p_CampusId = 0 },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<Subject>> GetEligibleSubjectsForExamAsync(int examinationId)
        {
            var subjects = await Connection.QueryAsync<Subject>(
                "sp_GetEligibleSubjectsForExam",
                new { p_ExaminationId = examinationId, p_CampusId = 0 },
                commandType: CommandType.StoredProcedure);

            return subjects;
        }

        public async Task<bool> HasRoomConflictAsync(DateOnly examDate, TimeOnly startTime, TimeOnly endTime, string hall, int? excludeScheduleId = null)
        {
            if (string.IsNullOrWhiteSpace(hall)) return false;

            var count = await Connection.ExecuteScalarAsync<int>(
                "sp_CheckRoomConflict",
                new
                {
                    p_ExamDate = examDate.ToDateTime(TimeOnly.MinValue),
                    p_StartTime = startTime.ToTimeSpan(),
                    p_EndTime = endTime.ToTimeSpan(),
                    p_Hall = hall.Trim(),
                    p_ExcludeScheduleId = excludeScheduleId ?? 0,
                    p_CampusId = 0
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> HasInvigilatorConflictAsync(DateOnly examDate, TimeOnly startTime, TimeOnly endTime, string invigilator, int? excludeScheduleId = null)
        {
            if (string.IsNullOrWhiteSpace(invigilator)) return false;

            var count = await Connection.ExecuteScalarAsync<int>(
                "sp_CheckInvigilatorConflict",
                new
                {
                    p_ExamDate = examDate.ToDateTime(TimeOnly.MinValue),
                    p_StartTime = startTime.ToTimeSpan(),
                    p_EndTime = endTime.ToTimeSpan(),
                    p_Invigilator = invigilator.Trim(),
                    p_ExcludeScheduleId = excludeScheduleId ?? 0,
                    p_CampusId = 0
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<IEnumerable<Models.Timetable.Room>> GetAvailableHallsAsync(DateOnly examDate, TimeOnly startTime, TimeOnly endTime, int? excludeScheduleId = null)
        {
            var rooms = await Connection.QueryAsync<Models.Timetable.Room>(
                "sp_GetAvailableHalls",
                new
                {
                    p_ExamDate = examDate.ToDateTime(TimeOnly.MinValue),
                    p_StartTime = startTime.ToTimeSpan(),
                    p_EndTime = endTime.ToTimeSpan(),
                    p_ExcludeScheduleId = excludeScheduleId ?? 0,
                    p_CampusId = 0
                },
                commandType: CommandType.StoredProcedure);

            return rooms;
        }

        public async Task<IEnumerable<Models.Faculty.Faculty>> GetAvailableInvigilatorsAsync(DateOnly examDate, TimeOnly startTime, TimeOnly endTime, int? excludeScheduleId = null)
        {
            var staffList = await Connection.QueryAsync<dynamic>(
                "sp_GetAvailableInvigilators",
                new
                {
                    p_ExamDate = examDate.ToDateTime(TimeOnly.MinValue),
                    p_StartTime = startTime.ToTimeSpan(),
                    p_EndTime = endTime.ToTimeSpan(),
                    p_ExcludeScheduleId = excludeScheduleId ?? 0,
                    p_CampusId = 0
                },
                commandType: CommandType.StoredProcedure);

            return staffList.Select(s => new Models.Faculty.Faculty
            {
                Id = (int)s.Id,
                FirstName = (string)(s.FirstName ?? string.Empty),
                LastName = (string)(s.LastName ?? string.Empty),
                Email = (string)(s.Email ?? string.Empty),
                Phone = (string)(s.Phone ?? string.Empty),
                Designation = (string)(s.DesignationName ?? string.Empty),
                Department = (string)(s.DepartmentName ?? string.Empty),
                Status = "Active"
            }).ToList();
        }

        public async Task<bool> IsInvigilatorTeachingSubjectAsync(int invigilatorId, int subjectId)
        {
            if (invigilatorId <= 0 || subjectId <= 0) return false;
            var count = await Connection.ExecuteScalarAsync<int>(
                "sp_CheckInvigilatorTeachingSubject",
                new { p_StaffId = invigilatorId, p_SubjectId = subjectId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }

        public async Task<IEnumerable<DTOs.Examination.Responses.AvailableHallDto>> GetAvailableHallsFilteredAsync(DateOnly examDate, TimeOnly startTime, TimeOnly endTime, int? requiredCapacity = null, IEnumerable<int>? sectionIds = null, int? excludeScheduleId = null)
        {
            var rooms = await GetAvailableHallsAsync(examDate, startTime, endTime, excludeScheduleId);

            var query = rooms.AsEnumerable();
            if (requiredCapacity.HasValue && requiredCapacity.Value > 0)
            {
                query = query.Where(r => r.Capacity >= requiredCapacity.Value);
            }

            return query.Select(r => new DTOs.Examination.Responses.AvailableHallDto
            {
                RoomId = r.RoomId,
                RoomNumber = r.RoomNumber,
                RoomName = r.RoomName,
                Capacity = r.Capacity,
                Floor = r.Floor,
                Block = r.Block,
                IsAvailable = true
            });
        }

        public async Task<IEnumerable<DTOs.Examination.Responses.AvailableInvigilatorDto>> GetAvailableInvigilatorsFilteredAsync(DateOnly examDate, TimeOnly startTime, TimeOnly endTime, IEnumerable<int>? subjectIds = null, int? excludeScheduleId = null)
        {
            var staffList = await Connection.QueryAsync<dynamic>(
                "sp_GetAvailableInvigilators",
                new
                {
                    p_ExamDate = examDate.ToDateTime(TimeOnly.MinValue),
                    p_StartTime = startTime.ToTimeSpan(),
                    p_EndTime = endTime.ToTimeSpan(),
                    p_ExcludeScheduleId = excludeScheduleId ?? 0,
                    p_CampusId = 0
                },
                commandType: CommandType.StoredProcedure);

            var subIdList = subjectIds?.Where(id => id > 0).ToList() ?? new List<int>();

            var results = new List<DTOs.Examination.Responses.AvailableInvigilatorDto>();
            foreach (var s in staffList)
            {
                int staffId = (int)s.Id;
                bool isTeaching = false;
                if (subIdList.Any())
                {
                    foreach (var subId in subIdList)
                    {
                        if (await IsInvigilatorTeachingSubjectAsync(staffId, subId))
                        {
                            isTeaching = true;
                            break;
                        }
                    }
                }

                results.Add(new DTOs.Examination.Responses.AvailableInvigilatorDto
                {
                    FacultyId = staffId,
                    StaffId = staffId,
                    FacultyName = $"{s.FirstName} {s.LastName}".Trim(),
                    Name = $"{s.FirstName} {s.LastName}".Trim(),
                    Email = (string)(s.Email ?? string.Empty),
                    Phone = (string)(s.Phone ?? string.Empty),
                    Department = (string)(s.DepartmentName ?? string.Empty),
                    Designation = (string)(s.DesignationName ?? string.Empty),
                    IsAvailable = true,
                    IsTeachingSubject = isTeaching
                });
            }

            return results;
        }

        public async Task<IEnumerable<Examination>> GetScheduledExamsReadyForCompletionAsync()
        {
            var p = new DynamicParameters();
            p.Add("p_BoardId", null);
            p.Add("p_AcademicYearId", null);
            p.Add("p_AcademicLevelId", null);
            p.Add("p_GroupId", null);
            p.Add("p_ProgramId", null);
            p.Add("p_AssessmentTypeId", null);
            p.Add("p_Status", "SCHEDULED");
            p.Add("p_SearchTerm", null);
            p.Add("p_CampusId", null);

            var exams = await Connection.QueryAsync<Examination>(
                "sp_GetExaminations",
                p,
                commandType: CommandType.StoredProcedure);

            var today = DateOnly.FromDateTime(DateTime.Today);
            return exams.Where(e => e.EndDate < today);
        }

        public async Task<DTOs.Examination.Responses.SchedulingContextResponseDto> GetSchedulingContextAsync(int examinationId)
        {
            var sections = await Connection.QueryAsync<dynamic>(
                "sp_GetSchedulingContext",
                new { p_ExaminationId = examinationId },
                commandType: CommandType.StoredProcedure);

            var sectionDtos = new List<DTOs.Examination.Responses.SchedulingSectionContextDto>();
            var sectionIds = new List<int>();
            int totalEligible = 0;

            foreach (var sec in sections)
            {
                int secId = (int)sec.SectionId;
                int count = Convert.ToInt32(sec.EligibleStudentCount ?? 0);
                totalEligible += count;
                sectionIds.Add(secId);
                sectionDtos.Add(new DTOs.Examination.Responses.SchedulingSectionContextDto
                {
                    SectionId = secId,
                    SectionName = (string)sec.SectionName,
                    EligibleStudentCount = count
                });
            }

            return new DTOs.Examination.Responses.SchedulingContextResponseDto
            {
                ExaminationId = examinationId,
                SectionIds = sectionIds,
                Sections = sectionDtos,
                TotalEligibleStudents = totalEligible,
                RequiredCapacity = totalEligible
            };
        }

        #endregion

        #region Hall Ticket Methods

        public async Task<IEnumerable<HallTicket>> GenerateHallTicketsAsync(int examinationId, int batchId)
        {
            var p = new DynamicParameters();
            p.Add("p_ExaminationId", examinationId);
            p.Add("p_BatchId", batchId);
            p.Add("p_CampusId", 0);

            var results = await Connection.QueryAsync<HallTicket, Student, HallTicket>(
                "sp_GenerateHallTickets",
                (ticket, student) =>
                {
                    ticket.Student = student;
                    return ticket;
                },
                p,
                splitOn: "StudentName",
                commandType: CommandType.StoredProcedure);

            return results;
        }

        public async Task<Stream?> GetHallTicketPdfStreamAsync(int studentId, int examinationId)
        {
            var exam = await GetExaminationByIdAsync(examinationId);
            var student = await Connection.QueryFirstOrDefaultAsync<Student>(
                "sp_GetStudentById",
                new { p_StudentId = studentId },
                commandType: CommandType.StoredProcedure);

            if (student == null || exam == null)
            {
                return null;
            }

            var schedules = await GetExamSchedulesAsync(examinationId);

            if (_exportService != null)
            {
                var pdfBytes = _exportService.GenerateHallTicketPdf(student, exam, schedules);
                return new MemoryStream(pdfBytes);
            }

            return null;
        }

        #endregion

        #region Invigilator Methods

        public async Task AssignInvigilatorsAsync(int examScheduleId, IEnumerable<int> invigilatorIds, string hallNumber)
        {
            if (invigilatorIds == null || !invigilatorIds.Any()) return;
            await AssignInvigilatorHallsAsync(examScheduleId, invigilatorIds.Select(id => (id, hallNumber)));
        }

        public async Task AssignInvigilatorHallsAsync(int examScheduleId, IEnumerable<(int invigilatorId, string hallNumber)> assignments)
        {
            if (assignments == null || !assignments.Any()) return;

            var jsonList = assignments
                .Where(a => a.invigilatorId > 0)
                .Select(a => new { InvigilatorId = a.invigilatorId, HallNumber = a.hallNumber ?? string.Empty })
                .ToList();

            if (!jsonList.Any()) return;

            string jsonPayload = JsonSerializer.Serialize(jsonList);

            await Connection.ExecuteAsync(
                "sp_AssignInvigilatorHallsBulk",
                new { p_ExamScheduleId = examScheduleId, p_AssignmentsJson = jsonPayload },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<InvigilatorAssignment>> GetInvigilatorsByScheduleIdAsync(int examScheduleId)
        {
            return await Connection.QueryAsync<InvigilatorAssignment>(
                "sp_GetInvigilatorsBySchedule",
                new { p_ExamScheduleId = examScheduleId, p_CampusId = 0 },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<FacultyExamDutyDto>> GetFacultyExamDutiesAsync(
            int? staffId = null,
            string? status = null,
            int? campusId = null,
            int? academicYearId = null,
            int? boardId = null)
        {
            var p = new DynamicParameters();
            p.Add("p_StaffId", staffId > 0 ? staffId : null);
            p.Add("p_Status", string.IsNullOrWhiteSpace(status) ? null : status.Trim());
            p.Add("p_CampusId", campusId > 0 ? campusId : null);
            p.Add("p_AcademicYearId", academicYearId > 0 ? academicYearId : null);
            p.Add("p_BoardId", boardId > 0 ? boardId : null);

            var rows = await Connection.QueryAsync<dynamic>(
                "sp_GetFacultyExamDuties",
                p,
                commandType: CommandType.StoredProcedure);

            var today = DateOnly.FromDateTime(DateTime.Today);
            var results = new List<FacultyExamDutyDto>();

            foreach (var r in rows)
            {
                var examDate = r.ExamDate is DateTime dt ? DateOnly.FromDateTime(dt) : (r.ExamDate is DateOnly d ? d : DateOnly.FromDateTime(Convert.ToDateTime(r.ExamDate)));
                var startTimeSpan = (TimeSpan)r.StartTime;
                var endTimeSpan = (TimeSpan)r.EndTime;
                var startTime = TimeOnly.FromTimeSpan(startTimeSpan);
                var endTime = TimeOnly.FromTimeSpan(endTimeSpan);

                string dutyStatus = "Upcoming";
                string examStatus = (string)(r.ExamStatus ?? string.Empty);
                bool isCancelled = string.Equals(examStatus, "Cancelled", StringComparison.OrdinalIgnoreCase);

                if (isCancelled || !Convert.ToBoolean(r.ScheduleIsActive))
                {
                    dutyStatus = "Cancelled";
                }
                else if (examDate < today)
                {
                    dutyStatus = "Completed";
                }
                else if (examDate == today)
                {
                    dutyStatus = "Today";
                }

                if (!string.IsNullOrWhiteSpace(status) && !string.Equals(dutyStatus, status, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                string session = !string.IsNullOrWhiteSpace((string?)r.SessionId)
                    ? (string)r.SessionId
                    : (startTime.Hour < 12 ? "Morning Session" : "Afternoon Session");

                string startTimeStr = startTime.ToString("hh\\:mm tt");
                string endTimeStr = endTime.ToString("hh\\:mm tt");
                var repTime = startTime.AddMinutes(-30);
                string repTimeStr = $"{repTime:hh\\:mm tt} (Mandatory 30 mins prior)";

                string examCat = ((string?)r.ExamPattern)?.ToLowerInvariant() ?? "internal";
                if (examCat.Contains("board") || examCat.Contains("ipe")) examCat = "board";
                else if (examCat.Contains("prac")) examCat = "practical";
                else examCat = "internal";

                results.Add(new FacultyExamDutyDto
                {
                    Id = r.DutyId != null ? Convert.ToInt32(r.DutyId) : (r.Id != null ? Convert.ToInt32(r.Id) : Convert.ToInt32(r.ExamScheduleId ?? 0)),
                    ExamScheduleId = r.ExamScheduleId != null ? Convert.ToInt32(r.ExamScheduleId) : 0,
                    ExaminationId = r.ExaminationId != null ? Convert.ToInt32(r.ExaminationId) : (r.ExamId != null ? Convert.ToInt32(r.ExamId) : 0),
                    ExamName = (string)(r.ExamName ?? $"Exam #{r.ExaminationId}"),
                    ExamCode = (string)(r.ExamCode ?? $"EXAM-{r.ExaminationId}"),
                    Category = examCat,
                    ExamType = (string)(r.ExamPattern ?? "Board Theory"),
                    Role = "Invigilator",
                    Status = dutyStatus,
                    Subject = !string.IsNullOrWhiteSpace((string?)r.SubjectName) ? $"{(string)r.SubjectName} ({(string)r.SubjectCode})" : $"Subject #{r.SubjectId}",
                    SubjectCode = (string)(r.SubjectCode ?? string.Empty),
                    Date = examDate.ToString("dd MMM yyyy"),
                    ExamDate = examDate.ToString("yyyy-MM-dd"),
                    Session = session,
                    ExamHours = $"{startTimeStr} – {endTimeStr}",
                    StartTime = startTimeStr,
                    EndTime = endTimeStr,
                    Venue = (string)(r.Venue ?? "Examination Hall"),
                    Invigilator = (string)(r.InvigilatorName ?? string.Empty),
                    InvigilatorId = (int?)r.InvigilatorId,
                    ReportingTime = repTimeStr,
                    Candidates = "30 Candidates",
                    TotalEnrolled = 30,
                    Present = 30,
                    Absent = 0,
                    Sops = new List<string>
                    {
                        "Collect sealed Question Paper packets from Chief Superintendent room.",
                        "Verify Student Hall Tickets and prohibit unauthorized gadgets / smart watches.",
                        "Cross-verify candidate signature on Nominal Roll & OMR Barcode.",
                        "Hand over signed absentee statement within 30 minutes of start."
                    }
                });
            }

            return results;
        }

        public async Task<bool> ReassignInvigilatorDutyAsync(int dutyId, int newStaffId, string? hallNumber = null, string? reason = null)
        {
            var p = new DynamicParameters();
            p.Add("p_DutyId", dutyId);
            p.Add("p_NewStaffId", newStaffId);
            p.Add("p_HallNumber", hallNumber);
            p.Add("p_Reason", reason);

            var rows = await Connection.ExecuteAsync(
                "sp_ReassignInvigilatorDuty",
                p,
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<ExaminationSettingsDto?> GetExaminationSettingsAsync(int campusId)
        {
            var p = new DynamicParameters();
            p.Add("p_CampusId", campusId > 0 ? campusId : 1);

            return await Connection.QueryFirstOrDefaultAsync<ExaminationSettingsDto>(
                "sp_GetExaminationSettings",
                p,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<ExaminationSettingsDto> SaveExaminationSettingsAsync(int campusId, ExaminationSettingsDto settings)
        {
            var p = new DynamicParameters();
            p.Add("p_CampusId", campusId > 0 ? campusId : 1);
            p.Add("p_MinimumPassingPercentage", settings.MinimumPassingPercentage);
            p.Add("p_MaximumGraceMarksLimit", settings.MaximumGraceMarksLimit);
            p.Add("p_GradeScaleStandard", settings.GradeScaleStandard);
            p.Add("p_ReEvaluationWindowDays", settings.ReEvaluationWindowDays);
            p.Add("p_EnableDoubleEvaluation", settings.EnableDoubleEvaluation ? 1 : 0);
            p.Add("p_AllowNegativeMarking", settings.AllowNegativeMarking ? 1 : 0);
            p.Add("p_MinAttendancePercent", settings.MinAttendancePercent);
            p.Add("p_CondonationThreshold", settings.CondonationThreshold);
            p.Add("p_IncludePrincipalSign", settings.IncludePrincipalSign ? 1 : 0);
            p.Add("p_AutoLockSeatingHours", settings.AutoLockSeatingHours);
            p.Add("p_AllowManualHallTicketRelease", settings.AllowManualHallTicketRelease ? 1 : 0);
            p.Add("p_SmsAlertsOnPublish", settings.SmsAlertsOnPublish ? 1 : 0);
            p.Add("p_EmailMarksheetCopy", settings.EmailMarksheetCopy ? 1 : 0);
            p.Add("p_RestrictResultsForFeeDue", settings.RestrictResultsForFeeDue ? 1 : 0);
            p.Add("p_AutoArchivePastExams", settings.AutoArchivePastExams ? 1 : 0);
            p.Add("p_SettingsJson", settings.SettingsJson);

            var saved = await Connection.QueryFirstOrDefaultAsync<ExaminationSettingsDto>(
                "sp_SaveExaminationSettings",
                p,
                commandType: CommandType.StoredProcedure);

            return saved ?? settings;
        }

        public async Task<int> AutoTransitionExaminationStatusesAsync(DateTime currentTime)
        {
            return await Connection.ExecuteAsync(
                "sp_AutoTransitionExaminationStatuses",
                new { p_CurrentTime = currentTime },
                commandType: CommandType.StoredProcedure);
        }

        #endregion
    }
}
