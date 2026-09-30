using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Examination.Requests;
using CollegeManagement.API.DTOs.Examination.Responses;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class ExaminationService : IExaminationService
    {
        private readonly IExaminationRepository _examinationRepository;
        private readonly IMapper _mapper;
        private readonly IMemoryCache _memoryCache;
        private readonly AppDbContext _context;
        private readonly ILogger<ExaminationService> _logger;

        public ExaminationService(
            IExaminationRepository examinationRepository,
            IMapper mapper,
            IMemoryCache memoryCache,
            AppDbContext context,
            ILogger<ExaminationService> logger)
        {
            _examinationRepository = examinationRepository;
            _mapper = mapper;
            _memoryCache = memoryCache;
            _context = context;
            _logger = logger;
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

        private static List<(int invigilatorId, string hallNumber)> ExtractInvigilatorAssignments(object? rawHallAssignments, int? directInvigilatorId, string? defaultHall)
        {
            var result = new List<(int invigilatorId, string hallNumber)>();
            var seen = new HashSet<int>();

            void AddAssignment(int invId, string? hall)
            {
                if (invId > 0 && seen.Add(invId))
                {
                    result.Add((invId, !string.IsNullOrWhiteSpace(hall) ? hall.Trim() : (defaultHall ?? string.Empty)));
                }
            }

            if (rawHallAssignments != null)
            {
                try
                {
                    System.Text.Json.JsonElement root;
                    if (rawHallAssignments is System.Text.Json.JsonElement elem)
                    {
                        root = elem;
                    }
                    else if (rawHallAssignments is string jsonStr && !string.IsNullOrWhiteSpace(jsonStr))
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(jsonStr);
                        root = doc.RootElement.Clone();
                    }
                    else
                    {
                        var json = System.Text.Json.JsonSerializer.Serialize(rawHallAssignments);
                        using var doc = System.Text.Json.JsonDocument.Parse(json);
                        root = doc.RootElement.Clone();
                    }

                    if (root.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        foreach (var item in root.EnumerateArray())
                        {
                            if (item.ValueKind != System.Text.Json.JsonValueKind.Object) continue;

                            string? itemHall = null;
                            string[] hallProps = { "hallNumber", "roomNumber", "hallName", "roomName", "hall", "room" };
                            foreach (var hp in hallProps)
                            {
                                if (item.TryGetProperty(hp, out var hallVal))
                                {
                                    itemHall = hallVal.ValueKind == System.Text.Json.JsonValueKind.String ? hallVal.GetString() : hallVal.ToString();
                                    if (!string.IsNullOrWhiteSpace(itemHall)) break;
                                }
                            }
                            if (string.IsNullOrWhiteSpace(itemHall)) itemHall = defaultHall;

                            // Check invigilatorIds array
                            if (item.TryGetProperty("invigilatorIds", out var idsProp) && idsProp.ValueKind == System.Text.Json.JsonValueKind.Array)
                            {
                                foreach (var idElem in idsProp.EnumerateArray())
                                {
                                    if (idElem.ValueKind == System.Text.Json.JsonValueKind.Number && idElem.TryGetInt32(out var id))
                                    {
                                        AddAssignment(id, itemHall);
                                    }
                                    else if (idElem.ValueKind == System.Text.Json.JsonValueKind.String && int.TryParse(idElem.GetString(), out var parsedId))
                                    {
                                        AddAssignment(parsedId, itemHall);
                                    }
                                }
                            }

                            // Check single invigilatorId / facultyId / staffId
                            string[] singleIdProps = { "invigilatorId", "facultyId", "staffId" };
                            foreach (var ip in singleIdProps)
                            {
                                if (item.TryGetProperty(ip, out var idVal))
                                {
                                    if (idVal.ValueKind == System.Text.Json.JsonValueKind.Number && idVal.TryGetInt32(out var id))
                                    {
                                        AddAssignment(id, itemHall);
                                    }
                                    else if (idVal.ValueKind == System.Text.Json.JsonValueKind.String && int.TryParse(idVal.GetString(), out var parsedId))
                                    {
                                        AddAssignment(parsedId, itemHall);
                                    }
                                }
                            }

                            // Check invigilators array (could be objects or numbers/strings)
                            if (item.TryGetProperty("invigilators", out var invsProp) && invsProp.ValueKind == System.Text.Json.JsonValueKind.Array)
                            {
                                foreach (var invElem in invsProp.EnumerateArray())
                                {
                                    if (invElem.ValueKind == System.Text.Json.JsonValueKind.Number && invElem.TryGetInt32(out var id))
                                    {
                                        AddAssignment(id, itemHall);
                                    }
                                    else if (invElem.ValueKind == System.Text.Json.JsonValueKind.String && int.TryParse(invElem.GetString(), out var parsedId))
                                    {
                                        AddAssignment(parsedId, itemHall);
                                    }
                                    else if (invElem.ValueKind == System.Text.Json.JsonValueKind.Object)
                                    {
                                        foreach (var ip in singleIdProps)
                                        {
                                            if (invElem.TryGetProperty(ip, out var nestedIdVal))
                                            {
                                                if (nestedIdVal.ValueKind == System.Text.Json.JsonValueKind.Number && nestedIdVal.TryGetInt32(out var nid))
                                                {
                                                    AddAssignment(nid, itemHall);
                                                    break;
                                                }
                                                else if (nestedIdVal.ValueKind == System.Text.Json.JsonValueKind.String && int.TryParse(nestedIdVal.GetString(), out var parsedNid))
                                                {
                                                    AddAssignment(parsedNid, itemHall);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                catch
                {
                    // Ignore JSON parsing errors and fallback to directInvigilatorId
                }
            }

            // Fallback to top-level direct InvigilatorId if not already included
            if (directInvigilatorId.HasValue && directInvigilatorId.Value > 0)
            {
                AddAssignment(directInvigilatorId.Value, defaultHall);
            }

            return result;
        }

        #region Examination Implementations

        public async Task<ExaminationResponse> CreateExaminationAsync(CreateExaminationRequest request)
        {
            if (request.EndDate < request.StartDate)
            {
                throw new ValidationException("End Date cannot be earlier than Start Date.");
            }

            var isObjective = string.Equals(request.ExamCategory, "OBJECTIVE", StringComparison.OrdinalIgnoreCase) ||
                              string.Equals(request.Category, "OBJECTIVE", StringComparison.OrdinalIgnoreCase);
            if (isObjective && request.StartDate != request.EndDate)
            {
                throw new ValidationException("For OBJECTIVE examinations, Start Date must be equal to End Date.");
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
                : (request.ProgramIds != null && request.ProgramIds.Count == 1 && request.ProgramIds[0] > 0 ? request.ProgramIds[0] : null);

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

            if (string.Equals(exam.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException("Cannot modify a cancelled examination.");
            }

            var targetStartDate = request.StartDate ?? exam.StartDate;
            var targetEndDate = request.EndDate ?? exam.EndDate;

            if (targetEndDate < targetStartDate)
            {
                throw new ValidationException("End Date cannot be earlier than Start Date.");
            }

            var isObjective = string.Equals(request.ExamCategory, "OBJECTIVE", StringComparison.OrdinalIgnoreCase) ||
                              string.Equals(request.Category, "OBJECTIVE", StringComparison.OrdinalIgnoreCase);
            if (isObjective && targetStartDate != targetEndDate)
            {
                throw new ValidationException("For OBJECTIVE examinations, Start Date must be equal to End Date.");
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
            else if (request.ProgramIds != null)
            {
                exam.ProgramId = (request.ProgramIds.Count == 1 && request.ProgramIds[0] > 0) ? request.ProgramIds[0] : null;
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

            var currentStatus = (exam.Status ?? string.Empty).Trim().ToUpperInvariant();
            if (currentStatus != "DRAFT" && currentStatus != "CANCELLED")
            {
                throw new ValidationException($"Cannot delete an examination with status '{exam.Status}'. Only DRAFT or CANCELLED examinations can be deleted.");
            }

            var deleted = await _examinationRepository.DeleteExaminationAsync(exam);
            if (deleted) EvictExamCache(examinationId);
            return deleted;
        }

        public async Task<ExaminationStatusResponse?> CancelExaminationAsync(int examinationId, CancelExaminationRequest? request = null)
        {
            var exam = await _examinationRepository.GetExaminationByIdAsync(examinationId);
            if (exam == null) return null;

            exam.Status = "CANCELLED";
            exam.UpdatedAt = DateTime.UtcNow;

            // Cascade cancellation to child active schedules
            if (exam.ExamSchedules != null && exam.ExamSchedules.Any())
            {
                foreach (var schedule in exam.ExamSchedules.Where(s => s.IsActive))
                {
                    schedule.IsActive = false;
                    schedule.UpdatedAt = DateTime.UtcNow;
                    await _examinationRepository.UpdateExamScheduleAsync(schedule);
                }
            }

            await _examinationRepository.UpdateExaminationAsync(exam);
            EvictExamCache(examinationId);

            var reason = request?.CancelReason ?? request?.Reason ?? "Cancelled by administrator";

            return new ExaminationStatusResponse
            {
                ExaminationId = exam.ExaminationId,
                Name = exam.ExamName,
                Status = exam.Status,
                ActionReason = reason,
                UpdatedAt = DateTime.UtcNow,
                Success = true,
                Message = "Examination cancelled successfully."
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

            // 1. Examination ID Format Validation
            if (request.ExaminationId <= 0)
            {
                _logger.LogWarning("Examination validation failed: Examination ID is required and must be greater than zero. Request: {@Request}", request);
                throw new ValidationException("Examination ID is required and must be greater than zero.");
            }

            // 2. Resolve & Validate SubjectId
            if (request.SubjectId <= 0 && request.IncludedSubjectIds != null && request.IncludedSubjectIds.Any())
            {
                request.SubjectId = request.IncludedSubjectIds.First();
            }
            else if (request.SubjectId <= 0 && request.SubjectIds != null && request.SubjectIds.Any())
            {
                request.SubjectId = request.SubjectIds.First();
            }

            if (request.SubjectId <= 0)
            {
                _logger.LogWarning("Subject validation failed: Subject ID is missing or invalid for Examination ID {ExamId}.", request.ExaminationId);
                throw new ValidationException("Subject ID is required for examination schedule.");
            }

            // 3. Date & Time Validation
            if (request.ExamDate == default || request.ExamDate.Year < 2000)
            {
                _logger.LogWarning("Date validation failed: Invalid Exam Date '{ExamDate}' for Examination ID {ExamId}.", request.ExamDate, request.ExaminationId);
                throw new ValidationException("A valid Exam Date is required.");
            }

            if (request.StartTime == default && request.EndTime == default)
            {
                _logger.LogWarning("Time validation failed: Start Time and End Time are missing for Examination ID {ExamId}.", request.ExaminationId);
                throw new ValidationException("Start Time and End Time are required.");
            }

            if (request.EndTime <= request.StartTime)
            {
                _logger.LogWarning("Time validation failed: End Time ({EndTime}) must be later than Start Time ({StartTime}) for Exam ID {ExamId}.",
                    request.EndTime, request.StartTime, request.ExaminationId);
                throw new ValidationException($"End Time ({request.EndTime:HH\\:mm}) must be later than Start Time ({request.StartTime:HH\\:mm}).");
            }

            // 4. Examination Existence & Status Validation
            var exam = await _examinationRepository.GetExaminationByIdAsync(request.ExaminationId);
            if (exam == null)
            {
                _logger.LogWarning("Examination validation failed: Examination with ID {ExamId} does not exist.", request.ExaminationId);
                throw new ValidationException($"Examination with ID {request.ExaminationId} not found.");
            }

            if (!exam.IsActive)
            {
                _logger.LogWarning("Examination validation failed: Examination '{ExamName}' (ID {ExamId}) is marked as inactive.", exam.ExamName, exam.ExamId);
                throw new ValidationException($"Examination '{exam.ExamName}' (ID {request.ExaminationId}) is marked as inactive and cannot be scheduled.");
            }

            if (string.Equals(exam.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Examination validation failed: Examination '{ExamName}' (ID {ExamId}) is CANCELLED.", exam.ExamName, exam.ExamId);
                throw new ValidationException($"Cannot schedule examination '{exam.ExamName}' because it has been cancelled.");
            }

            if (string.Equals(exam.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Examination validation failed: Examination '{ExamName}' (ID {ExamId}) is already COMPLETED.", exam.ExamName, exam.ExamId);
                throw new ValidationException($"Cannot schedule examination '{exam.ExamName}' because it has already been completed.");
            }

            // 5. Resolve CampusId
            var resolvedCampusId = request.CampusId.HasValue && request.CampusId.Value > 0
                ? request.CampusId.Value
                : (exam.CampusId ?? 1);
            request.CampusId = resolvedCampusId;

            // 6. Group Validation
            if (request.GroupId.HasValue && request.GroupId.Value > 0 && exam.GroupId > 0 && request.GroupId.Value != exam.GroupId)
            {
                _logger.LogWarning("Group validation failed: Provided Group ID {ReqGroup} does not match Exam Group ID {ExamGroup} for Exam {ExamId}",
                    request.GroupId.Value, exam.GroupId, exam.ExamId);
                throw new ValidationException($"Provided Group ID {request.GroupId.Value} does not match the Examination's Group ID {exam.GroupId}.");
            }
            if (!request.GroupId.HasValue || request.GroupId.Value <= 0)
            {
                request.GroupId = exam.GroupId;
            }

            var subject = await _context.Subjects.AsNoTracking().FirstOrDefaultAsync(s => s.SubjectId == request.SubjectId);
            if (subject == null)
            {
                _logger.LogWarning("Subject validation failed: Subject ID {SubjectId} does not exist in database.", request.SubjectId);
                throw new ValidationException($"Subject with ID {request.SubjectId} does not exist.");
            }

            if (!subject.IsActive)
            {
                _logger.LogWarning("Subject validation failed: Subject '{SubjectName}' (ID {SubjectId}) is inactive.", subject.SubjectName, subject.SubjectId);
                throw new ValidationException($"Subject '{subject.SubjectName}' (ID {request.SubjectId}) is inactive.");
            }

            if (exam.GroupId > 0 && subject.GroupId > 0 && subject.GroupId != exam.GroupId)
            {
                _logger.LogWarning("Subject validation failed: Subject {SubjectId} ('{SubjectName}') belongs to Group {SubGroup}, but Exam {ExamId} belongs to Group {ExamGroup}",
                    subject.SubjectId, subject.SubjectName, subject.GroupId, exam.ExamId, exam.GroupId);
                throw new ValidationException($"Subject '{subject.SubjectName}' (ID {request.SubjectId}) does not belong to the examination group (Exam Group: {exam.GroupId}, Subject Group: {subject.GroupId}).");
            }

            if (exam.BoardId > 0 && subject.BoardId > 0 && subject.BoardId != exam.BoardId)
            {
                _logger.LogWarning("Subject validation failed: Subject {SubjectId} belongs to Board {SubBoard}, but Exam {ExamId} belongs to Board {ExamBoard}",
                    subject.SubjectId, subject.BoardId, exam.ExamId, exam.BoardId);
                throw new ValidationException($"Subject '{subject.SubjectName}' (ID {request.SubjectId}) does not belong to the examination board (Exam Board: {exam.BoardId}, Subject Board: {subject.BoardId}).");
            }

            // Adjust examination date range if schedule is outside it
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

            // 6. Duplicate Schedule Checks within this Exam
            var existingSchedules = await _examinationRepository.GetExamSchedulesAsync(request.ExaminationId);
            if (existingSchedules != null)
            {
                foreach (var s in existingSchedules.Where(s => s.IsActive))
                {
                    if (s.SubjectId == request.SubjectId)
                    {
                        _logger.LogWarning("Duplicate schedule detected: Subject ID {SubId} already scheduled for Exam {ExamId} on {Date}",
                            request.SubjectId, exam.ExamId, s.ExamDate);
                        throw new ValidationException($"Subject '{subject.SubjectName}' is already scheduled for examination '{exam.ExamName}' on {s.ExamDate:yyyy-MM-dd}.");
                    }

                    if (s.ExamDate == request.ExamDate && !(request.EndTime <= s.StartTime || request.StartTime >= s.EndTime))
                    {
                        _logger.LogWarning("Schedule time overlap in Exam {ExamId}: {Start}-{End} overlaps with existing schedule {ExistStart}-{ExistEnd}",
                            exam.ExamId, request.StartTime, request.EndTime, s.StartTime, s.EndTime);
                        throw new ValidationException($"Examination '{exam.ExamName}' already has a subject scheduled during {s.StartTime:HH\\:mm} - {s.EndTime:HH\\:mm} on {request.ExamDate:yyyy-MM-dd}.");
                    }
                }
            }

            // 7. Room / Hall Validation & Capacity Checks
            if (request.RoomId.HasValue && request.RoomId.Value > 0)
            {
                var room = await _context.Rooms.AsNoTracking().FirstOrDefaultAsync(r => r.RoomId == request.RoomId.Value);
                if (room == null)
                {
                    _logger.LogWarning("Room validation failed: Room ID {RoomId} does not exist.", request.RoomId.Value);
                    throw new ValidationException($"Room with ID {request.RoomId.Value} does not exist.");
                }

                if (!room.IsActive)
                {
                    _logger.LogWarning("Room validation failed: Room ID {RoomId} ('{RoomName}') is inactive.", room.RoomId, room.RoomName);
                    throw new ValidationException($"Room '{room.RoomName ?? room.RoomNumber}' (ID {request.RoomId.Value}) is inactive.");
                }

                if (string.IsNullOrWhiteSpace(request.Hall))
                {
                    request.Hall = !string.IsNullOrWhiteSpace(room.RoomNumber) ? room.RoomNumber : room.RoomName;
                }

                if (request.CandidateCount.HasValue && request.CandidateCount.Value > 0 && room.Capacity > 0 && request.CandidateCount.Value > room.Capacity)
                {
                    _logger.LogWarning("Room capacity exceeded: Room '{RoomName}' capacity {Capacity} < requested candidates {Count}",
                        room.RoomName ?? room.RoomNumber, room.Capacity, request.CandidateCount.Value);
                    throw new ValidationException($"Room '{room.RoomName ?? room.RoomNumber}' capacity ({room.Capacity}) is less than required candidate count ({request.CandidateCount.Value}).");
                }
            }

            var hall = request.Hall ?? request.RoomNumber ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(hall))
            {
                var roomConflict = await _examinationRepository.HasRoomConflictAsync(request.ExamDate, request.StartTime, request.EndTime, hall);
                if (roomConflict)
                {
                    _logger.LogWarning("Room conflict detected: Room/Hall '{Hall}' is already booked on {Date} from {Start} to {End}",
                        hall, request.ExamDate, request.StartTime, request.EndTime);
                    throw new ValidationException($"Room/Hall '{hall}' is already booked for another examination during {request.StartTime:HH\\:mm} - {request.EndTime:HH\\:mm} on {request.ExamDate:yyyy-MM-dd}.");
                }
            }

            // 8. Invigilator Validation & Conflict Checks
            var invAssignments = ExtractInvigilatorAssignments(request.HallAssignments, request.InvigilatorId, hall);
            if ((!request.InvigilatorId.HasValue || request.InvigilatorId.Value <= 0) && invAssignments.Count > 0)
            {
                request.InvigilatorId = invAssignments[0].invigilatorId;
            }

            if (request.InvigilatorId.HasValue && request.InvigilatorId.Value > 0)
            {
                int invId = request.InvigilatorId.Value;
                string? invFirstName = null;
                string? invLastName = null;
                string? invStatus = null;
                bool invIsDeleted = false;
                bool found = false;

                // 1. Query Staff table first (primary modern storage for teaching/non-teaching staff)
                try
                {
                    var staff = await _context.Staffs.AsNoTracking()
                        .Where(s => s.Id == invId)
                        .Select(s => new { s.Id, s.FirstName, s.LastName, s.Status, s.IsDeleted })
                        .FirstOrDefaultAsync();

                    if (staff != null)
                    {
                        found = true;
                        invFirstName = staff.FirstName;
                        invLastName = staff.LastName;
                        invStatus = staff.Status;
                        invIsDeleted = staff.IsDeleted;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Staff table lookup failed for Invigilator ID {InvId}", invId);
                }

                // 2. Fallback to Faculties table (legacy)
                if (!found)
                {
                    try
                    {
                        var fac = await _context.Faculties.AsNoTracking()
                            .Where(f => f.Id == invId)
                            .Select(f => new { f.Id, f.FirstName, f.LastName, f.Status, f.IsDeleted })
                            .FirstOrDefaultAsync();

                        if (fac != null)
                        {
                            found = true;
                            invFirstName = fac.FirstName;
                            invLastName = fac.LastName;
                            invStatus = fac.Status;
                            invIsDeleted = fac.IsDeleted;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Faculties table lookup failed for Invigilator ID {InvId}", invId);
                    }
                }

                if (!found)
                {
                    _logger.LogWarning("Invigilator validation failed: Faculty/Staff ID {InvId} does not exist.", invId);
                    throw new ValidationException($"Invigilator with ID {invId} does not exist.");
                }

                if (invIsDeleted || string.Equals(invStatus, "Inactive", StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("Invigilator validation failed: Faculty/Staff ID {InvId} is inactive.", invId);
                    throw new ValidationException($"Invigilator '{invFirstName}' is marked as inactive.");
                }

                if (string.IsNullOrWhiteSpace(request.Invigilator))
                {
                    request.Invigilator = $"{invFirstName} {invLastName}".Trim();
                }

                var isSubjectTeacher = await _examinationRepository.IsInvigilatorTeachingSubjectAsync(invId, request.SubjectId);
                if (isSubjectTeacher)
                {
                    _logger.LogWarning("Invigilator conflict: Faculty {InvId} ('{InvName}') teaches Subject ID {SubId}",
                        invId, request.Invigilator, request.SubjectId);
                    throw new ValidationException($"Faculty '{request.Invigilator}' cannot be assigned as invigilator because they teach this subject.");
                }
            }

            var invigilator = request.Invigilator ?? request.InvigilatorName ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(invigilator))
            {
                var invigilatorConflict = await _examinationRepository.HasInvigilatorConflictAsync(request.ExamDate, request.StartTime, request.EndTime, invigilator);
                if (invigilatorConflict)
                {
                    _logger.LogWarning("Invigilator conflict detected: Invigilator '{Inv}' is already assigned on {Date} from {Start} to {End}",
                        invigilator, request.ExamDate, request.StartTime, request.EndTime);
                    throw new ValidationException($"Invigilator '{invigilator}' is already assigned to another examination during {request.StartTime:HH\\:mm} - {request.EndTime:HH\\:mm} on {request.ExamDate:yyyy-MM-dd}.");
                }
            }

            // 9. Persist Schedule
            var schedule = _mapper.Map<ExamSchedule>(request);
            schedule.CampusId = resolvedCampusId;
            var createdSchedule = await _examinationRepository.CreateExamScheduleAsync(schedule);

            // Assign invigilator(s) to schedule in InvigilatorAssignments
            if (invAssignments.Count > 0)
            {
                await _examinationRepository.AssignInvigilatorHallsAsync(createdSchedule.ExamScheduleId, invAssignments);
            }

            // 10. Update Draft Exam Status to SCHEDULED
            if (string.Equals(exam.Status, "DRAFT", StringComparison.OrdinalIgnoreCase))
            {
                exam.Status = "SCHEDULED";
                await _examinationRepository.UpdateExaminationAsync(exam);
            }

            // 11. Retrieve fully loaded schedule with resilient fallback
            ExamSchedule? fullyLoadedSchedule = null;
            if (createdSchedule.ExamScheduleId > 0)
            {
                fullyLoadedSchedule = await _examinationRepository.GetExamScheduleByIdAsync(createdSchedule.ExamScheduleId);
            }

            if (fullyLoadedSchedule == null)
            {
                createdSchedule.Subject = subject;
                createdSchedule.Examination = exam;
                fullyLoadedSchedule = createdSchedule;
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

                var schedules = (await _examinationRepository.GetExamSchedulesAsync(examinationId)).ToList();
                var mapped = _mapper.Map<IEnumerable<ExamScheduleResponse>>(schedules).ToList();

                var exam = await _context.Examinations.AsNoTracking().FirstOrDefaultAsync(e => e.ExaminationId == examinationId.Value);
                if (exam != null && mapped.Any())
                {
                    var scheduleIds = mapped.Select(s => s.ExamScheduleId).ToList();
                    var allInvAssignments = await _context.InvigilatorAssignments
                        .Include(ia => ia.InvigilatorStaff)
                        .Where(ia => scheduleIds.Contains(ia.ExamScheduleId))
                        .ToListAsync();

                    // Calculate genuine candidate count according to exam's group, academic level, and program
                    var studentQuery = _context.Students
                        .Where(st => st.IsActive && st.Status == "Active");

                    if (exam.CampusId.HasValue && exam.CampusId.Value > 0)
                        studentQuery = studentQuery.Where(st => st.CampusId == exam.CampusId.Value || st.CampusId == null || st.CampusId == 0);

                    if (exam.GroupId > 0)
                        studentQuery = studentQuery.Where(st => st.GroupId == exam.GroupId);

                    if (exam.AcademicLevelId > 0)
                        studentQuery = studentQuery.Where(st => st.AcademicLevelId == exam.AcademicLevelId);

                    if (exam.ProgramId.HasValue && exam.ProgramId.Value > 0)
                        studentQuery = studentQuery.Where(st => st.ProgramId == exam.ProgramId.Value);

                    int candidateCount = await studentQuery.CountAsync();
                    if (candidateCount <= 0 && exam.GroupId > 0)
                    {
                        var fallbackQuery = _context.Students
                            .Where(st => st.IsActive && st.Status == "Active" && st.GroupId == exam.GroupId);
                        if (exam.CampusId.HasValue && exam.CampusId.Value > 0)
                            fallbackQuery = fallbackQuery.Where(st => st.CampusId == exam.CampusId.Value || st.CampusId == null || st.CampusId == 0);
                        if (exam.AcademicLevelId > 0)
                            fallbackQuery = fallbackQuery.Where(st => st.AcademicLevelId == exam.AcademicLevelId);
                        candidateCount = await fallbackQuery.CountAsync();
                    }

                    foreach (var s in mapped)
                    {
                        s.CandidateCount = candidateCount;
                        if (s.GroupId == null || s.GroupId <= 0) s.GroupId = exam.GroupId;
                        if (s.AcademicLevelId == null || s.AcademicLevelId <= 0) s.AcademicLevelId = exam.AcademicLevelId;

                        var sInvs = allInvAssignments.Where(ia => ia.ExamScheduleId == s.ExamScheduleId).ToList();
                        s.InvigilatorAssignments = sInvs.Select(ia => new InvigilatorAssignmentResponse
                        {
                            InvigilatorAssignmentId = ia.InvigilatorAssignmentId,
                            ExamScheduleId = ia.ExamScheduleId,
                            InvigilatorId = ia.InvigilatorId,
                            FacultyId = ia.InvigilatorId,
                            StaffId = ia.InvigilatorId,
                            InvigilatorName = ia.InvigilatorStaff != null ? $"{ia.InvigilatorStaff.FirstName} {ia.InvigilatorStaff.LastName}".Trim() : string.Empty,
                            HallNumber = ia.HallNumber,
                            AssignedAt = ia.AssignedAt
                        }).ToList();

                        if (s.HallAssignments == null || !s.HallAssignments.Any())
                        {
                            string hallName = !string.IsNullOrWhiteSpace(s.Hall) ? s.Hall : (!string.IsNullOrWhiteSpace(s.RoomNumber) ? s.RoomNumber : "Exam Hall");
                            var invNames = sInvs.Any()
                                ? string.Join(", ", sInvs.Select(ia => ia.InvigilatorStaff != null ? $"{ia.InvigilatorStaff.FirstName} {ia.InvigilatorStaff.LastName}".Trim() : "").Where(n => !string.IsNullOrEmpty(n)))
                                : (!string.IsNullOrWhiteSpace(s.Invigilator) ? s.Invigilator : (!string.IsNullOrWhiteSpace(s.InvigilatorName) ? s.InvigilatorName : ""));

                            var invIds = sInvs.Any()
                                ? sInvs.Select(ia => ia.InvigilatorId).ToList()
                                : (s.InvigilatorId.HasValue && s.InvigilatorId.Value > 0 ? new List<int> { s.InvigilatorId.Value } : new List<int>());

                            s.HallAssignments = new List<HallAssignmentDto>
                            {
                                new HallAssignmentDto
                                {
                                    HallId = s.RoomId ?? 0,
                                    HallName = hallName,
                                    RoomNumber = hallName,
                                    CandidateCount = candidateCount,
                                    InvigilatorIds = invIds,
                                    Invigilator = invNames,
                                    InvigilatorName = invNames
                                }
                            };
                        }
                    }
                }

                _memoryCache.Set(cacheKey, (IEnumerable<ExamScheduleResponse>)mapped, TimeSpan.FromMinutes(5));
                return mapped;
            }

            var allSchedules = await _examinationRepository.GetExamSchedulesAsync(examinationId);
            return _mapper.Map<IEnumerable<ExamScheduleResponse>>(allSchedules);
        }

        public async Task<ExamScheduleResponse?> UpdateExamScheduleAsync(int examScheduleId, UpdateExamScheduleRequest request)
        {
            var schedule = await _examinationRepository.GetExamScheduleByIdAsync(examScheduleId);
            if (schedule == null) return null;

            var parentExam = schedule.Examination ?? await _examinationRepository.GetExaminationByIdAsync(schedule.ExaminationId);
            if (parentExam != null && string.Equals(parentExam.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException("Cannot modify schedules for a cancelled examination.");
            }

            var targetSubjectId = request.SubjectId ?? schedule.SubjectId;
            var targetInvigilatorId = request.InvigilatorId ?? schedule.InvigilatorId;
            if (targetInvigilatorId.HasValue && targetInvigilatorId.Value > 0 && targetSubjectId > 0)
            {
                var isSubjectTeacher = await _examinationRepository.IsInvigilatorTeachingSubjectAsync(targetInvigilatorId.Value, targetSubjectId);
                if (isSubjectTeacher)
                {
                    throw new ValidationException("An invigilator cannot be assigned to an examination for the subject they teach.");
                }
            }

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
            schedule.CampusId = request.CampusId.HasValue && request.CampusId.Value > 0 ? request.CampusId.Value : (parentExam?.CampusId ?? schedule.CampusId);

            await _examinationRepository.UpdateExamScheduleAsync(schedule);

            var updateInvAssignments = ExtractInvigilatorAssignments(request.HallAssignments, request.InvigilatorId, schedule.Hall);
            if (updateInvAssignments.Count > 0)
            {
                await _examinationRepository.AssignInvigilatorHallsAsync(examScheduleId, updateInvAssignments);
            }

            EvictExamCache(schedule.ExaminationId);

            var updatedSchedule = await _examinationRepository.GetExamScheduleByIdAsync(examScheduleId);
            return _mapper.Map<ExamScheduleResponse>(updatedSchedule);
        }

        public async Task<bool> DeleteExamScheduleAsync(int examScheduleId)
        {
            var schedule = await _examinationRepository.GetExamScheduleByIdAsync(examScheduleId);
            if (schedule == null) return false;

            var parentExam = schedule.Examination ?? await _examinationRepository.GetExaminationByIdAsync(schedule.ExaminationId);
            if (parentExam != null) schedule.CampusId = parentExam.CampusId ?? 1;
            if (parentExam != null && string.Equals(parentExam.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException("Cannot delete schedules for a cancelled examination.");
            }

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
                    var created = await _examinationRepository.CreateExamScheduleAsync(schedule);
                    var pubInvAssignments = ExtractInvigilatorAssignments(schReq.HallAssignments, schReq.InvigilatorId, created.Hall);
                    if (pubInvAssignments.Count > 0)
                    {
                        await _examinationRepository.AssignInvigilatorHallsAsync(created.ExamScheduleId, pubInvAssignments);
                    }
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
                if (request.InvigilatorId.HasValue && request.InvigilatorId.Value > 0)
                {
                    await _examinationRepository.AssignInvigilatorHallsAsync(created.ExamScheduleId, new[] { (request.InvigilatorId.Value, hall ?? string.Empty) });
                }
                var fullyLoaded = await _examinationRepository.GetExamScheduleByIdAsync(created.ExamScheduleId);
                if (fullyLoaded != null)
                {
                    createdSchedules.Add(_mapper.Map<ExamScheduleResponse>(fullyLoaded));
                }
            }

            EvictExamCache(request.ExaminationId);
            return createdSchedules;
        }

        public async Task<IEnumerable<ExamScheduleResponse>> AutoScheduleExaminationAsync(int examinationId, AutoScheduleExaminationRequest request)
        {
            // 1. Examination Existence & Status Validation
            var exam = await _context.Examinations
                .Include(e => e.Board)
                .Include(e => e.AcademicYear)
                .Include(e => e.AcademicLevel)
                .Include(e => e.Group)
                .FirstOrDefaultAsync(e => e.ExaminationId == examinationId);

            if (exam == null)
            {
                throw new KeyNotFoundException($"Examination with ID {examinationId} was not found.");
            }

            if (!exam.IsActive)
            {
                throw new ValidationException($"Examination '{exam.ExamName}' is marked as inactive and cannot be scheduled.");
            }

            if (string.Equals(exam.Status, "CANCELLED", StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException($"Cannot schedule examination '{exam.ExamName}' because it has been cancelled.");
            }

            if (string.Equals(exam.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException($"Cannot schedule examination '{exam.ExamName}' because it has already been completed.");
            }

            // 2. Resolve CampusId, GroupId, AcademicLevelId
            int resolvedCampusId = request.CampusId.HasValue && request.CampusId.Value > 0
                ? request.CampusId.Value
                : (exam.CampusId.HasValue && exam.CampusId.Value > 0 ? exam.CampusId.Value : 1);

            int targetGroupId = request.GroupId.HasValue && request.GroupId.Value > 0
                ? request.GroupId.Value
                : exam.GroupId;

            int targetLevelId = request.AcademicLevelId.HasValue && request.AcademicLevelId.Value > 0
                ? request.AcademicLevelId.Value
                : exam.AcademicLevelId;

            if (targetGroupId <= 0)
            {
                throw new ValidationException("A valid Group ID is required for automatic scheduling.");
            }

            var group = await _context.Groups.AsNoTracking().FirstOrDefaultAsync(g => g.GroupId == targetGroupId);
            string groupCode = group?.GroupCode ?? group?.GroupName ?? $"Group {targetGroupId}";

            // 3. Timings & Schedule Mode
            var startTime = request.DefaultStartTime ?? new TimeOnly(9, 0);
            var endTime = request.DefaultEndTime ?? new TimeOnly(12, 0);
            if (endTime <= startTime)
            {
                throw new ValidationException($"End Time ({endTime:HH\\:mm}) must be later than Start Time ({startTime:HH\\:mm}).");
            }

            bool isPatternWise = string.Equals(request.ScheduleMode, "PATTERN_WISE", StringComparison.OrdinalIgnoreCase) ||
                                 string.Equals(exam.ExamPattern, "OBJECTIVE", StringComparison.OrdinalIgnoreCase);

            // 4. Check & Handle Existing Schedules for this exam
            var existingGroupSchedules = await _context.ExamSchedules
                .Where(s => s.IsActive && s.ExaminationId == examinationId)
                .ToListAsync();

            if (existingGroupSchedules.Any() && !request.ReplaceExisting)
            {
                throw new ValidationException($"This Examination already has {existingGroupSchedules.Count} saved schedule(s). Select 'Replace Existing' or edit/remove those entries before automatic scheduling.");
            }

            // 5. Query Active Subjects to Schedule
            List<Subject> subjectsToSchedule;
            if (request.SubjectIds != null && request.SubjectIds.Any())
            {
                subjectsToSchedule = await _context.Subjects
                    .Where(s => s.IsActive && request.SubjectIds.Contains(s.SubjectId))
                    .OrderBy(s => s.SubjectId)
                    .ToListAsync();
            }
            else
            {
                var subQuery = _context.Subjects
                    .Where(s => s.IsActive && s.GroupId == targetGroupId);
                if (targetLevelId > 0)
                {
                    subQuery = subQuery.Where(s => s.AcademicLevelId == targetLevelId);
                }
                if (exam.BoardId > 0)
                {
                    subQuery = subQuery.Where(s => s.BoardId == exam.BoardId || s.BoardId == 0);
                }
                subjectsToSchedule = await subQuery.OrderBy(s => s.SubjectId).ToListAsync();

                if (!subjectsToSchedule.Any() && targetLevelId > 0)
                {
                    subjectsToSchedule = await _context.Subjects
                        .Where(s => s.IsActive && s.GroupId == targetGroupId && (exam.BoardId == 0 || s.BoardId == exam.BoardId || s.BoardId == 0))
                        .OrderBy(s => s.SubjectId)
                        .ToListAsync();
                }
            }

            if (!subjectsToSchedule.Any())
            {
                throw new ValidationException($"No active subjects found for Group '{groupCode}' (ID {targetGroupId}) to auto-schedule.");
            }

            // 6. Calculate Candidate Strength scoped to Campus, Group, Academic Level, and Program
            int? targetProgramId = request.ProgramId.HasValue && request.ProgramId.Value > 0
                ? request.ProgramId.Value
                : (exam.ProgramId.HasValue && exam.ProgramId.Value > 0 ? exam.ProgramId.Value : null);

            var studentBaseQuery = _context.Students
                .Where(st => st.IsActive && st.Status == "Active" && (st.CampusId == resolvedCampusId || st.CampusId == null || st.CampusId == 0));

            if (targetGroupId > 0)
            {
                studentBaseQuery = studentBaseQuery.Where(st => st.GroupId == targetGroupId);
            }
            if (targetLevelId > 0)
            {
                studentBaseQuery = studentBaseQuery.Where(st => st.AcademicLevelId == targetLevelId);
            }
            if (targetProgramId.HasValue && targetProgramId.Value > 0)
            {
                studentBaseQuery = studentBaseQuery.Where(st => st.ProgramId == targetProgramId.Value);
            }

            int candidateStrength = await studentBaseQuery.CountAsync();

            // If zero with program filter, fallback to group + level
            if (candidateStrength <= 0 && targetProgramId.HasValue)
            {
                var groupLevelQuery = _context.Students
                    .Where(st => st.IsActive && st.Status == "Active" && (st.CampusId == resolvedCampusId || st.CampusId == null || st.CampusId == 0) && st.GroupId == targetGroupId);
                if (targetLevelId > 0) groupLevelQuery = groupLevelQuery.Where(st => st.AcademicLevelId == targetLevelId);
                candidateStrength = await groupLevelQuery.CountAsync();
            }

            if (candidateStrength <= 0)
            {
                candidateStrength = 30; // Fallback default candidate count
            }

            // 7. Generate Sequential Exam Dates (Skipping Sundays if requested)
            var dates = new List<DateOnly>();
            var currDate = exam.StartDate == default ? DateOnly.FromDateTime(DateTime.Today) : exam.StartDate;

            if (isPatternWise)
            {
                dates.Add(currDate);
            }
            else
            {
                while (dates.Count < subjectsToSchedule.Count)
                {
                    if (!request.SkipSundays || currDate.DayOfWeek != DayOfWeek.Sunday)
                    {
                        dates.Add(currDate);
                    }
                    currDate = currDate.AddDays(1);
                }
            }

            var lastScheduledDate = dates.Last();
            if (exam.EndDate != default && lastScheduledDate > exam.EndDate)
            {
                exam.EndDate = lastScheduledDate;
                await _context.SaveChangesAsync();
            }

            // 8. Available Rooms for Campus
            var rooms = await _context.Rooms
                .Where(r => r.IsActive && (r.CampusId == resolvedCampusId || r.CampusId == 0))
                .OrderByDescending(r => r.Capacity)
                .ToListAsync();

            if (!rooms.Any())
            {
                rooms = await _context.Rooms
                    .Where(r => r.IsActive)
                    .OrderByDescending(r => r.Capacity)
                    .ToListAsync();
            }

            if (!rooms.Any())
            {
                throw new ValidationException("No active rooms/examination halls found in the institution.");
            }

            // 9. Available Staff / Invigilators for Campus (Prioritize Teaching staff)
            var staffList = await _context.Staffs
                .Where(s => !s.IsDeleted && s.Status == "Active" && s.StaffType == "Teaching" && (s.CampusId == resolvedCampusId || s.CampusId == null))
                .ToListAsync();

            if (!staffList.Any())
            {
                staffList = await _context.Staffs
                    .Where(s => !s.IsDeleted && s.Status == "Active" && s.StaffType == "Teaching")
                    .ToListAsync();
            }

            if (!staffList.Any())
            {
                staffList = await _context.Staffs
                    .Where(s => !s.IsDeleted && s.Status == "Active" && (s.CampusId == resolvedCampusId || s.CampusId == null))
                    .ToListAsync();
            }

            if (!staffList.Any())
            {
                throw new ValidationException("No active teaching faculty/staff found for invigilation duties.");
            }

            // Subject teacher exclusions
            var allAllocations = await _context.StaffSubjectAllocations.AsNoTracking().ToListAsync();
            var subjectTeachersMap = allAllocations
                .GroupBy(a => a.SubjectId)
                .ToDictionary(g => g.Key, g => g.Select(a => a.StaffId).ToHashSet());

            // Existing bookings within date range across all exams
            var minDate = dates.First();
            var maxDate = dates.Last();
            var bookedSchedules = await _context.ExamSchedules
                .Where(s => s.IsActive && s.ExamDate >= minDate && s.ExamDate <= maxDate)
                .ToListAsync();

            var bookedScheduleIds = bookedSchedules.Select(s => s.ExamScheduleId).ToList();
            var bookedInvigilators = await _context.InvigilatorAssignments
                .Where(ia => bookedScheduleIds.Contains(ia.ExamScheduleId))
                .ToListAsync();

            // Duty counts for fair load balancing
            var staffDutyCounts = new Dictionary<int, int>();
            foreach (var st in staffList) staffDutyCounts[st.Id] = 0;
            foreach (var ia in bookedInvigilators)
            {
                if (staffDutyCounts.ContainsKey(ia.InvigilatorId))
                    staffDutyCounts[ia.InvigilatorId]++;
            }

            // In-memory slot trackers for this batch to prevent intra-batch conflicts
            var batchAllocatedRooms = new List<(DateOnly date, TimeOnly start, TimeOnly end, int roomId, string hall)>();
            var batchAllocatedStaff = new List<(DateOnly date, TimeOnly start, TimeOnly end, int staffId)>();

            var plannedSessions = new List<(Subject? subject, DateOnly examDate, List<(Models.Timetable.Room room, int count, List<Models.Staff.Staff> invigilators)> roomAllocations)>();

            if (isPatternWise)
            {
                var patternDate = dates[0];
                var coreSubs = subjectsToSchedule.Where(s => !s.Language).ToList();
                if (!coreSubs.Any()) coreSubs = subjectsToSchedule;
                var anchorSubject = coreSubs.First();

                var roomAllocs = AllocateRoomsAndInvigilators(
                    patternDate, startTime, endTime, candidateStrength, anchorSubject.SubjectId,
                    rooms, staffList, subjectTeachersMap, bookedSchedules, bookedInvigilators,
                    batchAllocatedRooms, batchAllocatedStaff, staffDutyCounts);

                plannedSessions.Add((anchorSubject, patternDate, roomAllocs));
            }
            else
            {
                for (int i = 0; i < subjectsToSchedule.Count; i++)
                {
                    var sub = subjectsToSchedule[i];
                    var examDate = dates[i];

                    var roomAllocs = AllocateRoomsAndInvigilators(
                        examDate, startTime, endTime, candidateStrength, sub.SubjectId,
                        rooms, staffList, subjectTeachersMap, bookedSchedules, bookedInvigilators,
                        batchAllocatedRooms, batchAllocatedStaff, staffDutyCounts);

                    plannedSessions.Add((sub, examDate, roomAllocs));
                }
            }

            // 10. Persist All Atomically with Database Transaction within Resilient Execution Strategy
            var strategy = _context.Database.CreateExecutionStrategy();
            var createdResponses = new List<ExamScheduleResponse>();

            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    createdResponses.Clear();

                    // If replaceExisting or cleaning up prior schedules for this exam & subjects
                    var targetSubjectIds = plannedSessions.Select(p => p.subject?.SubjectId ?? 0).Where(id => id > 0).ToHashSet();
                    var priorSchedules = await _context.ExamSchedules
                        .Where(s => s.IsActive && s.ExaminationId == examinationId && (targetSubjectIds.Contains(s.SubjectId) || request.ReplaceExisting))
                        .ToListAsync();

                    if (priorSchedules.Any())
                    {
                        var priorSchedIds = priorSchedules.Select(s => s.ExamScheduleId).ToList();
                        var priorAssignments = await _context.InvigilatorAssignments
                            .Where(ia => priorSchedIds.Contains(ia.ExamScheduleId))
                            .ToListAsync();
                        if (priorAssignments.Any()) _context.InvigilatorAssignments.RemoveRange(priorAssignments);
                        _context.ExamSchedules.RemoveRange(priorSchedules);
                        await _context.SaveChangesAsync();
                    }

                    decimal defaultTotalMarks = request.TotalMarks.HasValue && request.TotalMarks.Value > 0
                        ? request.TotalMarks.Value
                        : (exam.TotalMarks.HasValue && exam.TotalMarks.Value > 0
                            ? exam.TotalMarks.Value
                            : (isPatternWise ? 300.00m : 100.00m));

                    decimal defaultPassingMarks = request.PassingMarks.HasValue && request.PassingMarks.Value > 0
                        ? request.PassingMarks.Value
                        : (exam.PassPercentage.HasValue && exam.PassPercentage.Value > 0
                            ? Math.Round(defaultTotalMarks * exam.PassPercentage.Value / 100.0m, 2)
                            : (isPatternWise ? 120.00m : 35.00m));

                    // Step 1: Add all ExamSchedules in batch
                    var plannedEntities = new List<(ExamSchedule schedule, Subject? sub, List<(Models.Timetable.Room room, int count, List<Models.Staff.Staff> invigilators)> roomAllocs)>();

                    foreach (var (sub, examDate, roomAllocs) in plannedSessions)
                    {
                        var primaryAlloc = roomAllocs[0];
                        var primaryRoom = primaryAlloc.room;
                        var primaryInv = primaryAlloc.invigilators.FirstOrDefault();

                        string hallName = !string.IsNullOrWhiteSpace(primaryRoom.RoomNumber)
                            ? primaryRoom.RoomNumber
                            : (!string.IsNullOrWhiteSpace(primaryRoom.RoomName) ? primaryRoom.RoomName : $"Room {primaryRoom.RoomId}");

                        string invName = primaryInv != null
                            ? $"{primaryInv.FirstName} {primaryInv.LastName}".Trim()
                            : string.Empty;

                        var newSchedule = new ExamSchedule
                        {
                            ExaminationId = examinationId,
                            SubjectId = sub?.SubjectId ?? subjectsToSchedule[0].SubjectId,
                            ExamDate = examDate,
                            StartTime = startTime,
                            EndTime = endTime,
                            ScheduleMode = isPatternWise ? "PATTERN_WISE" : "SUBJECT_WISE",
                            SessionId = isPatternWise ? (request.PatternName ?? "Core Session") : null,
                            RoomId = primaryRoom.RoomId,
                            Hall = hallName,
                            InvigilatorId = primaryInv?.Id,
                            Invigilator = invName,
                            ExamMode = isPatternWise ? "Objective" : "Written",
                            MaxMarks = defaultTotalMarks,
                            PassingMarks = defaultPassingMarks,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow
                        };

                        _context.ExamSchedules.Add(newSchedule);
                        plannedEntities.Add((newSchedule, sub, roomAllocs));
                    }

                    // Save all schedules in one DB trip
                    await _context.SaveChangesAsync();

                    // Step 2: Add all InvigilatorAssignments in batch
                    var allNewAssignments = new List<InvigilatorAssignment>();

                    foreach (var (newSchedule, sub, roomAllocs) in plannedEntities)
                    {
                        var invAssignmentsList = new List<InvigilatorAssignmentResponse>();
                        var hallAssignmentsList = new List<HallAssignmentDto>();

                        foreach (var (r, allocCount, rInvs) in roomAllocs)
                        {
                            string rHall = !string.IsNullOrWhiteSpace(r.RoomNumber)
                                ? r.RoomNumber
                                : (!string.IsNullOrWhiteSpace(r.RoomName) ? r.RoomName : $"Room {r.RoomId}");

                            string rHallInvNames = string.Join(", ", rInvs.Select(inv => $"{inv.FirstName} {inv.LastName}".Trim()).Where(n => !string.IsNullOrEmpty(n)));

                            var hallDto = new HallAssignmentDto
                            {
                                HallId = r.RoomId,
                                HallName = rHall,
                                RoomNumber = rHall,
                                CandidateCount = allocCount,
                                InvigilatorIds = rInvs.Select(inv => inv.Id).ToList(),
                                InvigilatorName = rHallInvNames,
                                Invigilator = rHallInvNames
                            };
                            hallAssignmentsList.Add(hallDto);

                            foreach (var inv in rInvs)
                            {
                                var assignment = new InvigilatorAssignment
                                {
                                    ExamScheduleId = newSchedule.ExamScheduleId,
                                    InvigilatorId = inv.Id,
                                    HallNumber = rHall,
                                    AssignedAt = DateTime.UtcNow
                                };
                                allNewAssignments.Add(assignment);

                                invAssignmentsList.Add(new InvigilatorAssignmentResponse
                                {
                                    InvigilatorAssignmentId = assignment.InvigilatorAssignmentId,
                                    ExamScheduleId = newSchedule.ExamScheduleId,
                                    InvigilatorId = inv.Id,
                                    FacultyId = inv.Id,
                                    StaffId = inv.Id,
                                    InvigilatorName = $"{inv.FirstName} {inv.LastName}".Trim(),
                                    HallNumber = rHall,
                                    AssignedAt = assignment.AssignedAt
                                });
                            }
                        }

                        createdResponses.Add(new ExamScheduleResponse
                        {
                            ExamScheduleId = newSchedule.ExamScheduleId,
                            ExaminationId = examinationId,
                            SubjectId = newSchedule.SubjectId,
                            SubjectName = sub?.SubjectName ?? string.Empty,
                            SubjectCode = sub?.SubjectCode ?? string.Empty,
                            GroupId = targetGroupId,
                            AcademicLevelId = targetLevelId,
                            ExamDate = newSchedule.ExamDate,
                            StartTime = newSchedule.StartTime,
                            EndTime = newSchedule.EndTime,
                            SessionId = newSchedule.SessionId,
                            ScheduleMode = newSchedule.ScheduleMode,
                            PatternName = isPatternWise ? (request.PatternName ?? "Core Session") : null,
                            RoomId = newSchedule.RoomId,
                            InvigilatorId = newSchedule.InvigilatorId,
                            Hall = newSchedule.Hall,
                            RoomNumber = newSchedule.Hall,
                            Invigilator = newSchedule.Invigilator,
                            InvigilatorName = newSchedule.Invigilator,
                            ExamMode = newSchedule.ExamMode,
                            MaxMarks = newSchedule.MaxMarks,
                            PassingMarks = newSchedule.PassingMarks,
                            CandidateCount = candidateStrength,
                            Status = "Scheduled",
                            IncludedSubjectIds = isPatternWise ? subjectsToSchedule.Select(s => s.SubjectId).ToList() : null,
                            HallAssignments = hallAssignmentsList,
                            InvigilatorAssignments = invAssignmentsList
                        });
                    }

                    if (allNewAssignments.Any())
                    {
                        _context.InvigilatorAssignments.AddRange(allNewAssignments);
                        await _context.SaveChangesAsync();
                    }

                    if (request.FinalizeSchedule)
                    {
                        exam.Status = "SCHEDULED";
                        exam.UpdatedAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }

                    await transaction.CommitAsync();
                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });

            EvictExamCache(examinationId);

            _logger.LogInformation("Auto-scheduled {Count} sessions for Examination {ExamId}, Group {GroupId} successfully.",
                createdResponses.Count, examinationId, targetGroupId);

            return createdResponses;
        }

        private List<(Models.Timetable.Room room, int count, List<Models.Staff.Staff> invigilators)> AllocateRoomsAndInvigilators(
            DateOnly examDate,
            TimeOnly startTime,
            TimeOnly endTime,
            int candidateStrength,
            int subjectId,
            List<Models.Timetable.Room> allRooms,
            List<Models.Staff.Staff> allStaff,
            Dictionary<int, HashSet<int>> subjectTeachersMap,
            List<ExamSchedule> bookedSchedules,
            List<InvigilatorAssignment> bookedInvigilators,
            List<(DateOnly date, TimeOnly start, TimeOnly end, int roomId, string hall)> batchAllocatedRooms,
            List<(DateOnly date, TimeOnly start, TimeOnly end, int staffId)> batchAllocatedStaff,
            Dictionary<int, int> staffDutyCounts)
        {
            // 1. Filter available rooms for this slot
            var availRooms = allRooms.Where(r =>
            {
                string rNum = (r.RoomNumber ?? string.Empty).Trim().ToLower();
                string rName = (r.RoomName ?? string.Empty).Trim().ToLower();

                // Check against existing database booked schedules
                bool isDbBooked = bookedSchedules.Any(s =>
                    s.ExamDate == examDate &&
                    !(endTime <= s.StartTime || startTime >= s.EndTime) &&
                    (s.RoomId == r.RoomId ||
                     (!string.IsNullOrWhiteSpace(rNum) && string.Equals(s.Hall.Trim().ToLower(), rNum, StringComparison.OrdinalIgnoreCase)) ||
                     (!string.IsNullOrWhiteSpace(rName) && string.Equals(s.Hall.Trim().ToLower(), rName, StringComparison.OrdinalIgnoreCase))));

                if (isDbBooked) return false;

                // Check against intra-batch allocated rooms
                bool isBatchBooked = batchAllocatedRooms.Any(b =>
                    b.date == examDate &&
                    !(endTime <= b.start || startTime >= b.end) &&
                    (b.roomId == r.RoomId ||
                     (!string.IsNullOrWhiteSpace(rNum) && string.Equals(b.hall.Trim().ToLower(), rNum, StringComparison.OrdinalIgnoreCase))));

                return !isBatchBooked;
            }).ToList();

            if (!availRooms.Any())
            {
                throw new ValidationException($"Insufficient hall capacity: No available rooms on {examDate:yyyy-MM-dd} during {startTime:HH\\:mm} - {endTime:HH\\:mm}.");
            }

            // 2. Select Room(s) to seat candidateStrength
            var selectedRoomAllocations = new List<(Models.Timetable.Room room, int count, List<Models.Staff.Staff> invigilators)>();
            int remainingCandidates = candidateStrength;

            // Strategy A: Single room fit
            var singleFit = availRooms
                .Where(r => r.Capacity >= candidateStrength)
                .OrderBy(r => r.Capacity) // closest capacity
                .FirstOrDefault();

            if (singleFit != null)
            {
                selectedRoomAllocations.Add((singleFit, candidateStrength, new List<Models.Staff.Staff>()));
                remainingCandidates = 0;
            }
            else
            {
                // Strategy B: Multi-room pack (largest capacity first)
                foreach (var r in availRooms.OrderByDescending(r => r.Capacity))
                {
                    if (remainingCandidates <= 0) break;
                    int roomCap = r.Capacity > 0 ? r.Capacity : 40;
                    int alloc = Math.Min(remainingCandidates, roomCap);
                    selectedRoomAllocations.Add((r, alloc, new List<Models.Staff.Staff>()));
                    remainingCandidates -= alloc;
                }
            }

            if (remainingCandidates > 0)
            {
                int totalAvail = selectedRoomAllocations.Sum(a => a.count);
                throw new ValidationException($"Insufficient hall capacity on {examDate:yyyy-MM-dd} ({startTime:HH\\:mm} - {endTime:HH\\:mm}). Required: {candidateStrength} seats, Available: {totalAvail} seats.");
            }

            // 3. Allocate Invigilators for each room
            var slotAllocatedStaffIds = new HashSet<int>();

            for (int rIdx = 0; rIdx < selectedRoomAllocations.Count; rIdx++)
            {
                var alloc = selectedRoomAllocations[rIdx];
                var room = alloc.room;
                int reqInvs = Math.Max(1, (int)Math.Ceiling(alloc.count / 50.0));

                // Find eligible staff
                var eligibleStaff = allStaff.Where(s =>
                {
                    if (slotAllocatedStaffIds.Contains(s.Id)) return false;

                    // Exclude if already busy in database bookings
                    var bookedScheduleIdsInSlot = bookedSchedules
                        .Where(bs => bs.ExamDate == examDate && !(endTime <= bs.StartTime || startTime >= bs.EndTime))
                        .Select(bs => bs.ExamScheduleId)
                        .ToHashSet();

                    bool isDbBusy = bookedInvigilators.Any(ia =>
                        ia.InvigilatorId == s.Id && bookedScheduleIdsInSlot.Contains(ia.ExamScheduleId));
                    if (isDbBusy) return false;

                    // Exclude if already busy in this batch
                    bool isBatchBusy = batchAllocatedStaff.Any(b =>
                        b.staffId == s.Id && b.date == examDate && !(endTime <= b.start || startTime >= b.end));
                    if (isBatchBusy) return false;

                    // Exclude if teacher of this subject
                    if (subjectTeachersMap.TryGetValue(subjectId, out var teachers) && teachers.Contains(s.Id))
                    {
                        return false;
                    }

                    return true;
                })
                .OrderBy(s => staffDutyCounts.GetValueOrDefault(s.Id, 0))
                .ToList();

                // If not enough due to subject exclusion, fallback allowing subject teachers only if no alternative
                if (eligibleStaff.Count < reqInvs)
                {
                    var fallbackStaff = allStaff.Where(s =>
                    {
                        if (slotAllocatedStaffIds.Contains(s.Id)) return false;

                        var bookedScheduleIdsInSlot = bookedSchedules
                            .Where(bs => bs.ExamDate == examDate && !(endTime <= bs.StartTime || startTime >= bs.EndTime))
                            .Select(bs => bs.ExamScheduleId)
                            .ToHashSet();

                        bool isDbBusy = bookedInvigilators.Any(ia =>
                            ia.InvigilatorId == s.Id && bookedScheduleIdsInSlot.Contains(ia.ExamScheduleId));
                        if (isDbBusy) return false;

                        bool isBatchBusy = batchAllocatedStaff.Any(b =>
                            b.staffId == s.Id && b.date == examDate && !(endTime <= b.start || startTime >= b.end));
                        return !isBatchBusy;
                    })
                    .OrderBy(s => staffDutyCounts.GetValueOrDefault(s.Id, 0))
                    .ToList();

                    if (fallbackStaff.Count >= reqInvs)
                    {
                        eligibleStaff = fallbackStaff;
                    }
                }

                if (eligibleStaff.Count < reqInvs)
                {
                    throw new ValidationException($"Insufficient invigilators available on {examDate:yyyy-MM-dd} ({startTime:HH\\:mm} - {endTime:HH\\:mm}). Required: {reqInvs}, Available: {eligibleStaff.Count}.");
                }

                var pickedStaff = eligibleStaff.Take(reqInvs).ToList();
                foreach (var st in pickedStaff)
                {
                    slotAllocatedStaffIds.Add(st.Id);
                    batchAllocatedStaff.Add((examDate, startTime, endTime, st.Id));
                    staffDutyCounts[st.Id] = staffDutyCounts.GetValueOrDefault(st.Id, 0) + 1;
                    alloc.invigilators.Add(st);
                }

                string rHall = !string.IsNullOrWhiteSpace(room.RoomNumber)
                    ? room.RoomNumber
                    : (!string.IsNullOrWhiteSpace(room.RoomName) ? room.RoomName : $"Room {room.RoomId}");

                batchAllocatedRooms.Add((examDate, startTime, endTime, room.RoomId, rHall));
                selectedRoomAllocations[rIdx] = alloc;
            }

            return selectedRoomAllocations;
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