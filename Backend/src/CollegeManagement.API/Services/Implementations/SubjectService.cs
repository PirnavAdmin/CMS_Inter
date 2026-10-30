using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Subject;
using CollegeManagement.API.Repositories;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class SubjectService : ISubjectService
    {
        private readonly ISubjectRepository _repository;
        private readonly IDepartmentRepository _departmentRepository;
        private readonly IGroupRepository _groupRepository;

        public SubjectService(
            ISubjectRepository repository,
            IDepartmentRepository departmentRepository,
            IGroupRepository groupRepository)
        {
            _repository = repository;
            _departmentRepository = departmentRepository;
            _groupRepository = groupRepository;
        }

        private static readonly Dictionary<string, string[]> DepartmentKeywordMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Biology"] = new[] { "biology", "botany", "zoology", "bio", "bot", "zoo", "life science" },
            ["Botany"] = new[] { "botany", "biology", "bot", "bio" },
            ["Zoology"] = new[] { "zoology", "biology", "zoo", "bio" },
            ["Physics"] = new[] { "physics", "phy", "phys" },
            ["Chemistry"] = new[] { "chemistry", "chem", "chm", "che" },
            ["Mathematics"] = new[] { "mathematics", "math", "maths", "stat", "statistics" },
            ["Statistics"] = new[] { "statistics", "stat", "mathematics", "math" },
            ["English"] = new[] { "english", "eng", "engl" },
            ["Telugu"] = new[] { "telugu", "tel" },
            ["Hindi"] = new[] { "hindi", "hin" },
            ["Sanskrit"] = new[] { "sanskrit", "sans", "sansk" },
            ["Urdu"] = new[] { "urdu", "urd" },
            ["Languages"] = new[] { "english", "sanskrit", "telugu", "hindi", "urdu", "eng", "sans", "tel", "hin", "urd", "language" },
            ["Commerce"] = new[] { "commerce", "accountancy", "accounts", "economics", "business studies", "business", "civics", "acc", "econ", "bus", "com" },
            ["Accountancy"] = new[] { "accountancy", "accounts", "commerce", "acc", "com" },
            ["Economics"] = new[] { "economics", "econ", "commerce", "com" },
            ["Business Studies"] = new[] { "business studies", "business", "commerce", "bus", "com" },
            ["Civics"] = new[] { "civics", "political science", "politics", "civ", "pol" },
            ["Political Science"] = new[] { "political science", "politics", "civics", "pol", "civ" },
            ["History"] = new[] { "history", "hist" },
            ["Computer Science"] = new[] { "computer science", "computer applications", "computer", "cs", "data science", "information technology", "it" },
            ["Computer Applications"] = new[] { "computer applications", "computer science", "computer", "ca", "cs", "it" },
            ["Data Science"] = new[] { "data science", "computer science", "computer", "cs" },
            ["Physical Education"] = new[] { "physical education", "sports", "pe", "yoga" },
            ["Environmental Studies"] = new[] { "environmental studies", "environmental", "evs" },
            ["Science"] = new[] { "physics", "chemistry", "botany", "zoology", "biology", "mathematics", "phy", "chem", "bot", "zoo", "math", "bio", "science" },
            ["Arts"] = new[] { "history", "economics", "civics", "political science", "commerce", "english" },
            ["Humanities"] = new[] { "history", "economics", "civics", "political science", "commerce", "english" }
        };

        private static string[] GetDepartmentKeywords(string departmentName)
        {
            if (string.IsNullOrWhiteSpace(departmentName)) return Array.Empty<string>();
            var clean = departmentName.Trim();
            if (DepartmentKeywordMap.TryGetValue(clean, out var keywords))
            {
                return keywords;
            }

            foreach (var kvp in DepartmentKeywordMap)
            {
                if (clean.IndexOf(kvp.Key, StringComparison.OrdinalIgnoreCase) >= 0 ||
                    kvp.Key.IndexOf(clean, StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return kvp.Value;
                }
            }

            return new[] { clean.ToLowerInvariant() };
        }

        public async Task<string?> ResolveDepartmentNameAsync(string? department, int? departmentId, CancellationToken cancellationToken = default)
        {
            if (!string.IsNullOrWhiteSpace(department)) return department.Trim();
            if (departmentId.HasValue && departmentId.Value > 0)
            {
                var dept = await _departmentRepository.GetByIdAsync(departmentId.Value);
                if (dept != null) return dept.DepartmentName;
            }
            return null;
        }

        private static bool MatchesKeyword(string? subjectName, string? subjectCode, string keyword)
        {
            var n = (subjectName ?? string.Empty).Trim().ToLowerInvariant();
            var c = (subjectCode ?? string.Empty).Trim().ToLowerInvariant();
            var k = (keyword ?? string.Empty).Trim().ToLowerInvariant();

            if (string.IsNullOrEmpty(k)) return false;

            if (k.Length >= 4)
            {
                if (n.Contains(k) || c.Contains(k)) return true;
            }
            else
            {
                if (c == k || c.StartsWith(k)) return true;
                var words = n.Split(new[] { ' ', '-', '_', '/', '(', ')' }, StringSplitOptions.RemoveEmptyEntries);
                if (words.Any(w => w == k || w.StartsWith(k))) return true;
            }
            return false;
        }

        public List<SubjectDto> ApplyDepartmentFilter(IEnumerable<SubjectDto> subjects, string? deptName)
        {
            if (subjects == null) return new List<SubjectDto>();
            var list = subjects.ToList();

            if (string.IsNullOrWhiteSpace(deptName) ||
                deptName.Equals("General", StringComparison.OrdinalIgnoreCase) ||
                deptName.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                return list;
            }

            var keywords = GetDepartmentKeywords(deptName);
            if (!keywords.Any()) return list;

            var matched = list.Where(s => keywords.Any(k => MatchesKeyword(s.SubjectName, s.SubjectCode, k))).ToList();
            return matched.Any() ? matched : list;
        }

        public Task<List<SubjectDto>> GetAllAsync(
            string? search = null,
            int? boardId = null,
            int? groupId = null,
            int? academicLevelId = null,
            bool? isActive = null,
            CancellationToken cancellationToken = default)
        {
            return _repository.GetAllAsync(search, boardId, groupId, academicLevelId, isActive, cancellationToken);
        }

        public Task<SubjectDto?> GetByIdAsync(int subjectId, CancellationToken cancellationToken = default)
        {
            return _repository.GetByIdAsync(subjectId, cancellationToken);
        }

        public Task<List<SubjectDto>> GetByGroupIdAsync(int groupId, CancellationToken cancellationToken = default)
        {
            return _repository.GetByGroupIdAsync(groupId, cancellationToken);
        }

        public async Task<List<SubjectDto>> GetByContextAsync(int boardId, int groupId, int academicLevelId, CancellationToken cancellationToken = default)
        {
            if (boardId <= 0 && groupId > 0)
            {
                var group = await _groupRepository.GetByIdAsync(groupId, cancellationToken);
                if (group != null)
                {
                    boardId = group.BoardId;
                    if (academicLevelId <= 0) academicLevelId = group.AcademicLevelId;
                }
            }

            return await _repository.GetByContextAsync(boardId, groupId, academicLevelId, cancellationToken);
        }

        public async Task<SubjectDto> CreateAsync(CreateSubjectDto dto, CancellationToken cancellationToken = default)
        {
            ValidateDto(dto.BoardId, dto.GroupId, dto.AcademicLevelId, dto.SubjectName, dto.SubjectCode, dto.TotalMarks, dto.PassingMarks);

            var exists = await _repository.SubjectCodeExistsAsync(dto.SubjectCode, dto.BoardId, dto.GroupId, dto.AcademicLevelId, null, cancellationToken);
            if (exists)
                throw new ValidationException($"Subject code '{dto.SubjectCode}' already exists in the selected context.");

            return await _repository.CreateAsync(dto, cancellationToken);
        }

        public async Task<List<SubjectDto>> BulkCreateAsync(List<CreateSubjectDto> dtos, CancellationToken cancellationToken = default)
        {
            if (dtos == null || !dtos.Any())
                throw new ValidationException("At least one subject must be provided for bulk creation.");

            foreach (var dto in dtos)
            {
                ValidateDto(dto.BoardId, dto.GroupId, dto.AcademicLevelId, dto.SubjectName, dto.SubjectCode, dto.TotalMarks, dto.PassingMarks);
            }

            return await _repository.BulkCreateAsync(dtos, cancellationToken);
        }

        public async Task<SubjectDto?> UpdateAsync(int subjectId, UpdateSubjectDto dto, CancellationToken cancellationToken = default)
        {
            ValidateDto(dto.BoardId, dto.GroupId, dto.AcademicLevelId, dto.SubjectName, dto.SubjectCode, dto.TotalMarks, dto.PassingMarks);

            var codeExists = await _repository.SubjectCodeExistsAsync(dto.SubjectCode, dto.BoardId, dto.GroupId, dto.AcademicLevelId, subjectId, cancellationToken);
            if (codeExists)
                throw new ValidationException($"Subject code '{dto.SubjectCode}' already exists in the selected context.");

            return await _repository.UpdateAsync(subjectId, dto, cancellationToken);
        }

        public Task<(bool Success, string Message)> DeleteAsync(int subjectId, CancellationToken cancellationToken = default)
        {
            return _repository.DeleteAsync(subjectId, cancellationToken);
        }

        public Task<SubjectDto?> ChangeStatusAsync(int subjectId, bool isActive, CancellationToken cancellationToken = default)
        {
            return _repository.ChangeStatusAsync(subjectId, isActive, cancellationToken);
        }

        public Task<List<SubjectDto>> SearchAsync(string? search, int? boardId, int? groupId, int? academicLevelId, bool? isActive, CancellationToken cancellationToken = default)
        {
            return _repository.SearchAsync(search, boardId, groupId, academicLevelId, isActive, cancellationToken);
        }

        public Task<List<SubjectDto>> GetActiveAsync(CancellationToken cancellationToken = default)
        {
            return _repository.GetActiveAsync(cancellationToken);
        }

        public Task<List<SubjectDto>> GetByBoardIdAsync(int boardId, CancellationToken cancellationToken = default)
        {
            return _repository.GetByBoardIdAsync(boardId, cancellationToken);
        }

        public Task<bool> SubjectCodeExistsAsync(string subjectCode, int boardId, int groupId, int academicLevelId, int? excludeSubjectId = null, CancellationToken cancellationToken = default)
        {
            return _repository.SubjectCodeExistsAsync(subjectCode, boardId, groupId, academicLevelId, excludeSubjectId, cancellationToken);
        }

        private static void ValidateDto(int boardId, int groupId, int academicLevelId, string subjectName, string subjectCode, int totalMarks, int passingMarks)
        {
            if (boardId <= 0) throw new ValidationException("Valid BoardId is required.");
            if (groupId <= 0) throw new ValidationException("Valid GroupId is required.");
            if (academicLevelId <= 0) throw new ValidationException("Valid AcademicLevelId is required.");
            if (string.IsNullOrWhiteSpace(subjectName)) throw new ValidationException("Subject name is required.");
            if (string.IsNullOrWhiteSpace(subjectCode)) throw new ValidationException("Subject code is required.");
            if (totalMarks <= 0) throw new ValidationException("Total marks must be greater than zero.");
            if (passingMarks > totalMarks) throw new ValidationException("Passing marks cannot exceed total marks.");
        }
    }
}
