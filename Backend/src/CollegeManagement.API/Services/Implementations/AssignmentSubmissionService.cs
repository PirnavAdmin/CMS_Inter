using CollegeManagement.API.DTOs.AssignmentSubmission;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class AssignmentSubmissionService
        : IAssignmentSubmissionService
    {
        private readonly IAssignmentSubmissionRepository _repository;

        public AssignmentSubmissionService(
            IAssignmentSubmissionRepository repository)
        {
            _repository = repository;
        }

        public async Task<AssignmentSubmissionResponseDto>
            CreateAsync(CreateAssignmentSubmissionDto dto)
        {
            if (dto.SubmissionStatus != "Draft" &&
                dto.SubmissionStatus != "Submitted")
            {
                throw new ValidationException(
                    "SubmissionStatus must be Draft or Submitted.");
            }

            var submission = new AssignmentSubmission
            {
                AssignmentId = dto.AssignmentId,
                StudentId = dto.StudentId,
                RollNo = dto.RollNo,
                GroupId = dto.GroupId,
                SectionId = dto.SectionId,
                SubjectId = dto.SubjectId,
                Title = dto.Title,
                FileUrl = dto.FileUrl,
                Description = dto.Description,
                SubmissionStatus = dto.SubmissionStatus
            };

            var result = await _repository.CreateAsync(submission);

            if (result == null)
            {
                throw new Exception(
                    "Failed to create assignment submission.");
            }

            return MapToResponse(result);
        }

        public async Task<List<AssignmentSubmissionResponseDto>>
            GetByAssignmentAsync(int assignmentId)
        {
            var submissions =
                await _repository.GetByAssignmentAsync(assignmentId);

            return submissions
                .Select(MapToResponse)
                .ToList();
        }



        public async Task<List<AssignmentSubmissionResponseDto>>
            GetByStudentAsync(int studentId)
        {
            var submissions =
                await _repository.GetByStudentAsync(studentId);

            return submissions
                .Select(MapToResponse)
                .ToList();
        }

        public async Task<AssignmentSubmissionResponseDto>
            GetByIdAsync(int submissionId)
        {
            var submission =
                await _repository.GetByIdAsync(submissionId);

            if (submission == null)
            {
                throw new NotFoundException(
                    $"Submission with ID {submissionId} not found.");
            }

            return MapToResponse(submission);
        }

        private static AssignmentSubmissionResponseDto
            MapToResponse(AssignmentSubmission submission)
        {
            return new AssignmentSubmissionResponseDto
            {
                SubmissionId = submission.SubmissionId,
                AssignmentId = submission.AssignmentId,
                StudentId = submission.StudentId,
                StudentName = submission.StudentName ?? string.Empty,
                RollNo = submission.RollNo ?? string.Empty,
                GroupId = submission.GroupId,
                GroupName = submission.GroupName,
                SectionId = submission.SectionId,
                SectionName = submission.SectionName,
                SubjectId = submission.SubjectId,
                SubjectName = submission.SubjectName,
                Title = submission.Title,
                FileUrl = submission.FileUrl,
                Description = submission.Description,
                SubmissionStatus = submission.SubmissionStatus ?? string.Empty,
                Status = submission.Status ?? string.Empty,
                MarksObtained = submission.MarksObtained,
                Feedback = submission.Feedback,
                SubmissionDate = submission.SubmissionDate,
                CreatedAt = submission.CreatedAt,
                UpdatedAt = submission.UpdatedAt
            };
        }
    }
}