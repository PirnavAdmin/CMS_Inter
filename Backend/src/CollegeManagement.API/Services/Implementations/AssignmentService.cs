using CollegeManagement.API.DTOs.Assignment;
using CollegeManagement.API.DTOs.Faculty;
using CollegeManagement.API.Models;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.DTOs.Assignment.Admin;

namespace CollegeManagement.API.Services.Implementations
{
    public class AssignmentService : IAssignmentService
    {
        private readonly IAssignmentRepository _repository;

        public AssignmentService(IAssignmentRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<AssignmentResponseDto>> GetAllAsync()
        {
            var assignments = await _repository.GetAllAsync();

            return assignments.Select(MapToResponseDto);
        }

        public async Task<AssignmentResponseDto?> GetByIdAsync(int id)
        {
            var assignment = await _repository.GetByIdAsync(id);

            if (assignment == null)
                return null;

            return MapToResponseDto(assignment);
        }

        public async Task<AssignmentResponseDto> CreateAsync(CreateAssignmentDto dto)
        {
            var assignment = new Assignment
            {
                Title = dto.Title,
                AcademicYearId = dto.AcademicYearId,
                AcademicLevel = dto.AcademicLevel,
                SubjectId = dto.SubjectId,
                FacultyId = dto.FacultyId,
                Description = dto.Description,
                StartDate = dto.StartDate,
                DueDate = dto.DueDate,
                GroupId = dto.GroupId,
                Attachment = dto.AttachmentPath,
                MaximumMarks = dto.MaximumMarks,

                CreatedByType = "Faculty"
            };

            await _repository.AddAsync(assignment);

            return MapToResponseDto(assignment);
        }

        public async Task<AssignmentResponseDto?> UpdateAsync(int id, UpdateAssignmentDto dto)
        {
            var assignment = await _repository.GetByIdAsync(id);

            if (assignment == null)
                return null;

            assignment.Title = dto.Title;
            assignment.AcademicYearId = dto.AcademicYearId;
            assignment.AcademicLevel = dto.AcademicLevel;
            assignment.SubjectId = dto.SubjectId;
            assignment.FacultyId = dto.FacultyId;
            assignment.Description = dto.Description;
            assignment.StartDate = dto.StartDate;
            assignment.DueDate = dto.DueDate;
            assignment.GroupId = dto.GroupId;
            assignment.MaximumMarks = dto.MaximumMarks;

            if (!string.IsNullOrEmpty(dto.AttachmentPath))
            {
                assignment.Attachment = dto.AttachmentPath;
            }

            await _repository.UpdateAsync(assignment);

            return MapToResponseDto(assignment);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var assignment = await _repository.GetByIdAsync(id);

            if (assignment == null)
                return false;

            await _repository.DeleteAsync(assignment);

            return true;
        }

        public async Task<bool> PublishAssignmentAsync(int assignmentId)
        {
            return await _repository.PublishAssignmentAsync(assignmentId);
        }

        public async Task<bool> PublishAssignmentsAsync(List<int> assignmentIds)
        {
            if (assignmentIds == null || assignmentIds.Count == 0)
                return false;

            bool allSuccess = true;
            foreach (var id in assignmentIds)
            {
                var success = await _repository.PublishAssignmentAsync(id);
                if (!success)
                {
                    allSuccess = false;
                }
            }

            return allSuccess;
        }

        public async Task<IEnumerable<AssignmentResponseDto>> GetPublishedAssignmentsAsync()
        {
            var assignments = await _repository.GetPublishedAssignmentsAsync();
            return assignments.Select(MapToResponseDto);
        }

        private AssignmentResponseDto MapToResponseDto(Assignment assignment)
        {
            return new AssignmentResponseDto
            {
                AssignmentId = assignment.AssignmentId,

                Title = assignment.Title,

                AcademicYearId = assignment.AcademicYearId,
                AcademicYearName = assignment.AcademicYearName,

                AcademicLevel = assignment.AcademicLevel,

                GroupId = assignment.GroupId,
                GroupName = assignment.GroupName,

                SubjectId = assignment.SubjectId,
                SubjectName = assignment.SubjectName,

                FacultyId = assignment.FacultyId ?? 0,
                FacultyName = assignment.FacultyName,

                Description = assignment.Description,
                StartDate = assignment.StartDate,
                DueDate = assignment.DueDate,

                AttachmentPath = assignment.Attachment,

                MaximumMarks = assignment.MaximumMarks,
                CreatedByType = assignment.CreatedByType,
                IsPublished = assignment.IsPublished,
                PublishedAt = assignment.PublishedAt
            };
        }

        public async Task<List<AdminAssignmentResponseDto>>
    CreateAdminAssignmentAsync(CreateAdminAssignmentDto dto)
        {
            if (dto.SubjectIds == null || dto.SubjectIds.Count == 0)
            {
                throw new ValidationException(
                    "Please select at least one subject.");
            }

            string? attachmentPath = null;

            // ==========================================
            // UPLOAD FILE ONLY ONCE
            // ==========================================

            if (dto.Attachment != null && dto.Attachment.Length > 0)
            {
                string uploadsFolder = Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "wwwroot",
                    "uploads",
                    "assignments"
                );

                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                string fileName =
                    Guid.NewGuid() +
                    Path.GetExtension(dto.Attachment.FileName);

                string filePath =
                    Path.Combine(uploadsFolder, fileName);

                using (var stream =
                    new FileStream(filePath, FileMode.Create))
                {
                    await dto.Attachment.CopyToAsync(stream);
                }

                attachmentPath =
                    "/uploads/assignments/" + fileName;
            }

            // ==========================================
            // CREATE ONE ASSIGNMENT PER SUBJECT
            // ==========================================

            var results = new List<AdminAssignmentResponseDto>();

            foreach (var subjectId in dto.SubjectIds)
            {
                var assignment = new Assignment
                {
                    Title = dto.Title,
                    AcademicYearId = dto.AcademicYearId,
                    AcademicLevel = dto.AcademicLevel,
                    GroupId = dto.GroupId,

                    // One subject for this database row
                    SubjectId = subjectId,

                    Description = dto.Description,

                    StartDate = dto.StartDate,
                    DueDate = dto.DueDate,

                    Attachment = attachmentPath ?? string.Empty,

                    MaximumMarks = dto.MaximumMarks,

                    CreatedByType = "Admin"
                };

                var created =
                    await _repository.CreateAdminAssignmentAsync(
                        assignment);

                if (created == null)
                {
                    throw new Exception(
                        $"Failed to create admin assignment for SubjectId {subjectId}.");
                }

                results.Add(MapToAdminResponseDto(created));
            }

            return results;
        }


