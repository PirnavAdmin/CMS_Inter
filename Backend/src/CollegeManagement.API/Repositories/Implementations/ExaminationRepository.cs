using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Examination.Requests;
using CollegeManagement.API.DTOs.Examination.Responses;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class ExaminationRepository : IExaminationRepository
    {
        private readonly AppDbContext _context;

        public ExaminationRepository(AppDbContext context)
        {
            _context = context;
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

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                // 2. Concurrency-safe atomic sequence retrieval guarded by SemaphoreSlim + DB Sequence Table
                int nextSeq;
                await _seqLock.WaitAsync();
                try
                {
                    var seqRecord = await _context.ExamCodeSequences
                        .FirstOrDefaultAsync(s => s.AcademicYear == yearStr);

                    if (seqRecord == null)
                    {
                        // Align with existing records in DB
                        var maxExisting = await _context.Examinations
                            .AsNoTracking()
                            .Where(e => e.ExamCode != null && e.ExamCode.StartsWith($"EXAM-{yearStr}-"))
                            .Select(e => e.ExamCode)
                            .ToListAsync();

                        int maxSeq = 0;
                        foreach (var code in maxExisting)
                        {
                            if (!string.IsNullOrWhiteSpace(code))
                            {
                                var parts = code.Split('-');
                                if (parts.Length >= 3 && int.TryParse(parts[parts.Length - 1], out int parsed))
                                {
                                    if (parsed > maxSeq) maxSeq = parsed;
                                }
                            }
                        }

                        nextSeq = maxSeq + 1;
                        var newSeq = new ExamCodeSequence
                        {
                            AcademicYear = yearStr,
                            LastSequence = nextSeq,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _context.ExamCodeSequences.Add(newSeq);
                        await _context.SaveChangesAsync();
                    }
                    else
                    {
                        seqRecord.LastSequence += 1;
                        seqRecord.UpdatedAt = DateTime.UtcNow;
                        nextSeq = seqRecord.LastSequence;
                        await _context.SaveChangesAsync();
                    }
                }
                finally
                {
                    _seqLock.Release();
                }

                // 3. Format: EXAM-{academicYear}-{sequence:D4} (e.g. EXAM-2026-0001)
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

                var newId = await Connection.ExecuteScalarAsync<int>(
                    "sp_CreateExamination",
                    p,
                    commandType: CommandType.StoredProcedure);

                examination.ExaminationId = newId;
                return examination;
            });
        }

        public async Task<Examination?> GetExaminationByIdAsync(int examinationId)
        {
            var p = new DynamicParameters();
            p.Add("p_ExaminationId", examinationId);

            var row = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_GetExaminationById",
                p,
                commandType: CommandType.StoredProcedure);

            if (row == null) return null;

            var exam = new Examination
            {
                ExaminationId = (int)row.ExamId,
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

            var schedules = await Connection.QueryAsync<ExamSchedule, Subject, ExamSchedule>(
                "sp_GetExamSchedulesByExamination",
                (schedule, subject) =>
                {
                    schedule.Subject = subject;
                    return schedule;
                },
                p,
                splitOn: "SubjectName",
                commandType: CommandType.StoredProcedure);

            exam.ExamSchedules = schedules.ToList();

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

            var rows = await Connection.QueryAsync<dynamic>(
                "sp_GetExaminations",
                p,
                commandType: CommandType.StoredProcedure);

            return rows.Select(row => new Examination
            {
                ExaminationId = (int)row.ExamId,
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

            await Connection.ExecuteAsync(
                "sp_UpdateExamination",
                p,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> DeleteExaminationAsync(Examination examination)
        {
            var rows = await Connection.ExecuteAsync(
                "sp_DeleteExamination",
                new { p_ExamId = examination.ExaminationId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        #endregion

        #region Exam Schedule Methods

        public async Task<ExamSchedule> CreateExamScheduleAsync(ExamSchedule schedule)
        {
            if (string.IsNullOrWhiteSpace(schedule.Invigilator) && schedule.InvigilatorId.HasValue && schedule.InvigilatorId.Value > 0)
            {
                var fac = await _context.Faculties.AsNoTracking().FirstOrDefaultAsync(f => f.Id == schedule.InvigilatorId.Value);
                if (fac != null)
                {
                    schedule.Invigilator = $"{fac.FirstName} {fac.LastName}".Trim();
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

            var newId = await Connection.ExecuteScalarAsync<int>(
                "sp_CreateExamSchedule",
                p,
                commandType: CommandType.StoredProcedure);

            schedule.ExamScheduleId = newId;
            return schedule;
        }

        public async Task<ExamSchedule?> GetExamScheduleByIdAsync(int examScheduleId)
        {
            var p = new DynamicParameters();
            p.Add("p_ExamScheduleId", examScheduleId);

            var results = await Connection.QueryAsync<ExamSchedule, Subject, ExamSchedule>(
                "sp_GetExamScheduleById",
                (schedule, subject) =>
                {
                    schedule.Subject = subject;
                    return schedule;
                },
                p,
                splitOn: "SubjectName",
                commandType: CommandType.StoredProcedure);

            return results.FirstOrDefault();
        }

        public async Task<IEnumerable<ExamSchedule>> GetExamSchedulesAsync(int? examinationId)
        {
            var p = new DynamicParameters();
            p.Add("p_ExaminationId", examinationId ?? 0);

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

            return results;
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

            await Connection.ExecuteAsync(
                "sp_UpdateExamSchedule",
                p,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> DeleteExamScheduleAsync(ExamSchedule schedule)
        {
            var rows = await Connection.ExecuteAsync(
                "sp_DeleteExamSchedule",
                new { p_ScheduleId = schedule.ExamScheduleId },
                commandType: CommandType.StoredProcedure);
            return rows > 0;
        }

        public async Task<int> PublishExamSchedulesAsync(IEnumerable<int> scheduleIds)
        {
            var idsStr = string.Join(",", scheduleIds);
            return await Connection.ExecuteAsync(
                "sp_PublishExamSchedules",
                new { p_ScheduleIds = idsStr },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<Subject>> GetEligibleSubjectsForExamAsync(int examinationId)
        {
            var subjects = await Connection.QueryAsync<Subject>(
                "sp_GetEligibleSubjectsForExam",
                new { p_ExaminationId = examinationId },
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
                    p_Hall = hall,
                    p_ExcludeScheduleId = excludeScheduleId ?? 0
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
                    p_Invigilator = invigilator,
                    p_ExcludeScheduleId = excludeScheduleId ?? 0
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
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
            foreach (var id in invigilatorIds)
            {
                await Connection.ExecuteAsync(
                    "sp_AssignInvigilator",
                    new
                    {
                        p_ExamScheduleId = examScheduleId,
                        p_InvigilatorId = id,
                        p_HallNumber = hallNumber ?? string.Empty
                    },
                    commandType: CommandType.StoredProcedure);
            }
        }

        public async Task<IEnumerable<InvigilatorAssignment>> GetInvigilatorsByScheduleIdAsync(int examScheduleId)
        {
            return await Connection.QueryAsync<InvigilatorAssignment>(
                "sp_GetInvigilatorsBySchedule",
                new { p_ExamScheduleId = examScheduleId },
                commandType: CommandType.StoredProcedure);
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

            var seqRecord = await _context.ExamCodeSequences
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.AcademicYear == yearStr);

            int seq = (seqRecord?.LastSequence ?? 0) + 1;
            return $"EXAM-{yearStr}-{seq:D4}";
        }

        public async Task<IEnumerable<DTOs.Examination.Responses.AvailableHallDto>> GetAvailableHallsFilteredAsync(
            DateOnly examDate,
            TimeOnly startTime,
            TimeOnly endTime,
            int? requiredCapacity = null,
            IEnumerable<int>? sectionIds = null,
            int? excludeScheduleId = null)
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

            var result = new List<DTOs.Examination.Responses.AvailableHallDto>();

            foreach (var r in allRooms)
            {
                bool isBooked = bookedRoomIds.Contains(r.RoomId) ||
                                bookedHalls.Contains(r.RoomNumber.Trim().ToLower()) ||
                                (!string.IsNullOrWhiteSpace(r.RoomName) && bookedHalls.Contains(r.RoomName.Trim().ToLower()));

                bool capacityOk = !requiredCapacity.HasValue || requiredCapacity.Value <= 0 || r.Capacity >= requiredCapacity.Value;

                if (!isBooked && capacityOk)
                {
                    result.Add(new DTOs.Examination.Responses.AvailableHallDto
                    {
                        RoomId = r.RoomId,
                        RoomCode = r.RoomNumber,
                        RoomName = !string.IsNullOrWhiteSpace(r.RoomName) ? r.RoomName : $"Room {r.RoomNumber}",
                        BlockName = r.BlockName,
                        Floor = r.Floor,
                        Capacity = r.Capacity,
                        RoomType = !string.IsNullOrWhiteSpace(r.RoomType) ? r.RoomType : "Classroom",
                        IsActive = r.IsActive,
                        IsAvailable = true
                    });
                }
            }

            return result;
        }

        public async Task<IEnumerable<DTOs.Examination.Responses.AvailableInvigilatorDto>> GetAvailableInvigilatorsFilteredAsync(
            DateOnly examDate,
            TimeOnly startTime,
            TimeOnly endTime,
            IEnumerable<int>? subjectIds = null,
            int? excludeScheduleId = null)
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

            var subjectIdList = subjectIds?.ToList() ?? new List<int>();

            // Find Subject Faculty (teachers of the scheduled subjects)
            var subjectFacultyIds = new HashSet<int>();
            if (subjectIdList.Any())
            {
                var allocations = await _context.StaffSubjectAllocations
                    .Where(a => subjectIdList.Contains(a.SubjectId))
                    .Select(a => a.StaffId)
                    .ToListAsync();
                foreach (var id in allocations) subjectFacultyIds.Add(id);
            }

            var allFaculty = await _context.Faculties
                .Include(f => f.DesignationRef)
                .Where(f => !f.IsDeleted && f.Status == "Active")
                .OrderBy(f => f.FirstName)
                .ThenBy(f => f.LastName)
                .ToListAsync();

            var result = new List<DTOs.Examination.Responses.AvailableInvigilatorDto>();

            foreach (var f in allFaculty)
            {
                string fullName = $"{f.FirstName} {f.LastName}".Trim();
                bool isBooked = bookedInvigilatorIds.Contains(f.Id) ||
                                bookedInvigilatorNames.Contains(fullName.ToLower()) ||
                                bookedInvigilatorNames.Contains(f.FirstName.Trim().ToLower());

                bool isSubjectFaculty = subjectFacultyIds.Contains(f.Id);

                if (!isBooked && !isSubjectFaculty)
                {
                    result.Add(new DTOs.Examination.Responses.AvailableInvigilatorDto
                    {
                        FacultyId = f.Id,
                        EmployeeId = !string.IsNullOrWhiteSpace(f.EmployeeId) ? f.EmployeeId : $"EMP-{f.Id:D3}",
                        FacultyName = fullName,
                        Designation = f.DesignationRef?.DesignationName ?? "Lecturer",
                        FacultyType = "TEACHING",
                        IsActive = true,
                        IsAvailable = true
                    });
                }
            }

            return result;
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