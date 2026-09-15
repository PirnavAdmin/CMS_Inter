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

                // 4. Save Examination record inside database transaction
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    _context.Examinations.Add(examination);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return examination;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<Examination?> GetExaminationByIdAsync(int examinationId)
        {
            return await _context.Examinations
                .Include(e => e.Board)
                .Include(e => e.AcademicYear)
                .Include(e => e.AcademicLevel)
                .Include(e => e.Group)
                .Include(e => e.Program)
                .Include(e => e.AssessmentType)
                .Include(e => e.ExamSchedules.Where(s => s.IsActive))
                    .ThenInclude(s => s.Subject)
                .FirstOrDefaultAsync(e => e.ExaminationId == examinationId);
        }

        public async Task<IEnumerable<Examination>> GetExaminationsAsync(ExaminationSearchRequestDto filter)
        {
            var query = _context.Examinations
                .AsNoTracking()
                .AsSplitQuery()
                .Include(e => e.Board)
                .Include(e => e.AcademicYear)
                .Include(e => e.AcademicLevel)
                .Include(e => e.Group)
                .Include(e => e.Program)
                .Include(e => e.AssessmentType)
                .Include(e => e.ExamSchedules.Where(s => s.IsActive))
                    .ThenInclude(s => s.Subject)
                .Where(e => e.IsActive)
                .AsQueryable();

            if (filter.BoardId.HasValue && filter.BoardId.Value > 0)
                query = query.Where(e => e.BoardId == filter.BoardId.Value);

            if (filter.AcademicYearId.HasValue && filter.AcademicYearId.Value > 0)
                query = query.Where(e => e.AcademicYearId == filter.AcademicYearId.Value);

            if (filter.AcademicLevelId.HasValue && filter.AcademicLevelId.Value > 0)
                query = query.Where(e => e.AcademicLevelId == filter.AcademicLevelId.Value);

            if (filter.GroupId.HasValue && filter.GroupId.Value > 0)
                query = query.Where(e => e.GroupId == filter.GroupId.Value);

            if (filter.ProgramId.HasValue && filter.ProgramId.Value > 0)
                query = query.Where(e => e.ProgramId == filter.ProgramId.Value);

            if (filter.AssessmentTypeId.HasValue && filter.AssessmentTypeId.Value > 0)
                query = query.Where(e => e.AssessmentTypeId == filter.AssessmentTypeId.Value);

            if (!string.IsNullOrWhiteSpace(filter.ExamType))
                query = query.Where(e => e.AssessmentType != null && e.AssessmentType.AssessmentTypeName.ToLower().Contains(filter.ExamType.ToLower()));

            if (!string.IsNullOrWhiteSpace(filter.Status))
                query = query.Where(e => e.Status.ToLower() == filter.Status.ToLower());

            if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var search = filter.SearchTerm.Trim().ToLower();
                query = query.Where(e =>
                    e.ExamName.ToLower().Contains(search) ||
                    (e.ExamCode != null && e.ExamCode.ToLower().Contains(search)) ||
                    (e.Group != null && e.Group.GroupName.ToLower().Contains(search)) ||
                    (e.Program != null && e.Program.ProgramName.ToLower().Contains(search)));
            }

            return await query.OrderByDescending(e => e.ExaminationId).ToListAsync();
        }

        public async Task<IEnumerable<ExaminationResponse>> GetExaminationResponsesAsync(ExaminationSearchRequestDto filter)
        {
            // 1. Try Stored Procedure sp_GetExaminations with parameters
            try
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

                var spResults = await Connection.QueryAsync<ExaminationResponse>(
                    "sp_GetExaminations",
                    p,
                    commandType: CommandType.StoredProcedure);

                if (spResults != null && spResults.Any())
                {
                    return spResults.ToList();
                }
            }
            catch
            {
                // If sp_GetExaminations in DB has 0 parameters, try calling without parameters
                try
                {
                    var spResults = await Connection.QueryAsync<ExaminationResponse>(
                        "sp_GetExaminations",
                        commandType: CommandType.StoredProcedure);

                    if (spResults != null && spResults.Any())
                    {
                        var filtered = spResults.AsEnumerable();
                        if (filter.BoardId.HasValue && filter.BoardId > 0)
                            filtered = filtered.Where(x => x.BoardId == filter.BoardId.Value);
                        if (filter.AcademicYearId.HasValue && filter.AcademicYearId > 0)
                            filtered = filtered.Where(x => x.AcademicYearId == filter.AcademicYearId.Value);
                        if (filter.AcademicLevelId.HasValue && filter.AcademicLevelId > 0)
                            filtered = filtered.Where(x => x.AcademicLevelId == filter.AcademicLevelId.Value);
                        if (filter.GroupId.HasValue && filter.GroupId > 0)
                            filtered = filtered.Where(x => x.GroupId == filter.GroupId.Value);
                        if (filter.ProgramId.HasValue && filter.ProgramId > 0)
                            filtered = filtered.Where(x => x.ProgramId == filter.ProgramId.Value);
                        if (filter.AssessmentTypeId.HasValue && filter.AssessmentTypeId > 0)
                            filtered = filtered.Where(x => x.AssessmentTypeId == filter.AssessmentTypeId.Value);
                        if (!string.IsNullOrWhiteSpace(filter.Status))
                            filtered = filtered.Where(x => string.Equals(x.Status, filter.Status, StringComparison.OrdinalIgnoreCase));
                        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                        {
                            var s = filter.SearchTerm.Trim().ToLower();
                            filtered = filtered.Where(x => (x.ExamName != null && x.ExamName.ToLower().Contains(s)) ||
                                                           (x.ExamCode != null && x.ExamCode.ToLower().Contains(s)) ||
                                                           (x.GroupName != null && x.GroupName.ToLower().Contains(s)) ||
                                                           (x.ProgramName != null && x.ProgramName.ToLower().Contains(s)));
                        }
                        return filtered.ToList();
                    }
                }
                catch
                {
                    // Fallback to EF Core below
                }
            }

            // 2. Fallback to EF Core with pre-aggregated counts (eliminates N+1 queries)
            var exams = await GetExaminationsAsync(filter);

            var subjectCounts = await _context.Subjects
                .AsNoTracking()
                .Where(s => s.IsActive)
                .GroupBy(s => new { s.BoardId, s.AcademicLevelId, s.GroupId })
                .Select(g => new { g.Key.BoardId, g.Key.AcademicLevelId, g.Key.GroupId, Count = g.Count() })
                .ToListAsync();

            var countDict = subjectCounts.ToDictionary(
                x => (x.BoardId, x.AcademicLevelId, x.GroupId),
                x => x.Count);

            var resultList = new List<ExaminationResponse>();
            foreach (var exam in exams)
            {
                var resp = new ExaminationResponse
                {
                    ExaminationId = exam.ExaminationId,
                    ExamCode = exam.ExamCode ?? string.Empty,
                    ExamName = exam.ExamName,
                    BoardId = exam.BoardId,
                    BoardName = exam.Board?.BoardName ?? string.Empty,
                    AcademicYearId = exam.AcademicYearId,
                    AcademicYear = exam.AcademicYear?.AcademicYearName ?? string.Empty,
                    AcademicLevelId = exam.AcademicLevelId,
                    AcademicLevel = exam.AcademicLevel?.LevelName ?? string.Empty,
                    GroupId = exam.GroupId,
                    GroupName = exam.Group?.GroupName ?? string.Empty,
                    ProgramId = exam.ProgramId,
                    ProgramName = exam.Program?.ProgramName ?? "All Programs",
                    AssessmentTypeId = exam.AssessmentTypeId,
                    ExamType = exam.AssessmentType?.AssessmentTypeName ?? string.Empty,
                    ExamPattern = !string.IsNullOrEmpty(exam.ExamPattern) ? exam.ExamPattern : "REGULAR_ACADEMIC",
                    StartDate = exam.StartDate,
                    EndDate = exam.EndDate,
                    TotalMarks = exam.TotalMarks,
                    PassPercentage = exam.PassPercentage,
                    Description = exam.Description,
                    Status = exam.Status,
                    TotalEligibleSubjects = countDict.GetValueOrDefault((exam.BoardId, exam.AcademicLevelId, exam.GroupId), 0),
                    ScheduledSubjectsCount = exam.ExamSchedules?.Count(s => s.IsActive) ?? 0,
                    CreatedAt = exam.CreatedAt,
                    UpdatedAt = exam.UpdatedAt,
                    Schedules = exam.ExamSchedules?.Select(s => new ExamScheduleResponse
                    {
                        ExamScheduleId = s.ExamScheduleId,
                        ExaminationId = s.ExaminationId,
                        SubjectId = s.SubjectId,
                        SubjectName = s.Subject?.SubjectName ?? string.Empty,
                        SubjectCode = s.Subject?.SubjectCode ?? string.Empty,
                        ExamDate = s.ExamDate,
                        StartTime = s.StartTime,
                        EndTime = s.EndTime,
                        Hall = s.Hall ?? string.Empty,
                        Status = s.IsActive ? "Scheduled" : "Cancelled"
                    }).ToList() ?? new List<ExamScheduleResponse>()
                };
                resultList.Add(resp);
            }

            return resultList;
        }

        public async Task UpdateExaminationAsync(Examination examination)
        {
            examination.UpdatedAt = DateTime.UtcNow;
            _context.Examinations.Update(examination);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> DeleteExaminationAsync(Examination examination)
        {
            // Perform soft delete
            examination.IsActive = false;
            examination.UpdatedAt = DateTime.UtcNow;
            _context.Examinations.Update(examination);
            return await _context.SaveChangesAsync() > 0;
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
                    schedule.Hall = !string.IsNullOrWhiteSpace(rm.RoomNumber) ? rm.RoomNumber : rm.RoomName;
                }
            }

            try
            {
                var newId = await Connection.ExecuteScalarAsync<int>(
                    "sp_CreateExamSchedule",
                    new
                    {
                        p_ExamId = schedule.ExaminationId,
                        p_SubjectId = schedule.SubjectId,
                        p_ExamDate = schedule.ExamDate.ToDateTime(TimeOnly.MinValue),
                        p_StartTime = schedule.StartTime.ToTimeSpan(),
                        p_EndTime = schedule.EndTime.ToTimeSpan(),
                        p_SessionId = schedule.SessionId,
                        p_ScheduleMode = schedule.ScheduleMode,
                        p_RoomId = schedule.RoomId,
                        p_InvigilatorId = schedule.InvigilatorId,
                        p_Hall = schedule.Hall,
                        p_Invigilator = schedule.Invigilator,
                        p_ExamMode = schedule.ExamMode,
                        p_MaxMarks = schedule.MaxMarks,
                        p_PassingMarks = schedule.PassingMarks
                    },
                    commandType: CommandType.StoredProcedure);

                if (newId > 0)
                {
                    schedule.ExamScheduleId = newId;
                    return schedule;
                }
            }
            catch
            {
                // Fallback to EF Core if SP has not yet been executed in database
            }

            schedule.CreatedAt = DateTime.UtcNow;
            _context.ExamSchedules.Add(schedule);
            await _context.SaveChangesAsync();
            return schedule;
        }

        public async Task<ExamSchedule?> GetExamScheduleByIdAsync(int examScheduleId)
        {
            return await _context.ExamSchedules
                .AsNoTracking()
                .Include(s => s.Examination)
                .Include(s => s.Subject)
                .FirstOrDefaultAsync(s => s.ExamScheduleId == examScheduleId);
        }

        public async Task<IEnumerable<ExamSchedule>> GetExamSchedulesAsync(int? examinationId)
        {
            var query = _context.ExamSchedules
                .AsNoTracking()
                .Include(s => s.Examination)
                .Include(s => s.Subject)
                .Where(s => s.IsActive)
                .AsQueryable();

            if (examinationId.HasValue)
            {
                query = query.Where(s => s.ExaminationId == examinationId.Value);
            }

            return await query.OrderBy(s => s.ExamDate).ThenBy(s => s.StartTime).ToListAsync();
        }

        public async Task UpdateExamScheduleAsync(ExamSchedule schedule)
        {
            schedule.UpdatedAt = DateTime.UtcNow;
            _context.ExamSchedules.Update(schedule);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> DeleteExamScheduleAsync(ExamSchedule schedule)
        {
            schedule.IsActive = false;
            schedule.UpdatedAt = DateTime.UtcNow;
            _context.ExamSchedules.Update(schedule);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<int> PublishExamSchedulesAsync(IEnumerable<int> scheduleIds)
        {
            var schedules = await _context.ExamSchedules
                .Where(s => scheduleIds.Contains(s.ExamScheduleId))
                .ToListAsync();

            foreach (var schedule in schedules)
            {
                schedule.IsActive = true;
                schedule.UpdatedAt = DateTime.UtcNow;
            }

            return await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Subject>> GetEligibleSubjectsForExamAsync(int examinationId)
        {
            try
            {
                var spSubjects = await Connection.QueryAsync<Subject>(
                    "sp_GetEligibleSubjectsForExam",
                    new { p_ExaminationId = examinationId },
                    commandType: CommandType.StoredProcedure);

                if (spSubjects != null && spSubjects.Any())
                {
                    return spSubjects;
                }
            }
            catch
            {
                // Fallback to EF Core if SP does not exist yet
            }

            var exam = await _context.Examinations
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.ExaminationId == examinationId);
            if (exam == null) return Enumerable.Empty<Subject>();

            return await _context.Subjects
                .AsNoTracking()
                .Where(s => s.IsActive
                    && s.BoardId == exam.BoardId
                    && s.AcademicLevelId == exam.AcademicLevelId
                    && s.GroupId == exam.GroupId)
                .OrderBy(s => s.SubjectName)
                .ToListAsync();
        }

        public async Task<bool> HasRoomConflictAsync(DateOnly examDate, TimeOnly startTime, TimeOnly endTime, string hall, int? excludeScheduleId = null)
        {
            if (string.IsNullOrWhiteSpace(hall)) return false;

            return await _context.ExamSchedules
                .AnyAsync(s => s.IsActive
                    && s.ExamDate == examDate
                    && s.Hall.ToLower() == hall.Trim().ToLower()
                    && (!excludeScheduleId.HasValue || s.ExamScheduleId != excludeScheduleId.Value)
                    && !(endTime <= s.StartTime || startTime >= s.EndTime));
        }

        public async Task<bool> HasInvigilatorConflictAsync(DateOnly examDate, TimeOnly startTime, TimeOnly endTime, string invigilator, int? excludeScheduleId = null)
        {
            if (string.IsNullOrWhiteSpace(invigilator)) return false;

            return await _context.ExamSchedules
                .AnyAsync(s => s.IsActive
                    && s.ExamDate == examDate
                    && s.Invigilator.ToLower() == invigilator.Trim().ToLower()
                    && (!excludeScheduleId.HasValue || s.ExamScheduleId != excludeScheduleId.Value)
                    && !(endTime <= s.StartTime || startTime >= s.EndTime));
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

        #endregion

        #region Hall Ticket Methods
        public async Task<IEnumerable<HallTicket>> GenerateHallTicketsAsync(int examinationId, int batchId)
        {
            var existingTickets = await _context.HallTickets
                .Where(h => h.ExaminationId == examinationId && h.BatchId == batchId)
                .ToListAsync();

            if (existingTickets.Any())
            {
                return existingTickets;
            }

            var users = await _context.Users.ToListAsync();

            var newTickets = users.Select(u => new HallTicket
            {
                ExaminationId = examinationId,
                StudentId = u.UserId,
                BatchId = batchId,
                GeneratedAt = DateTime.UtcNow
            }).ToList();

            _context.HallTickets.AddRange(newTickets);
            await _context.SaveChangesAsync();

            return newTickets;
        }





        public async Task<Stream?> GetHallTicketPdfStreamAsync(int studentId, int examinationId)
        {
            var ticket = await _context.HallTickets
                .FirstOrDefaultAsync(h => h.StudentId == studentId && h.ExaminationId == examinationId);

            if (ticket == null) return null;

            return new MemoryStream();
        }

        #endregion

        #region Invigilator Methods

        public async Task AssignInvigilatorsAsync(int examScheduleId, IEnumerable<int> invigilatorIds, string hallNumber)
        {
            var assignments = invigilatorIds.Select(id => new InvigilatorAssignment
            {
                ExamScheduleId = examScheduleId,
                InvigilatorId = id,
                HallNumber = hallNumber,
                AssignedAt = DateTime.UtcNow
            });

            _context.InvigilatorAssignments.AddRange(assignments);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<InvigilatorAssignment>> GetInvigilatorsByScheduleIdAsync(int examScheduleId)
        {
            return await _context.InvigilatorAssignments
                .Include(i => i.Invigilator)
                .Where(i => i.ExamScheduleId == examScheduleId)
                .ToListAsync();
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