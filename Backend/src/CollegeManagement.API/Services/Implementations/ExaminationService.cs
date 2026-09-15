using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.DTOs.Examination.Requests;
using CollegeManagement.API.DTOs.Examination.Responses;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;

namespace CollegeManagement.API.Services.Implementations
{
    public class ExaminationService : IExaminationService
    {
        private readonly IExaminationRepository _examinationRepository;
        private readonly IMapper _mapper;
        private readonly IMemoryCache _memoryCache;

        public ExaminationService(
            IExaminationRepository examinationRepository,
            IMapper mapper,
            IMemoryCache memoryCache)
        {
            _examinationRepository = examinationRepository;
            _mapper = mapper;
            _memoryCache = memoryCache;
        }

        private void EvictExamCache(int? examinationId)
        {
            if (examinationId.HasValue && examinationId.Value > 0)
            {
                _memoryCache.Remove($"exam:details:{examinationId.Value}");
                _memoryCache.Remove($"exam:schedules:{examinationId.Value}");
                _memoryCache.Remove($"exam:eligible-subjects:{examinationId.Value}");
            }
        }

        private static int ResolveAssessmentTypeId(int assessmentTypeId, string? examType, string? examCategory)
        {
            if (assessmentTypeId > 0) return assessmentTypeId;

            var typeStr = !string.IsNullOrWhiteSpace(examType) ? examType : examCategory;
            if (string.IsNullOrWhiteSpace(typeStr)) return 1;

            if (int.TryParse(typeStr, out int parsed) && parsed > 0) return parsed;

            var lower = typeStr.ToLowerInvariant();
            if (lower.Contains("quarter")) return 2;
            if (lower.Contains("half")) return 3;
            if (lower.Contains("pre-final") || lower.Contains("prefinal")) return 4;
            if (lower.Contains("annual") || lower.Contains("board") || lower.Contains("final")) return 5;

            return 1; // Unit Test / Default
        }

        #region Examination Implementations

        public async Task<ExaminationResponse> CreateExaminationAsync(CreateExaminationRequest request)
        {
            if (request.EndDate < request.StartDate)
            {
                throw new ValidationException("End Date cannot be earlier than Start Date.");
            }

            if (request.BoardId <= 0)
            {
                throw new ValidationException("A valid Board is required.");
            }

            if (request.AcademicYearId <= 0)
            {
                throw new ValidationException("A valid Academic Year is required.");
            }

            var resolvedLevelId = request.AcademicLevelId > 0
                ? request.AcademicLevelId
                : (request.AcademicLevelIds != null && request.AcademicLevelIds.Count > 0 ? request.AcademicLevelIds[0] : 0);

            if (resolvedLevelId <= 0)
            {
                throw new ValidationException("At least one Academic Level is required.");
            }

            var resolvedGroupId = request.GroupId > 0
                ? request.GroupId
                : (request.GroupIds != null && request.GroupIds.Count > 0 ? request.GroupIds[0] : 0);

            if (resolvedGroupId <= 0)
            {
                throw new ValidationException("At least one Group is required.");
            }

            int? resolvedProgramId = (request.ProgramId.HasValue && request.ProgramId.Value > 0)
                ? request.ProgramId.Value
                : (request.ProgramIds != null && request.ProgramIds.Count > 0 && request.ProgramIds[0] > 0 ? request.ProgramIds[0] : null);

            var resolvedAssessmentTypeId = ResolveAssessmentTypeId(request.AssessmentTypeId, request.ExamType, request.ExamCategory);

            var exam = _mapper.Map<Examination>(request);
            exam.AcademicLevelId = resolvedLevelId;
            exam.GroupId = resolvedGroupId;
            exam.ProgramId = resolvedProgramId;
            exam.AssessmentTypeId = resolvedAssessmentTypeId;

            var createdExam = await _examinationRepository.CreateExaminationAsync(exam);

            var fullyLoadedExam = await _examinationRepository.GetExaminationByIdAsync(createdExam.ExaminationId);
            if (fullyLoadedExam == null)
            {
                throw new InvalidOperationException("Unable to retrieve created examination.");
            }

            var response = _mapper.Map<ExaminationResponse>(fullyLoadedExam);
            var eligibleSubjects = await _examinationRepository.GetEligibleSubjectsForExamAsync(fullyLoadedExam.ExaminationId);
            response.TotalEligibleSubjects = eligibleSubjects.Count();
            response.ScheduledSubjectsCount = fullyLoadedExam.ExamSchedules?.Count(s => s.IsActive) ?? 0;

            EvictExamCache(createdExam.ExaminationId);
            return response;
        }

