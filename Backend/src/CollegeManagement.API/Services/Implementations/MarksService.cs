using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
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
        private readonly AppDbContext _context;

        public MarksService(IMarksRepository marksRepository, IMapper mapper, ILogger<MarksService> logger, AppDbContext context)
        {
            _marksRepository = marksRepository;
            _mapper = mapper;
            _logger = logger;
            _context = context;
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
            var isObjective = await ExaminationFormatHelper.IsObjectiveExamAsync(_context, dto.ExaminationId, dto.SubjectId);
            var (maxMarks, defaultPass) = await ExaminationFormatHelper.ResolveSubjectMarksLimitsAsync(_context, dto.ExaminationId, dto.SubjectId);

            if (dto.InternalMarks < 0 || dto.PracticalMarks < 0 || dto.TheoryMarks < 0 || (dto.ObtainedMarks.HasValue && dto.ObtainedMarks.Value < 0))
            {
                throw new ValidationException("Marks cannot be negative.");
            }

            if (dto.PassingMarks <= 0)
            {
                dto.PassingMarks = (int)defaultPass;
            }

            int finalScore;
            if (isObjective)
            {
                // Objective examination: accept single objective score, ignore internal and practical marks
                finalScore = dto.ObtainedMarks.HasValue
                    ? dto.ObtainedMarks.Value
                    : (dto.TotalMarks.HasValue ? dto.TotalMarks.Value : dto.TheoryMarks);

                if (!dto.IsAbsent && maxMarks > 0 && finalScore > (int)maxMarks)
                {
                    throw new ValidationException($"Obtained marks ({finalScore}) cannot exceed configured maximum marks ({maxMarks}) for this objective examination subject.");
                }

                if (dto.IsAbsent)
                {
                    finalScore = 0;
                }

                dto.InternalMarks = 0;
                dto.PracticalMarks = 0;
                dto.TheoryMarks = finalScore;
                dto.TotalMarks = finalScore;
                dto.ObtainedMarks = finalScore;
            }
            else
            {
                // Regular examination: preserve internal, practical and theory marks
                if (dto.IsAbsent)
                {
                    finalScore = 0;
                }
                else
                {
                    finalScore = dto.InternalMarks + dto.PracticalMarks + dto.TheoryMarks;
                    if (maxMarks > 0 && finalScore > (int)maxMarks)
                    {
                        throw new ValidationException($"Total marks ({finalScore}) cannot exceed configured maximum marks ({maxMarks}).");
                    }
                }
                dto.TotalMarks = finalScore;
                dto.ObtainedMarks = finalScore;
            }

            var existing = await _marksRepository.GetByExamSubjectStudentAsync(dto.ExaminationId, dto.SubjectId, dto.StudentId);
            if (existing != null)
            {
                if (existing.IsLocked || existing.Status == CollegeManagement.API.Models.Enums.EvaluationStatus.APPROVED || existing.Status == CollegeManagement.API.Models.Enums.EvaluationStatus.VERIFIED)
                {
                    throw new ConflictException("Cannot edit verified, approved or locked marks.");
                }

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
                existing.IsActive = true;
                existing.UpdatedAt = DateTime.UtcNow;

                var updated = await _marksRepository.UpdateAsync(existing);
                return _mapper.Map<MarkResponseDto>(updated ?? existing);
            }
            else
            {
                var markEntity = _mapper.Map<Mark>(dto);
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

            foreach (var item in dto.Marks)
            {
                var saved = await SaveMarkAsync(item);
                result.Add(saved);
            }
            return result;
        }

        public async Task<MarkResponseDto> UpdateMarkAsync(int id, UpdateMarkDto dto)
        {
            var existing = await _marksRepository.GetByIdAsync(id);
            if (existing.IsLocked || existing.Status == CollegeManagement.API.Models.Enums.EvaluationStatus.APPROVED || existing.Status == CollegeManagement.API.Models.Enums.EvaluationStatus.VERIFIED)
            {
                throw new ConflictException("Cannot edit verified, approved or locked marks.");
            }

            if (dto.InternalMarks < 0 || dto.PracticalMarks < 0 || dto.TheoryMarks < 0 || (dto.ObtainedMarks.HasValue && dto.ObtainedMarks.Value < 0))
            {
                throw new ValidationException("Marks cannot be negative.");
            }

            var isObjective = await ExaminationFormatHelper.IsObjectiveExamAsync(_context, existing.ExaminationId, existing.SubjectId);
            var (maxMarks, _) = await ExaminationFormatHelper.ResolveSubjectMarksLimitsAsync(_context, existing.ExaminationId, existing.SubjectId);

            int finalScore;
            if (isObjective)
            {
                finalScore = dto.ObtainedMarks.HasValue
                    ? dto.ObtainedMarks.Value
                    : (dto.TotalMarks.HasValue ? dto.TotalMarks.Value : dto.TheoryMarks);

                if (!dto.IsAbsent && maxMarks > 0 && finalScore > (int)maxMarks)
                {
                    throw new ValidationException($"Obtained marks ({finalScore}) cannot exceed configured maximum marks ({maxMarks}) for this objective examination subject.");
                }

                if (dto.IsAbsent)
                {
                    finalScore = 0;
                }

                dto.InternalMarks = 0;
                dto.PracticalMarks = 0;
                dto.TheoryMarks = finalScore;
                dto.TotalMarks = finalScore;
                dto.ObtainedMarks = finalScore;
            }
            else
            {
                if (dto.IsAbsent)
                {
                    finalScore = 0;
                }
                else
                {
                    finalScore = dto.InternalMarks + dto.PracticalMarks + dto.TheoryMarks;
                    if (maxMarks > 0 && finalScore > (int)maxMarks)
                    {
                        throw new ValidationException($"Total marks ({finalScore}) cannot exceed configured maximum marks ({maxMarks}).");
                    }
                }
                dto.TotalMarks = finalScore;
                dto.ObtainedMarks = finalScore;
            }

            _mapper.Map(dto, existing);
            existing.TotalMarks = finalScore;
            existing.InternalMarks = dto.InternalMarks;
            existing.PracticalMarks = dto.PracticalMarks;
            existing.TheoryMarks = dto.TheoryMarks;
            existing.IsAbsent = dto.IsAbsent;
            existing.UpdatedAt = DateTime.UtcNow;

            var updated = await _marksRepository.UpdateAsync(id, existing);
            return _mapper.Map<MarkResponseDto>(updated ?? existing);
        }

        public async Task<bool> DeleteMarkAsync(int id)
        {
            var existing = await _marksRepository.GetByIdAsync(id);
            if (existing == null) throw new NotFoundException($"Mark record with ID {id} not found.");
            if (existing.IsLocked || existing.Status == CollegeManagement.API.Models.Enums.EvaluationStatus.APPROVED || existing.Status == CollegeManagement.API.Models.Enums.EvaluationStatus.VERIFIED)
            {
                throw new ConflictException("Cannot delete verified, approved or locked marks.");
            }
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

            // Clean LINQ Aggregations without Delegate Type Inference Ambiguity
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