using CollegeManagement.API.DTOs.AssignmentSubmission;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/assignment-submissions")]
    [Produces("application/json")]
    [Authorize]
    public class AssignmentSubmissionsController : ControllerBase
    {
        private readonly IAssignmentSubmissionService _service;

        public AssignmentSubmissionsController(
            IAssignmentSubmissionService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromForm] CreateAssignmentSubmissionDto dto)
        {
            // 1. Upload the attachment
            if (dto.Attachment != null)
            {
                string uploadsFolder = Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "wwwroot",
                    "uploads",
                    "submissions");

                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                string fileName =
                    Guid.NewGuid().ToString()
                    + Path.GetExtension(dto.Attachment.FileName);

                string filePath =
                    Path.Combine(uploadsFolder, fileName);

                using (var stream = new FileStream(
                    filePath,
                    FileMode.Create))
                {
                    await dto.Attachment.CopyToAsync(stream);
                }

                // 2. Store the file path in the DTO
                dto.FileUrl =
                    "/uploads/submissions/" + fileName;
            }

            // 3. Send the data to Service
            var result =
                await _service.CreateAsync(dto);

            // 4. Return response
            return Ok(new
            {
                Status = true,
                Message = "Assignment submission saved successfully.",
                Data = result
            });
        }

        [HttpGet("assignment/{assignmentId}")]
        public async Task<IActionResult> GetByAssignment(
    int assignmentId)
        {
            var result =
                await _service.GetByAssignmentAsync(assignmentId);

            return Ok(new
            {
                Status = true,
                Message = "Assignment submissions retrieved successfully.",
                Data = result
            });
        }

        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetByStudent(
            int studentId)
        {
            var result =
                await _service.GetByStudentAsync(studentId);

            return Ok(new
            {
                Status = true,
                Message = "Student submissions retrieved successfully.",
                Data = result
            });
        }

        [HttpGet("{submissionId}")]
        public async Task<IActionResult> GetById(
            int submissionId)
        {
            var result =
                await _service.GetByIdAsync(submissionId);

            return Ok(new
            {
                Status = true,
                Message = "Submission retrieved successfully.",
                Data = result
            });
        }
    }
}