        public async Task<ExaminationResponse?> GetExaminationByIdAsync(int examinationId)
        {
            var cacheKey = $"exam:details:{examinationId}";
            if (_memoryCache.TryGetValue(cacheKey, out ExaminationResponse? cachedResponse) && cachedResponse != null)
            {
                return cachedResponse;
            }

            var exam = await _examinationRepository.GetExaminationByIdAsync(examinationId);
            if (exam == null) return null;

            var response = _mapper.Map<ExaminationResponse>(exam);
            var eligibleSubjects = await _examinationRepository.GetEligibleSubjectsForExamAsync(examinationId);
            response.TotalEligibleSubjects = eligibleSubjects.Count();
            response.ScheduledSubjectsCount = exam.ExamSchedules?.Count(s => s.IsActive) ?? 0;

            _memoryCache.Set(cacheKey, response, TimeSpan.FromMinutes(10));
            return response;
        }

        public async Task<IEnumerable<ExaminationResponse>> GetExaminationsAsync(ExaminationSearchRequestDto filter)
        {
            return await _examinationRepository.GetExaminationResponsesAsync(filter);
        }

        public async Task<ExaminationResponse?> UpdateExaminationAsync(int examinationId, UpdateExaminationRequest request)
        {
            var exam = await _examinationRepository.GetExaminationByIdAsync(examinationId);
            if (exam == null) return null;

            var targetStartDate = request.StartDate ?? exam.StartDate;
            var targetEndDate = request.EndDate ?? exam.EndDate;

            if (targetEndDate < targetStartDate)
            {
                throw new ValidationException("End Date cannot be earlier than Start Date.");
            }

            // Check if any existing active scheduled subjects fall outside the new date range
            if (exam.ExamSchedules != null && exam.ExamSchedules.Any(s => s.IsActive))
            {
                var outOfRange = exam.ExamSchedules
                    .Where(s => s.IsActive && (s.ExamDate < targetStartDate || s.ExamDate > targetEndDate))
                    .ToList();

                if (outOfRange.Any())
                {
                    var conflicts = string.Join(", ", outOfRange.Select(s => $"'{s.Subject?.SubjectName ?? "Subject"}' ({s.ExamDate:yyyy-MM-dd})"));
                    throw new ValidationException($"Cannot update examination period to {targetStartDate:yyyy-MM-dd} - {targetEndDate:yyyy-MM-dd}. Existing scheduled subject(s) fall outside this window: {conflicts}. Please reschedule or remove those subjects first.");
                }
            }

            if (!string.IsNullOrWhiteSpace(request.ExamName)) exam.ExamName = request.ExamName;
            if (!string.IsNullOrWhiteSpace(request.ExamCode)) exam.ExamCode = request.ExamCode;
            if (request.BoardId.HasValue && request.BoardId.Value > 0) exam.BoardId = request.BoardId.Value;
            if (request.AcademicYearId.HasValue && request.AcademicYearId.Value > 0) exam.AcademicYearId = request.AcademicYearId.Value;

            var resolvedLevelId = request.AcademicLevelId.HasValue && request.AcademicLevelId.Value > 0
                ? request.AcademicLevelId.Value
                : (request.AcademicLevelIds != null && request.AcademicLevelIds.Count > 0 ? request.AcademicLevelIds[0] : 0);
            if (resolvedLevelId > 0) exam.AcademicLevelId = resolvedLevelId;

            var resolvedGroupId = request.GroupId.HasValue && request.GroupId.Value > 0
                ? request.GroupId.Value
                : (request.GroupIds != null && request.GroupIds.Count > 0 ? request.GroupIds[0] : 0);
            if (resolvedGroupId > 0) exam.GroupId = resolvedGroupId;

            if (request.ProgramId.HasValue)
            {
                exam.ProgramId = request.ProgramId.Value > 0 ? request.ProgramId.Value : null;
            }
            else if (request.ProgramIds != null && request.ProgramIds.Count > 0)
            {
                exam.ProgramId = request.ProgramIds[0] > 0 ? request.ProgramIds[0] : null;
            }

            if (request.AssessmentTypeId.HasValue && request.AssessmentTypeId.Value > 0)
            {
                exam.AssessmentTypeId = request.AssessmentTypeId.Value;
            }
            else if (!string.IsNullOrWhiteSpace(request.ExamType) || !string.IsNullOrWhiteSpace(request.ExamCategory))
            {
                exam.AssessmentTypeId = ResolveAssessmentTypeId(0, request.ExamType, request.ExamCategory);
            }

            if (request.StartDate.HasValue) exam.StartDate = request.StartDate.Value;
            if (request.EndDate.HasValue) exam.EndDate = request.EndDate.Value;
            if (!string.IsNullOrWhiteSpace(request.ExamPattern)) exam.ExamPattern = request.ExamPattern;
            if (request.TotalMarks.HasValue) exam.TotalMarks = request.TotalMarks.Value;
            if (request.PassPercentage.HasValue) exam.PassPercentage = request.PassPercentage.Value;
            if (request.Description != null) exam.Description = request.Description;
            if (!string.IsNullOrWhiteSpace(request.Status)) exam.Status = request.Status.ToUpper();

            await _examinationRepository.UpdateExaminationAsync(exam);
            EvictExamCache(examinationId);

            var updatedExam = await _examinationRepository.GetExaminationByIdAsync(examinationId);
            return updatedExam == null ? null : _mapper.Map<ExaminationResponse>(updatedExam);
        }

