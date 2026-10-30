using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Examination;
using CollegeManagement.API.DTOs.Examination.Requests;
using CollegeManagement.API.DTOs.Examination.Responses;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class ExaminationRepository : IExaminationRepository
    {
        private readonly AppDbContext _context;
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

        public ExaminationRepository(AppDbContext context, ILogger<ExaminationRepository>? logger = null)
        {
            _context = context;
            _logger = logger;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        #region Examination Methods

        private static readonly System.Threading.SemaphoreSlim _seqLock = new(1, 1);

        public async Task<Examination> CreateExaminationAsync(Examination examination)
        {
            // 1. Resolve Academic Year string (e.g. "2026")
            string yearStr = DateTime.UtcNow.Year.ToString();
            if (examination.AcademicYearId > 0)
            {
                var y = await _context.AcademicYears
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.AcademicYearId == examination.AcademicYearId);

                if (y != null && !string.IsNullOrWhiteSpace(y.AcademicYearName))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(y.AcademicYearName, @"\d{4}");
                    if (match.Success)
                    {
                        yearStr = match.Value;
                    }
                }
            }

            // 2. Concurrency-safe atomic sequence retrieval via Stored Procedure
            var nextSeq = await Connection.QueryFirstOrDefaultAsync<int>(
                "sp_GetNextExamCodeSequence",
                new { p_AcademicYear = yearStr },
                commandType: CommandType.StoredProcedure);
            if (nextSeq <= 0) nextSeq = 1;

            if (string.IsNullOrWhiteSpace(examination.ExamCode))
            {
                examination.ExamCode = $"EXAM-{yearStr}-{nextSeq:D4}";
            }

            // 4. Save Examination record via Stored Procedure sp_CreateExamination
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
                p.Add("p_ExamPattern", examination.ExamPattern);
                p.Add("p_TotalMarks", examination.TotalMarks);
                p.Add("p_PassPercentage", examination.PassPercentage);
                p.Add("p_Status", examination.Status);
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
                    .GroupBy(s => s.SubjectId)
                    .Select(g => g.OrderByDescending(s => s.ExamScheduleId).First())
                    .ToList();
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "sp_GetExamSchedulesByExamination failed for Exam {Id}, falling back to EF query", examinationId);
                exam.ExamSchedules = (await _context.ExamSchedules
                    .Include(s => s.Subject)
                    .Where(s => s.ExaminationId == examinationId && s.IsActive)
                    .AsNoTracking()
                    .ToListAsync())
                    .GroupBy(s => s.SubjectId)
                    .Select(g => g.OrderByDescending(s => s.ExamScheduleId).First())
                    .ToList();
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
            p.Add("p_Status", string.IsNullOrWhiteSpace(filter.Status) ? null : filter.Status);
            p.Add("p_SearchTerm", string.IsNullOrWhiteSpace(filter.SearchTerm) ? null : filter.SearchTerm);
            p.Add("p_CampusId", filter.CampusId > 0 ? filter.CampusId : null);

            var rows = await Connection.QueryAsync<dynamic>(
                "sp_GetExaminations",
                p,
                commandType: CommandType.StoredProcedure);

            return rows.Select(row => new Examination
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
            }).ToList();
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
            p.Add("p_Status", string.IsNullOrWhiteSpace(filter.Status) ? null : filter.Status);
            p.Add("p_SearchTerm", string.IsNullOrWhiteSpace(filter.SearchTerm) ? null : filter.SearchTerm);
            p.Add("p_CampusId", filter.CampusId > 0 ? filter.CampusId : null);

            var results = await Connection.QueryAsync<ExaminationResponse>(
                "sp_GetExaminations",
                p,
                commandType: CommandType.StoredProcedure);

            return results.ToList();
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

        public async Task<List<int>> GetExaminationSubjectIdsAsync(int examinationId)
        {
            try
            {
                var subjectIds = await Connection.QueryAsync<int>(
                    "sp_GetExaminationSubjects",
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
                string json = System.Text.Json.JsonSerializer.Serialize(list);
                await Connection.ExecuteAsync(
                    "sp_SaveExaminationSubjects",
                    new { p_ExamId = examinationId, p_SubjectIdsJson = json },
                    commandType: CommandType.StoredProcedure);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Failed to save ExaminationSubjects for Exam {ExamId}", examinationId);
            }
        }

        #endregion

        #region Exam Schedule Methods

        public async Task<ExamSchedule> CreateExamScheduleAsync(ExamSchedule schedule)
        {
            if (string.IsNullOrWhiteSpace(schedule.Invigilator) && schedule.InvigilatorId.HasValue && schedule.InvigilatorId.Value > 0)
            {
                var staff = await _context.Staffs.AsNoTracking()
                    .Where(s => s.Id == schedule.InvigilatorId.Value)
                    .Select(s => new { s.FirstName, s.LastName })
                    .FirstOrDefaultAsync();

                if (staff != null)
                {
                    schedule.Invigilator = $"{staff.FirstName} {staff.LastName}".Trim();
                }
                else
                {
                    var fac = await _context.Faculties.AsNoTracking()
                        .Where(f => f.Id == schedule.InvigilatorId.Value)
                        .Select(f => new { f.FirstName, f.LastName })
                        .FirstOrDefaultAsync();

                    if (fac != null)
                    {
                        schedule.Invigilator = $"{fac.FirstName} {fac.LastName}".Trim();
                    }
                }
            }

            if (string.IsNullOrWhiteSpace(schedule.Hall) && schedule.RoomId.HasValue && schedule.RoomId.Value > 0)
            {
                var rm = await _context.Rooms.AsNoTracking().FirstOrDefaultAsync(r => r.RoomId == schedule.RoomId.Value);
                if (rm != null)
                {
                    schedule.Hall = !string.IsNullOrWhiteSpace(rm.RoomNumber) ? rm.RoomNumber : (rm.RoomName ?? string.Empty);
                }
            }

            var p = new DynamicParameters();
            p.Add("p_ExamId", schedule.ExaminationId);
            p.Add("p_ExaminationId", schedule.ExaminationId);
            p.Add("p_SubjectId", schedule.SubjectId);
            p.Add("p_ExamDate", schedule.ExamDate.ToDateTime(TimeOnly.MinValue));
            p.Add("p_Date", schedule.ExamDate.ToDateTime(TimeOnly.MinValue));
            p.Add("p_StartTime", schedule.StartTime.ToTimeSpan());
            p.Add("p_EndTime", schedule.EndTime.ToTimeSpan());
            p.Add("p_SessionId", schedule.SessionId);
            p.Add("p_ScheduleMode", schedule.ScheduleMode);
            p.Add("p_RoomId", schedule.RoomId);
            p.Add("p_InvigilatorId", schedule.InvigilatorId);
            p.Add("p_Hall", schedule.Hall ?? string.Empty);
            p.Add("p_Invigilator", schedule.Invigilator ?? string.Empty);
            p.Add("p_ExamMode", schedule.ExamMode ?? "Written");
            p.Add("p_MaxMarks", schedule.MaxMarks);
            p.Add("p_PassingMarks", schedule.PassingMarks);
            p.Add("p_CampusId", schedule.CampusId > 0 ? schedule.CampusId : 1);
            p.Add("p_PatternName", schedule.PatternName);
            p.Add("p_GroupId", schedule.GroupId > 0 ? schedule.GroupId : (int?)null);
            p.Add("p_IncludedSubjectIds", schedule.IncludedSubjectIds);

            try
            {
                var newId = await Connection.ExecuteScalarAsync<int>(
                    "sp_CreateExamSchedule",
                    p,
                    commandType: CommandType.StoredProcedure);

                schedule.ExamScheduleId = newId;

                _logger?.LogInformation("Successfully created ExamSchedule ID {ScheduleId} for Exam {ExamId}, Subject {SubId}",
                    newId, schedule.ExaminationId, schedule.SubjectId);
                return schedule;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Failed to execute sp_CreateExamSchedule for Exam {ExamId}, Subject {SubId}: {Message}",
                    schedule.ExaminationId, schedule.SubjectId, ex.Message);
                throw;
            }
        }

        public async Task<ExamSchedule?> GetExamScheduleByIdAsync(int examScheduleId)
        {
            var p = new DynamicParameters();
            p.Add("p_ExamScheduleId", examScheduleId);
            p.Add("p_ScheduleId", examScheduleId);
            p.Add("p_CampusId", 0);

            ExamSchedule? schedule = null;
            try
            {
                var results = await Connection.QueryAsync<ExamSchedule, Subject, ExamSchedule>(
                    "sp_GetExamScheduleById",
                    (s, subject) =>
                    {
                        s.Subject = subject;
                        return s;
                    },
                    p,
                    splitOn: "SubjectName",
                    commandType: CommandType.StoredProcedure);

                schedule = results.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "sp_GetExamScheduleById failed for ID {Id}, falling back to EF query: {Message}", examScheduleId, ex.Message);
            }

            if (schedule == null)
            {
                schedule = await _context.ExamSchedules
                    .Include(s => s.Subject)
                    .Include(s => s.Examination)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.ExamScheduleId == examScheduleId);
            }

            if (schedule != null)
            {
                try
                {
                    var invigilators = await GetInvigilatorsByScheduleIdAsync(schedule.ExamScheduleId);
                    if (invigilators != null && invigilators.Any())
                    {
                        schedule.InvigilatorAssignments = invigilators.ToList();
                        var primaryInv = schedule.InvigilatorAssignments.FirstOrDefault();
                        if (primaryInv != null)
                        {
                            if (string.IsNullOrWhiteSpace(schedule.Invigilator))
                            {
                                schedule.Invigilator = primaryInv.InvigilatorName;
                            }
                            if (!schedule.InvigilatorId.HasValue || schedule.InvigilatorId.Value <= 0)
                            {
                                schedule.InvigilatorId = primaryInv.InvigilatorId;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Failed to load invigilator assignments for Schedule {Id}", schedule.ExamScheduleId);
                }
            }

            return schedule;
        }

        public async Task<IEnumerable<ExamSchedule>> GetExamSchedulesAsync(int? examinationId)
        {
            try
            {
                var query = _context.ExamSchedules
                    .Include(s => s.Subject)
                    .Include(s => s.Examination)
                    .AsNoTracking();

                if (examinationId.HasValue && examinationId.Value > 0)
                {
                    query = query.Where(s => s.ExaminationId == examinationId.Value);
                }

                var list = await query.ToListAsync();
                if (list != null && list.Any())
                {
                    return list.Where(s => s.IsActive)
                        .GroupBy(s => s.SubjectId)
                        .Select(g => g.OrderByDescending(s => s.ExamScheduleId).First())
                        .ToList();
                }
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "EF query for ExamSchedules failed, falling back to stored procedure: {Message}", ex.Message);
            }

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
                .GroupBy(s => s.SubjectId)
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

            await Connection.ExecuteAsync(
                "sp_UpdateExamSchedule",
                p,
                commandType: CommandType.StoredProcedure);

            try
            {
                await Connection.ExecuteAsync(
                    @"UPDATE ExamSchedules 
                      SET PatternName = COALESCE(@PatternName, PatternName),
                          GroupId = COALESCE(@GroupId, GroupId),
                          IncludedSubjectIds = @IncludedSubjectIds,
                          ScheduleMode = COALESCE(@ScheduleMode, ScheduleMode),
                          ExamMode = COALESCE(@ExamMode, ExamMode)
                      WHERE ScheduleId = @ScheduleId",
                    new
                    {
                        PatternName = schedule.PatternName,
                        GroupId = schedule.GroupId > 0 ? schedule.GroupId : (int?)null,
                        IncludedSubjectIds = schedule.IncludedSubjectIds,
                        ScheduleMode = schedule.ScheduleMode,
                        ExamMode = schedule.ExamMode,
                        ScheduleId = schedule.ExamScheduleId
                    });
            }
            catch (Exception updateEx)
            {
                _logger?.LogWarning(updateEx, "Could not update custom pattern/group columns for Schedule {ScheduleId}", schedule.ExamScheduleId);
            }
        }

        public async Task<bool> DeleteExamScheduleAsync(ExamSchedule schedule)
        {
            var rows = await Connection.ExecuteAsync(
                "sp_DeleteExamSchedule",
                new { p_ScheduleId = schedule.ExamScheduleId, p_CampusId = schedule.CampusId > 0 ? schedule.CampusId : 1 },
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

            var hallNorm = hall.Trim().ToLower();
            return await _context.ExamSchedules
                .AsNoTracking()
                .AnyAsync(s =>
                    s.IsActive &&
                    (s.Examination == null || (s.Examination.IsActive && s.Examination.Status != "CANCELLED" && s.Examination.Status != "DELETED")) &&
                    s.ExamDate == examDate &&
                    (!excludeScheduleId.HasValue || s.ExamScheduleId != excludeScheduleId.Value) &&
                    s.Hall.Trim().ToLower() == hallNorm &&
                    !(endTime <= s.StartTime || startTime >= s.EndTime));
        }

        public async Task<bool> HasInvigilatorConflictAsync(DateOnly examDate, TimeOnly startTime, TimeOnly endTime, string invigilator, int? excludeScheduleId = null)
        {
            if (string.IsNullOrWhiteSpace(invigilator)) return false;

            var invNorm = invigilator.Trim().ToLower();
            return await _context.ExamSchedules
                .AsNoTracking()
                .AnyAsync(s =>
                    s.IsActive &&
                    (s.Examination == null || (s.Examination.IsActive && s.Examination.Status != "CANCELLED" && s.Examination.Status != "DELETED")) &&
                    s.ExamDate == examDate &&
                    (!excludeScheduleId.HasValue || s.ExamScheduleId != excludeScheduleId.Value) &&
                    s.Invigilator.Trim().ToLower() == invNorm &&
                    !(endTime <= s.StartTime || startTime >= s.EndTime));
        }

        public async Task<IEnumerable<Models.Timetable.Room>> GetAvailableHallsAsync(DateOnly examDate, TimeOnly startTime, TimeOnly endTime, int? excludeScheduleId = null)
        {
            var bookedHalls = await _context.ExamSchedules
                .Where(s => s.IsActive
                    && s.ExamDate == examDate
                    && (!excludeScheduleId.HasValue || s.ExamScheduleId != excludeScheduleId.Value)
                    && !(endTime <= s.StartTime || startTime >= s.EndTime))
                .Select(s => s.Hall.Trim().ToLower())
                .Distinct()
                .ToListAsync();

            var bookedRoomIds = await _context.ExamSchedules
                .Where(s => s.IsActive
                    && s.ExamDate == examDate
                    && s.RoomId.HasValue
                    && (!excludeScheduleId.HasValue || s.ExamScheduleId != excludeScheduleId.Value)
                    && !(endTime <= s.StartTime || startTime >= s.EndTime))
                .Select(s => s.RoomId!.Value)
                .Distinct()
                .ToListAsync();

            var allRooms = await _context.Rooms
                .Where(r => r.IsActive)
                .OrderBy(r => r.RoomNumber)
                .ToListAsync();

            return allRooms.Where(r => 
                !bookedRoomIds.Contains(r.RoomId) &&
                !bookedHalls.Contains(r.RoomNumber.Trim().ToLower()) &&
                (string.IsNullOrWhiteSpace(r.RoomName) || !bookedHalls.Contains(r.RoomName.Trim().ToLower())));
        }

        public async Task<IEnumerable<Models.Faculty.Faculty>> GetAvailableInvigilatorsAsync(DateOnly examDate, TimeOnly startTime, TimeOnly endTime, int? excludeScheduleId = null)
        {
            var bookedInvigilatorNames = await _context.ExamSchedules
                .Where(s => s.IsActive
                    && s.ExamDate == examDate
                    && (!excludeScheduleId.HasValue || s.ExamScheduleId != excludeScheduleId.Value)
                    && !(endTime <= s.StartTime || startTime >= s.EndTime))
                .Select(s => s.Invigilator.Trim().ToLower())
                .Distinct()
                .ToListAsync();

            var bookedInvigilatorIds = await _context.ExamSchedules
                .Where(s => s.IsActive
                    && s.ExamDate == examDate
                    && s.InvigilatorId.HasValue
                    && (!excludeScheduleId.HasValue || s.ExamScheduleId != excludeScheduleId.Value)
                    && !(endTime <= s.StartTime || startTime >= s.EndTime))
                .Select(s => s.InvigilatorId!.Value)
                .Distinct()
                .ToListAsync();

            var allFaculty = await _context.Faculties
                .Include(f => f.DesignationRef)
                .Where(f => !f.IsDeleted && f.Status == "Active")
                .OrderBy(f => f.FirstName)
                .ThenBy(f => f.LastName)
                .ToListAsync();

            return allFaculty.Where(f =>
                !bookedInvigilatorIds.Contains(f.Id) &&
                !bookedInvigilatorNames.Contains($"{f.FirstName} {f.LastName}".Trim().ToLower()) &&
                !bookedInvigilatorNames.Contains(f.FirstName.Trim().ToLower()));
        }

        public async Task<bool> IsInvigilatorTeachingSubjectAsync(int invigilatorId, int subjectId)
        {
            if (invigilatorId <= 0 || subjectId <= 0) return false;
            return await _context.StaffSubjectAllocations
                .AnyAsync(a => a.StaffId == invigilatorId && a.SubjectId == subjectId);
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
            var ticket = await _context.HallTickets
                .Include(h => h.Student)
                .Include(h => h.Examination)
                .FirstOrDefaultAsync(h => h.StudentId == studentId && h.ExaminationId == examinationId);

            var student = ticket?.Student ?? await _context.Students.FirstOrDefaultAsync(s => s.StudentId == studentId);
            var exam = ticket?.Examination ?? await _context.Examinations.FirstOrDefaultAsync(e => e.ExaminationId == examinationId);

            if (student == null || exam == null)
            {
                return null;
            }

            var schedules = await _context.ExamSchedules
                .Include(s => s.Subject)
                .Where(s => s.ExaminationId == examinationId && s.IsActive)
                .OrderBy(s => s.ExamDate)
                .ThenBy(s => s.StartTime)
                .ToListAsync();

            QuestPDF.Settings.License = LicenseType.Community;

            var pdfBytes = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Portrait());
                    page.Margin(30);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Arial"));

                    // Header
                    page.Header().Column(col =>
                    {
                        col.Item().AlignCenter().Text(t =>
                        {
                            t.Span("COLLEGE MANAGEMENT SYSTEM").FontSize(16).Bold().FontColor(Colors.Green.Darken3);
                        });
                        col.Item().AlignCenter().Text("EXAMINATION HALL TICKET / ADMIT CARD").FontSize(12).Bold().FontColor(Colors.Grey.Darken3);
                        col.Item().PaddingVertical(5).LineHorizontal(1).LineColor(Colors.Green.Darken2);
                    });

                    // Content
                    page.Content().Column(col =>
                    {
                        // Student & Exam Details Box
                        col.Item().Border(1).BorderColor(Colors.Grey.Lighten1).Padding(10).Row(row =>
                        {
                            row.RelativeItem(3).Column(info =>
                            {
                                info.Item().Text(t => { t.Span("Student Name: ").Bold(); t.Span(student.StudentName); });
                                info.Item().Text(t => { t.Span("Roll Number: ").Bold(); t.Span(!string.IsNullOrEmpty(student.RollNo) ? student.RollNo : student.AdmissionNo); });
                                info.Item().Text(t => { t.Span("Admission No: ").Bold(); t.Span(student.AdmissionNo); });
                                info.Item().Text(t => { t.Span("Examination: ").Bold(); t.Span($"{exam.ExamName} ({(string.IsNullOrEmpty(exam.ExamCode) ? exam.ExaminationId.ToString() : exam.ExamCode)})"); });
                            });

                            row.RelativeItem(2).Column(info =>
                            {
                                info.Item().Text(t => { t.Span("Exam Window: ").Bold(); t.Span($"{exam.StartDate:dd-MMM-yyyy} to {exam.EndDate:dd-MMM-yyyy}"); });
                                info.Item().Text(t => { t.Span("Gender: ").Bold(); t.Span(student.Gender); });
                                info.Item().Text(t => { t.Span("Generated On: ").Bold(); t.Span(DateTime.UtcNow.ToString("dd-MMM-yyyy HH:mm")); });
                            });
                        });

                        col.Item().PaddingVertical(10).Text("EXAMINATION TIMETABLE").FontSize(11).Bold().FontColor(Colors.Green.Darken3);

                        // Timetable Table
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.ConstantColumn(35);
                                columns.RelativeColumn(2);
                                columns.RelativeColumn(4);
                                columns.RelativeColumn(3);
                                columns.RelativeColumn(3);
                                columns.RelativeColumn(2);
                            });

                            table.Header(header =>
                            {
                                header.Cell().Background(Colors.Green.Darken3).Padding(5).Text("#").Bold().FontColor(Colors.White);
                                header.Cell().Background(Colors.Green.Darken3).Padding(5).Text("Subject Code").Bold().FontColor(Colors.White);
                                header.Cell().Background(Colors.Green.Darken3).Padding(5).Text("Subject Name").Bold().FontColor(Colors.White);
                                header.Cell().Background(Colors.Green.Darken3).Padding(5).Text("Exam Date").Bold().FontColor(Colors.White);
                                header.Cell().Background(Colors.Green.Darken3).Padding(5).Text("Time").Bold().FontColor(Colors.White);
                                header.Cell().Background(Colors.Green.Darken3).Padding(5).Text("Hall / Room").Bold().FontColor(Colors.White);
                            });

                            int idx = 1;
                            foreach (var s in schedules)
                            {
                                var bg = idx % 2 == 0 ? Colors.Grey.Lighten4 : Colors.White;
                                var subjectName = s.Subject?.SubjectName ?? $"Subject #{s.SubjectId}";
                                var subjectCode = s.Subject?.SubjectCode ?? "-";
                                var hallName = !string.IsNullOrEmpty(s.Hall) ? s.Hall : (s.RoomId.HasValue ? $"Room {s.RoomId}" : "TBA");

                                table.Cell().Background(bg).Padding(5).Text(idx.ToString());
                                table.Cell().Background(bg).Padding(5).Text(subjectCode);
                                table.Cell().Background(bg).Padding(5).Text(subjectName);
                                table.Cell().Background(bg).Padding(5).Text(s.ExamDate.ToString("dd-MMM-yyyy"));
                                table.Cell().Background(bg).Padding(5).Text($"{s.StartTime:HH:mm} - {s.EndTime:HH:mm}");
                                table.Cell().Background(bg).Padding(5).Text(hallName);
                                idx++;
                            }
                        });

                        // Instructions to Candidate
                        col.Item().PaddingTop(15).Text("IMPORTANT INSTRUCTIONS TO CANDIDATES:").Bold().FontSize(9).FontColor(Colors.Red.Darken2);
                        col.Item().PaddingTop(3).Column(inst =>
                        {
                            inst.Item().Text("1. Candidates must carry this Hall Ticket and a valid College Identity Card to the examination hall.");
                            inst.Item().Text("2. Candidates should be seated in the examination hall at least 15 minutes before the commencement of the exam.");
                            inst.Item().Text("3. Electronic devices including mobile phones, smart watches, and programmable calculators are strictly prohibited.");
                            inst.Item().Text("4. Candidates will not be permitted to leave the examination hall until half the time of the examination has elapsed.");
                        });

                        // Signature Section
                        col.Item().PaddingTop(25).Row(sig =>
                        {
                            sig.RelativeItem().Column(c =>
                            {
                                c.Item().PaddingTop(25).LineHorizontal(1).LineColor(Colors.Grey.Medium);
                                c.Item().AlignCenter().Text("Candidate's Signature").FontSize(8);
                            });
                            sig.ConstantItem(50);
                            sig.RelativeItem().Column(c =>
                            {
                                c.Item().PaddingTop(25).LineHorizontal(1).LineColor(Colors.Grey.Medium);
                                c.Item().AlignCenter().Text("Controller of Examinations").FontSize(8).Bold();
                            });
                        });
                    });

                    // Footer
                    page.Footer().AlignCenter().Text(x =>
                    {
                        x.Span("Page ");
                        x.CurrentPageNumber();
                        x.Span(" of ");
                        x.TotalPages();
                        x.Span(" | This is a computer generated document.");
                    });
                });
            }).GeneratePdf();

            return new MemoryStream(pdfBytes);
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
            if (assignments == null) return;
            var list = assignments
                .Where(a => a.invigilatorId > 0)
                .Select(a => new { invigilatorId = a.invigilatorId, hallNumber = a.hallNumber ?? string.Empty })
                .ToList();

            try
            {
                string json = System.Text.Json.JsonSerializer.Serialize(list);
                await Connection.ExecuteAsync(
                    "sp_AssignInvigilatorsBatch",
                    new { p_ExamScheduleId = examScheduleId, p_AssignmentsJson = json },
                    commandType: CommandType.StoredProcedure);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "sp_AssignInvigilatorsBatch failed for Schedule {SchedId}", examScheduleId);
            }
        }

        public async Task<IEnumerable<InvigilatorAssignment>> GetInvigilatorsByScheduleIdAsync(int examScheduleId)
        {
            try
            {
                return await Connection.QueryAsync<InvigilatorAssignment>(
                    "sp_GetInvigilatorsBySchedule",
                    new { p_ExamScheduleId = examScheduleId, p_CampusId = 0 },
                    commandType: CommandType.StoredProcedure);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "sp_GetInvigilatorsBySchedule failed for Schedule {SchedId}", examScheduleId);
                return Enumerable.Empty<InvigilatorAssignment>();
            }
        }

        public async Task<DTOs.Examination.Responses.SchedulingContextResponseDto> GetSchedulingContextAsync(int examinationId)
        {
            var exam = await _context.Examinations
                .FirstOrDefaultAsync(e => e.ExaminationId == examinationId && e.IsActive);

            if (exam == null)
            {
                throw new KeyNotFoundException($"Examination with ID {examinationId} was not found.");
            }

            var sections = await _context.Sections
                .Where(s => s.IsActive && s.GroupId == exam.GroupId)
                .ToListAsync();

            if (exam.BoardId > 0)
            {
                var boardSections = sections.Where(s => s.BoardId == exam.BoardId).ToList();
                if (boardSections.Any()) sections = boardSections;
            }

            var sectionIds = sections.Select(s => s.SectionId).ToList();

            var sectionDtos = new List<DTOs.Examination.Responses.SchedulingSectionContextDto>();
            int totalEligible = 0;

            foreach (var sec in sections)
            {
                int studentCount = await _context.Students
                    .CountAsync(st => st.IsActive && st.SectionId == sec.SectionId);
                totalEligible += studentCount;
                sectionDtos.Add(new DTOs.Examination.Responses.SchedulingSectionContextDto
                {
                    SectionId = sec.SectionId,
                    SectionName = sec.SectionName,
                    EligibleStudentCount = studentCount
                });
            }

            // Fallback if sections had 0 mapped students
            if (totalEligible == 0)
            {
                totalEligible = await _context.Students.CountAsync(st => st.IsActive && st.GroupId == exam.GroupId);
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

        public async Task<string> GenerateUniqueExamCodeAsync(int boardId, int academicYearId, int groupId, int? programId)
        {
            string yearStr = DateTime.UtcNow.Year.ToString();
            try
            {
                var y = await _context.AcademicYears
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.AcademicYearId == academicYearId);

                if (y != null && !string.IsNullOrWhiteSpace(y.AcademicYearName))
                {
                    var match = System.Text.RegularExpressions.Regex.Match(y.AcademicYearName, @"\d{4}");
                    if (match.Success) yearStr = match.Value;
                }
            }
            catch { }

            var nextSeq = await Connection.QueryFirstOrDefaultAsync<int>(
                "sp_GetNextExamCodeSequence",
                new { p_AcademicYear = yearStr },
                commandType: CommandType.StoredProcedure);
            if (nextSeq <= 0) nextSeq = 1;

            return $"EXAM-{yearStr}-{nextSeq:D4}";
        }

        public async Task<IEnumerable<DTOs.Examination.Responses.AvailableHallDto>> GetAvailableHallsFilteredAsync(
            DateOnly examDate,
            TimeOnly startTime,
            TimeOnly endTime,
            int? requiredCapacity = null,
            IEnumerable<int>? sectionIds = null,
            int? excludeScheduleId = null)
        {
            var parameters = new
            {
                p_ExamDate = examDate.ToDateTime(TimeOnly.MinValue),
                p_StartTime = startTime.ToTimeSpan(),
                p_EndTime = endTime.ToTimeSpan(),
                p_RequiredCapacity = requiredCapacity ?? 0,
                p_CampusId = 0,
                p_ExcludeScheduleId = excludeScheduleId ?? 0
            };

            return await Connection.QueryAsync<DTOs.Examination.Responses.AvailableHallDto>(
                "sp_GetAvailableHallsFiltered",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<DTOs.Examination.Responses.AvailableInvigilatorDto>> GetAvailableInvigilatorsFilteredAsync(
            DateOnly examDate,
            TimeOnly startTime,
            TimeOnly endTime,
            IEnumerable<int>? subjectIds = null,
            int? excludeScheduleId = null)
        {
            var list = subjectIds?.ToList() ?? new List<int>();
            string json = list.Any() ? System.Text.Json.JsonSerializer.Serialize(list) : "[]";

            var parameters = new
            {
                p_ExamDate = examDate.ToDateTime(TimeOnly.MinValue),
                p_StartTime = startTime.ToTimeSpan(),
                p_EndTime = endTime.ToTimeSpan(),
                p_SubjectIdsJson = json,
                p_CampusId = 0,
                p_ExcludeScheduleId = excludeScheduleId ?? 0
            };

            return await Connection.QueryAsync<DTOs.Examination.Responses.AvailableInvigilatorDto>(
                "sp_GetAvailableInvigilatorsFiltered",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<ExaminationSettingsDto> GetExaminationSettingsAsync(int campusId)
        {
            try
            {
                var settings = await Connection.QueryFirstOrDefaultAsync<ExaminationSettingsDto>(
                    "sp_GetExaminationSettings",
                    new { p_CampusId = campusId > 0 ? campusId : 1 },
                    commandType: CommandType.StoredProcedure);

                return settings ?? new ExaminationSettingsDto { CampusId = campusId > 0 ? campusId : 1 };
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Failed to get ExaminationSettings for campus {CampusId}", campusId);
                return new ExaminationSettingsDto { CampusId = campusId > 0 ? campusId : 1 };
            }
        }

        public async Task<ExaminationSettingsDto> SaveExaminationSettingsAsync(ExaminationSettingsDto settings)
        {
            var p = new DynamicParameters();
            p.Add("p_CampusId", settings.CampusId > 0 ? settings.CampusId : 1);
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

            var saved = await Connection.QueryFirstOrDefaultAsync<ExaminationSettingsDto>(
                "sp_SaveExaminationSettings",
                p,
                commandType: CommandType.StoredProcedure);

            return saved ?? settings;
        }

        public async Task<IEnumerable<FacultyExamDutyDto>> GetFacultyExamDutiesAsync(
            int? staffId,
            string? status,
            int? campusId,
            int? academicYearId,
            int? boardId)
        {
            var p = new DynamicParameters();
            p.Add("p_StaffId", staffId ?? 0);
            p.Add("p_Status", status ?? string.Empty);
            p.Add("p_CampusId", campusId ?? 0);
            p.Add("p_AcademicYearId", academicYearId ?? 0);
            p.Add("p_BoardId", boardId ?? 0);

            var rows = await Connection.QueryAsync<dynamic>(
                "sp_GetFacultyExamDuties",
                p,
                commandType: CommandType.StoredProcedure);

            var list = new List<FacultyExamDutyDto>();
            foreach (var r in rows)
            {
                DateTime examDt = r.ExamDate != null ? Convert.ToDateTime(r.ExamDate) : DateTime.Today;
                TimeSpan startTime = r.StartTime != null ? (TimeSpan)r.StartTime : TimeSpan.Zero;
                TimeSpan endTime = r.EndTime != null ? (TimeSpan)r.EndTime : TimeSpan.Zero;

                DateTime startDateTime = examDt.Date + startTime;
                DateTime endDateTime = examDt.Date + endTime;

                string startTimeStr = startDateTime.ToString("hh:mm tt");
                string endTimeStr = endDateTime.ToString("hh:mm tt");
                string examHours = $"{startTimeStr} – {endTimeStr}";

                var repTime = startDateTime.AddMinutes(-30);
                string repTimeStr = $"{repTime.ToString("hh:mm tt")} (Mandatory 30 mins prior)";

                string examCat = ((string)(r.ExamCategory ?? "")).ToLowerInvariant();
                if (examCat.Contains("board") || examCat.Contains("ipe")) examCat = "board";
                else if (examCat.Contains("prac")) examCat = "practical";
                else examCat = "internal";

                string sessionId = (string)(r.SessionId ?? "");
                string session = !string.IsNullOrWhiteSpace(sessionId)
                    ? sessionId
                    : (startTime.Hours < 12 ? "Morning Session" : "Afternoon Session");

                list.Add(new FacultyExamDutyDto
                {
                    Id = (int)r.DutyId,
                    ExamScheduleId = (int)r.ExamScheduleId,
                    ExaminationId = (int)r.ExaminationId,
                    ExamName = (string)(r.ExamName ?? $"Exam #{r.ExaminationId}"),
                    ExamCode = (string)(r.ExamCode ?? $"EXAM-{r.ExaminationId}"),
                    Category = examCat,
                    ExamType = (string)(r.ExamPattern ?? "Board Theory"),
                    Role = "Invigilator",
                    Status = (string)(r.Status ?? "Upcoming"),
                    Subject = $"{(string)(r.SubjectName ?? "Examination")} ({((string)(r.SubjectCode ?? "")).Trim()})",
                    SubjectCode = (string)(r.SubjectCode ?? ""),
                    Date = examDt.ToString("dd MMM yyyy"),
                    ExamDate = examDt.ToString("yyyy-MM-dd"),
                    Session = session,
                    ExamHours = examHours,
                    StartTime = startTimeStr,
                    EndTime = endTimeStr,
                    Venue = !string.IsNullOrWhiteSpace((string)(r.Hall ?? "")) ? (string)r.Hall : "Examination Hall",
                    Invigilator = (string)(r.FacultyName ?? "Invigilator"),
                    InvigilatorId = r.StaffId != null ? (int)r.StaffId : null,
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

            return list;
        }

        public async Task<IEnumerable<Examination>> GetScheduledExamsReadyForCompletionAsync()
        {
            return await _context.Examinations
                .Include(e => e.ExamSchedules.Where(s => s.IsActive))
                .Where(e => e.IsActive && e.Status.ToUpper() == "SCHEDULED" && e.ExamSchedules.Any(s => s.IsActive))
                .ToListAsync();
        }

        #endregion
    }
}