namespace CollegeManagement.API.Controllers;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Filters;
using System.Threading.Tasks;

[ApiController]
[Route("api/v1/transport/student")]
[Authorize]
[Tags("Transport Management")]
public class StudentTransportController : ControllerBase
{
    private readonly IStudentTransportService _transportService;

    public StudentTransportController(IStudentTransportService transportService)
    {
        _transportService = transportService;
    }

    /// <summary>
    /// Get dropdown options for Academic Years in Transport view
    /// </summary>
    [HttpGet("options")]
    [Authorize(Roles = "Admin,Teacher,Student,Parent")]
    public async Task<IActionResult> GetTransportDropdownOptions()
    {
        var result = await _transportService.GetTransportDropdownOptionsAsync();
        return Ok(new { success = true, data = result });
    }

    /// <summary>
    /// Get Student Transport details (Enforces rule: If student is Hosteller, she/he is excluded from transport tab)
    /// </summary>
    [HttpGet("details")]
    [Authorize(Roles = "Admin,Teacher,Student,Parent")]
    [ParentStudentAuthorization]
    public async Task<IActionResult> GetStudentTransportDetails(
        [FromQuery] int? studentId = null,
        [FromQuery] string? academicYear = null)
    {
        if (!studentId.HasValue)
        {
            var studentIdClaim = User.FindFirst("StudentId")?.Value;
            if (int.TryParse(studentIdClaim, out int ownStudentId))
            {
                studentId = ownStudentId;
            }
            else
            {
                return BadRequest(new { success = false, message = "studentId is required." });
            }
        }

        var result = await _transportService.GetStudentTransportDetailsAsync(studentId, academicYear);
        return Ok(new { success = true, data = result });
    }
}