        public async Task<bool> DeleteExaminationAsync(int examinationId)
        {
            var exam = await _examinationRepository.GetExaminationByIdAsync(examinationId);
            if (exam == null) return false;

            var deleted = await _examinationRepository.DeleteExaminationAsync(exam);
            if (deleted) EvictExamCache(examinationId);
            return deleted;
        }

        public async Task<ExaminationStatusResponse?> CancelExaminationAsync(int examinationId, CancelExaminationRequest request)
        {
            var exam = await _examinationRepository.GetExaminationByIdAsync(examinationId);
            if (exam == null) return null;

            exam.Status = "CANCELLED";
            await _examinationRepository.UpdateExaminationAsync(exam);
            EvictExamCache(examinationId);

            return new ExaminationStatusResponse
            {
                ExaminationId = exam.ExaminationId,
                Status = exam.Status,
                ActionReason = request.Reason,
                UpdatedAt = DateTime.UtcNow
            };
        }

        public async Task<ExaminationStatusResponse?> RescheduleExaminationAsync(int examinationId, RescheduleExaminationRequest request)
        {
            var exam = await _examinationRepository.GetExaminationByIdAsync(examinationId);
            if (exam == null) return null;

            if (request.NewStartDate.HasValue) exam.StartDate = request.NewStartDate.Value;
            if (request.NewEndDate.HasValue) exam.EndDate = request.NewEndDate.Value;
            else if (request.NewDate.HasValue) exam.StartDate = DateOnly.FromDateTime(request.NewDate.Value);

            exam.Status = "RESCHEDULED";
            await _examinationRepository.UpdateExaminationAsync(exam);
            EvictExamCache(examinationId);

            return new ExaminationStatusResponse
            {
                ExaminationId = exam.ExaminationId,
                Status = exam.Status,
                ActionReason = request.Reason,
                UpdatedAt = DateTime.UtcNow
            };
        }

        #endregion

        #region Exam Schedule Implementations

