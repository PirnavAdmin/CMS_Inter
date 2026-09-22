using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Subject;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories;

namespace CollegeManagement.API.Services
{
    public class SubjectService : ISubjectService
    {
        private readonly ISubjectRepository _repository;

        public SubjectService(ISubjectRepository repository) => _repository = repository;

        public Task<IEnumerable<Subject>> GetAllAsync() => _repository.GetAllAsync();

        public Task<Subject?> GetByIdAsync(int subjectId) => _repository.GetByIdAsync(subjectId);

        public Task<IEnumerable<Subject>> GetByGroupIdAsync(int groupId) => _repository.GetByGroupIdAsync(groupId);

        public Task<IEnumerable<Subject>> GetByContextAsync(int boardId, int groupId, int academicLevelId) =>
            _repository.GetByContextAsync(boardId, groupId, academicLevelId);

        public async Task<Subject> CreateAsync(CreateSubjectDto dto)
        {
            if (dto.BoardId <= 0) throw new ValidationException("Valid BoardId is required.");
            if (dto.GroupId <= 0) throw new ValidationException("Valid GroupId is required.");
            if (dto.AcademicLevelId <= 0) throw new ValidationException("Valid AcademicLevelId is required.");
            if (string.IsNullOrWhiteSpace(dto.SubjectName)) throw new ValidationException("Subject name is required.");
            if (string.IsNullOrWhiteSpace(dto.SubjectCode)) throw new ValidationException("Subject code is required.");
            if (dto.PassingMarks > dto.TotalMarks) throw new ValidationException("Passing marks cannot exceed total marks.");

            var exists = await _repository.SubjectCodeExistsAsync(dto.SubjectCode, dto.BoardId, dto.GroupId, dto.AcademicLevelId);
            if (exists)
                throw new ValidationException($"Subject code '{dto.SubjectCode}' already exists in the selected context (Board, Group, Academic Level).");

            var subject = new Subject
            {
                BoardId = dto.BoardId,
                GroupId = dto.GroupId,
                AcademicLevelId = dto.AcademicLevelId,
                SubjectName = dto.SubjectName.Trim(),
                SubjectCode = dto.SubjectCode.Trim(),
                SubjectType = dto.SubjectType.Trim(),
                Theory = dto.Theory,
                Practical = dto.Practical,
                Language = dto.Language,
                Elective = dto.Elective,
                InternalMarks = dto.InternalMarks,
                PracticalMarks = dto.PracticalMarks,
                ExternalMarks = dto.ExternalMarks,
                TotalMarks = dto.TotalMarks,
                PassingMarks = dto.PassingMarks,
                IsActive = dto.IsActive
            };

            return await _repository.CreateAsync(subject);
        }

        public async Task<Subject?> UpdateAsync(int subjectId, UpdateSubjectDto dto)
        {
            if (dto.BoardId <= 0) throw new ValidationException("Valid BoardId is required.");
            if (dto.GroupId <= 0) throw new ValidationException("Valid GroupId is required.");
            if (dto.AcademicLevelId <= 0) throw new ValidationException("Valid AcademicLevelId is required.");
            if (string.IsNullOrWhiteSpace(dto.SubjectName)) throw new ValidationException("Subject name is required.");
            if (string.IsNullOrWhiteSpace(dto.SubjectCode)) throw new ValidationException("Subject code is required.");
            if (dto.PassingMarks > dto.TotalMarks) throw new ValidationException("Passing marks cannot exceed total marks.");

            var existing = await _repository.GetByIdAsync(subjectId);
            if (existing == null) return null;

            var codeExists = await _repository.SubjectCodeExistsAsync(dto.SubjectCode, dto.BoardId, dto.GroupId, dto.AcademicLevelId, subjectId);
            if (codeExists)
                throw new ValidationException($"Subject code '{dto.SubjectCode}' already exists in the selected context.");

            existing.BoardId = dto.BoardId;
            existing.GroupId = dto.GroupId;
            existing.AcademicLevelId = dto.AcademicLevelId;
            existing.SubjectName = dto.SubjectName.Trim();
            existing.SubjectCode = dto.SubjectCode.Trim();
            existing.SubjectType = dto.SubjectType.Trim();
            existing.Theory = dto.Theory;
            existing.Practical = dto.Practical;
            existing.Language = dto.Language;
            existing.Elective = dto.Elective;
            existing.InternalMarks = dto.InternalMarks;
            existing.PracticalMarks = dto.PracticalMarks;
            existing.ExternalMarks = dto.ExternalMarks;
            existing.TotalMarks = dto.TotalMarks;
            existing.PassingMarks = dto.PassingMarks;
            existing.IsActive = dto.IsActive;

            return await _repository.UpdateAsync(subjectId, existing);
        }

        public Task<bool> DeleteAsync(int subjectId) => _repository.DeleteAsync(subjectId);

        public Task<IEnumerable<Subject>> SearchAsync(string? search, int? boardId, int? groupId, int? academicLevelId, bool? isActive) =>
            _repository.SearchAsync(search, boardId, groupId, academicLevelId, isActive);

        public Task<IEnumerable<Subject>> GetActiveAsync() => _repository.GetActiveAsync();

        public Task<IEnumerable<Subject>> GetByBoardIdAsync(int boardId) => _repository.GetByBoardIdAsync(boardId);

        public Task<bool> SubjectCodeExistsAsync(string subjectCode, int boardId, int groupId, int academicLevelId, int? excludeSubjectId = null) =>
            _repository.SubjectCodeExistsAsync(subjectCode, boardId, groupId, academicLevelId, excludeSubjectId);
    }
}
