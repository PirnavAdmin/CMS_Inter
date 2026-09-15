using CollegeManagement.API.DTOs.Assignment.Admin;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/admin/assignments")]
    [Produces("application/json")]
    [Authorize]


    public class AdminAssignmentsController : ControllerBase
    {
        private readonly IAssignmentService _service;
        private readonly IAssignmentSubmissionService _submissionService;
        public AdminAssignmentsController(
    IAssignmentService service,
    IAssignmentSubmissionService submissionService)
        {
            _service = service;
            _submissionService = submissionService;
        }


        // GET: api/admin/assignments
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result =
                await _service.GetAdminAssignmentsAsync();

            return Ok(new
            {
                Status = true,
                Message = "Admin assignments retrieved successfully.",
                Data = result
            });
        }

        [HttpGet("{assignmentId}/submissions")]
        public async Task<IActionResult> GetSubmissions(
    int assignmentId)
        {
            var result =
                await _submissionService.GetByAssignmentAsync(assignmentId);

            return Ok(new
            {
                Status = true,
                Message = "Assignment submissions retrieved successfully.",
                Data = result
            });
        }

        // POST: api/admin/assignments
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromForm] CreateAdminAssignmentDto dto)
        {
            if (dto.Attachment != null)
            {
                string uploadsFolder = Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "wwwroot",
                    "uploads",
                    "assignments");

                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(
                        uploadsFolder);
                }

                string fileName =
                    Guid.NewGuid().ToString()
                    + Path.GetExtension(
                        dto.Attachment.FileName);

                string filePath =
                    Path.Combine(
                        uploadsFolder,
                        fileName);

                using (var stream =
                       new FileStream(
                           filePath,
                           FileMode.Create))
                {
                    await dto.Attachment.CopyToAsync(
                        stream);
                }

                dto.AttachmentPath =
                    "/uploads/assignments/"
                    + fileName;
            }

            var result =
                await _service.CreateAdminAssignmentAsync(dto);

            return Ok(new
            {
                Status = true,
                Message = "Admin assignment created successfully.",
                Data = result
            });
        }
    }
}