        public async Task<ExamScheduleResponse> CreateExamScheduleAsync(CreateExamScheduleRequest request)
        {
            if (request.ExaminationId <= 0 && request.Schedules != null && request.Schedules.Any())
            {
                var first = request.Schedules.First();
                return await CreateExamScheduleAsync(first);
            }

            if (request.ExaminationId <= 0)
            {
                throw new ValidationException("Examination ID is required and must be greater than zero.");
            }

            if (request.SubjectId <= 0 && request.IncludedSubjectIds != null && request.IncludedSubjectIds.Any())
            {
                request.SubjectId = request.IncludedSubjectIds.First();
            }
            else if (request.SubjectId <= 0 && request.SubjectIds != null && request.SubjectIds.Any())
            {
                request.SubjectId = request.SubjectIds.First();
            }

            var exam = await _examinationRepository.GetExaminationByIdAsync(request.ExaminationId);
            if (exam == null)
            {
                throw new ValidationException($"Examination with ID {request.ExaminationId} not found.");
            }

            if (exam.StartDate == default || exam.EndDate == default)
            {
                if (exam.StartDate == default) exam.StartDate = request.ExamDate;
                if (exam.EndDate == default) exam.EndDate = request.ExamDate;
                await _examinationRepository.UpdateExaminationAsync(exam);
            }
            else if (request.ExamDate < exam.StartDate || request.ExamDate > exam.EndDate)
            {
                if (request.ExamDate < exam.StartDate) exam.StartDate = request.ExamDate;
                if (request.ExamDate > exam.EndDate) exam.EndDate = request.ExamDate;
                await _examinationRepository.UpdateExaminationAsync(exam);
            }

            if (request.EndTime <= request.StartTime)
            {
                throw new ValidationException("End Time must be later than Start Time.");
            }

            var hall = request.Hall ?? request.RoomNumber ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(hall))
            {
                var roomConflict = await _examinationRepository.HasRoomConflictAsync(request.ExamDate, request.StartTime, request.EndTime, hall);
                if (roomConflict)
                {
                    throw new ValidationException($"Room/Hall '{hall}' is already booked for another examination during {request.StartTime:HH\\:mm} - {request.EndTime:HH\\:mm} on {request.ExamDate:yyyy-MM-dd}.");
                }
            }

            var invigilator = request.Invigilator ?? request.InvigilatorName ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(invigilator))
            {
                var invigilatorConflict = await _examinationRepository.HasInvigilatorConflictAsync(request.ExamDate, request.StartTime, request.EndTime, invigilator);
                if (invigilatorConflict)
                {
                    throw new ValidationException($"Invigilator '{invigilator}' is already assigned to another examination during {request.StartTime:HH\\:mm} - {request.EndTime:HH\\:mm} on {request.ExamDate:yyyy-MM-dd}.");
                }
            }

            var schedule = _mapper.Map<ExamSchedule>(request);
            var createdSchedule = await _examinationRepository.CreateExamScheduleAsync(schedule);

            var fullyLoadedSchedule = await _examinationRepository.GetExamScheduleByIdAsync(createdSchedule.ExamScheduleId);
            if (fullyLoadedSchedule == null)
            {
                throw new InvalidOperationException("Unable to retrieve created exam schedule.");
            }

