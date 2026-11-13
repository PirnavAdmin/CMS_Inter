using System;
using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Enquiry;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/enquiries")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    public class EnquiryController : ControllerBase
    {
        private readonly IEnquiryService _enquiryService;
        private readonly ILogger<EnquiryController> _logger;

        public EnquiryController(IEnquiryService enquiryService, ILogger<EnquiryController> logger)
        {
            _enquiryService = enquiryService;
            _logger = logger;
        }

        /// <summary>
        /// Public endpoint for visitors to submit enquiries from the landing page contact screen.
        /// </summary>
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> SubmitEnquiry([FromBody] CreateEnquiryRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid enquiry submission data.", errors = ModelState });
            }

            try
            {
                var created = await _enquiryService.SubmitPublicEnquiryAsync(request);
                return StatusCode(201, new { success = true, message = "Your enquiry has been received. Our team will contact you shortly.", data = created });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating public enquiry: {Message}", ex.Message);
                return StatusCode(500, new { success = false, message = "Unable to process enquiry at this time. Please try again or call us directly." });
            }
        }

        /// <summary>
        /// Retrieves enquiries with optional filtering for Receptionists, Admins, and Principals.
        /// </summary>
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> ListEnquiries(
            [FromQuery] int? campusId = null,
            [FromQuery] string? status = null,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var (items, totalCount) = await _enquiryService.ListEnquiriesAsync(campusId, status, search, page, pageSize);
                return Ok(new
                {
                    success = true,
                    data = items,
                    totalCount,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error listing enquiries: {Message}", ex.Message);
                return StatusCode(500, new { success = false, message = "Failed to load enquiries." });
            }
        }

        /// <summary>
        /// Retrieves enquiry aggregate statistics (New, In Progress, Contacted, Resolved, Today).
        /// </summary>
        [HttpGet("stats")]
        [Authorize]
        public async Task<IActionResult> GetStats([FromQuery] int? campusId = null)
        {
            try
            {
                var stats = await _enquiryService.GetStatsAsync(campusId);
                return Ok(new { success = true, data = stats });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving enquiry stats: {Message}", ex.Message);
                return StatusCode(500, new { success = false, message = "Failed to load enquiry metrics." });
            }
        }

        /// <summary>
        /// Retrieves a single enquiry by its primary key.
        /// </summary>
        [HttpGet("{id:int}")]
        [Authorize]
        public async Task<IActionResult> GetEnquiryById(int id)
        {
            try
            {
                var enquiry = await _enquiryService.GetEnquiryByIdAsync(id);
                if (enquiry == null) return NotFound(new { success = false, message = "Enquiry not found." });
                return Ok(new { success = true, data = enquiry });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving enquiry {Id}: {Message}", id, ex.Message);
                return StatusCode(500, new { success = false, message = "Failed to load enquiry details." });
            }
        }

        /// <summary>
        /// Updates the enquiry status, logs notes, and records contact action.
        /// </summary>
        [HttpPut("{id:int}/status")]
        [Authorize]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateEnquiryStatusRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid status update payload.", errors = ModelState });
            }

            try
            {
                // Auto-fill staff name and role from claims if not provided
                if (string.IsNullOrWhiteSpace(request.HandledByStaffName))
                {
                    request.HandledByStaffName = User.FindFirstValue(ClaimTypes.Name) 
                        ?? User.FindFirstValue("fullName") 
                        ?? User.FindFirstValue(ClaimTypes.Email) 
                        ?? "Staff";
                }

                if (string.IsNullOrWhiteSpace(request.HandledByRole))
                {
                    var rawRole = User.FindFirstValue(ClaimTypes.Role) 
                        ?? User.FindFirstValue("role") 
                        ?? User.FindFirstValue("roleName") 
                        ?? "Staff";

                    var norm = rawRole.Trim().ToLowerInvariant();
                    if (norm.Contains("admin")) request.HandledByRole = "Admin";
                    else if (norm.Contains("principal")) request.HandledByRole = "Principal";
                    else if (norm.Contains("reception")) request.HandledByRole = "Receptionist";
                    else request.HandledByRole = rawRole;
                }

                bool updated = await _enquiryService.UpdateStatusAsync(id, request);
                if (!updated) return NotFound(new { success = false, message = "Enquiry not found or could not be updated." });

                var refreshed = await _enquiryService.GetEnquiryByIdAsync(id);
                return Ok(new { success = true, message = "Enquiry status updated successfully.", data = refreshed });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating enquiry status {Id}: {Message}", id, ex.Message);
                return StatusCode(500, new { success = false, message = "Failed to update enquiry status." });
            }
        }

        /// <summary>
        /// Public endpoint to fetch active contact details for the landing page.
        /// </summary>
        [HttpGet("contact-config")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLandingContactConfig([FromQuery] int? campusId = null)
        {
            try
            {
                var config = await _enquiryService.GetLandingContactConfigAsync(campusId);
                return Ok(new { success = true, data = config });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching landing contact config: {Message}", ex.Message);
                return StatusCode(500, new { success = false, message = "Failed to load contact information." });
            }
        }

        /// <summary>
        /// Admin & Principal endpoint to update active public contact details.
        /// </summary>
        [HttpPut("contact-config")]
        [Authorize]
        public async Task<IActionResult> SaveLandingContactConfig([FromBody] SaveLandingContactConfigRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid contact configuration data.", errors = ModelState });
            }

            try
            {
                int? userId = null;
                var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (int.TryParse(userIdClaim, out int parsedId)) userId = parsedId;

                bool saved = await _enquiryService.SaveLandingContactConfigAsync(request, userId);
                if (!saved) return BadRequest(new { success = false, message = "Could not save contact configuration." });

                var refreshed = await _enquiryService.GetLandingContactConfigAsync(request.CampusId);
                return Ok(new { success = true, message = "Landing contact configuration saved successfully.", data = refreshed });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving landing contact config: {Message}", ex.Message);
                return StatusCode(500, new { success = false, message = "Failed to save contact configuration." });
            }
        }
    }
}
