using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Enums;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class MarksService : IMarksService
    {
        private readonly IMarksRepository _marksRepository;
        private readonly IMapper _mapper;
        private readonly ILogger<MarksService> _logger;

        public MarksService(IMarksRepository marksRepository, IMapper mapper, ILogger<MarksService> logger)
        {
            _marksRepository = marksRepository ?? throw new ArgumentNullException(nameof(marksRepository));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<List<MarkResponseDto>> GetAllMarksAsync()
        {
            var marks = await _marksRepository.GetAllAsync();
            return _mapper.Map<List<MarkResponseDto>>(marks);
        }

        public async Task<MarkResponseDto> GetMarkByIdAsync(int id)
        {
            var mark = await _marksRepository.GetByIdAsync(id);
            if (mark == null) throw new NotFoundException($"Mark record with ID {id} not found.");
            return _mapper.Map<MarkResponseDto>(mark);
        }

        public async Task<MarkResponseDto> SaveMarkAsync(SaveMarkDto dto)
        {
            var limits = await _marksRepository.GetExamFormatAndComponentLimitsAsync(dto.ExaminationId, dto.SubjectId);
            if (dto.PassingMarks <= 0)
            {
                dto.PassingMarks = limits.PassingMarks > 0 ? (int)Math.Round(limits.PassingMarks) : 35;
            }

            int finalScore;
            if (dto.IsAbsent)
            {
                finalScore = 0;
                dto.InternalMarks = 0;
                dto.PracticalMarks = 0;
                dto.TheoryMarks = 0;
            }
            else if (limits.IsObjective)
            {
                finalScore = dto.ObtainedMarks ?? dto.TotalMarks ?? (dto.InternalMarks + dto.PracticalMarks + dto.TheoryMarks);
                if (finalScore < 0 || finalScore > limits.MaxMarks)
                {
                    throw new ValidationException($"Obtained marks ({finalScore}) must be between 0 and {limits.MaxMarks}.");
                }
                dto.InternalMarks = 0;
                dto.PracticalMarks = 0;
                dto.TheoryMarks = 0;
            }
            else
            {
                if (dto.InternalMarks < 0 || dto.PracticalMarks < 0 || dto.TheoryMarks < 0)
                {
                    throw new ValidationException("Marks cannot be negative.");
                }
                if ((limits.InternalMax + limits.PracticalMax + limits.TheoryMax) > 0m)
                {
                    if (dto.InternalMarks > limits.InternalMax) throw new ValidationException($"Internal marks ({dto.InternalMarks}) exceed max ({limits.InternalMax}).");
                    if (dto.PracticalMarks > limits.PracticalMax) throw new ValidationException($"Practical marks ({dto.PracticalMarks}) exceed max ({limits.PracticalMax}).");
                    if (dto.TheoryMarks > limits.TheoryMax) throw new ValidationException($"Theory marks ({dto.TheoryMarks}) exceed max ({limits.TheoryMax}).");
                }
                finalScore = dto.InternalMarks + dto.PracticalMarks + dto.TheoryMarks;
                if (finalScore == 0 && (dto.ObtainedMarks.HasValue || dto.TotalMarks.HasValue))
                {
                    finalScore = dto.ObtainedMarks ?? dto.TotalMarks ?? 0;
                }
            }

            dto.TotalMarks = finalScore;
            dto.ObtainedMarks = finalScore;

            var existing = await _marksRepository.GetByExamSubjectStudentAsync(dto.ExaminationId, dto.SubjectId, dto.StudentId);
            if (existing != null)
            {
                existing.InternalMarks = dto.InternalMarks;
                existing.PracticalMarks = dto.PracticalMarks;
                existing.TheoryMarks = dto.TheoryMarks;
                existing.TotalMarks = finalScore;
                if (dto.PassingMarks > 0)
                {
                    existing.PassingMarks = dto.PassingMarks;
                }
                existing.IsAbsent = dto.IsAbsent;
                existing.Remarks = dto.Remarks;
                if (dto.FacultyId.HasValue && dto.FacultyId.Value > 0)
                {
                    existing.FacultyId = dto.FacultyId.Value;
                }
                if (dto.BoardId.HasValue && dto.BoardId.Value > 0)
                {
                    existing.BoardId = dto.BoardId.Value;
                }
                if (!string.IsNullOrWhiteSpace(dto.Board))
                {
                    existing.Board = dto.Board;
                }
                if (dto.AcademicYearId > 0)
                {
                    existing.AcademicYearId = dto.AcademicYearId;
                }
                if (dto.AcademicLevelId.HasValue && dto.AcademicLevelId.Value > 0)
                {
                    existing.AcademicLevelId = dto.AcademicLevelId.Value;
                }
                if (!string.IsNullOrWhiteSpace(dto.AcademicLevel))
                {
                    existing.AcademicLevel = dto.AcademicLevel;
                }
                if (dto.GroupId > 0)
                {
                    existing.GroupId = dto.GroupId;
                }
                if (dto.SectionId > 0)
                {
                    existing.SectionId = dto.SectionId;
                }
                if (!string.IsNullOrWhiteSpace(dto.RollNo))
                {
                    existing.RollNo = dto.RollNo;
                }
                if (!string.IsNullOrWhiteSpace(dto.StudentName))
                {
                    existing.StudentName = dto.StudentName;
                }
                existing.UpdatedAt = DateTime.UtcNow;

                var updated = await _marksRepository.UpdateAsync(existing);
                return _mapper.Map<MarkResponseDto>(updated);
            }
            else
            {
                var markEntity = _mapper.Map<Mark>(dto);
                markEntity.CreatedAt = DateTime.UtcNow;
                markEntity.UpdatedAt = DateTime.UtcNow;
                var created = await _marksRepository.CreateAsync(markEntity);
                if (created == null) throw new ValidationException("Failed to save mark entry.");
                return _mapper.Map<MarkResponseDto>(created);
            }
        }

        public async Task<List<MarkResponseDto>> BulkSaveMarksAsync(BulkUploadMarksDto dto)
        {
            var result = new List<MarkResponseDto>();
            if (dto?.Marks == null || dto.Marks.Count == 0)
            {
                return result;
            }

            var limitsCache = new Dictionary<string, (bool IsObjective, decimal MaxMarks, decimal InternalMax, decimal PracticalMax, decimal TheoryMax, decimal PassingMarks)>();
            var itemsToUpsert = new List<object>();

            foreach (var item in dto.Marks)
            {
                var cacheKey = $"{item.ExaminationId}:{item.SubjectId}";
                if (!limitsCache.TryGetValue(cacheKey, out var limits))
                {
                    limits = await _marksRepository.GetExamFormatAndComponentLimitsAsync(item.ExaminationId, item.SubjectId);
                    limitsCache[cacheKey] = limits;
                }

                int internalVal;
                int practicalVal;
                int theoryVal;
                int finalScore;

                if (item.IsAbsent)
                {
                    internalVal = 0;
                    practicalVal = 0;
                    theoryVal = 0;
                    finalScore = 0;
                }
                else if (limits.IsObjective)
                {
                    finalScore = item.ObtainedMarks ?? item.TotalMarks ?? (item.InternalMarks + item.PracticalMarks + item.TheoryMarks);
                    if (finalScore < 0 || finalScore > limits.MaxMarks)
                    {
                        throw new ValidationException($"Obtained marks ({finalScore}) must be between 0 and {limits.MaxMarks} for {item.StudentName ?? $"Student #{item.StudentId}"}.");
                    }
                    internalVal = 0;
                    practicalVal = 0;
                    theoryVal = 0;
                    item.InternalMarks = 0;
                    item.PracticalMarks = 0;
                    item.TheoryMarks = 0;
                    item.TotalMarks = finalScore;
                    item.ObtainedMarks = finalScore;
                }
                else
                {
                    internalVal = item.InternalMarks;
                    practicalVal = item.PracticalMarks;
                    theoryVal = item.TheoryMarks;
                    if (internalVal < 0 || practicalVal < 0 || theoryVal < 0)
                    {
                        throw new ValidationException($"Marks cannot be negative for {item.StudentName ?? $"Student #{item.StudentId}"}.");
                    }
                    if ((limits.InternalMax + limits.PracticalMax + limits.TheoryMax) > 0m)
                    {
                        if (internalVal > limits.InternalMax) throw new ValidationException($"Internal marks ({internalVal}) exceed max ({limits.InternalMax}) for {item.StudentName ?? $"Student #{item.StudentId}"}.");
                        if (practicalVal > limits.PracticalMax) throw new ValidationException($"Practical marks ({practicalVal}) exceed max ({limits.PracticalMax}) for {item.StudentName ?? $"Student #{item.StudentId}"}.");
                        if (theoryVal > limits.TheoryMax) throw new ValidationException($"Theory marks ({theoryVal}) exceed max ({limits.TheoryMax}) for {item.StudentName ?? $"Student #{item.StudentId}"}.");
                    }
                    finalScore = internalVal + practicalVal + theoryVal;
                    if (finalScore == 0 && (item.ObtainedMarks.HasValue || item.TotalMarks.HasValue))
                    {
                        finalScore = item.ObtainedMarks ?? item.TotalMarks ?? 0;
                    }
                }

                int resolvedPass = item.PassingMarks > 0 ? item.PassingMarks : (limits.PassingMarks > 0 ? (int)Math.Round(limits.PassingMarks) : 35);
                itemsToUpsert.Add(new
                {
                    campusId = item.CampusId ?? 1,
                    board = item.Board ?? string.Empty,
                    boardId = item.BoardId,
                    academicYearId = item.AcademicYearId,
                    academicLevel = item.AcademicLevel ?? string.Empty,
                    academicLevelId = item.AcademicLevelId,
                    groupId = item.GroupId,
                    sectionId = item.SectionId,
                    examinationId = item.ExaminationId,
                    subjectId = item.SubjectId,
                    studentId = item.StudentId,
                    rollNo = item.RollNo ?? string.Empty,
                    studentName = item.StudentName ?? string.Empty,
                    facultyId = item.FacultyId,
                    internalMarks = internalVal,
                    practicalMarks = practicalVal,
                    theoryMarks = theoryVal,
                    totalMarks = finalScore,
                    passingMarks = resolvedPass,
                    isAbsent = item.IsAbsent ? 1 : 0,
                    remarks = item.Remarks ?? string.Empty,
                    status = (int)EvaluationStatus.SUBMITTED
                });
            }

            var json = System.Text.Json.JsonSerializer.Serialize(itemsToUpsert);
            await _marksRepository.BulkUpsertMarksAsync(json, 0, null);

            try
            {
                return _mapper.Map<List<MarkResponseDto>>(dto.Marks);
            }
            catch
            {
return dto.Marks.Select(m => new MarkResponseDto
                {
                    CampusId = m.CampusId,
                    Board = m.Board,
                    BoardId = m.BoardId,
                    AcademicYearId = m.AcademicYearId,
                    AcademicLevel = m.AcademicLevel,
                    AcademicLevelId = m.AcademicLevelId,
                    GroupId = m.GroupId,
                    SectionId = m.SectionId,
                    ExaminationId = m.ExaminationId,
                    SubjectId = m.SubjectId,
                    StudentId = m.StudentId,
                    FacultyId = m.FacultyId,
                    RollNo = m.RollNo,
                    StudentName = m.StudentName,
                    InternalMarks = m.InternalMarks,
                    PracticalMarks = m.PracticalMarks,
                    TheoryMarks = m.TheoryMarks,
                    TotalMarks = m.IsAbsent ? 0 : ((m.TotalMarks.HasValue && m.TotalMarks.Value >= 0) ? m.TotalMarks.Value : (m.InternalMarks + m.PracticalMarks + m.TheoryMarks)),
                    PassingMarks = m.PassingMarks > 0 ? m.PassingMarks : 35,
                    IsAbsent = m.IsAbsent,
                    Remarks = m.Remarks,
                    Status = EvaluationStatus.SUBMITTED,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                }).ToList();
            }
        }

        public async Task<MarkResponseDto> UpdateMarkAsync(int id, UpdateMarkDto dto)
        {
            var existing = await _marksRepository.GetByIdAsync(id);
            if (existing == null) throw new NotFoundException($"Mark record with ID {id} not found.");
            if (existing.IsLocked || existing.Status == EvaluationStatus.APPROVED) throw new ConflictException("Cannot edit approved or locked marks.");

            var limits = await _marksRepository.GetExamFormatAndComponentLimitsAsync(existing.ExaminationId, existing.SubjectId);
            int intMarks = dto.IsAbsent ? 0 : dto.InternalMarks;
            int pracMarks = dto.IsAbsent ? 0 : dto.PracticalMarks;
            int thMarks = dto.IsAbsent ? 0 : dto.TheoryMarks;
            int finalScore;

            if (dto.IsAbsent)
            {
                finalScore = 0;
            }
            else if (limits.IsObjective)
            {
                finalScore = dto.ObtainedMarks ?? dto.TotalMarks ?? (intMarks + pracMarks + thMarks);
                if (finalScore < 0 || finalScore > limits.MaxMarks)
                {
                    throw new ValidationException($"Obtained marks ({finalScore}) must be between 0 and {limits.MaxMarks}.");
                }
                intMarks = 0;
                pracMarks = 0;
                thMarks = 0;
            }
            else
            {
                if (intMarks < 0 || pracMarks < 0 || thMarks < 0)
                    throw new ValidationException("Marks cannot be negative.");
                if ((limits.InternalMax + limits.PracticalMax + limits.TheoryMax) > 0m)
                {
                    if (intMarks > limits.InternalMax) throw new ValidationException($"Internal marks ({intMarks}) exceed max ({limits.InternalMax}).");
                    if (pracMarks > limits.PracticalMax) throw new ValidationException($"Practical marks ({pracMarks}) exceed max ({limits.PracticalMax}).");
                    if (thMarks > limits.TheoryMax) throw new ValidationException($"Theory marks ({thMarks}) exceed max ({limits.TheoryMax}).");
                }
                finalScore = intMarks + pracMarks + thMarks;
                if (finalScore == 0 && (dto.ObtainedMarks.HasValue || dto.TotalMarks.HasValue))
                {
                    finalScore = dto.ObtainedMarks ?? dto.TotalMarks ?? 0;
                }
            }

            _mapper.Map(dto, existing);
            existing.TotalMarks = finalScore;
            existing.InternalMarks = intMarks;
            existing.PracticalMarks = pracMarks;
            existing.TheoryMarks = thMarks;
            existing.IsAbsent = dto.IsAbsent;
            existing.UpdatedAt = DateTime.UtcNow;

            var updated = await _marksRepository.UpdateAsync(id, existing);
            return _mapper.Map<MarkResponseDto>(updated ?? existing);
        }

        public async Task<bool> DeleteMarkAsync(int id)
        {
            var existing = await _marksRepository.GetByIdAsync(id);
            if (existing == null) throw new NotFoundException($"Mark record with ID {id} not found.");
            if (existing.IsLocked || existing.Status == EvaluationStatus.APPROVED) throw new ConflictException("Cannot delete approved or locked marks.");
            return await _marksRepository.DeleteAsync(id);
        }

        public async Task<bool> RestoreMarkAsync(int id)
        {
            return await _marksRepository.RestoreAsync(id);
        }

        public async Task<List<MarkResponseDto>> GetMarksByStudentAsync(int studentId)
        {
            var marks = await _marksRepository.GetByStudentAsync(studentId);
            return _mapper.Map<List<MarkResponseDto>>(marks);
        }

        public async Task<List<MarkResponseDto>> GetMarksBySubjectAsync(int subjectId)
        {
            var marks = await _marksRepository.GetBySubjectAsync(subjectId);
            return _mapper.Map<List<MarkResponseDto>>(marks);
        }

        public async Task<List<MarkResponseDto>> GetMarksByExamAsync(int examinationId)
        {
            var marks = await _marksRepository.GetByExamAsync(examinationId);
            return _mapper.Map<List<MarkResponseDto>>(marks);
        }

        public async Task<int> VerifyMarksAsync(VerifyMarksDto dto)
        {
            return await _marksRepository.VerifyMarksAsync(dto.ExaminationId, dto.SubjectId, dto.SectionId, dto.VerifiedBy);
        }

        public async Task<int> PublishMarksAsync(PublishMarksDto dto)
        {
            return await _marksRepository.PublishMarksAsync(dto.ExaminationId, dto.SubjectId, dto.SectionId);
        }

        public async Task<MarksSummaryDto> GetSummaryAsync(int examinationId)
        {
            var marksList = (await _marksRepository.GetByExamAsync(examinationId)).ToList();
            if (!marksList.Any()) return new MarksSummaryDto();

            var total = marksList.Count;
            var verified = marksList.Count(m => m.IsVerified);
            var pending = total - verified;
            var passed = marksList.Count(m => m.TotalMarks >= m.PassingMarks);

            double avgMarks = marksList.Average(m => (double)m.TotalMarks);

            return new MarksSummaryDto
            {
                TotalStudents = total,
                TotalMarksEntered = total,
                VerifiedStudents = verified,
                PendingStudents = pending,
                PassedStudents = passed,
                FailedStudents = total - passed,
                PassPercentage = Math.Round(((decimal)passed / total) * 100, 2),
                HighestMarks = marksList.Max(m => m.TotalMarks),
                AverageMarks = Math.Round((decimal)avgMarks, 2)
            };
        }

        public async Task<byte[]> ExportCsvAsync(int examinationId, int subjectId)
        {
            var marks = await _marksRepository.GetByExamAsync(examinationId);
            var filtered = marks.Where(m => m.SubjectId == subjectId).ToList();
            var sb = new StringBuilder();
            sb.AppendLine("RollNo,StudentName,Internal,Practical,Theory,Total,Status");
            foreach (var m in filtered)
            {
                var status = m.TotalMarks >= m.PassingMarks ? "Pass" : "Fail";
                sb.AppendLine($"{m.RollNo},{m.StudentName},{m.InternalMarks},{m.PracticalMarks},{m.TheoryMarks},{m.TotalMarks},{status}");
            }
            return Encoding.UTF8.GetBytes(sb.ToString());
        }
    }
}