            EvictExamCache(request.ExaminationId);
            return _mapper.Map<ExamScheduleResponse>(fullyLoadedSchedule);
        }

        public async Task<ExamScheduleResponse?> GetExamScheduleByIdAsync(int examScheduleId)
        {
            var schedule = await _examinationRepository.GetExamScheduleByIdAsync(examScheduleId);
            return schedule == null ? null : _mapper.Map<ExamScheduleResponse>(schedule);
        }

        public async Task<IEnumerable<ExamScheduleResponse>> GetExamSchedulesAsync(int? examinationId)
        {
            if (examinationId.HasValue && examinationId.Value > 0)
            {
                var cacheKey = $"exam:schedules:{examinationId.Value}";
                if (_memoryCache.TryGetValue(cacheKey, out IEnumerable<ExamScheduleResponse>? cached) && cached != null)
                {
                    return cached;
                }

                var schedules = await _examinationRepository.GetExamSchedulesAsync(examinationId);
                var mapped = _mapper.Map<IEnumerable<ExamScheduleResponse>>(schedules);
                _memoryCache.Set(cacheKey, mapped, TimeSpan.FromMinutes(10));
                return mapped;
            }

            var allSchedules = await _examinationRepository.GetExamSchedulesAsync(examinationId);
            return _mapper.Map<IEnumerable<ExamScheduleResponse>>(allSchedules);
        }

        public async Task<ExamScheduleResponse?> UpdateExamScheduleAsync(int examScheduleId, UpdateExamScheduleRequest request)
        {
            var schedule = await _examinationRepository.GetExamScheduleByIdAsync(examScheduleId);
            if (schedule == null) return null;

            var targetDate = request.ExamDate ?? schedule.ExamDate;
            var targetStartTime = request.StartTime ?? schedule.StartTime;
            var targetEndTime = request.EndTime ?? schedule.EndTime;
            var targetHall = request.Hall ?? request.RoomNumber ?? request.Venue ?? schedule.Hall;
            var targetInvigilator = request.Invigilator ?? request.InvigilatorName ?? schedule.Invigilator;

            if (request.StartTime.HasValue && request.EndTime.HasValue && request.EndTime.Value <= request.StartTime.Value)
            {
                throw new ValidationException("End Time must be later than Start Time.");
            }

            if (!string.IsNullOrWhiteSpace(targetHall))
            {
                var roomConflict = await _examinationRepository.HasRoomConflictAsync(targetDate, targetStartTime, targetEndTime, targetHall, examScheduleId);
                if (roomConflict)
                {
                    throw new ValidationException($"Room/Hall '{targetHall}' is already booked for another examination during {targetStartTime:HH\\:mm} - {targetEndTime:HH\\:mm} on {targetDate:yyyy-MM-dd}.");
                }
            }

            if (!string.IsNullOrWhiteSpace(targetInvigilator))
            {
                var invigilatorConflict = await _examinationRepository.HasInvigilatorConflictAsync(targetDate, targetStartTime, targetEndTime, targetInvigilator, examScheduleId);
                if (invigilatorConflict)
                {
                    throw new ValidationException($"Invigilator '{targetInvigilator}' is already assigned to another examination during {targetStartTime:HH\\:mm} - {targetEndTime:HH\\:mm} on {targetDate:yyyy-MM-dd}.");
                }
            }

            if (request.SubjectId.HasValue && request.SubjectId.Value > 0) schedule.SubjectId = request.SubjectId.Value;
            if (request.ExamDate.HasValue) schedule.ExamDate = request.ExamDate.Value;
            if (request.StartTime.HasValue) schedule.StartTime = request.StartTime.Value;
            if (request.EndTime.HasValue) schedule.EndTime = request.EndTime.Value;
            if (!string.IsNullOrWhiteSpace(targetHall)) schedule.Hall = targetHall;
            if (!string.IsNullOrWhiteSpace(targetInvigilator)) schedule.Invigilator = targetInvigilator;
            if (!string.IsNullOrWhiteSpace(request.ExamMode)) schedule.ExamMode = request.ExamMode;
            if (!string.IsNullOrWhiteSpace(request.SessionId)) schedule.SessionId = request.SessionId;
            if (!string.IsNullOrWhiteSpace(request.ScheduleMode)) schedule.ScheduleMode = request.ScheduleMode;
            if (request.RoomId.HasValue) schedule.RoomId = request.RoomId.Value;
            if (request.InvigilatorId.HasValue) schedule.InvigilatorId = request.InvigilatorId.Value;
            if (request.MaxMarks.HasValue) schedule.MaxMarks = request.MaxMarks.Value;
            if (request.PassingMarks.HasValue) schedule.PassingMarks = request.PassingMarks.Value;

            await _examinationRepository.UpdateExamScheduleAsync(schedule);
            EvictExamCache(schedule.ExaminationId);

            var updatedSchedule = await _examinationRepository.GetExamScheduleByIdAsync(examScheduleId);
            return _mapper.Map<ExamScheduleResponse>(updatedSchedule);
        }

        public async Task<bool> DeleteExamScheduleAsync(int examScheduleId)
        {
            var schedule = await _examinationRepository.GetExamScheduleByIdAsync(examScheduleId);
            if (schedule == null) return false;

            var deleted = await _examinationRepository.DeleteExamScheduleAsync(schedule);
            if (deleted) EvictExamCache(schedule.ExaminationId);
            return deleted;
        }

        public async Task<int> PublishExamSchedulesAsync(PublishExamScheduleRequest request)
        {
            if ((request.ScheduleIds == null || !request.ScheduleIds.Any()) && request.ExaminationId.HasValue && request.ExaminationId.Value > 0)
            {
                var schedules = await _examinationRepository.GetExamSchedulesAsync(request.ExaminationId.Value);
                request.ScheduleIds = schedules.Select(s => s.ExamScheduleId).ToList();
            }

            var count = await _examinationRepository.PublishExamSchedulesAsync(request.ScheduleIds ?? new List<int>());
            return count;
        }

        public async Task<IEnumerable<EligibleSubjectResponse>> GetEligibleSubjectsAsync(int examinationId)
        {
            var cacheKey = $"exam:eligible-subjects:{examinationId}";
            if (_memoryCache.TryGetValue(cacheKey, out IEnumerable<EligibleSubjectResponse>? cached) && cached != null)
            {
                return cached;
            }

            var subjects = await _examinationRepository.GetEligibleSubjectsForExamAsync(examinationId);
            var schedules = await _examinationRepository.GetExamSchedulesAsync(examinationId);

            var list = new List<EligibleSubjectResponse>();
            foreach (var sub in subjects)
            {
                var scheduledSlot = schedules.FirstOrDefault(s => s.SubjectId == sub.SubjectId && s.IsActive);
                list.Add(new EligibleSubjectResponse
                {
                    SubjectId = sub.SubjectId,
                    SubjectName = sub.SubjectName,
                    SubjectCode = sub.SubjectCode,
                    SubjectType = sub.SubjectType,
                    TotalMarks = sub.TotalMarks,
                    PassingMarks = sub.PassingMarks,
                    IsScheduled = scheduledSlot != null,
                    ExamScheduleId = scheduledSlot?.ExamScheduleId,
                    ExamDate = scheduledSlot?.ExamDate,
                    StartTime = scheduledSlot?.StartTime,
                    EndTime = scheduledSlot?.EndTime,
                    Hall = scheduledSlot?.Hall,
                    Invigilator = scheduledSlot?.Invigilator,
                    ExamMode = scheduledSlot?.ExamMode
                });
            }

            _memoryCache.Set(cacheKey, list, TimeSpan.FromMinutes(10));
            return list;
        }

        public async Task<FinalizeScheduleResponse> FinalizeScheduleAsync(int examinationId, FinalizeScheduleRequest? request = null)
        {
            var exam = await _examinationRepository.GetExaminationByIdAsync(examinationId);
            if (exam == null)
            {
                throw new ValidationException($"Examination with ID {examinationId} not found.");
            }

            var eligibleSubjects = (await _examinationRepository.GetEligibleSubjectsForExamAsync(examinationId)).ToList();
            var schedules = (await _examinationRepository.GetExamSchedulesAsync(examinationId)).Where(s => s.IsActive).ToList();

            // 1. If schedules are provided in request body and not yet in database, persist them
            if (!schedules.Any() && request?.Schedules != null && request.Schedules.Any())
            {
                foreach (var schReq in request.Schedules)
                {
                    schReq.ExaminationId = examinationId;
                    var schedule = _mapper.Map<ExamSchedule>(schReq);
                    schedule.ExaminationId = examinationId;
                    schedule.IsActive = true;
                    await _examinationRepository.CreateExamScheduleAsync(schedule);
                }
                schedules = (await _examinationRepository.GetExamSchedulesAsync(examinationId)).Where(s => s.IsActive).ToList();
            }

            // 2. If still no schedules and eligible subjects exist, auto-generate schedule entries across exam dates
            if (!schedules.Any() && eligibleSubjects.Any())
            {
                var startDate = exam.StartDate;
                var endDate = exam.EndDate;
                var currentDate = startDate;

                foreach (var subject in eligibleSubjects)
                {
                    var sch = new ExamSchedule
                    {
                        ExaminationId = examinationId,
                        SubjectId = subject.SubjectId,
                        ExamDate = currentDate <= endDate ? currentDate : endDate,
                        StartTime = new TimeOnly(9, 0),
                        EndTime = new TimeOnly(12, 0),
                        ExamMode = subject.Practical ? "Practical" : "Written",
                        MaxMarks = subject.TotalMarks > 0 ? subject.TotalMarks : 100,
                        PassingMarks = subject.PassingMarks > 0 ? subject.PassingMarks : 35,
                        ScheduleMode = "SUBJECT_WISE",
                        Hall = "Main Examination Hall",
                        Invigilator = "Assigned Faculty",
                        IsActive = true
                    };

                    await _examinationRepository.CreateExamScheduleAsync(sch);

                    // Advance date (skip Sundays)
                    currentDate = currentDate.AddDays(1);
                    if (currentDate.DayOfWeek == DayOfWeek.Sunday)
                    {
                        currentDate = currentDate.AddDays(1);
                    }
                }

                schedules = (await _examinationRepository.GetExamSchedulesAsync(examinationId)).Where(s => s.IsActive).ToList();
            }

            if (!schedules.Any())
            {
                throw new ValidationException("Cannot finalize schedule. At least one subject must be scheduled.");
            }

            exam.Status = "SCHEDULED";
            await _examinationRepository.UpdateExaminationAsync(exam);
            EvictExamCache(examinationId);

            return new FinalizeScheduleResponse
            {
                ExaminationId = exam.ExaminationId,
                ExamCode = exam.ExamCode ?? $"EXM-{exam.ExaminationId}",
                Status = exam.Status,
                TotalEligibleSubjects = eligibleSubjects.Count,
                ScheduledSubjectsCount = schedules.Count,
                Message = $"Examination schedule finalized successfully ({schedules.Count} of {eligibleSubjects.Count} subjects scheduled)."
            };
        }

        public async Task<SchedulingContextResponseDto> GetSchedulingContextAsync(int examinationId)
        {
            return await _examinationRepository.GetSchedulingContextAsync(examinationId);
        }

        public async Task<IEnumerable<AvailableHallDto>> GetAvailableHallsAsync(
            DateOnly examDate,
            TimeOnly startTime,
            TimeOnly endTime,
            int? requiredCapacity = null,
            IEnumerable<int>? sectionIds = null,
            int? excludeScheduleId = null)
        {
            return await _examinationRepository.GetAvailableHallsFilteredAsync(
                examDate, startTime, endTime, requiredCapacity, sectionIds, excludeScheduleId);
        }

        public async Task<IEnumerable<AvailableInvigilatorDto>> GetAvailableInvigilatorsAsync(
            DateOnly examDate,
            TimeOnly startTime,
            TimeOnly endTime,
            IEnumerable<int>? subjectIds = null,
            int? excludeScheduleId = null)
        {
            return await _examinationRepository.GetAvailableInvigilatorsFilteredAsync(
                examDate, startTime, endTime, subjectIds, excludeScheduleId);
        }

        public async Task<IEnumerable<ExamScheduleResponse>> CreateBatchExamSchedulesAsync(CreateBatchExamScheduleRequest request)
        {
            var exam = await _examinationRepository.GetExaminationByIdAsync(request.ExaminationId);
            if (exam == null)
            {
                throw new ValidationException($"Examination with ID {request.ExaminationId} not found.");
            }

            if (exam.StartDate == default || exam.EndDate == default)
            {
                if (exam.StartDate == default) exam.StartDate = request.ExamDate;
                if (exam.EndDate == default) exam.EndDate = request.ExamDate;
                await _examinationRepository.UpdateExaminationAsync(exam);
            }
            else if (request.ExamDate < exam.StartDate || request.ExamDate > exam.EndDate)
            {
                if (request.ExamDate < exam.StartDate) exam.StartDate = request.ExamDate;
                if (request.ExamDate > exam.EndDate) exam.EndDate = request.ExamDate;
                await _examinationRepository.UpdateExaminationAsync(exam);
            }

            if (request.EndTime <= request.StartTime)
            {
                throw new ValidationException("End Time must be later than Start Time.");
            }

            if (request.SubjectIds == null || !request.SubjectIds.Any())
            {
                throw new ValidationException("At least one subject ID is required for batch/combined scheduling.");
            }

            var hall = request.Hall ?? request.RoomNumber ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(hall))
            {
                var roomConflict = await _examinationRepository.HasRoomConflictAsync(request.ExamDate, request.StartTime, request.EndTime, hall);
                if (roomConflict)
                {
                    throw new ValidationException($"Room/Hall '{hall}' is already booked for another examination during {request.StartTime:HH\\:mm} - {request.EndTime:HH\\:mm} on {request.ExamDate:yyyy-MM-dd}.");
                }
            }

            var invigilator = request.Invigilator ?? request.InvigilatorName ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(invigilator))
            {
                var invigilatorConflict = await _examinationRepository.HasInvigilatorConflictAsync(request.ExamDate, request.StartTime, request.EndTime, invigilator);
                if (invigilatorConflict)
                {
                    throw new ValidationException($"Invigilator '{invigilator}' is already assigned to another examination during {request.StartTime:HH\\:mm} - {request.EndTime:HH\\:mm} on {request.ExamDate:yyyy-MM-dd}.");
                }
            }

            var createdSchedules = new List<ExamScheduleResponse>();
            foreach (var subjectId in request.SubjectIds.Distinct())
            {
                var schedule = new ExamSchedule
                {
                    ExaminationId = request.ExaminationId,
                    SubjectId = subjectId,
                    ExamDate = request.ExamDate,
                    StartTime = request.StartTime,
                    EndTime = request.EndTime,
                    SessionId = request.SessionId ?? $"SESSION-{request.ExamDate:yyyyMMdd}",
                    ScheduleMode = request.ScheduleMode ?? "COMBINED_OBJECTIVE",
                    RoomId = request.RoomId,
                    InvigilatorId = request.InvigilatorId,
                    Hall = hall,
                    Invigilator = invigilator,
                    ExamMode = request.ExamMode ?? "Objective",
                    MaxMarks = request.MaxMarks,
                    PassingMarks = request.PassingMarks,
                    IsActive = true
                };

                var created = await _examinationRepository.CreateExamScheduleAsync(schedule);
                var fullyLoaded = await _examinationRepository.GetExamScheduleByIdAsync(created.ExamScheduleId);
                if (fullyLoaded != null)
                {
                    createdSchedules.Add(_mapper.Map<ExamScheduleResponse>(fullyLoaded));
                }
            }

            EvictExamCache(request.ExaminationId);
            return createdSchedules;
        }

        #endregion

        #region Hall Ticket Implementations

        public async Task<IEnumerable<HallTicketResponse>> GenerateHallTicketsAsync(GenerateHallTicketRequest request)
        {
            var hallTickets = await _examinationRepository.GenerateHallTicketsAsync(request.ExaminationId, request.BatchId);
            return _mapper.Map<IEnumerable<HallTicketResponse>>(hallTickets);
        }

        public async Task<Stream?> DownloadHallTicketPdfAsync(int studentId, int examinationId)
        {
            return await _examinationRepository.GetHallTicketPdfStreamAsync(studentId, examinationId);
        }

        #endregion

        #region Invigilator Implementations

        public async Task AssignInvigilatorsAsync(AssignInvigilatorRequest request)
        {
            await _examinationRepository.AssignInvigilatorsAsync(request.ExamScheduleId, request.InvigilatorIds, request.HallNumber);
        }

        public async Task<IEnumerable<InvigilatorAssignmentResponse>> GetInvigilatorsAsync(int examScheduleId)
        {
            var assignments = await _examinationRepository.GetInvigilatorsByScheduleIdAsync(examScheduleId);
            return _mapper.Map<IEnumerable<InvigilatorAssignmentResponse>>(assignments);
        }

        #endregion
    }
}