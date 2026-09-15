using CollegeManagement.API.DTOs.Assignment;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/assignments")]
    [Produces("application/json")]
    [Authorize]
    public class AssignmentsController : ControllerBase
    {
        private readonly IAssignmentService _service;

        public AssignmentsController(IAssignmentService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();

            return Ok(new
            {
                Status = true,
                Message = "Assignments retrieved successfully.",
                Data = result
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    Status = false,
                    Message = $"Assignment with ID {id} not found."
                });
            }

            return Ok(new
            {
                Status = true,
                Message = "Assignment retrieved successfully.",
                Data = result
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromForm] CreateAssignmentDto dto)
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
                    Directory.CreateDirectory(uploadsFolder);
                }

                string fileName = Guid.NewGuid().ToString() +
                                  Path.GetExtension(dto.Attachment!.FileName);

                string filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.Attachment.CopyToAsync(stream);
                }

                dto.AttachmentPath = "/uploads/assignments/" + fileName;
            }

            var result = await _service.CreateAsync(dto);

            return CreatedAtAction(nameof(GetById),
                new { id = result.AssignmentId },
                new
                {
                    Status = true,
                    Message = "Assignment created successfully.",
                    Data = result
                });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromForm] UpdateAssignmentDto dto)
        {
            string attachmentPath = string.Empty;

            // Check if a new file is uploaded
            if (dto.Attachment != null)
            {
                // Folder Path
                string uploadsFolder = Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "wwwroot",
                    "uploads",
                    "assignments");

                // Create folder if it doesn't exist
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                // Generate unique file name
                string fileName = Guid.NewGuid().ToString() +
                                  Path.GetExtension(dto.Attachment.FileName);

                // Full file path
                string filePath = Path.Combine(uploadsFolder, fileName);

                // Save file
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.Attachment.CopyToAsync(stream);
                }

                // Save relative path
                attachmentPath = "/uploads/assignments/" + fileName;

                dto.AttachmentPath = attachmentPath;
            }

            var result = await _service.UpdateAsync(id, dto);

            if (result == null)
            {
                return NotFound(new
                {
                    Status = false,
                    Message = $"Assignment with ID {id} not found."
                });
            }

            return Ok(new
            {
                Status = true,
                Message = "Assignment updated successfully.",
                Data = result
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);

            if (!success)
            {
                return NotFound(new
                {
                    Status = false,
                    Message = $"Assignment with ID {id} not found."
                });
            }

            return Ok(new
            {
                Status = true,
                Message = "Assignment deleted successfully."
            });
        }


        [HttpGet("groups/{groupId}/subjects")]
        public async Task<IActionResult> GetSubjects(int groupId)
        {
            var data = await _service.GetSubjectsByGroupAsync(groupId);

            return Ok(data);
        }


        [HttpGet("faculty-dropdown")]
        public async Task<IActionResult> GetFaculty(
    int subjectId,
    int groupId,
    int academicYearId,
    string academicLevel)
        {
            var data = await _service.GetFacultyDropdownAsync(
                subjectId,
                groupId,
                academicYearId,
                academicLevel);

            return Ok(data);
        }

        [HttpPost("publish")]
        public async Task<IActionResult> Publish([FromBody] PublishAssignmentsDto dto)
        {
            if (dto?.AssignmentIds == null || dto.AssignmentIds.Count == 0)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "Please select at least one assignment."
                });
            }

            foreach (var id in dto.AssignmentIds)
            {
                var assignment = await _service.GetByIdAsync(id);
                if (assignment == null)
                {
                    return NotFound(new
                    {
                        Status = false,
                        Message = $"Assignment with ID {id} not found."
                    });
                }
            }

            var success = await _service.PublishAssignmentsAsync(dto.AssignmentIds);

            if (!success)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = "Failed to publish assignment(s)."
                });
            }

            string message = dto.AssignmentIds.Count == 1
                ? "Assignment published successfully."
                : "Assignments published successfully.";

            return Ok(new
            {
                Status = true,
                Message = message
            });
        }

        [HttpGet("published")]
        public async Task<IActionResult> GetPublished()
        {
            var result = await _service.GetPublishedAssignmentsAsync();

            return Ok(new
            {
                Status = true,
                Message = "Published assignments retrieved successfully.",
                Data = result
            });
        }
    }
}