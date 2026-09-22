using CollegeManagement.API.DTOs.Admin;
using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;
        private readonly IEmailService _emailService;
        private readonly IJwtTokenHelper _jwtTokenHelper;

        public AdminController(
            IAdminService adminService,
            IEmailService emailService,
            IJwtTokenHelper jwtTokenHelper)
        {
            _adminService = adminService;
            _emailService = emailService;
            _jwtTokenHelper = jwtTokenHelper;
        }

        /// <summary>
        /// Authenticates the administrator.
        /// </summary>
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] AdminLoginRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var result = await _adminService.LoginAsync(request);
            if (!result.Status)
            {
                return Unauthorized(new
                {
                    Status = result.Status,
                    Message = result.Message
                });
            }

            return Ok(new
            {
                Status = result.Status,
                Message = result.Message,
                AccessToken = result.AccessToken,
                UserId = result.UserId,
                Name = result.Name,
                Role = result.Role
            });
        }

        /// <summary>
        /// Registers a new administrator.
        /// </summary>
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Create([FromBody] CreateAdminRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var result = await _adminService.CreateAdminAsync(request);
                return CreatedAtAction(nameof(GetById), new { adminId = result.Id }, new
                {
                    Status = true,
                    Message = "Admin created successfully.",
                    Data = result
                });
            }
            catch (ValidationException ex)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new
                {
                    Status = false,
                    Message = ex.Message
                });
            }
        }

        /// <summary>
        /// Retrieves a list of all platform administrators.
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll()
        {
            var result = await _adminService.GetAllAdminsAsync();
            return Ok(new
            {
                Status = true,
                Message = "Admins retrieved successfully.",
                Data = result
            });
        }

        /// <summary>
        /// Retrieves details of an admin by ID.
        /// </summary>
        [HttpGet("{adminId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int adminId)
        {
            var result = await _adminService.GetAdminByIdAsync(adminId);
            if (result == null)
            {
                return NotFound(new
                {
                    Status = false,
                    Message = $"Admin with ID {adminId} not found."
                });
            }

            return Ok(new
            {
                Status = true,
                Message = "Admin details retrieved successfully.",
                Data = result
            });
        }

        /// <summary>
        /// Changes the password of the currently authenticated administrator.
        /// Requires a valid Users.UserId JWT claim (sub / NameIdentifier).
        /// Verifies old password against Users.PasswordHash (not admins.Password).
        /// On success, dual-writes both Users.PasswordHash and admins.Password.
        /// </summary>
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Phase 6G: Extract the canonical Users.UserId from the JWT sub claim.
            // No fallback to AdminId, 1, 15, 0, or any hardcoded value.
            var userId = _jwtTokenHelper.GetUserId(User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                return Unauthorized(new { Status = false, Message = "Invalid authentication token details." });
            }

            var (success, message) = await _adminService.ChangePasswordAsync(userId.Value, request);
            if (!success)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = message
                });
            }

            return Ok(new
            {
                Status = true,
                Message = message
            });
        }

        /// <summary>
        /// Updates the status (active/deactive) of a platform administrator.
        /// </summary>
        [HttpPut("{adminId}/status")]
        public async Task<IActionResult> UpdateStatus(int adminId, [FromBody] UpdateStatusRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var success = await _adminService.UpdateStatusAsync(adminId, request.IsActive);
            if (!success)
            {
                return NotFound(new
                {
                    Status = false,
                    Message = $"Admin with ID {adminId} not found."
                });
            }

            return Ok(new
            {
                Status = true,
                Message = $"Admin status updated to {(request.IsActive ? "Active" : "Inactive")} successfully."
            });
        }

        /// <summary>
        /// Initiates the admin forgot password process. Sends a password reset OTP.
        /// </summary>
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var result = await _adminService.ForgotPasswordAsync(request);
            return Ok(new
            {
                Status = result.Status,
                Message = result.Message
            });
        }

        /// <summary>
        /// Verifies the OTP sent for admin password reset.
        /// </summary>
        [HttpPost("verify-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var result = await _adminService.VerifyOtpAsync(request);
            if (!result.Status)
            {
                return BadRequest(new
                {
                    Status = result.Status,
                    Message = result.Message
                });
            }

            return Ok(new
            {
                Status = result.Status,
                Message = result.Message,
                ResetToken = result.ResetToken
            });
        }

        /// <summary>
        /// Resets the admin password using a validated OTP / verified reset context.
        /// </summary>
        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var result = await _adminService.ResetPasswordAsync(request);
            if (!result.Status)
            {
                return BadRequest(new
                {
                    Status = result.Status,
                    Message = result.Message
                });
            }

            return Ok(new
            {
                Status = result.Status,
                Message = result.Message
            });
        }
    }

    public class UpdateStatusRequest
    {
        public bool IsActive { get; set; }
    }
}
