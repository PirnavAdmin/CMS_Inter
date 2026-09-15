using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.DTOs.AcademicYear;
using CollegeManagement.API.DTOs.Admin;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Services.Implementations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    [Authorize]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IEmailService _emailService;
        private readonly IJwtTokenHelper _jwtTokenHelper;

        public AuthController(IAuthService authService, IEmailService emailService, IJwtTokenHelper? jwtTokenHelper = null)
        {
            _authService = authService;
            _emailService = emailService;
            _jwtTokenHelper = jwtTokenHelper!;
        }

        /// <summary>
        /// Changes the password for the currently authenticated user.
        /// </summary>
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userId = _jwtTokenHelper.GetUserId(User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                return Unauthorized(new
                {
                    Status = false,
                    Message = "User is not authenticated or user identifier claim is missing/invalid."
                });
            }

            var (success, message) = await _authService.ChangePasswordAsync(
                userId.Value,
                request.OldPassword,
                request.NewPassword,
                request.ConfirmNewPassword);

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
        /// Authenticates the user. Validates the provided Email/Mobile and Password, and ensures
        /// that the user belongs to the requested Role (e.g., Super Admin, Admin, Teacher, Student).
        /// </summary>
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);
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
        /// Registers a new user.
        /// </summary>
        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register(RegisterRequest request)
        {
            var result = await _authService.RegisterAsync(request);
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
                UserId = result.UserId,
                Name = result.Name,
                Role = result.Role
            });
        }

        /// <summary>
        /// Initiates the forgot password process. Sends a password reset OTP to the registered email.
        /// </summary>
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.ForgotPasswordAsync(request);
            return Ok(new
            {
                Status = true,
                Message = result.Message
            });
        }

        /// <summary>
        /// Verifies the OTP sent for password reset validation and establishes a verified reset context.
        /// </summary>
        [HttpPost("verify-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyOtp(VerifyOtpRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.VerifyOtpAsync(request);
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
        /// Resets the user's password using the verified reset context and new password details.
        /// </summary>
        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _authService.ResetPasswordAsync(request);
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

        /// <summary>
        /// Retrieves a list of all registered users in the system.
        /// </summary>
        [HttpGet("users")]
        public async Task<ActionResult> GetUsers()
        {
            var users = await _authService.GetAllUsersAsync();
            return Ok(new
            {
                Status = true,
                Message = "Users retrieved successfully.",
                Data = users
            });
        }

        /// <summary>
        /// Retrieves a single user by their UserId.
        /// </summary>
        [HttpGet("user/{id}")]
        public async Task<ActionResult> GetUserById(int id)
        {
            var user = await _authService.GetUserByIdAsync(id);
            if (user == null)
            {
                return NotFound(new
                {
                    Status = false,
                    Message = $"User with ID {id} not found."
                });
            }
            return Ok(new
            {
                Status = true,
                Message = "User details retrieved successfully.",
                Data = user
            });
        }
    }
}