        private AdminAssignmentResponseDto MapToAdminResponseDto(
    Assignment assignment)
        {
            return new AdminAssignmentResponseDto
            {
                AssignmentId = assignment.AssignmentId,

                Title = assignment.Title,

                AcademicYearId = assignment.AcademicYearId,
                AcademicYearName = assignment.AcademicYearName,

                AcademicLevel = assignment.AcademicLevel,

                GroupId = assignment.GroupId,
                GroupName = assignment.GroupName,

                SubjectId = assignment.SubjectId,
                SubjectName = assignment.SubjectName,

                Description = assignment.Description,

                StartDate = assignment.StartDate,

                DueDate = assignment.DueDate,

                AttachmentPath = assignment.Attachment,

                MaximumMarks = assignment.MaximumMarks,

                CreatedByType = assignment.CreatedByType,

                IsPublished = assignment.IsPublished,

                PublishedAt = assignment.PublishedAt
            };
        }

        public async Task<IEnumerable<AdminAssignmentResponseDto>>
    GetAdminAssignmentsAsync()
        {
            var assignments =
                await _repository.GetAdminAssignmentsAsync();

            return assignments.Select(MapToAdminResponseDto);
        }

        public async Task<IEnumerable<SubjectDropdownDto>>
GetSubjectsByGroupAsync(int groupId)
        {
            return await _repository.GetSubjectsByGroupAsync(groupId);
        }

        public async Task<IEnumerable<FacultyDropdownDto>>
        GetFacultyDropdownAsync(
            int subjectId,
            int groupId,
            int academicYearId,
            string academicLevel)
        {
            return await _repository.GetFacultyBySubjectAsync(
                subjectId,
                groupId,
                academicYearId,
                academicLevel);
        }
    }
}